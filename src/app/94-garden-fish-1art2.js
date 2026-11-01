/* ============================================================
   GARDEN, fishing and bug catching: MORE ART (the book of 300). PURE like 94-garden-fish-1art.js: strings in, strings out, explicit colours, no text.

     _gfaCustom(look, rnd)     the shapes that are not a fish body: ray, seahorse, jelly, crab, turtle, newt, squid, shrimp, skeleton
     _gfaTail2, _gfaDorsal2, _gfaPattern2, _gfaFishMore   more tails, back fins, patterns, mouths and extras for the ordinary body
     _gbMarks(...)             markings on any oval bug
     _gbaMore(...)             the bugs that have their own body: ant, wasp, fly, crane fly, earwig, woodlouse, centipede, slug, worm,
                               weevil, longhorn, rhinoceros beetle, scarab, shield bug, boatman, lacewing, mayfly, scorpion, leaf insect, katydid, roach, mite
   ============================================================ */
function _gfaEye1(x, y, r, e) { return `<circle cx="${_gfaN(x)}" cy="${_gfaN(y)}" r="${_gfaN(r)}" fill="#fbf8ee" stroke="${e}" stroke-width="0.8"/><circle cx="${_gfaN(x + r * 0.2)}" cy="${_gfaN(y + r * 0.06)}" r="${_gfaN(r * 0.66)}" fill="#1a1712"/><circle cx="${_gfaN(x + r * 0.44)}" cy="${_gfaN(y - r * 0.26)}" r="${_gfaN(r * 0.24)}" fill="#ffffff"/>`; }
/** Marks scattered in an oval, for the shapes that have no clipped body. */
function _gfaOvalMarks(p, cx, cy, rx, ry, rnd, look) {
  const mark = look.c3 || _gfaDk(look.c, 0.4), light = look.c2 || _gfaLt(look.c, 0.4);
  const at = () => { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 0.86; return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]; };
  let s = '';
  if (p === 'spots' || p === 'speckle' || p === 'stars' || p === 'dapple') { const n = p === 'speckle' ? 14 : p === 'stars' ? 9 : 8, R = p === 'speckle' ? 1.1 : p === 'dapple' ? 3 : p === 'stars' ? 1.2 : 2.2; for (let i = 0; i < n; i++) { const [x, y] = at(); s += `<circle cx="${_gfaN(x)}" cy="${_gfaN(y)}" r="${_gfaN(R * (0.7 + rnd() * 0.5))}" fill="${p === 'stars' ? light : mark}"${p === 'dapple' ? ' fill-opacity="0.55"' : ''}/>`; } }
  else if (p === 'rings') for (let i = 0; i < 5; i++) { const [x, y] = at(); s += `<circle cx="${_gfaN(x)}" cy="${_gfaN(y)}" r="${_gfaN(3 + rnd() * 1.6)}" fill="none" stroke="${mark}" stroke-width="1.5"/>`; }
  else if (p === 'glow') s += `<ellipse cx="${_gfaN(cx)}" cy="${_gfaN(cy)}" rx="${_gfaN(rx * 0.74)}" ry="${_gfaN(ry * 0.74)}" fill="${light}" fill-opacity="0.6"/>`;
  else if (p === 'ombre') s += `<ellipse cx="${_gfaN(cx - rx * 0.32)}" cy="${_gfaN(cy)}" rx="${_gfaN(rx * 0.56)}" ry="${_gfaN(ry * 0.7)}" fill="${mark}" fill-opacity="0.55"/>`;
  else if (p === 'scales' || p === 'lace') { let d = ''; for (let i = 0; i < 9; i++) { const [x, y] = at(); d += `M${_gfaN(x - 3)} ${_gfaN(y)}q3 3 6 0`; } s += `<path d="${d}" stroke="${mark}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`; }
  else if (p === 'ghost') { let d = `M${_gfaN(cx - rx * 0.8)} ${_gfaN(cy)}H${_gfaN(cx + rx * 0.7)}`; for (let i = 0; i < 6; i++) { const x = cx - rx * 0.6 + i * rx * 0.24; d += `M${_gfaN(x)} ${_gfaN(cy - ry * 0.5)}V${_gfaN(cy + ry * 0.5)}`; } s += `<path d="${d}" stroke="${mark}" stroke-width="1" stroke-opacity="0.7" fill="none" stroke-linecap="round"/>`; }
  return s;
}
/** A shape of its own, or '' when it is an ordinary fish body. */
function _gfaCustom(look, rnd) {
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), c3 = look.c3 || _gfaDk(c, 0.4), e = _gfaDk(c, 0.5), A = `stroke="${e}" stroke-width="1.2" stroke-linejoin="round"`, p = look.p;
  let s = '<g class="gfa-fish">';
  switch (look.s) {
    case 'ray': {   // seen from above: very wide, with a whip of a tail
      s += `<path d="M-22 0Q-34 1 -46 -3" stroke="${e}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-22 0Q-34 1 -46 -3" stroke="${c}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M34 0C28 -10 12 -27 -6 -27C-14 -24 -20 -8 -25 -2L-25 2C-20 8 -14 24 -6 27C12 27 28 10 34 0Z" fill="${c}" ${A}/>`;
      s += `<path d="M28 -3C20 -11 8 -20 -4 -22" stroke="${_gfaLt(c, 0.4)}" stroke-width="2" stroke-opacity="0.6" fill="none" stroke-linecap="round"/>`;
      s += _gfaOvalMarks(p, 2, 0, 20, 16, rnd, look);
      return s + _gfaEye1(19, -6, 2.8, e) + _gfaEye1(19, 6, 2.8, e) + '</g>';
    }
    case 'seahorse':
      s += `<path d="M-2 -18C10 -22 15 -10 7 -4C1 1 7 9 2 15C-3 21 -11 16 -7 11" stroke="${e}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M-2 -18C10 -22 15 -10 7 -4C1 1 7 9 2 15C-3 21 -11 16 -7 11" stroke="${c}" stroke-width="7.6" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M-1 -18L17 -16L16 -13L1 -13Z" fill="${c}" ${A}/><path d="M3 -24l2 4 3 -4 1 5 4 -2 -2 5z" fill="${c3}" ${A}/><path d="M-2 -7Q-13 -9 -13 -1Q-8 -1 -2 -2Z" fill="${c2}" ${A}/><path d="M9 -6q3 2 1 5M6 2q3 2 1 5M5 9q2 2 0 4" stroke="${c3}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
      return s + _gfaEye1(3, -19, 3.4, e) + '</g>';
    case 'jelly': {
      let t = '';
      for (let i = 0; i < 5; i++) { const x = -13 + i * 6.5; t += `M${_gfaN(x)} 2q${i % 2 ? 4 : -4} 9 0 14q${i % 2 ? -3 : 3} 5 0 9`; }
      s += `<path d="${t}" stroke="${c3}" stroke-width="2" stroke-opacity="0.8" fill="none" stroke-linecap="round"/><path d="M-20 3C-20 -26 20 -26 20 3Q15 7 10 3Q5 7 0 3Q-5 7 -10 3Q-15 7 -20 3Z" fill="${c}" fill-opacity="0.85" ${A}/><path d="M-10 -6C-9 -14 -1 -17 5 -15" stroke="#ffffff" stroke-opacity="0.75" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="-6" rx="9" ry="6" fill="${c2}" fill-opacity="0.55"/>`;
      if (p === 'glow') s += `<circle cx="0" cy="-4" r="24" fill="${c2}" fill-opacity="0.16"/>`;
      return s + _gfaEye1(-5, -6, 2.2, e) + _gfaEye1(5, -6, 2.2, e) + '</g>';
    }
    case 'crab':
      s += `<path d="M-14 6l-11 3 -3 8M-12 10l-8 6 -1 7M14 6l11 3 3 8M12 10l8 6 1 7" stroke="${e}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="M-16 -4Q-28 -6 -30 -16Q-26 -22 -20 -20Q-24 -15 -19 -13L-14 -10M16 -4Q30 -6 34 -18Q30 -26 22 -22Q27 -16 21 -13L14 -10" fill="${c2}" ${A}/><path d="M-22 2C-22 -12 22 -12 22 2C22 14 -22 14 -22 2Z" fill="${c}" ${A}/><path d="M-12 -2Q0 -7 12 -2" stroke="${c3}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-5 -8l-1 -6M5 -8l1 -6" stroke="${e}" stroke-width="1.6"/>`;
      return s + _gfaEye1(-6, -15, 2.8, e) + _gfaEye1(6, -15, 2.8, e) + `<path d="M-5 5q5 4 10 0" stroke="${e}" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>`;
    case 'turtle':
      s += `<path d="M-14 -12L-22 -20M-14 12L-22 20M11 -12L20 -21M11 12L20 21M-20 0H-27" stroke="${_gfaLt(c, 0.25)}" stroke-width="6" stroke-linecap="round"/>`;
      s += `<circle cx="27" cy="0" r="7" fill="${_gfaLt(c, 0.25)}" ${A}/><ellipse cx="0" cy="0" rx="23" ry="18" fill="${c}" ${A}/><path d="M-8 -7L8 -7L14 0L8 7L-8 7L-14 0ZM-8 -7L-13 -15M8 -7L12 -15M-8 7L-13 15M8 7L12 15M-14 0H-23M14 0H23" stroke="${c2}" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`;
      return s + _gfaEye1(29, -3.4, 2.2, e) + _gfaEye1(29, 3.4, 2.2, e) + '</g>';
    case 'newt': {
      const body = 'M-44 2C-30 -4 -18 4 -4 0C8 -3 20 -2 26 0';
      s += `<path d="M-6 3l-3 9l-6 2M14 3l3 9l6 2" stroke="${e}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${body}" stroke="${e}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="${body}" stroke="${c}" stroke-width="10.6" fill="none" stroke-linecap="round"/><path d="M-30 3C-20 7 -8 5 20 4" stroke="${c2}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      if (look.x === 'frill') s += `<path d="M20 -6l-5 -9M24 -6l-1 -11M28 -5l3 -10M-30 -5l-2 -6M-20 -4l0 -7M-10 -5l1 -7" stroke="${c3}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      if (p === 'spots') for (let i = 0; i < 8; i++) s += `<circle cx="${_gfaN(-36 + i * 8)}" cy="${_gfaN(-1 + rnd() * 2)}" r="1.5" fill="${c3}"/>`;
      s += `<ellipse cx="28" cy="0" rx="9" ry="7.6" fill="${c}" ${A}/>`;
      return s + _gfaEye1(31, -3, 3, e) + `<path d="M36 2q-3 3 -8 2" stroke="${e}" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
    }
    case 'squid': {
      let t = '';
      for (let i = 0; i < 6; i++) { const y = -9 + i * 3.6; t += `M-4 ${_gfaN(y)}C-14 ${_gfaN(y * 1.4)} -24 ${_gfaN(y * 0.6 + (i % 2 ? 5 : -5))} -36 ${_gfaN(y * 1.6)}`; }
      s += `<path d="${t}" stroke="${e}" stroke-width="3.8" fill="none" stroke-linecap="round"/><path d="${t}" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M-6 -11C8 -16 26 -10 38 0C26 10 8 16 -6 11Q-12 0 -6 -11Z" fill="${c}" ${A}/><path d="M26 -8L38 -15L38 0ZM26 8L38 15L38 0Z" fill="${c2}" ${A}/>`;
      s += _gfaOvalMarks(p, 14, 0, 12, 7, rnd, look);
      return s + _gfaEye1(1, -6, 3.6, e) + _gfaEye1(1, 6, 3.6, e) + '</g>';
    }
    case 'shrimp':
      s += `<path d="M-2 8l-2 9M5 8l0 9M12 7l2 9M16 -9Q34 -22 38 -8M18 -5Q34 -6 38 2" stroke="${e}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M-30 12Q-36 2 -24 -2Q-8 -12 12 -8Q24 -5 26 0Q18 8 4 8Q-14 8 -22 14Q-26 16 -30 12Z" fill="${c}" fill-opacity="${p === 'ghost' ? 0.55 : 0.92}" ${A}/><path d="M-20 -2q2 6 0 12M-12 -6q3 7 0 14M-4 -8q3 8 0 16M4 -8q3 8 0 16" stroke="${c3}" stroke-width="1.2" stroke-opacity="0.7" fill="none"/><path d="M-30 12l-8 3l1 -7" fill="${c2}" ${A}/><path d="M24 -2L36 -4" stroke="${e}" stroke-width="1.8" stroke-linecap="round"/>`;
      return s + _gfaEye1(17, -5, 2.6, e) + '</g>';
    case 'skel': {
      let r = '';
      for (let i = 0; i < 7; i++) { const x = -22 + i * 6.4, h = 12 - Math.abs(i - 3) * 1.6; r += `M${_gfaN(x)} ${_gfaN(-h)}Q${_gfaN(x + 3)} 0 ${_gfaN(x)} ${_gfaN(h)}`; }
      s += `<path d="M-42 -11L-30 0L-42 11" stroke="${e}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-42 -11L-30 0L-42 11" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-30 0H18" stroke="${e}" stroke-width="4"/><path d="M-30 0H18" stroke="${c}" stroke-width="2.4"/><path d="${r}" stroke="${e}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="${r}" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M12 -13C24 -15 36 -8 36 0C36 6 28 9 20 8L14 12C10 6 8 -6 12 -13Z" fill="${c}" ${A}/><path d="M28 5l1 3M32 3l1 3" stroke="${e}" stroke-width="1.2"/>`;
      return s + `<circle cx="23" cy="-4" r="4" fill="${c3}" stroke="${e}" stroke-width="0.8"/><circle cx="23" cy="-4" r="1.5" fill="#e8501a"/></g>`;
    }
    default: return '';
  }
}
function _gfaTail2(t, x0, pt, H, A) {
  if (t === 'lyre') return `<path d="M${_gfaN(x0 + 3)} ${-pt}C${_gfaN(x0 - 6)} ${_gfaN(-H * 0.6)} ${_gfaN(x0 - 16)} ${_gfaN(-H * 1.1)} ${_gfaN(x0 - 26)} ${_gfaN(-H * 1.3)}Q${_gfaN(x0 - 12)} ${_gfaN(-H * 0.3)} ${_gfaN(x0 - 7)} 0Q${_gfaN(x0 - 12)} ${_gfaN(H * 0.3)} ${_gfaN(x0 - 26)} ${_gfaN(H * 1.3)}C${_gfaN(x0 - 16)} ${_gfaN(H * 1.1)} ${_gfaN(x0 - 6)} ${_gfaN(H * 0.6)} ${_gfaN(x0 + 3)} ${pt}Z" ${A}/>`;
  if (t === 'round') return `<path d="M${_gfaN(x0 + 3)} ${-pt}C${_gfaN(x0 - 4)} ${_gfaN(-H * 0.9)} ${_gfaN(x0 - 15)} ${_gfaN(-H * 0.8)} ${_gfaN(x0 - 15)} 0C${_gfaN(x0 - 15)} ${_gfaN(H * 0.8)} ${_gfaN(x0 - 4)} ${_gfaN(H * 0.9)} ${_gfaN(x0 + 3)} ${pt}Z" ${A}/>`;
  if (t === 'whip') return `<path d="M${_gfaN(x0 + 3)} ${-pt}C${_gfaN(x0 - 4)} ${_gfaN(-H * 0.5)} ${_gfaN(x0 - 10)} ${_gfaN(-H * 0.9)} ${_gfaN(x0 - 13)} ${_gfaN(-H * 0.7)}Q${_gfaN(x0 - 9)} 0 ${_gfaN(x0 - 30)} ${_gfaN(H * 0.8)}Q${_gfaN(x0 - 12)} ${_gfaN(H * 0.7)} ${_gfaN(x0 + 3)} ${pt}Z" ${A}/>`;
  return '';
}
function _gfaDorsal2(k, dx0, dx1, H, dh, fill, line) {
  const y0 = -H * 0.76, w = dx1 - dx0;
  if (k === 'spines') { let d = `M${_gfaN(dx0)} ${_gfaN(y0)}`; const n = 6; for (let i = 0; i < n; i++) d += `L${_gfaN(dx0 + w * (i + 0.5) / n)} ${_gfaN(-H - dh * (i % 2 ? 1.1 : 1.4))}L${_gfaN(dx0 + w * (i + 1) / n)} ${_gfaN(-H * 0.9)}`; return `<path d="${d}L${_gfaN(dx1 + 2)} ${_gfaN(-H * 0.7)}Z" fill="${fill}" ${line}/>`; }
  if (k === 'twin') return `<path d="M${_gfaN(dx0 - w * 0.2)} ${_gfaN(y0)}Q${_gfaN(dx0 + w * 0.1)} ${_gfaN(-H - dh)} ${_gfaN(dx0 + w * 0.42)} ${_gfaN(-H * 0.86)}Z" fill="${fill}" ${line}/><path d="M${_gfaN(dx0 + w * 0.55)} ${_gfaN(-H * 0.86)}Q${_gfaN(dx0 + w * 0.9)} ${_gfaN(-H - dh * 0.8)} ${_gfaN(dx1 + w * 0.2)} ${_gfaN(-H * 0.7)}Z" fill="${fill}" ${line}/>`;
  if (k === 'low') return `<path d="M${_gfaN(dx0 - w * 0.3)} ${_gfaN(y0)}Q${_gfaN((dx0 + dx1) / 2)} ${_gfaN(-H - dh * 0.5)} ${_gfaN(dx1 + w * 0.6)} ${_gfaN(-H * 0.6)}Z" fill="${fill}" ${line}/>`;
  return '';
}
function _gfaPattern2(p, look, S, rnd) {
  const L = S.L, H = S.H, x0 = -L / 2, mark = look.c3 || _gfaDk(look.c, 0.42), light = _gfaLt(look.c, 0.45), dark = _gfaDk(look.c, 0.42);
  switch (p) {
    case 'tiger': { let d = ''; for (let i = 0; i < 7; i++) { const x = x0 + L * (0.2 + i * 0.09); d += `M${_gfaN(x)} ${_gfaN(-H * 1.1)}l${_gfaN(2 + rnd() * 2)} ${_gfaN(H * 0.5)}l${_gfaN(-3)} ${_gfaN(H * 0.34)}l${_gfaN(2)} ${_gfaN(H * 0.3)}`; } return `<path d="${d}" stroke="${mark}" stroke-width="${_gfaN(Math.max(1.8, H * 0.14))}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }
    case 'zebra': { let d = ''; for (let i = 0; i < 10; i++) { const x = x0 + L * (0.14 + i * 0.075); d += `M${_gfaN(x)} ${_gfaN(-H * 1.2)}V${_gfaN(H * 0.5)}`; } return `<path d="${d}" stroke="${mark}" stroke-width="${_gfaN(Math.max(1.2, L * 0.022))}" fill="none"/>`; }
    case 'chevron': { let d = ''; for (let i = 0; i < 5; i++) { const x = x0 + L * (0.22 + i * 0.13); d += `M${_gfaN(x)} ${_gfaN(-H)}L${_gfaN(x + 5)} ${_gfaN(-H * 0.3)}L${_gfaN(x)} ${_gfaN(H * 0.3)}`; } return `<path d="${d}" stroke="${mark}" stroke-width="2.2" fill="none" stroke-linejoin="round"/>`; }
    case 'rings': { let s = ''; for (let i = 0; i < 5; i++) s += `<circle cx="${_gfaN(x0 + L * (0.24 + i * 0.13))}" cy="${_gfaN((rnd() - 0.7) * H)}" r="${_gfaN(H * 0.2 + rnd() * 1.4)}" fill="none" stroke="${mark}" stroke-width="1.6"/>`; return s; }
    case 'dapple': { let s = ''; for (let i = 0; i < 7; i++) s += `<ellipse cx="${_gfaN(x0 + L * (0.18 + rnd() * 0.6))}" cy="${_gfaN((rnd() - 0.7) * H)}" rx="${_gfaN(2.6 + rnd() * 3)}" ry="${_gfaN(1.6 + rnd() * 2)}" fill="${rnd() < 0.5 ? dark : light}" fill-opacity="0.6"/>`; return s; }
    case 'neon': return `<path d="M${_gfaN(x0 + L * 0.05)} ${_gfaN(-H * 0.12)}H${_gfaN(x0 + L * 0.8)}" stroke="${look.c2}" stroke-width="${_gfaN(Math.max(2, H * 0.22))}" stroke-linecap="round"/><path d="M${_gfaN(x0 + L * 0.05)} ${_gfaN(H * 0.12)}H${_gfaN(x0 + L * 0.5)}" stroke="${mark}" stroke-width="${_gfaN(Math.max(2, H * 0.2))}" stroke-linecap="round"/>`;
    case 'bands': return `<path d="M${_gfaN(x0 + L * 0.36)} ${_gfaN(-H * 1.3)}V${_gfaN(H)}M${_gfaN(x0 + L * 0.62)} ${_gfaN(-H * 1.3)}V${_gfaN(H)}" stroke="${mark}" stroke-width="${_gfaN(L * 0.1)}" fill="none"/>`;
    case 'lace': { let d = ''; for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { const x = x0 + L * (0.2 + i * 0.09) + (j % 2 ? 2 : 0), y = -H * 0.9 + j * H * 0.42; d += `M${_gfaN(x - 2)} ${_gfaN(y - 2)}L${_gfaN(x + 2)} ${_gfaN(y + 2)}M${_gfaN(x + 2)} ${_gfaN(y - 2)}L${_gfaN(x - 2)} ${_gfaN(y + 2)}`; } return `<path d="${d}" stroke="${mark}" stroke-width="0.9" stroke-opacity="0.8"/>`; }
    case 'ombre': return `<path d="M${_gfaN(x0 - 2)} ${_gfaN(-H * 1.3)}H${_gfaN(x0 + L * 0.46)}Q${_gfaN(x0 + L * 0.34)} 0 ${_gfaN(x0 + L * 0.46)} ${_gfaN(H * 1.3)}H${_gfaN(x0 - 2)}Z" fill="${mark}" fill-opacity="0.75"/>`;
    case 'stars': { let s = ''; for (let i = 0; i < 8; i++) { const x = x0 + L * (0.18 + rnd() * 0.62), y = (rnd() - 0.72) * H * 1.1, r = 1.6 + rnd() * 1.2; s += `<path d="M${_gfaN(x)} ${_gfaN(y - r)}L${_gfaN(x + r * 0.3)} ${_gfaN(y - r * 0.3)}L${_gfaN(x + r)} ${_gfaN(y)}L${_gfaN(x + r * 0.3)} ${_gfaN(y + r * 0.3)}L${_gfaN(x)} ${_gfaN(y + r)}L${_gfaN(x - r * 0.3)} ${_gfaN(y + r * 0.3)}L${_gfaN(x - r)} ${_gfaN(y)}L${_gfaN(x - r * 0.3)} ${_gfaN(y - r * 0.3)}Z" fill="${mark}"/>`; } return s; }
    case 'ghost': { let d = `M${_gfaN(x0 + L * 0.08)} ${_gfaN(-H * 0.2)}H${_gfaN(x0 + L * 0.72)}`; for (let i = 0; i < 9; i++) { const x = x0 + L * (0.14 + i * 0.065); d += `M${_gfaN(x)} ${_gfaN(-H * 0.74)}L${_gfaN(x + 2)} ${_gfaN(-H * 0.2)}L${_gfaN(x)} ${_gfaN(H * 0.2)}`; } return `<path d="${d}" stroke="${mark}" stroke-width="1" stroke-opacity="0.75" fill="none"/>`; }
    case 'saddle': { let s = ''; for (let i = 0; i < 4; i++) s += `<ellipse cx="${_gfaN(x0 + L * (0.2 + i * 0.18))}" cy="${_gfaN(-H * 0.86)}" rx="${_gfaN(L * 0.055)}" ry="${_gfaN(H * 0.5)}" fill="${mark}" fill-opacity="0.85"/>`; return s; }
    case 'eye': return `<circle cx="${_gfaN(x0 + L * 0.13)}" cy="${_gfaN(-H * 0.1)}" r="${_gfaN(Math.max(3, H * 0.34))}" fill="${look.c2}" stroke="${mark}" stroke-width="1.6"/><circle cx="${_gfaN(x0 + L * 0.13)}" cy="${_gfaN(-H * 0.1)}" r="${_gfaN(Math.max(1.4, H * 0.16))}" fill="${mark}"/>`;
    case 'tip': return `<ellipse cx="${_gfaN(x0 + L * 0.6)}" cy="${_gfaN(-H * 0.56)}" rx="${_gfaN(L * 0.13)}" ry="${_gfaN(H * 0.48)}" fill="${look.c3}"/>`;
    default: return '';
  }
}
/** Mouths and extras on the ordinary body: returns what goes on top. mouth is drawn by the caller unless this says it has done it. */
function _gfaFishMore(look, S, e, x0, x1) {
  const H = S.H, c3 = look.c3 || e; let s = '';
  if (look.m === 'teeth') { let d = ''; for (let i = 0; i < 5; i++) d += `M${_gfaN(x1 - 1.6 - i * 2.2)} ${_gfaN(H * 0.16 + i * 0.4)}l1 2.8l1 -2.6`; s += `<path d="${d}" fill="#fbfbf2" stroke="${e}" stroke-width="0.5" stroke-linejoin="round"/>`; }
  if (look.m === 'tube') s += `<ellipse cx="${_gfaN(x1 + 1.4)}" cy="${_gfaN(H * 0.1)}" rx="2.4" ry="3.2" fill="${_gfaDk(look.c, 0.18)}" stroke="${e}" stroke-width="1"/><ellipse cx="${_gfaN(x1 + 2)}" cy="${_gfaN(H * 0.1)}" rx="1" ry="1.8" fill="#2a1a18"/>`;
  if (S.gill) { let d = ''; for (let i = 0; i < 4; i++) d += `M${_gfaN(x1 - S.L * 0.3 - i * 2.4)} ${_gfaN(-H * 0.22)}q-1.4 ${_gfaN(H * 0.22)} 0 ${_gfaN(H * 0.48)}`; s += `<path d="${d}" stroke="${e}" stroke-width="1" stroke-opacity="0.65" fill="none" stroke-linecap="round"/>`; }
  if (S.spike) { let d = ''; for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, cx = x0 + S.L * 0.55, rx = S.L * 0.46, ry = H * 1.0, px = cx + Math.cos(a) * rx, py = Math.sin(a) * ry; d += `M${_gfaN(px)} ${_gfaN(py)}l${_gfaN(Math.cos(a) * 3.4)} ${_gfaN(Math.sin(a) * 3.4)}`; } s += `<path d="${d}" stroke="${e}" stroke-width="1.5" stroke-linecap="round"/>`; }
  if (S.paddle) s += `<path d="M${_gfaN(x1 - 3)} ${_gfaN(-H * 0.2)}L${_gfaN(x1 + 16)} ${_gfaN(-H * 0.46)}Q${_gfaN(x1 + 24)} ${_gfaN(-H * 0.2)} ${_gfaN(x1 + 16)} ${_gfaN(H * 0.1)}L${_gfaN(x1 - 3)} ${_gfaN(H * 0.1)}Z" fill="${_gfaDk(look.c, 0.08)}" stroke="${e}" stroke-width="1" stroke-linejoin="round"/>`;
  if (look.x === 'saw') { let d = `M${_gfaN(x1 - 3)} ${_gfaN(-H * 0.14)}H${_gfaN(x1 + 20)}V${_gfaN(H * 0.12)}H${_gfaN(x1 - 3)}Z`, t = ''; for (let i = 0; i < 6; i++) { const x = x1 + 1 + i * 3.4; t += `M${_gfaN(x)} ${_gfaN(-H * 0.14)}l1.2 -3l1.2 3M${_gfaN(x)} ${_gfaN(H * 0.12)}l1.2 3l1.2 -3`; } s += `<path d="${t}" fill="#fbfbf2" stroke="${e}" stroke-width="0.6"/><path d="${d}" fill="${_gfaDk(look.c, 0.06)}" stroke="${e}" stroke-width="1"/>`; }
  if (look.x === 'crown') s += `<path d="M${_gfaN(x1 - S.L * 0.3)} ${_gfaN(-H * 0.8)}l1.6 -5.6l3 3.4l3 -5l3 5l3 -3.4l1.2 6.2Z" fill="#f2c432" stroke="#8a6a1a" stroke-width="0.8" stroke-linejoin="round"/>`;
  if (look.x === 'frill') s += `<path d="M${_gfaN(x1 - S.L * 0.27)} ${_gfaN(-H * 0.4)}l-3 -7M${_gfaN(x1 - S.L * 0.27)} ${_gfaN(-H * 0.1)}l-6 -5M${_gfaN(x1 - S.L * 0.27)} ${_gfaN(H * 0.2)}l-6 3" stroke="${c3}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (look.x === 'spikes') { let d = ''; for (let i = 0; i < 6; i++) { const x = x0 + S.L * (0.3 + i * 0.09); d += `M${_gfaN(x)} ${_gfaN(H * 0.8)}l-3 ${_gfaN(H * 0.8)}`; } s += `<path d="${d}" stroke="${c3}" stroke-width="1.6" stroke-linecap="round"/>`; }
  return s;
}
/** The marks along an eel's length. */
function _gfaEelMarks(look, x0) {
  const p = look.p, m = look.c3 || '#1a1712'; let s = '';
  if (!p || p === 'none') return s;
  if (p === 'neon') return `<path d="M${x0 + 4} 0C${_gfaN(x0 + 16)} -10 ${_gfaN(x0 + 28)} 10 ${_gfaN(x0 + 46)} 1" stroke="${m}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 8; i++) {
    const x = x0 + 6 + i * 7, y = Math.sin((i + 0.6) * 0.9) * -5;
    if (p === 'rings' || p === 'saddle') s += `<path d="M${_gfaN(x)} ${_gfaN(y - 5.4)}v${p === 'rings' ? 10.8 : 6}" stroke="${m}" stroke-width="2.4"/>`;
    else if (p === 'stars') s += `<circle cx="${_gfaN(x)}" cy="${_gfaN(y)}" r="1.3" fill="${m}"/>`;
    else if (p === 'dapple' || p === 'lace') s += `<ellipse cx="${_gfaN(x)}" cy="${_gfaN(y)}" rx="2.6" ry="1.8" fill="${m}" fill-opacity="0.7"/>`;
    else if (p === 'ombre' && i < 4) s += `<circle cx="${_gfaN(x)}" cy="${_gfaN(y)}" r="3" fill="${m}" fill-opacity="0.6"/>`;
  }
  return s;
}
/* ---------- bugs ---------- */
/** Markings on an oval body at (cx, 0), half-sizes rx, ry. Bugs draw small, so these are chunky. */
function _gbMarks(p, cx, rx, ry, c2, c3) {
  const dot = (x, y, r, f) => `<circle cx="${_gfaN(x)}" cy="${_gfaN(y)}" r="${_gfaN(r)}" fill="${f}"/>`;
  switch (p) {
    case 'spots': return dot(cx - rx * 0.4, -ry * 0.5, 2, c2) + dot(cx + rx * 0.3, -ry * 0.45, 2, c2) + dot(cx - rx * 0.4, ry * 0.5, 2, c2) + dot(cx + rx * 0.3, ry * 0.45, 2, c2);
    case 'speckle': { let s = ''; for (let i = 0; i < 8; i++) s += dot(cx + rx * 0.7 * Math.cos(i * 2.4), ry * 0.7 * Math.sin(i * 2.4) * (i % 2 ? 0.6 : 1), 1, c2); return s; }
    case 'stripe': return `<path d="M${_gfaN(cx - rx * 0.8)} ${_gfaN(-ry * 0.4)}H${_gfaN(cx + rx * 0.7)}M${_gfaN(cx - rx * 0.8)} ${_gfaN(ry * 0.4)}H${_gfaN(cx + rx * 0.7)}" stroke="${c2}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'band': return `<path d="M${_gfaN(cx - rx * 0.1)} ${_gfaN(-ry * 0.92)}V${_gfaN(ry * 0.92)}" stroke="${c2}" stroke-width="${_gfaN(rx * 0.5)}"/>`;
    case 'metal': return `<ellipse cx="${_gfaN(cx - rx * 0.1)}" cy="${_gfaN(-ry * 0.42)}" rx="${_gfaN(rx * 0.6)}" ry="${_gfaN(ry * 0.26)}" fill="${c2}" fill-opacity="0.65"/><ellipse cx="${_gfaN(cx - rx * 0.1)}" cy="${_gfaN(ry * 0.44)}" rx="${_gfaN(rx * 0.5)}" ry="${_gfaN(ry * 0.16)}" fill="${c2}" fill-opacity="0.35"/>`;
    case 'ring': return `<ellipse cx="${_gfaN(cx)}" cy="0" rx="${_gfaN(rx * 1.5)}" ry="${_gfaN(ry * 1.5)}" fill="${c2}" fill-opacity="0.22"/><circle cx="${_gfaN(cx - rx * 0.4)}" cy="0" r="${_gfaN(Math.min(rx, ry) * 0.5)}" fill="${c2}"/>`;
    case 'fur': return `<path d="M${_gfaN(cx - rx * 0.6)} ${_gfaN(-ry * 0.7)}l2 3M${_gfaN(cx)} ${_gfaN(-ry * 0.8)}l2 3M${_gfaN(cx + rx * 0.5)} ${_gfaN(-ry * 0.6)}l2 3M${_gfaN(cx - rx * 0.6)} ${_gfaN(ry * 0.7)}l2 -3M${_gfaN(cx)} ${_gfaN(ry * 0.8)}l2 -3M${_gfaN(cx + rx * 0.5)} ${_gfaN(ry * 0.6)}l2 -3" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'ombre': return `<ellipse cx="${_gfaN(cx - rx * 0.4)}" cy="0" rx="${_gfaN(rx * 0.56)}" ry="${_gfaN(ry * 0.72)}" fill="${c3}" fill-opacity="0.8"/><ellipse cx="${_gfaN(cx + rx * 0.3)}" cy="0" rx="${_gfaN(rx * 0.3)}" ry="${_gfaN(ry * 0.6)}" fill="${c2}" fill-opacity="0.7"/>`;
    default: return '';
  }
}
/** A bug with a body of its own, or '' when this table does not know the shape. */
function _gbaMore(shape, c, c2, c3, e, p, line) {
  const eyes = (x, r) => _gfaEyes(x, r, e), M = (cx, rx, ry) => _gbMarks(p, cx, rx, ry, c2, c3), gloss = (x, y, w) => `<path d="M${x} ${y}q${w / 2} -3 ${w} -1" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  switch (shape) {
    case 'ant': return _gfaLegs([[-1, 3, -5, 8], [3, 3, 0, 8], [7, 3, 5, 7]], e, 1.8) + `<ellipse cx="-11" cy="0" rx="8" ry="6.4" fill="${c}" ${line}/><circle cx="3" cy="0" r="4" fill="${c}" ${line}/><circle cx="12" cy="0" r="5.4" fill="${c}" ${line}/>` + M(-11, 6, 5) + eyes(12, 5.4) + _gfaFeel(15, e, 3.4, 0.8);
    case 'wasp': return `<g class="gba-wings"><ellipse cx="-3" cy="-9" rx="10" ry="3.6" fill="${c3}" fill-opacity="0.65" stroke="${e}" stroke-width="0.8" transform="rotate(-14 -3 -9)"/><ellipse cx="-3" cy="9" rx="10" ry="3.6" fill="${c3}" fill-opacity="0.65" stroke="${e}" stroke-width="0.8" transform="rotate(14 -3 9)"/></g>` + _gfaLegs([[2, 3, -2, 7], [6, 3, 3, 7]], e, 1.6) + `<path d="M-22 0L-17 -5C-12 -8 -5 -7 -2 -2V2C-5 7 -12 8 -17 5Z" fill="${c}" ${line}/><path d="M-14 -6.6V6.6M-8 -6.6V6.6" stroke="${c2}" stroke-width="3.4"/><ellipse cx="3" cy="0" rx="5" ry="4" fill="${c}" ${line}/><circle cx="11" cy="0" r="5" fill="${c}" ${line}/>` + (p === 'metal' ? M(-10, 8, 5) : '') + eyes(11, 5) + _gfaFeel(14, e, 3.2, 0.8);
    case 'fly': return `<g class="gba-wings"><ellipse cx="-7" cy="-8" rx="10" ry="5.4" fill="#e8f0f4" fill-opacity="0.7" stroke="${e}" stroke-width="0.8" transform="rotate(-22 -7 -8)"/><ellipse cx="-7" cy="8" rx="10" ry="5.4" fill="#e8f0f4" fill-opacity="0.7" stroke="${e}" stroke-width="0.8" transform="rotate(22 -7 8)"/></g>` + _gfaLegs([[0, 5, -3, 5], [4, 5, 3, 5]], e, 1.6) + `<ellipse cx="-3" cy="0" rx="10" ry="6.8" fill="${c}" ${line}/>` + M(-3, 9, 6) + `<circle cx="9" cy="0" r="6" fill="${c}" ${line}/>` + `<circle cx="11" cy="-3.6" r="3.2" fill="#b0322a" stroke="${e}" stroke-width="0.5"/><circle cx="11" cy="3.6" r="3.2" fill="#b0322a" stroke="${e}" stroke-width="0.5"/>` + gloss(-9, -3, 8);
    case 'crane': return `<path d="M0 -2L-8 -16L-16 -14M4 -2L6 -18L14 -18M0 2L-8 16L-16 14M4 2L6 18L14 18M-4 -2L-16 -6L-22 -3M-4 2L-16 6L-22 3" stroke="${e}" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g class="gba-wings"><ellipse cx="-5" cy="-7" rx="11" ry="3" fill="${c3}" fill-opacity="0.6" stroke="${e}" stroke-width="0.7" transform="rotate(-20 -5 -7)"/><ellipse cx="-5" cy="7" rx="11" ry="3" fill="${c3}" fill-opacity="0.6" stroke="${e}" stroke-width="0.7" transform="rotate(20 -5 7)"/></g><path d="M-20 0H6" stroke="${e}" stroke-width="5" stroke-linecap="round"/><path d="M-20 0H6" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>` + (p === 'stripe' ? `<path d="M-16 0h2M-10 0h2M-4 0h2" stroke="${c2}" stroke-width="3.4"/>` : '') + `<circle cx="9" cy="0" r="4" fill="${c}" ${line}/>` + eyes(9, 4);
    case 'earwig': return _gfaLegs([[-2, 4, -3, 6], [3, 4, 0, 6], [8, 4, 3, 5]], e, 1.8) + `<path d="M-14 -3Q-26 -10 -24 -2M-14 3Q-26 10 -24 2" stroke="${c2 === c ? e : c2}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-17 -4Q2 -7 12 -3V3Q2 7 -17 4Z" fill="${c}" ${line}/><path d="M-11 -5V5M-5 -5.6V5.6" stroke="${e}" stroke-width="1" stroke-opacity="0.6"/>` + M(-3, 12, 4) + `<circle cx="13" cy="0" r="4.6" fill="${c}" ${line}/>` + eyes(13, 4.6) + _gfaFeel(16, e, 3, 0.7);
    case 'woodlouse': { let d = ''; for (let i = 0; i < 5; i++) d += `M${-11 + i * 5} -8.6q1.6 8.6 0 17.2`; return _gfaLegs([[-8, 9, -1, 3], [-2, 10, 0, 3], [4, 9, 1, 3]], e, 1.6) + `<path d="M-16 0C-16 -13 14 -13 16 0C14 13 -16 13 -16 0Z" fill="${c}" ${line}/><path d="${d}" stroke="${e}" stroke-width="1.2" stroke-opacity="0.6" fill="none"/>` + gloss(-8, -6, 10) + eyes(13, 4) + _gfaFeel(15, e, 3, 0.7); }
    case 'centipede': { let s = '', d = ''; for (let i = 0; i < 8; i++) { const x = -19 + i * 4.8, y = Math.sin(i * 0.9) * 2; d += `M${_gfaN(x)} ${_gfaN(y - 3)}l-1 -5M${_gfaN(x)} ${_gfaN(y + 3)}l-1 5`; } s += `<path d="${d}" stroke="${e}" stroke-width="1.4" stroke-linecap="round"/>`; for (let i = 0; i < 8; i++) { const x = -19 + i * 4.8, y = Math.sin(i * 0.9) * 2; s += `<circle cx="${_gfaN(x)}" cy="${_gfaN(y)}" r="3.6" fill="${p === 'stripe' && i % 2 ? c2 : c}" ${line}/>`; } return s + `<circle cx="20" cy="${_gfaN(Math.sin(8 * 0.9) * 2)}" r="4.4" fill="${c}" ${line}/>` + eyes(20, 4.4) + _gfaFeel(22, e, 3, 0.8); }
    case 'slug': return `<path d="M-20 7Q-16 -4 -4 -6Q10 -9 17 0Q20 6 16 8Q-2 11 -20 7Z" fill="${c}" ${line}/><path d="M13 -1Q14 -7 13 -10M17 0Q20 -5 20 -9" stroke="${e}" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="13" cy="-11" r="2" fill="#fbf8ee" stroke="${e}" stroke-width="0.6"/><circle cx="13.5" cy="-11" r="1.1" fill="#1a1712"/><circle cx="20" cy="-10" r="2" fill="#fbf8ee" stroke="${e}" stroke-width="0.6"/><circle cx="20.5" cy="-10" r="1.1" fill="#1a1712"/>` + (p === 'spots' ? `<circle cx="-8" cy="0" r="1.8" fill="${c2}"/><circle cx="-1" cy="-3" r="2" fill="${c2}"/><circle cx="6" cy="0" r="1.6" fill="${c2}"/><circle cx="-13" cy="3" r="1.4" fill="${c2}"/>` : p === 'stripe' ? `<path d="M-16 4Q-6 -1 10 -3" stroke="${c2}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : gloss(-8, -2, 12));
    case 'worm': return `<path d="M-20 3Q-12 -7 -3 2T14 -1" stroke="${e}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-20 3Q-12 -7 -3 2T14 -1" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>` + (p === 'stripe' || p === 'fur' ? `<path d="M-15 -1v4M-9 -3v4M-3 0v4M3 1v4M9 0v4" stroke="${c2}" stroke-width="1.6"/>` : `<path d="M-8 -3l2 4" stroke="${c2}" stroke-width="2.2"/>`) + eyes(14, 3.6);
    case 'weevil': return _gfaLegs([[-5, 8, -3, 5], [0, 8, 0, 5], [5, 7, 3, 4]], e, 2) + `<path d="M12 0H25" stroke="${e}" stroke-width="3.4" stroke-linecap="round"/><path d="M19 -1l3 -5M19 1l3 5" stroke="${e}" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="-4" cy="0" rx="11.5" ry="9.4" fill="${c}" ${line}/>` + M(-4, 10, 8) + gloss(-10, -4, 10) + `<circle cx="10" cy="0" r="5" fill="${_gfaDk(c, 0.15)}" ${line}/>` + eyes(9, 5);
    case 'longhorn': return _gfaLegs([[-5, 7, -3, 5], [1, 7, 0, 5], [6, 7, 3, 4]], e, 2) + `<path d="M12 -3Q24 -19 6 -21Q-10 -22 -18 -14M12 3Q24 19 6 21Q-10 22 -18 14" stroke="${e}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M-18 -4Q-18 -8 -8 -8H6Q9 -8 9 0Q9 8 6 8H-8Q-18 8 -18 4Z" fill="${c}" ${line}/><path d="M-17 0H8" stroke="${e}" stroke-width="1" stroke-opacity="0.6"/>` + M(-5, 11, 7) + `<circle cx="11" cy="0" r="4.8" fill="${_gfaDk(c, 0.15)}" ${line}/>` + eyes(11, 4.8);
    case 'rhino': return _gfaLegs([[-6, 10, -3, 5], [0, 11, 0, 5], [6, 10, 3, 4]], e, 2.4) + `<path d="M-15 -7Q-15 -13 -3 -13Q9 -13 9 0Q9 13 -3 13Q-15 13 -15 7Z" fill="${c}" ${line}/><path d="M-14 0H8" stroke="${e}" stroke-width="1" stroke-opacity="0.6"/>` + M(-3, 10, 11) + gloss(-10, -7, 12) + `<circle cx="10" cy="0" r="6.4" fill="${_gfaDk(c, 0.15)}" ${line}/>` + eyes(10, 6.4) + `<path d="M14 0Q24 -1 25 -9L27 -9Q28 2 15 3Z" fill="${c2 === c ? _gfaLt(c, 0.2) : _gfaDk(c, 0.3)}" stroke="${e}" stroke-width="1" stroke-linejoin="round"/>`;
    case 'scarab': return _gfaLegs([[-6, 11, -4, 5], [0, 12, 0, 5], [7, 11, 4, 4]], e, 2.2) + `<path d="M-15 0C-15 -16 8 -15 10 0C8 15 -15 16 -15 0Z" fill="${c}" ${line}/><path d="M-14 0H9" stroke="${e}" stroke-width="1" stroke-opacity="0.6"/>` + M(-3, 11, 12) + gloss(-9, -7, 12) + `<path d="M9 -7Q17 -6 18 0Q17 6 9 7Q11 0 9 -7Z" fill="${_gfaDk(c, 0.12)}" ${line}/><path d="M18 -3l3 -2M18 0h4M18 3l3 2" stroke="${e}" stroke-width="1.6" stroke-linecap="round"/>` + eyes(11, 4.6);
    case 'shield': return _gfaLegs([[-4, 9, -3, 5], [1, 9, 0, 5], [6, 7, 3, 5]], e, 1.8) + `<path d="M-17 0L1 -14L13 -8V8L1 14Z" fill="${c}" ${line}/><path d="M-13 0L1 -9V9Z" fill="${c2}" fill-opacity="0.65"/>` + `<circle cx="14" cy="0" r="4" fill="${_gfaDk(c, 0.2)}" ${line}/>` + eyes(14, 4) + _gfaFeel(16, e, 3, 0.7);
    case 'boatman': return `<path d="M0 -6Q-6 -18 -18 -16M0 6Q-6 18 -18 16" stroke="${e}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M0 -6Q-6 -18 -18 -16M0 6Q-6 18 -18 16" stroke="${c2}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M6 -6l5 -4M6 6l5 4" stroke="${e}" stroke-width="1.8" stroke-linecap="round"/><path d="M-18 0C-18 -10 6 -11 12 0C6 11 -18 10 -18 0Z" fill="${c}" ${line}/><path d="M-16 0H10" stroke="${e}" stroke-width="1" stroke-opacity="0.55"/>` + M(-3, 12, 8) + gloss(-11, -5, 11) + eyes(10, 4.6);
    case 'lacewing': { const g = (m) => `<g transform="scale(1 ${m})"><path d="M2 -1C1 -9 -10 -19 -17 -16C-20 -11 -10 -4 -3 -1Z" fill="${c3}" fill-opacity="${p === 'glass' ? 0.45 : 0.68}" stroke="${e}" stroke-width="0.8"/><path d="M4 -1C7 -9 2 -18 -6 -18C-11 -15 -7 -5 0 -1Z" fill="${c}" fill-opacity="${p === 'glass' ? 0.45 : 0.72}" stroke="${e}" stroke-width="0.8"/><path d="M1 -3L-5 -15M-2 -2L-13 -13" stroke="${e}" stroke-width="0.7" stroke-opacity="0.7"/>${p === 'tails' ? `<path d="M-15 -14Q-24 -9 -26 2" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="-26" cy="3" r="2.4" fill="${c2}"/>` : ''}${p === 'eyes' ? `<circle cx="-5" cy="-11" r="2.6" fill="${c2}"/>` : ''}</g>`; return `<g class="gba-wings">${g(1)}${g(-1)}</g><path d="M-14 0H6" stroke="${e}" stroke-width="4.8" stroke-linecap="round"/><path d="M-14 0H6" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/><circle cx="8" cy="0" r="3.8" fill="${c}" ${line}/>` + `<circle cx="9.4" cy="-2.2" r="1.8" fill="#e8c23a" stroke="${e}" stroke-width="0.5"/><circle cx="9.4" cy="2.2" r="1.8" fill="#e8c23a" stroke="${e}" stroke-width="0.5"/>` + _gfaFeel(11, e, 2.4, 1); }
    case 'mayfly': return `<g class="gba-wings"><path d="M3 -1C8 -10 4 -19 -4 -19C-10 -15 -4 -5 0 -1Z" fill="${c3}" fill-opacity="0.72" stroke="${e}" stroke-width="0.8"/><path d="M3 1C8 10 4 19 -4 19C-10 15 -4 5 0 1Z" fill="${c3}" fill-opacity="0.72" stroke="${e}" stroke-width="0.8"/></g><path d="M-14 0L-26 -5M-14 0L-27 0M-14 0L-26 5" stroke="${e}" stroke-width="1.2" stroke-linecap="round"/><path d="M-14 0H6" stroke="${e}" stroke-width="5" stroke-linecap="round"/><path d="M-14 0H6" stroke="${c}" stroke-width="3.6" stroke-linecap="round"/>` + (p === 'ring' ? `<circle cx="-2" cy="0" r="13" fill="${c2}" fill-opacity="0.18"/>` : p === 'fur' ? `<path d="M-10 -2v4M-5 -2v4M0 -2v4" stroke="${c2}" stroke-width="1.6"/>` : '') + `<circle cx="9" cy="0" r="4" fill="${c}" ${line}/>` + eyes(9, 4);
    case 'scorpion': return `<path d="M-2 -4L-6 -12L-10 -12M2 -5L2 -13L-2 -15M-2 4L-6 12L-10 12M2 5L2 13L-2 15" stroke="${e}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-8 0Q-22 2 -24 -8Q-22 -15 -13 -13" stroke="${e}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-8 0Q-22 2 -24 -8Q-22 -15 -13 -13" stroke="${c}" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M-13 -13l5 -2l-3 5z" fill="${c2}" stroke="${e}" stroke-width="0.8"/><path d="M8 -4Q18 -12 26 -8Q29 -4 24 -3Q21 -5 19 -3L12 -1M8 4Q18 12 26 8Q29 4 24 3Q21 5 19 3L12 1" fill="${c}" ${line}/><ellipse cx="0" cy="0" rx="12" ry="6.8" fill="${c}" ${line}/>` + M(-1, 10, 5) + eyes(9, 4);
    case 'leaf': return _gfaLegs([[-8, 8, -3, 6], [0, 10, 0, 6], [8, 7, 3, 6]], e, 1.8) + `<path d="M-20 0C-14 -14 4 -15 15 0C4 15 -14 14 -20 0Z" fill="${c}" ${line}/><path d="M-18 0H13M-10 0L-5 -8M-10 0L-5 8M-2 0L3 -7M-2 0L3 7" stroke="${_gfaDk(c, 0.35)}" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="15" cy="0" r="3.6" fill="${c}" ${line}/>` + eyes(15, 3.6);
    case 'katydid': return `<path d="M-2 -4L-13 -13L-20 -10M-2 4L-13 13L-20 10" stroke="${e}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + _gfaLegs([[4, 4, 2, 6]], e, 1.8) + `<path d="M13 -2Q24 -14 26 -21M13 2Q24 14 26 21" stroke="${e}" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M-20 0C-12 -9 2 -8 10 -4V4C2 8 -12 9 -20 0Z" fill="${c}" ${line}/><path d="M-16 0H8M-8 0L-3 -5M-8 0L-3 5" stroke="${c2}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` + (p === 'speckle' ? `<circle cx="-11" cy="-2" r="1" fill="${e}"/><circle cx="-5" cy="3" r="1" fill="${e}"/><circle cx="1" cy="-3" r="1" fill="${e}"/>` : '') + `<ellipse cx="12" cy="0" rx="4.6" ry="4.4" fill="${_gfaDk(c, 0.08)}" ${line}/>` + eyes(12, 4.4);
    case 'roach': return _gfaLegs([[-5, 8, -5, 7], [1, 9, 0, 7], [6, 8, 5, 6]], e, 1.8) + `<path d="M8 -4Q18 -16 25 -13M8 4Q18 16 25 13" stroke="${e}" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M-19 0C-19 -11 4 -12 11 -5V5C4 12 -19 11 -19 0Z" fill="${c}" ${line}/><path d="M-17 0H9" stroke="${e}" stroke-width="1" stroke-opacity="0.6"/>` + M(-4, 12, 8) + gloss(-13, -5, 13) + `<ellipse cx="12" cy="0" rx="4.4" ry="5.6" fill="${_gfaDk(c, 0.16)}" ${line}/>` + eyes(12, 5);
    case 'mite': return _gfaLegs([[-6, 6, -4, 5], [-1, 7, -1, 5], [3, 7, 2, 5], [7, 5, 4, 5]], e, 1.6) + `<circle cx="0" cy="0" r="10.5" fill="${c}" ${line}/>` + (p === 'ring' ? `<circle cx="0" cy="0" r="15" fill="${c2}" fill-opacity="0.26"/>` : p === 'fur' ? `<path d="M-6 -6l-2 -2M0 -8v-2.4M6 -6l2 -2M-6 6l-2 2M0 8v2.4M6 6l2 2" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/>` : '') + gloss(-6, -4, 8) + eyes(7, 4.4);
    default: return '';
  }
}

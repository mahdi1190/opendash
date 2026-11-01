/* ============================================================
   THINGS YOU HOLD, the drawings (the tables: 94-garden-style-0rules.js). Each is drawn from data on your back, in your hand, on the end of your line and in friends' views.
   A rod's shaft is drawn along +x from 0 to 64, and turned to fit. What is on its tip stays upright, so a lantern hangs down whichever way the rod points.
   ============================================================ */
const _gsN = (v) => (Math.round(v * 10) / 10).toString();
const _gsL = (c, w, d, more) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${more || ''}/>`;
const _gsF = (c, d, more) => `<path d="${d}" fill="${c}"${more || ''}/>`;
const _gsC = (x, y, r, c, more) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"${more || ''}/>`;
const _gsE = (x, y, rx, ry, c, more) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"${more || ''}/>`;
const _gsDk = (c, k) => _gdaShade(c, k == null ? -0.35 : k);
const _GS_INK = '#2a2018';

function _gsShaft(R) {
  const c = R.c, c2 = R.c2 || c, line = 'M0 0H64', edge = _gsDk(c);
  const grip = _gsL(R.g || '#3a2a1a', 4, 'M0 0H10');
  const base = (d, w) => _gsL(edge, (w || 2.4) + 1.1, d || line) + _gsL(c, w || 2.4, d || line);
  switch (R.sh) {
    case 'knots': { let s = base(); for (let x = 14; x < 64; x += 11) s += _gsL(c2, 1.2, `M${x} -1.9V1.9`); return s + grip; }
    case 'wobble': { const d = 'M0 0Q8 -3.4 16 -0.6T32 1T48 -1.6T64 0'; return base(d, 2.8) + _gsL(c2, 0.7, 'M6 -1Q14 -2 22 -0.2T40 0', ' stroke-opacity="0.8"') + _gsL(c2, 0.7, 'M34 0.8Q44 -1.6 58 -0.6', ' stroke-opacity="0.8"') + grip; }
    case 'vine': { let s = base(); for (let x = 16; x < 62; x += 12) { const u = (x / 12 | 0) % 2 ? -1 : 1; s += _gsF(c2, `M${x} 0q3 ${u * 5} 7 ${u * 3.4}q-3 ${-u * 3.4} -7 ${-u * 3.4}z`); } return s + grip; }
    case 'stripes': return base(null, 3) + _gsL(c2, 3, 'M10 0H64', ' stroke-dasharray="4 5" stroke-linecap="butt"') + grip;
    case 'bones': { let s = ''; for (let x = 10; x < 62; x += 14) s += _gsL(R.c2, 3.6, `M${x + 1} 0h11`) + _gsL(c, 2.4, `M${x + 1} 0h11`) + _gsC(x, -1.5, 1.8, c) + _gsC(x, 1.5, 1.8, c) + _gsC(x + 13, -1.5, 1.8, c) + _gsC(x + 13, 1.5, 1.8, c); return _gsL(R.c2, 0.8, line) + s + grip; }
    case 'bands': { const cols = ['#d8352a', '#ec8a2a', '#f2c432', '#4aa86a', '#3a7ac4', '#7a4ab4']; let s = _gsL('#2a2a32', 3.6, line); cols.forEach((k, i) => { s += _gsL(k, 2.6, `M${10 + i * 9} 0h9`, ' stroke-linecap="butt"'); }); return s + grip; }
    case 'twist': return base() + _gsL(c2, 1.1, 'M8 0q3 -3 6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0') + grip;
    case 'scales': { let s = base(null, 3.2); for (let x = 12; x < 62; x += 5) s += _gsL(c2, 0.9, `M${x} -1.4q2 1.4 0 2.8`); return s + grip; }
    default: return base() + _gsL(c2, 0.8, 'M8 -0.7H62', ' stroke-opacity="0.7"') + grip;
  }
}
/** What is on the end, upright, centred on the tip. */
function _gsTip(kind, night) {
  switch (kind) {
    case 'leaf': return _gsF('#6f9a3a', 'M0 0q7 -5 9 -2q-1 5 -9 2z') + _gsF('#8fb04a', 'M0 0q-2 -8 2 -9q4 4 -2 9z');
    case 'shell': return _gsL('#d8c48e', 0.7, 'M0 0v4') + _gsF('#f0d8c0', 'M-5 9Q0 1 5 9Q0 12 -5 9z', ` stroke="#b88a6a" stroke-width="0.7"`) + _gsL('#b88a6a', 0.6, 'M0 4v7M-2.4 6l1 5M2.4 6l-1 5');
    case 'sprig': return _gsL('#6f9a4a', 1, 'M0 0q4 3 3 9M0 0q-2 4 -4 8') + _gsF('#6f9a4a', 'M3 9q2 2 0 5q-2 -2 0 -5zM-4 8q2 2 0 5q-2 -2 0 -5z');
    case 'bulrush': return _gsF('#6a4426', 'M-2.6 3Q-3 -5 -2 -9Q0 -11 2 -9Q3 -5 2.6 3Q0 4.4 -2.6 3z') + _gsL('#8a6642', 0.7, 'M-1 -7V1') + _gsL('#7f9a4a', 1.1, 'M0 -10v-4');
    case 'bow': return _gsF('#d8352a', 'M0 0L-7 -4V4zM0 0L7 -4V4z') + _gsC(0, 0, 1.7, '#a8251c') + _gsL('#d8352a', 1.3, 'M0 1l-3 6M0 1l3 6');
    case 'holly': return _gsF('#2f6a3a', 'M0 0l-3 -2l-2 1l-1 -3l-3 -1l2 -2l3 1l1 -1l2 2zM0 0l3 -2l2 1l1 -3l3 -1l-2 -2l-3 1l-1 -1l-2 2z') + _gsC(-1.6, 1, 1.8, '#d8352a') + _gsC(1.8, 1.2, 1.8, '#d8352a') + _gsC(0.1, -1.6, 1.8, '#e8453a');
    case 'crystal': return _gsF('#dff4fa', 'M0 -10L4 -3L2.6 5L0 9L-2.6 5L-4 -3z', ` stroke="#6a9ab4" stroke-width="0.8"`) + _gsF('#ffffff', 'M-1 -7L-2 -2L-1 3z', ' fill-opacity="0.8"');
    case 'skull': return _gsF('#f4eedc', 'M-5.6 -2Q-6 -9 0 -9Q6 -9 5.6 -2Q5.6 1 3 1.6V4H-3V1.6Q-5.6 1 -5.6 -2z', ` stroke="#5a5448" stroke-width="0.8"`) + _gsC(-2.2, -3.4, 1.5, '#2a2a32') + _gsC(2.2, -3.4, 1.5, '#2a2a32') + _gsL('#2a2a32', 0.7, 'M-1.2 4V2M1.2 4V2');
    case 'pumpkin': return _gsE(0, -3, 7, 5.6, '#e87a1a', ` stroke="#a8501c" stroke-width="0.8"`) + _gsL('#a8501c', 0.7, 'M-3 -8Q-4.6 -3 -3 2M3 -8Q4.6 -3 3 2') + _gsL('#5f7a3a', 1.6, 'M0 -8v-3') + _gsF('#3a1a0a', 'M-3.6 -5l2 -1v2zM3.6 -5l-2 -1v2zM-3 -1q3 2 6 0q-3 3 -6 0z');
    case 'sunflower': { let s = ''; for (let i = 0; i < 10; i++) { const a = i * 36; s += `<path d="M0 -5.6Q2 -9 0 -11Q-2 -9 0 -5.6z" fill="#f2c432" stroke="#c88a1a" stroke-width="0.4" transform="rotate(${a})"/>`; } return s + _gsC(0, 0, 5.2, '#6a4426') + _gsC(-1, -1, 1.4, '#8a6442'); }
    case 'toadstool': return _gsF('#f4ecd8', 'M-2 5V-1H2V5z') + _gsF('#d8352a', 'M-8 -1Q-7 -9 0 -9Q7 -9 8 -1Q0 2 -8 -1z', ` stroke="#8a1a14" stroke-width="0.7"`) + _gsC(-3.4, -4, 1.3, '#fbf5ec') + _gsC(2, -6, 1.4, '#fbf5ec') + _gsC(4, -2.4, 1, '#fbf5ec');
    case 'lantern': return (night ? _gsC(0, 8, 14, '#ffd97a', ' fill-opacity="0.34"') : '') + _gsL('#22222a', 0.9, 'M0 0V3') + _gsF('#22222a', 'M-4.4 3h8.8l-1 2h-6.8z') + _gsF(night ? '#ffe28a' : '#f4e6b0', 'M-3.8 5h7.6v8h-7.6z', ` stroke="#22222a" stroke-width="0.9"`) + _gsF('#22222a', 'M-4.4 13h8.8v1.6h-8.8z') + _gsL('#22222a', 0.5, 'M0 5v8');
    case 'feather': return _gsF('#f6f2ea', 'M0 2Q-7 -7 -1 -17Q6 -9 0 2z', ` stroke="#b8a678" stroke-width="0.7"`) + _gsL('#b8a678', 0.6, 'M0 2Q-1 -8 -1 -15M-1 -5l-3 -2M-1 -8l3 -3M-1 -11l-2 -2');
    case 'coral': return _gsL('#e87a6a', 2, 'M0 3V-6M0 -2L-5 -8M0 -4L5 -10M-3 -5L-6 -4M3 -7L7 -7M0 -6L1 -12') + _gsC(-5, -8, 1, '#fbd0c0') + _gsC(5, -10, 1, '#fbd0c0') + _gsC(1, -12, 1, '#fbd0c0');
    case 'star': return _gsF('#ffe27a', 'M0 -9L2.4 -3L8.6 -2.8L3.8 1.2L5.4 7.2L0 3.8L-5.4 7.2L-3.8 1.2L-8.6 -2.8L-2.4 -3z', ` stroke="#c88a1a" stroke-width="0.7"`);
    case 'flame': return _gsF('#e8452a', 'M0 3Q-7 -2 -3 -7Q-2 -5 -1 -5Q-3 -10 1 -13Q1 -9 4 -7Q7 -3 0 3z') + _gsF('#f2c432', 'M0 2Q-3.4 -1 -1 -5Q0 -3 1 -4Q3.4 -1 0 2z');
    default: return '';
  }
}
function _gsRodParts(R, x0, y0, x1, y1, night) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, k = len / 64, ang = Math.atan2(dy, dx) * 180 / Math.PI;
  return { shaft: `translate(${_gsN(x0)} ${_gsN(y0)}) rotate(${_gsN(ang)}) scale(${k.toFixed(3)})`, tip: `translate(${_gsN(x1)} ${_gsN(y1)}) scale(${Math.max(0.75, k).toFixed(3)})`, shaftArt: _gsShaft(R), tipArt: _gsTip(R.tip, night) };
}
function gardenLookRodBetween(id, x0, y0, x1, y1, night) {
  const R = gardenLookDef(id); if (!R || R.kind !== 'rod') return '';
  const p = _gsRodParts(R, x0, y0, x1, y1, night);
  return `<g transform="${p.shaft}">${p.shaftArt}</g><g transform="${p.tip}">${p.tipArt}</g>`;
}
function _gsDark() { try { const t = gardenHere().tod; return t === 'night' || t === 'dusk'; } catch (e) { return false; } }
/** On your back. '' for an id this app does not know: the plain rod is drawn instead. */
function gardenLookRodOnBack(id, tip, reel) {
  const art = gardenLookRodBetween(id, -9, -22, 14, tip, _gsDark());
  return art ? `<g class="gpl-slung">${art}<circle cx="-6.2" cy="-28.5" r="2.6" fill="#3a2a1a"/>${reel || ''}</g>` : '';
}
/** In your hand (T.rod: the hand at 0,0). */
function gardenLookRodInHand(id) { return gardenLookRodBetween(id, 0, 3, 19, -30, _gsDark()); }
/** On the end of a line: over the game's own rod, which goes see-through. el is the path it replaces. */
function gardenLookRodSkin(id, el, parent) {
  const R = id ? gardenLookDef(id) : null; if (!R || R.kind !== 'rod' || !el || !parent) return null;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'), night = _gsDark();
  g.setAttribute('class', 'gs-skin'); g.setAttribute('pointer-events', 'none');
  g.innerHTML = `<g class="gs-s">${_gsShaft(R)}</g><g class="gs-t">${_gsTip(R.tip, night)}</g>`;
  el.style.strokeOpacity = '0';
  parent.appendChild(g);
  return { g, s: g.firstChild, t: g.lastChild, R };
}
function gardenLookRodSkinAt(sk, x0, y0, x1, y1) {
  if (!sk) return;
  const p = _gsRodParts(sk.R, x0, y0, x1, y1);
  sk.g.setAttribute('visibility', 'visible'); sk.s.setAttribute('transform', p.shaft); sk.t.setAttribute('transform', p.tip);
}

/* ---------- nets: the hoop centred at 0,0 ---------- */
function _gsNetHead(N) {
  const c = N.c, c2 = N.c2, ring = `stroke="${c}" stroke-width="1.8" stroke-linejoin="round"`, mesh = _gsL(_gsDk(c2, -0.2), 0.5, 'M-6 -3L6 5M-6 3L6 -5M-3 -7L4 7M3 -7L-4 7', ' stroke-opacity="0.65"');
  let s = '';
  switch (N.hoop) {
    case 'square': s = `<path d="M-8 -8H8V8H-8z" fill="${c2}" fill-opacity="0.65" ${ring}/>` + _gsL(c, 0.7, 'M-8 -3H8M-8 3H8M-3 -8V8M3 -8V8'); break;
    case 'heart': s = `<path d="M0 9Q-11 1 -9 -5Q-6 -11 0 -5Q6 -11 9 -5Q11 1 0 9z" fill="${c2}" fill-opacity="0.72" ${ring}/>` + mesh; break;
    case 'star': s = `<path d="M0 -11L3 -3.6L10.6 -3.4L4.6 1.4L6.8 9L0 4.6L-6.8 9L-4.6 1.4L-10.6 -3.4L-3 -3.6z" fill="${c2}" fill-opacity="0.75" ${ring}/>`; break;
    case 'ribs': s = `<ellipse rx="8" ry="9.5" fill="${c2}" fill-opacity="0.32" ${ring}/>` + _gsL(c, 1.3, 'M-7.6 -4Q0 -1 7.6 -4M-8 0.6Q0 3.6 8 0.6M-6.4 5Q0 7.6 6.4 5M0 -9.4V9.4'); break;
    default: s = `<ellipse rx="8" ry="9.5" fill="${c2}" fill-opacity="0.68" ${ring}/>` + mesh;
  }
  switch (N.bits) {
    case 'wings': s += _gsF('#f2c432', 'M9 -11q3 -3 4 0q-1 3 -4 0zM9 -11q-3 -3 -4 0q1 3 4 0z', ' stroke="#8a5a1a" stroke-width="0.4"'); break;
    case 'cork': s += _gsE(-8, 10, 2.4, 1.6, '#c89a5a') + _gsE(0, 11, 2.4, 1.6, '#c89a5a') + _gsE(8, 10, 2.4, 1.6, '#c89a5a'); break;
    case 'weed': s += _gsL('#3f7a5a', 1.2, 'M-6 8q-3 3 -1 7M0 9q2 3 0 7M6 8q3 3 1 6') + _gsF('#f0d8c0', 'M-2 -2Q0 -6 2 -2Q0 0 -2 -2z', ' stroke="#b88a6a" stroke-width="0.4"'); break;
    case 'ribbon': s += _gsF('#d8452a', 'M-9 -5q9 -3 18 0v2q-9 -3 -18 0z') + _gsF('#d8452a', 'M8 -4l5 -3v5z'); break;
    case 'skull': s += `<g transform="translate(0 2) scale(0.7)">${_gsTip('skull')}</g>`; break;
    case 'grin': s += _gsF('#3a1a0a', 'M-4 -3l2.4 -1.4v2.8zM4 -3l-2.4 -1.4v2.8zM-4 2q4 3 8 0q-4 5 -8 0z') + _gsL('#5f7a3a', 1.4, 'M0 -9.5v-3'); break;
    case 'flake': s += _gsL('#ffffff', 0.9, 'M0 -6V6M-5 -3L5 3M-5 3L5 -3'); break;
    case 'glow': s += _gsE(0, 0, 11, 12, '#ffcf7a', ' fill-opacity="0.26"') + _gsL(c, 0.7, 'M-7 -3H7M-7 3H7'); break;
    case 'sparks': s += _gsC(0, 0, 1.3, '#ffe27a') + _gsC(-3, 3, 0.8, '#ffffff') + _gsC(3, -2, 0.8, '#ffffff'); break;
    default: break;
  }
  return s;
}
/** On your back, in the same place as the plain net. */
function gardenLookNetOnBack(id) {
  const N = gardenLookDef(id); if (!N || N.kind !== 'net') return '';
  return `<g class="gpl-slung">${_gsL(_gsDk(N.p), 2.5, 'M9 -24L-9 -62')}${_gsL(N.p, 1.6, 'M9 -24L-9 -62')}<g transform="translate(-11.5 -67)">${_gsNetHead(N)}</g></g>`;
}
/** At the end of a swing (the arc's end is at 30, -34). */
function gardenLookNetSwing(id) {
  const N = id ? gardenLookDef(id) : null;
  return N && N.kind === 'net' ? `<g transform="translate(30 -38)">${_gsNetHead(N)}</g>` : '';
}

/* ---------- carried: the hand at 0,0 ---------- */
function _gsBrolly(H) {
  const c = H.c, c2 = H.c2, top = -66, R = 25;
  const dome = `M${-R} ${top}Q${-R + 2} ${top - 21} 0 ${top - 22}Q${R - 2} ${top - 21} ${R} ${top}Q${R * 0.75} ${top - 5} ${R * 0.5} ${top}Q${R * 0.25} ${top - 5} 0 ${top}Q${-R * 0.25} ${top - 5} ${-R * 0.5} ${top}Q${-R * 0.75} ${top - 5} ${-R} ${top}z`;
  let s = _gsL('#6a4a2a', 1.8, `M0 4V${top - 20}`) + _gsL('#6a4a2a', 1.8, 'M0 4q0 4 3.4 4t3.4 -3') + _gsF(c, dome, ` stroke="${_gsDk(c)}" stroke-width="1" stroke-linejoin="round"`);
  if (H.pat === 'stripes') s += _gsF(c2, `M${-R * 0.5} ${top}Q${-R * 0.42} ${top - 16} 0 ${top - 22}Q${-R * 0.1} ${top - 12} 0 ${top}Q${-R * 0.25} ${top - 5} ${-R * 0.5} ${top}z`) + _gsF(c2, `M${R} ${top}Q${R - 2} ${top - 21} 0 ${top - 22}Q${R * 0.42} ${top - 16} ${R * 0.5} ${top}Q${R * 0.75} ${top - 5} ${R} ${top}z`);
  else if (H.pat === 'dots') s += [[-13, -8], [-3, -14], [7, -13], [15, -7], [-6, -5], [5, -4]].map(([x, y]) => _gsC(x, top + y, 2, c2)).join('');
  else if (H.pat === 'frog') s += _gsC(-9, top - 20, 5, c, ` stroke="${_gsDk(c)}" stroke-width="0.9"`) + _gsC(9, top - 20, 5, c, ` stroke="${_gsDk(c)}" stroke-width="0.9"`) + _gsC(-9, top - 20, 3, c2) + _gsC(9, top - 20, 3, c2) + _gsC(-9, top - 20, 1.5, '#1a1a1a') + _gsC(9, top - 20, 1.5, '#1a1a1a') + _gsL('#2a5a1a', 1.2, `M-8 ${top - 7}Q0 ${top - 3} 8 ${top - 7}`);
  else s += _gsL(_gsDk(c), 0.7, `M0 ${top - 22}Q-12 ${top - 12} ${-R * 0.5} ${top}M0 ${top - 22}Q12 ${top - 12} ${R * 0.5} ${top}`);
  return s + _gsF('#ffffff', `M${-R + 5} ${top - 7}Q${-R + 7} ${top - 16} -6 ${top - 19}Q${-R + 11} ${top - 13} ${-R + 5} ${top - 7}z`, ' fill-opacity="0.26"');
}
function _gsBalloon(H) {
  const c = H.c, line = _gsDk(c), by = -70;
  let head;
  switch (H.shape) {
    case 'heart': head = _gsF(c, `M0 ${by + 13}Q-16 ${by + 1} -13 ${by - 8}Q-8 ${by - 16} 0 ${by - 7}Q8 ${by - 16} 13 ${by - 8}Q16 ${by + 1} 0 ${by + 13}z`, ` stroke="${line}" stroke-width="1"`); break;
    case 'fish': head = _gsF(c, `M-14 ${by}Q-2 ${by - 13} 12 ${by}Q-2 ${by + 13} -14 ${by}zM10 ${by}L20 ${by - 8}V${by + 8}z`, ` stroke="${line}" stroke-width="1"`) + _gsC(-7, by - 2, 1.7, '#1a1a1a') + _gsL(line, 0.8, `M-1 ${by - 7}Q3 ${by} -1 ${by + 7}`); break;
    case 'moon': head = _gsF(c, `M4 ${by - 14}A14 14 0 1 0 4 ${by + 14}A18 18 0 0 1 4 ${by - 14}z`, ` stroke="${line}" stroke-width="1"`) + _gsC(-6, by - 2, 1.3, line) + _gsC(-4, by + 5, 1, line); break;
    default: head = _gsE(0, by, 12, 14, c, ` stroke="${line}" stroke-width="1"`) + _gsF(line, `M-2 ${by + 14}h4l1 3h-6z`);
  }
  return _gsL('#fbfbf2', 0.8, `M0 2Q5 -24 -2 -44T0 ${by + 13}`) + `<g class="gda-bob">${head}${_gsE(-4, by - 6, 2.6, 4, '#ffffff', ' fill-opacity="0.5"')}</g>`;
}
function _gsHeldArt(H, night) {
  switch (H.art) {
    case 'brolly': return _gsBrolly(H);
    case 'balloon': return _gsBalloon(H);
    case 'leaf': return _gsL('#5f7a3a', 2, 'M0 4Q2 -30 0 -62') + _gsF(H.c, 'M-26 -60Q-20 -84 0 -86Q20 -84 26 -60Q14 -68 0 -62Q-14 -68 -26 -60z', ` stroke="${_gsDk(H.c)}" stroke-width="1"`) + _gsL(H.c2, 1, 'M0 -62V-84M0 -68L-14 -76M0 -68L14 -76M0 -74L-9 -80M0 -74L9 -80');
    case 'lantern': return (night ? _gsC(0, 15, 22, '#ffd97a', ' fill-opacity="0.3"') : '') + _gsL('#3a3a42', 1, 'M0 0V5') + _gsE(0, 15, 8.4, 10, night ? '#ffcf7a' : H.c, ` stroke="${_gsDk(H.c)}" stroke-width="1"`) + _gsL(_gsDk(H.c), 0.7, 'M-8 12H8M-8 18H8M-4 6Q-6 15 -4 24M4 6Q6 15 4 24') + _gsF('#3a3a42', 'M-3.6 3.6h7.2v2h-7.2zM-3.6 24.4h7.2v2h-7.2z');
    case 'jack': return (night ? _gsC(0, -52, 20, '#ffb04a', ' fill-opacity="0.3"') : '') + _gsL('#6a4a2a', 2, 'M0 5V-42') + _gsE(0, -52, 12, 10, H.c, ` stroke="${_gsDk(H.c)}" stroke-width="1"`) + _gsL(_gsDk(H.c), 0.8, 'M-5 -61Q-8 -52 -5 -43M5 -61Q8 -52 5 -43') + _gsL('#5f7a3a', 2, 'M0 -62v-4') + _gsF(night ? H.c2 : '#3a1a0a', 'M-6 -55l3.4 -2v4zM6 -55l-3.4 -2v4zM-6 -49q6 4 12 0q-6 6 -12 0z');
    case 'bucket': return _gsL('#59636a', 1.2, 'M-8 12Q0 -3 8 12') + _gsF('#3f6f8a', 'M3 8Q10 2 11 -2L14 3L8 10z') + _gsF(H.c, 'M-9 11H9L7 25H-7z', ` stroke="${_gsDk(H.c)}" stroke-width="1"`) + _gsF(H.c2, 'M-9 11H9V13.4H-9z') + _gsL(_gsDk(H.c), 0.8, 'M-8 19H8');
    case 'pail': return _gsL('#fbf5ec', 1.2, 'M-7 11Q0 -2 7 11') + _gsL('#d8452a', 2, 'M3 14L10 -6') + _gsF('#d8452a', 'M8 -6L12 -5L13 -12L9 -13z') + _gsF(H.c, 'M-8 10H8L6 24H-6z', ` stroke="${_gsDk(H.c)}" stroke-width="1"`) + _gsF(H.c2, 'M-7.6 15H7.6L7.2 18H-7.2z');
    case 'pennant': return _gsL('#6a4a2a', 2, 'M0 5V-74') + _gsF(H.c, 'M1 -74L26 -66L1 -58z', ` stroke="${_gsDk(H.c)}" stroke-width="0.8"`) + _gsF(H.c2, 'M1 -70L13 -66L1 -62z') + _gsC(0, -75, 1.7, '#e0b43a');
    case 'flower': return _gsL('#5f8a3a', 2.4, 'M0 5Q3 -30 0 -56') + _gsF('#5f8a3a', 'M1 -28q10 -6 13 -1q-7 5 -13 1zM0 -18q-10 -6 -13 -1q7 5 13 1z') + `<g transform="translate(0 -62) scale(1.5)">${_gsTip('sunflower')}</g>`;
    case 'mistle': return _gsL('#6a4a2a', 1.4, 'M0 4V-44') + _gsL('#d8352a', 1, 'M-3 -44H3') + `<g transform="translate(0 -46)">${_gsF(H.c, 'M0 0Q-11 -2 -13 6Q-5 7 0 0zM0 0Q11 -2 13 6Q5 7 0 0zM0 0Q-6 6 -5 13Q1 9 0 0zM0 0Q6 6 5 13Q-1 9 0 0z', ` stroke="${_gsDk(H.c)}" stroke-width="0.6"`)}${_gsC(-2, 3, 1.5, H.c2)}${_gsC(2, 3, 1.5, H.c2)}${_gsC(0, 6, 1.5, H.c2)}</g>`;
    default: return '';
  }
}
/** The tool for the arm: it holds this while you walk or stand. */
function gardenLookHeldTool(id) {
  const H = id ? gardenLookDef(id) : null; if (!H || H.kind !== 'held') return null;
  const art = _gsHeldArt(H, _gsDark());
  return art ? (h) => `<g class="gs-held" transform="translate(${_gsN(h[0])} ${_gsN(h[1])})">${art}</g>` : null;
}
/** A small picture, for the page and for clicking a person. */
function gardenLookSvg(id, px) {
  const R = gardenLookDef(id); if (!R) return '';
  if (R.kind === 'rod') return `<svg viewBox="-4 -8 76 76" width="${px}" height="${px}" aria-hidden="true" focusable="false">${gardenLookRodBetween(id, 6, 60, 54, 8, true)}</svg>`;
  if (R.kind === 'net') return `<svg viewBox="-28 -84 48 66" width="${px}" height="${px}" aria-hidden="true" focusable="false">${gardenLookNetOnBack(id)}</svg>`;
  const low = R.art === 'lantern' || R.art === 'bucket' || R.art === 'pail';   // these hang from the hand, the rest stand above it
  return `<svg viewBox="${low ? '-24 -16 48 48' : '-34 -96 68 112'}" width="${px}" height="${px}" aria-hidden="true" focusable="false">${_gsHeldArt(R, false)}</svg>`;
}
/** Click a person: their looks in the row of what they carry. */
function gardenStyleRow(g, add) {
  for (const id of [g.rk, g.nk, g.hd]) { const d = id ? gardenLookDef(id) : null; if (d) add(gardenLookSvg(id, 22), d.name); }
}

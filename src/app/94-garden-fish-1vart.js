/* ============================================================
   GARDEN, VARIANTS OF FISH AND BUGS: THE DRAWING (docs/dev/GARDEN_TOGETHER.md section 23). PURE: strings in, strings out. The ordinary drawing (94-garden-fish-1art.js) is made again in the variant's
   colours, with marks behind it, on its skin and in front of it. A mark is a word in the table's look.fx ('horns:#c8281a'): add a mark, add a row here. Explicit colours, nothing outside the fragment: the photo mode paints these too.

     gardenVariantArt(kind, id, o)     the fragment, when o.v is a variant this thing can be ('' otherwise: the ordinary drawing). gardenFishArt and gardenBugArt come here by themselves
     gardenVariantSvg(kind, id, px, o) a whole <svg> with room for a halo or horns
     gardenVariantShadow(v, L, rx, ry) what the shadow in the water shows, on every screen: {fill, op, under, over}
     gardenVariantMomentSvg(rank, y)   the rays behind something very rare, held up
   ============================================================ */
const _GVA_RAINBOW = Object.freeze(['#e0483c', '#f08a2a', '#f4d03a', '#4ab85a', '#3a8ae0', '#8a4fc9']);
function _gvaN(v) { return Math.round(v * 10) / 10; }
function _gvaFrame(kind, def, look) {
  if (kind === 'bug') return { kind, L: 30, H: 12, x0: -15, x1: 15, ex: 7, ey: 0, er: 2, top: -12, k: 0.55, body: '' };
  const fr = gardenFishFrame(def, look); if (fr) return fr;
  const S = _GFA_SHAPES[look.s] || _GFA_SHAPES.slim, L = S.L, H = S.H, x0 = -L / 2, plain = look.s === 'eel' || look.s === 'crayfish';
  return { kind, L, H, x0, x1: L / 2, ex: x0 + L * ((S.eyeX == null ? 0.3 : S.eyeX) + 0.5), ey: -H * 0.24, er: S.eye || 3, top: -H, k: 1, body: plain ? '' : _gfaBody(S) };
}
function _gvaStar(x, y, s, c, op) { return `<path transform="translate(${_gvaN(x)} ${_gvaN(y)}) scale(${_gvaN(s)})" d="M0-5L1.3-1.3L5 0L1.3 1.3L0 5L-1.3 1.3L-5 0L-1.3-1.3z" fill="${c}"${op ? ` fill-opacity="${op}"` : ''}/>`; }
function _gvaDots(B, rnd, n, r0, r1, c, op) {
  let d = '';
  for (let i = 0; i < n; i++) { const x = B.x0 + B.L * (0.14 + rnd() * 0.72), y = (rnd() - 0.5) * B.H * 1.5, R = r0 + rnd() * (r1 - r0); d += `M${_gvaN(x - R)} ${_gvaN(y)}a${_gvaN(R)} ${_gvaN(R)} 0 1 0 ${_gvaN(R * 2)} 0a${_gvaN(R)} ${_gvaN(R)} 0 1 0 ${_gvaN(-R * 2)} 0z`; }
  return `<path d="${d}" fill="${c}"${op ? ` fill-opacity="${op}"` : ''}/>`;
}
const _GVA_BACK = Object.freeze({
  aura: (B, r, c, op) => { const o = Number(op) || 0.22, rx = B.L / 2, ry = B.H; return `<ellipse rx="${_gvaN(rx * 1.5 + 8 * B.k)}" ry="${_gvaN(ry * 1.9 + 11 * B.k)}" fill="${c}" fill-opacity="${_gvaN(o * 50) / 100}"/><ellipse rx="${_gvaN(rx * 1.26 + 4 * B.k)}" ry="${_gvaN(ry * 1.5 + 6 * B.k)}" fill="${c}" fill-opacity="${_gvaN(o * 100) / 100}"/>`; },
  rays: (B, r, c) => { let d = ''; const R = B.L * 0.86, n = 12; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = 0.11; d += `M0 0L${_gvaN(Math.cos(a - w) * R)} ${_gvaN(Math.sin(a - w) * R * 0.72)}L${_gvaN(Math.cos(a + w) * R)} ${_gvaN(Math.sin(a + w) * R * 0.72)}z`; } return `<path d="${d}" fill="${c}" fill-opacity="0.42"/>`; },
  wings: (B, r, c) => { const k = B.k, y = B.top * 0.62, one = (s) => `<path transform="translate(${_gvaN(-3 * k)} ${_gvaN(y)}) scale(${_gvaN(s * k)} ${_gvaN(k)})" d="M0 2C-3 -10 -14 -20 -27 -21C-24 -16 -24 -14 -26 -12C-22 -11 -21 -9 -23 -6C-18 -6 -16 -4 -17 -1C-11 -2 -6 0 0 2z" fill="${c}" stroke="#b8a878" stroke-width="0.7" stroke-linejoin="round"/>`; return one(1) + (B.kind === 'bug' ? one(-1) : ''); },
  flames: (B, r, c, c2) => { let s = ''; const tongue = (x, y, h, col) => `<path d="M${_gvaN(x - h * 0.34)} ${_gvaN(y)}C${_gvaN(x - h * 0.4)} ${_gvaN(y - h * 0.5)} ${_gvaN(x + h * 0.14)} ${_gvaN(y - h * 0.5)} ${_gvaN(x - h * 0.06)} ${_gvaN(y - h)}C${_gvaN(x + h * 0.4)} ${_gvaN(y - h * 0.6)} ${_gvaN(x + h * 0.42)} ${_gvaN(y - h * 0.3)} ${_gvaN(x + h * 0.34)} ${_gvaN(y)}z" fill="${col}"/>`; for (let i = 0; i < 5; i++) { const x = B.x0 + B.L * (0.12 + i * 0.18), h = (14 + r() * 9) * B.k; s += tongue(x, B.top * 0.7, h, c) + tongue(x, B.top * 0.7, h * 0.55, c2 || '#ffd84a'); } s += tongue(B.x0 - 2 * B.k, 6 * B.k, 20 * B.k, c) + tongue(B.x0 - 2 * B.k, 6 * B.k, 11 * B.k, c2 || '#ffd84a'); return s; },
  wisps: (B, r, c) => { let d = ''; for (let i = 0; i < 3; i++) { const x = B.x0 + B.L * (0.2 + i * 0.28), y = B.top * 0.9, k = B.k; d += `M${_gvaN(x)} ${_gvaN(y)}q${_gvaN(-5 * k)} ${_gvaN(-5 * k)} 0 ${_gvaN(-9 * k)}t0 ${_gvaN(-9 * k)}`; } return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(1.8 * B.k + 0.4)}" stroke-opacity="0.65" fill="none" stroke-linecap="round"/>`; },
  tentacles: (B, r, c) => { let d = ''; const k = B.k, y = -B.top * 0.72; for (let i = 0; i < 5; i++) { const x = B.x0 + B.L * (0.14 + i * 0.17), s = i % 2 ? 1 : -1; d += `M${_gvaN(x)} ${_gvaN(y)}q${_gvaN(s * 7 * k)} ${_gvaN(5 * k)} 0 ${_gvaN(10 * k)}t${_gvaN(s * 4 * k)} ${_gvaN(7 * k)}`; } return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(3 * k + 0.4)}" fill="none" stroke-linecap="round"/>`; },
  orbit: (B, r, c) => `<ellipse rx="${_gvaN(B.L * 0.68)}" ry="${_gvaN(B.H * 0.9 + 3)}" fill="none" stroke="${c}" stroke-width="${_gvaN(1.4 * B.k + 0.3)}" stroke-opacity="0.85" transform="rotate(-14)"/><circle cx="${_gvaN(B.L * 0.62)}" cy="${_gvaN(-B.L * 0.15)}" r="${_gvaN(2.6 * B.k)}" fill="${c}"/>`,
});
const _GVA_SKIN = Object.freeze({
  speck: (B, r, c) => _gvaDots(B, r, 14, 0.7 * B.k + 0.2, 1.5 * B.k + 0.2, c, 0.7),
  bars: (B, r, c) => { let d = ''; for (let i = 0; i < 5; i++) { const x = B.x0 + B.L * (0.2 + i * 0.13); d += `M${_gvaN(x)} ${_gvaN(-B.H * 1.2)}Q${_gvaN(x + 3 * B.k)} 0 ${_gvaN(x - 1)} ${_gvaN(B.H * 1.2)}`; } return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(B.H * 0.3)}" fill="none" stroke-linecap="round"/>`; },
  patches: (B, r, c) => { let s = ''; for (let i = 0; i < 3; i++) s += `<ellipse cx="${_gvaN(B.x0 + B.L * (0.2 + i * 0.25 + r() * 0.06))}" cy="${_gvaN((r() - 0.5) * B.H)}" rx="${_gvaN(B.L * 0.09 + r() * 3 * B.k)}" ry="${_gvaN(B.H * 0.42)}" fill="${c}"/>`; return s; },
  patches2: (B, r, c) => _GVA_SKIN.patches(B, r, c),
  stars: (B, r, c) => { let s = _gvaDots(B, r, 12, 0.3, 0.6 * B.k + 0.2, c, 0.85); for (let i = 0; i < 3; i++) s += _gvaStar(B.x0 + B.L * (0.2 + r() * 0.6), (r() - 0.5) * B.H, (0.42 + r() * 0.26) * B.k, c); return s; },
  cracks: (B, r, c) => { let d = ''; for (let i = 0; i < 4; i++) { let x = B.x0 + B.L * (0.16 + i * 0.2), y = -B.H; d += `M${_gvaN(x)} ${_gvaN(y)}`; for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 8 * B.k; y += B.H * 0.55; d += `L${_gvaN(x)} ${_gvaN(y)}`; } } return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(1.3 * B.k + 0.2)}" fill="none" stroke-linejoin="round"/>`; },
  scars: (B, r, c) => { let d = ''; for (let i = 0; i < 3; i++) { const x = B.x0 + B.L * (0.3 + i * 0.15), y = -B.H * 0.5 + i * B.H * 0.3, k = B.k; d += `M${_gvaN(x)} ${_gvaN(y)}l${_gvaN(9 * k)} ${_gvaN(6 * k)}M${_gvaN(x + 2 * k)} ${_gvaN(y + 4 * k)}l${_gvaN(2 * k)} ${_gvaN(-2.4 * k)}M${_gvaN(x + 5 * k)} ${_gvaN(y + 6 * k)}l${_gvaN(2 * k)} ${_gvaN(-2.4 * k)}`; } return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(1.2 * B.k + 0.2)}" fill="none" stroke-linecap="round"/>`; },
  stitch: (B, r, c) => { let d = ''; for (let i = 0; i < 3; i++) { const x = B.x0 + B.L * (0.26 + i * 0.22); for (let y = -B.H; y < B.H; y += 4.4 * B.k + 0.6) d += `M${_gvaN(x - 1.8 * B.k)} ${_gvaN(y)}l${_gvaN(3.6 * B.k)} ${_gvaN(1.6 * B.k)}`; } return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(0.9 * B.k + 0.2)}" fill="none" stroke-linecap="round"/>`; },
  ribs: (B, r, c) => { let d = `M${_gvaN(B.x0 + B.L * 0.08)} 0H${_gvaN(B.x0 + B.L * 0.7)}`; for (let i = 0; i < 6; i++) { const x = B.x0 + B.L * (0.16 + i * 0.09); d += `M${_gvaN(x)} ${_gvaN(-B.H * 0.72)}Q${_gvaN(x + 3 * B.k)} 0 ${_gvaN(x)} ${_gvaN(B.H * 0.72)}`; } const hx = B.x0 + B.L * 0.84; return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(1.5 * B.k + 0.3)}" fill="none" stroke-linecap="round"/><ellipse cx="${_gvaN(hx)}" cy="${_gvaN(B.ey * 0.6)}" rx="${_gvaN(B.L * 0.11)}" ry="${_gvaN(B.H * 0.62)}" fill="${c}"/>`; },
  gears: (B, r, c) => { let s = ''; for (let i = 0; i < 3; i++) { const x = B.x0 + B.L * (0.26 + i * 0.22), y = (i % 2 ? 0.2 : -0.24) * B.H, R = (i === 1 ? 6.4 : 4.8) * B.k; let d = ''; for (let t = 0; t < 8; t++) { const a = t / 8 * Math.PI * 2; d += `M${_gvaN(x + Math.cos(a) * R * 0.7)} ${_gvaN(y + Math.sin(a) * R * 0.7)}L${_gvaN(x + Math.cos(a) * R * 1.32)} ${_gvaN(y + Math.sin(a) * R * 1.32)}`; } s += `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(1.5 * B.k + 0.2)}"/><circle cx="${_gvaN(x)}" cy="${_gvaN(y)}" r="${_gvaN(R)}" fill="none" stroke="${c}" stroke-width="${_gvaN(1.4 * B.k + 0.2)}"/><circle cx="${_gvaN(x)}" cy="${_gvaN(y)}" r="${_gvaN(R * 0.26)}" fill="${c}"/>`; } return s; },
  moss: (B, r, c) => { let s = ''; for (let i = 0; i < 7; i++) s += `<ellipse cx="${_gvaN(B.x0 + B.L * (0.14 + i * 0.11))}" cy="${_gvaN(-B.H * (0.82 - r() * 0.2))}" rx="${_gvaN((3.6 + r() * 2.4) * B.k)}" ry="${_gvaN((2.4 + r() * 1.6) * B.k)}" fill="${c}" fill-opacity="0.85"/>`; return s; },
  facets: (B, r, c) => { let d = ''; for (let i = 0; i < 6; i++) { const x = B.x0 + B.L * (0.14 + r() * 0.66), y = (r() - 0.5) * B.H * 1.3, k = B.k * (3.4 + r() * 2.8); d += `M${_gvaN(x)} ${_gvaN(y - k)}L${_gvaN(x + k)} ${_gvaN(y + k * 0.6)}L${_gvaN(x - k)} ${_gvaN(y + k * 0.5)}z`; } return `<path d="${d}" fill="${c}" fill-opacity="0.5"/>`; },
  facets2: (B, r, c) => _GVA_SKIN.facets(B, r, c),
  bands: (B) => { let s = ''; const w = B.H * 2.4 / 6; _GVA_RAINBOW.forEach((c, i) => { s += `<rect x="${_gvaN(B.x0 - 6)}" y="${_gvaN(-B.H * 1.2 + i * w)}" width="${_gvaN(B.L + 12)}" height="${_gvaN(w + 0.4)}" fill="${c}" fill-opacity="0.82"/>`; }); return s; },
  frost: (B, r, c) => { let d = ''; for (let i = 0; i < 5; i++) { const x = B.x0 + B.L * (0.16 + i * 0.16), y = (r() - 0.5) * B.H, k = (3.4 + r() * 1.8) * B.k; d += `M${_gvaN(x - k)} ${_gvaN(y)}h${_gvaN(k * 2)}M${_gvaN(x)} ${_gvaN(y - k)}v${_gvaN(k * 2)}M${_gvaN(x - k * 0.7)} ${_gvaN(y - k * 0.7)}l${_gvaN(k * 1.4)} ${_gvaN(k * 1.4)}M${_gvaN(x + k * 0.7)} ${_gvaN(y - k * 0.7)}l${_gvaN(-k * 1.4)} ${_gvaN(k * 1.4)}`; } return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(0.8 * B.k + 0.2)}" stroke-linecap="round" fill="none" stroke-opacity="0.95"/>`; },
  sheen: (B, r, c) => `<path d="M${_gvaN(B.x0 + B.L * 0.2)} ${_gvaN(B.H * 0.5)}L${_gvaN(B.x0 + B.L * 0.42)} ${_gvaN(-B.H * 1.1)}H${_gvaN(B.x0 + B.L * 0.54)}L${_gvaN(B.x0 + B.L * 0.32)} ${_gvaN(B.H * 0.5)}z" fill="${c}" fill-opacity="0.42"/>`,
  bolts: (B, r, c) => { let d = ''; for (let i = 0; i < 2; i++) { const x = B.x0 + B.L * (0.3 + i * 0.3), k = B.k; d += `M${_gvaN(x)} ${_gvaN(-B.H)}l${_gvaN(-5 * k)} ${_gvaN(B.H * 0.9)}l${_gvaN(5 * k)} ${_gvaN(-1.5 * k)}l${_gvaN(-5 * k)} ${_gvaN(B.H)}`; } return `<path d="${d}" stroke="${c}" stroke-width="${_gvaN(1.6 * B.k + 0.3)}" fill="none" stroke-linejoin="round"/>`; },
});
const _GVA_FRONT = Object.freeze({
  spark: (B, r, c) => _gvaStar(B.x1 - B.L * 0.1, B.top - 5 * B.k, 1.1 * B.k, c) + _gvaStar(B.x0 + B.L * 0.2, B.top + 1, 0.8 * B.k, c) + _gvaStar(B.x0 + B.L * 0.56, -B.top * 0.9 + 2 * B.k, 0.7 * B.k, c),
  spark2: (B, r, c) => _gvaStar(B.x0 + B.L * 0.42, B.top - 8 * B.k, 0.8 * B.k, c) + _gvaStar(B.x1 + 2 * B.k, 2 * B.k, 0.7 * B.k, c),
  halo: (B, r, c) => `<ellipse cx="${_gvaN(B.ex)}" cy="${_gvaN(B.top - 9 * B.k)}" rx="${_gvaN(9 * B.k + 1)}" ry="${_gvaN(2.8 * B.k + 0.6)}" fill="none" stroke="${c}" stroke-width="${_gvaN(2.4 * B.k + 0.4)}"/>`,
  horns: (B, r, c) => { const k = B.k, x = B.ex, y = B.kind === 'bug' ? -2 : B.top * 0.82, one = (dx, lean) => `<path d="M${_gvaN(x + dx - 3 * k)} ${_gvaN(y)}Q${_gvaN(x + dx + lean * 0.4)} ${_gvaN(y - 9 * k)} ${_gvaN(x + dx + lean)} ${_gvaN(y - 14 * k)}Q${_gvaN(x + dx + 3 * k + lean * 0.3)} ${_gvaN(y - 6 * k)} ${_gvaN(x + dx + 3 * k)} ${_gvaN(y)}z" fill="${c}" stroke="#14060a" stroke-width="0.7" stroke-linejoin="round"/>`; return one(-5 * k, -3 * k) + one(5 * k, 4 * k); },
  crown: (B, r, c) => { const k = B.k, x = B.ex, y = B.kind === 'bug' ? -3 : B.top * 0.86; return `<path d="M${_gvaN(x - 8 * k)} ${_gvaN(y)}l${_gvaN(-1.4 * k)} ${_gvaN(-10 * k)}l${_gvaN(5 * k)} ${_gvaN(4.6 * k)}l${_gvaN(4.4 * k)} ${_gvaN(-7 * k)}l${_gvaN(4.4 * k)} ${_gvaN(7 * k)}l${_gvaN(5 * k)} ${_gvaN(-4.6 * k)}l${_gvaN(-1.4 * k)} ${_gvaN(10 * k)}z" fill="${c}" stroke="#8a6a1a" stroke-width="0.8" stroke-linejoin="round"/><circle cx="${_gvaN(x)}" cy="${_gvaN(y - 2.6 * k)}" r="${_gvaN(1.3 * k)}" fill="#e0483c"/>`; },
  partyhat: (B, r, c) => { const k = B.k, x = B.ex, y = B.kind === 'bug' ? -3 : B.top * 0.86; return `<path d="M${_gvaN(x - 6 * k)} ${_gvaN(y)}L${_gvaN(x + 2 * k)} ${_gvaN(y - 15 * k)}L${_gvaN(x + 7 * k)} ${_gvaN(y)}z" fill="${c}" stroke="#7a1a14" stroke-width="0.7" stroke-linejoin="round"/><circle cx="${_gvaN(x + 2 * k)}" cy="${_gvaN(y - 15.6 * k)}" r="${_gvaN(2 * k)}" fill="#ffe27a"/>`; },
  tophat: (B, r, c) => { const k = B.k, x = B.ex - 1 * k, y = B.kind === 'bug' ? -3 : B.top * 0.86; return `<rect x="${_gvaN(x - 9 * k)}" y="${_gvaN(y - 1.6 * k)}" width="${_gvaN(18 * k)}" height="${_gvaN(2.4 * k)}" rx="${_gvaN(1 * k)}" fill="${c}"/><rect x="${_gvaN(x - 5.6 * k)}" y="${_gvaN(y - 13 * k)}" width="${_gvaN(11.2 * k)}" height="${_gvaN(12 * k)}" fill="${c}"/><rect x="${_gvaN(x - 5.6 * k)}" y="${_gvaN(y - 4.4 * k)}" width="${_gvaN(11.2 * k)}" height="${_gvaN(2.2 * k)}" fill="#c83a3a"/>`; },
  monocle: (B, r, c) => `<circle cx="${_gvaN(B.ex)}" cy="${_gvaN(B.ey)}" r="${_gvaN(B.er * 1.3)}" fill="none" stroke="${c}" stroke-width="${_gvaN(1.1 * B.k + 0.2)}"/><path d="M${_gvaN(B.ex)} ${_gvaN(B.ey + B.er * 1.3)}q${_gvaN(-1 * B.k)} ${_gvaN(5 * B.k)} ${_gvaN(2 * B.k)} ${_gvaN(9 * B.k)}" stroke="${c}" stroke-width="0.7" fill="none"/>`,
  eyepatch: (B, r, c) => `<path d="M${_gvaN(B.ex - B.er * 2.4)} ${_gvaN(B.ey - B.er * 1.7)}L${_gvaN(B.ex + B.er * 2)} ${_gvaN(B.ey + B.er * 1.5)}" stroke="${c}" stroke-width="${_gvaN(0.9 * B.k + 0.2)}"/><ellipse cx="${_gvaN(B.ex)}" cy="${_gvaN(B.ey)}" rx="${_gvaN(B.er * 1.15)}" ry="${_gvaN(B.er)}" fill="${c}"/>`,
  bow: (B, r, c) => { const k = B.k, x = B.x0 + B.L * 0.56, y = B.top * 0.86; return `<path d="M${_gvaN(x)} ${_gvaN(y)}l${_gvaN(-6 * k)} ${_gvaN(-3.6 * k)}v${_gvaN(7.2 * k)}zM${_gvaN(x)} ${_gvaN(y)}l${_gvaN(6 * k)} ${_gvaN(-3.6 * k)}v${_gvaN(7.2 * k)}z" fill="${c}"/><circle cx="${_gvaN(x)}" cy="${_gvaN(y)}" r="${_gvaN(1.5 * k)}" fill="#7a1a14"/>`; },
  brow: (B, r, c) => `<path d="M${_gvaN(B.ex - B.er * 1.3)} ${_gvaN(B.ey - B.er * 1.5)}L${_gvaN(B.ex + B.er * 1.3)} ${_gvaN(B.ey - B.er * 0.6)}" stroke="${c}" stroke-width="${_gvaN(1.5 * B.k + 0.4)}" stroke-linecap="round"/>`,
  drops: (B, r, c) => { let s = ''; for (let i = 0; i < 6; i++) { const x = B.x0 + B.L * (0.12 + r() * 0.76), y = (r() - 0.5) * B.H * 1.3, k = B.k * (0.7 + r() * 0.5); s += `<path transform="translate(${_gvaN(x)} ${_gvaN(y)}) scale(${_gvaN(k)})" d="M0 -3.4C1.8 -1 2.4 0.2 2.4 1.2A2.4 2.4 0 0 1 -2.4 1.2C-2.4 0.2 -1.8 -1 0 -3.4z" fill="${c}" stroke="#ffffff" stroke-width="0.4"/>`; } return s; },
  petals: (B, r, c) => { let s = ''; for (let i = 0; i < 6; i++) { const x = B.x0 + B.L * (0.04 + r() * 0.9), y = B.top - 2 * B.k + r() * (B.H * 2 + 4), a = Math.round(r() * 180); s += `<ellipse cx="${_gvaN(x)}" cy="${_gvaN(y)}" rx="${_gvaN(2.6 * B.k + 0.2)}" ry="${_gvaN(1.5 * B.k + 0.2)}" fill="${c}" stroke="#d88aa0" stroke-width="0.4" transform="rotate(${a} ${_gvaN(x)} ${_gvaN(y)})"/>`; } return s; },
  leaves: (B, r, c) => { let s = ''; for (let i = 0; i < 4; i++) { const x = B.x0 + B.L * (0.12 + i * 0.24), y = (i % 2 ? 0.3 : -0.4) * B.H, a = Math.round(r() * 120); s += `<path transform="translate(${_gvaN(x)} ${_gvaN(y)}) rotate(${a}) scale(${_gvaN(B.k)})" d="M-5 0Q0 -4 5 0Q0 4 -5 0zM-5 0H5" fill="${c}" stroke="#6a2a0c" stroke-width="0.6"/>`; } return s; },
  icicles: (B, r, c) => { let d = ''; const y = -B.top * 0.66; for (let i = 0; i < 5; i++) { const x = B.x0 + B.L * (0.2 + i * 0.14), h = (5 + r() * 6) * B.k; d += `M${_gvaN(x - 1.8 * B.k)} ${_gvaN(y)}L${_gvaN(x)} ${_gvaN(y + h)}L${_gvaN(x + 1.8 * B.k)} ${_gvaN(y)}z`; } return `<path d="${d}" fill="${c}" stroke="#8ab8d8" stroke-width="0.4"/>`; },
  clover: (B, r, c) => { const k = B.k * 1.1, x = B.x0 + B.L * 0.46, y = B.H * 0.05; let s = ''; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s += `<circle cx="${_gvaN(x + dx * 2.4 * k)}" cy="${_gvaN(y + dy * 2.4 * k)}" r="${_gvaN(2.6 * k)}" fill="${c}"/>`; return s + `<path d="M${_gvaN(x)} ${_gvaN(y)}q${_gvaN(1 * k)} ${_gvaN(4 * k)} ${_gvaN(3.6 * k)} ${_gvaN(6 * k)}" stroke="${c}" stroke-width="${_gvaN(1 * k)}" fill="none"/>`; },
  barnacles: (B, r, c) => { let s = ''; for (let i = 0; i < 6; i++) { const x = B.x0 + B.L * (0.12 + r() * 0.62), y = (r() - 0.7) * B.H, R = (1.5 + r() * 1.3) * B.k; s += `<circle cx="${_gvaN(x)}" cy="${_gvaN(y)}" r="${_gvaN(R)}" fill="${c}" stroke="#6a6452" stroke-width="0.6"/><circle cx="${_gvaN(x)}" cy="${_gvaN(y)}" r="${_gvaN(R * 0.36)}" fill="#6a6452"/>`; } return s; },
  eyes: (B, r, c) => { let s = ''; for (let i = 0; i < 6; i++) { const x = B.x0 + B.L * (0.16 + r() * 0.58), y = (r() - 0.5) * B.H * 1.2, R = (1.4 + r() * 1.6) * B.k; s += `<circle cx="${_gvaN(x)}" cy="${_gvaN(y)}" r="${_gvaN(R)}" fill="${c}"/><circle cx="${_gvaN(x + R * 0.2)}" cy="${_gvaN(y)}" r="${_gvaN(R * 0.5)}" fill="#0a1414"/>`; } return s; },
  twohead: (B, r, c, c2, look) => { const k = B.k, x = B.kind === 'bug' ? 7 : B.x1 - B.L * 0.16, y = B.kind === 'bug' ? -7 : B.top * 0.82, R = (B.kind === 'bug' ? 3.4 : Math.min(9, B.H * 0.62)), col = look.c, e = _gfaDk(look.c, 0.5); return `<g transform="rotate(-22 ${_gvaN(x)} ${_gvaN(y)})"><ellipse cx="${_gvaN(x)}" cy="${_gvaN(y)}" rx="${_gvaN(R * 1.25)}" ry="${_gvaN(R)}" fill="${col}" stroke="${e}" stroke-width="1"/><circle cx="${_gvaN(x + R * 0.36)}" cy="${_gvaN(y - R * 0.22)}" r="${_gvaN(R * 0.36)}" fill="#fbf8ee" stroke="${e}" stroke-width="0.5"/><circle cx="${_gvaN(x + R * 0.44)}" cy="${_gvaN(y - R * 0.2)}" r="${_gvaN(R * 0.22)}" fill="#1a1712"/><path d="M${_gvaN(x + R * 1.1)} ${_gvaN(y + R * 0.3)}q${_gvaN(-2 * k)} ${_gvaN(1.8 * k)} ${_gvaN(-4 * k)} ${_gvaN(0.8 * k)}" stroke="${e}" stroke-width="0.9" fill="none" stroke-linecap="round"/></g>`; },
});
/** Its colours: a look like the catalogue's, moved towards the variant's. */
function _gvaLook(base, V) {
  const L = V.look, out = Object.assign({}, base), mix = (from, to, t) => (to ? _gfaMix(from, to, t == null ? 1 : t) : from);
  out.c = mix(base.c, L.c, L.mix);
  out.c2 = mix(base.c2 || base.c, L.c2, L.mix2 != null ? L.mix2 : L.mix);
  if (L.c3) out.c3 = L.c3; else if (L.c && base.c3) out.c3 = mix(base.c3, L.c, L.mix);
  if (L.p !== undefined) out.p = L.p;
  if (L.sat) { out.c = _gfaLt(out.c, 0.12); out.c2 = _gfaLt(out.c2, 0.12); }
  return out;
}
function gardenVariantArt(kind, id, o) {
  const def = kind === 'fish' ? gardenFishDef(id) : gardenBugDef(id), V = def ? gardenVariantFor(kind, def, o.v) : null;
  if (!V || !def.look) return '';
  const L = V.look, look = _gvaLook(def.look, V), uid = _gfaUid(o, id) + 'v', rnd = _gfaRng('variant|' + V.id + '|' + id), B = _gvaFrame(kind, def, look);
  const inner = (kind === 'fish' ? gardenFishArt : gardenBugArt)(id, Object.assign({}, o, { v: '', look, uid }));
  let back = '', skin = '', front = '';
  for (const word of L.fx || []) {
    const [name, a, b] = String(word).split(':');
    if (_GVA_BACK[name]) back += _GVA_BACK[name](B, rnd, a, b);
    else if (_GVA_SKIN[name]) skin += _GVA_SKIN[name](B, rnd, a, b);
    else if (_GVA_FRONT[name]) front += _GVA_FRONT[name](B, rnd, a, b, look);
  }
  if (L.eye) front += kind === 'fish' && look.s !== 'crayfish' ? `<circle cx="${_gvaN(B.ex + B.er * 0.2)}" cy="${_gvaN(B.ey + B.er * 0.06)}" r="${_gvaN(B.er * 0.72)}" fill="${L.eye}"/><circle cx="${_gvaN(B.ex + B.er * 0.44)}" cy="${_gvaN(B.ey - B.er * 0.26)}" r="${_gvaN(B.er * 0.22)}" fill="#ffffff"/>` : `<circle cx="${_gvaN(B.ex + 1)}" cy="-1.6" r="0.9" fill="${L.eye}"/><circle cx="${_gvaN(B.ex + 1)}" cy="1.6" r="0.9" fill="${L.eye}"/>`;
  const clip = B.body ? `<path d="${B.body}"/>` : `<ellipse rx="${_gvaN(B.L * 0.5)}" ry="${_gvaN(B.H * 1.05)}"/>`;
  const on = skin ? `<defs><clipPath id="${uid}-c">${clip}</clipPath></defs><g clip-path="url(#${uid}-c)">${skin}</g>` : '';
  const body = `<g${L.op ? ` opacity="${L.op}"` : ''}>${inner}${on}</g>`;
  const all = back + body + front;
  return `<g class="gva">${L.scale ? `<g transform="scale(${L.scale})">${all}</g>` : all}</g>`;
}
/** A whole picture with room above and around for what a variant wears. */
function gardenVariantSvg(kind, id, px, o) {
  const art = gardenVariantArt(kind, id, o); if (!art) return '';
  const box = kind === 'fish' ? [-62, -48, 124, 84] : [-27, -26, 54, 50];
  return `<svg class="gd-catch-ico gva-svg" viewBox="${box.join(' ')}" width="${px}" height="${Math.round(px * box[3] / box[2])}" aria-hidden="true" focusable="false"${o.silhouette ? ' style="filter:brightness(0) opacity(.3)"' : ''}>${art}</svg>`;
}
/** What the shadow in the water shows. Its fill and how solid it is, and marks under and over it; `.gd-fsv` twinkles while it is in view (94-garden-fish-6school.js, _gfsFrame). */
function gardenVariantShadow(v, L, rx, ry) {
  const V = gardenVariantDef(v), W = V && V.look.water; if (!W) return null;
  const n = _gvaN, hx = rx * 0.6, top = -ry;
  let under = '', over = '';
  if (W.aura) under += `<ellipse rx="${n(rx * 1.75)}" ry="${n(ry * 2.5 + 7)}" fill="${W.aura[0]}" fill-opacity="${n(W.aura[1] * 60) / 100}"/><ellipse rx="${n(rx * 1.35)}" ry="${n(ry * 1.8 + 3)}" fill="${W.aura[0]}" fill-opacity="${n(W.aura[1] * 100) / 100}"/>`;
  if (W.wings) over += `<path d="M${n(-rx * 0.1)} ${n(top * 0.4)}C${n(-rx * 0.3)} ${n(top - L * 0.3)} ${n(-rx * 0.9)} ${n(top - L * 0.4)} ${n(-rx * 1.1)} ${n(top - L * 0.34)}C${n(-rx * 0.9)} ${n(top - L * 0.1)} ${n(-rx * 0.5)} ${n(top)} ${n(-rx * 0.1)} ${n(top * 0.4)}z" fill="${W.wings}" fill-opacity="0.85"/>`;
  if (W.flame) { for (let i = 0; i < 3; i++) { const x = -rx * 0.5 + i * rx * 0.5, h = L * (0.2 + (i % 2) * 0.1); over += `<path d="M${n(x - h * 0.3)} ${n(top * 0.5)}Q${n(x)} ${n(top - h * 0.3)} ${n(x + h * 0.1)} ${n(top - h)}Q${n(x + h * 0.4)} ${n(top - h * 0.3)} ${n(x + h * 0.3)} ${n(top * 0.5)}z" fill="${W.flame}" fill-opacity="0.88"/>`; } }
  if (W.two) over += `<ellipse cx="${n(hx * 0.9)}" cy="${n(top - ry * 0.5)}" rx="${n(ry * 0.95)}" ry="${n(ry * 0.72)}" fill="${W.fill || '#07233a'}" fill-opacity="${W.op || 0.45}" transform="rotate(-24 ${n(hx * 0.9)} ${n(top - ry * 0.5)})"/>`;
  if (W.horns) over += `<path d="M${n(hx - 4)} ${n(top * 0.8)}Q${n(hx - 5)} ${n(top - 6)} ${n(hx - 7)} ${n(top - 11)}Q${n(hx - 1)} ${n(top - 6)} ${n(hx)} ${n(top * 0.8)}zM${n(hx + 3)} ${n(top * 0.8)}Q${n(hx + 4)} ${n(top - 6)} ${n(hx + 7)} ${n(top - 11)}Q${n(hx + 8)} ${n(top - 5)} ${n(hx + 7)} ${n(top * 0.8)}z" fill="${W.horns}"/>`;
  if (W.crown) over += `<path d="M${n(hx - 6)} ${n(top * 0.9)}l-1 -7l4 3l3 -5l3 5l4 -3l-1 7z" fill="${W.crown}" fill-opacity="0.95"/>`;
  if (W.halo) over += `<ellipse cx="${n(hx)}" cy="${n(top - 8)}" rx="${n(Math.max(5, L * 0.12))}" ry="2" fill="none" stroke="${W.halo}" stroke-width="1.8"/>`;
  let tw = '';
  if (W.spark) tw += _gvaStar(rx * 0.8, top - 4, 0.8, W.spark) + _gvaStar(-rx * 0.5, top - 2, 0.62, W.spark) + _gvaStar(rx * 0.1, -top + 3, 0.5, W.spark);
  if (tw) over += `<g class="gd-fsv">${tw}</g>`;
  return { fill: W.fill || '', op: W.op || 0, under, over };
}
/** Rays and extra stars behind something very rare, held up: its feet at 0,0, y where the item is. */
function gardenVariantMomentSvg(rank, y) {
  if (rank < 2) return '';
  const R = 34 + rank * 9, n = 8 + rank * 2, col = rank >= 5 ? '#ffe27a' : rank >= 4 ? '#fff2b0' : '#fff6d8';
  let d = '';
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = 0.09; d += `M0 ${y}L${_gvaN(Math.cos(a - w) * R)} ${_gvaN(y + Math.sin(a - w) * R)}L${_gvaN(Math.cos(a + w) * R)} ${_gvaN(y + Math.sin(a + w) * R)}z`; }
  return `<g class="gmo-pop"><path class="gmo-rays" d="${d}" fill="${col}" fill-opacity="${_gvaN(0.2 + rank * 0.07)}"/></g>`;
}

/* ============================================================
   GARDEN, the placeholder art (2.18, agent 'garden-engine').
   gardenArtPlaceholder(id, o) keeps the art contract of 94-garden-0catalog.js
   (GARDEN_ART, docs/dev/GARDEN.md section 2): an SVG fragment, (0, 0) at the
   bottom centre of the footprint, 64 units a cell, explicit colours only, the
   gda-* animation classes. Agent 'garden-art' replaces it with gardenArt(id, o);
   the engine calls _gdArt(), which prefers gardenArt and falls back to this per
   item. Every plant form, decoration, visitor, crop, seed packet, tool and
   bouquet has a drawing here, made from the catalogue's palette.
   ============================================================ */
const _GDA_CACHE = new Map();
const _GDA_CACHE_MAX = 2400;

/* ---------- colours ---------- */
function _gdaHex(h) { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); return m ? '#' + m[1].toLowerCase() : '#7a9a5a'; }
/** Mix a colour towards white (f > 0) or black (f < 0). */
function _gdaShade(hex, f) {
  const h = _gdaHex(hex), n = parseInt(h.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function _gdaMix(a, b, t) {
  const x = parseInt(_gdaHex(a).slice(1), 16), y = parseInt(_gdaHex(b).slice(1), 16);
  const c = (s) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
}
function _gdaN(v) { return Math.round(v * 10) / 10; }
const _GDA_AUTUMN = ['#d9671c', '#e8a23a', '#c0392b', '#e0b43a', '#b5562a'];

/* ---------- primitives (strings) ---------- */
function _gdaLeaf(x, y, len, ang, w, col, cls) {
  const a = ang * Math.PI / 180, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  const nx = -Math.sin(a) * w, ny = Math.cos(a) * w, mx = (x + ex) / 2, my = (y + ey) / 2;
  return `<path${cls ? ` class="${cls}"` : ''} d="M${_gdaN(x)} ${_gdaN(y)}Q${_gdaN(mx + nx)} ${_gdaN(my + ny)} ${_gdaN(ex)} ${_gdaN(ey)}Q${_gdaN(mx - nx)} ${_gdaN(my - ny)} ${_gdaN(x)} ${_gdaN(y)}Z" fill="${col}"/>`;
}
function _gdaStem(x0, y0, x1, y1, bend, col, w) {
  const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2;
  return `<path d="M${_gdaN(x0)} ${_gdaN(y0)}Q${_gdaN(mx)} ${_gdaN(my)} ${_gdaN(x1)} ${_gdaN(y1)}" stroke="${col}" stroke-width="${w || 2}" fill="none" stroke-linecap="round"/>`;
}
function _gdaPetals(cx, cy, n, r, len, wid, col, rot, round) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (rot || 0) + i * 360 / n, rad = a * Math.PI / 180;
    const px = cx + Math.cos(rad) * (r + len / 2), py = cy + Math.sin(rad) * (r + len / 2);
    s += round ? `<circle cx="${_gdaN(px)}" cy="${_gdaN(py)}" r="${_gdaN(wid)}" fill="${col}"/>` : `<ellipse cx="${_gdaN(px)}" cy="${_gdaN(py)}" rx="${_gdaN(len / 2)}" ry="${_gdaN(wid)}" transform="rotate(${_gdaN(a)} ${_gdaN(px)} ${_gdaN(py)})" fill="${col}"/>`;
  }
  return s;
}
function _gdaStar(cx, cy, n, r1, r2, col, rot) {
  let d = '';
  for (let i = 0; i < n * 2; i++) { const a = ((rot || -90) + i * 180 / n) * Math.PI / 180, r = i % 2 ? r2 : r1; d += (i ? 'L' : 'M') + _gdaN(cx + Math.cos(a) * r) + ' ' + _gdaN(cy + Math.sin(a) * r); }
  return `<path d="${d}Z" fill="${col}"/>`;
}
/** A lumpy leafy mound (bushes): clumps in three greens, wider than tall. */
function _gdaMound(w, h, leaf, rnd, n) {
  let t = '';
  for (let i = 0; i < n; i++) { const f = i / (n - 1) - 0.5; t += `<ellipse cx="${_gdaN(f * w * 1.3)}" cy="${_gdaN(-h * (0.42 + (0.5 - Math.abs(f)) * 0.3) - rnd() * 3)}" rx="${_gdaN(w * (0.45 + rnd() * 0.1))}" ry="${_gdaN(h * (0.36 + rnd() * 0.08))}" fill="${[_gdaShade(leaf, -0.18), _gdaShade(leaf, -0.04), _gdaShade(leaf, 0.07)][i % 3]}"/>`; }
  return t;
}
function _gdaShadow(w) { return `<ellipse cx="0" cy="1" rx="${_gdaN(w)}" ry="${_gdaN(Math.max(3, w * 0.22))}" fill="#000000" fill-opacity="0.13"/>`; }

/* ---------- flower heads ---------- */
function _gdaHead(kind, cx, cy, r, c, c2, o) {
  const dark = _gdaShade(c, -0.25), light = _gdaShade(c, 0.35), ctr = c2 || '#f4c430';
  switch (kind) {
    case 'daisy': return _gdaPetals(cx, cy, 13, r * 0.25, r * 0.85, r * 0.2, c, o.t * 30) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.33)}" fill="${ctr}"/>`;
    case 'sunflower': return _gdaPetals(cx, cy, 16, r * 0.5, r * 0.75, r * 0.17, dark, 11) + _gdaPetals(cx, cy, 16, r * 0.45, r * 0.7, r * 0.16, c, 0) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.52)}" fill="${ctr}"/><circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.34)}" fill="${_gdaShade(ctr, -0.25)}"/>`;
    case 'cup': case 'goblet': case 'cup-small': {
      const w = r * (kind === 'goblet' ? 0.8 : 0.95), h = r * 1.3;
      return `<path d="M${_gdaN(cx - w)} ${_gdaN(cy - h * 0.55)}Q${_gdaN(cx - w)} ${_gdaN(cy + h * 0.5)} ${cx} ${_gdaN(cy + h * 0.5)}Q${_gdaN(cx + w)} ${_gdaN(cy + h * 0.5)} ${_gdaN(cx + w)} ${_gdaN(cy - h * 0.55)}L${_gdaN(cx + w * 0.45)} ${_gdaN(cy - h * 0.2)}L${cx} ${_gdaN(cy - h * 0.7)}L${_gdaN(cx - w * 0.45)} ${_gdaN(cy - h * 0.2)}Z" fill="${c}"/>`
        + `<path d="M${cx} ${_gdaN(cy - h * 0.7)}Q${_gdaN(cx + w * 0.3)} ${_gdaN(cy)} ${cx} ${_gdaN(cy + h * 0.45)}" stroke="${dark}" stroke-width="1.2" fill="none" opacity="0.6"/>`
        + (c2 && kind !== 'cup-small' ? `<ellipse cx="${_gdaN(cx - w * 0.4)}" cy="${_gdaN(cy - h * 0.1)}" rx="${_gdaN(w * 0.2)}" ry="${_gdaN(h * 0.3)}" fill="${light}" opacity="0.5"/>` : '');
    }
    case 'poppy': return _gdaPetals(cx, cy, 4, r * 0.2, r * 1.0, r * 0.55, c, 45, false) + _gdaPetals(cx, cy, 4, r * 0.1, r * 0.6, r * 0.38, light, 0) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.25)}" fill="${ctr}"/>`;
    case 'trumpet': case 'moon-trumpet': {
      if (kind === 'moon-trumpet') return `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 1.1)}" fill="${c}"/>` + _gdaStar(cx, cy, 5, r * 1.1, r * 0.75, _gdaShade(c2 || c, -0.05), -90) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.25)}" fill="#f6e7a8"/>`;
      return _gdaStar(cx, cy, 6, r * 1.05, r * 0.55, c, -90) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.45)}" fill="${ctr}"/><circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.25)}" fill="${_gdaShade(ctr, -0.2)}"/>`;
    }
    case 'star': case 'star-small': return _gdaStar(cx, cy, 5, r, r * 0.42, c, -90 + o.t * 20) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.22)}" fill="${c2 || light}"/>`;
    case 'lily': return _gdaPetals(cx, cy, 6, r * 0.1, r * 1.1, r * 0.26, c, -90) + _gdaPetals(cx, cy, 3, r * 0.05, r * 0.5, r * 0.1, ctr, -90) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.18)}" fill="${ctr}"/>`;
    case 'pompom': return `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r)}" fill="${dark}"/>` + _gdaPetals(cx, cy, 10, r * 0.3, r * 0.5, r * 0.26, c, 0, true) + _gdaPetals(cx, cy, 6, r * 0.05, r * 0.4, r * 0.22, light, 30, true);
    case 'peony': return `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 1.05)}" fill="${dark}"/>` + _gdaPetals(cx, cy, 8, r * 0.35, r * 0.6, r * 0.35, c, 10, true) + _gdaPetals(cx, cy, 5, r * 0.08, r * 0.45, r * 0.3, light, 0, true);
    case 'rose': case 'rose-bush': return `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r)}" fill="${c}"/>` + `<path d="M${_gdaN(cx - r * 0.55)} ${cy}a${_gdaN(r * 0.55)} ${_gdaN(r * 0.55)} 0 1 1 ${_gdaN(r * 0.9)} ${_gdaN(r * 0.25)}M${_gdaN(cx - r * 0.25)} ${_gdaN(cy + r * 0.05)}a${_gdaN(r * 0.28)} ${_gdaN(r * 0.28)} 0 1 1 ${_gdaN(r * 0.45)} ${_gdaN(r * 0.1)}" stroke="${dark}" stroke-width="${_gdaN(Math.max(1, r * 0.12))}" fill="none" stroke-linecap="round"/>`;
    case 'dahlia': return _gdaPetals(cx, cy, 14, r * 0.35, r * 0.7, r * 0.18, dark, 13) + _gdaPetals(cx, cy, 12, r * 0.18, r * 0.6, r * 0.17, c, 0) + _gdaPetals(cx, cy, 8, r * 0.02, r * 0.35, r * 0.13, light, 20) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.12)}" fill="${_gdaShade(c, -0.4)}"/>`;
    case 'mophead': { let s = `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r)}" fill="${dark}"/>`; const rnd = gardenRand('mop' + o.t); for (let i = 0; i < 16; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r * 0.8; s += _gdaStar(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4, r * 0.28, r * 0.12, i % 3 ? c : light, rnd() * 90); } return s; }
    case 'pansy': return _gdaPetals(cx, cy - r * 0.3, 2, r * 0.25, r * 0.7, r * 0.42, _gdaShade(c, -0.15), -45, false) + _gdaPetals(cx, cy + r * 0.1, 3, r * 0.2, r * 0.65, r * 0.4, c, 30, false) + `<circle cx="${cx}" cy="${_gdaN(cy + r * 0.05)}" r="${_gdaN(r * 0.38)}" fill="${ctr}" opacity="0.85"/><circle cx="${cx}" cy="${_gdaN(cy + r * 0.05)}" r="${_gdaN(r * 0.12)}" fill="#3a2a4a"/>`;
    case 'iris': return `<path d="M${cx} ${_gdaN(cy - r * 1.1)}Q${_gdaN(cx + r * 0.7)} ${_gdaN(cy - r * 0.4)} ${cx} ${cy}Q${_gdaN(cx - r * 0.7)} ${_gdaN(cy - r * 0.4)} ${cx} ${_gdaN(cy - r * 1.1)}Z" fill="${light}"/>` + _gdaLeaf(cx, cy, r * 1.2, 145, r * 0.35, c) + _gdaLeaf(cx, cy, r * 1.2, 35, r * 0.35, c) + `<ellipse cx="${_gdaN(cx - r * 0.45)}" cy="${_gdaN(cy + r * 0.3)}" rx="${_gdaN(r * 0.15)}" ry="${_gdaN(r * 0.08)}" fill="${ctr}"/><ellipse cx="${_gdaN(cx + r * 0.45)}" cy="${_gdaN(cy + r * 0.3)}" rx="${_gdaN(r * 0.15)}" ry="${_gdaN(r * 0.08)}" fill="${ctr}"/>`;
    case 'orchid': return _gdaPetals(cx, cy, 3, r * 0.1, r * 0.95, r * 0.32, c, -90) + _gdaPetals(cx, cy, 2, r * 0.15, r * 0.9, r * 0.45, light, 0) + `<path d="M${_gdaN(cx - r * 0.3)} ${cy}Q${cx} ${_gdaN(cy + r * 0.8)} ${_gdaN(cx + r * 0.3)} ${cy}Z" fill="${c2 || dark}"/>`;
    case 'hibiscus': return _gdaPetals(cx, cy, 5, r * 0.15, r * 1.0, r * 0.5, c, -90, false) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.25)}" fill="${dark}"/><path d="M${cx} ${cy}L${_gdaN(cx + r * 0.9)} ${_gdaN(cy - r * 0.7)}" stroke="${ctr}" stroke-width="1.6" stroke-linecap="round"/><circle cx="${_gdaN(cx + r * 0.9)}" cy="${_gdaN(cy - r * 0.7)}" r="1.6" fill="${ctr}"/>`;
    case 'passion': { let s = _gdaPetals(cx, cy, 10, r * 0.3, r * 0.8, r * 0.18, c2 || '#f7f5f0', 0); for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180; s += `<line x1="${cx}" y1="${cy}" x2="${_gdaN(cx + Math.cos(a) * r * 0.85)}" y2="${_gdaN(cy + Math.sin(a) * r * 0.85)}" stroke="${i % 2 ? c : _gdaShade(c, -0.3)}" stroke-width="1"/>`; } return s + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.2)}" fill="#7a9a3a"/>`; }
    case 'bird-paradise': return `<path d="M${_gdaN(cx - r * 1.2)} ${_gdaN(cy + r * 0.3)}L${_gdaN(cx + r * 0.6)} ${_gdaN(cy + r * 0.1)}L${_gdaN(cx - r * 1.0)} ${_gdaN(cy + r * 0.55)}Z" fill="#4f7a5a"/>` + [0, 1, 2].map(i => `<path d="M${_gdaN(cx - r * 0.2)} ${_gdaN(cy + r * 0.2)}L${_gdaN(cx - r * 0.1 + i * r * 0.35)} ${_gdaN(cy - r * (1.2 - i * 0.2))}L${_gdaN(cx + r * 0.15 + i * r * 0.3)} ${_gdaN(cy + r * 0.1)}Z" fill="${c}"/>`).join('') + `<path d="M${cx} ${_gdaN(cy + r * 0.15)}L${_gdaN(cx + r * 0.9)} ${_gdaN(cy - r * 0.2)}L${_gdaN(cx + r * 0.2)} ${_gdaN(cy + r * 0.35)}Z" fill="${c2}"/>`;
    case 'cluster': case 'clover': case 'flat': {
      if (kind === 'flat') return _gdaPetals(cx, cy, 5, r * 0.2, r * 0.75, r * 0.4, c, -90, false) + `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.22)}" fill="${ctr}"/>`;
      if (kind === 'clover') return `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.75)}" fill="${c}"/>` + _gdaPetals(cx, cy, 8, r * 0.3, r * 0.4, r * 0.2, light, 0, true);
      let s = ''; const rnd = gardenRand('cl' + o.t); for (let i = 0; i < 6; i++) { const a = rnd() * 6.283, d = rnd() * r * 0.8; s += _gdaPetals(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 5, r * 0.05, r * 0.28, r * 0.13, c, rnd() * 72, true) + `<circle cx="${_gdaN(cx + Math.cos(a) * d)}" cy="${_gdaN(cy + Math.sin(a) * d)}" r="${_gdaN(r * 0.1)}" fill="${ctr}"/>`; } return s;
    }
    case 'umbel': { let s = ''; for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; s += `<line x1="${cx}" y1="${_gdaN(cy + r * 0.6)}" x2="${_gdaN(cx + Math.cos(a) * r)}" y2="${_gdaN(cy + Math.sin(a) * r * 0.5)}" stroke="#7aa05a" stroke-width="0.8"/><circle cx="${_gdaN(cx + Math.cos(a) * r)}" cy="${_gdaN(cy + Math.sin(a) * r * 0.5)}" r="${_gdaN(r * 0.24)}" fill="${c}"/>`; } return s; }
    case 'thistle': return `<path d="M${_gdaN(cx - r * 0.5)} ${_gdaN(cy + r * 0.2)}Q${cx} ${_gdaN(cy + r * 1.1)} ${_gdaN(cx + r * 0.5)} ${_gdaN(cy + r * 0.2)}Z" fill="#6f8f5a"/>` + [-3, -2, -1, 0, 1, 2, 3].map(i => `<line x1="${_gdaN(cx + i * r * 0.1)}" y1="${_gdaN(cy + r * 0.2)}" x2="${_gdaN(cx + i * r * 0.22)}" y2="${_gdaN(cy - r * 0.7)}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`).join('');
    default: return `<circle cx="${cx}" cy="${cy}" r="${_gdaN(r)}" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="${_gdaN(r * 0.35)}" fill="${ctr}"/>`;
  }
}

/* ---------- plants ---------- */
// form -> family and its parameters: heads (how many), r (head radius, units), leaf (style), stem (stalk colour)
const _GDA_FORMS = {
  daisy: ['bloom', { heads: 4, r: 9, head: 'daisy', leaf: 'oval' }], 'daisy-tall': ['bloom', { heads: 3, r: 8, head: 'daisy', leaf: 'thin', tall: 1 }],
  'daisy-small': ['bloom', { heads: 5, r: 5, head: 'daisy', leaf: 'frilly' }], 'daisy-cloud': ['bloom', { heads: 9, r: 5, head: 'daisy', leaf: 'thin' }],
  sunflower: ['bloom', { heads: 1, r: 16, head: 'sunflower', leaf: 'heart', tall: 1 }], cup: ['bloom', { heads: 2, r: 8, head: 'cup', leaf: 'strap' }],
  'cup-small': ['bloom', { heads: 4, r: 5, head: 'cup-small', leaf: 'oval' }], goblet: ['bloom', { heads: 3, r: 6, head: 'goblet', leaf: 'strap' }],
  poppy: ['bloom', { heads: 3, r: 9, head: 'poppy', leaf: 'frilly', tall: 1 }], trumpet: ['bloom', { heads: 3, r: 8, head: 'trumpet', leaf: 'strap' }],
  'moon-trumpet': ['bloom', { heads: 3, r: 10, head: 'moon-trumpet', leaf: 'heart', vine: 1 }], star: ['bloom', { heads: 4, r: 7, head: 'star', leaf: 'thin' }],
  'star-small': ['bloom', { heads: 5, r: 5, head: 'star-small', leaf: 'oval' }], lily: ['bloom', { heads: 3, r: 11, head: 'lily', leaf: 'strap', tall: 1 }],
  pompom: ['bloom', { heads: 4, r: 8, head: 'pompom', leaf: 'frilly' }], peony: ['bloom', { heads: 3, r: 12, head: 'peony', leaf: 'oval', bush: 1 }],
  rose: ['bloom', { heads: 3, r: 9, head: 'rose', leaf: 'oval', bush: 1 }], 'rose-bush': ['bloom', { heads: 6, r: 8, head: 'rose', leaf: 'oval', bush: 1, tall: 1 }],
  dahlia: ['bloom', { heads: 3, r: 11, head: 'dahlia', leaf: 'oval', bush: 1 }], mophead: ['bloom', { heads: 4, r: 13, head: 'mophead', leaf: 'oval', bush: 1 }],
  pansy: ['bloom', { heads: 5, r: 7, head: 'pansy', leaf: 'oval', low: 1 }], iris: ['bloom', { heads: 2, r: 10, head: 'iris', leaf: 'sword', tall: 1 }],
  cluster: ['bloom', { heads: 5, r: 8, head: 'cluster', leaf: 'oval', low: 1 }], umbel: ['bloom', { heads: 3, r: 10, head: 'umbel', leaf: 'frilly', tall: 1 }],
  flat: ['bloom', { heads: 5, r: 6, head: 'flat', leaf: 'crinkle', low: 1 }], orchid: ['bloom', { heads: 4, r: 8, head: 'orchid', leaf: 'paddle', arch: 1 }],
  hibiscus: ['bloom', { heads: 3, r: 11, head: 'hibiscus', leaf: 'oval', bush: 1 }], passion: ['bloom', { heads: 3, r: 10, head: 'passion', leaf: 'hand', vine: 1 }],
  'bird-paradise': ['bloom', { heads: 2, r: 13, head: 'bird-paradise', leaf: 'paddle', tall: 1 }], thistle: ['bloom', { heads: 3, r: 7, head: 'thistle', leaf: 'spiky', tall: 1 }],
  clover: ['bloom', { heads: 5, r: 5, head: 'clover', leaf: 'trefoil', low: 1 }], climber: ['bloom', { heads: 7, r: 6, head: 'orchid', leaf: 'oval', vine: 1 }],
  'cup-bowl': ['bloom', { heads: 2, r: 9, head: 'cup', leaf: 'oval' }],
  spike: ['spike', { n: 7, dot: 3 }], 'spike-bell': ['spike', { n: 2, bell: 1, dot: 5 }], 'spike-cup': ['spike', { n: 2, dot: 6, cup: 1 }],
  'orchid-spike': ['spike', { n: 2, dot: 5, orchid: 1 }], bell: ['bells', { n: 3 }], 'bell-arch': ['bells', { n: 4, arch: 1 }], 'bell-cluster': ['bells', { n: 3, cluster: 1 }],
  grass: ['foliage', { kind: 'grass' }], 'grass-flower': ['foliage', { kind: 'grass', puffs: 1 }], fern: ['foliage', { kind: 'fern' }], hosta: ['foliage', { kind: 'hosta' }],
  leafy: ['foliage', { kind: 'leafy' }], 'leafy-soft': ['foliage', { kind: 'soft' }], frilly: ['foliage', { kind: 'frilly' }], 'frilly-tall': ['foliage', { kind: 'frilly', tall: 1 }],
  'needle-bush': ['foliage', { kind: 'needle' }], mat: ['foliage', { kind: 'mat' }], 'big-leaf': ['foliage', { kind: 'big', stalks: 1 }],
  root: ['veg', { kind: 'root' }], 'root-frilly': ['veg', { kind: 'root', frilly: 1 }], head: ['veg', { kind: 'head' }], bushy: ['veg', { kind: 'bushy' }],
  bulb: ['veg', { kind: 'bulb' }], leek: ['veg', { kind: 'leek' }], stalk: ['veg', { kind: 'stalk' }], pole: ['veg', { kind: 'pole' }],
  'vine-pod': ['veg', { kind: 'pod' }], 'vine-fruit': ['veg', { kind: 'vinefruit' }], sprawl: ['veg', { kind: 'sprawl' }], pumpkin: ['veg', { kind: 'pumpkin' }],
  melon: ['veg', { kind: 'melon' }], 'bush-fruit': ['veg', { kind: 'bushfruit' }], floret: ['veg', { kind: 'floret' }],
  'low-fruit': ['berry', { kind: 'low' }], cane: ['berry', { kind: 'cane' }], 'berry-bush': ['berry', { kind: 'bush' }], bramble: ['berry', { kind: 'bramble' }], 'vine-grape': ['berry', { kind: 'grape' }],
  oak: ['tree', { kind: 'oak' }], 'fruit-tree': ['tree', { kind: 'round', fruit: 1 }], 'fruit-tree-tall': ['tree', { kind: 'tall', fruit: 1 }], 'round-tree': ['tree', { kind: 'round' }],
  birch: ['tree', { kind: 'birch' }], 'lace-tree': ['tree', { kind: 'lace' }], weeping: ['tree', { kind: 'weeping' }], 'blossom-tree': ['tree', { kind: 'round', blossom: 1 }],
  'cone-tree': ['tree', { kind: 'cone', fruit: 1 }], conifer: ['tree', { kind: 'conifer' }], 'bush-tree': ['tree', { kind: 'bush', fruit: 1 }], fig: ['tree', { kind: 'fig', fruit: 1 }],
  olive: ['tree', { kind: 'olive', fruit: 1 }], 'potted-tree': ['tree', { kind: 'potted', fruit: 1 }], bonsai: ['tree', { kind: 'bonsai' }], banana: ['tree', { kind: 'banana', fruit: 1 }],
  aloe: ['succ', { kind: 'aloe' }], rosette: ['succ', { kind: 'rosette' }], 'spiky-rosette': ['succ', { kind: 'spiky' }], jade: ['succ', { kind: 'jade' }],
  barrel: ['succ', { kind: 'barrel' }], pads: ['succ', { kind: 'pads' }], saguaro: ['succ', { kind: 'saguaro' }], trailing: ['succ', { kind: 'trailing' }],
  'lily-pad': ['pond', { kind: 'pad' }], lotus: ['pond', { kind: 'lotus' }], reed: ['pond', { kind: 'reed' }], papyrus: ['pond', { kind: 'papyrus' }],
  flytrap: ['odd', { kind: 'flytrap' }], pitcher: ['odd', { kind: 'pitcher' }], mushroom: ['odd', { kind: 'mushroom' }], titan: ['odd', { kind: 'titan' }],
};
function _gdaLeafStyle(style, x, y, len, ang, col, cls) {
  switch (style) {
    case 'strap': case 'sword': return _gdaLeaf(x, y, len * 1.25, ang, len * (style === 'sword' ? 0.1 : 0.16), col, cls);
    case 'thin': return _gdaLeaf(x, y, len, ang, len * 0.1, col, cls);
    case 'heart': case 'paddle': case 'hand': return _gdaLeaf(x, y, len * 1.1, ang, len * 0.38, col, cls);
    case 'frilly': case 'spiky': return _gdaLeaf(x, y, len, ang, len * 0.22, col, cls) + _gdaLeaf(x + Math.cos(ang * Math.PI / 180) * len * 0.5, y + Math.sin(ang * Math.PI / 180) * len * 0.5, len * 0.45, ang - 35, len * 0.12, col, cls);
    case 'trefoil': return _gdaPetals(x + Math.cos(ang * Math.PI / 180) * len * 0.6, y + Math.sin(ang * Math.PI / 180) * len * 0.6, 3, 1, len * 0.35, len * 0.22, col, 30, true);
    case 'crinkle': return _gdaLeaf(x, y, len * 0.9, ang, len * 0.32, col, cls);
    default: return _gdaLeaf(x, y, len, ang, len * 0.26, col, cls);
  }
}
/** A stage-0 mound or a stage-1 sprout (the same for every plant, in its leaf colour). */
function _gdaYoung(def, o, leaf) {
  const fp = def.fp || 1, w = 16 * fp;
  if (def.cat === 'water') {
    // in the pond: rings on the water, then a first floating leaf or shoot
    const rings = `<ellipse class="gda-ripple" cx="0" cy="-2" rx="${w}" ry="4" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.2"/><ellipse cx="0" cy="-2" rx="${_gdaN(w * 0.5)}" ry="2" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1"/>`;
    if (o.stage <= 0) return rings + `<circle cx="0" cy="-3" r="2.2" fill="${_gdaShade(leaf, -0.2)}"/>`;
    return rings + (def.look.form === 'reed' || def.look.form === 'papyrus' || def.look.form === 'iris'
      ? _gdaLeaf(0, -2, 14, -95, 2, leaf) + _gdaLeaf(1, -2, 11, -75, 1.8, _gdaShade(leaf, 0.12))
      : `<g class="gda-bob"><path d="M-8 -3a8 3.4 0 1 0 16 0a8 3.4 0 1 0 -16 0zM0 -3l7 -1" fill="${leaf}" stroke="${_gdaShade(leaf, -0.2)}" stroke-width="0.7"/></g>`);
  }
  if (o.stage <= 0) return _gdaShadow(w) + `<ellipse cx="0" cy="-2" rx="${w}" ry="5" fill="#6f4a2e"/><ellipse cx="0" cy="-3" rx="${_gdaN(w * 0.7)}" ry="3" fill="#86603e"/>`
    + `<line x1="${_gdaN(w * 0.6)}" y1="-3" x2="${_gdaN(w * 0.6)}" y2="-16" stroke="#a87c4f" stroke-width="1.6"/><rect x="${_gdaN(w * 0.6 - 4)}" y="-21" width="8" height="6" rx="1" fill="#f4efe2"/><circle cx="${_gdaN(w * 0.6)}" cy="-18" r="1.8" fill="${_gdaHex(def.look.c || leaf)}"/>`;
  const droop = o.thirsty ? 18 : 0;
  return _gdaShadow(w * 0.6) + `<ellipse cx="0" cy="-1" rx="${_gdaN(w * 0.5)}" ry="3" fill="#7a5436"/>` + `<g class="gda-sway">` + _gdaStem(0, -1, 0, -11, 1, leaf, 1.6)
    + _gdaLeaf(0, -10, 9, -150 + droop, 3.4, leaf) + _gdaLeaf(0, -10, 9, -30 - droop, 3.4, _gdaShade(leaf, 0.12)) + '</g>';
}
function _gdaPlant(def, o) {
  const look = def.look, fam = _GDA_FORMS[look.form] || ['bloom', { heads: 3, r: 7, head: 'daisy', leaf: 'oval' }];
  const season = o.season || 'summer';
  let leaf = _gdaHex(look.leaf || '#5a9e4b');
  if (season === 'winter' && !['succulent', 'exotic', 'water'].includes(def.cat)) leaf = _gdaMix(leaf, '#7f8f86', 0.35);
  if (o.thirsty) leaf = _gdaMix(leaf, '#a8a060', 0.25);
  if (o.stage <= 1) return _gdaYoung(def, o, leaf);
  const c = _gdaHex((look.v && look.v[o.variant]) || look.c || '#e0566e'), c2 = look.c2 ? _gdaHex(look.c2) : null;
  const H = 64 * (look.h || 0.7) * (o.stage === 2 ? 0.55 : o.stage === 3 ? 0.85 : 1);
  const fn = { bloom: _gdaBloom, spike: _gdaSpike, bells: _gdaBells, foliage: _gdaFoliage, veg: _gdaVeg, berry: _gdaBerry, tree: _gdaTree, succ: _gdaSucc, pond: _gdaPond, odd: _gdaOdd }[fam[0]] || _gdaBloom;
  let s = fn(def, o, fam[1], { H, c, c2, leaf, season });
  if (o.glow && o.tod === 'night') s = `<circle class="gda-glow" cx="0" cy="${_gdaN(-H * 0.7)}" r="${_gdaN(18 + H * 0.3)}" fill="${c}" opacity="0.18"/>` + s;
  if (o.overgrown && o.size !== 's') s += [-1, 1].map(k => `<path d="M${k * 10} ${_gdaN(-H * 0.4)}q${k * 8} -6 ${k * 13} 2" stroke="${leaf}" stroke-width="1.6" fill="none"/>`).join('');
  return s;
}
function _gdaBloom(def, o, p, k) {
  const fp = def.fp || 1, w = 14 * fp * (p.bush ? 1.4 : 1), n = o.size === 's' ? Math.min(p.heads, 3) : p.heads;
  const rnd = gardenRand(def.id + '|' + Math.round(o.t * 20));
  const droop = o.thirsty ? 1 : 0;
  let s = _gdaShadow(w), lv = '', st = '', hd = '';
  // leaves at the base
  const nl = p.low ? 6 : p.bush ? 7 : 4;
  for (let i = 0; i < nl; i++) {
    const side = i % 2 ? 1 : -1, ang = side < 0 ? -160 + i * 9 + droop * 25 : -20 - i * 9 - droop * 25;
    lv += _gdaLeafStyle(p.leaf, side * (2 + i), -2 - (p.bush ? i * k.H * 0.06 : i * 0.8), 12 + (p.low ? 0 : k.H * 0.12) + rnd() * 4, ang, i % 3 ? k.leaf : _gdaShade(k.leaf, 0.12));
  }
  if (p.bush) {
    // a leafy mound: overlapping clumps in three greens, then leaves poking out of its edge
    let mound = '';
    const lumps = o.size === 's' ? 4 : 6, my = -k.H * 0.3;
    for (let i = 0; i < lumps; i++) {
      const f = i / (lumps - 1) - 0.5, rx = w * (0.42 + rnd() * 0.12), ry = k.H * (0.2 + rnd() * 0.08);
      mound += `<ellipse cx="${_gdaN(f * w * 1.2)}" cy="${_gdaN(my + Math.abs(f) * k.H * 0.16 - rnd() * 4)}" rx="${_gdaN(rx)}" ry="${_gdaN(ry)}" fill="${[_gdaShade(k.leaf, -0.18), _gdaShade(k.leaf, -0.05), _gdaShade(k.leaf, 0.06)][i % 3]}"/>`;
    }
    for (let i = 0; i < 9; i++) { const a = -170 + i * 20; mound += _gdaLeafStyle(p.leaf, Math.cos(a * Math.PI / 180) * w * 0.6, my + Math.sin(a * Math.PI / 180) * k.H * 0.22, 7 + rnd() * 3, a + (rnd() - 0.5) * 30, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.15)); }
    lv = mound + lv;
  }
  const open = o.stage >= 4 && !(def.night && o.tod !== 'night' && o.tod !== 'dusk');
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    const sit = p.bush && !p.tall;   // bush flowers sit in the foliage rather than floating above it
    const hx = f * w * (sit ? 1.25 : 1.5) + (rnd() - 0.5) * 4, hy = -k.H * (p.low ? 0.45 + rnd() * 0.3 : sit ? 0.5 + rnd() * 0.22 : 0.7 + rnd() * 0.3) + (droop ? 4 : 0);
    if (!p.bush || p.tall) {
      st += _gdaStem(f * 3, -1, hx, hy, (rnd() - 0.5) * 8 + droop * 5, _gdaShade(k.leaf, -0.1), p.tall ? 2 : 1.4);
      // tall flowers carry leaves up the stem
      if (p.tall && !p.bush && o.size !== 's') for (let j = 1; j <= (n === 1 ? 3 : 1); j++) { const t = j / 4; st += _gdaLeafStyle(p.leaf === 'sword' ? 'strap' : p.leaf, hx * t, hy * t, 8 + k.H * 0.05, (j % 2 ? -25 : -155) + droop * 20, j % 2 ? k.leaf : _gdaShade(k.leaf, 0.1)); }
    }
    if (p.vine) st += _gdaLeaf(hx * 0.6, hy * 0.6, 8, -40 + rnd() * 60, 3, k.leaf);
    const r = p.r * (o.size === 's' ? 1.1 : 1) * (0.85 + rnd() * 0.3);
    if (open) hd += `<g transform="translate(${_gdaN(hx)} ${_gdaN(hy)})${droop ? ' rotate(14)' : ''}">${_gdaHead(p.head, 0, 0, r, k.c, k.c2, o)}</g>`;
    else hd += `<ellipse cx="${_gdaN(hx)}" cy="${_gdaN(hy)}" rx="${_gdaN(r * 0.35)}" ry="${_gdaN(r * 0.55)}" fill="${o.stage >= 3 ? _gdaMix(k.c, k.leaf, 0.45) : k.leaf}"/>`;
  }
  if (p.vine) s += `<line x1="${_gdaN(-w * 0.4)}" y1="0" x2="${_gdaN(-w * 0.2)}" y2="${_gdaN(-k.H)}" stroke="#a87c4f" stroke-width="1.4"/><line x1="${_gdaN(w * 0.4)}" y1="0" x2="${_gdaN(w * 0.2)}" y2="${_gdaN(-k.H)}" stroke="#a87c4f" stroke-width="1.4"/>`;
  return s + `<g class="gda-sway">${lv}${st}${hd}</g>`;
}
function _gdaSpike(def, o, p, k) {
  const fp = def.fp || 1, w = 12 * fp, rnd = gardenRand(def.id + '|' + Math.round(o.t * 20)), n = o.size === 's' ? Math.min(3, p.n) : p.n;
  let s = _gdaShadow(w), g = '';
  for (let i = 0; i < 5; i++) g += _gdaLeafStyle('strap', (i - 2) * 2, -2, 10 + k.H * 0.1, -90 + (i - 2) * 22 + (o.thirsty ? (i - 2) * 6 : 0), k.leaf);
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i / (n - 1) - 0.5) * w * 1.6, top = -k.H * (0.8 + rnd() * 0.2), lean = (rnd() - 0.5) * 6 + (o.thirsty ? 6 : 0);
    g += _gdaStem(x * 0.3, -1, x + lean, top, lean * 0.3, _gdaShade(k.leaf, -0.1), 1.6);
    const steps = Math.max(4, Math.round(-top / (p.dot * 1.8)));
    for (let j = 0; j < steps; j++) {
      const t = j / steps, yy = top * (0.45 + t * 0.55), xx = x * 0.3 + (x + lean - x * 0.3) * (0.45 + t * 0.55);
      if (o.stage < 4 && j < steps - 2) continue;
      const col = o.stage >= 4 ? (j % 2 ? k.c : _gdaShade(k.c, 0.15)) : _gdaMix(k.c, k.leaf, 0.5);
      const r = p.dot * (1 - t * 0.45) * (o.stage >= 4 ? 1 : 0.6);
      if (p.bell) g += `<path d="M${_gdaN(xx - r)} ${_gdaN(yy)}q${_gdaN(r)} ${_gdaN(-r * 1.6)} ${_gdaN(r * 2)} 0z" fill="${col}"/>` + (o.stage >= 4 ? `<circle cx="${_gdaN(xx)}" cy="${_gdaN(yy - 1)}" r="0.9" fill="${_gdaShade(k.c, -0.4)}"/>` : '');
      else if (p.orchid) g += _gdaPetals(xx + (j % 2 ? 3 : -3), yy, 3, 0.5, r, r * 0.45, col, -90);
      else if (p.cup) g += `<ellipse cx="${_gdaN(xx + (j % 2 ? 2.5 : -2.5))}" cy="${_gdaN(yy)}" rx="${_gdaN(r * 0.8)}" ry="${_gdaN(r * 0.6)}" fill="${col}"/>`;
      else g += `<ellipse cx="${_gdaN(xx + (j % 2 ? 1.2 : -1.2))}" cy="${_gdaN(yy)}" rx="${_gdaN(r * 0.7)}" ry="${_gdaN(r)}" fill="${col}"/>`;
    }
  }
  return s + `<g class="gda-sway">${g}</g>`;
}
function _gdaBells(def, o, p, k) {
  const w = 12, rnd = gardenRand(def.id + '|' + Math.round(o.t * 20));
  let g = '';
  for (let i = 0; i < 4; i++) g += _gdaLeafStyle('strap', (i - 1.5) * 3, -1, 9 + k.H * 0.12, -90 + (i - 1.5) * 26, k.leaf);
  for (let i = 0; i < p.n; i++) {
    const x = (i / Math.max(1, p.n - 1) - 0.5) * w * 1.4, top = -k.H * (0.75 + rnd() * 0.25);
    const ex = x + (p.arch ? 9 : 4);
    g += `<path d="M${_gdaN(x * 0.2)} -1Q${_gdaN(x)} ${_gdaN(top * 1.1)} ${_gdaN(ex)} ${_gdaN(top + 4)}" stroke="${_gdaShade(k.leaf, -0.1)}" stroke-width="1.4" fill="none"/>`;
    const bells = p.cluster ? 4 : p.arch ? 4 : 2;
    for (let j = 0; j < bells; j++) {
      const bx = x + (ex - x) * (0.5 + j / bells * 0.5) + (p.cluster ? (j - 1.5) * 3 : 0), by = top + 6 + j * (p.arch ? 2.5 : 1.5);
      const col = o.stage >= 4 ? k.c : _gdaMix(k.c, k.leaf, 0.55), r = o.stage >= 4 ? 3.2 : 2;
      g += `<path d="M${_gdaN(bx - r)} ${_gdaN(by + r * 1.6)}Q${_gdaN(bx - r)} ${_gdaN(by)} ${_gdaN(bx)} ${_gdaN(by)}Q${_gdaN(bx + r)} ${_gdaN(by)} ${_gdaN(bx + r)} ${_gdaN(by + r * 1.6)}L${_gdaN(bx + r * 0.5)} ${_gdaN(by + r * 1.3)}L${_gdaN(bx)} ${_gdaN(by + r * 1.7)}L${_gdaN(bx - r * 0.5)} ${_gdaN(by + r * 1.3)}Z" fill="${col}"/>`;
    }
  }
  return _gdaShadow(w) + `<g class="gda-sway">${g}</g>`;
}
function _gdaFoliage(def, o, p, k) {
  const fp = def.fp || 1, w = 14 * fp, rnd = gardenRand(def.id + '|' + Math.round(o.t * 20)), H = k.H;
  let g = '', s = _gdaShadow(w);
  const dl = o.thirsty ? 14 : 0;
  switch (p.kind) {
    case 'grass': for (let i = 0; i < 11; i++) { const x = (i - 5) * 1.6, top = -H * (0.6 + rnd() * 0.4); g += `<path d="M${_gdaN(x)} 0Q${_gdaN(x + (rnd() - 0.5) * 8)} ${_gdaN(top * 0.5)} ${_gdaN(x + (i - 5) * 1.5 + dl * 0.4)} ${_gdaN(top)}" stroke="${i % 3 ? k.leaf : _gdaShade(k.leaf, 0.2)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; if ((p.puffs || def.cat === 'wild') && o.stage >= 4 && i % 3 === 0) g += p.puffs ? `<circle cx="${_gdaN(x + (i - 5) * 1.5)}" cy="${_gdaN(top)}" r="3.2" fill="${k.c}"/>` : `<ellipse cx="${_gdaN(x + (i - 5) * 1.5)}" cy="${_gdaN(top + 3)}" rx="1.6" ry="4" fill="${k.c}"/>`; } break;
    case 'fern': for (let i = 0; i < 7; i++) { const ang = -160 + i * 23 + (i < 3 ? -dl : dl), len = H * (0.8 + rnd() * 0.25), a = ang * Math.PI / 180; g += `<path d="M0 0Q${_gdaN(Math.cos(a) * len * 0.5)} ${_gdaN(Math.sin(a) * len * 0.7)} ${_gdaN(Math.cos(a) * len)} ${_gdaN(Math.sin(a) * len)}" stroke="${k.leaf}" stroke-width="1.2" fill="none"/>`; for (let j = 1; j < 6; j++) { const t = j / 6; g += _gdaLeaf(Math.cos(a) * len * t, Math.sin(a) * len * t, 6 * (1 - t * 0.5), ang - 60, 1.6, _gdaShade(k.leaf, j % 2 ? 0.08 : 0)) + _gdaLeaf(Math.cos(a) * len * t, Math.sin(a) * len * t, 6 * (1 - t * 0.5), ang + 60, 1.6, k.leaf); } } break;
    case 'hosta': for (let i = 0; i < 7; i++) g += _gdaLeaf(0, -1, H * 0.75 + rnd() * 6, -170 + i * 27 + (i < 3 ? -dl : i > 3 ? dl : 0), H * 0.22, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.15)) ; if (o.stage >= 4) g += _gdaStem(0, -2, 3, -H * 1.3, 2, _gdaShade(k.leaf, -0.1), 1.3) + [0, 1, 2, 3].map(j => `<ellipse cx="${_gdaN(3 + (j % 2 ? 2 : -2))}" cy="${_gdaN(-H * 1.3 + j * 4)}" rx="1.8" ry="3" fill="${k.c}"/>`).join(''); break;
    case 'frilly': for (let i = 0; i < 9; i++) { const ang = -165 + i * 18, len = H * (p.tall ? 0.95 : 0.8) * (0.8 + rnd() * 0.3); g += _gdaLeafStyle('frilly', 0, -1, len, ang + (i < 4 ? -dl : i > 4 ? dl : 0), i % 2 ? k.leaf : _gdaShade(k.leaf, -0.12)); } break;
    case 'needle': for (let i = 0; i < 9; i++) { const x = (i - 4) * 2.4, top = -H * (0.7 + rnd() * 0.3); g += _gdaStem(x * 0.4, 0, x, top, 0, _gdaShade(k.leaf, -0.2), 1.4); for (let j = 0; j < 6; j++) { const yy = top * (0.3 + j * 0.12); g += `<line x1="${_gdaN(x * (0.4 + j * 0.1))}" y1="${_gdaN(yy)}" x2="${_gdaN(x * (0.4 + j * 0.1) + (j % 2 ? 3 : -3))}" y2="${_gdaN(yy - 2.5)}" stroke="${k.leaf}" stroke-width="1.2"/>`; } if (o.stage >= 4 && k.c && i % 2) g += `<circle cx="${_gdaN(x)}" cy="${_gdaN(top)}" r="1.6" fill="${k.c}"/>`; } break;
    case 'mat': g += `<ellipse cx="0" cy="-3" rx="${w}" ry="${_gdaN(Math.max(5, H * 0.4))}" fill="${_gdaShade(k.leaf, -0.1)}"/>`; for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * w * 1.8, y = -2 - rnd() * H * 0.7; g += `<circle cx="${_gdaN(x)}" cy="${_gdaN(y)}" r="1.5" fill="${o.stage >= 4 && i % 3 === 0 && k.c ? k.c : _gdaShade(k.leaf, rnd() * 0.25)}"/>`; } break;
    case 'soft': for (let i = 0; i < 7; i++) g += _gdaLeaf(0, -1 - i * 0.6, H * 0.6 + rnd() * 4, -160 + i * 23 + (i < 3 ? -dl : i > 3 ? dl : 0), H * 0.2, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.15)); if (o.stage >= 4 && k.c) g += _gdaSpike(def, Object.assign({}, o, { size: 's' }), { n: 2, dot: 2.2 }, Object.assign({}, k, { H: H * 1.3 })).replace(/<ellipse[^>]*opacity="0.13"\/>/, ''); break;
    case 'big': for (let i = 0; i < 5; i++) { const ang = -150 + i * 30, a = ang * Math.PI / 180, len = H * 0.75; if (p.stalks) g += _gdaStem(0, 0, Math.cos(a) * len * 0.6, Math.sin(a) * len * 0.6, 0, k.c, 2.6); g += _gdaLeaf(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, len * 0.6, ang + (dl ? 15 : 0), len * 0.3, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.12)); } break;
    default: for (let i = 0; i < 8; i++) g += _gdaLeaf(0, -1 - i * 1.2, H * 0.5 + rnd() * 5, -160 + i * 20 + (i < 4 ? -dl : dl), H * 0.15 + 2, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.14));
  }
  return s + `<g class="gda-sway">${g}</g>`;
}
function _gdaVeg(def, o, p, k) {
  const fp = def.fp || 1, w = 14 * fp, H = k.H, rnd = gardenRand(def.id + '|' + Math.round(o.t * 20)), ripe = o.stage >= 4;
  const dl = o.thirsty ? 14 : 0, fc = ripe ? k.c : _gdaMix(k.c, k.leaf, 0.6);
  let s = _gdaShadow(w), g = '';
  const tufts = (n, len, frilly) => { let t = ''; for (let i = 0; i < n; i++) t += _gdaLeafStyle(frilly ? 'frilly' : 'oval', 0, -3, len * (0.8 + rnd() * 0.3), -150 + i * (120 / Math.max(1, n - 1)) + (i < n / 2 ? -dl : dl), i % 2 ? k.leaf : _gdaShade(k.leaf, 0.12)); return t; };
  switch (p.kind) {
    case 'root': s += `<path d="M-7 -1Q0 ${_gdaN(-9 - H * 0.08)} 7 -1Z" fill="${fc}"/><ellipse cx="0" cy="-3" rx="${ripe ? 7 : 5}" ry="3.2" fill="${fc}"/>`; g += tufts(p.frilly ? 6 : 5, H * 0.9, p.frilly); break;
    case 'head': { const r = H * 0.45 + 4; g += `<circle cx="0" cy="${_gdaN(-r * 0.8)}" r="${_gdaN(r)}" fill="${_gdaShade(fc, -0.1)}"/>`; for (let i = 0; i < 6; i++) g += _gdaLeaf(0, -r * 0.5, r * 1.15, -170 + i * 32, r * 0.5, i % 2 ? fc : _gdaShade(fc, 0.15)); g += `<circle cx="0" cy="${_gdaN(-r * 0.9)}" r="${_gdaN(r * 0.5)}" fill="${_gdaShade(fc, 0.25)}"/>`; break; }
    case 'bushy': g += tufts(9, H * 0.7, false); if (ripe) g += `<circle cx="-6" cy="-${_gdaN(H * 0.7)}" r="2.4" fill="${k.c2 || '#f4f0f7'}"/><circle cx="5" cy="-${_gdaN(H * 0.8)}" r="2.4" fill="${k.c2 || '#f4f0f7'}"/>` + `<ellipse cx="-9" cy="-1" rx="4" ry="3" fill="${k.c}"/><ellipse cx="8" cy="0" rx="3.5" ry="2.6" fill="${k.c}"/>`; break;
    case 'bulb': s += `<path d="M-7 -1Q-8 -10 0 -12Q8 -10 7 -1Z" fill="${fc}"/>`; for (let i = 0; i < 5; i++) g += _gdaLeaf((i - 2) * 1.2, -11, H * 0.85, -90 + (i - 2) * 12 + (dl ? (i - 2) * 6 : 0), 1.6, k.leaf); break;
    case 'leek': g += `<rect x="-3.5" y="${_gdaN(-H * 0.45)}" width="7" height="${_gdaN(H * 0.45)}" fill="${k.c}"/>`; for (let i = 0; i < 4; i++) g += _gdaLeaf(0, -H * 0.42, H * 0.6, -90 + (i - 1.5) * 26 + (dl ? (i - 1.5) * 8 : 0), 3, k.leaf); break;
    case 'stalk': g += _gdaStem(0, 0, 0, -H, 1, _gdaShade(k.leaf, -0.1), 3); for (let i = 0; i < 6; i++) g += _gdaLeaf(0, -H * (0.2 + i * 0.12), H * 0.35, i % 2 ? -25 + dl : -155 - dl, 3, k.leaf); if (o.stage >= 3) g += `<ellipse cx="4" cy="${_gdaN(-H * 0.55)}" rx="3.4" ry="8" fill="${ripe ? k.c : '#9fc35a'}" transform="rotate(15 4 ${_gdaN(-H * 0.55)})"/><path d="M4 ${_gdaN(-H * 0.55 - 8)}l3 -5" stroke="${k.c2 || '#c9a26a'}" stroke-width="1.4"/>`; g += `<path d="M0 ${_gdaN(-H)}l-3 -6M0 ${_gdaN(-H)}l3 -6M0 ${_gdaN(-H)}v-7" stroke="#d8c48a" stroke-width="1.3"/>`; break;
    case 'pole': g += `<path d="M-8 0L0 ${_gdaN(-H)}L8 0" stroke="#a87c4f" stroke-width="1.8" fill="none"/>`; for (let i = 0; i < 9; i++) { const t = i / 9, x = (i % 2 ? 1 : -1) * (8 - 8 * t); g += _gdaLeaf(x, -H * t, 7, i % 2 ? -20 : -160, 3, k.leaf); if (o.stage >= 3 && i % 3 === 1) g += `<circle cx="${_gdaN(x)}" cy="${_gdaN(-H * t - 3)}" r="2" fill="${k.c}"/>`; if (ripe && i % 3 === 2) g += `<path d="M${_gdaN(x)} ${_gdaN(-H * t)}q1 7 -1 12" stroke="${k.c2 || '#5d9e3c'}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`; } break;
    case 'pod': g += `<line x1="-6" y1="0" x2="-6" y2="${_gdaN(-H)}" stroke="#c9b48a" stroke-width="1.2"/><line x1="6" y1="0" x2="6" y2="${_gdaN(-H)}" stroke="#c9b48a" stroke-width="1.2"/>`; for (let i = 0; i < 7; i++) { const y = -H * (0.1 + i * 0.12), x = (i % 2 ? 4 : -4); g += _gdaLeaf(x, y, 6, i % 2 ? -10 : -170, 3, k.leaf); if (o.stage >= 3 && i % 2) g += ripe ? `<path d="M${x} ${_gdaN(y)}q3 4 0 10q-3 -4 0 -10z" fill="${k.c}"/>` : `<circle cx="${x}" cy="${_gdaN(y)}" r="1.6" fill="${k.c2 || '#f7f5f0'}"/>`; } break;
    case 'vinefruit': g += `<line x1="0" y1="0" x2="0" y2="${_gdaN(-H)}" stroke="#a87c4f" stroke-width="1.8"/>`; for (let i = 0; i < 8; i++) { const y = -H * (0.12 + i * 0.11); g += _gdaLeafStyle('frilly', 0, y, 9, i % 2 ? -20 + dl : -160 - dl, k.leaf); } if (o.stage >= 3) for (let i = 0; i < 5; i++) g += `<circle cx="${(i % 2 ? 5 : -5) + (rnd() - 0.5) * 3}" cy="${_gdaN(-H * (0.25 + i * 0.13))}" r="${ripe ? 3.6 : 2.6}" fill="${fc}"/>`; break;
    case 'sprawl': case 'pumpkin': case 'melon': {
      for (let i = 0; i < 6; i++) g += _gdaLeaf((i - 2.5) * 4, -3, 11 + H * 0.15, -150 + i * 24 + (dl ? (i < 3 ? -dl : dl) : 0), 6, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.12));
      if (o.stage >= 3) {
        if (p.kind === 'pumpkin') { const r = ripe ? 9 + H * 0.06 : 6; g += `<ellipse cx="4" cy="${_gdaN(-r * 0.75)}" rx="${_gdaN(r * 1.25)}" ry="${_gdaN(r * 0.85)}" fill="${fc}"/><ellipse cx="4" cy="${_gdaN(-r * 0.75)}" rx="${_gdaN(r * 0.5)}" ry="${_gdaN(r * 0.85)}" fill="${_gdaShade(fc, -0.12)}"/><path d="M4 ${_gdaN(-r * 1.55)}l1.5 -4" stroke="#5a7a3a" stroke-width="2"/>`; if (o.glow && o.tod === 'night') g += `<path d="M0 ${_gdaN(-r * 0.9)}l2 -2 2 2zM6 ${_gdaN(-r * 0.9)}l2 -2 2 2zM0 ${_gdaN(-r * 0.5)}q4 3 8 0" fill="#ffe08a" stroke="#ffe08a" class="gda-glow"/>`; }
        else if (p.kind === 'melon') { const r = ripe ? 9 : 6; g += `<circle cx="3" cy="${-r}" r="${r}" fill="${fc}"/><path d="M${3 - r * 0.7} ${-r}h${r * 1.4}M3 ${-r * 1.7}v${r * 1.4}" stroke="${_gdaShade(fc, 0.3)}" stroke-width="0.8" opacity="0.7"/>`; }
        else { g += `<ellipse cx="6" cy="-4" rx="${ripe ? 9 : 6}" ry="3" fill="${fc}"/>`; if (k.c2) g += _gdaStar(-6, -14, 5, 4, 2, k.c2, -90); }
      }
      break;
    }
    case 'bushfruit': g += _gdaMound(w * 1.25, H * 0.95, k.leaf, rnd, 5); for (let i = 0; i < 9; i++) g += _gdaLeaf((rnd() - 0.5) * w * 1.8, -H * (0.3 + rnd() * 0.5), 7, rnd() * 360, 3, k.leaf); if (o.stage >= 3) for (let i = 0; i < 6; i++) { const x = (rnd() - 0.5) * w * 1.9, y = -H * (0.2 + rnd() * 0.5); g += def.id === 'aubergine' ? `<ellipse cx="${_gdaN(x)}" cy="${_gdaN(y)}" rx="3" ry="5.5" fill="${fc}"/>` : `<path d="M${_gdaN(x)} ${_gdaN(y)}q2 5 0 9q-2 -4 0 -9z" fill="${fc}"/>`; } break;
    case 'floret': g += tufts(6, H * 0.8, false); if (o.stage >= 3) { g += `<rect x="-2" y="${_gdaN(-H * 0.7)}" width="4" height="${_gdaN(H * 0.5)}" fill="#9fc38a"/>`; for (let i = 0; i < 7; i++) g += `<circle cx="${_gdaN((i - 3) * 2.6)}" cy="${_gdaN(-H * 0.75 - (i % 2) * 2.5)}" r="${ripe ? 3.6 : 2.6}" fill="${_gdaShade(k.c, i % 2 ? 0.1 : 0)}"/>`; } break;
  }
  return s + `<g class="gda-sway">${g}</g>`;
}
function _gdaBerry(def, o, p, k) {
  const fp = def.fp || 1, w = 15 * fp, H = k.H, rnd = gardenRand(def.id + '|' + Math.round(o.t * 20)), ripe = o.stage >= 4;
  const berry = ripe ? k.c : _gdaMix(k.c, '#9fc35a', 0.6);
  let s = _gdaShadow(w), g = '';
  const dots = (n, spread, y0, y1, r) => { let t = ''; for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * spread, y = y0 + (y1 - y0) * rnd(); t += `<circle cx="${_gdaN(x)}" cy="${_gdaN(y)}" r="${r}" fill="${berry}"/><circle cx="${_gdaN(x - r * 0.3)}" cy="${_gdaN(y - r * 0.3)}" r="${_gdaN(r * 0.3)}" fill="#ffffff" opacity="0.5"/>`; } return t; };
  switch (p.kind) {
    case 'low': for (let i = 0; i < 6; i++) g += _gdaPetals((i - 2.5) * 4, -6 - (i % 2) * 3, 3, 0.5, 5, 3, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.12), -90 + i * 20, true); if (o.stage >= 3) for (let i = 0; i < 4; i++) g += ripe ? `<path d="M${(i - 1.5) * 6} -1l-3 -5q3 -3 6 0z" fill="${k.c}" transform="rotate(180 ${(i - 1.5) * 6} -3)"/>` : `<circle cx="${(i - 1.5) * 6}" cy="-12" r="2.2" fill="${k.c2 || '#ffffff'}"/>`; break;
    case 'cane': for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 5; g += _gdaStem(x * 0.4, 0, x, -H * (0.8 + rnd() * 0.2), (i - 1.5) * 3, '#8a6a4a', 1.6); for (let j = 0; j < 4; j++) g += _gdaLeafStyle('frilly', x * (0.5 + j * 0.15), -H * (0.25 + j * 0.18), 7, j % 2 ? -20 : -160, k.leaf); } if (o.stage >= 3) g += dots(7, w * 1.6, -H * 0.2, -H * 0.85, 2.6); break;
    case 'bush': g += _gdaMound(w * 1.3, H, k.leaf, rnd, 5); for (let i = 0; i < 12; i++) g += _gdaLeaf((rnd() - 0.5) * w * 2.2, -H * (0.2 + rnd() * 0.65), 6, rnd() * 360, 2.6, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.15)); if (o.stage >= 3) g += dots(12, w * 2.1, -H * 0.2, -H * 0.8, 2.4); break;
    case 'bramble': for (let i = 0; i < 5; i++) { const a = (-160 + i * 35) * Math.PI / 180; g += `<path d="M0 0Q${_gdaN(Math.cos(a) * H * 0.4)} ${_gdaN(-H * 0.9)} ${_gdaN(Math.cos(a) * H * 0.8)} ${_gdaN(Math.sin(a) * H * 0.5)}" stroke="#7a4a5a" stroke-width="1.6" fill="none"/>`; g += _gdaLeafStyle('frilly', Math.cos(a) * H * 0.5, -H * 0.6, 8, -90 + (i - 2) * 30, k.leaf); } if (o.stage >= 3) g += dots(8, w * 1.6, -H * 0.2, -H * 0.8, 2.6); else g += _gdaPetals(-4, -H * 0.6, 5, 0.5, 3, 2, k.c2 || '#f7f0f4', 0, true); break;
    case 'grape': g += `<path d="M-14 0V${_gdaN(-H)}M14 0V${_gdaN(-H)}M-16 ${_gdaN(-H * 0.6)}H16M-16 ${_gdaN(-H * 0.95)}H16" stroke="#a87c4f" stroke-width="1.6"/>` + _gdaStem(0, 0, -2, -H * 0.9, 4, '#7a5a3a', 2.4); for (let i = 0; i < 8; i++) g += _gdaLeafStyle('hand', (rnd() - 0.5) * 26, -H * (0.55 + rnd() * 0.4), 9, -90 + (rnd() - 0.5) * 120, k.leaf); if (o.stage >= 3) for (const bx of [-8, 7]) for (let j = 0; j < 6; j++) g += `<circle cx="${_gdaN(bx + (j % 3 - 1) * 2.6)}" cy="${_gdaN(-H * 0.55 + Math.floor(j / 3) * 3 + 2)}" r="2" fill="${berry}"/>`; break;
  }
  return s + `<g class="gda-sway">${g}</g>`;
}
function _gdaTree(def, o, p, k) {
  const fp = def.fp || 1, H = k.H * (o.heart != null ? 0.72 + o.heart * 0.08 : 1), rnd = gardenRand(def.id + '|' + Math.round(o.t * 20));
  const trunk = _gdaHex(p.kind === 'birch' ? (def.look.c || '#f1efe6') : def.cat === 'tree' && def.look.c && p.kind === 'oak' ? def.look.c : '#7a5236');
  const autumn = o.season === 'autumn', winter = o.season === 'winter', spring = o.season === 'spring';
  const deciduous = !['conifer', 'cone', 'olive', 'potted', 'banana', 'bonsai'].includes(p.kind) && def.id !== 'holly';
  let crown = k.leaf;
  if (autumn && deciduous) crown = def.id === 'maple' || def.id === 'japanese-maple' ? _gdaHex(def.look.c) : _GDA_AUTUMN[gardenHash(def.id) % _GDA_AUTUMN.length];
  const bare = winter && deciduous && p.kind !== 'weeping';
  const w = 26 * fp;
  let s = _gdaShadow(w * 0.9), g = '';
  const fruitOn = (o.ripe || (p.fruit && o.stage >= 4 && autumn)) && p.fruit;
  const bloomOn = o.stage >= 4 && (p.blossom || (p.fruit && spring && k.c2)) && !o.ripe;
  const blobs = (cx, cy, rx, ry, n, col) => { let t = ''; for (let i = 0; i < n; i++) { const a = i / n * 6.283, d = 0.55; t += `<ellipse cx="${_gdaN(cx + Math.cos(a) * rx * d)}" cy="${_gdaN(cy + Math.sin(a) * ry * d)}" rx="${_gdaN(rx * 0.55)}" ry="${_gdaN(ry * 0.55)}" fill="${i % 3 ? col : _gdaShade(col, 0.12)}"/>`; } return t + `<ellipse cx="${cx}" cy="${cy}" rx="${_gdaN(rx * 0.7)}" ry="${_gdaN(ry * 0.7)}" fill="${_gdaShade(col, -0.06)}"/>`; };
  const sprinkle = (cx, cy, rx, ry, n, col, r) => { let t = ''; for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.85; t += `<circle cx="${_gdaN(cx + Math.cos(a) * rx * d)}" cy="${_gdaN(cy + Math.sin(a) * ry * d)}" r="${r}" fill="${col}"/>`; } return t; };
  const branches = (cx, cy, len) => `<path d="M0 ${_gdaN(-H * 0.35)}L${_gdaN(-len)} ${_gdaN(cy - len * 0.3)}M0 ${_gdaN(-H * 0.45)}L${_gdaN(len)} ${_gdaN(cy - len * 0.4)}M0 ${_gdaN(-H * 0.5)}L${_gdaN(len * 0.2)} ${_gdaN(cy - len * 0.9)}M${_gdaN(-len * 0.5)} ${_gdaN(cy - len * 0.1)}L${_gdaN(-len * 0.8)} ${_gdaN(cy - len * 0.7)}" stroke="${trunk}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  const tw = Math.max(3, 5 * fp * (H / 120)) * (p.kind === 'oak' ? 1.5 : 1);
  switch (p.kind) {
    case 'oak': case 'round': case 'tall': case 'fig': case 'lace': case 'bush': {
      const cy = -H * (p.kind === 'tall' ? 0.62 : 0.6), rx = (p.kind === 'tall' ? 0.55 : p.kind === 'bush' ? 0.95 : 0.85) * w * (p.kind === 'oak' ? 1.3 + (o.heart || 0) * 0.04 : 1), ry = H * (p.kind === 'tall' ? 0.4 : 0.36);
      g += `<path d="M${_gdaN(-tw)} 0Q${_gdaN(-tw * 0.6)} ${_gdaN(-H * 0.3)} ${_gdaN(-tw * 0.5)} ${_gdaN(-H * 0.5)}L${_gdaN(tw * 0.5)} ${_gdaN(-H * 0.5)}Q${_gdaN(tw * 0.6)} ${_gdaN(-H * 0.3)} ${_gdaN(tw)} 0Z" fill="${trunk}"/>`;
      if (bare) g += branches(0, cy, rx * 0.8) + (o.season === 'winter' && o.size !== 's' ? `<path d="M${_gdaN(-rx * 0.6)} ${_gdaN(cy - rx * 0.2)}l8 -2M${_gdaN(rx * 0.3)} ${_gdaN(cy - rx * 0.5)}l7 -1" stroke="#ffffff" stroke-width="1.6" opacity="0.8"/>` : '');
      else {
        g += `<g class="gda-sway">` + blobs(0, cy, rx, ry, p.kind === 'lace' ? 9 : 7, crown);
        if (p.kind === 'lace') g += sprinkle(0, cy, rx, ry, 18, _gdaShade(crown, 0.25), 1.6);
        if (bloomOn) g += sprinkle(0, cy, rx, ry, 26, _gdaHex(def.look.c2 || def.look.c), 2.4);
        if (fruitOn) g += sprinkle(0, cy + ry * 0.1, rx * 0.9, ry * 0.8, p.kind === 'fig' ? 6 : 10, _gdaHex(def.look.c), p.kind === 'bush' ? 2.4 : 4);
        if (p.kind === 'oak' && o.heart >= 3) g += sprinkle(0, cy + ry * 0.2, rx * 0.8, ry * 0.6, 6, '#a8743a', 1.8);
        g += '</g>';
      }
      if (p.kind === 'oak' && o.heart >= 5) g += `<ellipse cx="${_gdaN(-tw * 0.1)}" cy="${_gdaN(-H * 0.22)}" rx="2.2" ry="3.4" fill="#3a2a1e"/>`;
      break;
    }
    case 'birch': {
      g += `<rect x="-3" y="${_gdaN(-H * 0.9)}" width="6" height="${_gdaN(H * 0.9)}" fill="${trunk}"/>` + [0.2, 0.4, 0.55, 0.7].map(t => `<rect x="-3" y="${_gdaN(-H * t)}" width="${3 + (t * 10) % 3}" height="1.6" fill="#3a3a3a"/>`).join('');
      if (!bare) { g += '<g class="gda-sway">'; for (let i = 0; i < 7; i++) g += `<ellipse cx="${_gdaN((i / 6 - 0.5) * w * 1.1 + (rnd() - 0.5) * 6)}" cy="${_gdaN(-H * (0.6 + rnd() * 0.32))}" rx="${_gdaN(w * 0.42)}" ry="${_gdaN(H * 0.13)}" fill="${i % 2 ? crown : _gdaShade(crown, 0.12)}"/>`; g += '</g>'; } else g += branches(0, -H * 0.7, w * 0.4);
      break;
    }
    case 'weeping': {
      g += `<path d="M-5 0Q-3 ${_gdaN(-H * 0.5)} 0 ${_gdaN(-H * 0.75)}Q3 ${_gdaN(-H * 0.5)} 5 0Z" fill="${trunk}"/><g class="gda-sway">` + `<ellipse cx="0" cy="${_gdaN(-H * 0.78)}" rx="${_gdaN(w * 0.8)}" ry="${_gdaN(H * 0.22)}" fill="${_gdaShade(crown, -0.08)}"/>`;
      for (let i = 0; i < 16; i++) { const x = (i / 15 - 0.5) * w * 1.7, len = H * (0.45 + rnd() * 0.25); g += `<path d="M${_gdaN(x * 0.7)} ${_gdaN(-H * 0.8)}Q${_gdaN(x)} ${_gdaN(-H * 0.8)} ${_gdaN(x * 1.05)} ${_gdaN(-H * 0.8 + len)}" stroke="${i % 2 ? crown : _gdaShade(crown, 0.18)}" stroke-width="3" fill="none" stroke-linecap="round"/>`; }
      g += '</g>';
      break;
    }
    case 'cone': case 'conifer': {
      g += `<rect x="-3" y="-10" width="6" height="10" fill="${trunk}"/>`;
      const tiers = p.kind === 'conifer' ? 4 : 3;
      for (let i = 0; i < tiers; i++) { const yb = -8 - i * H * 0.22, ww = w * (0.85 - i * 0.18); g += `<path d="M${_gdaN(-ww)} ${_gdaN(yb)}L0 ${_gdaN(yb - H * 0.38)}L${_gdaN(ww)} ${_gdaN(yb)}Z" fill="${i % 2 ? crown : _gdaShade(crown, 0.1)}"/>`; }
      if (fruitOn || (def.id === 'holly' && o.stage >= 4)) g += sprinkle(0, -H * 0.45, w * 0.5, H * 0.3, 8, _gdaHex(def.look.c), 2.2);
      if (def.id === 'fir' && (o.season === 'winter')) g += sprinkle(0, -H * 0.45, w * 0.5, H * 0.32, 10, '#ffd36a', 1.8).replace(/<circle /g, '<circle class="gda-glow" ');
      if (winter) g += `<path d="M${_gdaN(-w * 0.5)} ${_gdaN(-H * 0.3)}h${_gdaN(w * 0.3)}M${_gdaN(w * 0.1)} ${_gdaN(-H * 0.55)}h${_gdaN(w * 0.25)}" stroke="#ffffff" stroke-width="2" opacity="0.85"/>`;
      break;
    }
    case 'olive': g += `<path d="M-4 0Q-8 ${_gdaN(-H * 0.3)} -2 ${_gdaN(-H * 0.5)}Q4 ${_gdaN(-H * 0.3)} 4 0Z" fill="#6f5a46"/><g class="gda-sway">` + blobs(0, -H * 0.62, w * 0.75, H * 0.3, 7, _gdaHex(def.look.leaf)) + (o.ripe ? sprinkle(0, -H * 0.6, w * 0.6, H * 0.22, 9, _gdaHex(def.look.c), 1.8) : '') + '</g>'; break;
    case 'potted': g += `<path d="M-11 0L-13 -14H13L11 0Z" fill="#c8693a"/><rect x="-14" y="-17" width="28" height="4" rx="1" fill="#d97b4a"/><rect x="-1.6" y="${_gdaN(-H * 0.55)}" width="3.2" height="${_gdaN(H * 0.4)}" fill="#7a5236"/><g class="gda-sway">` + blobs(0, -H * 0.7, w * 0.45, H * 0.22, 6, crown) + (o.stage >= 3 ? sprinkle(0, -H * 0.68, w * 0.4, H * 0.18, o.ripe ? 6 : 3, o.ripe ? _gdaHex(def.look.c) : '#ffffff', 2.4) : '') + '</g>'; break;
    case 'bonsai': g += `<rect x="-16" y="-8" width="32" height="8" rx="2" fill="#3f5a6a"/><path d="M-2 -8Q-10 -20 0 -26Q10 -32 4 -38" stroke="#5a3a2a" stroke-width="4" fill="none" stroke-linecap="round"/><g class="gda-sway">` + blobs(-9, -30, 10, 6, 5, crown) + blobs(8, -42, 11, 6, 5, _gdaShade(crown, 0.08)) + '</g>'; break;
    case 'banana': g += `<path d="M-3 0L-2 ${_gdaN(-H * 0.6)}L2 ${_gdaN(-H * 0.6)}L3 0Z" fill="#8a9a5a"/><g class="gda-sway">`; for (let i = 0; i < 6; i++) { const ang = -165 + i * 30; g += _gdaLeaf(0, -H * 0.6, H * 0.5, ang, H * 0.1, i % 2 ? crown : _gdaShade(crown, 0.15)); } if (o.stage >= 3) g += [0, 1, 2, 3, 4].map(j => `<path d="M${2 + j * 1.5} ${_gdaN(-H * 0.5 + j * 2)}q5 1 7 -4" stroke="${o.ripe ? _gdaHex(def.look.c) : '#9fc35a'}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`).join(''); g += '</g>'; break;
  }
  return s + g;
}
function _gdaSucc(def, o, p, k) {
  const H = k.H, rnd = gardenRand(def.id + '|' + Math.round(o.t * 20)), flower = o.stage >= 4 && k.c;
  const pot = def.cat === 'succulent' ? `<path d="M-12 0L-14 -12H14L12 0Z" fill="#c8693a"/><rect x="-15" y="-15" width="30" height="4" rx="1" fill="#d97b4a"/><ellipse cx="0" cy="-14" rx="12" ry="2.4" fill="#6f4a2e"/>` : '';
  let s = _gdaShadow(14) + pot, g = '';
  const base = pot ? -14 : 0;
  switch (p.kind) {
    case 'aloe': for (let i = 0; i < 8; i++) { const ang = -160 + i * 20; g += _gdaLeaf(0, base, H * 0.75 * (0.7 + (i % 3) * 0.15), ang, 3.4, i % 2 ? k.leaf : _gdaShade(k.leaf, 0.15)); } if (flower) g += _gdaStem(2, base, 4, base - H * 1.2, 2, '#7a9a5a', 1.4) + [0, 1, 2, 3, 4].map(j => `<ellipse cx="${4 + (j % 2 ? 1.5 : -1.5)}" cy="${_gdaN(base - H * 1.2 + j * 3)}" rx="1.4" ry="2.8" fill="${k.c}"/>`).join(''); break;
    case 'rosette': case 'spiky': for (let ring = 0; ring < 3; ring++) { const n = 8 - ring * 2, r = 11 - ring * 3.2; for (let i = 0; i < n; i++) { const a = -90 + (i - (n - 1) / 2) * (150 / n); g += p.kind === 'spiky' ? _gdaLeaf(0, base - ring * 2, r + 4, a, 1.6, _gdaShade(k.leaf, ring * 0.1)) + (k.c && ring === 0 ? `<circle cx="${_gdaN(Math.cos(a * Math.PI / 180) * (r + 1))}" cy="${_gdaN(base + Math.sin(a * Math.PI / 180) * (r + 1))}" r="0.7" fill="${k.c}"/>` : '') : _gdaLeaf(0, base - ring * 2, r, a, r * 0.32, _gdaShade(k.leaf, ring * 0.12)) + (k.c && ring === 0 ? `<circle cx="${_gdaN(Math.cos(a * Math.PI / 180) * r)}" cy="${_gdaN(base + Math.sin(a * Math.PI / 180) * r)}" r="1.2" fill="${k.c}"/>` : ''); } } break;
    case 'jade': g += `<path d="M0 ${base}V${_gdaN(base - H * 0.5)}M0 ${_gdaN(base - H * 0.3)}L-8 ${_gdaN(base - H * 0.6)}M0 ${_gdaN(base - H * 0.4)}L8 ${_gdaN(base - H * 0.7)}" stroke="#7a6a4a" stroke-width="2.4" fill="none"/>`; for (let i = 0; i < 12; i++) g += `<ellipse cx="${_gdaN((rnd() - 0.5) * 22)}" cy="${_gdaN(base - H * (0.4 + rnd() * 0.45))}" rx="3.6" ry="2.4" fill="${i % 2 ? k.leaf : _gdaShade(k.leaf, 0.15)}"/>`; if (flower) g += _gdaSprinkle3(rnd, 0, base - H * 0.85, 10, 4, 5, k.c); break;
    case 'barrel': g += `<ellipse cx="0" cy="${_gdaN(base - H * 0.42)}" rx="${_gdaN(H * 0.5)}" ry="${_gdaN(H * 0.45)}" fill="${k.leaf}"/>` + [-2, -1, 0, 1, 2].map(i => `<path d="M${_gdaN(i * H * 0.17)} ${_gdaN(base - 2)}Q${_gdaN(i * H * 0.24)} ${_gdaN(base - H * 0.42)} ${_gdaN(i * H * 0.17)} ${_gdaN(base - H * 0.84)}" stroke="${_gdaShade(k.leaf, -0.2)}" stroke-width="1.2" fill="none"/>`).join('') + (flower ? _gdaPetals(0, base - H * 0.86, 6, 1, 4, 2.2, k.c, 0) : ''); break;
    case 'pads': { const pad = (x, y, r, a) => `<ellipse cx="${_gdaN(x)}" cy="${_gdaN(y)}" rx="${_gdaN(r * 0.75)}" ry="${_gdaN(r)}" transform="rotate(${a} ${_gdaN(x)} ${_gdaN(y)})" fill="${k.leaf}" stroke="${_gdaShade(k.leaf, -0.2)}" stroke-width="0.8"/>`; g += pad(0, base - H * 0.3, H * 0.3, 0) + pad(-H * 0.25, base - H * 0.6, H * 0.22, -25) + pad(H * 0.22, base - H * 0.65, H * 0.22, 25); if (flower) g += `<ellipse cx="${_gdaN(-H * 0.25)}" cy="${_gdaN(base - H * 0.85)}" rx="2.6" ry="3.4" fill="${o.ripe ? _gdaHex(def.look.c2 || def.look.c) : k.c}"/><ellipse cx="${_gdaN(H * 0.24)}" cy="${_gdaN(base - H * 0.88)}" rx="2.6" ry="3.4" fill="${o.ripe ? _gdaHex(def.look.c2 || def.look.c) : k.c}"/>`; break; }
    case 'saguaro': g += `<rect x="-6" y="${_gdaN(base - H)}" width="12" height="${_gdaN(H)}" rx="6" fill="${k.leaf}"/><path d="M-6 ${_gdaN(base - H * 0.4)}H-14V${_gdaN(base - H * 0.75)}" stroke="${k.leaf}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 ${_gdaN(base - H * 0.55)}H13V${_gdaN(base - H * 0.85)}" stroke="${k.leaf}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + (flower ? `<circle cx="0" cy="${_gdaN(base - H)}" r="3" fill="${k.c}"/><circle cx="-14" cy="${_gdaN(base - H * 0.75 - 3)}" r="2.4" fill="${k.c}"/>` : ''); break;
    case 'trailing': for (let i = 0; i < 6; i++) { const x = (i - 2.5) * 4.5, len = 10 + rnd() * H * 0.5; for (let j = 0; j < 7; j++) g += `<circle cx="${_gdaN(x + Math.sin(j * 0.8) * 2 + (x > 0 ? j * 0.8 : -j * 0.8))}" cy="${_gdaN(base - 2 + j * len / 7)}" r="2" fill="${j % 2 ? k.leaf : _gdaShade(k.leaf, 0.15)}"/>`; } break;
  }
  return s + `<g class="gda-sway">${g}</g>`;
}
function _gdaSprinkle3(rnd, cx, cy, rx, ry, n, col) { let t = ''; for (let i = 0; i < n; i++) t += _gdaStar(cx + (rnd() - 0.5) * rx * 2, cy + (rnd() - 0.5) * ry * 2, 5, 2.4, 1, col, -90); return t; }
function _gdaPond(def, o, p, k) {
  const H = k.H, rnd = gardenRand(def.id + '|' + Math.round(o.t * 20));
  let g = '';
  switch (p.kind) {
    case 'pad': g += `<g class="gda-bob"><path d="M-14 -3a14 6 0 1 0 28 0a14 6 0 1 0 -28 0zM0 -3l12 -2" fill="${k.leaf}" stroke="${_gdaShade(k.leaf, -0.2)}" stroke-width="0.8"/><path d="M-22 -1a8 3.4 0 1 0 16 0a8 3.4 0 1 0 -16 0z" fill="${_gdaShade(k.leaf, 0.12)}"/>` + (o.stage >= 4 ? _gdaPetals(2, -7, 8, 1, 6, 2.6, k.c, -90) + _gdaPetals(2, -8, 5, 0.5, 4, 2, _gdaShade(k.c, 0.25), -60) + `<circle cx="2" cy="-8" r="1.8" fill="${k.c2 || '#f6c445'}"/>` : o.stage >= 3 ? `<ellipse cx="3" cy="-8" rx="2.6" ry="4" fill="${_gdaMix(k.c, k.leaf, 0.5)}"/>` : '') + '</g>'; break;
    case 'lotus': g += `<path d="M-16 -2a12 4 0 1 0 24 0a12 4 0 1 0 -24 0z" fill="${k.leaf}"/>` + _gdaStem(4, -2, 5, -H, 2, '#5a8f5a', 1.6) + (o.stage >= 4 ? `<g transform="translate(5 ${_gdaN(-H)})">` + _gdaPetals(0, 0, 7, 0, 10, 3.2, k.c, -180) + _gdaPetals(0, -2, 5, 0, 8, 2.8, _gdaShade(k.c, 0.25), -160) + `<circle cx="0" cy="-2" r="2.6" fill="${k.c2 || '#f6c445'}"/></g>` : `<ellipse cx="5" cy="${_gdaN(-H)}" rx="3.6" ry="5.4" fill="${_gdaMix(k.c, k.leaf, 0.4)}"/>`); break;
    case 'reed': for (let i = 0; i < 9; i++) { const x = (i - 4) * 2.4, top = -H * (0.7 + rnd() * 0.3); g += `<path d="M${_gdaN(x)} 0Q${_gdaN(x + (rnd() - 0.5) * 6)} ${_gdaN(top * 0.5)} ${_gdaN(x + (i - 4) * 0.8)} ${_gdaN(top)}" stroke="${i % 2 ? k.leaf : _gdaShade(k.leaf, 0.15)}" stroke-width="1.6" fill="none"/>`; if (o.stage >= 4 && i % 3 === 1) g += `<rect x="${_gdaN(x - 2.2)}" y="${_gdaN(top * 0.75 - 9)}" width="4.4" height="12" rx="2.2" fill="${k.c}"/>`; } break;
    case 'papyrus': for (let i = 0; i < 5; i++) { const x = (i - 2) * 4, top = -H * (0.75 + rnd() * 0.25); g += `<line x1="${_gdaN(x * 0.4)}" y1="0" x2="${_gdaN(x)}" y2="${_gdaN(top)}" stroke="${_gdaShade(k.leaf, -0.15)}" stroke-width="1.4"/>`; for (let j = 0; j < 12; j++) { const a = (-180 + j * 15) * Math.PI / 180; g += `<line x1="${_gdaN(x)}" y1="${_gdaN(top)}" x2="${_gdaN(x + Math.cos(a) * 9)}" y2="${_gdaN(top + Math.sin(a) * 7)}" stroke="${k.leaf}" stroke-width="0.9"/>`; } } break;
  }
  return `<g class="gda-sway">${g}</g>`;
}
function _gdaOdd(def, o, p, k) {
  const H = k.H;
  let s = _gdaShadow(12), g = '';
  switch (p.kind) {
    case 'flytrap': for (let i = 0; i < 5; i++) { const ang = -160 + i * 35, a = ang * Math.PI / 180, x = Math.cos(a) * 12, y = Math.sin(a) * 10 - 3; g += _gdaStem(0, -1, x, y, 0, k.leaf, 1.6) + `<g transform="translate(${_gdaN(x)} ${_gdaN(y)}) rotate(${ang + 90})"><path d="M-5 0a5 4 0 0 1 10 0z" fill="${k.c}"/><path d="M-5 0a5 4 0 0 0 10 0z" fill="${_gdaShade(k.leaf, 0.1)}"/>${[-4, -2, 0, 2, 4].map(j => `<line x1="${j}" y1="-3" x2="${j * 1.2}" y2="-5.5" stroke="${k.leaf}" stroke-width="0.7"/>`).join('')}</g>`; } break;
    case 'pitcher': for (let i = 0; i < 3; i++) { const x = (i - 1) * 9, h = H * (0.6 + i * 0.15); g += `<path d="M${x - 4} -1Q${x - 6} ${_gdaN(-h * 0.6)} ${x - 3} ${_gdaN(-h)}H${x + 3}Q${x + 6} ${_gdaN(-h * 0.6)} ${x + 4} -1Z" fill="${i % 2 ? k.c : _gdaMix(k.c, k.c2 || k.leaf, 0.4)}"/><ellipse cx="${x}" cy="${_gdaN(-h)}" rx="3.6" ry="1.4" fill="${_gdaShade(k.c, -0.35)}"/><path d="M${x - 1} ${_gdaN(-h - 1)}q4 -5 6 -1z" fill="${_gdaShade(k.c, 0.15)}"/>`; } g += _gdaLeaf(0, -1, 12, -170, 3, k.leaf) + _gdaLeaf(0, -1, 12, -10, 3, k.leaf); break;
    case 'mushroom': for (let i = 0; i < 5; i++) { const x = (i - 2) * 6.5, h = 5 + (i % 3) * 3.2; g += `<rect x="${x - 1.4}" y="${-h}" width="2.8" height="${h}" fill="${k.c2 || '#f4f0e6'}"/><path d="M${x - 5} ${-h}a5 4.4 0 0 1 10 0z" fill="${k.c}"/>${o.tod === 'night' || o.tod === 'dusk' ? `<circle class="gda-glow" cx="${x}" cy="${-h - 2}" r="6" fill="${k.c}" opacity="0.3"/>` : ''}`; } break;
    case 'titan': g += _gdaLeaf(0, -2, 22, -165, 8, k.leaf) + _gdaLeaf(0, -2, 22, -15, 8, _gdaShade(k.leaf, 0.12)); if (o.stage >= 4) g += `<path d="M-14 -4Q-18 ${_gdaN(-H * 0.4)} -4 ${_gdaN(-H * 0.45)}L0 ${_gdaN(-H * 0.4)}L4 ${_gdaN(-H * 0.45)}Q18 ${_gdaN(-H * 0.4)} 14 -4Z" fill="${k.c}"/><path d="M-4 ${_gdaN(-H * 0.3)}Q0 ${_gdaN(-H * 1.1)} 4 ${_gdaN(-H * 0.3)}Z" fill="${k.c2 || '#e6d36a'}"/>`; else g += `<path d="M-6 -2Q0 ${_gdaN(-H * 0.7)} 6 -2Z" fill="${_gdaMix(k.c, k.leaf, 0.5)}"/>`; break;
  }
  return s + `<g class="gda-sway">${g}</g>`;
}

/* ---------- decorations ---------- */
function _gdaDecor(def, o) {
  const c = _gdaHex(def.look.c), c2 = _gdaHex(def.look.c2 || def.look.c), w = 32 * (def.w || 1), H = 64 * (def.look.h || 0.6), r = o.r || 0, v = o.v || o.variant || 0;
  const side = r % 2 === 1;   // fences: front to back
  const dk = _gdaShade(c, -0.25), lt = _gdaShade(c, 0.25);
  const S = _gdaShadow(w * 0.8);
  switch (def.id) {
    case 'stepping-stones': return `<ellipse cx="-12" cy="-12" rx="9" ry="5" fill="${c}"/><ellipse cx="10" cy="-6" rx="10" ry="5.6" fill="${_gdaShade(c, 0.08)}"/><ellipse cx="-4" cy="-23" rx="7" ry="4" fill="${c2}"/>`;
    case 'gravel-path': { let t = `<rect x="-32" y="-30" width="64" height="30" fill="${c}"/>`; const rnd = gardenRand('gravel' + o.t); for (let i = 0; i < 28; i++) t += `<circle cx="${_gdaN(-30 + rnd() * 60)}" cy="${_gdaN(-28 + rnd() * 26)}" r="${_gdaN(0.8 + rnd())}" fill="${i % 2 ? c2 : _gdaShade(c, 0.15)}"/>`; return t; }
    case 'brick-path': { let t = `<rect x="-32" y="-30" width="64" height="30" fill="${dk}"/>`; for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) t += v % 2 ? `<rect x="${-32 + x * 13 + (y % 2) * 6}" y="${-30 + y * 7.5}" width="12" height="6.5" rx="1" fill="${(x + y) % 3 ? c : c2}"/>` : `<rect x="${-32 + x * 13}" y="${-30 + y * 7.5}" width="${y % 2 ? 6 : 12}" height="6.5" rx="1" fill="${(x + y) % 3 ? c : c2}"/><rect x="${-25 + x * 13}" y="${-30 + y * 7.5}" width="5.5" height="${y % 2 ? 6.5 : 0}" fill="${c}"/>`; return t; }
    case 'flagstones': return `<rect x="-32" y="-30" width="64" height="30" fill="${c2}"/><path d="M-31 -29h30v13h-30zM1 -29h30v9h-30zM-31 -14h22v13h-22zM-7 -14h38v13h-38zM1 -18h30v2h-30z" fill="${c}" stroke="${c2}" stroke-width="1.2"/>`;
    case 'moss-stones': return `<rect x="-32" y="-30" width="64" height="30" fill="${_gdaShade(c2, -0.1)}"/><ellipse cx="-14" cy="-20" rx="12" ry="6.4" fill="${c}"/><ellipse cx="12" cy="-9" rx="13" ry="6.6" fill="${c}"/><circle cx="-6" cy="-15" r="3" fill="${c2}"/><circle cx="20" cy="-14" r="2.6" fill="${c2}"/>`;
    case 'boardwalk': return side ? `<rect x="-18" y="-30" width="36" height="30" fill="${dk}"/>${[0, 1, 2, 3].map(i => `<rect x="-18" y="${-29 + i * 7.4}" width="36" height="6.4" fill="${i % 2 ? c : lt}"/>`).join('')}` : `<rect x="-32" y="-26" width="64" height="22" fill="${dk}"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${-31.5 + i * 8}" y="-26" width="7" height="22" fill="${i % 2 ? c : lt}"/>`).join('')}`;
    case 'mosaic-path': { const cols = [c, c2, '#f4f1ea', ['#e04a3a', '#3f8f5a', '#9b7fd1'][v % 3]]; let t = `<rect x="-32" y="-30" width="64" height="30" fill="#e8e1d4"/>`; for (let y = 0; y < 5; y++) for (let x = 0; x < 10; x++) t += `<rect x="${-31 + x * 6.3}" y="${-29 + y * 5.8}" width="5.4" height="5" fill="${cols[(x * 7 + y * 3 + Math.abs(x - 5) * Math.abs(y - 2)) % 4]}"/>`; return t; }
    case 'picket-fence': { const col = [c, '#9fc3e0', '#a9c4a0'][v % 3]; return side ? `<rect x="-2" y="${_gdaN(-H)}" width="4" height="${_gdaN(H)}" fill="${_gdaShade(col, -0.1)}"/>${[-22, -12, -2].map(y => `<path d="M-1.5 ${y}h3v-${_gdaN(H * 0.6)}l-1.5 -3l-1.5 3z" fill="${col}" transform="translate(0 ${y + 20})"/>`).join('')}` : `<rect x="-32" y="${_gdaN(-H * 0.7)}" width="64" height="3" fill="${_gdaShade(col, -0.15)}"/><rect x="-32" y="${_gdaN(-H * 0.32)}" width="64" height="3" fill="${_gdaShade(col, -0.15)}"/>${[-28, -18, -8, 2, 12, 22].map(x => `<path d="M${x} 0v-${_gdaN(H - 4)}l3 -4l3 4v${_gdaN(H - 4)}z" fill="${col}"/>`).join('')}`; }
    case 'wattle-fence': return side ? `<rect x="-5" y="${_gdaN(-H)}" width="10" height="${_gdaN(H)}" rx="3" fill="${c}"/>${[0, 1, 2, 3, 4].map(i => `<path d="M-5 ${_gdaN(-H + i * H / 5 + 3)}q5 -3 10 0" stroke="${dk}" stroke-width="1.4" fill="none"/>`).join('')}` : `<rect x="-32" y="${_gdaN(-H)}" width="64" height="${_gdaN(H)}" rx="3" fill="${c}"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M-32 ${_gdaN(-H + i * H / 6 + 4)}q8 -4 16 0t16 0t16 0t16 0" stroke="${i % 2 ? dk : lt}" stroke-width="2.2" fill="none"/>`).join('')}${[-30, -10, 10, 30].map(x => `<rect x="${x - 1.2}" y="${_gdaN(-H - 3)}" width="2.4" height="${_gdaN(H + 3)}" fill="${dk}"/>`).join('')}`;
    case 'box-hedge': return S + (side ? `<rect x="-11" y="${_gdaN(-H)}" width="22" height="${_gdaN(H)}" rx="5" fill="${c}"/>` : `<rect x="-32" y="${_gdaN(-H)}" width="64" height="${_gdaN(H)}" rx="6" fill="${c}"/>`) + `<rect x="${side ? -11 : -32}" y="${_gdaN(-H)}" width="${side ? 22 : 64}" height="6" rx="4" fill="${lt}"/>` + (o.size === 's' ? '' : [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${(side ? -6 : -26) + (i % 3) * (side ? 6 : 22)}" cy="${_gdaN(-H * 0.3 - (i > 2 ? H * 0.35 : 0))}" r="2" fill="${dk}"/>`).join(''));
    case 'stone-wall': { let t = ''; const ww = side ? 20 : 64; for (let y = 0; y < 3; y++) for (let x = 0; x < (side ? 2 : 6); x++) t += `<ellipse cx="${_gdaN(-ww / 2 + 5 + x * 11 + (y % 2) * 5)}" cy="${_gdaN(-5 - y * (H / 3.2))}" rx="6.4" ry="${_gdaN(H / 6.5)}" fill="${(x + y) % 2 ? c : c2}"/>`; return `<rect x="${-ww / 2}" y="${_gdaN(-H)}" width="${ww}" height="${_gdaN(H)}" fill="${dk}"/>` + t + `<rect x="${-ww / 2}" y="${_gdaN(-H - 3)}" width="${ww}" height="5" rx="2" fill="${lt}"/>`; }
    case 'iron-railings': return side ? `<rect x="-1.2" y="${_gdaN(-H)}" width="2.4" height="${_gdaN(H)}" fill="${c}"/><path d="M0 ${_gdaN(-H - 6)}l3 6h-6z" fill="${c}"/>` : `<rect x="-32" y="${_gdaN(-H * 0.85)}" width="64" height="2.4" fill="${c}"/><rect x="-32" y="-6" width="64" height="2.4" fill="${c}"/>${[-28, -20, -12, -4, 4, 12, 20, 28].map(x => `<rect x="${x - 0.9}" y="${_gdaN(-H)}" width="1.8" height="${_gdaN(H)}" fill="${c}"/><path d="M${x} ${_gdaN(-H - 5)}l2.6 5h-5.2z" fill="${c2}"/>`).join('')}<path d="M-24 ${_gdaN(-H * 0.6)}q4 -6 8 0t8 0t8 0t8 0t8 0t8 0" stroke="${c}" stroke-width="1.4" fill="none"/>`;
    case 'bamboo-screen': return (side ? [-6, 0, 6] : [-28, -21, -14, -7, 0, 7, 14, 21, 28]).map((x, i) => `<rect x="${x - 3}" y="${_gdaN(-H - (i % 2) * 3)}" width="6" height="${_gdaN(H + (i % 2) * 3)}" rx="2" fill="${i % 2 ? c : lt}"/>${[0.3, 0.65].map(t => `<rect x="${x - 3}" y="${_gdaN(-H * t)}" width="6" height="1.4" fill="${dk}"/>`).join('')}`).join('');
    case 'bench': case 'stone-bench': {
      const col = def.id === 'bench' ? [c, '#3f6f5a', '#5a7f9a'][v % 3] : c, d = _gdaShade(col, -0.25);
      return S + (def.id === 'stone-bench'
        ? `<rect x="-50" y="-26" width="100" height="10" rx="3" fill="${col}"/><rect x="-44" y="-17" width="12" height="17" fill="${d}"/><rect x="32" y="-17" width="12" height="17" fill="${d}"/><rect x="-50" y="-27" width="100" height="3" rx="1.5" fill="${_gdaShade(col, 0.2)}"/>`
        : `<rect x="-48" y="-46" width="96" height="16" rx="3" fill="${col}"/>${[0, 1, 2].map(i => `<rect x="-46" y="${-44 + i * 5}" width="92" height="3.2" rx="1" fill="${_gdaShade(col, i % 2 ? 0.12 : -0.05)}"/>`).join('')}<rect x="-50" y="-26" width="100" height="6" rx="2" fill="${col}"/><rect x="-46" y="-21" width="5" height="21" fill="${d}"/><rect x="41" y="-21" width="5" height="21" fill="${d}"/><rect x="-50" y="-36" width="5" height="12" fill="${d}"/><rect x="45" y="-36" width="5" height="12" fill="${d}"/>`);
    }
    case 'swing-seat': return S + `<path d="M-52 0L-44 -82H44L52 0" stroke="${c2}" stroke-width="4" fill="none"/><rect x="-48" y="-86" width="96" height="6" rx="2" fill="${_gdaShade(c2, -0.2)}"/><g class="gda-bob"><line x1="-32" y1="-80" x2="-32" y2="-36" stroke="#8a8a8a" stroke-width="1.2"/><line x1="32" y1="-80" x2="32" y2="-36" stroke="#8a8a8a" stroke-width="1.2"/><rect x="-36" y="-40" width="72" height="22" rx="6" fill="${c}"/><rect x="-36" y="-26" width="72" height="8" rx="3" fill="${c2}"/></g>`;
    case 'hammock': { const col = [c, '#7fb3d8', '#9fc35a'][v % 3]; return S + `<path d="M-50 0V-52M50 0V-52" stroke="#7a5636" stroke-width="5"/><path d="M-50 -48Q0 -10 50 -48" stroke="${col}" stroke-width="10" fill="none"/>${[-30, -10, 10, 30].map(x => `<path d="M${x} ${_gdaN(-48 + 38 * (1 - (x / 50) ** 2) - 4)}v6" stroke="${c2}" stroke-width="2"/>`).join('')}`; }
    case 'deckchair': { const col = [c, '#3a6fc4', '#f2b33a', '#3f8f5a'][v % 4]; return S + `<path d="M-14 0L4 -40M14 0L-6 -24" stroke="#a87c4f" stroke-width="3"/><path d="M-12 -4L2 -38L10 -36L-2 -2Z" fill="${col}"/>${[0, 1, 2].map(i => `<path d="M${-9 + i * 3} ${-8 - i * 9}l7 2" stroke="${c2}" stroke-width="2.4"/>`).join('')}`; }
    case 'picnic-blanket': { const col = [c, '#3a6fc4', '#3f8f5a'][v % 3]; let t = `<path d="M-56 -4L-46 -26H46L56 -4Z" fill="${c2}"/>`; for (let i = 0; i < 7; i++) t += `<path d="M${-52 + i * 15} -4L${-43 + i * 13} -26h6L${-46 + i * 15} -4Z" fill="${col}" opacity="0.8"/>`; return t + `<path d="M-54 -10H54M-50 -18H50" stroke="${col}" stroke-width="3" opacity="0.7"/><rect x="18" y="-26" width="16" height="10" rx="2" fill="#c9a26a"/><circle cx="-20" cy="-16" r="4" fill="#d83a3a"/>`; }
    case 'bistro-set': { const col = [c, '#3f8f5a', '#d83a3a'][v % 3]; return S + `<ellipse cx="0" cy="-38" rx="16" ry="5" fill="${col}"/><rect x="-1.4" y="-38" width="2.8" height="38" fill="${c2}"/><path d="M-10 0h20" stroke="${c2}" stroke-width="2"/>${[-40, 40].map(x => `<rect x="${x - 9}" y="-26" width="18" height="4" rx="2" fill="${col}"/><rect x="${x + (x < 0 ? -9 : 7)}" y="-48" width="3" height="24" fill="${col}"/><path d="M${x - 7} 0V-22M${x + 7} 0V-22" stroke="${c2}" stroke-width="2"/>`).join('')}<circle cx="-4" cy="-44" r="3" fill="#f4f1ea"/><rect x="3" y="-47" width="4" height="6" fill="#f4f1ea"/>`; }
    case 'bird-bath': return S + `<path d="M-10 0h20l-4 -8h-12z" fill="${dk}"/><rect x="-4" y="-34" width="8" height="27" fill="${c}"/><ellipse cx="0" cy="-36" rx="20" ry="6" fill="${lt}"/><ellipse cx="0" cy="-37" rx="16" ry="4" fill="${c2}" class="gda-ripple"/>`;
    case 'fountain': return S + `<ellipse cx="0" cy="-8" rx="58" ry="16" fill="${dk}"/><ellipse cx="0" cy="-12" rx="52" ry="13" fill="${c2}" class="gda-ripple"/><rect x="-6" y="-60" width="12" height="50" fill="${c}"/><ellipse cx="0" cy="-58" rx="26" ry="7" fill="${c}"/><ellipse cx="0" cy="-59" rx="22" ry="5" fill="${c2}"/><rect x="-3" y="-84" width="6" height="26" fill="${c}"/><ellipse cx="0" cy="-84" rx="12" ry="4" fill="${c}"/><path class="gda-ripple" d="M0 -90q-10 6 -20 30M0 -90q10 6 20 30M-18 -58q-12 10 -24 44M18 -58q12 10 24 44" stroke="${_gdaShade(c2, 0.4)}" stroke-width="1.6" fill="none" opacity="0.8"/>`;
    case 'water-pump': return S + `<rect x="-6" y="-56" width="12" height="56" rx="2" fill="${c}"/><path d="M6 -40h14v6" stroke="${c}" stroke-width="5" fill="none"/><path d="M-6 -50l-18 -8" stroke="${c2}" stroke-width="3" stroke-linecap="round"/><ellipse cx="0" cy="-57" rx="8" ry="3" fill="${_gdaShade(c, 0.15)}"/><rect x="12" y="-10" width="16" height="10" fill="#a87c4f"/>`;
    case 'water-butt': return S + `<rect x="-16" y="-50" width="32" height="50" rx="4" fill="${c}"/><rect x="-16" y="-50" width="32" height="6" rx="3" fill="${_gdaShade(c, 0.15)}"/><path d="M-16 -32h32M-16 -14h32" stroke="${c2}" stroke-width="2"/><rect x="12" y="-14" width="8" height="3" fill="#8a8a8a"/><path d="M0 -50V-70" stroke="#6a6a6a" stroke-width="4"/>`;
    case 'sprinkler': return `<rect x="-2" y="-14" width="4" height="14" fill="#8a8a8a"/><ellipse cx="0" cy="-16" rx="6" ry="3" fill="${c}"/><g class="gda-spin" style="transform-origin:0px -18px"><path d="M-14 -18H14" stroke="${c}" stroke-width="2.4"/></g>${o.tod === 'dawn' ? `<path class="gda-ripple" d="M0 -18q-14 -16 -26 4M0 -18q14 -16 26 4" stroke="${c2}" stroke-width="1.4" fill="none" stroke-dasharray="2 3"/>` : ''}`;
    case 'mini-pond': return `<ellipse cx="0" cy="-28" rx="58" ry="24" fill="${c2}"/><ellipse cx="0" cy="-28" rx="50" ry="19" fill="${c}"/><ellipse class="gda-ripple" cx="-8" cy="-32" rx="22" ry="7" fill="none" stroke="${_gdaShade(c, 0.35)}" stroke-width="1.2"/>${[[-50, -18], [-30, -8], [10, -6], [40, -14], [52, -32], [-54, -38], [30, -48], [-20, -50]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${6 + (i % 3)}" ry="4" fill="${i % 2 ? c2 : _gdaShade(c2, -0.12)}"/>`).join('')}`;
    case 'wishing-well': return S + `<ellipse cx="0" cy="-12" rx="34" ry="12" fill="${dk}"/><rect x="-34" y="-34" width="68" height="22" fill="${c}"/>${[0, 1].map(y => [0, 1, 2, 3, 4].map(x => `<rect x="${-33 + x * 13.5 + (y % 2) * 6}" y="${-33 + y * 10.5}" width="12" height="9.5" rx="1.5" fill="${(x + y) % 2 ? c : _gdaShade(c, 0.12)}"/>`).join('')).join('')}<ellipse cx="0" cy="-34" rx="34" ry="10" fill="${_gdaShade(c, 0.1)}"/><ellipse cx="0" cy="-34" rx="27" ry="7" fill="#2f4a5a"/><path d="M-30 -34V-80M30 -34V-80" stroke="${c2}" stroke-width="5"/><path d="M-40 -76L0 -96L40 -76Z" fill="#a8432a"/><path d="M-26 -62H26" stroke="${c2}" stroke-width="3"/><path d="M4 -62V-46" stroke="#8a8a8a" stroke-width="1"/><rect x="-1" y="-48" width="10" height="7" fill="#8a6a4a"/>`;
    case 'lantern': { const lit = o.tod === 'night' || o.tod === 'dusk'; return S + `<rect x="-2" y="-52" width="4" height="52" fill="${c}"/><path d="M-9 -66h18l-2 16h-14z" fill="${lit ? c2 : '#d8d2c0'}"/><path d="M-11 -66L0 -74L11 -66Z" fill="${c}"/><rect x="-9" y="-51" width="18" height="2.4" fill="${c}"/>${lit ? `<circle class="gda-glow" cx="0" cy="-58" r="24" fill="${c2}" opacity="0.25"/><circle class="gda-flicker" cx="0" cy="-58" r="3.4" fill="#fff4c8"/>` : ''}`; }
    case 'string-lights': { const lit = o.tod !== 'day'; const bulbs = [-40, -28, -16, -4, 8, 20, 32, 44].map((x, i) => { const y = -70 + 14 * (1 - ((x - 2) / 46) ** 2); const col = [c2, '#ffb3c8', '#a8e0ff'][(v + i) % 3]; return `<circle cx="${x}" cy="${_gdaN(y + 4)}" r="3" fill="${lit ? col : '#e8e4d8'}"${lit ? ' class="gda-glow"' : ''}/>`; }).join(''); return S + `<path d="M-48 0V-76M48 0V-76" stroke="#7a5636" stroke-width="3"/><path d="M-48 -72Q0 -48 48 -72" stroke="${c}" stroke-width="1.2" fill="none"/>` + bulbs; }
    case 'solar-lights': { const lit = o.tod === 'night' || o.tod === 'dusk'; return [-12, 0, 12].map((x, i) => `<rect x="${x - 1}" y="${-16 - i * 2}" width="2" height="${16 + i * 2}" fill="${c}"/><circle cx="${x}" cy="${-19 - i * 2}" r="3.4" fill="${lit ? c2 : '#cfd6dc'}"${lit ? ' class="gda-glow"' : ''}/>`).join(''); }
    case 'fire-pit': { const lit = o.tod !== 'day'; return S + `<ellipse cx="0" cy="-12" rx="36" ry="14" fill="${c}"/><ellipse cx="0" cy="-15" rx="28" ry="10" fill="#3a3a3a"/>${[-14, -4, 6, 14].map((x, i) => `<rect x="${x - 8}" y="${-20 + (i % 2) * 2}" width="18" height="4" rx="2" fill="#7a5236" transform="rotate(${i % 2 ? 20 : -20} ${x} -18)"/>`).join('')}${lit ? `<path class="gda-flicker" d="M-10 -18Q-12 -34 -2 -44Q-4 -32 4 -30Q6 -40 12 -36Q14 -24 8 -18Z" fill="${c2}"/><circle class="gda-glow" cx="0" cy="-26" r="34" fill="${c2}" opacity="0.22"/>` : ''}`; }
    case 'toadstool-lamps': { const lit = o.tod !== 'day'; return [[-10, 0, 1], [8, -2, 0.8], [0, 4, 0.65]].map(([x, y, k]) => `<rect x="${x - 3 * k}" y="${y - 16 * k}" width="${6 * k}" height="${16 * k}" fill="${c2}"/><path d="M${x - 11 * k} ${y - 15 * k}a${11 * k} ${9 * k} 0 0 1 ${22 * k} 0z" fill="${c}"/><circle cx="${x - 4 * k}" cy="${y - 20 * k}" r="${1.8 * k}" fill="#ffffff"/><circle cx="${x + 4 * k}" cy="${y - 18 * k}" r="${1.5 * k}" fill="#ffffff"/>${lit ? `<circle class="gda-glow" cx="${x}" cy="${y - 10 * k}" r="${12 * k}" fill="${c2}" opacity="0.35"/>` : ''}`).join(''); }
    case 'paper-lanterns': { const lit = o.tod !== 'day'; const cols = [[c, c2, '#a8d8f0'], ['#f6c445', '#e04a3a', '#f4f1ea'], ['#9b7fd1', '#f2a7c8', '#7fb3d8']][v % 3]; return S + `<path d="M-48 0V-82M48 0V-82" stroke="#7a5636" stroke-width="3"/><path d="M-48 -80Q0 -64 48 -80" stroke="#5a5a5a" stroke-width="1" fill="none"/>${[-28, 0, 28].map((x, i) => `<line x1="${x}" y1="${-74 + (i === 1 ? 6 : 2)}" x2="${x}" y2="${-66 + (i === 1 ? 6 : 2)}" stroke="#5a5a5a"/><g class="gda-bob"><ellipse cx="${x}" cy="${-56 + (i === 1 ? 6 : 2)}" rx="10" ry="12" fill="${cols[i]}"/><path d="M${x - 10} ${-56 + (i === 1 ? 6 : 2)}h20M${x - 8} ${-62 + (i === 1 ? 6 : 2)}h16M${x - 8} ${-50 + (i === 1 ? 6 : 2)}h16" stroke="${_gdaShade(cols[i], -0.2)}" stroke-width="0.8"/>${lit ? `<circle class="gda-glow" cx="${x}" cy="${-56 + (i === 1 ? 6 : 2)}" r="18" fill="${cols[i]}" opacity="0.3"/>` : ''}</g>`).join('')}`; }
    case 'rose-arch': { const col = ['#f4f1ea', '#3f5a4a', '#2f3438'][v % 3]; let t = S + `<path d="M-50 0V-70A50 40 0 0 1 50 -70V0" stroke="${col}" stroke-width="5" fill="none"/><path d="M-42 0V-70A42 34 0 0 1 42 -70V0" stroke="${col}" stroke-width="2.4" fill="none"/>`; const rnd = gardenRand('arch' + o.t); for (let i = 0; i < 16; i++) { const a = Math.PI + (i / 15) * Math.PI, x = Math.cos(a) * 46, y = -70 + Math.sin(a) * 37; t += _gdaLeaf(x, y, 7, rnd() * 360, 3, '#3f7a3e'); if (i % 2) t += `<circle cx="${_gdaN(x + 2)}" cy="${_gdaN(y)}" r="3.4" fill="${c2}"/>`; } for (let i = 0; i < 5; i++) t += _gdaLeaf(-46, -12 - i * 12, 6, -60 + i * 30, 2.6, '#3f7a3e') + _gdaLeaf(46, -16 - i * 12, 6, -120 - i * 20, 2.6, '#3f7a3e'); return t; }
    case 'pergola': return S + `${[-52, -18, 18, 52].map(x => `<rect x="${x - 3}" y="-112" width="6" height="${x === -18 || x === 18 ? 112 : 104}" fill="${c}"/>`).join('')}${[-104, -96].map(y => `<rect x="-62" y="${y}" width="124" height="5" fill="${_gdaShade(c, -0.15)}"/>`).join('')}${[-50, -30, -10, 10, 30, 50].map(x => `<rect x="${x - 2}" y="-114" width="4" height="22" fill="${_gdaShade(c, 0.12)}" transform="skewX(-10)"/>`).join('')}${[-40, -20, 0, 20, 40].map((x, i) => `<path d="M${x} -98q4 14 -2 26" stroke="${c2}" stroke-width="3" fill="none"/>${_gdaLeaf(x - 1, -80, 6, 120, 2.4, c2)}${i % 2 ? `<circle cx="${x + 2}" cy="-76" r="2.6" fill="#9b7fd1"/>` : ''}`).join('')}`;
    case 'gazebo': return S + `<ellipse cx="0" cy="-6" rx="60" ry="12" fill="${_gdaShade(c, -0.1)}"/>${[-48, -16, 16, 48].map(x => `<rect x="${x - 3}" y="-92" width="6" height="88" fill="${c}"/>`).join('')}<path d="M-60 -36H60" stroke="${c}" stroke-width="3"/>${[-40, -32, -24, 24, 32, 40].map(x => `<path d="M${x} -36V-8" stroke="${c}" stroke-width="1.6"/>`).join('')}<path d="M-66 -90L0 -128L66 -90Z" fill="${c2}"/><path d="M-66 -90Q0 -80 66 -90" stroke="${_gdaShade(c2, -0.2)}" stroke-width="3" fill="none"/><circle cx="0" cy="-130" r="4" fill="${c}"/>`;
    case 'potting-shed': { const wall = [c, '#a87c4f', '#7a9fb8'][v % 3]; return S + `<rect x="-52" y="-74" width="104" height="70" fill="${wall}"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M-52 ${-70 + i * 9}H52" stroke="${_gdaShade(wall, -0.15)}" stroke-width="1"/>`).join('')}<path d="M-60 -72L0 -106L60 -72Z" fill="#5a4a3e"/><rect x="-10" y="-50" width="22" height="46" fill="${c2}"/><circle cx="8" cy="-28" r="1.8" fill="#2f3438"/><rect x="-42" y="-56" width="22" height="18" fill="#cfe6f2" stroke="#f4f1ea" stroke-width="2"/><path d="M-31 -56V-38M-42 -47H-20" stroke="#f4f1ea" stroke-width="1.6"/><rect x="22" y="-44" width="22" height="7" fill="#c8693a"/>${_gdaLeaf(30, -44, 7, -110, 3, '#4f8a3a')}${_gdaLeaf(36, -44, 7, -70, 3, '#5f9e4a')}`; }
    case 'cold-frame': return S + `<path d="M-52 0V-20L52 -30V0Z" fill="${c}"/><path d="M-50 -22L50 -32L50 -26L-50 -16Z" fill="${c2}" opacity="0.65"/><path d="M0 -22V-30" stroke="${c}" stroke-width="2"/>${[-30, -10, 10, 30].map(x => _gdaLeaf(x, -4, 9, -110, 3.4, '#5aa64a') + _gdaLeaf(x, -4, 9, -70, 3.4, '#6fae4a')).join('')}`;
    case 'obelisk': return S + `<path d="M-10 0L0 -88L10 0" stroke="${c}" stroke-width="2.4" fill="none"/><path d="M-8 -16H8M-6 -36H6M-4 -56H4" stroke="${c}" stroke-width="1.6"/><circle cx="0" cy="-90" r="3.4" fill="${c2}"/>`;
    case 'windmill': return S + `<path d="M-2 0V-60" stroke="${c2}" stroke-width="3"/><path d="M-10 -56L0 -64L10 -56V-40H-10Z" fill="${c}"/><g class="gda-spin" style="transform-origin:0px -58px">${[0, 1, 2, 3].map(i => `<path d="M0 -58L${[18, 0, -18, 0][i]} ${[-62, -76, -54, -40][i]}L${[16, 4, -16, -4][i]} ${[-52, -76, -64, -40][i]}Z" fill="${i % 2 ? c2 : ['#3a6fc4', '#f2b33a'][v % 2]}"/>`).join('')}<circle cx="0" cy="-58" r="2.4" fill="#2f3438"/></g>`;
    case 'weather-vane': return S + `<rect x="-1.4" y="-96" width="2.8" height="96" fill="${c}"/><path d="M-12 -80H12M0 -92V-68" stroke="${c}" stroke-width="1.4"/><g class="gda-bob"><path d="M-14 -102q6 -10 14 -6q4 -8 10 -2l-4 4q8 2 6 8h-20z" fill="${c2}"/></g>`;
    case 'sundial': return S + `<path d="M-12 0h24l-4 -10h-16z" fill="${_gdaShade(c, -0.15)}"/><rect x="-6" y="-38" width="12" height="28" fill="${c}"/><ellipse cx="0" cy="-40" rx="18" ry="6" fill="${_gdaShade(c, 0.12)}"/><path d="M0 -40l10 -12v12z" fill="${c2}"/>${[0, 1, 2, 3, 4].map(i => `<line x1="${-12 + i * 6}" y1="-41" x2="${-11 + i * 5.6}" y2="-38" stroke="${_gdaShade(c, -0.3)}" stroke-width="0.8"/>`).join('')}`;
    case 'dovecote': return S + `<rect x="-2.4" y="-60" width="4.8" height="60" fill="${c2}"/><rect x="-18" y="-104" width="36" height="44" fill="${c}"/><path d="M-24 -102L0 -122L24 -102Z" fill="#7a5636"/>${[[-9, -92], [9, -92], [-9, -74], [9, -74]].map(([x, y]) => `<path d="M${x - 5} ${y + 6}v-6a5 5 0 0 1 10 0v6z" fill="#2f3438"/><rect x="${x - 7}" y="${y + 6}" width="14" height="2" fill="${c2}"/>`).join('')}<ellipse cx="14" cy="-124" rx="5" ry="3.4" fill="#f4f1ea"/><circle cx="18" cy="-126" r="2" fill="#f4f1ea"/>`;
    case 'wheelbarrow': { const col = [c, '#d83a3a'][v % 2]; return S + `<path d="M-30 -34H22L14 -14H-22Z" fill="${col}"/><circle cx="18" cy="-10" r="9" fill="#2f3438"/><circle cx="18" cy="-10" r="3" fill="#8a8a8a"/><path d="M-22 -14L-26 0M-14 -14L-14 0M-30 -30L-48 -40" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>${[-20, -8, 4].map((x, i) => `<circle cx="${x}" cy="-38" r="5" fill="${['#f6c445', '#e0566e', '#9b7fd1'][i]}"/>`).join('')}`; }
    case 'bird-feeder': return S + `<rect x="-1.6" y="-72" width="3.2" height="72" fill="${c}"/><path d="M0 -70h18" stroke="${c}" stroke-width="2.4"/><line x1="16" y1="-70" x2="16" y2="-60" stroke="#8a8a8a"/><rect x="10" y="-60" width="12" height="20" rx="2" fill="#cfe6f2" stroke="${c}" stroke-width="1.4"/><rect x="11" y="-50" width="10" height="9" fill="${c2}"/><path d="M8 -61L16 -66L24 -61Z" fill="${c}"/>`;
    case 'bird-box': return S + `<rect x="-2" y="-58" width="4" height="58" fill="${_gdaShade(c, -0.2)}"/><rect x="-12" y="-86" width="24" height="28" fill="${c}"/><path d="M-16 -84L0 -98L16 -84Z" fill="${c2}"/><circle cx="0" cy="-74" r="4" fill="#2f2a26"/><rect x="-1" y="-66" width="2" height="5" fill="${_gdaShade(c, -0.3)}"/>`;
    case 'bug-hotel': return S + `<path d="M-22 0V-44L0 -60L22 -44V0Z" fill="${c}"/><path d="M-26 -42L0 -62L26 -42" stroke="#7a5236" stroke-width="4" fill="none"/>${[[-14, -36], [-2, -36], [10, -36], [-14, -22], [-2, -22], [10, -22], [-14, -8], [-2, -8], [10, -8]].map(([x, y], i) => i % 3 === 0 ? `<rect x="${x - 4}" y="${y - 5}" width="12" height="11" fill="${c2}"/>${[0, 1, 2].map(j => `<circle cx="${x - 1 + j * 3.5}" cy="${y}" r="1.2" fill="#3a2a1e"/>`).join('')}` : i % 3 === 1 ? `<rect x="${x - 4}" y="${y - 5}" width="12" height="11" fill="#8a6a4a"/>${[0, 1, 2, 3].map(j => `<line x1="${x - 4}" y1="${y - 4 + j * 3}" x2="${x + 8}" y2="${y - 4 + j * 3}" stroke="#c9a26a"/>`).join('')}` : `<rect x="${x - 4}" y="${y - 5}" width="12" height="11" fill="#d8c48a"/><circle cx="${x + 2}" cy="${y}" r="3.4" fill="#a87c4f"/>`).join('')}`;
    case 'hedgehog-house': return S + `<path d="M-26 0A26 26 0 0 1 26 0Z" fill="${c}"/>${[-18, -6, 6, 18].map(x => `<path d="M${x} -2Q${x + 3} -16 ${x + 1} ${-20 + Math.abs(x) * 0.4}" stroke="${c2}" stroke-width="2" fill="none"/>`).join('')}<path d="M-8 0a8 8 0 0 1 16 0z" fill="#2f2a26"/>`;
    case 'beehive': return S + `<rect x="-18" y="-6" width="36" height="6" fill="#7a5636"/>${[0, 1, 2].map(i => `<rect x="${-17 + i * 1}" y="${-20 - i * 13}" width="${34 - i * 2}" height="13" fill="${i % 2 ? c : _gdaShade(c, -0.06)}"/>`).join('')}<path d="M-22 -45L0 -58L22 -45Z" fill="${c2}"/><rect x="-6" y="-9" width="12" height="3" fill="#3a2a1e"/>${o.tod === 'day' ? `<g class="gda-flutter"><circle cx="16" cy="-30" r="1.6" fill="#2a2a2a"/><circle cx="-14" cy="-50" r="1.6" fill="#2a2a2a"/></g>` : ''}`;
    case 'compost-bin': return S + `<path d="M-20 0L-18 -44H18L20 0Z" fill="${c}"/><rect x="-22" y="-50" width="44" height="7" rx="2" fill="${_gdaShade(c, 0.12)}"/><rect x="-10" y="-14" width="20" height="12" fill="${_gdaShade(c, -0.15)}"/><path d="M-6 -30l6 -8l6 8M0 -38v12" stroke="${_gdaShade(c, 0.4)}" stroke-width="1.6" fill="none"/>`;
    case 'gnome': { const pose = v % 4; return S + `<ellipse cx="0" cy="-4" rx="10" ry="5" fill="#5a4a3e"/><path d="M-9 -4Q-10 -22 0 -22Q10 -22 9 -4Z" fill="${c2}"/><circle cx="0" cy="-26" r="6" fill="#f2c4a0"/><path d="M-7 -24Q0 -12 7 -24Q4 -14 0 -12Q-4 -14 -7 -24Z" fill="#f4f1ea"/><path d="M-7 -28L${pose === 2 ? 10 : 0} ${pose === 2 ? -40 : -46}L7 -28Z" fill="${c}"/>${pose === 0 ? '<path d="M9 -18l8 -10" stroke="#f2c4a0" stroke-width="3" stroke-linecap="round"/>' : pose === 1 ? '<path d="M8 -14L26 -40" stroke="#8a6a4a" stroke-width="1.4"/><path d="M26 -40v18" stroke="#cfd6dc" stroke-width="0.6"/>' : pose === 3 ? '<rect x="-6" y="-16" width="12" height="7" fill="#e04a3a"/>' : '<path d="M-3 -27h2M2 -27h2" stroke="#3a2a1e"/>'}`; }
    case 'scarecrow': return S + `<path d="M0 0V-80M-28 -60H28" stroke="#7a5636" stroke-width="3"/><path d="M-26 -62L26 -62L18 -30H-18Z" fill="${c2}"/><path d="M-10 -40h20v14h-20z" fill="#d83a3a" opacity="0.7"/><circle cx="0" cy="-72" r="10" fill="#e8d6a0"/><path d="M-16 -78H16L8 -84V-94H-8V-84Z" fill="#5a4a3e"/><path d="M-4 -74h2M3 -74h2M-4 -68q4 3 8 0" stroke="#3a2a1e" stroke-width="1.2" fill="none"/>${[-28, 28].map(x => `<path d="M${x} -60l${x > 0 ? 6 : -6} 6M${x} -60l${x > 0 ? 7 : -7} 0" stroke="${c}" stroke-width="1.6"/>`).join('')}`;
    case 'stone-frog': return `<ellipse cx="0" cy="-8" rx="15" ry="9" fill="${c}"/><circle cx="-7" cy="-17" r="4.6" fill="${c}"/><circle cx="7" cy="-17" r="4.6" fill="${c}"/><circle cx="-7" cy="-18" r="1.6" fill="${c2}"/><circle cx="7" cy="-18" r="1.6" fill="${c2}"/><path d="M-6 -9q6 4 12 0" stroke="${c2}" stroke-width="1.4" fill="none"/>`;
    case 'stone-owl': return S + `<rect x="-14" y="-8" width="28" height="8" fill="${c2}"/><ellipse cx="0" cy="-24" rx="12" ry="17" fill="${c}"/><path d="M-12 -38L-8 -32M12 -38L8 -32" stroke="${c}" stroke-width="3"/><circle cx="-5" cy="-30" r="4.4" fill="${_gdaShade(c, 0.2)}"/><circle cx="5" cy="-30" r="4.4" fill="${_gdaShade(c, 0.2)}"/><circle cx="-5" cy="-30" r="1.6" fill="${c2}"/><circle cx="5" cy="-30" r="1.6" fill="${c2}"/><path d="M-2 -25l2 3l2 -3z" fill="${c2}"/>`;
    case 'flamingo': return `<path d="M-1 0V-30M3 0V-26" stroke="${c2}" stroke-width="1.2"/><ellipse cx="2" cy="-36" rx="12" ry="7" fill="${c}"/><path d="M10 -38Q16 -56 8 -60Q2 -62 6 -54" stroke="${c}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M6 -56l-4 4" stroke="${c2}" stroke-width="2"/>`;
    case 'topiary-peacock': return S + `<path d="M-16 0L-12 -14H12L16 0Z" fill="#c8693a"/><ellipse cx="-4" cy="-40" rx="30" ry="26" fill="${c}"/>${[0, 1, 2, 3, 4].map(i => `<circle cx="${-26 + i * 9}" cy="${-56 + Math.abs(i - 2) * 6}" r="4" fill="${_gdaShade(c, 0.12)}"/>`).join('')}<ellipse cx="14" cy="-30" rx="10" ry="12" fill="${c2}"/><path d="M18 -40Q24 -58 20 -66" stroke="${c2}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="20" cy="-68" r="4.4" fill="${c2}"/>`;
    case 'hare-statue': return S + `<rect x="-14" y="-10" width="28" height="10" fill="${c2}"/><ellipse cx="-2" cy="-24" rx="12" ry="14" fill="${c}"/><circle cx="6" cy="-42" r="7" fill="${c}"/><path d="M3 -48Q-2 -66 2 -72Q6 -62 6 -48M8 -48Q10 -66 16 -70Q14 -58 10 -47" fill="${c}"/><circle cx="9" cy="-43" r="1.2" fill="${c2}"/>`;
    case 'gazing-ball': { const col = [c, '#c45fa0', '#d9a03a'][v % 3]; return S + `<path d="M-8 0h16l-4 -26h-8z" fill="${c2}"/><circle cx="0" cy="-36" r="11" fill="${col}"/><ellipse cx="-4" cy="-40" rx="4" ry="2.6" fill="#ffffff" opacity="0.6"/>`; }
    case 'wind-chimes': return `<path d="M-2 0V-86M-2 -84h16" stroke="${c2}" stroke-width="2.4"/><circle cx="14" cy="-74" r="5" fill="${c2}"/><g class="gda-bob">${[0, 1, 2, 3, 4].map(i => `<line x1="${8 + i * 3}" y1="-70" x2="${8 + i * 3}" y2="${-70 + 14 + (i % 3) * 5}" stroke="${c}" stroke-width="2"/>`).join('')}</g>`;
    case 'signpost': return S + `<rect x="-2" y="-70" width="4" height="70" fill="${c}"/><path d="M2 -64h22l6 5l-6 5h-22z" fill="${c2}"/><path d="M-2 -46h-22l-6 5l6 5h22z" fill="${c2}"/><path d="M6 -59h14M-6 -41h-14" stroke="${c}" stroke-width="1.4"/>`;
    case 'welcome-sign': return S + `<path d="M-14 0V-34M14 0V-34" stroke="${c}" stroke-width="3"/><rect x="-22" y="-50" width="44" height="20" rx="3" fill="${_gdaShade(c, 0.2)}"/><path d="M-14 -40h10M-2 -40h16" stroke="${c2}" stroke-width="2.4" stroke-linecap="round"/><circle cx="-17" cy="-46" r="2" fill="${c2}"/><circle cx="17" cy="-36" r="2" fill="${c2}"/>`;
    case 'letterbox': { const col = [c, '#3f6fa8', '#3f8f5a'][v % 3]; return S + `<rect x="-2" y="-46" width="4" height="46" fill="#7a5636"/><rect x="-12" y="-62" width="24" height="16" rx="7" fill="${col}"/><rect x="10" y="-66" width="2" height="10" fill="${c2}"/><rect x="12" y="-66" width="6" height="4" fill="${c2}"/>`; }
    case 'terracotta-pots': return [[-14, 0, 1, '#e0566e'], [12, 0, 0.8, '#f6c445'], [-1, 4, 0.65, '#9b7fd1']].map(([x, y, k, f], i) => { const flower = [f, '#5aa64a', '#f29ac4'][(v + i) % 3]; return `<path d="M${x - 9 * k} ${y}L${x - 11 * k} ${y - 16 * k}H${x + 11 * k}L${x + 9 * k} ${y}Z" fill="${c}"/><rect x="${x - 12 * k}" y="${y - 19 * k}" width="${24 * k}" height="${4 * k}" fill="${c2}"/>${_gdaPetals(x, y - 24 * k, 6, 1, 6 * k, 3 * k, flower, 0, true)}${_gdaLeaf(x, y - 19 * k, 8 * k, -150, 3 * k, '#4f8a3a')}${_gdaLeaf(x, y - 19 * k, 8 * k, -30, 3 * k, '#4f8a3a')}`; }).join('');
    case 'hanging-basket': { const fl = [c2, '#9b7fd1', '#f6c445'][v % 3]; return S + `<rect x="-2" y="-90" width="4" height="90" fill="${c}"/><path d="M0 -88h18" stroke="${c}" stroke-width="2.4"/><path d="M18 -88l-10 22M18 -88l10 22M18 -88v22" stroke="#8a8a8a" stroke-width="0.8"/><path d="M4 -66a14 10 0 0 0 28 0z" fill="#7a5636"/>${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${6 + i * 5}" cy="${-66 + (i % 2) * 4}" r="3.4" fill="${i % 3 ? fl : '#f4f1ea'}"/>`).join('')}${_gdaLeaf(8, -62, 10, 110, 2.6, '#4f8a3a')}${_gdaLeaf(28, -62, 12, 80, 2.6, '#5aa64a')}`; }
    case 'planter-box': { const fl = [c2, '#e0566e', '#7fb3f0'][v % 3]; return S + `<rect x="-56" y="-20" width="112" height="20" fill="${c}"/>${[0, 1, 2].map(i => `<path d="M-56 ${-16 + i * 6}H56" stroke="${_gdaShade(c, -0.15)}"/>`).join('')}${[-44, -30, -16, -2, 12, 26, 40].map((x, i) => `${_gdaLeaf(x, -20, 9, -120, 3, '#4f8a3a')}${_gdaLeaf(x, -20, 9, -60, 3, '#5aa64a')}${_gdaPetals(x, -30, 5, 1, 5, 2.6, i % 2 ? fl : '#f4f1ea', 0, true)}`).join('')}`; }
    case 'old-watering-can': return `<path d="M-14 0V-22H10V0Z" fill="${c}"/><path d="M10 -16L26 -30" stroke="${c}" stroke-width="3.4"/><ellipse cx="27" cy="-31" rx="3" ry="4" fill="${c}"/><path d="M-14 -22Q-2 -36 10 -22" stroke="${_gdaShade(c, -0.2)}" stroke-width="2.4" fill="none"/>${_gdaPetals(-4, -28, 7, 1, 7, 3, c2, 0, true)}<circle cx="-4" cy="-28" r="2.6" fill="#c0561a"/>`;
    case 'stone-urn': return S + `<rect x="-14" y="-12" width="28" height="12" fill="${_gdaShade(c, -0.12)}"/><path d="M-6 -12V-20H6V-12Z" fill="${c}"/><path d="M-22 -50Q-24 -22 -6 -20H6Q24 -22 22 -50Z" fill="${c}"/><rect x="-25" y="-54" width="50" height="6" rx="2" fill="${_gdaShade(c, 0.12)}"/>${_gdaPetals(-10, -60, 6, 1, 6, 3, c2, 0, true)}${_gdaPetals(8, -62, 6, 1, 6, 3, c2, 30, true)}${_gdaLeaf(-20, -54, 14, 120, 3, '#4f8a3a')}${_gdaLeaf(20, -54, 14, 60, 3, '#4f8a3a')}`;
    case 'carved-pumpkin': { const lit = o.tod !== 'day'; return `<ellipse cx="0" cy="-13" rx="18" ry="13" fill="${c}"/><ellipse cx="0" cy="-13" rx="7" ry="13" fill="${_gdaShade(c, -0.12)}"/><path d="M0 -26l2 -6" stroke="#5a7a3a" stroke-width="3"/><path d="M-10 -16l4 -5 4 5zM2 -16l4 -5 4 5zM-9 -8q9 6 18 0l-3 3h-12z" fill="${lit ? c2 : '#3a2a1e'}"${lit ? ' class="gda-flicker"' : ''}/>${lit ? `<circle class="gda-glow" cx="0" cy="-13" r="24" fill="${c2}" opacity="0.22"/>` : ''}`; }
    case 'leaf-pile': { let t = `<ellipse cx="0" cy="-6" rx="26" ry="9" fill="${c2}"/>`; const rnd = gardenRand('leaves' + o.t); for (let i = 0; i < 16; i++) t += _gdaLeaf(-22 + rnd() * 44, -4 - rnd() * 14, 7, rnd() * 360, 3, [c, c2, '#e8a23a', '#c0392b'][i % 4]); return t; }
    case 'hay-bale': return S + `<rect x="-22" y="-30" width="44" height="30" rx="5" fill="${c}"/><path d="M-22 -20H22M-22 -10H22" stroke="${c2}" stroke-width="1.4"/><path d="M-10 -30V0M10 -30V0" stroke="#a8432a" stroke-width="2"/>`;
    case 'snowman': { const sc = ['#d83a3a', '#3a6fc4', '#3f8f5a'][v % 3]; return S + `<circle cx="0" cy="-16" r="16" fill="${c}"/><circle cx="0" cy="-42" r="11" fill="${c}"/><path d="M-11 -34h22v5h-22z" fill="${sc}"/><path d="M6 -34v12" stroke="${sc}" stroke-width="5"/><path d="M0 -42l9 2l-9 2z" fill="${c2}"/><circle cx="-4" cy="-45" r="1.4" fill="#2f2a26"/><circle cx="4" cy="-45" r="1.4" fill="#2f2a26"/><circle cx="0" cy="-20" r="1.6" fill="#2f2a26"/><circle cx="0" cy="-12" r="1.6" fill="#2f2a26"/><path d="M-10 -52h20M-7 -52v-10h14v10" fill="#2f3438" stroke="#2f3438" stroke-width="2"/>`; }
    case 'festive-lights': { const lit = o.tod !== 'day'; return S + `<path d="M-48 0V-60M48 0V-60" stroke="${c}" stroke-width="5"/><path d="M-48 -56Q0 -34 48 -56" stroke="${c}" stroke-width="6" fill="none"/>${[-36, -24, -12, 0, 12, 24, 36].map((x, i) => `<circle cx="${x}" cy="${_gdaN(-56 + 22 * (1 - (x / 48) ** 2))}" r="3" fill="${lit ? ['#ffd36a', '#e04a3a', '#7fb3f0', '#f27aa8'][(i + v) % 4] : '#d8d2c0'}"${lit ? ' class="gda-blink"' : ''}/>`).join('')}`; }
    case 'bunting': { const cols = v % 2 ? ['#f2a7c8', '#7fb3f0', '#f6c445', '#9fc35a'] : [c, '#f4f1ea', c2]; return S + `<path d="M-48 0V-74M48 0V-74" stroke="#7a5636" stroke-width="3"/><path d="M-48 -72Q0 -54 48 -72" stroke="#5a5a5a" stroke-width="0.8" fill="none"/>${[-38, -26, -14, -2, 10, 22, 34].map((x, i) => { const y = -72 + 18 * (1 - (x / 48) ** 2); return `<path d="M${x} ${_gdaN(y)}h10l-5 10z" fill="${cols[i % cols.length]}"/>`; }).join('')}`; }
    case 'painted-eggs': return [[-10, 0, c], [6, -2, c2], [0, 3, '#f6c445']].map(([x, y, col]) => `<ellipse cx="${x}" cy="${y - 7}" rx="5.4" ry="7" fill="${col}"/><path d="M${x - 5} ${y - 8}q2.6 -2 5.2 0t5.2 0" stroke="#ffffff" stroke-width="1.2" fill="none"/>`).join('') + [-16, 14].map(x => `<path d="M${x} 0l2 -9l2 9" stroke="#6fae4a" stroke-width="1.4" fill="none"/>`).join('');
  }
  // fallback by category
  return S + `<rect x="${-w * 0.6}" y="${_gdaN(-H)}" width="${_gdaN(w * 1.2)}" height="${_gdaN(H)}" rx="4" fill="${c}"/><rect x="${-w * 0.6}" y="${_gdaN(-H)}" width="${_gdaN(w * 1.2)}" height="5" rx="2" fill="${c2}"/>`;
}

/* ---------- visitors ---------- */
function _gdaVisitor(def, o) {
  const c = _gdaHex(def.look && def.look.c), c2 = _gdaHex(def.look && def.look.c2);
  switch (def.id) {
    case 'honeybee': case 'bumblebee': { const k = def.id === 'bumblebee' ? 1.35 : 1; return `<g transform="scale(${k})"><g class="gda-flutter"><ellipse cx="-2" cy="-7" rx="3.4" ry="2" fill="#e8f4ff" opacity="0.85"/><ellipse cx="2" cy="-7" rx="3.4" ry="2" fill="#e8f4ff" opacity="0.85"/></g><ellipse cx="0" cy="-3" rx="5" ry="3.4" fill="${c}"/><path d="M-1.6 -6v6M1.6 -6v6" stroke="${c2}" stroke-width="1.4"/><circle cx="5" cy="-3.4" r="2" fill="${c2}"/></g>`; }
    case 'cabbage-white': case 'peacock-butterfly': case 'red-admiral': case 'moth': { const wing = def.id === 'red-admiral' ? c : c, spot = c2; return `<g class="gda-flutter"><path d="M0 -4Q-12 -16 -11 -4Q-12 4 0 -2Z" fill="${wing}"/><path d="M0 -4Q12 -16 11 -4Q12 4 0 -2Z" fill="${_gdaShade(wing, 0.08)}"/>${def.id === 'peacock-butterfly' ? `<circle cx="-6" cy="-8" r="2.4" fill="${spot}"/><circle cx="6" cy="-8" r="2.4" fill="${spot}"/>` : def.id === 'red-admiral' ? `<path d="M-9 -9l5 3M9 -9l-5 3" stroke="${spot}" stroke-width="1.8"/>` : `<circle cx="-7" cy="-8" r="1.2" fill="${spot}"/>`}</g><ellipse cx="0" cy="-4" rx="1" ry="4" fill="#3a3a3a"/>`; }
    case 'ladybird': return `<circle cx="0" cy="-3" r="4" fill="${c}"/><path d="M0 -7v8" stroke="${c2}" stroke-width="0.8"/><circle cx="-2" cy="-4" r="0.9" fill="${c2}"/><circle cx="2" cy="-2" r="0.9" fill="${c2}"/><circle cx="3.6" cy="-4.4" r="1.6" fill="${c2}"/>`;
    case 'dragonfly': return `<g class="gda-flutter"><ellipse cx="-6" cy="-6" rx="7" ry="1.8" fill="${c2}" opacity="0.8"/><ellipse cx="6" cy="-6" rx="7" ry="1.8" fill="${c2}" opacity="0.8"/><ellipse cx="-5" cy="-3.6" rx="6" ry="1.6" fill="${c2}" opacity="0.7"/><ellipse cx="5" cy="-3.6" rx="6" ry="1.6" fill="${c2}" opacity="0.7"/></g><rect x="-0.9" y="-8" width="1.8" height="15" rx="0.9" fill="${c}"/><circle cx="0" cy="-8" r="1.8" fill="${c}"/>`;
    case 'firefly': return `<circle class="gda-glow" cx="0" cy="-4" r="6" fill="${c}" opacity="0.35"/><circle class="gda-blink" cx="0" cy="-4" r="1.8" fill="${c}"/><circle class="gda-blink" cx="9" cy="-10" r="1.4" fill="${c}"/><circle class="gda-blink" cx="-8" cy="-13" r="1.4" fill="${c}"/>`;
    case 'snail': return `<path d="M-10 0h14q2 -2 2 -4h-4" fill="#b8a888" stroke="#9a8a6a" stroke-width="0.6"/><circle cx="-2" cy="-6" r="6" fill="${c}"/><path d="M-2 -6m-3 0a3 3 0 1 0 3 -3" stroke="${_gdaShade(c, -0.3)}" stroke-width="1" fill="none"/><path d="M5 -4l2 -5M6 -4l3 -4" stroke="#9a8a6a" stroke-width="0.8"/>`;
    case 'robin': case 'blue-tit': case 'blackbird': case 'wren': case 'goldfinch': case 'wood-pigeon': {
      const k = def.id === 'wood-pigeon' ? 1.5 : def.id === 'blackbird' ? 1.25 : def.id === 'wren' ? 0.8 : 1;
      const breast = def.id === 'robin' ? c : def.id === 'blue-tit' || def.id === 'goldfinch' ? c2 : _gdaShade(c, 0.12), body = def.id === 'robin' ? c2 : c;
      return `<g transform="scale(${k})"><path d="M-8 -6l-6 -3l2 4z" fill="${_gdaShade(body, -0.2)}"/><ellipse cx="0" cy="-6" rx="8" ry="6" fill="${body}"/><ellipse cx="2" cy="-4.5" rx="5" ry="4" fill="${breast}"/><circle cx="6" cy="-11" r="4.2" fill="${def.id === 'blue-tit' ? c : body}"/>${def.id === 'blue-tit' ? '<path d="M3 -12h7" stroke="#ffffff" stroke-width="1.4"/>' : ''}${def.id === 'goldfinch' ? `<circle cx="8" cy="-11" r="2" fill="${c2}"/>` : ''}<circle cx="7.4" cy="-12" r="0.9" fill="#1a1a1a"/><path d="M10 -11l4 1l-4 1z" fill="${def.id === 'blackbird' ? c2 : '#3a3a3a'}"/><path d="M-1 0v2M2 0v2" stroke="#6a5a4a" stroke-width="0.9"/></g>`;
    }
    case 'tawny-owl': return `<ellipse cx="0" cy="-12" rx="9" ry="12" fill="${c}"/><circle cx="-3.6" cy="-17" r="3.6" fill="${c2}"/><circle cx="3.6" cy="-17" r="3.6" fill="${c2}"/><circle class="gda-blink" cx="-3.6" cy="-17" r="1.6" fill="#1a1a1a"/><circle class="gda-blink" cx="3.6" cy="-17" r="1.6" fill="#1a1a1a"/><path d="M-1.4 -13l1.4 2.4l1.4 -2.4z" fill="#d8a03a"/><path d="M-5 -5q5 3 10 0" stroke="${_gdaShade(c, -0.2)}" stroke-width="1" fill="none"/>`;
    case 'grey-heron': return `<path d="M-2 0V-16M2 0V-16" stroke="#8a8a7a" stroke-width="1.2"/><ellipse cx="0" cy="-22" rx="8" ry="7" fill="${c}"/><path d="M4 -26Q2 -40 8 -42" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="8" cy="-43" r="3" fill="#f4f6f8"/><path d="M10 -43l10 2l-10 1z" fill="#e8b43a"/><path d="M6 -45l-6 -2" stroke="${c2}" stroke-width="1"/>`;
    case 'kingfisher': return `<path d="M-6 -4l-5 2l5 0z" fill="${c}"/><ellipse cx="0" cy="-5" rx="6" ry="4.4" fill="${c}"/><ellipse cx="1" cy="-3.6" rx="4" ry="3" fill="${c2}"/><circle cx="5" cy="-9" r="3.6" fill="${c}"/><path d="M7 -9l9 1l-9 1z" fill="#2a2a2a"/><circle cx="5.6" cy="-9.6" r="0.8" fill="#1a1a1a"/>`;
    case 'mallard': return `<g class="gda-bob"><path d="M-12 -4Q-12 2 0 2Q12 2 12 -4Q8 -10 -4 -8Z" fill="${c2}"/><path d="M-12 -4l-4 -3l2 5z" fill="#3a3a3a"/><circle cx="9" cy="-11" r="4.4" fill="${c}"/><path d="M12 -11l6 1l-6 1.6z" fill="#e8b43a"/><path d="M5 -7h7" stroke="#ffffff" stroke-width="1.2"/><circle cx="10" cy="-12" r="0.9" fill="#1a1a1a"/></g>`;
    case 'frog': return `<ellipse cx="0" cy="-4" rx="8" ry="5" fill="${c}"/><circle cx="-3.6" cy="-9" r="2.8" fill="${c}"/><circle cx="3.6" cy="-9" r="2.8" fill="${c}"/><circle cx="-3.6" cy="-9.4" r="1.2" fill="#1a1a1a"/><circle cx="3.6" cy="-9.4" r="1.2" fill="#1a1a1a"/><path d="M-3 -4q3 2 6 0" stroke="${_gdaShade(c, -0.3)}" stroke-width="0.8" fill="none"/><ellipse cx="-7" cy="-1" rx="3" ry="1.6" fill="${_gdaShade(c, -0.1)}"/><ellipse cx="7" cy="-1" rx="3" ry="1.6" fill="${_gdaShade(c, -0.1)}"/>`;
    case 'newt': return `<path d="M-14 -2Q-6 -6 0 -3Q6 0 12 -3" stroke="${c}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M-6 -1Q0 2 6 -1" stroke="${c2}" stroke-width="1.6" fill="none"/><circle cx="12" cy="-3.4" r="2.2" fill="${c}"/>`;
    case 'hedgehog': return `<path d="M-12 0Q-12 -14 0 -14Q12 -14 13 -2Z" fill="${c}"/>${[-8, -4, 0, 4, 8].map(x => `<path d="M${x} -12l-2 -4M${x + 2} -8l-1 -4" stroke="${_gdaShade(c, -0.3)}" stroke-width="1"/>`).join('')}<path d="M10 -6Q18 -4 17 -1Q12 0 9 -1Z" fill="${c2}"/><circle cx="17" cy="-1.6" r="1.2" fill="#1a1a1a"/><circle cx="13" cy="-5" r="0.9" fill="#1a1a1a"/>`;
    case 'fox': return `<path d="M-16 -8Q-30 -10 -26 -2Q-20 0 -14 -4Z" fill="${c}"/><path d="M-26 -3l-4 1l3 2z" fill="${c2}"/><ellipse cx="-2" cy="-10" rx="13" ry="6" fill="${c}"/><path d="M-10 -5v5M-4 -5v5M4 -5v5M8 -5v5" stroke="#3a2a1e" stroke-width="2"/><path d="M8 -12L20 -14L18 -9L10 -6Z" fill="${c}"/><path d="M13 -14L12 -20L16 -15M16 -14L17 -20L19 -14" fill="${c}"/><path d="M15 -9L20 -12L20 -10Z" fill="${c2}"/><circle cx="16" cy="-12.6" r="0.9" fill="#1a1a1a"/>`;
    case 'squirrel': return `<path d="M-6 -4Q-18 -6 -14 -20Q-10 -28 -4 -20Q-10 -14 -4 -8Z" fill="${c}"/><ellipse cx="1" cy="-7" rx="6" ry="7" fill="${c}"/><ellipse cx="2" cy="-5" rx="3" ry="4.4" fill="${c2}"/><circle cx="4" cy="-15" r="4" fill="${c}"/><path d="M3 -18l0 -4l2 3" fill="${c}"/><circle cx="5.4" cy="-15.6" r="0.9" fill="#1a1a1a"/><circle cx="6" cy="-6" r="1.8" fill="#a8743a"/>`;
    case 'rabbit': return `<ellipse cx="0" cy="-7" rx="9" ry="7" fill="${c}"/><circle cx="-8" cy="-5" r="2.6" fill="${c2}"/><circle cx="7" cy="-13" r="4.4" fill="${c}"/><path d="M5 -16Q2 -28 5 -28Q8 -26 7 -16M8 -16Q10 -27 12 -26Q12 -20 9 -15" fill="${c}"/><circle cx="9" cy="-13.6" r="0.9" fill="#1a1a1a"/>`;
    case 'roe-deer': return `<path d="M-8 0V-14M-4 0V-14M6 0V-14M9 0V-14" stroke="${_gdaShade(c, -0.2)}" stroke-width="1.6"/><ellipse cx="0" cy="-17" rx="12" ry="6" fill="${c}"/><ellipse cx="-11" cy="-17" rx="2.4" ry="3" fill="${c2}"/><path d="M8 -20L12 -32L16 -31L13 -19Z" fill="${c}"/><ellipse cx="15" cy="-33" rx="4" ry="2.6" fill="${c}"/><path d="M13 -35l-2 -5M15 -35l1 -5" stroke="#6a4a2a" stroke-width="1"/><circle cx="16" cy="-33.6" r="0.8" fill="#1a1a1a"/>`;
    case 'pipistrelle': return `<g class="gda-flutter"><path d="M0 -4Q-6 -10 -14 -6Q-10 -4 -11 -1Q-6 -3 0 -2Z" fill="${c}"/><path d="M0 -4Q6 -10 14 -6Q10 -4 11 -1Q6 -3 0 -2Z" fill="${c}"/></g><ellipse cx="0" cy="-3.4" rx="2.4" ry="3" fill="${c2}"/><path d="M-1.6 -6l-0.6 -2M1.6 -6l0.6 -2" stroke="${c}" stroke-width="1"/>`;
    case 'garden-cat': return `<path d="M-10 -2Q-18 -4 -16 -12" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="-2" cy="-6" rx="10" ry="6" fill="${c}"/><circle cx="7" cy="-11" r="5" fill="${c}"/><path d="M4 -15l1 -5l3 4M8 -15l3 -4l0 5" fill="${c}"/><path d="M5 -11q1 1 2 0M8 -11q1 1 2 0" stroke="#3a2a1e" stroke-width="0.8" fill="none"/><path d="M-6 -6q3 -2 6 0" stroke="${c2}" stroke-width="1.4" fill="none"/>`;
  }
  return `<circle cx="0" cy="-5" r="5" fill="${c}"/>`;
}

/* ---------- crops, seed packets, tools, bouquets (icons, 64-unit box) ---------- */
function _gdaCrop(def, o) {
  const c = _gdaHex((def.look.v && def.look.v[o.variant || 0]) || def.look.c || '#e0566e'), c2 = def.look.c2 ? _gdaHex(def.look.c2) : null, leaf = _gdaHex(def.look.leaf || '#5a9e4b');
  const fam = (_GDA_FORMS[def.look.form] || ['bloom', {}]);
  if (['flower', 'wild', 'water', 'exotic'].includes(def.cat) && fam[0] !== 'veg') {
    const head = fam[1].head || 'daisy';
    let s = '';
    for (let i = 0; i < 3; i++) s += _gdaStem(0, -6, -10 + i * 10, -40 + Math.abs(i - 1) * 4, 0, _gdaShade(leaf, -0.1), 2);
    s += `<path d="M-6 -16L6 -16L4 -8L-4 -8Z" fill="#e8d6a0"/><path d="M-6 -13H6" stroke="#d83a3a" stroke-width="2"/>`;
    for (let i = 0; i < 3; i++) s += `<g transform="translate(${-10 + i * 10} ${-40 + Math.abs(i - 1) * 4})">${_gdaHead(fam[0] === 'spike' || fam[0] === 'bells' ? 'cluster' : head, 0, 0, 8, c, c2, { t: 0.3 + i * 0.2 })}</g>`;
    return s;
  }
  const r = 13;
  switch (def.look.form) {
    case 'root': case 'root-frilly': return `<path d="M-8 -36Q0 -40 8 -36L1 -4Q0 -2 -1 -4Z" fill="${c}"/>` + _gdaLeafStyle(def.look.form === 'root-frilly' ? 'frilly' : 'oval', 0, -36, 18, -110, leaf) + _gdaLeafStyle('frilly', 0, -36, 18, -70, leaf);
    case 'leek': case 'bulb': return `<path d="M-10 -14Q-12 -28 0 -30Q12 -28 10 -14Q0 -2 -10 -14Z" fill="${c}"/>${_gdaLeaf(0, -28, 22, -95, 3, leaf)}${_gdaLeaf(0, -28, 20, -75, 3, leaf)}`;
    case 'head': case 'floret': case 'frilly': case 'frilly-tall': case 'leafy': case 'leafy-soft': case 'needle-bush': case 'mat': return `<circle cx="0" cy="-18" r="${r}" fill="${def.cat === 'herb' ? leaf : c}"/>` + [0, 1, 2, 3, 4].map(i => _gdaLeaf(0, -14, 15, -170 + i * 40, 6, i % 2 ? leaf : _gdaShade(leaf, 0.15))).join('') + `<path d="M-4 -2H4" stroke="#d83a3a" stroke-width="3"/>`;
    case 'pumpkin': case 'melon': return `<ellipse cx="0" cy="-16" rx="18" ry="14" fill="${c}"/><ellipse cx="0" cy="-16" rx="7" ry="14" fill="${_gdaShade(c, -0.12)}"/><path d="M0 -30l2 -6" stroke="#5a7a3a" stroke-width="3"/>`;
    case 'stalk': return `<ellipse cx="0" cy="-22" rx="7" ry="18" fill="${c}" transform="rotate(20 0 -22)"/>${_gdaLeaf(-2, -6, 26, -100, 6, '#9fc35a')}${_gdaLeaf(2, -6, 26, -60, 6, '#8ab34a')}`;
    case 'vine-pod': return `<path d="M-14 -14Q0 -34 14 -24Q2 -12 -14 -14Z" fill="${c}"/>${[-6, 0, 6].map(x => `<circle cx="${x}" cy="${-20 - x * 0.3}" r="3" fill="${_gdaShade(c, 0.2)}"/>`).join('')}`;
    case 'pole': return [-6, 0, 6].map(x => `<path d="M${x} -40q3 16 -1 34" stroke="${c2 || '#5d9e3c'}" stroke-width="4.4" fill="none" stroke-linecap="round"/>`).join('');
    case 'sprawl': return `<ellipse cx="0" cy="-16" rx="22" ry="7" fill="${c}" transform="rotate(-20 0 -16)"/><circle cx="-18" cy="-9" r="3" fill="#5a7a3a"/>`;
  }
  // fruit, berries, tree fruit, chillies...
  const n = def.cat === 'fruit' && !/melon|rhubarb/.test(def.id) ? 6 : 3;
  let s = `<path d="M-20 -8Q-20 -2 -14 -2H14Q20 -2 20 -8L18 -22H-18Z" fill="#c9a26a"/><path d="M-18 -16H18M-19 -10H19" stroke="#a8743a" stroke-width="1.2"/>`;
  if (def.id === 'rhubarb') return `<path d="M-8 -4L-4 -44M0 -4L2 -46M8 -4L8 -42" stroke="${c}" stroke-width="5" stroke-linecap="round"/>${_gdaLeaf(-4, -44, 16, -120, 8, leaf)}${_gdaLeaf(8, -42, 16, -60, 8, leaf)}`;
  for (let i = 0; i < n; i++) { const x = -12 + (i % 3) * 12, y = -24 - Math.floor(i / 3) * 8; s += /chilli/.test(def.id) ? `<path d="M${x} ${y}q4 8 0 16q-4 -8 0 -16z" fill="${c}"/>` : `<circle cx="${x}" cy="${y}" r="${n > 3 ? 5 : 8}" fill="${c}"/><circle cx="${x - 2}" cy="${y - 2}" r="1.6" fill="#ffffff" opacity="0.5"/>`; }
  return s + _gdaLeaf(10, -34, 12, -40, 4, leaf);
}
function _gdaSeed(def, o) {
  const c = _gdaHex((def.look.v && def.look.v[0]) || def.look.c || def.look.leaf), r = GARDEN_RARITY[def.rarity] || GARDEN_RARITY.common;
  const crop = def.cat === 'tree' ? _gdaTree(def, Object.assign({}, o, { stage: 4, size: 's', season: 'summer' }), (_GDA_FORMS[def.look.form] || ['tree', { kind: 'round' }])[1], { H: 26, c, c2: def.look.c2, leaf: _gdaHex(def.look.leaf || '#5a9e4b'), season: 'summer' }) : _gdaPlant(def, Object.assign({}, o, { stage: 4, size: 's', season: (def.seasons && def.seasons[0]) || 'summer', tod: 'day', thirsty: false, overgrown: false }));
  const k = Math.min(0.55, 28 / Math.max(28, 64 * (def.look.h || 0.7)));
  return `<rect x="-20" y="-58" width="40" height="56" rx="3" fill="#f4efe2" stroke="${r.col}" stroke-width="2"/><rect x="-20" y="-58" width="40" height="8" rx="3" fill="${r.col}"/><rect x="-15" y="-46" width="30" height="34" rx="2" fill="${_gdaMix(c, '#ffffff', 0.75)}"/><g transform="translate(0 -14) scale(${_gdaN(k * (def.fp > 1 ? 0.6 : 1))})">${crop}</g><path d="M-14 -7H14" stroke="#a89a80" stroke-width="1.6"/>`;
}
function _gdaTool(id, o) {
  switch (id) {
    case 'can-2': case 'can-3': case 'can-4': case 'can': { const col = id === 'can-3' ? '#c8743a' : id === 'can-4' ? '#e0b43a' : '#3f8f5a'; return `<path d="M-16 -6V-30H10V-6Z" fill="${col}"/><path d="M10 -24L26 -40" stroke="${col}" stroke-width="4"/><ellipse cx="27" cy="-41" rx="3.4" ry="4.6" fill="${_gdaShade(col, 0.2)}"/><path d="M-16 -30Q-3 -46 10 -30" stroke="${_gdaShade(col, -0.25)}" stroke-width="3" fill="none"/><rect x="-16" y="-24" width="26" height="3" fill="${_gdaShade(col, 0.2)}"/>`; }
    case 'hose': return `<circle cx="0" cy="-22" r="18" fill="none" stroke="#3f8f5a" stroke-width="5"/><circle cx="0" cy="-22" r="10" fill="none" stroke="#4fa66a" stroke-width="5"/><path d="M18 -22L26 -10" stroke="#3f8f5a" stroke-width="5"/><rect x="22" y="-12" width="8" height="10" rx="2" fill="#e8c33a"/>`;
    case 'golden-shears': return `<path d="M-4 -26L20 -46M4 -26L-20 -46" stroke="#e0b43a" stroke-width="4" stroke-linecap="round"/><circle cx="-8" cy="-16" r="6" fill="none" stroke="#c98a12" stroke-width="3.4"/><circle cx="8" cy="-16" r="6" fill="none" stroke="#c98a12" stroke-width="3.4"/><circle cx="0" cy="-26" r="2" fill="#8a6a2a"/>`;
    case 'fertiliser': return `<path d="M-16 -2L-18 -40H18L16 -2Z" fill="#a87c4f"/><path d="M-18 -40L-12 -46H12L18 -40" fill="#8a6a4a"/><rect x="-10" y="-30" width="20" height="16" rx="2" fill="#f4efe2"/>${_gdaLeaf(0, -16, 10, -110, 4, '#4fa64a')}${_gdaLeaf(0, -16, 10, -70, 4, '#5aae4a')}`;
    case 'honey': return `<rect x="-14" y="-36" width="28" height="34" rx="6" fill="#f2b01e"/><rect x="-15" y="-42" width="30" height="8" rx="2" fill="#a87c4f"/><path d="M-15 -36q4 6 8 0t8 0t8 0t6 0" fill="#c98a12"/><ellipse cx="-6" cy="-20" rx="3" ry="6" fill="#ffffff" opacity="0.35"/>`;
    case 'clover': return _gdaPetals(0, -22, 4, 2, 12, 6, '#4fb36a', 45, false) + `<path d="M0 -22q2 10 -4 18" stroke="#3f8f4a" stroke-width="2" fill="none"/>`;
  }
  return `<circle cx="0" cy="-20" r="14" fill="#c9a26a"/>`;
}
function _gdaBouquet(id, o) {
  const b = GARDEN_BOUQUETS.find(x => x.id === id);
  const palette = { 'rose-bouquet': ['#d2283c', '#f29bb6', '#fbf5ee'], 'sunflower-bunch': ['#f6b40e', '#f3d34a', '#d9671c'], 'wildflower-posy': ['#f7d417', '#e05a8a', '#fbfbf2', '#8aa0e8'], 'winter-wreath': ['#d0202b', '#1f5b34', '#f5f0f7'], 'pond-posy': ['#f7c5d8', '#f5d02c', '#6c7fd8'], 'rainbow-bouquet': ['#e0393e', '#f39c12', '#f6c445', '#4fa64a', '#4a6fe3', '#8e5bc8'] }[id] || ['#f29ac4', '#f6c445', '#9b7fd1', '#fbf6f8'];
  const n = b ? Math.min(9, b.n) : 5;
  let s = '';
  for (let i = 0; i < n; i++) { const a = -150 + i * (120 / Math.max(1, n - 1)), rad = a * Math.PI / 180; s += _gdaStem(0, -14, Math.cos(rad) * 18, -30 + Math.sin(rad) * 18, 0, '#4f8a3a', 1.6); }
  for (let i = 0; i < n; i++) { const a = -150 + i * (120 / Math.max(1, n - 1)), rad = a * Math.PI / 180; s += `<g transform="translate(${_gdaN(Math.cos(rad) * 18)} ${_gdaN(-30 + Math.sin(rad) * 18)})">${_gdaHead(id === 'rose-bouquet' ? 'rose' : id === 'sunflower-bunch' ? 'sunflower' : ['daisy', 'cup', 'pompom', 'star'][i % 4], 0, 0, id === 'sunflower-bunch' ? 9 : 6.4, palette[i % palette.length], '#f4c430', { t: i / n })}</g>`; }
  const wrap = id === 'winter-wreath' ? '#7a3a3a' : id === 'rose-bouquet' ? '#f4f1ea' : '#e8d6a0';
  return s + `<path d="M-16 -22L16 -22L4 0L-4 0Z" fill="${wrap}" stroke="${_gdaShade(wrap, -0.2)}" stroke-width="1"/><path d="M-8 -12h16" stroke="#d83a3a" stroke-width="3"/><path d="M0 -12l-6 6M0 -12l6 6" stroke="#d83a3a" stroke-width="2"/>`;
}
function _gdaTile(def, o) {
  const t = gardenTile(def.id || def) || GARDEN_TILES[0], col = o.season === 'winter' ? t.winter : o.season === 'autumn' ? t.autumn : t.c;
  return `<rect x="-32" y="-40" width="64" height="40" fill="${col}"/>`;
}

/** THE PLACEHOLDER: same contract as gardenArt (94-garden-0catalog.js header). */
function gardenArtPlaceholder(id, o) {
  o = o || {};
  const kind = o.kind || 'plant';
  try {
    if (kind === 'plant') { const p = gardenPlant(id); return p ? _gdaPlant(p, o) : ''; }
    // paths (layer 'ground') fill a 64 x 40 box like tiles: the placeholder draws them 30 high, so stretch them
    if (kind === 'decor') { const d = gardenDecor(id); return !d ? '' : d.layer === 'ground' ? `<g transform="scale(1 1.3333)">${_gdaDecor(d, o)}</g>` : _gdaDecor(d, o); }
    if (kind === 'visitor') { const v = gardenVisitor(id); return v ? _gdaVisitor(v, o) : ''; }
    if (kind === 'crop') { const p = gardenPlant(id); return p ? _gdaCrop(p, o) : _gdaTool(id, o); }
    if (kind === 'seed') { const p = gardenPlant(id); return p ? _gdaSeed(p, o) : ''; }
    if (kind === 'tool') return _gdaTool(id, o);
    if (kind === 'bouquet') return _gdaBouquet(id, o);
    if (kind === 'tile') return _gdaTile({ id }, o);
  } catch (e) { console.error('[garden art]', id, e); }
  return '';
}
/**
 * The engine's one door to the art: gardenArt (agent 'garden-art') when it draws this item, else the placeholder.
 * Cached by every input (the art is deterministic); t is quantised so the cache stays small.
 */
function _gdArt(id, o) {
  const tq = Math.round((o.t || 0) * 8) / 8;
  const key = [o.kind, id, o.stage | 0, o.season || '', o.variant | 0, o.size || 'm', tq, o.tod || '', o.r | 0, o.thirsty ? 1 : 0, o.overgrown ? 1 : 0, o.ripe ? 1 : 0, o.silhouette ? 1 : 0, o.heart == null ? '' : o.heart, o.glow ? 1 : 0, o.shw || ''].join('|');
  const hit = _GDA_CACHE.get(key);
  if (hit !== undefined) return hit;
  const oo = Object.assign({}, o, { t: tq, uid: 'g' + (gardenHash(key) % 1e8).toString(36) });
  let s = '';
  if (typeof gardenArt === 'function') {
    try { const r = gardenArt(id, oo); s = typeof r === 'string' ? r : r && r.outerHTML ? r.outerHTML : ''; } catch (e) { s = ''; }
  }
  if (!s) s = gardenArtPlaceholder(id, oo);
  if (_GDA_CACHE.size > _GDA_CACHE_MAX) _GDA_CACHE.clear();
  _GDA_CACHE.set(key, s);
  return s;
}
/** An item as a small standalone <svg> (shop, almanac, basket, seed tray). o: art options + {px}. */
function gardenIconSvg(id, o) {
  o = Object.assign({ kind: 'plant', stage: 4, size: 's', season: 'summer', tod: 'day' }, o || {});
  const box = ['plant', 'decor'].includes(o.kind) ? gardenArtBox(o.kind, id) : { x: -32, y: -60, w: 64, h: 66 };
  const px = o.px || 48;
  const frag = _gdArt(id, o);
  return `<svg class="gd-ico${o.silhouette ? ' is-sil' : ''}" viewBox="${_gdaN(box.x)} ${_gdaN(box.y)} ${_gdaN(box.w)} ${_gdaN(box.h)}" width="${px}" height="${px}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${frag}</svg>`;
}

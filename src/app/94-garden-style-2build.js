/* ============================================================
   THE LOOK OF BUILDINGS, on the stage (the tables: 94-garden-style-0rules.js). A house is drawn from its theme, so gardenBuildTheme hands _gwHouse a changed one; the others have fixed colours, so gardenBuildDress swaps them in the finished drawing.
   ============================================================ */
const _gsPaint = (i) => { const p = GARDEN_BUILD_PAINTS[i]; return p && p.c ? p.c : null; };
const _gsAt = (i, t) => (t[i] ? i : 0);
function gardenBuildTheme(id, th) {
  if (!_GS_BUILD.has(id)) return th;
  const L = gardenBuildLookOf(id); if (_gsIsBlank(L)) return th;
  const out = Object.assign({}, th), w = _gsPaint(L.w), r = _gsPaint(L.r), d = _gsPaint(L.d), a = _gsPaint(L.a);
  if (w) out.wall = w;
  if (r) out.roof = r;
  out.door = d || th.door || th.awn[0];   // (as built, a door takes the awning's first colour: it keeps that when the awning is repainted)
  if (a) out.awn = [a, th.awn[1]];
  out.awnKind = _gsAt(L.ak, GARDEN_BUILD_AWNS); out.roofKind = _gsAt(L.rk, GARDEN_BUILD_ROOFS); out.signKind = _gsAt(L.s, GARDEN_BUILD_SIGNS);
  return out;
}
/** The lines on a roof, instead of shingles. */
function gardenBuildRoofLines(kind, roof, eL, eR, cx, ridge, wTop) {
  const n = _gwN, ink = _gdaShade(roof, -0.42); let d = '';
  const row = (t) => [wTop + 3 + (ridge - wTop - 3) * t, eL + (cx - eL) * t, eR - (eR - cx) * t];
  if (kind === 1) {   // thatch: long uneven straw, a thick ridge
    for (let i = 1; i < 6; i++) { const [y, a, b] = row(i / 6); for (let x = a + (i % 2 ? 2 : 6); x < b - 3; x += 7) d += `M${n(x)} ${n(y)}l${n((x - cx) * 0.05)} 6.5`; }
    const [y2, a2, b2] = row(0.82);
    return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1" stroke-opacity="0.62" stroke-linecap="round"/><path d="M${n(a2 - 3)} ${n(y2 + 3)}L${n(cx)} ${n(ridge - 2)}L${n(b2 + 3)} ${n(y2 + 3)}Q${n(cx)} ${n(y2 - 4)} ${n(a2 - 3)} ${n(y2 + 3)}z" fill="${_gdaShade(roof, 0.12)}" stroke="${ink}" stroke-width="0.8"/>`;
  }
  if (kind === 2) {   // slates: straight courses, joints that do not line up
    for (let i = 1; i < 8; i++) { const [y, a, b] = row(i / 8); d += `M${n(a)} ${n(y)}H${n(b)}`; for (let x = a + (i % 2 ? 4 : 9); x < b - 2; x += 10) d += `M${n(x)} ${n(y)}v5`; }
    return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="0.8" stroke-opacity="0.75"/>`;
  }
  if (kind === 3) {   // tin: ribs from eave to ridge, a little rust
    for (let t = 0.08; t < 0.95; t += 0.09) { const x = eL + (eR - eL) * t; d += `M${n(x)} ${n(wTop + 3)}L${n(cx + (x - cx) * 0.12)} ${n(ridge + 4)}`; }
    return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.1" stroke-opacity="0.65"/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="0.4" stroke-opacity="0.35" transform="translate(1 0)"/><ellipse cx="${n(cx + 18)}" cy="${n(wTop - 7)}" rx="7" ry="2.4" fill="#a8603a" fill-opacity="0.42"/>`;
  }
  // fish scale: big round tiles
  for (let i = 1; i < 6; i++) { const [y, a, b] = row(i / 6), st = 13; for (let x = a + (i % 2 ? st / 2 : 0); x < b - 2; x += st) d += `M${n(x)} ${n(y)}a${st / 2} ${st / 2} 0 0 0 ${st} 0`; }
  return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1" stroke-opacity="0.75"/>`;
}
/** The awning, instead of narrow stripes. */
function gardenBuildAwning(kind, awn, ax0, ay, aw) {
  const n = _gwN, c = awn[0], c2 = awn[1], ink = _gdaShade(c, -0.34);
  if (kind === 4) {   // bunting on a line under the eaves
    const k = 7; let s = `<path d="M${n(ax0)} ${n(ay + 1)}Q${n(ax0 + aw / 2)} ${n(ay + 7)} ${n(ax0 + aw)} ${n(ay + 1)}" fill="none" stroke="#6a4a2a" stroke-width="0.9"/>`;
    for (let i = 0; i < k; i++) { const t = (i + 0.5) / k, x = ax0 + aw * t, y = ay + 1 + 6 * 4 * t * (1 - t) * 0.5 + 1; s += `<path d="M${n(x - 4.4)} ${n(y)}h8.8L${n(x)} ${n(y + 10)}z" fill="${i % 3 === 1 ? c2 : i % 3 === 2 ? _gdaShade(c, 0.22) : c}" stroke="${ink}" stroke-width="0.5"/>`; }
    return s;
  }
  const k = kind === 2 ? 3 : 6; let s = '';
  for (let i = 0; i < k; i++) s += `<path fill="${kind === 1 || kind === 3 ? c : i % 2 ? c2 : c}" stroke="${ink}" stroke-width="0.7" d="M${n(ax0 + i * aw / k)} ${n(ay)}h${n(aw / k)}l${n((i + 1 - k / 2) * 0.5)} 11q${n(-aw / (2 * k))} 5 ${n(-aw / k - 0.5)} 0z"/>`;
  if (kind === 3) for (let i = 0; i < 9; i++) s += `<circle cx="${n(ax0 + 4 + i * (aw - 8) / 8)}" cy="${n(ay + 4 + (i % 2) * 4)}" r="1.5" fill="${c2}"/>`;
  return s + `<path d="M${n(ax0 + 2)} ${n(ay + 15)}h${n(aw - 4)}v3.6h${n(-aw + 4)}z" fill="#1a1208" fill-opacity="0.14"/><path d="M${n(ax0)} ${n(ay + 2)}h${n(aw)}v1.6h${n(-aw)}z" fill="#ffffff" fill-opacity="0.26"/>`;
}
/** The board of a hanging sign, centred at 0,0; the picture goes on it. */
function gardenBuildSign(kind, ink) {
  switch (kind) {
    case 1: return `<circle cy="-1" r="11.5" fill="#efe4c8" stroke="${ink}" stroke-width="1.2"/>`;
    case 2: return `<path d="M-12 -9H12V1Q12 7 0 11Q-12 7 -12 1z" fill="#efe4c8" stroke="${ink}" stroke-width="1.2"/>`;
    case 3: return `<path d="M-15 -9H12Q16 -9 16 -6V5Q16 8 12 8H-15Q-11 4 -11 -0.5Q-11 -5 -15 -9z" fill="#efe4c8" stroke="${ink}" stroke-width="1.2"/><path d="M12 -9Q9 -6 12 -3Q15 -3 16 -6" fill="#d8c8a0" stroke="${ink}" stroke-width="0.7"/>`;
    case 4: return `<path d="M-11 -1Q-2 -13 11 -9Q17 -4 11 7Q-2 11 -11 -1zM-11 -1L-19 -8V6z" fill="#c8e0e8" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
    case 5: return `<rect x="-14" y="-9" width="28" height="17" rx="3" fill="#3a2a1a" stroke="#e0b43a" stroke-width="2"/><rect x="-11" y="-6.4" width="22" height="12" rx="1.6" fill="#efe4c8"/>`;
    default: return '';
  }
}
/** The picture on a sign. The perch is drawn to the left of its origin, so it is brought back to the middle of these boards. */
function gardenBuildSignIcon(ic, id) {
  if (ic === 'land') return '<path d="M-7 3Q-3 -5 0 -1T7 -4" fill="none" stroke="#6a8a4a" stroke-width="1.6" stroke-linecap="round"/><circle cx="2" cy="-4" r="1.8" fill="#c8352a"/>';
  const art = _gwSignIcon(ic, { uid: 'gsi' + id });
  return ic === 'fish' ? `<g transform="translate(8 0) scale(0.9)">${art}</g>` : art;
}
/** The colours of a drawing that does not have a theme, and its sign. x, y of the sign are from the foot of the building, wherever that now is. */
function gardenBuildDress(id, svg) {
  const b = _GS_BUILD.get(id); if (!b || b.house || !svg) return svg;
  const L = gardenBuildLookOf(id); if (_gsIsBlank(L)) return svg;
  let s = svg;
  for (const k of ['w', 'r', 'd', 'a']) {
    const to = _gsPaint(L[k]), from = b.swap && b.swap[k]; if (!to || !from) continue;
    from.forEach((hex, i) => { s = s.split(hex).join(i ? _gdaShade(to, i === 1 ? -0.18 : 0.14) : to); });
  }
  const m = L.s && b.sign ? /translate\((-?[\d.]+) (-?[\d.]+)\)/.exec(svg) : null, board = m && GARDEN_BUILD_SIGNS[L.s] ? gardenBuildSign(L.s, '#5a3a20') : '';
  if (board) s += `<g transform="translate(${_gwN(Number(m[1]) + b.sign[0])} ${_gwN(Number(m[2]) + b.sign[1])})">${board}${gardenBuildSignIcon(b.ic, id)}</g>`;
  return s;
}
/** Goes into a drawing's signature: a colour change does not change its length. */
function gardenBuildSig(key) { if (!_GS_BUILD.has(key)) return ''; const L = gardenBuildLookOf(key); return _GS_KEYS.map(k => L[k]).join(''); }
/** A picture of a building with a look on it, for the paint page. */
function gardenBuildPreview(id, look) {
  const W = GARDEN_WORLD, p = GARDEN_PROPS.find(x => x.id === id) || (GARDEN_LAND_OFFICE.id === id ? GARDEN_LAND_OFFICE : null); if (!p) return '';
  const sc = { tod: 'day', season: 'summer', areas: [], plants: [], decor: [] }, o = { uid: 'gsp' + id, still: true };
  _gstv.preview = { id, look };
  let s = '';
  try {
    if (id === 'garden-shop') s = _gwHouse(p, sc, o, _GW_HOUSES.shop);
    else if (id === 'tackle-shop') s = _gwHouse(p, sc, o, _GW_HOUSES.tackle);
    else if (id === 'market-stall') s = gardenBuildDress(id, _gwStall(p, sc, o));
    else if (id === 'lake-hall') s = gardenBuildDress(id, _gcwHall(p, sc, o, { ha: 60 }));
    else if (id === 'land-office') s = gardenBuildDress(id, _gldDraw('office', p, sc, o));
  } finally { _gstv.preview = null; }
  const cx = (p.x + p.w / 2) * W.cellW, by = W.sky + (p.y + p.h) * W.cellH, half = Math.max(p.w * W.cellW / 2 + 20, 84), tall = id === 'lake-hall' ? 170 : 124;
  return `<svg viewBox="${_gwN(cx - half)} ${_gwN(by - tall)} ${_gwN(half * 2)} ${tall + 10}" width="100%" height="220" aria-hidden="true" focusable="false">${s}</svg>`;
}

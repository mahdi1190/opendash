/* ============================================================
   GARDEN, THE CATCHING OVERHAUL: WHAT YOU SEE IN THE WORLD (docs/dev/CATCH_FEATURES.md). THE RULE (docs/dev/GARDEN_TOGETHER.md section 22): it shows, and friends see it, live and on a saved copy.
   Everything here is drawn from tables and from `ca` (the lake on screen: yours, or your friend's), so a visit draws what they have. Positions come from GARDEN_SPOTS, GARDEN_CATCH_CELLS, GARDEN_PROPS and the lake's water, never from numbers here.

     gardenCatchWorldArt(sc, o)   spots, today's hot spot, what is on at the lake, the rack
     gardenCatchPropArt(sc, o)    the lake hall (it grows), the lake board, the old angler (he changes as your story goes on), the smoker
     the boat                     buy it, click the boat by the mooring post: the water becomes your ground (gardenBoatGrid)
     the thing in the lake        a huge shadow on foggy nights, from the clock, so everyone there sees the same one
     decorations                  gartDefine: what bugs come to, what the lake gives you
   Calm: o.still, or reduced motion: nothing moves. Things only move while they are on (an event), or with the same gda- classes as the rest of the garden.
   ============================================================ */
function _gcwP(x, y) { const W = GARDEN_WORLD; return [x * W.cellW, W.sky + y * W.cellH]; }
const _gcwN = (v) => (Math.round(v * 10) / 10).toString();
/* ---------- the spots ---------- */
const _GCW_SPOT = Object.freeze({
  'reed-bank': (s, o) => {
    const r = gardenRand('sp-reeds'); let a = '', b = '';
    for (let i = 0; i < 16; i++) { const x = (r() - 0.5) * s.r * 62, y = (r() - 0.5) * 16, h = 26 + r() * 26, l = (r() - 0.5) * 9, st = `M${_gcwN(x)} ${_gcwN(y)}q${_gcwN(l * 0.4)} ${_gcwN(-h * 0.5)} ${_gcwN(l)} ${_gcwN(-h)}`; if (i % 2) a += st; else b += st; }
    let heads = ''; for (let i = 0; i < 6; i++) heads += `<rect x="${_gcwN((r() - 0.5) * s.r * 50)}" y="${_gcwN(-38 - r() * 16)}" width="4.6" height="12" rx="2.3"/>`;
    return `<ellipse cx="0" cy="3" rx="${_gcwN(s.r * 34)}" ry="10" fill="#0a2a1e" fill-opacity=".2"/><g class="${o.still ? '' : 'gda-sway'}"><path d="${a}" stroke="#4f8430" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="${b}" stroke="#7aaa42" stroke-width="2.1" fill="none" stroke-linecap="round"/><g fill="#7a4a2a" stroke="#4a2c18" stroke-width=".8">${heads}</g></g>`;
  },
  'lily-pads': (s, o, ca) => {   // it grows when you let fish go
    const r = gardenRand('sp-lily'), n = 6 + Math.min(10, Math.floor((Number(ca.rl) || 0) / 3)); let out = '';
    for (let i = 0; i < n; i++) { const x = (r() - 0.5) * s.r * 66 * (1 + n / 30), y = (r() - 0.5) * 26, k = 7 + r() * 5, a = r() * 6.28, q = k * 0.5, p1 = `${_gcwN(Math.cos(a + 0.3) * k)} ${_gcwN(Math.sin(a + 0.3) * q)}`, p2 = `${_gcwN(Math.cos(a - 0.3) * k)} ${_gcwN(Math.sin(a - 0.3) * q)}`; out += `<path transform="translate(${_gcwN(x)} ${_gcwN(y)})" d="M0 0L${p1}A${_gcwN(k)} ${_gcwN(q)} 0 1 1 ${p2}Z" fill="${i % 2 ? '#4f9a4a' : '#3f8a4a'}" stroke="#2f6a3a" stroke-width=".6"/>`; if (i % 3 === 0) out += `<g transform="translate(${_gcwN(x + 1)} ${_gcwN(y - 3)})"><path d="M-4 0Q0 -7 4 0Q0 2 -4 0z" fill="#f4c8d8" stroke="#d87a9a" stroke-width=".5"/><circle cy="-1" r="1.2" fill="#f2c432"/></g>`; }
    void o; return out;
  },
  'weed-bed': (s, o) => {
    const r = gardenRand('sp-weed'); let d = '';
    for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * s.r * 70, y = (r() - 0.5) * 30; d += `M${_gcwN(x)} ${_gcwN(y)}q${_gcwN(5 + r() * 6)} -6 ${_gcwN(2 + r() * 7)} -13q-6 -5 -2 -12`; }
    return `<ellipse cx="0" cy="0" rx="${_gcwN(s.r * 42)}" ry="20" fill="#1f5a3a" fill-opacity=".28"/><g class="${o.still ? '' : 'gda-sway'}"><path d="${d}" stroke="#2f7a4a" stroke-opacity=".8" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
  },
  'sunken-log': () => '<ellipse cx="0" cy="7" rx="44" ry="8" fill="#0a2a46" fill-opacity=".25"/><path d="M-40 6Q-42 -6 -30 -8L30 -14Q42 -14 42 -4Q42 4 32 4L-30 10Q-38 10 -40 6z" fill="#6a4a2e" stroke="#3a2818" stroke-width="1"/><ellipse cx="34" cy="-5" rx="8" ry="9" fill="#a87c4f" stroke="#3a2818" stroke-width="1"/><ellipse cx="34" cy="-5" rx="4" ry="5" fill="none" stroke="#6a4a2e" stroke-width="1"/><path d="M-20 -6q10 -3 22 -4M-24 2q14 -3 36 -6" stroke="#3a2818" stroke-width="1" fill="none"/><path d="M-6 -11l-4 -9M-10 -20l5 -3" stroke="#6a4a2e" stroke-width="2" stroke-linecap="round"/><path d="M-46 10q10 3 22 0M6 8q12 3 26 0" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
  'cold-spring': (s, o) => {
    let b = ''; for (let i = 0; i < 6; i++) b += `<circle class="${o.still ? '' : 'gda-bob'}" cx="${(i - 2.5) * 7}" cy="${(i % 3) * -4 - 1}" r="${1.4 + (i % 3) * 0.7}" fill="#ffffff" fill-opacity=".7" stroke="#8ad0ff" stroke-width=".5" style="animation-delay:-${i * 0.5}s"/>`;
    return `<ellipse cx="0" cy="0" rx="32" ry="14" fill="#bfe8ff" fill-opacity=".38"/><ellipse cx="0" cy="0" rx="18" ry="8" fill="#e8fbff" fill-opacity=".4"/><ellipse cx="0" cy="0" rx="26" ry="11" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1"/>${b}`;
  },
  'drop-off': (s) => {   // only the darker water: the deep reads by itself. (It had a dashed line and a buoy with a yellow flag, which nobody could read. The owner had them removed.)
    const w = s.r * 48;
    return `<path d="M${_gcwN(-w)} 7Q${_gcwN(-w)} -8 ${_gcwN(-w * 0.72)} -11Q0 -22 ${_gcwN(w * 0.72)} -11Q${_gcwN(w)} -8 ${_gcwN(w)} 7Q${_gcwN(w)} 20 ${_gcwN(w * 0.72)} 24Q0 34 ${_gcwN(-w * 0.72)} 24Q${_gcwN(-w)} 20 ${_gcwN(-w)} 7z" fill="#04233f" fill-opacity=".34"/>`;
  },
  'old-wreck': () => '<ellipse cx="0" cy="8" rx="60" ry="10" fill="#04233f" fill-opacity=".32"/><path d="M-46 4L-34 -10L34 -22L46 -14L40 6Q0 16 -40 8z" fill="#4a3424" stroke="#2a1a10" stroke-width="1.2"/><path d="M-30 -8L32 -19M-34 0L38 -10" stroke="#2a1a10" stroke-width="1.1"/><path d="M-6 -2L-16 -6L-12 4z" fill="#04233f" fill-opacity=".85"/><path d="M6 -16L14 -78" stroke="#3a2818" stroke-width="4" stroke-linecap="round"/><path d="M-2 -60L26 -66" stroke="#3a2818" stroke-width="2.6" stroke-linecap="round"/><path d="M4 -58Q-4 -40 8 -30L18 -32Q10 -44 22 -62z" fill="#d8ceb0" fill-opacity=".72"/><path d="M-52 10q12 3 24 0M18 10q12 3 28 0" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
});
const _GCW_FLAT = new Set(['weed-bed', 'drop-off', 'cold-spring', 'lily-pads']);
function _gcwGulls(o) {
  const wing = 'M0 0q-5 -5 -11 -2M0 0q5 -5 11 -2';
  return `<g class="${o.still ? '' : 'gda-bob'}"><path transform="translate(-22 -60)" d="${wing}" stroke="#f4f4f0" stroke-width="2.4" fill="none" stroke-linecap="round"/><path transform="translate(16 -74)" d="${wing}" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path transform="translate(4 -46) scale(.8)" d="${wing}" stroke="#f4f4f0" stroke-width="2.4" fill="none" stroke-linecap="round"/></g><ellipse cx="0" cy="2" rx="22" ry="7" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.1"/>`;
}
/* ---------- what is on at the lake ---------- */
function _gcwEvent(id, sc, o) {
  const L = gardenLakeWater(), [x0, y0] = _gcwP(L.x, L.y), [x1, y1] = _gcwP(L.x + L.w, L.y + L.h), w = x1 - x0, h = y1 - y0, mov = (c) => (o.still ? '' : c), r = gardenRand('ev-art|' + id); let s = '';
  switch (id) {
    case 'fog': for (let i = 0; i < 14; i++) s += `<ellipse class="${mov('gca-drift')}" style="animation-delay:-${i * 4}s" cx="${_gcwN(x0 + w * r())}" cy="${_gcwN(y0 - 16 + h * 0.55 * r())}" rx="${_gcwN(110 + r() * 110)}" ry="${_gcwN(16 + r() * 22)}" fill="#f4f6f8" fill-opacity=".5"/>`; return s;
    case 'storm': { s += `<rect x="${_gcwN(x0)}" y="${_gcwN(y0)}" width="${_gcwN(w)}" height="${_gcwN(h)}" fill="#0a1a2e" fill-opacity=".26"/><rect class="${mov('gca-flash')}" x="${_gcwN(x0)}" y="${_gcwN(y0 - 300)}" width="${_gcwN(w)}" height="${_gcwN(h + 300)}" fill="#f4f8ff" fill-opacity="0"/>`; let d = ''; for (let i = 0; i < 12; i++) { const x = x0 + r() * w, y = y0 + r() * h * 0.6; d += `M${_gcwN(x)} ${_gcwN(y)}q8 -3 18 0`; } return s + `<path d="${d}" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.4" fill="none" stroke-linecap="round"/>`; }
    case 'meteor': for (let i = 0; i < 5; i++) { const x = x0 + w * (0.1 + r() * 0.8), y = y0 - 130 + r() * 120; s += `<path class="${mov('gca-streak')}" style="animation-delay:-${_gcwN(i * 1.7)}s" d="M${_gcwN(x)} ${_gcwN(y)}l-46 22" stroke="#fff6c8" stroke-width="2" stroke-linecap="round"/>`; const rx = x0 + w * (0.1 + r() * 0.8), ry = y0 + 20 + r() * h * 0.5; s += `<path d="M${_gcwN(rx)} ${_gcwN(ry)}l-16 7" stroke="#fff6c8" stroke-opacity=".35" stroke-width="1.4" stroke-linecap="round"/>`; } return s;
    case 'blood-moon': { const cx = x0 + w * 0.68, cy = y0 - 90; return `<rect x="${_gcwN(x0)}" y="${_gcwN(y0)}" width="${_gcwN(w)}" height="${_gcwN(h)}" fill="#8a1a1a" fill-opacity=".2"/><circle cx="${_gcwN(cx)}" cy="${_gcwN(cy)}" r="34" fill="#c8402a"/><circle cx="${_gcwN(cx - 9)}" cy="${_gcwN(cy - 7)}" r="7" fill="#a83020"/><circle cx="${_gcwN(cx + 11)}" cy="${_gcwN(cy + 9)}" r="5" fill="#a83020"/><ellipse cx="${_gcwN(cx)}" cy="${_gcwN(y0 + 60)}" rx="36" ry="10" fill="#e8503a" fill-opacity=".42"/><ellipse cx="${_gcwN(cx)}" cy="${_gcwN(y0 + 84)}" rx="24" ry="6" fill="#e8503a" fill-opacity=".3"/>`; }
    case 'frenzy': for (let i = 0; i < 6; i++) { const x = x0 + w * (0.08 + r() * 0.84), y = y0 + 16 + r() * h * 0.42; s += `<ellipse class="${mov('gca-splash')}" style="animation-delay:-${_gcwN(i * 0.5)}s" cx="${_gcwN(x)}" cy="${_gcwN(y)}" rx="13" ry="4.4" fill="none" stroke="#ffffff" stroke-width="1.6"/>`; } return s;
    case 'spawning': for (let i = 0; i < 26; i++) { const x = x0 + w * (0.05 + r() * 0.9), y = y0 + 4 + r() * 36; s += `<path d="M${_gcwN(x)} ${_gcwN(y)}l5 -1l-1 1l1 1z" fill="#0a2a46" fill-opacity=".5"/>`; } for (let i = 0; i < 4; i++) s += `<ellipse class="${mov('gca-splash')}" style="animation-delay:-${i}s" cx="${_gcwN(x0 + w * (0.15 + i * 0.22))}" cy="${_gcwN(y0 + 18 + i * 3)}" rx="10" ry="3.4" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="1.2"/>`; return s;
    case 'festival': return _gcwBunting(o);
    default: return '';
  }
}
function _gcwBunting() {
  const B = GARDEN_CATCH_CELLS.bunting, [a] = _gcwP(B.x0, B.y), [b, by] = _gcwP(B.x1, B.y), cols = ['#e8503a', '#f2c432', '#4a8ab4', '#5fb43a', '#e8607a'], y = by - 44; let s = `<path d="M${_gcwN(a)} ${_gcwN(y)}Q${_gcwN((a + b) / 2)} ${_gcwN(y + 18)} ${_gcwN(b)} ${_gcwN(y)}" stroke="#6a4a2a" stroke-width="1.2" fill="none"/><path d="M${_gcwN(a)} ${_gcwN(by)}V${_gcwN(y)}M${_gcwN(b)} ${_gcwN(by)}V${_gcwN(y)}" stroke="#6e4c2a" stroke-width="3"/>`;
  for (let i = 1; i < 30; i++) { const t = i / 30, x = a + (b - a) * t, yy = y + 4 * t * (1 - t) * 18; s += `<path d="M${_gcwN(x - 6)} ${_gcwN(yy)}h12l-6 12z" fill="${cols[i % cols.length]}"/>`; }
  return s;
}
/* ---------- the rack: your best five of the day, hung up by the pier ---------- */
function _gcwRack(rk) {
  const C = GARDEN_CATCH_CELLS.rack, [cx, cy] = _gcwP(C.x, C.y); let s = `<g transform="translate(${_gcwN(cx)} ${_gcwN(cy)})"><ellipse cx="0" cy="1" rx="36" ry="5" fill="#1a1208" fill-opacity=".18"/><path d="M-32 0V-44M32 0V-44" stroke="#6e4c2a" stroke-width="3.4" stroke-linecap="round"/><path d="M-36 -44H36" stroke="#8a6238" stroke-width="3.4" stroke-linecap="round"/>`;
  rk.slice(0, 5).forEach((e, i) => { const def = gardenFishDef(e[0]); if (!def) return; const x = -24 + i * 12, k = 0.16 + Math.min(0.14, Math.sqrt(e[1]) / 90); s += `<path d="M${x} -44v5" stroke="#d8ceb0" stroke-width=".8"/><g transform="translate(${x} -30) rotate(-90) scale(${k.toFixed(2)})">${gardenFishArt(e[0], { uid: 'rk' + i })}</g>`; });
  return s + '</g>';
}
/** Spots, what is on, the rack. Pointer-events are off: a click there is still a click on the water. */
function gardenCatchWorldArt(sc, o) {
  o = o || {}; const out = []; let ca = {};
  try { ca = sc.ca || gardenCatchHere() || {}; } catch (e) { ca = {}; }
  const push = (key, z, x, svg, wide) => out.push({ key, z, x, wide, svg: `<g pointer-events="none">${svg}</g>` });   // (wide: as big as the lake, so it has no one place for the off-screen check to go by)
  const fed = new Set(ca.fd || []); let hot = null, list = [];
  try { const live = !sc.ca; if (live) { list = gardenEventsNow(); hot = gardenHotSpot(gardenHere().today); } } catch (e) { hot = null; }
  for (const s of GARDEN_SPOTS) {
    const draw = _GCW_SPOT[s.id]; if (!draw) continue;
    const [x, y] = _gcwP(s.x, s.y); let art = draw(s, o, ca);
    if (fed.has(s.id)) { const r = gardenRand('fed|' + s.id); for (let i = 0; i < 12; i++) art += `<circle cx="${_gcwN((r() - 0.5) * 50)}" cy="${_gcwN((r() - 0.5) * 18)}" r="1.1" fill="#e8c88a"/>`; }
    if (!(sc.season === 'winter' && _GCW_FLAT.has(s.id))) push('sp' + s.id + (fed.has(s.id) ? 'f' : '') + (s.id === 'lily-pads' ? Math.floor((Number(ca.rl) || 0) / 3) : ''), _GCW_FLAT.has(s.id) ? Math.ceil(s.y) - 3 : Math.ceil(s.y), s.x, `<g transform="translate(${_gcwN(x)} ${_gcwN(y)})">${art}</g>`);
    if (hot && hot.id === s.id) push('hot' + s.id, Math.ceil(s.y) + 1, s.x, `<g transform="translate(${_gcwN(x)} ${_gcwN(y)})">${_gcwGulls(o)}</g>`);
  }
  for (const id of list) { const svg = _gcwEvent(id, sc, o); if (svg) push('ev' + id, id === 'festival' ? 13 : 29, 0, svg, true); }
  if (Array.isArray(ca.sg)) { const [sx, sy] = _gcwP(ca.sg[0] + 0.5, ca.sg[1] + 1); push('sugar' + ca.sg.join('-'), ca.sg[1] + 2, ca.sg[0], `<g transform="translate(${_gcwN(sx)} ${_gcwN(sy)})"><ellipse cx="0" cy="-18" rx="5.4" ry="9" fill="#6a3a14" fill-opacity=".85"/><path d="M-3 -10q1 5 0 8M3 -11q1 4 0 6" stroke="#6a3a14" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="-1.6" cy="-21" rx="1.5" ry="2.6" fill="#ffe9a8"/></g>`); }   // the sugar on a tree: it glistens
  if (gardenWorkOwned('rowing-boat')) { const bp = GARDEN_PROPS.find(q => q.id === 'boat'); if (bp) { const [bx, by] = _gcwP(bp.x + bp.w / 2, bp.y + 0.4); push('boatflag', Math.ceil(bp.y + bp.h), bp.x, `<g transform="translate(${_gcwN(bx)} ${_gcwN(by)})"><path d="M18 2V-22" stroke="#6e4c2a" stroke-width="1.8"/><path d="M18 -22l14 4l-14 4z" fill="#d8452a"/><path d="M-10 -3L16 6M10 -3L-16 6" stroke="#5a3a20" stroke-width="2" stroke-linecap="round"/></g>`); } }   // it is yours: a flag on the mast, and oars
  if (Array.isArray(ca.rk) && ca.rk.length) push('rk' + gardenHash(JSON.stringify(ca.rk)).toString(36), Math.ceil(GARDEN_CATCH_CELLS.rack.y), GARDEN_CATCH_CELLS.rack.x, _gcwRack(ca.rk));
  return out;
}

/* ---------- the buildings ---------- */
function _gcwBase(p) { const W = GARDEN_WORLD; return [(p.x + p.w / 2) * W.cellW, W.sky + (p.y + p.h) * W.cellH - 3]; }
function _gcwHall(p, sc, o, ca) {
  const [cx, by] = _gcwBase(p), n = Number(ca.ha) || 0, tier = gardenHallTier(n), win = sc.tod === 'night' || sc.tod === 'dusk' ? '#ffe28a' : '#bfe0f0', wall = '#e8dcc0', roof = '#6a4a3a', stone = '#a8a498'; let b = `<ellipse cx="0" cy="2" rx="${44 + tier * 10}" ry="7" fill="#1a1208" fill-opacity=".2"/>`;
  const sign = `<path d="M-52 0V-24" stroke="#6e4c2a" stroke-width="3"/><rect x="-66" y="-36" width="28" height="15" rx="2" fill="#c8a46a" stroke="#6e4c2a" stroke-width="1"/><path d="M-60 -29q5 -4 9 0q-4 4 -9 0zM-51 -29l4 -3v6z" fill="#3f6f8a"/>`;
  if (tier === 0) b += `<path d="M-34 0L0 -46L34 0z" fill="#e8e0c8" stroke="#a89878" stroke-width="1.4"/><path d="M-8 0L0 -24L8 0z" fill="#5a4a3a"/><path d="M0 -46V-54" stroke="#6e4c2a" stroke-width="2"/><path d="M0 -54l10 3l-10 3z" fill="#3f6f8a"/>${sign}`;
  else if (tier === 1) b += `<path d="M-38 0V-34H38V0z" fill="#a87c4f" stroke="#6e4c2a" stroke-width="1.4"/><path d="M-44 -34L0 -60L44 -34z" fill="${roof}"/><rect x="-9" y="-24" width="18" height="24" fill="#5a3a20"/><rect x="-30" y="-26" width="14" height="12" fill="${win}" stroke="#6e4c2a"/><rect x="16" y="-26" width="14" height="12" fill="${win}" stroke="#6e4c2a"/>${sign}`;
  else {
    const w = tier === 2 ? 52 : 62, h = tier === 2 ? 52 : 60;
    b += `<path d="M${-w} 0V${-h}H${w}V0z" fill="${wall}" stroke="#a89878" stroke-width="1.4"/><path d="M${-w - 7} ${-h}L0 ${-h - 30}L${w + 7} ${-h}z" fill="${roof}"/><rect x="${-w}" y="-5" width="${w * 2}" height="5" fill="${stone}"/><rect x="-12" y="-32" width="24" height="32" rx="12" fill="#5a3a20"/>`;
    for (const dx of [-w + 12, -w + 30, w - 30, w - 12].slice(tier === 2 ? 1 : 0, tier === 2 ? 3 : 4)) b += `<rect x="${dx - 6}" y="${-h + 14}" width="12" height="22" rx="6" fill="${win}" stroke="#a89878"/>`;
    if (tier >= 3) b += `<path d="M${w - 18} ${-h}V${-h - 44}H${w + 6}V${-h}z" fill="${wall}" stroke="#a89878"/><path d="M${w - 22} ${-h - 44}L${w - 6} ${-h - 66}L${w + 10} ${-h - 44}z" fill="${roof}"/><rect x="${w - 11}" y="${-h - 34}" width="10" height="14" rx="5" fill="${win}"/>`;
    if (tier >= 4) b += `<path d="M-30 ${-h - 18}A30 28 0 0 1 30 ${-h - 18}z" fill="#7aa8a0" stroke="#4a7a72"/><path d="M0 ${-h - 46}V${-h - 66}" stroke="#3a3a42" stroke-width="2"/><path d="M0 ${-h - 66}l18 6l-18 6z" fill="#3f6f8a"/><path d="M-${w + 26} 0V-22M${w + 26} 0V-22" stroke="#3a3a42" stroke-width="3"/><circle cx="${-w - 26}" cy="-24" r="4" fill="#ffe28a"/><circle cx="${w + 26}" cy="-24" r="4" fill="#ffe28a"/>`;
  }
  return `<g transform="translate(${_gcwN(cx)} ${_gcwN(by)})">${b}</g>`;
}
function _gcwBoard(p, sc, o, ca) {
  const [cx, by] = _gcwBase(p); let iso = ''; try { iso = gardenHere().today; } catch (e) { iso = '2026-01-01'; }
  const wanted = gardenWantedFor(_gdWeekFrom(iso)), hot = gardenHotSpot(iso), rec = (ca.rc || [])[0];
  let b = '<ellipse cx="0" cy="2" rx="24" ry="4" fill="#1a1208" fill-opacity=".2"/><path d="M-20 0V-52M20 0V-52" stroke="#6e4c2a" stroke-width="3.4"/><rect x="-28" y="-66" width="56" height="44" rx="2" fill="#8a6238" stroke="#5a3a20" stroke-width="1.4"/><path d="M-30 -66L0 -74L30 -66z" fill="#6a4a3a"/>';
  // the poster
  b += '<rect x="-25" y="-63" width="24" height="30" fill="#f4ead0" stroke="#b8a678" stroke-width=".6"/><path d="M-23 -60h20M-23 -37h20" stroke="#8a3a2a" stroke-width="1.6"/>';
  if (wanted) b += `<g transform="translate(-13 -48) scale(.42)">${_gfsArt(wanted, 25)}</g>`;
  // today's forecast: a pin on the hot spot of a little map
  const L = gardenLakeWater();
  b += `<rect x="3" y="-63" width="22" height="15" fill="#d8ecf4" stroke="#8ab4c8" stroke-width=".6"/><circle cx="${_gcwN(3 + 22 * Math.min(1, (hot.x - L.x) / L.w))}" cy="${_gcwN(-63 + 15 * Math.min(1, Math.max(0, (hot.y - L.y) / L.h)))}" r="1.8" fill="#e8503a"/>`;
  // the lake's record
  b += '<rect x="3" y="-45" width="22" height="13" fill="#f4ead0" stroke="#b8a678" stroke-width=".6"/>';
  if (rec && gardenFishDef(rec[0])) b += `<g transform="translate(14 -38) scale(.13)">${gardenFishArt(rec[0], { uid: 'wr' })}</g>`;
  if (sc.tod === 'night') b += '<ellipse cx="0" cy="-44" rx="30" ry="24" fill="#ffd97a" fill-opacity=".12"/>';
  void o;
  return `<g transform="translate(${_gcwN(cx)} ${_gcwN(by)})">${b}</g>`;
}
function _gcwAngler(p, sc, o, ca) {
  const [cx, by] = _gcwBase(p), n = Number(ca.aj) || 0, gold = n >= GARDEN_ANGLER_JOBS.length;   // he changes as your story goes on: a stool, a kettle, a dog, a golden hat
  let b = '<ellipse cx="0" cy="2" rx="22" ry="4" fill="#1a1208" fill-opacity=".2"/>';
  if (n >= 13) b += '<g transform="translate(-22 0)"><ellipse cx="0" cy="-5" rx="9" ry="5" fill="#a87c4f"/><circle cx="8" cy="-10" r="4.4" fill="#a87c4f"/><path d="M10 -14l3 -3v5z" fill="#7a5636"/><path d="M-9 -7q-5 -3 -6 -7" stroke="#a87c4f" stroke-width="2" fill="none"/></g>';
  if (n >= 8) b += '<g transform="translate(17 0)"><path d="M-5 0V-8h10V0z" fill="#3a3a42"/><path d="M-5 -8Q0 -12 5 -8" fill="#59636a"/><path d="M5 -6l4 -2" stroke="#3a3a42" stroke-width="1.6"/></g>';
  b += n >= 3 ? '<path d="M-9 -12h16M-7 -12L-9 0M5 -12L7 0" stroke="#6e4c2a" stroke-width="2.4" stroke-linecap="round"/>' : '<path d="M-10 0h18v-10h-18z" fill="#8a9298" stroke="#59636a"/>';   // a bucket, then a proper stool
  b += '<path d="M-5 -12q6 0 13 2l5 10h-4l-5 -7q-7 0 -11 -3z" fill="#3f5a7a"/><path d="M-8 -30Q-8 -12 -4 -11H6Q8 -22 5 -30z" fill="#b8843a" stroke="#6e4c2a" stroke-width=".7"/>';
  b += '<circle cx="-1" cy="-36" r="7.4" fill="#e8c8a8"/><path d="M-7 -33q0 9 7 10q7 -1 7 -9q-3 3 -7 2q-4 1 -7 -3z" fill="#e8e4d8"/><circle cx="3" cy="-37" r="1" fill="#2a2018"/>';
  b += `<path d="M-11 -39q10 -6 21 0l1 2h-23z" fill="${gold ? '#f2c432' : '#e8c24a'}" stroke="#8a6a1a" stroke-width=".7"/><path d="M-7 -40q6 -9 14 0" fill="${gold ? '#f2c432' : '#d8a832'}" stroke="#8a6a1a" stroke-width=".7"/>`;
  b += `<path d="M2 -22L34 -46" stroke="#6e4c2a" stroke-width="1.8" stroke-linecap="round"/><path d="M34 -46Q40 -20 38 6" stroke="#fbfbf2" stroke-opacity=".75" stroke-width=".8" fill="none"/><path d="M2 -22l6 -2" stroke="#e8c8a8" stroke-width="3" stroke-linecap="round"/>`;
  void sc; void o;
  return `<g transform="translate(${_gcwN(cx)} ${_gcwN(by)})">${b}</g>`;
}
function _gcwSmoker(p, sc, o, ca) {
  if (!gardenWorkOwned('smoker')) return '';
  const [cx, by] = _gcwBase(p), st = Number(ca.sm) || 0;
  let b = gardenWorkArt('smoker', sc);
  if (st === 1) { for (let i = 0; i < 3; i++) b += `<circle class="${o.still ? '' : 'gca-smoke'}" style="animation-delay:-${i * 1.3}s" cx="${6 + (i % 2) * 3}" cy="${-46 - i * 9}" r="${3 + i}" fill="#e4e0dc" fill-opacity=".55"/>`; b += '<path d="M-5 -6h10" stroke="#e8782a" stroke-width="2"/>'; }
  else if (st === 2) b += '<path d="M-3 -30v-9h8v9z" fill="#f4ead0" stroke="#8a6a3a" stroke-width=".8"/><path d="M-1 -36l2 2l3 -4" stroke="#3f8f5a" stroke-width="1.2" fill="none"/>';
  return `<g transform="translate(${_gcwN(cx)} ${_gcwN(by)})">${b}</g>`;
}
/** The table of drawings gardenWorldProps asks for. */
function gardenCatchPropArt(sc, o) {
  let ca = {}; try { ca = sc.ca || gardenCatchHere() || {}; } catch (e) { ca = {}; }
  return { hall: (p) => _gcwHall(p, sc, o, ca), lakeboard: (p) => _gcwBoard(p, sc, o, ca), angler: (p) => _gcwAngler(p, sc, o, ca), smoker: (p) => _gcwSmoker(p, sc, o, ca) };
}

/* ---------- the boat: in it, the water is the ground ---------- */
const _gcb = { key: -1, g: null, hud: null };
function gardenBoatGrid() {
  const W = GARDEN_WORLD, key = gardenPierMore(); if (_gcb.g && _gcb.key === key) return _gcb.g;
  const g = new Uint8Array(W.cols * W.rows);
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { const z = gardenIsWater(x, y) ? gardenWaterZone(x, y) : ''; g[y * W.cols + x] = z && z !== 'pond' && !gardenPropWalk(x, y) ? 0 : 1; }
  _gcb.g = g; _gcb.key = key;
  return g;
}
/** The boat by the mooring post was clicked. False: you have no boat of your own, so it goes where it always went. */
function gardenBoatAsk() {
  if (gardenHas('gear:rowing-boat') < 1) return false;
  if (_gw.boat) { gardenBoatOut(); return true; }
  gardenBubbleOpen({ x: _gw.px, y: _gw.py - 1.5 }, { title: 'Your boat', items: [
    { ic: 'waves', label: 'Row out on the lake', cls: 'is-go', run: () => { gardenBubbleClose(); gardenBoatIn(); } },
    { ic: 'ship', label: 'Row to a friend', run: () => { gardenBubbleClose(); gardenPopupOpen('sail'); } },
  ] });
  return true;
}
function gardenBoatIn() {
  const C = GARDEN_CATCH_CELLS.boatIn;
  _gw.boat = true; _gw.path = []; _gw.reach = null; _gw.px = C.x; _gw.py = C.y;
  _gcaUseDirty(); _gdEmit('gear', { kind: 'boat' });
  gardenBoatHud();
  if (typeof _gdgNote === 'function') _gdgNote('Click the water to row there and cast. The arrow keys row too.', icon('ship'));
}
function gardenBoatOut() {
  const hop = () => { const C = GARDEN_CATCH_CELLS.boatOut; _gw.boat = false; _gw.path = []; _gw.reach = null; _gw.px = C.x; _gw.py = C.y; _gcaUseDirty(); _gdEmit('gear', { kind: 'boat' }); gardenBoatHud(); };
  const home = GARDEN_CATCH_CELLS.boatIn;
  if (_gwFishBusy()) _gwFishCancel();
  if (Math.hypot(_gw.px - home.x, _gw.py - home.y) < 1 || !gardenWalkToPoint(home, hop, { radius: 1 })) hop();
}
function gardenBoatHud() {
  const box = _gdgBox(); if (!box) return;
  let h = box.querySelector('.gd-boathud');
  if (!_gw.boat) { if (h) h.remove(); return; }
  if (!h) { h = document.createElement('button'); h.type = 'button'; h.className = 'gd-boathud'; h.innerHTML = `${icon('ship')}<span>Row back to shore</span>`; h.onclick = (e) => { e.stopPropagation(); gardenBoatOut(); }; box.appendChild(h); }
}
/** The hull, over your legs. Feet at 0,0, the walker's units: on every screen, from the look's `bt`. */
function gardenBoatOnFigure() {
  return '<g class="gca-boat"><ellipse cx="0" cy="7" rx="38" ry="6" fill="#0a2a46" fill-opacity=".24"/><path d="M-36 -10Q0 8 36 -10L29 4Q0 14 -29 4z" fill="#7a4a2a" stroke="#3a2010" stroke-width="1"/><path d="M-36 -10Q0 1 36 -10Q0 -4 -36 -10z" fill="#e8d0a0"/><path d="M6 -10L32 8" stroke="#5a3a20" stroke-width="2.4" stroke-linecap="round"/><path d="M-6 -10L-32 8" stroke="#5a3a20" stroke-width="2.4" stroke-linecap="round"/><path d="M-40 11q10 3 20 0M18 11q10 3 22 0" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>';
}

/* ---------- the thing in the lake: nobody has caught it. A huge shadow on foggy nights, from the clock alone, so everyone there sees the same one ---------- */
const _gct = { node: null, slot: -1, seen: 0 };
const GARDEN_THING_CLUES = Object.freeze([
  'Something very big went under the pier, and you were there.',
  'You saw it again. It is longer than the boat. The old angler looked at his boots when you asked.',
  'A third time. It does not hurry. Fish get out of its way.',
  'The old angler says his grandfather saw it too, on a foggy night, going the same way.',
  'It has come by five times now, and this washed up on the shore. You took a plaster cast of it.',
]);
function gardenThingNow(now, m) {
  if (!m || !(m.tod === 'night' || gardenEventOn('fog'))) return null;
  const C = GARDEN_CATCH_CELLS.thing, slot = Math.floor(now / 1800000), h = gardenHash('thing|' + slot); if (h % 5) return null;
  const t = (now % 1800000) / 1000; if (t > C.secs) return null;
  const L = gardenLakeWater(), a = L.x - C.out, b = L.x + L.w + C.out, u = t / C.secs, dir = (h >> 9) % 2 ? 1 : -1;
  return { slot, x: dir > 0 ? a + (b - a) * u : b - (b - a) * u, y: C.y0 + ((h >> 5) % C.yN), dir };
}
function gardenThingFrame() {
  if (typeof _gw === 'undefined' || !_gw.on || gardenFun() === 'off') return;
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  const T = gardenThingNow(m.now || Date.now(), m);   // clock-ok: the model's own clock, or now
  if (!T) { if (_gct.node) { _gct.node.remove(); _gct.node = null; } return; }
  const layer = typeof _gfsLayer === 'function' ? _gfsLayer() : null; if (!layer) return;
  if (!_gct.node || !_gct.node.isConnected) {
    const g = _gwEl('g', { class: 'gca-thing' }); let s = '<ellipse cx="0" cy="0" rx="170" ry="34" fill="#031522" fill-opacity=".5"/><ellipse cx="60" cy="0" rx="90" ry="24" fill="#031522" fill-opacity=".3"/>';
    for (let i = 0; i < 5; i++) s += `<path d="M${-150 - i * 34} 0q-16 ${12 - i * 2} -34 0q18 ${-12 + i * 2} 34 0z" fill="#031522" fill-opacity="${(0.42 - i * 0.05).toFixed(2)}"/>`;
    g.innerHTML = s; layer.appendChild(g); _gct.node = g;
  }
  const [px, py] = _gcwP(T.x, T.y);
  _gct.node.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${T.dir} 1)`);
  // seen, for a few seconds, with your own eyes: it counts once for each pass
  if (_gwInView(T.x, T.y, 0) && !_gcaOnVisit()) {
    const c = _gca(); if (c.thSlot === T.slot) return;
    _gct.seen += 1;
    if (_gct.seen >= 16) {   // (four times a second)
      _gct.seen = 0; c.thSlot = T.slot; c.th = (Number(c.th) || 0) + 1;
      if (c.th === 5) { const today = _gdToday(); _gdG().led['ca.' + today + '.' + _gdUid('')] = { d: today, k: 'ca', i: { 'decor:thing-cast': 1 }, n: 1 }; }
      _gdSave(); gardenCatchShowSoon();
      if (typeof _gdgNote === 'function') _gdgNote(c.th === 1 ? 'Did you see that?' : c.th <= GARDEN_THING_CLUES.length ? 'There it goes again. It is in the lake page now.' : 'There it goes again.', icon('eye'));
    }
  }
}

/* ---------- the note on the stage ---------- */
let _gcwNoteT = 0;
/** What is on, in plain words: a line that stays for a moment when it begins, then a small tag. Click it for the lake page. */
function gardenLakeNote(list, fresh) {
  const box = _gdgBox(); if (!box) return;
  let n = box.querySelector('.gd-lakenote');
  const e = GARDEN_LAKE_EVENTS[(list || [])[0]];
  if (!e) { if (n) n.remove(); return; }
  if (!n) { n = document.createElement('button'); n.type = 'button'; n.className = 'gd-lakenote'; n.onclick = (ev) => { ev.stopPropagation(); gardenPopupOpen('catch', { sub: 'lake', title: 'The lake' }); }; box.appendChild(n); }
  n.innerHTML = `${icon(e.icon)}<b>${esc(e.name)}</b><span>${esc(e.says)}</span>`;
  n.classList.toggle('is-full', !!fresh);
  clearTimeout(_gcwNoteT); if (fresh) _gcwNoteT = setTimeout(() => n.classList.remove('is-full'), 14000);
}

/* ---------- decorations ---------- */
(function () {
  if (typeof gartDefine !== 'function') return;
  const A = GART, P = A.P, S = A.S;
  const shadow = (rx) => P('#1a1410', A.ell(0, 1, rx, rx * 0.2), 0.18);
  gartDefine('decor:firefly-jar', { box: [48, 56], fit: 'none', draw(o) {
    const lit = o.night || o.tod === 'dusk', dots = [[-5, -14], [4, -22], [-2, -28], [6, -11]].map(([x, y], i) => P(lit ? '#f4ff8a' : '#6a6a4a', A.circ(x, y, 1.6)) + (lit ? `<g class="gda-blink" style="animation-delay:-${i * 0.6}s">${P('#f4ff8a', A.circ(x, y, 3.4), 0.5)}</g>` : '')).join('');
    return shadow(14) + (lit ? `<g class="gda-glow">${P('#e8f07a', A.ell(0, -20, 30, 28), 0.22)}</g>` : '') + `<rect x="-11" y="-36" width="22" height="34" rx="6" fill="#d8ecd8" fill-opacity=".62" stroke="#5a6a5a" stroke-width="1.5"/>` + P('#8a6a3a', A.rect(-9, -40, 18, 5)) + dots;
  } });
  gartDefine('decor:log-pile', { box: [64, 40], fit: 'none', draw() {
    const lg = (x, y) => P('#7a5636', A.ell(x, y, 10, 8)) + P('#c8a46a', A.ell(x, y, 6, 5)) + S('#7a5636', 1, `M${x - 3} ${y}a3 3 0 0 1 6 0`);
    return shadow(26) + P('#5a3e22', A.rect(-24, -24, 48, 24)) + lg(-14, -8) + lg(6, -8) + lg(20, -9) + lg(-5, -22) + lg(13, -23);
  } });
  gartDefine('decor:butterfly-bush', { box: [64, 76], fit: 'none', draw(o, r) {
    let s = shadow(22) + S('#4a3a22', 3, 'M0 0V-20M0 -14L-14 -28M0 -14L14 -30');
    for (const [x, y, k] of [[-14, -32, 16], [14, -34, 16], [0, -42, 18], [-4, -24, 14], [8, -22, 12]]) s += P('#5a8a4a', A.ell(x, y, k, k * 0.8));
    for (const [x, y] of [[-20, -48], [-6, -58], [10, -56], [22, -46], [-12, -36], [14, -38]]) s += `<g class="gda-sway" style="${A.T(r, 0, 3)}">${P('#a86ad8', `M${x - 2.6} ${y + 16}Q${x} ${y} ${x + 2.6} ${y + 16}z`)}</g>`;
    return s;
  } });
  gartDefine('decor:moth-sheet', { box: [64, 76], fit: 'none', draw(o) {
    const lit = o.night || o.tod === 'dusk';
    return shadow(24) + S('#6e4c2a', 2.6, 'M-24 0V-60M24 0V-60M-26 -58H26') + `<path d="M-22 -58H22V-8Q0 -4 -22 -8z" fill="#f4f0e6" stroke="#c8c0a8"/>` + (lit ? `<g class="gda-glow">${P('#fff4c8', A.ell(0, -32, 34, 30), 0.34)}</g>` : '') + S('#3a3a42', 2, 'M28 0V-34') + P(lit ? '#ffe28a' : '#d8d0b0', A.rect(24, -42, 8, 9));
  } });
  gartDefine('decor:boot-planter', { box: [48, 56], fit: 'none', draw(o, r) {
    let s = shadow(14) + P('#7a5a3a', 'M-9 -30H8V-12Q16 -10 16 -3V0H-9z') + P('#4a3a2a', A.rect(-10, -3, 27, 3)) + S('#4a3a2a', 1, 'M-5 -24h9M-5 -19h9');
    for (const [x, y, c] of [[-6, -36, '#e8607a'], [2, -40, '#f4f0e6'], [9, -35, '#f2c432']]) s += S('#3f8a3a', 1.4, `M${x} -28V${y}`) + `<g class="gda-sway" style="${A.T(r, 0, 3)}">${P(c, A.circ(x, y, 3.4))}${P('#fff4c8', A.circ(x, y, 1.2))}</g>`;
    return s;
  } });
  gartDefine('decor:can-chimes', { box: [48, 76], fit: 'none', draw(o, r) {
    let s = shadow(10) + S('#6a4426', 2.6, 'M-14 0V-58L14 -60');
    for (const [x, l] of [[-6, 16], [3, 22], [11, 14]]) s += `<g class="gda-sway" style="transform-origin:${x}px -59px;${A.T(r, 0, 4)}">${S('#8a8a7a', 0.7, `M${x} -59V${-59 + l}`)}<rect x="${x - 3}" y="${-59 + l}" width="6" height="9" rx="1" fill="#b8bcc0" stroke="#7a7e82" stroke-width=".6"/></g>`;
    return s;
  } });
  gartDefine('decor:sea-chest', { box: [64, 44], fit: 'none', draw() {
    return shadow(24) + P('#7a4a2a', A.rect(-24, -18, 48, 18)) + P('#8a5a34', 'M-24 -18Q0 -36 24 -18z') + S('#e8c24a', 2.2, 'M-24 -18H24M-14 0V-28M14 0V-28') + P('#e8c24a', A.rect(-4, -21, 8, 8)) + P('#ffe27a', A.ell(-10, -21, 5, 2), 0.8);
  } });
  gartDefine('decor:ship-wheel', { box: [56, 76], fit: 'none', draw() {
    let s = shadow(14) + P('#6a4426', A.rect(-5, -30, 10, 30)) + `<circle cx="0" cy="-44" r="20" fill="none" stroke="#7a4a2a" stroke-width="4.4"/><circle cx="0" cy="-44" r="4" fill="#c8a23a"/>`;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += S('#7a4a2a', 2.2, `M0 -44L${_gcwN(Math.cos(a) * 25)} ${_gcwN(-44 + Math.sin(a) * 25)}`); }
    return s;
  } });
  gartDefine('decor:figurehead', { box: [56, 84], fit: 'none', draw() {
    return shadow(18) + P('#6a4426', 'M-14 0L-6 -30H6L14 0z') + P('#3f6f8a', 'M-11 -28Q0 -22 11 -28L7 -54H-7z') + P('#c8a46a', A.circ(0, -62, 8.6)) + P('#7a4a2a', 'M-9 -64Q-11 -46 -14 -36Q-5 -44 -3 -70Q6 -74 9 -64Q2 -72 -9 -64z') + S('#3a2010', 1, 'M-2 -62h0M3 -62h0') + S('#c8a46a', 3, 'M-7 -48L-16 -42M7 -48L16 -42');
  } });
  gartDefine('decor:rosette-stand', { box: [48, 66], fit: 'none', draw(o, r) {
    let s = shadow(12) + S('#6e4c2a', 3, 'M0 0V-30');
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; s += P(i % 2 ? '#d8452a' : '#e8c24a', A.circ(_gcwN(Math.cos(a) * 11), _gcwN(-40 + Math.sin(a) * 11), 4.4)); }
    s += P('#fff4c8', A.circ(0, -40, 7)) + P('#d8452a', A.circ(0, -40, 3)) + `<g class="gda-sway" style="${A.T(r, 0, 3)}">${P('#d8452a', 'M-6 -30L-10 -14L-3 -19L0 -30z')}${P('#e8c24a', 'M6 -30L10 -14L3 -19L0 -30z')}</g>`;
    return s;
  } });
  gartDefine('decor:thing-cast', { box: [110, 44], fit: 'none', draw() {
    return P('#1a1410', A.ell(0, 1, 46, 5), 0.18) + P('#c8c4b4', A.rrect(-46, -14, 92, 14, 3)) + P('#e8e4d8', A.rrect(-46, -18, 92, 14, 3)) + P('#9a9688', 'M-36 -11Q-6 -17 22 -13L30 -10Q6 -6 -34 -8z') + P('#9a9688', 'M26 -15l8 -2l-2 3zM28 -11l9 -1l-3 3z');
  } });
  gartDefine('decor:legend-plaque', { box: [48, 66], fit: 'none', draw() {
    let s = shadow(12) + S('#6e4c2a', 3, 'M0 0V-22') + P('#6a4a2e', A.rrect(-20, -56, 40, 36, 4)) + P('#8a6238', A.rrect(-16, -52, 32, 28, 2));
    for (const [x, y, c] of [[-8, -44, '#f2c432'], [8, -44, '#dfe6f2'], [-8, -32, '#f4a22a'], [8, -32, '#5a4a3a']]) s += P(c, A.ell(x, y, 6, 3.4)) + P(c, `M${x - 5} ${y}l-3 -3v6z`);
    return s;
  } });
})();

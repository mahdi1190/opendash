/* ============================================================
   SEASONS THAT CHANGE THE MAP (docs/dev/GARDEN_TOGETHER.md section 24). Winter: the lake freezes, you can walk on it, and you fish through holes in the ice. Spring: cherry blossom. Summer: flowers in long grass. Autumn: drifts of fallen leaves.
   Each has its own kinds (`needs: {season}` in the catalogue, ids sn-*). Everything reads m.season from gardenHere(), so in a friend's garden it is their season, whatever yours is: same map, same fish, same ice, on everyone's screen.
   The ice is _GD_ICE in the catalogue: gardenPropWalk says you can stand there, gardenIsWater says it is not water (so nothing swims or casts there), gardenCellOk refuses anything built on it. The holes stay water. Fish swim under the ice from hole to hole (gardenIceSpot).
   Nothing is saved but a line of thanks the first time. Fun Off keeps the ice and the ground, because they are the land; it takes the falling things away.
   ============================================================ */
const GTG_SEASON_AT = Object.freeze({   // world cells
  trees: Object.freeze([[13.6, 12], [38.6, 12.4], [15.4, 18.8], [37, 18.6], [21, 19.6], [31.5, 19.6]]),
  patches: Object.freeze([[14.5, 13.5, 3], [37, 14.2, 3], [18, 19.4, 3.5], [33.5, 19.6, 3.5], [24.5, 13.5, 3], [29, 16.6, 2.5], [17, 15.8, 2.5]]),
  holes: Object.freeze([[16, 22], [21, 21], [29, 22], [34, 21], [38, 22], [14, 24], [19, 23], [30, 24], [37, 23], [22, 28], [28, 34], [15, 32], [38, 27], [33, 26]]),   // and one at each named spot
});
const _gtgs = { season: '', ice: false, cold: false };
const _GTG_HOLES = (() => {
  const s = new Set(GTG_SEASON_AT.holes.map(h => h[0] + ',' + h[1]));
  for (const p of GARDEN_SPOTS) s.add(Math.floor(p.x) + ',' + Math.floor(p.y));
  return [...s].map(k => k.split(',').map(Number)).filter(([x, y]) => !_GD_WALK_EXTRA.has(x + ',' + y));
})();
function _gtgHoleSet() { return new Set(_GTG_HOLES.map(h => h[0] + ',' + h[1])); }
function gardenIceSet(on) {
  if (_gtgs.ice === !!on) return;
  _gtgs.ice = !!on; _GD_ICE.clear();
  if (on) { const L = gardenLakeWater(), H = _gtgHoleSet(); for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) if (!H.has(x + ',' + y)) _GD_ICE.add(x + ',' + y); }
  if (typeof _gw !== 'undefined') { _gw.grid = null; _gw.gridKey = ''; _gw.reach = null; }
}
/** A place under the ice for this band: at a hole, and more often the hole you are at, so a line in a hole has company. null: not frozen. */
function gardenIceSpot(b, near) {
  if (!_gtgs.ice || b.rw) return null;
  const list = _GTG_HOLES.filter(([x, y]) => y >= Math.floor(b.y0) && y <= Math.floor(b.y1) && gardenIsWater(x, y)); if (!list.length) return null;
  const dist = (h, q) => Math.hypot(h[0] + 0.5 - q.x, h[1] + 0.5 - q.y), jit = () => (Math.random() - 0.5) * 0.45;
  const q = near || (typeof _gw !== 'undefined' && Math.random() < 0.6 ? { x: _gw.px, y: _gw.py } : null);
  const h = q ? list.slice().sort((a, c) => dist(a, q) - dist(c, q))[0] : list[Math.floor(Math.random() * list.length)];
  return { x: h[0] + 0.5 + jit(), y: h[1] + 0.5 + jit() };
}
/* A little faster on the ice: you slide. */
const _gtgWalkK0 = gardenLandWalkK;
gardenLandWalkK = function () { const k = _gtgWalkK0(); return _gtgs.ice && typeof _gw !== 'undefined' && gardenIceAt(_gw.px, _gw.py) ? k * 1.3 : k; };
/* ---------- what lies on the ground ---------- */
function _gtgIceSvg() {
  const W = GARDEN_WORLD, L = gardenLakeWater(), cw = W.cellW, ch = W.cellH, x = L.x * cw, y = W.sky + L.y * ch, w = L.w * cw, h = L.h * ch, n = (v) => v.toFixed(1), rnd = gardenRand('tg-ice');
  const p = GARDEN_PROPS.find(q => q.id === 'pier'), more = typeof gardenPierMore === 'function' ? gardenPierMore() : 0, px0 = p.x * cw - 2, px1 = (p.x + p.w) * cw + 2, py1 = W.sky + (p.y + p.h + more) * ch + 3;
  let s = `<defs><linearGradient id="tg-ice-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf4f8"/><stop offset="0.5" stop-color="#cfe4ee"/><stop offset="1" stop-color="#b4d2e2"/></linearGradient></defs>`;
  s += `<path fill-rule="evenodd" fill="url(#tg-ice-g)" fill-opacity="0.96" d="M${x} ${y}H${x + w}V${y + h}H${x}ZM${px0} ${y}H${px1}V${py1}H${px0}Z"/>`;
  // snow blown into long drifts, cracks, and the marks of skates
  for (let i = 0; i < 26; i++) { const ex = x + rnd() * w, ey = y + 8 + rnd() * (h - 16), rx = 24 + rnd() * 80; s += `<ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(rx)}" ry="${n(3 + rnd() * 6)}" fill="#ffffff" fill-opacity="${n(0.25 + rnd() * 0.35)}"/>`; }
  for (let i = 0; i < 16; i++) { let cx = x + 30 + rnd() * (w - 60), cy = y + 20 + rnd() * (h - 40), d = `M${n(cx)} ${n(cy)}`; for (let k = 0; k < 4; k++) { cx += (rnd() - 0.5) * 70; cy += (rnd() - 0.3) * 22; d += `L${n(cx)} ${n(cy)}`; } s += `<path d="${d}" fill="none" stroke="#7fa8bf" stroke-width="1" stroke-opacity="0.5"/>`; }
  for (let i = 0; i < 7; i++) { const cx = x + 80 + rnd() * (w - 160), cy = y + 30 + rnd() * (h - 60), r = 26 + rnd() * 50; s += `<path d="M${n(cx - r)} ${n(cy)}Q${n(cx)} ${n(cy - r * 0.45)} ${n(cx + r)} ${n(cy)}Q${n(cx)} ${n(cy + r * 0.45)} ${n(cx - r)} ${n(cy)}" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-opacity="0.7"/>`; }
  for (const [hx, hy] of _GTG_HOLES) { if (gardenPropAt(hx, hy)) continue; const cx = (hx + 0.5) * cw, cy = W.sky + (hy + 0.5) * ch; s += `<ellipse cx="${n(cx)}" cy="${n(cy + 1)}" rx="20" ry="11" fill="#f4fafc"/><ellipse cx="${n(cx)}" cy="${n(cy)}" rx="16" ry="8.5" fill="#1c4a66"/><ellipse cx="${n(cx - 3)}" cy="${n(cy - 1.6)}" rx="8" ry="3" fill="#37708f" fill-opacity="0.8"/><path d="M${n(cx - 24)} ${n(cy + 5)}l5 -3l3 4zM${n(cx + 20)} ${n(cy - 5)}l6 1l-3 4z" fill="#ffffff"/>`; }
  return s;
}
function _gtgPatchSvg(season, seed) {
  const W = GARDEN_WORLD, rnd = gardenRand('tg-p|' + seed + season), n = (v) => v.toFixed(1); let s = '';
  for (const [cx, cy, r] of GTG_SEASON_AT.patches) {
    const px = cx * W.cellW, py = W.sky + cy * W.cellH, rx = r * W.cellW, ry = r * W.cellH * 0.8;
    if (season === 'spring') { s += `<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(rx)}" ry="${n(ry)}" fill="#f8cfdc" fill-opacity="0.34"/>`; for (let i = 0; i < 46; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()), x = px + Math.cos(a) * rx * d, y = py + Math.sin(a) * ry * d; s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="2.6" ry="1.5" fill="${['#fbdce6', '#f4b4c8', '#ffffff'][i % 3]}" transform="rotate(${Math.floor(rnd() * 180)} ${n(x)} ${n(y)})"/>`; } }
    else if (season === 'summer') { s += `<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(rx)}" ry="${n(ry)}" fill="#8fb65a" fill-opacity="0.45"/>`; for (let i = 0; i < 44; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()), x = px + Math.cos(a) * rx * d, y = py + Math.sin(a) * ry * d, c = ['#e8483a', '#f4d03a', '#ffffff', '#b06ad8', '#5a9ae8'][i % 5]; s += `<path d="M${n(x)} ${n(y + 3)}v-7" stroke="#5a8a3a" stroke-width="1"/><circle cx="${n(x)}" cy="${n(y - 5)}" r="2.3" fill="${c}"/><circle cx="${n(x)}" cy="${n(y - 5)}" r="0.8" fill="#4a3a14"/>`; } }
    else if (season === 'autumn') { s += `<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(rx)}" ry="${n(ry)}" fill="#c8782a" fill-opacity="0.3"/>`; for (let i = 0; i < 60; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()), x = px + Math.cos(a) * rx * d, y = py + Math.sin(a) * ry * d; s += `<path d="M${n(x - 4)} ${n(y)}Q${n(x)} ${n(y - 3.4)} ${n(x + 4)} ${n(y)}Q${n(x)} ${n(y + 3.4)} ${n(x - 4)} ${n(y)}" fill="${['#d8682a', '#e8a83a', '#a84a1a', '#c8382a', '#d8b84a'][i % 5]}" transform="rotate(${Math.floor(rnd() * 180)} ${n(x)} ${n(y)})"/>`; } }
    else { s += `<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(rx * 1.1)}" ry="${n(ry)}" fill="#ffffff" fill-opacity="0.72"/><ellipse cx="${n(px - rx * 0.2)}" cy="${n(py - 3)}" rx="${n(rx * 0.6)}" ry="${n(ry * 0.5)}" fill="#ffffff" fill-opacity="0.8"/>`; }
  }
  return s;
}
function _gtgFallSvg(season) {
  if (season !== 'spring' && season !== 'autumn') return '';
  const W = GARDEN_WORLD, rnd = gardenRand('tg-fall' + season), cols = season === 'spring' ? ['#fbdce6', '#f4b4c8', '#ffffff'] : ['#d8682a', '#e8a83a', '#c8382a']; let s = '';
  for (let i = 0; i < 16; i++) { const t = GTG_SEASON_AT.trees[i % GTG_SEASON_AT.trees.length], x = (t[0] + rnd() * 3 - 1.5) * W.cellW, y = W.sky + t[1] * W.cellH - 70 - rnd() * 40; s += `<ellipse class="tg-fall" style="animation-delay:-${(rnd() * 9).toFixed(1)}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3" ry="1.8" fill="${cols[i % 3]}"/>`; }
  return s;
}
function _gtgGround(m) {
  const svg = typeof _gw !== 'undefined' ? _gw.svg : null, objs = svg && svg.querySelector('.gd-objects'); if (!objs || !objs.parentNode) return;
  const ice = m.season === 'winter', key = m.season + '|' + (typeof gardenPierMore === 'function' ? gardenPierMore() : 0) + '|' + gardenFun();
  let g = svg.querySelector('.tg-ground');
  if (!g || g._k !== key) {
    if (g) g.remove();
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'tg-ground'); g.setAttribute('pointer-events', 'none'); g.setAttribute('aria-hidden', 'true');
    g.innerHTML = _gtgPatchSvg(m.season, 'a') + (ice ? _gtgIceSvg() : '') + (gardenMotionOn() ? _gtgFallSvg(m.season) : ''); g._k = key;
    const school = svg.querySelector('.gd-school');
    objs.parentNode.insertBefore(g, school || objs);
  }
}
/* ---------- what stands in it ---------- */
function _gtgCherrySvg(s) {
  const A = GART, k = 0.9 + (s % 3) * 0.14; let c = `<g transform="scale(${k.toFixed(2)})">` + A.P('#000000', A.ell(0, 1, 26, 6), 0.14) + A.P('#6a4a3a', 'M-5 0C-4 -16 -7 -28 -14 -44L-8 -46L-1 -32L6 -48L12 -44C6 -30 5 -14 6 0z');
  const blobs = [[-24, -56, 22, 18, '#f4b4c8'], [22, -58, 24, 18, '#f4b4c8'], [0, -72, 30, 22, '#f8c8d8'], [-14, -64, 20, 15, '#fbdce6'], [14, -74, 18, 13, '#fbdce6'], [-30, -48, 12, 9, '#fbdce6'], [32, -50, 12, 9, '#f8c8d8']];
  c += '<g class="gda-sway">'; for (const b of blobs) c += A.P(b[4], A.ell(b[0], b[1], b[2], b[3]));
  const rnd = gardenRand('tgc' + s); for (let i = 0; i < 26; i++) c += A.P(['#ffffff', '#e88aa8'][i % 2], A.circ(-34 + rnd() * 68, -86 + rnd() * 46, 1.3));
  return c + '</g></g>';
}
function _gtgClumpSvg(s) {
  const A = GART; let c = A.P('#000000', A.ell(0, 1, 18, 4), 0.12) + '<g class="gda-sway">'; const rnd = gardenRand('tgf' + s);
  for (let i = 0; i < 7; i++) { const x = -15 + i * 5 + rnd() * 3, h = 22 + rnd() * 20; c += A.S('#5a8a3a', 1.6, `M${x.toFixed(1)} 0Q${(x + 2).toFixed(1)} ${(-h / 2).toFixed(1)} ${x.toFixed(1)} ${(-h).toFixed(1)}`); const col = ['#e8483a', '#f4d03a', '#b06ad8', '#ffffff'][i % 4]; for (let k = 0; k < 3; k++) c += A.P(col, A.circ(x + (k - 1) * 2.4, -h + (k % 2) * 2, 2.6)); c += A.P('#4a3a14', A.circ(x, -h, 1)); }
  return c + '</g>';
}
function _gtgLeafSvg(s) {
  const A = GART; let c = A.P('#000000', A.ell(0, 1, 24, 5), 0.14) + A.P('#a84a1a', A.ell(0, -6, 24, 9)) + A.P('#c8682a', A.ell(-5, -9, 17, 7)); const rnd = gardenRand('tgl' + s);
  for (let i = 0; i < 18; i++) { const x = -22 + rnd() * 44, y = -14 + rnd() * 14; c += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.4" ry="1.8" fill="${['#e8a83a', '#d8682a', '#c8382a', '#d8b84a'][i % 4]}" transform="rotate(${Math.floor(rnd() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }
  return c;
}
function _gtgMoundSvg() { const A = GART; return A.P('#000000', A.ell(0, 1, 26, 5), 0.1) + A.P('#f4fafc', A.ell(0, -5, 26, 10)) + A.P('#ffffff', A.ell(-6, -8, 16, 6)); }
function _gtgSeasonDraw(m) {
  GTG_SEASON_AT.trees.forEach(([x, y], i) => {
    const free = !gardenPropAt(Math.floor(x), Math.floor(y)) && !(m.occ && m.occ.has(Math.floor(x) + ',' + Math.floor(y)));
    const svg = !free ? '' : m.season === 'spring' ? _gtgCherrySvg(i) : m.season === 'summer' ? _gtgClumpSvg(i) : m.season === 'autumn' ? _gtgLeafSvg(i) : _gtgMoundSvg();
    gtgSprite('sn-' + i, svg ? { x, y, z: y, hit: 0, svg, cursor: '' } : null);
  });
}
function _gtgSeasonApply(m) {
  const on = m.season === 'winter', was = _gtgs.ice;
  gardenIceSet(on);
  if (was && !on && typeof _gw !== 'undefined' && gardenIsWater(Math.floor(_gw.px), Math.floor(_gw.py)) && typeof _wdIsleRowHome === 'function') _wdIsleRowHome();   // (the thaw came while you were out there: the little boat)
  if (_gtgs.season !== m.season) {
    const first = !_gtgs.season; _gtgs.season = m.season; void first;
    _gtgSeasonDraw(m);
    const y = String(m.today).slice(0, 4), k = 'tg.sw.' + m.season + '.' + y, W = _gtgW(), said = m.visit ? '' : { winter: 'The lake has frozen hard enough to walk on.', spring: 'The cherry trees have come out along the shore.', summer: 'The long grass is full of flowers.', autumn: 'The leaves are down, in drifts along the shore.' }[m.season];
    if (said && !W[k]) { W[k] = m.today; _gdSave(); setTimeout(() => wdWhisper(said, 7000), 1800); }
    if (m.visit && m.season !== gardenModel().season) setTimeout(() => wdWhisper(`It is ${m.season} in ${_gscFirst(m.visit.fid)}’s garden.`, 6000), 1800);
  }
}
function _gtgOnIceTick(m) {
  if (!_gtgs.ice || typeof _gw === 'undefined' || !gardenIceAt(_gw.px, _gw.py)) return;
  if (gpGrant('tg-ice-walk', { ticket: 5, 'mat:reed': 1 })) gpNote('You are standing on the lake. 5 tickets, and a bundle of frozen reeds');
  void m;
}
wdMod({ id: 'tg-season', fun: false, visit: true,
  begin(m) { _gtgs.season = ''; _gtgSeasonApply(m); },
  painted(m) { _gtgSeasonApply(m); _gtgGround(m); },
  tick(m) { if (m.season !== _gtgs.season) { _gtgSeasonApply(m); _gtgGround(m); } _gtgOnIceTick(m); },
  end() { gardenIceSet(false); _gtgs.season = ''; },
});

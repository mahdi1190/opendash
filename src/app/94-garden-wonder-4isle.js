/* ============================================================
   GARDEN WONDER, the island (docs/dev/HUNDRED_WORLD.md, rows 8 to 10). You can see it from the shore all day. The stones come up at dawn and at dusk; on the nights round a full moon there is a road of moonlight.
   The app goes quiet out there: the menus fade as you step on it and come back as you leave.

   The island's cells are never water (_GD_WALK_EXTRA in the catalogue), so fish keep out and the rule is the same for everyone. The way across joins that set while it is open, and the walking grid is rebuilt.
   On a visit it follows the owner's light. Caught out there when the way closes? A little boat brings you back: nobody is ever stranded.
   ============================================================ */
const WD_ISLE = WD_AT.isle, WD_ROAD = WD_AT.road;   // world cells: the table is in 94-garden-wonder-0kit.js
const _wdi = { open: '', S: {}, tick: 0, onIsle: false, lastBell: 0 };
function _wdIsleCells() { const out = []; for (let y = Math.floor(WD_ISLE.cy - WD_ISLE.ry - 1); y <= WD_ISLE.cy + WD_ISLE.ry + 1; y++) for (let x = Math.floor(WD_ISLE.cx - WD_ISLE.rx - 1); x <= WD_ISLE.cx + WD_ISLE.rx + 1; x++) { const dx = (x + 0.5 - WD_ISLE.cx) / WD_ISLE.rx, dy = (y + 0.5 - WD_ISLE.cy) / WD_ISLE.ry; if (dx * dx + dy * dy <= 1) out.push(x + ',' + y); } return out; }
function _wdRoadPts(step) { const pts = []; for (let i = 0; i < WD_ROAD.length - 1; i++) { const a = WD_ROAD[i], b = WD_ROAD[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } pts.push(WD_ROAD[WD_ROAD.length - 1]); return pts; }
/* The cells the way touches, for the routes and the cursor. They are bigger than the way itself: what the feet may stand on is the fine shape below (_wdWalkFine), so the water round the stones blocks. */
function _wdRoadCells() { const s = new Set(); for (const [x, y] of _wdRoadPts(0.25)) for (const dx of [-0.55, 0, 0.55]) for (const dy of [-0.65, 0, 0.65]) { const cy = Math.floor(y + dy); if (cy >= _WD_LAKE.y) s.add(Math.floor(x + dx) + ',' + cy); } return [...s]; }
/* The owner, 1 Nov 2026: "the collision lets you walk on water a lot, too big". How far from the line of stones your feet may be, in stage pixels: a stone is 26 wide, so this is a stone and a little. */
const WD_WAY_REACH = 15;
/** How far (stage pixels) a point is from the line of stones, and how far along it that is (leg + share). */
function _wdRoadNear(x, y) {
  const G = GARDEN_WORLD; let best = 1e9, at = 0;
  for (let i = 0; i < WD_ROAD.length - 1; i++) {
    const a = WD_ROAD[i], b = WD_ROAD[i + 1], vx = (b[0] - a[0]) * G.cellW, vy = (b[1] - a[1]) * G.cellH, wx = (x - a[0]) * G.cellW, wy = (y - a[1]) * G.cellH;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy || 1))), d = Math.hypot(wx - vx * t, wy - vy * t);
    if (d < best) { best = d; at = i + t; }
  }
  return { d: best, at };
}
function _wdInIsle(x, y) { const dx = (x - WD_ISLE.cx) / WD_ISLE.rx, dy = (y - WD_ISLE.cy) / WD_ISLE.ry; return dx * dx + dy * dy <= 1; }
/** The cell grid says what is near; this says what the feet may really stand on over the lake: the island's own shape and the line of stones. Anywhere else on the lake it has nothing to say. `m`: the routes keep this much (cells) to spare. */
function gardenWonderWalkFine(x, y, fy, m) {
  const yf = y + (fy || 0), cx = Math.floor(x), cy = Math.floor(yf);
  if (!_GD_WALK_EXTRA.has(cx + ',' + cy) || gardenIceAt(cx, cy)) return true;   // (a frozen lake: you walk where you like)
  if (_wdInIsle(x, y)) return true;
  return !!_wdi.open && _wdRoadNear(x, y).d <= WD_WAY_REACH - (m || 0) * GARDEN_WORLD.cellH;
}
/** The way over the water, as points to walk: straight along the stones, not cell to cell. null when this walk has nothing to do with it. */
function gardenWonderWayRoute(from, to) {
  if (!_wdi.open) return null;
  const side = (p) => (_wdInIsle(p.x, p.y) ? 'isle' : p.y + 0.12 >= _WD_LAKE.y && _GD_WALK_EXTRA.has(Math.floor(p.x) + ',' + Math.floor(p.y + 0.12)) && _wdRoadNear(p.x, p.y).d <= WD_WAY_REACH ? 'way' : 'land');
  const a = side(from), b = side(to);
  if (a === b && a !== 'way') return null;   // both on the shore, or both on the island: an ordinary walk
  const pt = (i) => ({ x: WD_ROAD[i][0], y: WD_ROAD[i][1] }), last = WD_ROAD.length - 1;
  const at = (p, s) => (s === 'land' ? 0 : s === 'isle' ? last : _wdRoadNear(p.x, p.y).at), A = at(from, a), B = at(to, b), out = [];
  if (a === 'land') { const r = _gwRoute(from, pt(0)); if (!r) return null; out.push(...r); }
  if (A < B) { for (let i = Math.floor(A) + 1; i <= Math.ceil(B) && i <= last; i++) if (i <= B) out.push(pt(i)); }
  else for (let i = Math.ceil(A) - 1; i >= Math.floor(B) && i >= 0; i--) if (i >= B) out.push(pt(i));
  if (b === 'land') { const r = _gwRoute(pt(0), to); if (!r) return null; out.push(...r); }
  else if (b === 'isle') { const r = _gwRoute(pt(last), to); if (!r) return null; out.push(...r); }
  else out.push({ x: to.x, y: to.y });
  return out;
}
for (const c of _wdIsleCells()) _GD_WALK_EXTRA.add(c);   // (the island is always land)
const _WD_ROADCELLS = _wdRoadCells();
function gardenWonderIsleWay(m) {
  const tod = m && m.tod;
  if (tod === 'dawn' || tod === 'dusk') return 'stones';
  if (tod === 'night' && wdMoon(_wdToday()).full) return 'moon';
  return '';
}
function _wdIsleApply(way) {
  if (_wdi.open === way) return;
  const was = _wdi.open; _wdi.open = way;
  for (const c of _WD_ROADCELLS) { if (way) _GD_WALK_EXTRA.add(c); else _GD_WALK_EXTRA.delete(c); }
  if (typeof _gw !== 'undefined') { _gw.grid = null; _gw.gridKey = ''; _gw.reach = null; }
  _wdIsleDraw();
  if (way && !was && wdNear(WD_ROAD[0][0], WD_ROAD[0][1], 9) && !_wdGet('isle')) wdWhisper(way === 'moon' ? 'There is a road on the water.' : 'Something has come up out of the lake.', 7000);
}
/* ---------- the drawing: land, a willow, a stone seat, a bell ---------- */
/** A rounded, slightly uneven shape: never a plain oval. */
function _wdBlob(rx, ry, seed, wob, oy) {
  const n = 14, p = [], f = (v) => v.toFixed(1);
  for (let i = 0; i < n; i++) { const a = i / n * 6.283, r = 1 + ((gardenHash(seed + i) % 100) / 100 - 0.5) * wob; p.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r + (oy || 0)]); }
  const mid = (a, b) => f((a[0] + b[0]) / 2) + ' ' + f((a[1] + b[1]) / 2);
  let d = 'M' + mid(p[n - 1], p[0]);
  for (let i = 0; i < n; i++) d += 'Q' + f(p[i][0]) + ' ' + f(p[i][1]) + ' ' + mid(p[i], p[(i + 1) % n]);
  return d + 'z';
}
function _wdIsleSvg() {
  const A = GART, rx = WD_ISLE.rx * 48, ry = WD_ISLE.ry * 30;
  return A.P('#b8d4dc', _wdBlob(rx + 12, ry + 7, 'isw', 0.1, 3), 0.45) + A.P('#d9c79a', _wdBlob(rx + 3, ry + 2, 'iss', 0.08, 1)) + A.P('#88ab62', _wdBlob(rx - 12, ry - 7, 'isg', 0.12, -3)) + A.P('#7a9e58', _wdBlob(rx - 74, ry - 26, 'isd', 0.2, -9)) + A.S('#a4c47e', 1, 'M-90 -6l2 -5l2 5M-40 14l2 -5l2 5M70 6l2 -5l2 5M30 -30l2 -5l2 5', 0.8);
}
function _wdWillowSvg() {
  const A = GART;
  let s = A.P('#000000', A.ell(0, 1, 24, 6), 0.14) + A.P('#6a5238', 'M-5 0C-4 -14 -6 -30 -9 -44L-1 -46L5 -44C4 -28 6 -12 6 0z');
  s += A.P('#7f9e52', A.ell(0, -62, 34, 26)) + A.P('#93b25e', A.ell(-6, -68, 22, 16));
  for (let i = 0; i < 9; i++) { const x = -30 + i * 7.5, l = 26 + (gardenHash('w' + i) % 18); s += A.S(i % 2 ? '#7f9e52' : '#6e8e48', 2.2, `M${x} -54Q${x - 2} ${-54 + l / 2} ${x + 1} ${-54 + l}`); }
  return `<g class="gda-sway">${s}</g>`;
}
function _wdStoneSeatSvg(carved) {
  const A = GART;
  return A.P('#000000', A.ell(0, 0.5, 19, 3.6), 0.16) + A.P('#8e8a80', A.rrect(-14, -9, 7, 9, 1) + A.rrect(7, -9, 7, 9, 1)) + A.P('#a8a498', A.rrect(-18, -14, 36, 6, 2)) + (carved ? A.S('#5a564c', 0.8, 'M-5 -12.6l1 2l1 -2l1 2l1 -2M3 -12.6h3M4.5 -12.6v2.4') : '');
}
function _wdBellSvg() {
  const A = GART;
  return A.P('#000000', A.ell(0, 0.5, 10, 2.6), 0.14) + A.S('#6a4a2a', 2.4, 'M-9 0L-9 -34M9 0L9 -34M-11 -33L11 -33') + A.P('#a88a3a', 'M-6 -18C-6 -27 -3 -30 0 -30C3 -30 6 -27 6 -18L8 -14L-8 -14z') + A.P('#7a6428', A.circ(0, -13, 1.6)) + A.P('#d8c06a', 'M-4 -18C-4 -24 -2 -27 0 -28C-2 -24 -2 -20 -2.4 -17z', 0.7);
}
function _wdRoadStonesSvg() {
  const G = GARDEN_WORLD, o = WD_ROAD[0]; let s = '';
  for (const [x, y] of _wdRoadPts(0.82).slice(1)) { const px = (x - o[0]) * G.cellW, py = (y - o[1]) * G.cellH; s += `<ellipse cx="${px.toFixed(1)}" cy="${(py + 2).toFixed(1)}" rx="16" ry="5.6" fill="#7fa4b0" opacity="0.5"/><ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="13" ry="4.6" fill="#a8a498"/><ellipse cx="${(px - 2).toFixed(1)}" cy="${(py - 1).toFixed(1)}" rx="7" ry="2" fill="#c8c4b6"/>`; }
  return s;
}
function _wdMoonRoadSvg() {
  const G = GARDEN_WORLD, o = WD_ROAD[0], pts = _wdRoadPts(0.4), d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${((x - o[0]) * G.cellW).toFixed(1)} ${((y - o[1]) * G.cellH).toFixed(1)}`).join('');
  let dash = '';
  for (let i = 1; i < pts.length; i += 1) { const [x, y] = pts[i], w = 8 + (gardenHash('m' + i) % 16); dash += `<path class="wd-moonlet" style="animation-delay:-${(i * 0.37).toFixed(2)}s" d="M${((x - o[0]) * G.cellW - w).toFixed(1)} ${((y - o[1]) * G.cellH).toFixed(1)}h${w * 2}" stroke="#fffbe0" stroke-width="1.6" stroke-linecap="round"/>`; }
  return `<path d="${d}" fill="none" stroke="#dff0ff" stroke-width="26" stroke-linecap="round" opacity="0.2"/><path d="${d}" fill="none" stroke="#f6fbff" stroke-width="11" stroke-linecap="round" opacity="0.36"/>${dash}`;
}
function _wdIsleDraw() {
  const S = _wdi.S; if (!_wd.on) return;
  if (S.stones) { const on = _wdi.open === 'stones'; S.stones.dataOn = on; if (S.stones.node) S.stones.node.setAttribute('class', 'gd-sprite wd-stones' + (on ? ' is-up' : '')); S.stones.hit = _wdi.open ? 0 : 1.5; }
  if (_wdi.open === 'moon') wdGlow('moon-road', _wdMoonRoadSvg(), WD_ROAD[0][0], WD_ROAD[0][1]); else wdGlowOff('moon-road');
}
function _wdOnIsle() { if (typeof _gw === 'undefined') return false; const dx = (_gw.px - WD_ISLE.cx) / WD_ISLE.rx, dy = (_gw.py - WD_ISLE.cy) / WD_ISLE.ry; return dx * dx + dy * dy <= 1.05; }
/** Back to the shore in the little boat: the way has closed behind you. */
function _wdIsleRowHome() {
  const box = _wdBox(); if (box) { const f = document.createElement('div'); f.className = 'wd-fade'; box.appendChild(f); setTimeout(() => f.remove(), 1600); }
  setTimeout(() => {
    _gw.px = WD_AT.rowHome.x; _gw.py = WD_AT.rowHome.y; _gw.path = []; _gw.then = null; _gw.cam.dirty = true; _gw.cam.snap = true;
    if (typeof _gwApplyNode === 'function') _gwApplyNode();
    if (typeof gardenLiveWalked === 'function') gardenLiveWalked({ x: _gw.px, y: _gw.py });
    if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop();
  }, 650);
}
function _wdBellRing(S) {
  wdSound([[196, 3.2, 'sine', 0.06], [392, 2.4, 'sine', 0.026, 0.01], [588, 1.4, 'sine', 0.012, 0.02]]);
  if (S.node) { const inner = S.node.firstElementChild; if (inner) { S.node.classList.remove('wd-rung'); void S.node.getBBox; S.node.classList.add('wd-rung'); } }
  wdGlow('bell-ring', '<circle class="wd-ring" r="16"/><circle class="wd-ring wd-ring2" r="16"/><circle class="wd-ring wd-ring3" r="16"/>', S.x, S.y - 0.5);
  setTimeout(() => wdGlowOff('bell-ring'), 3200);
  const today = _wdToday(), m = gardenHere();
  if (m.visit || _wdi.bell === today) return;
  _wdi.bell = today;
  setTimeout(() => {
    wdWhisper('Far off across the water, something answers.', 5000);
    if (gardenFun() !== 'off' && _gl.W && _gl.W.own) { const pool = ['grey-heron', 'heron', 'kingfisher', 'swan', 'mallard', 'duck', 'blackbird'].filter(id => GL_CREATURE.has(id)); if (pool.length) gardenLifeSpawn(pool[gardenHash(today) % pool.length]); }
  }, 2400);
}
wdMod({
  id: 'isle', fun: false, visit: true,
  begin(m) {
    const S = _wdi.S = {};
    const G = WD_ISLE;
    S.land = wdSprite({ id: 'wd-isle', x: G.cx, y: G.cy, z: G.cy - G.ry - 0.2, still: true, svg: _wdIsleSvg(), hit: 0, label: 'The island', cursor: 'hand', onAim() { wdWhisper('You can see it from here. The stones come up at dawn and at dusk.', 6000); } });
    S.willow = wdSprite({ id: 'wd-willow', x: WD_AT.willow.x, y: WD_AT.willow.y, still: true, svg: _wdWillowSvg() });
    S.seat = wdSprite({ id: 'wd-seat', x: WD_AT.seat.x, y: WD_AT.seat.y, still: true, hit: 0.75, hitUp: 8, label: 'Sit a while', cursor: 'hand', svg: _wdStoneSeatSvg(false), onClick: () => { if (typeof gardenWonderSit === 'function') gardenWonderSit({ x: WD_AT.seat.x, y: WD_AT.seat.y + 0.3 }); } });
    S.bell = wdSprite({ id: 'wd-bell', x: WD_AT.bell.x, y: WD_AT.bell.y, still: true, hit: 0.7, hitUp: 18, label: 'An old bell', cursor: 'hand', svg: _wdBellSvg(), onClick: (Sp) => _wdBellRing(Sp) });
    S.stones = wdSprite({ id: 'wd-stones', x: WD_ROAD[0][0], y: WD_ROAD[0][1], z: WD_ROAD[0][1] + 0.3, still: true, svg: _wdRoadStonesSvg(), hit: 1.5, hitUp: -60, label: 'Under the water, stones', cursor: 'hand', onAim() { wdWhisper('The stones are under the water. They come up at dawn and at dusk.', 6000); } });
    S.boat = null;
    _wdi.open = ''; _wdi.bell = ''; _wdIsleApply(gardenWonderIsleWay(m));
  },
  painted(m) { _wdIsleApply(gardenWonderIsleWay(m)); _wdIsleDraw(); },
  tick(m) {
    _wdIsleApply(gardenWonderIsleWay(m));
    const S = _wdi.S; if (!S.land) return;
    if (S.stones && S.stones.node) { const cl = 'gd-sprite wd-stones' + (_wdi.open === 'stones' ? ' is-up' : ''); if (S.stones.node.getAttribute('class') !== cl) S.stones.node.setAttribute('class', cl); }
    if (_wdi.open === 'moon') wdGlow('moon-road', _wdMoonRoadSvg(), WD_ROAD[0][0], WD_ROAD[0][1]);
    S.land.hit = !_wdi.open && !_wdOnIsle() ? 2.4 : 0;
    const on = _wdOnIsle();
    if (on !== _wdi.onIsle) {
      _wdi.onIsle = on;
      const box = _wdBox(); if (box) box.classList.toggle('wd-hush', on);
      if (on && !m.visit && !_wdGet('isle')) _wdSet('isle', _wdToday());
    }
    // the way closed behind you: a boat, on the north shore
    if (on && !_wdi.open && !S.boat) S.boat = wdSprite({ id: 'wd-rowboat', x: WD_AT.rowboat.x, y: WD_AT.rowboat.y, z: WD_AT.rowboat.y + 0.1, still: true, hit: 0.8, hitUp: 4, label: 'Row back', cursor: 'hand', svg: '<g transform="scale(0.8)"><path d="M-20 -6L20 -6L14 3L-14 3z" fill="#8a5a34"/><path d="M-17 -6L17 -6L13 -3L-13 -3z" fill="#5e3c20"/><path d="M-4 -4L10 -14" stroke="#6a4a2a" stroke-width="1.6"/></g>', onClick: () => { _wdIsleRowHome(); } });
    if (S.boat && (!on || _wdi.open)) { S.boat.remove(); S.boat = null; }
  },
  end() { const box = _wdBox(); if (box) box.classList.remove('wd-hush'); _wdi.onIsle = false; _wdi.S = {}; for (const c of _WD_ROADCELLS) _GD_WALK_EXTRA.delete(c); _wdi.open = ''; if (typeof _gw !== 'undefined') { _gw.grid = null; _gw.gridKey = ''; _gw.reach = null; } },
});

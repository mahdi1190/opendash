/* ============================================================
   SEASONS THAT CHANGE THE MAP (docs/dev/GARDEN_TOGETHER.md section 24). Winter: the lake freezes, you can walk on it, and you fish through holes in the ice. Spring: cherry blossom. Summer: flowers in long grass. Autumn: drifts of fallen leaves.
   Each has its own kinds (`needs: {season}` in the catalogue, ids sn-*). Everything reads m.season from gardenHere(), so in a friend's garden it is their season, whatever yours is: same map, same fish, same ice, on everyone's screen.
   The ice is _GD_ICE in the catalogue: gardenPropWalk says you can stand there, gardenIsWater says it is not water (so nothing swims or casts there), gardenCellOk refuses anything built on it. The holes stay water. Fish swim under the ice from hole to hole (gardenIceSpot).
   Nothing is saved but a line of thanks the first time. Fun Off keeps the ice and the ground, because they are the land; it takes the falling things away.
   ============================================================ */
const GTG_SEASON_AT = Object.freeze({   // world cells
  trees: Object.freeze([[13.6, 12], [38.6, 12.4], [15.4, 18.8], [37, 18.6], [21, 19.6]]),
  patches: Object.freeze([[14.5, 13.5, 3], [37, 14.2, 3], [18, 17.8, 3.5], [33.5, 17.8, 3.5], [24.5, 13.5, 3], [29, 16.6, 2.5], [17, 15.8, 2.5]]),
  holes: Object.freeze([[16, 22], [21, 21], [29, 22], [34, 21], [38, 22], [14, 24], [19, 23], [30, 24], [37, 23], [22, 28], [28, 34], [15, 32], [38, 27], [33, 26]]),   // and one at each named spot
});
/* The trees and patches are cells of the old garden's map. On the Vale those cells are the open moor below Cloudbreak,
   where cartoon cherry trees, leaf heaps and leaf drifts stood out of place on the painted fells (the painted world
   keeps its own seasons), so the Vale has none of them. */
function _gtgSeasonAt() { return typeof gardenIslandActive === 'function' && gardenIslandActive() ? { trees: [], patches: [] } : GTG_SEASON_AT; }
const _gtgs = { season: '', ice: false, cold: false };
const _GTG_HOLES = (() => {
  const s = new Set(GTG_SEASON_AT.holes.map(h => h[0] + ',' + h[1]));
  for (const p of GARDEN_SPOTS) s.add(Math.floor(p.x) + ',' + Math.floor(p.y));
  return [...s].map(k => k.split(',').map(Number)).filter(([x, y]) => !_GD_WALK_EXTRA.has(x + ',' + y));
})();
function _gtgHoleSet() { return new Set(_GTG_HOLES.map(h => h[0] + ',' + h[1])); }
/* ---------- which water freezes, on the Vale ----------
   Only still water: the layout's freshwater bodies with no `river` flag (a river, a brook or the gorge keeps running) and no spring
   in their id or name (a spring is warmer than the air). Read from the layout's own rows and cells, never by name, so any layout
   works. A still body keeps open water where flowing water runs in or out of it (inflowOpen cells), round anything of kind 'falls'
   (fallsOpen cells: the white water at its foot) and at a few holes for a line, seeded by the layout and the body, so every device
   and every friend sees the same ones. Land and the sea are never ice. (Until winter 2026 the island froze gardenLakeWater(), the
   sea's whole box: every cell of the map was ice, the sea could be walked on and nothing could be built anywhere.) */
const GTG_ICE = Object.freeze({ inflowOpen: 1, fallsOpen: 3, holeApart: 4, holeEvery: 40, holesMin: 2, holesMax: 8 });
let _gtgStill = null;
/** The still waters that freeze in winter: [{ id, name, cells (the body), ice (what freezes), holes }], cells as [x, y]. [] off the Vale. */
function gardenStillWaters() {
  if (!(typeof gardenIslandActive === 'function' && gardenIslandActive())) return [];
  const D = gardenIslandData(), G = gardenIslandGeometry();
  if (_gtgStill && _gtgStill.D === D && _gtgStill.G === G) return _gtgStill.list;
  const W = GARDEN_WORLD, pools = (D.freshwater || []).filter(p => p && (p.wet || Array.isArray(p.boundary)));
  const loop = p => Array.isArray(p.boundary) && p.boundary.length > 2 ? p.boundary : null;
  const inPool = (p, x, y) => loop(p) ? _gardenIslandInLoop(x, y, p.boundary) : _gardenIslandRect(x, y, p.wet);
  const cellsOf = p => {
    const L = loop(p), x0 = L ? Math.min(...L.map(q => q[0])) : p.wet.x, y0 = L ? Math.min(...L.map(q => q[1])) : p.wet.y, x1 = L ? Math.max(...L.map(q => q[0])) : p.wet.x + p.wet.w, y1 = L ? Math.max(...L.map(q => q[1])) : p.wet.y + p.wet.h, out = [];
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(W.rows, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W.cols, Math.ceil(x1)); x++) if (gardenIslandFreshwaterCell(x, y) && !gardenIslandOceanCell(x, y) && inPool(p, x + .5, y + .5)) out.push([x, y]);
    return out;
  };
  const still = p => !p.river && !/spring/i.test(String(p.id || '') + ' ' + String(p.name || ''));
  const flowing = new Set(); for (const p of pools) if (!still(p)) for (const [x, y] of cellsOf(p)) flowing.add(x + ',' + y);
  // anything of kind 'falls' the layout stands, or places through its data: its footprint, [x0, y0, x1, y1] in cells
  const falls = [], fixed = D.static || [];
  if (typeof gardenKindOf === 'function') {
    for (const r of fixed) if (r && gardenKindOf({ id: r.id, art: r.art, kind: r.kind }) === 'falls') falls.push([r.x, r.y, r.x + (r.w || 1), r.y + (r.h || 1)]);
    for (const r of typeof gardenThingsPlaced === 'function' ? gardenThingsPlaced() : []) {
      if (!r || gardenKindOf({ id: r.id, art: r.art, kind: r.kind }) !== 'falls') continue;
      const on = r.on && fixed.find(q => q.id === r.on), at = Array.isArray(r.at) ? r.at : [0, 0], w = Number(r.w) || 1, h = Number(r.h) || 1;
      const x = on ? on.x + (on.w || 1) / 2 + (Number(at[0]) || 0) : Number(r.x), y = on ? on.y + (on.h || 1) + (Number(at[1]) || 0) : Number(r.y);   // (a placed thing's x, y is its foot's middle)
      if (Number.isFinite(x) && Number.isFinite(y)) falls.push([x - w / 2, y - h, x + w / 2, y]);
    }
  }
  const nearFalls = (x, y) => falls.some(([a, b, c, d]) => Math.hypot(Math.max(a - x, 0, x - c), Math.max(b - y, 0, y - d)) <= GTG_ICE.fallsOpen);
  const nearFlow = (x, y) => { const k = GTG_ICE.inflowOpen; for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) if (flowing.has((x + dx) + ',' + (y + dy))) return true; return false; };
  const list = [];
  for (const p of pools) {
    if (!still(p)) continue;
    const cells = cellsOf(p); if (!cells.length) continue;
    const ice = cells.filter(([x, y]) => !nearFlow(x, y) && !nearFalls(x + .5, y + .5)), frozen = new Set(ice.map(([x, y]) => x + ',' + y));
    // holes for a line: frozen all round (a cell and a half from the bank and from open water), apart from each other
    const can = ice.filter(([x, y]) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!frozen.has((x + dx) + ',' + (y + dy))) return false; return true; });
    const rnd = gardenRand('ice-holes|' + D.id + '|' + p.id); for (let i = can.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [can[i], can[j]] = [can[j], can[i]]; }
    const want = Math.max(GTG_ICE.holesMin, Math.min(GTG_ICE.holesMax, Math.round(ice.length / GTG_ICE.holeEvery))), holes = [];
    for (const c of can) { if (holes.length >= want) break; if (holes.every(h => Math.hypot(h[0] - c[0], h[1] - c[1]) >= GTG_ICE.holeApart)) holes.push(c); }
    const open = new Set(holes.map(h => h[0] + ',' + h[1]));
    list.push(Object.freeze({ id: p.id, name: p.name || '', cells: Object.freeze(cells), ice: Object.freeze(ice.filter(([x, y]) => !open.has(x + ',' + y))), holes: Object.freeze(holes) }));
  }
  _gtgStill = { D, G, list: Object.freeze(list) };
  return _gtgStill.list;
}
function gardenIceSet(on) {
  if (_gtgs.ice === !!on) return;
  _gtgs.ice = !!on; _GD_ICE.clear();
  if (on && typeof gardenIslandActive === 'function' && gardenIslandActive()) { for (const w of gardenStillWaters()) for (const [x, y] of w.ice) _GD_ICE.add(x + ',' + y); }   // (the Vale: still water only)
  else if (on) { const L = gardenLakeWater(), H = _gtgHoleSet(); for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) if (!H.has(x + ',' + y)) _GD_ICE.add(x + ',' + y); }
  if (typeof _gw !== 'undefined') { _gw.grid = null; _gw.gridKey = ''; _gw.reach = null; }
}
/** A place under the ice for this band: at a hole, and more often the hole you are at, so a line in a hole has company. null: not frozen.
 *  (On the Vale the sea never freezes and a frozen pond's fish keep to its own open water by the pond's band rules: null there.) */
function gardenIceSpot(b, near) {
  if (!_gtgs.ice || b.rw || typeof gardenIslandActive === 'function' && gardenIslandActive()) return null;
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
function _gtgIceSvg(m) {
  const W = GARDEN_WORLD, L = gardenLakeWater(), cw = W.cellW, ch = W.cellH, x = L.x * cw, y = W.sky + L.y * ch, w = L.w * cw, h = L.h * ch, n = (v) => v.toFixed(1), rnd = gardenRand('tg-ice');
  let deckHoles = '';
  for (const p of gardenPierDecks(m && m.works || [], m || null)) { const px0 = Math.max(x, p.x * cw - 2), px1 = Math.min(x + w, (p.x + p.w) * cw + 2), py0 = p.side === 'south' ? y : Math.max(y, W.sky + p.y * ch), py1 = Math.min(y + h, W.sky + (p.y + p.h) * ch + 3); if (px1 > px0 && py1 > py0) deckHoles += `M${px0} ${py0}H${px1}V${py1}H${px0}Z`; }
  let s = `<defs><linearGradient id="tg-ice-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf4f8"/><stop offset="0.5" stop-color="#cfe4ee"/><stop offset="1" stop-color="#b4d2e2"/></linearGradient></defs>`;
  s += `<path fill-rule="evenodd" fill="url(#tg-ice-g)" fill-opacity="0.96" d="M${x} ${y}H${x + w}V${y + h}H${x}Z${deckHoles}"/>`;
  // snow blown into long drifts, cracks, and the marks of skates
  for (let i = 0; i < 26; i++) { const ex = x + rnd() * w, ey = y + 8 + rnd() * (h - 16), rx = 24 + rnd() * 80; s += `<ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(rx)}" ry="${n(3 + rnd() * 6)}" fill="#ffffff" fill-opacity="${n(0.25 + rnd() * 0.35)}"/>`; }
  for (let i = 0; i < 16; i++) { let cx = x + 30 + rnd() * (w - 60), cy = y + 20 + rnd() * (h - 40), d = `M${n(cx)} ${n(cy)}`; for (let k = 0; k < 4; k++) { cx += (rnd() - 0.5) * 70; cy += (rnd() - 0.3) * 22; d += `L${n(cx)} ${n(cy)}`; } s += `<path d="${d}" fill="none" stroke="#7fa8bf" stroke-width="1" stroke-opacity="0.5"/>`; }
  for (let i = 0; i < 7; i++) { const cx = x + 80 + rnd() * (w - 160), cy = y + 30 + rnd() * (h - 60), r = 26 + rnd() * 50; s += `<path d="M${n(cx - r)} ${n(cy)}Q${n(cx)} ${n(cy - r * 0.45)} ${n(cx + r)} ${n(cy)}Q${n(cx)} ${n(cy + r * 0.45)} ${n(cx - r)} ${n(cy)}" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-opacity="0.7"/>`; }
  for (const [hx, hy] of _GTG_HOLES) { if (gardenPropAt(hx, hy)) continue; const cx = (hx + 0.5) * cw, cy = W.sky + (hy + 0.5) * ch; s += `<ellipse cx="${n(cx)}" cy="${n(cy + 1)}" rx="20" ry="11" fill="#f4fafc"/><ellipse cx="${n(cx)}" cy="${n(cy)}" rx="16" ry="8.5" fill="#1c4a66"/><ellipse cx="${n(cx - 3)}" cy="${n(cy - 1.6)}" rx="8" ry="3" fill="#37708f" fill-opacity="0.8"/><path d="M${n(cx - 24)} ${n(cy + 5)}l5 -3l3 4zM${n(cx + 20)} ${n(cy - 5)}l6 1l-3 4z" fill="#ffffff"/>`; }
  return s;
}
/** The outlines of a set of cells ('x,y'): closed loops of cell corners, [[x, y], ...] in cells. */
function _gtgLoops(cells) {
  const edges = new Map(), at = (x, y) => cells.has(x + ',' + y), add = (x, y, xx, yy) => { const k = x + ',' + y; (edges.get(k) || edges.set(k, []).get(k)).push([xx, yy]); };
  for (const k of cells) { const [x, y] = k.split(',').map(Number); if (!at(x, y - 1)) add(x, y, x + 1, y); if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1); if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1); if (!at(x - 1, y)) add(x, y + 1, x, y); }
  const loops = [];
  while (edges.size) {
    const start = edges.keys().next().value; let key = start, guard = cells.size * 8 + 8; const pts = [];
    do { pts.push(key.split(',').map(Number)); const list = edges.get(key); if (!list || !list.length) break; const next = list.pop(); if (!list.length) edges.delete(key); key = next.join(','); } while (key !== start && guard-- > 0);
    if (pts.length > 2) loops.push(pts);
  }
  return loops;
}
/** A closed loop with its corners cut (Chaikin, k times): a run of cell edges becomes a soft edge. */
function _gtgSoft(pts, k) { let p = pts; for (let r = 0; r < k; r++) { const o = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } p = o; } return p; }
/* The Vale's frozen still water (gardenStillWaters): one sheet for each body, cut to its own bank (the contour the painted
   water, the feet and the fish use), with its open water left open, so the painted water shows through: where flowing water
   runs in or out and at a fall's foot (edged with broken ice), and each hole, with a collar of snow and a few chips. Blown snow,
   cracks and the marks of skates lie only on ice, seeded by the body, so everyone sees the same ice. The native world clips to
   convex shapes only, so a bank is given to it as triangles; only the sheet and its edges are clipped, everything else lies
   on ice with ice all round. */
function _gtgIceSvgVale() {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, n = (v) => v.toFixed(1), X = (x) => n(x * cw), Y = (y) => n(W.sky + y * ch);
  const path = (pts) => 'M' + pts.map(q => X(q[0]) + ' ' + Y(q[1])).join('L') + 'Z';
  const oval = (cx, cy, rx, ry) => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0Z`;
  const cut3 = typeof Phaser !== 'undefined' && Phaser.Geom && Phaser.Geom.Polygon && Phaser.Geom.Polygon.Earcut;
  const clipOf = (pts) => { if (!cut3) return `<path d="${path(pts)}"/>`; const idx = cut3(pts.flatMap(q => [q[0], q[1]])); let s = ''; for (let i = 0; i + 2 < idx.length; i += 3) s += `<path d="${path([pts[idx[i]], pts[idx[i + 1]], pts[idx[i + 2]]])}"/>`; return s || `<path d="${path(pts)}"/>`; };
  const rows = new Map(((typeof gardenIslandData === 'function' && gardenIslandData().freshwater) || []).map(p => [p.id, p]));
  let defs = '<linearGradient id="tg-ice-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef6f9"/><stop offset="0.55" stop-color="#d3e6ee"/><stop offset="1" stop-color="#bcd7e4"/></linearGradient>', s = '';
  for (const w of gardenStillWaters()) {
    const p = rows.get(w.id); if (!p || !w.ice.length) continue;
    const bank = Array.isArray(p.boundary) && p.boundary.length > 2 ? p.boundary : [[p.wet.x, p.wet.y], [p.wet.x + p.wet.w, p.wet.y], [p.wet.x + p.wet.w, p.wet.y + p.wet.h], [p.wet.x, p.wet.y + p.wet.h]];
    const xs = bank.map(q => q[0]), ys = bank.map(q => q[1]), x0 = Math.min(...xs) - .2, y0 = Math.min(...ys) - .2, x1 = Math.max(...xs) + .2, y1 = Math.max(...ys) + .2;
    const id = 'tg-ice-c-' + String(w.id).replace(/[^a-z0-9-]/gi, ''), key = (c) => c[0] + ',' + c[1], ice = new Set(w.ice.map(key)), holes = new Set(w.holes.map(key));
    const body = new Set(w.cells.map(key)), open = new Set(w.cells.map(key).filter(k => !ice.has(k) && !holes.has(k)));
    // (open water reaches the bank: the cells beside it that are only partly in the pond go with it, and the bank clips them)
    for (const k of [...open]) { const [x, y] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!body.has((x + dx) + ',' + (y + dy))) open.add((x + dx) + ',' + (y + dy)); }
    const edgeLoops = _gtgLoops(open).map(l => _gtgSoft(l, 2));
    defs += `<clipPath id="${id}">${clipOf(bank)}</clipPath>`;
    let cut = edgeLoops.map(path).join('');
    for (const [hx, hy] of w.holes) cut += oval((hx + .5) * cw, W.sky + (hy + .5) * ch, cw * .4, ch * .4);
    let g = `<path fill-rule="evenodd" fill="url(#tg-ice-g)" fill-opacity="0.97" d="M${X(x0)} ${Y(y0)}H${X(x1)}V${Y(y1)}H${X(x0)}Z${cut}"/>`;
    g += `<path d="${path(bank)}" fill="none" stroke="#ffffff" stroke-width="5" stroke-opacity="0.5"/>`;   // (snow banked against the shore)
    for (const l of edgeLoops) g += `<path d="${path(l)}" fill="none" stroke="#a9cbd9" stroke-width="6" stroke-opacity="0.45"/><path d="${path(l)}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-opacity="0.85"/>`;   // (thin ice, then its broken edge)
    s += `<g clip-path="url(#${id})">${g}</g>`; g = '';
    // marks lie on ice with ice all round, so nothing is drawn over the open water or the bank
    const inner = w.ice.filter(([x, y]) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!ice.has((x + dx) + ',' + (y + dy))) return false; return true; }), rnd = gardenRand('tg-ice|' + w.id), pick = () => inner[Math.floor(rnd() * inner.length)];
    if (inner.length) {
      for (let i = 0; i < Math.max(2, Math.round(inner.length / 6)); i++) { const [cx, cy] = pick(); g += `<ellipse cx="${n((cx + .5 + (rnd() - .5) * .4) * cw)}" cy="${n(W.sky + (cy + .5 + (rnd() - .5) * .5) * ch)}" rx="${n(cw * (.35 + rnd() * .75))}" ry="${n(2.5 + rnd() * 4)}" fill="#ffffff" fill-opacity="${n(.3 + rnd() * .35)}"/>`; }   // (blown snow)
      for (let i = 0; i < Math.max(1, Math.round(inner.length / 12)); i++) { let [cx, cy] = pick(); cx = (cx + .5) * cw; cy = W.sky + (cy + .5) * ch; let d = `M${n(cx)} ${n(cy)}`; for (let k = 0; k < 3; k++) { cx += (rnd() - .5) * cw * .8; cy += (rnd() - .4) * ch * .55; d += `L${n(cx)} ${n(cy)}`; } g += `<path d="${d}" fill="none" stroke="#7fa8bf" stroke-width="1" stroke-opacity="0.5"/>`; }
      if (inner.length >= 12) for (let i = 0; i < Math.round(inner.length / 30) + 1; i++) { const [cx0, cy0] = pick(), cx = (cx0 + .5) * cw, cy = W.sky + (cy0 + .5) * ch, r = cw * (.5 + rnd() * .7); g += `<path d="M${n(cx - r)} ${n(cy)}Q${n(cx)} ${n(cy - r * .4)} ${n(cx + r)} ${n(cy)}Q${n(cx)} ${n(cy + r * .4)} ${n(cx - r)} ${n(cy)}" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-opacity="0.7"/>`; }   // (where somebody skated a turn)
    }
    for (const [hx, hy] of w.holes) {   // a collar of snow round the hole, and the chips of ice cut out of it
      const cx = (hx + .5) * cw, cy = W.sky + (hy + .5) * ch;
      g += `<path fill-rule="evenodd" fill="#f4fafc" d="${oval(cx, cy + 1, cw * .55, ch * .56)}${oval(cx, cy, cw * .4, ch * .4)}"/><path d="M${n(cx - cw * .5)} ${n(cy + ch * .2)}l5 -3l3 4zM${n(cx + cw * .42)} ${n(cy - ch * .2)}l6 1l-3 4z" fill="#ffffff"/>`;
    }
    s += g;
  }
  return s ? `<defs>${defs}</defs>${s}` : '';
}
/* What the season leaves on the ground: scattered, thicker towards the middle, with no flat colour under it (a big see-through oval showed as a hard-edged disc over the paths; the owner, 1 Nov 2026). One path for each colour, not a node for each leaf: summer alone was 900 nodes. */
function _gtgPatchSvg(season, seed) {
  const W = GARDEN_WORLD, rnd = gardenRand('tg-p|' + seed + season), n = (v) => v.toFixed(1), by = new Map();
  const native = !!(window.GardenNative && GardenNative.scene());
  const add = (c, d) => by.set(c, (by.get(c) || '') + d);
  const leaf = (x, y, l, w) => { const a = rnd() * 3.142, cx = Math.cos(a), sx = Math.sin(a); return `M${n(x - cx * l)} ${n(y - sx * l)}Q${n(x + sx * w)} ${n(y - cx * w)} ${n(x + cx * l)} ${n(y + sx * l)}Q${n(x - sx * w)} ${n(y + cx * w)} ${n(x - cx * l)} ${n(y - sx * l)}z`; };
  const dot = (x, y, r) => `M${n(x - r)} ${n(y)}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`;
  let s = '', i = 0;
  if (season === 'winter') s += '<defs><radialGradient id="tg-snow"><stop offset="0" stop-color="#ffffff" stop-opacity=".85"/><stop offset=".65" stop-color="#ffffff" stop-opacity=".6"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>';
  for (const [cx, cy, r] of _gtgSeasonAt().patches) {
    const px = cx * W.cellW, py = W.sky + cy * W.cellH, rx = r * W.cellW, ry = r * W.cellH * 0.8;
    const at = () => { const a = rnd() * 6.283, d = rnd(); return [px + Math.cos(a) * rx * d, py + Math.sin(a) * ry * d]; };
    if (season === 'spring') for (let k = 0; k < 46; k++, i++) { const [x, y] = at(); add(['#fbdce6', '#f4b4c8', '#ffffff'][i % 3], leaf(x, y, 2.6, 1.5)); }
    else if (season === 'summer') for (let k = 0; k < 44; k++, i++) { const [x, y] = at(); add('stem', `M${n(x)} ${n(y + 3)}v-7`); add(['#e8483a', '#f4d03a', '#ffffff', '#b06ad8', '#5a9ae8'][i % 5], dot(x, y - 5, 2.3)); add('#4a3a14', dot(x, y - 5, 0.8)); }
    else if (season === 'autumn') for (let k = 0; k < (native ? 32 : 60); k++, i++) {
      const [x, y] = at(), cell = native && typeof gardenLandCell === 'function' ? gardenLandCell(Math.floor(x / W.cellW), Math.floor((y - W.sky) / W.cellH)) : null;
      if (cell && (cell.lane || cell.trail) && i % 4) continue;
      add((native ? ['#b1874f', '#c3a05e', '#976c47', '#ad7950', '#b9ab69'] : ['#d8682a', '#e8a83a', '#a84a1a', '#c8382a', '#d8b84a'])[i % 5], leaf(x, y, native ? 2.8 : 4, native ? 1.5 : 3.4));
    }
    else s += `<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(rx * 1.25)}" ry="${n(ry * 1.15)}" fill="url(#tg-snow)"/>`;
  }
  for (const [c, d] of by) s += c === 'stem' ? `<path d="${d}" stroke="#5a8a3a" stroke-width="1" fill="none"/>` : `<path d="${d}" fill="${c}"${native && season === 'autumn' ? ' fill-opacity=".72"' : ''}/>`;
  return s;
}
function _gtgFallSvg(season) {
  if (season !== 'spring' && season !== 'autumn') return '';
  const W = GARDEN_WORLD, rnd = gardenRand('tg-fall' + season), cols = season === 'spring' ? ['#fbdce6', '#f4b4c8', '#ffffff'] : ['#d8682a', '#e8a83a', '#c8382a']; let s = '';
  const trees = _gtgSeasonAt().trees; if (!trees.length) return '';
  for (let i = 0; i < 8; i++) { const t = trees[i % trees.length], x = (t[0] + rnd() * 3 - 1.5) * W.cellW, y = W.sky + t[1] * W.cellH - 70 - rnd() * 40; s += `<ellipse class="tg-fall" style="animation-delay:-${(rnd() * 9).toFixed(1)}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3" ry="1.8" fill="${cols[i % 3]}"/>`; }
  return s;
}
function _gtgGround(m) {
  const svg = typeof _gw !== 'undefined' ? _gw.svg : null, objs = svg && svg.querySelector('.gd-objects'); if (!objs || !objs.parentNode) return;
  const ice = m.season === 'winter', key = m.season + '|' + gardenPierDecks(m.works || [], m).map(p => [p.id, p.x, p.y, p.w, p.h].join(',')).join(';') + '|' + gardenFun();
  let g = svg.querySelector('.tg-ground');
  if (!g || g._k !== key) {
    if (g) g.remove();
    g = gardenSceneElement('g'); g.setAttribute('class', 'tg-ground'); g.setAttribute('pointer-events', 'none'); g.setAttribute('aria-hidden', 'true');
    // (the old garden's ice sheet is its lake's box: over the Vale that box is the whole map, so there each frozen pond has its own)
    g.innerHTML = '<g class="tg-ground-patches">' + _gtgPatchSvg(m.season, 'a') + '</g>' + (ice ? typeof gardenIslandActive === 'function' && gardenIslandActive() ? _gtgIceSvgVale() : _gtgIceSvg(m) : '') + (gardenMotionOn() ? _gtgFallSvg(m.season) : ''); g._k = key;
    const school = svg.querySelector('.gd-school');
    objs.parentNode.insertBefore(g, school || objs);
    // (the Vale's ice lies on the painted water, -9590 and its glints, and under every board, bank and thing that stands on it)
    if (ice && g.target && g.target.setDepth && typeof gardenIslandActive === 'function' && gardenIslandActive()) { g.target.setDepth(-9580); const pi = g.parentNode && g.parentNode._inner; if (pi && pi.sort) pi.sort('depth'); }
    const patches = g.querySelector('.tg-ground-patches');
    if (window.GardenNative && GardenNative.active() && window.GardenNativeArt && patches && patches.target && patches.scene === GardenNative.scene()) {
      // Only this authored static branch is cached. Ice and falling petals
      // remain live siblings; the shared policy handles zoom/crop and limits.
      // staticOnly partitioning skips groups with fewer than four Graphics.
      GardenNativeArt.cache(patches, { staticOnly: false, quality: 1, adaptive: true, crop: true, tileSize: 512 });
    }
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
  const trees = _gtgSeasonAt().trees;
  GTG_SEASON_AT.trees.forEach(([x, y], i) => {
    if (!trees.length) { gtgSprite('sn-' + i, null); return; }
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
    const scope = _wd.key;
    if (said && !W[k]) { W[k] = m.today; _gdSave(); setTimeout(() => { if (_wd.on && _wd.key === scope) wdAmbient(said, 7000, 'season'); }, 1800); }
    if (m.visit && m.season !== gardenModel().season) setTimeout(() => { if (_wd.on && _wd.key === scope) wdAmbient(`It is ${m.season} in ${_gscFirst(m.visit.fid)}’s garden.`, 6000, 'visit-season'); }, 1800);
  }
}
function _gtgOnIceTick(m) {
  if (!_gtgs.ice || typeof _gw === 'undefined' || !gardenIceAt(_gw.px, _gw.py)) return;
  if (gpGrant('tg-ice-walk', { 'mat:timber': 1 })) gpNote('You are standing on the lake. A frozen branch, good timber');
  void m;
}
wdMod({ id: 'tg-season', fun: false, visit: true,
  begin(m) { _gtgs.season = ''; _gtgSeasonApply(m); },
  painted(m) { _gtgSeasonApply(m); _gtgGround(m); },
  tick(m) { if (m.season !== _gtgs.season) { _gtgSeasonApply(m); _gtgGround(m); } _gtgOnIceTick(m); },
  end() { gardenIceSet(false); _gtgs.season = ''; },
});

/* ============================================================
   WHAT BLOCKS WALKING (2.73). User request, 18 Nov 2026: collisions were wrong all across the map, and "a system where we can
   see collisions and make sure they line up with the objects".

     gardenCollideToggle(on?)   Garden > Menu > View & help > "Show what blocks walking", or Shift+C
     gardenCollideOn()          is it showing?
     gardenCollideData(m)       every blocked thing, from the walking data the feet are tested against:
                                  rects  the boxes (_gwBuildSolids: trunks, small props, decorations, harbour things, lamps...)
                                  cells  the blocked cells of the walking grid (_gwBuildGrid: landforms, walls, locked land, buildings)
                                  water  the cells the routes leave because the feet would be in water, and the shore lines
                                  clicks the objects' clickable areas; doors the door and arrival points
     gardenCollideAt(x, y, m)   what blocks the feet at a point (cells), plain words: ['tree trunk (painted wood)', ...]

   Drawn over the live world as one Phaser Graphics in world pixels (so the camera moves and zooms it for free): red blocks,
   blue click areas, green doors. Built from cached walking data, redrawn only when that data (or the zoom step, for line
   widths) changes; nothing runs while it is off. Hovering or tapping a red area names what it is.
   Only the outdoor native (Phaser) world draws it.
   ============================================================ */
const _gcv = { on: false, g: null, feet: null, nw: null, key: '', raf: 0, tip: null, legend: null, data: null, box: null, move: null, tap: null, tipT: 0 };
const GCV_COL = Object.freeze({ block: 0xd8432f, water: 0x2f6fd8, click: 0x2a6fe0, door: 0x2fae4a, start: 0x1d8a3a });
const _GCV_LANDFORM = Object.freeze({ 'ruin-wall': 'ruin wall', ruin: 'ruin', 'rock-wall': 'rock wall', 'terrace-wall': 'terrace wall', mountain: 'mountain' });
function gardenCollideOn() { return !!_gcv.on; }
/** Why the walking grid blocks this cell (the same tests as _gwBuildGrid), in plain words; '' when it does not. */
function _gcvCellWhy(x, y, m) {
  const lvl = m.level.level, a = gardenAreaAt(x, y, lvl), island = typeof gardenIslandActive === 'function' && gardenIslandActive() ? gardenIslandData() : null;
  if (a.startsWith('locked:')) {
    const id = a.slice(7), base = typeof gardenIslandBaseCell === 'function' ? gardenIslandBaseCell(x, y) : null;
    if (base && base.solid && base.landformId) { const f = (island && island.landforms || []).find(row => row.id === base.landformId); return (_GCV_LANDFORM[f && f.kind] || 'rock') + ' ' + base.landformId; }
    if (/^zn-\d+$/.test(id)) { const r = typeof gardenIslandRegionForZone === 'function' ? gardenIslandRegionForZone(Number(id.slice(3))) : null; return 'closed land: ' + (r ? r.name : id) + ' (its gate is shut)'; }
    const ar = typeof gardenArea === 'function' ? gardenArea(id) : null;
    if (ar && ar.solid) return 'thicket ' + id;
    return 'locked plot ' + id;
  }
  const pr = gardenPropAt(x, y);
  if (pr && gardenPropCol(pr) === 'full') { const fixed = island && (island.static || []).some(row => row.id === pr.id); return (fixed ? 'static cell ' + x + ',' + y + ' (' : 'building cell ' + x + ',' + y + ' (') + (pr.name || pr.id) + ')'; }
  const c = m.occ.get(x + ',' + y);
  if (c && c.decor) { const d = gardenDecorById(m, c.decor); if (!d || gardenDecorCol(d.def) === 'full') return 'decoration: ' + (d && d.def ? d.def.name || d.def.id : 'unknown'); }
  return '';
}
/** Every blocked thing and every clickable area, from the data the game walks on (cached on the grid). */
function gardenCollideData(mArg) {
  const m = mArg || gardenHere(), grid = _gwGrid(m, true), solids = _gw.solids, W = GARDEN_WORLD;
  if (grid._gcv && grid._gcv.solids === solids && grid._gcv.m === m) return grid._gcv;
  const cells = [], water = [], seen = new Map();
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const i = y * W.cols + x;
    if (grid.hard[i]) { const why = _gcvCellWhy(x, y, m) || 'blocked cell ' + x + ',' + y; cells.push({ x, y, src: why }); seen.set(i, why); }
    else if (grid[i]) water.push({ x, y, src: grid.otherWater[i] || gardenIsWater(x, y) ? 'water' : 'water edge (no room for feet)' });
  }
  const rects = solids ? solids.list.map(r => ({ x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, src: r.src || 'something solid', form: r.form || null })) : [];
  const shores = [];
  for (const shape of [grid.shore, ...(grid.otherShapes || [])]) if (shape && shape.points) shores.push([shape.points, ...(shape.holes || [])]);
  const clicks = [], doors = [];
  const nw = _gw.nativeWorld;
  if (nw && nw.entities) for (const row of nw.entities.values()) {
    const md = row.metadata || {}, p = md.prop; if (md.kind !== 'prop' || !p || p.site) continue;
    const b = row.bounds, art = b ? { x0: b.x / W.cellW, y0: (b.y - W.sky) / W.cellH, x1: (b.x + b.width) / W.cellW, y1: (b.y + b.height - W.sky) / W.cellH } : null;
    let own, poly = null;
    // (a crossing's click area is its own deck, not its cell: 94-garden-native-world.js pick)
    if (md.crossingSupport && md.crossingSupport.length > 2) { poly = md.crossingSupport.map(q => ({ x: q.x / W.cellW, y: (q.y - W.sky) / W.cellH })); own = { x0: Math.min(...poly.map(q => q.x)), y0: Math.min(...poly.map(q => q.y)), x1: Math.max(...poly.map(q => q.x)), y1: Math.max(...poly.map(q => q.y)) }; }
    else if (gardenPropCol(p) === 'soft') { const cx = p.x + (p.w || 1) / 2, foot = p.y + (p.h || 1) - .08; own = { x0: cx - .3, y0: foot - .55, x1: cx + .3, y1: foot + .05 }; }
    else own = { x0: p.x, y0: p.y, x1: p.x + (p.w || 1), y1: p.y + (p.h || 1) };
    clicks.push({ id: p.id, name: p.name || p.id, own, poly, art, door: p.door ? { x0: p.door.x + .08, y0: p.door.y + .16, x1: p.door.x + .92, y1: p.door.y + .84 } : null, act: !!p.act });
  }
  for (const p of gardenPropsNow()) {
    if (!p.act || p.site || p.needs && !gardenWorkOwned(p.needs)) continue;
    const d = _gwPropApproachPoint(p, false); if (d) doors.push({ x: d.x, y: d.y, id: p.id, name: p.name || p.id, kind: 'door' });
  }
  const gates = typeof GARDEN_ZONE_GATES !== 'undefined' ? GARDEN_ZONE_GATES : [];
  for (const g of gates) if (g.door) doors.push({ x: g.door.x + .5, y: g.door.y + .5, id: g.id, name: g.name || g.id, kind: 'gate' });
  doors.push({ x: W.start.x + .5, y: W.start.y + .5, id: 'start', name: 'where you arrive', kind: 'start' });
  const out = grid._gcv = { m, solids, grid, cells, water, rects, shores, clicks, doors, cellWhy: seen, rev: (grid.routeRevision || 0) + ':' + (solids ? solids.list.length : 0) };
  return out;
}
/** What stops the feet at x, y (cells), in plain words: boxes first, then the cell, then water. */
function gardenCollideAt(x, y, mArg) {
  const D = gardenCollideData(mArg), W = GARDEN_WORLD, out = [];
  for (const r of D.rects) if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1 && (!r.form || _gwInPoly(x, y, r.form.poly))) out.push(r.src);
  const cx = Math.floor(x), cy = Math.floor(y), i = cy * W.cols + cx;
  if (cx >= 0 && cy >= 0 && cx < W.cols && cy < W.rows) {
    if (D.cellWhy.has(i)) out.push(D.cellWhy.get(i));
    else if (D.grid[i] || !(D.grid.shore ? gardenShoreFootProbe(D.grid.shore, x, y, .02, .02, false, D.grid.waterCover, {}).free : true)) out.push(D.grid.otherWater[i] || gardenIsWater(cx, cy) ? 'water' : 'water edge (no room for feet)');
  }
  return out;
}
/* ---------- drawing ---------- */
function _gcvDraw(g, D, scale) {
  const W = GARDEN_WORLD, X = x => x * W.cellW, Y = y => W.sky + y * W.cellH, lw = Math.max(.6, 1.4 / (scale || 1));
  g.clear();
  // the walking grid's blocked cells, merged into runs along each row (one rectangle per run, not per cell)
  const runs = (list, color, alpha) => {
    const byRow = new Map(); for (const c of list) (byRow.get(c.y) || byRow.set(c.y, []).get(c.y)).push(c);
    g.fillStyle(color, alpha);
    for (const [y, row] of byRow) { row.sort((a, b) => a.x - b.x); let s = row[0], e = row[0]; for (let k = 1; k <= row.length; k++) { const c = row[k]; if (c && c.x === e.x + 1 && c.src === s.src) { e = c; continue; } g.fillRect(X(s.x), Y(y), (e.x - s.x + 1) * W.cellW, W.cellH); s = e = c; } }
  };
  runs(D.water, GCV_COL.water, .16);
  runs(D.cells, GCV_COL.block, .4);
  // shore lines: the exact edge the feet are tested against
  g.lineStyle(lw * 1.2, GCV_COL.water, .7);
  for (const loops of D.shores) for (const loop of loops) if (loop && loop.length > 2) { g.beginPath(); g.moveTo(X(loop[0].x), Y(loop[0].y)); for (let k = 1; k < loop.length; k++) g.lineTo(X(loop[k].x), Y(loop[k].y)); g.closePath(); g.strokePath(); }
  // the boxes: trunks, posts, harbour clutter, small props
  g.fillStyle(GCV_COL.block, .55); g.lineStyle(lw * 1.2, 0x8f1d10, .95);
  for (const r of D.rects) if (r.form) { const p = r.form.poly; g.beginPath(); g.moveTo(X(p[0][0]), Y(p[0][1])); for (let k = 1; k < p.length; k++) g.lineTo(X(p[k][0]), Y(p[k][1])); g.closePath(); g.fillPath(); g.strokePath(); }
  for (const r of D.rects) if (!r.form) { g.fillRect(X(r.x0), Y(r.y0), (r.x1 - r.x0) * W.cellW, (r.y1 - r.y0) * W.cellH); g.strokeRect(X(r.x0), Y(r.y0), (r.x1 - r.x0) * W.cellW, (r.y1 - r.y0) * W.cellH); }
  // clickable areas in blue: the ground a click owns (solid line), its painted art (faint), its door step (dotted feel: thin)
  for (const c of D.clicks) {
    if (c.art) { g.lineStyle(lw * .8, GCV_COL.click, .28); g.strokeRect(X(c.art.x0), Y(c.art.y0), (c.art.x1 - c.art.x0) * W.cellW, (c.art.y1 - c.art.y0) * W.cellH); }
    g.lineStyle(lw * 1.4, GCV_COL.click, .9);
    if (c.poly) { g.beginPath(); g.moveTo(X(c.poly[0].x), Y(c.poly[0].y)); for (let k = 1; k < c.poly.length; k++) g.lineTo(X(c.poly[k].x), Y(c.poly[k].y)); g.closePath(); g.strokePath(); }
    else g.strokeRect(X(c.own.x0), Y(c.own.y0), (c.own.x1 - c.own.x0) * W.cellW, (c.own.y1 - c.own.y0) * W.cellH);
    if (c.door) { g.lineStyle(lw, GCV_COL.click, .6); g.strokeRect(X(c.door.x0), Y(c.door.y0), (c.door.x1 - c.door.x0) * W.cellW, (c.door.y1 - c.door.y0) * W.cellH); }
  }
  // doors and arrival points in green
  for (const d of D.doors) { g.fillStyle(0xffffff, .9); g.fillCircle(X(d.x), Y(d.y), 6.5); g.fillStyle(d.kind === 'start' ? GCV_COL.start : GCV_COL.door, 1); g.fillCircle(X(d.x), Y(d.y), d.kind === 'door' ? 4.5 : 5.5); }
}
function _gcvFrame() {
  _gcv.raf = 0; if (!_gcv.on) return;
  const nw = window.GardenNative && GardenNative.active() && _gw.on && _gw.nativeWorld;
  // away from the garden: look again twice a second, nothing else
  if (!nw || !nw.root || !nw.root.scene) { _gcv.raf = setTimeout(() => { _gcv.raf = 0; if (_gcv.on) _gcv.raf = requestAnimationFrame(_gcvFrame); }, 500); return; }
  if (_gw.box && _gcv.box !== _gw.box) _gcvBind(_gw.box);
  if (_gcv.nw !== nw || !_gcv.g || !_gcv.g.scene) {
    if (_gcv.g) try { _gcv.g.destroy(); } catch (e) { /* the scene went with it */ }
    if (_gcv.feet) { try { _gcv.feet.destroy(); } catch (e) { /* the scene went with it */ } _gcv.feet = null; }
    _gcv.nw = nw; _gcv.g = nw.root.scene.add.graphics(); _gcv.g.setDepth(89500); nw.root.add(_gcv.g); _gcv.key = '';
  }
  const inRoom = typeof _grm !== 'undefined' && _grm.me, cam = nw.camera(), step = Math.round(Math.log2(cam.scale || 1) * 2);
  _gcv.g.setVisible(!inRoom);
  if (!inRoom) {
    const grid = _gw.grid, key = (grid && grid.routeRevision) + '|' + (_gw.solids && _gw.solids.list.length) + '|' + step + '|' + (nw.entities ? nw.entities.size : 0);
    if (key !== _gcv.key || _gcv.gridRef !== grid || _gcv.solidRef !== _gw.solids) {
      _gcv.data = gardenCollideData(); _gcv.gridRef = _gw.grid; _gcv.solidRef = _gw.solids; _gcv.key = key;
      _gcvDraw(_gcv.g, _gcv.data, cam.scale);
    }
  }
  // your own feet, every frame: the small oval that is tested against everything above (so its size can be judged
  // against the figure, and you can see what caught it)
  if (!_gcv.feet || !_gcv.feet.scene) { _gcv.feet = nw.root.scene.add.graphics(); _gcv.feet.setDepth(89501); nw.root.add(_gcv.feet); }
  _gcv.feet.setVisible(!inRoom);
  if (!inRoom && typeof GW_FOOT !== 'undefined') {
    const W = GARDEN_WORLD, fx = _gw.px * W.cellW, fy = W.sky + _gw.py * W.cellH, lw = Math.max(1, 1.5 / (cam.scale || 1));
    _gcv.feet.clear(); _gcv.feet.fillStyle(0xffffff, .35); _gcv.feet.fillEllipse(fx, fy, GW_FOOT.x * 2 * W.cellW, GW_FOOT.y * 2 * W.cellH);
    _gcv.feet.lineStyle(lw * 2.2, 0x2b2118, .9); _gcv.feet.strokeEllipse(fx, fy, GW_FOOT.x * 2 * W.cellW, GW_FOOT.y * 2 * W.cellH);
    _gcv.feet.lineStyle(lw, 0xffffff, 1); _gcv.feet.strokeEllipse(fx, fy, GW_FOOT.x * 2 * W.cellW, GW_FOOT.y * 2 * W.cellH);
  }
  _gcv.raf = requestAnimationFrame(_gcvFrame);
}
function _gcvTipShow(clientX, clientY, sticky) {
  const nw = _gw.nativeWorld, box = _gw.box; if (!nw || !box) return;
  const pt = nw.point(clientX, clientY), what = gardenCollideAt(pt.x, pt.y);
  let tip = _gcv.tip;
  if (!tip || !tip.isConnected) { tip = _gcv.tip = document.createElement('div'); tip.className = 'gd-collide-tip'; tip.setAttribute('role', 'status'); box.appendChild(tip); }
  if (!what.length) { tip.hidden = true; return; }
  const r = box.getBoundingClientRect(), uniq = [...new Set(what)];
  tip.textContent = uniq.slice(0, 3).join(' · ') + (uniq.length > 3 ? ' · and ' + (uniq.length - 3) + ' more' : '');
  tip.hidden = false;
  tip.style.left = Math.max(8, Math.min(r.width - 220, clientX - r.left + 14)) + 'px'; tip.style.top = Math.max(8, clientY - r.top - 40) + 'px';
  clearTimeout(_gcv.tipT); if (sticky) _gcv.tipT = setTimeout(() => { if (_gcv.tip) _gcv.tip.hidden = true; }, 2600);
}
function _gcvLegend(on) {
  const box = _gw.box; if (!box) return;
  let el = _gcv.legend;
  if (!on) { if (el) el.remove(); _gcv.legend = null; if (_gcv.tip) { _gcv.tip.remove(); _gcv.tip = null; } return; }
  if (!el || !el.isConnected) {
    el = _gcv.legend = document.createElement('div'); el.className = 'gd-collide-key';
    el.innerHTML = '<b>What blocks walking</b><span><i class="is-block"></i>blocks your feet</span><span><i class="is-water"></i>water</span><span><i class="is-click"></i>click area</span><span><i class="is-door"></i>door or arrival</span><span><i class="is-feet"></i>your feet</span><button type="button" data-collide-off>Hide <kbd>Shift</kbd>+<kbd>C</kbd></button>';
    el.addEventListener('click', ev => { if (ev.target.closest('[data-collide-off]')) gardenCollideToggle(false); });
    box.appendChild(el);
  }
}
/** Hover and tap listeners and the key card, on the stage box (moved when the garden is painted again). */
function _gcvBind(box) {
  if (_gcv.box) { _gcv.box.removeEventListener('pointermove', _gcv.move); _gcv.box.removeEventListener('pointerdown', _gcv.tap); }
  _gcvLegend(false); _gcv.box = box || null; if (!box) return;
  _gcv.move = _gcv.move || (ev => { if (ev.pointerType === 'mouse' || !ev.pointerType) _gcvTipShow(ev.clientX, ev.clientY, false); });
  _gcv.tap = _gcv.tap || (ev => { if (ev.pointerType && ev.pointerType !== 'mouse') _gcvTipShow(ev.clientX, ev.clientY, true); });
  box.addEventListener('pointermove', _gcv.move, { passive: true }); box.addEventListener('pointerdown', _gcv.tap, { passive: true });
  _gcvLegend(true);
}
/** Show or hide what blocks walking. */
function gardenCollideToggle(on) {
  const want = on == null ? !_gcv.on : !!on; if (want === _gcv.on) return _gcv.on;
  const box = _gw.box;
  if (want && !(window.GardenNative && GardenNative.active() && _gw.nativeWorld)) { if (typeof gardenMessage === 'function') gardenMessage('This view needs the painted garden (Menu > Graphics).', { icon: 'info', ms: 4000 }); return false; }
  _gcv.on = want;
  if (want) {
    _gcv.key = ''; _gcvBind(box);
    if (!_gcv.raf) _gcv.raf = requestAnimationFrame(_gcvFrame);
  } else {
    if (_gcv.raf) { cancelAnimationFrame(_gcv.raf); clearTimeout(_gcv.raf); } _gcv.raf = 0;
    if (_gcv.g) { try { _gcv.g.destroy(); } catch (e) { /* gone with the scene */ } _gcv.g = null; }
    if (_gcv.feet) { try { _gcv.feet.destroy(); } catch (e) { /* gone with the scene */ } _gcv.feet = null; }
    _gcvBind(null); _gcv.nw = null; _gcv.data = null;
  }
  const hud = typeof _ghBox === 'function' && _ghBox();
  if (hud && typeof _ghMenu === 'function') try { _gh.menu = ''; _ghMenu(hud, gardenHere()); } catch (e) { /* the menu repaints with the HUD */ }
  return _gcv.on;
}

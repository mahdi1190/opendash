/* ============================================================
   GARDEN, the world you walk in (2.22). User request, 30 Oct 2026: "I want the player to always be in the garden ... you can
   move the player around with click" and "the controls are shit". You are IN the garden: your profile's figure (the one the scenes
   use) stands on the grass, walks where you click, and your pet follows. The camera follows you (or shows the whole garden).

     gardenWorldPainted(m)         after every paint of the stage: put the player, the pet and the camera back (the page calls it)
     gardenWorldStart(root) / gardenWorldStop()     the loop (one requestAnimationFrame, paused with the tab)
     gardenWorldClick(it, cell, ev, m)   a click on the stage: true when the world took it. You just click what you want: a building or a board
                                       (you walk to its door and it opens), a bug (you creep up and net it), the water (you cast), the ground (you walk there)
   gardenWorldHover(ev, cell, it)      what is under the pointer: {kind: 'prop' | 'bug' | 'water', text}, for the status line and the cursor
   gardenGoToProp(id)                  walk to a building's door and go in
     gardenWorldKey(ev, down)      WASD and the arrows walk, Space / E do the thing in front of you, + - Fit the camera
     gardenWalkToPoint(pt, then)   walk to a point (free movement: a straight line round whatever is in the way, not cell to cell), then `then`
   gardenWalkTo(cell, then)      the same for the middle of a cell
     gardenWalkable(x, y)          can you stand here?
     gardenWorldFace(cell)         turn to face a cell (the tools use this: you look at what you water)

   The player is a node inside the objects layer, put in depth order by its row (data-z), so you walk behind trees and in front of
   flowers. Everything that moves is driven by this loop and written as attributes, so the scene's own patching (which only
   touches plants, decorations and visitors) never restarts it. Reduced motion: you still walk (it is how the garden works), but
   without the bob, the camera glide or the pet's trot.
   ============================================================ */
const _gw = {
  on: false, raf: 0, last: 0, svg: null, root: null, box: null, ro: null,
  px: 10.5, py: 9.5, face: 1, speed: 0, moving: false, sneak: false,
  path: [], then: null, goal: null,
  node: null, body: '', bodyKey: '', fig: { idle: '', walk: '' },
  z: -1, pet: null, petSvg: '', petKey: '',
  cam: { x: 0, y: 0, w: 0, h: 0, vh: 0, mode: 'follow', init: false, dirty: true },
  keys: new Set(), grid: null, gridKey: '', saveT: 0, size: { w: 0, h: 0 },
};
const GW_SPEED = Object.freeze({ walk: 215, sneak: 92, run: 300 });   // pixels of stage a second (a cell is 48 x 30 of them)
const GW_ZOOMS = Object.freeze([230, 290, 360, 450, 560, 690]);       // how many stage units tall the window shows
const GW_SCALE = 0.74;                                                // the figure's size: 70 units tall -> about 52 px
const GW_PET_SCALE = 0.5;                                             // your pet, drawn at two thirds of the size the garden uses for a wandering one: it comes up to your knee

/* ---------- the grid you walk on ---------- */
function _gwBuildGrid(m) {
  const W = GARDEN_WORLD, g = new Uint8Array(W.cols * W.rows);   // 1 = blocked
  const lvl = m.level.level;
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    let blocked = false;
    const a = gardenAreaAt(x, y, lvl);
    if (a.startsWith('locked:')) blocked = true;                     // behind the little fence
    const pr = gardenPropAt(x, y);
    if (pr && !pr.walk) blocked = true;
    if (!pr && gardenIsWater(x, y)) blocked = true;
    const c = m.occ.get(x + ',' + y);
    if (c && c.decor) { const d = gardenDecorById(m, c.decor); if (d && d.def.effect && d.def.effect.kind === 'sit') { /* a seat: you may sit, so walk up to it */ } blocked = true; }
    if (c && c.plant) { const p = gardenPlantById(m, c.plant); if (p && (p.stage >= 2 || p.fp > 1)) blocked = true; }
    g[y * W.cols + x] = blocked ? 1 : 0;
  }
  return g;
}
function _gwGrid(m) {
  const key = _gd.memoKey + '|' + (m && m.level.level);
  if (!_gw.grid || _gw.gridKey !== key) { _gw.grid = _gwBuildGrid(m || gardenModel()); _gw.gridKey = key; }
  return _gw.grid;
}
function gardenWalkable(x, y) {
  const W = GARDEN_WORLD;
  if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) return false;
  return !_gwGrid(gardenModel())[y * W.cols + x];
}
function _gwNearestFree(x, y, maxR) {
  // the nearest walkable cell to (x, y), by rings (the click was on a plant, a bench, the water...)
  const W = GARDEN_WORLD; let best = null, bd = 1e9;
  for (let r = 0; r <= (maxR || 8); r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const cx = x + dx, cy = y + dy;
      if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows || !gardenWalkable(cx, cy)) continue;
      const d = Math.hypot(dx * W.cellW, dy * W.cellH) + (cy < y ? 6 : 0);   // a little prefer the near side
      if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    if (best) return best;
  }
  return best;
}

/* ---------- free movement: feet are a small oval, not a cell ---------- */
const GW_FOOT = Object.freeze({ x: 0.2, y: 0.12 });   // half the width and depth of your feet, in cells
const GW_ACC = 1100;                                  // pixels a second, a second: how quickly you get going and stop
const GW_CLEAR = 0.07;                                // planning keeps this much (cells) of room round corners, so a route never scrapes one
/** Can the feet be here? Only the cells the oval touches count, so you can stand tight against a bench and slip past a plant. `m` fattens the feet (route planning). */
function _gwFree(x, y, m) {
  const fx = GW_FOOT.x + (m || 0), fy = GW_FOOT.y + (m || 0);
  return gardenWalkable(Math.floor(x - fx), Math.floor(y - fy)) && gardenWalkable(Math.floor(x + fx), Math.floor(y - fy))
    && gardenWalkable(Math.floor(x - fx), Math.floor(y + fy)) && gardenWalkable(Math.floor(x + fx), Math.floor(y + fy));
}
/** Can the feet go in a straight line from a to b? (`m`: with that much room to spare.) Sampled finer than a corner can hide in. */
function _gwLos(a, b, m) {
  const W = GARDEN_WORLD, n = Math.max(1, Math.ceil(Math.hypot((b.x - a.x) * W.cellW, (b.y - a.y) * W.cellH) / 3));
  for (let i = 1; i <= n; i++) { const t = i / n; if (!_gwFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, m)) return false; }
  return true;
}
/**
 * Move the feet by (dx, dy) cells without ever stopping dead on something: the whole step if it is open, else each axis on its own
 * (slide along the wall), else step sideways a few pixels round the corner that caught the feet. Returns whether they moved.
 */
function _gwMoveBy(dx, dy) {
  const W = GARDEN_WORLD, x0 = _gw.px, y0 = _gw.py;
  let x = x0, y = y0;
  if (_gwFree(x0 + dx, y0 + dy)) { x += dx; y += dy; }
  else {
    if (dx && _gwFree(x0 + dx, y0)) x = x0 + dx;
    if (dy && _gwFree(x, y0 + dy)) y = y0 + dy;
    if (x === x0 && y === y0) {
      const horiz = Math.abs(dx * W.cellW) >= Math.abs(dy * W.cellH), stepPx = Math.hypot(dx * W.cellW, dy * W.cellH);
      const unit = horiz ? 1 / W.cellH : 1 / W.cellW;   // one pixel across the way we are going, in cells
      // the smallest sideways offset (2 .. 10 px) that lets the step go on; walk toward it a step at a time, so it never jitters
      search: for (let k = 1; k <= 5; k++) for (const s of [1, -1]) {
        const full = s * k * 2 * unit, part = s * Math.min(k * 2, Math.max(1, stepPx)) * unit, whole = Math.abs(part) >= Math.abs(full) - 1e-9;
        const ax = horiz ? x0 + dx : x0 + full, ay = horiz ? y0 + full : y0 + dy;   // sideways by the whole offset and on
        if (!_gwFree(ax, ay)) continue;
        const bx = horiz ? (whole ? ax : x0) : x0 + part, by = horiz ? y0 + part : (whole ? ay : y0);
        if (_gwFree(bx, by)) { x = bx; y = by; break search; }
      }
    }
  }
  if (x === x0 && y === y0) return false;
  _gw.px = x; _gw.py = y; return true;
}
/** The feet are inside something (a plant grew where you stood, a decoration was put down): glide out to the nearest open ground. */
function _gwPushOut(dt) {
  if (_gwFree(_gw.px, _gw.py)) {
    if (_gw.replan) { _gw.replan = false; _gw.repaths = 0; if (!_gwRepath()) { _gw.path = []; _gw.then = null; } }
    return false;
  }
  let f = _gwNearestFreePt(_gw.px, _gw.py, 3);
  if (!f) { const c = _gwNearestFree(Math.floor(_gw.px), Math.floor(_gw.py), 10); f = c ? { x: c.x + 0.5, y: c.y + 0.5 } : { x: 10.5, y: 9.5 }; }
  const W = GARDEN_WORLD, dxp = (f.x - _gw.px) * W.cellW, dyp = (f.y - _gw.py) * W.cellH, d = Math.hypot(dxp, dyp), step = 230 * dt;
  _gw.spd = 0; if (_gw.path.length) _gw.replan = true;   // a walk in progress carries on from the new spot once the feet are clear
  if (d <= step) { _gw.px = f.x; _gw.py = f.y; }
  else { _gw.px += dxp / d * step / W.cellW; _gw.py += dyp / d * step / W.cellH; }
  if (Math.abs(dxp) > 4) _gw.face = dxp > 0 ? 1 : -1;
  return true;
}
/** The way ahead is shut (it changed, or the feet were clipped): plan a new way to where you were going. False when there is none. */
function _gwRepath() {
  const g = _gw.goal; if (!g || (_gw.repaths = (_gw.repaths || 0) + 1) > 4) return false;
  const tgt = _gwFree(g.x, g.y) ? g : _gwNearestFreePt(g.x, g.y, 3); if (!tgt) return false;
  const route = _gwRoute({ x: _gw.px, y: _gw.py }, tgt); if (!route) return false;
  _gw.path = route; _gw.goal = tgt; return true;
}
/** The free point nearest to (x, y) (a click on a plant, a bench, the water...), or null. */
function _gwNearestFreePt(x, y, maxR) {
  const W = GARDEN_WORLD, R = maxR || 3;
  let best = null, bd = 1e9;
  for (let dy = -R; dy <= R; dy += 0.25) for (let dx = -R; dx <= R; dx += 0.25) {
    const d = Math.hypot(dx * W.cellW, dy * W.cellH) + (dy < 0 ? 4 : 0);
    if (d >= bd || !_gwFree(x + dx, y + dy)) continue;
    bd = d; best = { x: x + dx, y: y + dy };
  }
  return best;
}
/** The cells A* goes through, eight ways, no cutting corners (raw: every cell; else string-pulled by cell). null when there is no way. */
function gardenPath(from, to, raw) {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, grid = _gwGrid(gardenModel());
  const sx = Math.max(0, Math.min(C - 1, Math.floor(from.x))), sy = Math.max(0, Math.min(R - 1, Math.floor(from.y)));
  const tx = to.x, ty = to.y;
  if (sx === tx && sy === ty) return [];
  const idx = (x, y) => y * C + x, open = [idx(sx, sy)], came = new Int32Array(C * R).fill(-1), gs = new Float32Array(C * R).fill(1e9), closed = new Uint8Array(C * R);
  const hcost = (x, y) => Math.hypot((x - tx) * W.cellW, (y - ty) * W.cellH) / 40;
  gs[idx(sx, sy)] = 0;
  const f = new Float32Array(C * R).fill(1e9); f[idx(sx, sy)] = hcost(sx, sy);
  const free = (x, y) => x >= 0 && y >= 0 && x < C && y < R && !grid[idx(x, y)];
  let guard = 0;
  while (open.length && guard++ < 4000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur === idx(tx, ty)) break;
    closed[cur] = 1;
    const cx = cur % C, cy = (cur - cx) / C;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue;   // no corner cutting
      const ni = idx(nx, ny); if (closed[ni]) continue;
      const step = Math.hypot(dx * W.cellW, dy * W.cellH) / 40, ng = gs[cur] + step;
      if (ng < gs[ni]) { gs[ni] = ng; came[ni] = cur; f[ni] = ng + hcost(nx, ny); if (!open.includes(ni)) open.push(ni); }
    }
  }
  const goal = idx(tx, ty);
  if (came[goal] < 0) return null;
  const cells = []; for (let c = goal; c >= 0 && c !== idx(sx, sy); c = came[c]) cells.push({ x: c % C, y: (c - (c % C)) / C });
  cells.reverse();
  if (raw) return cells;
  const out = []; let at = { x: sx, y: sy };
  for (let i = 0; i < cells.length; i++) {
    const nxt = cells[i + 1];
    if (nxt && _gwLineClear(at, nxt, grid)) continue;
    out.push(cells[i]); at = cells[i];
  }
  return out;
}
function _gwLineClear(a, b, grid) {
  const W = GARDEN_WORLD, n = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 4);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = Math.floor(a.x + 0.5 + (b.x - a.x) * t), y = Math.floor(a.y + 0.5 + (b.y - a.y) * t);
    if (x < 0 || y < 0 || x >= W.cols || y >= W.rows || grid[y * W.cols + x]) return false;
  }
  return true;
}
/** The way from one point to another: [waypoints] ending exactly at `to`, as straight as it can be, or null. */
function _gwRoute(from, to) {
  if (_gwLos(from, to, GW_CLEAR) || _gwLos(from, to)) return [{ x: to.x, y: to.y }];
  const raw = gardenPath(from, { x: Math.floor(to.x), y: Math.floor(to.y) }, true);
  if (raw === null) return null;
  const pts = raw.map(c => ({ x: c.x + 0.5, y: c.y + 0.5 })); pts.push({ x: to.x, y: to.y });
  const out = []; let at = { x: from.x, y: from.y }, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !_gwLos(at, pts[j], GW_CLEAR)) j--;
    out.push(pts[j]); at = pts[j]; i = j + 1;
  }
  return out;
}
/** Walk to a point (cells, fractions allowed); the nearest free one when it is blocked. `then(arrived)` runs on arrival. Returns whether there is a way. */
function gardenWalkToPoint(pt, then, o) {
  o = o || {};
  const tgt = _gwFree(pt.x, pt.y) ? { x: pt.x, y: pt.y } : _gwNearestFreePt(pt.x, pt.y, o.radius || 3);
  if (!tgt) { _gw.path = []; _gw.then = null; return false; }
  const route = _gwRoute({ x: _gw.px, y: _gw.py }, tgt);
  if (route === null) { _gw.path = []; _gw.then = null; return false; }
  _gw.path = route; _gw.then = then || null; _gw.goal = tgt; _gw.sneak = !!o.sneak; _gw.repaths = 0; _gw.replan = false; _gw.blockT = 0;
  if (typeof _gwFishCancelWalkAway === 'function') _gwFishCancelWalkAway();
  if (!route.length && typeof then === 'function') { _gw.then = null; then(true); }
  _gwEnsureLoop();
  return true;
}
function gardenWalkTo(cell, then, o) { return gardenWalkToPoint({ x: cell.x + 0.5, y: cell.y + 0.5 }, then, o); }
function gardenWorldFace(cell) { if (!cell) return; _gwFacePt({ x: cell.x + 0.5, y: cell.y + 0.5 }); }
function _gwFacePt(pt) { const dx = pt.x - _gw.px; if (Math.abs(dx) > 0.05) _gw.face = dx > 0 ? 1 : -1; _gwBody(); }
/** Where on the stage (in cells, fractions allowed) a pointer event is. */
function _gwPointAt(ev) {
  try {
    if (!ev || ev.clientX == null || !_gw.svg) return null;
    const ctm = _gw.svg.getScreenCTM(); if (!ctm) return null;
    const pt = _gw.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(ctm.inverse()), W = GARDEN_WORLD;
    return { x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH };
  } catch (e) { return null; }
}

/* ---------- the figure ---------- */
function _gwFigureInner(walk) {
  let svg = '';
  try {
    if (typeof profileFigureSvg === 'function' && typeof profileGet === 'function') svg = profileFigureSvg(profileGet().avatar, { size: 70, walk: !!walk, uid: 'gwp' + (walk ? 'w' : 'i') });
  } catch (e) { svg = ''; }
  const m = svg && /^<svg[^>]*>([\s\S]*)<\/svg>$/.exec(svg);
  if (m) return m[1];
  // no scene library on this page: a small gardener of our own
  return `<ellipse cx="0" cy="0.6" rx="11" ry="1.8" fill="#000000" opacity="0.14"/><g><rect x="-6" y="-40" width="12" height="26" rx="5" fill="#5a8a5a"/><circle cx="0" cy="-48" r="8" fill="#e8b890"/><path d="M-9 -50q9 -12 18 0z" fill="#c8a24a"/><rect x="-5" y="-14" width="4" height="14" rx="2" fill="#4a5a7a"/><rect x="1" y="-14" width="4" height="14" rx="2" fill="#4a5a7a"/></g>`;
}
function _gwBody() {
  if (!_gw.node) return;
  const moving = _gw.moving && gardenMotionOn();
  const key = (moving ? 'w' : 'i') + (_gw.face > 0 ? 'r' : 'l');
  const inner = _gw.node.querySelector('.gd-pl-in');
  if (!inner) return;
  if (!_gw.fig.idle) { _gw.fig.idle = _gwFigureInner(false); _gw.fig.walk = _gwFigureInner(true); }
  if (_gw.bodyKey !== key) { _gw.bodyKey = key; inner.innerHTML = moving ? _gw.fig.walk : _gw.fig.idle; }
  inner.setAttribute('transform', `scale(${_gw.face > 0 ? GW_SCALE : -GW_SCALE} ${GW_SCALE})`);
}
/** Make the figures again (the avatar changed, or the wardrobe was opened). */
function gardenWorldRedress() { _gw.fig = { idle: '', walk: '' }; _gw.bodyKey = ''; _gwBody(); }
function _gwMakeNode() {
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'gd-player');
  g.innerHTML = '<g class="gd-pl-sh"><ellipse cx="0" cy="1" rx="12" ry="3.4" fill="#1a2a14" fill-opacity="0.2"/></g><g class="gd-pl-bob"><g class="gd-pl-in"></g></g>';
  return g;
}

/* ---------- depth: the player and the pet sit in the objects layer by row ---------- */
function _gwPlace(node, z) {
  const layer = _gw.svg && _gw.svg.querySelector('.gd-objects'); if (!layer || !node) return;
  let ref = null;
  for (const el of layer.children) {
    if (el === node) continue;
    const ez = Number(el.getAttribute('data-z'));
    if (Number.isFinite(ez) && ez > z) { ref = el; break; }
  }
  if (node.parentNode === layer && node.nextSibling === ref) return;
  layer.insertBefore(node, ref);
}
function _gwApplyNode() {
  const W = GARDEN_WORLD;
  if (!_gw.node) return;
  const x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH;
  const tf = `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
  if (_gw.nodeTf !== tf || _gw.node._gwTf !== tf) { _gw.nodeTf = tf; _gw.node._gwTf = tf; _gw.node.setAttribute('transform', tf); _gw.node.setAttribute('data-z', (_gw.py + 0.001).toFixed(2)); }
  const z = Math.floor(_gw.py * 2);
  if (z !== _gw.z || !_gw.node.parentNode) { _gw.z = z; _gwPlace(_gw.node, _gw.py); }
  const bob = _gw.bobEl && _gw.bobEl.isConnected ? _gw.bobEl : (_gw.bobEl = _gw.node.querySelector('.gd-pl-bob'));
  const bt = _gw.moving && gardenMotionOn() ? `translate(0 ${(-Math.abs(Math.sin(_gw.t * (_gw.sneak ? 7 : 11))) * 1.6).toFixed(2)})` : '';
  if (bob && _gw.bobTf !== bt) { _gw.bobTf = bt; bob.setAttribute('transform', bt); }
}

/* ---------- the camera ---------- */
function _gwSize() {
  const box = _gw.box || (_gw.root && _gw.root.querySelector('.gd-stagebox'));
  if (box) { _gw.box = box; const w = box.clientWidth, h = box.clientHeight; if (w && h) { _gw.size.w = w; _gw.size.h = h; } }
  return _gw.size;
}
function gardenCamMode() { const p = _gdpPrefs(); return p.cam === 'fit' ? 'fit' : 'follow'; }
function _gwCamZoomIdx() { const p = _gdpPrefs(); const i = Number(p.zoom); return Number.isInteger(i) && i >= 0 && i < GW_ZOOMS.length ? i : 2; }
function gardenCamSet(mode, zoomDelta) {
  const p = _gdpPrefs();
  if (zoomDelta) { const i = Math.max(0, Math.min(GW_ZOOMS.length - 1, _gwCamZoomIdx() + zoomDelta)); p.zoom = i; p.cam = 'follow'; }
  else if (mode) p.cam = mode;
  if (typeof saveUI === 'function') saveUI();
  _gw.cam.dirty = true; _gw.cam.snap = false; _gwEnsureLoop(); _gwUpdateCamUi();
}
function _gwCamTarget() {
  const W = GARDEN_WORLD, wpx = W.cols * W.cellW, hpx = W.sky + W.rows * W.cellH, s = _gwSize();
  if (!s.w || !s.h) return null;
  const ar = s.w / s.h;
  // fishing locks the camera onto you and the bobber: close in, and back out again when the line is in
  if (typeof _gwFishBusy === 'function' && _gwFishBusy() && _gw.fishing) {
    const F = _gw.fishing, bx = F.bx * W.cellW, by = W.sky + F.by * W.cellH, fx = _gw.px * W.cellW, fy = W.sky + _gw.py * W.cellH - 30;
    let vh = Math.max(190, Math.abs(by - fy) + 130, (Math.abs(bx - fx) + 170) / ar), vw = vh * ar;
    if (vh > hpx) { vh = hpx; vw = vh * ar; }
    if (vw > wpx) { vw = wpx; vh = vw / ar; }
    return { x: Math.max(0, Math.min(wpx - vw, (bx + fx) / 2 - vw / 2)), y: Math.max(0, Math.min(hpx - vh, (by + fy) / 2 - vh / 2 - 6)), w: vw, h: vh };
  }
  let vh = gardenCamMode() === 'fit' ? Math.max(hpx, wpx / ar) : GW_ZOOMS[_gwCamZoomIdx()];
  let vw = vh * ar;
  if (vw > wpx && gardenCamMode() !== 'fit') { vw = wpx; vh = vw / ar; }
  if (vh > hpx && gardenCamMode() !== 'fit') { vh = hpx; vw = vh * ar; }
  let x, y;
  if (gardenCamMode() === 'fit') { x = (wpx - vw) / 2; y = Math.max(0, (hpx - vh) / 2); if (vh > hpx) y = (hpx - vh) / 2; }
  else {
    const fx = _gw.px * W.cellW, fy = W.sky + _gw.py * W.cellH - 20;
    x = Math.max(0, Math.min(wpx - vw, fx - vw / 2)); y = Math.max(0, Math.min(hpx - vh, fy - vh * 0.56));
  }
  return { x, y, w: vw, h: vh };
}
function _gwApplyCam(dt, snap) {
  const svg = _gw.svg; if (!svg) return;
  const t = _gwCamTarget(); if (!t) return;
  const c = _gw.cam;
  if (!c.init || snap || !gardenMotionOn()) { c.x = t.x; c.y = t.y; c.w = t.w; c.h = t.h; c.init = true; }
  else { const k = 1 - Math.exp(-dt * 7); c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.w += (t.w - c.w) * k; c.h += (t.h - c.h) * k; }
  const same = Math.abs(t.x - c.x) < 0.05 && Math.abs(t.y - c.y) < 0.05 && Math.abs(t.w - c.w) < 0.05;
  if (same) { c.x = t.x; c.y = t.y; c.w = t.w; c.h = t.h; }
  const vb = `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.w.toFixed(2)} ${c.h.toFixed(2)}`;
  if (svg._gwVb !== vb) { svg._gwVb = vb; svg.setAttribute('viewBox', vb); }
  c.dirty = !same;
}
function _gwUpdateCamUi() {
  const box = _gw.root && _gw.root.querySelector('.gd-camui'); if (!box) return;
  const fit = gardenCamMode() === 'fit';
  const f = box.querySelector('[data-cam="fit"]'); if (f) { f.setAttribute('aria-pressed', fit ? 'true' : 'false'); }
  const i = _gwCamZoomIdx();
  const zi = box.querySelector('[data-cam="in"]'); if (zi) zi.disabled = !fit && i <= 0;
  const zo = box.querySelector('[data-cam="out"]'); if (zo) zo.disabled = !fit && i >= GW_ZOOMS.length - 1;
}
function _gwBuildCamUi(stagebox) {
  if (stagebox.querySelector('.gd-camui')) return;
  const bar = document.createElement('div'); bar.className = 'gd-camui'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Camera');
  const b = (cam, ic, tip, aria) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'gd-cambtn'; e.dataset.cam = cam; e.innerHTML = icon(ic); e.setAttribute('data-tip', tip); e.setAttribute('aria-label', aria); e.onclick = (ev) => { ev.stopPropagation(); if (cam === 'in') gardenCamSet(null, -1); else if (cam === 'out') gardenCamSet(null, 1); else if (cam === 'fit') gardenCamSet(gardenCamMode() === 'fit' ? 'follow' : 'fit'); else if (cam === 'me') { gardenCamSet('follow'); } }; return e; };
  bar.append(b('in', 'zoom-in', 'Zoom in (+)', 'Zoom in'), b('out', 'zoom-out', 'Zoom out (−)', 'Zoom out'), b('fit', 'maximize', 'See the whole garden (F)', 'Whole garden'), b('me', 'locate-fixed', 'Follow me (C)', 'Follow me'));
  stagebox.appendChild(bar);
  // the mouse wheel zooms; a pinch or ctrl-wheel too
  stagebox.addEventListener('wheel', (ev) => { if (!/^garden(:|$)/.test(String(state.view || ''))) return; if (_gw.reel) return; ev.preventDefault(); gardenCamSet(null, ev.deltaY > 0 ? 1 : -1); }, { passive: false });
}

/* ---------- the loop ---------- */
function _gwEnsureLoop() { if (!_gw.on || _gw.raf || document.hidden) return; _gw.last = 0; _gw.raf = requestAnimationFrame(_gwFrame); }
function _gwFrame(ts) {
  _gw.raf = 0;
  if (!_gw.on || !_gw.root || !_gw.root.isConnected || !_gw.svg || !_gw.svg.isConnected) { _gw.on = _gw.on && !!_gw.root && _gw.root.isConnected; if (_gw.on) { _gw.raf = requestAnimationFrame(_gwFrame); } return; }
  if (document.hidden) return;
  const dt = Math.min(0.1, _gw.last ? (ts - _gw.last) / 1000 : 0.016); _gw.last = ts; _gw.t = (_gw.t || 0) + dt;
  const W = GARDEN_WORLD;
  // 1. where you are going: the keys, or the way you clicked (a free line round whatever is in the way, with a soft start and stop)
  let mvx = 0, mvy = 0;
  const k = _gw.keys;
  if (k.has('left')) mvx -= 1; if (k.has('right')) mvx += 1; if (k.has('up')) mvy -= 1; if (k.has('down')) mvy += 1;
  const reeling = !!(_gw.fishing && ['reel', 'bite'].includes(_gw.fishing.state));
  const casting = !!_gw.fishing && _gw.fishing.state !== 'idle';
  const pushed = _gwPushOut(dt);   // standing inside something that grew or was put down: ease out first, then walk on
  const byKeys = !pushed && !!(mvx || mvy) && !casting;   // a line out locks you in: the keys do nothing until it is in (Esc)
  let want = 0, ux = 0, uy = 0, sneak = _gw.sneak, tgt = null, dist = 0;
  if (pushed) { /* gliding out */ }
  else if (byKeys) {
    if (casting) _gwFishCancel('You reeled in to walk.');
    _gw.netting = null; _gw.path = []; _gw.then = null; _gw.replan = false;
    sneak = k.has('shift');
    const len = Math.hypot(mvx * W.cellW, mvy * W.cellH); ux = mvx * W.cellW / len; uy = mvy * W.cellH / len;
    want = sneak ? GW_SPEED.sneak : GW_SPEED.walk;
  } else if (_gw.path.length && !casting) {
    // cut corners: as soon as you can see the waypoint after the next, head for that one (no visiting the middle of cells)
    while (_gw.path.length > 1 && _gwLos({ x: _gw.px, y: _gw.py }, _gw.path[1], GW_CLEAR)) _gw.path.shift();
    tgt = _gw.path[0];
    const dxp = (tgt.x - _gw.px) * W.cellW, dyp = (tgt.y - _gw.py) * W.cellH;
    dist = Math.hypot(dxp, dyp); ux = dxp / (dist || 1); uy = dyp / (dist || 1);
    let rem = dist; for (let i = 1; i < _gw.path.length; i++) rem += Math.hypot((_gw.path[i].x - _gw.path[i - 1].x) * W.cellW, (_gw.path[i].y - _gw.path[i - 1].y) * W.cellH);
    sneak = _gw.sneak;
    want = sneak ? GW_SPEED.sneak : rem > 170 ? GW_SPEED.run : GW_SPEED.walk;
    want = Math.min(want, Math.sqrt(2 * GW_ACC * rem) + 34);   // ease in to the stop
  }
  _gw.spd = _gw.spd || 0;
  if (!want) _gw.spd = 0;
  else if (!gardenMotionOn()) _gw.spd = want;
  else { const a = GW_ACC * dt; _gw.spd += Math.max(-a * 1.4, Math.min(a, want - _gw.spd)); }
  if (want && _gw.spd > 3) {
    const step = _gw.spd * dt;
    if (byKeys) {
      // slide along walls and round corners, never stop on them
      const moved = _gwMoveBy(ux * step / W.cellW, uy * step / W.cellH);
      _gw.moving = moved; if (!moved) _gw.spd = 0;
    } else {
      let arrived = false;
      if (dist <= step) { _gw.px = tgt.x; _gw.py = tgt.y; _gw.path.shift(); arrived = !_gw.path.length; }
      else {
        const px0 = _gw.px, py0 = _gw.py, moved = _gwMoveBy(ux * step / W.cellW, uy * step / W.cellH);
        // how much of the step went the way we are heading: sliding sideways along a wall that is in the way is not getting anywhere
        const gain = moved ? ((_gw.px - px0) * W.cellW * ux + (_gw.py - py0) * W.cellH * uy) / Math.max(step, 0.01) : 0;
        _gw.blockT = gain < 0.35 ? (_gw.blockT || 0) + dt : 0;
        if (!moved || _gw.blockT > 0.25) {
          // the way is shut (something grew, or a corner caught the feet): plan another way to the same place, and stop only if there is none
          _gw.spd = 0; _gw.blockT = 0;
          if (!_gwRepath()) { _gw.path = []; _gw.then = null; }
        }
      }
      _gw.moving = _gw.spd > 3 || arrived;
      if (arrived) { _gw.moving = false; _gw.spd = 0; const th = _gw.then; _gw.then = null; _gwSaveSoon(); if (typeof th === 'function') { try { th(true); } catch (e) { console.error('[garden]', e); } } }
    }
    if (Math.abs(ux) > 0.3) _gw.face = ux > 0 ? 1 : -1;
    _gw.sneak = sneak;
    if (_gw.moving) _gwSaveSoon();
  } else if (_gw.moving) { _gw.moving = false; _gwSaveSoon(); }
  if (pushed) { _gw.moving = true; _gwSaveSoon(); }
  if (_gw.moving !== _gw._wasMoving) { _gw._wasMoving = _gw.moving; _gwBody(); }
  _gwApplyNode();
  _gwFadeProps();
  // 2. the things that live in the actors layer
  if (typeof _gwFishFrame === 'function') _gwFishFrame(dt);
  if (typeof _gwBugsFrame === 'function') _gwBugsFrame(dt);
  _gwPetFrame(dt);
  // 3. the camera
  if (gardenCamMode() === 'fit' ? _gw.cam.dirty : true) _gwApplyCam(dt);
  _gw.raf = requestAnimationFrame(_gwFrame);
}
/** A building you walk behind turns see-through, so you never lose yourself behind the shop. */
function _gwFadeProps() {
  const key = Math.floor(_gw.px * 2) + ',' + Math.floor(_gw.py * 2) + ',' + (_gw.svg && _gw.svg._gwFadeGen);
  if (_gw._fadeKey === key || !_gw.svg) return;
  _gw._fadeKey = key;
  for (const p of GARDEN_PROPS) {
    if (!p.kind) continue;
    const n = _gw.svg.querySelector('.gd-prop[data-prop="' + p.id + '"]'); if (!n) continue;
    const tall = p.tall == null ? 2 : p.tall;
    const behind = _gw.px > p.x - 0.4 && _gw.px < p.x + p.w + 0.4 && _gw.py > p.y - tall && _gw.py < p.y + p.h - 0.05;
    n.classList.toggle('gd-behind', behind);
  }
}
const GW_POS_KEY = 'opendash.garden.pos';
function _gwSaveSoon() {
  clearTimeout(_gw.saveT);
  _gw.saveT = setTimeout(() => { try { localStorage.setItem(GW_POS_KEY, JSON.stringify({ x: Math.round(_gw.px * 10) / 10, y: Math.round(_gw.py * 10) / 10 })); } catch (e) { /* private window: you start at the gate next time */ } }, 1200);
}
function _gwSavedPos() { try { const o = JSON.parse(localStorage.getItem(GW_POS_KEY) || 'null'); return o && Number.isFinite(o.x) && Number.isFinite(o.y) ? o : null; } catch (e) { return null; } }

/* ---------- the pet: it trots after you, sits when you stop, and sits at the pier while you fish ---------- */
function _gwPetSprite() {
  if (typeof window === 'undefined' || typeof window.petGardenSprite !== 'function') return null;
  const m = gardenModel(), key = [m.season, m.tod, !!m.rain.now].join('|');
  if (_gw.petKey === key && _gw.petSvg !== undefined) return _gw.petSvg;
  let list = null;
  try { list = window.petGardenSprite({ season: m.season, tod: m.tod, size: 'm', readOnly: false, rain: !!m.rain.now }); } catch (e) { list = null; }
  if (list && !Array.isArray(list)) list = [list];
  const p = list && list[0];
  _gw.petKey = key; _gw.petSvg = p && typeof p.svg === 'string' && p.svg.length < 40000 ? p.svg : '';
  return _gw.petSvg;
}
function _gwPetFrame(dt) {
  const svg = _gwPetSprite();
  const W = GARDEN_WORLD;
  if (!svg) { if (_gw.pet && _gw.pet.node && _gw.pet.node.parentNode) _gw.pet.node.remove(); _gw.pet = null; return; }
  let P = _gw.pet;
  if (!P || !P.node || P.svg !== svg) {
    if (P && P.node && P.node.parentNode) P.node.remove();
    if (_gw.svg) for (const n of _gw.svg.querySelectorAll('.gd-pet-follow')) n.remove();
    const NS = 'http://www.w3.org/2000/svg', g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'gd-pet gd-pet-follow');
    g.innerHTML = `<g class="gdp-body"><g class="gdp-face"><g transform="scale(${GW_PET_SCALE})">${svg}</g></g></g>`;
    P = _gw.pet = { node: g, svg, x: _gw.px - 1.2, y: _gw.py + 0.2, face: 1, z: -1, moving: false };
  }
  // follow: keep about a cell and a half behind, never on top of you
  const dx = (_gw.px - P.x) * W.cellW, dy = (_gw.py - P.y) * W.cellH, dist = Math.hypot(dx, dy), want = 40;
  let mv = false;
  if (dist > want + 10) {
    const sp = Math.min((_gw.moving ? 260 : 170), dist - want) * dt;
    const nx = P.x + dx / dist * sp / W.cellW, ny = P.y + dy / dist * sp / W.cellH;
    if (gardenWalkable(Math.floor(nx), Math.floor(ny))) { P.x = nx; P.y = ny; mv = true; } else if (gardenWalkable(Math.floor(nx), Math.floor(P.y))) { P.x = nx; mv = true; } else if (gardenWalkable(Math.floor(P.x), Math.floor(ny))) { P.y = ny; mv = true; }
    if (Math.abs(dx) > 4) P.face = dx > 0 ? 1 : -1;
  }
  if (dist > 320) { P.x = _gw.px - 1; P.y = _gw.py; }
  P.moving = mv;
  const x = P.x * W.cellW, y = W.sky + P.y * W.cellH;
  const hop = mv && gardenMotionOn() ? -Math.abs(Math.sin(_gw.t * 14)) * 2.2 : 0;
  P.node.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + hop).toFixed(1)})`);
  P.node.setAttribute('data-z', (P.y + 0.001).toFixed(2));
  const face = P.node.querySelector('.gdp-face'); if (face) face.setAttribute('transform', P.face < 0 ? 'scale(-1 1)' : '');
  const z = Math.floor(P.y * 2); if (z !== P.z || !P.node.parentNode) { P.z = z; _gwPlace(P.node, P.y); }
}

/* ---------- clicks: you just click what you want ---------- */
/** The building, board or box a point is on (its art stands up above its footprint), or null. */
function _gwPropAtPt(wx, wy) {
  for (const p of GARDEN_PROPS) {
    if (!p.act) continue;
    const tall = p.tall == null ? 2 : p.tall;
    if (wx >= p.x - 0.1 && wx <= p.x + p.w + 0.1 && wy >= p.y - tall && wy <= p.y + p.h) return p;
  }
  return null;
}
function _gwOpenProp(p) {
  if (!p) return;
  const go = {
    tackle: () => gardenPopupOpen('catch', { sub: 'tackle', title: 'Tackle shop' }), journal: () => gardenPopupOpen('catch', { sub: 'fish', title: 'Field journal' }),
    shop: () => gardenPopupOpen('shop'), basket: () => gardenPopupOpen('basket'), almanac: () => gardenPopupOpen('almanac'), friends: () => gardenPopupOpen('friends'),
    photo: () => { if (typeof gardenPhotoOpen === 'function') gardenPhotoOpen(); }, timelapse: () => { if (typeof gardenTimelapseOpen === 'function') gardenTimelapseOpen(); },
  }[p.act];
  if (go) go();
}
/** Walk to a building's door and go in. */
function _gwGoToProp(p) {
  const d = p.door || { x: Math.floor(p.x + p.w / 2), y: p.y + p.h };
  const door = { x: d.x + 0.5, y: d.y + 0.5 };
  if (Math.hypot((door.x - _gw.px) * GARDEN_WORLD.cellW, (door.y - _gw.py) * GARDEN_WORLD.cellH) < 56) { _gw.path = []; _gwOpenProp(p); return; }
  if (!gardenWalkToPoint(door, () => _gwOpenProp(p), { radius: 1.5 })) _gdpSay({ ok: false, msg: 'You cannot get to the door.' });
}
function gardenGoToProp(id) { const p = GARDEN_PROPS.find(x => x.id === id); if (p) _gwGoToProp(p); }
/** What is under the pointer: {kind, text} for a building, a bug or the water; null for anything else. */
function gardenWorldHover(ev, cell) {
  if (!_gw.on) return null;
  const tool = _gdpTool(), pt = _gwPointAt(ev) || (cell ? { x: cell.x + 0.5, y: cell.y + 0.5 } : null);
  _gw.hoverBug = '';
  if (!pt) return null;
  const prop = _gwPropAtPt(pt.x, pt.y);
  if (prop) return { kind: 'prop', id: prop.id, text: `${prop.name}: ${prop.blurb} Click to go in` };
  if (tool === 'seed') return null;
  const bug = typeof _gwBugNear === 'function' ? _gwBugNear(pt.x, pt.y, 0.8) : null;
  if (bug) { _gw.hoverBug = bug.key; return { kind: 'bug', text: `${bug.def.name}: click to creep up and net it` }; }
  const c = cell || { x: Math.floor(pt.x), y: Math.floor(pt.y) }, m = gardenModel(), oc = m.occ.get(c.x + ',' + c.y);
  if (gardenIsWater(c.x, c.y) && !(oc && oc.plant)) { const z = gardenWaterZone(c.x, c.y); return { kind: 'water', text: `Click to cast a line: ${({ pond: 'the pond', shallow: 'the shallows', mid: 'open water', deep: 'deep water' })[z] || 'the water'}` }; }
  return null;
}
/**
 * A click on the stage (from _gdpClick, every tool but Decorate). Returns true when the world handled it.
 * You never pick a tool to fish or to catch a bug: click the water, click the bug, click the shop.
 * it: the item under the pointer ({uid, kind}) or null; cell: the cell or null; ev: the pointer event (its exact point is used).
 */
function gardenWorldClick(it, cell, ev, m) {
  if (!_gw.on || !cell) return false;
  const tool = _gdpTool();
  if (typeof _gwFishBusy === 'function' && _gwFishBusy()) { return typeof _gwFishClick === 'function' ? _gwFishClick(cell, ev) : true; }   // a line is out: a click reels
  const pt = _gwPointAt(ev) || { x: cell.x + 0.5, y: cell.y + 0.5 };
  // 1. a building, a board or a box: walk to its door and go in
  const prop = _gwPropAtPt(pt.x, pt.y);
  if (prop) { _gwGoToProp(prop); return true; }
  if (tool === 'seed') return false;   // planting is its own click (the sweep)
  // 2. a bug: creep up on it
  const bug = typeof _gwBugNear === 'function' ? _gwBugNear(pt.x, pt.y, 0.8) : null;
  if (bug) { _gwNetChase(bug); return true; }
  const plant = it && it.kind === 'plant' ? gardenPlantById(m, it.uid) : _gdpPlantAtCell(m, cell);
  const decor = it && it.kind === 'decor' ? gardenDecorById(m, it.uid) : null;
  // 3. the water: cast
  if (!plant && gardenIsWater(cell.x, cell.y) && typeof gardenFishClickPt === 'function') return gardenFishClickPt(pt, m);
  // 4. something in the garden: the tool does its work at once (the page's own handler) and you walk over to it;
  //    the aquarium, the bug case and the trophy board open your showcase
  if (plant || decor) {
    if (decor && decor.def.effect && decor.def.effect.kind === 'show' && tool === 'hand') {
      gardenWalkToPoint({ x: decor.x + (decor.def.w || 1) / 2, y: decor.y + (decor.def.h || 1) + 0.4 }, () => gardenCatchOpen('show'), { radius: 2 });
      return true;
    }
    gardenWorldFace(cell);
    gardenWalkToPoint({ x: (plant ? plant.x + plant.fp / 2 : decor.x + (decor.def.w || 1) / 2), y: (plant ? plant.y + plant.fp : decor.y + (decor.def.h || 1)) + 0.4 }, null, { radius: 3 });
    return false;
  }
  // 5. the ground: walk to exactly where you clicked
  if (!gardenWalkToPoint(pt, null, { radius: 3 })) _gdpSay({ ok: false, msg: 'You cannot get there.' });
  return true;
}
const _GW_KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
/** A key on the stage. Returns true when it was a world key (the page then does nothing else with it). */
function gardenWorldKey(ev, down, arrowsOnly) {
  if (!_gw.on) return false;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  const dir = _GW_KEYMAP[ev.key] && (!arrowsOnly || ev.key.startsWith('Arrow')) ? _GW_KEYMAP[ev.key] : null;
  if (dir) {
    if (down && ev.key === 'W') return false;   // Shift+W is "water everything": W alone walks
    // up lifts the bar while you reel; otherwise it walks
    if (dir === 'up' && _gw.reel) { _gw.reel.hold = !!down; ev.preventDefault(); return true; }
    if (down) { _gw.keys.add(dir); if (ev.shiftKey) _gw.keys.add('shift'); else _gw.keys.delete('shift'); _gwEnsureLoop(); } else _gw.keys.delete(dir);
    ev.preventDefault(); return true;
  }
  if (ev.key === 'Shift') { if (down) _gw.keys.add('shift'); else _gw.keys.delete('shift'); return false; }
  if (!down) { if (ev.key === ' ' || ev.key === 'e' || ev.key === 'E') { if (typeof _gwFishRelease === 'function') _gwFishRelease(); return true; } return false; }
  const k = ev.key;
  if (k === '+' || k === '=') { gardenCamSet(null, -1); ev.preventDefault(); return true; }
  if (k === '-' || k === '_') { gardenCamSet(null, 1); ev.preventDefault(); return true; }
  if (k === 'f' || k === 'F') { gardenCamSet(gardenCamMode() === 'fit' ? 'follow' : 'fit'); ev.preventDefault(); return true; }
  if (k === 'c' || k === 'C') { gardenCamSet('follow'); ev.preventDefault(); return true; }
  if (arrowsOnly) return false;
  if (k === ' ' || k === 'e' || k === 'E') { if (ev.repeat) { ev.preventDefault(); return true; } gardenWorldInteract(); ev.preventDefault(); return true; }
  return false;
}
/** Space / E: do the sensible thing right here: a bite, a door beside you, a bug in reach, a ripe plant, water in front of you. */
function gardenWorldInteract() {
  if (typeof _gwFishBusy === 'function' && _gwFishBusy()) { if (typeof _gwFishPress === 'function') _gwFishPress(); return; }
  const m = gardenModel(), W = GARDEN_WORLD;
  const px = Math.floor(_gw.px), py = Math.floor(_gw.py);
  for (const p of GARDEN_PROPS) if (p.act && p.door && Math.abs(p.door.x - px) <= 1 && Math.abs(p.door.y - py) <= 1) { _gwOpenProp(p); return; }
  if (_gw.bugs && _gw.bugs.size && typeof gardenNetSwing === 'function') { for (const b of _gw.bugs.values()) if (Math.hypot(b.x - _gw.px, (b.y - _gw.py) * 1.4) < gardenNet().st.reach * 1.35) { gardenNetSwing(null); return; } }
  const fx = px + (_gw.face > 0 ? 1 : -1), fy = py;
  const cells = [[fx, fy], [px, py + 1], [px, py - 1], [px + 1, py], [px - 1, py], [fx, fy + 1], [fx, fy - 1]];
  for (const [cx, cy] of cells) {
    if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) continue;
    const c = m.occ.get(cx + ',' + cy), p = c && c.plant ? gardenPlantById(m, c.plant) : null;
    if (p) { _gdpClick({ uid: p.uid, kind: 'plant' }, { x: cx, y: cy }, null); return; }
  }
  if (typeof gardenFishFront === 'function') { for (let r = 1; r <= gardenRod().st.range; r++) for (const dy of [1, 0, -1]) { const x = px + _gw.face * r, y = py + dy; if (x >= 0 && x < W.cols && y >= 0 && y < W.rows && gardenIsWater(x, y)) { gardenFishFront(); return; } } for (let r = 1; r <= gardenRod().st.range; r++) if (py + r < W.rows && gardenIsWater(px, py + r)) { gardenFishFront(); return; } }
  _gdpSay({ ok: false, msg: 'Nothing in reach. Click what you want: the water, a bug, a plant, a building.' });
}

/* ---------- start, stop, paint ---------- */
function gardenWorldStart(root, m) {
  gardenWorldStop(true);
  _gw.on = true; _gw.root = root; _gw.box = root.querySelector('.gd-stagebox'); _gw.cam.init = false; _gw.cam.dirty = true; _gw.t = 0;
  // where you stood: this page's own position if the garden is drawn again (another tab wrote, the state was replaced), else the last one on this device
  const sv = _gw.placed ? { x: _gw.px, y: _gw.py } : _gwSavedPos();
  if (sv && _gwFree(sv.x, sv.y)) { _gw.px = sv.x; _gw.py = sv.y; }
  else { const f = _gwNearestFree(10, 9, 8) || { x: 10, y: 9 }; _gw.px = f.x + 0.5; _gw.py = f.y + 0.5; }
  _gw.placed = true; _gw.path = []; _gw.then = null; _gw.moving = false; _gw.fig = { idle: '', walk: '' }; _gw.bodyKey = ''; _gw.node = null; _gw.pet = null; _gw.keys.clear();
  if (_gw.box) {
    _gwBuildCamUi(_gw.box);
    if (typeof ResizeObserver !== 'undefined') { _gw.ro = new ResizeObserver(() => { _gw.cam.dirty = true; _gw.cam.snap = true; _gwEnsureLoop(); }); _gw.ro.observe(_gw.box); }
    _gw.box.addEventListener('keyup', _gwKeyUp);
    _gw.box.addEventListener('blur', _gwBlur);
  }
  document.addEventListener('keydown', _gwDocKeyDown); document.addEventListener('keyup', _gwDocKeyUp);
  if (!_gw.vis) { _gw.vis = true; document.addEventListener('visibilitychange', () => { if (!document.hidden) { _gw.last = 0; _gwEnsureLoop(); } }); window.addEventListener('blur', _gwBlur); }
  gardenWorldPainted(m || gardenModel());
  _gwUpdateCamUi();
  if (typeof _gwFishResume === 'function') _gwFishResume();   // a line that was out when the garden was drawn again is still out
  _gwEnsureLoop();
}
function _gwKeyUp(ev) { gardenWorldKey(ev, false); }
/* The keys work wherever you are on the garden page (not only when the stage itself has focus): after you click a button or a tool the
   focus is elsewhere, and having to click the garden again before the keys work was the old garden's worst habit. Text fields, buttons,
   menus and dialogs keep their own keys. */
function _gwDocKeyDown(ev) {
  if (!_gw.on || !_gdp.root || state.view !== 'garden' || ev.defaultPrevented || ev.isComposing || _gdp.pop) return;
  const t = ev.target;
  if (t && t.closest && (t.closest('.gd-stagebox') || t.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"], .gd-guide, .modal, .popover, .cmdk, .palette'))) return;
  if (document.querySelector('.gd-guide, .modal-backdrop.is-open, .cmdk.is-open')) return;
  _gdpKey(ev);
}
function _gwDocKeyUp(ev) { if (_gw.on) gardenWorldKey(ev, false); }
function _gwBlur() { _gw.keys.clear(); if (typeof _gwFishRelease === 'function') _gwFishRelease(); }
function gardenWorldStop(keepOn) {
  if (_gw.raf) cancelAnimationFrame(_gw.raf);
  _gw.raf = 0;
  if (_gw.ro) { _gw.ro.disconnect(); _gw.ro = null; }
  if (_gw.box) { _gw.box.removeEventListener('keyup', _gwKeyUp); _gw.box.removeEventListener('blur', _gwBlur); }
  document.removeEventListener('keydown', _gwDocKeyDown); document.removeEventListener('keyup', _gwDocKeyUp);
  // leaving the garden ends your line; the garden only being drawn again (another tab or the server wrote the state) does not
  if (!keepOn && typeof _gwFishReset === 'function') _gwFishReset(); else _gw.fx = null;
  if (typeof _gwBugsReset === 'function') _gwBugsReset();
  if (!keepOn) { _gw.on = false; _gw.root = null; _gw.svg = null; _gw.box = null; _gw.node = null; _gw.pet = null; _gw.grid = null; }
}
/** After every paint of the stage: the svg may be a new element (a mount), or the patch may have dropped our nodes. */
function gardenWorldPainted(m) {
  if (!_gw.on || !_gdp.svg) return;
  if (_gw.svg !== _gdp.svg) { _gw.svg = _gdp.svg; _gw.node = null; _gw.cam.init = false; _gw.cam.dirty = true; if (_gw.pet) { _gw.pet.node = null; _gw.pet = null; } if (typeof _gwBugsReset === 'function') _gwBugsReset(); }
  _gwGrid(m);
  if (!_gw.node || !_gw.node.isConnected) { for (const n of _gw.svg.querySelectorAll('.gd-player')) n.remove(); _gw.node = _gwMakeNode(); _gw.bodyKey = ''; _gwBody(); }
  else for (const n of _gw.svg.querySelectorAll('.gd-player')) if (n !== _gw.node) n.remove();
  // you may have been boxed in by a new plant or decoration: step to the nearest free cell
  if (!_gwFree(_gw.px, _gw.py)) { const f = _gwNearestFreePt(_gw.px, _gw.py, 4) || (() => { const c = _gwNearestFree(Math.floor(_gw.px), Math.floor(_gw.py), 8); return c ? { x: c.x + 0.5, y: c.y + 0.5 } : null; })(); if (f) { _gw.px = f.x; _gw.py = f.y; _gw.path = []; } }
  _gw.z = -1; _gw._fadeKey = ''; _gwApplyNode();
  if (_gw.pet && _gw.pet.node) { _gw.pet.z = -1; _gwPlace(_gw.pet.node, _gw.pet.y); }
  if (typeof _gwBugsSync === 'function') _gwBugsSync(m);
  _gwApplyCam(0.016, !_gw.cam.init);
  _gwEnsureLoop();
}

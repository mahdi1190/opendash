/* ============================================================
   GARDEN DESIGNER, the tools. A mode you enter and leave: everything happens on a draft you can see, walled and drawn as it would be, and nothing is saved or sent until "Keep my changes".
   Undo steps back through the draft; Cancel drops it. Only your own garden, never on a visit.

     gardenDesignEnter() / gardenDesignKeep() / gardenDesignCancel()
     gardenDesignMoveCheck(thing, x, y)   '' or why not, in plain words, with where its door would be: the one rule for everything that can stand in the way
     pointer: one set of listeners in the capture phase on the stage, so while this is on nothing below it hears a press. Mouse and finger are the same code.

   A stroke is drawn into a single live <path> in the stage's ui layer and only becomes part of the scene when it ends, then just the design layer is swapped: no redraw of the stage per stroke.
   ============================================================ */
function _gdzT() { return _gdzT.s || (_gdzT.s = { on: false, draft: null, lay: null, dm: {}, hist: [], tool: 'path', pathStyle: 0, groundStyle: 0, rubbing: false, cam: null, say: '', bad: false, lifted: null, stroke: null, press: null, was: null, make: { kind: 0, pair: 0, pat: 0, text: '' } }); }
function gardenDesignOn() { return !!_gdzT.s && _gdzT.s.on; }
function gardenDesignCam(ar, wpx, hpx) {
  if (!gardenDesignOn()) return null;
  const C = _gdzT().cam; let vh = C.vh, vw = vh * ar;
  if (vw > wpx) { vw = wpx; vh = vw / ar; }
  if (vh > hpx) { vh = hpx; vw = vh * ar; }
  C.cx = Math.max(vw / 2, Math.min(wpx - vw / 2, C.cx)); C.cy = Math.max(vh / 2, Math.min(hpx - vh / 2, C.cy));
  return { x: C.cx - vw / 2, y: C.cy - vh / 2, w: vw, h: vh };
}
function gardenDesignPan(dx, dy) { const C = _gdzT().cam; const ar = (_gw.size.w || 4) / (_gw.size.h || 3); C.cx += dx * C.vh * ar * 0.3; C.cy += dy * C.vh * 0.3; _gw.cam.dirty = true; _gwEnsureLoop(); }
const _GDZ_ZOOMS = Object.freeze([290, 450, 690, 1040, 1470]);
function gardenDesignZoom(dir) { const C = _gdzT().cam, i = Math.max(0, Math.min(_GDZ_ZOOMS.length - 1, _GDZ_ZOOMS.findIndex(v => v >= C.vh) + dir)); C.vh = _GDZ_ZOOMS[i]; _gw.cam.dirty = true; _gwEnsureLoop(); }
/** The decorations as the draft has them. */
function gardenDesignDecorDraft(list) {
  if (!gardenDesignOn()) return list;
  const dm = _gdzT().dm; if (!Object.keys(dm).length) return list;
  return list.map(d => (dm[d.uid] ? Object.assign({}, d, { x: dm[d.uid][0], y: dm[d.uid][1] }) : d));
}
/** Your garden's model with the draft's decorations where the draft has them (for the checks: nothing is saved). */
function _gdzModel() {
  const m = gardenModel(), dm = _gdzT().dm; if (!Object.keys(dm).length) return m;
  const occ = new Map(); for (const [k, c] of m.occ) occ.set(k, Object.assign({}, c));
  const decor = gardenDesignDecorDraft(m.decor);
  for (const d of m.decor) if (dm[d.uid]) for (const c of occ.values()) { if (c.decor === d.uid) delete c.decor; if (c.ground === d.uid) delete c.ground; }
  for (const d of decor) if (dm[d.uid]) for (let dy = 0; dy < (d.def.h || 1); dy++) for (let dx = 0; dx < (d.def.w || 1); dx++) { const k = (d.x + dx) + ',' + (d.y + dy); const c = occ.get(k) || {}; occ.set(k, c); if (d.def.layer === 'ground') c.ground = d.uid; else c.decor = d.uid; }
  return Object.assign({}, m, { decor, occ });
}

/* ---------- can it go there? ---------- */
function _gdzFlood(grid) {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, st = W.start, seen = new Uint8Array(C * R), stack = [st.y * C + st.x];
  if (grid[stack[0]]) return seen;
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % C, y = (i - x) / C;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue; const j = ny * C + nx; if (!seen[j] && !grid[j]) { seen[j] = 1; stack.push(j); } }
  }
  return seen;
}
function _gdzPlaceName(x, y) {
  const c = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null;
  return c && c.name ? String(c.name).replace(/^The /, 'the ') : c && c.lane ? 'part of the lane' : 'part of your land';
}
/** What is on these cells that stops something standing here? '' or the reason. */
function _gdzCellsWhy(m, x, y, w, h, selfProp, selfUid) {
  const W = GARDEN_WORLD;
  if (x < 0 || y < 0 || x + w > W.cols || y + h > W.rows) return 'That is off the edge of the garden.';
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const cx = x + dx, cy = y + dy, a = gardenAreaAt(cx, cy, m.level.level);
    if (a.startsWith('locked:')) { const ar = gardenArea(a.slice(7)); return ar && ar.solid ? 'The trees are too thick there.' : `${ar ? ar.name : 'That land'} is not yours yet.`; }
    if (gardenIsWater(cx, cy)) return 'It would be standing in the water.';
    const pr = gardenPropAt(cx, cy); if (pr && pr !== selfProp && pr.id !== (selfProp && selfProp.id)) return `${pr.name} is already there.`;
    const c = m.occ.get(cx + ',' + cy);
    if (c && c.plant) { const p = gardenPlantById(m, c.plant); return `${p ? p.def.name : 'A plant'} is growing there. Move it first.`; }
    if (c && c.decor && c.decor !== selfUid) { const d = gardenDecorById(m, c.decor); return `${d ? d.def.name : 'A decoration'} is there. Move it first.`; }
  }
  return '';
}
/**
 * The one rule. `build` puts the thing at its new place and takes it away again; what this compares is the same grid the walking uses, before and after.
 * Nothing may stop you reaching land you could reach, or a door you could reach, and the thing's own door must be reachable. '' or a plain reason, and door cell in out.door.
 */
function _gdzReachWhy(m, thing, out, build) {
  const W = GARDEN_WORLD, before = _gdzFlood(_gwBuildGrid(m)), doorsBefore = gardenPropsNow().filter(p => p.act && p.door && (!p.needs || gardenWorkOwned(p.needs)) && before[p.door.y * W.cols + p.door.x]).map(p => p.id);
  const undo = build(), m2 = out.model || m;
  gardenLandPropsReset();
  try {
    const grid = _gwBuildGrid(m2), after = _gdzFlood(grid), st = W.start;
    if (grid[st.y * W.cols + st.x]) return 'Keep this spot clear: it is where you come into the garden.';
    if (out.doorOf) {
      const d = out.doorOf(after); if (!d) return `You could not walk up to ${thing} there. Try a spot with open ground beside it.`;
      out.door = d;
    }
    for (let i = 0; i < after.length; i++) if (before[i] && !after[i] && !grid[i]) { const x = i % W.cols, y = (i - x) / W.cols; return `That would cut off ${_gdzPlaceName(x, y)}: you could not walk there any more.`; }
    for (const p of gardenPropsNow()) if (doorsBefore.includes(p.id) && p.door && !after[p.door.y * W.cols + p.door.x]) return `You could not reach the door of ${String(p.name).replace(/^The /, 'the ')} any more.`;
    return '';
  } finally { undo(); gardenLandPropsReset(); }
}
/** Can this fixed row stand with its corner at x, y? {why, door}. */
function gardenDesignMoveCheck(row, x, y, o) {
  const m = _gdzModel(), w = row.w || 1, h = row.h || 1, base = gardenDesignBase(row.id), strict = !(o && o.loose), cls = gardenDesignClass(row);   // loose: Put it back and old layouts, only the reach rule
  const res = { why: _gdzCellsWhy(m, x, y, w, h, row, ''), door: null };
  if (res.why) return res;
  if (strict) { res.why = gardenDesignStandWhy({ cls: cls === 'building' ? 'building' : 'stand', x, y, w, h, key: row.kind || row.id, name: row.name, beside: GDZ_STRICT.besideArts.includes(row.art), self: { id: row.id } }, m, _gdzT().draft); if (res.why) return res; }
  // where you knock: the same side as it had, or else any side with ground you can walk to
  const off = base && base.door ? [base.door.x - base.x, base.door.y - base.y] : null, tries = [];
  if (off) tries.push([x + off[0], y + off[1]]);
  for (let k = 0; k < w; k++) tries.push([x + k, y + h]);
  for (let k = 0; k < h; k++) { tries.push([x - 1, y + k]); tries.push([x + w, y + k]); }
  for (let k = 0; k < w; k++) tries.push([x + k, y - 1]);
  const mask = gardenDesignPathMask(_gdzT().draft, m), needPath = strict && cls === 'building', byPath = (dx, dy) => { const g = GDZ_STRICT.building.doorToPath; for (let cy = dy - g; cy <= dy + g; cy++) for (let cx = dx - g; cx <= dx + g; cx++) if (cx >= 0 && cy >= 0 && cx < GARDEN_WORLD.cols && cy < GARDEN_WORLD.rows && mask[cy * GARDEN_WORLD.cols + cx]) return true; return false; };
  const W = GARDEN_WORLD, ox = row.x, oy = row.y, od = row.door;
  const out = { doorOf: !row.door ? null : (after) => { for (const [dx, dy] of tries) { if (dx < 0 || dy < 0 || dx >= W.cols || dy >= W.rows || Math.abs(dx - x) > GDZ_LIMITS.door || Math.abs(dy - y) > GDZ_LIMITS.door || (needPath && !byPath(dx, dy))) continue; if (after[dy * W.cols + dx]) return { x: dx, y: dy }; } return null; } };
  if (needPath && !tries.some(([dx, dy]) => dx >= 0 && dy >= 0 && dx < W.cols && dy < W.rows && byPath(dx, dy))) { res.why = `The door of ${String(row.name).replace(/^The /, 'the ')} has to face a path. Try right beside one.`; return res; }
  res.why = _gdzReachWhy(m, String(row.name).replace(/^The /, 'the '), out, () => { row.x = x; row.y = y; return () => { row.x = ox; row.y = oy; row.door = od; }; });
  res.door = out.door || null;
  return res;
}
/** Can a decoration go here? {why}. A wall of them can shut a door as well as a shop can. */
function _gdzDecorCheck(d, x, y) {
  const m = _gdzModel(), why = _gdPlaceOk(m, d.def, x, y, 'decor', d.uid); if (why) return { why: why.replace(/\.?$/, '.') };
  const sw = d.def.layer === 'ground' ? '' : gardenDesignStandWhy({ cls: 'stand', x, y, w: d.def.w || 1, h: d.def.h || 1, key: d.def.id, name: d.def.name, free: GDZ_STRICT.freeCats.includes(d.def.cat), beside: !!(d.def.effect && GDZ_STRICT.besideEffects.includes(d.def.effect.kind)), self: { uid: d.uid } }, m, _gdzT().draft); if (sw) return { why: sw };
  if (d.def.layer === 'ground' || gardenDecorCol(d.def) !== 'full') return { why: '' };
  const prev = _gdzT().dm[d.uid];
  const out = { model: null };
  return { why: _gdzReachWhy(m, d.def.name, out, () => { _gdzT().dm[d.uid] = [x, y]; out.model = _gdzModel(); return () => { if (prev) _gdzT().dm[d.uid] = prev; else delete _gdzT().dm[d.uid]; }; }) };
}
/** A row of what you made can stand where nothing else does; it is a small box, so it never shuts anything. */
function _gdzMadeCheck(x, y, i, c) {
  const self = i == null ? null : gardenDesignLandProps()[i], m = _gdzModel(), def = GDZ_MADE[c[0]] || GDZ_MADE[0];
  const why = _gdzCellsWhy(m, x, y, 1, 1, self, ''); if (why) return { why };
  return { why: gardenDesignStandWhy({ cls: 'stand', x, y, w: 1, h: 1, key: 'made-' + def.id, name: 'Your ' + def.id, made: def.id, self: { id: self ? self.id : '', madeI: i } }, m, _gdzT().draft) };
}
/** The nearest spot that works, within GDZ_STRICT.snap, so a slightly wrong tap still lands right. */
function _gdzSnapNear(x, y, check) {
  const R = GDZ_STRICT.snap;
  for (let r = 1; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const c = check(x + dx, y + dy); if (!c.why) return { x: x + dx, y: y + dy, r: c }; }
  return null;
}

/* ---------- the draft ---------- */
function _gdzSnapshot() { const T = _gdzT(); return JSON.stringify({ d: T.draft, dm: T.dm, lay: T.lay }); }
function _gdzPush() { const T = _gdzT(); T.hist.push(_gdzSnapshot()); if (T.hist.length > 60) T.hist.shift(); }
function gardenDesignUndo() {
  const T = _gdzT(), s = T.hist.pop(); if (!s) { _gdzSay('Nothing to undo.'); return; }
  const j = JSON.parse(s); T.draft = j.d; T.dm = j.dm; T.lay = j.lay; T.lifted = null; _gdzLive('');
  _gdzStage(); _gdzSay('Undone.'); gardenDesignPanel();
}
/** Bring the whole stage up to the draft: after something that stands has moved. */
function _gdzStage() { gardenDesignShow(_gdzT().draft); _gd.rev++; _gd.memoKey = ''; if (typeof _gdpPaintStage === 'function') _gdpPaintStage(gardenHere()); _gwEnsureLoop(); }
/** Only the ground and paths changed: swap that one layer, leave the rest of the stage alone. */
function _gdzLayerOnly() {
  const T = _gdzT(); gardenDesignShow(T.draft);
  const svg = _gdp.svg, old = svg && svg.querySelector(':scope > .gd-dz'); if (!old) { _gdzStage(); return; }
  const html = gardenDesignLayer({ dz: T.draft }), t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = html;
  const nu = t.firstElementChild; svg.replaceChild(nu, old);
  if (svg._gdParts) svg._gdParts.layers.design = html;
}
function _gdzSay(text, bad) { const T = _gdzT(); T.say = text || ''; T.bad = !!bad; const el = document.querySelector('.gdz-say'); if (el) { el.textContent = T.say; el.classList.toggle('is-bad', T.bad); } }
/** What goes in the ui layer: the line being drawn, the lifted thing's ghost. Its markup comes from the tables and the stage, never from words. */
function _gdzLiveNode() {
  const svg = _gdp.svg, ui = svg && svg.querySelector('.gd-ui'); if (!ui) return null;
  let g = ui.querySelector('.gdz-live');
  if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'gdz-live'); g.setAttribute('pointer-events', 'none'); ui.appendChild(g); }
  return g;
}
function _gdzLive(html) { const g = _gdzLiveNode(); if (g) { g.innerHTML = html; if (!html) _gdzDroppedMarks(g); } const el = _gdp.svg && _gdp.svg.querySelector('.gdz-lifted'); if (el && !_gdzT().lifted) el.classList.remove('gdz-lifted'); }
/** What will not fit when friends get this: dashed, so you can see which. */
function _gdzDroppedMarks(g) {
  const T = _gdzT(), w = gardenDesignWire(T.draft); let s = '';
  for (const i of w.dropped.paths) { const row = T.draft.p[i]; if (row) s += `<path d="${gardenDesignCurve(gardenDesignPts(row))}" fill="none" stroke="#c0392b" stroke-width="3" stroke-dasharray="7 6"/>`; }
  if (s) g.insertAdjacentHTML('beforeend', s);
}
function _gdzEnc(cells) {
  const by = new Map(); for (const [c, st] of cells) { if (!by.has(st)) by.set(st, []); by.get(st).push(c); }
  const out = [];
  for (const [st, list] of by) { list.sort((a, b) => a - b); const row = [st]; let i = 0; while (i < list.length) { let j = i + 1; while (j < list.length && list[j] === list[j - 1] + 1) j++; row.push(list[i], j - i); i = j; } out.push(row); }
  return out.slice(0, 12);
}
function _gdzDec(g) { const m = new Map(); for (const row of g || []) for (let i = 1; i + 1 < row.length; i += 2) for (let c = row[i]; c < row[i] + row[i + 1]; c++) m.set(c, row[0]); return m; }

/* ---------- entering and leaving ---------- */
function gardenDesignEnter() {
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) { gardenToast('You can only design your own garden.', { now: true, icon: 'paintbrush' }); return; }
  if (typeof _gwFishBusy === 'function' && _gwFishBusy() && typeof _gwFishCancel === 'function') _gwFishCancel();
  const T = _gdzT(), g = _gdG(), box = _gdp.root && _gdp.root.querySelector('.gd-stagebox'); if (!box) return;
  const z = g.dz && g.dz.lay ? g.dz : { cur: 'l1', lay: { l1: { n: 'My garden', d: gardenDesignEmpty() } } };
  T.lay = JSON.parse(JSON.stringify(z));
  const cur = T.lay.lay[T.lay.cur] || (T.lay.lay[T.lay.cur] = { n: 'My garden', d: gardenDesignEmpty() });
  T.draft = gardenDesignClean(cur.d) || gardenDesignEmpty();
  T.was = JSON.stringify(z); T.resume = null; T.dm = {}; T.hist = []; T.lifted = null; T.stroke = null; T.press = null; T.tool = 'path'; T.rubbing = false; T.on = true;
  _gdzHold().draftOf = () => _gdzT().draft;
  _gw.path = []; _gw.then = null; _gw.keys.clear();
  T.cam = { cx: _gw.px * GARDEN_WORLD.cellW, cy: GARDEN_WORLD.sky + _gw.py * GARDEN_WORLD.cellH, vh: 690 };
  box.classList.add('is-designing');
  gardenBubbleClose();
  _gdzBind(box);
  _gdzStage();
  gardenDesignPanel();
  _gdzSay('Press on a path, a plaza or a door, and draw to another one.');
}
/** Leaving by any door: back to what is saved. */
function _gdzClose() {
  const T = _gdzT(); T.on = false; T.lifted = null; T.stroke = null; T.press = null;
  _gdzHold().draftOf = null;
  const box = _gdp.root && _gdp.root.querySelector('.gd-stagebox');
  if (box) { box.classList.remove('is-designing'); const p = box.querySelector(':scope > .gdz'); if (p) p.remove(); }
  const g = _gdzLiveNode(); if (g) g.remove();
  _gw.cam.dirty = true; if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop();
}
/** The page is going away under you (the sidebar, or the app redrawing the view): the draft waits, unsaved, and comes back with the garden (gardenDesignResume). */
function gardenDesignAbort() { if (!gardenDesignOn()) return; const T = _gdzT(); T.resume = { draft: T.draft, dm: T.dm, lay: T.lay, hist: T.hist, tool: T.tool, was: T.was }; _gdzClose(); gardenDesignShow(gardenDesignSaved(_gdG())); }
function gardenDesignResume() {
  const T = _gdzT(), R = T.resume; if (!R || (typeof gardenVisitOn === 'function' && gardenVisitOn())) return;
  T.resume = null; gardenDesignEnter(); Object.assign(T, R); _gdzStage(); gardenDesignPanel(); _gdzSay('Your changes are still here, not saved yet.');
}
function _gdzSameAsSaved() { const T = _gdzT(); return !T.hist.length && !Object.keys(T.dm).length; }
function gardenDesignCancel() {
  const T = _gdzT(), keep = { draft: T.draft, dm: T.dm, lay: T.lay, hist: T.hist }, had = !_gdzSameAsSaved();
  _gdzClose(); _gdzStageSaved();
  if (had) gardenToast('Your changes are gone. The garden is as it was.', { now: true, icon: 'undo-2', timeout: 7000, action: { label: 'Bring them back', run: () => { gardenDesignEnter(); Object.assign(_gdzT(), keep); _gdzStage(); gardenDesignPanel(); } } });
}
function _gdzStageSaved() { gardenDesignShow(gardenDesignSaved(_gdG())); _gd.rev++; _gd.memoKey = ''; gardenRepaintSoon(); }
function gardenDesignKeep() {
  const T = _gdzT(), g = _gdG(), was = T.was, moves = Object.entries(T.dm), backs = [], fails = [];
  T.lay.lay[T.lay.cur].d = JSON.parse(JSON.stringify(T.draft));
  const m0 = gardenModel(), wired = gardenDesignWire(T.draft).dropped;
  _gdzClose();
  g.dz = JSON.parse(JSON.stringify(T.lay));
  gardenDesignShow(gardenDesignSaved(g));
  for (const [uid, [x, y]] of moves) { const d = gardenDecorById(m0, uid); if (!d) continue; const r = gardenMoveDecor(uid, x, y); if (r && r.ok) backs.push([uid, d.x, d.y]); else fails.push(d.def.name); }
  _gdSave();
  _gdEmit('landshow', {});   // friends in the garden get it now (94-garden-live-3host.js)
  if (typeof _gscPublishSoon === 'function') _gscPublishSoon(3000);
  let trim = null; try { if (typeof _gscSnapBody === 'function') { _gscSnapBody(); trim = _gdzHold().trim; } } catch (e) { /* the note is all that needs it */ }
  const left = (wired.paths.length || 0) + (trim ? trim.paths : 0), cells = (wired.cells || 0) + (trim ? trim.cells : 0);
  const lost = left || cells ? ` It is too big to send whole: friends will not see ${[left ? `${left} of your paths` : '', cells ? `${cells} squares of ground` : ''].filter(Boolean).join(' or ')}.` : '';
  const stuck = fails.length ? ` ${fails.join(', ')} could not move there and stayed put.` : '';
  gardenToast('Your garden is saved.' + lost + stuck, { now: true, icon: 'check', timeout: lost || stuck ? 12000 : 6000, action: { label: 'Undo', run: () => { const gg = _gdG(); gg.dz = JSON.parse(was); gardenDesignShow(gardenDesignSaved(gg)); for (const [uid, x, y] of backs) gardenMoveDecor(uid, x, y); _gdSave(); _gdEmit('landshow', {}); } } });
}

/* ---------- layouts ---------- */
function gardenDesignLayoutUse(id) {
  const T = _gdzT(); if (!T.lay.lay[id] || id === T.lay.cur) return;
  _gdzPush();
  T.lay.lay[T.lay.cur].d = JSON.parse(JSON.stringify(T.draft));
  T.lay.cur = id; T.draft = gardenDesignClean(T.lay.lay[id].d) || gardenDesignEmpty();
  // a layout saved a while ago may meet things put out since: anything that no longer works goes back where it started, and says so
  const back = [];
  for (const q of T.draft.m.slice()) {
    const row = gardenDesignRow(q[0]); if (!row) continue;
    T.draft.m = T.draft.m.filter(r => r !== q); gardenDesignShow(T.draft);
    if (gardenDesignMoveCheck(row, q[1], q[2], { loose: true }).why) back.push(row.name); else { T.draft.m.push(q); gardenDesignShow(T.draft); }
  }
  _gdzStage(); gardenDesignPanel();
  _gdzSay(back.length ? `Now showing ${T.lay.lay[id].n}. ${back.join(', ')} could not stand there any more, so it went back where it started.` : `Now showing ${T.lay.lay[id].n}. Keep your changes to stay with it.`, !!back.length);
}
function gardenDesignLayoutNew(name) {
  const T = _gdzT(), ids = Object.keys(T.lay.lay); if (ids.length >= GDZ_LIMITS.layouts) { _gdzSay(`You can keep ${GDZ_LIMITS.layouts} layouts. Remove one first.`, true); return; }
  const n = gardenDesignText(name) || `Layout ${ids.length + 1}`; let k = 1; while (T.lay.lay['l' + k]) k++;
  _gdzPush();
  T.lay.lay[T.lay.cur].d = JSON.parse(JSON.stringify(T.draft));
  T.lay.lay['l' + k] = { n, d: JSON.parse(JSON.stringify(T.draft)) }; T.lay.cur = 'l' + k;
  gardenDesignPanel(); _gdzSay(`${n} saved as a layout.`);
}
function gardenDesignLayoutRemove(id) {
  const T = _gdzT(); if (id === T.lay.cur || !T.lay.lay[id]) return;
  _gdzPush(); delete T.lay.lay[id]; gardenDesignPanel(); _gdzSay('Layout removed. Undo brings it back.');
}

/* ---------- pointer ---------- */
function _gdzPoint(ev) { const p = _gwPointAt(ev); return p ? { x: p.x, y: p.y } : null; }
function _gdzBind(box) {
  if (box._gdzBound) return; box._gdzBound = true;
  const own = (ev) => gardenDesignOn() && !(ev.target && ev.target.closest && ev.target.closest('.gdz'));
  box.addEventListener('pointerdown', (ev) => { if (!own(ev)) return; ev.stopImmediatePropagation(); ev.preventDefault(); if (ev.button !== 0) { _gdzDropCancel(); return; } try { box.setPointerCapture(ev.pointerId); } catch (e) { /* fine */ } _gdzDown(ev); }, true);
  box.addEventListener('pointermove', (ev) => { if (!own(ev)) return; ev.stopImmediatePropagation(); _gdzMove(ev); }, true);
  box.addEventListener('pointerup', (ev) => { if (!own(ev)) return; ev.stopImmediatePropagation(); try { box.releasePointerCapture(ev.pointerId); } catch (e) { /* fine */ } _gdzUp(ev); }, true);
  box.addEventListener('pointercancel', (ev) => { if (!own(ev)) return; ev.stopImmediatePropagation(); const T = _gdzT(); T.stroke = null; T.press = null; _gdzLive(''); }, true);
  box.addEventListener('click', (ev) => { if (own(ev)) ev.stopImmediatePropagation(); }, true);
  box.addEventListener('contextmenu', (ev) => { if (!own(ev)) return; ev.stopImmediatePropagation(); ev.preventDefault(); _gdzDropCancel(); }, true);
  box.addEventListener('wheel', (ev) => { if (!own(ev)) return; ev.stopImmediatePropagation(); ev.preventDefault(); gardenDesignZoom(ev.deltaY > 0 ? 1 : -1); }, { capture: true, passive: false });
  if (_gdzBind.keys) return; _gdzBind.keys = true;
  window.addEventListener('keydown', (ev) => {
    if (!gardenDesignOn()) return;
    const typing = ev.target && ev.target.closest && ev.target.closest('input, textarea');
    if (ev.key === 'Escape') { ev.stopImmediatePropagation(); if (typing) ev.target.blur(); else _gdzDropCancel(); return; }
    if (typing) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.stopImmediatePropagation(); ev.preventDefault(); gardenDesignUndo(); return; }
    const pan = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (pan) { ev.stopImmediatePropagation(); ev.preventDefault(); gardenDesignPan(pan[0], pan[1]); return; }
    if (!ev.target || !ev.target.closest || !ev.target.closest('button')) ev.stopImmediatePropagation();
  }, true);
  window.addEventListener('keyup', (ev) => { if (gardenDesignOn() && !(ev.target && ev.target.closest && ev.target.closest('input, textarea, button'))) ev.stopImmediatePropagation(); }, true);
}
function _gdzDown(ev) {
  const T = _gdzT(), cell = _gdpCellOf(ev), pt = _gdzPoint(ev);
  T.press = { x0: ev.clientX, y0: ev.clientY, moved: false, picked: false };
  if (T.lifted) { _gdzGhostAt(cell); return; }
  if (T.tool === 'path') { if (T.rubbing) _gdzRubPath(pt, true); else _gdzStrokeStart(pt); return; }
  if (T.tool === 'ground') { _gdzPaintStart(cell); return; }
  if (T.tool === 'move') { if (_gdzLift(ev, cell)) T.press.picked = true; }
}
function _gdzMove(ev) {
  const T = _gdzT(), P = T.press;
  if (P && (Math.abs(ev.clientX - P.x0) > 9 || Math.abs(ev.clientY - P.y0) > 9)) P.moved = true;
  if (T.lifted) { _gdzGhostAt(_gdpCellOf(ev)); return; }
  if (!P) { if (T.tool === 'path' && !T.rubbing) _gdzPathHint(_gdzPoint(ev)); return; }
  if (T.tool === 'path') { const pt = _gdzPoint(ev); if (T.rubbing) _gdzRubPath(pt, false); else if (T.stroke) _gdzStrokeMore(pt); }
  else if (T.tool === 'ground') _gdzPaintMore(_gdpCellOf(ev));
}
function _gdzUp(ev) {
  const T = _gdzT(), P = T.press; T.press = null; if (!P) return;
  if (T.lifted) { if (P.picked && !P.moved) return; _gdzGhostAt(_gdpCellOf(ev)); _gdzDrop(); return; }   // a tap picks up and the thing follows you; a drag, or the next tap, puts it down
  if (T.tool === 'path' && T.stroke) _gdzStrokeEnd();
  if (T.tool === 'path' && T.rubbing) _gdzRubEnd();
  if (T.tool === 'ground') _gdzPaintEnd();
}

/* ---------- drawing a path ---------- */
function _gdzStrokeStart(pt) {
  const T = _gdzT(); if (!pt) return;
  if (T.draft.p.length >= GDZ_LIMITS.paths) { _gdzSay(`You have ${GDZ_LIMITS.paths} paths, which is all there is room for. Rub one out first.`, true); return; }
  const a = gardenDesignAnchor(pt, T.draft, gardenModel());
  if (!a) { _gdzPathHint(pt); _gdzSay('A path has to start on another path, a plaza or a door. Press nearer one.', true); return; }
  T.stroke = { pts: [[a.x, a.y]], raf: 0, check: null }; _gdzStrokePaint();
}
function _gdzStrokeMore(pt) {
  const T = _gdzT(), S = T.stroke; if (!pt) return;
  const l = S.pts[S.pts.length - 1]; if (Math.hypot(pt.x - l[0], (pt.y - l[1]) * 0.7) < 0.3) return;
  S.pts.push([pt.x, pt.y]);
  if (!S.raf) S.raf = requestAnimationFrame(() => { S.raf = 0; if (_gdzT().stroke === S) _gdzStrokePaint(); });
}
/** A ring where this end would join (green), or where it would not (red). */
function _gdzRing(x, y, good) { const W = GARDEN_WORLD; return `<circle cx="${_gdzN(x * W.cellW)}" cy="${_gdzN(W.sky + y * W.cellH)}" r="13" fill="${good ? '#2fa84f' : '#d0402c'}" fill-opacity="0.3" stroke="${good ? '#2fa84f' : '#d0402c'}" stroke-width="3.500"/>`; }
/** Before you press: where would a path start from here? */
function _gdzPathHint(pt) {
  const T = _gdzT(); if (!pt) return;
  const a = gardenDesignAnchor(pt, T.draft, gardenModel());
  _gdzLive(a ? _gdzRing(a.x, a.y, true) : _gdzRing(pt.x, pt.y, false));
}
function _gdzPathGhost(c, st) {
  const W = GARDEN_WORLD, d = gardenDesignCurve(c.pts.map(([x, y]) => [x * W.cellW, W.sky + y * W.cellH]));
  let s = d ? gardenDesignPathMarkup(st, d) : '';
  if (c.why && d) s += `<path d="${d}" fill="none" stroke="#d0402c" stroke-width="4" stroke-dasharray="9 7" stroke-linecap="round"/>`;
  const e = c.pts[c.pts.length - 1];
  s += _gdzRing(c.pts[0][0], c.pts[0][1], !!c.a) + (c.pts.length > 1 ? _gdzRing(e[0], e[1], !!c.b) : '');
  for (const q of c.bad.slice(0, 6)) s += _gdzRing(q[0], q[1], false);
  return s;
}
function _gdzStrokePaint() {
  const T = _gdzT(), S = T.stroke; if (!S) return;
  const c = S.check = S.pts.length > 1 ? gardenDesignPathCheck(S.pts, T.draft, gardenModel()) : { why: '', pts: S.pts, a: true, b: null, bad: [] };
  _gdzLive(_gdzPathGhost(c, GDZ_PATHS[T.pathStyle]));
  if (S.pts.length > 1) _gdzSay(c.why || `Let go to lay this path. It joins ${c.b.what}.`, !!c.why && !/^Keep going/.test(c.why));
}
/** The fewest points that keep the shape, so a long curve costs friends little. */
function _gdzSimplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const walk = (a, b) => {
    let best = -1, bd = tol; const [ax, ay] = pts[a], [bx, by] = pts[b], L = Math.hypot(bx - ax, by - ay) || 1e-6;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > bd) { bd = d; best = i; } }
    if (best >= 0) { keep[best] = 1; walk(a, best); walk(best, b); }
  };
  walk(0, pts.length - 1);
  return pts.filter((_, i) => keep[i]);
}
function _gdzStrokeEnd() {
  const T = _gdzT(), S = T.stroke, m = gardenModel(); T.stroke = null;
  if (S.pts.length < 2) { _gdzLive(''); _gdzSay('Press on a path and draw to make a new one.'); return; }
  const c = gardenDesignPathCheck(S.pts, T.draft, m);
  // refused: the red ghost stays until you move on, so you can see why
  if (c.why) { _gdzLive(_gdzPathGhost(c, GDZ_PATHS[T.pathStyle])); _gdzSay(c.why.replace(/^Keep going: /, 'That path was not laid: '), true); return; }
  let tol = 0.14, r = _gdzSimplify(c.pts, tol); while (r.length > GDZ_LIMITS.pts) { tol *= 1.5; r = _gdzSimplify(c.pts, tol); }
  _gdzPush();
  const row = [T.pathStyle]; let x = 0, y = 0; for (const [px, py] of r) { const qx = Math.round(px * 10), qy = Math.round(py * 10); row.push(qx - x, qy - y); x = qx; y = qy; } T.draft.p.push(row);
  _gdzLayerOnly(); gardenDesignPanel(); _gdzLive('');
  _gdzSay(`A new path, joined to ${c.b.what}. Draw another, or Undo if you do not like it.`);
}
function _gdzRubPath(pt, first) {
  const T = _gdzT(); if (!pt) return;
  const hit = T.draft.p.findIndex(row => { let x = 0, y = 0, px = 0, py = 0; for (let i = 1; i + 1 < row.length; i += 2) { px = x; py = y; x += row[i]; y += row[i + 1]; const n = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / 3)); for (let k = i === 1 ? n : 1; k <= n; k++) { const qx = px + (x - px) * k / n, qy = py + (y - py) * k / n; if (Math.hypot(qx / 10 - pt.x, (qy / 10 - pt.y) * 0.7) < 0.55) return true; } } return false; });
  if (hit < 0) return;
  if (first || !T.rubbed) { _gdzPush(); T.rubbed = true; }
  T.draft.p.splice(hit, 1); _gdzLayerOnly(); gardenDesignPanel(); _gdzSay('Path rubbed out. Undo brings it back.');
}
function _gdzRubEnd() { _gdzT().rubbed = false; }

/* ---------- painting the ground ---------- */
function _gdzPaintStart(cell) {
  const T = _gdzT(), m = gardenModel(), mask = gardenDesignPathMask(T.draft, m);
  T.paint = { cells: _gdzDec(T.draft.g), added: new Set(), done: new Set(), why: '', n: 0, full: false, d: '', mask, lv: m.level.level };
  _gdzPaintMore(cell);
  if (!T.paint.n && T.paint.why) _gdzSay(T.paint.why, true);
}
function _gdzPaintMore(cell) {
  const T = _gdzT(), P = T.paint, W = GARDEN_WORLD; if (!P || !cell) return;
  const rub = T.rubbing, st = GDZ_GROUND[T.groundStyle];
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = cell.x + dx, y = cell.y + dy; if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) continue;
    const i = y * W.cols + x; if (P.done.has(i)) continue; P.done.add(i);
    if (rub) { if (P.cells.has(i)) { P.cells.delete(i); P.n++; P.d += `M${_gdzN((x + 0.5) * W.cellW)} ${_gdzN(W.sky + (y + 0.5) * W.cellH)}h.1`; } continue; }
    const why = gardenDesignPaintWhy(x, y, st, P.mask, P.lv);
    if (why) { if (!P.why || (dx === 0 && dy === 0)) P.why = why; continue; }
    if (!P.cells.has(i) && P.cells.size >= GDZ_LIMITS.paint) { P.full = true; continue; }
    P.cells.set(i, T.groundStyle); P.added.add(i); P.n++;
    P.d += `M${_gdzN((x + 0.5) * W.cellW)} ${_gdzN(W.sky + (y + 0.5) * W.cellH)}h.1`;
  }
  const enough = rub || P.added.size >= GDZ_STRICT.ground.patchMin;
  _gdzLive(`<path d="${P.d}" fill="none" stroke="${rub ? '#ffffff' : st.c}" stroke-opacity="${rub ? 0.5 : 0.9}" stroke-width="50" stroke-linecap="round"/>` + (enough ? '' : `<path d="${P.d}" fill="none" stroke="#d0402c" stroke-opacity="0.35" stroke-width="50" stroke-linecap="round"/>`));
  if (!rub && P.n) _gdzSay(enough ? 'A good size. Let go to paint it.' : `Keep going: a patch needs at least ${GDZ_STRICT.ground.patchMin} squares of open ground.`);
}
function _gdzPaintEnd() {
  const T = _gdzT(), P = T.paint; T.paint = null; _gdzLive(''); if (!P) return;
  if (!P.n) { _gdzSay(P.why || 'Paint on your own land.', !!P.why); return; }
  if (T.rubbing) { _gdzPush(); T.draft.g = _gdzEnc(P.cells); _gdzLayerOnly(); _gd.rev++; _gd.memoKey = ''; gardenDesignPanel(); _gdzSay('Rubbed out. Undo brings it back.'); return; }
  const st = GDZ_GROUND[T.groundStyle], W = GARDEN_WORLD, ok = (i) => { const x = i % W.cols; return !gardenDesignPaintWhy(x, (i - x) / W.cols, st, P.mask, P.lv); };
  const tidy = gardenDesignPatchTidy(P.cells, P.added, T.groundStyle, ok);
  if (!tidy.kept) { _gdzSay(tidy.why, true); return; }
  _gdzPush(); T.draft.g = _gdzEnc(P.cells);
  _gdzLayerOnly(); _gd.rev++; _gd.memoKey = ''; gardenDesignPanel();
  _gdzSay(P.full ? 'That is as much ground as a garden can hold. Rub some out to paint more.' : st.area ? 'A new bed. On the green, plants will grow in it once you keep your changes.' : P.why ? 'Painted, except where it does not suit the ground.' : 'Painted.', !!P.full);
}

/* ---------- moving things ---------- */
function _gdzFootName(L) { return L.kind === 'decor' ? L.def.name : L.kind === 'prop' ? L.row.name : GDZ_MADE[L.c[0]].name; }
function _gdzLift(ev, cell) {
  const T = _gdzT(), m = _gdzModel(), n = ev.target && ev.target.closest ? ev.target.closest('.gd-prop[data-prop]') : null, id = n ? n.getAttribute('data-prop') : '';
  let L = null, node = n;
  if (id && /^dzc\d+-/.test(id)) { const i = Number(id.slice(3, id.indexOf('-'))), c = T.draft.c[i]; if (c) L = { kind: 'made', i, c, w: 1, h: 1 }; }
  else if (id && gardenDesignRow(id)) { if (gardenDesignLandmark(id)) { _gdzSay(`${gardenDesignRow(id).name} is a landmark: it stays where it is.`, true); return false; } if (!gardenDesignMovable(id)) { _gdzSay(`${gardenDesignRow(id).name} stays where it is: it is part of the place.`, true); return false; } L = { kind: 'prop', row: gardenDesignRow(id) }; L.w = L.row.w || 1; L.h = L.row.h || 1; }
  if (!L) {
    const it = _gdpPickItem(ev, cell), d = it && it.kind === 'decor' ? gardenDecorById(m, it.uid) : null;
    if (d) { L = { kind: 'decor', uid: d.uid, def: d.def, w: d.def.w || 1, h: d.def.h || 1 }; node = _gdp.svg.querySelector(`.gd-it[data-uid="${CSS.escape(d.uid)}"]`); }
    else if (it && it.kind === 'plant') { _gdzSay('Plants move with your hand in the garden, when you are not designing.'); return false; }
  }
  if (!L && cell) {
    const pr = gardenPropAt(cell.x, cell.y);
    if (pr && gardenDesignRow(pr.id)) { if (gardenDesignLandmark(pr.id)) { _gdzSay(`${pr.name} is a landmark: it stays where it is.`, true); return false; } if (!gardenDesignMovable(pr.id)) { _gdzSay(`${pr.name} stays where it is: it is part of the place.`, true); return false; } L = { kind: 'prop', row: gardenDesignRow(pr.id), w: pr.w || 1, h: pr.h || 1 }; node = _gdp.svg.querySelector(`.gd-prop[data-prop="${CSS.escape(pr.id)}"]`); }
  }
  if (!L) { _gdzSay('Tap a shop, a bench, a lamp or a decoration to pick it up.'); return false; }
  L.ox = L.kind === 'prop' ? L.row.x : L.kind === 'made' ? L.c[1] : gardenDecorById(m, L.uid).x;
  L.oy = L.kind === 'prop' ? L.row.y : L.kind === 'made' ? L.c[2] : gardenDecorById(m, L.uid).y;
  T.lifted = L; L.node = node;
  if (node) node.classList.add('gdz-lifted');
  L.clone = node ? node.cloneNode(true) : null;
  _gdzGhostAt(cell); gardenDesignPanel();
  return true;
}
/** Starting a thing you made: it follows the pointer until you put it down. */
function gardenDesignPlaceNew() {
  const T = _gdzT(), M = T.make;
  if (T.draft.c.length >= GDZ_LIMITS.made) { _gdzSay(`You have made ${GDZ_LIMITS.made} things, which is all there is room for. Put one away first.`, true); return; }
  const c = [M.kind, 0, 0, 0, 0, M.pat, M.kind === 0 ? gardenDesignText(M.text) : ''];
  { const P = GDZ_STRICT.pairs[GDZ_MADE[M.kind].id], pr = P[M.pair] || P[0]; c[3] = pr[0]; c[4] = pr[1]; c[6] = c[6].slice(0, GDZ_STRICT.signText); }
  T.lifted = { kind: 'made', i: null, c, w: 1, h: 1, ox: 0, oy: 0, fresh: true };
  _gdzSay('Now tap where it should stand.'); gardenDesignPanel();
}
function _gdzGhostAt(cell) {
  const T = _gdzT(), L = T.lifted; if (!L || !cell) return;
  const x = cell.x - Math.floor(L.w / 2), y = cell.y - (L.h - 1), key = x + ',' + y;
  if (L.key === key) return; L.key = key; L.x = x; L.y = y;
  const check = (qx, qy) => (L.kind === 'prop' ? gardenDesignMoveCheck(L.row, qx, qy) : L.kind === 'decor' ? _gdzDecorCheck(gardenDecorById(_gdzModel(), L.uid), qx, qy) : _gdzMadeCheck(qx, qy, L.i, L.c));
  let r = check(x, y), snapped = false; const why0 = r.why;
  if (r.why) { const near = _gdzSnapNear(x, y, check); if (near) { x = near.x; y = near.y; r = near.r; snapped = true; } }
  L.x = x; L.y = y; L.why = r.why; L.door = r.door || null;
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, col = r.why ? '#d0402c' : '#2fa84f';
  let s = `<rect x="${x * cw + 2}" y="${W.sky + y * ch + 2}" width="${L.w * cw - 4}" height="${L.h * ch - 4}" rx="6" fill="${col}" fill-opacity="0.28" stroke="${col}" stroke-width="3"/>`;
  if (r.door) s += `<ellipse cx="${(r.door.x + 0.5) * cw}" cy="${W.sky + (r.door.y + 0.5) * ch}" rx="11" ry="7" fill="#ffffff" fill-opacity="0.92" stroke="#2fa84f" stroke-width="2.600"/>`;
  const g = _gdzLiveNode(); if (!g) return;
  g.innerHTML = s;
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g'); wrap.setAttribute('opacity', r.why ? '0.55' : '0.85');
  if (L.clone) { wrap.setAttribute('transform', `translate(${(x - L.ox) * cw} ${(y - L.oy) * ch})`); wrap.appendChild(L.clone.cloneNode(true)); }
  else if (L.fresh) { wrap.setAttribute('transform', `translate(${(x + 0.5) * cw} ${W.sky + (y + 1) * ch - 4})`); wrap.innerHTML = gardenDesignMadeArt(L.c, 0); gardenDesignPainted(wrap, { c: [L.c] }); }
  g.appendChild(wrap);
  if (r.why) _gdzSay(r.why, true); else if (snapped) _gdzSay(`Moved to the nearest good spot. (${why0})`); else _gdzSay(L.door ? 'That works. The white mark is where you will stand to go in.' : 'That works. Tap to put it down.');
}
function _gdzDrop() {
  const T = _gdzT(), L = T.lifted; if (!L) return;
  if (L.why) { _gdzSay(L.why, true); return; }
  if (L.x == null) return;
  _gdzPush();
  if (L.kind === 'prop') { const b = gardenDesignBase(L.row.id); T.draft.m = T.draft.m.filter(q => q[0] !== L.row.id); if (!(b.x === L.x && b.y === L.y)) { const d = L.door || { x: L.x, y: L.y }; T.draft.m.push([L.row.id, L.x, L.y, d.x - L.x, d.y - L.y]); } }
  else if (L.kind === 'decor') T.dm[L.uid] = [L.x, L.y];
  else if (L.fresh) T.draft.c.push([L.c[0], L.x, L.y, L.c[3], L.c[4], L.c[5], L.c[6]]);
  else { T.draft.c[L.i][1] = L.x; T.draft.c[L.i][2] = L.y; }
  T.lifted = null; _gdzLive(''); _gdzStage(); gardenDesignPanel();
  _gdzSay(`${_gdzFootName(L)} is there now. It stays a preview until you keep your changes.`);
}
function _gdzDropCancel() {
  const T = _gdzT(), L = T.lifted; if (!L) return;
  if (L.node) L.node.classList.remove('gdz-lifted');
  T.lifted = null; _gdzLive(''); gardenDesignPanel(); _gdzSay('Put back down.');
}
/** Back where the tables say. Everything fixed has this. */
function gardenDesignPutBack(id) {
  const T = _gdzT(), row = gardenDesignRow(id), b = gardenDesignBase(id); if (!row || !b) return;
  const r = gardenDesignMoveCheck(row, b.x, b.y, { loose: true });
  if (r.why) { _gdzSay(`${row.name} cannot go back yet. ${r.why}`, true); return; }
  _gdzPush(); T.draft.m = T.draft.m.filter(q => q[0] !== id); T.lifted = null; _gdzLive(''); _gdzStage(); gardenDesignPanel(); _gdzSay(`${row.name} is back where it started.`);
}
/** Take what you made out of the garden. */
function gardenDesignPutAway() {
  const T = _gdzT(), L = T.lifted; if (!L || L.kind !== 'made') return;
  if (L.fresh) { _gdzDropCancel(); return; }
  _gdzPush(); T.draft.c.splice(L.i, 1); T.lifted = null; _gdzLive(''); _gdzStage(); gardenDesignPanel(); _gdzSay('Put away. Undo brings it back.');
}

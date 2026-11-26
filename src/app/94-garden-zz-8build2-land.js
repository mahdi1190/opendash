/* ============================================================
   BUILD 2: BUILDING IN THE GAME. The owner, 20 Nov 2026: "plant things, dig holes, move terrain, but in a game way not a designer
   way, so remove the design feature and use features within the game again, similar to Animal Crossing".

   Everything the garden designer did is done where you stand, with a tool from the ring, saved at once with Undo (Ctrl+Z), and kept
   in the very same design the designer kept (g.dz: paths, ground, moved things, things you made, up to four plans). So nothing has to
   move house: every saved garden, every friend's snapshot and every older app reads it as before, and it is drawn by the same painters.

     Path kit   stand on a path, a plaza or by a door, press E, walk where the path should go, press E again (Esc stops). R changes the
                stones (flagstones, cobbles, planks ... the ones you have earned). It joins up by itself at both ends.
     Hoe        press E and walk over the ground: a flower bed, a veg bed, moss, sand, bark, clover ... (R), press E again. "As it was"
                takes laid ground up again. A patch needs at least five squares, so nothing looks scribbled.
     Spade      facing a path you laid: lift it. Facing ground you laid: lift that patch. (Plants: 94-garden-zz-8build2-hands.js.)
     Stakes     facing a bench, a lamp, a stall or a shop of the vale: move it (its door must face a path, nobody may be cut off).
                A moved thing can go back where it started.
     Hands      a sign, a flag or a statue you made (Build, in the menu): put it down, pick it up again, X puts it away.
     Plans      Build, in the menu: keep a copy of your garden as a plan, switch to another (at once, with Undo), take one away; and an
                earlier layout from before the island can be brought back and its things put out one by one.
     In a friend's garden, playing together: the same tools; each change goes to their garden at once (gl:dz), as the designer's did.

   The rules are the designer's own, unchanged (94-garden-design-1strict.js: where a path may start and end, curls, overlaps, what
   suits each kind of land, room round landmarks, the reach check), read from the layout's data, never a named place (rule 17).
   Speed: one small hook runs each frame only while you lay a path or a bed (it samples your feet); the line you lay is drawn at most
   seven times a second; the reach check runs once, when you put a moved thing down.
   ============================================================ */
const _gb2l = { lay: null, sim: null, live: null, liveT: 0, pathSt: 0, groundSt: 2, visitD: null, buildTab: 'tools', make: { kind: 0, pair: 0, pat: 0, text: '' } };
const _GB2L_BRUSH = Object.freeze([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]);
function _gb2lThe(name) { return typeof _gdPutName === 'function' ? _gdPutName({ name }) : 'the ' + String(name || 'that').toLowerCase(); }
function _gb2lCap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function _gb2lSay(text, icon, ms) { try { gardenMessage(text, { icon: icon || 'footprints', ms: ms || 6000 }); } catch (e) { /* quiet */ } }
function _gb2lNo(text) { try { gameDeny(null, { say: String(text || '').replace(/\.?$/, '.') }); } catch (e) { /* quiet */ } return false; }
function _gb2lNative() { return typeof GardenNative !== 'undefined' && GardenNative.active() ? GardenNative.world() : null; }

/* ---------- the design of the garden you stand in ---------- */
function _gb2lVisit() { try { const v = typeof gardenVisitModel === 'function' ? gardenVisitModel() : null; return v && v.visit ? v : null; } catch (e) { return null; } }
/** A copy of the design on screen: yours, or your friend's (what you just sent them, until their garden answers with it). */
function _gb2lDesign() {
  const V = _gb2lVisit();
  if (V) { const P = _gb2l.visitD; if (P && P.fid === V.visit.fid && performance.now() - P.at < 15000) return JSON.parse(JSON.stringify(P.d)); return gardenDesignClean(V.visit.snap && V.visit.snap.dz) || gardenDesignEmpty(); }
  return JSON.parse(JSON.stringify(gardenDesignSaved(_gdG()) || gardenDesignEmpty()));
}
/** On a visit, what to show: what you just sent, until your friend's own snapshot comes back with it (94-garden-visit-0world.js). */
function gardenB2VisitDesign(s) {
  const P = _gb2l.visitD, raw = s ? s.dz || null : null;
  if (!P || typeof _gdv === 'undefined' || P.fid !== _gdv.fid || performance.now() - P.at > 15000) return raw;
  if (raw && JSON.stringify(gardenDesignClean(raw)) === JSON.stringify(gardenDesignClean(P.d))) { _gb2l.visitD = null; return raw; }
  return P.d;
}
/** '' when you can build here now, else why not, in a line. */
function _gb2lCan() {
  const V = _gb2lVisit();
  if (V && !(V.visit.live && typeof _glvSend === 'function')) return 'Building in a friend’s garden needs you both there: when they let you in to play together, the tools work here too';
  try { if (gardenModel().worldPending) return 'The garden update needs to finish first'; } catch (e) { /* fine */ }
  if (typeof gardenDesignOn === 'function' && gardenDesignOn()) return 'Close the designer first';
  return '';
}
/** Show a design that changed: the ground layer alone (paths, beds), or the whole stage (something that stands moved). */
function _gb2lShow(d, stage) {
  gardenDesignShow(d);
  if (typeof _gd !== 'undefined') { _gd.rev++; _gd.memoKey = ''; }
  const nw = _gb2lNative();
  if (!stage && nw && typeof nw.designLayer === 'function') { try { nw.designLayer(d); return; } catch (e) { /* the whole stage below */ } }
  if (typeof gardenRepaintSoon === 'function') gardenRepaintSoon();
}
/** Keep a changed design: yours with Undo; your friend's goes to their garden. o: { msg, label, icon, stage, say, edit(lay, cur) -> cur } */
function _gb2lCommit(d, o) {
  o = o || {};
  const V = _gb2lVisit();
  if (V) {
    if (o.edit) return _gdNo('Plans are each garden’s own: your friend keeps theirs.');
    const wire = _gdzIsEmpty(d) ? { e: 1 } : gardenDesignWire(d).wire, text = JSON.stringify(wire), of = Math.ceil(text.length / 3600) || 1;
    if (of > 2) return _gdNo('That is more than a garden can send in one go. Lift a path or a patch of ground first.');
    const i = 'dz' + Date.now().toString(36);   // clock-ok: an id for the pieces
    for (let n = 0; n < of; n++) { try { _glvSend('dz', { i, n, of, d: text.slice(n * 3600, (n + 1) * 3600) }); } catch (e) { return _gdNo('It did not reach your friend’s garden. Try again in a moment.'); } }
    _gb2l.visitD = { fid: V.visit.fid, d: JSON.parse(JSON.stringify(d)), at: performance.now() };
    _gb2lShow(d, o.stage);
    if (o.say) _gb2lSay(o.say.replace(/ Undo \(Ctrl\+Z\)[^.]*\./, ''), o.icon);
    return { ok: true };
  }
  const g = _gdG(); if (!g.dz || typeof g.dz !== 'object' || Array.isArray(g.dz)) g.dz = {};
  const mark = _gdMark([['dz', 'cur'], ['dz', 'lay']]);
  const lay = g.dz.lay && typeof g.dz.lay === 'object' ? JSON.parse(JSON.stringify(g.dz.lay)) : {};
  let cur = g.dz.cur && lay[g.dz.cur] ? g.dz.cur : Object.keys(lay)[0] || 'l1';
  if (!lay[cur]) lay[cur] = { n: 'My garden', d: gardenDesignEmpty() };
  if (o.edit) { const c2 = o.edit(lay, cur); if (c2 === false) return _gdNo(o.no || 'That cannot be done just now.'); if (c2) cur = c2; }
  if (d) { lay[cur].d = JSON.parse(JSON.stringify(d)); if (GARDEN_WORLD.v >= 3) lay[cur].island = [GARDEN_WORLD.v, GARDEN_WORLD.lh]; }
  g.dz.cur = cur; g.dz.lay = lay;
  _gb2lShow(gardenDesignSaved(g), o.stage);
  _gdDone(o.msg || '', o.label || 'building', mark, { icon: o.icon || 'paintbrush', noPaint: !o.stage, quiet: true });
  _gdEmit('landshow', {});   // (friends in your garden get it now: 94-garden-live-3host.js)
  if (typeof _gscPublishSoon === 'function') _gscPublishSoon(3000);
  let lost = ''; try { const w = gardenDesignWire(gardenDesignSaved(g)).dropped; const n = w.paths.length; if (n || w.cells) lost = ' It is too big to send whole: friends will not see ' + [n ? n + ' of your paths' : '', w.cells ? w.cells + ' squares of ground' : ''].filter(Boolean).join(' or ') + '.'; } catch (e) { lost = ''; }
  if (o.say || lost) _gb2lSay((o.say || '') + lost, o.icon, lost ? 11000 : 6000);
  return { ok: true };
}

/* ---------- the designer's own checks, kept here so the tools need nothing of its draft (94-garden-design-2tools.js) ---------- */
function _gb2lFlood(grid) {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, st = W.start, seen = new Uint8Array(C * R), stack = [st.y * C + st.x];
  if (grid[stack[0]]) return seen;
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % C, y = (i - x) / C;
    for (const [dx, dy] of _GB2L_BRUSH) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue; const j = ny * C + nx; if (!seen[j] && !grid[j]) { seen[j] = 1; stack.push(j); } }
  }
  return seen;
}
function _gb2lPlaceName(x, y) { const c = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null; return c && c.name ? String(c.name).replace(/^The /, 'the ') : c && c.lane ? 'part of the lane' : 'part of your land'; }
/** What is on these cells that stops something standing there? '' or the reason. */
function _gb2lCellsWhy(m, x, y, w, h, selfProp) {
  const W = GARDEN_WORLD;
  if (x < 0 || y < 0 || x + w > W.cols || y + h > W.rows) return 'That is off the edge of the garden.';
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const cx = x + dx, cy = y + dy, a = gardenAreaAt(cx, cy, m.level.level);
    if (a.startsWith('locked:')) { const ar = gardenArea(a.slice(7)); return ar && ar.solid ? 'The trees are too thick there.' : `${ar ? ar.name : 'That land'} is not yours yet.`; }
    if (gardenIsWater(cx, cy)) return 'It would be standing in the water.';
    const pr = gardenPropAt(cx, cy); if (pr && pr !== selfProp && pr.id !== (selfProp && selfProp.id)) return `${pr.name} is already there.`;
    const c = m.occ.get(cx + ',' + cy);
    if (c && c.plant) { const p = gardenPlantById(m, c.plant); return `${p ? p.def.name : 'A plant'} is growing there. Move it first.`; }
    if (c && c.decor) { const d = gardenDecorById(m, c.decor); return `${d ? d.def.name : 'A decoration'} is there. Move it first.`; }
  }
  return '';
}
/** Nothing may stop you reaching land you could reach, or a door you could reach (the designer's one rule, by the walking grid). */
function _gb2lReachWhy(m, thing, out, build) {
  const W = GARDEN_WORLD, before = _gb2lFlood(_gwBuildGrid(m)), doorsBefore = gardenPropsNow().filter(p => p.act && p.door && (!p.needs || gardenWorkOwned(p.needs)) && before[p.door.y * W.cols + p.door.x]).map(p => p.id);
  const undo = build();
  gardenLandPropsReset();
  try {
    const grid = _gwBuildGrid(m), after = _gb2lFlood(grid), st = W.start;
    if (grid[st.y * W.cols + st.x]) return 'Keep this spot clear: it is where you come into the garden.';
    if (out.doorOf) { const d = out.doorOf(after); if (!d) return `You could not walk up to ${thing} there. Try a spot with open ground beside it.`; out.door = d; }
    for (let i = 0; i < after.length; i++) if (before[i] && !after[i] && !grid[i]) { const x = i % W.cols, y = (i - x) / W.cols; return `That would cut off ${_gb2lPlaceName(x, y)}: you could not walk there any more.`; }
    for (const p of gardenPropsNow()) if (doorsBefore.includes(p.id) && p.door && !after[p.door.y * W.cols + p.door.x]) return `You could not reach the door of ${String(p.name).replace(/^The /, 'the ')} any more.`;
    return '';
  } finally { undo(); gardenLandPropsReset(); }
}
function _gb2lSightWhy(row) { return GARDEN_WORLD.v >= 3 && typeof GARDEN_SIGHT_PLACE_IDS !== 'undefined' && GARDEN_SIGHT_PLACE_IDS.includes(row.id) ? 'Put this place away from the Land page, then set it out where you want it.' : ''; }
/** A thing of the vale at x, y: quick (what stands there, the strict rules), while you carry it. */
function _gb2lPropQuick(row, x, y, m, design) {
  if (x === row.x && y === row.y) return 'It is there already';
  const why = _gb2lCellsWhy(m, x, y, row.w || 1, row.h || 1, row); if (why) return why;
  const cls = gardenDesignClass(row);
  return gardenDesignStandWhy({ cls: cls === 'building' ? 'building' : 'stand', x, y, w: row.w || 1, h: row.h || 1, key: row.kind || row.id, name: row.name, beside: GDZ_STRICT.besideArts.includes(row.art), self: { id: row.id } }, m, design) || '';
}
/** ...and in full when you put it down: its door must face a path and be reachable, and nothing may be cut off. {why, door} */
function _gb2lPropCheck(row, x, y, design, o) {
  const m = gardenHere(), w = row.w || 1, h = row.h || 1, base = gardenDesignBase(row.id), strict = !(o && o.loose), cls = gardenDesignClass(row);
  const res = { why: _gb2lCellsWhy(m, x, y, w, h, row), door: null };
  if (res.why) return res;
  if (strict) { res.why = gardenDesignStandWhy({ cls: cls === 'building' ? 'building' : 'stand', x, y, w, h, key: row.kind || row.id, name: row.name, beside: GDZ_STRICT.besideArts.includes(row.art), self: { id: row.id } }, m, design); if (res.why) return res; }
  const off = base && base.door ? [base.door.x - base.x, base.door.y - base.y] : null, tries = [];
  if (off) tries.push([x + off[0], y + off[1]]);
  for (let k = 0; k < w; k++) tries.push([x + k, y + h]);
  for (let k = 0; k < h; k++) { tries.push([x - 1, y + k]); tries.push([x + w, y + k]); }
  for (let k = 0; k < w; k++) tries.push([x + k, y - 1]);
  const W = GARDEN_WORLD, mask = gardenDesignPathMask(design, m), needPath = strict && cls === 'building', g = GDZ_STRICT.building.doorToPath;
  const byPath = (dx, dy) => { for (let cy = dy - g; cy <= dy + g; cy++) for (let cx = dx - g; cx <= dx + g; cx++) if (cx >= 0 && cy >= 0 && cx < W.cols && cy < W.rows && mask[cy * W.cols + cx]) return true; return false; };
  const ox = row.x, oy = row.y, od = row.door;
  const out = { doorOf: !row.door ? null : (after) => { for (const [dx, dy] of tries) { if (dx < 0 || dy < 0 || dx >= W.cols || dy >= W.rows || Math.abs(dx - x) > GDZ_LIMITS.door || Math.abs(dy - y) > GDZ_LIMITS.door || (needPath && !byPath(dx, dy))) continue; if (after[dy * W.cols + dx]) return { x: dx, y: dy }; } return null; } };
  if (needPath && !tries.some(([dx, dy]) => dx >= 0 && dy >= 0 && dx < W.cols && dy < W.rows && byPath(dx, dy))) { res.why = `The door of ${String(row.name).replace(/^The /, 'the ')} has to face a path. Try right beside one.`; return res; }
  res.why = _gb2lReachWhy(m, String(row.name).replace(/^The /, 'the '), out, () => { row.x = x; row.y = y; return () => { row.x = ox; row.y = oy; row.door = od; }; });
  res.door = out.door || null;
  return res;
}
/** A thing you made at x, y: a small box, so it never shuts anything; the strict rules say how many of each a piece of land holds. */
function _gb2lMadeWhy(x, y, i, c, m, design) {
  const self = i == null ? null : gardenDesignLandProps()[i], def = GDZ_MADE[c[0]] || GDZ_MADE[0];
  const why = _gb2lCellsWhy(m, x, y, 1, 1, self); if (why) return why;
  return gardenDesignStandWhy({ cls: 'stand', x, y, w: 1, h: 1, key: 'made-' + def.id, name: 'Your ' + def.id, made: def.id, self: { id: self ? self.id : '', madeI: i } }, m, design) || '';
}
/** The fewest points that keep a path's shape, so a long curve costs friends little. */
function _gb2lSimplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const walk = (a, b) => { let best = -1, bd = tol; const [ax, ay] = pts[a], [bx, by] = pts[b], L = Math.hypot(bx - ax, by - ay) || 1e-6; for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > bd) { bd = d; best = i; } } if (best >= 0) { keep[best] = 1; walk(a, best); walk(best, b); } };
  walk(0, pts.length - 1);
  return pts.filter((_, i) => keep[i]);
}
function _gb2lEnc(cells) {
  const by = new Map(); for (const [c, st] of cells) { if (!by.has(st)) by.set(st, []); by.get(st).push(c); }
  const out = [];
  for (const [st, list] of by) { list.sort((a, b) => a - b); const row = [st]; let i = 0; while (i < list.length) { let j = i + 1; while (j < list.length && list[j] === list[j - 1] + 1) j++; row.push(list[i], j - i); i = j; } out.push(row); }
  return out.slice(0, 12);
}
function _gb2lDec(g) { const m = new Map(); for (const row of g || []) for (let i = 1; i + 1 < row.length; i += 2) for (let c = row[i]; c < row[i] + row[i + 1]; c++) m.set(c, row[0]); return m; }

/* ---------- the stones and the ground you have earned ---------- */
function _gb2lStyles(kind) {
  let m = null; try { m = gardenHere(); } catch (e) { return [0]; }
  let c = null, rw = null; try { c = gardenDesignCtx(m); } catch (e) { c = null; } try { rw = typeof gardenDesignRows === 'function' ? gardenDesignRows(m) : null; } catch (e) { rw = null; }
  const out = []; (kind === 'path' ? GDZ_PATHS : GDZ_GROUND).forEach((st, i) => { if (kind === 'ground' && st.id === 'grass') return; try { if (!c || gardenDesignOpen(st, c, rw)) out.push(i); } catch (e) { /* not this one */ } });   // (grass laid on grass only drew flat blobs: As it was takes laid ground back to the lawn; grass in a saved design still draws)
  if (kind === 'ground') out.unshift(-1);   // (as it was: laid ground taken up again)
  return out.length ? out : [0];
}
function _gb2lStyleName(kind, i) { if (kind === 'path') return (GDZ_PATHS[i] || GDZ_PATHS[0]).name; return i < 0 ? 'Ground as it was' : (GDZ_GROUND[i] || GDZ_GROUND[0]).name; }
function _gb2lSwatch(kind, i) {
  if (kind === 'path') return `<svg viewBox="0 0 92 92" aria-hidden="true">${gardenDesignPathMarkup(GDZ_PATHS[i] || GDZ_PATHS[0], 'M10 80Q26 14 50 44T84 12')}</svg>`;
  if (i < 0) return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 22q5-9 11-6t11-5" fill="none" stroke="#7fb257" stroke-width="7" stroke-linecap="round"/><path d="M8 12l16 12M24 12L8 24" stroke="#c0453a" stroke-width="2.400" stroke-linecap="round" opacity=".8"/></svg>';
  const st = GDZ_GROUND[i] || GDZ_GROUND[0], dots = (st.dots || []).map((c, k) => `<circle cx="${9 + k * 5}" cy="${14 + (k % 2) * 6}" r="1.700" fill="${c}"/>`).join(''), rows = st.rows ? `<path d="M7 13h18M6 18h20M7 23h18" stroke="${st.rows}" stroke-width="1.600"/>` : '';
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 18q1-10 12-11t12 10q-1 9-12 9t-12-8z" fill="${st.c}" stroke="#3a2a18" stroke-opacity=".35" stroke-width="1"/>${rows}${dots}</svg>`;
}
/** What the ring shows beside the path kit or the hoe: the stones or the ground chosen (R for the next). */
function gardenB2LandSlot() {
  let t = ''; try { t = gardenB2RingTool(); } catch (e) { return null; }
  if (t !== 'paths' && t !== 'hoe') return null;
  const kind = t === 'paths' ? 'path' : 'ground', sts = _gb2lStyles(kind), cur = kind === 'path' ? _gb2l.pathSt : _gb2l.groundSt, i = sts.includes(cur) ? cur : sts[kind === 'path' ? 0 : Math.min(1, sts.length - 1)];
  if (kind === 'path') _gb2l.pathSt = i; else _gb2l.groundSt = i;
  return { key: kind + i + (_gb2l.lay ? 'L' : ''), name: _gb2lStyleName(kind, i), svg: _gb2lSwatch(kind, i) };
}
/** R with the path kit or the hoe: the next you have earned. True when handled. */
function gardenB2LandStyle(step) {
  let t = ''; try { t = gardenB2RingTool(); } catch (e) { return false; }
  if (t !== 'paths' && t !== 'hoe') return false;
  if (_gb2l.lay) { _gb2lSay('Finish this one first (E), or Esc to stop.', 'footprints', 3000); return true; }
  const kind = t === 'paths' ? 'path' : 'ground', sts = _gb2lStyles(kind), cur = kind === 'path' ? _gb2l.pathSt : _gb2l.groundSt, i = sts[(Math.max(0, sts.indexOf(cur)) + (step < 0 ? sts.length - 1 : 1)) % sts.length];
  if (kind === 'path') _gb2l.pathSt = i; else _gb2l.groundSt = i;
  _gb2lSay(`${_gb2lStyleName(kind, i)}${kind === 'path' ? '' : i < 0 ? ': walk over ground you laid to take it up' : ''}. R for the next.`, kind === 'path' ? 'footprints' : 'sprout', 2600);
  try { gardenSfx('tab'); if (typeof _gb2RingPaint === 'function') _gb2RingPaint(); } catch (e) { /* quiet */ }
  return true;
}

/* ---------- laying a path or a patch of ground, as you walk ---------- */
/** E with the path kit or the hoe: start, or finish. True when handled. */
function gardenB2LandInteract() {
  let t = ''; try { t = gardenB2RingTool(); } catch (e) { return false; }
  if (t !== 'paths' && t !== 'hoe') return false;
  if (_gb2l.lay) { _gb2lFinish(); return true; }
  _gb2lStart(t === 'paths' ? 'path' : 'ground');
  return true;
}
function _gb2lStart(kind) {
  const no = _gb2lCan(); if (no) return _gb2lNo(no);
  if (typeof _gw === 'undefined' || !_gw.on) return false;
  const m = gardenHere(), d = _gb2lDesign();
  if (kind === 'path') {
    if (d.p.length >= GDZ_LIMITS.paths) return _gb2lNo(`Your garden has ${GDZ_LIMITS.paths} paths, all there is room for. Lift one with the spade first`);
    const a = gardenDesignAnchor({ x: _gw.px, y: _gw.py }, d, m);
    if (!a) return _gb2lNo('A path starts on another path, a plaza or by a door. Walk onto one and press E');
    _gb2lStyles('path').includes(_gb2l.pathSt) || (_gb2l.pathSt = _gb2lStyles('path')[0]);
    _gb2l.lay = { kind, st: _gb2l.pathSt, pts: [[a.x, a.y]], d, a, dirty: true };
    _gb2lSay(`Laying ${GDZ_PATHS[_gb2l.pathSt].name.toLowerCase()} from ${a.what}. Walk where it should go, and press E at another path, a plaza or a door. Esc stops.`, 'footprints', 9000);
  } else {
    const sts = _gb2lStyles('ground'); if (!sts.includes(_gb2l.groundSt)) _gb2l.groundSt = sts[Math.min(1, sts.length - 1)];
    _gb2l.lay = { kind, st: _gb2l.groundSt, cells: _gb2lDec(d.g), added: new Set(), done: new Set(), n: 0, why: '', full: false, mask: gardenDesignPathMask(d, m), lv: m.level.level, d, pd: '', cx: -1, cy: -1, dirty: true };
    _gb2lSay(_gb2l.groundSt < 0 ? 'Walk over ground you laid to take it up, then press E. Esc stops.' : `Laying ${_gb2lStyleName('ground', _gb2l.groundSt).toLowerCase()}. Walk over the ground it should cover (five squares or more), then press E. Esc stops.`, 'sprout', 9000);
  }
  if (!_gb2l.sim) _gb2l.sim = gardenWorldAdd({ id: 'gb2-land', simulationOnly: true, x: 0, y: 0, update: () => { try { _gb2lTick(); } catch (e) { if (!_gb2l.said) { _gb2l.said = true; console.error('[garden build]', e); } } } });
  _gb2lTick();
  try { gardenSfx('tab'); if (typeof _gb2RingPaint === 'function') _gb2RingPaint(); } catch (e) { /* quiet */ }
  if (typeof _ga !== 'undefined') { _ga.t = 0; _ga.list = null; }
  return true;
}
/** Once a frame while you lay: your feet, sampled; the line drawn again at most seven times a second. */
function _gb2lTick() {
  const L = _gb2l.lay; if (!L || typeof _gw === 'undefined' || !_gw.on) return;
  if (L.kind === 'path') {
    const last = L.pts[L.pts.length - 1], dx = _gw.px - last[0], dy = _gw.py - last[1];
    if (dx * dx + dy * dy >= 0.16 && L.pts.length < 240) { L.pts.push([_gw.px, _gw.py]); L.dirty = true; }
  } else {
    const cx = Math.floor(_gw.px), cy = Math.floor(_gw.py);
    if (cx !== L.cx || cy !== L.cy) { L.cx = cx; L.cy = cy; _gb2lPaintAt(cx, cy); }
  }
  const now = performance.now();
  if (L.dirty && now - _gb2l.liveT > 140) { _gb2l.liveT = now; L.dirty = false; _gb2lLiveDraw(); }
}
function _gb2lPaintAt(cx, cy) {
  const L = _gb2l.lay, W = GARDEN_WORLD, rub = L.st < 0, st = rub ? null : GDZ_GROUND[L.st];
  for (const [dx, dy] of _GB2L_BRUSH) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) continue;
    const i = y * W.cols + x; if (L.done.has(i)) continue; L.done.add(i);
    const dot = `M${Math.round((x + 0.5) * W.cellW)} ${Math.round(W.sky + (y + 0.5) * W.cellH)}h.1`;
    if (rub) { if (L.cells.has(i)) { L.cells.delete(i); L.n++; L.pd += dot; L.dirty = true; } continue; }
    const why = gardenDesignPaintWhy(x, y, st, L.mask, L.lv);
    if (why) { if (!L.why || (dx === 0 && dy === 0)) L.why = why; continue; }
    if (!L.cells.has(i) && L.cells.size >= GDZ_LIMITS.paint) { L.full = true; continue; }
    L.cells.set(i, L.st); L.added.add(i); L.n++; L.pd += dot; L.dirty = true;
  }
}
/** The line or the patch so far, on the ground where it will lie (one small group, drawn again only when it grew). */
function _gb2lLive(html) {
  let g = _gb2l.live;
  if (!g || !g.isConnected) {
    if (!html) return;
    const host = typeof _gdp !== 'undefined' && _gdp.svg ? _gdp.svg.querySelector('.gd-dz') || _gdp.svg.querySelector('.gd-ui') : null; if (!host || typeof gardenSceneElement !== 'function') return;
    g = gardenSceneElement('g'); g.setAttribute('class', 'gb2-laying'); g.setAttribute('pointer-events', 'none'); host.appendChild(g); _gb2l.live = g;
  }
  g.innerHTML = html || '';
}
function _gb2lLiveDraw() {
  const L = _gb2l.lay, W = GARDEN_WORLD; if (!L) { _gb2lLive(''); return; }
  if (L.kind === 'path') {
    const pts = L.pts.concat([[_gw.px, _gw.py]]).map(([x, y]) => [x * W.cellW, W.sky + y * W.cellH]);
    const d = pts.length > 1 ? gardenDesignCurve(pts) : '';
    _gb2lLive(d ? `<g opacity="0.92">${gardenDesignPathMarkup(GDZ_PATHS[L.st] || GDZ_PATHS[0], d)}</g>` : '');
    return;
  }
  const st = L.st < 0 ? null : GDZ_GROUND[L.st], enough = L.st < 0 || L.added.size >= GDZ_STRICT.ground.patchMin;
  _gb2lLive(L.pd ? `<path d="${L.pd}" fill="none" stroke="${st ? st.c : '#ffffff'}" stroke-opacity="${st ? 0.85 : 0.45}" stroke-width="50" stroke-linecap="round"/>` + (enough ? '' : `<path d="${L.pd}" fill="none" stroke="#d0402c" stroke-opacity="0.22" stroke-width="50" stroke-linecap="round"/>`) : '');
}
function _gb2lFinish() {
  const L = _gb2l.lay; if (!L) return;
  const m = gardenHere(), W = GARDEN_WORLD;
  if (L.kind === 'path') {
    const c = gardenDesignPathCheck(L.pts.concat([[_gw.px, _gw.py]]), L.d, m);
    if (c.why) {
      if (/^Keep going/.test(c.why)) { _gb2lNo(c.why + ' Esc stops'); return; }
      _gb2lNo(c.why.replace(/^Keep going: /, 'That path was not laid: ')); _gb2lStop(); return;
    }
    let tol = 0.14, r = _gb2lSimplify(c.pts, tol); while (r.length > GDZ_LIMITS.pts) { tol *= 1.5; r = _gb2lSimplify(c.pts, tol); }
    const row = [L.st]; let x = 0, y = 0; for (const [px, py] of r) { const qx = Math.round(px * 10), qy = Math.round(py * 10); row.push(qx - x, qy - y); x = qx; y = qy; }
    const d = L.d; d.p.push(row);
    _gb2lStop();
    const res = _gb2lCommit(d, { label: 'laying a path', icon: 'footprints', say: `A new ${GDZ_PATHS[L.st].name.toLowerCase()} path, joined to ${c.b.what}. Undo (Ctrl+Z) takes it up again.` });
    if (!res.ok) _gb2lNo(res.msg); else { try { gardenSfx('place'); } catch (e) { /* quiet */ } }
    return;
  }
  if (!L.n) { _gb2lNo(L.why || (L.st < 0 ? 'Walk over ground you laid to take it up' : 'Walk over open ground of your own')); return; }
  const d = L.d;
  if (L.st < 0) { d.g = _gb2lEnc(L.cells); _gb2lStop(); const res = _gb2lCommit(d, { label: 'taking up ground', icon: 'sprout', say: 'The ground is as it was. Undo (Ctrl+Z) brings it back.' }); if (!res.ok) _gb2lNo(res.msg); return; }
  const st = GDZ_GROUND[L.st], ok = (i) => { const x = i % W.cols; return !gardenDesignPaintWhy(x, (i - x) / W.cols, st, L.mask, L.lv); };
  const cells = new Map(L.cells), added = new Set(L.added), tidy = gardenDesignPatchTidy(cells, added, L.st, ok);
  if (!tidy.kept) { if (/too small/.test(tidy.why)) _gb2lNo(`Keep going: a patch needs at least ${GDZ_STRICT.ground.patchMin} squares. Esc stops`); else { _gb2lNo(tidy.why); _gb2lStop(); } return; }
  d.g = _gb2lEnc(cells); _gb2lStop();
  const res = _gb2lCommit(d, { label: 'laying ground', icon: 'sprout', say: `${st.area ? `A new ${st.name.toLowerCase()}: plants grow in it now.` : `${st.name} laid.`}${L.full ? ' That is as much ground as a garden can hold.' : ''} Undo (Ctrl+Z) takes it up.` });
  if (!res.ok) _gb2lNo(res.msg); else { try { gardenSfx('place'); } catch (e) { /* quiet */ } }
}
function _gb2lStop() {
  _gb2l.lay = null;
  if (_gb2l.sim) { try { _gb2l.sim.remove(); } catch (e) { /* gone */ } _gb2l.sim = null; }
  _gb2lLive('');
  if (typeof _ga !== 'undefined') { _ga.t = 0; _ga.list = null; }
  try { if (typeof _gb2RingPaint === 'function') _gb2RingPaint(); } catch (e) { /* no stage */ }
}
function gardenB2LandStop() { if (_gb2l.lay) _gb2lStop(); }
function gardenB2LandEsc() { if (!_gb2l.lay) return false; _gb2lStop(); _gb2lSay('Stopped: nothing was laid.', 'footprints', 2500); return true; }

/* ---------- the one prompt, for the building tools ---------- */
/** Laying: the prompt is only about that (returned). Otherwise rows for what the tool in your hand can do here go in `rows`. */
function gardenB2LandRows(px, py, rows) {
  const L = _gb2l.lay;
  if (L) {
    let words = '';
    if (L.kind === 'path') { let a = null; try { a = gardenDesignAnchor({ x: px, y: py }, L.d, gardenHere()); } catch (e) { a = null; } words = L.pts.length > 2 && a ? `Finish the path at ${a.what}` : 'Walk on to a path, a plaza or a door, then press E'; }
    else words = L.st < 0 ? (L.n ? 'Finish taking it up' : 'Walk over ground you laid') : L.added.size >= GDZ_STRICT.ground.patchMin ? `Finish the ${_gb2lStyleName('ground', L.st).toLowerCase()} here` : `Keep going: ${GDZ_STRICT.ground.patchMin - L.added.size} more squares`;
    return [{ key: 'b2lay:' + words, act: 'b2-lay', b2: () => { _gb2lFinish(); return true; }, words, name: '', x: px, y: py, src: 'b2lay', promptY: py - 2.1 }];
  }
  let t = ''; try { t = gardenB2RingTool(); } catch (e) { return null; }
  if (!['paths', 'hoe', 'spade', 'stakes', 'hands'].includes(t) || _gb2lCan()) return null;
  let m = null, d = null; try { m = gardenHere(); d = _gb2lShownDesign(); } catch (e) { return null; }
  if (t === 'paths') { const a = gardenDesignAnchor({ x: px, y: py }, d, m); if (a) rows.push({ key: 'b2path', act: 'b2-path', b2: () => { _gb2lStart('path'); return true; }, words: `Start a ${GDZ_PATHS[_gb2l.pathSt] ? GDZ_PATHS[_gb2l.pathSt].name.toLowerCase() : ''} path here`, name: '', x: px, y: py, src: 'b2path', promptY: py - 2.1 }); }
  if (t === 'hoe') rows.push({ key: 'b2hoe' + _gb2l.groundSt, act: 'b2-hoe', b2: () => { _gb2lStart('ground'); return true; }, words: _gb2l.groundSt < 0 ? 'Take up laid ground from here' : `Lay ${_gb2lStyleName('ground', _gb2l.groundSt).toLowerCase()} from here`, name: '', x: px, y: py, src: 'b2hoe', promptY: py - 2.1 });
  const deg = typeof gartMoveFacingDeg === 'function' ? gartMoveFacingDeg() * Math.PI / 180 : Math.PI / 2, fx = px + Math.cos(deg) * 0.8, fy = py + Math.sin(deg) * 0.6;
  if (t === 'spade') {
    const hit = _gb2lPathAt(d, fx, fy, 0.75); if (hit >= 0) rows.push({ key: 'b2lift-p' + hit, act: 'b2-liftpath', b2: () => _gb2lLiftPath(hit), words: `Lift this ${(GDZ_PATHS[d.p[hit][0]] || GDZ_PATHS[0]).name.toLowerCase()} path`, name: '', x: fx, y: fy, src: 'b2liftp', promptY: fy - 1.6 });
    const W = GARDEN_WORLD, cx = Math.floor(fx), cy = Math.floor(fy), cells = _gb2lDec(d.g), st = cells.get(cy * W.cols + cx);
    if (st != null && GDZ_GROUND[st]) rows.push({ key: 'b2lift-g' + cx + ',' + cy, act: 'b2-liftground', b2: () => _gb2lLiftGround(cx, cy), words: `Lift this ${GDZ_GROUND[st].name.toLowerCase()}`, name: '', x: cx + 0.5, y: cy + 0.6, src: 'b2liftg', promptY: cy - 1 });
  }
  if (t === 'stakes') for (const p of gardenPropsNow()) {
    if (!p || p.x == null || /^dzc/.test(p.id || '')) continue;
    const row = gardenDesignRow(p.id); if (!row || !gardenDesignMovable(row.id) || gardenDesignLandmark(row.id) || _gb2lSightWhy(row)) continue;
    const w = row.w || 1, h = row.h || 1, ex = Math.max(row.x - px, 0, px - (row.x + w)), ey = Math.max(row.y - py, 0, py - (row.y + h));
    if (Math.hypot(ex, ey * 1.3) > 1.15) continue;
    const at = { x: Math.max(row.x + 0.3, Math.min(row.x + w - 0.3, px)), y: row.y + h - 0.1 }, b = gardenDesignBase(row.id), moved = b && (b.x !== row.x || b.y !== row.y);
    rows.push({ key: 'b2stake:' + row.id, act: 'b2-stake', b2: () => _gb2lLift(row), words: `Move ${_gb2lThe(row.name)}`, name: row.name, x: at.x, y: at.y, src: 'b2stake:' + row.id, promptY: row.y - 0.3 });
    if (moved) rows.push({ key: 'b2stakeback:' + row.id, act: 'b2-stakeback', b2: () => _gb2lPropBack(row), words: `Put ${_gb2lThe(row.name)} back where it started`, name: row.name, x: at.x, y: at.y + 0.05, src: 'b2stakeback:' + row.id, promptY: row.y - 0.3 });
  }
  if (t === 'hands') gardenDesignLandProps().forEach((r, i) => {
    if (Math.hypot(r.x + 0.5 - px, (r.y + 0.9 - py) * 1.3) > 1.6 || !d.c[i]) return;
    const def = GDZ_MADE[d.c[i][0]] || GDZ_MADE[0];
    rows.push({ key: 'b2made:' + r.id, act: 'b2-made', b2: () => _gb2lMadePick(i, r), words: `Pick up your ${def.id}`, name: r.name, x: r.x + 0.5, y: r.y + 0.9, src: 'b2made:' + r.id, promptY: r.y - 1.2 });
  });
  return null;
}
/** The design shown now (no copy: for looking only). */
function _gb2lShownDesign() { const s = typeof gardenDesignShown === 'function' ? gardenDesignShown() : null; return s || gardenDesignEmpty(); }
/** The laid path that passes within r of x, y (its index), or -1. */
function _gb2lPathAt(d, x, y, r) {
  let best = -1, bd = r;
  (d.p || []).forEach((row, i) => { const ps = gardenDesignPts(row).map(([px, py]) => [px / GARDEN_WORLD.cellW, (py - GARDEN_WORLD.sky) / GARDEN_WORLD.cellH]); for (let k = 1; k < ps.length; k++) { const [ax, ay] = ps[k - 1], [bx, by] = ps[k], L2 = (bx - ax) ** 2 + (by - ay) ** 2, t = L2 ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2)) : 0, dd = Math.hypot(ax + (bx - ax) * t - x, (ay + (by - ay) * t - y) * 1.2); if (dd < bd) { bd = dd; best = i; } } });
  return best;
}
function _gb2lLiftPath(i) {
  const no = _gb2lCan(); if (no) return _gb2lNo(no);
  const d = _gb2lDesign(); if (!d.p[i]) return false;
  const name = (GDZ_PATHS[d.p[i][0]] || GDZ_PATHS[0]).name.toLowerCase(); d.p.splice(i, 1);
  const r = _gb2lCommit(d, { label: 'lifting a path', icon: 'shovel', say: `The ${name} path is up, stones and all. Undo (Ctrl+Z) lays it again.` });
  if (!r.ok) return _gb2lNo(r.msg);
  try { gardenSfx('place'); if (window.GardenNativeActions) GardenNativeActions.effect('harvest', _gw.px * GARDEN_WORLD.cellW, GARDEN_WORLD.sky + _gw.py * GARDEN_WORLD.cellH, { width: 40 }); } catch (e) { /* quiet */ }
  return true;
}
/** The patch of laid ground the spade faces, lifted whole (the patch of that ground it is part of). */
function _gb2lLiftGround(cx, cy) {
  const no = _gb2lCan(); if (no) return _gb2lNo(no);
  const W = GARDEN_WORLD, d = _gb2lDesign(), cells = _gb2lDec(d.g), s0 = cy * W.cols + cx, st = cells.get(s0); if (st == null) return false;
  const stack = [s0], seen = new Set([s0]);
  while (stack.length) { const i = stack.pop(); cells.delete(i); const x = i % W.cols, y = (i - x) / W.cols; for (const [dx, dy] of _GB2L_BRUSH) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W.cols || ny >= W.rows) continue; const j = ny * W.cols + nx; if (!seen.has(j) && cells.get(j) === st) { seen.add(j); stack.push(j); } } }
  d.g = _gb2lEnc(cells);
  const r = _gb2lCommit(d, { label: 'lifting ground', icon: 'shovel', say: `The ${GDZ_GROUND[st].name.toLowerCase()} is up: ${seen.size} square${seen.size === 1 ? '' : 's'}. Undo (Ctrl+Z) lays it again.` });
  return r.ok ? true : _gb2lNo(r.msg);
}

/* ---------- moving stakes: a thing of the vale moved ---------- */
function _gb2lLift(row, rec) {
  const no = _gb2lCan(); if (no) return _gb2lNo(no);
  const design = _gb2lDesign(), name = row.name;
  const H = { k: 'prop', id: row.id, fw: row.w || 1, fh: row.h || 1, ox: row.x, oy: row.y, source: 'prop:' + row.id, name, noSnap: true, verb: `Move ${_gb2lThe(name)} here`, backWords: 'X: it stays where it is',
    why: (x, y, m) => _gb2lPropQuick(row, x, y, m, design),
    put: (x, y) => {
      const r = _gb2lPropCheck(row, x, y, design); if (r.why) return _gdNo(r.why);
      const d = _gb2lDesign(), b = gardenDesignBase(row.id);
      d.m = d.m.filter(q => q[0] !== row.id);
      if (!(b && b.x === x && b.y === y)) { const dd = r.door || { x, y }; d.m.push([row.id, x, y, dd.x - x, dd.y - y]); }
      if (d.m.length > GDZ_LIMITS.moved) return _gdNo(`A garden can have ${GDZ_LIMITS.moved} things moved. Put one back where it started first.`);
      return _gb2lCommit(d, { stage: true, label: 'moving ' + _gb2lThe(name), icon: 'move', say: `${_gb2lCap(_gb2lThe(name))} is in its new place${r.door && gardenDesignClass(row) === 'building' ? ', its door facing the path' : ''}. Undo (Ctrl+Z) moves it back.`, edit: rec ? _gb2lRecovered(rec) : null, no: 'That earlier layout is not in use any more.' });
    },
    back: () => ({ msg: `${_gb2lCap(_gb2lThe(name))} stays where it is.` }) };
  if (!gardenB2HoldThing(H)) return false;
  _gb2lFirst('stakes', `The stakes are round ${_gb2lThe(name)}. Walk to where it should stand and press E: it goes up there${gardenDesignClass(row) === 'building' ? ', its door facing a path' : ''}. X or Esc leaves it where it is.`);
  return true;
}
function _gb2lPropBack(row) {
  const no = _gb2lCan(); if (no) return _gb2lNo(no);
  const b = gardenDesignBase(row.id); if (!b) return false;
  const r = _gb2lPropCheck(row, b.x, b.y, _gb2lDesign(), { loose: true });
  if (r.why) return _gb2lNo(`${_gb2lCap(_gb2lThe(row.name))} cannot go back yet. ${r.why}`);
  const d = _gb2lDesign(); d.m = d.m.filter(q => q[0] !== row.id);
  const res = _gb2lCommit(d, { stage: true, label: 'putting back ' + _gb2lThe(row.name), icon: 'undo-2', say: `${_gb2lCap(_gb2lThe(row.name))} is back where it started.` });
  return res.ok ? true : _gb2lNo(res.msg);
}
function _gb2lFirst(key, text) { try { const g = _gdG(); if (g.seen['b2.ld.' + key]) return; g.seen['b2.ld.' + key] = _gdToday(); if (typeof _gb2Save === 'function') _gb2Save(); _gb2lSay(text, 'hand', 9000); } catch (e) { /* said next time */ } }

/* ---------- things you make: signs, flags and statues ---------- */
/** Hold a new thing you made (c: [kind, 0, 0, colour a, colour b, pattern or pose, words]). rec: an earlier layout's, put out again. */
function gardenB2MakeHold(c, rec) {
  const no = _gb2lCan(); if (no) return _gb2lNo(no);
  const d0 = _gb2lDesign(); if (d0.c.length >= GDZ_LIMITS.made) return _gb2lNo(`You have made ${GDZ_LIMITS.made} things, which is all a garden has room for. Put one away first`);
  const def = GDZ_MADE[c[0]] || GDZ_MADE[0], row = c.slice(0, 7), design = d0;
  const H = { k: 'made', fw: 1, fh: 1, name: 'Your ' + def.id, c: row, words: { c: [row] }, verb: `Put your ${def.id} here`, backWords: 'X puts it away',
    art: () => gardenDesignMadeArt(row, 0), icon: `<svg viewBox="-40 -92 80 96" aria-hidden="true">${gardenDesignMadeArt(row, 0).replace(/<text[^>]*><\/text>/g, '')}</svg>`,
    why: (x, y, m) => _gb2lMadeWhy(x, y, null, row, m, design),
    put: (x, y) => { const d = _gb2lDesign(); if (d.c.length >= GDZ_LIMITS.made) return _gdNo('There is no room for more made things. Put one away first.'); d.c.push([row[0], x, y, row[3], row[4], row[5], row[6]]); return _gb2lCommit(d, { stage: true, label: 'putting up your ' + def.id, icon: 'hammer', say: `Your ${def.id} is up. Pick it up again with your hands, or Undo (Ctrl+Z).`, edit: rec ? _gb2lRecovered(rec) : null, no: 'That earlier layout is not in use any more.' }); },
    back: () => ({ msg: rec ? 'It stays with the earlier layout: put it out whenever you like.' : 'Put away. You can make another any time (Build, in the menu).' }) };
  if (!gardenB2HoldThing(H)) return false;
  _gb2lFirst('made', `Your ${def.id} is in your hands. Face where it should stand and press E (or click a spot). X puts it away.`);
  return true;
}
/** Pick up a thing you made: it moves where you put it down; X puts it away (Undo brings it back). */
function _gb2lMadePick(i, prow) {
  const no = _gb2lCan(); if (no) return _gb2lNo(no);
  const d0 = _gb2lDesign(), c = d0.c[i]; if (!c) return false;
  const def = GDZ_MADE[c[0]] || GDZ_MADE[0], key = c.join('|');
  const find = (d) => { const j = d.c.findIndex(q => q.join('|') === key); return j; };
  const H = { k: 'made', fw: 1, fh: 1, name: 'Your ' + def.id, c: c.slice(), words: { c: [c] }, ox: c[1], oy: c[2], source: 'prop:' + prow.id, verb: `Put your ${def.id} here`, backWords: 'X puts it away',
    art: () => gardenDesignMadeArt(c, 0), icon: `<svg viewBox="-40 -92 80 96" aria-hidden="true">${gardenDesignMadeArt(c, 0).replace(/<text[^>]*><\/text>/g, '')}</svg>`,
    why: (x, y, m) => (x === c[1] && y === c[2] ? 'It is there already' : _gb2lMadeWhy(x, y, i, c, m, d0)),
    put: (x, y) => { const d = _gb2lDesign(), j = find(d); if (j < 0) return _gdNo('It has gone from there.'); d.c[j][1] = x; d.c[j][2] = y; return _gb2lCommit(d, { stage: true, label: 'moving your ' + def.id, icon: 'move', say: `Your ${def.id} is in its new place.` }); },
    back: () => { const d = _gb2lDesign(), j = find(d); if (j < 0) return null; d.c.splice(j, 1); const r = _gb2lCommit(d, { stage: true, label: 'putting away your ' + def.id, icon: 'archive' }); return r.ok ? { msg: `Your ${def.id} is put away. Undo (Ctrl+Z) brings it back.` } : r; } };
  return gardenB2HoldThing(H);
}

/* ---------- plans: your garden's layouts ---------- */
function _gb2lPlans() { const g = _gdG(), z = g.dz && g.dz.lay ? g.dz : null; return z ? Object.keys(z.lay).map(id => ({ id, n: String(z.lay[id].n || 'My garden'), cur: id === z.cur })) : []; }
function gardenB2PlanUse(id) {
  const no = _gb2lCan(); if (no) return _gb2lNo(no);
  if (_gb2lVisit()) return _gb2lNo('Plans are each garden’s own');
  const g = _gdG(), z = g.dz; if (!z || !z.lay || !z.lay[id] || id === z.cur) return false;
  const d = gardenDesignLayoutDraft(z, id, g), back = [];
  // a plan kept a while ago may meet things put out since: anything that no longer works goes back where it started, and says so
  for (const q of d.m.slice()) {
    const row = gardenDesignRow(q[0]); if (!row) continue;
    d.m = d.m.filter(r => r !== q); gardenDesignShow(d);
    if (_gb2lPropCheck(row, q[1], q[2], d, { loose: true }).why) back.push(row.name); else { d.m.push(q); gardenDesignShow(d); }
  }
  const name = String(z.lay[id].n || 'that plan');
  const r = _gb2lCommit(d, { stage: true, label: 'changing to ' + name, icon: 'layers', edit: () => id, say: `${name} is your garden now.${back.length ? ` ${back.join(', ')} could not stand there any more, so ${back.length === 1 ? 'it' : 'they'} went back where ${back.length === 1 ? 'it' : 'they'} started.` : ''} Undo (Ctrl+Z) changes back.` });
  if (!r.ok) { gardenDesignShow(gardenDesignSaved(g)); return _gb2lNo(r.msg); }
  return true;
}
function gardenB2PlanCopy(name) {
  if (_gb2lVisit()) return _gb2lNo('Plans are each garden’s own');
  const n = gardenDesignText(name) || 'Plan ' + (_gb2lPlans().length + 1);
  const r = _gb2lCommit(null, { label: 'keeping a plan', icon: 'layers', edit: (lay, cur) => { const ids = Object.keys(lay); if (ids.length >= GDZ_LIMITS.layouts) return false; let k = 1; while (lay['l' + k]) k++; lay['l' + k] = { n, d: JSON.parse(JSON.stringify(lay[cur].d || gardenDesignEmpty())), ...(GARDEN_WORLD.v >= 3 ? { island: [GARDEN_WORLD.v, GARDEN_WORLD.lh] } : {}) }; return 'l' + k; }, no: `You can keep ${GDZ_LIMITS.layouts} plans. Take one away first.`, say: `${n} is kept, and it is the one in your garden now: change things freely, and switch back to the other plan whenever you like.` });
  return r.ok ? true : _gb2lNo(r.msg);
}
function gardenB2PlanRemove(id) {
  const r = _gb2lCommit(null, { label: 'taking away a plan', icon: 'layers', edit: (lay, cur) => { if (id === cur || !lay[id]) return false; delete lay[id]; return cur; }, no: 'The plan in use stays. Switch to another first.', say: 'That plan is gone. Undo (Ctrl+Z) brings it back.' });
  return r.ok ? true : _gb2lNo(r.msg);
}
/* earlier layouts, from before the island: brought back as a plan, and their things put out one by one with your hands */
function _gb2lArchivePending() {
  const g = _gdG(), z = g.dz, row = z && z.lay && z.lay[z.cur], r = row && row.recovery;
  const archive = r && gardenDesignArchives(g).find(a => a.key === r.key); if (!archive) return null;
  const raw = archive.layout.d || {}, doneM = Array.isArray(r.m) ? r.m : [], doneC = Array.isArray(r.c) ? r.c : [];
  return { archive, moved: (Array.isArray(raw.m) ? raw.m : []).map((q, index) => ({ row: q, index })).filter(x => !doneM.includes(x.index)), made: (Array.isArray(raw.c) ? raw.c : []).map((q, index) => ({ row: q, index })).filter(x => !doneC.includes(x.index)) };
}
function gardenB2ArchiveBring(key) {
  if (_gb2lVisit()) return false;
  const g = _gdG(), archive = gardenDesignArchives(g).find(a => a.key === key); if (!archive) return false;
  const r = _gb2lCommit(null, { stage: true, label: 'bringing back an earlier layout', icon: 'layers', no: `You can keep ${GDZ_LIMITS.layouts} plans. Take one away first.`,
    edit: (lay) => { if (!lay[archive.id] && Object.keys(lay).length >= GDZ_LIMITS.layouts) return false; if (!lay[archive.id]) lay[archive.id] = { n: archive.layout.n || 'Earlier layout', d: gardenDesignIslandProjection(archive.layout.d), ...(GARDEN_WORLD.v >= 3 ? { island: [GARDEN_WORLD.v, GARDEN_WORLD.lh] } : {}) }; if (!lay[archive.id].recovery || lay[archive.id].recovery.key !== key) lay[archive.id].recovery = { key, m: [], c: [] }; return archive.id; },
    say: 'Its paths and ground are back where they still fit. Put its other things out one by one from Build; the earlier layout itself stays safe as it was.' });
  return r.ok ? true : _gb2lNo(r.msg);
}
/** After an earlier thing is put out: the plan remembers it is done (and a stale plan says no). */
function _gb2lRecovered(rec) {
  return (lay, cur) => { const r = lay[cur] && lay[cur].recovery; if (!r || r.key !== rec.key) return false; const list = r[rec.kind] || (r[rec.kind] = []); if (!list.includes(rec.index)) list.push(rec.index); return cur; };
}
function gardenB2ArchivePut(kind, index) {
  const P = _gb2lArchivePending(); if (!P) return false;
  const item = (kind === 'm' ? P.moved : P.made).find(x => x.index === index); if (!item || !Array.isArray(item.row)) return false;
  const rec = { key: P.archive.key, kind, index };
  if (kind === 'm') {
    const row = gardenDesignRow(item.row[0]);
    if (!row || !gardenDesignMovable(row.id) || gardenDesignLandmark(row.id)) return _gb2lNo('This one uses its own Land controls. Its earlier place stays in the earlier layout');
    const why = _gb2lSightWhy(row); if (why) return _gb2lNo(why);
    return _gb2lLift(row, rec);
  }
  const clean = gardenDesignClean({ p: [], g: [], m: [], c: [item.row] });
  if (!clean || !clean.c.length || !GDZ_MADE[clean.c[0][0]]) return _gb2lNo('This version does not understand that earlier thing. It stays safe in the earlier layout');
  return gardenB2MakeHold(clean.c[0], rec);
}

/* ---------- Build (in the menu): the tools, things to make, your plans ---------- */
function gardenB2BuildOpen(tab) {
  const box = typeof _ghBox === 'function' ? _ghBox() : null; if (!box || !gardenB2On()) return false;
  try { _ghClosePanels(box); gardenBubbleClose(); } catch (e) { /* fine */ }
  if (tab) _gb2l.buildTab = tab;
  _gb2.panel = 'build'; _gb2.popKey = ''; _gh.bag = true; _ghBag(); _gh.bar = ''; _ghBar(box, gardenHere());
  try { gardenSfx('open'); } catch (e) { /* quiet */ }
  return true;
}
function gardenB2BuildKey() { const P = _gb2lArchivePending(); return ['build', _gb2l.buildTab, JSON.stringify(_gb2l.make), JSON.stringify(_gb2lPlans()), gardenDesignArchives(_gdG()).length, P ? P.moved.length + ',' + P.made.length : '', !!_gb2lVisit()].join('|'); }
function _gb2lE(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function _gb2lBtn(cls, label, ic, run) { const b = _gb2lE('button', 'gb2-act' + (cls ? ' ' + cls : '')); b.type = 'button'; b.innerHTML = (ic ? icon(ic) : '') + '<span></span>'; b.lastChild.textContent = label; b.onclick = (ev) => { ev.stopPropagation(); run(b); }; return b; }
function gardenB2BuildDraw(el, box) {
  el.textContent = '';
  const head = _gb2lE('div', 'gb2-head'), pic = _gb2lE('span', 'gb2-head-pic'), title = _gb2lE('h2', '', 'Build'), x = _gb2lE('button', 'gb2-x');
  pic.innerHTML = _GB2_GLYPH.stakes; pic.setAttribute('aria-hidden', 'true'); title.id = 'gb2-title';
  x.type = 'button'; x.dataset.gb2k = 'close'; x.setAttribute('aria-label', 'Close Build'); x.innerHTML = icon('x'); x.onclick = () => { _gb2.panel = 'pockets'; _gb2Close(box); };
  head.append(pic, title, _gb2lE('span', 'gb2-cap', 'Everything is built where you stand'), x); el.appendChild(head);
  const tabs = _gb2lE('div', 'gb2-tabs'); tabs.setAttribute('role', 'tablist');
  for (const [id, name, ic] of [['tools', 'Your tools', 'hammer'], ['make', 'Make something', 'sparkles'], ['plans', 'Your plans', 'layers']]) { const b = _gb2lE('button', 'gb2-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(_gb2l.buildTab === id)); b.innerHTML = icon(ic) + '<span></span>'; b.lastChild.textContent = name; b.onclick = (ev) => { ev.stopPropagation(); _gb2l.buildTab = id; _gb2.popKey = ''; _ghBag(); }; tabs.appendChild(b); }
  el.appendChild(tabs);
  const body = _gb2lE('div', 'gb2-buildbody'); el.appendChild(body);
  if (_gb2l.buildTab === 'make') _gb2lDrawMake(body, box); else if (_gb2l.buildTab === 'plans') _gb2lDrawPlans(body); else _gb2lDrawTools(body, box);
}
function _gb2lDrawTools(body, box) {
  const list = _gb2lE('div', 'gb2-toollist');
  const rows = [['hands', 'Hands', 'Pick up anything you put down and carry it: E puts it down where the square shows, R turns it, X puts it in your pockets.'],
    ['paths', 'Path kit', 'Stand on a path, a plaza or by a door, press E, walk where the path should go, and press E again. R changes the stones.'],
    ['hoe', 'Hoe', 'Press E and walk over open ground to make a flower bed or a veg bed, or lay moss, sand or bark. R changes what you lay.'],
    ['spade', 'Spade', 'Lift a plant whole into your pockets, still growing; lift a path or ground you laid.'],
    ['stakes', 'Moving stakes', 'Face a bench, a lamp, a stall or a shop of the vale and press E to move it. Its door has to face a path.']];
  for (const [id, name, says] of rows) {
    const r = _gb2lE('div', 'gb2-toolrow'), p = _gb2lE('span', 'gb2-toolpic'), t = _gb2lE('div', 'gb2-detail-t'); p.innerHTML = _gb2ToolSvg(id); p.setAttribute('aria-hidden', 'true');
    t.append(_gb2lE('b', '', name), _gb2lE('small', '', says));
    r.append(p, t, _gb2lBtn('is-go', 'Take it out', 'hand', () => { _gb2.panel = 'pockets'; _gb2Close(box); gardenB2PickTool(id); }));
    list.appendChild(r);
  }
  body.appendChild(list);
  body.appendChild(_gb2lE('p', 'gb2-foot', 'Every change is kept at once, for friends too. Ctrl+Z (or Undo) takes the last one back. Your seeds and decorations are in your pockets (B).'));
}
function _gb2lDrawMake(body, box) {
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  const M = _gb2l.make, ctx = gardenDesignCtx(m); let rw = null; try { rw = typeof gardenDesignRows === 'function' ? gardenDesignRows(m) : null; } catch (e) { rw = null; }
  const kinds = _gb2lE('div', 'gb2-makekinds');
  GDZ_MADE.forEach((def, i) => { const open = gardenDesignOpen(def, ctx, rw); const b = _gb2lE('button', 'gb2-swatch' + (M.kind === i ? ' is-on' : '') + (open ? '' : ' is-locked')); b.type = 'button'; b.setAttribute('aria-pressed', String(M.kind === i)); b.innerHTML = `<svg viewBox="-40 -92 80 96" aria-hidden="true">${gardenDesignMadeArt([i, 0, 0, GDZ_STRICT.pairs[def.id][0][0], GDZ_STRICT.pairs[def.id][0][1], 0, ''], 0).replace(/<text[^>]*><\/text>/g, '')}</svg><span></span>`; b.lastChild.textContent = open ? def.name : `${def.name}: ${def.earn.says}`; b.disabled = !open; b.onclick = (ev) => { ev.stopPropagation(); M.kind = i; M.pair = 0; M.pat = 0; _gb2.popKey = ''; _ghBag(); }; kinds.appendChild(b); });
  body.appendChild(kinds);
  const def = GDZ_MADE[M.kind] || GDZ_MADE[0], pairs = GDZ_STRICT.pairs[def.id] || [[0, 7]];
  const cols = _gb2lE('div', 'gb2-makerow'); cols.appendChild(_gb2lE('b', '', 'Colours'));
  pairs.forEach((p, i) => { const a = GDZ_COLOURS[p[0]], bb = GDZ_COLOURS[p[1]], open = gardenDesignOpen(a, ctx, rw) && gardenDesignOpen(bb, ctx, rw); const b = _gb2lE('button', 'gb2-pair' + (M.pair === i ? ' is-on' : '')); b.type = 'button'; b.disabled = !open; b.setAttribute('aria-pressed', String(M.pair === i)); b.setAttribute('aria-label', `${a.n} and ${bb.n}${open ? '' : ' (not yet: ' + ((a.earn || bb.earn).says) + ')'}`); b.style.setProperty('--a', a.c); b.style.setProperty('--b', bb.c); b.onclick = (ev) => { ev.stopPropagation(); M.pair = i; _gb2.popKey = ''; _ghBag(); }; cols.appendChild(b); });
  body.appendChild(cols);
  if (def.id === 'flag' || def.id === 'statue') {
    const T = def.id === 'flag' ? GDZ_FLAGS : GDZ_POSES, row = _gb2lE('div', 'gb2-makerow'); row.appendChild(_gb2lE('b', '', def.id === 'flag' ? 'Pattern' : 'Pose'));
    T.forEach((q, i) => { const open = gardenDesignOpen(q, ctx, rw), b = _gb2lE('button', 'gb2-chip' + (M.pat === i ? ' is-on' : '')); b.type = 'button'; b.disabled = !open; b.setAttribute('aria-pressed', String(M.pat === i)); b.textContent = q.name; if (!open && q.earn) b.title = q.earn.says; b.onclick = (ev) => { ev.stopPropagation(); M.pat = i; _gb2.popKey = ''; _ghBag(); }; row.appendChild(b); });
    body.appendChild(row);
  }
  if (def.id === 'sign') {
    const row = _gb2lE('label', 'gb2-makerow'), inp = _gb2lE('input', 'gb2-signwords'); row.appendChild(_gb2lE('b', '', 'Words'));
    inp.type = 'text'; inp.maxLength = GDZ_STRICT.signText; inp.placeholder = 'Up to 16 letters'; inp.value = M.text || ''; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.addEventListener('input', () => { M.text = gardenDesignText(inp.value).slice(0, GDZ_STRICT.signText); const pv = body.querySelector('.gb2-makeprev'); if (pv) { const c2 = c.slice(); c2[6] = M.text; gardenDesignPainted(pv, { c: [c2] }); } });   // (the words on the little sign below, as you type)
    inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); go.click(); } });
    row.appendChild(inp); body.appendChild(row);
  }
  const pr = pairs[M.pair] || pairs[0], c = [M.kind, 0, 0, pr[0], pr[1], def.id === 'sign' ? 0 : M.pat, def.id === 'sign' ? gardenDesignText(M.text || '').slice(0, GDZ_STRICT.signText) : ''];
  const prev = _gb2lE('div', 'gb2-makeprev'); prev.innerHTML = `<svg viewBox="-46 -96 92 100" aria-hidden="true">${gardenDesignMadeArt(c, 0)}</svg>`; gardenDesignPainted(prev, { c: [c] });
  const go = _gb2lBtn('is-go', `Make the ${def.id} and hold it`, 'hammer', () => { _gb2.panel = 'pockets'; _gb2Close(box); gardenB2MakeHold(c); });
  const foot = _gb2lE('div', 'gb2-makefoot'); foot.append(prev, go); body.appendChild(foot);
}
function _gb2lDrawPlans(body) {
  if (_gb2lVisit()) { body.appendChild(_gb2lE('p', 'gb2-foot', 'Plans are each garden’s own: your friend keeps theirs, and yours wait at home.')); return; }
  const plans = _gb2lPlans(), list = _gb2lE('div', 'gb2-planlist');
  if (!plans.length) list.appendChild(_gb2lE('p', 'gb2-none', 'Your garden is one plan so far. Keep a copy to try something new and come back to this one.'));
  for (const p of plans) {
    const r = _gb2lE('div', 'gb2-planrow' + (p.cur ? ' is-cur' : '')), t = _gb2lE('div', 'gb2-detail-t');
    t.append(_gb2lE('b', '', p.n), _gb2lE('small', '', p.cur ? 'In your garden now' : 'Kept'));
    r.appendChild(t);
    if (!p.cur) { r.appendChild(_gb2lBtn('is-go', 'Use this plan', 'layers', () => { gardenB2PlanUse(p.id); _gb2.popKey = ''; _ghBag(); })); r.appendChild(_gb2lBtn('', 'Take away', 'trash-2', () => { gardenB2PlanRemove(p.id); _gb2.popKey = ''; _ghBag(); })); }
    list.appendChild(r);
  }
  body.appendChild(list);
  if (plans.length < GDZ_LIMITS.layouts) {
    const row = _gb2lE('div', 'gb2-makerow'), inp = _gb2lE('input', 'gb2-signwords'); inp.type = 'text'; inp.maxLength = GDZ_LIMITS.text; inp.placeholder = 'A name, like Summer'; inp.setAttribute('aria-label', 'A name for the new plan'); inp.autocomplete = 'off';
    const go = _gb2lBtn('gb2-plancopy', 'Keep a copy as a new plan', 'copy', () => { gardenB2PlanCopy(inp.value); _gb2.popKey = ''; _ghBag(); });
    inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); go.click(); } });
    row.append(inp, go); body.appendChild(row);
  }
  const arch = gardenDesignArchives(_gdG()), P = _gb2lArchivePending();
  if (arch.length) {
    const sec = _gb2lE('section', 'gb2-archive'); sec.appendChild(_gb2lE('h3', '', 'Earlier layouts, from before the island'));
    for (const a of arch) { const r = _gb2lE('div', 'gb2-planrow'), t = _gb2lE('div', 'gb2-detail-t'); t.append(_gb2lE('b', '', String((a.layout && a.layout.n) || 'Earlier layout')), _gb2lE('small', '', 'Kept safe, just as it was')); const using = !!(P && P.archive.key === a.key), b = _gb2lBtn(using ? '' : 'is-go', using ? 'In use' : 'Bring it back', using ? 'check' : 'undo-2', () => { gardenB2ArchiveBring(a.key); _gb2.popKey = ''; _ghBag(); }); b.disabled = using; r.append(t, b); sec.appendChild(r); }
    if (P && (P.moved.length || P.made.length)) {
      sec.appendChild(_gb2lE('p', 'gb2-hint', 'Its other things, to put out one by one where they fit now:'));
      const wrap = _gb2lE('div', 'gb2-archthings');
      for (const it of P.moved) { const row = gardenDesignRow(it.row[0]); if (row) wrap.appendChild(_gb2lBtn('', row.name, 'move', () => { _gb2.panel = 'pockets'; _gb2Close(_ghBox()); gardenB2ArchivePut('m', it.index); })); }
      for (const it of P.made) { const def = GDZ_MADE[it.row && it.row[0]]; if (def) wrap.appendChild(_gb2lBtn('', 'Your ' + def.id, 'hammer', () => { _gb2.panel = 'pockets'; _gb2Close(_ghBox()); gardenB2ArchivePut('c', it.index); })); }
      sec.appendChild(wrap);
    }
    body.appendChild(sec);
  }
}

/* ---------- the separate garden designer is gone (94-garden-design-2tools.js and -3panel.js were removed): building is done in the game,
   with the tools above. Other parts of the garden still ask these names (guarded with typeof); they say what is true now. ---------- */
function gardenDesignOn() { return false; }
function gardenDesignCam() { return null; }
function gardenDesignAbort() { /* nothing is ever drafted */ }
function gardenDesignResume() { /* nothing waits to come back */ }
function gardenDesignDecorDraft(list) { return list; }
function gardenDesignEnter() { return typeof gardenB2BuildOpen === 'function' && gardenB2BuildOpen(); }

/* ============================================================
   THE INTERACTION SYSTEM (round 3, "player" branch): reads the tables in 94-garden-zz-7act-0table.js.
     gartActNearby()        the things in reach now, best first: [{key, act, name, x, y (the thing), stand {x, y}, deg, lift}]
     gartActRun(id, spot)   walk there (if it has a place) and do it; any movement key, a click on the ground or walking off ends it
     gartActStop()          end it now
     gartActBusy()          true while doing something (the walker's turn and stride stand aside)
     gartActLift()          how many px the figure is lifted (on a seat, a branch)
   A small prompt shows the nearest thing's action in plain words above it ("E  Sit on the bench"). E or Space, or a click on the prompt,
   does it. Friends see it: one gl:em ('act-<id>') when it starts, nothing per frame; walking away ends it on their screen too (their walk
   message stops any held move, as sitting always did). Reduced motion: every action jumps to its end pose and holds; nothing loops.
   The first time you do each one, a line goes in your journal (state disc['act.<id>']) and a small toast says so.
   ============================================================ */
const _ga = { wt: 0, cur: null, el: null, near: null, t: 0, list: null, listT: 0, trunkSig: '', trunks: [] };
const GA_REACH = 2.2;   // cells: how near a thing must be for its prompt
const GA_WIRE = 'act-';
function _gaMotion() { try { return typeof _gartMotionOk === 'function' ? _gartMotionOk() : gardenMotionOn(); } catch (e) { return true; } }
function gartActBusy() { return !!(_ga.cur && _ga.cur.doing); }
/** Sat on a seat whose front edge is inside its own footing (a bench): the walker leaves the feet where they are until you get up. */
function gartActSeatHeld() { const c = _ga.cur; return !!(c && c.doing && c.spot && c.spot.seated); }
/** Something of the world's you are using right now (the busker's fiddle is in your hands, not on its stool). */
function gartActInUse(id) { const c = _ga.cur; return !!(c && c.doing && c.spot && c.spot.src === id); }
function gartActLift() { return _ga.cur && _ga.cur.doing ? _ga.cur.lift || 0 : 0; }
function gartActRow(id) { return GARDEN_ACTS[id] || null; }
/* ---------- what is in reach ---------- */
function _gaStaticRows() {
  const out = [];
  let rows = []; try { rows = (gardenIslandData().static || []); } catch (e) { return out; }
  const live = typeof GARDEN_PROPS !== 'undefined' ? new Map(GARDEN_PROPS.map(p => [p.id, p])) : new Map();
  // where it is really drawn: the native world's record of it (its painted bounds), else the layout row
  let drawn = null; try { const w = window.GardenNative && GardenNative.world(), e = w && w.entities; drawn = e instanceof Map ? e : null; } catch (e) { drawn = null; }
  const W = GARDEN_WORLD;
  for (const r0 of rows) {
    const opts = GARDEN_ACT_BY_PROP[r0.id]; if (!opts) continue;
    const r = live.get(r0.id) || r0, rec = drawn && drawn.get('prop:' + r0.id);
    if (drawn && drawn.size && !rec && !opts[0].painted) continue;   // not drawn here (not built yet, or another painter's): nothing invisible can be used
    if (opts[0].pierEnd && typeof _gardenPierDecksNow === 'function') {   // the end of the pier as far as it is built today
      const decks = _gardenPierDecksNow(), d = decks[decks.length - 1];
      if (d) for (const o of opts) out.push({ key: 'pier-end:' + o.act, act: o.act, name: o.name, x: d.x + d.w / 2, y: d.y + d.h, stand: { x: d.x + d.w / 2 + o.stand[0], y: d.y + d.h + o.stand[1] }, deg: o.deg, lift: o.lift || 0, src: r0.id });   // (a negative lift: over the edge)
      continue;
    }
    const b = rec && rec.bounds, fx = b && b.width ? (b.x + b.width / 2) / W.cellW : r.x + r.w / 2, fy = b && b.height ? (b.y + b.height - W.sky) / W.cellH : r.y + r.h;
    const top = b && b.height ? (b.y - W.sky) / W.cellH : null;   // the drawn top: the prompt sits just above it
    for (const o of opts) out.push({ key: r.id + ':' + o.act, act: o.act, name: o.name, x: fx, y: fy, top, stand: { x: fx + o.stand[0], y: fy + o.stand[1] }, deg: o.deg, lift: _gaSeatLift(o), seated: o.seat != null || !!o.edge, src: r.id, boat: !!o.boat, reach: o.reach || 0, noProp: !!o.noProp, pri: o.pri || 0 });
  }
  // what this branch draws for the moves (94-garden-zz-7act-2world.js): the telescope, the lighthouse ladder, the campfires
  let season = ''; try { season = gardenModel().season; } catch (e) { season = ''; }
  if (typeof gardenActWorldRows === 'function') for (const w of gardenActWorldRows()) if (!(w.season && w.season !== season) && !gartActHidden(w.id)) out.push({ key: w.id + ':' + w.act, act: w.act, name: w.name, x: w.x, y: w.y, top: null, stand: { x: w.x + w.stand[0], y: w.y + w.stand[1] }, deg: w.deg, lift: _gaSeatLift(w), seated: w.seat != null || !!w.edge, src: w.id, noProp: !!w.noProp, reach: w.reach || 0, kick: w.kick || '', carry: w.carry || '', art: w.art || '' });
  // a thing that has its own (a lighthouse with a drawn ladder) takes that one, not the one carried in
  const own = new Set(out.filter(r => r.noProp).map(r => r.act + '@' + Math.round(r.stand.x) + ',' + Math.round(r.stand.y)));
  return out.filter(r => r.noProp || !own.has(r.act + '@' + Math.round(r.stand.x) + ',' + Math.round(r.stand.y)));
}
/** A seat's height (a share of the figure's height above where the feet go) -> how far the seated figure is lifted, in px. */
function _gaSeatLift(o) {
  if (o && o.seat != null) { const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592; return Math.max(0, Math.round(S * (70 * o.seat - GA_SEAT_HIP) * 10) / 10); }
  return (o && o.lift) || 0;
}
function _gaDecorRows() {
  const out = []; let m; try { m = gardenHere(); } catch (e) { return out; }
  for (const d of (m && m.decor) || []) {
    const k = d.def && d.def.effect && d.def.effect.kind, opts = k && GARDEN_ACT_BY_DECOR[k]; if (!opts) continue;
    const w = d.def.w || 1, h = d.def.h || 1, fx = d.x + w / 2, fy = d.y + h;
    for (const o of opts) out.push({ key: d.uid + ':' + o.act, act: o.act, name: (d.def.name ? 'the ' + String(d.def.name).toLowerCase() : o.name), x: fx, y: fy, stand: { x: fx + o.stand[0], y: fy + o.stand[1] }, deg: o.deg, lift: _gaSeatLift(o), src: d.uid });
  }
  return out;
}
function _gaTreeRows(px, py) {
  try {
    const sig = typeof _gwTrunkSig === 'function' ? _gwTrunkSig() : '';
    if (sig !== _ga.trunkSig || !_ga.trunks.length) { _ga.trunkSig = sig; _ga.trunks = typeof _gwPaintedTrunks === 'function' ? _gwPaintedTrunks(gardenIslandData()) : []; }
  } catch (e) { return []; }
  const out = [];
  for (const b of _ga.trunks) {
    const fx = (b.x0 + b.x1) / 2, fy = b.y1; if (Math.abs(fx - px) > GA_REACH + 1 || Math.abs(fy - py) > GA_REACH + 1) continue;
    for (const o of GARDEN_ACT_BY_TREE[b.src] || []) { if (o.big && b.x1 - b.x0 < o.big) continue; if (o.act === 'hide' && _ga.trunks.some(t => t !== b && t.y1 > fy + 0.3 && t.y1 < fy + 2.6 && Math.abs((t.x0 + t.x1) / 2 - fx - 0.15) < 1.4)) continue;   /* (round 4: not where another tree just in front would bury you in its leaves: you must be seen peeking) */ out.push({ key: 'tree:' + fx.toFixed(1) + ',' + fy.toFixed(1) + ':' + o.act, act: o.act, name: o.name, x: fx, y: fy, stand: { x: fx + (o.side ? o.side * (b.x1 - b.x0) / 2 : 0) + o.stand[0], y: fy + o.stand[1] }, deg: o.deg, lift: 0, src: 'tree', tree: b, seated: !!o.edge }); }
  }
  return out;
}
function _gaWaterRows(px, py) {
  if (typeof gardenWaterContainsPoint !== 'function') return [];
  const wet = (x, y) => { try { return gardenWaterContainsPoint(x, y); } catch (e) { return false; } };
  if (wet(px, py)) return [];
  // not under or beside the falls (white water: no skimming, no ducks), and only water in front of you, out over the bank (you face it)
  try { const f = (gardenIslandData().static || []).find(r => r.id === 'ld-falls'); if (f && Math.hypot(px - (f.x + f.w / 2), (py - (f.y + f.h)) * 1.3) < Math.max(5, f.w)) return []; } catch (e) { /* no falls */ }
  for (const [dx, dy, deg] of [[0, -1.1, -90], [0, -1.8, -90]]) if (wet(px + dx, py + dy) && wet(px + dx, py + dy - 1.6)) { const deep = wet(px + dx, py + dy - 2.8) && wet(px + dx, py + dy - 4.2), W3 = GARDEN_ACT_WATER.filter(o => !o.deep || deep), k = _ga.wt % W3.length; return W3.slice(k).concat(W3.slice(0, k)).map(o => ({ key: 'water:' + o.act, act: o.act, name: o.name, x: px + dx, y: py + dy, stand: null, deg, lift: 0, src: 'water' })); }
  return [];
}
/** Everything in reach, the nearest first (things with a place before the water's edge). */
function gartActNearby() {
  if (typeof _gw === 'undefined' || !_gw.on) return [];
  const now = performance.now();
  if (!_ga.list || now - _ga.listT > 2500) { _ga.list = _gaStaticRows().concat(_gaDecorRows()); _ga.listT = now; }
  const px = _gw.px, py = _gw.py, d = (r) => Math.hypot(r.x - px, (r.y - py) * 1.3);
  const rows = _ga.list.concat(_gaTreeRows(px, py)).filter(r => d(r) <= Math.max(GA_REACH, r.reach || 0) && !gartActHidden(r.src));   // (a ball off rolling, a pile kicked apart: nothing to do there just now)
  rows.sort((a, b) => d(a) - (a.pri || 0) - d(b) + (b.pri || 0));   // (pri: a wall before the tree that grows against it)
  if (!rows.length) return _gaWaterRows(px, py);
  return rows;
}
/* ---------- the prompt ---------- */
function _gaPromptEl() {
  const box = _gw && _gw.box; if (!box) return null;
  if (_ga.el && _ga.el.isConnected && _ga.el.parentNode === box) return _ga.el;
  const el = document.createElement('button'); el.type = 'button'; el.className = 'ga-prompt'; el.hidden = true;
  el.addEventListener('click', (ev) => { ev.stopPropagation(); if (_ga.near) gartActRun(_ga.near.act, _ga.near); });
  el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  box.appendChild(el); _ga.el = el; return el;
}
function _gaWords(r) { const row = GARDEN_ACTS[r.act]; if (!row) return ''; if (r.down) return 'Set it down'; if (r.boat && typeof gardenHas === 'function' && gardenHas('gear:rowing-boat') < 1) return 'Needs a rowing boat (the tackle shop)'; const v = row.verb; return /the |it$|a |under/.test(v) || !r.name ? v : r.act === 'sit' ? 'Sit on ' + r.name : v; }
/** Once a frame from the walker (cheap: looks round five times a second). */
function gartActFrame() {
  if (typeof _gw === 'undefined' || !_gw.on) return;
  const now = performance.now();
  if (_ga.cur && _ga.cur.doing) {
    const cur = _ga.cur;
    if (!cur.H) { const inner = _gw.node && _gw.node.querySelector('.gd-pl-in'), k = (inner && inner._gplKey) || ''; if (k.startsWith('idle' + cur.wantDir) || now - cur.t0 > 600) { const gpl = _gaMyFigure(); if (gpl) cur.H = gartActPlay(gpl, cur.id, { noProp: !!(cur.spot && cur.spot.noProp), skips: cur.skips, leaves: !!(cur.spot && cur.spot.kick === 'leaves'), tree: cur.spot && cur.spot.tree, at: cur.spot && cur.spot.stand }); } }
    _gaTick(now);
    if (cur.row.rubPet) _gaRubTick(cur);
    if (cur.row.fetch) _gaFetchDraw();
  }
  if (!_ga.carry) _gaCarriedSweep(false);
  try { const B = typeof _gh !== 'undefined' && _gh.bubble; if (B) { if (!B._gaP) B._gaP = { x: _gw.px, y: _gw.py }; else if (Math.hypot(_gw.px - B._gaP.x, _gw.py - B._gaP.y) > 2.5) gardenBubbleClose(); } } catch (e) { /* no bubble */ }   // (round 6: a place's bubble closes when you walk off, not at the far side of the vale)
  if (now - _ga.t < 200) { if (_ga.near && _ga.el && !_ga.el.hidden) _gaPlace(); return; }
  _ga.t = now;
  const el = _gaPromptEl(); if (!el) return;
  const busy = (_ga.cur && _ga.cur.doing) || !!_gw.boat || (typeof _gwFishBusy === 'function' && _gwFishBusy()) || (typeof gardenDesignOn === 'function' && gardenDesignOn()) || (typeof GardenNative !== 'undefined' && GardenNative.inRoom && GardenNative.inRoom());
  const near = busy ? null : _ga.carry ? { key: 'carry-down', act: 'carry', name: '', x: _gw.px, y: _gw.py, down: true } : gartActNearby()[0] || null;
  if (!near) { _ga.near = null; el.hidden = true; return; }
  if (!_ga.near || _ga.near.key !== near.key) { _ga.near = near; el.innerHTML = `<kbd>E</kbd><span>${esc(_gaWords(near))}</span>`; el.setAttribute('aria-label', _gaWords(near) + ' (E)'); }
  el.hidden = false; _gaPlace();
}
function _gaPlace() {
  const r = _ga.near, el = _ga.el; if (!r || !el) return;
  const s = typeof _ghProject === 'function' ? _ghProject(r.x, r.top != null ? Math.max(r.top + 0.55, r.y - 6) : r.src === 'tree' ? r.y - 3.2 : r.y - 1.9) : null; if (!s) return;
  // never under the garden's own messages strip at the top (a welcome, a find): below it, and above the thing's foot at most
  let y = s.y; try { const m = _gw.box.querySelector('.gd-msgs'), mb = m && m.childElementCount ? m.getBoundingClientRect() : null, bb = _gw.box.getBoundingClientRect(); const floor = mb && mb.height ? mb.bottom - bb.top + 34 : 40; if (y < floor) { const foot = _ghProject(r.x, r.y); y = Math.min(Math.max(y, floor), foot ? foot.y - 6 : y); } } catch (e) { /* as it was */ }
  el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
}
/** E or Space: the prompt's action, if one is showing. Returns true when it did something. */
function gartActInteract() {
  if (_ga.carry && !(_ga.cur && _ga.cur.doing)) { gartActSetDown(); return true; }
  if (_ga.cur && _ga.cur.doing) { gartActStop(); return true; }
  if (!_ga.near || !_ga.el || _ga.el.hidden) return false;
  return gartActRun(_ga.near.act, _ga.near);
}
/* ---------- doing it ---------- */
const _GA_SEL = Object.freeze({ s: { root: '.gpl-root', up: '.gpl-up', head: '.gpl-hd', armL: '.gpl-af.gpl-b', armR: '.gpl-af.is-r', legL: '.gpl-lf.gpl-a', legR: '.gpl-lf.gpl-b', kneeL: '.gpl-kn.is-a', kneeR: '.gpl-kn.is-b' }, e: { root: '.gpl-root', up: '.gpl-up', head: '.gpl-hd', armL: '.gpl-as.gpl-a', armR: '.gpl-as.gpl-b', legL: '.gpl-lg.gpl-a', legR: '.gpl-lg.gpl-b', kneeL: '.gpl-kn.is-a', kneeR: '.gpl-kn.is-b' } });
const _gaComp = new Map();
const _GA_PARTS = Object.freeze(['root', 'up', 'head', 'armL', 'armR', 'legL', 'legR', 'kneeL', 'kneeR']);
function _gaCompileRow(row) {
  const out = [], N = (v) => Math.round(v * 1000) / 1000, E = typeof _PC_EASE !== 'undefined' ? _PC_EASE : {};
  for (const part of _GA_PARTS) {
    const keys = row[part]; if (!keys || typeof _pcTidy !== 'function') continue;
    const T = _pcTidy(keys);
    out.push([part, T.map((k, i) => { const P = k[1], s = P.s == null ? 1 : P.s, sx = (P.sx == null ? 1 : P.sx) * s, sy = (P.sy == null ? 1 : P.sy) * s; const f = { offset: k[0], transform: `translate(${N(P.x || 0)}px,${N(P.y || 0)}px) rotate(${N(P.r || 0)}deg) scale(${N(sx)},${N(sy)})` }; if (i < T.length - 1) f.easing = E[k[2] || 'io'] || E.io || 'ease-in-out'; return f; })]);
  }
  return out;
}
function _gaCompile(id, part, tracks) { const k = id + ':' + part; let c = _gaComp.get(k); if (!c) { c = _gaCompileRow(tracks); _gaComp.set(k, c); } return c; }
/** Play an action's tracks on a drawn figure (yours or a friend's). Returns {anims, props, stop()}. */
function gartActPlay(gpl, id, o) {
  o = o || {};
  const row = GARDEN_ACTS[id], H = { anims: [], panims: [], props: [], timers: [], t0: performance.now() }; if (!row || !gpl) return H;
  const motion = o.motion == null ? _gaMotion() : o.motion, sel = _GA_SEL[row.dir === 'e' || row.dir === 'w' ? 'e' : 's'];
  const play = (phase, tracks, loop) => {
    if (!tracks) return;
    const ms = loop ? tracks.ms || 2000 : row.ms;
    for (const [part, frames] of _gaCompile(id, phase, tracks)) for (const el of gpl.querySelectorAll(sel[part])) {
      try { const a = gardenVisualAnimate(el, frames, { duration: ms, iterations: loop ? Infinity : 1, fill: loop ? 'none' : 'forwards', easing: 'linear' }); if (!motion) { a.pause(); a.currentTime = loop ? 0 : ms; } H.anims.push(a); } catch (e) { /* an old browser stands still */ }
    }
  };
  play('enter', row.enter, false);
  if (row.loop && motion) H.timers.push(setTimeout(() => { for (const a of H.anims) { try { a.cancel(); } catch (e) { /* gone */ } } H.anims.length = 0; play('loop', row.loop, true); }, row.ms));
  else if (row.loop && !motion) { /* the end pose holds */ }
  // what it holds
  const prop = row.skim ? _gaSkimProp(o.skips || 3) : row.prop && !o.noProp && GA_PROPS[row.prop];
  if (row.glow) { try { const g = typeof gardenSceneElement === 'function' && gardenVisualIsNative(gpl) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ga-prop ga-p-glow'); g.innerHTML = GA_PROPS.glow; gpl.appendChild(g); H.props.push(g); } catch (e) { /* no glow */ } }
  if (prop) {
    const root = row.propGround ? gpl : gpl.querySelector('.gpl-root') || gpl,   // (a ladder stays on the ground; a held thing moves with the body)
      g = typeof gardenSceneElement === 'function' && gardenVisualIsNative(gpl) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ga-prop ga-p-' + row.prop); g.innerHTML = prop;
    if (row.propBehind) root.insertBefore(g, root.firstChild); else root.appendChild(g);
    H.props.push(g);
    if (row.prop === 'ducks') _gaDucks(g, H, motion, row.ms);
    if (row.skim) _gaSkimFly(g, H, motion, row.ms, o.skips || 3);
    if (row.bow && motion) { const bw = g.querySelector('.ga-bow'); if (bw) H.timers.push(setTimeout(() => { try { H.panims.push(gardenVisualAnimate(bw, [{ offset: 0, transform: 'translate(4px,3px)' }, { offset: 0.5, transform: 'translate(-5px,-4px)', easing: 'ease-in-out' }, { offset: 1, transform: 'translate(4px,3px)' }], { duration: 900, iterations: Infinity, easing: 'ease-in-out' })); } catch (e) { /* the bow rests */ } }, row.ms)); }   // the bow saws along its length, with the arm
    if (row.prop === 'swimwater' && motion) { const wd = g.querySelector('.ga-wade'); if (wd) try { H.panims.push(gardenVisualAnimate(wd, [{ offset: 0, opacity: 0 }, { offset: 0.06, opacity: 1 }, { offset: 0.3, opacity: 1 }, { offset: 0.4, opacity: 0 }, { offset: 1, opacity: 0 }], { duration: row.ms, fill: 'forwards' })); } catch (e) { /* no wading ring */ } }
    if (row.prop === 'swimwater') { if (motion) { try { H.panims.push(gardenVisualAnimate(g.querySelector('.ga-swim') || g, [{ offset: 0, opacity: 0 }, { offset: 0.2, opacity: 0 }, { offset: 0.42, opacity: 1 }, { offset: 1, opacity: 1 }], { duration: row.ms, fill: 'forwards' })); } catch (e) { /* shows at once */ } } }
  }
  if (row.kick && o.leaves) _gaLeafBurst(gpl, H, motion, row.ms);
  if (row.hideBehind && o.tree && o.at) _gaBarkFront(gpl, H, o.tree, o.at);
  H.stop = () => { for (const t of H.timers) clearTimeout(t); for (const a of H.anims.concat(H.panims)) { try { a.cancel(); } catch (e) { /* gone */ } } for (const g of H.props) { try { if (g.parentNode) g.parentNode.removeChild(g); if (g.destroy) g.destroy(); } catch (e) { /* gone */ } } H.anims.length = 0; H.props.length = 0; };
  return H;
}
function _gaFace(deg) {
  if (deg == null) return;
  if (typeof _gmv !== 'undefined') { _gmv.want = deg; _gmv.h = deg; const D = _gmvDrawing(deg); _gmv.sx = D.sx; _gmv.mirror = D.mirror; _gmv.face = D.mirror; }
  if (typeof _GPL !== 'undefined') _GPL.dir = (typeof _gmvDrawing === 'function' ? _gmvDrawing(deg).dir : 's');
  if (typeof _gw !== 'undefined') { const c = Math.cos(deg * Math.PI / 180); if (Math.abs(c) > 0.3) _gw.face = c > 0 ? 1 : -1; }
}
function _gaDirDeg(row, spot) { return spot && spot.deg != null ? spot.deg : row.dir === 'n' ? -90 : row.dir === 'e' ? 0 : row.dir === 'w' ? 180 : 90; }
function gartActRun(id, spot) {
  const row = GARDEN_ACTS[id]; if (!row || typeof _gw === 'undefined' || !_gw.on || _gw.boat) return false;   // (out on the water in your boat: the oars are your only move)
  gartActStop();
  if (spot && spot.boat) {   // the boat: your own rowing boat takes you out on the Mere (the boat game); without one, say where to get one
    const go = () => { if (typeof gardenBoatAsk === 'function' && gardenBoatAsk()) { _gaFirst({ id, row }); return; } try { gardenToast('You need a rowing boat of your own. The tackle shop has one.'); } catch (e) { /* fine */ } };
    if (!gardenWalkToPoint(spot.stand, go, { radius: 1.6 })) go();
    return true;
  }
  if (_ga.carry && !row.carry) gartActSetDown();   // (you put down what you carry to do something else)
  if (row.lying && !(spot && spot.stand) && !gartActGroundClear(_gw.px, _gw.py)) { try { gardenToast('Not here. Find some grass, or the beach, to lie down on.'); } catch (e) { /* fine */ } return false; }
  if (typeof gartEmoteStop === 'function') gartEmoteStop();
  const cur = _ga.cur = { id, row, spot: spot || null, doing: false, lift: row.seat != null ? _gaSeatLift(row) : spot && spot.lift ? spot.lift : 0, t0: 0, fxT: 0, fxI: 0 };
  const start = () => { if (_ga.cur === cur) _gaStart(cur); };
  if (spot && spot.stand && !spot.seated && typeof _gwFree === 'function' && !_gwFree(spot.stand.x, spot.stand.y) && typeof _gwNearestFreePt === 'function') {   // a place you cannot stand on: the nearest place you can
    const f = _gwNearestFreePt(spot.stand.x, spot.stand.y, 2.6); if (f) { spot = Object.assign({}, spot, { stand: { x: f.x, y: f.y } }); cur.spot = spot; }
  }
  if (spot && spot.stand) {
    const W = GARDEN_WORLD, far = Math.hypot((spot.stand.x - _gw.px) * W.cellW, (spot.stand.y - _gw.py) * W.cellH);
    if (far < 14 || Math.hypot(spot.stand.x - _gw.px, spot.stand.y - _gw.py) < (spot.seated ? 1.2 : 0.8)) start();   /* (a seat's front edge is inside the bench's own footing: you step back on to it from just in front) */
    else if (!gardenWalkToPoint(spot.seated && typeof _gwFree === 'function' && !_gwFree(spot.stand.x, spot.stand.y) && typeof _gwNearestFreePt === 'function' ? (_gwNearestFreePt(spot.stand.x, spot.stand.y + 0.3, 2.6) || spot.stand) : spot.stand, (ok) => { if (ok !== false) start(); }, { radius: 1.6 })) { _ga.cur = null; try { gameDeny(null, { say: 'You cannot get there.' }); } catch (e) { /* fine */ } return false; }
  } else start();
  return true;
}
function _gaStart(cur) {
  const row = cur.row, spot = cur.spot;
  // on the spot: the feet go exactly where the thing wants them (a seat's front edge), the figure faces the right way, standing still
  if (spot && spot.stand && (row.hold || cur.lift || spot.noProp || Math.hypot(spot.stand.x - _gw.px, spot.stand.y - _gw.py) < 1.2)) { _gw.px = spot.stand.x; _gw.py = spot.stand.y; if (!cur.lift && !spot.seated && typeof _gwNearestFreePt === 'function') { const f = _gwNearestFreePt(_gw.px, _gw.py, 0.4); if (f && Math.hypot(f.x - _gw.px, f.y - _gw.py) < 0.4) { _gw.px = f.x; _gw.py = f.y; } }  /* (on its own feet: never inside what blocks walking, or the walker nudges you out and that ends it) */ if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; } }
  if (!(spot && spot.stand) && typeof _gwFree === 'function' && !_gwFree(_gw.px, _gw.py) && typeof _gwNearestFreePt === 'function') { const f = _gwNearestFreePt(_gw.px, _gw.py, 1); if (f) { _gw.px = f.x; _gw.py = f.y; if (typeof _GPL !== 'undefined') { _GPL.lastX = f.x; _GPL.lastY = f.y; } } }   // (round 4: on the spot, where the walker would nudge you anyway, so the nudge does not end it at once)
  _gw.path = []; _gw.then = null; _gw.spd = 0; _gw.moving = false;
  _gaFace(_gaDirDeg(row, spot));
  if (typeof _GPL !== 'undefined') { _GPL.pose = ''; _GPL.until = 0; }
  try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* no walker */ }
  cur.doing = true; cur.t0 = performance.now(); cur.x = _gw.px; cur.y = _gw.py;
  // the figure is redrawn for its new way round by the walker: gartActFrame plays on that drawing once it is showing
  cur.wantDir = row.dir === 'n' ? 'n' : row.dir === 'e' || row.dir === 'w' ? 'e' : 's';
  if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
  if (row.sound) { try { gardenSfx(row.sound); } catch (e) { /* no such sound: quiet */ } }
  _gaTell(cur.id, spot && spot.stand ? _gw.px : null, spot && spot.stand ? _gw.py : null);
  if (row.use && typeof gardenLiveFx === 'function' && (row.use === 'bell' || row.use === 'wish')) { try { gardenLiveFx('use', row.use, { x: Math.floor(_gw.px), y: Math.floor(_gw.py) }); } catch (e) { /* alone */ } }
  if (row.skim) _gaSkim(cur);
  if (spot && spot.src === 'water') _ga.wt++;
  if (row.shake) _gaShake(cur);
  if (row.pumpWorks && spot && spot.src) _gaPumpWorks(cur);
  if (row.kick && spot) _gaKick(cur);
  if (row.carry && spot && spot.carry) _gaPick(cur);
  if (row.fetch) _gaFetch(cur);
  if (row.prop === 'fiddle' || row.fiddle) _gaResync();
  if (row.clouds) _gaSky(cur, true);
  _gaFirst(cur);
  if (!row.hold) cur.endT = setTimeout(() => { if (_ga.cur !== cur) return; gartActStop(true); if (row.then && GARDEN_ACTS[row.then]) _gaThen(row.then, cur); }, (_gaMotion() ? row.ms : 1200) + 60);
  if (row.nap) cur.endT = setTimeout(() => { if (_ga.cur === cur) { gartActStop(true); try { gardenToast('You wake up with a stretch.'); } catch (e) { /* fine */ } } }, row.nap);
  if (_ga.el) _ga.el.hidden = true;
}
/** One action straight into the next, in the same place (up the trunk, then turn and sit on the branch). */
function _gaThen(id, prev) {
  const row = GARDEN_ACTS[id], cur = _ga.cur = { id, row, spot: prev.spot ? Object.assign({}, prev.spot, { stand: { x: _gw.px, y: _gw.py }, deg: null }) : null, doing: false, lift: row.seat != null ? _gaSeatLift(row) : 0, t0: 0, fxT: 0, fxI: 0, chained: true };
  _gaStart(cur);
}
function _gaMyFigure() {
  const n = _gw && _gw.node; if (!n) return null;
  const inner = n.querySelector('.gd-pl-in'); const body = inner && inner._nativePlayerCurrent ? inner._nativePlayerCurrent.node : inner;
  return (body && body.querySelector('.gpl')) || n.querySelector('.gpl');
}
/** Things that happen in the world while you do it (splashes, a coin's glow, drips). Runs from gartActFrame. */
function _gaTick(now) {
  const cur = _ga.cur, fx = cur.row.fx; if (!fx || !window.GardenNativeActions || !_gaMotion()) return;
  const t = now - cur.t0, W = GARDEN_WORLD, deg = _gaDirDeg(cur.row, cur.spot) * Math.PI / 180;
  const sp = fx.spot && cur.spot && Number.isFinite(cur.spot.x) ? cur.spot : null;   // (fixed to the thing used: the pump's spout)
  const at = (k) => sp ? GardenNativeActions.effect(fx.kind, (sp.x + fx.spot[0]) * W.cellW, W.sky + (sp.y + fx.spot[1]) * W.cellH + k, { width: fx.width || 24 }) : GardenNativeActions.effect(fx.kind, (_gw.px + Math.cos(deg) * 0.7) * W.cellW, W.sky + (_gw.py + Math.sin(deg) * 0.5 + (fx.dy || 0)) * W.cellH + k, { width: fx.width || 24 });
  if (fx.every) { if (t - cur.fxT > fx.every) { cur.fxT = t; at(cur.fxI++ % 3); } }
  else if (fx.at && cur.fxI < fx.at.length && t > fx.at[cur.fxI] * cur.row.ms) { at(cur.fxI); cur.fxI++; }
}
function gartActStop(done) {
  const cur = _ga.cur; if (!cur) return;
  _ga.cur = null; clearTimeout(cur.endT);
  if (cur.row.clouds) _gaSky(cur, false);
  if (cur.pump) { try { cur.pump.remove(); } catch (e) { /* gone */ } cur.pump = null; _gaShow(cur.spot.src, true); }
  if (cur.row.fetch) _ga.fetch = null;
  if (cur.row.prop === 'fiddle') setTimeout(_gaResync, 0);
  if (cur.row.rubPet) { try { const P = gpPetMe(); if (P && P.root && P.root._pcH && cur.rubH === P.root._pcH) petClipStop(P.root); } catch (e) { /* no pet */ } }
  if (cur.H && cur.H.stop) cur.H.stop();
  if (cur.row.after && done && window.GardenNativeActions && _gaMotion()) { const W = GARDEN_WORLD; for (let i = 0; i < 6; i++) setTimeout(() => { try { GardenNativeActions.effect('water', _gw.px * W.cellW, W.sky + _gw.py * W.cellH, { width: 16 }); } catch (e) { /* fine */ } }, i * 450); }
  if (cur.doing) { try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* fine */ } }
}
/** The walker moved: whatever you were doing ends (a seat, a lie-down). Walking up to the thing does not. */
function gartActMoved() { const cur = _ga.cur; if (cur && cur.doing && typeof _gw !== 'undefined' && Math.hypot(_gw.px - cur.x, _gw.py - cur.y) > 0.08) gartActStop(); }
/* ---------- the little extras ---------- */
function _gaSkim(cur) {
  const n = cur.skips || (cur.skips = 1 + Math.floor(Math.random() * 7)), W = GARDEN_WORLD, deg = _gaDirDeg(cur.row, cur.spot) * Math.PI / 180;
  for (let i = 0; i < n; i++) setTimeout(() => {
    if (!window.GardenNativeActions) return;
    const d = 1.6 + i * 1.1 - i * i * 0.04, x = _gw.px + Math.cos(deg) * d, y = _gw.py + Math.sin(deg) * d * 0.7;
    try { if (typeof gardenWaterContainsPoint === 'function' && !gardenWaterContainsPoint(x, y)) return; GardenNativeActions.effect('water', x * W.cellW, W.sky + y * W.cellH, { width: 22 - i * 2 }); } catch (e) { /* fine */ }
  }, 900 + i * (260 - i * 18));
  setTimeout(() => { try { gardenToast(n === 1 ? 'Plop. One skip.' : `${n} skips!`); } catch (e) { /* fine */ } try { const g = _gdG(); const best = Object.keys(g.disc).filter(k => k.startsWith('act.skim.')).map(k => Number(k.slice(9))).reduce((a, b) => Math.max(a, b), 0); if (n > best) { g.disc['act.skim.' + n] = _gdToday(); _gdSave(); if (best) gardenToast(`Your best yet: ${n} skips.`); } } catch (e) { /* fine */ } }, 900 + n * 240 + 300);
}
/** (round 6) What comes out of a shaken tree, as things of the world: leaves trembling round the crown's edge while you shake, more leaves
 * spinning down, and three apples that drop from the crown, bounce on the grass round your feet and lie there a while (then fade). */
function _gaShakeFall(b) {
  if (typeof gardenWorldAdd !== 'function') return;
  const W = GARDEN_WORLD, cx = (b.x0 + b.x1) / 2, cy = b.y1, t0 = performance.now(), A = typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 1;
  const apple = `<g transform="scale(${A})"><ellipse cx="0" cy="0.8" rx="3.4" ry="1.1" fill="#1a1408" opacity="0.25"/><circle cx="0" cy="-2.6" r="2.9" fill="#d8452a" stroke="#7a1e10" stroke-width="0.5"/><ellipse cx="-1" cy="-3.6" rx="0.9" ry="0.6" fill="#ffd0b0" opacity="0.8"/><path d="M0 -5.4l0.6 -1.6" stroke="#4a3018" stroke-width="0.6"/><path d="M0.6 -6.4q2 -1 2.6 0.4q-1.6 0.6 -2.6 -0.4z" fill="#5a9a3a"/></g>`;
  const leaf = (c) => `<g transform="scale(${A})"><path d="M-2.6 0Q0 -2 2.6 0Q0 2 -2.6 0z" fill="${c}" stroke="#2f5a22" stroke-width="0.3"/></g>`;
  const items = [];
  for (let i = 0; i < 3; i++) items.push({ svg: apple, x0: cx + (i - 1) * 0.55 + 0.1, from: 58 + i * 7, to: cy + 0.25 + (i % 2) * 0.22, at: 260 + i * 330, fall: 520, stay: 9000, x1: cx + (i - 1) * 0.75 + 0.2 });
  for (let i = 0; i < 9; i++) items.push({ svg: leaf(i % 3 ? '#5a8a3a' : '#8ab84a'), x0: cx + (i - 4) * 0.28, from: 50 + (i * 13) % 26, to: cy + 0.1 + (i % 4) * 0.15, at: 120 + i * 140, fall: 1500 + (i % 3) * 300, stay: 1600, x1: cx + (i - 4) * 0.4 + Math.sin(i) * 0.4, leaf: true });
  for (const it of items) {
    try {
      gardenWorldAdd({ id: 'ga-shakefall', x: it.x0, y: it.to, z: it.to, lift: it.from, ground: false, svg: it.svg,
        update(dt, Sp) {
          const t = performance.now() - t0 - it.at;
          if (t > it.fall + it.stay) { Sp.remove(); return; }
          if (t < 0) { Sp.lift = 4000; return; }   // (not yet: out of sight above)
          const k = Math.min(1, t / it.fall);
          if (it.leaf) { Sp.x = it.x0 + (it.x1 - it.x0) * k + Math.sin(t / 160) * 0.12; Sp.lift = it.from * (1 - k); }
          else { const bounce = k < 1 ? 0 : Math.max(0, Math.sin(Math.min(1, (t - it.fall) / 360) * Math.PI)) * 5 * Math.max(0, 1 - (t - it.fall) / 360); Sp.x = it.x0 + (it.x1 - it.x0) * Math.min(1, t / (it.fall + 360)); Sp.lift = it.from * (1 - k * k) + bounce; }
          if (t > it.fall + it.stay - 400 && Sp.node) Sp.node.setAttribute('opacity', String(Math.max(0, (it.fall + it.stay - t) / 400).toFixed(2)));
        } });
    } catch (e) { /* a quiet shake */ }
  }
}
const GA_SHAKE_LUCK = Object.freeze([[0.62, 'An apple thumps down into the grass.'], [0.78, 'A bee comes out, cross, and buzzes off.'], [0.9, 'A little bird\'s nest is up there. You leave it be.'], [1, 'A coin drops out of the leaves! Somebody hid it there.']]);
function _gaShake(cur) {
  const W = GARDEN_WORLD, b = cur.spot && cur.spot.tree;
  if (window.GardenNativeActions && b && _gaMotion()) for (let i = 0; i < 4; i++) setTimeout(() => { try { GardenNativeActions.effect('harvest', ((b.x0 + b.x1) / 2 + (i - 1.5) * 0.4) * W.cellW, W.sky + (b.y1 - 2.2) * W.cellH, { width: 40 }); } catch (e) { /* fine */ } }, 200 + i * 260);
  if (b && _gaMotion()) _gaShakeFall(b);
  const r = Math.random(), luck = GA_SHAKE_LUCK.find(l => r <= l[0]);
  setTimeout(() => { try { gardenToast(luck[1]); } catch (e) { /* fine */ } if (luck === GA_SHAKE_LUCK[1] && typeof gartEmoteRun === 'function') { try { gartEmoteRun('startled', { quiet: true }); } catch (e) { /* fine */ } } }, 1300);
}
/** The ducks swim in from further out (each from its own side), then dabble, tails up, where the crumbs fell. */
function _gaDucks(g, H, motion, ms) {
  // and fish: dark shapes come up under the crumbs and nose about
  g.querySelectorAll('.ga-fish').forEach((el, i) => { if (!motion) { el.setAttribute('opacity', '1'); return; } try { H.panims.push(gardenVisualAnimate(el, [{ offset: 0, opacity: 0 }, { offset: 0.2 + i * 0.08, opacity: 0 }, { offset: 0.4 + i * 0.08, opacity: 1 }, { offset: 1, opacity: 1 }], { duration: ms, fill: 'forwards' })); } catch (e) { el.setAttribute('opacity', '1'); } });
  const ducks = [...g.querySelectorAll('.ga-duck')];
  ducks.forEach((el, i) => {
    const tf = el.getAttribute('transform') || '', m = /translate\((-?[\d.]+)[ ,]+(-?[\d.]+)\)/.exec(tf), x = m ? Number(m[1]) : 0, y = m ? Number(m[2]) : 0, fx = x + (i - 1) * 70 + (i === 1 ? 30 : 0), fy = y - 60 - i * 12;
    if (!motion) return;
    try {
      H.panims.push(gardenVisualAnimate(el, [{ offset: 0, transform: `translate(${fx}px,${fy}px)`, opacity: 0 }, { offset: 0.08, transform: `translate(${fx}px,${fy}px)`, opacity: 1 }, { offset: 0.42 + i * 0.06, transform: `translate(${x}px,${y}px)`, opacity: 1, easing: 'ease-out' }, { offset: 1, transform: `translate(${x + (i - 1) * 4}px,${y + 3}px)`, opacity: 1 }], { duration: ms, fill: 'forwards', easing: 'linear' }));
      const h = el.querySelector('.ga-duck-h'); if (h) H.panims.push(gardenVisualAnimate(h, [{ offset: 0, transform: 'rotate(0deg)' }, { offset: 0.5 + i * 0.05, transform: 'rotate(0deg)' }, { offset: 0.6 + i * 0.05, transform: 'rotate(75deg)' }, { offset: 0.72 + i * 0.05, transform: 'rotate(0deg)' }, { offset: 0.84, transform: 'rotate(75deg)' }, { offset: 1, transform: 'rotate(0deg)' }], { duration: ms, fill: 'forwards' }));
    } catch (e) { /* they just sit there */ }
  });
}
/** Hiding (round 4): the trunk's own near side, solid bark drawn in front of your body from the ground to above your head, so most of
 * you is really behind it (the tree's picture fades as it always does when you are under its crown; this does not). Figure units. */
function _gaBarkFront(gpl, H, b, at) {
  const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592, W = GARDEN_WORLD, u = W.cellW / S, cx = ((b.x0 + b.x1) / 2 - at.x) * u, hw = Math.max(9, (b.x1 - b.x0) / 2 * u * 0.92), N = (v) => Math.round(v * 10) / 10;
  let g; try { g = typeof gardenSceneElement === 'function' && gardenVisualIsNative(gpl) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); } catch (e) { return; }
  const L = cx - hw, R = cx + hw;
  g.setAttribute('class', 'ga-prop ga-bark');
  g.innerHTML = `<path d="M${N(L - 3)} 6Q${N(L)} 0 ${N(L + 1)} -8L${N(L + 2)} -96L${N(R - 1)} -96L${N(R)} -8Q${N(R + 1)} 0 ${N(R + 5)} 6z" fill="#6e4e32"/>`
    + `<path d="M${N(L + 2)} -96L${N(L + 1)} -8Q${N(L)} 0 ${N(L - 3)} 6L${N(L + hw * 0.7)} 6L${N(L + hw * 0.6)} -96z" fill="#5a3e26"/>`
    + `<path d="M${N(R - 4)} -96L${N(R - 3)} -8Q${N(R - 2)} 2 ${N(R + 2)} 6" stroke="#9a7650" stroke-width="2.2" fill="none" opacity="0.8"/>`
    + `<path d="M${N(cx - hw * 0.3)} -88q-1.5 18 0.5 34M${N(cx + hw * 0.25)} -70q1.2 16 -0.5 30M${N(cx - hw * 0.1)} -36q-1 12 0.8 22" stroke="#3e2a18" stroke-width="1" fill="none" opacity="0.6"/>`
    + `<path d="M${N(cx - hw * 0.6)} -60q3 -2 5 1" stroke="#3e2a18" stroke-width="1.1" fill="none" opacity="0.5"/><ellipse cx="${N(cx)}" cy="4" rx="${N(hw + 6)}" ry="3" fill="#1a1408" opacity="0.18"/>`;
  gpl.appendChild(g); H.props.push(g);
}
/** The leaf pile bursts (round 3: big enough to see): two dozen leaves fly up and out from where it lay, in front of your feet, turn over and
 * flutter down round you; they are drawn with the figure, so they are always in front of the grass. Reduced motion: none. */
function _gaLeafBurst(gpl, H, motion, ms) {
  if (!motion) return;
  let g; try { g = typeof gardenSceneElement === 'function' && gardenVisualIsNative(gpl) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); } catch (e) { return; }
  const C = ['#c8642a', '#e0a038', '#a8441e', '#d8862e', '#b8742a', '#e8b848'], N = 26, x0 = 0, y0 = 22;
  g.setAttribute('class', 'ga-prop ga-leafburst');
  g.innerHTML = _GA_K(N, (i) => `<g class="ga-lf ga-lf-${i}" style="transform-origin:${x0}px ${y0}px" opacity="0"><ellipse cx="${x0}" cy="${y0}" rx="${3.4 + (i % 3) * 0.8}" ry="${1.8 + (i % 2) * 0.5}" fill="${C[i % C.length]}" stroke="#6a3010" stroke-width="0.35"/><path d="M${x0 - 2.6} ${y0}h5.2" stroke="#7a3a12" stroke-width="0.4" opacity="0.7"/></g>`).join('');
  gpl.appendChild(g);
  const t0 = 0.33, dur = ms * 2.6;
  setTimeout(() => { try { if (g.parentNode) g.parentNode.removeChild(g); if (g.destroy) g.destroy(); } catch (e) { /* gone */ } }, dur + 80);   // (it outlives the kick: the leaves are still coming down as you walk off)
  g.querySelectorAll('.ga-lf').forEach((el, i) => {
    const a = -Math.PI / 2 + (i / N - 0.5) * 2.6 + Math.sin(i * 7.3) * 0.25, d = 26 + (i * 37 % 40), up = 30 + (i * 53 % 36);
    const xt = Math.cos(a) * d * 1.5, yp = -up, yl = 4 + (i * 29 % 22), spin = (i % 2 ? 1 : -1) * (300 + i * 23);
    const k = (f) => t0 / 2.6 + f * (1 - t0 / 2.6);
    try { (gardenVisualAnimate(el, [{ offset: 0, opacity: 0, transform: 'translate(0px,0px) rotate(0deg)' }, { offset: k(0), opacity: 1, transform: 'translate(0px,0px) rotate(0deg)' },
      { offset: k(0.22), opacity: 1, transform: `translate(${xt * 0.6}px,${yp}px) rotate(${spin * 0.4}deg)`, easing: 'ease-out' },
      { offset: k(0.6), opacity: 1, transform: `translate(${xt * 0.85 + 6}px,${yp * 0.45}px) rotate(${spin * 0.8}deg)` },
      { offset: k(0.9), opacity: 1, transform: `translate(${xt - 4}px,${yl}px) rotate(${spin}deg) scale(1,0.6)` },
      { offset: 1, opacity: 0, transform: `translate(${xt - 4}px,${yl}px) rotate(${spin}deg) scale(1,0.6)` }], { duration: dur, fill: 'forwards', easing: 'linear' })); } catch (e) { /* no flight */ }
  });
}
/** The skimmed stone, big enough to follow: it leaves the hand, skips n times out over the water (each skip a ring that spreads), and sinks. */
function _gaSkimPts(n) { const out = []; let y = -40, x = 10; for (let i = 0; i < n; i++) { y -= 62 - i * 5; x += 6 - i * 3; out.push([x, y]); } return out; }
function _gaSkimProp(n) {
  const P = _gaSkimPts(n);
  return P.map(([x, y], i) => `<ellipse class="ga-skr ga-skr-${i}" style="transform-origin:${x}px ${y}px" cx="${x}" cy="${y}" rx="${14 - i}" ry="${4.4 - i * 0.3}" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0"/>`).join('')
    + '<g class="ga-sks" opacity="0"><ellipse cx="0" cy="0" rx="4.4" ry="2.6" fill="#8a867c" stroke="#3a3830" stroke-width="0.8"/><ellipse cx="-1" cy="-0.8" rx="2" ry="1" fill="#c8c4b8"/></g>';
}
function _gaSkimFly(g, H, motion, ms, n) {
  if (!motion) return;
  const P = _gaSkimPts(n), st = g.querySelector('.ga-sks'), t0 = 0.36, span = 0.5;
  const ts = P.map((_, i) => t0 + span * (1 - Math.pow(0.72, i + 1)) / (1 - Math.pow(0.72, n)));
  const kf = [{ offset: 0, transform: 'translate(10px,-40px)', opacity: 0 }, { offset: t0, transform: 'translate(10px,-40px)', opacity: 1 }];
  let prev = [10, -40], pt = t0;
  P.forEach(([x, y], i) => { const mid = (pt + ts[i]) / 2, h = i === 0 ? 26 : 12 / (i + 1); kf.push({ offset: mid, transform: `translate(${(prev[0] + x) / 2}px,${(prev[1] + y) / 2 - h}px) scale(${1 - i * 0.08})`, opacity: 1 }, { offset: ts[i], transform: `translate(${x}px,${y}px) scale(${1 - i * 0.09})`, opacity: 1 }); prev = [x, y]; pt = ts[i]; });
  kf.push({ offset: Math.min(0.99, pt + 0.04), transform: `translate(${prev[0]}px,${prev[1] + 2}px) scale(0.5)`, opacity: 0 }, { offset: 1, transform: `translate(${prev[0]}px,${prev[1]}px)`, opacity: 0 });
  try { H.panims.push(gardenVisualAnimate(st, kf, { duration: ms, fill: 'forwards', easing: 'linear' })); } catch (e) { /* no flight */ }
  P.forEach((_, i) => { const r = g.querySelector('.ga-skr-' + i); if (!r) return; try { H.panims.push(gardenVisualAnimate(r, [{ offset: 0, opacity: 0, transform: 'scale(0.3)' }, { offset: ts[i], opacity: 0, transform: 'scale(0.3)' }, { offset: Math.min(0.995, ts[i] + 0.01), opacity: 0.9, transform: 'scale(0.4)' }, { offset: Math.min(1, ts[i] + 0.22), opacity: 0, transform: 'scale(1.5)' }, { offset: 1, opacity: 0, transform: 'scale(1.5)' }], { duration: ms, fill: 'forwards' })); } catch (e) { /* no ring */ } });
}
/** The pump at work (round 6): while you use it, the pump is drawn as a thing of its own with the lever moving with your hand (the same
 * picture as the still one, gardenPumpArt) and the water running from the spout into the bucket; the still one is hidden meanwhile. */
const GA_PUMP_LEVER = Object.freeze([[0, 0], [0.08, 20], [0.2, -20], [0.32, 20], [0.44, -20], [0.56, 20], [0.66, -12], [0.72, 0], [1, 0]]);
function _gaPumpWorks(cur) {
  if (typeof gardenPumpArt !== 'function' || typeof gardenWorldAdd !== 'function' || typeof _gwInked !== 'function') return;
  const rec = _gaRec(cur.spot.src), W = GARDEN_WORLD; if (!rec || !rec.root) return;
  let foot = null; try { const r = (gardenIslandData().static || []).find(q => q.id === cur.spot.src); if (r) foot = { x: r.x + r.w / 2, y: r.y + r.h - 3 / W.cellH }; } catch (e) { foot = null; }
  if (!foot) return;
  const ms = cur.row.ms, lerp = (K, t) => { for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i], k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]), e = k * k * (3 - 2 * k); return a[1] + (b[1] - a[1]) * e; } return K[K.length - 1][1]; };
  let last = '';
  const art = (lv, fl) => `<ellipse cx="2" cy="1" rx="${W.cellW / 2 + 2}" ry="4" fill="#1a2a14" fill-opacity="0.2"/>` + _gwInked(0, 0, gardenPumpArt(lv, fl));
  rec.root.setAlpha(0);
  cur.pump = gardenWorldAdd({ id: 'ga-pump', x: foot.x, y: foot.y, z: foot.y, lift: 0, ground: false, svg: art(0, 0),
    update(dt, Sp) {
      if (_ga.cur !== cur) { Sp.remove(); return; }
      const t = !_gaMotion() ? 0.5 : cur.H && cur.H.t0 ? (performance.now() - cur.H.t0) / ms : 0;
      const lv = _gaMotion() ? lerp(GA_PUMP_LEVER, Math.max(0, Math.min(1, t))) : 0, fl = !_gaMotion() ? 1 : t < 0.2 ? 0 : t < 0.26 ? (t - 0.2) / 0.06 : t < 0.72 ? 1 : t < 0.82 ? (0.82 - t) / 0.1 : 0;
      const key = Math.round(lv) + '|' + Math.round(fl * 5);   // (only the lever's turn and the water's strength change: two attributes, never a redraw)
      if (key !== last && Sp.node) { last = key; try { const L = Sp.node.querySelector('.ga-lever'), F = Sp.node.querySelector('.ga-flow'); if (L) L.setAttribute('transform', `rotate(${Math.round(lv)} -8 -22)`); if (F) F.setAttribute('opacity', String(Math.round(fl * 5) / 5)); } catch (e) { /* as drawn */ } }
    } });
}
/* ---------- round 2: the things the world now has ---------- */
const _gaMoved = new Map(), _gaHide = new Map();
/** A thing of 94-garden-zz-7act-2world.js that is out of sight now (carried, or kicked away for a moment). */
function gartActHidden(id) { const t = _gaHide.get(id); return t != null && (t === Infinity || performance.now() < t); }
/** Being carried: not drawn on the ground at all. */
function gartActCarried(id) { return _gaHide.get(id) === Infinity; }
/** Where a carried thing was set down (this visit), or null. */
function gartActMovedTo(id) { return _gaMoved.get(id) || null; }
function _gaResync() { try { if (typeof GardenNative !== 'undefined' && GardenNative.sync) GardenNative.sync(); } catch (e) { /* next paint */ } }
function _gaRec(id) { try { const w = GardenNative.world(), e = w && w.entities; return e instanceof Map ? e.get('prop:' + id) : null; } catch (e) { return null; } }
function _gaShow(id, on) { const rec = _gaRec(id); if (rec && rec.root && rec.root.setAlpha) rec.root.setAlpha(on ? 1 : 0); }
/** The ball flies off the foot and rolls back to its place; the leaves burst and settle back slowly. */
function _gaKick(cur) {
  const sp = cur.spot, W = GARDEN_WORLD, id = sp.src, leaves = sp.kick === 'leaves';
  setTimeout(() => {
    if (leaves) { _gaHide.set(id, performance.now() + 20000); _gaShow(id, false); if (window.GardenNativeActions) for (let i = 0; i < 5; i++) setTimeout(() => { try { GardenNativeActions.effect(i % 2 ? 'harvest' : 'plant', (sp.x + (i - 2) * 0.3) * W.cellW, W.sky + sp.y * W.cellH, { width: 40 }); } catch (e) { /* fine */ } }, i * 90); setTimeout(() => { _gaHide.delete(id); _gaShow(id, true); }, 20000); return; }
    _gaHide.set(id, performance.now() + 4200); _gaShow(id, false);
    // the ball's flight: a native sprite of its own, from the world drawing
    try {
      const rec = _gaRec(id); if (!rec || !rec.root) return;
      const r = rec.root, x0 = r.x, y0 = r.y, dx = (Math.random() < 0.5 ? -1 : 1) * (34 + Math.random() * 26), dy = 8 + Math.random() * 12, sc = r.scene;
      r.setAlpha(1); _gaHide.set(id, performance.now() + 4200);
      if (sc && sc.tweens && _gaMotion()) {
        sc.tweens.add({ targets: r, x: x0 + dx, duration: 900, ease: 'Quad.out' });
        sc.tweens.add({ targets: r, y: { from: y0, to: y0 + dy }, duration: 900, ease: 'Bounce.out', onComplete: () => sc.tweens.add({ targets: r, x: x0, y: y0, delay: 1600, duration: 1500, ease: 'Sine.inOut', onComplete: () => _gaHide.delete(id) }) });
      } else _gaHide.delete(id);
    } catch (e) { _gaHide.delete(id); _gaShow(id, true); }
  }, 450);
}
/** Pick it up: it leaves the ground and is in your hands until you set it down (E). */
function _gaPick(cur) {
  const sp = cur.spot; _ga.carry = { id: sp.src, art: sp.art };
  setTimeout(() => { const d = _ga.down && _ga.down.get(sp.src); if (d) { try { d.remove(); } catch (e) { /* gone */ } _ga.down.delete(sp.src); } }, 380);
  setTimeout(() => { _gaHide.set(sp.src, Infinity); _gaShow(sp.src, false); _ga.list = null; }, 380);
}
const _GA_CARRY_SVG = Object.freeze({
  basket: '<g transform="translate(0 -30)"><path d="M-8 -9H8L6.2 0H-6.2z" fill="#c8924a" stroke="#6a4218" stroke-width="0.7"/><path d="M-7 -5.6H7M-6.6 -2.6H6.6" stroke="#8a5a2a" stroke-width="0.6"/><circle cx="-3" cy="-10" r="2.4" fill="#d8452a"/><circle cx="2" cy="-10.4" r="2.4" fill="#7ac24a"/></g>',
  log: '<g transform="translate(0 -32)"><path d="M-14 -1Q-15 -8 -11 -8L11 -8Q15 -8 14 -1Q0 1 -14 -1z" fill="#7a5432" stroke="#3a2818" stroke-width="0.7"/><ellipse cx="12" cy="-4.4" rx="3" ry="3.6" fill="#c8a070" stroke="#6a4a2a" stroke-width="0.6"/></g>',
});
/** Once a walker frame while carrying: the thing in both hands, arms round it (from the moves frame). */
function gartActCarryFrame(body, L) {
  const c = _ga.carry; if (!c || !body) return;
  if (!body._gaCarry || !body._gaCarry.parentNode) {
    const up = body.querySelector('.gpl-up') || body; let g;
    try { g = typeof gardenSceneElement === 'function' && gardenVisualIsNative(body) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ga-prop ga-carried'); g.innerHTML = _GA_CARRY_SVG[c.art] || _GA_CARRY_SVG.basket; up.appendChild(g); body._gaCarry = g; } catch (e) { return; }
  }
  if (L && L.armA && L.armB) { const side = L.side; _gmvSet(L.armA, side ? -50 : -20, side ? 1 : 0.8, 0, L.native); _gmvSet(L.armB, side ? -60 : 20, side ? 1 : 0.8, 0, L.native); }
}
/** Nothing is drawn in your hands unless you carry something (round 4): every .ga-carried in every drawing of you (the walker keeps one per
 * pose and way round, and puts them back), removed; run on setting down and every half second while your hands are empty. */
function _gaCarriedSweep(now) {
  const t = performance.now(); if (!now && t - (_ga.sweepT || 0) < 500) return; _ga.sweepT = t;
  if (_ga.carry && !now) return;
  const roots = new Set(); try { if (_gw.node) roots.add(_gw.node); const inner = _gw.node && _gw.node.querySelector('.gd-pl-in'); if (inner) { roots.add(inner); const C = inner._nativePlayerBodies; if (C) for (const v of (C instanceof Map ? C.values() : Object.values(C))) { const n = v && (v.node || v); if (n && n.querySelectorAll) roots.add(n); } if (inner._nativePlayerCurrent && inner._nativePlayerCurrent.node) roots.add(inner._nativePlayerCurrent.node); } } catch (e) { /* what is there */ }
  for (const r of roots) { let list = []; try { list = [...r.querySelectorAll('.ga-carried')]; } catch (e) { list = []; } for (const n of list) { try { if (n.parentNode) n.parentNode.removeChild(n); if (n.destroy) n.destroy(); } catch (e) { /* gone */ } } try { if (r._gaCarry) r._gaCarry = null; } catch (e) { /* fine */ } }
  try { for (const b of (_gw.node ? _gw.node.querySelectorAll('.gpl') : [])) if (b.parentNode && b.parentNode._gaCarry) b.parentNode._gaCarry = null; } catch (e) { /* fine */ }
}
/** A thing you set down: drawn at its new place as a sprite of the world (sorted by its foot like everything else), with the same picture. */
function _gaSetDownDraw(id, x, y) {
  if (typeof gardenWorldAdd !== 'function' || typeof _GAW_ART === 'undefined') return;
  const row = GARDEN_ACT_WORLD.find(r => r.id === id); if (!row || !_GAW_ART[row.art]) return;
  _ga.down = _ga.down || new Map();
  const old = _ga.down.get(id); if (old) { try { old.remove(); } catch (e) { /* gone */ } }
  try { _ga.down.set(id, gardenWorldAdd({ id: 'ga-down-' + id, x, y, z: y, lift: 0, ground: false, svg: _GAW_ART[row.art]({}, false, row), update(dt, Sp) { if (!_ga.down || _ga.down.get(id) !== Sp) Sp.remove(); } })); } catch (e) { /* drawn on the next paint */ }
}
/** E while carrying: set it down at your feet, just in front. It stays there for this visit. */
function gartActSetDown() {
  const c = _ga.carry; if (!c) return false;
  _ga.carry = null;
  const W = GARDEN_WORLD, deg = (typeof gartMoveFacingDeg === 'function' ? gartMoveFacingDeg() : 90) * Math.PI / 180, x0 = _gw.px + Math.cos(deg) * 0.5, y0 = _gw.py + Math.sin(deg) * 0.35 + 0.05, clear = typeof _gwFree !== 'function' || _gwFree(x0, y0, 0.15), x = clear ? x0 : _gw.px, y = clear ? y0 : _gw.py + 0.08;   // (never into a post or a wall: at your feet then)
  _gaMoved.set(c.id, { x, y }); _gaHide.delete(c.id);
  // (round 6) where you set it down it is a thing of the world of its own, at its new place with its contact shadow (the still picture stays
  // hidden: moving the world's own record left it drawn nowhere), until you pick it up again
  _gaShow(c.id, false); _gaSetDownDraw(c.id, x, y);
  _gaCarriedSweep(true);
  try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* fine */ }
  try { if (window.GardenNativeActions) GardenNativeActions.effect('place', x * W.cellW, W.sky + y * W.cellH, { width: 24 }); } catch (e) { /* fine */ }
  _ga.list = null; return true;
}
/** Throw a stick (round 4): it flies out in front and lies in the grass; your pet waits for it to land, runs for it, picks it up (the stick
 * is then in its mouth) and trots back to drop it at your feet; the throw lasts until it is back (or 14 s for a pet that will not fetch). */
const GA_STICK_LAND = 0.76;   // when the stick lands, a share of the throw (the stickfly prop's flight)
function _gaFetch(cur) {
  const deg = _gaDirDeg(cur.row, cur.spot) * Math.PI / 180, x = _gw.px + Math.cos(deg) * 1.1 + 1.5, y = _gw.py + Math.sin(deg) * 0.6 + 0.1;   // (round 5: a shorter throw, so you see it land, picked up and brought back)   // (round 4: out to one side in front, near enough to see it land, fetched and brought back)
  _ga.fetch = { x, y, phase: 'wait', t0: performance.now(), cur };
  setTimeout(() => { if (_ga.cur === cur) gartActStop(true); }, 14000);   // a pet that will not fetch: the throw still ends
}
const _GA_MOUTH_STICK = '<g class="ga-mstick"><path d="M-11 0.6L11 -0.6" stroke="#5a3a1e" stroke-width="2.6" stroke-linecap="round"/><path d="M-11 0.6L11 -0.6" stroke="#9a7044" stroke-width="1.1" stroke-linecap="round"/><path d="M5 -0.4l3 -3.4" stroke="#7a5432" stroke-width="1.1" stroke-linecap="round"/></g>';
/** The stick in the pet's mouth on the way back: drawn with your figure, at the pet's head (figure units: world px / GW_SCALE). */
function _gaFetchDraw() {
  const f = _ga.fetch, cur = f && f.cur; if (!f || !cur || !cur.H) return;
  const gpl = _gaMyFigure(); if (!gpl) return;
  if (!f.mouth || !f.mouth.parentNode) {   // one stick, drawn with your figure: in your hand, flying, in the grass, in the pet's mouth
    try { const g = typeof gardenSceneElement === 'function' && gardenVisualIsNative(gpl) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ga-prop ga-p-mouth'); g.innerHTML = _GA_MOUTH_STICK; gpl.appendChild(g); f.mouth = g; cur.H.props.push(g); f.flip = _gaFigureFlip(gpl); if (!f.playT) f.playT = performance.now(); } catch (e) { return; }
  }
  const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592, W = GARDEN_WORLD, flip = f.flip || 1, ms = cur.row.ms, t = (performance.now() - f.playT) / ms;
  const U = (wx, wy) => [(wx - _gw.px) * W.cellW / S * flip, (wy - _gw.py) * W.cellH / S];   // cells -> the figure's units
  let x, y, r = 0;
  // (round 5) once it leaves your hand the stick is a thing of the world, not of your figure: drawn with the figure it was cut off by the
  // figure's own frame, so it vanished in the air and was never seen in the grass. Flying and lying, it is its own sprite; in your hand and in the pet's mouth, part of you.
  const loose = (f.phase === 'wait' || f.phase === 'out') && (!_gaMotion() || t >= 0.32);
  if (loose && !f.spr && typeof gardenWorldAdd === 'function') {
    const A = typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 1;
    try {
      f.spr = gardenWorldAdd({ id: 'ga-stick', x: f.x, y: f.y, z: f.y, lift: 0, ground: false, svg: `<g transform="scale(${A})">${_GA_MOUTH_STICK}</g>`,
        update(dt, Sp) {
          if (_ga.fetch !== f || f.phase === 'back' || f.phase === 'home') { f.spr = null; Sp.remove(); return; }
          const tt = (performance.now() - f.playT) / ms, R0 = 0.32, k = !_gaMotion() ? 1 : Math.max(0, Math.min(1, (tt - R0) / (GA_STICK_LAND - R0)));
          const hx = _gw.px + 8 * S / W.cellW * flip, hy = _gw.py + 0.02;
          Sp.x = hx + (f.x - hx) * k; Sp.y = hy + (f.y - hy) * k; Sp.z = Sp.y + 0.02;
          Sp.lift = k >= 1 ? 1 : (72 * S) * (1 - k) + 90 * S * Math.sin(Math.PI * k);
        } });
    } catch (e) { f.spr = null; }
  }
  try { f.mouth.setAttribute('opacity', (loose && f.spr) || f.phase === 'home' ? '0' : '1'); } catch (e) { /* fine */ }
  if (f.phase === 'back' || f.phase === 'home') {
    let P = null; try { P = gpPetMe(); } catch (e) { P = null; } if (!P) return;
    const face = (P.visualFace != null ? P.visualFace : P.dir) < 0 ? -1 : 1, sat = f.phase === 'home', q = U(P.x, P.y);
    x = q[0] + face * (sat ? 4 : 7) * flip; y = q[1] - (sat ? 22 : 15);
  } else {
    const R = 0.32, L = GA_STICK_LAND, hand = [8, -72], land = U(f.x, f.y);
    if (!_gaMotion() || t >= L) { x = land[0]; y = land[1] - 1.5; r = 8; }
    else if (t < R) { const k = t / R; x = hand[0] + 10 + 4 * Math.sin(k * Math.PI / 2); y = hand[1] + 26 - 22 * k; r = -30 - 50 * k; }   // (back over the shoulder as the arm winds up)
    else { const k = (t - R) / (L - R); x = hand[0] + (land[0] - hand[0]) * k; y = hand[1] + (land[1] - hand[1]) * k - 90 * Math.sin(Math.PI * k); r = -100 + 760 * k; }
  }
  try { f.mouth.setAttribute('transform', `translate(${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}) rotate(${Math.round(r)})`); } catch (e) { /* gone */ }
}
/** The stick the pet brought back, lying in the grass at your feet (a thing of the world, with a shadow) until you throw it again or for 20 s. */
function _gaStickDropped(x, y) {
  if (typeof gardenWorldAdd !== 'function') return;
  try { if (_ga.stickDown) _ga.stickDown.remove(); } catch (e) { /* gone */ }
  const A = typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 1, t0 = performance.now();
  try { _ga.stickDown = gardenWorldAdd({ id: 'ga-stick-down', x, y, z: y, lift: 0, ground: false, svg: `<g transform="scale(${A})"><ellipse cx="0" cy="1.4" rx="12" ry="1.8" fill="#1a1408" opacity="0.22"/><g transform="translate(0 -0.6) rotate(-6)">${_GA_MOUTH_STICK}</g></g>`, update(dt, Sp) { if (_ga.stickDown !== Sp || performance.now() - t0 > 20000 || (_ga.fetch && _ga.fetch.phase !== 'home')) { if (_ga.stickDown === Sp) _ga.stickDown = null; Sp.remove(); } } }); } catch (e) { /* no stick */ }
}
function _gaFetchGoal(P) {
  const f = _ga.fetch; if (!f || !P || !P.me) return null;
  if (f.phase === 'wait') { if (f.playT && performance.now() > f.playT + (_gaMotion() ? f.cur.row.ms * GA_STICK_LAND : 0)) { f.phase = 'out'; try { if (window.GardenNativeActions) GardenNativeActions.effect('lift', f.x * GARDEN_WORLD.cellW, GARDEN_WORLD.sky + f.y * GARDEN_WORLD.cellH, { width: 18 }); } catch (e) { /* fine */ } } return { x: P.x, y: P.y, near: 10 }; }
  if (f.phase === 'out') {
    if (Math.hypot(P.x - f.x, P.y - f.y) < 0.22) {   // got it: off the grass and into its mouth
      f.phase = 'back';
      try { gardenToast('Got it!'); } catch (e) { /* fine */ }
    }
    return { x: f.x, y: f.y, near: 0.08, run: true };
  }
  if (f.phase === 'back' && Math.hypot(P.x - (_gw.px + 0.5), (P.y - (_gw.py + 0.22)) * 1.3) < 0.2) {   // at your feet: it drops the stick and sits, pleased with itself
    f.phase = 'home'; const cur = f.cur;
    _gaStickDropped(_gw.px + 0.3, _gw.py + 0.12);   // (round 6: dropped on the grass at your feet, and it stays there a while)
    try { if (P.root && typeof petClipRun === 'function' && typeof petClipDef === 'function' && petClipDef('petted')) petClipRun(P.root, 'petted'); } catch (e) { /* it just sits */ }
    try { gardenToast('Good fetch!'); } catch (e) { /* fine */ }
    setTimeout(() => { if (_ga.fetch === f) _ga.fetch = null; if (_ga.cur === cur) gartActStop(true); }, 1400);
  }
  if (f.phase === 'home') return null;
  return { x: _gw.px + 0.5, y: _gw.py + 0.22, near: 0.08, run: true };   // (round 6: right up to your feet, a step off them)
}
/** Is the figure drawn mirrored (its x axis runs right to left on screen)? -1 then, else 1. */
function _gaFigureFlip(gpl) {
  try { let n = gpl; for (let i = 0; i < 6 && n; i++, n = n.parentNode) { const t = n.getAttribute && n.getAttribute('transform'); if (t && /scale\(\s*-1/.test(t)) return -1; } } catch (e) { /* as drawn */ }
  return 1;
}
/** Belly rubs: once your pet is at your hand, it rolls on to its back and kicks its legs (the pets' own clip l-belly, from feat/pets-life;
 * on a branch without it, the same clip is added here the first time, so the two never differ), again and again while you rub. */
function _gaBellyClip() {
  try {
    if (typeof petClipDef !== 'function') return null;
    if (petClipDef('ga-belly')) return 'ga-belly';
    if (typeof _pcR !== 'function' || typeof _pcSw !== 'function') return petClipDef('l-belly') ? 'l-belly' : null;
    // (round 6) rolled on to its back for real: the whole body flipped top to bottom about the line that lays its spine on the grass (org 'back'),
    // so the back is on the ground, the tummy up and all four paws in the air, kicking; the head turned the right way up again at the neck end,
    // looking at you. A little wriggle side to side on its back; it rolls back up only at the very end.
    const B = (r) => ({ sy: -1, r: r || 0 }), HB = { sy: -1 };
    _pcR('ga-belly', 6000, 'walk', { nl: 1, still: 0.5, not: { ids: ['snail', 'cloud', 'wisp', 'ghost', 'tortoise', 'crab'] }, face: _F_HAPPY, org: 'back',
      body: [[0.04, { y: 1, sy: 0.9, sx: 1.06 }, 'io'], [0.1, { sy: 0.05, sx: 1.08 }, 'i'], [0.15, B(), 'o'], ...Array.from({ length: 10 }, (_, i) => [0.2 + i * 0.065, B(i % 2 ? 3 : -3), 'io']), [0.88, B(), 'io'], [0.93, { sy: 0.05, sx: 1.08 }, 'i'], [0.98, {}, 'o'], [1, {}]],
      head: [[0.1, {}, 'i'], [0.15, HB, 'o'], [0.4, HB], [0.47, { sy: -1, r: 10 }, 'io'], [0.6, { sy: -1, r: 10 }], [0.67, HB, 'io'], [0.88, HB, 'io'], [0.93, {}, 'i'], [1, {}]],
      paw: _pcSw(0.16, 0.87, 16, { r: -38 }, { r: 8 }, 'io'), legsF: _pcSw(0.17, 0.87, 16, { r: 8 }, { r: -38 }, 'io'), legsN: _pcSw(0.16, 0.87, 14, { r: 30 }, { r: -6 }, 'io'), legsG: _pcSw(0.17, 0.87, 14, { r: -6 }, { r: 30 }, 'io'), tail: _pcSw(0.15, 0.88, 10, { r: 20 }, { r: -20 }), fx: [[0.3, 'heart', { at: 'top', n: 4, gap: 600, dur: 900 }]] });
    return petClipDef('ga-belly') ? 'ga-belly' : (petClipDef('l-belly') ? 'l-belly' : null);
  } catch (e) { return null; }
}
/** Where the pet lies for a belly rub (cells from your feet): beside your knee, in front of your hand, a touch behind you so your hand is over its tummy. */
const GA_RUB_AT = [0.4, -0.04];   // (round 6: right under the reaching hand, the tummy beneath the palm)
function _gaRubTick(cur) {
  let P = null; try { P = typeof gpPetMe === 'function' ? gpPetMe() : null; } catch (e) { P = null; }
  if (!P || !P.root || (P.root._pcH && P.root._pcH === cur.rubH) || (cur.rubT && performance.now() - cur.rubT < 6100)) return;
  if (Math.hypot(P.x - (_gw.px + GA_RUB_AT[0]), (P.y - (_gw.py + GA_RUB_AT[1])) * 1.4) > 0.22) return;   // (still on its way)
  if (P.root._pcH && typeof petClipStop === 'function') petClipStop(P.root);   // (whatever it was doing: it rolls over for you)
  const id = _gaBellyClip() || 'rollover'; P.dir = -1; P.tx = null; cur.rubT = performance.now();
  P.lifeGoal = false;
  try { if (typeof P.clip === 'function') P.clip(id); else petClipRun(P.root, id); cur.rubH = P.root && P.root._pcH; } catch (e) { /* it just sits */ }   // (the pets' own runner: it draws the pose the clip needs, holds the pet still for it, and friends see it)
}
/* (2, 3) lying: cloud shadows go over; at night now and then a shooting star; a nap lets the light run on a little faster for a moment */
function _gaSky(cur, on) {
  const box = _gw && _gw.box; if (!box) return;
  let el = box.querySelector('.ga-sky');
  if (!on) { if (el) el.remove(); clearInterval(_ga.skyT); return; }
  if (!_gaMotion()) return;
  if (!el) { el = document.createElement('div'); el.className = 'ga-sky'; el.setAttribute('aria-hidden', 'true'); box.appendChild(el); }
  let tod = 'day'; try { tod = gardenModel().tod; } catch (e) { /* day */ }
  const night = tod === 'night';
  el.innerHTML = (night ? '' : '<i class="ga-cloud c1"></i><i class="ga-cloud c2"></i><i class="ga-cloud c3"></i>') + (cur.row.nap ? '<i class="ga-lapse"></i>' : '');
  if (cur.row.nap) el.classList.add('is-nap'); else el.classList.remove('is-nap');
  clearInterval(_ga.skyT);
  if (night) {
    let seen = 0;
    const star = () => { const s = document.createElement('i'); s.className = 'ga-star'; s.style.left = (15 + Math.random() * 60) + '%'; s.style.top = (6 + Math.random() * 24) + '%'; el.appendChild(s); setTimeout(() => s.remove(), 1600); if (!seen++) { try { gardenToast('A shooting star! Make a wish.'); } catch (e) { /* fine */ } try { const g = _gdG(); if (!g.disc['act.star']) { g.disc['act.star'] = _gdToday(); _gdSave(); } } catch (e) { /* fine */ } } };
    setTimeout(star, 1800); _ga.skyT = setInterval(star, 6000);
  }
  if (cur.row.nap) setTimeout(() => { try { gardenToast('The shadows move round while you doze.'); } catch (e) { /* fine */ } }, 1800);
}
/** Lying down needs clear ground: grass, sand or snow, not a path, a plaza, a building's apron or a thing. */
function gartActGroundClear(x, y) {
  try {
    for (const [dx, dy] of [[0, 0], [-0.6, 0], [0.6, 0], [-1.1, 0], [1.1, 0]]) {
      const c = gardenIslandBaseCell(x + dx, y + dy); if (!c || !c.land || c.ocean || c.freshwater || c.solid || c.route || c.reservation || c.staticId || c.district === 'garden-core') return false;   /* (your own beds: soil, not somewhere to lie) */
    }
    for (const p of (gardenIslandData().presentation || {}).plazas || []) if (p.rx && ((x - p.x) / (p.rx + 0.6)) ** 2 + ((y - p.y) / ((p.ry || p.rx) + 0.6)) ** 2 < 1) return false;
    const near = (_ga.list || []).some(r => Math.hypot(r.x - x, (r.y - y) * 1.3) < 1.4); if (near) return false;
    // never under a tree's crown (a tree just south of you is drawn over you): open sky, so you are seen and can see the clouds
    let T = _ga.trunks; if (!T || !T.length) { try { T = _ga.trunks = typeof _gwPaintedTrunks === 'function' ? _gwPaintedTrunks(gardenIslandData()) : []; } catch (e) { T = []; } }
    for (const b of T || []) { const fx = (b.x0 + b.x1) / 2, dy = b.y1 - y; if (dy > -0.3 && dy < 5.5 && Math.abs(fx - x) < 2.8) return false; }
    // nor across a shrub or any planted thing that stands up (they are drawn over whoever lies by them): world px -> cells
    try { const W = GARDEN_WORLD, tall = window.GardenNativePainted && GardenNativePainted.tall ? GardenNativePainted.tall() : []; for (const t of tall) { const tx = t.x / W.cellW, ty = (t.y - W.sky) / W.cellH, hw = (t.w || 30) / 2 / W.cellW; if (Math.abs(tx - x) < hw + 1.3 && ty - y > -0.5 && ty - y < Math.max(0.6, t.h / W.cellH)) return false; } } catch (e) { /* no planting list: the trunks are enough */ }
  } catch (e) { return true; }
  return true;
}
/** The first time: a line in your journal and a toast. */
function _gaFirst(cur) {
  const line = cur.row.first; if (!line) return;
  try {
    const g = _gdG(); if (g.disc['act.' + cur.id]) return;
    g.disc['act.' + cur.id] = _gdToday(); _gdSave();
    gardenToast('New in your journal: ' + line);
  } catch (e) { /* not ready */ }
}
/** The things you have done, for the journal: [{id, line, day}]. */
function gartActDiary() { try { const g = _gdG(); return Object.keys(GARDEN_ACTS).filter(id => g.disc['act.' + id] && GARDEN_ACTS[id].first).map(id => ({ id, line: GARDEN_ACTS[id].first, day: g.disc['act.' + id] })); } catch (e) { return []; } }
/* ---------- friends: what they see you do (and you see them) ---------- */
/** One gl:em when it starts: the action's id, and where (a seat, a ladder) so their copy of you walks there first and does it in the same place. */
function _gaTell(id, x, y) {
  const body = { c: 'em', e: GA_WIRE + id };
  if (x != null && Number.isFinite(x) && Number.isFinite(y)) { body.x = Math.round(x * 100) / 100; body.y = Math.round(y * 100) / 100; }
  try {
    if (typeof _gll === 'undefined') return;
    if (_gll.role === 'visit') { if (typeof _glvLive === 'function' && _glvLive()) _glvSend('em', body); }
    else if (typeof _glh !== 'undefined' && _glh.on && typeof _glhAnyone === 'function' && _glhAnyone()) _glhSend('all', 'em', body);
  } catch (e) { /* alone */ }
}
function gartActRemote(A, id) {
  const row = GARDEN_ACTS[id]; if (!row || !A || !A.root) return false;
  if (typeof _gllEmoteStop === 'function') _gllEmoteStop(A);
  A.dir = row.dir === 'n' ? 'n' : row.dir === 'e' || row.dir === 'w' ? 'e' : 's'; A.pose = ''; A.key = '';
  if (typeof _gllPaint === 'function') _gllPaint(A);
  const gpl = A.root.querySelector('.gpl'); if (!gpl) return false;
  const H = gartActPlay(gpl, id, { motion: typeof _gllReduced === 'function' ? !_gllReduced() : true });
  // on a seat (or over the pier's edge) their figure is lifted as yours is: the same spot, found from where they are
  let lift = row.seat != null ? _gaSeatLift(row) : 0; if (!lift) try { const near = _gaStaticRows().concat(_gaDecorRows()).filter(r => r.act === id && r.stand && Math.hypot(r.stand.x - A.x, r.stand.y - A.y) < 0.6)[0]; lift = near ? near.lift || 0 : 0; } catch (e) { lift = 0; }
  if (lift && A.bob) { const bt = `translate(0 ${-lift})`; A.actLift = lift; A.bob.setAttribute('transform', bt); A.bobT = bt; const undo = H.stop; H.stop = () => { undo(); A.actLift = 0; if (A.bob && A.bobT === bt) { A.bob.setAttribute('transform', ''); A.bobT = ''; } }; }
  const tag = A.root.querySelector('.gll-name');
  if (tag && (row.lying || lift)) { const y0 = tag.getAttribute('y'), y1 = row.lying ? String(Math.round(-26 * GARDEN_ACTOR_SCALE)) : String(Number(y0) - lift); tag.setAttribute('y', y1); const undo = H.stop; H.stop = () => { undo(); if (tag.getAttribute('y') === y1) tag.setAttribute('y', y0); }; }
  A.actHold = row.hold ? id : ''; { const undo = H.stop; H.stop = () => { A.actHold = ''; undo(); }; }
  A.anims = H.anims.concat(H.panims); A.actUndo = H.stop; A.sit = !!row.hold; A.hold = '';
  if (!row.hold) A.animT = setTimeout(() => { if (typeof _gllEmoteStop === 'function') _gllEmoteStop(A); }, row.ms + 60);
  return true;
}
/* ---------- the pet comes and joins in ---------- */
if (typeof gardenLifePetGoal === 'function') {
  const _gaPetGoal0 = gardenLifePetGoal;
  gardenLifePetGoal = function (P, dt) {   // eslint-disable-line no-func-assign
    const fg = _gaFetchGoal(P); if (fg) return fg;
    const cur = _ga.cur;
    if (cur && cur.doing && cur.row.rubPet && P && P.me) { if (P.root && P.root._pcH) return null; return { x: _gw.px + GA_RUB_AT[0], y: _gw.py + GA_RUB_AT[1], near: 0.08 }; }   // (on its back: no goal, so the pets' own clip runs its course; _gaRubTick clears lifeGoal first so nothing sits it up)   // (right in front of your hand: _gaRubTick rolls it over)
    if (cur && cur.doing && P && P.me && !cur.row.fetch) {   // (every action: the pet waits beside you on open ground)
      // beside you on open ground, never up on a thing (a pump, a bench, a wall): the walker's own map says what is solid
      const ok = (x, y) => (typeof _ptwFree !== 'function' || _ptwFree(x, y)) && (typeof _gwFree !== 'function' || _gwFree(x, y, 0.2)) && !(_ga.list || []).some(r => r.act !== 'sit' && Math.hypot(r.x - x, (r.y - y) * 1.3) < 0.7);
      for (const [dx, dy] of [[1, 0.2], [-1, 0.2], [0.9, 0.7], [-0.9, 0.7], [0, 1], [1.4, 0.3], [-1.4, 0.3]]) if (ok(_gw.px + dx, _gw.py + dy)) return { x: _gw.px + dx, y: _gw.py + dy, near: 10 };
    }
    return _gaPetGoal0(P, dt);
  };
}
/* ---------- the moves wheel: the ground actions are on it too ---------- */
const GART_ACT_WHEEL = Object.freeze({ lie: { name: 'Lie down', icon: 'cloud' }, nap: { name: 'Nap', icon: 'moon' }, throwstick: { name: 'Throw a stick', icon: 'paw-print', pet: true }, rub: { name: 'Belly rub', icon: 'heart', pet: true }, laugh: { name: 'Laugh', icon: 'smile' }, angel: { name: 'Snow angel', icon: 'snowflake', winter: true } });
/** A click on a fixed thing with no door: do its first action (a bench: sit on it). */
function gartActForProp(p) {
  if (!p || p.act || !GARDEN_ACT_BY_PROP[p.id]) return false;
  const spot = _gaStaticRows().find(r => r.src === p.id); return !!spot && gartActRun(spot.act, spot);
}

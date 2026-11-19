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
const _ga = { cur: null, el: null, near: null, t: 0, list: null, listT: 0, trunkSig: '', trunks: [] };
const GA_REACH = 2.2;   // cells: how near a thing must be for its prompt
const GA_WIRE = 'act-';
function _gaMotion() { try { return typeof _gartMotionOk === 'function' ? _gartMotionOk() : gardenMotionOn(); } catch (e) { return true; } }
function gartActBusy() { return !!(_ga.cur && _ga.cur.doing); }
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
    if (drawn && drawn.size && !rec) continue;   // not drawn here (not built yet, or another painter's): nothing invisible can be used
    const b = rec && rec.bounds, fx = b && b.width ? (b.x + b.width / 2) / W.cellW : r.x + r.w / 2, fy = b && b.height ? (b.y + b.height - W.sky) / W.cellH : r.y + r.h;
    for (const o of opts) out.push({ key: r.id + ':' + o.act, act: o.act, name: o.name, x: fx, y: fy, stand: { x: fx + o.stand[0], y: fy + o.stand[1] }, deg: o.deg, lift: o.lift || 0, src: r.id });
  }
  return out;
}
function _gaDecorRows() {
  const out = []; let m; try { m = gardenHere(); } catch (e) { return out; }
  for (const d of (m && m.decor) || []) {
    const k = d.def && d.def.effect && d.def.effect.kind, opts = k && GARDEN_ACT_BY_DECOR[k]; if (!opts) continue;
    const w = d.def.w || 1, h = d.def.h || 1, fx = d.x + w / 2, fy = d.y + h;
    for (const o of opts) out.push({ key: d.uid + ':' + o.act, act: o.act, name: (d.def.name ? 'the ' + String(d.def.name).toLowerCase() : o.name), x: fx, y: fy, stand: { x: fx + o.stand[0], y: fy + o.stand[1] }, deg: o.deg, lift: o.lift || 0, src: d.uid });
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
    for (const o of GARDEN_ACT_BY_TREE[b.src] || []) { if (o.big && b.x1 - b.x0 < o.big) continue; out.push({ key: 'tree:' + fx.toFixed(1) + ',' + fy.toFixed(1) + ':' + o.act, act: o.act, name: o.name, x: fx, y: fy, stand: { x: fx + o.stand[0], y: fy + o.stand[1] }, deg: o.deg, lift: 0, src: 'tree', tree: b }); }
  }
  return out;
}
function _gaWaterRows(px, py) {
  if (typeof gardenWaterContainsPoint !== 'function') return [];
  const wet = (x, y) => { try { return gardenWaterContainsPoint(x, y); } catch (e) { return false; } };
  if (wet(px, py)) return [];
  for (const [dx, dy, deg] of [[0, -1.1, -90], [0, 1.1, 90], [1.1, 0, 0], [-1.1, 0, 180], [0, -1.8, -90], [0, 1.8, 90]]) if (wet(px + dx, py + dy)) return GARDEN_ACT_WATER.map(o => ({ key: 'water:' + o.act, act: o.act, name: o.name, x: px + dx, y: py + dy, stand: null, deg, lift: 0, src: 'water' }));
  return [];
}
/** Everything in reach, the nearest first (things with a place before the water's edge). */
function gartActNearby() {
  if (typeof _gw === 'undefined' || !_gw.on) return [];
  const now = performance.now();
  if (!_ga.list || now - _ga.listT > 2500) { _ga.list = _gaStaticRows().concat(_gaDecorRows()); _ga.listT = now; }
  const px = _gw.px, py = _gw.py, d = (r) => Math.hypot(r.x - px, (r.y - py) * 1.3);
  const rows = _ga.list.concat(_gaTreeRows(px, py)).filter(r => d(r) <= GA_REACH);
  rows.sort((a, b) => d(a) - d(b));
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
function _gaWords(r) { const row = GARDEN_ACTS[r.act]; if (!row) return ''; const v = row.verb; return /the |it$|a |under/.test(v) || !r.name ? v : r.act === 'sit' ? 'Sit on ' + r.name : v; }
/** Once a frame from the walker (cheap: looks round five times a second). */
function gartActFrame() {
  if (typeof _gw === 'undefined' || !_gw.on) return;
  const now = performance.now();
  if (_ga.cur && _ga.cur.doing) {
    const cur = _ga.cur;
    if (!cur.H) { const inner = _gw.node && _gw.node.querySelector('.gd-pl-in'), k = (inner && inner._gplKey) || ''; if (k.startsWith('idle' + cur.wantDir) || now - cur.t0 > 600) { const gpl = _gaMyFigure(); if (gpl) cur.H = gartActPlay(gpl, cur.id); } }
    _gaTick(now);
  }
  if (now - _ga.t < 200) { if (_ga.near && _ga.el && !_ga.el.hidden) _gaPlace(); return; }
  _ga.t = now;
  const el = _gaPromptEl(); if (!el) return;
  const busy = (_ga.cur && _ga.cur.doing) || (typeof _gwFishBusy === 'function' && _gwFishBusy()) || (typeof gardenDesignOn === 'function' && gardenDesignOn()) || (typeof GardenNative !== 'undefined' && GardenNative.inRoom && GardenNative.inRoom());
  const near = busy ? null : gartActNearby()[0] || null;
  if (!near) { _ga.near = null; el.hidden = true; return; }
  if (!_ga.near || _ga.near.key !== near.key) { _ga.near = near; el.innerHTML = `<kbd>E</kbd><span>${esc(_gaWords(near))}</span>`; el.setAttribute('aria-label', _gaWords(near) + ' (E)'); }
  el.hidden = false; _gaPlace();
}
function _gaPlace() {
  const r = _ga.near, el = _ga.el; if (!r || !el) return;
  const s = typeof _ghProject === 'function' ? _ghProject(r.x, r.y - 1.9) : null; if (!s) return;
  el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
}
/** E or Space: the prompt's action, if one is showing. Returns true when it did something. */
function gartActInteract() {
  if (_ga.cur && _ga.cur.doing) { gartActStop(); return true; }
  if (!_ga.near || !_ga.el || _ga.el.hidden) return false;
  return gartActRun(_ga.near.act, _ga.near);
}
/* ---------- doing it ---------- */
const _GA_SEL = Object.freeze({ s: { root: '.gpl-root', up: '.gpl-up', head: '.gpl-hd', armL: '.gpl-af.gpl-b', armR: '.gpl-af.is-r', legL: '.gpl-lf.gpl-a', legR: '.gpl-lf.gpl-b' }, e: { root: '.gpl-root', up: '.gpl-up', head: '.gpl-hd', armL: '.gpl-as.gpl-a', armR: '.gpl-as.gpl-b', legL: '.gpl-lg.gpl-a', legR: '.gpl-lg.gpl-b' } });
const _gaComp = new Map();
function _gaCompile(id, part, tracks) { const k = id + ':' + part; let c = _gaComp.get(k); if (!c) { c = typeof _peCompile === 'function' ? _peCompile(tracks) : []; _gaComp.set(k, c); } return c; }
/** Play an action's tracks on a drawn figure (yours or a friend's). Returns {anims, props, stop()}. */
function gartActPlay(gpl, id, o) {
  o = o || {};
  const row = GARDEN_ACTS[id], H = { anims: [], props: [], timers: [] }; if (!row || !gpl) return H;
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
  const prop = row.prop && GA_PROPS[row.prop];
  if (prop) {
    const root = row.propGround ? gpl : gpl.querySelector('.gpl-root') || gpl,   // (a ladder stays on the ground; a held thing moves with the body)
      g = typeof gardenSceneElement === 'function' && gardenVisualIsNative(gpl) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ga-prop ga-p-' + row.prop); g.innerHTML = prop;
    if (row.propBehind) root.insertBefore(g, root.firstChild); else root.appendChild(g);
    H.props.push(g);
  }
  H.stop = () => { for (const t of H.timers) clearTimeout(t); for (const a of H.anims) { try { a.cancel(); } catch (e) { /* gone */ } } for (const g of H.props) { try { if (g.parentNode) g.parentNode.removeChild(g); if (g.destroy) g.destroy(); } catch (e) { /* gone */ } } H.anims.length = 0; H.props.length = 0; };
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
  const row = GARDEN_ACTS[id]; if (!row || typeof _gw === 'undefined' || !_gw.on) return false;
  gartActStop();
  if (typeof gartEmoteStop === 'function') gartEmoteStop();
  const cur = _ga.cur = { id, row, spot: spot || null, doing: false, lift: spot && spot.lift ? spot.lift : 0, t0: 0, fxT: 0, fxI: 0 };
  const start = () => { if (_ga.cur === cur) _gaStart(cur); };
  if (spot && spot.stand) {
    const W = GARDEN_WORLD, far = Math.hypot((spot.stand.x - _gw.px) * W.cellW, (spot.stand.y - _gw.py) * W.cellH);
    if (far < 14) start();
    else if (!gardenWalkToPoint(spot.stand, (ok) => { if (ok !== false) start(); }, { radius: 1.6 })) { _ga.cur = null; try { gameDeny(null, { say: 'You cannot get there.' }); } catch (e) { /* fine */ } return false; }
  } else start();
  return true;
}
function _gaStart(cur) {
  const row = cur.row, spot = cur.spot;
  // on the spot: the feet go exactly where the thing wants them (a seat's front edge), the figure faces the right way, standing still
  if (spot && spot.stand && (row.hold || cur.lift)) { _gw.px = spot.stand.x; _gw.py = spot.stand.y; if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; } }
  _gw.path = []; _gw.then = null; _gw.spd = 0; _gw.moving = false;
  _gaFace(_gaDirDeg(row, spot));
  if (typeof _GPL !== 'undefined') { _GPL.pose = ''; _GPL.until = 0; }
  try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* no walker */ }
  cur.doing = true; cur.t0 = performance.now(); cur.x = _gw.px; cur.y = _gw.py;
  // the figure is redrawn for its new way round by the walker: gartActFrame plays on that drawing once it is showing
  cur.wantDir = row.dir === 'n' ? 'n' : row.dir === 'e' || row.dir === 'w' ? 'e' : 's';
  if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
  if (row.sound) { try { gardenSfx(row.sound); } catch (e) { /* no such sound: quiet */ } }
  if (typeof gardenLiveEmoted === 'function') { try { gardenLiveEmoted(GA_WIRE + cur.id); } catch (e) { /* alone */ } }
  if (row.use && typeof gardenLiveFx === 'function' && (row.use === 'bell' || row.use === 'wish')) { try { gardenLiveFx('use', row.use, { x: Math.floor(_gw.px), y: Math.floor(_gw.py) }); } catch (e) { /* alone */ } }
  if (row.skim) _gaSkim(cur);
  if (row.shake) _gaShake(cur);
  _gaFirst(cur);
  if (!row.hold) cur.endT = setTimeout(() => { if (_ga.cur === cur) gartActStop(true); }, (_gaMotion() ? row.ms : 1200) + 60);
  if (row.nap) cur.endT = setTimeout(() => { if (_ga.cur === cur) { gartActStop(true); try { gardenToast('You wake up with a stretch.'); } catch (e) { /* fine */ } } }, row.nap);
  if (_ga.el) _ga.el.hidden = true;
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
  const at = (k) => GardenNativeActions.effect(fx.kind, (_gw.px + Math.cos(deg) * 0.7) * W.cellW, W.sky + (_gw.py + Math.sin(deg) * 0.5 + (fx.dy || 0)) * W.cellH + k, { width: fx.width || 24 });
  if (fx.every) { if (t - cur.fxT > fx.every) { cur.fxT = t; at(cur.fxI++ % 3); } }
  else if (fx.at && cur.fxI < fx.at.length && t > fx.at[cur.fxI] * cur.row.ms) { at(cur.fxI); cur.fxI++; }
}
function gartActStop(done) {
  const cur = _ga.cur; if (!cur) return;
  _ga.cur = null; clearTimeout(cur.endT);
  if (cur.H && cur.H.stop) cur.H.stop();
  if (cur.row.after && done && window.GardenNativeActions && _gaMotion()) { const W = GARDEN_WORLD; for (let i = 0; i < 6; i++) setTimeout(() => { try { GardenNativeActions.effect('water', _gw.px * W.cellW, W.sky + _gw.py * W.cellH, { width: 16 }); } catch (e) { /* fine */ } }, i * 450); }
  if (cur.doing) { try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* fine */ } }
}
/** The walker moved: whatever you were doing ends (a seat, a lie-down). Walking up to the thing does not. */
function gartActMoved() { const cur = _ga.cur; if (cur && cur.doing && typeof _gw !== 'undefined' && Math.hypot(_gw.px - cur.x, _gw.py - cur.y) > 0.08) gartActStop(); }
/* ---------- the little extras ---------- */
function _gaSkim(cur) {
  const n = 1 + Math.floor(Math.random() * 7), W = GARDEN_WORLD, deg = _gaDirDeg(cur.row, cur.spot) * Math.PI / 180;
  for (let i = 0; i < n; i++) setTimeout(() => {
    if (!window.GardenNativeActions) return;
    const d = 1.6 + i * 1.1 - i * i * 0.04, x = _gw.px + Math.cos(deg) * d, y = _gw.py + Math.sin(deg) * d * 0.7;
    try { if (typeof gardenWaterContainsPoint === 'function' && !gardenWaterContainsPoint(x, y)) return; GardenNativeActions.effect('water', x * W.cellW, W.sky + y * W.cellH, { width: 22 - i * 2 }); } catch (e) { /* fine */ }
  }, 900 + i * (260 - i * 18));
  setTimeout(() => { try { gardenToast(n === 1 ? 'Plop. One skip.' : `${n} skips!`); } catch (e) { /* fine */ } try { const g = _gdG(); const best = Object.keys(g.disc).filter(k => k.startsWith('act.skim.')).map(k => Number(k.slice(9))).reduce((a, b) => Math.max(a, b), 0); if (n > best) { g.disc['act.skim.' + n] = _gdToday(); _gdSave(); if (best) gardenToast(`Your best yet: ${n} skips.`); } } catch (e) { /* fine */ } }, 900 + n * 240 + 300);
}
const GA_SHAKE_LUCK = Object.freeze([[0.62, 'An apple thumps down into the grass.'], [0.78, 'A bee comes out, cross, and buzzes off.'], [0.9, 'A little bird\'s nest is up there. You leave it be.'], [1, 'A coin drops out of the leaves! Somebody hid it there.']]);
function _gaShake(cur) {
  const W = GARDEN_WORLD, b = cur.spot && cur.spot.tree;
  if (window.GardenNativeActions && b && _gaMotion()) for (let i = 0; i < 4; i++) setTimeout(() => { try { GardenNativeActions.effect('harvest', ((b.x0 + b.x1) / 2 + (i - 1.5) * 0.4) * W.cellW, W.sky + (b.y1 - 2.2) * W.cellH, { width: 40 }); } catch (e) { /* fine */ } }, 200 + i * 260);
  const r = Math.random(), luck = GA_SHAKE_LUCK.find(l => r <= l[0]);
  setTimeout(() => { try { gardenToast(luck[1]); } catch (e) { /* fine */ } if (luck === GA_SHAKE_LUCK[1] && typeof gartEmoteRun === 'function') { try { gartEmoteRun('startled', { quiet: true }); } catch (e) { /* fine */ } } }, 1300);
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
function gartActRemote(A, id) {
  const row = GARDEN_ACTS[id]; if (!row || !A || !A.root) return false;
  if (typeof _gllEmoteStop === 'function') _gllEmoteStop(A);
  A.dir = row.dir === 'n' ? 'n' : row.dir === 'e' || row.dir === 'w' ? 'e' : 's'; A.pose = ''; A.key = '';
  if (typeof _gllPaint === 'function') _gllPaint(A);
  const gpl = A.root.querySelector('.gpl'); if (!gpl) return false;
  const H = gartActPlay(gpl, id, { motion: typeof _gllReduced === 'function' ? !_gllReduced() : true });
  A.anims = H.anims; A.actUndo = H.stop; A.sit = !!row.hold; A.hold = '';
  if (!row.hold) A.animT = setTimeout(() => { if (typeof _gllEmoteStop === 'function') _gllEmoteStop(A); }, row.ms + 60);
  return true;
}
/* ---------- the pet comes and joins in ---------- */
if (typeof gardenLifePetGoal === 'function') {
  const _gaPetGoal0 = gardenLifePetGoal;
  gardenLifePetGoal = function (P, dt) {   // eslint-disable-line no-func-assign
    const cur = _ga.cur;
    if (cur && cur.doing && cur.row.pet && P && P.me) {
      const x = _gw.px + 0.75, y = _gw.py + 0.15;
      if (typeof _ptwFree !== 'function' || _ptwFree(x, y)) return { x, y, near: 10 };
      return { x: _gw.px - 0.75, y: _gw.py + 0.15, near: 10 };
    }
    return _gaPetGoal0(P, dt);
  };
}
/* ---------- the moves wheel: the ground actions are on it too ---------- */
const GART_ACT_WHEEL = Object.freeze({ lie: { name: 'Lie down', icon: 'cloud' }, nap: { name: 'Nap', icon: 'moon' }, laugh: { name: 'Laugh', icon: 'smile' } });
/** A click on a fixed thing with no door: do its first action (a bench: sit on it). */
function gartActForProp(p) {
  if (!p || p.act || !GARDEN_ACT_BY_PROP[p.id]) return false;
  const spot = _gaStaticRows().find(r => r.src === p.id); return !!spot && gartActRun(spot.act, spot);
}

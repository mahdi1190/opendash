/* The Leaf-boat Yard: a small host-owned fleet on the real lake shoreline.
 * Rudders, sail trim and currents move boats; markers never change a player,
 * fish, wallet or collision grid. Visitors render accepted fleet snapshots. */
const LEAFBOAT_HULLS = Object.freeze([
  Object.freeze({ id: 'willow', name: 'Willow leaf', speed: .55, turn: 1.12, current: .85, color: '#93aa57' }),
  Object.freeze({ id: 'oak', name: 'Oak leaf', speed: .44, turn: 1.48, current: .65, color: '#c79b54' }),
  Object.freeze({ id: 'skiff', name: 'Paper skiff', speed: .68, turn: .92, current: 1.12, color: '#edddac' }),
]);
const LEAFBOAT_RULES = Object.freeze({ snapshotMs: 1200, controlMs: 850, changeMs: 300, maxBoats: 8, footX: .32, footY: .5, gateReach: 22 });
const _gleaf = { id: '', serial: 0, spot: null, course: null, boats: new Map(), remote: null, seen: new Map(), lastLaunch: new Map(), displays: new Map(), sprites: new Map(), yard: null, gates: [], courseKey: '', frameAt: 0, seconds: 0, sentAt: 0, dirty: false, ack: '', pending: null, desired: null, controlAt: 0, panel: null, panelMode: '', panelButtons: {}, panelAt: 0, viewing: false, room: false, probeAt: 0, heldLast: null, boundaryContacts: 0, snapshots: 0, controlsSent: 0, probe: {} };
function _gleafVisit() { return typeof gardenVisitOn === 'function' && gardenVisitOn(); }
function _gleafSlot() { return _gleafVisit() ? typeof _glv !== 'undefined' ? _glv.w : null : 0; }
function _gleafIndoor() { return _gleaf.room || !!(typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on); }
function _gleafEnv() { const native = window.GardenNative; return native && native.active() && native.lighting() ? native.lighting().environment() : null; }
function _gleafHeld() { const env = _gleafEnv(), root = typeof _gw !== 'undefined' && _gw.svg; return !!(document.hidden || _gleafIndoor() || env && env.paused || root && (root.hasAttribute('data-garden-frozen') || root.classList.contains('gd-hush'))); }
function _gleafRound() { if (!_gleaf.id) _gleaf.id = _gllNewId(); return _gleaf.id; }
function _gleafWet(x, y) { return gardenWaterContainsPoint(x, y) && gardenWaterFootProbe(x, y, LEAFBOAT_RULES.footX, LEAFBOAT_RULES.footY, true, _gleaf.probe).free; }
function _gleafSegmentWet(a, b) {
  const W = GARDEN_WORLD, n = Math.max(1, Math.ceil(Math.hypot((b.x - a.x) * W.cellW, (b.y - a.y) * W.cellH) / 12));
  for (let k = 1; k <= n; k++) if (!gardenWaterContainsPoint(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)) return false;
  return true;
}
function _gleafPrepare() {
  if (!gardenActivityActive('leaf-boats')) return false;
  if (_gleafVisit()) return _gleaf.remote;
  if (_gleaf.spot && _gleaf.course) return true;
  const now = performance.now(); if (now < _gleaf.probeAt || typeof _gwFree !== 'function') return false; _gleaf.probeAt = now + 1500;
  const yards = [[31.5, 20.5], [30.5, 20.5], [32.5, 20.5], [29.5, 20.5], [33.5, 20.5]];
  for (const [x, y] of yards) {
    if (!_gwFree(x, y) || gardenWaterContainsPoint(x, y)) continue;
    for (const dy of [1.8, 2.2, 2.6, 3]) for (const dx of [0, -.5, .5]) {
      const launch = { x: x + dx, y: y + dy }; if (!_gleafWet(launch.x, launch.y)) continue;
      for (const side of [1, -1]) {
        const points = [launch, { x: launch.x + side * 2.3, y: launch.y + 1.4 }, { x: launch.x + side * .2, y: launch.y + 3.7 }, { x: launch.x - side * 2, y: launch.y + 1.9 }, { ...launch }];
        if (!points.every(p => _gleafWet(p.x, p.y)) || !points.slice(1).every((p, i) => _gleafSegmentWet(points[i], p))) continue;
        _gleaf.spot = { x, y }; _gleaf.course = points; _gleafRound(); return true;
      }
    }
  }
  return false;
}
function _gleafView() { if (!gardenActivityActive('leaf-boats')) return null; if (_gleafVisit()) return _gleaf.remote; return _gleafPrepare() ? { id: _gleafRound(), spot: _gleaf.spot, course: _gleaf.course, boats: _gleaf.boats, running: !_gleafHeld(), at: performance.now() } : null; }
function _gleafOwn() { const view = _gleafView(); return view && view.boats.get(_gleafSlot()); }
function _gleafEffect(kind, x, y, scale) {
  const native = window.GardenNative, water = native && native.active() && native.water();
  if (water && water.effect) water.effect(kind, x * GARDEN_WORLD.cellW, GARDEN_WORLD.sky + y * GARDEN_WORLD.cellH, { scale: scale || .5 });
}
function _gleafRow(b) { const h = ((b.h % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return [b.w, b.token, Math.round(b.x * 100), Math.round(b.y * 100), Math.min(628, Math.round(h * 100)), b.rudder, b.trim, b.hull, b.gate]; }
function _gleafStateBody(ack) {
  if (!_gleafPrepare()) return null;
  const body = { c: 'leaf', e: 'state', i: _gleafRound(), x: Math.floor(_gleaf.spot.x), y: Math.floor(_gleaf.spot.y), tt: _gleafHeld() ? 0 : 1, lc: _gleaf.course.map(p => [Math.round(p.x * 100), Math.round(p.y * 100)]), lb: [..._gleaf.boats.values()].sort((a, b) => a.w - b.w).slice(0, 8).map(_gleafRow) };
  if (ack) body.p = ack; return body;
}
function gardenLeafBoatSend(fid, ack) {
  if (_gleafVisit() || !_glh.on || _gll.role !== 'host') return;
  const body = _gleafStateBody(ack); if (!body) return;
  _gleaf.sentAt = performance.now(); _gleaf.dirty = false; _gleaf.snapshots++;
  return _glhSend(fid || 'all', 'fx', body);
}
function _gleafPublish() {
  const now = performance.now();
  if (_gleaf.dirty && now - _gleaf.sentAt >= LEAFBOAT_RULES.changeMs || _gleaf.boats.size && now - _gleaf.sentAt >= LEAFBOAT_RULES.snapshotMs) gardenLeafBoatSend('all');
}
function gardenLeafBoatHostStart() {
  const mine = _gleaf.boats.get(0); _gleaf.id = _gllNewId(); _gleaf.boats.clear(); if (mine) _gleaf.boats.set(0, mine);
  _gleaf.serial = mine ? mine.token : 0; _gleaf.remote = null; _gleaf.seen.clear(); _gleaf.lastLaunch.clear(); _gleaf.pending = null; _gleaf.desired = null; _gleaf.dirty = true;
}
function gardenLeafBoatHostStop() { _gleaf.boats.clear(); _gleaf.pending = _gleaf.desired = null; _gleaf.remote = null; _gleaf.id = ''; _gleaf.serial = 0; _gleaf.viewing = false; _gleafClose(); }
function gardenLeafBoatGuestClear() { _gleaf.remote = null; _gleaf.pending = _gleaf.desired = null; _gleaf.displays.clear(); _gleaf.viewing = false; _gleafClose(); }
function gardenLeafBoatLeft(w) { if (_gleaf.boats.delete(w)) { _gleaf.dirty = true; _gleafPublish(); } }
function gardenLeafBoatRoomChanged(on) { _gleaf.room = !!on; _gleaf.heldLast = null; if (on) { _gleaf.viewing = false; _gleafClose(); } if (!_gleafVisit() && _gleaf.boats.size) { _gleaf.dirty = true; if (on) gardenLeafBoatSend('all'); } }
function gardenLeafBoatHolding() { if (!_gleaf.viewing || !_wd.on || _gleafIndoor()) return false; const b = _gleafOwn(); return !!(b && b.gate < 4 || _gleaf.pending && _gleaf.pending.action === 'launch'); }
function _gleafTakeHands(w) {
  if (w === _gleafSlot()) { if (typeof gardenSoapReleaseLocal === 'function') gardenSoapReleaseLocal(); if (typeof gardenKiteReleaseLocal === 'function') gardenKiteReleaseLocal(); }
  if (!_gleafVisit() && w !== 0) { if (typeof gardenSoapLeft === 'function') gardenSoapLeft(w); if (typeof gardenKiteLeft === 'function') gardenKiteLeft(w); }
}
function _gleafLaunch(w, fid, hull) {
  if (!_gleafPrepare() || _gleaf.boats.has(w) || _gleaf.boats.size >= LEAFBOAT_RULES.maxBoats || _gleafHeld()) return false;
  if (w === 0 && !wdNear(_gleaf.spot.x, _gleaf.spot.y, 4.2)) return false;
  const now = performance.now(); if (now - (_gleaf.lastLaunch.get(w) || -Infinity) < 1800) return false;
  if (_gleaf.serial >= 999) { if (_gleaf.boats.size) return false; _gleaf.id = _gllNewId(); _gleaf.serial = 0; _gleaf.seen.clear(); }
  const p = _gleaf.course[0], aim = _gleaf.course[1], b = { w, owner: fid || '', token: ++_gleaf.serial, hull, x: p.x, y: p.y, h: Math.atan2(aim.y - p.y, aim.x - p.x), vx: 0, vy: 0, rudder: 1, trim: 1, gate: 0, moving: false, contactAt: 0 };
  _gleaf.boats.set(w, b); _gleafTakeHands(w); _gleaf.lastLaunch.set(w, now); _gleaf.dirty = true; _gleafEffect('cast', b.x, b.y, .45); _gleafPublish(); return true;
}
function gardenLeafBoatHeard(A, ev) {
  if (!_glh.on || _gll.role !== 'host' || !A || ev.c !== 'leaf' || ev.e === 'state' || glFxOk(ev)) return;
  const key = A.f + '|' + ev.i; if (_gleaf.seen.has(key)) return;
  _gleaf.seen.set(key, true); if (_gleaf.seen.size > 96) _gleaf.seen.delete(_gleaf.seen.keys().next().value);
  if (ev.p !== _gleafRound()) { gardenLeafBoatSend(A.f, ev.i); return; }
  const b = _gleaf.boats.get(A.w), owns = b && b.owner === A.f;
  if (ev.e === 'retrieve') { if (owns && (!ev.tt || ev.tt === b.token)) gardenLeafBoatLeft(A.w); gardenLeafBoatSend(A.f, ev.i); return; }
  const allowed = _gleaf.spot && !A.rm && !A.away && glAtLeast(_glhPerm(A.f).lv, 'play') && Math.hypot(A.x - _gleaf.spot.x, A.y - _gleaf.spot.y) <= 4.2 && !_gleafHeld();
  if (ev.e === 'launch') { if (allowed) _gleafLaunch(A.w, A.f, ev.n - 1); gardenLeafBoatSend(A.f, ev.i); return; }
  if (allowed && owns && ev.tt === b.token && b.gate < 4) { b.rudder = ev.n - 1; b.trim = ev.ql - 1; }
}
function gardenLeafBoatGuestState(ev) {
  if (!_gleafVisit() || !_glvLive() || ev.c !== 'leaf' || ev.e !== 'state' || glFxOk(ev)) return;
  const now = performance.now(), previous = _gleaf.remote, boats = new Map();
  for (const r of ev.lb) {
    const old = previous && previous.id === ev.i && previous.boats.get(r[0]), elapsed = old ? Math.max(.2, (now - previous.at) / 1000) : 1;
    const b = { w: r[0], token: r[1], x: r[2] / 100, y: r[3] / 100, h: r[4] / 100, rudder: r[5], trim: r[6], hull: r[7], gate: r[8], vx: old && old.token === r[1] ? (r[2] / 100 - old.x) / elapsed : 0, vy: old && old.token === r[1] ? (r[3] / 100 - old.y) / elapsed : 0 };
    boats.set(b.w, b);
    if (b.w === _gleafSlot() && old && b.token === old.token && b.gate > old.gate) _gleafGateSound(b.gate);
  }
  if (!previous || previous.id !== ev.i) _gleaf.displays.clear();
  _gleaf.remote = { id: ev.i, spot: { x: ev.x + .5, y: ev.y + .5 }, course: ev.lc.map(p => ({ x: p[0] / 100, y: p[1] / 100 })), boats, running: !!ev.tt, at: now };
  const own = boats.get(_gleafSlot());
  const oldOwn = previous && previous.id === ev.i && previous.boats.get(_gleafSlot());
  if (own && (!oldOwn || oldOwn.token !== own.token)) _gleafTakeHands(_gleafSlot());
  if (_gleaf.pending) {
    const p = _gleaf.pending, accepted = p.action === 'launch' ? !!own : !own;
    if (accepted || ev.p === p.id) { if (!accepted) wdWhisper('The yard could not accept that launch. Come close with Play access and try again.', 5000); _gleaf.pending = null; }
  }
  if (_gleaf.desired && own && own.token === _gleaf.desired.token && own.rudder === _gleaf.desired.rudder && own.trim === _gleaf.desired.trim) _gleaf.desired = null;
  _gleafWorld(); _gleafPanelRefresh(true);
}
function _gleafAsk(action, fields) {
  const view = _gleafView(); if (!view || !_glvLive()) return false;
  const id = _gllNewId(); if (action !== 'control') _gleaf.pending = { id, action, at: performance.now() };
  if (typeof _gllGoNow === 'function') _gllGoNow();
  gardenLiveFx('leaf', action, { i: id, p: view.id, ...fields }); return true;
}
function gardenLeafBoatReleaseLocal() {
  const own = _gleafOwn(), pendingLaunch = _gleaf.pending && _gleaf.pending.action === 'launch';
  _gleaf.desired = null; _gleaf.viewing = false;
  if (_gleafVisit()) { if ((own || pendingLaunch) && _glvLive()) _gleafAsk('retrieve', { tt: own ? own.token : 0 }); }
  else if (own) { _gleafEffect('step', own.x, own.y, .4); _gleaf.boats.delete(0); _gleaf.dirty = true; _gleafPublish(); }
  _gleafPanelRefresh(true);
}
function _gleafControl(rudder, trim) {
  const own = _gleafOwn(), view = _gleafView(); if (!own || own.gate >= 4 || !view || !wdNear(view.spot.x, view.spot.y, 4.2) || _gleafHeld()) return;
  if (_gleafVisit()) { _gleaf.desired = { token: own.token, rudder, trim, dirty: true, at: performance.now() }; _gleafFlushControl(); }
  else { own.rudder = rudder; own.trim = trim; }
  _gleafPanelRefresh(true);
}
function _gleafFlushControl() {
  const d = _gleaf.desired, own = _gleafOwn(), now = performance.now();
  if (!d || !d.dirty || !own || own.token !== d.token || now - _gleaf.controlAt < LEAFBOAT_RULES.controlMs || _gleafHeld()) return;
  d.dirty = false; _gleaf.controlAt = now; _gleaf.controlsSent++;
  _gleafAsk('control', { tt: own.token, n: d.rudder + 1, ql: d.trim + 1 });
}
function _gleafWaterStep(b, dx, dy) {
  const W = GARDEN_WORLD, steps = Math.max(1, Math.min(8, Math.ceil(Math.hypot(dx * W.cellW, dy * W.cellH) / 4))), sx = dx / steps, sy = dy / steps;
  for (let k = 0; k < steps; k++) {
    if (_gleafWet(b.x + sx, b.y + sy)) { b.x += sx; b.y += sy; continue; }
    const p = gardenWaterFootProbe(b.x + sx, b.y + sy, LEAFBOAT_RULES.footX, LEAFBOAT_RULES.footY, true, _gleaf.probe), nx = p.nx, ny = p.ny, dot = Math.min(0, sx * W.cellW * nx + sy * W.cellH * ny), tx = sx - nx * dot / W.cellW, ty = sy - ny * dot / W.cellH;
    if ((Math.abs(tx) + Math.abs(ty)) > .00001 && _gleafWet(b.x + tx, b.y + ty)) { b.x += tx; b.y += ty; }
    const vd = Math.min(0, (b.vx || 0) * W.cellW * nx + (b.vy || 0) * W.cellH * ny); b.vx = ((b.vx || 0) * W.cellW - nx * vd) / W.cellW * .8; b.vy = ((b.vy || 0) * W.cellH - ny * vd) / W.cellH * .8;
    _gleaf.boundaryContacts++;
  }
}
function _gleafGateSound(stage) { wdSound([[stage === 4 ? 784 : 440 + stage * 110, .35, 'sine', .014], ...(stage === 4 ? [[1046.5, .6, 'sine', .009, .15]] : [])]); }
function _gleafSimulate(dt, env) {
  const boats = [..._gleaf.boats.values()], time = env && Number.isFinite(env.ambientTime) ? env.ambientTime / 1000 : _wd.t;
  for (const b of boats) {
    if (b.gate >= 4) { b.moving = false; continue; }
    const H = LEAFBOAT_HULLS[b.hull], oldX = b.x, oldY = b.y; b.h = (b.h + (b.rudder - 1) * H.turn * dt + Math.PI * 2) % (Math.PI * 2);
    const windX = env ? Number(env.windX) || 0 : .3, windY = env ? Number(env.windY) || 0 : .15, speed = H.speed * (b.trim ? 1 : .48), fx = (.035 + Math.sin(b.y * .45 + time * .07) * .04 + windX * .1) * H.current, fy = (.025 + Math.cos(b.x * .4 - time * .055) * .025 + windY * .045) * H.current;
    const targetX = Math.cos(b.h) * speed + fx, targetY = Math.sin(b.h) * speed + fy, follow = 1 - Math.exp(-dt * 3.5);
    b.vx += (targetX - b.vx) * follow; b.vy += (targetY - b.vy) * follow;
    for (const other of boats) { if (other === b || other.gate >= 4) continue; const dx = (b.x - other.x) * GARDEN_WORLD.cellW, dy = (b.y - other.y) * GARDEN_WORLD.cellH, d = Math.hypot(dx, dy); if (d > .2 && d < 19) { const push = (19 - d) * .9 * dt; b.vx += dx / d * push / GARDEN_WORLD.cellW; b.vy += dy / d * push / GARDEN_WORLD.cellH; } }
    _gleafWaterStep(b, b.vx * dt, b.vy * dt); b.moving = Math.hypot(b.x - oldX, b.y - oldY) > .00001;
    const aim = _gleaf.course[b.gate + 1];
    if (aim && Math.hypot((b.x - aim.x) * GARDEN_WORLD.cellW, (b.y - aim.y) * GARDEN_WORLD.cellH) <= LEAFBOAT_RULES.gateReach) { b.gate++; _gleaf.dirty = true; _gleafEffect('bite', b.x, b.y, .45); if (b.w === 0) _gleafGateSound(b.gate); if (b.gate === 4) { b.vx = b.vy = 0; b.rudder = 1; b.moving = false; } }
  }
}
function _gleafYardArt() {
  return '<ellipse cy="2" rx="25" ry="6" fill="#233d32" opacity=".18"/><path d="M-21 0L-19 -24H20L22 0Z" fill="#7c5f43"/><path d="M-22 -24L-12 -35H21L27 -24Z" fill="#b18e5d"/><path d="M-17 -23L-13 -32H18L21 -23Z" fill="#496a5e"/><path d="M-12 -27Q0 -37 14 -27Q2 -21-12 -27Z" fill="#a6b866"/><path d="M-11 -27L12 -27" stroke="#dbe1a0" stroke-width="1"/><path d="M-17 -20V-6M-5 -20V-6M7 -20V-6M18 -20V-6" stroke="#5a4431" stroke-width="1.3"/><path d="M-20 -7H22" stroke="#c2a377" stroke-width="2"/><path d="M-20 -31V-61M22 -30V-61" stroke="#786247" stroke-width="2.2"/><rect x="-28" y="-67" width="59" height="17" rx="3" fill="#eee0b9" stroke="#997d53"/><text x="1" y="-55" text-anchor="middle" font-size="8" font-family="system-ui,sans-serif" font-weight="700" fill="#37584f">LEAF BOATS</text><path d="M21 -26L30 -9M24 -29L34 -13" stroke="#bd9e67" stroke-width="2"/>';
}
function _gleafGateArt(i, active) {
  const color = i === 3 ? '#e6be71' : active ? '#e7cd79' : '#a7b994';
  return `<ellipse cy="2" rx="25" ry="10" fill="none" stroke="${color}" stroke-width="1.2" opacity="${active ? .85 : .4}"/><path d="M-25 2V-23M25 2V-23M-28 -18Q-25 -26-22 -18M22 -18Q25 -26 28 -18" fill="none" stroke="#8b9162" stroke-width="2"/><path d="M-24 -22Q0 -31 24 -22" fill="none" stroke="${color}" stroke-width="1.5"/><path d="M-7 -25L-5 -40H7L8 -25Z" fill="${color}"/><text x="1" y="-30" text-anchor="middle" font-size="8" font-family="system-ui,sans-serif" fill="#40584d">${i === 3 ? 'H' : i + 1}</text><ellipse cy="5" rx="18" ry="4" fill="none" stroke="#d7e5cc" stroke-width=".7" opacity=".25"/>`;
}
function _gleafBoatArt(hull, slot) {
  const H = LEAFBOAT_HULLS[hull], color = typeof GKITE_COLORS !== 'undefined' ? GKITE_COLORS[slot % GKITE_COLORS.length] : '#b77551';
  const leaf = hull === 1 ? 'M-19 0Q-18 -4-14 -3Q-13 -9-7 -6Q-4 -12 1 -6Q7 -10 10 -5Q16 -5 20 0Q15 6 9 5Q4 11-1 6Q-7 10-10 5Q-17 6-19 0Z' : 'M-19 0Q-8 -12 20 0Q-8 12-19 0Z';
  const deck = hull === 2 ? '<path d="M-18 -5L0 -9L18 -5L12 5H-12Z" fill="#e9dbb5" stroke="#88794f" stroke-width=".9"/><path d="M-18 -5L0 1L18 -5M0 -9V1L-5 -5" fill="none" stroke="#b7a47c" stroke-width=".8"/>' : `<path d="${leaf}" fill="${H.color}" stroke="#596c45" stroke-width=".9"/><path d="M-23 0H17M-12 0L-6 -5M-5 0L2 -5M2 0L9 -3M-11 0L-5 5M-3 0L3 5M5 0L11 3" fill="none" stroke="#d5ce8e" stroke-width=".7"/>`;
  return `<g class="gleaf-hull"><g class="gleaf-deck">${deck}<path class="gleaf-rudder" d="M-19 0L-26 0" stroke="#806741" stroke-width="2"/></g><path d="M0 -2V-25" stroke="#896f48" stroke-width="1.2"/><g class="gleaf-sail"><path d="M1 -24L1 -6L14 -7Z" fill="${color}" stroke="#eee0b3" stroke-width=".6"/><path d="M2 -22L2 -8L10 -9Z" fill="#f1dfa7" opacity=".35"/></g><circle cx="0" cy="-2" r="1.8" fill="#f0dca3"/></g>`;
}
function _gleafRemoveSprites() { if (_gleaf.yard) _gleaf.yard.remove(); for (const S of _gleaf.gates) if (S) S.remove(); for (const S of _gleaf.sprites.values()) S.remove(); _gleaf.yard = null; _gleaf.gates = []; _gleaf.sprites.clear(); _gleaf.displays.clear(); _gleaf.courseKey = ''; }
function _gleafWorld() {
  if (!_wd.on) return; const view = _gleafView(); if (!view) return;
  const key = view.id + '|' + view.course.map(p => p.x + ',' + p.y).join(';');
  if (_gleaf.courseKey !== key) { _gleafRemoveSprites(); _gleaf.courseKey = key; }
  if (!_gleaf.yard) _gleaf.yard = wdSprite({ id: 'wd-leafboat-yard', ...view.spot, still: true, hit: .65, hitUp: 30, svg: _gleafYardArt(), label: 'The leaf-boat yard', cursor: 'hand', onClick: gardenLeafBoatOpen });
  const own = view.boats.get(_gleafSlot()), target = own && own.gate < 4 ? own.gate : 0;
  for (let i = 0; i < 4; i++) {
    const p = view.course[i + 1]; if (!_gleaf.gates[i]) _gleaf.gates[i] = wdSprite({ id: 'wd-leafboat-gate-' + i, ...p, still: true, hit: 0, svg: '' });
    const S = _gleaf.gates[i], art = _gleafGateArt(i, i === target); if (S.svg !== art) wdArt(S, art);
  }
  for (const [w, b] of view.boats) {
    let S = _gleaf.sprites.get(w);
    if (S && S.leafToken !== b.token) { S.remove(); _gleaf.sprites.delete(w); _gleaf.displays.delete(w); S = null; }
    if (!S) { S = wdSprite({ id: 'wd-leafboat-' + w, x: b.x, y: b.y, still: true, hit: 0, svg: _gleafBoatArt(b.hull, w) }); S.leafToken = b.token; S.leafSlot = w; _gleaf.sprites.set(w, S); }
  }
  for (const [w, S] of _gleaf.sprites) if (!view.boats.has(w)) { S.remove(); _gleaf.sprites.delete(w); _gleaf.displays.delete(w); }
}
function _gleafBindings(S) {
  if (!S.node || !S.node.isConnected || S._off) return null;
  let b = S.leafNodes; if (b && b.root === S.node) return b;
  b = { root: S.node, hull: S.node.querySelector('.gleaf-hull'), deck: S.node.querySelector('.gleaf-deck'), rudder: S.node.querySelector('.gleaf-rudder'), sail: S.node.querySelector('.gleaf-sail'), attrs: {} }; S.leafNodes = b; return b;
}
function _gleafAttr(b, node, key, name, value) { if (node && b.attrs[key] !== value) { b.attrs[key] = value; node.setAttribute(name, value); } }
function _gleafPaint(dt, env) {
  const view = _gleafView(); if (!view) return;
  const now = performance.now(), motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(), time = env && Number.isFinite(env.ambientTime) ? env.ambientTime / 1000 : _wd.t;
  for (const [w, b] of view.boats) {
    const S = _gleaf.sprites.get(w); if (!S) continue;
    let display = _gleaf.displays.get(w); if (!display || display.token !== b.token) { display = { x: b.x, y: b.y, h: b.h, token: b.token, vx: 0, vy: 0 }; _gleaf.displays.set(w, display); }
    const oldX = display.x, oldY = display.y;
    if (!_gleafVisit()) { display.x = b.x; display.y = b.y; display.h = b.h; }
    else if (view.running && now - view.at < 3600) {
      const age = Math.min(1.3, Math.max(0, (now - view.at) / 1000)), tx = b.x + Math.max(-.9, Math.min(.9, b.vx || 0)) * age, ty = b.y + Math.max(-.9, Math.min(.9, b.vy || 0)) * age, dx = tx - display.x, dy = ty - display.y, distance = Math.hypot(dx, dy), travel = Math.min(distance, dt * 1.2), share = distance ? travel / distance : 0;
      _gleafWaterStep(display, dx * share, dy * share); const turn = Math.atan2(Math.sin(b.h - display.h), Math.cos(b.h - display.h)); display.h += turn * Math.min(1, dt * 7);
    }
    S.x = display.x; S.y = display.y; S.moving = b.gate < 4 && Math.hypot(display.x - oldX, display.y - oldY) > .00001;
    const nodes = _gleafBindings(S); if (!nodes) continue;
    const a = display.h, c = Math.cos(a), s = Math.sin(a), scale = GARDEN_WORLD.cellH / GARDEN_WORLD.cellW;
    _gleafAttr(nodes, nodes.deck, 'deck', 'transform', `matrix(${c.toFixed(3)} ${(s * scale).toFixed(3)} ${(-s).toFixed(3)} ${(c * scale).toFixed(3)} 0 0)`);
    _gleafAttr(nodes, nodes.hull, 'bob', 'transform', `translate(0 ${(motion ? Math.sin(time * 2.6 + w) * .8 : 0).toFixed(2)})`);
    _gleafAttr(nodes, nodes.rudder, 'rudder', 'transform', `rotate(${(b.rudder - 1) * 24} -19 0)`);
    _gleafAttr(nodes, nodes.sail, 'sail', 'transform', `scale(${b.trim ? 1 : .35} 1)`);
  }
}
function _gleafClose() { const panel = _gleaf.panel; if (panel && _wd.talk === panel) wdTalkClose(true); _gleaf.panel = null; _gleaf.panelMode = ''; _gleaf.panelButtons = {}; _gleaf.viewing = false; }
function _gleafPanelRefresh(force) {
  const T = _gleaf.panel; if (!T || _wd.talk !== T || !T.el.isConnected) { _gleaf.panel = null; _gleaf.viewing = false; return; }
  const now = performance.now(); if (!force && now - _gleaf.panelAt < 180) return; _gleaf.panelAt = now;
  const view = _gleafView(), own = view && view.boats.get(_gleafSlot()), play = !_gleafVisit() || _glvLive() && glAtLeast(_glv.lv, 'play'), mode = !view ? 'waiting' : !play ? 'watch' : _gleaf.pending ? 'pending' : own ? own.gate === 4 ? 'done' : 'sailing' : 'choose';
  if (_gleaf.panelMode !== mode) {
    _gleaf.panelMode = mode; _gleaf.panelButtons = {};
    const actions = mode === 'choose' ? LEAFBOAT_HULLS.map((H, i) => ({ label: 'Launch ' + H.name.toLowerCase(), run: () => { if (_gleafHeld()) return; _gleaf.viewing = true; if (_gleafVisit()) _gleafAsk('launch', { n: i + 1 }); else _gleafLaunch(0, '', i); _gleafWorld(); _gleafPanelRefresh(true); } })) : mode === 'sailing' ? [0, 1, 2].map((r, i) => ({ label: ['Rudder left', 'Rudder straight', 'Rudder right'][i], run: () => { const b = _gleafOwn(), d = _gleaf.desired; if (b) _gleafControl(r, d && d.token === b.token ? d.trim : b.trim); } })).concat([{ label: 'Reef sail', run: () => { const b = _gleafOwn(), d = _gleaf.desired; if (b) _gleafControl(d && d.token === b.token ? d.rudder : b.rudder, d && d.token === b.token ? 1 - d.trim : 1 - b.trim); } }, { label: 'Retrieve boat', run: () => { gardenLeafBoatReleaseLocal(); _gleafWorld(); _gleafPanelRefresh(true); } }]) : mode === 'done' ? [{ label: 'Retrieve boat', run: () => { gardenLeafBoatReleaseLocal(); _gleafWorld(); _gleafPanelRefresh(true); } }] : [];
    T.say('', actions);
    for (const button of T.el.querySelectorAll('.wd-talk-go button')) _gleaf.panelButtons[button.textContent] = button;
  }
  let text = 'The yard is waiting for the host.';
  if (mode === 'choose') text = 'Choose a hull, then guide it through markers 1, 2 and 3 and back to H. Willow tracks steadily; oak turns tightly; paper is quick. A reefed sail slows the boat for careful turns. There is no time limit or entry cost.';
  else if (mode === 'watch') text = 'You can watch this fleet. Play access lets you launch and steer a leaf boat beside the host.';
  else if (mode === 'pending') text = 'Waiting for the host\u0027s yard to answer. The boat and its course belong to this garden.';
  else if (own) { const d = _gleaf.desired, rudder = d && d.token === own.token ? d.rudder : own.rudder, trim = d && d.token === own.token ? d.trim : own.trim; text = mode === 'done' ? 'Home again: all three markers and the home gate passed. Your little boat rests on the water. Retrieve it whenever you are ready for another course.' : LEAFBOAT_HULLS[own.hull].name + ': ' + (own.gate < 3 ? 'next marker ' + (own.gate + 1) : 'bring it home to H') + '. Rudder ' + ['left', 'straight', 'right'][rudder] + ', sail ' + (trim ? 'open' : 'reefed') + (d ? ' (steering request on its way)' : '') + (_gleafHeld() || !view.running ? '. The course is paused.' : '.') + ' Reeds and shorelines deflect the hull; retrieving never costs anything.';
    for (let i = 0; i < 3; i++) { const button = _gleaf.panelButtons[['Rudder left', 'Rudder straight', 'Rudder right'][i]]; if (button) button.setAttribute('aria-pressed', String(i === rudder)); }
    const sail = _gleaf.panelButtons['Reef sail']; if (sail) sail.textContent = trim ? 'Reef sail' : 'Open sail';
  }
  const line = T.el.querySelector('.wd-talk-t'); if (line && line.textContent !== text) line.textContent = text;
}
function gardenLeafBoatOpen() {
  const view = _gleafView(); if (!view || _gleafIndoor() || !wdNear(view.spot.x, view.spot.y, 3) || typeof _gwFishBusy === 'function' && _gwFishBusy()) return;
  _gleafClose(); let T;
  T = wdTalk({ name: 'The leaf-boat yard', at: view.spot, lines: ['A few leaves, thin reed rudders and little cotton sails. The lake does the rest.'], bye: 'Leave the yard', onClose() { if (_gleaf.panel === T) { _gleaf.panel = null; _gleaf.panelMode = ''; _gleaf.viewing = false; } } });
  _gleaf.panel = T; _gleaf.viewing = true; _gleaf.panelMode = ''; _gleafPanelRefresh(true);
}
function _gleafPrune() {
  if (_gleafVisit()) return;
  for (const [w, b] of _gleaf.boats) {
    const actor = w === 0 ? null : _gll.actors.get(w), p = w === 0 ? { x: _gw.px, y: _gw.py } : actor;
    if (!p || w !== 0 && (actor.f !== b.owner || actor.rm || actor.away || !glAtLeast(_glhPerm(actor.f).lv, 'play')) || _gleaf.spot && Math.hypot(p.x - _gleaf.spot.x, p.y - _gleaf.spot.y) > 8) { _gleaf.boats.delete(w); _gleaf.dirty = true; }
  }
}
function _gleafFrame(dt) {
  const now = performance.now(), held = _gleafHeld(), elapsed = Math.max(0, Math.min(.06, dt || 0)); _gleaf.frameAt = now;
  if (held !== _gleaf.heldLast) { _gleaf.heldLast = held; if (!_gleafVisit() && _gleaf.boats.size) _gleaf.dirty = true; }
  if (!_gleafVisit() && !held) { _gleaf.seconds += elapsed; _gleafSimulate(elapsed, _gleafEnv()); }
  if (!held) { _gleafFlushControl(); _gleafPaint(elapsed, _gleafEnv()); }
  _gleafPublish(); _gleafPanelRefresh(false);
}
function gardenLeafBoatWaterActors() {
  const out = [];
  for (const [w, S] of _gleaf.sprites) {
    const b = _gleafBindings(S); if (!b || !b.hull || !b.hull.target) continue;
    out.push({ id: 'leaf-boat:' + w, node: S.node, body: b.hull, x: S.x * GARDEN_WORLD.cellW, y: GARDEN_WORLD.sky + S.y * GARDEN_WORLD.cellH, w: 32, h: 4, tall: 27, moving: !!S.moving, captureKey: 'leaf:' + w + ':' + S.leafToken });
    if (out.length === 8) break;
  }
  return out;
}
function gardenLeafBoatState() {
  const view = _gleafView(), own = view && view.boats.get(_gleafSlot());
  return { id: view ? view.id : '', sharing: !!(_glh.on || _gleafVisit() && _glvLive()), visit: _gleafVisit(), own: _gleafSlot(), spot: view && view.spot, course: view ? view.course.map(p => ({ ...p })) : [], boats: view ? [...view.boats.values()].map(b => ({ slot: b.w, token: b.token, x: b.x, y: b.y, heading: b.h, rudder: b.rudder, trim: b.trim, hull: LEAFBOAT_HULLS[b.hull].id, nextGate: b.gate, finished: b.gate === 4, wet: _gleafWet(b.x, b.y) })) : [], displays: [..._gleaf.sprites].map(([slot, S]) => ({ slot, x: S.x, y: S.y, attached: !!S.node && S.node.isConnected, wet: _gleafWet(S.x, S.y) })), pending: _gleaf.pending && _gleaf.pending.action, desired: _gleaf.desired && { rudder: _gleaf.desired.rudder, trim: _gleaf.desired.trim }, running: !!view && view.running && !_gleafHeld(), ownFinished: !!own && own.gate === 4, boundaryContacts: _gleaf.boundaryContacts, snapshots: _gleaf.snapshots, controlsSent: _gleaf.controlsSent, viewing: _gleaf.viewing };
}
wdMod({
  id: 'leaf-boats', fun: false, visit: true,
  begin() { _gleaf.spot = null; _gleaf.course = null; _gleaf.probeAt = 0; _gleaf.courseKey = ''; _gleaf.frameAt = 0; _gleaf.room = false; _gleaf.heldLast = null; _gleafWorld(); },
  painted() { _gleafWorld(); }, frame: _gleafFrame,
  tick() { _gleafPrune(); _gleafWorld(); if (_gleaf.pending && performance.now() - _gleaf.pending.at > 7000) { _gleaf.pending = null; wdWhisper('The yard has not answered yet. Try again when the host is ready.', 4500); } _gleafPanelRefresh(true); },
  end() { gardenLeafBoatReleaseLocal(); _gleafClose(); _gleafRemoveSprites(); _gleaf.spot = null; _gleaf.course = null; _gleaf.probeAt = 0; _gleaf.room = false; _gleaf.heldLast = null; },
});
if (window.GardenActivityCamera) GardenActivityCamera.define('leafboats', () => {
  if (!_gleaf.viewing || _gleafIndoor()) return null;
  const view = _gleafView(), own = view && view.boats.get(_gleafSlot()); if (!own) return null;
  const display = _gleaf.displays.get(own.w) || own, next = view.course[Math.min(4, own.gate + 1)], W = GARDEN_WORLD, points = [display, next], xs = points.map(p => p.x * W.cellW), ys = points.map(p => W.sky + p.y * W.cellH);
  return { id: view.id + ':' + own.token, bounds: { x: Math.min(...xs) - 30, y: Math.min(...ys) - 42, width: Math.max(...xs) - Math.min(...xs) + 60, height: Math.max(...ys) - Math.min(...ys) + 66 } };
}, 30);
gardenPlayAdd({ id: 'leaf-boats', name: 'Leaf-boat yard', icon: 'ship', group: 'games', blurb: 'Choose a leaf hull, trim its sail and steer through the lake\u0027s reed markers. No timer, no entry cost.', status: () => { const b = _gleafOwn(); return b ? b.gate === 4 ? 'Home again' : b.gate + ' of 4 markers' : 'A little fleet on the real lake'; }, open() { const view = _gleafView(); if (view) gardenWalkAct({ x: view.spot.x, y: view.spot.y + .4 }, gardenLeafBoatOpen, { radius: 2.5, near: 70 }); else wdWhisper('The leaf-boat yard is on the east village shore. A live host opens it for visitors.', 5000); } });
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden && typeof _gw !== 'undefined' && _gw.on) { gardenLeafBoatReleaseLocal(); if (!_gleafVisit()) gardenLeafBoatSend('all'); _gleafClose(); } });

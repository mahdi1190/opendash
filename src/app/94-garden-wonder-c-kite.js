/* A shared wind kite. Membership is host-owned; its retained sail and tethers
 * follow the existing numeric actors and wind, with no animation messages. */
const _gkite = { id: '', members: new Map(), remote: null, pending: null, seen: new Map(), spot: null, probeAt: 0, S: {}, sentAt: 0, age: 0, lift: 0, driftX: 0, driftY: 0, frameAt: 0, nodes: null, nodeRoot: null, postKey: '', gesture: null, gestureSerial: 0 };
const GKITE_COLORS = Object.freeze(['#d76b42', '#478d99', '#c59237', '#9167a9', '#6a945b', '#c36991', '#597ea4', '#a48656']);
function _gkiteIndoor() { return !!(typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on); }
function _gkiteVisit() { return typeof gardenVisitOn === 'function' && gardenVisitOn(); }
function _gkiteOwnSlot() { return _gkiteVisit() ? typeof _glv !== 'undefined' ? _glv.w : null : 0; }
function _gkiteSpot() {
  if (!gardenActivityActive('wind-kite')) return null;
  if (_gkiteVisit() && _gkite.remote) return _gkite.remote.spot;
  if (_gkite.spot) return _gkite.spot;
  const now = performance.now(); if (now < _gkite.probeAt) return null;
  _gkite.probeAt = now + 1000;
  const points = [];
  for (let y = 18; y <= 20; y++) for (let x = 12; x <= 16; x++) points.push({ x: x + .5, y: y + .5 });
  points.sort((a, b) => Math.hypot(a.x - 14.5, a.y - 20.5) - Math.hypot(b.x - 14.5, b.y - 20.5));
  for (const p of points) {
    if (typeof _gwFree !== 'function' || !_gwFree(p.x, p.y) || typeof gardenWaterContainsPoint === 'function' && gardenWaterContainsPoint(p.x, p.y)) continue;
    _gkite.spot = p; return p;
  }
  return null;
}
function _gkiteEnsure() { if (!_gkite.id) _gkite.id = _gllNewId(); return _gkite.id; }
function _gkiteView() { if (!gardenActivityActive('wind-kite')) return null; return _gkiteVisit() ? _gkite.remote : { id: _gkiteEnsure(), spot: _gkiteSpot(), slots: [..._gkite.members.keys()] }; }
function _gkitePoint(w) {
  if (w === _gkiteOwnSlot()) return typeof _gw !== 'undefined' && _gw.on ? { x: _gw.px, y: _gw.py } : null;
  const A = typeof _gll !== 'undefined' && _gll.actors.get(w);
  return A && !A.me && Number.isFinite(A.x) && Number.isFinite(A.y) ? { x: A.x, y: A.y } : null;
}
function _gkiteGestureAllowed() {
  if (typeof _gw === 'undefined' || !_gw.on || !_gw.node || document.hidden || _gkiteIndoor() || _gw.moving || _gw.path.length || _gw.keys.size || _gw.hold || _gw.netting || _gw.casting || typeof _gwFishBusy === 'function' && _gwFishBusy()) return false;
  if (typeof gardenMotionOn === 'function' && !gardenMotionOn() || typeof _pe !== 'undefined' && _pe.H || typeof _GPL !== 'undefined' && _GPL.pose && Date.now() < _GPL.until) return false;
  if (typeof _gtgo !== 'undefined' && (_gtgo.on || _gtgo.hold || _gtgo.held) || typeof _gmo !== 'undefined' && _gmo.g) return false;
  const gear = typeof _gplMyGear === 'function' && _gplMyGear(), light = window.GardenNative && GardenNative.active() && GardenNative.lighting(), env = light && light.environment();
  return !(gear && gear.hd || env && (env.paused || env.reducedMotion));
}
function _gkiteGestureStop() {
  const H = _gkite.gesture; if (!H) return;
  _gkite.gesture = null; try { H.animation.cancel(); } catch (e) { /* its figure may have left */ }
}
function _gkiteGesture(take) {
  _gkiteGestureStop(); if (!_gkiteGestureAllowed()) return;
  const root = _gw.node.querySelector('.gpl'), arm = root && (root.querySelector('.gpl-af.is-r') || root.querySelector('.gpl-as.gpl-b'));
  if (!arm || arm.getAnimations().some(a => a.playState === 'running' || a.playState === 'paused')) return;
  // Use the idle figure's existing free-hand joint. The stock picking pose
  // carries a harvest basket; this gesture must not redraw tools or pose owners.
  const frames = take
    ? [{ transform: 'rotate(0deg)' }, { offset: .42, transform: 'rotate(-28deg)', easing: 'ease-out' }, { offset: .64, transform: 'rotate(-22deg)', easing: 'ease-in-out' }, { transform: 'rotate(0deg)' }]
    : [{ transform: 'rotate(0deg)' }, { offset: .45, transform: 'rotate(-15deg)', easing: 'ease-out' }, { offset: .7, transform: 'rotate(3deg)', easing: 'ease-in-out' }, { transform: 'rotate(0deg)' }];
  try {
    const animation = gardenVisualAnimate(arm, frames, { duration: take ? 620 : 460, easing: 'ease-in-out' }), H = { root, arm, animation, take, serial: ++_gkite.gestureSerial };
    _gkite.gesture = H;
    const done = () => { if (_gkite.gesture === H) _gkiteGestureStop(); };
    animation.onfinish = done; animation.oncancel = done;
  } catch (e) { /* the line remains accepted without a gesture */ }
}
function _gkiteGestureStep() {
  const H = _gkite.gesture;
  if (H && (!_gkiteGestureAllowed() || !H.arm.isConnected || _gw.node.querySelector('.gpl') !== H.root)) _gkiteGestureStop();
}
function _gkiteSend(to, ack) {
  const spot = _gkiteSpot();
  if (!spot || !_glh.on || _gll.role !== 'host') return;
  _gkite.sentAt = performance.now();
  const body = { c: 'kite', e: 'state', i: _gkiteEnsure(), x: Math.floor(spot.x), y: Math.floor(spot.y), l: [..._gkite.members.keys()].map(w => [w, 0, 0]) };
  if (ack) body.p = ack;
  return _glhSend(to || 'all', 'fx', body);
}
function gardenKiteHostStart() {
  const mine = _gkite.members.has(0);
  _gkite.id = _gllNewId(); _gkite.members.clear(); if (mine) _gkite.members.set(0, '');
  _gkite.seen.clear(); _gkite.remote = null; _gkite.pending = null;
}
function gardenKiteHostStop() {
  _gkiteGestureStop();
  _gkite.members.clear(); _gkiteSend('all');
  _gkite.id = ''; _gkite.seen.clear(); _gkite.pending = null;
}
function gardenKiteSend(fid) { return _gkiteSend(fid); }
function gardenKiteLeft(w) { if (_gkite.members.delete(w)) _gkiteSend('all'); }
function gardenKiteGuestClear() { _gkiteGestureStop(); _gkite.remote = null; _gkite.pending = null; }
function gardenKiteGuestState(ev) {
  if (!_gkiteVisit() || !_glvLive() || glFxOk(ev) || ev.c !== 'kite' || ev.e !== 'state') return;
  const wasJoined = !!(_gkite.remote && _gkite.remote.id === ev.i && _gkite.remote.slots.includes(_glv.w));
  _gkite.remote = { id: ev.i, spot: { x: ev.x + .5, y: ev.y + .5 }, slots: ev.l.map(r => r[0]) };
  if (_gkite.pending && ev.p === _gkite.pending.id) {
    const joined = _gkite.remote.slots.includes(_glv.w), wanted = _gkite.pending.take;
    if (wanted && !joined) wdWhisper('The line is still on the reel. Come closer, with Play access, and try again.', 5000);
    else if (joined) { if (typeof gardenSoapReleaseLocal === 'function') gardenSoapReleaseLocal(); if (typeof gardenLeafBoatReleaseLocal === 'function') gardenLeafBoatReleaseLocal(); wdWhisper('You have a line. Walk along the shore; spread out together to lift the kite.', 6500); }
    else wdWhisper('You let your line go.', 3000);
    if (_gkite.pending.animate && joined !== wasJoined && joined === wanted) _gkiteGesture(joined);
    _gkite.pending = null;
  }
  _gkitePost();
}
function gardenKiteHeard(A, ev) {
  if (_gll.role !== 'host' || !_glh.on || !A || ev.c !== 'kite' || !['take', 'letgo'].includes(ev.e) || glFxOk(ev)) return;
  const key = A.f + '|' + ev.i;
  if (_gkite.seen.has(key)) { _gkiteSend('all', ev.i); return; }
  _gkite.seen.set(key, true); if (_gkite.seen.size > 64) _gkite.seen.delete(_gkite.seen.keys().next().value);
  if (ev.p !== _gkiteEnsure()) { _gkiteSend(A.f, ev.i); return; }
  const spot = _gkiteSpot(), owns = _gkite.members.get(A.w) === A.f;
  if (ev.e === 'letgo') { if (owns) _gkite.members.delete(A.w); }
  else if (spot && glAtLeast(_glhPerm(A.f).lv, 'play') && Math.hypot(A.x - spot.x, A.y - spot.y) <= 2.4 && (_gkite.members.size < GL_PEOPLE || owns)) { _gkite.members.set(A.w, A.f); if (typeof gardenSoapLeft === 'function') gardenSoapLeft(A.w); if (typeof gardenLeafBoatLeft === 'function') gardenLeafBoatLeft(A.w); }
  _gkiteSend('all', ev.i); _gkitePost();
}
function _gkiteAsk(take) {
  if (!_glvLive() || !_gkite.remote) { wdWhisper('This garden has not opened its kite reel yet.', 4500); return; }
  if (take && !glAtLeast(_glv.lv, 'play')) { wdWhisper('The host needs to give you Play access before you take a kite line.', 5000); return; }
  if (_gkite.pending) return;
  const id = _gllNewId(); _gkite.pending = { id, take, animate: true, at: performance.now() };
  if (typeof _gllGoNow === 'function') _gllGoNow();
  gardenLiveFx('kite', take ? 'take' : 'letgo', { i: id, p: _gkite.remote.id });
}
function gardenKiteReleaseLocal() {
  _gkiteGestureStop();
  const view = _gkiteView(), own = _gkiteOwnSlot();
  if (!view || !view.slots.includes(own) && !(_gkiteVisit() && _gkite.pending && _gkite.pending.take)) return;
  if (_gkiteVisit()) {
    // A room or hidden-tab handoff can overtake the join acknowledgement.
    // Queue an explicit release after that request, rather than toggling it.
    const id = _gllNewId(); _gkite.pending = { id, take: false, at: performance.now() };
    gardenLiveFx('kite', 'letgo', { i: id, p: view.id });
  }
  else { _gkite.members.delete(0); _gkiteSend('all'); _gkitePost(); }
}
function gardenKiteClick() {
  const view = _gkiteView(), spot = view && view.spot, own = _gkiteOwnSlot();
  if (!spot || _gkiteIndoor() || typeof _gwFishBusy === 'function' && _gwFishBusy()) return;
  if (_gkiteVisit()) { _gkiteAsk(!view.slots.includes(own)); return; }
  if (_gkite.members.has(0)) { gardenKiteReleaseLocal(); _gkiteGesture(false); wdWhisper('You let your line go.', 3000); return; }
  if (!wdNear(spot.x, spot.y, 2.4)) return;
  _gkiteEnsure(); _gkite.members.set(0, ''); if (typeof gardenSoapReleaseLocal === 'function') gardenSoapReleaseLocal(); if (typeof gardenLeafBoatReleaseLocal === 'function') gardenLeafBoatReleaseLocal(); _gkiteSend('all'); _gkitePost();
  _gkiteGesture(true);
  wdWhisper('You have a line. Walk along the shore; a friend can take another at the reel.', 6500);
  wdSound([[392, .18, 'sine', .025], [587.33, .3, 'sine', .018, .08]]);
}
function _gkitePostSvg(count) {
  const flags = Array.from({ length: 4 }, (_, i) => `<path d="M${-14 + i * 9} -49l4 -7 5 7 -5 5z" fill="${GKITE_COLORS[i]}"/>`).join('');
  return '<ellipse cx="0" cy="2" rx="24" ry="6" fill="#263d37" opacity=".2"/>'
    + '<path d="M-22 0l3 -25h38l3 25z" fill="#856044"/><path d="M-18 -24l5 -9h26l5 9z" fill="#af8a5b"/>'
    + '<path d="M-12 -24v19m8 -19v19m8 -19v19m8 -19v19" stroke="#5d4636" stroke-width="1.4"/>'
    + '<path d="M-26 -14h52" stroke="#e3cea2" stroke-width="5"/><ellipse cy="-14" rx="10" ry="7" fill="#dfbd7c" stroke="#66503a" stroke-width="2"/>'
    + '<path d="M0 -20v12m-6 -6h12" stroke="#8c6642" stroke-width="1.2"/>'
    + '<path d="M-20 -28v-34M-23 -60h48" stroke="#795b3f" stroke-width="3"/>' + flags
    + '<rect x="-30" y="-78" width="60" height="17" rx="3" fill="#f3e4bd" stroke="#9e8058"/>'
    + '<text y="-66" text-anchor="middle" font-size="8" font-family="system-ui,sans-serif" font-weight="700" fill="#3c574c">WIND KITE</text>'
    + (count ? `<circle cx="24" cy="-18" r="8" fill="#f6e7b8" stroke="#8a7450"/><text x="24" y="-15" text-anchor="middle" font-size="9" font-family="system-ui,sans-serif" fill="#3c574c">${count}</text>` : '<path d="M9 -31l22 -18 7 22 -23 12z" fill="#da7852"/><path d="M9 -31l29 4m-7 -22l-16 34" stroke="#f4dc9b" stroke-width="1.6"/>');
}
function _gkiteSailSvg() {
  const ropes = Array.from({ length: GL_PEOPLE }, (_, i) => `<path class="gkite-rope-${i}" d="M0 0L0 0" fill="none" stroke="${GKITE_COLORS[i % GKITE_COLORS.length]}" stroke-width="1.25" opacity=".75"/>`).join('');
  return ropes + '<g class="gkite-fly"><g class="gkite-sail">'
    + '<path d="M-64 0Q-47 -43 5 -46L70 0 5 43Q-43 41 -64 0z" fill="#d7764c" stroke="#6d5542" stroke-width="2"/>'
    + '<path d="M-64 0L5 -46 16 0 5 43z" fill="#edb958"/><path d="M16 0L70 0 5 43z" fill="#4f9695"/>'
    + '<path d="M-60 0H65M5 -42l11 42 -11 39" fill="none" stroke="#f5e1b0" stroke-width="2"/>'
    + '<path d="M-36 -24Q-15 -10 -36 24M-15 -34Q7 -13 -15 33" fill="none" stroke="#a9573c" stroke-width="2"/>'
    + '<circle cx="40" cy="-8" r="8" fill="#fff2c8"/><circle cx="42" cy="-8" r="3.4" fill="#304e49"/><circle cx="43" cy="-9" r="1" fill="#fff"/>'
    + '<path d="M57 5q5 4 9 -1" fill="none" stroke="#5a5940" stroke-width="1.6"/>'
    + '<path d="M-58 -3l-29 -25 5 27 -6 27z" fill="#688eab" stroke="#4d6873" stroke-width="1.6"/>'
    + '<g class="gkite-tail-0"><path d="M-78 -4Q-110 -16 -129 6T-175 6" fill="none" stroke="#e5bc66" stroke-width="3"/><path d="M-104 -7l-8 -8 -5 12 10 -1zM-140 12l-7 -9 -6 12 10 -1z" fill="#d48268"/></g>'
    + '<g class="gkite-tail-1"><path d="M-79 3Q-111 17 -140 -2T-183 11" fill="none" stroke="#64a6a0" stroke-width="2.5"/><path d="M-119 8l-7 -10 -6 12 11 2zM-159 1l-8 -8 -4 12 9 -1z" fill="#e6ca7a"/></g>'
    + '<g class="gkite-tail-2"><path d="M-77 0Q-119 -2 -148 18T-188 20" fill="none" stroke="#cf7d8d" stroke-width="2"/></g>'
    + '</g><path d="M-13 0L0 16 17 0" fill="none" stroke="#f2e3bd" stroke-width="1.4"/></g>';
}
function _gkitePost() {
  const view = _gkiteView(), spot = view && view.spot || _gkiteSpot();
  if (!spot) { if (_gkite.S.post) { _gkite.S.post.remove(); _gkite.S.post = null; } return; }
  if (!_gkite.S.post && _wd.on) _gkite.S.post = wdSprite({ id: 'wd-wind-kite-reel', x: spot.x, y: spot.y, ground: true, foot: .18, hit: .65, hitUp: 22, still: true, cursor: 'hand', label: 'Wind kite — take a line and walk along the shore', svg: _gkitePostSvg(0), onClick: gardenKiteClick });
  const post = _gkite.S.post; if (!post) return;
  post.x = spot.x; post.y = spot.y;
  const n = view ? view.slots.length : 0, key = n + '|' + (_gkite.pending ? 'wait' : '') + '|' + (view && view.slots.includes(_gkiteOwnSlot()));
  if (_gkite.postKey !== key || post.dressed !== post.node) {
    _gkite.postKey = key; post.dressed = post.node; wdArt(post, _gkitePostSvg(n));
    post.label = _gkite.pending ? 'The host is holding the reel' : view && view.slots.includes(_gkiteOwnSlot()) ? 'Wind kite — let your line go' : 'Wind kite — take a line and walk along the shore';
  }
}
function _gkitePrune() {
  if (_gkiteVisit()) return;
  if (_gkite.spot && (!_gwFree(_gkite.spot.x, _gkite.spot.y) || typeof gardenWaterContainsPoint === 'function' && gardenWaterContainsPoint(_gkite.spot.x, _gkite.spot.y))) {
    _gkite.members.clear(); _gkite.spot = null; _gkite.probeAt = 0; _gkiteSpot(); _gkiteSend('all');
  }
  const spot = _gkiteSpot(); if (!spot) return;
  let changed = false;
  for (const [w, fid] of _gkite.members) {
    const p = _gkitePoint(w), A = w && _gll.actors.get(w);
    if (!p || w && (!A || A.f !== fid) || !w && _gkiteIndoor() || Math.hypot(p.x - spot.x, p.y - spot.y) > 7) { _gkite.members.delete(w); changed = true; }
  }
  if (changed) _gkiteSend('all');
}
function _gkiteAttr(node, key, value) { if (node && node.getAttribute(key) !== value) node.setAttribute(key, value); }
function _gkiteFrame(dt) {
  _gkiteGestureStep();
  if (_gkiteIndoor() || document.hidden) return;
  const view = _gkiteView(), spot = view && view.spot;
  if (!view || !spot || !view.slots.length) {
    if (_gkite.S.fly) { _gkite.S.fly.remove(); _gkite.S.fly = null; }
    _gkite.nodes = _gkite.nodeRoot = null; _gkite.lift = 0; return;
  }
  const light = window.GardenNative && GardenNative.active() && GardenNative.lighting(), env = light && light.environment();
  if (env && env.paused || typeof _ptw !== 'undefined' && _ptw.frozen) return;
  const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
  _gkite.frameAt += dt; if (_gkite.frameAt < 1 / 30) return;
  const elapsed = Math.min(.12, _gkite.frameAt); _gkite.frameAt = 0;
  const people = view.slots.map(w => ({ w, p: _gkitePoint(w) })).filter(r => r.p);
  if (!people.length) return;
  const W = GARDEN_WORLD, x = people.reduce((n, r) => n + r.p.x, spot.x) / (people.length + 1), y = people.reduce((n, r) => n + r.p.y, spot.y) / (people.length + 1);
  const spread = people.reduce((n, r) => n + Math.hypot(r.p.x - x, r.p.y - y), 0) / people.length;
  const time = env ? env.ambientTime / 1000 : _gkite.age += motion ? elapsed : 0, gust = env ? env.gust : .3, wx = env ? env.windX : .3;
  const lift = 104 + Math.min(110, (people.length - 1) * 30) + Math.min(100, spread * 24);
  _gkite.lift += (lift - _gkite.lift) * (motion ? 1 - Math.exp(-elapsed * 3) : 1);
  _gkite.driftX = wx * 75 + (motion ? Math.sin(time * .82) * 9 : 0); _gkite.driftY = motion ? Math.sin(time * 1.1 + .8) * 6 : 0;
  if (!_gkite.S.fly) _gkite.S.fly = wdSprite({ id: 'wd-wind-kite-sail', x, y, z: W.rows + 20, foot: .4, still: false, hit: 0, svg: _gkiteSailSvg() });
  const S = _gkite.S.fly; S.x = x + _gkite.driftX / W.cellW; S.y = y + _gkite.driftY / W.cellH; S.lift = _gkite.lift;
  if (!S.node) return;
  if (_gkite.nodeRoot !== S.node) {
    _gkite.nodeRoot = S.node; _gkite.nodes = { fly: S.node.querySelector('.gkite-fly'), sail: S.node.querySelector('.gkite-sail'), tails: [0, 1, 2].map(i => S.node.querySelector('.gkite-tail-' + i)), ropes: Array.from({ length: GL_PEOPLE }, (_, i) => S.node.querySelector('.gkite-rope-' + i)) };
  }
  const N = _gkite.nodes, lean = wx * 12 + (motion ? Math.sin(time * 1.5) * 3 : 0);
  _gkiteAttr(N.fly, 'transform', `rotate(${lean.toFixed(2)})`);
  _gkiteAttr(N.sail, 'transform', `scale(1 ${(motion ? .97 + Math.sin(time * 2.1) * .025 + gust * .035 : 1).toFixed(3)})`);
  N.tails.forEach((tail, i) => _gkiteAttr(tail, 'transform', `rotate(${(motion ? Math.sin(time * 2.2 - i * .9) * (5 + gust * 8) : 0).toFixed(2)} -78 0)`));
  N.ropes.forEach((rope, i) => {
    const row = people[i]; _gkiteAttr(rope, 'opacity', row ? '.7' : '0'); if (!row) return;
    const ax = (row.p.x - S.x) * W.cellW, ay = (row.p.y - S.y) * W.cellH - 33 + S.lift, cx = ax / 2 + wx * 8, cy = (ay + 15) / 2 + 18 + spread * 3;
    _gkiteAttr(rope, 'stroke', GKITE_COLORS[row.w % GKITE_COLORS.length]);
    _gkiteAttr(rope, 'd', `M${ax.toFixed(1)} ${ay.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} 0 15`);
  });
}
function gardenKiteState() {
  const view = _gkiteView();
  return { id: view && view.id || '', spot: view && view.spot || _gkiteSpot(), participants: view ? view.slots.slice() : [], own: _gkiteOwnSlot(), pending: !!_gkite.pending, lift: _gkite.lift, sharing: !!(_glh.on || _gkiteVisit() && _glvLive()), flying: !!_gkite.S.fly, gesture: _gkite.gesture ? _gkite.gesture.take ? 'take' : 'letgo' : null, gestureSerial: _gkite.gestureSerial };
}
if (window.GardenActivityCamera) GardenActivityCamera.define('wind-kite', () => {
  const S = _gkite.S.fly;
  if (!S || !S.node || !S.node.isConnected || _gkiteIndoor()) return null;
  const own = _gkiteOwnSlot(), view = _gkiteVisit() ? _gkite.remote : null;
  if (own == null || (view ? !view.slots.includes(own) : !_gkite.members.has(0))) return null;
  const W = GARDEN_WORLD;
  // Include the long tails and their wind-driven sweep, without measuring a
  // changing rope group or framing every distant participant.
  return { id: view ? view.id : _gkite.id, bounds: { x: S.x * W.cellW - 216, y: W.sky + S.y * W.cellH - S.lift - 96, width: 302, height: 192 } };
}, 10);
wdMod({
  id: 'wind-kite', fun: false, visit: true,
  begin() {
    _gkite.spot = null; _gkite.probeAt = 0; _gkite.postKey = ''; _gkite.nodes = _gkite.nodeRoot = null; _gkite.frameAt = 0; _gkite.lift = 0;
    const spot = _gkiteSpot(); if (!spot) return;
    _gkitePost();
  },
  painted() { _gkitePost(); },
  frame: _gkiteFrame,
  tick() {
    _gkitePrune(); _gkitePost();
    if (_gkite.members.size && _glh.on && performance.now() - _gkite.sentAt >= 12000) _gkiteSend('all');
    if (_gkite.pending && performance.now() - _gkite.pending.at > 6500) { _gkite.pending = null; wdWhisper('The reel has not answered yet. Try taking a line again.', 4500); }
  },
  end() {
    gardenKiteReleaseLocal(); for (const S of Object.values(_gkite.S)) if (S) S.remove();
    _gkite.S = {}; _gkite.spot = null; _gkite.probeAt = 0; _gkite.postKey = ''; _gkite.nodes = _gkite.nodeRoot = null; _gkite.lift = 0;
  },
});
gardenPlayAdd({ id: 'wind-kite', name: 'The wind kite', icon: 'flag', group: 'secret', blurb: 'Take a line at the west-shore reel. Walk together and watch the great fish kite climb.', status: () => { const v = _gkiteView(); return v && v.slots.length ? `${v.slots.length} holding a line` : 'Waiting for the wind'; }, open() { const spot = _gkiteSpot(); if (spot && typeof gardenWalkAct === 'function') gardenWalkAct({ x: spot.x, y: spot.y + .6 }, gardenKiteClick, { radius: 2.5, near: 70 }); else wdWhisper('The kite reel is on the west shore, near the front garden.', 5000); } });
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden && typeof _gw !== 'undefined' && _gw.on) gardenKiteReleaseLocal(); });

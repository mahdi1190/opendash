/* The marble workshop owns one small rail machine, not world physics. The
 * host advances its marble; visitors operate nearby handles and draw accepted
 * progress. Bell lanes, a return cup and a finish bridge make a spatial loop. */
const GMARBLE = Object.freeze({ repair: 2200, reach: 2.4, speed: 46, maxSpeed: 92 });
const GMAR_SCALE = .8;
const GMAR_WEATHER_WASHES = new Set(['prop:ca-evstorm', 'prop:ca-evfog', 'prop:ca-evmeteor', 'prop:ca-evblood-moon']);
const GMAR_HANDLES = Object.freeze([
  Object.freeze({ id: 'fork', dx: -3.1, dy: .2, up: 42, near: 2.4 }),
  Object.freeze({ id: 'bridge', dx: 3.1, dy: .2, up: 42, near: 2.4 }),
  Object.freeze({ id: 'crank', dx: -2.5, dy: 1.1, up: 32, near: 2.4 }),
  Object.freeze({ id: 'reset', dx: 1.5, dy: 1.1, up: 28, near: 2.4 }),
  Object.freeze({ id: 'guide', dx: 0, dy: 1.1, up: 30, near: 2.4 }),
].map(h => Object.freeze({ ...h, dx: h.dx * GMAR_SCALE, dy: h.dy * GMAR_SCALE, artUp: h.up, up: h.up * GMAR_SCALE })));
function _gmarRail(points) {
  const out = [], lengths = [0]; let length = 0;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, q = 1 - t; let p;
    if (points.length === 2) p = [q * points[0][0] + t * points[1][0], q * points[0][1] + t * points[1][1]];
    else if (points.length === 3) p = [q * q * points[0][0] + 2 * q * t * points[1][0] + t * t * points[2][0], q * q * points[0][1] + 2 * q * t * points[1][1] + t * t * points[2][1]];
    else p = [q ** 3 * points[0][0] + 3 * q * q * t * points[1][0] + 3 * q * t * t * points[2][0] + t ** 3 * points[3][0], q ** 3 * points[0][1] + 3 * q * q * t * points[1][1] + 3 * q * t * t * points[2][1] + t ** 3 * points[3][1]];
    if (i) { length += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]); lengths.push(length); } out.push(p);
  }
  return Object.freeze({ points: out, lengths, length, path: out.map((p, i) => (i ? 'L' : 'M') + p.map(n => n.toFixed(1)).join(' ')).join('') });
}
const GMAR_RAILS = Object.freeze([
  _gmarRail([[-125, -42], [-125, -175]]),
  _gmarRail([[-125, -175], [-90, -180], [-60, -158]]),
  _gmarRail([[-60, -158], [-10, -188], [125, -169], [112, -95]]),
  _gmarRail([[-60, -158], [-130, -112], [-76, -60], [112, -95]]),
  _gmarRail([[112, -95], [106, -54], [48, -52]]),
  _gmarRail([[48, -52], [-34, -18], [-125, -42]]),
  _gmarRail([[48, -52], [77, -25], [120, -30]]),
]);
const _gmar = { id: '', revision: 1, run: 0, phase: 0, segment: 5, distance: 0, speed: 0, fork: 0, bridge: 0, bells: 0, laps: 0, running: false, room: false, spot: null, lastSpot: null, suspended: false, approaches: [], placement: null, layout: { scene: null, stamp: '', signature: '', epoch: 0, scenery: null, failed: '', checked: '', searches: 0 }, probeAt: 0, sentAt: 0, frameAt: 0, visualLeft: 0, remote: null, pending: null, seen: new Map(), lastCommand: new Map(), sprites: new Map(), board: null, nodes: null, display: null, displayFork: 0, displayBridge: 0, bellFlash: [0, 0], paintKey: '', activeRail: '', focusAt: 0, panel: null, bounds: null, accepted: 0, rejected: 0, circuits: 0 };
function _gmarVisit() { return typeof gardenVisitOn === 'function' && gardenVisitOn(); }
function _gmarOwn() { return _gmarVisit() ? _glv.w : 0; }
function _gmarIndoor() { return _gmar.room || !!(typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on); }
function _gmarHeld() {
  const native = window.GardenNative, light = native && native.active() && native.lighting(), env = light && light.environment(), root = typeof _gw !== 'undefined' && _gw.svg;
  return !!(document.hidden || _gmarIndoor() || env && env.paused || root && (root.hasAttribute('data-garden-frozen') || root.classList.contains('gd-hush')));
}
function _gmarFree(x, y) { return _gwFree(x, y) && !gardenWaterContainsPoint(x, y) && gardenReachable(Math.floor(x), Math.floor(y)); }
function _gmarScenery() {
  const native = window.GardenNative, world = native && native.active() && native.world(), W = GARDEN_WORLD, rows = [];
  if (world && world.entities && world.entities.size) {
    // Retained drawing bounds are in stage space, including authored village
    // roofs and always-front gate arches. Actors and terrain are not blockers.
    for (const row of world.entities.values()) {
      const m = row.metadata || {}, b = row.bounds;
      if (!b || b.height < 48 || GMAR_WEATHER_WASHES.has(row.id) || !['prop', 'scenery', 'decor', 'plant', 'land'].includes(m.kind) || ![b.x, b.y, b.width, b.height].every(Number.isFinite)) continue;
      rows.push({ id: row.id, x: b.x, y: b.y, width: b.width, height: b.height, depth: row.depth, natural: !!m.tree });
    }
    _gmarOtherWorkshop(rows); return { source: 'retained', rows };
  }
  // Classic has no retained scenery index. Its authored tall-prop envelope is
  // still preferable to accepting a walking cell behind a roof.
  for (const p of gardenPropsNow()) {
    if (p.needs && !gardenWorkOwned(p.needs)) continue;
    const kind = p.art || p.kind || '', village = ['shop', 'tackle', 'lf-office'].includes(kind), height = village ? 230 : kind === 'board' ? 140 : kind === 'stall' ? 145 : kind === 'bench' ? 120 : kind === 'windmill' ? 265 : kind === 'falls' ? 255 : kind === 'gate' ? 160 : Math.max(48, (p.tall || 1) * W.cellH + 20);
    if (p.walk || !p.tall && !village && !['board', 'stall', 'bench', 'gate', 'windmill', 'falls'].includes(kind)) continue;
    const width = Math.max((p.w || 1) * W.cellW + 28, kind === 'gate' ? 180 : 0), x = (p.x + (p.w || 1) / 2) * W.cellW, foot = W.sky + (p.y + (p.h || 1)) * W.cellH;
    rows.push({ id: p.id, x: x - width / 2, y: foot - height, width, height: height + 14, depth: kind === 'gate' ? 76000 : foot, natural: false });
  }
  _gmarOtherWorkshop(rows); return { source: 'model', rows };
}
function _gmarOtherWorkshop(rows) {
  if (!gardenActivityActive('shadow-courtyard')) return;
  if (typeof _wsh === 'undefined') return;
  const a = typeof gardenShadowCourtyardAnchor === 'function' && gardenShadowCourtyardAnchor(), p = _wsh.centre || (a ? { x: a[0] / 100, y: a[1] / 100 } : { x: 35.5, y: 13.5 });
  rows.push({ id: 'activity:shadow-courtyard', x: p.x * GARDEN_WORLD.cellW - 117, y: GARDEN_WORLD.sky + p.y * GARDEN_WORLD.cellH - 205, width: 234, height: 286, depth: 76001, natural: false });
}
function _gmarClearSite(x, y, scenery) {
  const W = GARDEN_WORLD, s = GMAR_SCALE, px = x * W.cellW, py = W.sky + y * W.cellH, boxes = [
    { x: px - 175 * s, y: py - 203 * s, width: 350 * s, height: 181 * s },
    { x: px - 88 * s, y: py - 217 * s, width: 176 * s, height: 24 * s },
    ...GMAR_HANDLES.map(h => ({ x: px + h.dx * W.cellW - 23 * s, y: py + h.dy * W.cellH - h.up - 27 * s, width: 46 * s, height: 48 * s })),
  ], pad = 6;
  for (const row of scenery.rows) {
    // The normal world depth stays intact: rear planting cannot cover the
    // course. Roofs in front and always-front gate arches remain blockers.
    if (row.depth < py - 8) continue;
    for (const b of boxes) if (b.x < row.x + row.width + pad && b.x + b.width > row.x - pad && b.y < row.y + row.height + pad && b.y + b.height > row.y - pad) return row.id;
  }
  return '';
}
function _gmarSites() {
  const sites = [[21.5, 12.5], [19.5, 12.5], [20.5, 12.5], [20.5, 10.5], [20.5, 11.5], [22.5, 12.5], [24.5, 12.5], [29.5, 11.5], [10.5, 11.5], [46.5, 17.5]], seen = new Set(sites.map(p => p.join('|')));
  for (let y = 6.5; y <= 20.5; y++) for (let x = 5.5; x <= 46.5; x++) { const key = x + '|' + y; if (!seen.has(key)) { seen.add(key); sites.push([x, y]); } }
  return sites;
}
function _gmarMountDry(x, y) { return x > .25 && y > .25 && x < GARDEN_WORLD.cols - .25 && y < GARDEN_WORLD.rows - .25 && !gardenWaterContainsPoint(x, y); }
function _gmarApproach(x, y) {
  for (const d of [[-.9, .2], [.9, .2], [0, .6], [-.8, -.4], [.8, -.4], [0, -.6], [-1.3, .2], [1.3, .2], [0, -1.1], [-.8, -1.1], [.8, -1.1], [0, -1.6], [-1.4, -.6], [1.4, -.6]]) if (_gmarFree(x + d[0], y + d[1])) return { x: x + d[0], y: y + d[1] };
  return null;
}
function _gmarLayout(painted) {
  const L = _gmar.layout, native = window.GardenNative, world = native && native.active() && native.world(), scene = world || _gw.svg;
  const stamp = (_gw.grid && _gw.grid.routeRevision || 0) + '|' + (typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0) + '|' + (world && world.entities ? world.entities.size : 0);
  if (painted || scene !== L.scene || stamp !== L.stamp || !L.scenery) {
    const scenery = _gmarScenery(), signature = scenery.source + '|' + scenery.rows.map(r => [r.id, r.x, r.y, r.width, r.height, r.depth, r.natural ? 1 : 0].join(',')).join('|');
    if (scene !== L.scene || signature !== L.signature || stamp !== L.stamp) { L.epoch++; L.failed = L.checked = ''; _gmar.probeAt = 0; }
    // These are authored retained bounds, not current moving canopy transforms.
    // A normal repaint can compare them once without repeating any route scan.
    L.scene = scene; L.stamp = stamp; L.signature = signature; L.scenery = scenery;
  }
  return { key: L.epoch + '|' + L.stamp, scenery: L.scenery };
}
function _gmarForgetSite() { const L = _gmar.layout; L.scene = L.scenery = null; L.stamp = L.signature = L.failed = L.checked = ''; L.epoch++; _gmar.probeAt = 0; }
function _gmarRetrySite() { _gmar.layout.failed = _gmar.layout.checked = ''; _gmar.probeAt = 0; }
function _gmarPrepare() {
  if (!gardenActivityActive('marble-workshop')) return false;
  if (_gmarVisit()) return _gmar.remote;
  if (_gmar.spot) return true;
  if (!_gw.on) return false; const layout = _gmarLayout(false);
  if (_gmar.layout.failed === layout.key) return false;
  const now = performance.now(); if (now < _gmar.probeAt) return false; _gmar.probeAt = now + 1800; _gmar.layout.searches++;
  const scenery = layout.scenery, reasons = { centre: 0, scenery: 0, mount: 0, approach: 0 }; let tried = 0, blocker = '';
  for (const base of _gmarSites()) {
    tried++;
    if (!_gmarFree(base[0], base[1])) { reasons.centre++; continue; }
    blocker = _gmarClearSite(base[0], base[1], scenery); if (blocker) { reasons.scenery++; continue; }
    const approaches = [];
    for (const h of GMAR_HANDLES) {
      const x = base[0] + h.dx, y = base[1] + h.dy; if (!_gmarMountDry(x, y)) { reasons.mount++; break; }
      const at = _gmarApproach(x, y); if (!at) { reasons.approach++; break; } approaches.push(at);
    }
    if (approaches.length !== GMAR_HANDLES.length) continue;
    _gmar.spot = _gmar.lastSpot = { x: base[0], y: base[1] }; _gmar.approaches = approaches; _gmar.placement = { source: scenery.source, clear: true, tried, scenery: scenery.rows.length, blocker: '', reasons, searches: _gmar.layout.searches }; _gmar.layout.checked = _gmarLayout(false).key; _gmarEnsure(); return true;
  }
  _gmar.placement = { source: scenery.source, clear: false, tried, scenery: scenery.rows.length, blocker, reasons, searches: _gmar.layout.searches }; _gmar.layout.failed = _gmarLayout(false).key;
  return false;
}
function _gmarEnsure() { if (!_gmar.id) _gmar.id = _gllNewId(); return _gmar.id; }
function _gmarProgress() { return Math.max(0, Math.min(1, _gmar.distance / GMAR_RAILS[_gmar.segment].length)); }
function _gmarView() {
  if (!gardenActivityActive('marble-workshop')) return null;
  return _gmarVisit() ? _gmar.remote : _gmarPrepare() || _gmar.lastSpot ? { id: _gmarEnsure(), revision: _gmar.revision, run: _gmar.run, phase: _gmar.phase, segment: _gmar.segment, progress: _gmarProgress(), speed: _gmar.speed, fork: _gmar.fork, bridge: _gmar.bridge, bells: _gmar.bells, laps: _gmar.laps, running: _gmar.running, available: !!_gmar.spot, spot: _gmar.spot || _gmar.lastSpot, at: performance.now() } : null;
}
function _gmarTuple() { return [_gmar.run, _gmar.phase, _gmar.segment, Math.round(_gmarProgress() * 1000), Math.round(_gmar.speed * 10), _gmar.fork, _gmar.bridge, _gmar.bells, _gmar.laps, _gmar.running ? 1 : 0]; }
function gardenMarbleSend(fid, ack, refused) {
  if (_gmarVisit() || !_glh.on || _gll.role !== 'host') return;
  _gmarPrepare(); const spot = _gmar.spot || _gmar.lastSpot; if (!spot) return;
  const b = { c: 'marble', e: 'state', i: _gmarEnsure(), v: _gmar.revision.toString(36), x: Math.floor(spot.x), y: Math.floor(spot.y), mr: _gmarTuple() };
  if (ack) b.p = ack; if (!_gmar.spot) b.nw = 3; else if (refused) b.nw = 1;
  _gmar.sentAt = performance.now(); return _glhSend(fid || 'all', 'fx', b);
}
function _gmarChanged(ack) { _gmar.revision++; _gmar.visualLeft = 1.2; gardenMarbleSend('all', ack); _gmarRefresh(); }
function _gmarReset(clearRound) {
  if (clearRound) { _gmar.id = _gllNewId(); _gmar.run = 0; _gmar.seen.clear(); }
  _gmar.phase = 0; _gmar.segment = 5; _gmar.distance = GMAR_RAILS[5].length; _gmar.speed = 0; _gmar.bells = _gmar.laps = 0; _gmar.running = false; _gmar.run = (_gmar.run + 1) % 1000;
}
function gardenMarbleHostStart() { _gmar.id = _gllNewId(); _gmar.revision = 1; _gmar.seen.clear(); _gmar.lastCommand.clear(); _gmar.remote = _gmar.pending = null; _gmarReset(false); }
function gardenMarbleHostStop() { _gmarReset(true); _gmar.remote = _gmar.pending = null; _gmar.focusAt = 0; _gmarClose(); }
function gardenMarbleGuestClear() { _gmar.remote = _gmar.pending = _gmar.display = null; _gmar.focusAt = 0; _gmarClose(); }
function gardenMarbleLeft(w) { _gmar.lastCommand.delete(w); }
function gardenMarbleRoomChanged(on) { _gmar.room = !!on; if (on) { _gmar.focusAt = 0; _gmarClose(); } _gmarSyncRunning(); }
function _gmarSyncRunning() {
  if (_gmarVisit()) return;
  const running = _gmar.phase === 1 && !_gmarHeld(); if (running === _gmar.running) return;
  _gmar.running = running; _gmarChanged();
}
function gardenMarbleGuestState(ev) {
  if (!_gmarVisit() || !_glvLive() || ev.c !== 'marble' || ev.e !== 'state' || glFxOk(ev)) return;
  const r = ev.mr, old = _gmar.remote;
  _gmar.remote = { id: ev.i, revision: parseInt(ev.v, 36), spot: { x: ev.x + .5, y: ev.y + .5 }, available: ev.nw !== 3, run: r[0], phase: r[1], segment: r[2], progress: r[3] / 1000, speed: r[4] / 10, fork: r[5], bridge: r[6], bells: r[7], laps: r[8], running: !!r[9], at: performance.now() };
  _gmar.visualLeft = 1.2;
  if (!old || old.id !== ev.i || old.run !== r[0] || old.segment !== r[2] || old.running !== !!r[9] || r[1] !== 1) _gmar.display = null;
  if (old && old.id === ev.i) for (let i = 0; i < 2; i++) if (!(old.bells & 1 << i) && r[7] & 1 << i) _gmar.bellFlash[i] = .7;
  if (_gmar.pending && ev.p === _gmar.pending.id) { if (ev.nw) wdWhisper('Come beside that handle with a free hand and Play access.', 4500); else { _gmar.focusAt = performance.now(); _gmarReleaseOwnToys(); } _gmar.pending = null; }
  _gmarRefresh();
}
function _gmarPoint(segment, progress) {
  const rail = GMAR_RAILS[segment], d = Math.max(0, Math.min(1, progress)) * rail.length; let lo = 1, hi = rail.points.length - 1;
  while (lo < hi) { const m = lo + hi >> 1; if (rail.lengths[m] < d) lo = m + 1; else hi = m; }
  const a = rail.points[lo - 1], b = rail.points[lo], t = (d - rail.lengths[lo - 1]) / Math.max(.001, rail.lengths[lo] - rail.lengths[lo - 1]);
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, slope: (b[1] - a[1]) / Math.max(.001, Math.hypot(b[0] - a[0], b[1] - a[1])) };
}
function _gmarEnter(segment) { _gmar.segment = segment; _gmar.distance = 0; _gmar.speed = segment === 0 ? 45 : Math.max(38, Math.min(72, _gmar.speed)); }
function _gmarStep(dt) {
  if (!_gmar.running || _gmar.phase !== 1) return;
  const point = _gmarPoint(_gmar.segment, _gmarProgress());
  if (_gmar.segment !== 0) _gmar.speed = Math.max(32, Math.min(GMARBLE.maxSpeed, _gmar.speed + (point.slope * 60 + 10 - _gmar.speed * .15) * dt));
  const before = _gmarProgress(); _gmar.distance += _gmar.speed * dt; const after = _gmarProgress();
  if ((_gmar.segment === 2 || _gmar.segment === 3) && before < .57 && after >= .57) {
    const bit = _gmar.segment === 2 ? 1 : 2, fresh = !(_gmar.bells & bit); _gmar.bells |= bit;
    if (fresh) { _gmar.bellFlash[bit === 1 ? 0 : 1] = .7; wdSound([[_gmar.segment === 2 ? 660 : 880, .28, 'sine', .016]]); } _gmarChanged();
  }
  if (_gmar.distance < GMAR_RAILS[_gmar.segment].length) return;
  const old = _gmar.segment;
  if (old === 0) _gmarEnter(1);
  else if (old === 1) _gmarEnter(_gmar.fork ? 3 : 2);
  else if (old === 2 || old === 3) _gmarEnter(4);
  else if (old === 4) _gmarEnter(_gmar.bridge ? 6 : 5);
  else { _gmar.distance = GMAR_RAILS[old].length; _gmar.phase = old === 5 ? 2 : _gmar.bells === 3 ? 3 : 4; _gmar.speed = 0; _gmar.running = false; if (old === 5) { _gmar.laps = Math.min(99, _gmar.laps + 1); _gmar.circuits++; } else if (_gmar.phase === 3) wdSound([[523, .2, 'sine', .012], [784, .4, 'sine', .012, .1]]); }
  _gmarChanged();
}
function _gmarAllowed(A, h) {
  return !_gmarHeld() && !A.rm && !A.away && glAtLeast(A.w ? _glhPerm(A.f).lv : 'play', 'play') && !(A.g && (A.g.hd || A.g.bt)) && !A.photo && !(A.fish && A.fish.state !== 'idle') && Math.hypot(A.x - (_gmar.spot.x + h.dx), A.y - (_gmar.spot.y + h.dy)) <= h.near;
}
function _gmarApply(A, action, n, desired, ack) {
  const h = GMAR_HANDLES[action === 'set' ? n - 1 : action === 'roll' ? 2 : 3];
  if (!_gmarPrepare() || !h || !_gmarAllowed(A, h)) { _gmar.rejected++; if (A.w) gardenMarbleSend(A.f, ack, true); return false; }
  const now = performance.now(); if (now - (_gmar.lastCommand.get(A.w) || -Infinity) < 180) { if (A.w) gardenMarbleSend(A.f, ack, true); return false; }
  _gmar.lastCommand.set(A.w, now);
  if (action === 'set') { if (n === 1) _gmar.fork = desired; else _gmar.bridge = desired; }
  else if (action === 'reset') { _gmarReset(true); }
  else if (_gmar.phase === 0 || _gmar.phase === 2) { _gmar.phase = 1; _gmarEnter(0); _gmar.running = true; }
  else { if (A.w) gardenMarbleSend(A.f, ack, true); else wdWhisper(_gmar.phase === 1 ? 'The marble is already on its way.' : 'Use the recovery handle for a fresh run.', 4000); return false; }
  if (A.w) { if (typeof gardenSoapLeft === 'function') gardenSoapLeft(A.w); if (typeof gardenKiteLeft === 'function') gardenKiteLeft(A.w); }
  _gmar.accepted++; _gmarChanged(ack); return true;
}
function gardenMarbleHeard(A, ev) {
  if (!_glh.on || _gll.role !== 'host' || !A || ev.c !== 'marble' || ev.e === 'state' || glFxOk(ev)) return;
  const key = A.f + '|' + ev.i;
  if (_gmar.seen.has(key)) { gardenMarbleSend(A.f, ev.i, !_gmar.seen.get(key).ok); return; }
  const receipt = { ok: false }; _gmar.seen.set(key, receipt); if (_gmar.seen.size > 80) _gmar.seen.delete(_gmar.seen.keys().next().value);
  if (ev.p !== _gmarEnsure()) { gardenMarbleSend(A.f, ev.i, true); return; }
  receipt.ok = _gmarApply(A, ev.e, ev.n, ev.ql - 1, ev.i); _gmar.seen.set(key, receipt);
}
function _gmarBusy() {
  const g = typeof _gplMyGear === 'function' && _gplMyGear();
  return _gmarHeld() || _gw.casting || _gw.netting || _gwFishBusy() || g && (g.hd || g.bt) || typeof gardenLeafBoatHolding === 'function' && gardenLeafBoatHolding() || typeof _GPL !== 'undefined' && _GPL.pose && Date.now() < _GPL.until;
}
function _gmarReleaseOwnToys() { if (typeof gardenSoapReleaseLocal === 'function') gardenSoapReleaseLocal(); if (typeof gardenKiteReleaseLocal === 'function') gardenKiteReleaseLocal(); }
function gardenMarbleHandle(id) {
  const v = _gmarView(), index = GMAR_HANDLES.findIndex(h => h.id === id), h = GMAR_HANDLES[index]; if (!v || !h) return;
  if (id === 'guide') { gardenMarbleOpen(); return; }
  if (_gmarBusy()) { wdWhisper('Free your hand and come beside the workshop handle.', 4000); return; }
  if (!wdNear(v.spot.x + h.dx, v.spot.y + h.dy, h.near)) return;
  _gmar.focusAt = performance.now(); const action = index < 2 ? 'set' : index === 2 ? 'roll' : 'reset', desired = index === 0 ? 1 - v.fork : 1 - v.bridge;
  if (_gmarVisit()) {
    if (!_glvLive() || !glAtLeast(_glv.lv, 'play')) { wdWhisper('Play access lets you operate this garden\'s marble machine.', 4500); return; }
    if (_gmar.pending) return; const i = _gllNewId(); _gmar.pending = { id: i, action, at: performance.now() }; _gllGoNow();
    gardenLiveFx('marble', action, { i, p: v.id, ...(action === 'set' ? { n: index + 1, ql: desired + 1 } : {}) }); return;
  }
  if (_gmarApply({ w: 0, f: '', x: _gw.px, y: _gw.py, g: _gplMyGear() }, action, index + 1, desired)) _gmarReleaseOwnToys();
}
function _gmarBoardArt() {
  let s = '<ellipse cy="2" rx="174" ry="24" fill="#314535" opacity=".13"/><path d="M-148 -40L-155 4H-143L-131 -40M136 -40L145 4H157L151 -40" fill="#765b41" stroke="#594534" stroke-width="2"/><path d="M-172 -200Q0 -218 172 -200L164 -28Q0 -11 -164 -28Z" fill="#80634a" stroke="#513e30" stroke-width="4"/><path d="M-162 -192Q0 -207 162 -192L154 -37Q0 -21 -154 -37Z" fill="#d1b581" stroke="#e4c99a" stroke-width="2"/><path d="M-150 -183Q-20 -198 145 -184M-151 -115Q0 -129 151 -111M-148 -61Q0 -74 148 -58" fill="none" stroke="#9d7d51" stroke-width="1" opacity=".27"/>';
  for (let i = 0; i < GMAR_RAILS.length; i++) s += '<path d="' + GMAR_RAILS[i].path + '" fill="none" stroke="#745c46" stroke-width="13" stroke-linecap="round"/><path d="' + GMAR_RAILS[i].path + '" fill="none" stroke="' + (i === 2 ? '#b4d8dc' : i === 3 ? '#e4be73' : '#e8dcc0') + '" stroke-width="8" stroke-linecap="round"/><path class="gmar-rail-' + i + '" d="' + GMAR_RAILS[i].path + '" fill="none" stroke="#fff6c9" stroke-width="3" stroke-linecap="round" opacity="0"/>';
  s += '<path d="M-136 -180V-36M-114 -180V-36" stroke="#587878" stroke-width="3"/><g class="gmar-chain" stroke="#dfcda0" stroke-width="2"><path d="M-135 -162h20M-135 -142h20M-135 -122h20M-135 -102h20M-135 -82h20M-135 -62h20"/></g><g class="gmar-wheel" transform="translate(-125 -32)"><circle r="13" fill="#72918b" stroke="#3d5d59" stroke-width="3"/><path d="M-10 0H10M0 -10V10" stroke="#e8dec1" stroke-width="3"/></g>';
  s += '<path d="M-149 -36L-145 -76L-70 -150M149 -36L138 -48H57" fill="none" stroke="#6f7965" stroke-width="3"/><g transform="translate(-60 -158)"><g class="gmar-fork"><path d="M0 0L25 -7" stroke="#6a766c" stroke-width="7" stroke-linecap="round"/><path d="M0 0L25 -7" stroke="#f6ead0" stroke-width="3" stroke-linecap="round"/></g><circle r="5" fill="#ae8851" stroke="#644d35" stroke-width="2"/></g><g transform="translate(48 -52)"><g class="gmar-bridge"><path d="M-6 0L32 0" stroke="#63766b" stroke-width="10" stroke-linecap="round"/><path d="M-6 0L32 0" stroke="#eee5ca" stroke-width="5" stroke-linecap="round"/></g><circle r="5" fill="#b88b4e" stroke="#644d35" stroke-width="2"/></g>';
  for (let i = 0; i < 2; i++) { const p = _gmarPoint(i + 2, .57); s += '<g transform="translate(' + p.x.toFixed(1) + ' ' + (p.y - 16).toFixed(1) + ')"><path d="M-8 11V-4Q0 -16 8 -4V11" fill="none" stroke="#6d6750" stroke-width="2"/><g class="gmar-bell-' + i + '"><path d="M-6 5Q-4 1 -4 -2Q0 -9 4 -2Q4 1 6 5Z" fill="' + (i ? '#d9a954' : '#7eafb8') + '" stroke="#6a654b" stroke-width="1.2"/><circle cy="6" r="1.8" fill="#7b623d"/></g><circle class="gmar-lamp-' + i + '" cy="-13" r="4" fill="#7e806d" stroke="#fff1c9" stroke-width="1.3"/></g>'; }
  s += '<path d="M-138 -43Q-125 -24 -112 -43" fill="#c6b087" stroke="#735b43" stroke-width="3"/><path d="M106 -32Q120 -11 135 -32" fill="#789f8b" stroke="#4a6c59" stroke-width="3"/><path class="gmar-finish-star" d="M120 -28l2 -4 2 4 4 1-3 3 .5 4-3.5-2-3.5 2 .5-4-3-3Z" fill="#d3c297"/><rect x="-84" y="-215" width="168" height="19" rx="4" fill="#f0e4c8" stroke="#907650"/><text y="-202" text-anchor="middle" font-size="10" font-family="system-ui,sans-serif" fill="#4c6454" font-weight="700">THE MARBLE WORKSHOP</text><text class="gmar-status" y="-184" text-anchor="middle" font-size="8" font-family="system-ui,sans-serif" fill="#4e5d4a">Ring both bells. Return, then finish.</text><ellipse class="gmar-ball-shadow" rx="5.8" ry="2.5" fill="#3d5349" opacity=".3"/><g class="gmar-ball"><circle r="6.6" fill="#5c9fae" stroke="#376774" stroke-width="1.4"/><path d="M-5 -2Q0 -6 4 3Q0 6 -4 3" fill="none" stroke="#d2eeee" stroke-width="2"/><circle cx="-2" cy="-3" r="1.8" fill="#fff9e5"/></g>';
  return '<g transform="scale(' + GMAR_SCALE + ')">' + s + '</g>';
}
function _gmarControlArt(h) {
  const u = h.artUp, base = '<path d="M-5 0L-4 -' + (u + 2) + 'H4L5 0Z" fill="#937b58" stroke="#69573f" stroke-width="1.5"/><ellipse cy="1" rx="12" ry="4" fill="#536b4a" opacity=".15"/>';
  if (h.id === 'fork' || h.id === 'bridge') return base + '<circle cy="-' + u + '" r="16" fill="#d3c397" stroke="#6f7356" stroke-width="2.5"/><g class="gmar-handle" transform="translate(0 -' + u + ')"><path d="M-9 6L9 -6" stroke="#648875" stroke-width="5" stroke-linecap="round"/><circle cx="9" cy="-6" r="5" fill="' + (h.id === 'fork' ? '#7aaab6' : '#7f9d75') + '" stroke="#4e6d59" stroke-width="1.5"/></g><text class="gmar-handle-word" y="-' + (u + 23) + '" text-anchor="middle" font-size="8" font-family="system-ui,sans-serif" fill="#435c4c" stroke="#fff1d5" stroke-width=".3">' + (h.id === 'fork' ? 'BLUE' : 'RETURN') + '</text>';
  if (h.id === 'crank') return base + '<g class="gmar-crank" transform="translate(0 -' + u + ')"><circle r="15" fill="#819c89" stroke="#4c6b5a" stroke-width="3"/><path d="M-12 0H12M0 -12V12" stroke="#eadbb5" stroke-width="3"/><circle cx="11" r="4" fill="#c2a468"/></g><text y="-' + (u + 23) + '" text-anchor="middle" font-size="8" font-family="system-ui,sans-serif" fill="#435c4c" stroke="#fff1d5" stroke-width=".3">LIFT / ROLL</text>';
  return base + '<rect x="-17" y="-' + (u + 13) + '" width="34" height="26" rx="5" fill="' + (h.id === 'reset' ? '#c89976' : '#eee1bd') + '" stroke="#735f46" stroke-width="2"/><path d="' + (h.id === 'reset' ? 'M8 -' + u + 'A9 9 0 1 0 -5 -' + (u + 8) + 'M-5 -' + (u + 8) + 'v7h-7' : 'M-6 -' + (u + 4) + 'h12M-6 -' + u + 'h12M-6 -' + (u - 4) + 'h8') + '" fill="none" stroke="#596d50" stroke-width="2" stroke-linecap="round"/><text y="-' + (u + 20) + '" text-anchor="middle" font-size="8" font-family="system-ui,sans-serif" fill="#435c4c" stroke="#fff1d5" stroke-width=".3">' + (h.id === 'reset' ? 'RECOVER' : 'HOW TO PLAY') + '</text>';
}
function _gmarAttr(node, key, value) { if (node && node.getAttribute(key) !== value) node.setAttribute(key, value); }
function _gmarRefresh() {
  if (!_wd.on || !_gw.on || _gmarIndoor()) return; const v = _gmarView(); if (!v || !v.spot) return;
  if (!v.available) { _gmarRemove(); return; }
  const p = v.spot, W = GARDEN_WORLD; _gmar.bounds = { x: p.x * W.cellW - 180 * GMAR_SCALE, y: W.sky + p.y * W.cellH - 222 * GMAR_SCALE, width: 360 * GMAR_SCALE, height: 273 * GMAR_SCALE };
  if (!_gmar.board) _gmar.board = wdSprite({ id: 'wd-marble-board', x: p.x, y: p.y, ground: true, foot: 3.3, still: true, svg: _gmarBoardArt() });
  _gmar.board.x = p.x; _gmar.board.y = p.y;
  if (_gmar.board.node && (!_gmar.nodes || _gmar.nodes.root !== _gmar.board.node)) { const root = _gmar.board.node, q = s => root.querySelector(s); _gmar.nodes = { root, ball: q('.gmar-ball'), shadow: q('.gmar-ball-shadow'), fork: q('.gmar-fork'), bridge: q('.gmar-bridge'), wheel: q('.gmar-wheel'), chain: q('.gmar-chain'), status: q('.gmar-status'), star: q('.gmar-finish-star'), bells: [q('.gmar-bell-0'), q('.gmar-bell-1')], lamps: [q('.gmar-lamp-0'), q('.gmar-lamp-1')], rails: GMAR_RAILS.map((r, i) => q('.gmar-rail-' + i)), handles: new Map() }; _gmar.paintKey = ''; _gmar.activeRail = ''; _gmar.visualLeft = 1.2; }
  for (const h of GMAR_HANDLES) {
    let S = _gmar.sprites.get(h.id); if (!S) { S = wdSprite({ id: 'wd-marble-' + h.id, x: p.x + h.dx, y: p.y + h.dy, ground: true, foot: .15, still: true, hit: .38, hitUp: h.up, cursor: 'hand', svg: '<g transform="scale(' + GMAR_SCALE + ')">' + _gmarControlArt(h) + '</g>', onClick: () => gardenMarbleHandle(h.id) }); _gmar.sprites.set(h.id, S); } S.x = p.x + h.dx; S.y = p.y + h.dy;
    S.label = h.id === 'fork' ? 'Upper fork: ' + (v.fork ? 'amber bell lane; click for blue' : 'blue bell lane; click for amber') : h.id === 'bridge' ? 'Lower bridge: ' + (v.bridge ? 'finish cup; click for return' : 'return lift; click for finish') : h.id === 'crank' ? v.phase === 2 ? 'The return cup holds the marble. Crank for another circuit.' : 'Crank the lift to roll the marble' : h.id === 'reset' ? 'Recover the marble and clear both bell lamps' : 'How to play the marble workshop';
    if (_gmar.nodes && S.node) { const old = _gmar.nodes.handles.get(h.id); if (!old || old.root !== S.node) _gmar.nodes.handles.set(h.id, { root: S.node, joint: S.node.querySelector(h.id === 'crank' ? '.gmar-crank' : '.gmar-handle'), word: S.node.querySelector('.gmar-handle-word') }); }
  }
  const key = [v.phase, v.fork, v.bridge, v.bells, v.laps].join('|'); if (_gmar.paintKey === key) return; _gmar.paintKey = key;
  const N = _gmar.nodes; if (!N) return;
  const status = v.phase === 3 ? 'Both bells rang. Home in the star cup!' : v.phase === 4 ? 'A bell is missing. Recover and try another route.' : v.phase === 2 ? 'Caught safely. Change the fork, then crank again.' : v.phase === 1 ? 'Follow the marble. Blue + amber, then finish.' : 'Ring both bells. Return, then finish.';
  if (N.status.textContent !== status) N.status.textContent = status;
  _gmarAttr(N.star, 'fill', v.phase === 3 ? '#ffe49a' : '#d3c297');
  for (let i = 0; i < 2; i++) _gmarAttr(N.lamps[i], 'fill', v.bells & 1 << i ? i ? '#f1c96f' : '#9de4ea' : '#7e806d');
  for (const [id, word] of [['fork', v.fork ? 'AMBER' : 'BLUE'], ['bridge', v.bridge ? 'FINISH' : 'RETURN']]) { const h = N.handles.get(id), n = h && h.word; if (n && n.textContent !== word) n.textContent = word; }
}
function _gmarPaint(v, dt, motion) {
  const N = _gmar.nodes; if (!N) return;
  const rail = GMAR_RAILS[v.segment], age = _gmarVisit() && v.running ? Math.min(2.5, Math.max(0, (performance.now() - v.at) / 1000)) : 0, target = Math.min(1, v.progress + age * v.speed / rail.length);
  const key = v.id + '|' + v.run + '|' + v.segment;
  if (!_gmar.display || _gmar.display.key !== key) _gmar.display = { key, progress: target };
  const D = _gmar.display; D.progress += (target - D.progress) * Math.min(1, dt * 14); if (!v.running) D.progress = v.progress;
  const visual = motion ? D.progress : Math.round(D.progress * 8) / 8, point = _gmarPoint(v.segment, visual);
  _gmarAttr(N.ball, 'transform', 'translate(' + point.x.toFixed(2) + ' ' + (point.y - 5).toFixed(2) + ') rotate(' + (motion ? visual * rail.length * 9 : 0).toFixed(1) + ')');
  _gmarAttr(N.shadow, 'transform', 'translate(' + point.x.toFixed(2) + ' ' + (point.y + 1).toFixed(2) + ')');
  const step = motion ? Math.min(1, dt * 9) : 1; _gmar.displayFork += (v.fork - _gmar.displayFork) * step; _gmar.displayBridge += (v.bridge - _gmar.displayBridge) * step;
  _gmarAttr(N.fork, 'transform', 'rotate(' + (-16 + _gmar.displayFork * 176).toFixed(1) + ')'); _gmarAttr(N.bridge, 'transform', 'rotate(' + (158 - _gmar.displayBridge * 115).toFixed(1) + ')');
  for (const [id, angle, up] of [['fork', _gmar.displayFork * 80, 42], ['bridge', _gmar.displayBridge * 80, 42], ['crank', v.segment === 0 && motion ? visual * 360 : 0, 32]]) { const h = N.handles.get(id); if (h) _gmarAttr(h.joint, 'transform', 'translate(0 -' + up + ') rotate(' + angle.toFixed(1) + ')'); }
  _gmarAttr(N.wheel, 'transform', 'translate(-125 -32) rotate(' + (v.segment === 0 && motion ? visual * 360 : 0).toFixed(1) + ')'); _gmarAttr(N.chain, 'transform', 'translate(0 ' + (v.segment === 0 && motion ? visual * 20 % 20 : 0).toFixed(1) + ')');
  for (let i = 0; i < 2; i++) { _gmar.bellFlash[i] = Math.max(0, _gmar.bellFlash[i] - dt); _gmarAttr(N.bells[i], 'transform', 'rotate(' + (motion ? Math.sin(_gmar.bellFlash[i] * 34) * _gmar.bellFlash[i] * 18 : 0).toFixed(1) + ')'); }
  const activeKey = v.segment + '|' + v.phase; if (_gmar.activeRail !== activeKey) { for (let i = 0; i < N.rails.length; i++) _gmarAttr(N.rails[i], 'opacity', i === v.segment && v.phase === 1 ? '.85' : '0'); _gmar.activeRail = activeKey; }
}
function _gmarFrame(dt) {
  if (!_gmarVisit()) { _gmarSyncRunning(); if (_gmar.running) _gmarStep(Math.min(.08, dt)); }
  const active = _gmarVisit() ? _gmar.remote && _gmar.remote.phase === 1 : _gmar.phase === 1;
  if (!active && _gmar.visualLeft <= 0) return;
  if (_gmarHeld()) return;
  const v = _gmarView(); if (!v || !_gmar.board || !_gmar.nodes) return;
  if (Math.hypot(_gw.px - v.spot.x, _gw.py - v.spot.y) > 12) return;
  _gmar.frameAt += dt; if (_gmar.frameAt < 1 / 30) return; const elapsed = Math.min(.12, _gmar.frameAt); _gmar.frameAt = 0;
  _gmar.visualLeft = Math.max(0, _gmar.visualLeft - elapsed);
  _gmarPaint(v, elapsed, typeof gardenMotionOn !== 'function' || gardenMotionOn());
}
function _gmarClose() { if (_gmar.panel && _wd.talk === _gmar.panel) wdTalkClose(); _gmar.panel = null; }
function _gmarRemove() {
  for (const S of _gmar.sprites.values()) S.remove(); _gmar.sprites.clear(); if (_gmar.board) _gmar.board.remove();
  _gmar.board = _gmar.nodes = _gmar.display = _gmar.bounds = null; _gmar.paintKey = ''; _gmar.activeRail = '';
}
function _gmarCheckSpot() {
  if (_gmarVisit()) return;
  const p = _gmar.spot, layout = _gmarLayout(false); if (p && _gmar.layout.checked === layout.key) return;
  const scenery = layout.scenery, blocker = p && _gmarClearSite(p.x, p.y, scenery), invalid = p && (blocker || !_gmarFree(p.x, p.y) || GMAR_HANDLES.some((h, i) => !_gmarMountDry(p.x + h.dx, p.y + h.dy) || !_gmar.approaches[i] || !_gmarFree(_gmar.approaches[i].x, _gmar.approaches[i].y)));
  if (p) { _gmar.placement = { source: scenery.source, clear: !invalid, tried: _gmar.placement && _gmar.placement.tried || 1, scenery: scenery.rows.length, blocker: blocker || '', reasons: _gmar.placement && _gmar.placement.reasons, searches: _gmar.layout.searches }; _gmar.layout.checked = layout.key; }
  if (invalid) { _gmar.spot = null; _gmar.approaches = []; _gmar.probeAt = 0; _gmarReset(true); _gmarRemove(); _gmar.suspended = !_gmarPrepare(); _gmarChanged(); }
  else if (_gmar.suspended && _gmarPrepare()) { _gmar.suspended = false; _gmarChanged(); }
}
function gardenMarbleOpen() {
  const v = _gmarView(); if (!v || _gmarIndoor()) return; _gmar.focusAt = performance.now(); _gmarClose();
  _gmar.panel = wdTalk({ name: 'The marble workshop', at: v.spot, lines: ['One marble, two bell lanes. The left fork chooses BLUE or AMBER; the right bridge chooses RETURN or FINISH. Crank the lift and watch where the marble really goes. A return cup catches it safely while you change the next route. Ring both bell lamps across two circuits, then send it to the star cup. The recovery handle starts fresh. Friends with Play access can take different sides; there is no time limit.'], bye: 'Back to the board', onClose() { _gmar.panel = null; } });
}
function gardenMarbleState() {
  const v = _gmarView(); if (!v) return { id: '', ready: false, pending: !!_gmar.pending, placement: !_gmarVisit() ? _gmar.placement : null };
  return { ...v, ready: !!_gmar.board, phaseName: ['basket', 'rolling', 'caught', 'finished', 'incomplete'][v.phase], own: _gmarOwn(), pending: !!_gmar.pending, accepted: _gmar.accepted, rejected: _gmar.rejected, circuits: _gmar.circuits, placement: !_gmarVisit() ? _gmar.placement : null, handles: GMAR_HANDLES.map((h, i) => ({ id: h.id, x: v.spot.x + h.dx, y: v.spot.y + h.dy, hitUp: h.up, approach: !_gmarVisit() ? _gmar.approaches[i] : null })), ball: _gmarPoint(v.segment, v.progress), display: _gmar.display && { ..._gmar.display }, bounds: _gmar.bounds };
}
wdMod({ id: 'marble-workshop', fun: false, visit: true, begin() { _gmar.spot = _gmar.lastSpot = null; _gmar.suspended = false; _gmarForgetSite(); _gmar.room = false; _gmar.frameAt = 0; _gmar.paintKey = ''; _gmar.display = null; _gmarRefresh(); }, painted() { if (!_gmarVisit()) { _gmarLayout(true); _gmarCheckSpot(); } _gmarRefresh(); }, frame: _gmarFrame, tick() { _gmarCheckSpot(); _gmarRefresh(); if (!_gmarVisit() && _gmar.phase === 1 && performance.now() - _gmar.sentAt > GMARBLE.repair) gardenMarbleSend('all'); if (_gmar.pending && performance.now() - _gmar.pending.at > 6500) { _gmar.pending = null; wdWhisper('The workshop has not answered yet. Try the handle again.', 4000); } }, end() { _gmarClose(); _gmarRemove(); if (!_gmarVisit()) _gmarReset(true); _gmar.spot = _gmar.lastSpot = null; _gmar.suspended = false; _gmarForgetSite(); _gmar.focusAt = 0; _gmar.frameAt = 0; } });
gardenPlayAdd({ id: 'marble-workshop', name: 'The marble workshop', icon: 'circle-dot', group: 'secret', blurb: 'Crank one marble through two bell lanes. Work the physical fork and return bridge, then bring it home to the star cup.', status: () => { const v = _gmarView(); return v ? v.phase === 3 ? 'Home in the star cup' : (v.bells & 1 ? 'Blue' : 'No blue') + ' / ' + (v.bells & 2 ? 'amber' : 'no amber') : 'A wooden rail machine'; }, open() { if (!_gmarVisit()) _gmarRetrySite(); const v = _gmarView(); if (v) gardenWalkAct({ x: v.spot.x, y: v.spot.y + 1.7 }, gardenMarbleOpen, { radius: 2.5, near: 70 }); else wdWhisper('The workshop needs a clear stretch of dry ground. Try again after making room.', 5000); } });
if (window.GardenActivityCamera) GardenActivityCamera.define('marble', () => { const reading = _gmar.panel && _gmar.panel.el.isConnected; if (!_gmar.bounds || !_gmar.focusAt || _gmarIndoor() || document.hidden || performance.now() - _gmar.focusAt > 25000 && !reading) return null; const p = _gmarVisit() ? _gmar.remote && _gmar.remote.spot : _gmar.spot; return p && Math.hypot(_gw.px - p.x, _gw.py - p.y) < 9 ? { id: _gmarVisit() ? _gmar.remote.id : _gmar.id, bounds: _gmar.bounds, ...(reading ? { insetBottom: GardenActivityCamera.panelInset(_gmar.panel.el, _gw.box) } : {}) } : null; }, 40);
document.addEventListener('visibilitychange', () => { if (_gw.on) _gmarSyncRunning(); });

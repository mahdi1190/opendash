/* A two-wand soap film: stretch, steady, then agree to release. Only the host
 * advances its charge and accepts consent. Flight is a bounded shared visual. */
const GSOAP = Object.freeze({ steady: 4.2, minSpan: 1.3, maxSpan: 4.5, tearSpan: 5.2, range: 6.5, flight: 8.5, repair: 6000 });
const _gsoap = { id: '', revision: 1, members: new Map(), remote: null, pending: null, seen: new Map(), spot: null, lastSpot: null, suspended: false, probeAt: 0, charge: 0, phase: 0, reason: 0, strained: false, lastPoints: null, bucket: 0, flight: null, ownFlight: '', sentAt: 0, frameAt: 0, displayCharge: 0, displayFlight: null, bounds: null, S: { wands: new Map() }, nodes: {}, postKey: '', launches: 0, tears: 0 };
function _gsoapVisit() { return typeof gardenVisitOn === 'function' && gardenVisitOn(); }
function _gsoapOwn() { return _gsoapVisit() ? _glv.w : 0; }
function _gsoapIndoor() { return !!(typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on); }
function _gsoapEnsure() { if (!_gsoap.id) _gsoap.id = _gllNewId(); return _gsoap.id; }
function _gsoapSpot() {
  if (!gardenActivityActive('soap-film')) return null;
  if (_gsoapVisit() && _gsoap.remote) return _gsoap.remote.spot;
  if (_gsoap.spot) return _gsoap.spot;
  const now = performance.now(); if (now < _gsoap.probeAt) return null; _gsoap.probeAt = now + 1000;
  const rows = []; for (let y = 17; y <= 20; y++) for (let x = 39; x <= 42; x++) rows.push({ x: x + .5, y: y + .5 });
  rows.sort((a, b) => Math.hypot(a.x - 40.5, a.y - 18.5) - Math.hypot(b.x - 40.5, b.y - 18.5));
  for (const p of rows) if (_gwFree(p.x, p.y) && !gardenWaterContainsPoint(p.x, p.y)) { _gsoap.spot = _gsoap.lastSpot = p; return p; }
  return null;
}
function _gsoapView() { if (!gardenActivityActive('soap-film')) return null; return _gsoapVisit() ? _gsoap.remote : { id: _gsoapEnsure(), revision: _gsoap.revision.toString(36), spot: _gsoapSpot() || _gsoap.lastSpot, rows: [..._gsoap.members].map(([w, r]) => [w, r.yes ? 1 : 0, 0]), charge: _gsoap.charge, phase: _gsoap.phase, reason: _gsoap.reason, flight: _gsoap.flight }; }
function _gsoapPoint(w) {
  if (w === _gsoapOwn()) return _gw.on ? { x: _gw.px, y: _gw.py } : null;
  const A = _gll.actors.get(w); return A && !A.me && Number.isFinite(A.x) && Number.isFinite(A.y) ? { x: A.x, y: A.y } : null;
}
function gardenSoapHolding() { return _gsoapVisit() ? !!(_gsoap.remote && _gsoap.remote.rows.some(r => r[0] === _glv.w)) : _gsoap.members.has(0); }
function _gsoapBusy() {
  const gear = typeof _gplMyGear === 'function' && _gplMyGear();
  return _gsoapIndoor() || document.hidden || _gw.netting || _gw.casting || _gwFishBusy() || gear && (gear.hd || gear.bt) || typeof _pe !== 'undefined' && _pe.H || typeof _GPL !== 'undefined' && _GPL.pose && Date.now() < _GPL.until || typeof _gtgo !== 'undefined' && (_gtgo.on || _gtgo.hold || _gtgo.held) || typeof _gmo !== 'undefined' && _gmo.g;
}
function _gsoapSend(to, ack) {
  const spot = _gsoapSpot() || _gsoap.lastSpot; if (!spot || !_glh.on || _gll.role !== 'host') return;
  const b = { c: 'soap', e: 'state', i: _gsoapEnsure(), v: _gsoap.revision.toString(36), x: Math.floor(spot.x), y: Math.floor(spot.y), n: Math.round(_gsoap.charge * 100), ql: _gsoap.phase, nw: _gsoap.reason, l: [..._gsoap.members].map(([w, r]) => [w, r.yes ? 1 : 0, 0]) };
  if (ack) b.p = ack;
  if (_gsoap.flight) { const f = _gsoap.flight; b.sb = [f.id, Math.round(f.x * 10), Math.round(f.y * 10), f.r, Math.min(99, Math.floor(f.age * 10))]; }
  _gsoap.sentAt = performance.now(); return _glhSend(to || 'all', 'fx', b);
}
function _gsoapChanged(reason, ack) { _gsoap.revision++; _gsoap.reason = reason || 0; _gsoapSend('all', ack); _gsoapPost(); }
function _gsoapResetFilm() { _gsoap.charge = 0; _gsoap.bucket = 0; _gsoap.phase = _gsoap.members.size ? 1 : 0; _gsoap.lastPoints = null; _gsoap.strained = false; for (const r of _gsoap.members.values()) r.yes = false; }
function gardenSoapHostStart() {
  const own = _gsoap.members.get(0); _gsoap.members.clear(); if (own) _gsoap.members.set(0, own);
  _gsoap.id = _gllNewId(); _gsoap.revision = 1; _gsoap.flight = null; _gsoapResetFilm(); _gsoap.seen.clear(); _gsoap.remote = _gsoap.pending = null;
}
function gardenSoapHostStop() { _gsoap.members.clear(); _gsoap.flight = null; _gsoapResetFilm(); _gsoapChanged(); _gsoap.id = ''; _gsoap.seen.clear(); }
function gardenSoapSend(fid) { return _gsoapSend(fid); }
function gardenSoapLeft(w) { if (_gsoap.members.delete(w)) { _gsoapResetFilm(); _gsoapChanged(2); } }
function gardenSoapGuestClear() { _gsoap.remote = null; _gsoap.pending = null; _gsoap.ownFlight = ''; }
function gardenSoapGuestState(ev) {
  if (!_gsoapVisit() || !_glvLive() || ev.c !== 'soap' || ev.e !== 'state' || glFxOk(ev)) return;
  const old = _gsoap.remote, wasHolding = old && old.rows.some(r => r[0] === _glv.w), fresh = !old || old.id !== ev.i || old.revision !== ev.v;
  const flight = ev.sb ? { id: ev.sb[0], x: ev.sb[1] / 10, y: ev.sb[2] / 10, r: ev.sb[3], age: ev.sb[4] / 10, at: performance.now() } : null;
  _gsoap.remote = { id: ev.i, revision: ev.v, spot: { x: ev.x + .5, y: ev.y + .5 }, rows: ev.l, charge: ev.n / 100, phase: ev.ql, reason: ev.nw || 0, flight };
  if (flight && wasHolding) _gsoap.ownFlight = flight.id;
  if (_gsoap.pending && ev.p === _gsoap.pending.id) {
    const take = _gsoap.pending.e === 'take', joined = ev.l.some(r => r[0] === _glv.w);
    if (take && joined) { if (typeof gardenKiteReleaseLocal === 'function') gardenKiteReleaseLocal(); if (typeof gardenLeafBoatReleaseLocal === 'function') gardenLeafBoatReleaseLocal(); wdWhisper('Walk apart until the film opens. Stand still; when it shines blue, click your hand loop to release.', 8000); }
    else if (take) wdWhisper('The soap tray needs a free hand, Play access and room for another wand. Come closer and try again.', 6000);
    _gsoap.pending = null;
  }
  if (fresh && old && old.id === ev.i && ev.nw === 1) wdWhisper('The film tore. Come a little closer, then hold a steady span.', 5000);
  _gsoapPost();
}
function _gsoapPositions(view) {
  const points = view.rows.map(r => ({ w: r[0], yes: !!r[1], p: _gsoapPoint(r[0]) })).filter(r => r.p);
  if (points.length === 1) points.push({ w: -1, yes: true, p: { x: view.spot.x - 35 / GARDEN_WORLD.cellW, y: view.spot.y - .52 } });
  return points;
}
function _gsoapLaunch() {
  const view = _gsoapView(), points = _gsoapPositions(view); if (points.length !== 2) return;
  const W = GARDEN_WORLD, span = Math.hypot((points[0].p.x - points[1].p.x) * W.cellW, (points[0].p.y - points[1].p.y) * W.cellH) / W.cellW;
  const x = Math.round((points[0].p.x + points[1].p.x) * 5) / 10, y = Math.round((points[0].p.y + points[1].p.y) * 5) / 10;
  const f = { id: _gllNewId(), x, y, r: Math.round(Math.min(115, 32 + span * 18)), age: 0 };
  if (_gsoap.members.has(0)) _gsoap.ownFlight = f.id;
  _gsoap.flight = f; _gsoap.launches++; _gsoap.members.clear(); _gsoapResetFilm(); _gsoap.phase = 3; _gsoapChanged();
  wdSound([[660, .22, 'sine', .015], [880, .35, 'sine', .012, .06]]);
}
function _gsoapAccept(A, e, ack) {
  const spot = _gsoapSpot(), own = _gsoap.members.get(A.w), owns = !!own && own.f === A.f;
  if (e === 'letgo') { if (owns) { _gsoap.members.delete(A.w); _gsoapResetFilm(); } }
  else if (e === 'take' && !_gsoap.flight && spot && !_gsoap.members.has(A.w) && _gsoap.members.size < 2 && glAtLeast(A.w ? _glhPerm(A.f).lv : 'play', 'play') && Math.hypot(A.x - spot.x, A.y - spot.y) <= 2.4 && !(A.g && (A.g.hd || A.g.bt)) && !A.photo && !(A.fish && A.fish.state !== 'idle')) {
    _gsoap.members.set(A.w, { f: A.f, yes: false }); _gsoapResetFilm();
    if (A.w && typeof gardenKiteLeft === 'function') gardenKiteLeft(A.w);
    if (A.w && typeof gardenLeafBoatLeft === 'function') gardenLeafBoatLeft(A.w);
  } else if (e === 'release' && owns && _gsoap.phase === 2) {
    own.yes = true;
    if ([..._gsoap.members.values()].every(r => r.yes)) { _gsoapLaunch(); if (ack) _gsoapSend('all', ack); return; }
  }
  _gsoapChanged(0, ack);
}
function gardenSoapHeard(A, ev) {
  if (_gll.role !== 'host' || !_glh.on || !A || ev.c !== 'soap' || ev.e === 'state' || glFxOk(ev)) return;
  const key = A.f + '|' + ev.i; if (_gsoap.seen.has(key)) { _gsoapSend(A.f, ev.i); return; }
  _gsoap.seen.set(key, true); if (_gsoap.seen.size > 64) _gsoap.seen.delete(_gsoap.seen.keys().next().value);
  if (ev.p !== _gsoapEnsure()) { _gsoapSend(A.f, ev.i); return; }
  _gsoapAccept(A, ev.e, ev.i);
}
function _gsoapRequest(e, automatic) {
  if (!_glvLive() || !_gsoap.remote) { wdWhisper('This garden has not opened its soap tray yet.', 4500); return; }
  if (_gsoap.pending && !automatic) return;
  if (e !== 'letgo' && !glAtLeast(_glv.lv, 'play')) { wdWhisper('The host needs to give you Play access for the soap wands.', 4500); return; }
  const i = _gllNewId(); _gsoap.pending = { id: i, e, at: performance.now() };
  if (typeof _gllGoNow === 'function') _gllGoNow(); gardenLiveFx('soap', e, { i, p: _gsoap.remote.id });
}
function gardenSoapReleaseLocal() {
  if (_gsoap.pending && _gsoap.pending.e === 'letgo') return;
  if (!gardenSoapHolding() && !(_gsoap.pending && _gsoap.pending.e === 'take')) return;
  if (_gsoapVisit()) _gsoapRequest('letgo', true);
  else gardenSoapLeft(0);
}
function gardenSoapTake() {
  const view = _gsoapView(); if (!view || !view.spot || _gsoapBusy()) return;
  if (gardenSoapHolding()) { gardenSoapReleaseLocal(); wdWhisper('You lay your wand back in the tray.', 3500); return; }
  if (view.phase === 3) { wdWhisper('Watch this one float away, then dip another film.', 4500); return; }
  if (_gsoapVisit()) { _gsoapRequest('take'); return; }
  if (!wdNear(view.spot.x, view.spot.y, 2.4)) return;
  const before = _gsoap.members.has(0); _gsoapAccept({ w: 0, f: '', lv: 'play', x: _gw.px, y: _gw.py, g: _gplMyGear() }, 'take');
  if (!before && _gsoap.members.has(0)) { if (typeof gardenKiteReleaseLocal === 'function') gardenKiteReleaseLocal(); if (typeof gardenLeafBoatReleaseLocal === 'function') gardenLeafBoatReleaseLocal(); wdWhisper('Walk apart until the film opens. Stand still; when it shines blue, click your hand loop to release.', 8000); }
}
function gardenSoapConsent() {
  const v = _gsoapView(); if (!v || !gardenSoapHolding() || _gsoapBusy()) return;
  const row = v.rows.find(r => r[0] === _gsoapOwn());
  if (row && row[1]) { gardenSoapReleaseLocal(); wdWhisper('You withdraw your wand. The film settles back into the tray.', 5000); return; }
  if (v.phase !== 2) { wdWhisper('Open a span of film and stand steady. Let it shine blue before you release.', 5500); return; }
  if (_gsoapVisit()) _gsoapRequest('release'); else _gsoapAccept({ w: 0, f: '', lv: 'play', x: _gw.px, y: _gw.py }, 'release');
}
function _gsoapHostStep(dt) {
  if (_gsoapVisit()) return;
  if (_gsoap.flight) { _gsoap.flight.age += dt; if (_gsoap.flight.age >= GSOAP.flight) { _gsoap.flight = null; _gsoapResetFilm(); _gsoapChanged(); } return; }
  if (!_gsoap.members.size) return;
  const v = _gsoapView(), points = _gsoapPositions(v); if (points.length !== 2) return;
  const W = GARDEN_WORLD, span = Math.hypot((points[0].p.x - points[1].p.x) * W.cellW, (points[0].p.y - points[1].p.y) * W.cellH) / W.cellW;
  let speed = 0;
  if (_gsoap.lastPoints && dt > .001) for (let i = 0; i < 2; i++) speed = Math.max(speed, Math.hypot(points[i].p.x - _gsoap.lastPoints[i].x, (points[i].p.y - _gsoap.lastPoints[i].y) * W.cellH / W.cellW) / dt);
  _gsoap.lastPoints = points.map(r => ({ ...r.p }));
  if (span > GSOAP.tearSpan) { if (!_gsoap.strained) { _gsoapResetFilm(); _gsoap.strained = true; _gsoap.tears++; _gsoapChanged(1); } return; }
  if (span <= GSOAP.maxSpan) _gsoap.strained = false;
  if (_gsoap.phase === 2) return;
  const steady = span >= GSOAP.minSpan && span <= GSOAP.maxSpan && speed < .8;
  _gsoap.charge = Math.max(0, Math.min(1, _gsoap.charge + (steady ? dt / GSOAP.steady : -dt * .12)));
  if (_gsoap.charge >= 1) { _gsoap.phase = 2; _gsoapChanged(); return; }
  const bucket = Math.floor(_gsoap.charge * 4); if (bucket !== _gsoap.bucket) { _gsoap.bucket = bucket; _gsoapChanged(); }
}
function _gsoapPrune() {
  if (_gsoapVisit()) return;
  const spot = _gsoapSpot(); if (!spot) return;
  if (_gsoap.suspended) { _gsoap.suspended = false; _gsoapChanged(); }
  for (const [w, r] of [..._gsoap.members]) {
    const p = _gsoapPoint(w), A = w && _gll.actors.get(w);
    if (!p || w && (!A || A.f !== r.f || !glAtLeast(_glhPerm(r.f).lv, 'play') || A.g && (A.g.hd || A.g.bt) || A.photo || A.fish && A.fish.state !== 'idle') || !w && _gsoapBusy() || Math.hypot(p.x - spot.x, p.y - spot.y) > GSOAP.range) gardenSoapLeft(w);
  }
  if (!_gwFree(spot.x, spot.y) || gardenWaterContainsPoint(spot.x, spot.y)) { _gsoap.members.clear(); _gsoap.spot = null; _gsoap.probeAt = 0; _gsoapResetFilm(); if (_gsoap.flight) _gsoap.phase = 3; _gsoap.suspended = !_gsoapSpot(); _gsoapChanged(_gsoap.suspended ? 3 : 0); }
}
function _gsoapTroughSvg(count) {
  return '<ellipse cy="3" rx="31" ry="8" fill="#324c4a" opacity=".16"/><path d="M-30 -20L-25 2H25L30 -20z" fill="#997b62" stroke="#654e3e" stroke-width="2"/><ellipse cy="-20" rx="30" ry="11" fill="#b4dde1" stroke="#e3dcc0" stroke-width="3"/><ellipse cy="-21" rx="24" ry="7" fill="#e7f5e5" opacity=".65"/>'
    + '<g fill="none" stroke="#fff3df" stroke-width="1.2"><ellipse cx="-12" cy="-22" rx="5" ry="2"/><circle cx="4" cy="-24" r="3"/><ellipse cx="15" cy="-20" rx="5" ry="2"/></g><path d="M-26 -25L-33 -54M25 -24L33 -54" stroke="#d5b275" stroke-width="3"/>'
    + '<g fill="none" stroke="#b1c8bc" stroke-width="2.4"><ellipse cx="-35" cy="-64" rx="10" ry="13"/><ellipse cx="35" cy="-64" rx="10" ry="13"/></g><rect x="-35" y="-94" width="70" height="17" rx="3" fill="#f3e6c8" stroke="#a58b64"/><text y="-82" text-anchor="middle" fill="#45615a" font-family="system-ui,sans-serif" font-size="8" font-weight="700">SOAP FILM</text>'
    + (count ? `<circle cx="28" cy="-6" r="8" fill="#edf0c7" stroke="#79978c"/><text x="28" y="-3" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#405c53">${count}</text>` : '');
}
function _gsoapPost() {
  const v = _gsoapView(), spot = v && v.spot || _gsoapSpot(); if (!spot) return;
  if (v && v.reason === 3) { if (_gsoap.S.tray) { _gsoap.S.tray.remove(); _gsoap.S.tray = null; } return; }
  if (!_gsoap.S.tray && _wd.on) _gsoap.S.tray = wdSprite({ id: 'wd-soap-tray', x: spot.x, y: spot.y, ground: true, foot: .3, still: true, hit: .7, hitUp: 28, cursor: 'hand', label: 'Soap film — take a wand, spread out and stand steady', svg: _gsoapTroughSvg(0), onClick: gardenSoapTake });
  const S = _gsoap.S.tray; if (!S) return; S.x = spot.x; S.y = spot.y;
  const n = v ? v.rows.length : 0, key = n + '|' + (v && v.phase);
  if (_gsoap.postKey !== key) { _gsoap.postKey = key; wdArt(S, _gsoapTroughSvg(n)); }
}
function _gsoapFilmSvg() { return '<path class="gsoap-film" d="M0 0L1 0L0 1z" fill="#9bd9db" fill-opacity=".17" stroke="#d1f5ed" stroke-width="1.5"/><path class="gsoap-pink" d="M0 0L1 0" fill="none" stroke="#edb4ce" stroke-width="3" opacity=".7"/><path class="gsoap-gold" d="M0 0L1 0" fill="none" stroke="#f2dc94" stroke-width="2.3" opacity=".75"/><path class="gsoap-blue" d="M0 0L1 0" fill="none" stroke="#99d9e8" stroke-width="4" opacity=".55"/><path class="gsoap-shine" d="M0 0L1 0" fill="none" stroke="#fff9e8" stroke-width="2.2" opacity=".8"/><path class="gsoap-gauge" d="M0 0L1 0" fill="none" stroke="#74b8c8" stroke-width="3.2"/><text class="gsoap-word" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#385e60" stroke="#fff8e3" stroke-width=".3">Stand steady</text>'; }
function _gsoapBubbleSvg() { return '<g class="gsoap-bubble"><circle r="50" fill="#badde0" fill-opacity=".1" stroke="#c9f6ed" stroke-width="1.1"/><path d="M-43 -22A48 48 0 0 1 15 -46" fill="none" stroke="#f6c6df" stroke-width="2.8" opacity=".8"/><path d="M17 -45A48 48 0 0 1 43 22" fill="none" stroke="#b6e7f5" stroke-width="3.2" opacity=".8"/><path d="M41 25A48 48 0 0 1 -24 42" fill="none" stroke="#f4e49d" stroke-width="2.5" opacity=".8"/><path d="M-28 39A48 48 0 0 1 -45 -13" fill="none" stroke="#bbd1f1" stroke-width="2.8" opacity=".75"/><path d="M-32 -24Q-23 -40 -9 -39" fill="none" stroke="#fffdf2" stroke-width="4.3" stroke-linecap="round" opacity=".85"/><path d="M-33 -17L-36 -11" fill="none" stroke="#fffdf2" stroke-width="2" stroke-linecap="round" opacity=".8"/><path d="M-35 18Q-7 35 22 17Q32 10 39 13" fill="none" stroke="#aad2d3" stroke-width="1.3" opacity=".4"/><ellipse cx="18" cy="29" rx="12" ry="4" fill="#f6d2dc" opacity=".15"/></g>'; }
function _gsoapAttr(n, k, v) { if (n && n.getAttribute(k) !== v) n.setAttribute(k, v); }
function _gsoapWands(v) {
  const wanted = new Set(v.rows.map(r => r[0]));
  for (const [w, S] of _gsoap.S.wands) if (!wanted.has(w)) { S.remove(); _gsoap.S.wands.delete(w); }
  for (const row of v.rows) {
    const w = row[0], p = _gsoapPoint(w); if (!p) continue; const me = w === _gsoapOwn(); let S = _gsoap.S.wands.get(w);
    if (!S) { S = wdSprite({ id: 'wd-soap-wand-' + w, x: p.x + .24, y: p.y, lift: 34, foot: .08, still: true, hit: me ? .36 : 0, hitUp: 8, cursor: 'hand', label: 'Your soap wand — click when the film shines blue', svg: '<path d="M-2 6L1 -9" stroke="#c69e63" stroke-width="3" stroke-linecap="round"/><ellipse class="gsoap-hoop" cy="-14" rx="7" ry="10" fill="#bce5e0" fill-opacity=".2" stroke="#d5eae1" stroke-width="2"/><circle class="gsoap-ready" cx="8" cy="-20" r="3" fill="#edcb77" opacity="0"/>', onClick: gardenSoapConsent }); _gsoap.S.wands.set(w, S); }
    S.x = p.x + .24; S.y = p.y; S.lift = 34;
    if (S.node) { _gsoapAttr(S.node.querySelector('.gsoap-hoop'), 'stroke', v.phase === 2 ? '#8ad9eb' : '#d5eae1'); _gsoapAttr(S.node.querySelector('.gsoap-ready'), 'opacity', row[1] ? '1' : '0'); }
    S.label = row[1] ? 'Your soap wand — waiting for your partner; click to withdraw' : v.phase === 2 ? 'Your soap wand — let the bubble fly' : 'Your soap wand — open the film and stand steady';
  }
}
function _gsoapRenderFilm(v, dt, env, motion) {
  const points = _gsoapPositions(v); if (points.length !== 2) return;
  const W = GARDEN_WORLD, x = (points[0].p.x + points[1].p.x) / 2 + .24, y = (points[0].p.y + points[1].p.y) / 2;
  if (!_gsoap.S.film) _gsoap.S.film = wdSprite({ id: 'wd-soap-film', x, y, lift: 48, foot: .2, z: W.rows + 18, still: false, svg: _gsoapFilmSvg() });
  const S = _gsoap.S.film; S.x = x; S.y = y; S.lift = 48;
  const ax = (points[0].p.x + .24 - x) * W.cellW, ay = (points[0].p.y - y) * W.cellH + 3, bx = (points[1].p.x + (points[1].w < 0 ? 0 : .24) - x) * W.cellW, by = (points[1].p.y - y) * W.cellH + 3;
  const span = Math.hypot(bx - ax, by - ay), t = env ? env.ambientTime / 1000 : 0;
  _gsoap.displayCharge += (v.charge - _gsoap.displayCharge) * Math.min(1, dt * 4);
  const belly = Math.min(65, 8 + span * .18 + _gsoap.displayCharge * 14), sway = motion ? Math.sin(t * 1.7) * 3 : 0, midX = (ax + bx) / 2, midY = (ay + by) / 2;
  const top = `M${ax.toFixed(1)} ${ay.toFixed(1)}Q${midX.toFixed(1)} ${(midY - belly + sway).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`, bottom = `Q${midX.toFixed(1)} ${(midY + belly + sway).toFixed(1)} ${ax.toFixed(1)} ${ay.toFixed(1)}Z`;
  if (S.node) {
    if (_gsoap.nodes.filmRoot !== S.node) { _gsoap.nodes.filmRoot = S.node; for (const k of ['film', 'pink', 'gold', 'blue', 'shine', 'gauge', 'word']) _gsoap.nodes[k] = S.node.querySelector('.gsoap-' + k); }
    const N = _gsoap.nodes; _gsoapAttr(N.film, 'd', top + bottom); _gsoapAttr(N.pink, 'd', top); _gsoapAttr(N.gold, 'd', `M${bx.toFixed(1)} ${by.toFixed(1)}${bottom}`);
    _gsoapAttr(N.blue, 'd', `M${(ax + 2).toFixed(1)} ${(ay + 1).toFixed(1)}Q${midX.toFixed(1)} ${(midY + belly * .5 + sway).toFixed(1)} ${(bx - 2).toFixed(1)} ${(by + 1).toFixed(1)}`);
    _gsoapAttr(N.shine, 'd', `M${(ax * .7 + bx * .3).toFixed(1)} ${(midY - belly * .52).toFixed(1)}Q${midX.toFixed(1)} ${(midY - belly * .78).toFixed(1)} ${(ax * .3 + bx * .7).toFixed(1)} ${(midY - belly * .52).toFixed(1)}`);
    const extent = Math.max(8, Math.min(38, span / 3)); _gsoapAttr(N.gauge, 'd', `M${(midX - extent).toFixed(1)} ${(midY + belly + 10).toFixed(1)}h${(extent * 2 * _gsoap.displayCharge).toFixed(1)}`);
    _gsoapAttr(N.word, 'x', midX.toFixed(1)); _gsoapAttr(N.word, 'y', (midY + belly + 24).toFixed(1));
    const text = v.phase === 2 ? v.rows.some(r => r[1]) ? 'Waiting for both hands' : 'Ready — click your hand loop' : span / W.cellW > GSOAP.tearSpan ? 'Too far — come closer' : span / W.cellW < GSOAP.minSpan ? 'Walk apart to open the film' : 'Stand steady'; if (N.word.textContent !== text) N.word.textContent = text;
  }
  _gsoap.bounds = { x: x * W.cellW + Math.min(ax, bx) - 12, y: W.sky + y * W.cellH - 48 + midY - belly - 12, width: Math.max(32, Math.abs(bx - ax) + 24), height: belly * 2 + 52 };
}
function _gsoapRenderFlight(f, dt, env, motion) {
  if (!_gsoap.displayFlight || _gsoap.displayFlight.id !== f.id) _gsoap.displayFlight = { ...f };
  const d = _gsoap.displayFlight, target = f.age + (f.at == null ? 0 : Math.max(0, performance.now() - f.at) / 1000); d.age += dt; d.age += Math.max(-dt * .25, Math.min(dt * .25, target - d.age));
  if (!_gsoap.S.bubble || _gsoap.S.bubble.flightId !== f.id) { if (_gsoap.S.bubble) _gsoap.S.bubble.remove(); _gsoap.S.bubble = wdSprite({ id: 'wd-soap-bubble', flightId: f.id, x: f.x, y: f.y, lift: 45, foot: .5, z: GARDEN_WORLD.rows + 19, still: false, svg: _gsoapBubbleSvg() }); }
  const S = _gsoap.S.bubble, age = Math.min(GSOAP.flight, d.age), breeze = env ? env.windX : .3;
  S.x = f.x + (motion ? age * (.15 + breeze * .45) : 0); S.y = f.y + (motion ? Math.sin(age * .45) * .2 : 0); S.lift = 45 + (motion ? age * 17 : 0); S.alpha = Math.min(1, Math.max(0, (GSOAP.flight - age) / .8));
  const rx = f.r / 50 * (motion ? 1 + Math.sin(age * 2.2) * .025 : 1), ry = f.r / 50 * (motion ? 1 - Math.sin(age * 2.2) * .02 : 1);
  if (S.node) { _gsoapAttr(S.node.querySelector('.gsoap-bubble'), 'transform', `scale(${rx.toFixed(3)} ${ry.toFixed(3)})`); _gsoapAttr(S.node, 'opacity', S.alpha.toFixed(3)); }
  _gsoap.bounds = { x: S.x * GARDEN_WORLD.cellW - f.r - 10, y: GARDEN_WORLD.sky + S.y * GARDEN_WORLD.cellH - S.lift - f.r - 10, width: f.r * 2 + 20, height: f.r * 2 + 20 };
}
function _gsoapFrame(dt) {
  if (_gsoapIndoor() || document.hidden) return;
  if (_gsoapVisit() && gardenSoapHolding() && _gsoapBusy()) gardenSoapReleaseLocal();
  const light = window.GardenNative && GardenNative.active() && GardenNative.lighting(), env = light && light.environment(); if (env && env.paused) return;
  const active = _gsoapVisit() ? _gsoap.remote && (_gsoap.remote.rows.length || _gsoap.remote.flight) : _gsoap.members.size || _gsoap.flight;
  if (!active) { for (const k of ['film', 'bubble']) if (_gsoap.S[k]) { _gsoap.S[k].remove(); _gsoap.S[k] = null; } for (const S of _gsoap.S.wands.values()) S.remove(); _gsoap.S.wands.clear(); _gsoap.displayFlight = null; _gsoap.bounds = null; return; }
  _gsoapHostStep(dt); const v = _gsoapView(); if (!v || !v.spot) return;
  _gsoap.frameAt += dt; if (_gsoap.frameAt < 1 / 30) return; const elapsed = Math.min(.12, _gsoap.frameAt); _gsoap.frameAt = 0;
  _gsoapWands(v); const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
  if (v.flight) { if (_gsoap.S.film) { _gsoap.S.film.remove(); _gsoap.S.film = null; } _gsoapRenderFlight(v.flight, elapsed, env, motion); }
  else { if (_gsoap.S.bubble) { _gsoap.S.bubble.remove(); _gsoap.S.bubble = null; } _gsoap.displayFlight = null; if (v.rows.length) _gsoapRenderFilm(v, elapsed, env, motion); }
}
function gardenSoapState() { const v = _gsoapView(); return { id: v && v.id || '', spot: v && v.spot || _gsoapSpot(), holders: v ? v.rows.map(r => ({ w: r[0], consent: !!r[1] })) : [], own: _gsoapOwn(), charge: v ? v.charge : 0, phase: ['idle', 'film', 'ready', 'flight'][v ? v.phase : 0], flight: v && v.flight ? { ...v.flight } : null, pending: !!_gsoap.pending, launches: _gsoap.launches, tears: _gsoap.tears, bounds: _gsoap.bounds }; }
wdMod({ id: 'soap-film', fun: false, visit: true, begin() { _gsoap.spot = null; _gsoap.lastSpot = null; _gsoap.suspended = false; _gsoap.probeAt = 0; _gsoap.postKey = ''; _gsoap.frameAt = 0; _gsoapPost(); }, painted: _gsoapPost, frame: _gsoapFrame, tick() { _gsoapPrune(); _gsoapPost(); if ((_gsoap.members.size || _gsoap.flight) && _glh.on && performance.now() - _gsoap.sentAt > GSOAP.repair) _gsoapSend('all'); if (_gsoap.pending && performance.now() - _gsoap.pending.at > 6500) { _gsoap.pending = null; wdWhisper('The soap tray has not answered yet. Try again in a moment.', 4000); } }, end() { gardenSoapReleaseLocal(); for (const S of _gsoap.S.wands.values()) S.remove(); for (const k of ['tray', 'film', 'bubble']) if (_gsoap.S[k]) _gsoap.S[k].remove(); _gsoap.S = { wands: new Map() }; _gsoap.nodes = {}; _gsoap.spot = _gsoap.lastSpot = null; _gsoap.bounds = null; _gsoap.ownFlight = ''; _gsoap.postKey = ''; } });
gardenPlayAdd({ id: 'soap-film', name: 'Giant soap films', icon: 'circle', group: 'secret', blurb: 'Open a film between two wands, stand steady, then agree to let a giant bubble fly. A tray holds one side when you play alone.', status: () => gardenSoapHolding() ? 'A wand in your hand' : 'Two hands and a little patience', open() { const p = _gsoapSpot(); if (p) gardenWalkAct({ x: p.x, y: p.y + .6 }, gardenSoapTake, { radius: 2.5, near: 70 }); } });
if (window.GardenActivityCamera) GardenActivityCamera.define('soap', () => { if (!_gsoap.bounds) return null; const v = _gsoapView(); return v && (gardenSoapHolding() || v.flight && v.flight.id === _gsoap.ownFlight) ? { id: v.flight ? v.flight.id : v.id, bounds: _gsoap.bounds } : null; }, 20);
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden && _gw.on) gardenSoapReleaseLocal(); });

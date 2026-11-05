/* Requested discoveries: the owner supplies paths and one petplay endpoint.
 * A visitor follows ordinary pp; it never runs a second guide controller.
 * This file sorts before roam/routines, so top-level rows contain data only. */
const PET_GUIDES = Object.freeze({
  owl: { kind: 'lookout', clip: 'guide-owl', pace: .95, hint: 'An owl knows a place to look out from.' },
  otter: { kind: 'shore', clip: 'guide-otter', pace: 1, hint: 'An otter knows where to watch the water.' },
  fox: { kind: 'scent', clip: 'guide-fox', pace: .85, hint: 'A fox follows the garden’s quieter scents.' },
  rabbit: { kind: 'listen', clip: 'guide-rabbit', pace: .8, hint: 'A rabbit knows a quiet place to listen.' },
});
let _ptwGuideSerial = 0;
function petGardenGuideClipId(name) { return /^guide-(owl|otter|fox|rabbit)$/.test(String(name)); }
function petGardenGuideStopId(name) { return /^guide-stop-(owl|otter|fox|rabbit)$/.test(String(name)); }
function petGardenGuideBusy(P) { return !!(P && (P.guide || P.guideInvite || P.guideReturn || P.guidePresentation && P.root === P.guidePresentation.root && P.root && P.root._pcH === P.guidePresentation.clip)); }
function petGardenGuideOwns(P) { return !!(P && (P.guide || P.guideInvite || P.guideReturn || P.guideNoWarp && P.cb || _ptwGuidePatOwns(P, P.guidePat))); }
/** A pat's actual body/callback may finish before its small ordinary settle.
 * Keep only that live response ahead of passive wildlife/follow decisions. */
function _ptwGuidePatOwns(P, response) {
  if (!response || P.guidePat !== response || response.scene !== _ptw.svg || performance.now() >= response.until || P.root !== response.root || P.cb && P.cb !== response.pat) return false;
  const clip = P.root && P.root._pcH;
  if (clip && clip !== response.clip) return false;
  return !!(response.pat && P.cb === response.pat || response.clip && P.clipH === response.clip && clip === response.clip);
}
function _ptwGuideMayQueue(P, W, response) {
  if (!_ptwGuideContext(P, W, true) || P.wow || P.act || P.environmentPlay || P.puddlePlayInvite || P.guide || P.guideReturn || P.fishingWatch || P.fishingReturn || P.tx != null || P.arrive || P.pose === 'sleep') return false;
  return _ptwGuidePatOwns(P, response) || !P.cb && !(P.root && P.root._pcH);
}
function _ptwGuideName(P) { return petName(P.me ? petGet() : { look: P.look }); }
function _ptwGuideDistance(a, b) { return Math.hypot(a.x - b.x, (a.y - b.y) * 1.4); }
function _ptwGuideClosePrompt(R) { const close = R && R.promptClose; if (R) R.promptClose = null; if (typeof close === 'function') close(); }
function _ptwGuideSay(text, R) {
  if (R) _ptwGuideClosePrompt(R);
  const close = typeof gardenMessage === 'function' ? gardenMessage(text, { ms: 7500 }) : typeof gardenToast === 'function' ? gardenToast(text, { icon: 'paw-print' }) : null;
  if (R && typeof close === 'function') R.promptClose = close;
}
function _ptwGuideContext(P, W, asking) {
  if (!_ptwPlayOwned(P) || !_ptw.on || !_ptwMotion() || _ptw.frozen || !_ptw.svg || !_ptw.svg.isConnected || !P.node || !P.node.isConnected || document.hidden || !W || _ptwGone(P)) return false;
  if (typeof _gw === 'undefined' || !_gw.on || _gw.boat || _gw.netting || typeof _gwFishBusy === 'function' && _gwFishBusy() || typeof _gdpTool === 'function' && _gdpTool() !== 'hand') return false;
  if (asking && (_gw.moving || _gw.path && _gw.path.length || _gw.hold || _gw.keys && _gw.keys.size)) return false;
  if (typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on || typeof _pe !== 'undefined' && _pe.H || typeof _GPL !== 'undefined' && _GPL.pose && Date.now() < _GPL.until || typeof _gtgo !== 'undefined' && (_gtgo.on || _gtgo.hold || _gtgo.held) || typeof _gmo !== 'undefined' && _gmo.g) return false;
  if (typeof gardenSoapHolding === 'function' && gardenSoapHolding() || typeof gardenLeafBoatHolding === 'function' && gardenLeafBoatHolding()) return false;
  if (typeof gardenKiteState === 'function') { const kite = gardenKiteState(), slot = _ptwVisiting() && typeof _glv !== 'undefined' ? Number(_glv.w) : 0; if (kite && kite.participants && kite.participants.includes(slot)) return false; }
  const light = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), env = light && light.environment && light.environment();
  return !(env && (env.room || env.paused || env.reducedMotion));
}
function _ptwGuideAirLine(P, a, b) {
  if (!_ptwFlier(P) || _ptwGuideDistance(a, b) > 3.8) return false;
  const n = Math.max(1, Math.ceil(_ptwGuideDistance(a, b) * 8));
  for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; if (x < .2 || y < .2 || x > GARDEN_WORLD.cols - .2 || y > GARDEN_WORLD.rows - .2 || (typeof gardenWaterContainsPoint === 'function' ? gardenWaterContainsPoint(x, y) : _ptwWet(x, y)) || typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(x), Math.floor(y))) return false; }
  return true;
}
function _ptwGuideSplit(path, start) {
  const out = []; let from = start;
  for (const end of path) { const n = Math.max(1, Math.ceil(_ptwGuideDistance(from, end) / 1.65)); for (let i = 1; i <= n; i++) { out.push({ x: from.x + (end.x - from.x) * i / n, y: from.y + (end.y - from.y) * i / n, air: !!end.air }); if (out.length > 40) return null; } from = end; }
  return out;
}
/** Only the short departure from an actual supported owl perch is airborne.
 * The walk that a person follows is always planned on accessible dry ground. */
function _ptwGuideRoute(P, target) {
  if (_ptwFree(P.x, P.y)) return _ptwPlayRoute(P, target);
  const top = _ptwTopAt(P.x, P.y); if (!_ptwFlier(P) || !_ptwMayStand(P, top)) return null;
  for (const [dx, dy] of [[0, 1.3], [-1.3, 1], [1.3, 1], [-2, .4], [2, .4]]) {
    const launch = { x: P.x + dx, y: P.y + dy, air: true }; if (!_ptwFree(launch.x, launch.y) || !_ptwGuideAirLine(P, P, launch)) continue;
    const path = _ptwPlayRoute(launch, target); if (path) return [launch, ...path];
  }
  return null;
}
function _ptwGuideStand(P, at) {
  const pl = _ptwPlayer(); if (!pl) return null;
  const candidates = [[0, 1.1], [-1.1, .7], [1.1, .7], [0, 1.9], [-2, .5], [2, .5], [0, -.9]].map(([x, y]) => ({ x: _ptwTenth(at.x + x), y: _ptwTenth(at.y + y) })).filter(p => _ptwFree(p.x, p.y));
  candidates.sort((a, b) => _ptwGuideDistance(a, pl) - _ptwGuideDistance(b, pl));
  for (const stand of candidates) { const route = _ptwPlayRoute(pl, stand); if (route) return stand; }
  return null;
}
function _ptwGuideCandidates(P, W) {
  const profile = PET_GUIDES[P.look.species], pl = _ptwPlayer(), rows = []; if (!profile || !pl) return rows;
  const add = row => { const d = _ptwGuideDistance(pl, row.at); if (d < 1.8 || d > 13 || _ptwGuideDistance(P, row.at) > 18) return; row.score = d + (P.guidePrevious === row.id ? 14 : 0); rows.push(row); };
  if (profile.kind === 'lookout') for (const perch of _ptwSpots().perch) {
    if (!_ptwMayStand(P, perch) || perch.up < 25 || perch.up > 190 || typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(perch.x), Math.floor(perch.y))) continue;
    add({ id: 'lookout:' + perch.id, kind: 'lookout', at: { x: perch.x, y: perch.y }, perch: { x: perch.x, y: perch.y, id: perch.id, up: perch.up }, name: perch.name || 'the lookout' });
  }
  else if (profile.kind === 'shore') for (const shore of _ptwSpots().shore) {
    if (!_ptwFree(shore.x, shore.y) || !_ptwWet(shore.wx, shore.wy)) continue;
    add({ id: 'bank:' + _ptwTenth(shore.x) + ',' + _ptwTenth(shore.y), kind: 'shore', at: { x: _ptwTenth(shore.x), y: _ptwTenth(shore.y) }, look: { x: shore.wx, y: shore.wy }, name: 'a quiet bend in the water' });
  }
  else for (const p of W.m.plants || []) {
    if (p.stage < 3 || !p.def || !(profile.kind === 'scent' ? ['herb', 'flower', 'wild', 'tree'].includes(p.def.cat) : ['tree', 'flower', 'wild'].includes(p.def.cat))) continue;
    add({ id: 'plant:' + p.uid, kind: profile.kind, at: { x: p.x + p.fp / 2, y: p.y + p.fp }, source: { uid: p.uid, x: p.x, y: p.y }, name: p.def.name, plant: p.def.id });
  }
  rows.sort((a, b) => a.score - b.score); return rows.slice(0, 24);
}
function _ptwGuidePlan(P, W) {
  const pl = _ptwPlayer(); if (!pl) return null;
  for (const target of _ptwGuideCandidates(P, W)) {
    const stand = target.kind === 'shore' ? target.at : _ptwGuideStand(P, target.at); if (!stand) continue;
    if (target.perch && !_ptwGuideAirLine(P, stand, target.perch)) continue;
    const playerRoute = _ptwPlayRoute(pl, stand), route = playerRoute && _ptwGuideRoute(P, stand), path = route && _ptwGuideSplit(route, P);
    if (!path || !path.length || path.length > 40) continue;
    return { target, stand, path };
  }
  return null;
}
function _ptwGuideTargetLive(R, W) {
  if (!_ptwFree(R.stand.x, R.stand.y)) return false;
  const t = R.target;
  if (t.perch) { const top = _ptwTopAt(t.perch.x, t.perch.y); return !!top && top.id === t.perch.id && top.up === t.perch.up; }
  if (t.kind === 'shore') return _ptwWet(t.look.x, t.look.y);
  const cell = W.m.occ.get(t.source.x + ',' + t.source.y), p = cell && cell.plant === t.source.uid ? gardenPlantById(W.m, cell.plant) : null;
  return !!p && p.uid === t.source.uid && p.stage >= 3;
}
function _ptwGuideStopOwned(P, R) {
  const busy = R.cb && P.cb === R.cb, route = R.arrive && P.arrive === R.arrive, external = P.wow || P.cb && !busy;
  if (busy) { P.cb = null; if (!P.wow) { P.busy = 0; if (R.clip && P.clipH === R.clip && P.root === R.root) { P.clipH.stop(true); P.clipH = null; } } }
  if (route) { P.arrive = null; if (!external) { P.tx = P.ty = null; P.run = false; if (P.root) P.root.classList.remove('pt-run'); } }
  if ((busy || route) && !external) P.sit();
  R.cb = R.arrive = null;
}
function _ptwGuideCancel(P, why, rejoin) {
  const R = P.guide; if (!R) return;
  _ptwGuideClosePrompt(R);
  R.live = false; _ptwGuideStopOwned(P, R); P.guide = null; P.ecology = '';
  if (P.lf) P.lf.force = true;
  if (typeof gardenLivePets === 'function') gardenLivePets(_ptw.pets);
  if (why !== 'complete' && R.endpointSent && !R.stopSent && typeof gardenLiveFx === 'function') {
    R.stopSent = true;
    const body = { p: R.id, pc: R.endpoint.slice() }, slot = _ptwPlaySlot(P);
    if (slot) { body.u = slot; body.i = P.look.species; }
    // An explicit stop is critical, not another ambient clip on the six-second
    // cadence. It cancels only this request's exact endpoint presentation.
    gardenLiveFx('petplay', 'guide-stop-' + P.look.species, body);
  }
  if (P.guidePresentation && P.guidePresentation.request === R.id) P.guidePresentation = null;
  P.guideLast = { species: P.look.species, target: R.target.id, name: R.target.name, why, phase: R.phase, age: +R.age.toFixed(2), legs: R.next };
  P.guideNoWarp = !!P.me;
  if (rejoin && P.me && !P.wow && !P.act && !P.cb && _ptwGuideDistance(P, _ptwPlayer()) > 3) P.guideReturn = { live: true, age: 0, retry: 0, attempts: 0, arrive: null, cb: null, target: null };
  if (why === 'complete') { P.guidePrevious = R.target.id; P.guideRestUntil = performance.now() + 40000; }
}
function _ptwGuideFacePlayer(P) { const pl = _ptwPlayer(); if (pl) P.dir = pl.x >= P.x ? 1 : -1; }
function _ptwGuideLead(P, R) {
  if (P.guide !== R || !R.live) return;
  const next = R.path[R.next++];
  if (!next) { R.phase = 'show-wait'; P.sit(); P.ecology = 'guide-wait'; _ptwGuideFacePlayer(P); R.wait = 0; _ptwGuideSay(_ptwGuideName(P) + ' found ' + R.target.name + '. Come a little closer.', R); return; }
  const valid = _ptwPlayLine(P, next) || next.air && _ptwFlier(P) && _ptwGuideAirLine(P, P, next);
  if (!valid) { _ptwGuideCancel(P, 'path-changed', true); _ptwGuideSay('That way has changed. Ask again from the path.'); return; }
  R.phase = 'lead'; R.wait = 0; R.arrive = () => { if (P.guide !== R || !R.live) return; R.arrive = null; R.phase = 'lead-wait'; P.sit(); P.ecology = 'guide-wait'; _ptwGuideFacePlayer(P); };
  P.walkTo(next.x, next.y, false, R.arrive); P.speed = PET_GUIDES[P.look.species].pace; P.ecology = 'guide-lead';
}
function _ptwGuideObservation(P, R, W) {
  const start = () => {
    if (P.guide !== R || !R.live) return;
    _ptwGuideClosePrompt(R);
    R.phase = 'observe'; P.sit({ eyes: 'open', mouth: 'smile' }); P.dir = (R.target.look || R.target.at).x >= P.x ? 1 : -1;
    P.clip(PET_GUIDES[P.look.species].clip, 3500, () => {
      if (P.guide !== R || !R.live) return; R.cb = R.clip = null;
      const text = R.target.kind === 'lookout' ? 'From ' + R.target.name + ', your owl follows the movement across the garden.' : R.target.kind === 'shore' ? 'Your otter watches the current at this bend, then looks back to share it with you.' : R.target.kind === 'scent' ? 'Your fox traced a scent to ' + R.target.name + '. ' + (W.rain ? 'Rain has brought the garden smells close to the ground.' : 'It lifts its nose to catch the breeze.') : 'Beside ' + R.target.name + ', your rabbit holds its ears still and listens with you.';
      _ptwGuideCancel(P, 'complete', false); P.sit({ eyes: 'happy', mouth: 'smile' }); P.busy = 2; _ptwGuideSay(text);
    });
    R.cb = P.cb; R.clip = P.clipH; R.root = P.root; P.ecology = 'guide-observe';
  };
  const gap = _ptwPlayFxGap(P);
  if (gap > .05) { R.phase = 'settle'; P.busy = gap; R.cb = () => { if (P.guide === R && R.live) { R.cb = null; start(); } }; P.cb = R.cb; } else start();
}
function _ptwGuideStart(P, W) {
  if (!PET_GUIDES[P.look.species] || !_ptwGuideContext(P, W, true)) return { ok: false, why: 'Stop nearby with your hands free, then ask your companion.' };
  if (!_ptwPlayIdle(P) || P.environmentPlay || P.puddlePlayInvite || P.guide || P.guideReturn) return { ok: false, why: 'Let your companion finish what it is doing, then ask again.' };
  if (performance.now() < (P.guideRestUntil || 0)) return { ok: false, why: 'Your companion is taking a little break from showing the way.' };
  if (_ptw.pets.some(other => other !== P && (other.guide || other.guideInvite))) return { ok: false, why: 'Another companion is already showing you the way. Finish that walk first.' };
  const plan = _ptwGuidePlan(P, W); if (!plan) return { ok: false, why: 'No suitable place has a clear path from here. Explore some open ground together first.' };
  const R = P.guide = { ...plan, id: 'guide-' + Date.now().toString(36) + '-' + (++_ptwGuideSerial).toString(36), live: true, phase: 'start', next: 0, age: 0, wait: 0, probe: 0, apart: 0, cb: null, arrive: null, clip: null };
  P.guideNoWarp = false;
  _ptwGuideSay(_ptwGuideName(P) + ' wants to show you ' + plan.target.name + '. Follow along; it will wait. Pat it or press Esc to stop.', R);
  _ptwGuideLead(P, R); return { ok: true };
}
function petGardenGuideTick(P, W, dt) {
  if (P.guidePat && (!_ptwGuidePatOwns(P, P.guidePat) || !_ptwGuideContext(P, W, true))) P.guidePat = null;
  const I = P.guideInvite;
  if (I && (I.scene !== _ptw.svg || performance.now() > I.until || P.wow || P.act || P.tx != null || P.arrive || P.environmentPlay || P.puddlePlayInvite || P.fishingWatch || P.fishingReturn || P.cb && P.cb !== I.pat || P.root && P.root._pcH && !_ptwGuidePatOwns(P, I.response) || !_ptwGuideContext(P, W, true))) P.guideInvite = null;
  const back = P.guideReturn;
  if (back) {
    back.age += dt; back.retry = Math.max(0, back.retry - dt);
    if (!_ptwGuideContext(P, W, false) || back.age > 35 || back.arrive && (P.arrive !== back.arrive || P.tx == null) || P.cb || P.wow || P.act) { _ptwGuideStopOwned(P, back); P.guideReturn = null; }
  }
  const R = P.guide; if (!R) return;
  R.age += dt; R.probe -= dt;
  const ownership = R.arrive ? P.arrive === R.arrive && P.tx != null : R.cb ? P.cb === R.cb : P.tx == null && !P.cb && !P.wow && !P.act && !(P.root && P.root._pcH);
  if (!ownership || !_ptwGuideContext(P, W, false)) { _ptwGuideCancel(P, 'another-activity', false); return; }
  if (R.probe <= 0) { R.probe = 1; if (!_ptwGuideTargetLive(R, W)) { _ptwGuideCancel(P, 'place-changed', true); return; } }
  const gap = _ptwGuideDistance(P, _ptwPlayer());
  R.apart = gap > 6.2 ? R.apart + dt : 0;
  if (R.apart > .6 || R.age > 120) { _ptwGuideCancel(P, R.age > 120 ? 'time-to-rest' : 'walked-away', true); _ptwGuideSay(_ptwGuideName(P) + ' leaves the discovery for another walk.'); return; }
  if (R.phase.endsWith('wait')) { R.wait += dt; _ptwGuideFacePlayer(P); if (R.wait > 28) { _ptwGuideCancel(P, 'waited', true); _ptwGuideSay(_ptwGuideName(P) + ' is ready to move on. You can ask again.'); } }
}
function _ptwGuideReturnReady(P, R) {
  const pl = _ptwPlayer(); if (!pl || _ptwGuideDistance(P, pl) < 2.8) { _ptwGuideStopOwned(P, R); P.guideReturn = null; P.guideNoWarp = false; P.sit(); P.busy = .5; return; }
  if (P.tx != null) return;
  if (R.retry > 0) { P.busy = .2; return; }
  const target = typeof gardenWorldNearestFree === 'function' ? gardenWorldNearestFree(pl.x - .7, pl.y + .3, 1.5, .14) : pl, path = target && _ptwGuideRoute(P, target);
  if (!path) { R.retry = 1.5; if (++R.attempts >= 3) P.guideReturn = null; return; }
  R.path = path; R.index = 0; R.target = target; R.retry = 1.2;
  R.arrive = () => { if (P.guideReturn !== R) return; const q = R.path[R.index++]; if (!q) { R.arrive = null; P.sit(); return; } if (!_ptwPlayLine(P, q) && !_ptwGuideAirLine(P, P, q)) { R.arrive = null; P.guideReturn = null; return; } P.walkTo(q.x, q.y, true, R.arrive); P.speed = 1.5; };
  R.arrive();
}
function petGardenGuideReady(P, W) {
  if (P.guideInvite) {
    // This explicit invitation outranks a passive wildlife interest. Its
    // ordinary pat response still finishes before any route can be installed.
    P.lifeGoal = false;
    if (!_ptwPlayIdle(P)) return true;
    P.guideInvite = null; const result = _ptwGuideStart(P, W); if (!result.ok) _ptwGuideSay(result.why); return true;
  }
  if (P.guideReturn) { _ptwGuideReturnReady(P, P.guideReturn); return true; }
  const R = P.guide; if (!R) return false;
  if (P.tx != null) return true;
  const pl = _ptwPlayer();
  if (R.phase === 'lead-wait') {
    if (_ptwGuideDistance(P, pl) <= 2.6) _ptwGuideLead(P, R);
    else { P.busy = .2; if (!R.askedToCatchUp) { R.askedToCatchUp = true; _ptwGuideSay(_ptwGuideName(P) + ' looks back and waits for you.', R); } }
  } else if (R.phase === 'show-wait') {
    if (_ptwGuideDistance(pl, R.stand) > 2.4) { P.busy = .2; return true; }
    if (R.target.perch) {
      const top = _ptwTopAt(R.target.perch.x, R.target.perch.y); if (!_ptwMayStand(P, top) || !_ptwGuideAirLine(P, P, R.target.perch)) { _ptwGuideCancel(P, 'lookout-changed', true); return true; }
      R.phase = 'perch'; R.arrive = () => { if (P.guide !== R) return; R.arrive = null; R.phase = 'perch-settle'; P.sit(); };
      P.walkTo(R.target.perch.x, R.target.perch.y, false, R.arrive); P.ecology = 'guide-lookout';
    } else _ptwGuideObservation(P, R, W);
  } else if (R.phase === 'perch-settle') {
    if (Math.abs((P.up || 0) - R.target.perch.up) > 3) P.busy = .1; else _ptwGuideObservation(P, R, W);
  }
  return true;
}
function _ptwGuideSamePoint(a, b) { return !!a && !!b && a.length === 3 && b.length === 3 && a.every((value, i) => value === b[i]); }
function petGardenGuideClip(P, name, options) {
  P.guidePresentation = petGardenGuideClipId(name) && P.clipH && P.root && P.root._pcH === P.clipH ? { name, request: options && options.guideRequest || P.guide && P.guide.id, pc: options && options.guidePoint || P.guide && P.guide.endpoint, root: P.root, clip: P.clipH, cb: P.cb } : null;
}
function petGardenGuideAccept(P, name, event) {
  const stop = P.guideStop;
  return !(stop && performance.now() < stop.until && stop.request === event.p && stop.name === name && _ptwGuideSamePoint(stop.pc, event.pc));
}
function petGardenGuideReceivedStop(P, event) {
  const name = event.e.replace('guide-stop-', 'guide-');
  P.guideStop = { request: event.p, name, pc: event.pc.slice(), until: performance.now() + 10000 };
  const pending = P.puddlePlayReceived;
  if (pending && pending.request === event.p && pending.name === name && _ptwGuideSamePoint([Math.round(pending.x * 10), Math.round(pending.y * 10), pending.left ? 1 : 0], event.pc)) P.puddlePlayReceived = null;
  const owned = P.guidePresentation;
  if (!owned || owned.request !== event.p || owned.name !== name || !_ptwGuideSamePoint(owned.pc, event.pc)) return;
  P.guidePresentation = null;
  if (P.wow || P.root !== owned.root || !P.root || P.root._pcH !== owned.clip || P.clipH !== owned.clip || P.cb !== owned.cb) return;
  owned.clip.stop(true); P.clipH = null; P.cb = null; P.busy = .2;
  if (P.tx != null) P.draw('walk'); else P.sit();
}
function petGardenGuideSuspend(P) {
  P.guidePat = P.guideInvite = P.guidePresentation = null;
  if (P.guide) _ptwGuideCancel(P, 'stopped', false);
  if (P.guideReturn) { _ptwGuideStopOwned(P, P.guideReturn); P.guideReturn = null; }
}
function petGardenGuideAction(P, pat) {
  if (!_ptwPlayOwned(P) || !PET_GUIDES[P.look.species]) return null;
  const response = { pat, root: P.root, clip: P.clipH, scene: _ptw.svg, until: performance.now() + Math.min(7000, Math.max(1000, (P.clipH && P.clipH.ms || 0) + 1000)) };
  P.guidePat = response;
  return { ic: 'map', label: 'Show me around', text: 'Show me around', run: () => {
    if (typeof gardenBubbleClose === 'function') gardenBubbleClose();
    const W = _ptw.W || _ptwWorld(); P.puddlePlayInvite = null;
    // Only a deliberate request reserves priority through a callback-free
    // settle. A real foreign route, clip or activity still rejects it.
    if (_ptwGuideMayQueue(P, W, response)) { P.guideInvite = { pat, response, scene: _ptw.svg, until: performance.now() + 7000 }; return; }
    const result = _ptwGuideStart(P, W); if (!result.ok) _ptwGuideSay(result.why);
  } };
}
function petGardenActionMenu(P, pat) {
  if (!_ptwPlayOwned(P) || typeof gardenBubbleOpen !== 'function') return;
  const items = [], guide = petGardenGuideAction(P, pat), puddle = typeof petGardenPuddleAction === 'function' && petGardenPuddleAction(P, pat);
  if (guide) items.push(guide); if (puddle) items.push(puddle); if (!items.length) return;
  gardenBubbleOpen({ x: P.x, y: P.y - .7 }, { title: _ptwGuideName(P), sub: guide ? PET_GUIDES[P.look.species].hint : PET_PUDDLE_PLAY[P.look.species].hint, items });
}
function petGardenGuideState() {
  return _ptw.pets.map(P => ({ species: P.look.species, companion: !!P.me, slot: _ptwPlaySlot(P), invited: !!P.guideInvite, current: P.guide ? { id: P.guide.id, phase: P.guide.phase, age: +P.guide.age.toFixed(2), target: P.guide.target.id, name: P.guide.target.name, stand: P.guide.stand, perch: P.guide.target.perch || null, next: P.guide.next, path: P.guide.path } : null, returning: !!P.guideReturn, last: P.guideLast || null }));
}
if (window.GardenActivityCamera) GardenActivityCamera.define('pet-guide', () => {
  if (typeof _ptw === 'undefined' || !_ptw.on || _ptw.frozen || document.hidden || !_ptw.pets.length) return null;
  const P = _ptw.pets.find(p => p.guide && p.guide.live); if (!P) return null;
  const R = P.guide, foot = _ptwCell(P.x, P.y), lift = Math.max(0, P.up || 0), height = _ptwH(P.look.species);
  let left = foot.x - 32, right = foot.x + 32, top = foot.y - lift - height - 12, bottom = foot.y + 12;
  const interest = R.target.perch || R.target.look || R.target.at, pl = _ptwPlayer();
  if (pl && _ptwGuideDistance(P, interest) <= 5 && _ptwGuideDistance(pl, interest) <= 7) {
    const point = _ptwCell(interest.x, interest.y), up = R.target.perch ? R.target.perch.up : 0;
    left = Math.min(left, point.x - 28); right = Math.max(right, point.x + 28); top = Math.min(top, point.y - up - height - 12); bottom = Math.max(bottom, point.y + 16);
  }
  return { id: R.id, bounds: { x: left, y: top, width: Math.max(64, right - left), height: Math.max(64, bottom - top) } };
}, 15);
if (typeof document !== 'undefined') document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && _ptw.on) for (const P of _ptw.pets) if (P.guide || P.guideInvite || P.guideReturn) { petGardenGuideSuspend(P); _ptwGuideSay(_ptwGuideName(P) + ' stops showing the way.'); } });

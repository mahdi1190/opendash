/* Voluntary puddle play belongs to each player's companion and the host's own
 * roaming pack. Real routes travel as gl:pp; one petplay endpoint addresses the
 * companion or a host pack slot/species. Peer copies never pick these routes. */
const PET_PUDDLE_PLAY = Object.freeze({
  cat: { hint: 'A slow stalk, then a careful paw in the water.', clip: 'puddle-cat', pace: .55 },
  dog: { hint: 'A little chase around the rim, then a joyful splash.', clip: 'puddle-dog', pace: 1.3 },
  duck: { hint: 'A waddle into the shallows, a dabble, and a wing tidy.', clip: 'puddle-duck', pace: .8 },
  rabbit: { hint: 'A curious look, a step back, then a brave little hop.', clip: 'puddle-rabbit', pace: .8 },
});
const _PTW_PLAY_CONTACTS = Object.freeze({ 'puddle-cat': [.37, .61], 'puddle-dog': [.42, .6, .79], 'puddle-duck': [.22, .45, .68], 'puddle-rabbit': [.82] });
function _ptwPlayOwned(P) { return !!P && _ptw.pets.includes(P) && (P.me || !_ptwVisiting()); }
function petGardenPlayBusy(P) { return !!(P && (P.environmentPlay && P.environmentPlay.live || P.puddlePlayInvite || P.puddlePlayReceived || P.puddlePlayContact || typeof petGardenGuideBusy === 'function' && petGardenGuideBusy(P))); }
function _ptwPlaySlot(P) { return P.me ? 0 : _ptw.pets.filter(q => !q.me && !_ptwGone(q)).indexOf(P) + 1; }
function _ptwPlayFxGap(P) {
  if (typeof _gll === 'undefined') return 0;
  const slot = _ptwPlaySlot(P), last = Math.max(_gll.petPlayAt && _gll.petPlayAt[slot] || 0, !slot && _gll.petAt || 0);
  return Math.max(0, 6050 - (Date.now() - last)) / 1000;
}
function petGardenPlaySend(P, name, options) {
  if (!_PTW_PLAY_CONTACTS[name] && !(typeof petGardenGuideClipId === 'function' && petGardenGuideClipId(name))) return false;
  if (!_ptwPlayOwned(P) || P.wow || options && options.quiet || typeof gardenLivePet !== 'function') return true;
  const slot = _ptwPlaySlot(P); if (slot < 0 || slot > 3) return true;
  if (P.lf) P.lf.force = true;
  if (typeof gardenLivePets === 'function') gardenLivePets(_ptw.pets);
  const target = { pc: [Math.max(0, Math.min(640, Math.round(P.x * 10))), Math.max(0, Math.min(GARDEN_WORLD.rows * 10, Math.round(P.y * 10))), P.dir < 0 ? 1 : 0] };
  if (typeof petGardenGuideClipId === 'function' && petGardenGuideClipId(name)) {
    if (!P.guide || !P.guide.live) return true;
    target.p = P.guide.id; P.guide.endpoint = target.pc.slice(); P.guide.endpointSent = true;
  }
  if (slot) { target.u = slot; target.i = P.look.species; }
  gardenLivePet('petplay', name, target); return true;
}
function _ptwPlayContext(P, W) {
  if (!_ptwPlayOwned(P) || !_ptw.on || !_ptwMotion() || _ptw.frozen || !_ptw.svg || !_ptw.svg.isConnected || document.hidden || !W || W.snow || W.m.season === 'winter' || _ptwGone(P)) return false;
  if (typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on) return false;
  const light = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), env = light && light.environment && light.environment();
  if (env && (env.room || env.paused || env.reducedMotion)) return false;
  if (!P.me) return true;
  if (typeof _gw === 'undefined' || !_gw.on || _gw.moving || _gw.path && _gw.path.length || _gw.keys && _gw.keys.size || _gw.hold || _gw.netting || _gw.casting || typeof _gwFishingBusy === 'function' && _gwFishingBusy()) return false;
  if (typeof _pe !== 'undefined' && _pe.H || typeof _GPL !== 'undefined' && _GPL.pose && Date.now() < _GPL.until || typeof _gtgo !== 'undefined' && (_gtgo.on || _gtgo.hold || _gtgo.held) || typeof _gmo !== 'undefined' && _gmo.g) return false;
  if (typeof gardenSoapHolding === 'function' && gardenSoapHolding()) return false;
  if (typeof gardenLeafBoatHolding === 'function' && gardenLeafBoatHolding()) return false;
  if (typeof gardenKiteState === 'function') { const k = gardenKiteState(), own = _ptwVisiting() && typeof _glv !== 'undefined' ? Number(_glv.w) : 0; if (k && k.participants && k.participants.includes(own)) return false; }
  return true;
}
function _ptwPlayIdle(P) { return !!P && !P.wow && !P.act && P.tx == null && !P.arrive && !P.cb && !(P.busy > 0) && !(P.root && P.root._pcH) && P.pose !== 'sleep' && !P.fishingWatch && !P.fishingReturn && !P.lifeGoal; }
function _ptwPlayPools(P) {
  return _ptwNearby(P, _ptwPuddles()).filter(q => !_ptw.pets.some(other => other !== P && other.environmentPlay && other.environmentPlay.live && other.environmentPlay.pool === q.id)).sort((a, b) => Math.hypot(a.x - P.x, (a.y - P.y) * 1.4) - Math.hypot(b.x - P.x, (b.y - P.y) * 1.4));
}
/** Land feet only, including for a duck: a rain puddle is not a lake entrance. */
function _ptwPlayLine(a, b) {
  const G = GARDEN_WORLD, n = Math.max(1, Math.ceil(Math.hypot((b.x - a.x) * G.cellW, (b.y - a.y) * G.cellH) / 4));
  for (let i = 0; i <= n; i++) if (!_ptwFree(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false;
  return true;
}
function _ptwPlayRoute(P, target) {
  if (!_ptwFree(target.x, target.y)) return null;
  if (_ptwPlayLine(P, target)) return [target];
  const path = typeof _gwRoute === 'function' && _ptwFree(P.x, P.y) ? _gwRoute({ x: P.x, y: P.y }, target) : null;
  if (!path || !path.length || path.length > 24) return null;
  let from = P; for (const point of path) { if (!_ptwPlayLine(from, point)) return null; from = point; }
  return path;
}
function _ptwPlayPlan(P, pool) {
  const G = GARDEN_WORLD, rx = pool.bounds ? pool.bounds.width / (2 * G.cellW) : pool.w * .62, ry = pool.bounds ? pool.bounds.height / (2 * G.cellH) : pool.w * .45, side = P.x <= pool.x ? -1 : 1;
  const point = (x, y) => ({ x: _ptwTenth(pool.x + x), y: _ptwTenth(pool.y + y) }), rim = point(side * (rx + .32), .12), far = point(side * (rx + .68), .32), across = point(-side * (rx + .35), ry + .4), center = point(0, .04);
  let stages;
  switch (P.look.species) {
    case 'cat': stages = [{ at: far }, { wait: .85 }, { at: rim, pace: .48 }, { endpoint: true }]; break;
    case 'dog': stages = [{ at: far }, { at: point(side * (rx + .25), ry + .55), run: true }, { at: across, run: true }, { at: center, run: true }, { endpoint: true }, { at: across }]; break;
    case 'duck': stages = [{ at: rim }, { wait: .65 }, { at: center, pace: .65 }, { endpoint: true }, { at: rim }]; break;
    case 'rabbit': stages = [{ at: rim }, { wait: .8 }, { at: far, pace: .7 }, { wait: .6 }, { at: rim }, { endpoint: true }, { at: point(side * (rx + .3), ry + .55), run: true }]; break;
    default: return null;
  }
  const pl = P.me ? _ptwPlayer() : null; let from = P;
  for (const stage of stages) if (stage.at) {
    if (P.me && (!pl || Math.hypot(stage.at.x - pl.x, (stage.at.y - pl.y) * 1.4) > 4.6) || !_ptwFree(stage.at.x, stage.at.y)) return null;
    // The approach may route round a planting. The little play itself needs a
    // clear rim, rather than repeatedly trying to squeeze through furniture.
    if (from !== P && !_ptwPlayLine(from, stage.at)) return null;
    from = stage.at;
  }
  const route = _ptwPlayRoute(P, stages[0].at); return route ? { pool, stages, route } : null;
}
function _ptwPlayClear(P, why) {
  const R = P && P.environmentPlay; if (!R) return;
  R.live = false; P.environmentPlay = null;
  const ownsBusy = !!R.cb && P.cb === R.cb, ownsRoute = !!R.arrive && P.arrive === R.arrive, externalBusy = P.wow || P.cb && !ownsBusy;
  if (ownsBusy) { P.cb = null; if (!P.wow) { P.busy = 0; if (R.clip && P.clipH === R.clip && P.root === R.root) { P.clipH.stop(true); P.clipH = null; } } }
  if (ownsRoute) { P.arrive = null; if (!externalBusy) { P.tx = P.ty = null; P.run = false; if (P.root) P.root.classList.remove('pt-run'); } }
  if ((ownsBusy || ownsRoute) && !externalBusy) P.sit();
  if (P.ecology === 'puddle-play') P.ecology = '';
  P.puddlePlayLast = { species: R.species, pool: R.pool, phase: R.phase, why, stages: R.index, age: +R.age.toFixed(2) };
}
function _ptwPlayWait(P, R, seconds, after) {
  P.sit({ eyes: 'open', mouth: 'smile' }); P.dir = R.target.x >= P.x ? 1 : -1; P.ecology = 'puddle-play';
  P.busy = seconds; R.arrive = null; R.clip = null; R.cb = () => { if (P.environmentPlay !== R || !R.live) return; R.cb = null; after(); }; P.cb = R.cb;
}
function _ptwPlayAdvance(P, R) {
  if (P.environmentPlay !== R || !R.live) return;
  const W = _ptw.W || _ptwWorld();
  if (!_ptwPlayContext(P, W)) { _ptwPlayClear(P, 'interrupted'); return; }
  const stage = R.stages[R.index++];
  if (!stage) { _ptwPlayClear(P, 'complete'); P.sit({ eyes: 'happy', mouth: 'smile' }); P.busy = 2; P.puddlePlayRestUntil = performance.now() + 25000; return; }
  if (stage.at) {
    R.phase = R.index === 1 ? 'approach' : 'play-route'; const path = R.route || _ptwPlayRoute(P, stage.at); R.route = null;
    if (!path) { _ptwPlayClear(P, 'blocked'); return; }
    R.path = path; R.pathIndex = 0; R.cb = null;
    R.arrive = () => {
      if (P.environmentPlay !== R || !R.live) return;
      const next = R.path[R.pathIndex++];
      if (!next) { R.arrive = null; _ptwPlayAdvance(P, R); return; }
      if (!_ptwPlayLine(P, next)) { _ptwPlayClear(P, 'blocked'); return; }
      P.walkTo(next.x, next.y, !!stage.run, R.arrive); P.speed = stage.pace || (stage.run ? 1.7 : PET_PUDDLE_PLAY[R.species].pace); P.ecology = 'puddle-play';
    };
    R.arrive(); return;
  }
  if (stage.wait) { R.phase = 'consider'; _ptwPlayWait(P, R, stage.wait, () => _ptwPlayAdvance(P, R)); return; }
  // Keep the endpoint on the existing six-second pet FX cadence. Earlier
  // stages are real walking/retained poses and send no competing clip cues.
  const play = () => {
    if (P.environmentPlay !== R || !R.live) return;
    R.phase = 'splash'; P.dir = R.target.x >= P.x ? 1 : -1; P.sit({ eyes: 'happy', mouth: 'smile' });
    P.clip(PET_PUDDLE_PLAY[R.species].clip, 3000, () => { if (P.environmentPlay !== R || !R.live) return; R.cb = R.clip = null; _ptwPlayAdvance(P, R); });
    R.cb = P.cb; R.clip = P.clipH; R.root = P.root; P.ecology = 'puddle-play';
  };
  const gap = _ptwPlayFxGap(P);
  if (gap > .05) { R.phase = 'watch-water'; _ptwPlayWait(P, R, gap, play); } else play();
}
function _ptwPlayStart(P, W, invited) {
  const spec = P && PET_PUDDLE_PLAY[P.look.species];
  if (!spec) return { ok: false, why: 'This companion has its own favourite games.' };
  if (!_ptwPlayContext(P, W)) return { ok: false, why: 'Stop on open ground with your companion to invite it to play.' };
  if (!_ptwPlayIdle(P) || P.environmentPlay) return { ok: false, why: 'Your companion is busy. Let it finish, then ask again.' };
  if (performance.now() < (P.puddlePlayRestUntil || 0)) return { ok: false, why: 'Your companion is taking a little breather.' };
  const pools = _ptwPlayPools(P); if (!pools.length) return { ok: false, why: 'No rain puddle nearby. Explore the wet grass together after rain.' };
  let plan = null; for (const pool of pools) { plan = _ptwPlayPlan(P, pool); if (plan) break; }
  if (!plan) return { ok: false, why: 'This puddle needs a little more open space around it. Try standing beside another.' };
  const R = { live: true, species: P.look.species, pool: plan.pool.id, target: plan.pool, stages: plan.stages, route: plan.route, index: 0, age: 0, phase: 'start', invited: !!invited, cb: null, arrive: null, clip: null };
  P.environmentPlay = R; P.at_puddlePlay = performance.now(); _ptwPlayAdvance(P, R); return { ok: true };
}
function petGardenPlayTick(P, W, dt) {
  const I = P.puddlePlayInvite;
  if (I && (I.scene !== _ptw.svg || performance.now() > I.until || P.wow || P.tx != null || P.cb && P.cb !== I.pat || !_ptwPlayContext(P, W))) { P.puddlePlayInvite = null; }
  const R = P.environmentPlay; if (!R) return;
  R.age += dt;
  const own = R.arrive ? P.arrive === R.arrive && P.tx != null : R.cb ? P.cb === R.cb : false;
  if (!own || !_ptwPlayContext(P, W) || R.age > 40 || !_ptwPuddles().some(p => p.id === R.pool)) _ptwPlayClear(P, own ? 'environment-changed' : 'another-action');
}
function petGardenPlayInvitation(P, W) {
  if (!P.puddlePlayInvite || !_ptwPlayIdle(P)) return false;
  P.puddlePlayInvite = null; const result = _ptwPlayStart(P, W, true);
  if (!result.ok && typeof gardenToast === 'function') gardenToast(result.why, { icon: 'paw-print' });
  return true;
}
function petGardenPuddleAction(P, pat) {
  const spec = _ptwPlayOwned(P) && PET_PUDDLE_PLAY[P.look.species]; if (!spec) return null;
  return { ic: 'droplets', label: 'Puddle play', text: 'Puddle play', run: () => {
    if (typeof gardenBubbleClose === 'function') gardenBubbleClose();
    const W = _ptw.W || _ptwWorld();
    if (P.cb === pat && P.busy > 0 && _ptwPlayContext(P, W)) { P.puddlePlayInvite = { pat, scene: _ptw.svg, until: performance.now() + 7000 }; return; }
    const result = _ptwPlayStart(P, W, true); if (!result.ok && typeof gardenToast === 'function') gardenToast(result.why, { icon: 'paw-print' });
  } };
}
function petGardenPuddleMenu(P, pat) {
  const item = petGardenPuddleAction(P, pat); if (!item || typeof gardenBubbleOpen !== 'function') return;
  const g = P.me ? petGet() : { look: P.look };
  gardenBubbleOpen({ x: P.x, y: P.y - .7 }, { title: petName(g), sub: PET_PUDDLE_PLAY[P.look.species].hint, items: [item] });
}
/** Contact is presentation, so the same received endpoint clip disturbs the
 * same existing puddle on a visitor. No actor state or new message is needed. */
function petGardenPlayClip(P, name, options) {
  if (typeof petGardenGuideClip === 'function') petGardenGuideClip(P, name, options);
  if (P.puddlePlayReceived && P.puddlePlayReceived.name !== name) P.puddlePlayReceived = null;
  const marks = _PTW_PLAY_CONTACTS[name], def = marks && typeof petClipDef === 'function' && petClipDef(name);
  P.puddlePlayContact = def ? { marks, next: 0, age: 0, ms: def.ms, root: P.root, clip: P.clipH } : null;
}
function petGardenPlayContact(P, dt) {
  if (!P.puddlePlayReceived && !P.puddlePlayContact) return;
  const light = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), env = light && light.environment && light.environment();
  if (document.hidden || !_ptwMotion() || _ptw.frozen || env && (env.room || env.paused || env.reducedMotion)) { P.puddlePlayReceived = P.puddlePlayContact = null; return; }
  const received = P.puddlePlayReceived;
  if (received) {
    received.age += dt;
    const distance = Math.hypot(P.x - received.x, (P.y - received.y) * 1.4), atGoal = P.tx == null ? distance < .3 : Math.hypot(P.tx - received.x, (P.ty - received.y) * 1.4) < .25;
    if (atGoal) received.targetSeen = true;
    if (P.wow || performance.now() > received.until || !P.node || !P.node.isConnected || received.scene !== _ptw.svg || received.targetSeen && !atGoal || P.cb && P.cb !== received.previousCb && !(P.root && P.root._pcH)) P.puddlePlayReceived = null;
    else if (distance < .3 && atGoal) {
      P.puddlePlayReceived = null;
      P.tx = null; P.arrive = null; P.dir = received.left ? -1 : 1;
      P.sit(); P.clip(received.name, 3000, () => { if (typeof _gllPetClipDone === 'function') _gllPetClipDone(P); else { P.sit(); P.busy = 1; } }, { quiet: true, guideRequest: received.request, guidePoint: [Math.round(received.x * 10), Math.round(received.y * 10), received.left ? 1 : 0] });
    }
  }
  const C = P.puddlePlayContact; if (!C) return;
  if (P.root !== C.root || P.clipH !== C.clip || P.tx != null || !_ptwMotion()) { P.puddlePlayContact = null; return; }
  C.age += dt;
  while (C.next < C.marks.length && C.age * 1000 >= C.marks[C.next] * C.ms) {
    C.next++;
    const pool = _ptwPuddles().find(p => Math.hypot((p.x - P.x) * GARDEN_WORLD.cellW, (p.y - P.y) * GARDEN_WORLD.cellH) < Math.max(24, (p.w || 1) * GARDEN_WORLD.cellW));
    if (pool && typeof gardenPetStepEffect === 'function') { const point = _ptwCell(pool.x + (P.x - pool.x) * .35, pool.y + (P.y - pool.y) * .35); gardenPetStepEffect({ x: point.x, y: point.y, size: P.look.species === 'dog' ? 1.6 : .65, track: 'none', pet: P }); }
  }
  if (C.next >= C.marks.length || C.age * 1000 > C.ms + 250) P.puddlePlayContact = null;
}
function petGardenPlayReceived(P, name, event) {
  if ((!_PTW_PLAY_CONTACTS[name] && !(typeof petGardenGuideClipId === 'function' && petGardenGuideClipId(name))) || !P || P.wow || !event || !Array.isArray(event.pc)) return;
  if (typeof petGardenGuideClipId === 'function' && petGardenGuideClipId(name) && !petGardenGuideAccept(P, name, event)) return;
  // A route repair does not replay an endpoint. Only its one accepted FX does,
  // and the copy first finishes the already-received authoritative approach.
  P.puddlePlayReceived = { name, request: event.p || null, x: event.pc[0] / 10, y: event.pc[1] / 10, left: event.pc[2] === 1, age: 0, until: performance.now() + 6000, targetSeen: false, scene: _ptw.svg, previousCb: P.cb };
}
function petGardenPlaySuspend(P) { if (typeof petGardenGuideSuspend === 'function') petGardenGuideSuspend(P); P.puddlePlayInvite = P.puddlePlayContact = P.puddlePlayReceived = null; _ptwPlayClear(P, 'suspended'); }
function petGardenPlayState() { return _ptw.pets.map(P => ({ species: P.look.species, companion: !!P.me, slot: _ptwPlaySlot(P), invited: !!P.puddlePlayInvite, current: P.environmentPlay ? { phase: P.environmentPlay.phase, pool: P.environmentPlay.pool, stage: P.environmentPlay.index, age: +P.environmentPlay.age.toFixed(2) } : null, last: P.puddlePlayLast || null })); }
PET_BEHAVIOURS.puddlePlay = {
  when(P, W) { return !W.night && PET_PUDDLE_PLAY[P.look.species] && _ptwPlayContext(P, W) && _ptwPlayIdle(P) && _ptwSoon(P, 'puddlePlay', 90) && performance.now() >= (P.puddlePlayRestUntil || 0) && _ptwPlayPools(P).length ? 4 : 0; },
  run(P, W) { const result = _ptwPlayStart(P, W, false); if (!result.ok) { P.at_puddlePlay = performance.now() - 75000; P.busy = .7; } },
};
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) for (const P of _ptw.pets) petGardenPlaySuspend(P); });

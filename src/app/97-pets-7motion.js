/* Shared pet locomotion. Owner and peer copies use the same species data and
 * actual travelled distance; poses, clips and the existing wire stay intact. */
const PET_MOTION_FAMILIES = Object.freeze({
  trot: { period: .52, leg: 24, bob: 1.8, sway: .5, bank: 1.2, head: 3, turn: .04, stop: .025, track: 'paw' },
  scurry: { period: .25, leg: 30, bob: .8, sway: .6, bank: 1, head: 2, turn: .055, stop: .035, track: 'tiny' },
  hop: { period: .62, leg: 27, bob: 5.5, sway: 0, bank: 2, head: 2, turn: .035, stop: .06, track: 'paw' },
  plod: { period: .9, leg: 17, bob: .7, sway: .8, bank: 2.2, head: 2.5, turn: .025, stop: .018, track: 'paw' },
  waddle: { period: .66, leg: 19, bob: .7, sway: 1.2, bank: 5, head: 1.5, turn: .025, stop: .035, track: 'web' },
  paddle: { period: .84, leg: 14, bob: .45, sway: 1.2, bank: 2.1, head: 1, turn: .025, stop: .015, track: 'none' },
  glide: { period: 1.7, leg: 0, bob: 0, sway: .3, bank: .4, head: 1, turn: .012, stop: .008, track: 'trail' },
  slither: { period: 1.1, leg: 0, bob: 0, sway: 2, bank: 3, head: 3, turn: .018, stop: .012, track: 'trail' },
  scuttle: { period: .24, leg: 25, bob: .25, sway: .8, bank: .7, head: .5, turn: .015, stop: .025, track: 'tiny' },
  stomp: { period: 1, leg: 20, bob: 1.5, sway: 1.2, bank: 2.7, head: 1.5, turn: .025, stop: .04, track: 'broad' },
  roll: { period: .78, leg: 0, bob: .15, sway: .25, bank: 1, head: 1.4, turn: .018, stop: .012, track: 'wheel' },
  fly: { period: .55, leg: 0, bob: 1.5, sway: .5, bank: 4, head: 1.5, turn: .025, stop: .018, altitude: 27, wing: 56, wingPeriod: .3, track: 'none' },
  hover: { period: .7, leg: 0, bob: 1, sway: 1.2, bank: 5, head: 1, turn: .02, stop: .015, altitude: 16, wing: 35, wingPeriod: .1, track: 'none' },
  float: { period: 2.6, leg: 0, bob: 1.8, sway: .9, bank: 2, head: 1, turn: .018, stop: .012, altitude: 12, floating: true, track: 'none' },
});
const PET_MOTION_SPECIES = Object.freeze({
  cat: { period: .58, leg: 21, head: 4 }, dog: { period: .46, bob: 2.1 }, fox: { period: .48, leg: 28, bank: 1.7 }, wolf: { period: .48, leg: 29 },
  rabbit: { bob: 6.5, period: .59 }, frog: { bob: 8, period: .78, stop: .07 }, jackalope: { bob: 7.5, period: .55 },
  hamster: { period: .23, bob: .6 }, mouse: { period: .2, bob: .45 }, ferret: { period: .33, bob: 1.6, bank: 2.5 }, squirrel: { period: .3, bob: 2.6 }, hedgehog: { period: .39, leg: 18, bob: .4 }, mole: { period: .42, bob: .35 },
  duck: { bank: 6 }, goose: { period: .75, bank: 4.8 }, penguin: { period: .78, bank: 7.2 }, chick: { period: .39, bank: 4 }, moosh: { period: .82, bank: 6 },
  tortoise: { period: 1.35, bob: .15, head: .6, leg: 10 }, capybara: { period: 1.15, bob: .3, bank: .8 }, koala: { period: 1.2, bob: .35 }, bear: { period: 1, bank: 2.8 }, panda: { period: 1.05, bank: 3.4 },
  pony: { period: .48, leg: 30, bob: 2.7, track: 'hoof' }, unicorn: { period: .5, leg: 30, bob: 2.7, track: 'hoof' }, pegasus: { period: .5, leg: 31, bob: 2.8, track: 'hoof' }, fawn: { period: .5, leg: 28, bob: 2.4, track: 'hoof' }, goat: { period: .48, bob: 2.3, track: 'hoof' }, lamb: { period: .5, bob: 2.4, track: 'hoof' }, alpaca: { period: .64, leg: 25, track: 'hoof' },
  snail: { family: 'glide', period: 2.2, sway: .2, bank: .25 }, octopus: { family: 'slither', period: 1.15, sway: 1.1 }, axolotl: { period: 1, leg: 12, bank: 1.2 }, otter: { period: .36, bob: 1.1 },
  bee: { family: 'hover', altitude: 15, wingPeriod: .08, bob: .65 }, butterfly: { family: 'hover', altitude: 20, wingPeriod: .28, wing: 64, bob: 2 }, bat: { wingPeriod: .19, bank: 6, altitude: 31 }, owl: { wingPeriod: .46, wing: 48, bob: .8 }, phoenix: { wingPeriod: .4, wing: 63, altitude: 32 }, parrot: { wingPeriod: .25, altitude: 25 },
  wren: { airFamily: 'fly', wingPeriod: .2, altitude: 21, period: .4, bob: 3.2 }, robin: { airFamily: 'fly', wingPeriod: .24, altitude: 23, period: .46, bob: 3.8 }, flamingo: { period: 1.1, leg: 13, bob: .4, track: 'bird' }, peacock: { period: 1, leg: 14, bank: 1.2, track: 'bird' },
  ghost: { period: 2.8, bob: 2, altitude: 11 }, wisp: { period: 1.8, sway: 1.6, altitude: 17 }, cloud: { period: 3.2, bob: 1.2, altitude: 15 }, golem: { period: 1.25, bob: .7, leg: 14 }, yeti: { period: .88, bank: 3.2, bob: 2.1 },
});
const _ptMotionProfiles = new Map(), _ptMotionParts = new WeakMap();
function petMotionProfile(species, medium) {
  const key = species + '|' + (medium || 'ground'); if (_ptMotionProfiles.has(key)) return _ptMotionProfiles.get(key);
  const sp = petSpecies(species) || {}, own = PET_MOTION_SPECIES[species] || {};
  const family = medium === 'water' ? 'paddle' : medium === 'air' ? own.airFamily || own.family || (sp.gait === 'float' ? 'float' : sp.kind === 'bug' ? 'hover' : 'fly') : own.family || sp.gait || 'trot';
  const value = Object.freeze({ ...PET_MOTION_FAMILIES.trot, ...(PET_MOTION_FAMILIES[family] || {}), ...own, family, footprint: Math.max(.65, Math.min(2.6, (Number(sp.h) || .3) * 2.4 + .55)) });
  _ptMotionProfiles.set(key, value); return value;
}
function petGardenMotionState(P) { return P && P.motionState || null; }
function petGardenMotionStep(P, dt, t, dx, dy, stand) {
  const W = GARDEN_WORLD, distance = Math.hypot(dx * W.cellW, dy * W.cellH), moving = distance > .005 && P.tx != null;
  const airborne = stand.up > 5 && _ptwFlier(P), medium = P.wet ? 'water' : airborne ? 'air' : 'ground', profile = petMotionProfile(P.look.species, medium);
  const state = P.motionState || (P.motionState = { phase: 0, cycles: 0 });
  if (distance > .005) state.heading = Math.atan2(dy * W.cellH, dx * W.cellW);
  const stride = Math.max(5, 44 * P.per.speed * profile.period * (P.run ? .9 : 1));
  state.cycles += distance / stride; state.phase = state.cycles % 1;
  const family = profile.family, wet = !!P.wet, altitude = stand.up;
  const groundX = P.x * W.cellW, groundY = W.sky + P.y * W.cellH, feetY = W.sky + P.y * W.cellH - stand.up + stand.sink;
  const footprint = profile.footprint, shadowScale = Math.max(.35, 1 - stand.up / 110), track = profile.track, speed = distance / Math.max(.001, dt);
  state.family = family; state.moving = moving; state.wet = wet; state.airborne = airborne;
  state.altitude = altitude; state.groundX = groundX; state.groundY = groundY; state.feetY = feetY;
  state.stride = stride; state.footprint = footprint; state.shadowScale = shadowScale; state.track = track;
  state.speed = speed; state.profile = profile;
  const beat = Math.floor(state.cycles * (profile.family === 'hop' ? 1 : 2));
  if (moving && !airborne && (P.wet || profile.track !== 'none') && _ptwMotion() && !_ptw.frozen && beat !== P.motionBeat && t - (P.motionFootAt || -100) > .14) {
    P.motionBeat = beat; P.motionFootAt = t;
    if (typeof gardenPetStepEffect === 'function') gardenPetStepEffect({ pet: P, kind: P.wet ? 'wake' : 'step', family: profile.family, x: state.groundX, y: state.groundY, side: beat % 2 ? -1 : 1, size: profile.footprint, track: profile.track, angle: state.heading || 0, snow: !!(_ptw.W && _ptw.W.snow), wet: !!P.wet });
  }
}
function _ptMotionRig(P) {
  let rig = _ptMotionParts.get(P.root); if (rig) return rig;
  rig = {};
  for (const part of ['bodyg', 'head', 'tail', 'ears', 'paw', 'legsN', 'legsF', 'legsG', 'wingN', 'wingB', 'shadow']) rig[part] = P.root.querySelectorAll('.pt-' + part).map(node => ({ node, base: GardenNativeArt.matrix(node.getAttribute('transform') || ''), alpha: node._computedAlpha == null ? node.target.alpha : node._computedAlpha }));
  _ptMotionParts.set(P.root, rig); return rig;
}
function _ptMotionJoint(list, x, y, degrees, sx, sy) {
  const angle = degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle), delta = { a: c * sx, b: s * sx, c: -s * sy, d: c * sy, e: x, f: y };
  for (const joint of list) {
    if (joint.node._dead || !joint.node.target.active || joint.node._nativeAnimating) continue;
    const m = GardenNativeArt.multiply(joint.base, delta), width = Math.hypot(m.a, m.b) || 1;
    joint.node._matrix = m; joint.node.target.setPosition(m.e, m.f).setRotation(Math.atan2(m.b, m.a)).setScale(width, (m.a * m.d - m.b * m.c) / width);
  }
}
/** Passive responses stay on the existing joints and the shared ambient clock. */
function _ptMotionEnvironment(P, state, t, environment) {
  const response = state.environmentPose || (state.environmentPose = { time: t, wetBlend: state.wet ? 1 : 0, wind: 0 });
  const dt = Math.max(0, Math.min(.08, t - response.time)), follow = 1 - Math.exp(-dt * 6);
  response.time = t;
  const facing = P.dir < 0 ? -1 : 1, wind = environment && !environment.room ? Math.max(-4, Math.min(4, Number(environment.windX) || 0)) : 0, gust = environment && !environment.room ? Math.max(0, Math.min(1.5, Number(environment.gust) || 0)) : 0;
  response.wind += (wind * facing - response.wind) * follow;
  response.wetBlend += ((state.wet && !state.airborne ? 1 : 0) - response.wetBlend) * follow;
  // World position and phase match the water's broad wind-driven distortion;
  // the pet rises within its existing fixed surface clip, never moving its feet.
  const wave = t * .9 + state.groundY * .11, cross = t * 1.35 + state.groundX * .031, strength = .42 + Math.abs(wind) * .1 + gust * .2;
  response.waterY = (Math.sin(wave) * .8 + Math.sin(cross) * .2) * strength * response.wetBlend;
  response.waterBank = (Math.cos(wave) * .85 + Math.cos(cross) * .15) * (1 + gust * .35) * response.wetBlend * facing;
  const flutter = Math.sin(t * 2.2 + state.groundX * .015 + state.groundY * .009) * Math.min(1, Math.abs(response.wind)) * (.35 + gust * .45);
  response.windEar = response.wind * 1.15 + flutter;
  response.windTail = response.wind * .75 + flutter * .8;
  return response;
}
function _ptMotionPaint(P, t, owner, environment) {
  if (!P || !P.root || !gardenVisualIsNative(P.root) || !P.root.isConnected || P.wow || P.act || P.root._pcH || !['walk', 'sit'].includes(P.pose)) return;
  const state = P.motionState; if (!state) return;
  const profile = state.profile, rig = _ptMotionRig(P), moving = state.moving, phase = state.phase * Math.PI * 2, seed = typeof _ptNameHash === 'function' ? _ptNameHash(P.look.species + (P.look.coat || '')) % 100 / 10 : 0, idle = t * Math.PI * 2 / 3.8 + seed;
  let y = 0, x = 0, bank = 0, sx = 1, sy = 1, leg = 0, head = Math.sin(idle * .37) * profile.head * .45;
  if (moving) {
    leg = Math.sin(phase) * profile.leg; bank = Math.sin(phase) * profile.bank; x = Math.sin(phase) * profile.sway;
    if (profile.family === 'hop') { const lift = Math.max(0, Math.sin(phase)); y = -lift * profile.bob; sy = 1 - .035 * Math.max(0, -Math.sin(phase)); leg = -lift * profile.leg; }
    else if (profile.family === 'glide' || profile.family === 'slither') { sx = 1 + Math.sin(phase) * .025; sy = 1 - Math.sin(phase) * .012; }
    else if (profile.family === 'paddle') { y = Math.sin(phase) * profile.bob; sx = 1 + Math.sin(phase) * .012; }
    else if (state.airborne) y = Math.sin(t * 3.8 + seed) * profile.bob;
    else y = -Math.abs(Math.sin(phase)) * profile.bob;
    head = -bank * .45 + Math.sin(phase) * profile.head;
  } else if (state.airborne || profile.floating) { y = Math.sin(t * Math.PI * 2 / profile.period + seed) * profile.bob; x = Math.sin(t * .9 + seed) * profile.sway; bank = Math.sin(t * 1.1 + seed) * profile.bank; }
  else sy = 1 + Math.sin(idle) * .008;
  let tail = Math.sin(moving ? phase * .7 : idle * .65) * (profile.family === 'slither' ? 13 : state.wet ? 10 : 5), ears = moving ? -bank * .65 : Math.sin(idle * .41) * 1.5;
  const remoteWatch = !moving && P.tx == null && P.pose === 'sit' && owner && !owner.moving && owner.fish && ['cast', 'wait', 'bite', 'reel'].includes(owner.fish.state) && typeof _gllPlaceFresh === 'function' && _gllPlaceFresh(owner.pf) && Math.hypot((owner.x - P.x) * GARDEN_WORLD.cellW, (owner.y - P.y) * GARDEN_WORLD.cellH) < 130 && (Math.abs(owner.fish.bx - P.x) < .15 || (owner.fish.bx > P.x ? 1 : -1) === (P.dir < 0 ? -1 : 1));
  const attention = !moving && (P.ecology === 'watch-float' && P.fishingAttention || remoteWatch && owner.fish);
  if (attention) {
    const W = GARDEN_WORLD, ax = attention.bx == null ? attention.x : attention.bx, ay = attention.by == null ? attention.y : attention.by, dx = Math.abs((ax - P.x) * W.cellW), dy = (ay - P.y) * W.cellH + _ptwH(P.look.species) * .5, pulse = attention.pulse == null ? ['bite', 'reel'].includes(attention.state) ? Math.max(0, 1 - attention.t / .7) : 0 : attention.pulse, perk = Math.min(4, profile.head * 1.2);
    head = Math.max(-6, Math.min(8, Math.atan2(dy, dx + 8) * 180 / Math.PI * .12)) + Math.sin(idle * .37) * profile.head * .15 - pulse * perk;
    ears = Math.sin(idle * .41) * .5 - pulse * perk;
    tail = Math.sin(idle * .65) * 2 + Math.sin(t * 8 + seed) * pulse * Math.min(6, profile.head * 2);
  }
  const response = _ptMotionEnvironment(P, state, t, environment);
  y += response.waterY; bank += response.waterBank; head -= response.waterBank * .2;
  ears += response.windEar * (attention ? .35 : 1);
  tail += response.windTail * (state.wet ? .55 : attention ? .4 : 1);
  _ptMotionJoint(rig.bodyg, x, y, bank, sx, sy);
  _ptMotionJoint(rig.head, 0, 0, head, 1, 1);
  _ptMotionJoint(rig.tail, 0, 0, tail, 1, 1);
  _ptMotionJoint(rig.ears, 0, 0, ears, 1, 1);
  const opposite = profile.family === 'hop' ? leg : -leg;
  _ptMotionJoint(rig.legsN, 0, 0, leg, 1, 1); _ptMotionJoint(rig.legsG, 0, 0, leg, 1, 1); _ptMotionJoint(rig.legsF, 0, 0, opposite, 1, 1); _ptMotionJoint(rig.paw, 0, 0, opposite, 1, 1);
  if (state.airborne && profile.wing) { const flap = Math.sin(t * Math.PI * 2 / profile.wingPeriod + seed) * profile.wing; _ptMotionJoint(rig.wingN, 0, 0, flap, 1, 1); _ptMotionJoint(rig.wingB, 0, 0, -flap, 1, 1); }
  for (const joint of rig.shadow) joint.node.target.setAlpha(state.airborne ? 0 : state.wet ? joint.alpha * .2 : joint.alpha);
}
function _ptMotionPaintOnce(P, owner, t, environment, seen) {
  if (!P || seen.has(P) || _ptwGone(P)) return;
  seen.add(P); _ptMotionPaint(P, t, owner, environment);
}
/** Called after NativeArt's ambient pass by the same Phaser scene clock. */
function petGardenVisualFrame(time) {
  if (!_ptwMotion() || _ptw.frozen) return;
  const light = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), environment = light && light.environment ? light.environment() : null;
  if (environment && (environment.paused || environment.reducedMotion || environment.room)) return;
  const t = environment && Number.isFinite(environment.ambientTime) ? environment.ambientTime / 1000 : time / 1000;
  const seen = new Set();
  for (const P of _ptw.pets) _ptMotionPaintOnce(P, undefined, t, environment, seen);
  if (typeof _gll !== 'undefined') for (const A of _gll.actors.values()) if (!A.rm && !A.away) _ptMotionPaintOnce(A.pp, A, t, environment, seen);
  if (typeof _gllRoams !== 'undefined') for (const R of _gllRoams) _ptMotionPaintOnce(R.P, undefined, t, environment, seen);
}

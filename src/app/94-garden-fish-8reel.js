/* ============================================================
   GARDEN, THE CATCHING OVERHAUL: THE REEL GAME, DEEPER. The owner: fishing is "a good and fun game", complex, not simplified. The bar and the meter are the same as ever; what is new goes by the fish.

   Easy fish stay easy: under difficulty 4 a fish only swims. Above that it has moves of its own, and the words on the reel say what to do:
     dart   jumps somewhere else in a flash                keep up
     sulk   dives to the bottom and sits there, dead weight   stay on it. The meter fills slowly while it sulks
     run    tears off, and the reel screams                ease off! Holding on through a run builds line tension
     leap   shoots up and throws itself out of the water   a splash in the lake, and everyone can see it
   A heavier fish has line tension, a second bar. It rises while you hold on, fastest in a run, and falls when you let go. If it gets to the top the line snaps: a stronger line takes more, a better reel lets it fall quicker.
   The biggest need more than one round: fill the meter, and it gets its breath and goes again, a little more tired each time.
   Lost in the fight, it is remembered (gardenCatchGotAway): it may come back, with your float still in its mouth.
   ============================================================ */
const GARDEN_REEL = Object.freeze({ moveFrom: 4, moveEach: 0.08, moveMax: 0.55, tenFrom: 5.5, hold: 0.32, run: 1.5, ease: 0.5, restSecs: 1.1, sulkFill: 0.5 });
function gardenReelSetup(R, plan) {
  const u = plan.tackle || gardenTackleInUse(), reel = gardenGearDef(u.reel) || GARDEN_REELS[0], line = gardenGearDef(u.line) || GARDEN_LINES[0], hook = gardenGearDef(u.hook) || GARDEN_HOOKS[0], E = GARDEN_REEL, isFish = plan.def && plan.def.cat === 'fish';
  R.lift = reel.st.lift || 0; R.wind = reel.st.wind || 1; R.ease = reel.st.ease || 0; R.str = (line.st.str || 1) / (typeof gardenEventFactor === 'function' ? gardenEventFactor('snap') : 1); R.slip = hook.st.slip || 1;
  R.heavy = plan.diff >= E.tenFrom ? Math.min(1, (plan.diff - 4.5) / 5.5) : 0;
  R.rounds = isFish ? Math.max(1, 1 + (plan.diff >= 7 ? 1 : 0) + (plan.diff >= 9 || plan.cm >= 150 ? 1 : 0) + (reel.st.rounds || 0)) : 1;
  R.round = 1; R.tn = 0; R.tire = 1; R.rest = 0; R.mv = ''; R.help = 0; R.plan = plan;
  const body = R.el.querySelector('.gd-reel-body'), head = R.el.querySelector('.gd-reel-head');
  R.say = document.createElement('div'); R.say.className = 'gd-reel-say'; R.say.setAttribute('role', 'status'); R.el.insertBefore(R.say, body);
  if (R.rounds > 1) { R.pips = document.createElement('div'); R.pips.className = 'gd-reel-pips'; R.pips.innerHTML = Array.from({ length: R.rounds }, (_, i) => `<i class="${i ? '' : 'on'}"></i>`).join(''); head.appendChild(R.pips); }
  if (R.heavy) { const t = document.createElement('div'); t.className = 'gd-reel-tn'; t.setAttribute('aria-label', 'Line tension'); t.innerHTML = '<i></i>'; body.appendChild(t); R.tnEl = t.querySelector('i'); R.tnBox = t; }
  // a monster: anyone else in the garden can take the second line (94-garden-fish-8catch.js)
  if (R.rounds > 1 && _gw.fishing && typeof gardenLiveFx === 'function') gardenLiveFx('fish', 'big', { x: Math.floor(_gw.fishing.bx), y: Math.floor(_gw.fishing.by) });
}
/** The fish decides what to do next. Under moveFrom only the old swimming. */
function _gcrMove(R, spd, jump) {
  const E = GARDEN_REEL, r = Math.random, base = R.beh === 'mixed' ? ['smooth', 'dart', 'floater', 'sinker'][Math.floor(r() * 4)] : R.beh;
  const chance = R.diff >= E.moveFrom ? Math.min(E.moveMax, (R.diff - E.moveFrom + 1) * E.moveEach) : 0;
  let mv = '';
  if (r() < chance) {
    const roll = r();
    if (base === 'sinker') mv = roll < 0.7 ? 'sulk' : 'run';
    else if (base === 'floater') mv = roll < 0.65 ? 'leap' : 'run';
    else if (base === 'dart') mv = roll < 0.5 ? 'dart' : roll < 0.8 ? 'run' : 'leap';
    else mv = roll < 0.4 ? 'run' : roll < 0.7 ? 'sulk' : 'leap';
    if (mv === 'run' && !R.heavy && R.diff < E.tenFrom) mv = 'dart';
  }
  R.mv = mv;
  if (mv === 'sulk') { R.target = 0.06 + r() * 0.12; R.tt = 1.6 + r() * 1.2; R.sp = spd * 2; R.saying = 'It is sulking on the bottom. Stay with it'; }
  else if (mv === 'run') { R.target = r() < 0.5 ? 0.9 + r() * 0.06 : 0.06 + r() * 0.08; R.tt = 1.1 + r() * 0.9; R.sp = spd * 3; R.saying = 'It is running! Ease off'; }
  else if (mv === 'leap') { R.target = 0.94; R.tt = 0.75 + r() * 0.3; R.sp = spd * 6; R.saying = 'A leap!'; R.leapAt = R.t + 0.35; }
  else if (mv === 'dart') { R.target = 0.06 + r() * 0.88; R.tt = 0.5 + r() * 0.6; R.sp = spd * 3.2; R.saying = 'A dart! Keep up'; }
  else {
    R.saying = '';
    if (base === 'smooth') { R.target = Math.max(0.06, Math.min(0.94, R.f + (r() - 0.5) * 2 * jump * 2)); R.tt = 0.8 + r() * 1.2; R.sp = spd; }
    else if (base === 'dart' && R.diff < E.moveFrom) { R.target = Math.max(0.06, Math.min(0.94, R.f + (r() - 0.5) * 2 * (0.2 + 0.05 * R.diff))); R.tt = 0.8 + r() * 0.8; R.sp = spd * 1.6; }   // (a minnow flickers about; it does not fly across the track: easy fish stay easy)
    else if (base === 'dart') { R.target = 0.06 + r() * 0.88; R.tt = 0.45 + r() * 0.8; R.sp = spd * 2.6; }
    else if (base === 'floater') { R.target = Math.min(0.94, R.f + 0.12 + r() * 0.3); if (R.f > 0.8) R.target = 0.2 + r() * 0.3; R.tt = 0.7 + r() * 1.1; R.sp = spd * 0.9; }
    else { R.target = Math.max(0.06, R.f - 0.12 - r() * 0.3); if (R.f < 0.2) R.target = 0.6 + r() * 0.3; R.tt = 0.7 + r() * 1.1; R.sp = spd * 0.9; }
  }
}
function gardenReelStep(R, dt) {
  const E = GARDEN_REEL, F = _gw.fishing;
  R.t += dt;
  // the bar: lifted while held, falls when let go. A better reel lifts quicker
  const acc = R.hold ? 3.1 * (1 + R.lift) : -2.3, barH = R.barH + Math.min(2, R.help) * 0.04;
  R.vb = Math.max(-1.25, Math.min(1.25, R.vb + acc * dt)); R.b += R.vb * dt;
  if (R.b < 0) { R.b = 0; R.vb = R.vb < -0.5 ? -R.vb * 0.28 : 0; }
  const top = 1 - barH; if (R.b > top) { R.b = top; R.vb = 0; }
  // the fish
  R.tt -= dt;
  const spd = (0.22 + 0.075 * R.diff) * R.tire, jump = 0.14 + 0.05 * R.diff;
  if (R.rest > 0) { R.rest -= dt; R.target = 0.5; R.sp = spd * 0.6; R.mv = ''; if (R.rest <= 0) R.tt = 0; }
  else if (R.tt <= 0) _gcrMove(R, spd, jump);
  const d = R.target - R.f, step = Math.sign(d) * Math.min(Math.abs(d), (R.sp || spd) * dt * (0.5 + Math.min(1, Math.abs(d) * 3)));
  R.f += step;
  if (R.mv === 'leap' && R.leapAt && R.t >= R.leapAt) {   // out of the water: a splash in the lake itself
    R.leapAt = 0; if (F && gardenMotionOn()) { const [x, y] = _gwPx(F.bx, F.by); _gwRing(x, y, 1.6); _gwRing(x + 10, y + 2, 1); }
    if (typeof _fxSound === 'function') _fxSound('splash');
  }
  // the meter
  const inBar = R.f >= R.b - 0.015 && R.f <= R.b + barH + 0.015;
  if (inBar) { R.p += 0.2 * R.wind * (R.mv === 'sulk' ? E.sulkFill : 1) * (1 + Math.min(2, R.help) * 0.15) * dt; R.lostFor = 0; }
  else { R.p -= 0.13 * (R.line || 1) * R.slip * dt; R.lostFor += dt; if (R.lostFor > 0.3) R.perfect = false; }
  R.p = Math.max(0, Math.min(1, R.p));
  // the line: only a heavy fish can break it
  if (R.heavy) {
    if (R.hold) R.tn += R.heavy * (R.mv === 'run' ? E.run : E.hold) * dt / (R.str * (R.help ? 1.6 : 1));
    else R.tn -= (E.ease + R.ease) * dt;
    R.tn = Math.max(0, R.tn);
    R.tnEl.style.height = (Math.min(1, R.tn) * 100).toFixed(1) + '%';
    R.tnBox.classList.toggle('is-hot', R.tn > 0.7);
    if (R.tn >= 1) { _gcrSnap(R); return; }
  }
  // the words: what it is doing, or how close the line is
  const say = R.rest > 0 ? (R.restSay || '') : R.heavy && R.tn > 0.7 ? 'Careful! The line is about to snap: let go' : R.saying || '';
  if (R.say._t !== say) { R.say._t = say; R.say.textContent = say; R.say.classList.toggle('is-warn', R.heavy > 0 && R.tn > 0.7); }
  R.bar.style.bottom = (R.b * 100).toFixed(2) + '%'; R.bar.style.height = (barH * 100).toFixed(2) + '%';
  R.fish.style.bottom = `calc(${(R.f * 100).toFixed(2)}% - 15px)`;
  R.prog.style.height = (R.p * 100).toFixed(1) + '%';
  R.el.classList.toggle('is-in', inBar);
  if (R.p >= 1) {
    if (R.round < R.rounds) {   // it gets its breath and goes again
      R.round += 1; R.p = 0.35; R.rest = E.restSecs; R.tire *= 0.92; R.tn *= 0.5; R.restSay = `Round ${R.round} of ${R.rounds}. It is tiring`;
      if (R.pips) R.pips.children[R.round - 1].classList.add('on');
      return;
    }
    _gwFishLand({ perfect: R.perfect });
  } else if (R.p <= 0) {
    if (typeof gardenCatchGotAway === 'function') gardenCatchGotAway(R.plan, 'slip');
    _gfsSay('free', F.fu); _gwFishLost('It slipped the hook.');
  }
}
function _gcrSnap(R) {
  const F = _gw.fishing, weak = (gardenGearDef((R.plan.tackle || {}).line) || GARDEN_LINES[0]).tier < 3;
  if (typeof gardenCatchGotAway === 'function') gardenCatchGotAway(R.plan, 'snap');
  if (typeof _fxSound === 'function') _fxSound('splash');
  _gfsSay('free', F.fu);
  _gwFishLost(weak ? 'Snap! Your line broke. Let go when it runs, or try a stronger line.' : 'Snap! Let go when it runs.');
}

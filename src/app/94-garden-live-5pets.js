/* ============================================================
   PETS, LIVE (2.27.9). The owner, 31 Oct 2026: "I can't see my friend's pet; the pets should be syncing and all the pet actions."
   Everyone's active pet follows its person in a live garden, in its real look (the wire gives species, coat and the accessories by id; the host's own custom designs come from the
   friend's shared 'pet:items'), and does what that person's pet does, when it does it: a clip of the pet library (by id), a pat, a treat, a spectacle, a nap. Nothing is streamed:
   the follower walks by the same rule as at home (stay about a cell behind, hop to the heel when far), and an unknown id is ignored. The host's roaming pets (their pack) are
   drawn on the visitor's side from the pack the friend shares, and wander on their own with the garden's own behaviour library (PET_BEHAVIOURS), the species chosen by the host (fx roam).
   Everything is drawn by the pet kit's own _ptwNew, so it looks and moves as a pet does in your own garden.

     _gllPetStep(A, dt, svg)     once a frame for each person: their follower
     _gllPetFx(A, ev)            an fx pet / wow / nap / roam from them
     _gllRoamTell(fid)           the host: which of my pack are out (to a person who has just come in)
     gardenLivePets(pets)        your pets' real places, to who is here (gl:pp; 2.32, GARDEN_TOGETHER.md section 18)
     _gllPlacesIn(ev)            theirs: where their companion (and, from the host, the pack) really is
   ============================================================ */
const _gllRoams = [];
const _gllRoamWaiting = new Map();
function _gllRoamScope() { return typeof _glv === 'undefined' ? '' : [_glv.fid, _glv.boot, _glv.gen].join('|'); }
const _GLL_WOW_SKIP = new Set(['tint', 'vignette', 'freeze', 'nudge', 'shake', 'react', 'timestop']);   // a spectacle on someone else's pet never takes over your screen
function _gllFriendView(A) { try { return A.w === 0 && _gll.role === 'visit' ? _gdv.f : A.f ? _gscFriend(A.f) : null; } catch (e) { return null; } }
function _gllPetLook(pet, view) {
  try {
    let look = petSanitize(pet); if (!look) return null;
    if (view && typeof petWithItems === 'function') look = petWithItems(look, view);
    return look;
  } catch (e) { return null; }
}
function _gllPetDrop(A) { if (A.pp) { try { A.pp.node.remove(); } catch (e) { /* gone */ } A.pp = null; } A.ppKey = ''; }
function _gllPetBusy(P, dt) { if (P.busy > 0) { P.busy -= dt; if (P.busy <= 0 && P.cb) { const c = P.cb; P.cb = null; c(); } } }
/** A clip can finish while its owner's already-reported walk is still going. */
function _gllPetClipDone(P, rest = 1) {
  if (P.tx != null) { P.draw('walk'); return; }
  P.sit(); P.busy = rest;
}
/** Follow the same physical route without replacing an articulated clip's body. */
function _gllPetFollowTo(P, x, y, run, keepClip, then) {
  if (!keepClip) { P.walkTo(x, y, run, then); return; }
  const owner = P.root._pcH;
  P.ecology = ''; P.ecologyLift = 0; P.tx = x; P.ty = y; P.run = !!run; P.speed = run ? 2 : 1; P.stuck = 0;
  P.root.classList.toggle('pt-run', P.run);
  P.arrive = () => {
    const held = P.root && P.root._pcH === owner;
    if (then) then(held);
    else if (!held) { P.sit(); P.busy = 0.5; }
  };
}
function _gllPetStep(A, dt, svg) {
  if (!A.pet || A.petAway || !svg || typeof _ptwNew !== 'function') { if (A.pp) _gllPetDrop(A); return; }
  const W = GARDEN_WORLD, key = JSON.stringify(A.pet) + (A.w === 0 ? '|h' : '');
  if (!A.pp || A.ppKey !== key || !A.pp.node) {
    _gllPetDrop(A);
    const look = _gllPetLook(A.pet, _gllFriendView(A)); if (!look) { A.pet = null; return; }
    const P = _ptwNew(look, false), pf = _gllPlaceFresh(A.pf);
    P.x = pf ? pf.x : A.x - 1.1; P.y = pf ? pf.y : A.y + 0.2; P.tx = null; P.z = -1;
    A.pp = P; A.ppKey = key;
    if (!_ptwCanStand(P, P.x, P.y)) { P.x = A.x; P.y = A.y; }
  }
  const P = A.pp, pf = _gllPlaceFresh(A.pf);
  if (typeof _ptw !== 'undefined' && _ptw.frozen) return;
  const d = Math.hypot(A.x - P.x, (A.y - P.y) * 1.4);
  if (pf) _gllPetFix(P, pf);   // (2.32) their computer said where it is: there, not behind them
  else if (d > 9) { const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(A.x - 0.8, A.y + 0.3, 2) : null; if (f) { P.x = f.x; P.y = f.y; P.tx = null; P.z = -1; } }
  else if (!P.wow && d > (A.moving ? 2 : 5)) {
    if (P.busy > 0) { P.busy = 0; P.cb = null; if (P.act) P.setAct(''); }
    const a = Math.atan2(P.y - A.y, P.x - A.x);
    P.walkTo(A.x + Math.cos(a) * 1.1, A.y + Math.sin(a) * 0.7, d > 4);
  }
  _gllPetBusy(P, dt);
  if (pf && P.tx == null && typeof petGardenEnvironmentIdle === 'function') { const environment = _ptw.W || _ptwWorld(); if (environment) petGardenEnvironmentIdle(P, environment); }
  _ptwStep(P, dt, Date.now() / 1000);   // clock-ok: a walk cycle
  void W;
}
function _gllPetFx(A, ev) {
  const e = String(ev.e || '');
  if (ev.c === 'pet' && (e === 'away' || e === 'back')) { A.petAway = e === 'away'; if (A.petAway) _gllPetDrop(A); return; }   // their pet went on a little journey, or came home: as they see it, so do you
  let P = A.pp;
  if (ev.c === 'petplay' && ev.u != null) {
    if (A.w !== 0 || _gll.role !== 'visit' || glFxOk(ev)) return;
    const R = _gllRoams.find(r => r.u === ev.u && r.species === ev.i); if (!R) return;
    P = R.P;
  }
  if (!P) return;
  if (ev.c === 'petplay' && typeof petGardenGuideStopId === 'function' && petGardenGuideStopId(e)) {
    if (!glFxOk(ev) && typeof petGardenGuideReceivedStop === 'function') petGardenGuideReceivedStop(P, ev);
    return;
  }
  if (P.wow) return;
  if (ev.c === 'petplay') {
    if (glFxOk(ev) || typeof petClipSuits !== 'function' || !petClipSuits(e, P.look.species) || typeof petGardenPlayReceived !== 'function') return;
    petGardenPlayReceived(P, e, ev); return;
  }
  if (ev.c === 'nap') { if (e === 'on') { P.tx = null; P.sleep(120); } else { P.sit(); P.busy = 0; } return; }
  if (ev.c === 'wow') {
    const def = typeof PET_WOW !== 'undefined' && Object.prototype.hasOwnProperty.call(PET_WOW, e) ? PET_WOW[e] : null;
    if (!def || typeof petFxRun !== 'function' || !_ptwMotion()) return;
    try {
      P.tx = null; P.wow = true; P.busy = def.ms / 1000 + 0.3; P.cb = null; P.sit();
      petFxRun(Object.assign({}, def, { steps: def.steps.filter(st => !_GLL_WOW_SKIP.has(st[1])) }), _fxGardenHost(P));
    } catch (err) { P.wow = false; }
    return;
  }
  P.tx = null;
  if (e === 'pat') { P.sit({ eyes: 'happy', mouth: 'open' }); P.hearts(); P.clip('jump', 800, () => _gllPetClipDone(P, 1.5)); return; }
  if (e === 'eat') { P.sit(); P.clip('eat', 1500, () => P.clip('jump', 780, () => _gllPetClipDone(P, 1.5))); return; }
  if (typeof petClipDef !== 'function' || !petClipDef(e) || (typeof petClipSuits === 'function' && !petClipSuits(e, P.look.species))) return;   // an id this version has not heard of: nothing
  const c = petClipDef(e);
  P.sit(); P.clip(e, c.ms, () => _gllPetClipDone(P));
}
/* ---------- the host's roaming pets, on a visitor's screen ---------- */
function _gllRoamClear() { _gllRoamWaiting.clear(); for (const R of _gllRoams) { try { R.P.node.remove(); } catch (e) { /* gone */ } } _gllRoams.length = 0; if (_gllRoams.sprite) { _gllRoams.sprite.remove(); _gllRoams.sprite = null; } }
/** Pack announcements can precede the visit's renderer. A DOM placeholder
 * cannot later become a native child, so wait for the actual scene instead. */
function _gllRoamSceneReady() {
  if (typeof _gw === 'undefined' || !_gw.on || !_gw.svg || !_gw.svg.isConnected) return false;
  if (window.GardenNative && GardenNative.wanted()) { const world = GardenNative.world(); return !!(GardenNative.scene() && world && world.rootNode === _gw.svg && gardenVisualIsNative(_gw.svg)); }
  return true;
}
function _gllRoamMake(R) {
  if (!_gllRoamSceneReady()) return false;
  const old = R.P, previous = old || R.position, P = _ptwNew(petWithItems(R.look, _gdv.f), false), host = _gll.actors.get(0), fix = _gllPlaceFresh(R.fix);
  P.x = fix ? fix.x : previous ? previous.x : (host ? host.x : 10) + 1 + Math.random() * 3; P.y = fix ? fix.y : previous ? previous.y : (host ? host.y : 9) + Math.random();
  if (!_ptwCanStand(P, P.x, P.y)) { P.x = host ? host.x : 10; P.y = host ? host.y : 9; }
  if (old) { try { old.node.remove(); } catch (e) { /* the previous renderer left */ } }
  if (previous && fix) R.fix = { ...fix, seen: false };
  R.P = P; R.root = _gw.svg; R.scene = gardenVisualIsNative(_gw.svg) ? GardenNative.scene() : null; R.position = null;
  if (!_gllRoams.includes(R)) _gllRoams.push(R); _gllRoamWaiting.delete(R.species); return true;
}
function _gllRoamAdd(species) {
  if (_gll.role !== 'visit' || typeof _ptwNew !== 'function' || !_ptwMotion()) return;
  const scope = _gllRoamScope();
  if (_gllRoams.some(R => R.scope !== scope) || [..._gllRoamWaiting.values()].some(R => R.scope !== scope)) _gllRoamClear();
  const known = _gllRoams.find(R => R.species === species) || _gllRoamWaiting.get(species); if (known) return known;
  if (_gllRoams.length + _gllRoamWaiting.size >= 3) return;
  let looks = []; try { looks = _ptFriendPack(_gdv.f); } catch (e) { looks = []; }
  const look0 = looks.find(l => l.species === species); if (!look0) return;
  const R = { species, look: look0, P: null, scope }; _gllRoamWaiting.set(species, R); _gllRoamMake(R);
  if (!_gllRoams.sprite) _gllRoams.sprite = gardenWorldAdd({ id: 'gll-roam', simulationOnly: true, x: 0, y: 0, still: true, update(dt) { _gllRoamStep(dt); } });
  return R;
}
function _gllRoamStep(dt) {
  const scope = _gllRoamScope();
  if (_gll.role !== 'visit' || _gllRoams.some(R => R.scope !== scope) || [..._gllRoamWaiting.values()].some(R => R.scope !== scope)) { _gllRoamClear(); return; }
  // A remount retires the old graph. Preserve only its same-session physical
  // position/received row, then compile a new pet when the new root is ready.
  for (let i = _gllRoams.length - 1; i >= 0; i--) {
    const R = _gllRoams[i], root = typeof _gw === 'undefined' ? null : _gw.svg;
    if (R.root === root && (!R.scene || window.GardenNative && R.scene === GardenNative.scene())) continue;
    R.position = { x: R.P.x, y: R.P.y }; try { R.P.node.remove(); } catch (e) { /* the old scene already left */ }
    R.P = null; R.root = R.scene = null; _gllRoams.splice(i, 1); _gllRoamWaiting.set(R.species, R);
  }
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  if (_gll.role !== 'visit' || !_gllRoamSceneReady()) return;
  for (const R of _gllRoamWaiting.values()) _gllRoamMake(R);
  if (typeof _ptw !== 'undefined' && _ptw.frozen) return;
  const rain = !!(m.rain && m.rain.now), W = { m, rain, wet: rain || !!(m.rain && m.rain.last && m.now - m.rain.last < 3 * 3600000), snow: !!(m.rain && m.rain.snow), night: m.tod === 'night', day: m.tod === 'day', pets: _gllRoams.map(R => R.P), blooms: (m.plants || []).filter(p => p.stage >= 3 && p.def && ['flower', 'wild', 'herb', 'exotic'].includes(p.def.cat)).slice(0, 40) };
  for (const R of _gllRoams) {
    const native = gardenVisualIsNative(_gw.svg);
    if (gardenVisualIsNative(R.P.node) !== native || native && R.P.node.scene !== GardenNative.scene()) _gllRoamMake(R);
    const fix = _gllPlaceFresh(R.fix);   // (2.32) the host's computer said where it is
    if (fix) { _gllPetFix(R.P, fix); _gllPetBusy(R.P, dt); if (R.P.tx == null && typeof petGardenEnvironmentIdle === 'function') petGardenEnvironmentIdle(R.P, W); }
    else if (!R.P.wow) { try { _ptwThink(R.P, W, dt); } catch (e) { R.P.busy = 2; } }
    _ptwStep(R.P, dt, Date.now() / 1000);   // clock-ok: a walk cycle
  }
}
function _gllRoamTell(fid) {
  if (typeof _ptw === 'undefined' || !_ptw.on) return;
  for (const P of _ptw.pets) if (P.lf) P.lf.force = true;   // (2.32) and where they are: the next frame sends the places again
  for (const P of _ptw.pets.filter(q => !q.me).slice(0, 3)) if (P.look && /^[A-Za-z0-9_-]{1,64}$/.test(P.look.species)) _glhSend(fid, 'fx', { c: 'roam', e: P.look.species });
}

/* ---------- where pets really are (2.32, GARDEN_TOGETHER.md section 18) ----------
   The owner's pet is the truth about where it is: a pet that wanders, sniffs a flower or trots over to a friend's pet is somewhere nobody else could guess, so the owner's computer says where it is
   (gl:pp, tenths of a cell): the end point of a walk when one starts or changes (and every few seconds while it goes on), the place it came to rest, and "still here" now and then. Everyone else walks their copy to
   that spot at the pet's own pace, a little faster or slower to catch up, and puts it there if it is far off. A copy with no place (an older app, or one that has gone quiet for GL_PP.stale ms) follows its person
   as before, so nothing here is needed to play. Calm mode still sends the "still here". */
const _gllPp = { at: 0, since: 0, warm: 0 };
const _gllClamp = (n, hi) => Math.max(0, Math.min(hi, Math.round(n)));
function gardenLivePets(pets) {
  try {
    if (_gll.role !== 'host' && _gll.role !== 'visit') { _gllPp.since = 0; return; }
    const t = Date.now();   // clock-ok: spacing messages
    if (t - _gllPp.at < 250) return;
    _gllPp.at = t;
    if (_gll.role === 'visit' ? !_glvLive() : !(_glh.on && _glhAnyone() && _glhLooking())) { _gllPp.since = 0; return; }
    if (!_gllPp.since) { _gllPp.since = t; _gllPp.warm = 0; }
    const age = t - _gllPp.since, warm = age >= 8000 ? 2 : age >= 2500 ? 1 : 0;
    const again = warm > _gllPp.warm;   // twice after it starts, in case the first came before they had drawn us
    if (again) _gllPp.warm = warm;
    const gap = _gll.role === 'visit' && _glv.mode === 'thin' ? GL_PP.thin : GL_PP.gap, l = [], sent = [];
    let pack = 0;
    for (const P of pets) {
      if (!P || !P.look || !P.node) continue;
      if (typeof _ptwGone === 'function' && _ptwGone(P)) continue;   // (away on a journey: there is no place to say)
      const mine = !!P.me;
      if (!mine && (_gll.role !== 'host' || pack >= 3)) continue;   // the pack is the host's to show
      const u = mine ? 0 : ++pack;
      const L = P.lf || (P.lf = { at: 0, mv: false, stopT: 0, force: true });
      if (again) L.force = true;
      const mv = P.tx != null;
      let due = false;
      if (L.force) due = true;
      else if (mv) { L.stopT = 0; due = !L.mv || L.tx !== P.tx || L.ty !== P.ty || t - L.at >= gap; }   // (a walk is its end point: the other screens walk it themselves, so it is said when it starts or changes, and now and then to stay close)
      else if (L.mv) {
        if (!L.stopT) L.stopT = t;
        due = t - L.stopT >= GL_PP.settle;
        // (it stopped where everyone was told it was going: their copy stops there too, and needs no word)
        if (due && L.tx != null && Math.hypot(P.x - L.tx, P.y - L.ty) < 0.4) { due = false; L.mv = false; L.stopT = 0; L.at = t; }
      }
      else due = t - L.at >= GL_PP.idle;
      if (!due) continue;
      const forced = L.force;
      L.force = false; L.at = t; L.mv = mv; L.stopT = 0; L.tx = P.tx; L.ty = P.ty;
      const row = { u, x: _gllClamp(P.x * 10, 640), y: _gllClamp(P.y * 10, GARDEN_WORLD.rows * 10) };
      if (!mine) row.e = P.look.species;
      if (mv && P.ty != null) { row.gx = _gllClamp(P.tx * 10, 640); row.gy = _gllClamp(P.ty * 10, GARDEN_WORLD.rows * 10); if (P.run) row.r = 1; }
      if (P.dir < 0) row.f = 1;
      const sig = JSON.stringify(row);
      if (!forced && sig === L.wireSig && t - (L.wireAt || 0) < GL_PP.idle) { _gllPp.sameSkipped = (_gllPp.sameSkipped || 0) + 1; continue; }
      L.wireSig = sig; L.wireAt = t;
      l.push(row); sent.push(L);
    }
    if (!l.length) return;
    const body = { l };
    if (glPpOk(body, _gll.role === 'host')) return;
    const sending = _gll.role === 'visit' ? _glvSend('pp', body) : _glhSend('all', 'pp', body);
    Promise.resolve(sending).then((r) => { if (r == null) for (const L of sent) L.force = true; });
  } catch (err) { /* only a message */ }
}
/** Their pets' places: the companion of whoever sent it, and (from the host) the pack. */
function _gllPlacesIn(ev) {
  try {
    const A = _gll.actors.get(ev.w); if (!A || !Array.isArray(ev.l)) return;
    const t = Date.now();   // clock-ok: how old a place is
    for (const r of ev.l) {
      if (!r || !Number.isFinite(r.x) || !Number.isFinite(r.y)) continue;
      const f = { x: r.x / 10, y: r.y / 10, gx: Number.isFinite(r.gx) ? r.gx / 10 : null, gy: Number.isFinite(r.gy) ? r.gy / 10 : null, run: r.r === 1, left: r.f === 1, at: t, seen: false };
      if (r.u === 0) { A.pf = f; continue; }
      if (ev.w !== 0 || _gll.role !== 'visit' || !/^[A-Za-z0-9_-]{1,64}$/.test(String(r.e || ''))) continue;
      const sp = String(r.e);
      const R = typeof _gllRoamAdd === 'function' ? _gllRoamAdd(sp) : _gllRoams.find(q => q.species === sp);
      if (R) { R.fix = f; R.u = r.u; }
    }
  } catch (err) { /* a place we cannot read */ }
}
function _gllPlaceFresh(f) { return f && Date.now() - f.at < GL_PP.stale ? f : null; }   // clock-ok: how old a place is
/** Walk a copy of a pet to where its owner says it is. Once for each place that arrives; the walk goes on by itself in between (_ptwStep). */
function _gllPetFix(P, f) {
  if (!P || !f || f.seen || P.wow) return;
  f.seen = true;
  const previous = P._gllFollowIntent, moving = f.gx != null;
  // A periodic place on the same route is not a new action. A changed goal,
  // run command, or stop before that goal can replace the authored clip.
  const changed = previous && (moving ? previous.gx == null || previous.gx !== f.gx || previous.gy !== f.gy || previous.run !== !!f.run : previous.gx != null && Math.hypot(f.x - previous.gx, f.y - previous.gy) > 0.45);
  const keepClip = !!(P.root && P.root._pcH) && !changed;
  P._gllFollowIntent = { gx: moving ? f.gx : null, gy: moving ? f.gy : null, run: !!f.run };
  const err = Math.hypot(f.x - P.x, (f.y - P.y) * 1.4);
  if (err > GL_PP.snap) {
    const q = !_ptwCanStand(P, f.x, f.y) && typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(f.x, f.y, 2) : null;   // (on the water or up on something: exactly there, if it can be: its own screen said so)
    P.x = q ? q.x : f.x; P.y = q ? q.y : f.y; P.tx = null; P.z = -1;
  }
  if (!keepClip && (changed || P.busy > 0 && (f.gx != null || err > 0.3))) { P.busy = 0; P.cb = null; if (P.act) P.setAct(''); }
  if (f.gx != null) {
    _gllPetFollowTo(P, f.gx, f.gy, f.run, keepClip);
    const dx = f.gx - f.x, dy = f.gy - f.y, dl = Math.hypot(dx, dy) || 1;
    const lag = ((f.x - P.x) * dx + (f.y - P.y) * dy) / dl;   // cells it is behind along the way (below zero: ahead)
    P.speed = (f.run ? 2 : 1) * Math.max(0.6, Math.min(2, 1 + lag * 0.5));
  } else {
    const now = Math.hypot(f.x - P.x, (f.y - P.y) * 1.4);
    if (now > 0.3) _gllPetFollowTo(P, f.x, f.y, now > 2.5, keepClip, held => { if (!held) { P.sit(); P.busy = 0.5; } P.dir = f.left ? -1 : 1; });
    else if (P.tx != null) { P.tx = null; if (!keepClip) P.sit(); else { P.run = false; P.root.classList.remove('pt-run'); } P.dir = f.left ? -1 : 1; }
    else if (!keepClip && P.pose !== 'sleep' && P.busy <= 0) { if (P.pose === 'walk') P.sit(); P.dir = f.left ? -1 : 1; }
  }
}

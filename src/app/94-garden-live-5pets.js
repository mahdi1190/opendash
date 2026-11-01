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
function _gllPetStep(A, dt, svg) {
  if (!A.pet || !svg || typeof _ptwNew !== 'function') { if (A.pp) _gllPetDrop(A); return; }
  const W = GARDEN_WORLD, key = JSON.stringify(A.pet) + (A.w === 0 ? '|h' : '');
  if (!A.pp || A.ppKey !== key || !A.pp.node) {
    _gllPetDrop(A);
    const look = _gllPetLook(A.pet, _gllFriendView(A)); if (!look) { A.pet = null; return; }
    const P = _ptwNew(look, false), pf = _gllPlaceFresh(A.pf);
    P.x = pf ? pf.x : A.x - 1.1; P.y = pf ? pf.y : A.y + 0.2; P.tx = null; P.z = -1;
    A.pp = P; A.ppKey = key;
    if (!_ptwFree(P.x, P.y)) { P.x = A.x; P.y = A.y; }
  }
  const P = A.pp, pf = _gllPlaceFresh(A.pf);
  const d = Math.hypot(A.x - P.x, (A.y - P.y) * 1.4);
  if (pf) _gllPetFix(P, pf);   // (2.32) their computer said where it is: there, not behind them
  else if (d > 9) { const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(A.x - 0.8, A.y + 0.3, 2) : null; if (f) { P.x = f.x; P.y = f.y; P.tx = null; P.z = -1; } }
  else if (!P.wow && d > (A.moving ? 2 : 5)) {
    if (P.busy > 0) { P.busy = 0; P.cb = null; if (P.act) P.setAct(''); }
    const a = Math.atan2(P.y - A.y, P.x - A.x);
    P.walkTo(A.x + Math.cos(a) * 1.1, A.y + Math.sin(a) * 0.7, d > 4);
  }
  _gllPetBusy(P, dt);
  _ptwStep(P, dt, Date.now() / 1000);   // clock-ok: a walk cycle
  void W;
}
function _gllPetFx(A, ev) {
  const P = A.pp; if (!P || P.wow) return;
  const e = String(ev.e || '');
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
  if (e === 'pat') { P.sit({ eyes: 'happy', mouth: 'open' }); P.hearts(); P.clip('jump', 800, () => { P.sit(); P.busy = 1.5; }); return; }
  if (e === 'eat') { P.sit(); P.clip('eat', 1500, () => P.clip('jump', 780, () => { P.sit(); P.busy = 1.5; })); return; }
  if (typeof petClipDef !== 'function' || !petClipDef(e) || (typeof petClipSuits === 'function' && !petClipSuits(e, P.look.species))) return;   // an id this version has not heard of: nothing
  const c = petClipDef(e);
  P.sit(); P.clip(e, c.ms, () => { P.sit(); P.busy = 1; });
}
/* ---------- the host's roaming pets, on a visitor's screen ---------- */
function _gllRoamClear() { for (const R of _gllRoams) { try { R.P.node.remove(); } catch (e) { /* gone */ } } _gllRoams.length = 0; if (_gllRoams.sprite) { _gllRoams.sprite.remove(); _gllRoams.sprite = null; } }
function _gllRoamAdd(species) {
  if (_gll.role !== 'visit' || _gllRoams.length >= 3 || typeof _ptwNew !== 'function' || !_ptwMotion()) return;
  if (_gllRoams.some(R => R.species === species)) return;
  let looks = []; try { looks = _ptFriendPack(_gdv.f); } catch (e) { looks = []; }
  const look0 = looks.find(l => l.species === species); if (!look0) return;
  const P = _ptwNew(petWithItems(look0, _gdv.f), false), host = _gll.actors.get(0);
  P.x = (host ? host.x : 10) + 1 + Math.random() * 3; P.y = (host ? host.y : 9) + Math.random(); if (!_ptwFree(P.x, P.y)) { P.x = host ? host.x : 10; P.y = host ? host.y : 9; }
  _gllRoams.push({ species, P });
  if (!_gllRoams.sprite) _gllRoams.sprite = gardenWorldAdd({ id: 'gll-roam', svg: '', x: 0, y: 0, still: true, update(dt) { _gllRoamStep(dt); } });
}
function _gllRoamStep(dt) {
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  const W = { m, rain: !!(m.rain && m.rain.now), night: m.tod === 'night', day: m.tod === 'day', pets: _gllRoams.map(R => R.P), blooms: (m.plants || []).filter(p => p.stage >= 3 && p.def && ['flower', 'wild', 'herb', 'exotic'].includes(p.def.cat)).slice(0, 40) };
  for (const R of _gllRoams) {
    const fix = _gllPlaceFresh(R.fix);   // (2.32) the host's computer said where it is
    if (fix) _gllPetFix(R.P, fix);
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
    const gap = _gll.role === 'visit' && _glv.mode === 'thin' ? GL_PP.thin : GL_PP.gap, l = [];
    let pack = 0;
    for (const P of pets) {
      if (!P || !P.look || !P.node) continue;
      const mine = !!P.me;
      if (!mine && (_gll.role !== 'host' || pack >= 3)) continue;   // the pack is the host's to show
      const u = mine ? 0 : ++pack;
      const L = P.lf || (P.lf = { at: 0, mv: false, stopT: 0, force: true });
      if (again) L.force = true;
      const mv = P.tx != null;
      let due = false;
      if (L.force) due = true;
      else if (mv) { L.stopT = 0; due = !L.mv || L.tx !== P.tx || L.ty !== P.ty || t - L.at >= gap; }   // (a walk is its end point: the other screens walk it themselves, so it is said when it starts or changes, and now and then to stay close)
      else if (L.mv) { if (!L.stopT) L.stopT = t; due = t - L.stopT >= GL_PP.settle; }
      else due = t - L.at >= GL_PP.idle;
      if (!due) continue;
      L.force = false; L.at = t; L.mv = mv; L.stopT = 0; L.tx = P.tx; L.ty = P.ty;
      const row = { u, x: _gllClamp(P.x * 10, 640), y: _gllClamp(P.y * 10, 320) };
      if (!mine) row.e = P.look.species;
      if (mv && P.ty != null) { row.gx = _gllClamp(P.tx * 10, 640); row.gy = _gllClamp(P.ty * 10, 320); if (P.run) row.r = 1; }
      if (P.dir < 0) row.f = 1;
      l.push(row);
    }
    if (!l.length) return;
    const body = { l };
    if (glPpOk(body, _gll.role === 'host')) return;
    if (_gll.role === 'visit') _glvSend('pp', body); else _glhSend('all', 'pp', body);
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
      if (typeof _gllRoamAdd === 'function') _gllRoamAdd(sp);
      const R = _gllRoams.find(q => q.species === sp);
      if (R) R.fix = f;
    }
  } catch (err) { /* a place we cannot read */ }
}
function _gllPlaceFresh(f) { return f && Date.now() - f.at < GL_PP.stale ? f : null; }   // clock-ok: how old a place is
/** Walk a copy of a pet to where its owner says it is. Once for each place that arrives; the walk goes on by itself in between (_ptwStep). */
function _gllPetFix(P, f) {
  if (!P || !f || f.seen || P.wow) return;
  f.seen = true;
  const err = Math.hypot(f.x - P.x, (f.y - P.y) * 1.4);
  if (err > GL_PP.snap) {
    const q = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(f.x, f.y, 2) : null;
    P.x = q ? q.x : f.x; P.y = q ? q.y : f.y; P.tx = null; P.z = -1;
  }
  if (P.busy > 0 && (f.gx != null || err > 0.3)) { P.busy = 0; P.cb = null; if (P.act) P.setAct(''); }
  if (f.gx != null) {
    P.walkTo(f.gx, f.gy, f.run);
    const dx = f.gx - f.x, dy = f.gy - f.y, dl = Math.hypot(dx, dy) || 1;
    const lag = ((f.x - P.x) * dx + (f.y - P.y) * dy) / dl;   // cells it is behind along the way (below zero: ahead)
    P.speed = (f.run ? 2 : 1) * Math.max(0.6, Math.min(2, 1 + lag * 0.5));
  } else {
    const now = Math.hypot(f.x - P.x, (f.y - P.y) * 1.4);
    if (now > 0.3) P.walkTo(f.x, f.y, now > 2.5, () => { P.sit(); P.busy = 0.5; P.dir = f.left ? -1 : 1; });
    else if (P.tx != null) { P.tx = null; P.sit(); P.dir = f.left ? -1 : 1; }
    else if (P.pose !== 'sleep' && P.busy <= 0) P.dir = f.left ? -1 : 1;
  }
}

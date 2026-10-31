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
    const P = _ptwNew(look, false);
    P.x = A.x - 1.1; P.y = A.y + 0.2; P.tx = null; P.z = -1;
    A.pp = P; A.ppKey = key;
    if (!_ptwFree(P.x, P.y)) { P.x = A.x; P.y = A.y; }
  }
  const P = A.pp;
  const d = Math.hypot(A.x - P.x, (A.y - P.y) * 1.4);
  if (d > 9) { const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(A.x - 0.8, A.y + 0.3, 2) : null; if (f) { P.x = f.x; P.y = f.y; P.tx = null; P.z = -1; } }
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
  for (const R of _gllRoams) { if (!R.P.wow) { try { _ptwThink(R.P, W, dt); } catch (e) { R.P.busy = 2; } } _ptwStep(R.P, dt, Date.now() / 1000); }   // clock-ok: a walk cycle
}
function _gllRoamTell(fid) {
  if (typeof _ptw === 'undefined' || !_ptw.on) return;
  for (const P of _ptw.pets.filter(q => !q.me).slice(0, 3)) if (P.look && /^[A-Za-z0-9_-]{1,64}$/.test(P.look.species)) _glhSend(fid, 'fx', { c: 'roam', e: P.look.species });
}

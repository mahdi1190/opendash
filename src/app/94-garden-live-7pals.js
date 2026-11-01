/* ============================================================
   PET PLAYDATES (2.32, docs/dev/GARDEN_TOGETHER.md section 18). Two people's pets that stay close for a moment greet each other, and a pet remembers the friend it played with:
   a playdate on a new day is another day of knowing each other, and pets that have played on enough days are pals, then best pals. Pals trot over to each other when they are a few
   cells apart. Nothing is sent: every screen sees where both pets really are (gl:pp, 94-garden-live-5pets.js), so each computer works the playdate out for itself and makes
   its OWN pet do it (which the others see as any other clip). A playdate needs only the pets that are out: a friend with no pet, or whose pet does not walk, has no playdate.

   What is kept (state.pet.pals, a map by friend id: ids and numbers only, never a name; the name is read from Friends when it is shown):
     {friend id: {n: playdates, d: days with one, l: the last day, f: the first day, sp: the species of their pet}}   at most GL_PLAY.keep friends
   The friendship bonus: the first playdate with a friend each day gives the pet GL_PLAY.bond points of its own friendship (petBondGive 'play', inside its daily limit), and
   becoming pals or best pals is a line in the pet's journal. Nothing here gives coins.

     gardenPalMeet(fid, species)   a playdate happened: remember it
     gardenPalRows()               the friends this companion has played with, for the pet's page
   ============================================================ */
const _glp = { at: 0, near: new Map(), cool: new Map(), trot: new Map() };
function _glpMine() { try { return typeof _ptw !== 'undefined' && _ptw.on && _ptw.pets.length ? _ptw.pets.find(P => P.me) || null : null; } catch (e) { return null; } }
/** Which friend is this person? A host knows everyone it lets in; a visitor only the host (a guest never learns another guest's friend id), so those two have playdates but no memory of them. */
function _glpFid(A) { return _gll.role === 'host' ? String(A.f || '') : _gll.role === 'visit' && A.w === 0 ? String(_glv.fid || '') : ''; }
function _glpDays(fid) { const p = _ptS(), e = p.pals && p.pals[fid]; return e ? Number(e.d) || 0 : 0; }
function _glpName() { try { return petName(petGet()); } catch (e) { return 'Your pet'; } }

/** Once a frame (cheap: looks in twice a second). */
function _glpStep() {
  const t = Date.now();   // clock-ok: a rate window and how long two pets have been near
  if (t - _glp.at < 500) return;
  _glp.at = t;
  const P = _glpMine();
  if (!P || P.wow || typeof _gll === 'undefined') { _glp.near.clear(); return; }
  for (const A of _gll.actors.values()) {
    const Q = A.pp;
    if (!Q || Q.wow || !A.pet || A.me) continue;
    const d = Math.hypot(P.x - Q.x, (P.y - Q.y) * 1.4), fid = _glpFid(A), lv = fid ? glPlayLevel(_glpDays(fid)) : 0;
    const idle = P.busy <= 0 && P.tx == null && P.pose !== 'sleep' && Q.pose !== 'sleep';
    if (d <= GL_PLAY.near) {
      if (!_glp.near.has(A.w)) _glp.near.set(A.w, t);
      if (idle && t - _glp.near.get(A.w) >= GL_PLAY.hold && t - (_glp.cool.get(A.w) || 0) >= GL_PLAY.cool) _glpGreet(A, P, Q, fid);
    } else {
      _glp.near.delete(A.w);
      // a pet that knows the other trots over (not while either is busy, and not again for a minute)
      if (lv >= 1 && d <= GL_PLAY.trot && idle && !P.lifeGoal && t - (_glp.trot.get(A.w) || 0) >= 60000 && t - (_glp.cool.get(A.w) || 0) >= GL_PLAY.cool && Q.tx == null) {
        _glp.trot.set(A.w, t);
        const side = Q.x > P.x ? -1 : 1;
        P.walkTo(Q.x + side * 1.2, Q.y + 0.1, true);
      }
    }
  }
}
function _glpGreet(A, P, Q, fid) {
  const t = Date.now();   // clock-ok: a rate window
  _glp.cool.set(A.w, t); _glp.near.delete(A.w);
  const lv = fid ? glPlayLevel(_glpDays(fid) + 1) : 0;   // (this one counts)
  P.tx = null; P.run = false; P.dir = Q.x >= P.x ? 1 : -1;
  P.sit({ eyes: 'happy', mouth: 'open' });
  P.clip(lv >= 3 ? 'jump' : 'wiggle', lv >= 3 ? 800 : 1500, () => { P.hearts(); P.sit(); P.busy = 1.5; });
  if (lv >= 2) P.hearts();
  const who = String(A.n || 'a friend').split(/\s+/)[0];
  if (typeof _gllFeed === 'function') _gllFeed(`${_glpName()} is playing with ${who}’s pet`);
  if (fid) gardenPalMeet(fid, A.pet && A.pet.species);
}

/** A playdate with this friend's pet happened. Returns the level now (0 to 3). */
function gardenPalMeet(fid, species) {
  try {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(fid || ''))) return 0;
    const p = _ptS(true), pals = _ptcMap(p, 'pals'), today = _ptToday();
    let e = pals[fid];
    if (!e) {
      if (Object.keys(pals).length >= GL_PLAY.keep) return 0;
      e = pals[fid] = { n: 0, d: 0, l: '', f: today };
    }
    const first = e.l !== today, was = glPlayLevel(e.d);
    e.n = Math.min(9999, (Number(e.n) || 0) + 1);
    if (first) { e.d = Math.min(999, (Number(e.d) || 0) + 1); e.l = today; }
    if (/^[A-Za-z0-9_-]{1,64}$/.test(String(species || ''))) e.sp = String(species);
    const lv = glPlayLevel(e.d);
    if (first && typeof petBondGive === 'function') { try { petBondGive('play'); } catch (err) { /* only a bonus */ } }
    if (lv > was && lv >= 2) {
      const f = typeof _gscFriend === 'function' ? _gscFriend(fid) : null, who = f ? _gscFirst(fid) : 'a friend';
      try { _ptNote('pal-' + lv + '-' + _ptHash(fid).toString(36), { d: today }); } catch (err) { /* the journal is full */ }
      if (typeof toast === 'function') gardenToast(`${_glpName()} and ${who}’s pet are ${lv >= 3 ? 'best pals' : 'pals'} now.`, { icon: 'heart', kind: 'ok', timeout: 5000 });
    }
    if (typeof saveUI === 'function') saveUI();
    return lv;
  } catch (err) { return 0; }
}

/** The friends this companion has played with, the ones it knows best first: [{fid, name, species, level, days, plays, last}]. A friend you no longer have is left out. */
function gardenPalRows() {
  const p = _ptS(), out = [];
  for (const [fid, e] of Object.entries(p.pals || {})) {
    if (!e || typeof e !== 'object') continue;
    const f = typeof _gscFriend === 'function' ? _gscFriend(fid) : null;
    if (!f || f.status !== 'friend') continue;
    const sp = typeof petSpecies === 'function' && e.sp ? petSpecies(e.sp) : null;
    out.push({ fid, name: _gscFirst(fid), species: sp ? sp.label : '', level: glPlayLevel(e.d), days: Number(e.d) || 0, plays: Number(e.n) || 0, last: String(e.l || '') });
  }
  return out.sort((a, b) => b.days - a.days || String(b.last).localeCompare(String(a.last)));
}

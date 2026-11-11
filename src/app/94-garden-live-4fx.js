/* ============================================================
   WHAT PEOPLE DO THAT YOU CAN SEE (2.27.9, docs/dev/GARDEN_TOGETHER.md section 11). One small event for each step, sent by the person doing it (gl:fx; ids and cells, never a stream):
   a line cast, a bite, the reel, the fish landed; a net's creep, swing and miss; a catch or find held up; something made at the bench; a pet's trick (94-garden-live-5pets.js).
   On the other side the person's figure does it: the rod, the line and the bobber are drawn on THEIR figure, the splash is heard if sounds are on, and a catch is held up over
   their head with their name. Something that happens off your screen is one short line in a small corner feed ("Sam caught a bream"), never a toast.

     gardenLiveFx(c, e, o)      you did it: tell who is here (nothing when nobody is). c, e as GL_FX_KINDS / GL_FX_STEPS; o: {i, x, y, n, ql, nw}
     _gllFxPlay(A, ev)          they did it: A is their figure
     _gllFxStep(A, dt)          once a frame for each person: their line
   ============================================================ */
function gardenLiveFx(c, e, o) {
  try {
    if (c === 'hall' && e === 'in' && typeof gardenKiteReleaseLocal === 'function') gardenKiteReleaseLocal();
    if ((c === 'hall' && e === 'in' || c === 'fish' && e === 'cast' || c === 'pose' && e === 'on') && typeof gardenSoapReleaseLocal === 'function') gardenSoapReleaseLocal();
    if ((c === 'hall' && e === 'in' || c === 'fish' && e === 'cast' || c === 'pose' && e === 'on') && typeof gardenLeafBoatReleaseLocal === 'function') gardenLeafBoatReleaseLocal();
    if (c === 'hall' && (e === 'in' || e === 'out') && typeof gardenLeafBoatRoomChanged === 'function') gardenLeafBoatRoomChanged(e === 'in');
    if (c === 'hall' && (e === 'in' || e === 'out') && typeof gardenMarbleRoomChanged === 'function') gardenMarbleRoomChanged(e === 'in');
    const body = Object.assign({ c, e: String(e) }, o || {});
    for (const k of Object.keys(body)) if (body[k] == null || (body[k] === 0 && (k === 'n' || k === 'ql' || k === 'nw'))) delete body[k];
    if (glFxOk(body)) return;
    if (c === 'fish' && e === 'cast') _gllGoNow();   // (where you really stand goes first: everyone's figure must be there for the line)
    if (c === 'got' && _gll.role === 'host' && typeof _glgOwnGot === 'function') _glgOwnGot(String(e), body.i);   // (the host's own catch counts towards a shared goal)
    if (_gll.role === 'visit') { if (_glvLive()) _glvSend('fx', body); return; }
    if (_gll.role === 'host' && _glh.on && _glhAnyone()) _glhSend('all', 'fx', body);
  } catch (err) { /* only a message */ }
}
function gardenLivePet(c, e, o) {
  if (_gll.role === 'host' && !(typeof _glhLooking === 'function' && _glhLooking())) return;
  // (what you did to it goes at once; what it does by itself, one clip at most every few seconds. Each screen's copy goes on being a pet in between)
  if (c === 'pet' && e !== 'pat' && e !== 'eat') { const t = Date.now(); if (t - (_gll.petAt || 0) < 6000) return; _gll.petAt = t; }   // clock-ok: spacing
  if (c === 'petplay') {
    const t = Date.now(), slot = o && o.u || 0, times = _gll.petPlayAt || (_gll.petPlayAt = {});
    if (t - (times[slot] || 0) < 6000 || !slot && t - (_gll.petAt || 0) < 6000) return;
    times[slot] = t; if (!slot) _gll.petAt = t;
  }
  gardenLiveFx(c, e, o);
}
/** You have stopped and are about to do something where you stand: if that is not quite where you last said you were going, they hear it now. */
function _gllGoNow() {
  if (typeof _gw === 'undefined') return;
  const x = _gw.px, y = _gw.py;
  if (_gll.role === 'visit') {
    if (!_glvLive() || Math.hypot(x - _glv.goX, y - _glv.goY) < 0.15) return;
    clearTimeout(_glv.goT);
    _glv.lastGo = _glv.goAt = Date.now(); _glv.goX = x; _glv.goY = y;   // clock-ok: spacing messages
    _glvSend('go', { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  } else if (_gll.role === 'host' && _glh.on && _glhAnyone() && Math.hypot(x - (_glh.goX || 0), y - (_glh.goY || 0)) >= 0.15) gardenLiveWalked({ x, y });
}
/** A moment of yours that the others in the garden cheer (2.29.0): a garden level (v: the level), an achievement (v: its id) or a photo taken. Nothing when nobody is there. */
function gardenLiveCheer(e, v) {
  if (e === 'level') { const n = Math.round(Number(v)); if (n >= 1 && n <= 99) gardenLiveFx('cheer', 'level', { n }); }
  else if (e === 'ach') { if (/^[A-Za-z0-9_-]{1,64}$/.test(String(v || '')) && typeof _pfAutoBadgeOk === 'function' && _pfAutoBadgeOk(String(v))) gardenLiveFx('cheer', 'ach', { i: String(v) }); }   // (only the groups a profile's automatic showcase may show: never money, places, health or memories)
  else if (e === 'photo') gardenLiveFx('cheer', 'photo');
}
/** What a friend or the game did: the message line, like every other message. */
function _gllFeed(text) { gardenMessage(text); }
function _gllOffscreen(A) { try { return typeof _gwInView === 'function' ? !_gwInView(A.x, A.y, 1) : false; } catch (e) { return false; } }
const _GLL_FX_KIND = Object.freeze({ fish: 'fish', bug: 'bug', keep: 'keep', craft: 'craft', crop: 'crop', gear: 'gear' });
const _GLL_TOOL_CELLS = 16;   // Same presentation-only maximum as gl:res.
const _gllToolFeedbackState = { root: null, scope: '', seen: new Set(), played: {}, duplicates: 0, bulk: 0, bulkRows: 0, bulkCulled: 0 };
/** Successful results supply feedback, never mutations. Water and decoration
 * changes already have canonical paint observers; leave those effects there. */
function _gllToolFeedback(result, local) {
  if (!result || result.ok !== true || !window.GardenNative || !GardenNative.active() || GardenNative.inRoom() || !window.GardenNativeActions) return false;
  const t = result.t;
  if (!['plant', 'feed', 'weed', 'harvest', 'move', 'dig', 'take'].includes(t) || !Number.isFinite(result.x) || !Number.isFinite(result.y)) return false;
  if (t === 'move' && (!Number.isFinite(result.tx) || !Number.isFinite(result.ty) || result.x === result.tx && result.y === result.ty)) return false;
  const world = GardenNative.world(), root = world && world.rootNode, state = _gllToolFeedbackState, scope = _gll.role === 'visit' ? 'visit:' + _glv.fid + ':' + _glv.boot + ':' + _glv.gen : 'host';
  if (!root) return false;
  if (state.root !== root || state.scope !== scope) { state.root = root; state.scope = scope; state.seen.clear(); state.played = {}; state.duplicates = 0; state.bulk = state.bulkRows = state.bulkCulled = 0; }
  const key = result.i ? String(result.w) + '|' + result.i + '|' + t : '';
  if (key && state.seen.has(key)) { state.duplicates++; return false; }
  if (key) { state.seen.add(key); if (state.seen.size > 192) state.seen.delete(state.seen.values().next().value); }
  const plant = typeof gardenPlant === 'function' ? gardenPlant(result.p) : null, decor = !plant && typeof gardenDecor === 'function' ? gardenDecor(result.p) : null;
  const w = plant ? plant.fp || 1 : decor && decor.w || 1, h = plant ? plant.fp || 1 : decor && decor.h || 1, W = GARDEN_WORLD;
  const play = (kind, x, y, width = w, height = h) => {
    if (GardenNativeActions.effect(kind, (x + width / 2) * W.cellW, W.sky + (y + height) * W.cellH - 3, { width: width * W.cellW * .7, height: height * W.cellH * .35 })) state.played[kind] = (state.played[kind] || 0) + 1;
  };
  if (t === 'harvest' && Array.isArray(result.cells) && result.cells.length) {
    state.bulk++;
    for (const row of result.cells.slice(0, _GLL_TOOL_CELLS)) {
      if (!Array.isArray(row) || !Number.isInteger(row[0]) || !Number.isInteger(row[1]) || !Number.isInteger(row[2]) || row[2] < 1 || row[2] > 4 || row[3] !== 0 && row[3] !== 1) continue;
      state.bulkRows++;
      if (typeof _gwInView === 'function' && !_gwInView(row[0] + row[2] / 2, row[1] + row[2], 1)) { state.bulkCulled++; continue; }
      play(row[3] ? 'gold' : 'harvest', row[0], row[1], row[2], row[2]);
    }
  } else if (t === 'move') {
    // The mover already saw its local lift when taking hold. Other screens see
    // the source contact only once the host has accepted the destination.
    if (!local) play('lift', result.x, result.y);
    if (plant) play('place', result.tx, result.ty);
  } else play(t === 'dig' || t === 'take' ? 'lift' : t === 'weed' ? 'trim' : t === 'harvest' && result.gold === true ? 'gold' : t, result.x, result.y);
  return true;
}
function gardenLiveToolFeedbackStatus() { const s = _gllToolFeedbackState; return { scope: s.scope, remembered: s.seen.size, duplicates: s.duplicates, bulk: s.bulk, bulkRows: s.bulkRows, bulkCulled: s.bulkCulled, played: { ...s.played } }; }
/* ---------- they did it ---------- */
function _gllFxPlay(A, ev) {
  if (!A || !ev) return;
  const c = ev.c, e = String(ev.e || '');
  if (!gardenActivityFxAllowed(c)) return;
  if (c === 'soap') { if (typeof gardenSoapHeard === 'function') gardenSoapHeard(A, ev); return; }
  if (c === 'leaf') { if (typeof gardenLeafBoatHeard === 'function') gardenLeafBoatHeard(A, ev); return; }
  if (c === 'marble') { if (typeof gardenMarbleHeard === 'function') gardenMarbleHeard(A, ev); return; }
  if ((c === 'hall' && e === 'in' || c === 'fish' && e === 'cast' || c === 'pose' && e === 'on') && _gll.role === 'host' && typeof gardenSoapLeft === 'function') gardenSoapLeft(A.w);
  if ((c === 'hall' && e === 'in' || c === 'fish' && e === 'cast' || c === 'pose' && e === 'on') && _gll.role === 'host' && typeof gardenLeafBoatLeft === 'function') gardenLeafBoatLeft(A.w);
  if (c === 'kite') { if (typeof gardenKiteHeard === 'function') gardenKiteHeard(A, ev); return; }
  if (c === 'hall' && e === 'in' && _gll.role === 'host' && typeof gardenKiteLeft === 'function') gardenKiteLeft(A.w);
  if (c === 'pose') { if (typeof _gllPhotoIn === 'function') _gllPhotoIn(A, ev); return; }
  if ((c === 'hall' || c === 'got' || c === 'make' || c === 'fish' && e === 'cast' || c === 'bug' && (e === 'sneak' || e === 'swing')) && typeof _gllPhotoClear === 'function') _gllPhotoClear(A);
  if (c === 'ct') return;   // (the host's round: a visitor hears it in 94-garden-live-7contest.js; a guest cannot say it)
  if (_gll.role === 'host' && (c === 'fish' || c === 'got') && typeof gardenContestSeen === 'function') { try { gardenContestSeen(A, ev); } catch (err) { console.error('[garden live] contest', err); } }   // the host counts what it can match
  if (c === 'pet' || c === 'petplay' || c === 'wow' || c === 'nap') { if (typeof _gllPetFx === 'function') _gllPetFx(A, ev); return; }
  if (c === 'cr' || c === 'egg' || c === 'pick') { _glcFx(A, ev); return; }
  if (c === 'roam') { if (typeof _gllRoamAdd === 'function') _gllRoamAdd(e); return; }
  if (c === 'cheer') { _gllCheerFx(A, e, ev); return; }
  if (c === 'hall') { if (typeof _eeHear === 'function') _eeHear(A, ev); return; }
  if (c === 'use') { _gllUseFx(A, e, ev); return; }
  if (c === 'snap') { if (typeof _glsHear === 'function') _glsHear(A, ev); return; }   // (a group photo: 94-garden-live-7snap.js)
  if (c === 'sync') { if (e === 'ask') { if (typeof _glyAsked === 'function') _glyAsked(A); } else if (e === 'away' || e === 'back') { if (typeof _glyAwayIn === 'function') _glyAwayIn(A, e === 'away'); } else if (typeof _glyAtIn === 'function') _glyAtIn(A, ev); return; }   // (staying in step: 94-garden-live-8sync.js)
  if (c === 'fs') { if (typeof _gfsHeard === 'function') _gfsHeard(A, ev); return; }   // (the fish at a guest's line: the host decides)
  if (c === 'got' && e === 'fish' && typeof gardenCatchHeard === 'function') { try { gardenCatchHeard(A, ev); } catch (err) { /* only a record */ } }   // (the lake's records, and the second line)
  if (c === 'fish' && (e === 'big' || e === 'help')) { if (typeof gardenHelpHeard === 'function') gardenHelpHeard(A, e, ev); return; }   // a monster on someone's line
  if (c === 'fish') { _gllFishFx(A, e, ev); return; }
  if (c === 'bug') {
    if (e === 'sneak') A.sneakUntil = Date.now() + 4500;   // clock-ok: how long a creep lasts
    else if (e === 'swing') _gllSwing(A);
    else if (e === 'miss') _gllFloat(_gw.svg, A.x, A.y - 1.6, '', 'It got away!');
    else if (e === 'claim') { if (_gll.role === 'host') _glcBugClaim(ev); }   // a guest's swing found one: the host decides
    else if ((e === 'gone' || e === 'lost') && ev.i && _gll.role === 'visit') _glcBugVerdict(ev, e);   // the host said who netted it: it is gone from every screen
    else if (e === 'gone' && ev.i) _gllBugGone(String(ev.i).replace('-', '.'));
    return;
  }
  if (c === 'make') { _gllPose(A, 'dig', 1200); if (!_gllOffscreen(A)) _gllFloat(_gw.svg, A.x, A.y - 1.2, '🔨', A.n); return; }
  if (c === 'got') {
    if (_gll.role === 'host' && typeof _glgFxGot === 'function') _glgFxGot(A, ev);   // (a guest's fish counts towards a shared goal, at a real line's pace)
    const kind = _GLL_FX_KIND[e], spec = kind ? gardenMomentSpec(kind, ev.i, { cm: ev.n, q: ev.ql, isNew: (ev.nw & 1) === 1, record: (ev.nw & 2) === 2, v: ev.v }) : null;
    if (!spec) return;   // an id this version does not know
    const who = String(A.n).split(/\s+/)[0];
    if (gardenRoomGot(A, spec, who)) return;   // (they are inside somewhere)
    if (_gllOffscreen(A) || gardenFun() === 'off') { _gllFeed(`${who} ${spec.verb} ${_gscA(spec.name)}`); return; }
    A.fish = null; _gllFxClear(A);
    const holdMs = gardenMomentMs(spec);
    if (spec.rank >= 3) _gllFeed(`${who} ${spec.verb} ${_gscA(spec.name)}! ${spec.tier}!`);
    A.dir = 's'; _gllPose(A, 'hold', holdMs);
    const g = _gllSvgEl('g', 'gll-held gd-catch-moment'); g.setAttribute('transform', 'scale(.74)'); g.innerHTML = gardenMomentSvg(spec, { who });
    A.root.appendChild(g); A.heldG = g;
    const tag = A.root.querySelector('.gll-name'); if (tag) tag.style.display = 'none';
    setTimeout(() => { g.remove(); if (A.heldG === g) A.heldG = null; const now = A.root && A.root.querySelector('.gll-name'); if (now && !A.heldG && !A.photoG) now.style.display = ''; }, holdMs);
    if (typeof _fxSound === 'function') _fxSound('sparkle');
  }
}
/** Something someone set going in the world: their figure does it, and everyone hears and sees it there. Nothing else changes: what it gives is theirs alone. */
function _gllUseFx(A, e, ev) {
  _gllPose(A, 'pick', 760);
  if (e === 'bell') { const S = typeof _wdi !== 'undefined' && _wdi.S ? _wdi.S.bell : null; if (S && typeof _wdBellRing === 'function') _wdBellRing(S, true); return; }
  if (_gllOffscreen(A)) return;
  _gllFloat(_gw.svg, ev.x, ev.y - 1, { wish: '✨', collect: '🧺', machine: '⚙️' }[e] || '', '');
  if (typeof _fxSound === 'function') _fxSound(e === 'wish' ? 'splash' : 'pop');
}
/** Somebody's moment: they cheer, a spark goes up and one line in the corner says what. An id this version does not know is ignored. */
function _gllCheerFx(A, e, ev) {
  const who = String(A.n || 'Someone').split(/\s+/)[0] || 'Someone';
  let line = '';
  if (e === 'level') { const n = Math.round(Number(ev.n)); if (n >= 1 && n <= 99) line = `${who} reached garden level ${n}`; }
  else if (e === 'ach') { const d = typeof achDef === 'function' ? achDef(String(ev.i || '')) : null; if (d && d.label) line = `${who} unlocked \u201c${String(d.label).slice(0, 60)}\u201d`; }
  else if (e === 'photo') line = `${who} took a photo`;
  if (!line) return;
  _gllFeed(line);
  if (_gllOffscreen(A) || gardenFun() === 'off') return;
  if (e === 'photo') { if (!_gllReduced()) _gllFloat(_gw.svg, A.x, A.y - 1.4, '📸', ''); if (typeof _fxSound === 'function') _fxSound('shutter'); return; }
  try { _gllEmote(A, 'cheer'); } catch (err) { /* the float says it */ }
  _gllFloat(_gw.svg, A.x, A.y - 1.6, e === 'ach' ? '🏆' : '🎉', '');
  if (typeof _fxSound === 'function') _fxSound('sparkle');
}
function _gllSwing(A) {
  if (gardenRoomSwing(A)) return;
  if (!A.root || _gllReduced()) return;
  const g = _gllSvgEl('g'); g.setAttribute('transform', `translate(0 -30) scale(${A.face < 0 ? -1 : 1} 1)`);
  g.innerHTML = '<path d="M6 8Q30 -16 30 -34" stroke="#fbfbf2" stroke-width="2.6" stroke-opacity="0.8" fill="none" stroke-linecap="round"/>' + (A.g && A.g.nk && typeof gardenLookNetSwing === 'function' ? gardenLookNetSwing(A.g.nk) : '');
  A.root.appendChild(g); setTimeout(() => g.remove(), 360);
  _gllPose(A, 'pick', 500);
}
/** A bug somebody netted goes from this screen too (the same bugs are about on every screen: the window's seed, 94-garden-fish-2core.js). */
function _gllBugGone(key) {
  if (!_gw.goneKeys) _gw.goneKeys = new Set();
  if (_gw.goneKeys.size > 200) _gw.goneKeys.clear();
  _gw.goneKeys.add(key);
  if (gardenRoomBugGone(key)) return;
  const b = _gw.bugs && _gw.bugs.get(key);
  if (b) { if (b.node && b.node.remove) b.node.remove(); _gw.bugs.delete(key); if (_gw.netting && _gw.netting.actor === b) _gw.netting = null; if (typeof gardenPop === 'function' && gardenMotionOn()) gardenPop(Math.floor(b.x), Math.floor(b.y), 1, 1, 'is-grow'); }
}
/* ---------- a line out, on their figure ---------- */
function _gllFxClear(A) { if (A.fxg) { A.fxg.remove(); A.fxg = null; A.fxe = null; } }
function _gllFishFx(A, e, ev) {
  if ((e === 'land' || e === 'lost' || e === 'in') && typeof gardenHelpInviteClear === 'function') gardenHelpInviteClear(A);
  const t = Date.now();   // clock-ok: how long they have been quiet
  if (e === 'cast') {
    const bx = ev.x + 0.5, by = ev.y + 0.5;
    if (GARDEN_WORLD.v >= 4 && bx < GARDEN_ROOM_X && gardenWaterNo(bx, by, gardenHere())) return;
    if (A.fish && A.fish.bx === bx && A.fish.by === by) { A.fish.at = t; return; }   // (told again: the line that is out stays out)
    // (a figure still on its way finishes the walk, then the line goes out: stopping it here left it short of where they really stand)
    const fx = A.tx != null ? (A.gx != null ? A.gx : A.tx) : A.x;
    if (Math.abs(bx - fx) > 0.1) A.face = bx > fx ? 1 : -1;
    A.fish = { state: 'cast', t: 0, bx, by, at: t, bait: typeof ev.i === 'string' ? ev.i : '' }; A.key = '';
    _gllFxClear(A);
    return;
  }
  const F = A.fish; if (!F) return;
  F.at = t;
  if (e === 'bite') { F.state = 'bite'; F.t = 0; if (!_gfsFishForSlot(A.w)) _gllRing(A, F, 1.3); if (typeof _fxSound === 'function') _fxSound('splash'); }
  else if (e === 'reel') { F.state = 'reel'; F.t = 0; }
  else if (e === 'land') { F.state = 'land'; F.t = 0; _gllRing(A, F, 1.6); }
  else { _gllRing(A, F, 1.2); A.fish = null; A.key = ''; _gllFxClear(A); }
}
function _gllRing(A, F, k) {
  const I = gardenRoomFxAt(A, F);
  if (_gllReduced() || !A.root || I === false) return;
  const g = _gllSvgEl('g'), W = GARDEN_WORLD;
  g.setAttribute('transform', `translate(${((F.bx - (I ? I.x : A.x)) * W.cellW).toFixed(1)} ${((F.by - (I ? I.y : A.y)) * W.cellH).toFixed(1)})`);
  g.innerHTML = `<ellipse class="gd-ring" cx="0" cy="0" rx="${(8 * k).toFixed(1)}" ry="${(2.6 * k).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-opacity="0.9"/>`;
  (I ? I.root : A.root).appendChild(g); setTimeout(() => g.remove(), 1500);
}
/*
 * Gathered by the fire (2.29.0): when two or more people (you count) are near the same fire pit, marshmallows float up from it now and then, and the corner says who is there.
 * Nothing is sent: every screen sees where the people are and works it out for itself, so it is the same for everyone without a message. Quiet when the fun level is off.
 */
const _gllFire = { at: 0, pitsAt: 0, pits: [], since: new Map(), last: new Map(), told: new Set() };
function _gllFireStep() {
  const t = Date.now();   // clock-ok: a rate window and how long people have been there
  if (t - _gllFire.at < 700 || typeof _gw === 'undefined' || !_gw.svg) return;
  _gllFire.at = t;
  if (t - _gllFire.pitsAt > 3000) {
    _gllFire.pitsAt = t;
    try { _gllFire.pits = gardenHere().decor.filter(d => d.def && d.def.id === 'fire-pit').slice(0, 6).map(d => ({ x: d.x + (d.def.w || 2) / 2, y: d.y + (d.def.h || 2) / 2 })); } catch (e) { _gllFire.pits = []; }
  }
  if (!_gllFire.pits.length) return;
  const people = [{ n: 'You', x: _gw.px, y: _gw.py }];
  for (const A of _gll.actors.values()) people.push({ n: String(A.n || '').split(/\s+/)[0], x: A.x, y: A.y });
  _gllFire.pits.forEach((p, i) => {
    const near = people.filter(q => Math.hypot(q.x - p.x, (q.y - p.y) * 1.6) <= 2.6);
    if (near.length < 2) { _gllFire.since.delete(i); _gllFire.told.delete(i); return; }
    if (!_gllFire.since.has(i)) _gllFire.since.set(i, t);
    if (t - _gllFire.since.get(i) < 3000) return;
    if (!_gllFire.told.has(i)) { _gllFire.told.add(i); const names = near.filter(q => q.n !== 'You').map(q => q.n).slice(0, 3); _gllFeed(near.some(q => q.n === 'You') ? `By the fire with ${names.join(' and ') || 'friends'}` : `${names.join(' and ')} by the fire`); }
    if (t - (_gllFire.last.get(i) || 0) < 9000 || gardenFun() === 'off' || (typeof _gwInView === 'function' && !_gwInView(p.x, p.y, 1))) return;
    _gllFire.last.set(i, t);
    _gllFloat(_gw.svg, p.x - 0.4, p.y - 0.6, '\ud83c\udf61', '');   // marshmallows on a stick
    if (typeof _fxSound === 'function') _fxSound('pop');
  });
}
function _gllFxStep(A, dt) {
  _gllFireStep();
  if (typeof _glpStep === 'function') _glpStep();   // (2.32: two pets close for a moment play, 94-garden-live-7pals.js)
  if (A.heldG && A.heldG._native && (A.heldG._dead || !A.heldG.target || !A.heldG.target.active)) A.heldG = null;
  if (A.heldG && A.root && !A.root.contains(A.heldG)) { A.root.appendChild(A.heldG); const tag = A.root.querySelector('.gll-name'); if (tag) tag.style.display = 'none'; }   // (a redraw gave them a new figure: what they caught stays held up)
  const F = A.fish;
  if (!F) return;
  if (Date.now() - F.at > 150000) { A.fish = null; A.key = ''; _gllFxClear(A); return; }   // clock-ok: a line forgotten (their app says every 30 s that it is out)
  // Only they can say a line has gone (in, lost, the catch, or their next check). A figure that moves is one being put right, or finishing its walk: it used to take the line away here, on this screen and in the host's water, while they sat there fishing.
  const I = gardenRoomFxAt(A, F);   // a line in a room's water: drawn from their figure in the room, if you are there too
  if (I === false) { _gllFxClear(A); return; }
  if (A.fxg && A.fxg.parentNode !== (I ? I.root : A.root)) _gllFxClear(A);
  if (A.moving && !I) { if (A.fxg) _gllFxClear(A); return; }
  F.t += dt;
  if (!A.fxe || !A.fxe.rod.isConnected) {
    _gllFxClear(A);
    const g = _gllSvgEl('g', 'gll-fx'), e = { rod: _gllSvgEl('path', 'gll-fxrod'), line: _gllSvgEl('path', 'gll-fxline'), bob: _gllSvgEl('g'), bub: _gllSvgEl('g'), wake: _gllSvgEl('g', 'gd-float-wake') };
    const bob = A.g && A.g.b && typeof GARDEN_BOBBERS !== 'undefined' ? gardenBobberDef(A.g.b) : { c: '#d8452a', c2: '#fbfbf2' };   // (their float, not yours)
    if (typeof gardenRodLook === 'function') { const rl = gardenRodLook(A.g && A.g.r); e.rod.style.stroke = rl.c; e.rod.style.strokeWidth = String(rl.w); }   // (their rod)
    e.bob.innerHTML = gardenFishFloatSvg(bob);
    e.wake.innerHTML = gardenFishFloatWakeSvg();
    e.bub.innerHTML = '<ellipse cx="0" cy="0" rx="9" ry="9.6" fill="#fff6c8" stroke="#d89a1a" stroke-width="1.6"/><path d="M-1.6 -5.4h3.2l-0.6 6.2h-2z" fill="#d8301a"/><circle cx="0" cy="4.4" r="1.5" fill="#d8301a"/>';
    if (typeof gardenLineLook === 'function') { const ll = gardenLineLook(A.g && A.g.ln); e.line.style.stroke = ll.c; e.line.style.strokeWidth = String(ll.w); }   // (their line)
    if (typeof gardenLureSvg === 'function') e.bob.innerHTML += gardenLureSvg(F.bait);   // (their lure)
    g.append(e.wake, e.rod, e.line, e.bob, e.bub); (I ? I.root : A.root).appendChild(g); A.fxg = g; A.fxe = e;
    if (A.g && A.g.rk && typeof gardenLookRodSkin === 'function') e.skin = gardenLookRodSkin(A.g.rk, e.rod, g);   // (the look of their rod)
  }
  const e = A.fxe, W = GARDEN_WORLD, f = A.face < 0 ? -1 : 1, motion = !_gllReduced(), contactFish = _gfsFishForSlot(A.w), contact = _gfsFloatContact(contactFish);
  const tx = (F.bx - (I ? I.x : A.x)) * W.cellW, ty = (F.by - (I ? I.y : A.y)) * W.cellH;
  let tipX = f * 34, tipY = -62, bx = tx, by = ty, sag = 8;
  if (F.state === 'cast') {
    const u = Math.min(1, F.t / 0.28); tipX = f * (-18 + 52 * u); tipY = -(78 - 16 * u);
    const k = Math.max(0, Math.min(1, (F.t - 0.22) / 0.5));
    if (F.t >= 0.22 && !e.castFrom) e.castFrom = { x: tipX, y: tipY };
    const from = e.castFrom || { x: tipX, y: tipY }, arc = Math.max(16, Math.min(46, Math.hypot(tx - from.x, ty - from.y) * 0.18));
    bx = from.x + (tx - from.x) * k; by = from.y + (ty - from.y) * k - Math.sin(k * Math.PI) * (motion ? arc : 0); sag = 2 + 6 * k;
    if (F.t >= 0.75) { F.state = 'wait'; F.t = 0; _gllRing(A, F, 1); if (typeof _fxSound === 'function') _fxSound('splash'); }
  }
  else if (F.state === 'wait') { tipX = f * 38; tipY = -56; by = ty + (motion ? Math.sin(F.t * 2.6) * 0.65 : 0); sag = 6; const fsh = contactFish; if (fsh && fsh.st === GF_ST.nibble && fsh.n !== F.nibN) { F.nibN = fsh.n; F.dip = 0.35; } if (F.dip > 0) { F.dip -= dt; if (!contact) by += motion ? Math.sin(F.dip * 28) * 1.2 : 0; } }
  else if (F.state === 'bite') { tipX = f * 38; tipY = -56 + (motion ? Math.sin(F.t * 22) * 1.1 : 0); by = ty + 3.4 + (motion ? Math.sin(F.t * 20) * 1.15 : 0); sag = 2; }
  else if (F.state === 'reel') { tipX = f * 30; tipY = -68 + (motion ? Math.sin(F.t * 12) * 0.8 : 0); by = ty + (motion ? Math.sin(F.t * 12) * 0.9 : 0); bx = tx + (motion ? Math.sin(F.t * 9) * 1.2 : 0); sag = 0.6; }
  else if (F.state === 'land') { const t = Math.min(1, F.t / 0.5), u = 1 - (1 - t) * (1 - t); tipX = f * 30; tipY = -68 + (motion ? Math.sin(F.t * 12) * 0.8 : 0); bx = tx + (tipX - tx) * u; by = ty + (tipY - ty) * u - Math.sin(u * Math.PI) * (motion ? 20 : 0); sag = 0.8; if (F.t >= 0.6) { A.fish = null; A.key = ''; _gllFxClear(A); return; } }
  if (contact && ['wait', 'bite', 'reel'].includes(F.state)) { bx = tx + (motion ? contact.tugX : 0); by = ty + contact.dip + (motion ? contact.tugY + (F.state === 'wait' ? Math.sin(F.t * 2.6) * .45 * (1 - contact.pulse) : 0) : 0); }
  const rod = `M${(f * 8).toFixed(1)} -30L${tipX.toFixed(1)} ${tipY.toFixed(1)}`;
  if (e.rod.getAttribute('d') !== rod) { e.rod.setAttribute('d', rod); if (e.skin) gardenLookRodSkinAt(e.skin, f * 8, -30, tipX, tipY); }
  const tilt = motion ? contact && ['wait', 'bite', 'reel'].includes(F.state) ? contact.tilt + (F.state === 'wait' ? Math.sin(F.t * 2.6) * 1.5 * (1 - contact.pulse) : 0) : F.state === 'bite' ? Math.sin(F.t * 20) * 9 : F.state === 'reel' ? Math.sin(F.t * 9) * 7 : F.state === 'wait' ? Math.sin(F.t * 2.6) * 3 : 0 : 0;
  _gllFxAttr(e.line, 'd', `M${tipX.toFixed(1)} ${tipY.toFixed(1)}Q${((tipX + bx) / 2).toFixed(1)} ${((tipY + by - 7) / 2 + sag).toFixed(1)} ${(bx + Math.sin(tilt * Math.PI / 180) * 7).toFixed(1)} ${(by - Math.cos(tilt * Math.PI / 180) * 7).toFixed(1)}`);
  _gllFxAttr(e.bob, 'transform', `translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${tilt.toFixed(1)})`);
  const onWater = F.state !== 'cast' && F.state !== 'land', wakeK = 1 + (motion ? Math.sin(F.t * 3) * 0.08 + (contact ? contact.pulse * .14 : 0) : 0);
  _gllFxAttr(e.wake, 'visibility', onWater ? 'visible' : 'hidden');
  if (onWater) {
    // Follow the surface tug, excluding the float's downward dip.
    const wakeY = ty + (motion && contact && (F.state === 'wait' || F.state === 'bite' || F.state === 'reel') ? contact.tugY : 0);
    _gllFxAttr(e.wake, 'transform', `translate(${bx.toFixed(1)} ${wakeY.toFixed(1)}) scale(${wakeK.toFixed(2)} 1)`);
  }
  _gllFxAttr(e.bub, 'visibility', F.state === 'bite' ? 'visible' : 'hidden');
  if (F.state === 'bite') _gllFxAttr(e.bub, 'transform', `translate(${bx.toFixed(1)} ${(ty - 28 - (motion ? Math.abs(Math.sin(F.t * 7)) * 2 : 0)).toFixed(1)})`);
}
function _gllFxAttr(node, name, value) { if (node.getAttribute(name) !== value) node.setAttribute(name, value); }

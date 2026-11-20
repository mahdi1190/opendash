/* ============================================================
   FRIENDS SEE WHAT YOU DO (2.74.1). The owner, playing 2.74.0 with a friend: "All of the new animations are not synced, like kicking
   ball, sitting down, striking a pose, everything"; "Picking stuff up and placing it isn't synced"; "Things like throwing a stick are not synced".

   One message, gl:dg, says the whole of what you are doing (glDoingOk, 94-garden-live-0rules.js): the move and where, how long ago it
   began, what is in your hands, where the stick is in a throw, and the things you have set down elsewhere this visit. It goes when that
   changes (never a stream), again now and then while it lasts, and to anyone who has just come in, so a lost message or a late arrival
   comes right by itself. Each screen draws it from its own tables, by kind: the figure plays the move from the same point in it (a held
   pose at its end), a carried thing leaves the ground and is drawn in their arms, the stick flies, lies, rides in their pet's mouth and is
   dropped at their feet. An older app has no gl:dg and drops it; it still has the one-off 'act-' emote, which a newer app ignores from
   anyone who has sent gl:dg.
     gartActDoingTick()      four times a second (94-garden-live-8sync.js _glyTick): sends your state when it has changed
     gartActDoingPush(force) now (an action has just begun)
     gartActDoingIn(A, ev)   their state arrived (94-garden-live-2visit.js, 3host.js)
   ============================================================ */
const GA_DG = Object.freeze({ againMs: 15000, gapMs: 200 });
const _gad = { sig: '', at: 0, n: 0, sentAt: 0, sv: null };
/** (puzzles) A trail puzzle solved in a friend's garden: it goes in what you are doing (sv) until you leave, and their page keeps it (gpSet), so it is solved for everyone there. */
function _gadVisitKey() { try { return _gll.role === 'visit' && typeof _glv !== 'undefined' ? String(_glv.fid || '') : ''; } catch (e) { return ''; } }
function gartActSolved(id) {
  const k = _gadVisitKey(); if (!k || typeof id !== 'string' || !/^ld-[a-z0-9-]{1,24}$/.test(id)) return;
  if (!_gad.sv || _gad.sv.k !== k) _gad.sv = { k, ids: new Set() };
  _gad.sv.ids.add(id); gartActDoingPush(true);
}
function gartActSolvedHere(id) { const k = _gadVisitKey(); return !!(k && _gad.sv && _gad.sv.k === k && _gad.sv.ids.has(id)); }
/** On the host's page: what a visitor solved here is solved in this garden (the owner's discovered places), said once. */
function _gadSolvedIn(A, sv) {
  if (_gll.role !== 'host' || !Array.isArray(sv) || typeof gpGet !== 'function' || typeof gardenExploreIds !== 'function') return;
  const ok = gardenExploreIds();
  for (const id of sv.slice(0, 8)) {
    if (typeof id !== 'string' || !ok.includes(id) || gpGet('explore.' + id)) continue;
    gpSet('explore.' + id, _gdToday());
    const stop = typeof GARDEN_EXPLORATION_STOPS !== 'undefined' ? GARDEN_EXPLORATION_STOPS.find(r => r.sight === id) : null, sight = typeof gardenLandSight === 'function' ? gardenLandSight(id) : null;
    try { gardenToast((A && A.n ? A.n : 'Your friend') + ' solved ' + (stop ? stop.name.replace(/^The /, 'the ') : 'a trail puzzle') + (sight && sight.name ? ': the way to ' + sight.name.replace(/^The /, 'the ') + ' is found.' : '.')); } catch (e) { /* fine */ }
    _gd.rev++; _gd.memoKey = '';
  }
}
const _gadR2 = (v) => Math.round(v * 100) / 100;
function _gadBody() {
  const b = {}, cur = _ga.cur;
  if (cur && cur.doing && typeof GL_EMOTES !== 'undefined' && GL_EMOTES.includes(GA_WIRE + cur.id)) {
    b.a = cur.id; b.x = _gadR2(Number.isFinite(cur.x) ? cur.x : _gw.px); b.y = _gadR2(Number.isFinite(cur.y) ? cur.y : _gw.py);
    { const deg = typeof gartMoveFacingDeg === 'function' ? Math.round(_gmvWrap(gartMoveFacingDeg())) : null; if (Number.isFinite(deg)) b.d = deg; }   // (the way they face for it: the same on every screen)
    b.t = Math.max(0, Math.min(6000, Math.round((performance.now() - (cur.t0 || performance.now())) / 100)));
  }
  else if (!_gw.moving && typeof gartMoveFacingDeg === 'function') { const deg = Math.round(_gmvWrap(gartMoveFacingDeg()) / 45) * 45; if (Number.isFinite(deg)) b.d = deg === -180 ? 180 : deg; }   // (standing: the way you face, to the nearest eighth, so their figure turns as yours does)
  if (_ga.carry && _ga.carry.id) { b.i = String(_ga.carry.id).slice(0, 64); if (_ga.carry.art) b.h = String(_ga.carry.art).slice(0, 64); }
  const f = _ga.fetch;
  if (f && Number.isFinite(f.x)) { b.p = { wait: 0, out: 1, back: 2, home: 3 }[f.phase] || 0; b.fx = _gadR2(f.x); b.fy = _gadR2(f.y); }
  const m = [];
  for (const [id, at] of _gaMoved) if (!(_ga.carry && _ga.carry.id === id) && at && Number.isFinite(at.x) && !at.theirs) m.push([String(id).slice(0, 64), Math.max(0, Math.round(at.x * 10)), Math.max(0, Math.round(at.y * 10))]);
  if (m.length) b.m = m.slice(-(typeof GL_DG_MAX_MOVED === 'number' ? GL_DG_MAX_MOVED : 6));
  { const k = _gadVisitKey(); if (k && _gad.sv && _gad.sv.k === k && _gad.sv.ids.size) b.sv = [..._gad.sv.ids].slice(0, 8); }
  return b;
}
function _gadLive() {
  try {
    if (typeof _gll === 'undefined') return false;
    if (_gll.role === 'visit') return typeof _glvLive === 'function' && _glvLive();
    return typeof _glh !== 'undefined' && _glh.on && typeof _glhAnyone === 'function' && _glhAnyone();
  } catch (e) { return false; }
}
function _gadSend(b) {
  try {
    if (typeof glDoingOk === 'function' && glDoingOk(b)) return false;
    if (_gll.role === 'visit') _glvSend('dg', b); else _glhSend('all', 'dg', b);
    return true;
  } catch (e) { return false; }
}
/** Send now if it changed (force: send even if not: an action has just begun). */
function gartActDoingPush(force) {
  if (typeof _gw === 'undefined' || !_gw.on || !_gadLive()) { _gad.sig = ''; return; }
  const b = _gadBody(), { t, ...rest } = b, sig = JSON.stringify(rest), now = performance.now();
  void t;
  const again = sig !== '{}' && now - _gad.at > GA_DG.againMs;
  if (!force && sig === _gad.sig && !again) return;
  if (!force && now - _gad.sentAt < GA_DG.gapMs) return;   // (the next tick takes it)
  _gad.sig = sig; _gad.at = now; _gad.sentAt = now;
  _gadSend(b);
}
function gartActDoingTick() {
  try {
    const n = typeof _gll !== 'undefined' ? _gll.actors.size : 0;
    if (n !== _gad.n) { if (n > _gad.n) _gad.sig = ''; _gad.n = n; }   // (someone came in: they hear it all)
    gartActDoingPush(false);
  } catch (e) { /* alone */ }
}
/* ---------- their state, on my screen ---------- */
/** Put a figure's current move back on a new drawing of it (they stopped walking, a look changed): from the same point in it. */
function gartActRedraw(A) {
  if (!A || !A.actId || A.actPainting) return;
  const row = GARDEN_ACTS[A.actId]; if (!row) { A.actId = ''; return; }
  const off = performance.now() - (A.actT0 || performance.now());
  if (!row.hold && off > row.ms) { A.actId = ''; return; }
  const id = A.actId; setTimeout(() => { if (A.actId === id && !A.moving) gartActRemote(A, id, performance.now() - A.actT0); }, 0);
}
function gartActDoingIn(A, ev) {
  if (!A || !ev || (typeof glDoingOk === 'function' && glDoingOk(ev))) return;
  A.dg = true;
  if (ev.sv) _gadSolvedIn(A, ev.sv);
  // the thing in their hands: off the ground here too, drawn in their arms (gartMoveActor)
  const hold = ev.i ? String(ev.i) : '';
  if (A.carryId !== hold) {
    const was = A.carryId; A.carryId = hold; A.carryArt = ev.h ? String(ev.h) : '';
    if (was && !(ev.m || []).some(r => r[0] === was)) { _gaHide.delete(was); _gaShow(was, true); }
    if (hold) { _gaHide.set(hold, Infinity); _gaShow(hold, false); const d = _ga.down && _ga.down.get(hold); if (d) { try { d.remove(); } catch (e) { /* gone */ } _ga.down.delete(hold); } _ga.list = null; }
    A.key = '';
    try { const b0 = A.inner && A.inner.firstChild; if (b0 && b0.querySelector) gartActCarryActor(A, b0); } catch (e) { /* the next frame */ }   // (now: a set-down while standing leaves their arms empty)
  }
  // what they have set down elsewhere: at its new place on my screen too
  for (const r of ev.m || []) {
    const id = String(r[0]), x = r[1] / 10, y = r[2] / 10, at = _gaMoved.get(id);
    if (id === hold || (at && Math.abs(at.x - x) < 0.05 && Math.abs(at.y - y) < 0.05 && _ga.down && _ga.down.get(id))) continue;
    _gaMoved.set(id, { x, y, theirs: true }); _gaHide.delete(id); _gaShow(id, false); _gaSetDownDraw(id, x, y); _ga.list = null;
  }
  // the stick of a throw
  A.stick = ev.p != null && Number.isFinite(ev.fx) ? { p: ev.p, x: ev.fx, y: ev.fy, t0: performance.now() - (ev.t || 0) * 100 } : null;
  if (A.stick) _gadStickSprite(A);
  // the move
  const a = ev.a ? String(ev.a) : '';
  if (!a) {
    if (A.actId || A.actWant) { A.actWant = ''; A.actId = ''; A.then = null; if (typeof _gllEmoteStop === 'function') _gllEmoteStop(A); A.sit = false; A.key = ''; }
    A.standDeg = Number.isInteger(ev.d) ? ev.d : null; gartActStandFace(A);   // (standing: they face as they do, now or when their walk here ends)
    return;
  }
  const t0 = performance.now() - (Number(ev.t) || 0) * 100;
  if (A.actWant === a && Math.abs((A.actT0 || 0) - t0) < 1500) return;   // the same move, said again
  A.actX = Number.isFinite(ev.x) ? ev.x : A.x; A.actY = Number.isFinite(ev.y) ? ev.y : A.y; A.actDeg = Number.isInteger(ev.d) ? ev.d : null;
  const go = () => { if (A.actWant === a) gartActRemote(A, a, performance.now() - A.actT0); };
  if (Number.isFinite(ev.x) && Math.hypot(ev.x - A.x, ev.y - A.y) > 0.05) {
    if (Math.hypot(ev.x - A.x, ev.y - A.y) > 6 || typeof _gllWalkVia !== 'function') { A.x = ev.x; A.y = ev.y; A.tx = null; A.ty = null; A.way = null; A.moving = false; A.key = ''; A.actWant = a; A.actT0 = t0; go(); }
    else { _gllWalkVia(A, null, ev.x, ev.y); A.actWant = a; A.actT0 = t0; A.then = go; }   // (walking there ends what they did before: then this)
    return;
  }
  A.actWant = a; A.actT0 = t0;
  go();
}
/** A figure that has stopped turns the way they said they face (gl:dg d), once. From gartMoveActor too, when their walk ends. */
function gartActStandFace(A) {
  if (!A || A.standDeg == null || A.moving || A.tx != null || A.actId || A.actWant || A.sit || A.fish || typeof _gmvDrawing !== 'function') return;
  const deg = A.standDeg, D = _gmvDrawing(deg); A.standDeg = null;
  if (D.dir !== A.dir || (D.dir === 'e' && D.mirror !== A.face)) { A.dir = D.dir; if (D.dir === 'e') A.face = D.mirror; if (A.gm) A.gm.h = deg; A.key = ''; if (typeof _gllPaint === 'function') _gllPaint(A); }
}
/** (belly rubs, any act with rubPet) Their pet's copy lies where theirs does, at their hand (GA_RUB_AT from their feet, the same as on
 *  their screen), on its back, kicking its legs (the same clip), again while the rub lasts. One-off pet clips are spaced six seconds
 *  apart on the wire, so the rub is drawn from what they are doing, not from those. */
function gartActRubCopy(A, id) {
  clearTimeout(A.rubT);
  const go = () => {
    if (A.actId !== id || _gll.actors.get(A.w) !== A) return;
    const P = A.pp; if (!P || !P.root) { A.rubT = setTimeout(go, 500); return; }
    P.tx = null; P.ty = null; P.busy = 0; P.cb = null; P.x = A.x + GA_RUB_AT[0]; P.y = A.y + GA_RUB_AT[1]; P.z = -1; P.dir = -1;   // (as _gaRubTick lays it: at the reaching hand, head towards them)
    if (A.pf) A.pf.seen = true;   // (their last place for it is where it walked to: this is where it lies)
    const clip = typeof _gaBellyClip === 'function' && _gaBellyClip() || 'rollover', def = typeof petClipDef === 'function' ? petClipDef(clip) : null;
    try { if (!(P.root._pcH && P.rubbing)) { P.sit(); P.rubbing = true; P.clip(clip, def && def.ms || 2400, () => { P.rubbing = false; }); } } catch (e) { /* it sits */ }
    A.rubT = setTimeout(go, 6100);
  };
  go();
}
/** Their stick: a thing of the world on my screen, in their hand and flying (part 0), in the grass (1), in their pet's mouth (2), at their feet (3). */
function _gadStickSprite(A) {
  if (A.stickSpr || typeof gardenWorldAdd !== 'function') return;
  const K = typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 1, S = typeof GL_ACT_SCALE === 'number' ? GL_ACT_SCALE : 0.6, W = GARDEN_WORLD;
  try {
    A.stickSpr = gardenWorldAdd({ id: 'ga-stick-' + A.w, x: A.x, y: A.y, z: A.y, lift: 0, ground: false, svg: `<g transform="scale(${K})">${_GA_MOUTH_STICK}</g>`,
      update(dt, Sp) {
        const s = A.stick;
        if (!s || _gll.actors.get(A.w) !== A) { A.stickSpr = null; Sp.remove(); return; }
        const ms = (GARDEN_ACTS.throwstick && GARDEN_ACTS.throwstick.ms) || 1500, tt = (performance.now() - s.t0) / ms, R0 = 0.32;
        let x = s.x, y = s.y, lift = 1;
        if (s.p === 0) {
          const flip = A.face < 0 ? -1 : 1, hx = A.x + 8 * S / W.cellW * flip, hy = A.y + 0.02, k = !_gaMotion() ? 1 : Math.max(0, Math.min(1, (tt - R0) / (GA_STICK_LAND - R0)));
          x = hx + (s.x - hx) * k; y = hy + (s.y - hy) * k; lift = k >= 1 ? 1 : (72 * S) * (1 - k) + 90 * S * Math.sin(Math.PI * k);
        } else if (s.p === 2) {
          const P = A.pp; if (P && Number.isFinite(P.x)) { const face = (P.visualFace != null ? P.visualFace : P.dir) < 0 ? -1 : 1; x = P.x + face * 0.28; y = P.y + 0.01; lift = 15 * K; } else { x = A.x + 0.5; y = A.y + 0.2; }
        } else if (s.p === 3) { x = A.x + 0.3; y = A.y + 0.12; }
        Sp.x = x; Sp.y = y; Sp.z = y + 0.02; Sp.lift = lift;
      } });
  } catch (e) { A.stickSpr = null; }
}
/** Their figure while carrying: the thing in both hands (from gartMoveActor, after the stride). */
function gartActCarryActor(A, body, L) {
  if (!body) return;
  if (!A || !A.carryId) { if (body._gaCarry) { try { if (body._gaCarry.parentNode) body._gaCarry.parentNode.removeChild(body._gaCarry); if (body._gaCarry.destroy) body._gaCarry.destroy(); } catch (e) { /* gone */ } body._gaCarry = null; } return; }
  gartActCarryFrame(body, L || _gmvLimbs(body), A.carryArt || 'basket');
}

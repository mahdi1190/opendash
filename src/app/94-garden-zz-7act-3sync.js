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
const _gad = { sig: '', at: 0, n: 0, sentAt: 0 };
// (puzzles solved on a visit go to the host as a 'solve' intent, 94-garden-wonder-h-trails.js and _glhSolve: one system for it)
const _gadR2 = (v) => Math.round(v * 100) / 100;
function _gadBody() {
  const b = {}, cur = _ga.cur;
  if (cur && cur.doing && typeof GL_EMOTES !== 'undefined' && GL_EMOTES.includes(GA_WIRE + cur.id)) {
    b.a = cur.id; b.x = _gadR2(Number.isFinite(cur.x) ? cur.x : _gw.px); b.y = _gadR2(Number.isFinite(cur.y) ? cur.y : _gw.py);
    { const deg = cur.spot && cur.spot.deg != null ? Math.round(_gmvWrap(cur.spot.deg)) : typeof gartMoveFacingDeg === 'function' ? Math.round(_gmvWrap(gartMoveFacingDeg())) : null; if (Number.isFinite(deg)) b.d = deg === -180 ? 180 : deg; }   // (2.74.2: the way the thing they use wants them to face, as _gaStart turns them, not the turn still under way)   // (the way they face for it: the same on every screen)
    b.t = Math.max(0, Math.min(6000, Math.round((performance.now() - (cur.playT || cur.t0 || performance.now())) / 100)));   // (2.74.2: from when your figure really began it, after the turn: their copy and the stick keep time with yours)
  }
  else if (!_gw.moving && typeof gartMoveFacingDeg === 'function') { const deg = Math.round(_gmvWrap(gartMoveFacingDeg())); if (Number.isFinite(deg)) b.d = deg === -180 ? 180 : deg; }   // (standing: the way you face, to the degree, so their figure is drawn as yours is: to the nearest eighth, -64 became -45, a side view for a back view)
  if (_ga.carry && _ga.carry.id) { b.i = String(_ga.carry.id).slice(0, 64); if (_ga.carry.art) b.h = String(_ga.carry.art).slice(0, 64); }
  const f = _ga.fetch;
  if (f && Number.isFinite(f.x)) { b.p = { wait: 0, out: 1, back: 2, home: 3 }[f.phase] || 0; b.fx = _gadR2(f.x); b.fy = _gadR2(f.y); }
  const m = [];
  for (const [id, at] of _gaMoved) if (!(_ga.carry && _ga.carry.id === id) && at && Number.isFinite(at.x) && !at.theirs) m.push([String(id).slice(0, 64), Math.max(0, Math.round(at.x * 10)), Math.max(0, Math.round(at.y * 10))]);
  // (build phase 1) where things lie is saved and the host's word (gl:dr); the host still says it here for one release, for a friend on an older app
  if (_gll.role === 'host' && typeof gardenDropList === 'function') for (const r of gardenDropList()) if (!m.some(q => q[0] === r[0]) && !(_ga.carry && _ga.carry.id === r[0])) m.push([r[0], r[2], r[3]]);
  if (m.length) b.m = m.slice(-(typeof GL_DG_MAX_MOVED === 'number' ? GL_DG_MAX_MOVED : 6));
  if (_gll.role === 'host') _gadGatesOut(b);
  return b;
}
/** (2.74.1, gates) The host's gates, whole, in what the host is doing: the finds held (gk) and the gates open (gz, their zones). A
 *  snapshot is cut into a dozen pieces that take seconds to cross; this is one small message, so a friend's sign says 'Ready to open'
 *  and a gate they open swings open on their screen at once. By kind: every gate with a find (the layout's gates), no names. */
function _gadGatesOut(b) {
  try {
    if (typeof GARDEN_GATE_ITEMS === 'undefined' || typeof GARDEN_ZONE_GATES === 'undefined') return;
    const gk = Object.keys(GARDEN_GATE_ITEMS).filter(k => gardenGateHas(k)).slice(0, 12); if (gk.length) b.gk = gk;
    const areas = gardenModel().areas, gz = GARDEN_ZONE_GATES.filter(g => gardenGateRule(g) && gardenGateIsOpen(g, areas)).map(g => g.n).filter(n => Number.isInteger(n) && n >= 0 && n <= 64).slice(0, 32); if (gz.length) b.gz = gz;
  } catch (e) { /* the snapshot says it */ }
}
/** On a visit: the host's gates on my screen now (their snapshot, patched; the next whole snapshot says the same). */
function _gadGatesIn(ev) {
  if (_gll.role !== 'visit' || ev.w !== 0 || typeof _glv === 'undefined' || !_glv.snap || (!ev.gk && !ev.gz)) return;
  const s = _glv.snap, gk = Array.isArray(ev.gk) ? ev.gk.filter(k => typeof k === 'string' && /^[a-z][a-z0-9-]{0,23}$/.test(k)).slice(0, 12) : null;
  const areas = Array.isArray(s.areas) ? s.areas.slice() : [], add = (ev.gz || []).filter(n => Number.isInteger(n) && n >= 0 && n <= 64).map(n => 'zn-' + n).filter(z => !areas.includes(z));
  const gkNew = gk && gk.some(k => !(s.gk || []).includes(k));
  if (!add.length && !gkNew) return;
  _glv.snap = Object.assign({}, s, gkNew ? { gk: [...new Set([...(s.gk || []), ...gk])].slice(0, 12) } : {}, add.length ? { areas: areas.concat(add) } : {});
  if (typeof _gdvTouch === 'function') _gdvTouch();
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
  try { if (typeof gardenDropTick === 'function') gardenDropTick(); } catch (e) { /* next tick */ }
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
  if (!row.hold && off > row.ms) { A.actId = ''; if (A.dgNext) gartActDoingNext(A); return; }
  const id = A.actId; setTimeout(() => { if (A.actId === id && !A.moving) gartActRemote(A, id, performance.now() - A.actT0); }, 0);
}
function gartActDoingIn(A, ev) {
  if (!A || !ev || (typeof glDoingOk === 'function' && glDoingOk(ev))) return;
  A.dg = true;
  if (ev.gk || ev.gz) _gadGatesIn(ev);
  // the thing in their hands: off the ground here too, drawn in their arms (gartMoveActor)
  const hold = ev.i ? String(ev.i) : '';
  if (A.carryId !== hold) {
    const was = A.carryId; A.carryId = hold; A.carryArt = ev.h ? String(ev.h) : '';
    if (was && typeof gardenDropKnown === 'function' && gardenDropKnown()) { _gaHide.delete(was); setTimeout(() => { try { gardenDropShow(true); } catch (e) { /* next tick */ } }, 0); }   // (build phase 1: where it lies now is the host's list)
    else if (was && !(ev.m || []).some(r => r[0] === was)) { _gaHide.delete(was); _gaShow(was, true); }
    if (hold) { _gaHide.set(hold, Infinity); _gaShow(hold, false); const d = _ga.down && _ga.down.get(hold); if (d) { try { d.remove(); } catch (e) { /* gone */ } _ga.down.delete(hold); } _ga.list = null; }
    A.key = '';
    try { const b0 = A.inner && A.inner.firstChild; if (b0 && b0.querySelector) gartActCarryActor(A, b0); } catch (e) { /* the next frame */ }   // (now: a set-down while standing leaves their arms empty)
  }
  // what they have set down elsewhere: at its new place on my screen too
  for (const r of (typeof gardenDropKnown === 'function' && gardenDropKnown()) ? [] : ev.m || []) {   // (build phase 1: where things lie is the host's saved list, gl:dr)
    const id = String(r[0]), x = r[1] / 10, y = r[2] / 10, at = _gaMoved.get(id);
    if (id === hold || (at && Math.abs(at.x - x) < 0.05 && Math.abs(at.y - y) < 0.05 && _ga.down && _ga.down.get(id))) continue;
    _gaMoved.set(id, { x, y, theirs: true }); _gaHide.delete(id); _gaShow(id, false); _gaSetDownDraw(id, x, y); _ga.list = null;
  }
  // the stick of a throw
  const wasStick = A.stick;
  A.stick = ev.p != null && Number.isFinite(ev.fx) ? { p: ev.p, x: ev.fx, y: ev.fy, t0: performance.now() - (ev.t || 0) * 100 } : null;
  if (A.stick) { _gadStickSprite(A); if (A.stickDown) { try { A.stickDown.remove(); } catch (e) { /* gone */ } A.stickDown = null; } }
  else if (wasStick && wasStick.p >= 2) _gadStickDropped(A);   // (2.74.2) their pet dropped it at their feet: it lies there a while, as on their screen
  // the move
  const a = ev.a ? String(ev.a) : '';
  if (!a) {
    A.dgNext = null; A.dgT0 = null; A.actAt = null;
    if (A.actId || A.actWant) {
      A.actWant = ''; A.actId = ''; A.then = null; if (typeof _gllEmoteStop === 'function') _gllEmoteStop(A); A.sit = false; A.key = '';
      const g = A.goLater; A.goLater = null; if (g && Math.hypot(g.x - A.x, g.y - A.y) > 0.05 && typeof _gllWalkTo === 'function') _gllWalkTo(A, g.x, g.y);   // (a step they took as they got up, held while they were still sitting here: now)
    }
    A.standDeg = Number.isInteger(ev.d) ? ev.d : null; gartActStandFace(A);   // (standing: they face as they do, now or when their walk here ends)
    return;
  }
  const t0 = performance.now() - (Number(ev.t) || 0) * 100;
  if (A.actWant === a && A.dgT0 != null && Math.abs(A.dgT0 - t0) < 1500) return;   // the same move, said again (their clock, not when it began here)
  if (A.dgNext && A.dgNext.a === a && Math.abs(A.dgNext.t0 - t0) < 1500) return;   // (already waiting its turn)
  const at = { x: Number.isFinite(ev.x) ? ev.x : A.x, y: Number.isFinite(ev.y) ? ev.y : A.y, d: Number.isInteger(ev.d) ? ev.d : null };
  // a move that follows another (climb the tree, then sit on the branch: the table's then): the first is seen whole here before the next
  const prev = A.actWant || A.actId, prow = prev && GARDEN_ACTS[prev];
  if (prow && prow.then === a && !prow.hold) {
    const left = A.actId === prev ? prow.ms - (performance.now() - (A.actT0 || 0)) : Infinity;
    if (left > 80) { A.dgNext = { a, t0, at }; return; }
  }
  A.dgNext = null; A.dgT0 = t0;
  gartActDoingStart(A, a, t0, at);
}
/** Start a move on their figure: walk there first if it is not there yet, and then do it from its beginning (the walk took the time
 *  it took here); a figure that is there already, or a late arrival, joins it where it has got to (a held pose at its end). */
function gartActDoingStart(A, a, t0, at) {
  A.actX = at.x; A.actY = at.y; A.actDeg = at.d;
  A.emAt = { e: 'act-' + a, x: at.x, y: at.y };   // (where their own screen put them for it: a band's place keeps them exactly there, 94-garden-zz-7act-3music.js)
  const go = () => { if (A.actWant === a) gartActRemote(A, a, performance.now() - A.actT0); };
  if (Math.hypot(at.x - A.x, at.y - A.y) > 0.05) {
    if (Math.hypot(at.x - A.x, at.y - A.y) > 6 || typeof _gllWalkVia !== 'function') { A.x = at.x; A.y = at.y; A.tx = null; A.ty = null; A.way = null; A.moving = false; A.key = ''; A.actAt = { x: at.x, y: at.y }; A.actWant = a; A.actT0 = t0; go(); }
    else { _gllWalkVia(A, null, at.x, at.y); A.actAt = { x: at.x, y: at.y }; A.actWant = a; A.actT0 = t0; A.then = () => { const row = GARDEN_ACTS[a]; if (row && !row.hold && performance.now() - t0 < row.ms + 4000) A.actT0 = performance.now(); go(); }; }   // (walking there ends what they did before: then this, from its start)
    return;
  }
  A.actWant = a; A.actT0 = t0; A.actAt = { x: at.x, y: at.y };   // (the place they said they took is theirs on this screen too: gartActTaken)
  go();
}
/** Their move has ended here: the one they went on to (dgNext) now. */
function gartActDoingNext(A) {
  const n = A.dgNext; if (!n || _gll.actors.get(A.w) !== A) return;
  A.dgNext = null; A.dgT0 = n.t0;
  const row = GARDEN_ACTS[n.a], late = performance.now() - n.t0;
  gartActDoingStart(A, n.a, row && !row.hold && late < row.ms + 4000 ? performance.now() : n.t0, n.at);
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
  // (2.74.2) held every frame from their pet's own step (gartActRubHold), by the same rule as your own rub (_gaRubTick): it lies at their
  // hand, rolls over, and rolls again six seconds on, for as long as the rub lasts. The old one-shot copy kept a "rubbing" flag that a clip
  // stopped by anything else never cleared, so a second rub in a row drew the pet standing beside them, and their pet's place messages
  // walked it off. A new rub always starts its roll at once.
  A.rub = { id, t: -1e9, H: null };
}
/** From their pet's step (94-garden-live-5pets.js _gllPetStep): true while a rub holds it (then nothing else moves it this frame). */
function gartActRubHold(A, P) {
  const R = A.rub; if (!R) return false;
  if (A.actId !== R.id || !GARDEN_ACTS[R.id] || !GARDEN_ACTS[R.id].rubPet || !P || !P.root) { A.rub = null; return false; }
  P.tx = null; P.ty = null; P.lifeGoal = false; P.x = A.x + GA_RUB_AT[0]; P.y = A.y + GA_RUB_AT[1]; P.z = -1; P.dir = -1;   // (as _gaRubTick lays it: at the reaching hand, head towards them)
  if (A.pf) A.pf.seen = true;   // (their last place for it is where it walked to: this is where it lies)
  const now = performance.now();
  if ((P.root._pcH && P.root._pcH === R.H) || now - R.t < 6100) return true;
  P.busy = 0; P.cb = null; if (P.act && typeof P.setAct === 'function') { try { P.setAct(''); } catch (e) { /* fine */ } }
  if (P.root._pcH && typeof petClipStop === 'function') { try { petClipStop(P.root); } catch (e) { /* fine */ } }
  const clip = typeof _gaBellyClip === 'function' && _gaBellyClip() || 'rollover';
  R.t = now;
  try { if (typeof P.clip === 'function') P.clip(clip); else petClipRun(P.root, clip); R.H = P.root && P.root._pcH; } catch (e) { /* it sits */ }
  return true;
}
/** (2.74.2) The world's part of what they do (a coin's glow in the well, a splash, the pump's spout), on my screen at the same place and
 *  moment as on theirs: the same table row (fx), from the thing they use (its stand point near them, by kind) or their feet and the way
 *  they face for it. Once a frame from their sprite (94-garden-live-1core.js _gllSprite). A wish's sparkle drifted into the grass. */
function gartActFriendTick(A) {
  const row = A && A.actId && GARDEN_ACTS[A.actId], fx = row && row.fx;
  if (!fx || !window.GardenNativeActions || !_gaMotion() || !Number.isFinite(A.actT0)) return;
  if (A.fxFor !== A.actT0) {
    A.fxFor = A.actT0; A.fxI = 0; A.fxT = 0; A.fxSpot = null;
    try { A.fxSpot = _gaStaticRows().concat(_gaDecorRows()).filter(q => q.act === A.actId && q.stand && Math.hypot(q.stand.x - A.x, q.stand.y - A.y) < 1.2).sort((p, q) => Math.hypot(p.stand.x - A.x, p.stand.y - A.y) - Math.hypot(q.stand.x - A.x, q.stand.y - A.y))[0] || null; } catch (e) { A.fxSpot = null; }
  }
  if (typeof _gllOffscreen === 'function' && _gllOffscreen(A)) return;
  const t = performance.now() - A.actT0, W = GARDEN_WORLD, sp = fx.spot && A.fxSpot ? A.fxSpot : null;
  const deg = (A.fxSpot && A.fxSpot.deg != null ? A.fxSpot.deg : A.actDeg != null ? A.actDeg : _gaDirDeg(row, A.fxSpot)) * Math.PI / 180;
  const at = (k) => { try { if (sp) GardenNativeActions.effect(fx.kind, (sp.x + fx.spot[0]) * W.cellW, W.sky + (sp.y + fx.spot[1]) * W.cellH + k, { width: fx.width || 24 }); else GardenNativeActions.effect(fx.kind, (A.x + Math.cos(deg) * 0.7) * W.cellW, W.sky + (A.y + Math.sin(deg) * 0.5 + (fx.dy || 0)) * W.cellH + k, { width: fx.width || 24 }); } catch (e) { /* fine */ } };
  if (fx.every) { if (row.hold || t < row.ms) { if (t - A.fxT > fx.every) { A.fxT = t; at(A.fxI++ % 3); } } }
  else if (fx.at && A.fxI < fx.at.length && t > fx.at[A.fxI] * row.ms) { if (t < row.ms + 400) at(A.fxI); A.fxI++; }
}
/** How high a friend's figure is drawn now (world px): on a seat or a branch, its lift; on the way up to one (an act whose next move
 *  is a raised seat: up the trunk to the branch), most of that. For the crowns over them (94-garden-native-painted.js fadeUnder). */
function gartActFriendLift(F) {
  if (!F || F.me) return 0;
  if (F.actLift > 0) return F.actLift;
  const row = F.actId && GARDEN_ACTS[F.actId], next = row && row.then && GARDEN_ACTS[row.then];
  return next && next.seat ? 30 * next.seat : 0;
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
        if (s.p === 0 && _gaMotion() && tt < R0) {   // (2.74.2) wound back over the shoulder in their hand, as yours is (_gaFetchDraw), before it flies
          const flip = A.face < 0 ? -1 : 1, k = Math.max(0, tt) / R0;
          x = A.x + (18 + 4 * Math.sin(k * Math.PI / 2)) * S / W.cellW * flip; y = A.y + 0.02; lift = (46 + 22 * k) * S;
        } else if (s.p === 0) {
          const flip = A.face < 0 ? -1 : 1, hx = A.x + 8 * S / W.cellW * flip, hy = A.y + 0.02, k = !_gaMotion() ? 1 : Math.max(0, Math.min(1, (tt - R0) / (GA_STICK_LAND - R0)));
          x = hx + (s.x - hx) * k; y = hy + (s.y - hy) * k; lift = k >= 1 ? 1 : (72 * S) * (1 - k) + 90 * S * Math.sin(Math.PI * k);
        } else if (s.p === 2) {
          const P = A.pp; if (P && Number.isFinite(P.x)) { const face = (P.visualFace != null ? P.visualFace : P.dir) < 0 ? -1 : 1; x = P.x + face * 0.28; y = P.y + 0.01; lift = 15 * K; } else { x = A.x + 0.5; y = A.y + 0.2; }
        } else if (s.p === 3) { x = A.x + 0.3; y = A.y + 0.12; }
        Sp.x = x; Sp.y = y; Sp.z = y + 0.02; Sp.lift = lift;
      } });
  } catch (e) { A.stickSpr = null; }
}
/** The stick their pet brought back, lying at their feet (as _gaStickDropped on their screen: there until they throw again, or 20 s). */
function _gadStickDropped(A) {
  if (typeof gardenWorldAdd !== 'function' || !Number.isFinite(A.x)) return;
  try { if (A.stickDown) A.stickDown.remove(); } catch (e) { /* gone */ }
  const K = typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 1, t0 = performance.now(), x = A.x + 0.3, y = A.y + 0.12;
  try { A.stickDown = gardenWorldAdd({ id: 'ga-stick-down-' + A.w, x, y, z: y, lift: 0, ground: false, svg: `<g transform="scale(${K})"><ellipse cx="0" cy="1.4" rx="12" ry="1.8" fill="#1a1408" opacity="0.22"/><g transform="translate(0 -0.6) rotate(-6)">${_GA_MOUTH_STICK}</g></g>`, update(dt, Sp) { if (A.stickDown !== Sp || performance.now() - t0 > 20000 || A.stick || _gll.actors.get(A.w) !== A) { if (A.stickDown === Sp) A.stickDown = null; Sp.remove(); } } }); } catch (e) { A.stickDown = null; }
}
/** Their hands empty again: the carried thing off every drawing of their figure. The walker keeps one drawing per pose and way round
 *  and puts it back (94-garden-native-art.js swapPlayerBody), so a basket left on one came back in their arms during a later move
 *  (the critic: a stick throw drawn with the basket they had set down). Once, when the carrying ends. */
function _gadCarrySweep(A) {
  A.carried = false;
  const roots = new Set(); try { const inner = A.inner; if (inner) { roots.add(inner); const C = inner._nativePlayerBodies; if (C) for (const v of (C instanceof Map ? C.values() : Object.values(C))) { const n = v && (v.node || v); if (n && n.querySelectorAll) roots.add(n); } if (inner._nativePlayerCurrent && inner._nativePlayerCurrent.node) roots.add(inner._nativePlayerCurrent.node); } } catch (e) { /* what is there */ }
  for (const r of roots) { let list = []; try { list = [...r.querySelectorAll('.ga-carried')]; } catch (e) { list = []; } for (const n of list) { try { if (n.parentNode) n.parentNode.removeChild(n); if (n.destroy) n.destroy(); } catch (e) { /* gone */ } } try { if (r._gaCarry) r._gaCarry = null; for (const b of r.querySelectorAll('.gpl')) if (b.parentNode && b.parentNode._gaCarry) b.parentNode._gaCarry = null; } catch (e) { /* fine */ } }
}
/** Their figure while carrying: the thing in both hands (from gartMoveActor, after the stride). */
function gartActCarryActor(A, body, L) {
  if (!body) return;
  if (!A || !A.carryId) { if (body._gaCarry) { try { if (body._gaCarry.parentNode) body._gaCarry.parentNode.removeChild(body._gaCarry); if (body._gaCarry.destroy) body._gaCarry.destroy(); } catch (e) { /* gone */ } body._gaCarry = null; } if (A && A.carried) _gadCarrySweep(A); return; }
  A.carried = true;
  gartActCarryFrame(body, L || _gmvLimbs(body), A.carryArt || 'basket');
}

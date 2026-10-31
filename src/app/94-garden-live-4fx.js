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
    const body = Object.assign({ c, e: String(e) }, o || {});
    for (const k of Object.keys(body)) if (body[k] == null || (body[k] === 0 && (k === 'n' || k === 'ql' || k === 'nw'))) delete body[k];
    if (glFxOk(body)) return;
    if (c === 'got' && _gll.role === 'host' && typeof _glgOwnGot === 'function') _glgOwnGot(String(e), body.i);   // (the host's own catch counts towards a shared goal)
    if (_gll.role === 'visit') { if (_glvLive()) _glvSend('fx', body); return; }
    if (_gll.role === 'host' && _glh.on && _glhAnyone()) _glhSend('all', 'fx', body);
  } catch (err) { /* only a message */ }
}
function gardenLivePet(c, e) { gardenLiveFx(c, e); }
/** A moment of yours that the others in the garden cheer (2.29.0): a garden level (v: the level), an achievement (v: its id) or a photo taken. Nothing when nobody is there. */
function gardenLiveCheer(e, v) {
  if (e === 'level') { const n = Math.round(Number(v)); if (n >= 1 && n <= 99) gardenLiveFx('cheer', 'level', { n }); }
  else if (e === 'ach') { if (/^[A-Za-z0-9_-]{1,64}$/.test(String(v || '')) && typeof _pfAutoBadgeOk === 'function' && _pfAutoBadgeOk(String(v))) gardenLiveFx('cheer', 'ach', { i: String(v) }); }   // (only the groups a profile's automatic showcase may show: never money, places, health or memories)
  else if (e === 'photo') gardenLiveFx('cheer', 'photo');
}
/* ---------- the corner feed ---------- */
function _gllFeed(text) {
  const box = typeof _gw !== 'undefined' ? _gw.box : null; if (!box) return;
  let f = box.querySelector(':scope > .gll-feed');
  if (!f) { f = document.createElement('div'); f.className = 'gll-feed'; f.setAttribute('role', 'status'); box.appendChild(f); }
  while (f.children.length >= 3) f.firstChild.remove();
  const l = document.createElement('div'); l.className = 'gll-feed-l'; l.textContent = text; f.appendChild(l);
  setTimeout(() => l.remove(), 5600);
}
function _gllOffscreen(A) { try { return typeof _gwInView === 'function' ? !_gwInView(A.x, A.y, 1) : false; } catch (e) { return false; } }
const _GLL_FX_KIND = Object.freeze({ fish: 'fish', bug: 'bug', keep: 'keep', craft: 'craft', crop: 'crop' });
/* ---------- they did it ---------- */
function _gllFxPlay(A, ev) {
  if (!A || !ev) return;
  const c = ev.c, e = String(ev.e || '');
  if (c === 'ct') return;   // (the host's round: a visitor hears it in 94-garden-live-7contest.js; a guest cannot say it)
  if (_gll.role === 'host' && (c === 'fish' || c === 'got') && typeof gardenContestSeen === 'function') { try { gardenContestSeen(A, ev); } catch (err) { console.error('[garden live] contest', err); } }   // the host counts what it can match
  if (c === 'pet' || c === 'wow' || c === 'nap') { if (typeof _gllPetFx === 'function') _gllPetFx(A, ev); return; }
  if (c === 'cr' || c === 'egg' || c === 'pick') { _glcFx(A, ev); return; }
  if (c === 'roam') { if (typeof _gllRoamAdd === 'function') _gllRoamAdd(e); return; }
  if (c === 'cheer') { _gllCheerFx(A, e, ev); return; }
  if (c === 'snap') { if (typeof _glsHear === 'function') _glsHear(A, ev); return; }   // (a group photo: 94-garden-live-7snap.js)
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
    const kind = _GLL_FX_KIND[e], spec = kind ? gardenMomentSpec(kind, ev.i, { cm: ev.n, q: ev.ql, isNew: (ev.nw & 1) === 1, record: (ev.nw & 2) === 2 }) : null;
    if (!spec) return;   // an id this version does not know
    const who = String(A.n).split(/\s+/)[0];
    if (_gllOffscreen(A) || gardenFun() === 'off') { _gllFeed(`${who} ${spec.verb} ${_gscA(spec.name)}`); return; }
    A.fish = null; _gllFxClear(A);
    A.dir = 's'; _gllPose(A, 'hold', GART_MOMENT_MS);
    const g = _gllSvgEl('g', 'gll-held'); g.setAttribute('transform', 'scale(.74)'); g.innerHTML = gardenMomentSvg(spec, { who });
    A.root.appendChild(g);
    const tag = A.root.querySelector('.gll-name'); if (tag) tag.style.display = 'none';
    setTimeout(() => { g.remove(); if (tag) tag.style.display = ''; }, GART_MOMENT_MS);
    if (typeof _fxSound === 'function') _fxSound('sparkle');
  }
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
  if (!A.root || _gllReduced()) return;
  const g = _gllSvgEl('g'); g.setAttribute('transform', `translate(0 -30) scale(${A.face < 0 ? -1 : 1} 1)`);
  g.innerHTML = '<path d="M6 8Q30 -16 30 -34" stroke="#fbfbf2" stroke-width="2.6" stroke-opacity="0.8" fill="none" stroke-linecap="round"/>';
  A.root.appendChild(g); setTimeout(() => g.remove(), 360);
  _gllPose(A, 'pick', 500);
}
/** A bug somebody netted goes from this screen too (the same bugs are about on every screen: the window's seed, 94-garden-fish-2core.js). */
function _gllBugGone(key) {
  if (!_gw.goneKeys) _gw.goneKeys = new Set();
  if (_gw.goneKeys.size > 200) _gw.goneKeys.clear();
  _gw.goneKeys.add(key);
  const b = _gw.bugs && _gw.bugs.get(key);
  if (b) { if (b.node && b.node.remove) b.node.remove(); _gw.bugs.delete(key); if (_gw.netting && _gw.netting.actor === b) _gw.netting = null; if (typeof gardenPop === 'function' && gardenMotionOn()) gardenPop(Math.floor(b.x), Math.floor(b.y), 1, 1, 'is-grow'); }
}
/* ---------- a line out, on their figure ---------- */
function _gllFxClear(A) { if (A.fxg) { A.fxg.remove(); A.fxg = null; A.fxe = null; } }
function _gllFishFx(A, e, ev) {
  const t = Date.now();   // clock-ok: how long they have been quiet
  if (e === 'cast') {
    const bx = ev.x + 0.5, by = ev.y + 0.5;
    A.tx = null; A.moving = false; A.way = null;
    if (Math.abs(bx - A.x) > 0.1) A.face = bx > A.x ? 1 : -1;
    A.fish = { state: 'cast', t: 0, bx, by, at: t, nib: 1.2 }; A.key = '';
    _gllFxClear(A);
    return;
  }
  const F = A.fish; if (!F) return;
  F.at = t;
  if (e === 'bite') { F.state = 'bite'; F.t = 0; _gllRing(A, F, 1.3); if (typeof _fxSound === 'function') _fxSound('splash'); }
  else if (e === 'reel') { F.state = 'reel'; F.t = 0; }
  else if (e === 'land') { F.state = 'land'; F.t = 0; _gllRing(A, F, 1.6); }
  else { _gllRing(A, F, 1.2); A.fish = null; A.key = ''; _gllFxClear(A); }
}
function _gllRing(A, F, k) {
  if (_gllReduced() || !A.root) return;
  const g = _gllSvgEl('g'), W = GARDEN_WORLD;
  g.setAttribute('transform', `translate(${((F.bx - A.x) * W.cellW).toFixed(1)} ${((F.by - A.y) * W.cellH).toFixed(1)})`);
  g.innerHTML = `<ellipse class="gd-ring" cx="0" cy="0" rx="${(8 * k).toFixed(1)}" ry="${(2.6 * k).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-opacity="0.9"/>`;
  A.root.appendChild(g); setTimeout(() => g.remove(), 1500);
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
  const F = A.fish;
  if (!F) return;
  if (A.moving || Date.now() - F.at > 40000) { A.fish = null; A.key = ''; _gllFxClear(A); return; }   // clock-ok: a line forgotten
  F.t += dt;
  if (!A.fxe || !A.fxe.rod.isConnected) {
    _gllFxClear(A);
    const g = _gllSvgEl('g', 'gll-fx'), e = { rod: _gllSvgEl('path', 'gll-fxrod'), line: _gllSvgEl('path', 'gll-fxline'), bob: _gllSvgEl('g'), bub: _gllSvgEl('g') };
    const bob = typeof gardenBobber === 'function' ? gardenBobber() : { c: '#d8452a', c2: '#fbfbf2' };
    e.bob.innerHTML = `<circle cx="0" cy="-1" r="4.2" fill="${bob.c}" stroke="#2a2018" stroke-width="0.8"/><path d="M-4 -1.6a4.2 4.2 0 0 1 8 0z" fill="${bob.c2}"/>`;
    e.bub.innerHTML = '<ellipse cx="0" cy="0" rx="9" ry="9.6" fill="#fff6c8" stroke="#d89a1a" stroke-width="1.6"/><path d="M-1.6 -5.4h3.2l-0.6 6.2h-2z" fill="#d8301a"/><circle cx="0" cy="4.4" r="1.5" fill="#d8301a"/>';
    g.append(e.rod, e.line, e.bob, e.bub); A.root.appendChild(g); A.fxg = g; A.fxe = e;
  }
  const e = A.fxe, W = GARDEN_WORLD, f = A.face < 0 ? -1 : 1;
  const tx = (F.bx - A.x) * W.cellW, ty = (F.by - A.y) * W.cellH;
  let tipX = f * 34, tipY = -62, bx = tx, by = ty, sag = 8;
  if (F.state === 'cast') { const u = Math.min(1, F.t / 0.28); tipX = f * (-18 + 52 * u); tipY = -(78 - 16 * u); const k = Math.max(0, Math.min(1, (F.t - 0.22) / 0.5)); bx = tipX + (tx - tipX) * k; by = tipY + (ty - tipY) * k - Math.sin(k * Math.PI) * 46; sag = 2 + 6 * k; if (F.t >= 0.75) { F.state = 'wait'; F.t = 0; _gllRing(A, F, 1); if (typeof _fxSound === 'function') _fxSound('splash'); } }
  else if (F.state === 'wait') { tipX = f * 38; tipY = -56; by = ty + Math.sin(F.t * 2.6) * 0.9; if (F.t > F.nib) { F.nib = F.t + 1.5 + ((F.t * 7) % 2); _gllRing(A, F, 0.6); } }
  else if (F.state === 'bite') { tipX = f * 38; tipY = -56 + Math.sin(F.t * 40) * 2; by = ty + 4 + Math.sin(F.t * 36) * 2; sag = 3; }
  else if (F.state === 'reel') { tipX = f * 30; tipY = -68 + Math.sin(F.t * 18) * 1.4; by = ty + Math.sin(F.t * 12) * 1.4; sag = 1.2; }
  else if (F.state === 'land') { const u = Math.min(1, F.t / 0.5); tipX = f * 30; tipY = -68; bx = tx + (tipX - tx) * u; by = ty + (tipY - ty) * u - Math.sin(u * Math.PI) * 30; sag = 2; if (F.t >= 0.6) { A.fish = null; A.key = ''; _gllFxClear(A); return; } }
  e.rod.setAttribute('d', `M${(f * 8).toFixed(1)} -30L${tipX.toFixed(1)} ${tipY.toFixed(1)}`);
  e.line.setAttribute('d', `M${tipX.toFixed(1)} ${tipY.toFixed(1)}Q${((tipX + bx) / 2).toFixed(1)} ${(Math.max(tipY, by) + sag).toFixed(1)} ${bx.toFixed(1)} ${(by - 4).toFixed(1)}`);
  e.bob.setAttribute('transform', `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
  e.bub.setAttribute('visibility', F.state === 'bite' ? 'visible' : 'hidden');
  if (F.state === 'bite') e.bub.setAttribute('transform', `translate(0 ${(-84 - Math.abs(Math.sin(F.t * 9)) * 3).toFixed(1)})`);
}

/* ============================================================
   GARDEN, fishing and bug catching: THE PLAY (2.22). The page's side of 94-garden-fish-2core.js, driven by the world loop
   (94-garden-world-0walk.js). There are no tools for them: you just click the water, or the bug.

   FISHING, like Stardew Valley:
     1. click the water: you walk to a spot the rod reaches, turn to face it and cast
     2. the bobber floats; wait for a bite (a dip, ripples and a "!" over your head)
     3. strike in time (click, Space or E): a fish that is hard to land starts the reel
     4. the reel: a bar and a fish on a track. HOLD (the mouse, Space, E or Up) to lift the bar, let go to let it fall; keep
        the fish inside the bar to fill the meter. Fill it and the fish is yours; let it empty and the fish is gone
        (a perfect reel, never losing the fish, lands a better one).
     Junk and treasure need no reel. Press Esc, move or change tool to wind the line in. A cast costs a cast (not the fish).
   BUGS, a gentle Animal Crossing:
     click a bug: you creep up on it (slowly: run at a bug and it bolts), and swing when you are in reach.
     Resting bugs are easy to net; ones in the air dodge. Space / E swings at the nearest one.

   Everything drawn here goes into the scene's 'actors' layer (<g class="gd-actors">), which the scene patch never touches; the reel
   is an HTML panel over the stage. State: _gw.fishing, _gw.reel, _gw.netting, _gw.bugs (94-garden-world-0walk.js declares _gw).
   ============================================================ */
const NS_SVG = 'http://www.w3.org/2000/svg';
function _gwActors() { return _gw.svg ? _gw.svg.querySelector('.gd-actors') : null; }
function _gwEl(tag, attrs) { const e = document.createElementNS(NS_SVG, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); return e; }
function _gwPx(x, y) { const W = GARDEN_WORLD; return [x * W.cellW, W.sky + y * W.cellH]; }
function _gwFeet() { return _gwPx(_gw.px, _gw.py); }

/* ---------- the catch card (what you got, for a few seconds) ---------- */
function _gwCatchCard(o) {
  const box = _gdgBox(); if (!box) return;
  let c = box.querySelector('.gd-catchcard'); if (c) c.remove();
  c = document.createElement('div'); c.className = 'gd-catchcard' + (o.isNew ? ' is-new' : '') + (o.rare ? ' is-rare' : '');
  c.setAttribute('role', 'status');
  const stars = o.q ? `<b class="gd-stars q${o.q}" title="${esc(gardenQuality(o.q).label)}">${gardenQuality(o.q).stars}</b>` : '';
  c.innerHTML = `<div class="gd-cc-art">${o.svg}</div><div class="gd-cc-txt"><b>${esc(o.name)}</b>${stars}<span>${esc(o.sub)}</span>${o.isNew ? '<em>New in your book!</em>' : o.record ? '<em>A new record!</em>' : ''}</div>`;
  c.onclick = () => { c.classList.add('is-out'); setTimeout(() => c.remove(), 220); if (o.open) gardenCatchOpen(o.open); };
  box.appendChild(c);
  clearTimeout(_gw.cardT); _gw.cardT = setTimeout(() => { c.classList.add('is-out'); setTimeout(() => c.remove(), 300); }, o.ms || 4200);
}
function _gwHeldUp(svgFrag, ms) {
  // the catch held up over your head for a moment
  const a = _gwActors(); if (!a || !gardenMotionOn()) return;
  const [x, y] = _gwFeet();
  const g = _gwEl('g', { class: 'gd-held', transform: `translate(${x.toFixed(1)} ${(y - 78).toFixed(1)})` });
  g.innerHTML = `<g transform="scale(0.62)">${svgFrag}</g>`;
  a.appendChild(g); setTimeout(() => g.remove(), ms || 1400);
}

/* ---------- fishing: the line, the bobber, the state machine ---------- */
/** The garden was drawn again with a line out (the state arrived from another tab or the server): put the line, the reel and the lock-in back. */
function _gwFishResume() {
  const F = _gw.fishing; if (!F || F.state === 'idle') return;
  _gw.fx = null; _gwFx(); _gwFishFocus(true);
  const R = _gw.reel, box = _gdgBox();
  if (R && box) { box.appendChild(R.el); box.addEventListener('pointerdown', R.down, true); box.focus({ preventScroll: true }); }
}
function _gwFishBusy() { return !!(_gw.fishing && _gw.fishing.state !== 'idle'); }
function _gwFishReset() { _gwFishClearFx(); _gw.fishing = null; _gwReelClose(); _gwFishFocus(false); }
/** Fishing locks you in: the camera closes in on you, nothing under the pointer lights up, the toolbar rests; a little bar says what to do. */
function _gwFishFocus(on) {
  if (!_gdp.root) return;
  _gdp.root.classList.toggle('is-fishing', !!on);
  const box = _gdgBox();
  if (box) { box.dataset.fishing = on ? '1' : ''; if (on) box.dataset.hover = ''; }
  if (on) { try { _gdpHighlight(null); _gdpGhostClear(); gardenHoverCardHide(); } catch (e) { /* nothing was lit */ } }
  else if (box) { const h = box.querySelector('.gd-fishhud'); if (h) h.remove(); }
  _gw.cam.dirty = true; _gw.cam.snap = false;
}
const _GW_FISH_SAY = { cast: 'Casting…', wait: 'Waiting for a bite…', bite: 'Now! Click or press Space', reel: 'Hold to lift the bar', land: '' };
function _gwFishHud(F) {
  const box = _gdgBox(); if (!box) return;
  const say = _GW_FISH_SAY[F.state] || '';
  let h = box.querySelector('.gd-fishhud');
  if (!h) {
    h = document.createElement('div'); h.className = 'gd-fishhud';
    h.innerHTML = '<span class="gd-fishhud-t"></span><button type="button" class="gd-fishhud-b">Reel in <kbd>Esc</kbd></button>';
    h.querySelector('button').onclick = (ev) => { ev.stopPropagation(); _gwFishCancel('You wound the line in.'); };
    box.appendChild(h);
  }
  if (h._say !== say) { h._say = say; h.querySelector('.gd-fishhud-t').textContent = say; h.classList.toggle('is-bite', F.state === 'bite'); }
  h.hidden = F.state === 'land' || F.state === 'reel';
}
function _gwFishClearFx() { if (_gw.fx) { for (const k of ['line', 'rod', 'bob', 'bubble', 'ring']) if (_gw.fx[k] && _gw.fx[k].remove) _gw.fx[k].remove(); } _gw.fx = null; }
function _gwFx() {
  if (_gw.fx && _gw.fx.rod && _gw.fx.rod.isConnected) return _gw.fx;
  const a = _gwActors(); if (!a) return null;
  _gwFishClearFx();
  const bob = gardenBobber();
  const fx = {
    line: _gwEl('path', { class: 'gd-line', fill: 'none', stroke: '#fbfbf2', 'stroke-opacity': '0.85', 'stroke-width': '0.9', 'stroke-linecap': 'round' }),
    rod: _gwEl('path', { class: 'gd-rod', fill: 'none', stroke: '#6a4a2a', 'stroke-width': '2.2', 'stroke-linecap': 'round' }),
    bob: _gwEl('g', { class: 'gd-bobber' }),
    bubble: _gwEl('g', { class: 'gd-bite' }),
    ring: _gwEl('g', { class: 'gd-rings' }),
  };
  fx.bob.innerHTML = `<ellipse cx="0" cy="3.4" rx="6" ry="1.8" fill="#0a2a46" fill-opacity="0.25"/><circle cx="0" cy="-1" r="4.2" fill="${bob.c}" stroke="#2a2018" stroke-width="0.8"/><path d="M-4 -1.6a4.2 4.2 0 0 1 8 0z" fill="${bob.c2}"/><circle cx="-1.3" cy="-2.6" r="1" fill="#ffffff" fill-opacity="0.8"/><path d="M0 -5.2v-3" stroke="#fbfbf2" stroke-width="0.8"/>`;
  fx.bubble.innerHTML = '<ellipse cx="0" cy="0" rx="9" ry="9.6" fill="#fff6c8" stroke="#d89a1a" stroke-width="1.6"/><path d="M-1.6 -5.4h3.2l-0.6 6.2h-2z" fill="#d8301a"/><circle cx="0" cy="4.4" r="1.5" fill="#d8301a"/>';
  fx.bubble.setAttribute('visibility', 'hidden'); fx.bob.setAttribute('visibility', 'hidden'); fx.line.setAttribute('visibility', 'hidden');
  a.append(fx.ring, fx.rod, fx.line, fx.bob, fx.bubble);
  _gw.fx = fx;
  return fx;
}
function _gwRodPoints() {
  // the hand and the tip of the rod, in stage units, for how the player is standing
  const [x, y] = _gwFeet(), f = _gw.face;
  const F = _gw.fishing;
  let tipX = x + f * 34, tipY = y - 62, hx = x + f * 8, hy = y - 30;
  if (F && F.state === 'cast') { const u = Math.min(1, F.t / 0.28); tipX = x + f * (-18 + 52 * u); tipY = y - (78 - 16 * u); }
  else if (F && (F.state === 'wait' || F.state === 'bite')) { tipX = x + f * 38; tipY = y - 56 + (F.state === 'bite' ? Math.sin(F.t * 40) * 2 : 0); }
  else if (F && F.state === 'reel') { tipX = x + f * 30; tipY = y - 68 + Math.sin(F.t * 18) * 1.4; }
  return { hx, hy, tipX, tipY };
}
function _gwFishFrame(dt) {
  const F = _gw.fishing;
  if (!F || F.state === 'idle') { if (_gw.fx && _gw.fx.rod) { _gw.fx.rod.setAttribute('visibility', 'hidden'); _gw.fx.line.setAttribute('visibility', 'hidden'); _gw.fx.bob.setAttribute('visibility', 'hidden'); _gw.fx.bubble.setAttribute('visibility', 'hidden'); } return; }
  const fx = _gwFx(); if (!fx) return;
  F.t += dt;
  _gwFishHud(F);
  const W = GARDEN_WORLD;
  const [tx, ty] = _gwPx(F.bx, F.by);
  const R = _gwRodPoints();
  let bx = tx, by = ty, sag = 8;
  if (F.state === 'cast') {
    const u = Math.max(0, Math.min(1, (F.t - 0.22) / 0.5));
    bx = R.tipX + (tx - R.tipX) * u; by = R.tipY + (ty - R.tipY) * u - Math.sin(u * Math.PI) * 46;
    sag = 2 + 6 * u;
    if (F.t >= 0.75) { F.state = 'wait'; F.t = 0; _gwRing(tx, ty); }
  } else if (F.state === 'wait') {
    by = ty + Math.sin(F.t * 2.6) * 0.9; sag = 8;
    if (F.t > F.nextNibble) { F.nextNibble = F.t + 1.2 + Math.random() * 2.4; F.nibble = 0.35; _gwRing(tx, ty, 0.6); }
    if (F.nibble > 0) { F.nibble -= dt; by += Math.sin(F.nibble * 40) * 1.2; }
    if (F.t >= F.plan.wait) { F.state = 'bite'; F.t = 0; _gwRing(tx, ty); _gwRing(tx, ty, 1.3); if (typeof gardenLiveFx === 'function') gardenLiveFx('fish', 'bite'); }
  } else if (F.state === 'bite') {
    by = ty + 4 + Math.sin(F.t * 36) * 2; sag = 3;
    if (F.t >= F.plan.strike) { _gwFishLost('It got away: too slow.'); return; }
  } else if (F.state === 'reel') {
    by = ty + Math.sin(F.t * 12) * 1.4; bx = tx + Math.sin(F.t * 9) * 1.2; sag = 1.2;
    _gwReelStep(dt);
  } else if (F.state === 'land') {
    const u = Math.min(1, F.t / 0.5); bx = tx + (R.tipX - tx) * u; by = ty + (R.tipY - ty) * u - Math.sin(u * Math.PI) * 30; sag = 2;
    if (F.t >= 0.5) { _gwFishFinish(); return; }
  }
  fx.rod.setAttribute('visibility', 'visible'); fx.rod.setAttribute('d', `M${R.hx.toFixed(1)} ${R.hy.toFixed(1)}L${R.tipX.toFixed(1)} ${R.tipY.toFixed(1)}`);
  fx.line.setAttribute('visibility', 'visible'); fx.line.setAttribute('d', `M${R.tipX.toFixed(1)} ${R.tipY.toFixed(1)}Q${((R.tipX + bx) / 2).toFixed(1)} ${(Math.max(R.tipY, by) + sag).toFixed(1)} ${bx.toFixed(1)} ${(by - 4).toFixed(1)}`);
  fx.bob.setAttribute('visibility', 'visible'); fx.bob.setAttribute('transform', `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
  const [fx0, fy0] = _gwFeet();
  fx.bubble.setAttribute('visibility', F.state === 'bite' ? 'visible' : 'hidden');
  if (F.state === 'bite') fx.bubble.setAttribute('transform', `translate(${fx0.toFixed(1)} ${(fy0 - 84 - Math.abs(Math.sin(F.t * 9)) * 3).toFixed(1)})`);
  void W;
}
function _gwRing(x, y, k) {
  const fx = _gwFx(); if (!fx || !gardenMotionOn()) return;
  const g = _gwEl('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
  g.innerHTML = `<ellipse class="gd-ring" cx="0" cy="0" rx="${(8 * (k || 1)).toFixed(1)}" ry="${(2.6 * (k || 1)).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-opacity="0.9"/>`;
  fx.ring.appendChild(g); setTimeout(() => g.remove(), 1500);
}
function _gwFishCancel() {
  // you wound it in yourself: that is not a mistake, so nothing is said
  if (!_gwFishBusy()) return;
  if (typeof gardenLiveFx === 'function') gardenLiveFx('fish', 'in');
  _gw.fishing.state = 'idle'; _gwReelClose(); _gwFishClearFx(); _gwFishFocus(false);
}
function _gwFishCancelWalkAway() { if (_gwFishBusy() && _gw.fishing.state !== 'cast') _gwFishCancel(''); }
function _gwFishLost(msg) {
  if (typeof gardenLiveFx === 'function') gardenLiveFx('fish', 'lost');
  _gw.fishing.state = 'idle'; _gwReelClose(); _gwFishClearFx(); _gwFishFocus(false);
  if (msg) { const s = _ghProject(_gw.fishing.bx, _gw.fishing.by), r = _gw.box && _gw.box.getBoundingClientRect(); gameDeny(null, { at: s && r ? { x: r.left + s.x, y: r.top + s.y } : null, say: msg }); }
  if (gardenMotionOn()) { const [x, y] = _gwPx(_gw.fishing.bx, _gw.fishing.by); _gwRing(x, y, 1.2); }
  _gdpRefreshChromeSoon();
}

/** Click water (with any tool): cast there, to the very spot. If the rod does not reach from where you stand, you walk to the nearest place it does and cast from there. */
function gardenFishClickPt(pt, m) {
  const cell = { x: Math.floor(pt.x), y: Math.floor(pt.y) };
  if (!gardenIsWater(cell.x, cell.y)) return false;
  const info = gardenCastsInfo(m);
  if (info.left < 1 && !info.free) { _gdpSay({ ok: false, msg: 'No casts left today. They come back tomorrow, and with every 12 minutes of work you do.' }); return true; }
  const zone = gardenWaterZone(cell.x, cell.y);
  if (zone === 'pond' && !m.areas.includes('pond')) { _gdpSay({ ok: false, msg: 'The pond opens at garden level 7.' }); return true; }
  const rod = gardenRod(), reach = rod.st.range, W = GARDEN_WORLD;
  const dist = (x, y) => Math.hypot(x - pt.x, y - pt.y);
  const d0 = dist(_gw.px, _gw.py);
  if (_gwFree(_gw.px, _gw.py) && d0 <= reach && d0 >= 0.6) { _gw.path = []; _gwFishCast(pt); return true; }
  // the nearest place on the shore or the pier from which the rod reaches it
  const cands = [];
  for (let y = pt.y - reach; y <= pt.y + reach; y += 0.25) for (let x = pt.x - reach; x <= pt.x + reach; x += 0.25) {
    const d = dist(x, y);
    if (d > reach - 0.12 || d < 0.9 || !_gwFree(x, y)) continue;
    cands.push({ x, y, d: Math.hypot((x - _gw.px) * W.cellW, (y - _gw.py) * W.cellH) });
  }
  cands.sort((a, b) => a.d - b.d);
  let best = null, bl = 1e9;
  for (const c of cands.slice(0, 12)) {
    const r = _gwRoute({ x: _gw.px, y: _gw.py }, c); if (!r) continue;
    let len = 0, at = { x: _gw.px, y: _gw.py }; for (const w of r) { len += Math.hypot((w.x - at.x) * W.cellW, (w.y - at.y) * W.cellH); at = w; }
    if (len < bl) { bl = len; best = c; }
  }
  if (!best) { _gdpSay({ ok: false, msg: `Out of reach for the ${rod.name.toLowerCase()}. ${zone === 'deep' ? 'Walk out to the end of the pier, or get a better rod.' : 'Try the pier.'}` }); return true; }
  gardenWalkToPoint(best, () => { _gwFacePt(pt); _gwFishCast(pt); });
  return true;
}
function gardenFishClick(cell, m) { return gardenFishClickPt({ x: cell.x + 0.5, y: cell.y + 0.5 }, m); }
function _gwFishCast(pt) {
  _gwFacePt(pt);
  const plan = gardenFishPlan(Math.floor(pt.x), Math.floor(pt.y));
  if (!plan.ok) { _gdpSay(plan); return; }
  _gw.fishing = { state: 'cast', t: 0, plan, bx: pt.x, by: pt.y, nextNibble: 1.1 + Math.random() * 1.5, nibble: 0, hold: false };
  _gwFishClearFx(); _gwFx(); _gwBody(); _gwFishFocus(true);
  if (typeof gardenLiveFx === 'function') gardenLiveFx('fish', 'cast', { x: Math.floor(pt.x), y: Math.floor(pt.y) });
  _gdpRefreshChromeSoon(); if (typeof _gdpPaintSide === 'function') _gdpPaintSide(gardenModel());
}
/** Space / E with a rod and nothing out: cast at the water in front of you. */
function gardenFishFront() {
  const W = GARDEN_WORLD, m = gardenHere(), px = Math.floor(_gw.px), py = Math.floor(_gw.py), rod = gardenRod();
  for (let r = 2; r <= rod.st.range; r++) {
    const x = px + _gw.face * r, y = py + 1;
    if (x >= 0 && x < W.cols && gardenIsWater(x, y)) { gardenFishClick({ x, y }, m); return; }
  }
  for (let r = 1; r <= rod.st.range; r++) for (const dy of [1, 0, -1]) { const x = px + _gw.face * r, y = py + dy; if (x >= 0 && x < W.cols && y >= 0 && y < W.rows && gardenIsWater(x, y)) { gardenFishClick({ x, y }, m); return; } }
  for (let r = 1; r <= rod.st.range; r++) { const y = py + r; if (y < W.rows && gardenIsWater(px, y)) { gardenFishClick({ x: px, y }, m); return; } }
  _gdpSay({ ok: false, msg: 'No water in front of you: walk to the lake, or click the water.' });
}
/** A click while a line is out: strike on a bite, reel in early while waiting. */
function _gwFishClick() { _gwFishPress(true); return true; }
function _gwFishPress(fromClick) {
  const F = _gw.fishing; if (!F) return;
  if (F.state === 'bite') { _gwFishStrike(); return; }
  if (F.state === 'wait') return;   // locked in: a click while you wait does nothing (Esc or the Reel in button winds the line in)
  if (F.state === 'reel' && _gw.reel) _gw.reel.hold = true;
}
function _gwFishRelease() { if (_gw.reel) _gw.reel.hold = false; }
function _gwFishStrike() {
  const F = _gw.fishing, plan = F.plan;
  F.state = 'reel'; F.t = 0; if (typeof gardenLiveFx === 'function') gardenLiveFx('fish', 'reel');
  if (!plan.diff) { _gwFishLand({ perfect: false, easy: true }); return; }   // junk and treasure just come in
  _gwReelOpen(plan);
}
function _gwFishLand(res) {
  const F = _gw.fishing; F.state = 'land'; F.t = 0; F.res = res; _gwReelClose(); if (typeof gardenLiveFx === 'function') gardenLiveFx('fish', 'land');
  if (gardenMotionOn()) { const [x, y] = _gwPx(F.bx, F.by); _gwRing(x, y, 1.6); }
}
function _gwFishFinish() {
  const F = _gw.fishing, plan = F.plan;
  F.state = 'idle'; _gwFishClearFx(); _gwFishFocus(false);
  const r = gardenCatchFish(plan, F.res || {});
  if (!r.ok) { _gdpSay(r); return; }
  const d = r.def;
  const held = gardenCatchMoment('fish', d.id, { cm: r.cm, q: r.q, isNew: r.isNew, record: r.record, contest: !!r.contest });   // held up over your head, and told to the others
  if (!held) _gwHeldUp(gardenFishArt(d.id, { uid: 'held' }), 1500);
  const rare = ['rare', 'epic', 'legendary'].includes(d.rarity);
  let sub, name = d.name;
  if (r.contest) sub = d.cat === 'fish' ? `${r.cm} cm · ${gardenQuality(r.q).label} · let go` : 'Let go again';
  else if (d.cat === 'fish') sub = `${r.cm} cm · ${gardenQuality(r.q).label}${r.perfect ? ' reel' : ''}`;
  else if (r.coins) { sub = `${r.coins} coins inside`; name = 'A coin purse'; }
  else if (r.items) { const k = Object.keys(r.items)[0], pl = gardenPlant(String(k).replace('seed:', '')); sub = pl ? `A ${pl.name.toLowerCase()} seed packet and 10 coins` : 'A seed packet'; }
  else sub = d.cat === 'junk' ? 'Junk, but the market takes it' : 'Treasure!';
  if (!held) _gwCatchCard({ svg: gardenCatchSvg('fish', d.id, 64, { uid: 'cc' }), name, sub, q: r.q, isNew: r.isNew, record: r.record, rare, open: 'fish' });
  if (typeof gardenFloat === 'function' && !r.contest) gardenFloat(d.cat === 'fish' ? `+${(_GC_XP[d.rarity] || 1)} XP` : '', Math.floor(_gw.px), Math.floor(_gw.py) - 1, 1, 1, 'is-xp');
  _gdpRefreshChromeSoon();
}

/* ---------- the reel ---------- */
function _gwReelOpen(plan) {
  const box = _gdgBox(); if (!box) { _gwFishLand({ perfect: false }); return; }
  _gwReelClose();
  const el = document.createElement('div'); el.className = 'gd-reel'; el.setAttribute('role', 'application'); el.setAttribute('aria-label', 'Reeling in a fish. Hold the mouse button, Space or E to lift the bar.');
  el.innerHTML = `<div class="gd-reel-head"><b>${esc(plan.def.cat === 'fish' ? 'Something big!' : 'Reeling in')}</b></div><div class="gd-reel-body"><div class="gd-reel-track"><div class="gd-reel-bar"></div><div class="gd-reel-fish">${gardenCatchSvg('fish', plan.id, 30, { uid: 'rf' })}</div></div><div class="gd-reel-prog"><i></i></div></div><div class="gd-reel-hint">Hold to lift the bar · keep the fish inside · Esc lets go</div>`;
  // the fish's real name only after it is landed: a dark shape while you fight it
  el.querySelector('.gd-reel-fish').classList.add('is-hidden');
  box.appendChild(el);
  const barH = plan.bar, beh = plan.beh, diff = plan.diff;
  _gw.reel = { el, bar: el.querySelector('.gd-reel-bar'), fish: el.querySelector('.gd-reel-fish'), prog: el.querySelector('.gd-reel-prog i'),
    b: 0.05, vb: 0, f: 0.5, vf: 0, target: 0.5, tt: 0, p: 0.3, barH, beh, diff, line: plan.line, hold: false, lostFor: 0, everLost: false, t: 0, perfect: true };
  // holding the mouse on the stage lifts the bar
  const down = (ev) => { if (_gw.reel) { _gw.reel.hold = true; ev.preventDefault(); } };
  const up = () => { if (_gw.reel) _gw.reel.hold = false; };
  _gw.reel.down = down; _gw.reel.up = up;
  box.addEventListener('pointerdown', down, true); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  box.focus({ preventScroll: true });
}
function _gwReelClose() {
  const R = _gw.reel; if (!R) return;
  const box = _gdgBox();
  if (box && R.down) box.removeEventListener('pointerdown', R.down, true);
  if (R.up) { window.removeEventListener('pointerup', R.up); window.removeEventListener('pointercancel', R.up); }
  if (R.el && R.el.parentNode) R.el.remove();
  _gw.reel = null;
}
function _gwReelStep(dt) {
  const R = _gw.reel; if (!R) return;
  R.t += dt;
  // the bar: lifted while held, falls when let go
  const acc = R.hold ? 3.1 : -2.3;
  R.vb = Math.max(-1.25, Math.min(1.25, R.vb + acc * dt)); R.b += R.vb * dt;
  if (R.b < 0) { R.b = 0; R.vb = R.vb < -0.5 ? -R.vb * 0.28 : 0; }
  const top = 1 - R.barH; if (R.b > top) { R.b = top; R.vb = 0; }
  // the fish picks a place to be, by how it swims
  R.tt -= dt;
  const spd = 0.22 + 0.075 * R.diff, jump = 0.14 + 0.05 * R.diff;
  if (R.tt <= 0) {
    const beh = R.beh === 'mixed' ? ['smooth', 'dart', 'floater', 'sinker'][Math.floor(Math.random() * 4)] : R.beh;
    R.cur = beh;
    if (beh === 'smooth') { R.target = Math.max(0.06, Math.min(0.94, R.f + (Math.random() - 0.5) * 2 * jump * 2)); R.tt = 0.8 + Math.random() * 1.2; R.sp = spd; }
    else if (beh === 'dart') { R.target = 0.06 + Math.random() * 0.88; R.tt = 0.45 + Math.random() * 0.8; R.sp = spd * 2.6; }
    else if (beh === 'floater') { R.target = Math.min(0.94, R.f + 0.12 + Math.random() * 0.3); if (R.f > 0.8) R.target = 0.2 + Math.random() * 0.3; R.tt = 0.7 + Math.random() * 1.1; R.sp = spd * 0.9; }
    else { R.target = Math.max(0.06, R.f - 0.12 - Math.random() * 0.3); if (R.f < 0.2) R.target = 0.6 + Math.random() * 0.3; R.tt = 0.7 + Math.random() * 1.1; R.sp = spd * 0.9; }
  }
  const d = R.target - R.f, step = Math.sign(d) * Math.min(Math.abs(d), (R.sp || spd) * dt * (0.5 + Math.min(1, Math.abs(d) * 3)));
  R.f += step;
  // the meter
  const inBar = R.f >= R.b - 0.015 && R.f <= R.b + R.barH + 0.015;
  if (inBar) { R.p += 0.2 * dt; R.lostFor = 0; } else { R.p -= 0.13 * (R.line || 1) * dt; R.lostFor += dt; if (R.lostFor > 0.3) R.perfect = false; }
  R.p = Math.max(0, Math.min(1, R.p));
  R.bar.style.bottom = (R.b * 100).toFixed(2) + '%'; R.bar.style.height = (R.barH * 100).toFixed(2) + '%';
  R.fish.style.bottom = `calc(${(R.f * 100).toFixed(2)}% - 15px)`;
  R.prog.style.height = (R.p * 100).toFixed(1) + '%';
  R.el.classList.toggle('is-in', inBar);
  if (R.p >= 1) { const perfect = R.perfect; _gwFishLand({ perfect }); }
  else if (R.p <= 0) _gwFishLost('It slipped the hook.');
}

/* ---------- bugs: they live in the actors layer and wander by themselves ---------- */
const GW_BUG_SCALE = 0.4;   // a butterfly (36 units of art) comes out about 14 units across: smaller than the gardener's head (about 22), and a beetle smaller still
function _gwBugsLayer() { return _gw.svg ? _gw.svg.querySelector('.gd-objects') : null; }   // 2.23: a bug is drawn in its row: it goes behind a tree and in front of a bench
function _gwBugsReset() { if (_gw.bugs) for (const b of _gw.bugs.values()) if (b.node && b.node.remove) b.node.remove(); _gw.bugs = new Map(); _gw.bugsAt = 0; _gw.netting = null; }
/** Bring the bugs on the stage in line with the ones about now (after a paint, and every so often). */
function _gwBugsSync(m) {
  if (!_gw.bugs) _gw.bugs = new Map();
  const layer = _gwBugsLayer(); if (!layer) return;
  const now = gardenBugsNow(m).filter(s => !(_gw.goneKeys && _gw.goneKeys.has(s.key))), keep = new Set();   // (one a friend netted is gone for you too)
  for (const s of now) {
    keep.add(s.key);
    if (_gw.bugs.has(s.key)) continue;
    const def = gardenBugDef(s.id); if (!def) continue;
    const node = _gwEl('g', { class: 'gd-bug', 'data-bk': s.key, 'data-live': '1', 'data-z': String(s.y) });
    node.innerHTML = `<g class="gb-sh"><ellipse cx="0" cy="0" rx="${(GW_BUG_SCALE * 9 * def.size).toFixed(1)}" ry="${(GW_BUG_SCALE * 3 * def.size).toFixed(1)}" fill="#1a2a14" fill-opacity="0.18"/></g><g class="gb-lift"><g class="gb-in" transform="scale(${(GW_BUG_SCALE * def.size).toFixed(2)})">${gardenBugArt(s.id, { uid: 'bg' + (gardenHash(s.key) % 9999).toString(36) })}</g></g>`;
    _gwPlace(node, s.y);
    const b = { key: s.key, id: s.id, def, x: s.x, y: s.y, tx: s.x, ty: s.y, state: 'rest', timer: 0.6 + (s.t || 0) * 4, lift: def.rest === 'crawl' ? 0 : 5, face: 1, node, liftEl: node.querySelector('.gb-lift'), inEl: node.querySelector('.gb-in'), fleeT: 0, hab: s.hab, seed: s.t || Math.random(), anchor: { x: s.x, y: s.y } };
    _gw.bugs.set(s.key, b);
  }
  for (const [k, b] of _gw.bugs) if (!keep.has(k)) { if (b.node && b.node.remove) b.node.remove(); _gw.bugs.delete(k); }
  _gw.bugsAt = performance.now();
}
function _gwBugFree(x, y) { return gardenWalkable(Math.floor(x), Math.floor(y)) || gardenIsWater(Math.floor(x), Math.floor(y)) && false; }
function _gwBugPick(b, far) {
  // somewhere to go: near its anchor (a flower, a log), or well away when it bolts
  const W = GARDEN_WORLD;
  for (let i = 0; i < 10; i++) {
    const ang = Math.random() * Math.PI * 2, r = far ? 3.5 + Math.random() * 3 : 0.5 + Math.random() * (b.def.rest === 'crawl' ? 1.2 : 2.6);
    const base = far ? { x: b.x, y: b.y } : b.anchor;
    const x = Math.max(0.5, Math.min(W.cols - 0.5, base.x + Math.cos(ang) * r)), y = Math.max(0.8, Math.min(W.rows - 0.4, base.y + Math.sin(ang) * r * 0.7));
    const water = gardenIsWater(Math.floor(x), Math.floor(y)), flyer = b.def.rest !== 'crawl';
    if (b.hab === 'water' || b.def.hab.includes('water') && Math.random() < 0.5) { if (water || y >= 12) return { x, y: Math.max(y, 12.4) }; }
    if (flyer ? !!gardenPropAt(Math.floor(x), Math.floor(y)) || gardenAreaAt(Math.floor(x), Math.floor(y), 99).startsWith('locked') : !gardenWalkable(Math.floor(x), Math.floor(y))) continue;
    if (!flyer && water) continue;
    return { x, y };
  }
  return { x: b.anchor.x, y: b.anchor.y };
}
/* a fish leaps out of the lake somewhere in view now and then, with a splash: just for life (never while you fish, never with motion off) */
function _gwLeapFrame(dt) {
  if (!gardenMotionOn() || gardenFun() === 'off') return;
  _gw.leapT = (_gw.leapT == null ? 3 + Math.random() * 5 : _gw.leapT) - dt;
  if (_gw.leapT > 0) return;
  _gw.leapT = 7 + Math.random() * 12;
  const m = gardenHere(); if (m.tod === 'night' && Math.random() < 0.5) return;
  if (_gwFishBusy()) return;
  const a = _gwActors(); if (!a) return;
  const W = GARDEN_WORLD, wa = gardenArea('lake').water;
  // somewhere in water near you (the camera follows you), a few cells out
  const cx = Math.max(1, Math.min(W.coreCols - 2, Math.round(_gw.px + (Math.random() - 0.5) * 9))), cy = wa.y + 1 + Math.floor(Math.random() * 3);
  if (!gardenIsWater(cx, cy)) return;
  const defs = GARDEN_FISH_ONLY.filter(f => f.zone.includes(cy - wa.y <= 1 ? 'shallow' : 'mid') && f.lv <= m.level.level && (!f.tod.length || f.tod.includes(m.tod)));
  const f = defs.length ? defs[Math.floor(Math.random() * defs.length)] : gardenFishDef('perch');
  const [x, y] = _gwPx(cx + 0.5, cy + 0.6), dir = Math.random() < 0.5 ? 1 : -1;
  const g = _gwEl('g', { class: 'gd-leapfish', transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
  g.innerHTML = `<g class="gd-leap-x" style="--lx:${28 * dir}px"><g class="gd-leap-y"><g class="gd-leap-r" style="transform-box:fill-box;transform-origin:50% 50%"><g transform="scale(${(0.3 * dir).toFixed(2)} 0.3)">${gardenFishArt(f.id, { uid: 'lp' + Math.floor(Math.random() * 1e6).toString(36) })}</g></g></g></g>`;
  a.appendChild(g);
  _gwRing(x, y, 1); setTimeout(() => _gwRing(x + 28 * dir, y, 1.2), 780);
  setTimeout(() => g.remove(), 900);
}
function _gwBugsFrame(dt) {
  _gwLeapFrame(dt);
  if (!_gw.bugs || !_gw.bugs.size) { _gwNetFrame(dt); return; }
  const W = GARDEN_WORLD, pxx = _gw.px, pyy = _gw.py, motion = gardenMotionOn();
  if (performance.now() - (_gw.bugsAt || 0) > 25000) _gwBugsSync(gardenHere());
  const moving = _gw.moving, sneaking = _gw.sneak || !!_gw.netting;
  let busy = false;
  for (const b of _gw.bugs.values()) {
    // with motion off a bug stays where it is: you can still creep up and net it
    if (!motion) { if (b.state !== 'rest') b.state = 'rest'; _gwBugDraw(b, false); continue; }
    const d = Math.hypot((b.x - pxx) * W.cellW, (b.y - pyy) * W.cellH) / 40;   // in "cell-ish" units
    const skitR = 0.9 + 0.38 * b.def.skit;
    // do you scare it? running at it does; creeping or standing still hardly does
    if (b.state !== 'flee' && motion) {
      const r = moving && !sneaking ? skitR : sneaking && moving ? skitR * 0.42 : skitR * 0.28;
      if (d < r && (Math.random() < dt * (moving && !sneaking ? 9 : 1.1 * b.def.skit / 3))) { b.state = 'flee'; b.fleeT = 1.6 + Math.random() * 1.2; const p = _gwBugPick(b, true); b.tx = p.x; b.ty = p.y; }
    }
    b.timer -= dt;
    if (_gw.netting && _gw.netting.actor === b && b.state === 'rest' && _gwBugDist(b) < 4) b.timer = Math.max(b.timer, 0.5);   // it sits still while you creep up
    const crawl = b.def.rest === 'crawl';
    if (b.state === 'rest') {
      if (b.timer <= 0) { const p = _gwBugPick(b, false); b.tx = p.x; b.ty = p.y; b.state = 'fly'; b.timer = 3; }
      b.lift += ((crawl ? 0 : 5 + (b.def.rest === 'hover' ? 7 : 0)) - b.lift) * Math.min(1, dt * 5);
    } else {
      const sp = (b.state === 'flee' ? 3.3 : crawl ? 0.55 : b.def.rest === 'hover' ? 1.8 : 1.4) * (motion ? 1 : 0.6);
      const dx = b.tx - b.x, dy = b.ty - b.y, dist = Math.hypot(dx * W.cellW, dy * W.cellH) / 40;
      if (dist < 0.15 || b.timer < -6) { b.state = 'rest'; b.timer = crawl ? 0.8 + Math.random() * 2.4 : 2 + Math.random() * 4.5; }
      else {
        const wob = !crawl && motion ? Math.sin(_gw.t * 6 + b.seed * 9) * 0.25 : 0;
        const nx = b.x + dx / dist * sp * dt * (1 + wob * 0.2), ny = b.y + dy / dist * sp * dt * 0.7;
        // what crawls keeps to the same ground you do (the one collision map); what flies goes over it
        if (crawl && !gardenWorldFree(nx, ny, 0.08)) { b.state = 'rest'; b.timer = 0.6 + Math.random() * 2; }
        else { b.x = nx; b.y = ny; }
        if (Math.abs(dx) > 0.05) b.face = dx > 0 ? 1 : -1;
        b.lift += ((crawl ? 0 : 13 + Math.sin(_gw.t * 5 + b.seed * 7) * 3) - b.lift) * Math.min(1, dt * 4);
      }
      if (b.state === 'flee') { b.fleeT -= dt; if (b.fleeT <= 0) { b.state = 'fly'; b.timer = 3; } }
    }
    const flying = b.state !== 'rest' && !crawl || b.def.rest === 'hover';
    if (_gwBugDraw(b, flying) && b.state !== 'rest') busy = true;
  }
  _gw.bugsBusy = busy;
  _gwNetFrame(dt);
}
/** Put a bug on the stage: only what changed, and nothing at all while it is out of view (a frame that writes is a frame the stage paints). True when it is in view. */
function _gwBugDraw(b, flying) {
  if (!_gwInView(b.x, b.y, 1) && b.node.parentNode && b.zk != null) return false;
  const [x, y] = _gwPx(b.x, b.y), tf = `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
  if (b.tf !== tf) { b.tf = tf; b.node.setAttribute('transform', tf); b.node.setAttribute('data-z', b.y.toFixed(2)); }
  const lf = `translate(0 ${(-b.lift).toFixed(1)})`;
  if (b.lf !== lf) { b.lf = lf; b.liftEl.setAttribute('transform', lf); }
  if (b.fc !== b.face) { b.fc = b.face; const k = GW_BUG_SCALE * b.def.size; b.inEl.setAttribute('transform', `scale(${(b.face * k).toFixed(2)} ${k.toFixed(2)})`); }
  const cls = 'gd-bug' + (flying ? ' is-fly' : '') + (b.state === 'flee' ? ' is-flee' : '') + ((_gw.netting && _gw.netting.actor === b) || _gw.hoverBug === b.key ? ' is-target' : '') + (b.def.glow || b.def.id === 'firefly' ? ' is-glow' : '');
  if (b.cls !== cls) { b.cls = cls; b.node.setAttribute('class', cls); }
  const zk = Math.floor(b.y * 3);
  if (b.zk !== zk || !b.node.parentNode) { b.zk = zk; _gwPlace(b.node, b.y); }
  return true;
}

/* ---------- the net ---------- */
function _gwBugNear(cx, cy, r) {
  let best = null, bd = r;
  for (const b of _gw.bugs ? _gw.bugs.values() : []) { const d = Math.hypot(b.x - cx, (b.y - (b.lift || 0) / GARDEN_WORLD.cellH - cy) * 1.3); if (d < bd) { bd = d; best = b; } }
  return best;
}
/** A click with the Net: on a bug, creep up and swing; on the ground, creep there. */
function gardenNetClick(cell, ev, m) {
  void m;
  let wx = cell.x + 0.5, wy = cell.y + 0.5;
  // use the exact point of the click when we can (a bug is small)
  try { const svg = _gw.svg, ctm = svg.getScreenCTM(); if (ev && ctm && ev.clientX != null) { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const p = pt.matrixTransform(ctm.inverse()), W = GARDEN_WORLD; wx = p.x / W.cellW; wy = (p.y - W.sky) / W.cellH; } } catch (e) { /* the cell will do */ }
  const bug = _gwBugNear(wx, wy + 0.25, 1.15);
  if (bug) { _gwNetChase(bug); return true; }
  _gw.netting = null;
  if (gardenWalkable(cell.x, cell.y) || _gwNearestFree(cell.x, cell.y, 4)) { gardenWalkTo(cell, null, { sneak: true, radius: 4 }); return true; }
  return true;
}
/** How far a bug is from you, in cells (up and down squashed: a cell is shorter than it is wide). */
function _gwBugDist(b) { return Math.hypot(b.x - _gw.px, (b.y - _gw.py) * 1.5); }
function _gwNetReach() { return gardenNet().st.reach; }
function _gwNetChase(bug) {
  _gw.netting = { actor: bug, state: 'chase', t: 0, swing: 0, lastWalk: -9, goal: null, stuck: 0 };
  if (typeof gardenLiveFx === 'function') gardenLiveFx('bug', 'sneak');
  _gwNetWalk();
}
/** Creep to a free place within reach of the bug. Says so (and stops) when it is too far in among the plants for the net to reach. */
function _gwNetWalk() {
  const N = _gw.netting; if (!N) return false;
  const b = N.actor, reach = _gwNetReach(), W = GARDEN_WORLD;
  if (_gwBugDist(b) <= reach * 1.1) { N.goal = { x: b.x, y: b.y }; _gw.path = []; return true; }
  let best = null, bd = 1e9;
  for (let r = 0.35; r <= reach * 1.05; r += 0.2) for (let a = 0; a < 6.283; a += 0.45) {
    const x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r / 1.5;
    if (!_gwFree(x, y)) continue;
    const d = Math.hypot((x - _gw.px) * W.cellW, (y - _gw.py) * W.cellH) + r * 6;
    if (d < bd) { bd = d; best = { x, y }; }
  }
  if (!best) { _gdpSay({ ok: false, msg: 'It is too far in among the plants to reach. Wait for it to come out.' }); _gw.netting = null; _gw.path = []; return false; }
  N.goal = { x: b.x, y: b.y };
  if (!gardenWalkToPoint(best, null, { sneak: true, radius: 0.5, net: true })) { _gdpSay({ ok: false, msg: 'You cannot get close to it.' }); _gw.netting = null; return false; }
  return true;
}
function _gwNetFrame(dt) {
  const N = _gw.netting; if (!N) return;
  const b = N.actor;
  if (!b || !_gw.bugs.has(b.key)) { _gw.netting = null; return; }
  N.t += dt;
  if (N.swing > 0) { N.swing -= dt; if (N.swing <= 0) _gwNetResolve(); return; }
  if (_gwBugDist(b) <= _gwNetReach() * 1.15) { _gw.path = []; _gw.spd = 0; N.swing = gardenNet().st.swing; _gw.face = b.x >= _gw.px ? 1 : -1; _gwBody(); _gwNetDraw(b); return; }
  // it wandered off: aim again, but only when it really moved; no way to it, or no luck for a while: let it go
  if (N.goal && Math.hypot(b.x - N.goal.x, (b.y - N.goal.y) * 1.5) > 0.5 && N.t - N.lastWalk > 0.35) { N.lastWalk = N.t; if (!_gwNetWalk()) return; }
  if (!_gw.path.length) { N.stuck += dt; if (N.stuck > 0.6) { N.stuck = 0; if (!_gwNetWalk()) return; } } else N.stuck = 0;
  if (N.t > 9) { _gdpSay({ ok: false, msg: 'It got away from you.' }); _gw.netting = null; }
}
function gardenNetSwing() {
  // Space / E: the nearest bug in reach
  let best = null, bd = _gwNetReach() * 1.35;
  for (const b of _gw.bugs ? _gw.bugs.values() : []) { const d = Math.hypot((b.x - _gw.px), (b.y - _gw.py) * 1.4); if (d < bd) { bd = d; best = b; } }
  if (!best) { _gdpSay({ ok: false, msg: 'No bug in reach. Click one with the net, and creep up on it.' }); _gwNetAir(); return; }
  _gw.netting = { actor: best, state: 'swing', t: 0, swing: gardenNet().st.swing, lastWalk: 0, at: { x: best.x, y: best.y } };
  _gw.face = best.x >= _gw.px ? 1 : -1; _gwBody(); _gwNetDraw(best);
}
function _gwNetAir() {
  if (typeof gardenLiveFx === 'function') gardenLiveFx('bug', 'swing');
  if (!gardenMotionOn()) return;
  const a = _gwActors(); if (!a) return;
  const [x, y] = _gwFeet(), f = _gw.face;
  const g = _gwEl('g', { class: 'gd-swing', transform: `translate(${x.toFixed(1)} ${(y - 30).toFixed(1)}) scale(${f} 1)` });
  g.innerHTML = '<path d="M6 8Q30 -16 30 -34" stroke="#fbfbf2" stroke-width="2.6" stroke-opacity="0.8" fill="none" stroke-linecap="round"/>';
  a.appendChild(g); setTimeout(() => g.remove(), 360);
}
function _gwNetDraw(b) {
  _gwNetAir();
  void b;
}
function _gwNetResolve() {
  const N = _gw.netting; if (!N) return;
  const b = N.actor; _gw.netting = null;
  if (!b || !_gw.bugs.has(b.key)) return;
  const W = GARDEN_WORLD, net = gardenNet();
  const d = _gwBugDist(b);
  const awake = b.state !== 'rest';
  let p = 0.78 + net.st.luck - 0.065 * b.def.skit - Math.max(0, d - net.st.reach) * 0.4;
  if (awake) p *= b.state === 'flee' ? 0.18 : 0.4;
  if (_gw.sneak) p += 0.06;
  const ok = !(_gw.goneKeys && _gw.goneKeys.has(b.key)) && Math.random() < Math.max(0.06, Math.min(0.96, p));   // (somebody netted it first: your swing misses)
  if (!ok) { _gwBugMissed(b, true); return; }
  // in a live garden the host says who netted it first (94-garden-live-6life.js): 'wait' for a guest, 'lost' when somebody had it
  const claim = typeof gardenLiveBugClaim === 'function' ? gardenLiveBugClaim(b) : 'ok';
  if (claim === 'wait') return;
  if (claim === 'lost') { _gwBugMissed(b); return; }
  _gwBugTaken(b);
}
/** A clean miss: it bolts, and nothing is given. */
function _gwBugMissed(b, tell) {
  if (tell && typeof gardenLiveFx === 'function') gardenLiveFx('bug', 'miss');
  b.state = 'flee'; b.fleeT = 2; const pk = _gwBugPick(b, true); b.tx = pk.x; b.ty = pk.y;
  if (typeof gardenFloat === 'function') gardenFloat('It got away!', Math.floor(b.x), Math.floor(b.y) - 1, 1, 1, '');
}
/** It is yours (and, in a live garden, the host said so): into your bag, held up. */
function _gwBugTaken(b) {
  const W = GARDEN_WORLD;
  const r = gardenCatchBug({ key: b.key, id: b.id });
  if (!r.ok) { _gdpSay(r); return; }
  if (b.node && b.node.remove) b.node.remove(); _gw.bugs.delete(b.key);
  if (gardenMotionOn() && typeof gardenPop === 'function') gardenPop(Math.floor(b.x), Math.floor(b.y), 1, 1, 'is-grow');
  const d2 = r.def, rare = ['rare', 'epic', 'legendary'].includes(d2.rarity);
  const held = gardenCatchMoment('bug', d2.id, { isNew: r.isNew });
  if (!held) _gwCatchCard({ svg: gardenCatchSvg('bug', d2.id, 56, { uid: 'cb', glow: false }), name: d2.name, sub: d2.rarity === 'common' ? 'In your bag' : GARDEN_RARITY[d2.rarity].label + ' find', isNew: r.isNew, rare, open: 'bugs', ms: 3400 });
  if (typeof gardenFloat === 'function' && !r.contest) gardenFloat(`+${_GC_XP[d2.rarity] || 1} XP`, Math.floor(_gw.px), Math.floor(_gw.py) - 1, 1, 1, 'is-xp');
  _gdpRefreshChromeSoon();
}

/** Open the book / tackle shop on a tab of the catch page. */
function gardenCatchOpen(tab) {
  if (tab) { try { _gdG().prefs.catchTab = tab; } catch (e) { /* fine */ } }
  gardenGoPage('garden:catch');   // a pop-up while you are in the garden, the page elsewhere
}

/* ============================================================
   YOUR OWN HOUSE, lights by walking (FUN-ROADMAP Phase 6: "Hold a reel of fairy lights and walk ... the string follows you and droops
   naturally. At dusk the lights come on one by one").

   A reel of fairy lights (any decor row with hp 'string'): take it from your things and its first end is pinned to the top of the
   wall above you; walk, and the string pays out behind you, drooping between the pin and your hands; E or a click pins the other end
   above where you stand. It hangs along the top of the wall (over a picture or a window if you like: a garland is meant to go over
   things), never into the ceiling, never over another string. Its bulbs come on one by one at dusk, left to right, and go off by day.
   With Move things, a click takes it down again (back in your things).
   Saved as a piece (the rules: houseStringFits): x its left pin, y the pins' height, v its length (HOUSE_SPANS). Friends see it.
   Speed: the string being walked out is one Graphics redrawn only when your hands move; a hung string is drawn once, its glows are
   images whose alpha a tween sets, nothing per frame.
   No top-level calls.
   ============================================================ */
const HOUSE_BULBS = Object.freeze([0xffd86a, 0xff8a6a, 0x8ad0ff, 0xb8f08a, 0xffb0e0]);
/** Where a string's bulbs hang: n points along a droop from (x0, y) to (x1, y). */
function _hsStringPts(x0, x1, y, sag, n) {
  const out = []; for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = x0 + (x1 - x0) * t; out.push([x, y + Math.sin(t * Math.PI) * sag]); } return out;
}
/** Draw a string of lights into a Graphics (the flex, its two pins, the bulbs' glass): lit is how far along it the lights have come (0..1). */
function _hsStringPaint(G, x0, x1, y, lit, bad) {
  const span = Math.abs(x1 - x0), sag = Math.max(8, span * .14), n = Math.max(4, Math.round(span / 26)), a = Math.min(x0, x1), b = Math.max(x0, x1);
  G.clear();
  G.lineStyle(3, 0x000000, .12).beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24, x = a + (b - a) * t, yy = y + 6 + Math.sin(t * Math.PI) * sag; if (i) G.lineTo(x, yy); else G.moveTo(x, yy); } G.strokePath();   // (its shadow on the wall)
  G.lineStyle(1.6, bad ? 0xa83a2a : 0x2e3a2a, 1).beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24, x = a + (b - a) * t, yy = y + Math.sin(t * Math.PI) * sag; if (i) G.lineTo(x, yy); else G.moveTo(x, yy); } G.strokePath();
  for (const x of [a, b]) { G.fillStyle(0x3a3a40, 1).fillCircle(x, y, 3); G.fillStyle(0xb8b8c0, 1).fillCircle(x - .8, y - .8, 1.1); }
  _hsStringPts(a, b, y, sag, n).forEach(([x, yy], i) => {
    const on = i / n < lit, c = HOUSE_BULBS[i % HOUSE_BULBS.length];
    G.fillStyle(0x2e3a2a, 1).fillRect(x - 1.2, yy - 1, 2.4, 3);
    G.fillStyle(on ? c : Phaser.Display.Color.ValueToColor(c).darken(45).color, on ? 1 : .9).fillEllipse(x, yy + 5, 5.2, 7);
    G.fillStyle(0xffffff, on ? .8 : .35).fillCircle(x - 1, yy + 3.6, 1.1);
  });
  return { sag, n };
}
/** The lights of every string in the room, as the room's own state (S.strings: uid -> { g, glows, on }). */
function _hsStringsSync(R, S) {
  const s = _hsNative(); if (!s) return;
  const scene = s.context.scene, keep = new Set(), dark = (() => { const t = _hsLight().tod; return t === 'dusk' || t === 'night'; })();
  S.strings = S.strings || new Map();
  for (const p of S.pieces) {
    const sh = houseShape(gardenDecor(p.d)); if (!sh || sh.hp !== 'string') continue;
    keep.add(p.u);
    const span = houseSpan(p.v), sig = p.x + '|' + p.y + '|' + span;
    let E = S.strings.get(p.u);
    if (!E || !E.g.active || E.sig !== sig) {
      if (E) _hsStringGone(E);
      const g = scene.add.graphics().setDepth(125 + p.y / 1000); s.root.add(g);
      const geo = _hsStringPaint(g, p.x, p.x + span, p.y, 0, false), glows = [];
      _hsStringPts(p.x, p.x + span, p.y, geo.sag, geo.n).forEach(([x, yy], i) => { const im = scene.add.image(x, yy + 5, _hsGlowKey(scene)).setBlendMode(Phaser.BlendModes.ADD).setTint(HOUSE_BULBS[i % HOUSE_BULBS.length]).setScale(.36).setAlpha(0).setDepth(126 + p.y / 1000); s.root.add(im); glows.push(im); });
      E = { g, glows, sig, x0: p.x, x1: p.x + span, y: p.y, on: false, lit: 0 }; S.strings.set(p.u, E);
    }
    if (E.on !== dark) { E.on = dark; _hsStringLight(scene, E, dark); }
  }
  for (const [u, E] of S.strings) if (!keep.has(u)) { _hsStringGone(E); S.strings.delete(u); }
}
/** Dusk: on, one by one, left to right (a tween each, staggered); day: off together. */
function _hsStringLight(scene, E, on) {
  const motion = gardenMotionOn();
  E.glows.forEach((im, i) => {
    scene.tweens.killTweensOf(im);
    if (!motion) { im.setAlpha(on ? .75 : 0); return; }
    scene.tweens.add({ targets: im, alpha: on ? .75 : 0, delay: on ? 300 + i * 140 : 0, duration: on ? 260 : 400, ease: 'Sine.easeOut' });
  });
  if (motion && on) { let k = 0; const n = E.glows.length, step = () => { if (!E.g.active || !E.on) return; k++; _hsStringPaint(E.g, E.x0, E.x1, E.y, k / n, false); if (k < n) E.t = setTimeout(step, 140); }; clearTimeout(E.t); E.t = setTimeout(step, 300); }
  else _hsStringPaint(E.g, E.x0, E.x1, E.y, on ? 1 : 0, false);
}
function _hsStringGone(E) { clearTimeout(E.t); try { if (E.g.active) E.g.destroy(); for (const im of E.glows) if (im.active) im.destroy(); } catch (e) { /* gone with the room */ } }
function _hsStringsEnd(S) { if (S.strings) for (const E of S.strings.values()) _hsStringGone(E); S.strings = null; if (S.stringing) _hsStringClear(S); }

/* ---------- walking one out ---------- */
/** The pins' height in this room near x: a little under the ceiling there (the top of the wall). */
function _hsStringY(S, x0, x1) { const sh = S.shell || HOUSE_SHELL; return Math.round(Math.max(houseCeilAt(sh, x0), houseCeilAt(sh, x1), sh.hang.y0 - 10) + 18); }
/** Take a reel from your things: its first end is pinned above you. */
function _hsStringStart(R, S, d) {
  const s = _hsNative(), M = _grm.me; if (!s || !M) { _grmSay('Fairy lights want the painted rooms to hang in.'); return; }
  if (S.pieces.length >= HOUSE_ROOM_MAX) { _grmSay(`There is room for ${HOUSE_ROOM_MAX} things in here. Put something away first.`); return; }
  const sh = S.shell || HOUSE_SHELL, x0 = Math.max(sh.wall.x0 + 12, Math.min(sh.wall.x1 - 12, Math.round(M.x)));
  const g = s.context.scene.add.graphics().setDepth(9050); s.root.add(g);
  S.stringing = { d, x0, x1: x0, y: _hsStringY(S, x0, x0), g, ok: false, why: '', v: 0, lastX: NaN };
  S.chest = false; if (typeof _hsBagPaint === 'function') _hsBagPaint(R, S);
  if (typeof _hsHint === 'function') _hsHint(R, S);
  _grmSay('You pin one end up. Now walk, and pin the other end with E (or a click).', 6000);
  try { if (typeof _fxSound === 'function') _fxSound('tick'); } catch (e) { /* no sound */ }
}
/** Each frame while walking one out: the string from the pin to above your hands, drooping, red where it would not go. */
function _hsStringFrame(R, S) {
  const T = S.stringing, M = _grm.me; if (!T || !M) return;
  const sh = S.shell || HOUSE_SHELL, max = HOUSE_SPANS[HOUSE_SPANS.length - 1];
  let x1 = Math.max(sh.wall.x0 + 12, Math.min(sh.wall.x1 - 12, Math.round(M.x)));
  if (Math.abs(x1 - T.x0) > max) x1 = T.x0 + Math.sign(x1 - T.x0) * max;   // (that is the whole reel)
  if (x1 === T.lastX) return; T.lastX = x1; T.x1 = x1;
  const span = Math.abs(x1 - T.x0); let v = 0, best = Infinity; HOUSE_SPANS.forEach((w, i) => { const d = Math.abs(w - span); if (d < best) { best = d; v = i; } });
  const a = x1 < T.x0 ? T.x0 - HOUSE_SPANS[v] : T.x0;
  T.v = v; T.y = _hsStringY(S, a, a + HOUSE_SPANS[v]);
  T.why = span < HOUSE_SPANS[0] * .7 ? 'Walk a little further to stretch it out' : houseStringFits(S.pieces, a, T.y, v, '', sh);
  T.ok = !T.why; T.a = a;
  const loose = span < HOUSE_SPANS[0] * .7, end = loose ? x1 : x1 < T.x0 ? T.x0 - HOUSE_SPANS[v] : T.x0 + HOUSE_SPANS[v];   // (paid out a length at a time: what you see is what is pinned)
  _hsStringPaint(T.g, T.x0, end, T.y, 0, !T.ok && !loose);
}
/** E or a click: pin the other end (if it fits). */
function _hsStringPin(R, S) {
  const T = S.stringing; if (!T) return false;
  if (!T.ok) { _grmSay((T.why || 'Not there') + '.'); try { gpTone([220], { force: true, len: .14, vol: .05 }); } catch (e) { /* no sound */ } return true; }
  const u = _gdUid('h'), op = { o: 'put', s: S.slot, d: T.d, x: T.a, y: T.y, z: 0, r: 0, v: T.v, u, lk: 'hf.' + u };
  _hsStringClear(S);
  if (gpVisiting()) { if (typeof _hsGuestDo === 'function') _hsGuestDo(R, S, op); }
  else { const r = houseDo(op, 'Hung the fairy lights'); if (!r.ok) { _grmSay(r.msg + '.'); return true; } if (typeof _hsPutReward === 'function') _hsPutReward(R, S); }
  _hsRoomRefresh(R, S, false); if (typeof _hsHint === 'function') _hsHint(R, S);
  const night = (() => { const t = _hsLight().tod; return t === 'dusk' || t === 'night'; })();
  _grmSay(night ? 'You pin the other end, and the lights come on, one by one.' : 'You pin the other end. They will come on by themselves at dusk.', 6000);
  try { if (typeof _fxSound === 'function') _fxSound('chime'); } catch (e) { /* no sound */ }
  return true;
}
function _hsStringClear(S) { const T = S.stringing; if (T && T.g && T.g.active) T.g.destroy(); S.stringing = null; }
function _hsStringCancel(R, S) { _hsStringClear(S); if (typeof _hsHint === 'function') _hsHint(R, S); _grmSay('You roll the lights back up. They are still in your things.', 3500); }
/** With Move things, a string is taken down (back in your things) rather than carried. */
function _hsStringDown(R, S, p) {
  const op = { o: 'lift', u: p.u };
  if (gpVisiting()) { if (typeof _hsGuestDo === 'function') _hsGuestDo(R, S, op); }
  else { const r = houseDo(op, 'Took down the fairy lights'); if (!r.ok) { _grmSay(r.msg + '.'); return; } }
  _hsRoomRefresh(R, S, false); if (typeof _hsBagPaint === 'function') _hsBagPaint(R, S);
  _grmSay(gpVisiting() ? 'You take the lights down and coil them up for your friend.' : 'You take the lights down and coil them up. They are in your things.', 4000);
}

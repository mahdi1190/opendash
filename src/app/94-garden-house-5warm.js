/* ============================================================
   YOUR OWN HOUSE, the housewarming (FUN-ROADMAP Phase 6: "A finished room brings a housewarming: villagers and online friends drop in
   with a small gift, and a villager gives a funny cosy rating").

   A room is finished (94-garden-house-4grow.js): the next time you step into it (that day or within three), there is a knock. Two or
   three of the vale's folk come in by the door you came through (houseCallersFor: the same callers on every device for the same seed,
   only those who are up at this hour), each goes to a thing of a kind they like (HOUSE_CALLERS: by kind, never by place), says a line
   about it, and leaves a gift: their own present the first time ever (a piece for the house), after that something small. Bramble
   gives the house its cosy stars (houseStars, by kind; the best is kept, so they never go down). Then they wish you well and go.
   A friend in the room on the day sees the same callers (the snapshot's `w`), and gets a slice of cake (a small thank-you).

   Drawn only indoors, in the room's own scene: the folk's day planner and the vale outside are untouched.
   No top-level calls.
   ============================================================ */
const HOUSE_WARM_LINES = Object.freeze({
  thistle: Object.freeze({ seat: 'A proper chair! You want a cushion on that, dear. I shall knit you one. I shan’t, but I shall think about it.', bed: 'Oh, a good bed. Sleep is half of everything, and the better half.', fire: 'Keep that fire in. A house without a fire is just a shed with ideas.', none: 'It’s lovely, dear. Bare, but lovely. Bare is only a beginning.' }),
  pip: Object.freeze({ picture: 'Is that the falls? I’ve been under the falls. Not on purpose.', clock: 'A clock! Now you’ll know exactly how late I am.', window: 'You can see right up the valley from here. I’ve been up the valley. It goes on.', none: 'Room for a cartwheel. I’m not going to. Probably.' }),
  tam: Object.freeze({ rug: 'A rug. Floors are cold. I know about floors.', light: 'A lamp. Good. I don’t care for the dark, which surprises people.', store: 'A chest. Somewhere to put things you will never find again. Very homely.', none: 'It’s a room. It has walls. I counted them. Four.' }),
  bramble: Object.freeze({ picture: 'A picture. A shade crooked. I’ll say nothing.', table: 'A good table is a promise of supper.', books: 'Books. I shall borrow the one about drains.', none: 'Plenty of space. Space is what you have before you have things.' }),
  quince: Object.freeze({ plant: 'A plant indoors! It looks as if it’s thinking about growing. Good for it.', window: 'Light from that window all morning, I bet. Lucky room.', table: 'A table! I’ll bring honey. I always bring honey.', none: 'Bring a plant in. Even a little one. Rooms like company.' }),
  wick: Object.freeze({ window: 'Good window. It faces the right bit of sky.', books: 'Books. I approve, even of the bad ones. Especially of the bad ones.', clock: 'A clock, telling the right time. Rare, in this vale.', none: 'I came for the view. It is dark. I shall come back.' }),
});
const HOUSE_WARM_STARS = Object.freeze([
  '',
  'One star. It’s a room. It’s trying. So are we all.',
  'Two stars. It’s warming up, like a kettle. Slowly.',
  'Three stars. A good, honest, sit-down sort of room.',
  'Four stars. I’d stay for tea. I’d stay for a second cup.',
  'Five stars. I have never said that. Don’t tell anyone.',
]);
const _hsw = { pending: 0 };
/** Which callers are up now (the folk's own day blocks: an owl only after dusk, a hedgehog not in the middle of the day). */
function _hsAwake() {
  const out = new Set();
  try {
    const m = gardenHere(), p = Clock.parts(_gdNow()), h = p.h + p.mi / 60, H = VALE_BLOCK_HOURS[m.season] || VALE_BLOCK_HOURS.spring;
    let block = 'night'; for (const b of VALE_BLOCKS) { const [a, z] = H[b]; if ((h >= a && h < z) || (h + 24 >= a && h + 24 < z)) { block = b; break; } }
    for (const c of HOUSE_CALLERS) { const row = VALE_FOLK_ROW.get(c.id), R = row && VALE_ROUTINES[row.routine], ch = R && R[block]; if (!ch || ch.every(x => x[0] === 'sleep')) continue; out.add(c.id); }
  } catch (e) { for (const c of HOUSE_CALLERS) if (!c.night) out.add(c.id); }
  return out;
}
/** A room was just finished while you are about: if you are in it, the knock comes in a moment. */
function _hsWarmSoon(slot) { _hsw.pending = slot; setTimeout(() => { if (_hsInside() && _grm.R.slot === slot) _hsWarmMaybe(_grm.R, _grm.S); }, 6000); }
/** Is a housewarming waiting for this room? { slot, seed, mine } or null. Yours: not done and within three days. A friend's: on its day. */
function _hsWarmDue(R) {
  const v = _hsView(); if (!v || !v.hw || v.hw.s !== R.slot) return null;
  if (gpVisiting()) { const today = houseDayNum(_gdToday()); return v.hw.dn === today && !_hsw['seen' + v.home + R.slot + v.hw.dn] ? { slot: R.slot, seed: v.hw.seed, mine: false, key: 'seen' + v.home + R.slot + v.hw.dn } : null; }
  const hw = _gdG().hs.hw; if (!hw || hw.done || !hw.d) return null;
  const days = typeof _wdDaysBetween === 'function' ? _wdDaysBetween(hw.d, _gdToday()) : 0;
  return days >= 0 && days <= 3 ? { slot: R.slot, seed: hw.seed | 0, mine: true } : null;
}
/** Begin it, if one is waiting and nothing else is going on in the room. */
function _hsWarmMaybe(R, S) {
  if (!S || S.warm || !_hsNative()) return;
  const due = _hsWarmDue(R); if (!due) return;
  if (due.key) _hsw[due.key] = 1;
  const callers = houseCallersFor(due.seed, _hsAwake()); if (!callers.length) return;
  S.warm = { due, callers, t: 0, step: 'knock', who: [], said: 0, stars: 0, R };
}
/** Each frame while it is on (from HOUSE_PLAY.frame): the knock, the callers in one by one, each to their thing, their lines, the stars, goodbye. */
function _hsWarmFrame(R, S, dt) {
  const W = S.warm; if (!W) return;
  const s = _hsNative(); if (!s) { S.warm = null; return; }
  W.t += dt;
  if (W.step === 'knock') {
    if (!W.knocked) { W.knocked = 1; _grmSay('Knock, knock.', 3000); try { gpTone([196, 220], { force: true, len: .09, vol: .07 }); } catch (e) { /* no sound */ } }
    if (W.t > 1.6) { W.step = 'in'; W.t = 0; }
    return;
  }
  if (W.step === 'in') {
    const sh = S.shell || HOUSE_SHELL;
    // one through the door every 0.9 s, each to their own spot
    while (W.who.length < W.callers.length && W.t > W.who.length * .9) {
      const c = W.callers[W.who.length], at = _hsWarmSpot(S, c, W.who);
      const V = _hsWarmActor(s, c, sh.stand.x, sh.stand.y + 6); V.tx = at.x; V.ty = at.y; V.kind = at.kind; V.p = at.p; W.who.push(V);
    }
    let moving = false;
    for (const V of W.who) moving = _hsWarmWalk(V, dt) || moving;
    if (W.who.length === W.callers.length && !moving) { W.step = 'talk'; W.t = 0; W.said = 0; }
    return;
  }
  if (W.step === 'talk') {
    if (W.said < W.who.length && W.t > W.said * 4.2) {
      const V = W.who[W.said], c = V.c, lines = HOUSE_WARM_LINES[c.id] || {}, line = lines[V.kind] || lines.none || 'What a lovely room.';
      const gift = W.due.mine ? _hsWarmGift(c) : '';
      _grmSay(`${V.name}: “${line}”${gift ? ' ' + gift : ''}`, 4800);
      _hsWarmBob(V); W.said++;
    }
    if (W.said >= W.who.length && W.t > W.said * 4.2 + .4) { W.step = 'stars'; W.t = 0; }
    return;
  }
  if (W.step === 'stars') {
    if (!W.starred) {
      W.starred = 1;
      const v = _hsView(), n = houseStars((v && v.pieces) || [], (v && v.rooms) || {}), critic = W.who.find(V => V.c.critic) || W.who[W.who.length - 1];
      W.stars = n; _grmSay(`${critic.name} looks round, very slowly. “${HOUSE_WARM_STARS[n]}”`, 6000);
      _hsWarmStarsShow(s, critic, n);
      if (W.due.mine) _hsWarmDone(n);
      else { const got = _hsGive('house.cake', { 'mat:timber': 1 }); if (got) setTimeout(() => { if (_hsInside()) _grmSay('There was cake. You take a slice home, wrapped in a napkin, and a stick of good timber somebody left by the door.', 7000); }, 6400); }
    }
    if (W.t > 6.2) { W.step = 'out'; W.t = 0; const sh = S.shell || HOUSE_SHELL; for (const V of W.who) { V.tx = sh.stand.x; V.ty = sh.stand.y + 6; } _grmSay('“Well. We’ll leave you to it.” And off they go, still talking about your ' + (W.R.slot ? houseRoomName(W.R.slot).replace(/^The /, '').toLowerCase() : 'kitchen') + '.', 5000); }
    return;
  }
  if (W.step === 'out') {
    let moving = false; for (const V of W.who) { if (V.gone) continue; const m = _hsWarmWalk(V, dt); if (!m) { V.gone = true; _hsWarmActorGone(V); } moving = moving || m; }
    if (!moving && W.who.every(V => V.gone)) { _hsWarmEnd(S); }
  }
}
/** Where a caller makes for: the nearest free spot in front of a thing of a kind they like, else somewhere in the room. */
function _hsWarmSpot(S, c, taken) {
  const sh = S.shell || HOUSE_SHELL, used = taken.map(V => [V.tx, V.ty]), free = (x, y) => used.every(([a, b]) => Math.hypot(a - x, b - y) > 64);
  for (const kind of c.likes) {
    if (kind === 'fire' && sh.fire) { const x = (sh.fire.x0 + sh.fire.x1) / 2 - 40, y = 462; if (free(x, y)) return { x, y, kind }; continue; }
    if (kind === 'window') { const x = (sh.window.x0 + sh.window.x1) / 2 + (used.length % 2 ? 40 : -40), y = 438; if (free(x, y)) return { x, y, kind }; continue; }
    for (const p of S.pieces) {
      const def = gardenDecor(p.d), S2 = houseShape(def); if (!S2 || S2.fk !== kind || (p.z || 0) > 0) continue;
      const x = Math.max(160, Math.min(880, p.x + (p.x > 480 ? -S2.w / 2 - 24 : S2.w / 2 + 24))), y = Math.max(430, Math.min(560, (S2.hp === 'wall' ? 440 : p.y + 18)));
      const q = _grmClamp(x, y); if (free(q.x, q.y)) return { x: q.x, y: q.y, kind, p };
    }
  }
  for (const [x, y] of [[420, 500], [580, 520], [300, 540], [700, 480], [520, 456]]) { const q = _grmClamp(x, y); if (free(q.x, q.y)) return { x: q.x, y: q.y, kind: 'none' }; }
  return { x: 480, y: 500, kind: 'none' };
}
/** A caller in the room: their painted figure, standing and walking, at the player's scale. */
function _hsWarmActor(s, c, x, y) {
  const row = VALE_FOLK_ROW.get(c.id) || { name: c.id, cast: c.id }, scene = s.context.scene, root = scene.add.container(x, y);
  const mk = walk => { const h = GardenNativeArt.create(scene, typeof gardenCastSvg === 'function' ? gardenCastSvg(row.cast, { walk }) : '', {}); root.add(h.root); return h; };
  const stand = mk(false), walk = mk(true); walk.root.setVisible(false);
  const shadow = scene.add.ellipse(0, 1, 30 * GARDEN_ACTOR_SCALE, 8 * GARDEN_ACTOR_SCALE, 0x111511, .22); root.addAt(shadow, 0);
  const name = String(row.name || c.id).replace(/^The /, '');
  const label = scene.add.text(0, -((typeof gardenCastTop === 'function' ? gardenCastTop(row.cast) : 50) * EE.fig) - 10, name, { fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#fff2d8', stroke: '#22180f', strokeThickness: 3 }).setOrigin(.5, 1);
  root.add(label); s.root.add(root);
  const V = { c, row, name, root, stand, walk, label, x, y, tx: x, ty: y, face: 1, walking: false, gone: false };
  _hsWarmPose(V, false); root.setDepth(1000 + y);
  return V;
}
function _hsWarmPose(V, walking) {
  if (V.walking === walking && V.posed) return; V.walking = walking; V.posed = true;
  V.stand.root.setVisible(!walking); V.walk.root.setVisible(walking);
  for (const h of [V.stand, V.walk]) h.root.setScale(EE.fig * V.face, EE.fig);
}
/** A step towards where they are going; false once they are there. */
function _hsWarmWalk(V, dt) {
  const dx = V.tx - V.x, dy = V.ty - V.y, d = Math.hypot(dx, dy);
  if (d < 2) { if (V.walking) { _hsWarmPose(V, false); const M = _grm.me; if (M) { const f = M.x >= V.x ? 1 : -1; if (f !== V.face) { V.face = f; V.posed = false; _hsWarmPose(V, false); } } } return false; }
  const sp = Math.min(d, 118 * dt); V.x += dx / d * sp; V.y += dy / d * sp * .9;
  const f = dx >= 0 ? 1 : -1; if (f !== V.face) { V.face = f; V.posed = false; }
  _hsWarmPose(V, true); V.root.setPosition(V.x, V.y).setDepth(1000 + V.y);
  return true;
}
function _hsWarmBob(V) { const s = _hsNative(); if (!s || !gardenMotionOn()) return; s.context.scene.tweens.add({ targets: V.root, y: V.y - 7, duration: 160, yoyo: true, repeat: 1, ease: 'Sine.easeOut', onComplete: () => { if (V.root.active) V.root.setY(V.y); } }); }
function _hsWarmActorGone(V) { try { V.stand.destroy(); V.walk.destroy(); V.root.destroy(); } catch (e) { /* gone with the room */ } }
/** The stars, over the critic's head, for a moment. */
function _hsWarmStarsShow(s, V, n) {
  const scene = s.context.scene, t = scene.add.text(V.x, V.y - 128, '★'.repeat(n) + '☆'.repeat(5 - n), { fontFamily: 'Inter, sans-serif', fontSize: '24px', color: '#ffd86a', stroke: '#3a2410', strokeThickness: 4 }).setOrigin(.5, 1).setDepth(9700);
  s.root.add(t); if (!gardenMotionOn()) { setTimeout(() => t.destroy(), 5000); return; }
  t.setScale(.4); scene.tweens.add({ targets: t, scale: 1, duration: 420, ease: 'Back.easeOut' }); scene.tweens.add({ targets: t, alpha: 0, delay: 4600, duration: 700, onComplete: () => t.destroy() });
}
/** A caller's gift: the first time ever, their own present (a piece for the house); after that, something small, once a day. Yours only. */
function _hsWarmGift(c) {
  const g = _gdG(), k = 'hwg.' + c.id;
  if (!g.led[k] && c.gift && gardenDecor(c.gift)) { g.led[k] = { d: _gdToday(), k: 'hs', i: { ['decor:' + c.gift]: 1 }, n: 0 }; _gdSaveQuiet(); if (_hsInside()) _grm.S.dirty = true; return `(They leave you ${typeof _gscA === 'function' ? _gscA(houseLowName(gardenDecor(c.gift))) : 'a present'}: it is in your things.)`; }
  const seeds = typeof GARDEN_PLANTS !== 'undefined' ? GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && (typeof gardenInSeason !== 'function' || gardenInSeason(p, gardenHere().season))) : [], p = seeds.length ? seeds[gardenHash(c.id + _gdToday()) % seeds.length] : null;
  const got = _hsGive('house.warm.' + c.id, p ? { ['seed:' + p.id]: 2 } : { 'mat:timber': 1 });
  return got ? (p ? `(Two packets of ${p.name.toLowerCase()} seeds, “for the garden”.)` : '(A good length of timber, “for the next room”.)') : '';
}
/** It is over: the best stars kept, the housewarming done, the ribbon the first time. */
function _hsWarmDone(n) {
  const g = _gdG(), hs = g.hs; if (!hs) return;
  if (hs.hw) hs.hw.done = 1;
  const was = Number(hs.stars) || 0; if (n > was) hs.stars = n;
  hs.warms = (Number(hs.warms) || 0) + 1;
  _gdSaveQuiet(); if (_hsInside()) _grm.S.dirty = true;
  if (typeof _hsSnapSoon === 'function') _hsSnapSoon();
  if (n > was && was) setTimeout(() => { if (_hsInside()) _grmSay(`Your house has ${n} cosy stars now. They never go down.`, 5000); }, 6500);
  if (hs.warms === 1) { const got = _hsGrant('hs-warm-1', { 'mat:stone': 2 }); if (got) setTimeout(() => { if (_hsInside()) _grmSay('Your first housewarming. On the step afterwards: two good stones, “for the next one”.', 7000); }, 7200); }
}
function _hsWarmEnd(S) { const W = S.warm; if (W) for (const V of W.who) if (!V.gone) _hsWarmActorGone(V); S.warm = null; }

/* ---------- the plans: the cosy stars ---------- */
function _hsStarsRow(el, v) {
  const best = gpVisiting() ? Number(v.stars) || 0 : Number(_gdG().hs.stars) || 0, now = houseStars(v.pieces || [], v.rooms || {});
  const row = gpEl('div', 'hs-stars');
  row.appendChild(gpEl('span', 'hs-stars-l', 'Cosy stars'));
  row.appendChild(gpEl('span', 'hs-stars-s', best ? '★'.repeat(best) + '☆'.repeat(5 - best) : '☆☆☆☆☆'));
  row.appendChild(gpEl('span', 'muted hs-stars-t', best ? `Given at your last housewarming. Today it would be ${now}.` : 'Bramble gives them at your first housewarming: build on a room.'));
  el.appendChild(row);
}
/** The plans panel's foot when the banner maker is not loaded: the cosy stars alone. */
function _hsPlanStarsOnly(el, v) { _hsStarsRow(el, v); }

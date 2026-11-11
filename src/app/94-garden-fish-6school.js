/* ============================================================
   GARDEN, THE FISH IN THE WATER (2.34, docs/dev/GARDEN_TOGETHER.md section 20). The owner, 1 Nov 2026: "as animal crossing like as possible ... we can see fish in the water ...
   you only get bites from the actual fish in the water that we see ... bigger fish are visibly bigger, and further out, special fish might have a shark feature ... you can fish without
   limits as long as you can see the fish ... 2 friends can see the same fish, only one of us can catch it, and we can see the fish approaching someone's bait."

   Every bite comes from a shadow you can see. A fish swims about, notices a float near it (how near and how keenly depends on the bait and how shy the fish is), turns and swims to it, nibbles
   a few times and then really bites. Strike on the bite, then fight it in the reel: the kind of fish and its size decide how hard. Strike on a nibble, cast right on top of it or stomp along the bank above one near the surface (creep: hold Shift), and it bolts. A big hunter scares small fish off too. There is no daily count of casts: what limits you is what is
   swimming there, and a caught fish is replaced after a while (GF_SCHOOL.gap). The market's daily limits and GARDEN_CATCH_ECON.xpFish keep it from being a farm.

   ONE WATER, ONE TRUTH. On your own, this computer runs the fish. In a live garden THE HOST'S PAGE runs them and sends the whole list (gl:fs) when something changes and every 6 seconds, so a
   lost message costs nothing. Guests draw what they are told, carry each fish on towards where it is going between messages, and decide nothing:
     a guest's float reaches the host as the line's `fish cast` (cell and bait), the host's list says which fish is coming to which slot, and that fish belongs to that one line.
     fx fs hook  the guest struck: the host marks it hooked only if it was biting at that guest. Nobody else can have it: a fish goes to one line, and the host's list decides. If the host says it got away, the landing does not count
     fx fs land  it is landed: it leaves the water for everyone
     fx fs free  the guest let it go (a strike too soon, too slow, it slipped the hook): it bolts
   A host on an older version sends no list: the guest then runs a private water of its own, as on your own.

     _gfsFrame(dt)              once a frame: start the clock if need be, draw the shadows
     _gfsAct(e, u, slot)        the one who decides hears a strike, a landing or a letting go
     _gfsSay(e, u)              you did it: told to whoever decides
     _gfsIn(l)                  a guest hears the list
     _gfsMine()                 the fish at your line, if any
     gardenFishBite(plan, f)    it bit: the plan gets that very fish, and the bait is spent
   ============================================================ */
const GF_SCHOOL = Object.freeze({
  bands: Object.freeze([
    Object.freeze({ zone: 'shallow', x0: 12.6, x1: 39.4, y0: 21.35, y1: 22.9, n: 1 }),
    Object.freeze({ zone: 'mid', x0: 12.6, x1: 39.4, y0: 23.1, y1: 24.9, n: 1 }),
    Object.freeze({ zone: 'deep', x0: 12.6, x1: 39.4, y0: 25.2, y1: 35.5, n: 1 }),
  ]),
  pond: 1, max: 8, wire: 20,                    // fish in each still pool; the most in all the water of the map at once in ordinary play; contests and feeding frenzies may go up to the wire's limit. The owner, 1 Nov 2026: a fish should be a pleasant surprise, not everywhere all the time, and "there are still too many fish"
  close: 8, nearGap: Object.freeze([6, 14]), near: 14,   // someone within this many cells of a water: the next fish comes this soon (seconds). In the big lake a fish further than `near` from everyone leaves, and the next comes where people are
  tick: 0.25, beat: 6000, beatEmpty: 20000, msgGap: 400, oldHostMs: 12000, // the clock (seconds); a list at least this often (ms: a guest carries each fish on between lists), an empty one this often, never closer than this; how long a guest waits for a host's first list
  gap: Object.freeze([45, 100]), contestGap: 0.2, contestMore: 3, // seconds until the next fish in a band that is short of one; a contest fills up faster, with this many times the fish
  life: Object.freeze([90, 240]),              // seconds a fish stays before it swims off (so the hour and the season change what is about)
  reach: 2.2, lureReach: 0.5,                   // cells at which a fish notices a float; each point of a bait's lure adds this
  draw: 9, lineWait: 12,                        // a fish in the same water this near a float drifts over to look; a line nothing has come to for this many seconds brings one up nearby. Fewer fish must not mean a long wait
  keen: 0.6, rareKeen: 3,                       // chance a second that it comes, before shyness; a bait's `rare` multiplies it for all but commons
  shy: Object.freeze({ common: 1, uncommon: 0.8, rare: 0.5, epic: 0.32, legendary: 0.2 }),
  nibbles: Object.freeze([1, 3]), nibGap: Object.freeze([0.9, 2.1]), hookedMs: 90000, idle: 120, spook: 0.8,
  noise: 1.7, noiseKeen: 0.7,                   // how near (cells) stomping feet scare a fish near the surface, and how readily a second
  hunter: 2, feedTimes: 1.5,                    // a fish with a fin scares small ones within this; dawn and dusk they are this much keener
  frenzy: Object.freeze({ chance: 0.0006, secs: 150, more: 1, gap: 0.15 }),   // now and then a feeding frenzy: chance a second, how long, how many more in each water
  finds: 0.2,                                   // how much less often than GARDEN_FISH's odds a shadow turns out to be a find
  biteGrace: 1.8,                               // seconds a guest's bite is held beyond its strike window: the message has to get there and back
});
const GF_ST = Object.freeze({ swim: 0, come: 1, nibble: 2, bite: 3, hooked: 4, bolt: 5 });
const _gfs = { lineWait: new Map(), list: new Map(), u: 0, layer: null, clock: null, last: 0, key: '', sentAt: 0, dirty: false, hostAt: 0, hostSeen: false, liveAt: 0, band: new Map(), lines: new Map(), seen: new Map(), chum: new Map(), frenzyUntil: 0, stompSaid: false };

/* ---------- whose water is it ---------- */
function _gfsGuest() { return typeof _gll !== 'undefined' && _gll.role === 'visit' && typeof _glvLive === 'function' && _glvLive(); }
/** This computer decides, unless it is a guest whose host has spoken lately (an older host never does). */
function _gfsDecides() {
  if (typeof _gll === 'undefined' || _gll.role !== 'visit') return true;
  const t = Date.now();   // clock-ok: how long since this visit went live
  // live: the host's water, always. Only a host that has said nothing for 12 seconds (an older version) leaves you a water of your own. Never two waters flipping: that looked like fish vanishing.
  if (_gfsGuest()) { if (!_gfs.liveAt) _gfs.liveAt = t; return !_gfs.hostSeen && t - _gfs.liveAt > GF_SCHOOL.oldHostMs; }
  _gfs.liveAt = 0;
  if (_gfs.hostSeen && _glv.why === 'lost') return false;   // (reconnecting: their fish stay as they were)
  if (_gfs.hostSeen) { _gfs.hostSeen = false; _gfsClear(); }
  return true;
}
function _gfsClear() { for (const f of [..._gfs.list.values()]) { if (f.node) f.node.remove(); } _gfs.list.clear(); _gfs.band.clear(); }
function _gfsSlot() { return _gfsGuest() ? _glv.w : 0; }
/** How many a water holds: one, and one more for what you built for it. */
function _gfsWant(b, m) {
  if (b.room) return 2 + (gardenWorkOwned('pool-stock') ? 1 : 0);   // an indoor water is small, and it is what you came for
  const W = (id) => gardenWorkOwned(id) ? 1 : 0;
  let n = b.zone === 'pond' ? 1 + W('pool-stock')
    : b.zone === 'shallow' ? 1 + W('fish-feeder')
    : b.zone === 'mid' ? 1 + W('fish-feeder')
    : 1 + W('reed-beds');
  if (m.tod === 'night' && b.zone !== 'pond' && b.zone !== 'shallow') n += W('night-lantern');
  return n;
}
function _gfsPlaceKey() { return typeof _gll === 'undefined' ? 'own' : _gll.role === 'visit' ? 'v|' + (_glv.fid || '') : 'own'; }

/* ---------- the shadows ---------- */
function _gfsLen(cm) { return 10 + 5.2 * Math.sqrt(Math.max(1, Number(cm) || 1)); }   // stage units: a 5 cm minnow about 22 (half a cell), a 1 m carp 62, a 2.8 m sturgeon 97
/** Does it show a fin above the water? The rarest do, and the great long hunters. */
function gardenFishFin(def) { return !!def && def.cat === 'fish' && (def.rarity === 'epic' || def.rarity === 'legendary' || (['pike', 'sturgeon', 'cat', 'shark'].includes(def.look.s) && def.cm[1] >= 120)); }
function _gfsArt(def, cm, v) {
  const L = _gfsLen(cm), s = def.look.s, long = ['eel', 'pike', 'sturgeon', 'needle', 'paddle', 'shark', 'loach'].includes(s), deep = ['round', 'flat', 'fancy', 'disc', 'tall', 'puffer', 'hump', 'mola', 'chunky'].includes(s);
  const rx = L * (long ? 0.5 : 0.42), ry = L * (long ? 0.1 : deep ? 0.25 : 0.18), glow = def.look.p === 'glow' || def.look.p === 'ghost' || /^ghost-/.test(def.id);
  const W = v && typeof gardenVariantShadow === 'function' ? gardenVariantShadow(v, L, rx, ry) : null;   // a variant shows in its shadow, on every screen
  const fill = (W && W.fill) || (glow ? '#e4eeff' : '#07233a'), op = (W && W.op) || (glow ? 0.55 : 0.4);
  const tx = -rx * 0.9, ts = ry * 1.05, n = (v) => v.toFixed(1);
  const wrap = (x) => (W ? W.under + x + W.over : x);
  const planned = gardenFishShadow(def, L, fill, op);   // its family's outline (94-garden-fish-1art3.js); a fin above the water stays
  if (planned) { if (!gardenFishFin(def)) return wrap(planned); const hf = Math.max(9, L * 0.2), wf = hf * 0.8, rf = ry * 0.4; return wrap(planned + `<path d="M${n(-wf * 0.6)} ${n(-rf)}Q${n(-wf * 0.1)} ${n(-rf - hf)} ${n(wf * 0.75)} ${n(-rf - hf)}Q${n(wf * 0.25)} ${n(-rf - hf * 0.45)} ${n(wf * 0.6)} ${n(-rf)}Z" fill="${glow ? '#f4f8ff' : '#27455c'}" fill-opacity="0.92" stroke="#eaf4fa" stroke-opacity="0.5" stroke-width="0.8"/>`); }
  if (s === 'ray') return wrap(`<path d="M${n(L * 0.5)} 0Q${n(L * 0.1)} ${n(-L * 0.46)} ${n(-L * 0.12)} ${n(-L * 0.42)}Q${n(-L * 0.24)} ${n(-L * 0.1)} ${n(-L * 0.3)} 0Q${n(-L * 0.24)} ${n(L * 0.1)} ${n(-L * 0.12)} ${n(L * 0.42)}Q${n(L * 0.1)} ${n(L * 0.46)} ${n(L * 0.5)} 0Z" fill="${fill}" fill-opacity="${op}"/><path d="M${n(-L * 0.3)} 0H${n(-L * 0.72)}" stroke="${fill}" stroke-opacity="${op}" stroke-width="2" stroke-linecap="round"/>`);
  if (s === 'jelly' || s === 'crab' || s === 'turtle') return wrap(`<ellipse cx="0" cy="0" rx="${n(L * 0.3)}" ry="${n(L * 0.24)}" fill="${fill}" fill-opacity="${op}"/>`);
  let s2 = `<ellipse cx="0" cy="0" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" fill-opacity="${op}"/><path d="M${n(tx)} 0L${n(tx - L * 0.2)} ${n(-ts)}L${n(tx - L * 0.14)} 0L${n(tx - L * 0.2)} ${n(ts)}Z" fill="${fill}" fill-opacity="${op}"/>`;
  if (gardenFishFin(def)) { const h = Math.max(9, L * 0.2), w = h * 0.8; s2 += `<path d="M${n(-w * 0.6)} ${n(-ry * 0.4)}Q${n(-w * 0.1)} ${n(-ry * 0.4 - h)} ${n(w * 0.75)} ${n(-ry * 0.4 - h)}Q${n(w * 0.25)} ${n(-ry * 0.4 - h * 0.45)} ${n(w * 0.6)} ${n(-ry * 0.4)}Z" fill="${glow ? '#f4f8ff' : '#27455c'}" fill-opacity="0.92" stroke="#eaf4fa" stroke-opacity="0.5" stroke-width="0.8"/><path d="M${n(-w * 1.1)} ${n(-ry * 0.2)}h${n(w * 2.2)}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1" stroke-linecap="round"/>`; }
  return W ? W.under + s2 + W.over : s2;
}
function _gfsPierClip(svg, anchor) {
  const W = GARDEN_WORLD, decks = gardenPierDecks(), key = decks.map(p => [p.id, p.x, p.y, p.w, p.h].join(',')).join(';');
  let cp = svg.querySelector('#gd-school-clip'); if (cp && cp._gdPierKey === key) return;
  if (!cp) { cp = _gwEl('clipPath', { id: 'gd-school-clip' }); cp.appendChild(_gwEl('path', { 'clip-rule': 'evenodd' })); anchor.parentNode.insertBefore(cp, anchor); }
  let d = `M-200 -200H${W.cols * W.cellW + 200}V${W.sky + W.rows * W.cellH + 200}H-200Z`;
  for (const p of decks) { const x0 = p.x * W.cellW - 3, x1 = (p.x + p.w) * W.cellW + 3, y0 = W.sky + p.y * W.cellH, y1 = W.sky + (p.y + p.h) * W.cellH + 5; d += `M${x0} ${y0}H${x1}V${y1}H${x0}Z`; }
  cp.firstChild.setAttribute('d', d); cp._gdPierKey = key;
}
function _gfsLayer() {
  if (!_gw.svg) return null;
  const native = window.GardenNative && GardenNative.active();
  if (_gfs.layer && _gfs.layer.isConnected && _gfs.layer.ownerSVGElement === _gw.svg) { if (!native) _gfsPierClip(_gw.svg, _gfs.layer); return _gfs.layer; }
  const objs = _gw.svg.querySelector('.gd-objects'); if (!objs || !objs.parentNode) return null;
  const g = _gwEl('g', Object.assign({ class: 'gd-school', 'pointer-events': 'none', 'aria-hidden': 'true' }, native ? {} : { 'clip-path': 'url(#gd-school-clip)' }));
  if (native && g.target) g.target.setDepth(-9300);
  // The same displayed decks cut fish shadows; the sea remains continuous.
  if (!native) _gfsPierClip(_gw.svg, objs);
  objs.parentNode.insertBefore(g, objs);
  if (native && GardenNative.world()) GardenNative.world().depthChanged();
  _gfs.layer = g;
  for (const f of _gfs.list.values()) if (f.node && f.x < GARDEN_ROOM_X) { if (!f.node.isConnected) f.node = null; else g.appendChild(f.node); }
  return g;
}
function _gfsRing(x, y, k) {
  const a = _gwActors(); if (!a || !gardenMotionOn() || !_gwInView(x, y, 1)) return;
  const [px, py] = _gwPx(x, y), g = _gwEl('g', { transform: `translate(${px.toFixed(1)} ${py.toFixed(1)})` });
  g.innerHTML = `<ellipse class="gd-ring" cx="0" cy="0" rx="${(8 * k).toFixed(1)}" ry="${(2.6 * k).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-opacity="0.9"/>`;
  a.appendChild(g); setTimeout(() => g.remove(), 1500);
}
function _gfsAdd(r) {
  const def = gardenFishDef(r.id); if (!def) return null;
  const v = r.v && typeof gardenVariantFor === 'function' && gardenVariantFor('fish', def, r.v) ? String(r.v) : '';   // (only an id from the table: anything else is an ordinary fish)
  const f = { u: r.u, id: r.id, def, v, z: r.z || 0, cm: r.cm, x: r.x, y: r.y, tx: r.tx, ty: r.ty, st: r.st || 0, to: r.to == null ? null : r.to, n: r.n || 0, band: r.band || null, life: r.life || 0, cool: 0, sx: r.x, sy: r.y, face: 1, a: 0, node: null, dn: r.n || 0, dst: r.st || 0, seed: Math.random() * 9 };
  const layer = r.x >= GARDEN_ROOM_X ? null : _gfsLayer();   // (one in a room's water is drawn by the room)
  if (layer) { f.node = _gwEl('g', { class: 'gd-fs', opacity: '0' }); f.node.innerHTML = _gfsArt(def, r.cm, v) + (f.z && typeof gardenFishMark === 'function' ? gardenFishMark(f) : ''); layer.appendChild(f.node); }
  _gfs.list.set(f.u, f);
  return f;
}
/** It leaves the water: gone at once as far as anybody fishing is concerned, the shadow fades. */
function _gfsDrop(f) {
  _gfs.list.delete(f.u);
  const n = f.node; if (!n) return;
  if (gardenMotionOn() && gardenVisualIsNative(n)) { const a = gardenVisualAnimate(n, { opacity: [n.target.alpha, 0] }, { duration: 500, fill: 'forwards' }); a.finished.then(() => n.remove(), () => n.remove()); }
  else if (gardenMotionOn()) { n.setAttribute('style', 'transition:opacity .5s'); n.setAttribute('opacity', '0'); setTimeout(() => n.remove(), 520); } else n.remove();
}
function _gfsReset() { for (const f of [..._gfs.list.values()]) { if (f.node) f.node.remove(); } _gfs.list.clear(); _gfs.band.clear(); _gfs.lineWait.clear(); _gfs.lines.clear(); _gfs.seen.clear(); _gfs.chum.clear(); _gfs.hostAt = 0; _gfs.hostSeen = false; _gfs.liveAt = 0; _gfs.m = null; _gfs.dirty = true; _gfs.forceTell = true; _gfs.wireSig = ''; _gfs.sentAt = 0; }
/** Presentation follows the existing shared segment. Predict only to its end:
 * the four-Hz host clock must not make every fish brake between its ticks. */
function _gfsVisualStep(f, state, dt, time, motion) {
  dt = Math.max(0, Math.min(.08, dt || 0));
  if (!state.motionPlan) state.motionPlan = gardenFishShadowMotion(f.def, _gfsLen(f.cm));
  const plan = state.motionPlan;
  const dx = f.tx - f.x, dy = f.ty - f.y, distance = Math.hypot(dx, dy), speed = _gfsSpeed(f), direction = Math.atan2(dy * .625, dx);
  if (state.heading == null) { state.heading = distance > .025 ? direction : f.face < 0 ? Math.PI : 0; state.sx = f.x; state.sy = f.y; state.phase = f.seed || 0; state.effort = 1; }
  if (_gfs.ambientPaused) return state;
  if (state.sampleX !== f.x || state.sampleY !== f.y || state.sampleTX !== f.tx || state.sampleTY !== f.ty || state.sampleState !== f.st) {
    state.sampleX = f.x; state.sampleY = f.y; state.sampleTX = f.tx; state.sampleTY = f.ty; state.sampleState = f.st; state.sampleAge = 0;
  } else state.sampleAge = Math.min(.32, (state.sampleAge || 0) + dt);
  const ahead = distance > .001 ? Math.min(distance, speed * state.sampleAge) / distance : 0, x = f.x + dx * ahead, y = f.y + dy * ahead;
  const catchup = 1 - Math.exp(-dt * (f.st === GF_ST.come || f.st === GF_ST.bolt ? 15 : 11));
  if (Math.hypot(x - state.sx, y - state.sy) > 3) { state.sx = x; state.sy = y; } else { state.sx += (x - state.sx) * catchup; state.sy += (y - state.sy) * catchup; }
  let turn = 0;
  if (speed > 0 && distance > .025) {
    turn = Math.atan2(Math.sin(direction - state.heading), Math.cos(direction - state.heading));
    const rate = (f.st === GF_ST.bolt ? 5.8 : f.st === GF_ST.come ? 4.3 : 2.8) * plan.turn, amount = Math.max(-rate * dt, Math.min(rate * dt, turn * (1 - Math.exp(-dt * 7))));
    state.heading += amount; state.heading = Math.atan2(Math.sin(state.heading), Math.cos(state.heading));
  }
  const effort = f.st === GF_ST.hooked ? 2.1 : f.st === GF_ST.bolt ? 2 : f.st === GF_ST.come ? 1.25 : speed ? .85 : .3;
  state.effort += (effort - state.effort) * (1 - Math.exp(-dt * 5));
  if (motion) state.phase += dt * (4.6 + Math.min(2.2, 60 / Math.max(12, f.cm))) * state.effort * plan.stroke;
  state.turn = turn; state.wobble = motion ? Math.sin(state.phase) * (f.st === GF_ST.hooked ? 4.5 : 1.25) * gardenFishWobble(f.def) : 0;
  state.angle = state.heading + state.wobble * Math.PI / 180;
  state.side = motion && f.st === GF_ST.swim ? Math.sin(state.phase * .47 + f.seed) * Math.min(1.5, _gfsLen(f.cm) * .025) + Math.sin(turn) * 2 : 0;
  state.size = 1 - (f.x < GARDEN_ROOM_X ? Math.max(0, Math.min(.055, (f.y - 23) * .004)) : 0);
  _gfsVisualInteraction(f, state, dt, motion, distance);
  f.face = Math.cos(state.heading) < 0 ? -1 : 1;
  return state;
}
function _gfsVisualInteraction(f, state, dt, motion, distance) {
  const plan = state.motionPlan, before = f._fishSeenState, oldN = f._fishSeenN || 0;
  let kind = '';
  if (f.st === GF_ST.nibble && f.n > 0 && (before !== GF_ST.nibble || f.n !== oldN)) kind = 'nibble';
  else if (f.st === GF_ST.bite && before !== GF_ST.bite) kind = 'bite';
  else if (f.st === GF_ST.hooked && before !== GF_ST.hooked) kind = 'hook';
  else if (f.st === GF_ST.bolt && before != null && before !== GF_ST.bolt) kind = 'bolt';
  f._fishSeenState = f.st; f._fishSeenN = f.n;
  if (kind) { f._fishHit = { id: (f._fishHitSerial || 0) + 1, kind }; f._fishHitSerial = f._fishHit.id; f._fishHitAge = 0; } else if (f._fishHit) f._fishHitAge = Math.min(10, (f._fishHitAge || 0) + dt);
  if (state.interactionState !== f.st) { state.interactionState = f.st; state.stateAge = 0; state.contactHeading = state.heading; } else state.stateAge = (state.stateAge || 0) + dt;
  const assigned = f.to != null && f.st >= GF_ST.come && f.st <= GF_ST.hooked, near = assigned ? f.st === GF_ST.come ? Math.max(0, Math.min(1, (plan.length * 2.6 - distance * GARDEN_WORLD.cellW) / (plan.length * 2))) : 1 : 0;
  state.anchorBlend = (state.anchorBlend || 0) + (near - (state.anchorBlend || 0)) * (1 - Math.exp(-dt * 9));
  const hit = f._fishHit, age = f._fishHitAge || 0, hitting = hit && (hit.kind === 'nibble' && f.st === GF_ST.nibble || hit.kind === 'bite' && f.st === GF_ST.bite || hit.kind === 'hook' && f.st === GF_ST.hooked), pulse = motion && hitting && age < .25 ? Math.sin(age / .25 * Math.PI) ** 2 : 0, recoil = motion && hitting && age > .19 && age < .66 ? Math.sin((age - .19) / .47 * Math.PI) ** 2 : 0;
  let gap = 0, dip = 0, tug = 0, tilt = 0;
  if (assigned && (f.st === GF_ST.come || f.st === GF_ST.nibble)) {
    gap = plan.inspectGap * (f.st === GF_ST.come ? .7 : 1) * (motion ? 1 + Math.sin(state.stateAge * 1.6 + f.seed) * .13 : 1);
    if (motion) { state.angle += Math.sin(state.stateAge * 1.7 + f.seed) * .065 * state.anchorBlend; gap = gap * (1 - pulse) + recoil * plan.recoil; }
    if (f.st === GF_ST.nibble) { dip = pulse * 1.8; tug = pulse * plan.strike * 1.6; tilt = pulse * 8 - recoil * 3; }
  } else if (assigned && f.st === GF_ST.bite) {
    gap = motion ? plan.inspectGap * Math.exp(-state.stateAge * 20) : 0;
    const sink = Math.min(1, state.stateAge / .14); dip = 3.5 * sink + (motion ? Math.sin(state.stateAge * 17) * .55 : 0); tug = motion ? 1.5 * pulse + Math.sin(state.stateAge * 12) * .65 : 0; tilt = motion ? 12 * pulse + Math.sin(state.stateAge * 16) * 4 : 0;
    if (motion) state.angle = state.contactHeading + Math.sin(state.stateAge * 13) * .045;
  } else if (assigned && f.st === GF_ST.hooked) {
    if (motion) state.angle = state.contactHeading + Math.sin(state.stateAge * 2.7) * .24 + Math.sin(state.stateAge * 6.8) * .06;
    dip = 1.1 + (motion ? Math.sin(state.stateAge * 7) * .55 : 0); tug = motion ? Math.sin(state.stateAge * 3.8) * 2 : 0; tilt = motion ? Math.sin(state.stateAge * 3.8) * 10 : 0;
  }
  state.bodyScaleX = 1 + pulse * .025 - recoil * .012; state.bodyScaleY = 1 - pulse * .018 + recoil * .008; state.mouthOpen = pulse * (f.st === GF_ST.bite ? 1 : .7); state.effort = Math.max(state.effort, pulse * 1.8);
  const angle = state.angle, c = Math.cos(angle), s = Math.sin(angle), mx = plan.mouthX * state.size * state.bodyScaleX, my = plan.mouthY * state.size * state.bodyScaleY, alongX = Math.cos(state.heading), alongY = Math.sin(state.heading);
  state.offsetX = (-(c * mx - s * my) + alongX * (tug - gap)) * state.anchorBlend;
  state.offsetY = (-(s * mx + c * my) + alongY * (tug - gap) + dip) * state.anchorBlend;
  const contact = state.contact || (state.contact = {}); contact.active = assigned; contact.kind = hit && hit.kind || ''; contact.hit = hit && hit.id || 0; contact.age = age; contact.pulse = pulse; contact.tugX = assigned ? alongX * tug : 0; contact.tugY = assigned ? alongY * tug : 0; contact.dip = assigned ? dip : 0; contact.tilt = assigned ? tilt * (alongX < 0 ? -1 : 1) : 0; contact.state = f.st; contact.n = f.n;
}
function _gfsVisualProject(f, state, px, py) {
  const angle = state.angle == null ? state.heading || 0 : state.angle, c = Math.cos(angle), s = Math.sin(angle), side = state.side || 0, plan = state.motionPlan, size = state.size || 1;
  state.drawX = px - s * side + (state.offsetX || 0); state.drawY = py + c * side + (state.offsetY || 0);
  if (state.contact && plan) {
    const contact = state.contact, mx = plan.mouthX * size * (state.bodyScaleX || 1), my = plan.mouthY * size * (state.bodyScaleY || 1), p = _gwPx(f.tx, f.ty);
    contact.mouthX = state.drawX + c * mx - s * my; contact.mouthY = state.drawY + s * mx + c * my; contact.floatX = p[0] + contact.tugX; contact.floatY = p[1] + contact.tugY + contact.dip;
  }
  f.visualState = state; return state;
}
function _gfsFloatContact(f) { const state = f && f.visualState, contact = state && state.contact; return contact && contact.active && contact.state === f.st && contact.n === f.n ? contact : null; }
function _gfsFishForSlot(slot) { for (const fish of _gfs.list.values()) if (fish.to === slot) return fish; return null; }
/** One water response per actual counter/state hit, shared by fish and rigs. */
function _gfsVisualReaction(f, state, motion) {
  const contact = state.contact; if (!contact || !contact.hit || contact.hit === f._fishEmittedHit || contact.age < .085 || contact.age > .4) return;
  f._fishEmittedHit = contact.hit;
  if (!motion || _gfs.ambientPaused || f.x < GARDEN_ROOM_X && _grm.on) return;
  const water = window.GardenNative && GardenNative.active() && GardenNative.water(), scale = f.x >= GARDEN_ROOM_X ? GRW.k : 1;
  if (water) { const bolt = contact.kind === 'bolt'; water.effect(contact.kind === 'bite' ? 'bite' : contact.kind === 'hook' ? 'splash' : 'ripple', (bolt ? contact.mouthX : contact.floatX) * scale, (bolt ? contact.mouthY : contact.floatY - contact.dip) * scale, { scale: contact.kind === 'nibble' ? .55 : contact.kind === 'bolt' ? .7 : 1.05 }); }
  else _gfsRing(contact.kind === 'bolt' ? state.sx : f.tx, contact.kind === 'bolt' ? state.sy : f.ty, contact.kind === 'nibble' ? .6 : 1.1);
}
/** Each joint is found once. Native numeric transforms replace its CSS track,
 * keeping tail cadence tied to swimming effort and avoiding two pose writers. */
function _gfsVisualParts(f, node, state, motion) {
  if (!node || _gfs.ambientPaused) return;
  if (state.partsNode !== node) {
    state.partsNode = node; state.parts = []; state.partsMotion = null; let segment = 0;
    for (const part of node.querySelectorAll('.gcs-tail,.gcs-seg,.gcs-flap,.gcs-pulse,.gcs-fin,.gcs-claw,.gcs-bob,.gcs-mouth')) {
      const kind = ['tail', 'seg', 'flap', 'pulse', 'fin', 'claw', 'bob', 'mouth'].find(name => part.classList.contains('gcs-' + name)), base = part.getAttribute('transform') || '';
      if (part._native) { part._nativeFishMotion = true; part._nativeAnimating = true; } else part.style.animation = 'none';
      let pivotX = 0, pivotY = 0; if (kind === 'pulse') { const b = part.getBBox(); pivotX = b.x + b.width / 2; pivotY = b.y + b.height / 2; }
      const direct = part._native && !base, matrix = direct ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : null; if (direct) { part._matrix = matrix; part._inner.setRotation(0); }
      state.parts.push({ node: part, kind, base, phase: kind === 'seg' ? segment++ * .85 : 0, pivotX, pivotY, direct, matrix, transform: '' });
    }
  }
  if (state.partsMotion === false && !motion) return;
  state.partsMotion = motion;
  for (const part of state.parts) {
    const phase = state.phase - part.phase, wave = motion ? Math.sin(phase) : 0, effort = Math.min(1.65, state.effort), slow = motion ? Math.sin(phase * .47) : 0; let x = 0, y = 0, rotation = 0, sx = 1, sy = 1;
    if (part.kind === 'tail') rotation = -wave * (7 + effort * 5) * Math.PI / 180;
    else if (part.kind === 'seg') rotation = (wave * (3 + effort * 2) + (motion ? Math.sin(state.turn) * 2 : 0)) * Math.PI / 180;
    else if (part.kind === 'flap') sy = 1 - (motion ? .1 + slow * .1 : 0);
    else if (part.kind === 'fin') sy = 1 - (motion ? .045 + wave * .045 : 0);
    else if (part.kind === 'pulse') { const pulse = motion ? Math.sin(phase * .52) * .025 : 0; sx = 1 + pulse; sy = 1 - pulse * .7; x = part.pivotX * (1 - sx); y = part.pivotY * (1 - sy); }
    else if (part.kind === 'claw') x = wave * .6;
    else if (part.kind === 'bob') y = slow * .7;
    else if (part.kind === 'mouth') { sx = 1 + (state.mouthOpen || 0) * .22; sy = 1 + (state.mouthOpen || 0) * 3.8; }
    if (part.direct) {
      part.node.target.setPosition(x, y).setRotation(rotation).setScale(sx, sy);
      const m = part.matrix, c = Math.cos(rotation), s = Math.sin(rotation); m.a = c * sx; m.b = s * sx; m.c = -s * sy; m.d = c * sy; m.e = x; m.f = y; part.node._matrix = m;
      continue;
    }
    const transform = part.base + (part.base ? ' ' : '') + `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(rotation * 180 / Math.PI).toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`;
    if (part.transform !== transform) { part.transform = transform; part.node.setAttribute('transform', transform); }
  }
}
function _gfsVisualTransform(state, px, py, scale) {
  const angle = state.angle == null ? state.heading || 0 : state.angle, size = (scale || 1) * (state.size || 1);
  return `translate(${(state.drawX == null ? px : state.drawX).toFixed(2)} ${(state.drawY == null ? py : state.drawY).toFixed(2)}) rotate(${(angle * 180 / Math.PI).toFixed(2)}) scale(${(size * (state.bodyScaleX || 1)).toFixed(3)} ${(size * (state.bodyScaleY || 1)).toFixed(3)})`;
}
/** Once a frame: the shadows go where they are. Nothing is written for one out of view. */
function _gfsFrame(dt) {
  if (!_gfs.clock && _gw.on) { _gfs.last = 0; _gfsClockStart(); _gfsClock(); }
  const key = _gfsPlaceKey(); if (key !== _gfs.key) { _gfs.key = key; _gfsReset(); }
  const layer = _gfsLayer(); if (!layer) return;
  const t = _gw.t || 0, moving = gardenMotionOn();
  for (const f of _gfs.list.values()) {
    if (f.x >= GARDEN_ROOM_X) continue;   // (a room's water: _grwFishFrame)
    if (!f.node) { f.node = _gwEl('g', { class: 'gd-fs', opacity: '0' }); f.node.innerHTML = _gfsArt(f.def, f.cm, f.v) + (f.z && typeof gardenFishMark === 'function' ? gardenFishMark(f) : ''); layer.appendChild(f.node); }   // (it was made before the stage was there)
    _gfsVisualStep(f, f, dt, t, moving);
    if (f.a < 1) { f.a = Math.min(1, f.a + dt * 0.8); if (f.node) f.node.setAttribute('opacity', f.a.toFixed(2)); }
    if (f.st === GF_ST.swim && f.a >= 1 && (['epic', 'legendary'].includes(f.def.rarity) || (f.v && gardenVariantRank(f.v) >= 3))) { f.bub = (f.bub == null ? 2 + f.seed : f.bub) - dt; if (f.bub <= 0) { f.bub = 3 + Math.random() * 4; _gfsRing(f.sx, f.sy, 0.5); } }   // (rings on the surface give a great fish away)
    f.dn = f.n;
    f.dst = f.st;
    const seen = !!f.node && _gwInView(f.sx, f.sy, 1); if (f.node && f.seen !== seen) { f.seen = seen; f.node.classList.toggle('is-seen', seen); }   // (its family's moves run only while you can see it: 94-garden-fish3-creatures.css)
    if (f.node) gardenCull(f, f.node, f.sx, f.sy);
    if (!seen) continue;
    const [px, py] = _gwPx(f.sx, f.sy);
    _gfsVisualProject(f, f, px, py);
    const transform = _gfsVisualTransform(f, px, py); if (f.drawTransform !== transform) { f.drawTransform = transform; f.node.setAttribute('transform', transform); }
    _gfsVisualParts(f, f.node, f, moving);
    _gfsVisualReaction(f, f, moving);
    if (f.v && moving) { const tw = f.vt === undefined ? (f.vt = f.node.querySelector('.gd-fsv')) : f.vt; if (tw) tw.setAttribute('opacity', (0.5 + 0.5 * Math.sin(t * 2.6 + f.seed)).toFixed(2)); }   // (a sparkle twinkles only while you can see it)
  }
}

/* ---------- moving: the same on every screen ---------- */
function _gfsSpeed(f) {
  const base = 0.55 - Math.min(0.25, f.cm / 800);
  return f.st === GF_ST.swim ? base : f.st === GF_ST.come ? base * 1.6 : f.st === GF_ST.bolt ? base * 5 : 0;
}
function _gfsMove(f, dt) {
  const sp = _gfsSpeed(f); if (!sp) return true;
  const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
  if (d > .025) { f.swimDX = dx / d; f.swimDY = dy / d; }
  if (d <= sp * dt || d < 0.02) { f.x = f.tx; f.y = f.ty; return true; }
  f.x += dx / d * sp * dt; f.y += dy / d * sp * dt;
  return false;
}
/** The clock: a small worker where one can run, because a browser slows a hidden tab's own timers to a crawl and everyone in the garden would see the host's fish stop. */
function _gfsClockStart() {
  const ms = GF_SCHOOL.tick * 1000, plain = () => { _gfs.clock = { stop() { clearInterval(this.t); }, t: setInterval(_gfsClock, ms) }; };
  try {
    const w = new Worker('/garden-clock.js');   // (from this server, as the page's security policy asks: it only ticks)
    w.onmessage = _gfsClock;
    w.onerror = () => { if (_gfs.clock && _gfs.clock.w === w) { w.terminate(); plain(); } };
    _gfs.clock = { w, stop() { w.terminate(); } };
  } catch (e) { plain(); }
}
function _gfsClock() {
  if (!_gw.on || !_gw.svg || !_gw.svg.isConnected) { if (_gfs.clock) { _gfs.clock.stop(); _gfs.clock = null; } return; }
  const now = performance.now(), dt = _gfs.last ? Math.min(1.5, (now - _gfs.last) / 1000) : GF_SCHOOL.tick;
  _gfs.last = now;
  if (_gfsDecides()) { _gfsRun(dt); _gfsTell(); }
  else for (const f of _gfs.list.values()) _gfsMove(f, dt);   // (carried on towards where it is going until the next list)
  if (typeof _glyTick === 'function') _glyTick();
  if (typeof gardenCatchTick === 'function') gardenCatchTick();   // events coming and going, wanted fish, the thing in the lake: a look every few seconds
}

/* ---------- the water, for the one who decides ---------- */
function _gfsWaterAt(x, y) {
  const water = typeof gardenWaterContainsPoint === 'function' ? gardenWaterContainsPoint(x, y) : gardenIsWater(Math.floor(x), Math.floor(y));
  return water && !(GARDEN_WORLD.v >= 4 && x < GARDEN_ROOM_X && gardenZoneLockOf(x, y, _gfs.m ? _gfs.m.areas : _GD_LAND));
}
function _gfsWaterClear(fish, x, y) {
  if (!_gfsWaterAt(x, y)) return false;
  if (!fish || !fish.def || x >= GARDEN_ROOM_X) return true;
  const r = Math.max(.27, Math.min(.7, _gfsLen(fish.cm) * .35 / GARDEN_WORLD.cellW)), ry = r * GARDEN_WORLD.cellW / GARDEN_WORLD.cellH;
  return _gfsWaterAt(x - r, y) && _gfsWaterAt(x + r, y) && _gfsWaterAt(x, y - ry) && _gfsWaterAt(x, y + ry);
}
function _gfsWaterSegment(a, b, fish) { if (GARDEN_WORLD.v >= 4 && a.x < GARDEN_ROOM_X && b.x < GARDEN_ROOM_X) { const first = _gfsIslandComponentAt(a.x, a.y), last = _gfsIslandComponentAt(b.x, b.y); if (!first || !last || first.id !== last.id || !_gfsIslandShapeSegment(first.shape, a, b) || !_gfsWaterClear(fish, a.x, a.y) || !_gfsWaterClear(fish, b.x, b.y)) return false; } const steps = Math.max(2, Math.min(24, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 3))); for (let i = 1; i < steps; i++) { const k = i / steps; if (!_gfsWaterClear(fish, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)) return false; } return true; }
/** The logical contact point becomes the mouth anchor as a fish reaches a float.
 * Validate its body behind that mouth, using the same pure art geometry as contact drawing. */
function _gfsLineBodyPoint(fish, line) {
  const W = GARDEN_WORLD, dx = (line.x - fish.x) * W.cellW, dy = (line.y - fish.y) * W.cellH, distance = Math.hypot(dx, dy) || 1, c = dx / distance, s = dy / distance, plan = gardenFishShadowMotion(fish.def, _gfsLen(fish.cm)), scale = 1 - Math.max(0, Math.min(.055, (line.y - 23) * .004));
  return { x: line.x - (c * plan.mouthX - s * plan.mouthY) * scale / W.cellW, y: line.y - (s * plan.mouthX + c * plan.mouthY) * scale / W.cellH };
}
function _gfsLineApproachClear(fish, line) {
  if (!fish || !fish.def || !_gfsWaterAt(line.x, line.y)) return false;
  if (fish.x >= GARDEN_ROOM_X || line.x >= GARDEN_ROOM_X) return _gfsWaterSegment(fish, line, fish);
  const body = _gfsLineBodyPoint(fish, line);
  return _gfsWaterClear(fish, body.x, body.y) && _gfsWaterSegment(fish, body, fish) && _gfsWaterSegment(body, line, null);
}
function _gfsLineStandOff(fish, line, band) {
  if (line.x >= GARDEN_ROOM_X) { const point = { x: Math.max(band.x0, Math.min(band.x1, line.x + (fish.x < line.x ? -1.1 : 1.1))), y: Math.max(band.y0, Math.min(band.y1, line.y)) }; return _gfsWaterClear(fish, point.x, point.y) && _gfsWaterSegment(fish, point, fish) && _gfsWaterSegment(point, line, fish) ? point : null; }
  const dx = fish.x - line.x, dy = fish.y - line.y, length = Math.hypot(dx, dy) || 1;
  for (const distance of [1.25, 1.8, 2.1]) { const point = { x: line.x + dx / length * distance, y: line.y + dy / length * distance }; if (_gfsBandContains(band, point.x, point.y) && _gfsWaterClear(fish, point.x, point.y) && _gfsWaterSegment(fish, point, fish) && _gfsLineApproachClear(Object.assign({}, fish, point), line)) return point; }
  return null;
}
/** A reshaped shore can strand an old idle fish. Only the deciding host
 * moves it to the nearest valid cell in its existing water/depth band. */
function _gfsRehome(f, band) {
  if (!band) return false; let best = null, distance = Infinity;
  for (let y = Math.floor(band.y0); y < Math.ceil(band.y1); y++) for (let x = Math.floor(band.x0); x < Math.ceil(band.x1); x++) {
    const px = Math.max(band.x0 + .05, Math.min(band.x1 - .05, x + .5)), py = Math.max(band.y0 + .05, Math.min(band.y1 - .05, y + .5)), d = (px - f.x) ** 2 + ((py - f.y) * .625) ** 2;
    if (d >= distance || !_gfsWaterClear(f, px, py) || !_gfsBandContains(band, px, py)) continue; best = { x: px, y: py }; distance = d;
  }
  if (!best) return false;
  f.x = f.sx = f.tx = best.x; f.y = f.sy = f.ty = best.y; f.heading = null; f.anchorBlend = 0; f.drawTransform = ''; _gfs.dirty = true; return true;
}
/** Static water components and local stocks are derived once from the shared coast/pond contours. */
const _gfsIslandHabitat = { revision: '', bands: [], byKey: new Map(), cells: null, components: [], spatial: new Map(), elapsed: 0 };
function _gfsIslandShapeContains(shape, x, y) { return shape.ocean ? gardenIslandOceanContains(x, y) : shape.pool.boundary ? _gardenIslandInLoop(x, y, shape.pool.boundary) : _gardenIslandRect(x, y, shape.pool.wet); }
function _gfsIslandShapeSegment(shape, a, b) {
  if (!_gfsIslandShapeContains(shape, a.x, a.y) || !_gfsIslandShapeContains(shape, b.x, b.y)) return false;
  const wet = shape.pool && shape.pool.wet, loops = shape.ocean ? gardenIslandGeometry().land : [shape.pool.boundary || [[wet.x, wet.y], [wet.x + wet.w, wet.y], [wet.x + wet.w, wet.y + wet.h], [wet.x, wet.y + wet.h]]].concat(shape.pool.holes || []), rx = b.x - a.x, ry = b.y - a.y;
  for (const loop of loops) for (let i = 0; i < loop.length; i++) {
    const c = loop[i], d = loop[(i + 1) % loop.length], sx = d[0] - c[0], sy = d[1] - c[1], qx = c[0] - a.x, qy = c[1] - a.y, cross = rx * sy - ry * sx;
    if (Math.abs(cross) < 1e-9) continue;
    const t = (qx * sy - qy * sx) / cross, u = (qx * ry - qy * rx) / cross;
    if (t > 1e-7 && t < 1 - 1e-7 && u >= -1e-7 && u <= 1 + 1e-7) return false;
  }
  return true;
}
function _gfsIslandGeometry() {
  const H = _gfsIslandHabitat, revision = gardenIslandGeometry().revision; if (H.revision === revision) return H;
  const W = GARDEN_WORLD, size = W.cols * W.rows, shapes = [{ id: 'sea', ocean: true }].concat(gardenIslandData().freshwater.map(pool => ({ id: pool.id, pool }))), source = new Int16Array(size).fill(-1), cells = new Int32Array(size).fill(-1), coasts = new Array(size), components = [], groups = new Map();
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { const base = gardenIslandBaseCell(x, y), at = y * W.cols + x; if (base.ocean) { source[at] = 0; coasts[at] = gardenIslandFishingReach(x + .5, y + .5); } else if (base.freshwater) { const index = shapes.findIndex(shape => !shape.ocean && _gfsIslandShapeContains(shape, x + .5, y + .5)); if (index >= 0) source[at] = index; } }
  for (let start = 0; start < size; start++) {
    if (source[start] < 0 || cells[start] >= 0) continue;
    const shape = shapes[source[start]], component = { id: shape.id + ':' + start, index: components.length, shape }, queue = [start]; cells[start] = component.index; components.push(component);
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head], x = at % W.cols, y = Math.floor(at / W.cols), px = x + .5, py = y + .5;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const nx = x + dx, ny = y + dy, next = ny * W.cols + nx; if (nx < 0 || ny < 0 || nx >= W.cols || ny >= W.rows || cells[next] >= 0 || source[next] !== source[start]) continue; const clearInterior = shape.ocean && coasts[at].distance > W.cellW && coasts[next].distance > W.cellW; if (!clearInterior && !_gfsIslandShapeSegment(shape, { x: px, y: py }, { x: nx + .5, y: ny + .5 })) continue; cells[next] = component.index; queue.push(next); }
      const reach = shape.ocean ? coasts[at] : null, zone = shape.ocean ? reach.distance <= 60 ? 'shallow' : reach.distance <= 120 ? 'mid' : 'deep' : 'pond', span = shape.ocean ? 12 : 6, gx = Math.floor(x / span), gy = Math.floor(y / span), key = 'i4:' + component.id + ':' + gx + ',' + gy + ':' + zone;
      let band = groups.get(key);
      if (!band) { band = { key, zone, bodyId: component.id, component, islandOcean: !!shape.ocean, islandWater: shape.pool || null, sampleCells: [], nearCache: new Map(), coastCounts: new Map(), x0: gx * span, x1: Math.min(W.cols, (gx + 1) * span), y0: gy * span, y1: Math.min(W.rows, (gy + 1) * span), n: 1 }; groups.set(key, band); }
      band.sampleCells.push([px, py]); if (reach) band.coastCounts.set(reach.id, (band.coastCounts.get(reach.id) || 0) + 1);
    }
  }
  const bands = [...groups.values()], spatial = new Map();
  for (const band of bands) {
    if (band.islandOcean) band.coastHabitat = [...band.coastCounts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))[0]?.[0] || 'south';
    else {
      const centre = band.sampleCells.reduce((sum, point) => ({ x: sum.x + point[0] / band.sampleCells.length, y: sum.y + point[1] / band.sampleCells.length }), { x: 0, y: 0 });
      band.islandHomeWaters = gardenIslandBasinPatchHomes(band.islandWater, centre); band.regionZone = gardenZoneOf(centre.x, centre.y);
      for (const water of GARDEN_REGION_WATERS) if (water.sec) { const section = gardenLandRow(water.sec); if (section && section.cells.some(([x, y]) => x + .5 >= band.x0 && x + .5 < band.x1 && y + .5 >= band.y0 && y + .5 < band.y1 && _gfsIslandShapeContains(band.component.shape, x + .5, y + .5))) band.islandHomeWaters.push(water.id); }
    }
    const occupied = new Set(band.sampleCells.map(point => Math.floor(point[0] / 12) + ',' + Math.floor(point[1] / 12)));
    for (const key of occupied) { if (!spatial.has(key)) spatial.set(key, []); spatial.get(key).push(band.key); }
    delete band.coastCounts;
  }
  H.bands = bands; H.byKey = new Map(bands.map(band => [band.key, band])); H.cells = cells; H.components = components; H.spatial = spatial; H.revision = revision; H.elapsed = 0; return H;
}
function _gfsIslandComponentAt(x, y) {
  const H = _gfsIslandGeometry(), W = GARDEN_WORLD, cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) return null;
  const candidates = [];
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W.cols || ny >= W.rows) continue; const index = H.cells[ny * W.cols + nx], component = H.components[index]; if (!component) continue; candidates.push({ component, x: nx + .5, y: ny + .5 }); }
  for (const candidate of candidates) if (_gfsIslandShapeSegment(candidate.component.shape, { x, y }, candidate)) return candidate.component;
  return null;
}
function _gfsIslandBands(m) {
  return _gfsIslandGeometry().bands.filter(band => band.islandOcean || !band.regionZone || m.areas.includes('zn-' + band.regionZone)).map(band => Object.assign({}, band, { islandAreas: m.areas })).concat(gardenRoomBands());
}
function _gfsBandContains(band, x, y) {
  if (band.sampleCells) { const component = _gfsIslandComponentAt(x, y); return !!component && component.id === band.bodyId && x >= band.x0 && x < band.x1 && y >= band.y0 && y < band.y1 && (!band.islandOcean || gardenIslandWaterZone(x, y) === band.zone); }
  return x >= band.x0 - 1 && x <= band.x1 + 1 && y >= band.y0 - .3 && y <= band.y1 + .3;
}
/** Weighted reservoir sampling and small jitter avoid repeated cell centres and nearest-point clumps. */
function _gfsIslandSpot(band, origin, decks) {
  const samples = band.sampleCells; if (!samples || !samples.length) return null;
  let selected = null, total = 0;
  for (const point of samples) {
    const dx = origin ? point[0] - origin.x : 0, dy = origin ? (point[1] - origin.y) * .625 : 0, distance2 = dx * dx + dy * dy;
    if (origin && (origin.def ? distance2 > 25 : distance2 > GF_SCHOOL.near ** 2) || origin?.stockLine && (distance2 < 1.05 ** 2 || Math.hypot(dx, origin.y - point[1]) > (origin.stockReach || GF_SCHOOL.reach) - .1)) continue;
    if (!_gfsWaterClear(origin, point[0], point[1]) || _gfsPierBlocks(decks, point[0], point[1], origin) || !_gfsSpaced(band, point[0], point[1], origin)) continue;
    if (origin && (origin.def || origin.stockLine) && !_gfsWaterSegment(origin, { x: point[0], y: point[1] }, origin.def ? origin : null)) continue;
    const weight = origin ? 1 / (1 + distance2 / (origin.stockLine ? 5 : 20)) : 1; total += weight;
    if (Math.random() * total < weight) selected = { x: point[0], y: point[1] };
  }
  if (!selected) return null;
  for (let attempt = 0; attempt < 4; attempt++) { const point = { x: selected.x + (Math.random() - .5) * .7, y: selected.y + (Math.random() - .5) * .7 }; if (_gfsBandContains(band, point.x, point.y) && _gfsWaterClear(origin, point.x, point.y) && _gfsSpaced(band, point.x, point.y, origin) && !_gfsPierBlocks(decks, point.x, point.y, origin) && (!origin || !(origin.def || origin.stockLine) || _gfsWaterSegment(origin, point, origin.def ? origin : null))) return point; }
  return selected;
}
function _gfsIslandNearby(person, byKey) {
  const H = _gfsIslandGeometry(), found = new Set(), rows = [], radius = Math.ceil(GF_SCHOOL.near / 12), cx = Math.floor(person.x / 12), cy = Math.floor(person.y / 12);
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) for (const key of H.spatial.get((cx + dx) + ',' + (cy + dy)) || []) found.add(key);
  for (const key of found) { const band = byKey.get(key); if (!band) continue; const distance = Math.hypot(Math.max(band.x0 - person.x, person.x - band.x1, 0), Math.max(band.y0 - person.y, person.y - band.y1, 0)); if (distance > GF_SCHOOL.near) continue; const nearest = _gfsBandNear(band, [person]); if (nearest.far <= GF_SCHOOL.near) rows.push({ band, distance: nearest.far }); }
  rows.sort((a, b) => a.distance - b.distance || a.band.key.localeCompare(b.band.key)); return rows;
}
/** First coverage goes to each person/line before any local extras. All stocks share the old cap. */
function _gfsIslandPopulate(dt, m, bands, byKey, lines, folk, cap, fast, contest) {
  const E = GF_SCHOOL, H = _gfsIslandHabitat; H.elapsed += dt;
  const pinned = [..._gfs.list.values()].filter(fish => fish.to != null), people = new Map();
  for (const person of folk) if (person.x < GARDEN_ROOM_X) people.set(String(person.slot), { key: String(person.slot), point: person, slot: person.slot, line: lines.get(person.slot) || null });
  for (const [slot, line] of lines) { const row = people.get(String(slot)) || { key: String(slot), point: line, slot }; row.line = line; people.set(String(slot), row); }
  for (const band of bands) if (band.room) people.set('room:' + band.key, { key: 'room:' + band.key, point: { x: (band.x0 + band.x1) / 2, y: (band.y0 + band.y1) / 2 }, roomBand: band });
  for (const [slot, line] of lines) { const key = line.x + ',' + line.y, old = _gfs.lineWait.get(slot); if (!old || old.key !== key || pinned.some(fish => fish.to === slot)) _gfs.lineWait.set(slot, { key, t: 0 }); else old.t += dt; }
  for (const slot of [..._gfs.lineWait.keys()]) if (!lines.has(slot)) _gfs.lineWait.delete(slot);
  const rows = [];
  for (const row of people.values()) {
    row.candidates = row.roomBand ? [{ band: row.roomBand, distance: 0 }] : _gfsIslandNearby(row.line || row.point, byKey);
    if (row.line) { const exact = row.candidates.findIndex(candidate => _gfsBandContains(candidate.band, row.line.x, row.line.y)); if (exact > 0) row.candidates.unshift(row.candidates.splice(exact, 1)[0]); }
    if (!row.candidates.length) continue;
    row.pinned = pinned.filter(fish => fish.to === row.slot).length; row.wait = row.line ? _gfs.lineWait.get(row.slot)?.t || 0 : 0;
    const base = _gfsWant(row.candidates[0].band, m) + (row.roomBand ? 0 : 2); row.quota = contest ? Math.min(cap, base * E.contestMore) : base + (_gfsFrenzy() ? E.frenzy.more : 0); rows.push(row);
  }
  rows.sort((a, b) => Number(!!b.line) - Number(!!a.line) || b.wait - a.wait || a.key.localeCompare(b.key));
  const rotateGroup = group => { const rotate = group.length ? Math.floor(H.elapsed / E.nearGap[1]) % group.length : 0; return group.slice(rotate).concat(group.slice(0, rotate)); }, ordered = rotateGroup(rows.filter(row => row.line)).concat(rotateGroup(rows.filter(row => !row.line))), targets = [];
  for (let round = 0; round < cap && targets.length + pinned.length < cap; round++) for (const row of ordered) {
    if (round < row.pinned || round >= row.quota) continue; const candidate = row.candidates[round % row.candidates.length];
    if (round >= row.candidates.length && !row.roomBand && row.candidates.length > 1) continue;
    const point = row.line && round === 0 ? { x: row.line.x, y: row.line.y, stockLine: true, stockReach: E.reach + (row.line.bait.st.lure || 0) * E.lureReach } : row.point;
    targets.push({ owner: row.key, round, band: candidate.band, point, line: row.line && round === 0 ? row.line : null, wait: row.wait, timer: candidate.band.key + '@' + row.key + ':' + round });
    if (targets.length + pinned.length >= cap) break;
  }
  const idle = [..._gfs.list.values()].filter(fish => fish.st === GF_ST.swim && fish.to == null), assigned = new Set();
  for (const fish of idle) if (fish.x < GARDEN_ROOM_X && _gfsFar(fish.x, fish.y, folk) > E.near + 4) { _gfsDrop(fish); _gfs.dirty = true; }
  for (const target of targets) {
    let best = null, distance = Infinity;
    for (const fish of idle) { if (!_gfs.list.has(fish.u) || assigned.has(fish.u) || fish.band !== target.band.key) continue; const d = Math.hypot(fish.x - target.point.x, fish.y - target.point.y); if (target.line && !_gfsLineApproachClear(fish, target.line)) continue; if (d < distance) { best = fish; distance = d; } }
    if (best && distance <= (target.line ? E.reach + (target.line.bait.st.lure || 0) * E.lureReach : E.near)) { assigned.add(best.u); target.fish = best; }
  }
  let added = 0;
  for (const target of targets) {
    if (target.fish) continue;
    let timer = _gfs.band.has(target.timer) ? _gfs.band.get(target.timer) - dt : _gfs.band.size ? E.nearGap[0] : 0;
    if (target.line && target.wait >= E.lineWait) timer = 0;
    _gfs.band.set(target.timer, timer); if (timer > 0 || added >= 2) continue;
    if (_gfs.list.size >= cap) { let surplus = null, distance = -1; for (const fish of idle) { if (!_gfs.list.has(fish.u) || assigned.has(fish.u) || fish.to != null) continue; const d = Math.hypot(fish.x - target.point.x, fish.y - target.point.y); if (d > distance) { surplus = fish; distance = d; } } if (!surplus) continue; _gfsDrop(surplus); _gfs.dirty = true; }
    const before = _gfs.list.size; _gfsSpawn(target.band, m, null, { near: target.point, plain: !!target.line });
    if (_gfs.list.size > before) { added++; if (target.line) { const waiting = _gfs.lineWait.get(Number(target.owner)); if (waiting) waiting.t = 0; } }
    _gfs.band.set(target.timer, (E.nearGap[0] + Math.random() * (E.nearGap[1] - E.nearGap[0])) * fast * (target.band.room ? GRW.gap : 1));
  }
}
function _gfsBands(m) {
  if (GARDEN_WORLD.v >= 4) return _gfsIslandBands(m);
  // only the lake that is open: past the line of floats nothing swims (the zones, 94-garden-lands-0table.js)
  // Built compatible side decks use the authored continuous ocean's X domain.
  // Keep the existing three depth rows, keys, stocks, odds and timers.
  const sideDeck = gardenPierDecks(m.works || [], m).some(p => p.side === 'west' || p.side === 'east');
  const ocean = sideDeck ? gardenIslandOceanGeometry().bounds : null;
  const to = gardenLakeOpenTo() - 0.4, out = GF_SCHOOL.bands.map((b, i) => Object.assign({ key: 'b' + i }, b, { x0: ocean ? ocean.x : b.x0, x1: ocean ? ocean.x + ocean.width : b.x1, y1: Math.min(b.y1, to) })).filter(b => b.y1 > b.y0);
  for (const a of GARDEN_AREAS) if (a.water && !a.fishing && m.areas.includes(a.id)) { const w = a.water; out.push({ key: 'a' + a.id, zone: 'pond', x0: w.x + 0.4, x1: w.x + w.w - 0.4, y0: w.y + 0.3, y1: w.y + w.h - 0.3, n: GF_SCHOOL.pond }); }
  out.push(...gardenRoomBands());   // a room's water, while somebody is in the room
  out.push(...gardenRegionBands(m.areas));   // the regions' waters, once they are open (94-garden-regions-0table.js)
  return out;
}
/** Keep destinations and proposed swim segments outside displayed deck margins. */
function _gfsPierBlocks(decks, x, y, near) {
  for (const p of decks) {
    const x0 = p.x - .5, x1 = p.x + p.w + .5, y0 = p.y - .4, y1 = p.y + p.h + .4;
    if (x > x0 && x < x1 && y > y0 && y < y1) return true;
    if (!near || near.x > x0 && near.x < x1 && near.y > y0 && near.y < y1) continue; // an old margin position may leave it
    let lo = 0, hi = 1, clear = false;
    for (const [from, delta, min, max] of [[near.x, x - near.x, x0, x1], [near.y, y - near.y, y0, y1]]) {
      if (delta === 0) { if (from <= min || from >= max) { clear = true; break; } }
      else { const a = (min - from) / delta, b = (max - from) / delta; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); if (lo >= hi) { clear = true; break; } }
    }
    if (!clear && lo < hi && hi > 0 && lo < 1) return true;
  }
  return false;
}
/** Somewhere in the existing water/depth band, clear of every built deck. */
function _gfsSpot(b0, near0) {
  if (b0 && b0.room) return gardenRoomSpot(b0, near0);
  if (b0 && b0.zone !== 'pond' && typeof gardenIceSpot === 'function') { const q = gardenIceSpot(b0, near0); if (q && (GARDEN_WORLD.v < 4 || _gfsBandContains(b0, q.x, q.y) && _gfsWaterClear(near0, q.x, q.y))) return q; }   // a frozen lake: fish keep to the holes (94-garden-zz-2season.js)
  const b = b0 || GF_SCHOOL.bands[0], inX = (v) => Math.max(b.x0, Math.min(b.x1, v)), inY = (v) => Math.max(b.y0, Math.min(b.y1, v));
  const near = near0 ? { x: inX(near0.x), y: inY(near0.y) } : null, lake = b.zone !== 'pond', decks = lake ? gardenPierDecks() : [];
  if (b.sampleCells && !near0?.def) return _gfsIslandSpot(b, near0, decks);   // (wherever it was asked to go, it stays in this water: a bolting fish once ran out over the farmland)
  for (let i = 0; i < 12; i++) {
    const forward = near && near0.st === GF_ST.swim && near0.swimDX != null && i < 6, angle = forward ? Math.atan2(near0.swimDY / .45, near0.swimDX) + (Math.random() - .5) * 2.1 : 0, reach = forward ? 1.1 + Math.random() * 3 : 0;
    const x = near ? inX(near.x + (forward ? Math.cos(angle) * reach : (Math.random() - 0.5) * 8)) : b.x0 + Math.random() * (b.x1 - b.x0);
    const y = near ? inY(near.y + (forward ? Math.sin(angle) * reach * .45 : (Math.random() - 0.5) * 3)) : b.y0 + Math.random() * (b.y1 - b.y0);
    if (!_gfsWaterClear(near0, x, y) || !_gfsBandContains(b, x, y)) continue;
    if (near && Math.hypot(x - near.x, (y - near.y) * .625) < .55) continue;
    if (i < 8 && !_gfsSpaced(b, x, y, near0)) continue;
    if (near && _gfsWaterAt(near.x, near.y) && !_gfsWaterSegment(near, { x, y }, _gfsWaterClear(near0, near.x, near.y) ? near0 : null)) continue;
    if (lake && _gfsPierBlocks(decks, x, y, near)) continue;
    return { x, y };
  }
  if (b.sampleCells) { const fallback = _gfsIslandSpot(b, near0, decks); if (fallback) return fallback; }
  return near && _gfsWaterClear(near0, near.x, near.y) && _gfsBandContains(b, near.x, near.y) ? near : null;
}
/** Separation is considered only when choosing a destination, never by a
 * per-frame flock solver or by a guest deciding its own fishing rules. */
function _gfsSpaced(b, x, y, origin) {
  for (const other of _gfs.list.values()) {
    if (other === origin) continue;
    if (GARDEN_WORLD.v >= 4 && b.bodyId) { const source = _gfsIslandHabitat.byKey.get(other.band); if (!source || source.bodyId !== b.bodyId) continue; } else if (other.band !== b.key) continue;
    const radius = Math.min(1.5, .45 + (_gfsLen(origin && origin.cm) + _gfsLen(other.cm)) * .004);
    if (Math.hypot(x - other.x, (y - other.y) * .625) < radius) return false;
  }
  return true;
}
/** A new fish in this water. at: right there (chum, or a line waiting: o.plain says it is no special treat). o.near: the person to come near, in water as big as the lake. */
function _gfsSpawn(b, m, at, o) {
  const plus = typeof gardenCatchSpawnPlan === 'function' ? gardenCatchSpawnPlan(b, m, at) : null, near = o && o.near;   // spots, events and what you have done raise the odds: 94-garden-fish-8catch.js
  const plusP = plus && plus.p && plus.p.y <= b.y1 + 0.3 && (!near || !b.sampleCells && b.zone === 'pond' || Math.hypot(plus.p.x - near.x, plus.p.y - near.y) <= (near.stockLine ? (near.stockReach || GF_SCHOOL.reach) - .1 : GF_SCHOOL.near)) ? plus.p : null;   // (a favourite spot past the floats, or a long way off: not now)
  let p = at && _gfsWaterAt(at.x, at.y) && _gfsBandContains(b, at.x, at.y) ? at : plusP && _gfsWaterAt(plusP.x, plusP.y) && _gfsBandContains(b, plusP.x, plusP.y) ? plusP : _gfsSpot(b, near && (b.sampleCells || b.zone !== 'pond') ? near : null); if (!p || !_gfsWaterAt(p.x, p.y) || !_gfsBandContains(b, p.x, p.y)) return;
  const ctx = { zone: b.zone, tod: m.tod, season: m.season, rain: !!(m.rain && m.rain.now), level: m.level.level, moon: gardenMoonPhase(m.today), decor: (id) => m.decor.some(d => d.def.id === id) || gardenWorkOwned(id), caught: (id) => !!_gdG().fl[id] };
  if (b.room) ctx.room = b.room;
  if (typeof gardenPlaceHas === 'function') ctx.home = gardenPlaceHas;
  if (typeof gardenEventOn === 'function') ctx.event = gardenEventOn;
  if (typeof gardenSpotAt === 'function') ctx.spot = gardenSpotAt(p.x, p.y) || null;
  // mostly real fish: a find (a boot, a pearl) is the odd small shadow, and water too deep for this garden's level still has what can live in it
  // further out the rare ones are likelier: the far end of the deep water is where the fins are
  const coastDistance = b.islandOcean ? gardenIslandCoastDistance(p.x, p.y) : 0, outward = b.zone === 'deep' ? b.islandOcean ? 1 + Math.min(1.5, coastDistance / 300) : 1 + Math.max(0, p.y - 17) / 2.5 : 1;
  let odds = gardenFishOdds(ctx).map(([k, w]) => { const d0 = gardenFishDef(k); return [k, d0.cat !== 'fish' ? w * GF_SCHOOL.finds : d0.rarity === 'common' ? w : w * outward]; });
  if (b.zone === 'deep' && !odds.some(([k]) => gardenFishDef(k).cat === 'fish')) odds = odds.concat(gardenFishOdds(Object.assign({}, ctx, { zone: 'mid' })).filter(([k]) => gardenFishDef(k).cat === 'fish'));
  odds = b.kinds ? b.kinds.map(gardenFishDef).filter(d => d && gardenFishFits(d, ctx)).map(d => [d.id, gardenBugWeight(d, ctx)]) : gardenRegionOdds(odds, b, ctx); if (!odds.length) return;   // only what lives in this water
  if (plus && plus.weigh) odds = odds.map(([k, w]) => [k, plus.weigh(gardenFishDef(k), w, p)]);
  let forced = plus && plus.forced ? plus.forced(ctx) : null;
  if (forced && (b.kinds || !gardenRegionBandHas(forced.id, b))) forced = null;   // the one that got away, a legend, a fish you let go
  const id = forced ? forced.id : gardenFishPick(odds, Math.random), def = gardenFishDef(id); if (!def) return;
  // further out is bigger, in the same kind as well as in the kinds that live there
  const out = b.zone === 'pond' ? 0.05 : b.islandOcean ? Math.min(.55, coastDistance / 600) : Math.max(0, Math.min(0.55, (p.y - 13) / 24));
  const cm0 = forced && forced.cm ? forced.cm : def.cat === 'fish' ? gardenFishSize(def, Math.random, out) : Math.round((def.cm[0] + def.cm[1]) / 2);
  const sv = forced && forced.cm ? { v: '', cm: cm0 } : typeof gardenVariantSpawn === 'function' ? gardenVariantSpawn(def, cm0, b, m, { chum: !!at && !(o && o.plain), frenzy: _gfsFrenzy(), room: b.room || '' }) : { v: '', cm: cm0 }, cm = sv.cm;   // what it is, decided here and now: everyone sees the same one
  const footprint = { x: p.x, y: p.y, def, cm };
  if (!_gfsWaterClear(footprint, p.x, p.y)) { const safe = _gfsSpot(b, footprint); if (!safe || !_gfsWaterClear(footprint, safe.x, safe.y)) return; p = safe; footprint.x = p.x; footprint.y = p.y; }
  const go = _gfsSpot(b, footprint) || p;
  _gfs.u = (_gfs.u + 1) % 1000;
  _gfsAdd({ u: _gfs.u, id, v: sv.v, z: forced ? forced.z || 0 : 0, cm, x: p.x, y: p.y, tx: go.x, ty: go.y, band: b.key, life: GF_SCHOOL.life[0] + Math.random() * (GF_SCHOOL.life[1] - GF_SCHOOL.life[0]) });
  _gfs.dirty = true;
}
/** Every line in the water now: yours and, if you are the host, everyone's. Keyed by slot. */
function _gfsLinesNow() {
  const out = new Map(), F = _gw.fishing;
  if (F && (F.state === 'wait' || F.state === 'bite' || F.state === 'reel')) out.set(_gfsSlot(), { x: F.bx, y: F.by, bait: F.plan.baitDef || GARDEN_BAITS[0], me: true, setup: typeof gardenTackleInUse === 'function' ? gardenTackleInUse() : { rod: gardenRod().tier, bait: (F.plan.baitDef || GARDEN_BAITS[0]).id } });
  if (typeof _gll !== 'undefined' && _gll.role === 'host') for (const A of _gll.actors.values()) {
    const L = A.fish; if (!L || L.state === 'land' || GARDEN_WORLD.v >= 4 && gardenWaterNo(L.bx, L.by, _gfs.m || gardenHere())) continue;
    const d = L.bait ? gardenGearDef(L.bait) : null;
    out.set(A.w, { x: L.bx, y: L.by, bait: d && d.kind === 'bait' ? d : GARDEN_BAITS[0], setup: typeof gardenSetOfLook === 'function' ? gardenSetOfLook(A.g, L.bait) : { rod: A.g && A.g.r, bait: L.bait } });   // (their reel, line and hook: the look they send)
  }
  return out;
}
/** Who the fish should be near: you, and on a host, everyone in the garden. */
function _gfsFolk() {
  const out = [Object.assign({ slot: _gfsSlot() }, typeof _grm !== 'undefined' && _grm.me && typeof gardenRoomMeCell === 'function' ? gardenRoomMeCell() : { x: _gw.px, y: _gw.py })];   // (in a hidden room you are at its water)
  if (typeof _gll !== 'undefined' && _gll.role === 'host') for (const A of _gll.actors.values()) if (!A.me && A.w !== _gfsSlot()) { const point = gardenLiveActorPosition(A); if (point) out.push({ x: point.x, y: point.y, slot: A.w }); }
  return out;
}
function _gfsFar(x, y, folk) { let best = 1e9; for (const q of folk) { const d = Math.hypot(x - q.x, y - q.y); if (d < best) best = d; } return best; }
/** How far the nearest person is from this water, and who that is. */
function _gfsBandNear(b, folk) {
  if (b.room) return { far: 0, who: { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 } };   // (it exists only while someone is in the room: they are right there)
  let best = 1e9, who = folk[0];
  if (b.sampleCells) {
    const key = folk.map(person => person.slot + ':' + Math.round(person.x * 2) + ',' + Math.round(person.y * 2)).join('|');
    if (b.nearCache.has(key)) return b.nearCache.get(key);
    for (const person of folk) for (const point of b.sampleCells) { const dx = person.x - point[0], dy = person.y - point[1], distance = dx * dx + dy * dy; if (distance < best) { best = distance; who = person; } }
    const value = { far: Math.sqrt(best), who }; if (b.nearCache.size >= 16) b.nearCache.clear(); b.nearCache.set(key, value); return value;
  }
  for (const q of folk) { const d = Math.hypot(Math.max(b.x0 - q.x, q.x - b.x1, 0), Math.max(b.y0 - q.y, q.y - b.y1, 0)); if (d < best) { best = d; who = q; } }
  return { far: best, who };
}
/** Room for one more, near people: the swimming fish furthest from anyone goes, if it is well further off than this water. */
function _gfsMakeRoom(far, folk) {
  let out = null, bd = far + 4;
  for (const f of _gfs.list.values()) { if (f.st !== GF_ST.swim || f.to != null || f.x >= GARDEN_ROOM_X) continue; const d = _gfsFar(f.x, f.y, folk); if (d > bd) { bd = d; out = f; } }
  if (!out) return false;
  _gfsDrop(out); _gfs.dirty = true;
  return true;
}
function _gfsBolt(f, b) {
  const ang = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 2;
  const near = { x: f.x + Math.cos(ang) * r, y: f.y + Math.sin(ang) * r * 0.5, def: f.def, cm: f.cm };
  const go = b ? _gfsSpot(b, near) : null;   // (no water known for it: it darts about where it is)
  f.st = GF_ST.bolt; f.to = null; f.n = 0; f.cool = 8; f.tx = go ? go.x : f.x; f.ty = go ? go.y : f.y;
  _gfs.dirty = true;
}
function _gfsRun(dt) {
  // (the garden's model is worked out at most every 2 seconds here: this runs four times a second)
  const clk = performance.now();
  if (!_gfs.m || clk - _gfs.mAt > 2000) { try { _gfs.m = gardenHere(); _gfs.mAt = clk; } catch (e) { return; } }
  const m = _gfs.m; if (!m) return;
  const bands = _gfsBands(m), byKey = new Map(bands.map(b => [b.key, b])), lines = _gfsLinesNow(), E = GF_SCHOOL, told = typeof _gll !== 'undefined' && _gll.role === 'host' && _glh.on && _glhAnyone(), folk = _gfsFolk();
  const contest = typeof gardenContestLive === 'function' && !!gardenContestLive('fish'), cap = contest || _gfsFrenzy() ? E.wire : E.max;
  // a float that has just landed frightens what is right under it
  for (const [slot, L] of lines) {
    const key = L.x + ',' + L.y;
    if (_gfs.seen.get(slot) !== key) { _gfs.seen.set(slot, key); for (const f of _gfs.list.values()) if (f.st === GF_ST.swim && Math.hypot(f.x - L.x, f.y - L.y) < E.spook) _gfsBolt(f, byKey.get(f.band)); }
  }
  for (const [slot, L] of lines) {
    if (!L.bait.st.chum || _gfs.chum.get(slot) === L.x + ',' + L.y || _gfs.list.size >= cap) continue;
    _gfs.chum.set(slot, L.x + ',' + L.y);
    const b = bands.find(q => _gfsBandContains(q, L.x, L.y));
    if (b) _gfsSpawn(b, m, { x: L.x + (Math.random() < 0.5 ? -1.2 : 1.2), y: Math.max(b.y0, Math.min(b.y1, L.y + 0.5)) });
  }
  for (const slot of [..._gfs.seen.keys()]) if (!lines.has(slot)) _gfs.seen.delete(slot);
  const stomps = _gfsStomps();
  const fins = [..._gfs.list.values()].filter(f => gardenFishFin(f.def));
  const taken = new Set(); for (const f of _gfs.list.values()) if (f.to != null) taken.add(f.to);
  for (const f of [..._gfs.list.values()]) {
    if (String(f.band).startsWith('R:') && !byKey.has(f.band)) { _gfsDrop(f); _gfs.dirty = true; continue; }   // everyone has left that room
    f.cool = Math.max(0, f.cool - dt);
    const L = f.to != null ? lines.get(f.to) : null;
    if (f.to != null && (!L || Math.hypot(L.x - f.tx, L.y - f.ty) > 0.05)) {
      // that line has gone, or was cast somewhere else
      if (f.st === GF_ST.hooked) { _gfsDrop(f); _gfs.dirty = true; continue; }
      taken.delete(f.to); f.st = GF_ST.swim; f.to = null; f.n = 0; f.cool = 3; const go = _gfsSpot(byKey.get(f.band) || bands[0], f) || f; f.tx = go.x; f.ty = go.y; _gfs.dirty = true;
    }
    if (f.st === GF_ST.swim) {
      if (f.x < GARDEN_ROOM_X && !_gfsWaterAt(f.x, f.y)) _gfsRehome(f, byKey.get(f.band) || bands.find(b => f.y >= b.y0 && f.y <= b.y1 && f.x < GARDEN_ROOM_X && !b.room));
      if (f.x < GARDEN_ROOM_X && !_gfsWaterAt(f.tx, f.ty)) { const go = _gfsSpot(byKey.get(f.band) || bands[0], f) || f; f.tx = go.x; f.ty = go.y; _gfs.dirty = true; }
      f.life -= dt;
      if (f.life <= 0 || (f.band && !byKey.has(f.band))) { _gfsDrop(f); _gfs.dirty = true; continue; }
      // With people here a fish waits where it got to until the next list says where it goes next, here as on their screens. It used to go on here at once while they saw it stop, and then glide after it: the same fish, in two places.
      if (_gfsMove(f, dt)) { if (told) f.rest = true; else { const go = _gfsSpot(byKey.get(f.band) || bands[0], f) || f; f.tx = go.x; f.ty = go.y; } }
      if (f.band !== 'x' && byKey.get(f.band) && byKey.get(f.band).zone !== 'deep') for (const s of stomps) if (Math.hypot(f.x - s.x, (f.y - s.y) * 1.2) < E.noise && Math.random() < E.noiseKeen * dt) { _gfsBolt(f, byKey.get(f.band)); if (s.me) _gfsStompSaid(); break; }
      if (f.st !== GF_ST.swim) continue;
      if (f.cm < 40 && fins.some(h => h !== f && Math.hypot(h.x - f.x, h.y - f.y) < E.hunter) && Math.random() < dt) { _gfsBolt(f, byKey.get(f.band)); continue; }
      if (f.cool > 0) continue;
      let best = null, bd = 1e9;
      for (const [slot, Q] of lines) {
        if (taken.has(slot)) continue;
        const d = Math.hypot(f.x - Q.x, f.y - Q.y), reach = E.reach + (Q.bait.st.lure || 0) * E.lureReach;
        if (d >= reach || d >= bd || GARDEN_WORLD.v >= 4 && !_gfsLineApproachClear(f, Q)) continue;
        const lacks = f.def.needs ? gardenFishLacks(f.def, Q.setup) : null;   // you can see it, but it ignores a line without what it wants
        if (lacks && lacks.length) { if (Q.me) _gfs.refused = { at: performance.now(), name: f.def.name, why: lacks[0] }; continue; }
        bd = d; best = { slot, Q };
      }
      if (!best) {
        // a float further off in its own water: it drifts over to have a look, once for each cast
        const B0 = byKey.get(f.band);
        for (const [slot, Q] of lines) {
          if (taken.has(slot) || !B0 || f.drawn === Q.x + ',' + Q.y || Math.hypot(f.x - Q.x, f.y - Q.y) >= E.draw) continue;
          if (Q.x < B0.x0 - 1 || Q.x > B0.x1 + 1 || Q.y < B0.y0 - 2 || Q.y > B0.y1 + 2) continue;
          const destination = GARDEN_WORLD.v >= 4 ? _gfsLineStandOff(f, Q, B0) : { x: Math.max(B0.x0, Math.min(B0.x1, Q.x + (f.x < Q.x ? -1.1 : 1.1))), y: Math.max(B0.y0, Math.min(B0.y1, Q.y)) };
          if (!destination) continue;
          f.drawn = Q.x + ',' + Q.y; f.tx = destination.x; f.ty = destination.y; f.rest = false; _gfs.dirty = true;
          break;
        }
        continue;
      }
      const rare = best.Q.bait.st.rare || 0, kind = f.def.rarity;
      let keen = E.keen * (E.shy[kind] || 1) * (kind === 'common' ? 1 : 1 + rare * E.rareKeen);
      if ((best.Q.bait.st.night || gardenWorkOwned('night-lantern')) && m.tod === 'night') keen *= 1.6;
      if (kind !== 'common' && gardenWorkOwned('reed-beds')) keen *= 1.3;
      if (m.tod === 'dawn' || m.tod === 'dusk' || _gfsFrenzy()) keen *= E.feedTimes;
      if (typeof gardenLineKeen === 'function') keen *= gardenLineKeen(f, best.Q, m);   // what you have on, where you are, what is going on
      if (Math.random() >= keen * dt) continue;
      f.st = GF_ST.come; f.to = best.slot; f.tx = best.Q.x; f.ty = best.Q.y; f.n = 0;
      f.nN = Math.max(E.nibbles[0], E.nibbles[0] + Math.floor(Math.random() * (E.nibbles[1] - E.nibbles[0] + 1)) - (best.Q.bait.st.lure > 1 ? 1 : 0));
      taken.add(best.slot); _gfs.dirty = true;
    } else if (f.st === GF_ST.come) {
      if (_gfsMove(f, dt)) { f.st = GF_ST.nibble; f.wait = 0.5 + Math.random() * 0.8; _gfs.dirty = true; }
    } else if (f.st === GF_ST.nibble) {
      f.wait -= dt;
      if (f.wait <= 0) {
        f.n += 1; _gfs.dirty = true;
        if (f.n > f.nN) { f.st = GF_ST.bite; f.until = performance.now() + (GARDEN_CATCH_ECON.strike + 0.4 + E.biteGrace) * 1000; }
        else f.wait = E.nibGap[0] + Math.random() * (E.nibGap[1] - E.nibGap[0]);
      }
    } else if (f.st === GF_ST.bite) {
      if (performance.now() > f.until) _gfsBolt(f, byKey.get(f.band));
    } else if (f.st === GF_ST.hooked) {
      if (performance.now() > f.until) { _gfsDrop(f); _gfs.dirty = true; }
    } else if (f.st === GF_ST.bolt) {
      if (_gfsMove(f, dt)) { f.st = GF_ST.swim; const go = _gfsSpot(byKey.get(f.band) || bands[0], f) || f; f.tx = go.x; f.ty = go.y; _gfs.dirty = true; }
    }
  }
  // fill the water up again, one at a time
  if (!contest && !_gfsFrenzy() && Math.random() < E.frenzy.chance * dt) { _gfs.frenzyUntil = performance.now() + E.frenzy.secs * 1000; gardenMessage('The fish are feeding! For a little while there are more about.', { ambient: true, source: 'fish-feeding', icon: 'fish' }); }
  const fast = contest ? E.contestGap : _gfsFrenzy() ? E.frenzy.gap : m.rain && m.rain.now ? 0.7 : 1;
  if (GARDEN_WORLD.v >= 4) { _gfsIslandPopulate(dt, m, bands, byKey, lines, folk, cap, fast, contest); return; }
  // the water nearest to people first: with only a few fish in all, a far pool must not take them while the water you stand at stays empty. In the lake only the fish near someone count: the lake is too big to call one water
  const count = new Map(), distant = new Map();
  for (const f of _gfs.list.values()) { const b = byKey.get(f.band); if (b && b.zone !== 'pond' && f.st === GF_ST.swim && f.to == null && _gfsFar(f.x, f.y, folk) > E.near) { if (!distant.has(f.band)) distant.set(f.band, f); continue; } count.set(f.band, (count.get(f.band) || 0) + 1); }
  const empty = !_gfs.band.size, order = bands.map(b => Object.assign({ b }, _gfsBandNear(b, folk))).sort((p, q) => p.far - q.far);
  let ahead = 0;   // nearer waters still waiting for their fish: the last places are theirs
  for (const { b, far, who } of order) {
    const have = count.get(b.key) || 0, base = _gfsWant(b, m), want = contest ? base * E.contestMore : base + (_gfsFrenzy() ? E.frenzy.more : 0), close = far <= E.close;
    if (empty) { if (_gfs.list.size < cap && (b.zone === 'pond' || Math.random() < 0.7)) _gfsSpawn(b, m, null, { near: who }); _gfs.band.set(b.key, E.gap[0] * Math.random()); continue; }   // (a garden you have just come into has a fish or two, nearest first)
    if (have >= want) continue;
    const had = _gfs.band.has(b.key) ? _gfs.band.get(b.key) : close ? E.nearGap[0] : E.gap[0], t = (close ? Math.min(had, E.nearGap[1]) : had) - dt;
    if (t > 0) { _gfs.band.set(b.key, t); ahead += want - have; continue; }
    if (!close && _gfs.list.size + ahead >= cap) { ahead += want - have; continue; }
    if (distant.has(b.key)) { _gfsDrop(distant.get(b.key)); distant.delete(b.key); _gfs.dirty = true; }   // (the one at the far end of the lake leaves as this one comes)
    if (_gfs.list.size >= cap && !(close && !have && _gfsMakeRoom(far, folk))) continue;
    _gfsSpawn(b, m, null, { near: who });
    const G = close ? E.nearGap : E.gap; _gfs.band.set(b.key, (G[0] + Math.random() * (G[1] - G[0])) * fast * (b.room ? GRW.gap : 1));
  }
  // a line nothing has come to: one comes up near it. Every bite is still a fish you can see
  for (const [slot, L] of lines) {
    const W = _gfs.lineWait.get(slot), key = L.x + ',' + L.y, busy = [..._gfs.list.values()].some(f => f.to === slot);
    if (!W || W.key !== key || busy) { _gfs.lineWait.set(slot, { key, t: 0 }); continue; }
    if ((W.t += dt) < E.lineWait) continue;
    W.t = 0;
    const b = bands.find(q => _gfsBandContains(q, L.x, L.y)); if (!b) continue;
    if (_gfs.list.size >= cap && !_gfsMakeRoom(1, folk)) continue;
    const side = Math.random() < 0.5 ? -1 : 1, rx = Math.min(1.5, (b.x1 - b.x0) / 2);
    let x = Math.max(b.x0, Math.min(b.x1, L.x + side * rx)); if (Math.abs(x - L.x) < 0.9) x = Math.max(b.x0, Math.min(b.x1, L.x - side * rx));
    _gfsSpawn(b, m, { x, y: Math.max(b.y0, Math.min(b.y1, L.y + (Math.random() - 0.5) * 0.4)) }, { plain: true });
  }
  for (const slot of [..._gfs.lineWait.keys()]) if (!lines.has(slot)) _gfs.lineWait.delete(slot);
}
/** The whole list to everyone there: when something changed, and now and then anyway. */
function _gfsTell() {
  if (typeof _gll === 'undefined' || _gll.role !== 'host' || !_glh.on || !_glhAnyone()) return;
  const now = Date.now();   // clock-ok: spacing
  if (!_glhLooking()) return;   // (nobody is looking: it goes when someone is back)
  if (now - _gfs.sentAt < (_gfs.dirty ? GF_SCHOOL.msgGap : _gfs.list.size ? GF_SCHOOL.beat : GF_SCHOOL.beatEmpty)) return;
  const forced = _gfs.forceTell === true;
  // those that have got where they were going set off now, on every screen at once
  const bands = _gfs.m ? new Map(_gfsBands(_gfs.m).map(b => [b.key, b])) : null;
  for (const f of _gfs.list.values()) if (f.rest) { f.rest = false; if (f.st === GF_ST.swim && bands) { const go = _gfsSpot(bands.get(f.band) || GF_SCHOOL.bands[0], f) || f; f.tx = go.x; f.ty = go.y; } }
  const n10 = (v, ceiling) => Math.max(0, Math.min(ceiling, Math.round(v * 10))), xmax = (GARDEN_ROOM_X + 24) * 10, ymax = GARDEN_WORLD.rows * 10;
  const l = [..._gfs.list.values()].slice(0, GF_SCHOOL.wire).map(f => Object.assign({ u: f.u, e: f.id, c: Math.round(f.cm), x: n10(f.x, xmax), y: n10(f.y, ymax), tx: n10(f.tx, xmax), ty: n10(f.ty, ymax), st: f.st }, f.v ? { v: f.v } : {}, f.to != null ? { to: f.to } : {}, f.n ? { n: Math.min(9, f.n) } : {}, f.z ? { z: f.z } : {}));
  const sig = JSON.stringify(l), heartbeat = l.length ? GF_SCHOOL.beat : GF_SCHOOL.beatEmpty;
  _gfs.dirty = false;
  if (!forced && sig === _gfs.wireSig && now - _gfs.sentAt < heartbeat) { _gfs.sameSkipped = (_gfs.sameSkipped || 0) + 1; return; }
  _gfs.sentAt = now; _gfs.wireSig = sig; _gfs.forceTell = false;
  _glhSend('all', 'fs', { l }).then((r) => { if (r == null) { _gfs.dirty = true; _gfs.forceTell = true; } });
}
/** A guest hears the host's water. Anything not listed has left it. */
function _gfsIn(l) {
  if (!_gfsGuest() || !Array.isArray(l)) return;
  if (!_gfs.hostSeen) { _gfsClear(); _gfs.hostSeen = true; }   // (what this screen made up until the host spoke)
  _gfs.hostAt = Date.now();   // clock-ok: when the host was last heard
  const seen = new Set();
  for (const r of l.slice(0, GF_SCHOOL.wire)) {
    if (!r || !Number.isInteger(r.u) || !gardenFishDef(r.e)) continue;   // (one this version does not know)
    seen.add(r.u);
    const f = _gfs.list.get(r.u), to = r.to == null ? null : r.to;
    if (!f) { _gfsAdd({ u: r.u, id: r.e, v: r.v, cm: r.c, x: r.x / 10, y: r.y / 10, tx: r.tx / 10, ty: r.ty / 10, st: r.st, to, n: r.n, z: r.z }); continue; }
    f.x = r.x / 10; f.y = r.y / 10; f.tx = r.tx / 10; f.ty = r.ty / 10; f.st = r.st; f.to = to; f.n = r.n || 0;
  }
  for (const f of [..._gfs.list.values()]) if (!seen.has(f.u)) _gfsDrop(f);
}

/* ---------- a line and its fish ---------- */
/** The fish at your line, if there is one. */
function _gfsMine() { return _gfsFishForSlot(_gfsSlot()); }
/** Is that fish no longer yours? One gone from the list has just been landed; one still there has to be biting or hooked on your line. It bit you and nobody else, so only the host's clock (too slow) can take it back. */
function _gfsLostIt(u) { const f = _gfs.list.get(u); return !!f && !(f.to === _gfsSlot() && (f.st === GF_ST.bite || f.st === GF_ST.hooked)); }
/** You struck, landed or let go: to whoever decides. */
function _gfsSay(e, u) {
  if (u == null) return;
  if (_gfsDecides()) { _gfsAct(e, u, _gfsSlot()); return; }
  if (typeof gardenLiveFx === 'function') gardenLiveFx('fs', e, { i: String(u) });
}
/** The one who decides: a fish belongs to the line it came to, so nobody else can strike it, land it or let it go. */
function _gfsAct(e, u, slot) {
  const f = _gfs.list.get(Number(u)); if (!f || f.to !== slot) return false;
  if (e === 'hook') { if (f.st !== GF_ST.bite) return false; f.st = GF_ST.hooked; f.until = performance.now() + GF_SCHOOL.hookedMs; _gfs.dirty = true; return true; }
  if (e === 'land') { if (f.st !== GF_ST.hooked) return false; _gfsDrop(f); _gfs.dirty = true; return true; }
  if (e === 'free') { let m = null; try { m = gardenHere(); } catch (err) { /* it just bolts on the spot */ } const b = m ? _gfsBands(m).find(x => x.key === f.band) : null; _gfsBolt(f, b); return true; }
  return false;
}
/** A guest said it (fx fs): the host alone hears this. */
function _gfsHeard(A, ev) { if (typeof _gll !== 'undefined' && _gll.role === 'host' && A) _gfsAct(String(ev.e), ev.i, A.w); }
/** Would a float landing here scare something? (Said to you at once: the host decides, a moment later.) */
function _gfsTooClose(pt) { for (const f of _gfs.list.values()) if (f.st === GF_ST.swim && Math.hypot(f.x - pt.x, f.y - pt.y) < GF_SCHOOL.spook) return true; return false; }
function _gfsFrenzy() { return performance.now() < _gfs.frenzyUntil || (typeof gardenEventOn === 'function' && gardenEventOn('frenzy')); }
function _gfsSay2(text) { if (typeof _gllFeed === 'function') _gllFeed(text); }
/** Who is stomping about: you, unless you are creeping, and anyone in your garden. */
function _gfsStomps() {
  const out = [], t = Date.now();   // clock-ok: how long a creep lasts
  if (_gw.moving && !_gw.sneak && !_gw.boat && !_gw.keys.has('shift')) out.push({ x: _gw.px, y: _gw.py, me: true });
  if (typeof _gll !== 'undefined' && _gll.role === 'host') for (const A of _gll.actors.values()) if (A.moving && !A.stationaryPosition && !(A.sneakUntil > t)) { const point = gardenLiveActorPosition(A); if (point) out.push(point); }
  return out;
}
function _gfsStompSaid() { if (_gfs.stompSaid) return; _gfs.stompSaid = true; _gfsSay2('Your footsteps scared a fish. Hold Shift to creep near the water.'); }
/** A shadow somewhere in view, for a leap: it really is one of the fish there. */
function _gfsLeaper() {
  const l = [..._gfs.list.values()].filter(f => f.x < GARDEN_ROOM_X && f.st === GF_ST.swim && f.def.cat === 'fish' && _gwInView(f.x, f.y, 0));
  return l.length ? l[Math.floor(Math.random() * l.length)] : null;
}

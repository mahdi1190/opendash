/* ============================================================
   GARDEN, THE FISH IN THE WATER (2.34, docs/dev/GARDEN_TOGETHER.md section 20). The owner, 1 Nov 2026: "as animal crossing like as possible ... we can see fish in the water ...
   you only get bites from the actual fish in the water that we see ... bigger fish are visibly bigger, and further out, special fish might have a shark feature ... you can fish without
   limits as long as you can see the fish ... 2 friends can see the same fish, only one of us can catch it, and we can see the fish approaching someone's bait."

   Every bite comes from a shadow you can see. A fish swims about, notices a float near it (how near and how keenly depends on the bait and how shy the fish is), turns and swims to it, nibbles
   a few times and then really bites. Strike on the bite, then fight it in the reel: the kind of fish and its size decide how hard. Strike on a nibble, cast right on top of it or stomp along the bank above one near the surface (creep: hold Shift), and it bolts. A big hunter scares small fish off too. There is no daily count of casts: what limits you is what is
   swimming there, and a caught fish is replaced after a while (GF_SCHOOL.gap). The market's daily limits and GARDEN_CATCH_ECON.xpFish keep it from being a farm.

   ONE WATER, ONE TRUTH. On your own, this computer runs the fish. In a live garden THE HOST'S PAGE runs them and sends the whole list (gl:fs) when something changes and every 2.5 seconds, so a
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
    Object.freeze({ zone: 'shallow', x0: 0.6, x1: 27.4, y0: 13.35, y1: 14.9, n: 1 }),
    Object.freeze({ zone: 'mid', x0: 0.6, x1: 27.4, y0: 15.1, y1: 16.9, n: 1 }),
    Object.freeze({ zone: 'deep', x0: 0.6, x1: 27.4, y0: 17.2, y1: 27.5, n: 1 }),
  ]),
  pond: 1, max: 20,                             // fish in each still pool; the most in the water at once (the wire takes 20). The owner, 1 Nov 2026: a fish should be a pleasant surprise, not everywhere all the time
  tick: 0.25, beat: 5000, msgGap: 400, oldHostMs: 12000, // the clock (seconds); a list at least this often (ms: a guest carries each fish on between lists), never closer than this; how long a guest waits for a host's first list
  gap: Object.freeze([45, 100]), contestGap: 0.2, contestMore: 3, // seconds until the next fish in a band that is short of one; a contest fills up faster, with this many times the fish
  life: Object.freeze([90, 240]),              // seconds a fish stays before it swims off (so the hour and the season change what is about)
  reach: 1.7, lureReach: 0.5,                   // cells at which a fish notices a float; each point of a bait's lure adds this
  keen: 0.45, rareKeen: 3,                      // chance a second that it comes, before shyness; a bait's `rare` multiplies it for all but commons
  shy: Object.freeze({ common: 1, uncommon: 0.8, rare: 0.5, epic: 0.32, legendary: 0.2 }),
  nibbles: Object.freeze([1, 3]), nibGap: Object.freeze([0.9, 2.1]), hookedMs: 90000, idle: 120, spook: 0.8,
  noise: 1.7, noiseKeen: 0.7,                   // how near (cells) stomping feet scare a fish near the surface, and how readily a second
  hunter: 2, feedTimes: 1.5,                    // a fish with a fin scares small ones within this; dawn and dusk they are this much keener
  frenzy: Object.freeze({ chance: 0.0006, secs: 150, more: 1, gap: 0.15 }),   // now and then a feeding frenzy: chance a second, how long, how many more in each water
  finds: 0.2,                                   // how much less often than GARDEN_FISH's odds a shadow turns out to be a find
  biteGrace: 1.8,                               // seconds a guest's bite is held beyond its strike window: the message has to get there and back
});
const GF_ST = Object.freeze({ swim: 0, come: 1, nibble: 2, bite: 3, hooked: 4, bolt: 5 });
const _gfs = { list: new Map(), u: 0, layer: null, clock: null, last: 0, key: '', sentAt: 0, dirty: false, hostAt: 0, hostSeen: false, liveAt: 0, band: new Map(), lines: new Map(), seen: new Map(), chum: new Map(), frenzyUntil: 0, stompSaid: false };

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
/** How many a water holds: few at the start, growing with your level and what you build for the lake, never many. */
function _gfsWant(b, m) {
  const L = (m.level && m.level.level) || 1, W = (id) => gardenWorkOwned(id) ? 1 : 0;
  let n = b.zone === 'pond' ? 1 + W('pool-stock')
    : b.zone === 'shallow' ? 1 + (L >= 5 ? 1 : 0) + W('fish-feeder')
    : b.zone === 'mid' ? 1 + (L >= 8 ? 1 : 0) + W('fish-feeder')
    : 1 + (L >= 6 ? 1 : 0) + W('reed-beds');
  if (m.tod === 'night' && b.zone !== 'pond' && b.zone !== 'shallow') n += W('night-lantern');
  return n;
}
function _gfsPlaceKey() { return typeof _gll === 'undefined' ? 'own' : _gll.role === 'visit' ? 'v|' + (_glv.fid || '') : 'own'; }

/* ---------- the shadows ---------- */
function _gfsLen(cm) { return 10 + 5.2 * Math.sqrt(Math.max(1, Number(cm) || 1)); }   // stage units: a 5 cm minnow about 22 (half a cell), a 1 m carp 62, a 2.8 m sturgeon 97
/** Does it show a fin above the water? The rarest do, and the great long hunters. */
function gardenFishFin(def) { return !!def && def.cat === 'fish' && (def.rarity === 'epic' || def.rarity === 'legendary' || (['pike', 'sturgeon', 'cat'].includes(def.look.s) && def.cm[1] >= 120)); }
function _gfsArt(def, cm) {
  const L = _gfsLen(cm), s = def.look.s, long = ['eel', 'pike', 'sturgeon'].includes(s), deep = ['round', 'flat', 'fancy'].includes(s);
  const rx = L * (long ? 0.5 : 0.42), ry = L * (long ? 0.1 : deep ? 0.25 : 0.18), glow = def.look.p === 'glow' || /^ghost-/.test(def.id);
  const fill = glow ? '#e4eeff' : '#07233a', op = glow ? 0.55 : 0.4;
  const tx = -rx * 0.9, ts = ry * 1.05, n = (v) => v.toFixed(1);
  let s2 = `<ellipse cx="0" cy="0" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" fill-opacity="${op}"/><path d="M${n(tx)} 0L${n(tx - L * 0.2)} ${n(-ts)}L${n(tx - L * 0.14)} 0L${n(tx - L * 0.2)} ${n(ts)}Z" fill="${fill}" fill-opacity="${op}"/>`;
  if (gardenFishFin(def)) { const h = Math.max(9, L * 0.2), w = h * 0.8; s2 += `<path d="M${n(-w * 0.6)} ${n(-ry * 0.4)}Q${n(-w * 0.1)} ${n(-ry * 0.4 - h)} ${n(w * 0.75)} ${n(-ry * 0.4 - h)}Q${n(w * 0.25)} ${n(-ry * 0.4 - h * 0.45)} ${n(w * 0.6)} ${n(-ry * 0.4)}Z" fill="${glow ? '#f4f8ff' : '#27455c'}" fill-opacity="0.92" stroke="#eaf4fa" stroke-opacity="0.5" stroke-width="0.8"/><path d="M${n(-w * 1.1)} ${n(-ry * 0.2)}h${n(w * 2.2)}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1" stroke-linecap="round"/>`; }
  return s2;
}
function _gfsLayer() {
  if (_gfs.layer && _gfs.layer.isConnected && _gw.svg && _gfs.layer.ownerSVGElement === _gw.svg) return _gfs.layer;
  if (!_gw.svg) return null;
  const objs = _gw.svg.querySelector('.gd-objects'); if (!objs || !objs.parentNode) return null;
  const g = _gwEl('g', { class: 'gd-school', 'pointer-events': 'none', 'aria-hidden': 'true', 'clip-path': 'url(#gd-school-clip)' });
  // the pier is drawn with the ground, so a fish is cut away where the planks are: it swims under them
  if (!_gw.svg.querySelector('#gd-school-clip')) {
    const W = GARDEN_WORLD, p = GARDEN_PROPS.find(q => q.id === 'pier'), x0 = p.x * W.cellW - 3, x1 = (p.x + p.w) * W.cellW + 3, y0 = W.sky + p.y * W.cellH, y1 = W.sky + (p.y + p.h + gardenPierMore()) * W.cellH + 5;
    const cp = _gwEl('clipPath', { id: 'gd-school-clip' }), path = _gwEl('path', { 'clip-rule': 'evenodd', d: `M-200 -200H${W.cols * W.cellW + 200}V${W.sky + W.rows * W.cellH + 200}H-200ZM${x0} ${y0}H${x1}V${y1}H${x0}Z` });
    cp.appendChild(path); objs.parentNode.insertBefore(cp, objs);
  }
  objs.parentNode.insertBefore(g, objs);
  _gfs.layer = g;
  for (const f of _gfs.list.values()) if (f.node) g.appendChild(f.node);
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
  const f = { u: r.u, id: r.id, def, cm: r.cm, x: r.x, y: r.y, tx: r.tx, ty: r.ty, st: r.st || 0, to: r.to == null ? null : r.to, n: r.n || 0, band: r.band || null, life: r.life || 0, cool: 0, sx: r.x, sy: r.y, face: 1, a: 0, node: null, dn: r.n || 0, dst: r.st || 0, seed: Math.random() * 9 };
  const layer = _gfsLayer();
  if (layer) { f.node = _gwEl('g', { class: 'gd-fs', opacity: '0' }); f.node.innerHTML = _gfsArt(def, r.cm); layer.appendChild(f.node); }
  _gfs.list.set(f.u, f);
  return f;
}
/** It leaves the water: gone at once as far as anybody fishing is concerned, the shadow fades. */
function _gfsDrop(f) {
  _gfs.list.delete(f.u);
  const n = f.node; if (!n) return;
  if (gardenMotionOn()) { n.setAttribute('style', 'transition:opacity .5s'); n.setAttribute('opacity', '0'); setTimeout(() => n.remove(), 520); } else n.remove();
}
function _gfsReset() { for (const f of [..._gfs.list.values()]) { if (f.node) f.node.remove(); } _gfs.list.clear(); _gfs.band.clear(); _gfs.lines.clear(); _gfs.seen.clear(); _gfs.chum.clear(); _gfs.hostAt = 0; _gfs.hostSeen = false; _gfs.liveAt = 0; _gfs.m = null; _gfs.dirty = true; }
/** Once a frame: the shadows go where they are. Nothing is written for one out of view. */
function _gfsFrame(dt) {
  if (!_gfs.clock && _gw.on) { _gfs.last = 0; _gfsClockStart(); _gfsClock(); }
  const key = _gfsPlaceKey(); if (key !== _gfs.key) { _gfs.key = key; _gfsReset(); }
  const layer = _gfsLayer(); if (!layer) return;
  const k = Math.min(1, dt * 4), t = _gw.t || 0, moving = gardenMotionOn();
  for (const f of _gfs.list.values()) {
    if (!f.node) { f.node = _gwEl('g', { class: 'gd-fs', opacity: '0' }); f.node.innerHTML = _gfsArt(f.def, f.cm); layer.appendChild(f.node); }   // (it was made before the stage was there)
    const dx = f.x - f.sx; if (Math.abs(dx) > 0.015) f.face = dx > 0 ? 1 : -1;
    f.sx += dx * k; f.sy += (f.y - f.sy) * k;
    if (f.a < 1) { f.a = Math.min(1, f.a + dt * 0.8); if (f.node) f.node.setAttribute('opacity', f.a.toFixed(2)); }
    if (f.st === GF_ST.nibble && f.n !== f.dn) { _gfsRing(f.x, f.y, 0.6); }
    if (f.st === GF_ST.swim && f.a >= 1 && ['epic', 'legendary'].includes(f.def.rarity)) { f.bub = (f.bub == null ? 2 + f.seed : f.bub) - dt; if (f.bub <= 0) { f.bub = 3 + Math.random() * 4; _gfsRing(f.sx, f.sy, 0.5); } }   // (rings on the surface give a great fish away)
    f.dn = f.n;
    if (f.st !== f.dst) { if (f.st === GF_ST.bite) { _gfsRing(f.x, f.y, 1.3); _gfsRing(f.x, f.y, 0.8); } else if (f.st === GF_ST.bolt) _gfsRing(f.sx, f.sy, 1.1); f.dst = f.st; }
    if (!f.node || !_gwInView(f.sx, f.sy, 1)) continue;
    const [px, py] = _gwPx(f.sx, f.sy);
    const fast = f.st === GF_ST.hooked ? 16 : f.st === GF_ST.bolt ? 12 : 3 + 2 * Math.min(1, 40 / Math.max(10, f.cm));
    const wob = moving ? Math.sin(t * fast + f.seed) * (f.st === GF_ST.hooked ? 11 : 4) : 0;
    f.node.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${wob.toFixed(1)}) scale(${f.face} 1)`);
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
}

/* ---------- the water, for the one who decides ---------- */
function _gfsBands(m) {
  const out = GF_SCHOOL.bands.map((b, i) => Object.assign({ key: 'b' + i }, b));
  for (const a of GARDEN_AREAS) if (a.water && !a.fishing && m.areas.includes(a.id)) { const w = a.water; out.push({ key: 'a' + a.id, zone: 'pond', x0: w.x + 0.4, x1: w.x + w.w - 0.4, y0: w.y + 0.3, y1: w.y + w.h - 0.3, n: GF_SCHOOL.pond }); }
  return out;
}
/** Somewhere in this water, clear of the pier. Near the pier a fish keeps to its own side, so it never swims under the planks in plain sight. */
function _gfsSpot(b0, near0) {
  const b = b0 || GF_SCHOOL.bands[0], inX = (v) => Math.max(b.x0, Math.min(b.x1, v)), inY = (v) => Math.max(b.y0, Math.min(b.y1, v));
  const near = near0 ? { x: inX(near0.x), y: inY(near0.y) } : null, lake = b.zone !== 'pond';   // (wherever it was asked to go, it stays in this water: a bolting fish once ran out over the farmland)
  for (let i = 0; i < 12; i++) {
    const x = near ? inX(near.x + (Math.random() - 0.5) * 8) : b.x0 + Math.random() * (b.x1 - b.x0);
    const y = near ? inY(near.y + (Math.random() - 0.5) * 3) : b.y0 + Math.random() * (b.y1 - b.y0);
    if (!gardenIsWater(Math.floor(x), Math.floor(y))) continue;
    const end = 17.4 + gardenPierMore();
    if (lake && y < end && x > 11.5 && x < 14.5) continue;
    if (lake && near && y < end && (x < 13) !== (near.x < 13)) continue;
    return { x, y };
  }
  return near;
}
function _gfsSpawn(b, m, at) {
  const p = at && gardenIsWater(Math.floor(at.x), Math.floor(at.y)) ? at : _gfsSpot(b); if (!p) return;
  const ctx = { zone: b.zone, tod: m.tod, season: m.season, rain: !!(m.rain && m.rain.now), level: m.level.level };
  // mostly real fish: a find (a boot, a pearl) is the odd small shadow, and water too deep for this garden's level still has what can live in it
  // further out the rare ones are likelier: the far end of the deep water is where the fins are
  const outward = b.zone === 'deep' ? 1 + Math.max(0, p.y - 17) / 2.5 : 1;
  let odds = gardenFishOdds(ctx).map(([k, w]) => { const d0 = gardenFishDef(k); return [k, d0.cat !== 'fish' ? w * GF_SCHOOL.finds : d0.rarity === 'common' ? w : w * outward]; });
  if (b.zone === 'deep' && !odds.some(([k]) => gardenFishDef(k).cat === 'fish')) odds = odds.concat(gardenFishOdds(Object.assign({}, ctx, { zone: 'mid' })).filter(([k]) => gardenFishDef(k).cat === 'fish'));
  const id = gardenFishPick(odds, Math.random), def = gardenFishDef(id); if (!def) return;
  // further out is bigger, in the same kind as well as in the kinds that live there
  const out = b.zone === 'pond' ? 0.05 : Math.max(0, Math.min(0.55, (p.y - 13) / 24));
  const cm = def.cat === 'fish' ? gardenFishSize(def, Math.random, out) : Math.round((def.cm[0] + def.cm[1]) / 2);
  const go = _gfsSpot(b, p) || p;
  _gfs.u = (_gfs.u + 1) % 1000;
  _gfsAdd({ u: _gfs.u, id, cm, x: p.x, y: p.y, tx: go.x, ty: go.y, band: b.key, life: GF_SCHOOL.life[0] + Math.random() * (GF_SCHOOL.life[1] - GF_SCHOOL.life[0]) });
  _gfs.dirty = true;
}
/** Every line in the water now: yours and, if you are the host, everyone's. Keyed by slot. */
function _gfsLinesNow() {
  const out = new Map(), F = _gw.fishing;
  if (F && (F.state === 'wait' || F.state === 'bite' || F.state === 'reel')) out.set(_gfsSlot(), { x: F.bx, y: F.by, bait: F.plan.baitDef || GARDEN_BAITS[0] });
  if (typeof _gll !== 'undefined' && _gll.role === 'host') for (const A of _gll.actors.values()) {
    const L = A.fish; if (!L || L.state === 'land') continue;
    const d = L.bait ? gardenGearDef(L.bait) : null;
    out.set(A.w, { x: L.bx, y: L.by, bait: d && d.kind === 'bait' ? d : GARDEN_BAITS[0] });
  }
  return out;
}
function _gfsBolt(f, b) {
  const ang = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 2;
  const near = { x: f.x + Math.cos(ang) * r, y: f.y + Math.sin(ang) * r * 0.5 };
  const go = b ? _gfsSpot(b, near) : null;   // (no water known for it: it darts about where it is)
  f.st = GF_ST.bolt; f.to = null; f.n = 0; f.cool = 8; f.tx = go ? go.x : f.x; f.ty = go ? go.y : f.y;
  _gfs.dirty = true;
}
function _gfsRun(dt) {
  // (the garden's model is worked out at most every 2 seconds here: this runs four times a second)
  const clk = performance.now();
  if (!_gfs.m || clk - _gfs.mAt > 2000) { try { _gfs.m = gardenHere(); _gfs.mAt = clk; } catch (e) { return; } }
  const m = _gfs.m; if (!m) return;
  const bands = _gfsBands(m), byKey = new Map(bands.map(b => [b.key, b])), lines = _gfsLinesNow(), E = GF_SCHOOL;
  // a float that has just landed frightens what is right under it
  for (const [slot, L] of lines) {
    const key = L.x + ',' + L.y;
    if (_gfs.seen.get(slot) !== key) { _gfs.seen.set(slot, key); for (const f of _gfs.list.values()) if (f.st === GF_ST.swim && Math.hypot(f.x - L.x, f.y - L.y) < E.spook) _gfsBolt(f, byKey.get(f.band)); }
  }
  for (const [slot, L] of lines) {
    if (!L.bait.st.chum || _gfs.chum.get(slot) === L.x + ',' + L.y || _gfs.list.size >= E.max) continue;
    _gfs.chum.set(slot, L.x + ',' + L.y);
    const b = bands.find(q => L.x >= q.x0 - 1 && L.x <= q.x1 + 1 && L.y >= q.y0 - 0.3 && L.y <= q.y1 + 0.3);
    if (b) _gfsSpawn(b, m, { x: L.x + (Math.random() < 0.5 ? -1.2 : 1.2), y: Math.max(b.y0, Math.min(b.y1, L.y + 0.5)) });
  }
  for (const slot of [..._gfs.seen.keys()]) if (!lines.has(slot)) _gfs.seen.delete(slot);
  const stomps = _gfsStomps();
  const fins = [..._gfs.list.values()].filter(f => gardenFishFin(f.def));
  const taken = new Set(); for (const f of _gfs.list.values()) if (f.to != null) taken.add(f.to);
  for (const f of [..._gfs.list.values()]) {
    f.cool = Math.max(0, f.cool - dt);
    const L = f.to != null ? lines.get(f.to) : null;
    if (f.to != null && (!L || Math.hypot(L.x - f.tx, L.y - f.ty) > 0.05)) {
      // that line has gone, or was cast somewhere else
      if (f.st === GF_ST.hooked) { _gfsDrop(f); _gfs.dirty = true; continue; }
      taken.delete(f.to); f.st = GF_ST.swim; f.to = null; f.n = 0; f.cool = 3; const go = _gfsSpot(byKey.get(f.band) || bands[0], f) || f; f.tx = go.x; f.ty = go.y; _gfs.dirty = true;
    }
    if (f.st === GF_ST.swim) {
      f.life -= dt;
      if (f.life <= 0) { _gfsDrop(f); _gfs.dirty = true; continue; }
      if (_gfsMove(f, dt)) { const go = _gfsSpot(byKey.get(f.band) || bands[0], f) || f; f.tx = go.x; f.ty = go.y; }   // (a new place to swim to goes with the next list: nothing is lost by waiting, and it costs far fewer messages)
      if (f.band !== 'x' && byKey.get(f.band) && byKey.get(f.band).zone !== 'deep') for (const s of stomps) if (Math.hypot(f.x - s.x, (f.y - s.y) * 1.2) < E.noise && Math.random() < E.noiseKeen * dt) { _gfsBolt(f, byKey.get(f.band)); if (s.me) _gfsStompSaid(); break; }
      if (f.st !== GF_ST.swim) continue;
      if (f.cm < 40 && fins.some(h => h !== f && Math.hypot(h.x - f.x, h.y - f.y) < E.hunter) && Math.random() < dt) { _gfsBolt(f, byKey.get(f.band)); continue; }
      if (f.cool > 0) continue;
      let best = null, bd = 1e9;
      for (const [slot, Q] of lines) {
        if (taken.has(slot)) continue;
        const d = Math.hypot(f.x - Q.x, f.y - Q.y), reach = E.reach + (Q.bait.st.lure || 0) * E.lureReach;
        if (d < reach && d < bd) { bd = d; best = { slot, Q }; }
      }
      if (!best) continue;
      const rare = best.Q.bait.st.rare || 0, kind = f.def.rarity;
      let keen = E.keen * (E.shy[kind] || 1) * (kind === 'common' ? 1 : 1 + rare * E.rareKeen);
      if ((best.Q.bait.st.night || gardenWorkOwned('night-lantern')) && m.tod === 'night') keen *= 1.6;
      if (kind !== 'common' && gardenWorkOwned('reed-beds')) keen *= 1.3;
      if (m.tod === 'dawn' || m.tod === 'dusk' || _gfsFrenzy()) keen *= E.feedTimes;
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
  const contest = typeof gardenContestLive === 'function' && !!gardenContestLive('fish');
  if (!contest && !_gfsFrenzy() && Math.random() < E.frenzy.chance * dt) { _gfs.frenzyUntil = performance.now() + E.frenzy.secs * 1000; _gfsSay2('The fish are feeding! For a little while there are more about.'); }
  const fast = contest ? E.contestGap : _gfsFrenzy() ? E.frenzy.gap : m.rain && m.rain.now ? 0.7 : 1;
  const count = new Map(); for (const f of _gfs.list.values()) count.set(f.band, (count.get(f.band) || 0) + 1);
  const empty = !_gfs.band.size;
  for (const b of bands) {
    const have = count.get(b.key) || 0, base = _gfsWant(b, m), want = contest ? base * E.contestMore : base + (_gfsFrenzy() ? E.frenzy.more : 0);
    if (empty) { if (b.zone === 'pond' || Math.random() < 0.7) _gfsSpawn(b, m); _gfs.band.set(b.key, E.gap[0] * Math.random()); continue; }   // (a garden you have just come into has a fish or two)
    if (have >= want || _gfs.list.size >= E.max) continue;
    const t = (_gfs.band.has(b.key) ? _gfs.band.get(b.key) : E.gap[0]) - dt;
    if (t > 0) { _gfs.band.set(b.key, t); continue; }
    _gfsSpawn(b, m); _gfs.band.set(b.key, (E.gap[0] + Math.random() * (E.gap[1] - E.gap[0])) * fast);
  }
}
/** The whole list to everyone there: when something changed, and now and then anyway. */
function _gfsTell() {
  if (typeof _gll === 'undefined' || _gll.role !== 'host' || !_glh.on || !_glhAnyone()) return;
  const now = Date.now();   // clock-ok: spacing
  if (now - _gfs.sentAt < (_gfs.dirty ? GF_SCHOOL.msgGap : GF_SCHOOL.beat)) return;
  _gfs.sentAt = now; _gfs.dirty = false;
  const n10 = (v) => Math.max(0, Math.min(640, Math.round(v * 10)));
  const l = [..._gfs.list.values()].slice(0, GF_SCHOOL.max).map(f => Object.assign({ u: f.u, e: f.id, c: Math.round(f.cm), x: n10(f.x), y: n10(f.y), tx: n10(f.tx), ty: n10(f.ty), st: f.st }, f.to != null ? { to: f.to } : {}, f.n ? { n: Math.min(9, f.n) } : {}));
  _glhSend('all', 'fs', { l });
}
/** A guest hears the host's water. Anything not listed has left it. */
function _gfsIn(l) {
  if (!_gfsGuest() || !Array.isArray(l)) return;
  if (!_gfs.hostSeen) { _gfsClear(); _gfs.hostSeen = true; }   // (what this screen made up until the host spoke)
  _gfs.hostAt = Date.now();   // clock-ok: when the host was last heard
  const seen = new Set();
  for (const r of l.slice(0, GF_SCHOOL.max)) {
    if (!r || !Number.isInteger(r.u) || !gardenFishDef(r.e)) continue;   // (one this version does not know)
    seen.add(r.u);
    const f = _gfs.list.get(r.u), to = r.to == null ? null : r.to;
    if (!f) { _gfsAdd({ u: r.u, id: r.e, cm: r.c, x: r.x / 10, y: r.y / 10, tx: r.tx / 10, ty: r.ty / 10, st: r.st, to, n: r.n }); continue; }
    f.x = r.x / 10; f.y = r.y / 10; f.tx = r.tx / 10; f.ty = r.ty / 10; f.st = r.st; f.to = to; f.n = r.n || 0;
  }
  for (const f of [..._gfs.list.values()]) if (!seen.has(f.u)) _gfsDrop(f);
}

/* ---------- a line and its fish ---------- */
/** The fish at your line, if there is one. */
function _gfsMine() { const me = _gfsSlot(); for (const f of _gfs.list.values()) if (f.to === me) return f; return null; }
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
function _gfsFrenzy() { return performance.now() < _gfs.frenzyUntil; }
function _gfsSay2(text) { if (typeof _gllFeed === 'function') _gllFeed(text); }
/** Who is stomping about: you, unless you are creeping, and anyone in your garden. */
function _gfsStomps() {
  const out = [], t = Date.now();   // clock-ok: how long a creep lasts
  if (_gw.moving && !_gw.sneak && !_gw.keys.has('shift')) out.push({ x: _gw.px, y: _gw.py, me: true });
  if (typeof _gll !== 'undefined' && _gll.role === 'host') for (const A of _gll.actors.values()) if (A.moving && !(A.sneakUntil > t)) out.push({ x: A.x, y: A.y });
  return out;
}
function _gfsStompSaid() { if (_gfs.stompSaid) return; _gfs.stompSaid = true; _gfsSay2('Your footsteps scared a fish. Hold Shift to creep near the water.'); }
/** A shadow somewhere in view, for a leap: it really is one of the fish there. */
function _gfsLeaper() {
  const l = [..._gfs.list.values()].filter(f => f.st === GF_ST.swim && f.def.cat === 'fish' && _gwInView(f.x, f.y, 0));
  return l.length ? l[Math.floor(Math.random() * l.length)] : null;
}

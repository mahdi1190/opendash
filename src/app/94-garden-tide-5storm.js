/* ============================================================
   STORM WASH-UPS (the tide, phase 2). After a rough night the next two low waters bring the storm's set up the strand with the
   usual glints (a lobster pot, a whale bone, a ship in a bottle, a glass float, rope; 94-garden-tide-0rules.js), and two things
   of their own:
     the sea chest   half buried on the open sand. "Haul the chest up the beach": lean back on its rope. Alone it takes a while
                     (about fifteen seconds, your pet tugging beside you); two or more hauling together, about three. Inside:
                     coins, timber or stone, and the first time a little anchor for your garden. Each hauler's own app gives
                     its own reward (friends are trusted: no shares, no gates).
     a bottle        a villager's message, washed up: a line in their own words, and the recipe it carries (the bench's next
                     bottle recipe, 94-garden-craft-0rules.js learn {bottle: 1}).
   Rough nights: the made-up sky's (gardenTideStormy: the same on every device, so it is told a day ahead, on the tide card and
   in a quiet line), and the real weather's when the app sees thunder or a gale in the evening or the night.
   Saved: g.wd['tds.<day>'] a rough night the weather brought (the last 30 kept); g.led['tdh.<day>'] your chest from that storm,
   g.led['tdh.<friend>.<day>'] one on a friend's strand; g.led['tdb.<day>'] the bottle.
   Live: tide|haul (to the host: I am hauling chest n), tide|heave (from the host: how far it has come, tt 0-100),
   tide|open (from the host: it is open; everyone who hauled takes their own).
   ============================================================ */
const _gts = { chest: null, chestKey: '', prog: 0, n: -1, hauling: 0, helpers: new Map(), heardAt: 0, hostProg: -1, sprite: null, tellT: 0, saidDay: -1, opened: new Set() };
const GT_BOTTLE_LINES = Object.freeze([
  'Pip: “I threw this off the far rocks to see where the sea would take it. It took it to you. Keep what is inside, I have plenty.”',
  'Bramble: “I drew the whole coast from the cliff top and ran out of paper, so the rest went on the back of this. It is a recipe now. Sorry.”',
  'Quince: “A recipe my mother swore by. Do not tell the others where you got it.”',
  'Tam: “I do not like the sea. I put this in it anyway, to be brave. Did it work?”',
  'Wick: “I counted the waves all night in the storm. There were a lot of them. Here is something for your trouble.”',
  'Mother Thistle: “If this finds you, the kettle is on. Mind the rocks, they are slippery after a blow.”',
]);
function _gtsDayOwn() { return Math.floor(gardenTideNow({ own: true }).lm / 1440); }
/** The day (days since 1970, local) of your last rough night, if it was last night or the night before, else -1. */
function gardenTideLastStorm() {
  try {
    const today = _gtsDayOwn(), g = _gdG(), seed = gardenTideSeed();
    for (const d of [today - 1, today - 2]) if (gardenTideStormy(d, seed) || g.wd['tds.' + d]) return d;
  } catch (e) { /* no storms */ }
  return -1;
}
/** The storm whose set lies on the strand at low water w: the night before that low water's day, if it was rough (yours from the
 *  made-up sky and the weather you saw, a friend's from their snapshot), as its day number, or -1. */
function gardenTideStormBefore(w) {
  const night = Math.floor(gardenTideWindowLow(w) / 1440) - 1;
  try {
    const m = gardenHere(), snap = m && m.visit ? m.visit.snap : null;
    if (snap) return snap.ti && snap.ti.s === night ? night : -1;
    return gardenTideStormy(night, gardenTideSeed()) || _gdG().wd['tds.' + night] ? night : -1;
  } catch (e) { return -1; }
}
function _gtsStormHere(w) { return gardenTideStormBefore(w); }
/** Where the storm's chest and bottle lie: on open sand in the low band, from the strand's number and the storm's day. */
function gardenTideChest(w) {
  const s = _gtsStormHere(w); if (s < 0 || !GardenTide.ready()) return null;
  const pools = typeof gardenTideOnPool === 'function' ? gardenTidePools().length : 0, F = GardenTide.field(), seed = gardenTideSeed(), key = seed + '|' + s + '|' + F.rev + '|' + pools;   // (once the vale has drawn its rock pools, the chest keeps off them)
  if (_gts.chestKey === key) return _gts.chest;
  const W = GARDEN_WORLD, r = gardenRand(gardenHash('tide-chest|' + key)), zones = [...F.bandZ.keys()].filter(z => _gtcOpenZone(z)).sort((a, b) => a - b);
  let chest = null, bottle = null;
  for (const z of zones) {
    const list = F.bandZ.get(z) || [];
    for (let k = 0; k < 80 && list.length; k++) {
      const at = list[Math.floor(r() * list.length)], tx = at % F.FW, ty = (at - tx) / F.FW, x = (tx + .5) * F.P / W.cellW, y = ((ty + .5) * F.P - W.sky) / W.cellH, h = GardenTide.h(x, y);
      if (!(h > 12 && h < 34) || F.K[at] !== 1 || !gardenTideOpenSand(x, y, true) || pools && gardenTideOnPool(x, y, 16)) continue;   // (on open sand with room to stand and haul, never on a wall's face or a rock pool's shelf)
      if (!chest) { chest = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, h, day: s, n: s % 1000 }; continue; }
      if (!bottle && Math.hypot(chest.x - x, chest.y - y) > 3) { bottle = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, h, day: s }; break; }
    }
    if (chest && bottle) break;
  }
  _gts.chest = chest ? { chest, bottle } : null; _gts.chestKey = key;
  return _gts.chest;
}
function _gtsChestKey(day) { return (_gtcVisit() ? 'tdh.' + _gtcFriendTag() + '.' : 'tdh.') + day; }
function _gtsBottleKey(day) { return (_gtcVisit() ? 'tdbv.' + _gtcFriendTag() + '.' : 'tdb.') + day; }
/** Rows for the prompt: the chest to haul, the bottle to open (at low water, after a storm). */
function gardenTideStormRows(px, py, T) {
  const out = [], C = gardenTideChest(T.w); if (!C) return out;
  const g = _gdG(), c = C.chest, b = C.bottle;
  if (c && !g.led[_gtsChestKey(c.day)] && c.h > T.line + 2 && Math.hypot(c.x - px, (c.y - py) * 1.3) <= 2) out.push({ key: 'tide:c:' + c.day, act: 'heave', tide: { kind: 'chest', day: c.day }, words: 'Haul the chest up the beach', name: 'the sea chest', x: c.x, y: c.y, stand: gardenTideStandFree([{ x: c.x, y: c.y + .95 }, { x: c.x - .7, y: c.y + .82 }, { x: c.x + .7, y: c.y + .82 }, { x: c.x - 1.2, y: c.y + .5 }, { x: c.x + 1.2, y: c.y + .5 }], px, py), pri: .7 });
  if (b && !g.led[_gtsBottleKey(b.day)] && b.h > T.line + 2 && Math.hypot(b.x - px, (b.y - py) * 1.3) <= 1.7) out.push({ key: 'tide:b:' + b.day, act: 'scoop', tide: { kind: 'bottle', day: b.day }, words: 'Pick up the bottle', name: 'a bottle', x: b.x, y: b.y, stand: { x: b.x, y: b.y + .12 }, pri: .65 });
  return out;
}
function gardenTideStormRun(spot) {
  const t = spot.tide;
  if (t.kind === 'bottle') return _gtcDo('scoop', spot, () => _gtsBottle(t.day), .62);
  if (t.kind === 'chest') {
    // hauling is held: the heave goes on until the chest is up or you walk away
    if (_gts.day !== t.day) _gts.prog = 0;
    _gts.n = t.day % 1000; _gts.day = t.day; _gts.hostProg = -1; _gts.last = 0;
    return _gtcDo('heave', spot, () => { _gts.hauling = performance.now(); _gtsHaulLoop(); }, .2);
  }
  return false;
}
/** A villager's bottle: their line, and the bench's next bottle recipe. */
function _gtsBottle(day) {
  const g = _gdG(), m = gardenModel(), key = _gtsBottleKey(day); if (g.led[key]) return;
  const r = gardenRand(gardenHash('tide-bottle|' + gardenTideSeed() + '|' + day)), line = GT_BOTTLE_LINES[Math.floor(r() * GT_BOTTLE_LINES.length)];
  let rec = null; try { const left = (typeof GARDEN_RECIPES !== 'undefined' ? GARDEN_RECIPES : []).filter(q => q.learn && q.learn.bottle && !(m.wallet.items['recipe:' + q.id] > 0)); if (left.length) rec = left[Math.floor(r() * left.length)]; } catch (e) { rec = null; }
  g.led[key] = { d: m.today, k: 'rc', i: rec ? { ['recipe:' + rec.id]: 1 } : {}, c: rec ? 0 : 10, x: 2, n: 1 };
  _gdSave();
  if (rec) _gdEmit('recipe', { ids: [rec.id], bottle: 1 });
  try { gardenMessage('A message in a bottle. ' + line + (rec ? ' Inside: a recipe for ' + rec.name.toLowerCase() + '.' : ' Inside: ten coins, a bit damp.'), { icon: 'mail', ms: 9000 }); } catch (e) { /* fine */ }
}
/** While you heave: the chest comes up the beach (alone slowly, two or more fast). In a live garden the host counts the haulers. */
function _gtsHaulLoop() {
  const cur = typeof _ga !== 'undefined' ? _ga.cur : null;
  if (!(cur && cur.doing && cur.id === 'heave')) { _gts.hauling = 0; _gtsBar(null); return; }
  const now = performance.now(), dt = Math.min(1.2, (now - (_gts.last || now)) / 1000), role = typeof _gll !== 'undefined' ? _gll.role : '';
  const host = role === 'host' && typeof _glh !== 'undefined' && _glh.on, guest = role === 'visit' && typeof _glvLive === 'function' && _glvLive(), heard = guest && _gts.hostProg >= 0 && now - _gts.heardAt < 2500;
  _gts.last = now; _gts.hauling = now;
  if (guest && now - _gts.tellT > 900) { _gts.tellT = now; try { gardenLiveFx('tide', 'haul', { n: _gts.n }); } catch (e) { /* alone */ } }
  if (host) { _gts.self = now; _gtsHostTick(); }
  else if (heard) _gts.prog = _gts.hostProg / 100;   // (the host's chest: its word is the truth)
  else { const pet = typeof gpPetMe === 'function' && gpPetMe() ? 1 : 0; _gts.prog = Math.min(1, _gts.prog + dt / (15 - pet * 3)); }   // (alone, your pet tugging beside you)
  _gtsBar(_gts.prog);
  if (_gts.prog >= 1 && !host && !heard) { _gtsOpen(_gts.day); return; }
  setTimeout(_gtsHaulLoop, 120);
}
/** The host's count: everyone hauling chest n (the host too), and how far it has come, told to all; the lid comes up at the top. */
function _gtsHostTick() {
  if (_gts.hostOn) return;
  _gts.hostOn = true; _gts.hostLast = performance.now();
  const step = () => {
    const now = performance.now(), dt = Math.min(1.2, (now - _gts.hostLast) / 1000); _gts.hostLast = now;
    for (const [k, t] of _gts.helpers) if (now - t > 1800) _gts.helpers.delete(k);
    const self = now - (_gts.self || 0) < 450 ? 1 : 0, count = _gts.helpers.size + self;
    if (!count) { _gts.hostOn = false; return; }
    const pet = self && typeof gpPetMe === 'function' && gpPetMe() ? 1 : 0;
    _gts.prog = Math.min(1, _gts.prog + dt * (count >= 2 ? 1 / 3 : 1 / (15 - pet * 3)));
    if (now - (_gts.toldT || 0) > 500 || _gts.prog >= 1) { _gts.toldT = now; try { gardenLiveFx('tide', 'heave', { n: _gts.n, tt: Math.round(_gts.prog * 100) }); } catch (e) { /* alone */ } }
    if (_gts.prog >= 1) { _gts.hostOn = false; try { gardenLiveFx('tide', 'open', { n: _gts.n }); } catch (e) { /* alone */ } if (self) _gtsOpen(_gts.day); else { _gts.prog = 0; _gts.helpers.clear(); } return; }
    setTimeout(step, 200);
  };
  setTimeout(step, 200);
}
/** The chest is up the beach: your own reward, once per storm. */
function _gtsOpen(day) {
  const g = _gdG(), m = gardenModel(), key = _gtsChestKey(day);
  _gts.prog = 0; _gtsBar(null); try { if (typeof gartActStop === 'function') gartActStop(true); } catch (e) { /* fine */ }
  if (g.led[key]) return;
  const r = gardenRand(gardenHash('tide-chestin|' + day)), mat = r() < .5 ? 'mat:timber' : 'mat:stone', first = !g.disc['td.chest'];
  const i = { [mat]: 3 }; if (first) i['decor:play-sv-harbour'] = 1;
  g.led[key] = { d: m.today, k: 'td', c: 40, i, x: 4, n: 1 };
  if (first) g.disc['td.chest'] = m.today;
  _gdSave();
  try { gardenCatchMoment('shore', 'storm-chest', { isNew: first }); } catch (e) { /* only a picture */ }
  setTimeout(() => { try { gardenToast(`The sea chest creaks open: 40 coins and three ${mat === 'mat:timber' ? 'timber' : 'stone'}${first ? ', and a little anchor for your garden' : ''}.`, { icon: 'gift', timeout: 6500 }); } catch (e) { /* fine */ } }, 2700);
  _gdEmit('tide', { chest: day });
}
/** A small bar over your head while you haul. */
function _gtsBar(p) {
  const box = typeof _gw !== 'undefined' && _gw.box; if (!box) return;
  let el = _gts.bar;
  if (p == null) { if (el) { el.remove(); _gts.bar = null; } return; }
  if (!el || !el.isConnected) { el = _gts.bar = document.createElement('div'); el.className = 'gt-haul'; el.setAttribute('role', 'progressbar'); el.setAttribute('aria-label', 'Hauling the chest'); el.style.cssText = 'position:absolute;left:0;top:0;width:86px;height:9px;border-radius:5px;background:rgba(40,36,28,.55);box-shadow:0 1px 3px rgba(0,0,0,.3);pointer-events:none;z-index:6;overflow:hidden'; el.innerHTML = '<i style="display:block;height:100%;width:0;background:linear-gradient(#f2d27a,#c8963a);border-radius:5px"></i>'; box.appendChild(el); }
  const s = typeof _ghProject === 'function' ? _ghProject(_gw.px, _gw.py - 2.6) : null; if (s) el.style.transform = `translate(${Math.round(s.x - 43)}px, ${Math.round(s.y)}px)`;
  el.firstChild.style.width = Math.round(p * 100) + '%'; el.setAttribute('aria-valuenow', String(Math.round(p * 100)));
}
/** Live: a friend hauling (the host counts them), the host's word on how far it has come, and the lid coming up. */
function gardenTideStormFx(A, ev) {
  const e = String(ev.e || ''), now = performance.now();
  if (e === 'haul') {
    if (typeof _gll === 'undefined' || _gll.role !== 'host') return;
    const C = gardenTideChest(gardenTideNow().w); if (!C || !C.chest || C.chest.n !== Number(ev.n)) return;
    if (_gts.day !== C.chest.day) { _gts.day = C.chest.day; _gts.n = C.chest.n; _gts.prog = 0; }
    _gts.helpers.set(A && A.w != null ? A.w : 'x', now); _gtsHostTick(); return;
  }
  if (e === 'heave') { if (Number(ev.n) === _gts.n) { _gts.hostProg = Number(ev.tt) || 0; _gts.heardAt = now; } return; }
  if (e === 'open') { if (Number(ev.n) === _gts.n && _gts.hauling && now - _gts.hauling < 60000) _gtsOpen(_gts.day); }
}

/* ---------- drawn: the chest and the bottle on the sand while they are there ---------- */
const GardenTideStormSprites = {
  id: 'storm',
  paint(scene, root) { this.scene = scene; this.root = root; this.t = 0; },
  clear() { for (const k of ['chest', 'bottle']) if (this[k]) { try { this[k].destroy(); } catch (e) { /* gone */ } this[k] = null; } this.scene = null; },
  tick(time, view, T, vis) {
    const scene = this.scene; if (!scene || time - this.t < 400) return; this.t = time;
    if (typeof _gtc === 'undefined' || !_gtc.atlas || !scene.textures.exists(GT_ATLAS)) return;
    const C = vis ? gardenTideChest(T.w) : null, g = _gdG(), W = GARDEN_WORLD;
    for (const [k, frame, size, taken] of [['chest', 'f-storm-chest', 34, C && C.chest ? g.led[_gtsChestKey(C.chest.day)] : 1], ['bottle', 'f-bottle-note', 16, C && C.bottle ? g.led[_gtsBottleKey(C.bottle.day)] : 1]]) {
      const at = C && C[k], show = !!(at && !taken && at.h > T.line + 2);
      if (show && !this[k]) { this[k] = scene.add.image(0, 0, GT_ATLAS, frame).setDepth(-9345.17).setOrigin(.5, .7); this.root.add(this[k]); if (this.root.sort) this.root.sort('depth'); }
      if (this[k]) { this[k].setVisible(show); if (show) this[k].setPosition(at.x * W.cellW, W.sky + at.y * W.cellH).setScale(size / 44).setRotation(k === 'chest' ? -.08 : .5); }
    }
  },
};
if (window.GardenPaintTide) GardenPaintTide.parts.push(GardenTideStormSprites);
GT_ROW_SOURCES.push((px, py, T) => gardenTideStormRows(px, py, T));
GT_RUN.chest = GT_RUN.bottle = (spot) => gardenTideStormRun(spot);

/* ---------- rough nights: the weather's, recorded; the made-up sky's, told a day ahead ---------- */
setTimeout(() => {
  if (typeof wdMod !== 'function') return;
  wdMod({ id: 'tide-storm', visit: false, fun: false,
    begin() { this.t = 0; },
    tick() {
      const now = Date.now(); if (now - this.t < 60000) return; this.t = now;   // clock-ok: once a minute
      try {
        const T = gardenTideNow({ own: true }), day = Math.floor(T.lm / 1440), h = (T.lm % 1440) / 60, g = _gdG();
        const w = typeof _gdWeather === 'function' ? _gdWeather() : null, cur = w && w.current || {};
        if ((cur.cond === 'thunder' || Number(cur.wind) >= 45) && (h >= 17 || h < 6)) { const d = h < 6 ? day - 1 : day; if (!g.wd['tds.' + d]) { g.wd['tds.' + d] = 1; for (const k of Object.keys(g.wd)) if (/^tds\.\d+$/.test(k) && Number(k.slice(4)) < day - 30) delete g.wd[k]; _wdSave(); } }
        // a day ahead: the made-up sky's storm tonight, said once in the afternoon when you are in the garden
        if (h >= 12 && _gts.saidDay !== day && gardenTideStormy(day, gardenTideSeed())) { _gts.saidDay = day; gardenMessage('The wind is getting up. A storm is due tonight: tomorrow’s low water will be full of things.', { icon: 'cloud', ms: 7000 }); }
      } catch (e) { /* the sky can wait */ }
    },
  });
}, 0);

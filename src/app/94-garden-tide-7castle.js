/* ============================================================
   SANDCASTLES BEFORE THE TIDE (FUN-ROADMAP phase 2, theme A). On any open stretch of sand the tide reaches (94-garden-tide-0rules.js:
   sand, not rock or a river's mud, clear of paths and standing things), "Build a sandcastle": you kneel and pat up a keep on a mound.
   Then, beside it: "Add a tower", "Add a wall", "Dig a moat", "Press a shell in" (a window, from one of your own shells). Up to nine
   pieces round the keep. When it has six, one of the vale's folk comes down the sand and plants a little flag on the keep.
   The tide always wins: when the water comes up to it, it goes with a splash (worked out from the clock, so every screen sees it go at
   the same moment). A moat fills with water first, as the tide comes near.
   Friends see your castles (the snapshot's ti.c: [uid, x tenths, y tenths, look, built minute]) and in a live garden build with you:
   a guest's piece goes to the host (tide|castle), who adds it and tells everyone (tide|cset). On a friend's beach when they are away,
   a castle you build is yours to look at until you leave ("It will be gone by high water anyway").
   Rewards: the first castle of the day, 5 coins and a little XP; a flag, 15 coins (and the first time, a shore rosette for your garden).
   The look (20 bits): two bits for each of the nine places (0 none, 1 tower, 2 wall, 3 tower with a shell window), the moat (bit 18),
   the flag (bit 19). Saved: g.wd['tdc.<uid>'] = [x10, y10, look, built minute, flag villager] (0 once the tide has taken it).
   ============================================================ */
const GT_CASTLE = Object.freeze({ max: 6, near: 1.8, pieces: 9, flagAt: 6, lifeMin: 36 * 60, K: 3, rosette: 'shore-rosette' });
// the nine places round the keep (world px from the keep's foot): towers fill the corners first, walls the sides and the front
const GT_CSLOT = Object.freeze([[-17, -6], [17, -6], [0, -9], [-24, 2], [24, 2], [-15, 9], [15, 9], [-5, 11], [5, 11]]);
const GT_CTOWER = Object.freeze([5, 6, 0, 1, 2, 3, 4, 7, 8]), GT_CWALL = Object.freeze([3, 4, 2, 7, 8, 0, 1, 5, 6]);
const GT_CFLAG = Object.freeze({
  pip: 'Pip comes splashing up out of the shallows, looks at every tower in turn and plants a little flag on the keep. “Best on the beach.”',
  quince: 'Quince stops on the way past, walks all the way round it and pushes a little flag into the keep. “For the best castle on the shore.”',
  bramble: 'Bramble draws your castle in a sketchbook, then plants a little flag on the keep. “Worth drawing,” which is high praise.',
  tam: 'Tam pops up out of the sand right beside it, which makes you jump, and leaves a little flag on the keep. “Good digging.”',
  thistle: 'Mother Thistle comes down the sand to look, says “Well, I never,” and plants a little flag on the keep.',
  wick: 'Wick lands on the tallest tower, looks at you for a long moment, and leaves a little flag behind when he goes.',
});
const _gtk = { live: new Map(), local: [], mine: new Set(), drawn: new Map(), flagAt: new Map(), saidVisit: false, washMemo: new Map(), listT: 0, list: [] };

/* ---------- the look ---------- */
function _gtkSlot(look, i) { return (look >> (2 * i)) & 3; }
function _gtkSet(look, i, v) { return (look & ~(3 << (2 * i))) | ((v & 3) << (2 * i)); }
function _gtkPieces(look) { let n = 0; for (let i = 0; i < 9; i++) if (_gtkSlot(look, i)) n++; return n + ((look >> 18) & 1); }
function _gtkHas(look, bit) { return ((look >> bit) & 1) === 1; }
/** The next free place for a tower or a wall, or -1. */
function _gtkFree(look, order) { for (const i of order) if (!_gtkSlot(look, i)) return i; return -1; }
/** Add a piece to a look: 1 tower, 2 wall, 3 a shell in a tower, 4 the moat. Returns the new look, or -1 when it does not fit. */
function gardenTideCastleAdd(look, piece) {
  if (piece === 1 || piece === 2) { const i = _gtkFree(look, piece === 1 ? GT_CTOWER : GT_CWALL); return i < 0 ? -1 : _gtkSet(look, i, piece); }
  if (piece === 3) { for (const i of GT_CTOWER) if (_gtkSlot(look, i) === 1) return _gtkSet(look, i, 3); return -1; }
  if (piece === 4) return _gtkHas(look, 18) ? -1 : look | (1 << 18);
  return -1;
}

/* ---------- whose castles, and whether the tide has had them ---------- */
/** The highest the water has stood (px of flood height) between two moments (ms) on this garden's clock: the ends, and every high
 *  water in between, each at its own day's moon. */
function _gtkMaxLine(t0, t1) {
  const tz = typeof _gtdTz === 'function' ? _gtdTz() : undefined, a = gardenTideLocalMin(t0, tz), b = gardenTideLocalMin(t1, tz);
  const line = (lm) => gardenTideLevel(lm) * (GARDEN_TIDE.reach[gardenTideMoon(_gtdIso(lm)).kind] || GARDEN_TIDE.reach.usual);
  let best = Math.max(line(a), line(b));
  const P = GARDEN_TIDE.period, hi0 = GARDEN_TIDE.lowMin + P / 2;
  for (let k = Math.ceil((a - hi0) / P), n = 0; n < 8; k++, n++) { const m = hi0 + k * P; if (m > b) break; if (m >= a) best = Math.max(best, line(m)); }
  return best;
}
/** Has the tide taken this castle (or is it simply too old)? c: {x, y, b (built, minutes since 1970)}. */
function gardenTideCastleWashed(c, now) {
  now = Number.isFinite(now) ? now : _gtdNowMs();
  if (!(c.b > 0) || now / 60000 - c.b > GT_CASTLE.lifeMin) return true;
  const h = gardenTideH(c.x, c.y); if (!Number.isFinite(h)) return false;   // (no field yet: say nothing)
  const key = c.uid + '|' + c.b + '|' + Math.floor(now / 60000);
  if (_gtk.washMemo.has(key)) return _gtk.washMemo.get(key);
  const w = _gtkMaxLine(c.b * 60000, now) >= h - 1.5;
  if (_gtk.washMemo.size > 60) _gtk.washMemo.clear(); _gtk.washMemo.set(key, w);
  return w;
}
function _gtkRow(uid, v) { return Array.isArray(v) && v.length >= 4 ? { uid, x: v[0] / 10, y: v[1] / 10, look: v[2] | 0, b: Number(v[3]) || 0, by: v[4] || '' } : null; }
/** Every castle on this beach now (the tide has not had yet): yours, or the friend's you are visiting (their snapshot, what the host has
 *  said since in a live garden, and on an offline visit the ones you built yourself). */
function gardenTideCastles() {
  const now = performance.now(); if (now - _gtk.listT < 300) return _gtk.list;
  _gtk.listT = now;
  const out = [], snap = typeof gardenShoreVisit === 'function' ? gardenShoreVisit() : null;
  if (!snap) {
    const W = _gdG().wd;
    for (const k of Object.keys(W)) if (k.startsWith('tdc.')) { const c = _gtkRow(k.slice(4), W[k]); if (c) { c.own = true; out.push(c); } }
  } else {
    const seen = new Set();
    for (const c of _gtk.live.values()) { out.push(c); seen.add(c.uid); }
    for (const q of (snap.ti && snap.ti.c) || []) { if (seen.has(q[0])) continue; const c = _gtkRow(q[0], q.slice(1)); if (c) out.push(c); }
    for (const c of _gtk.local) out.push(c);
  }
  _gtk.list = out.filter(c => !gardenTideCastleWashed(c));
  return _gtk.list;
}
/** For the snapshot (gardenTideWire): your castles the tide has not taken, the newest first, six at most. */
function gardenTideCastleWire() {
  if (typeof gardenShoreVisit === 'function' && gardenShoreVisit()) return [];
  const W = _gdG().wd, out = [];
  for (const k of Object.keys(W)) if (k.startsWith('tdc.')) { const c = _gtkRow(k.slice(4), W[k]); if (c && !gardenTideCastleWashed(c) && /^[a-z0-9-]{1,32}$/.test(c.uid)) out.push(c); }
  out.sort((a, b) => b.b - a.b);
  return out.slice(0, GT_CASTLE.max).map(c => [c.uid, Math.round(c.x * 10), Math.round(c.y * 10), c.look & 1048575, Math.min(99999999, Math.round(c.b))]);
}
/** Forget your castles the tide took (kept as 0 a day, so another device of yours agrees, then dropped). */
function _gtkTidy() {
  const W = _gdG().wd; let n = 0;
  for (const k of Object.keys(W)) {
    if (!k.startsWith('tdc.')) continue;
    const v = W[k]; if (v === 0) { if (!_gtk.zero) _gtk.zero = new Map(); const t = _gtk.zero.get(k) || Date.now(); _gtk.zero.set(k, t); if (Date.now() - t > 6 * 3600000) { delete W[k]; n++; } continue; }   // clock-ok: only paces the tidy
    const c = _gtkRow(k.slice(4), v); if (!c || gardenTideCastleWashed(c)) { W[k] = 0; n++; }
  }
  if (n) _wdSave();
}

/* ---------- where a castle can go ---------- */
/** Open sand the tide reaches but has not reached yet, clear of everything else on the shore. */
function _gtkCanBuild(x, y, T) {
  if (!GardenTide.ready() || gardenTideFieldKind(x, y) !== 1) return false;
  const h = gardenTideH(x, y); if (!(h >= 10 && h <= GARDEN_TIDE.reach.big * .9) || h < T.line + 8) return false;
  // (its own patch of sand clear of paths and things, a little either side, sand under its moat, the sand's own height there (never
  // ground rising to a quay or a path), and room to kneel behind it)
  if (_gtdCrowded(x, y, true) || _gtdCrowded(x - .5, y) || _gtdCrowded(x + .5, y) || !gardenIslandLandContains(x, y + .45)) return false;
  if (Math.abs(h - gardenIslandCoastDistance(x, y)) > 16 || !gardenTideOpenSand(x, y - .6)) return false;
  for (const c of gardenTideCastles()) if (Math.hypot(c.x - x, (c.y - y) * 1.3) < 2.3) return false;
  try { for (const p of gardenTidePools()) if (Math.hypot(p.x - x, (p.y - y) * 1.3) < 2.2) return false; } catch (e) { /* no pools */ }
  try { for (const s of gardenTideStones()) if (Math.hypot(s.x - x, (s.y - y) * 1.3) < 1.3) return false; } catch (e) { /* no stones */ }
  try { const C = gardenTideChest(T.w); if (C) for (const q of [C.chest, C.bottle]) if (q && Math.hypot(q.x - x, (q.y - y) * 1.3) < 1.8) return false; } catch (e) { /* no storm */ }
  try { for (const b of gardenTideBoards()) if (Math.hypot(b.x - x, (b.y - y) * 1.3) < 2) return false; } catch (e) { /* no cards */ }
  return true;
}
function _gtkStands(c, px, py) { return gardenTideStandFree([{ x: c.x, y: c.y - .62 }, { x: c.x - .62, y: c.y - .5 }, { x: c.x + .62, y: c.y - .5 }, { x: c.x - 1.05, y: c.y - .12 }, { x: c.x + 1.05, y: c.y - .12 }], px, py); }
/** Rows for the prompt: build one here, or add to the one beside you. */
function gardenTideCastleRows(px, py, T) {
  const out = [];
  if (T.level > .82) return out;   // (the sea is in: nothing to build on)
  let near = null, nd = GT_CASTLE.near;
  for (const c of gardenTideCastles()) { const d = Math.hypot(c.x - px, (c.y - .5 - py) * 1.3); if (d < nd) { nd = d; near = c; } }
  if (near) {
    const c = near, stand = _gtkStands(c, px, py), base = { x: c.x, y: c.y, stand, promptY: c.y - 1.6, pri: .62 };
    const add = (piece, words) => { if (gardenTideCastleAdd(c.look, piece) >= 0) out.push(Object.assign({ key: 'tide:c:' + c.uid + ':' + piece, act: 'build', tide: { kind: 'castle', uid: c.uid, piece }, words, name: 'the sandcastle' }, base)); };
    add(1, 'Add a tower'); add(2, 'Add a wall'); add(4, 'Dig a moat round it');
    if (_gtkShell()) add(3, 'Press a shell in for a window');
    if (!out.length) out.push(Object.assign({ key: 'tide:c:' + c.uid + ':look', act: 'look', tide: { kind: 'castle-look', uid: c.uid }, words: 'Look at the sandcastle', name: 'the sandcastle' }, base));
    return out;
  }
  // a new one, just in front of you (you kneel behind it, facing out)
  const x = Math.round(px * 10) / 10, y = Math.round((py + .62) * 10) / 10, key = x + '|' + y + '|' + T.w + '|' + gardenTideCastles().length, now = performance.now();
  if (_gtk.canKey !== key || now - _gtk.canT > 1500) { _gtk.canKey = key; _gtk.canT = now; _gtk.can = _gtkCanBuild(x, y, T); }   // (asked five times a second while you stand there: worked out once)
  if (_gtk.can) out.push({ key: 'tide:c:new', act: 'build', tide: { kind: 'castle', uid: '', piece: 9, at: { x, y } }, words: 'Build a sandcastle', name: 'a sandcastle', x, y, stand: { x: px, y: py }, promptY: py - 1.6, pri: .2 });
  return out;
}
/** A shell of yours to press into a tower: the one you have most of. */
function _gtkShell() {
  try { const items = gardenWallet().items || {}; let best = null, bn = 0; for (const [k, n] of Object.entries(items)) { if (!k.startsWith('sh:') || !(n > 0)) continue; const d = gardenTideFindDef(k); if (d && d.what === 'shell' && n > bn) { bn = n; best = d; } } return best; } catch (e) { return null; }
}

/* ---------- building ---------- */
function gardenTideCastleRun(spot) {
  const t = spot.tide;
  if (t.kind === 'castle-look') { const c = gardenTideCastles().find(q => q.uid === t.uid); if (c) gardenShoreSay(_gtkWords(c), 'flag', 6000); return true; }
  return _gtcDo('build', spot, () => _gtkDo(t), .82);
}
function _gtkWords(c) {
  const n = _gtkPieces(c.look), T = gardenTideNow(), h = gardenTideH(c.x, c.y), mins = _gtkMinutesLeft(c, T);
  const left = mins == null ? '' : mins < 50 ? ' The tide is nearly at it.' : mins < 180 ? ` The tide will reach it in about ${Math.round(mins / 30) / 2} hours.` : ' The tide is a long way off yet.';
  void h;
  return `A sandcastle with ${n ? n + ' piece' + (n === 1 ? '' : 's') + ' round its keep' : 'just its keep so far'}${_gtkHas(c.look, 19) ? ', and a flag on top' : ''}.${left}`;
}
/** Minutes until the water reaches a castle on today's clock, or null when it will not in the next twelve hours. */
function _gtkMinutesLeft(c, T) {
  const h = gardenTideH(c.x, c.y); if (!Number.isFinite(h)) return null;
  for (let m = 0; m <= 720; m += 10) { const lm = T.lm + m, line = gardenTideLevel(lm) * (GARDEN_TIDE.reach[gardenTideMoon(_gtdIso(lm)).kind] || 44); if (line >= h - 1.5) return m; }
  return null;
}
function _gtkDo(t) {
  const live = gardenShoreLive(), snap = gardenShoreVisit(), T = gardenTideNow();
  let piece = t.piece, uid = t.uid;
  if (piece === 9) {
    const at = t.at; if (!at || !_gtkCanBuild(at.x, at.y, T)) { gardenShoreSay('Not here: the sand is not right for a castle just now.'); return; }
    uid = _gdUid('c').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
    const b = Math.round(_gtdNowMs() / 60000);
    if (live === 'guest') { gardenLiveFx('tide', 'castle', { v: uid, i: Math.round(at.x * 10) + '-' + Math.round(at.y * 10), n: 9 }); _gtk.live.set(uid, { uid, x: at.x, y: at.y, look: 0, b }); }
    else if (snap) { _gtk.local.push({ uid, x: at.x, y: at.y, look: 0, b, local: true }); if (!_gtk.saidVisit) { _gtk.saidVisit = true; gardenShoreSay('A castle on a friend’s beach. It will be gone by high water anyway.', 'flag', 6000); } }
    else {
      const W = _gdG().wd;
      if (gardenTideCastles().filter(c => c.own).length >= GT_CASTLE.max) { gardenShoreSay('Six castles is plenty for one beach. The tide will make room soon.'); return; }
      W['tdc.' + uid] = [Math.round(at.x * 10), Math.round(at.y * 10), 0, b, ''];
      _wdSave(); if (live === 'host') _gtkTell(uid);
    }
    _gtk.mine.add(uid); _gtk.listT = 0;
    gardenShoreGive('tdcd.' + _gdToday(), { c: 5, x: 3 }, 'Your first sandcastle of the day: 5 coins.', { icon: 'flag', after: 600 });
    gardenShoreEmit('castle', { first: true });
    try { gardenSfx('pat'); } catch (e) { /* quiet */ }
    return;
  }
  const c = gardenTideCastles().find(q => q.uid === uid); if (!c) { gardenShoreSay('The tide has taken that one.'); return; }
  const look = gardenTideCastleAdd(c.look, piece); if (look < 0) return;
  if (piece === 3) { const sh = _gtkShell(); if (!sh) { gardenShoreSay('You have no shells to press in. The sand at low water has plenty.'); return; } _gdLed('tf', { i: { ['sh:' + sh.id]: -1 }, n: 1 }); _gdSaveQuiet(); gardenShoreSay(`You press ${/^[aeiou]/i.test(sh.name) ? 'an' : 'a'} ${sh.name.toLowerCase()} into the tower for a window.`, 'sparkles', 3500); }
  if (live === 'guest' && !c.local) { gardenLiveFx('tide', 'castle', { v: uid, i: 'p', n: piece }); _gtk.live.set(uid, Object.assign({}, c, { look })); }
  else if (c.local) c.look = look;
  else if (!snap) { _gtkSave(uid, look); if (live === 'host') _gtkTell(uid); }
  _gtk.mine.add(uid); _gtk.listT = 0;
  gardenShoreEmit('castle', { piece, pieces: _gtkPieces(look) });
  if (!snap && _gtkPieces(look) >= GT_CASTLE.flagAt && !_gtkHas(look, 19)) _gtkFlagSoon(uid);
}
function _gtkSave(uid, look, by) { const W = _gdG().wd, v = W['tdc.' + uid]; if (!Array.isArray(v)) return; const n = v.slice(); n[2] = look; if (by != null) n[4] = by; W['tdc.' + uid] = n; _wdSave(); _gtk.listT = 0; }
/** The host tells everyone how a castle stands now. */
function _gtkTell(uid) {
  const c = _gtkRow(uid, _gdG().wd['tdc.' + uid]); if (!c) return;
  try { gardenLiveFx('tide', 'cset', { v: uid, i: c.look.toString(36) + '-' + Math.round(c.x * 10) + '-' + Math.round(c.y * 10), tt: Math.round(c.b) }); } catch (e) { /* alone */ }
}
/** Six pieces: one of the folk comes by and plants a flag (half a minute later, while you admire it). */
function _gtkFlagSoon(uid) {
  if (_gtk.flagAt.has(uid)) return; _gtk.flagAt.set(uid, true);
  setTimeout(() => {
    const W = _gdG().wd, c = _gtkRow(uid, W['tdc.' + uid]); if (!c || gardenTideCastleWashed(c) || _gtkHas(c.look, 19)) return;
    const near = gardenShoreFolkNear(c.x, c.y, 16), who = near && GT_CFLAG[near.id] ? near.id : GT_SHORE_FOLK[gardenHash('tide-flag|' + _gdToday()) % GT_SHORE_FOLK.length];
    _gtkSave(uid, c.look | (1 << 19), who);
    if (gardenShoreLive() === 'host') _gtkTell(uid);
    _gtkFlagReward(uid, who);
  }, 18000 + (gardenHash('tide-flagt|' + uid) % 12000));
}
function _gtkFlagReward(uid, who) {
  const first = !_gdG().disc['td.flag'];
  if (first) _gdG().disc['td.flag'] = _gdToday();
  const gift = first ? { c: 15, x: 4, i: { ['decor:' + GT_CASTLE.rosette]: 1 } } : { c: 15, x: 2 };
  if (gardenShoreGive('tdcf.' + uid, gift)) {
    gardenShoreSay(GT_CFLAG[who] || GT_CFLAG.quince, 'flag', 9000);
    setTimeout(() => { try { gardenToast(`A flag on your sandcastle: ${gardenShoreGiftWords(gift)}.`, { icon: 'gift', timeout: 6000 }); } catch (e) { /* fine */ } }, 3500);
    gardenShoreEmit('castle', { flag: true });
  }
}

/* ---------- with friends, live ---------- */
gardenShoreFxOn('castle', (A, ev) => {   // a guest's piece: the host decides
  if (gardenShoreLive() !== 'host' || gardenShoreVisit()) return;
  const uid = String(ev.v || ''), piece = ev.n == null ? 0 : Number(ev.n); if (!/^[a-z0-9-]{1,32}$/.test(uid)) return;
  const W = _gdG().wd, T = gardenTideNow();
  if (piece === 9) {
    if (W['tdc.' + uid] != null) return;
    const m = /^(\d{1,3})-(\d{1,3})$/.exec(String(ev.i || '')); if (!m) return;
    const x = Number(m[1]) / 10, y = Number(m[2]) / 10;
    if (!_gtkCanBuild(x, y, T) || gardenTideCastles().filter(c => c.own).length >= GT_CASTLE.max) { _gtkTellGone(uid); return; }
    W['tdc.' + uid] = [Math.round(x * 10), Math.round(y * 10), 0, Math.round(_gtdNowMs() / 60000), '']; _wdSave(); _gtk.listT = 0; _gtkTell(uid);
    return;
  }
  const c = _gtkRow(uid, W['tdc.' + uid]); if (!c || gardenTideCastleWashed(c)) return;
  const look = gardenTideCastleAdd(c.look, piece); if (look < 0) { _gtkTell(uid); return; }
  _gtkSave(uid, look); _gtkTell(uid);
  if (_gtkPieces(look) >= GT_CASTLE.flagAt && !_gtkHas(look, 19)) _gtkFlagSoon(uid);
});
function _gtkTellGone(uid) { try { gardenLiveFx('tide', 'cset', { v: uid, i: '0-0-0', tt: 1 }); } catch (e) { /* alone */ } }
gardenShoreFxOn('cset', (A, ev) => {   // the host's word on a castle
  if (gardenShoreLive() !== 'guest') return;
  const uid = String(ev.v || ''), m = /^([0-9a-z]{1,5})-(\d{1,3})-(\d{1,3})$/.exec(String(ev.i || '')); if (!m || !/^[a-z0-9-]{1,32}$/.test(uid)) return;
  const b = Number(ev.tt) || 0, was = _gtk.live.get(uid);
  if (b <= 1) { _gtk.live.delete(uid); _gtk.listT = 0; return; }
  const c = { uid, look: parseInt(m[1], 36) & 1048575, x: Number(m[2]) / 10, y: Number(m[3]) / 10, b };
  _gtk.live.set(uid, c); _gtk.listT = 0;
  // a flag on a castle you built a piece of: your own reward too (friends are trusted: each screen gives its own)
  if (_gtkHas(c.look, 19) && !(was && _gtkHas(was.look, 19)) && _gtk.mine.has(uid)) _gtkFlagReward(uid, GT_SHORE_FOLK[gardenHash('tide-flag|' + _gdToday()) % GT_SHORE_FOLK.length]);
});

/* ---------- drawn: each castle standing on the sand, its damp patch and moat on the ground under it ---------- */
const GT_CBOX = Object.freeze([-36, -36, 36, 18]), GT_CBASE = Object.freeze([-40, -20, 40, 22]);
const GT_SAND = Object.freeze({ hi: '#f2e4bc', lit: '#e8d6a6', mid: '#d8c290', sh: '#bca676', dk: '#9c865e', wet: '#b8a272', deep: '#8a7550', crumb: '#f8eed2' });
/** One tapered bucket of sand: a tower (or the keep), its foot at (x, y), r its half width, h its height; lit from the upper left. */
function _gtkTower(B, r, x, y, w, h, o) {
  const S = GT_SAND, top = y - h, tw = w * .86;
  B.shadow(x + 2, y + 1, w * 1.35, w * .45, .22, '#5a4a2a');
  B.f(`M${x - w} ${y}L${x - tw} ${top}L${x + tw} ${top}L${x + w} ${y}Q${x} ${y + w * .38} ${x - w} ${y}z`, B.lin(x - w, 0, x + w, 0, [[0, S.lit], [.38, S.mid], [1, S.sh]]));
  // the bucket's ridges and a few crumbs, the sand's grain
  for (let k = 1; k <= 2; k++) { const yy = y - h * k / 3, ww = w - (w - tw) * k / 3; B.s(`M${x - ww} ${yy}Q${x} ${yy + ww * .3} ${x + ww} ${yy}`, S.dk, .55, .35); }
  for (let k = 0; k < 5; k++) B.f(B.circ(x - w * .7 + r() * w * 1.4, y - r() * h, .35 + r() * .3), r() < .5 ? S.crumb : S.dk, .55);
  // the top, a little lighter, with its battlements
  B.f(B.ell(x, top, tw, tw * .34), S.hi);
  const n = w > 6 ? 5 : 4;
  for (let k = 0; k < n; k++) { const a = Math.PI * (.08 + .84 * k / (n - 1)), bx = x - Math.cos(a) * tw * .9, by = top + Math.sin(a) * tw * .3; B.f(B.rect(bx - 1.1, by - 2.4, 2.2, 2.6), k % 2 ? S.mid : S.lit).f(B.rect(bx - 1.1, by - 2.4, 2.2, .7), S.hi, .9); }
  if (o && o.door) B.f(`M${x - 2} ${y + .4}v-3.6q2 -2.4 4 0v3.6z`, S.deep, .85);
  if (o && o.shell) { const sy = top + h * .42; B.f(`M${x} ${sy + 1.8}L${x - 2.2} ${sy}Q${x - 2} ${sy - 2.2} ${x} ${sy - 2.4}Q${x + 2} ${sy - 2.2} ${x + 2.2} ${sy}z`, '#f2c8bc').s(`M${x} ${sy + 1.6}L${x - 1} ${sy - 1.8}M${x} ${sy + 1.6}L${x + 1} ${sy - 1.8}`, '#c88a80', .35, .8); }
}
/** A low wall of sand between two places, with notches along its top. */
function _gtkWall(B, r, x, y, side) {
  const S = GT_SAND, w = side ? 5 : 9, h = 5;
  B.shadow(x + 1.5, y + 1, w * 1.25, 3, .2, '#5a4a2a');
  B.f(`M${x - w} ${y}l.6 ${-h}h${w * 2 - 1.2}l.6 ${h}q${-w} 1.6 ${-w * 2} 0z`, B.lin(x - w, 0, x + w, 0, [[0, S.lit], [.5, S.mid], [1, S.sh]]));
  B.f(B.rect(x - w + .6, y - h - .8, w * 2 - 1.2, 1.2), S.hi, .9);
  for (let k = 0; k < (side ? 2 : 4); k++) { const bx = x - w + 1.6 + k * ((w * 2 - 3.2) / Math.max(1, (side ? 1 : 3))); B.f(B.rect(bx - .9, y - h - 2.4, 1.8, 1.8), S.lit); }
  B.f(B.circ(x - w * .5 + r() * w, y - r() * h, .35), S.crumb, .6);
}
/** The whole castle as it stands (look), its foot at (0, 0). */
function _gtkPaint(B, look, seed) {
  const S = GT_SAND, r = gardenRand(seed);
  // the mound the keep stands on
  B.shadow(3, 3, 31, 9, .24, '#5a4a2a');
  B.f(sceneDraw.blob(r, 1.5, 3, 25, 8.5, 12, .25), S.sh);
  B.f(sceneDraw.blob(r, 0, 1.5, 24, 7.5, 12, .25), S.mid).f(sceneDraw.blob(r, -3, 0, 18, 5, 10, .3), S.lit, .9).f(sceneDraw.blob(r, -7, -1, 8, 2.4, 8, .3), S.hi, .7);
  for (let k = 0; k < 10; k++) B.f(B.circ(-20 + r() * 40, -2 + r() * 8, .35 + r() * .35), r() < .5 ? S.crumb : S.dk, .5);
  // the pieces behind the keep, the keep, then the ones in front (each place by its row)
  const draw = (i) => { const v = _gtkSlot(look, i), [x, y] = GT_CSLOT[i]; if (v === 1 || v === 3) _gtkTower(B, r, x, y, 4.6, 11 + (i % 3), { shell: v === 3 }); else if (v === 2) _gtkWall(B, r, x, y, i === 3 || i === 4); };
  for (const i of [2, 0, 1]) draw(i);
  _gtkTower(B, r, 0, 2, 7.5, 15, { door: true });
  if (_gtkHas(look, 19)) { const h = gardenHash('tide-flagc|' + seed), col = ['#d8453a', '#3a6ab4', '#e8b83a', '#4a8a4a'][h % 4]; B.s('M0.6 -13L0.6 -30', '#7a5a3a', .9).f('M1 -30l9 2.6l-9 2.8z', col).f('M1 -30l9 2.6l-9 .7z', '#ffffff', .25); }
  for (const i of [3, 4, 5, 6, 7, 8]) draw(i);
}
/** The ground under it: sand patted damp round the foot, and the moat's channel when it has one. */
function _gtkBase(B, moat) {
  const S = GT_SAND;
  B.f(B.ell(0, 3, 33, 12), S.wet, .3).f(B.ell(0, 3, 27, 9), S.wet, .25);
  if (moat) {
    const ring = `${sceneDraw.ell(0, 3, 34, 15)}${sceneDraw.ell(0, 3, 28.5, 11.5)}`;
    B.cx.save(); B.cx.fillStyle = S.deep; B.cx.globalAlpha = .55; B.cx.fill(new Path2D(ring), 'evenodd'); B.cx.restore();
    B.s(sceneDraw.ell(0, 3, 34, 15), S.hi, .9, .55).s(sceneDraw.ell(0, 3.6, 28.5, 11.5), S.dk, .8, .45);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, rr = 35.5 + (k % 3); B.f(B.circ(Math.cos(a) * rr, 3 + Math.sin(a) * rr * .44, .8 + (k % 2) * .4), S.mid, .7); }   // (the sand dug out, heaped round the rim)
  }
}
function _gtkWater(B) {
  const ring = `${sceneDraw.ell(0, 3, 33, 14.4)}${sceneDraw.ell(0, 3, 29.2, 12)}`;
  B.cx.save(); B.cx.globalAlpha = .82; B.cx.fillStyle = '#8cc4bc'; B.cx.fill(new Path2D(ring), 'evenodd'); B.cx.restore();
  B.s(sceneDraw.ell(0, 2.4, 31, 13.2), '#e8f6f0', .7, .6);
}
const GardenTideCastleSprites = {
  id: 'castles',
  /** A castle's old picture, let go once no castle on screen shows it (its images are gone first). */
  drop(key) { const scene = this.scene; if (!scene || !key || !key.startsWith('gt-cc|')) return; for (const q of this.imgs.values()) if (q.bodyKey === key) return; try { if (scene.textures.exists(key)) scene.textures.remove(key); } catch (e) { /* kept */ } },
  paint(scene, root) { this.scene = scene; this.root = root; this.objs = typeof GardenPaintTide !== 'undefined' ? GardenPaintTide.objects() : null; this.t = 0; this.imgs = new Map(); },
  clear() { for (const o of (this.imgs || new Map()).values()) for (const im of [o.body, o.base, o.water]) { try { if (im) im.destroy(); } catch (e) { /* gone */ } } this.imgs = new Map(); this.scene = null; },
  tick(time, view, T, vis) {
    const scene = this.scene; if (!scene || time - this.t < 350) return; this.t = time;
    const W = GARDEN_WORLD, K = GT_CASTLE.K, list = vis ? gardenTideCastles() : [], keep = new Set();
    for (const c of list) {
      const x = c.x * W.cellW, y = W.sky + c.y * W.cellH;
      if (x < view.x - 140 || x > view.x + view.w + 140 || y < view.y - 120 || y > view.y + view.h + 120) continue;
      keep.add(c.uid);
      let o = this.imgs.get(c.uid);
      const bodyKey = 'gt-cc|' + (c.look & 1048575) + '|' + (gardenHash(c.uid) % 7), baseKey = 'gt-cb|' + (_gtkHas(c.look, 18) ? 1 : 0);
      if (!gardenShoreBake(scene, bodyKey, GT_CBOX, (B) => _gtkPaint(B, c.look, gardenHash(c.uid) % 7 + 11), K) || !gardenShoreBake(scene, baseKey, GT_CBASE, (B) => _gtkBase(B, _gtkHas(c.look, 18)), 2) || !gardenShoreBake(scene, 'gt-cw', GT_CBASE, _gtkWater, 2)) continue;
      if (!o) { o = { uid: c.uid }; this.imgs.set(c.uid, o); }
      if (o.bodyKey !== bodyKey) { const was = o.bodyKey; if (o.body) o.body.destroy(); o.body = gardenShoreImage(scene, this.objs || this.root, bodyKey, GT_CBOX, x, y, K); o.body.setDepth(y); o.bodyKey = bodyKey; if (this.objs && this.objs.sort) this.objs.sort('depth'); if (was) this.drop(was); }   // (the old look's picture goes once nothing shows it: texture memory stays at one picture a castle)
      if (o.baseKey !== baseKey) { if (o.base) o.base.destroy(); o.base = gardenShoreImage(scene, this.root, baseKey, GT_CBASE, x, y, 2); o.base.setDepth(-9345.12); o.baseKey = baseKey; if (!o.water) { o.water = gardenShoreImage(scene, this.root, 'gt-cw', GT_CBASE, x, y, 2); o.water.setDepth(-9345.11); } if (this.root.sort) this.root.sort('depth'); }
      // the moat fills as the water comes near
      const h = gardenTideH(c.x, c.y), near = Number.isFinite(h) && _gtkHas(c.look, 18) ? Math.max(0, Math.min(1, 1 - (h - T.line - 2) / 14)) : 0;
      o.water.setVisible(near > .02).setAlpha(near);
      o.x = c.x; o.y = c.y; o.seen = time;
    }
    // gone: the tide took it (a splash where it stood, if you can see it) or it is out of view
    for (const [uid, o] of this.imgs) {
      if (keep.has(uid)) continue;
      const washed = vis && !list.some(c => c.uid === uid) && o.x != null;
      if (washed) _gtkSplash(o, view);
      for (const im of [o.body, o.base, o.water]) { try { if (im) im.destroy(); } catch (e) { /* gone */ } }
      this.imgs.delete(uid);
      if (washed && o.bodyKey) this.drop(o.bodyKey);
    }
  },
};
/** The tide takes a castle: a splash, and a word if it was one of yours. */
function _gtkSplash(o, view) {
  const W = GARDEN_WORLD, x = o.x * W.cellW, y = W.sky + o.y * W.cellH;
  if (x < view.x - 40 || x > view.x + view.w + 40 || y < view.y - 40 || y > view.y + view.h + 40) return;
  const T = gardenTideNow(), h = gardenTideH(o.x, o.y); if (!(Number.isFinite(h) && h <= T.line + 3)) return;   // (only when it really was the water)
  if (window.GardenNativeActions && (typeof gardenMotionOn !== 'function' || gardenMotionOn())) for (let i = 0; i < 4; i++) setTimeout(() => { try { GardenNativeActions.effect('water', x + (i - 1.5) * 12, y - 2, { width: 30 - i * 3 }); } catch (e) { /* fine */ } }, i * 140);
  try { gardenSfx('splash'); } catch (e) { /* quiet */ }
  if (_gtk.mine.has(o.uid) || (!gardenShoreVisit() && _gdG().wd['tdc.' + o.uid] != null)) gardenShoreSay('Splash. The tide has taken your sandcastle. It was a good one.', 'waves', 5000);
  gardenShoreEmit('castle', { washed: true });
}
if (window.GardenPaintTide) GardenPaintTide.parts.push(GardenTideCastleSprites);
GT_ROW_SOURCES.push((px, py, T) => gardenTideCastleRows(px, py, T));
GT_RUN.castle = GT_RUN['castle-look'] = (spot) => gardenTideCastleRun(spot);
setTimeout(() => { if (typeof wdMod === 'function') wdMod({ id: 'tide-castles', visit: true, fun: false, begin() { this.t = 0; }, tick(m) { if (m.visit) { if (_gtk.local.length && m.visit.fid !== _gtk.localFid) { _gtk.local = []; _gtk.localFid = m.visit.fid; } return; } if (_gtk.local.length) _gtk.local = []; if (_gtk.live.size && gardenShoreLive() !== 'guest') _gtk.live.clear(); const now = Date.now(); if (now - this.t > 60000) { this.t = now; _gtkTidy(); } } }); }, 0);   // clock-ok: the tidy's pace

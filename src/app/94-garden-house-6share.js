/* ============================================================
   YOUR OWN HOUSE, with friends. Friends are trusted (full co-op): in your garden they go in at your door, see your rooms exactly
   as you do, and set them out with you; you do the same in theirs.
     the snapshot   `hs` (houseWire, 94-garden-house-0rules.js): ids and numbers only. It goes in the saved copy, and the live host
                    sends the whole garden again within about a second of any change in the house (_hsSnapSoon)
     going in       the hidden rooms' own steps (gl:fx 'hall', i = 'hs-<slot>'): you see each other walk, and "X went into ..." with
                    a "Go in too" button; nothing new on the wire
     changing it    a guest's move is an intent (t 'house': item put | move | lift | use | wall | floor, x the room, p the piece or
                    finish, u the piece, fx/fy where, y how high in 2 px, r turned). It shows at once on their screen with a pending
                    look; the host's page runs it through the same house rules (gardenHouseHostDo) and it is the house's. What a
                    friend brings in is a gift to the house, paid from their own things only when the host says yes; whoever puts
                    it away puts it in the house's chest
     out            a saved copy (the host is away): you look round and leave everything as it is
   ============================================================ */
function gardenHouseWire() { try { return houseWire(_gdG()); } catch (e) { return null; } }
/** The host: send the garden again soon (at most once a second while things are being moved; the last change always goes). */
function _hsSnapSoon() {
  try { if (typeof _gscPublishSoon === 'function') _gscPublishSoon(); } catch (e) { /* the saved copy follows later */ }
  if (typeof _gll === 'undefined' || _gll.role !== 'host' || typeof _glhSnapAll !== 'function' || !_gll.actors || !_gll.actors.size) return;
  const now = Date.now(), wait = Math.max(120, (_hs.snapAt || 0) + 1000 - now);   // clock-ok: spacing messages
  clearTimeout(_hs.snapT);
  _hs.snapT = setTimeout(() => { _hs.snapAt = Date.now(); try { _glhSnapAll(); } catch (e) { /* the world check sends it within 3 s */ } }, wait);   // clock-ok: spacing messages
}
/** A guest's intent as a house op (the host's page). */
function _hsOpOfIntent(ev) {
  const slot = Number.isInteger(ev.x) ? ev.x : 0, z = (Number.isInteger(ev.y) ? ev.y : 0) * 2, r = Number.isInteger(ev.r) ? ev.r & 1 : 0;
  switch (ev.item) {
    case 'put': { const d = gardenDecor(String(ev.p || '')), str = !!(d && d.hp === 'string'); return { o: 'put', s: slot, d: String(ev.p || ''), x: ev.fx, y: ev.fy, z: str ? 0 : z, r, u: String(ev.u || ''), v: str ? Math.max(0, Math.min(7, ev.y | 0)) : 0 }; }
    case 'move': return { o: 'move', u: String(ev.u || ''), x: ev.fx, y: ev.fy, z, r };
    case 'lift': return { o: 'lift', u: String(ev.u || '') };
    case 'use': return { o: 'use', u: String(ev.u || '') };
    case 'wall': case 'floor': return { o: ev.item, s: slot, d: String(ev.p || ''), lk: 'hfw.' + slot + '.' + String(ev.i || '').slice(0, 24) };
    case 'jar': return { o: 'jar', s: slot, c: ev.p === 'coin' ? ev.fx | 0 : 0, t: ev.p === 'timber' ? 1 : 0, st: ev.p === 'stone' ? 1 : 0 };   // (what they put in came out of their own purse, on their page)
    case 'help': { const n = typeof _glhByName === 'function' ? _glhByName(ev.f) : ''; return { o: 'help', s: slot, seed: Math.floor(Math.random() * 9999), i: String(n || '?').charAt(0), col: gardenHash(String(ev.f || '')) % 16, us: (HOUSE_ROOM_START[slot] || []).map(() => _gdUid('h')) }; }
    case 'dye': return Object.assign({ o: 'dye', u: String(ev.u || ''), v: ev.fx | 0 }, ev.fx ? { k: 'crop:' + String(ev.p || '') } : {});
  }
  return null;
}
/** The host's page: a friend's change to your house, through the same rules as your own (94-garden-live-3host.js _glhApply). '' when done. */
function gardenHouseHostDo(ev, put, g) {
  const op = _hsOpOfIntent(ev); if (!op) return 'That cannot be done';
  if (!g.hs || !g.hs.home) return 'Nobody lives here yet';
  const inside = _hsInside() && _grm.R.slot === (op.s != null ? op.s : (g.hf[op.u] || {}).s);
  const W = { g, has: () => 1, feet: inside ? _hsFeet(_grm.S) : null, today: _gdToday() };
  const why = houseOpCheck(W, op, ev.f); if (why) return why;
  const rec = op.u && g.hf[op.u] ? g.hf[op.u] : null, d = op.d || (rec && rec.d) || '';
  const mark = _gdMark(houseOpTouches(op, g));
  houseOpApply(g, op, ev.f, { now: _gdNow(), today: _gdToday(), tomorrow: _gdAddDays(_gdToday(), 1) });
  _hsSnapSoon();
  if (_hsInside()) { _grm.S.dirty = true; if (op.o === 'help' || op.o === 'jar') { try { _hsRoomRefresh(_grm.R, _grm.S, false); } catch (e) { /* the next frame catches up */ } } }
  if (op.o === 'help' && typeof _hsBuiltNow === 'function') _hsBuiltNow(op.s, ev.f);   // (a room finished: the cottage grows outside, and its housewarming waits for you)
  // (what a friend brought, a piece, a paper, coins in the jar, a hand with the building, is a gift to the house: like a gift outdoors it stays, so it has no Undo in the diary)
  const gift = op.o === 'put' || op.o === 'jar' || op.o === 'help' || ((op.o === 'wall' || op.o === 'floor') && op.d !== HOUSE_WALL0 && op.d !== HOUSE_FLOOR0);
  return put(mark, { hi: ev.item, p: op.o === 'jar' ? String(ev.p || '') : op.o === 'help' ? String(op.s) : d, u: op.u || '', mp: 'hf', ...(op.o === 'jar' ? { n: op.c || 1 } : {}), ...(op.o === 'dye' ? { v: op.v } : {}), ...(gift ? { noUndo: true } : {}), ...(op.o === 'use' ? { on: g.hf[op.u] && g.hf[op.u].l ? 1 : 0 } : {}) });
}
/** The friend diary's words for a change in your house. */
function gardenHouseDiary(e, who, n) {
  const d = e.p ? gardenDecor(e.p) : null, name = d ? houseLowName(d) : 'something', a = typeof _gscA === 'function' ? _gscA(name) : 'a ' + name;
  switch (e.hi) {
    case 'put': return n > 1 ? `${who} brought ${n} things into your house` : `${who} brought ${a} into your house`;
    case 'move': return `${who} moved the ${name} in your house`;
    case 'lift': return `${who} put the ${name} away in your house`;
    case 'use': return e.on ? `${who} lit the ${name} in your house` : `${who} put out the ${name} in your house`;
    case 'wall': return `${who} put up ${name} in your house`;
    case 'floor': return `${who} laid ${name} in your house`;
    case 'jar': return e.p === 'coin' ? `${who} put ${e.n || 1} coins in your builders’ jar` : `${who} put ${e.p === 'timber' ? 'timber' : 'stone'} in your builders’ jar`;
    case 'help': return `${who} lent the builders a hand: ${houseRoomName(Number(e.p) || 1).replace(/^The /, 'the ')} is finished`;
    case 'dye': { const dy = typeof HOUSE_DYE_OF !== 'undefined' ? HOUSE_DYE_OF.get(e.v | 0) : null; return dy ? `${who} dyed the ${name} ${dy.name.toLowerCase()} in your house` : `${who} washed the ${name} back to its own colour in your house`; }
  }
  return `${who} helped in your house`;
}

/* ---------- a guest in a friend's house ---------- */
/** Ask your friend's computer for a change; it shows at once, pending, until their house says so (or 6 s pass). */
function _hsGuestDo(R, S, op) {
  if (!(typeof _glvLive === 'function' && _glvLive())) { _grmSay('Your friend is out just now. You look round and leave everything as it is.'); return false; }
  const f = { item: op.o, x: op.s != null ? op.s : S.slot };
  let debit = '';
  if (op.o === 'put') { Object.assign(f, { p: op.d, u: op.u, fx: op.x, fy: op.y, y: (gardenDecor(op.d) || {}).hp === 'string' ? op.v | 0 : Math.round((op.z || 0) / 2), r: op.r || 0 }); debit = 'decor:' + op.d; if (gardenHas(debit) < 1) { _grmSay('You have none of those left.'); return false; } }
  else if (op.o === 'move') Object.assign(f, { u: op.u, fx: op.x, fy: op.y, y: Math.round((op.z || 0) / 2), r: op.r || 0 });
  else if (op.o === 'lift' || op.o === 'use') f.u = op.u;
  else if (op.o === 'wall' || op.o === 'floor') { f.p = op.d; if (op.d !== HOUSE_WALL0 && op.d !== HOUSE_FLOOR0) { debit = 'decor:' + op.d; if (gardenHas(debit) < 1) { _grmSay('You have none of those left.'); return false; } } }
  else if (op.o === 'dye') { Object.assign(f, { u: op.u, fx: op.v | 0 }); if (op.v) { f.p = String(op.k || '').replace(/^crop:/, ''); debit = op.k; if (gardenHas(debit) < 1) { _grmSay('You have nothing to boil for that colour.'); return false; } } }
  try { _glvIntent('house', f, debit || undefined); } catch (e) { console.error('[house]', e); return false; }
  S.pend.set(op.o + ':' + (op.u || op.s) + ':' + Date.now(), { op, at: Date.now(), ref: S.snapRef });   // clock-ok: how long a change waits for its answer
  _hsRoomRefresh(R, S, false);
  return true;
}
/** Has the friend's house caught up with a pending change? */
function _hsPendDone(v, op) {
  const p = op.u ? v.pieces.find(q => q.u === op.u) : null;
  switch (op.o) {
    case 'put': case 'move': return !!p && p.x === op.x && p.y === op.y;
    case 'lift': return !p;
    case 'use': return false;   // (a toggle: the next snapshot settles it)
    case 'dye': return !!p && (p.v | 0) === (op.v | 0);
    case 'wall': return (v.rooms[String(op.s)] || {}).w === op.d;
    case 'floor': return (v.rooms[String(op.s)] || {}).f === op.d;
  }
  return true;
}
/** The friend's house as the guest sees it: theirs, with what you have asked for on top (pending). */
function _hsGuestOver(v) {
  const S = _hsInside() ? _grm.S : null; if (!S || !S.pend || !S.pend.size) return v;
  for (const [k, P] of S.pend) if (_hsPendDone(v, P.op) || (P.op.o === 'use' && S.snapRef !== P.ref)) S.pend.delete(k);   // (a lamp: the next snapshot from the host settles it)
  if (!S.pend.size) return v;
  const pieces = v.pieces.map(p => Object.assign({}, p)), rooms = JSON.parse(JSON.stringify(v.rooms));
  for (const P of S.pend.values()) {
    const op = P.op, i = op.u ? pieces.findIndex(q => q.u === op.u) : -1;
    if (op.o === 'put' && i < 0) pieces.push({ u: op.u, d: op.d, s: op.s, x: op.x, y: op.y, z: op.z || 0, r: op.r || 0, v: op.v || 0, l: 0, pend: 1 });
    else if (op.o === 'move' && i >= 0) { const p = pieces[i], dx = op.x - p.x, dy = op.y - p.y; for (const q of houseOnTop(pieces, p.u)) { q.x += dx; q.y += dy; } Object.assign(p, { x: op.x, y: op.y, z: op.z || 0, r: op.r || 0, pend: 1 }); }
    else if (op.o === 'lift' && i >= 0) { const riders = new Set(houseOnTop(pieces, op.u).map(q => q.u)); for (let j = pieces.length - 1; j >= 0; j--) if (pieces[j].u === op.u || riders.has(pieces[j].u)) pieces.splice(j, 1); }
    else if (op.o === 'use' && i >= 0) pieces[i].l = pieces[i].l ? 0 : 1;
    else if (op.o === 'dye' && i >= 0) Object.assign(pieces[i], { v: op.v | 0, pend: 1 });
    else if ((op.o === 'wall' || op.o === 'floor') && rooms[String(op.s)]) rooms[String(op.s)][op.o === 'wall' ? 'w' : 'f'] = op.d;
  }
  return Object.assign({}, v, { pieces, rooms });
}
/** Changes that were never answered go back (refused, or lost on the way). */
function _hsGuestPendTick(R, S) {
  const now = Date.now(); let gone = false;   // clock-ok: how long a change waits for its answer
  for (const [k, P] of S.pend) if (now - P.at > 6000) { S.pend.delete(k); gone = true; }
  if (gone) _hsRoomRefresh(R, S, false);
}

/* ---------- what someone carries: they see it in your arms, you see it in theirs (gl:fx 'hall', step 'hold', p: the piece or 'none') ---------- */
function _hsHoldSend(S, d) {
  try { if (typeof gardenLiveFx !== 'function' || !_grm.R || !_grm.me) return; gardenLiveFx('hall', 'hold', { i: _grm.R.id, x: Math.max(0, Math.min(59, Math.round(_grm.me.x / GRM.U))), y: Math.max(0, Math.min(37, Math.round(_grm.me.y / GRM.U))), p: d || 'none' }); } catch (e) { /* only a picture */ }
}
function gardenHouseHold(A, R, ev) {
  const S = _hsInside() ? _grm.S : null, s = _hsNative(); if (!S || !s || !A) return;
  const held = S.held || (S.held = new Map()), had = held.get(A.w);
  if (had) { if (had.im.active) had.im.destroy(); held.delete(A.w); }
  const def = _hsDefOf(String(ev.p || '')); if (!def) { S.heldList = [...held.values()]; return; }
  const key = houseTexture(s.context.scene, def.id, 0, false); if (!key) { S.heldList = [...held.values()]; return; }
  const b = houseArtBox(def.id), k = Math.min(.55, 60 / Math.max(1, b[3] - b[1]));
  const im = s.context.scene.add.image(0, 0, key).setOrigin(-b[0] / (b[2] - b[0]), 1).setScale(k / HOUSE_TEX_K).setAlpha(.95); s.root.add(im);
  held.set(A.w, { im, w: A.w }); S.heldList = [...held.values()];
}
/** Each frame: what friends carry rides over their heads. */
function _hsHeldFrame(S) {
  const L = S.heldList; if (!L || !L.length) return;
  for (let i = 0; i < L.length; i++) { const H = L[i], Q = _grm.m.get(H.w); if (!Q || !H.im.active) { H.im.setVisible(false); continue; } H.im.setVisible(true).setPosition(Q.x, Q.y - 96).setDepth(1000 + Q.y + .5); }
}

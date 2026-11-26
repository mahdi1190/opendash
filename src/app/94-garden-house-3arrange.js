/* ============================================================
   YOUR OWN HOUSE, setting it out. "Move things" (at the top of the room), then:
     pick a thing up   click it, or walk up to it and press E (or drag it with the mouse)
     carry it          it goes where the pointer is, or in front of you as you walk; its footprint shows green where it fits and red
                       where it would overlap something (rule 12: nothing overlaps; a rug lies under things, a small thing stands on a
                       table). It moves over a little, up to 40 room px, to the nearest place it fits.
     set it down       click, or E          turn it  R          put it away  Q (into your things)          put it back  Esc
   Your things (the strip under the buttons, and the chest): the furniture and the papers and floors in your bag. Pick a piece to
   bring it in; pick a paper or a floor and it goes on at once (the old one goes back in your things). Undo takes a change back.
   On a friend's visit the same moves are asked of their computer (94-garden-house-6share.js), and their house is set out for both.
   Speed: the carried piece is one image moved, its footprint one graphics redrawn only when it changes; nothing else per frame.
   ============================================================ */
const HOUSE_SNAP = 40;

/* ---------- the buttons, the strip, the hint ---------- */
function _hsMoveUi(R, S, bar) {
  const mk = (cls, text, run) => { const b = gpEl('button', 'btn btn-secondary btn-sm ' + cls, text); b.type = 'button'; b.onclick = (ev) => { ev.stopPropagation(); run(); }; return b; };
  const may = !gpVisiting() || (typeof _glvLive === 'function' && _glvLive());
  if (may) { S.btnMove = mk('hs-move', 'Move things', () => _hsMoveToggle(R, S)); bar.appendChild(S.btnMove); }
  S.btnUndo = mk('hs-undo', 'Undo', () => _hsUndo(R, S)); S.btnUndo.hidden = true; bar.appendChild(S.btnUndo);
  const strip = gpEl('div', 'hs-bag'); strip.hidden = true; strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', 'Your things'); bar.appendChild(strip); S.bagEl = strip;
  const hint = gpEl('p', 'hs-hint'); hint.hidden = true; hint.setAttribute('aria-live', 'polite'); (_grm.root || bar).appendChild(hint); S.hintEl = hint;
  // the pointer over the room: where a carried thing goes
  const s = _hsNative(), box = s && (s.context.box || null);
  if (box) {
    S.onPtr = (ev) => { if (!_hsInside() || _grm.S !== S) return; const p = GardenNativeRooms.point(ev.clientX, ev.clientY); if (!p) return; S.ptr = p; if (S.carry) { S.carry.mode = 'pointer'; S.carry.dirty = true; } };
    box.addEventListener('pointermove', S.onPtr, { passive: true }); S.ptrBox = box;
  }
}
function _hsMoveEnd(R, S) {
  if (S.carry) _hsCarryClear(S);
  if (S.ptrBox && S.onPtr) S.ptrBox.removeEventListener('pointermove', S.onPtr);
  S.ptrBox = S.onPtr = null; S.ghost = null; S.move = false;
}
function _hsMoveToggle(R, S, on) {
  const want = on == null ? !S.move : !!on;
  if (!want && S.carry) _hsCarryCancel(R, S);
  S.move = want; S.chest = false;
  if (S.btnMove) { S.btnMove.textContent = want ? 'Done' : 'Move things'; S.btnMove.classList.toggle('is-on', want); }
  _hsBagPaint(R, S); _hsHint(R, S);
  if (want) _grmSay(gpVisiting() ? 'Set out your friend’s room with them. What you bring in is a gift to their house.' : 'Click a thing to pick it up, or bring something in from your things.', 6000);
  S.promptKey = null; if (!S.native) _grmPaint();
}
function _hsHint(R, S) {
  const el = S.hintEl; if (!el) return;
  const text = S.carry ? 'Click or E: put it here · R: turn it · Q: put it away · Esc: put it back' : S.move ? 'Click a thing to pick it up, or walk up to it and press E · Esc when you are done' : '';
  if (el.textContent !== text) el.textContent = text;
  el.hidden = !text;
  if (S.btnUndo) S.btnUndo.hidden = !(S.move && _hsCanUndo());
}
function _hsCanUndo() { if (gpVisiting() || typeof _gd === 'undefined' || !_gd.undo.length) return false; const u = _gd.undo[_gd.undo.length - 1]; return !!(u && u.mark && u.mark.some(r => r[0] === 'hf' || r[0] === 'hr')); }
function _hsUndo(R, S) { if (!_hsCanUndo()) return; if (S.carry) _hsCarryCancel(R, S); gardenUndo(); _hsRoomRefresh(R, S, false); _hsHint(R, S); }
/** The things in your bag that go indoors: furniture, then papers and floors (with the plain ones, always yours). */
function _hsOwned() {
  const w = gardenWallet(), pieces = [], walls = [], floors = [];
  for (const [k, n] of Object.entries(w.items)) {
    if (!k.startsWith('decor:') || !(n >= 1)) continue;
    const d = gardenDecor(k.slice(6)); if (!d || !d.indoor) continue;
    (d.finish === 'wall' ? walls : d.finish === 'floor' ? floors : pieces).push({ d, n: Math.floor(n) });
  }
  const byName = (a, b) => a.d.name.localeCompare(b.d.name);
  return { pieces: pieces.sort(byName), walls: walls.sort(byName), floors: floors.sort(byName) };
}
function _hsBagPaint(R, S) {
  const el = S.bagEl; if (!el) return;
  const open = S.move || S.chest; el.hidden = !open; if (!open) { el.textContent = ''; S.bagSig = ''; return; }
  const own = _hsOwned(), room = S.view && S.view.rooms[String(S.slot)] || {}, sig = JSON.stringify([S.chest, own.pieces.map(r => r.d.id + r.n), own.walls.map(r => r.d.id + r.n), own.floors.map(r => r.d.id + r.n), room.w, room.f, S.carry && S.carry.from === 'bag' ? S.carry.d : '']);
  if (sig === S.bagSig) return; S.bagSig = sig;
  el.textContent = '';
  const head = gpEl('p', 'hs-bag-h', S.chest ? (gpVisiting() ? 'Your friend’s chest. What you bring in from your own things is a gift to their house.' : 'Your cottage chest: everything for indoors is kept here. Pick a thing to bring it out.') : 'Your things: pick one to bring it in.');
  el.appendChild(head);
  const row = gpEl('div', 'hs-bag-row'); el.appendChild(row);
  const btn = (def, n, on, run, label) => { const b = gpEl('button', 'hs-bag-b' + (on ? ' is-on' : '')); b.type = 'button'; b.title = label || def.name; b.setAttribute('aria-label', (label || def.name) + (n ? `, ${n}` : '')); b.innerHTML = gardenIconSvg(def.id, { kind: 'decor', px: 44 }) + (n ? `<i>${n}</i>` : ''); b.onclick = (ev) => { ev.stopPropagation(); run(); }; row.appendChild(b); return b; };
  if (!own.pieces.length && !own.walls.length && !own.floors.length) row.appendChild(gpEl('span', 'hs-bag-none', 'Nothing in your things for indoors yet. The garden shop has a Home shelf.'));
  for (const r of own.pieces) btn(r.d, r.n, S.carry && S.carry.from === 'bag' && S.carry.d === r.d.id, () => _hsCarryFromBag(R, S, r.d.id));
  if (own.walls.length || own.floors.length || room.w !== HOUSE_WALL0 || room.f !== HOUSE_FLOOR0) {
    row.appendChild(gpEl('span', 'hs-bag-sep', 'Walls and floor:'));
    const finish = (id, n, label) => { const d = gardenDecor(id); if (d) btn(d, n, room.w === id || room.f === id, () => _hsFinish(R, S, id), label); };
    if (room.w && room.w !== HOUSE_WALL0) finish(HOUSE_WALL0, 0, 'Back to plain limewash');
    for (const r of own.walls) finish(r.d.id, r.n);
    if (room.f && room.f !== HOUSE_FLOOR0) finish(HOUSE_FLOOR0, 0, 'Back to bare boards');
    for (const r of own.floors) finish(r.d.id, r.n);
  }
  if (S.chest) { const c = gpEl('button', 'btn btn-secondary btn-sm hs-bag-close', 'Close'); c.type = 'button'; c.onclick = (ev) => { ev.stopPropagation(); S.chest = false; _hsBagPaint(R, S); }; row.appendChild(c); }
  if (S.chest && typeof gardenStorageOpen === 'function' && !gpVisiting()) { const st = gpEl('button', 'btn btn-secondary btn-sm', 'Your storage'); st.type = 'button'; st.onclick = (ev) => { ev.stopPropagation(); try { gardenStorageOpen(); } catch (e) { /* their own panel */ } }; row.appendChild(st); }
}
/** The chest (any piece of the store kind): your things for indoors, to bring out. */
function _hsChestOpen(R, S, p) {
  if (gpVisiting() && !(typeof _glvLive === 'function' && _glvLive())) { _grmSay('Your friend’s chest. They are out just now, so you leave it shut.'); return; }
  S.chest = !S.chest || !S.move;
  if (S.chest && !S.move && (!gpVisiting() || (typeof _glvLive === 'function' && _glvLive()))) { S.move = true; if (S.btnMove) { S.btnMove.textContent = 'Done'; S.btnMove.classList.add('is-on'); } }
  _hsBagPaint(R, S); _hsHint(R, S);
  try { if (typeof _fxSound === 'function') _fxSound('pop'); } catch (e) { /* no sound */ }
  if (S.chest) _grmSay(_hsOwned().pieces.length ? 'You lift the lid. Pick a thing to bring it out.' : 'The chest is empty just now. Things you put away go in here, and the garden shop has a Home shelf.', 6000);
}

/* ---------- carrying ---------- */
function _hsDefOf(d) { const def = gardenDecor(d); return def && def.indoor && !def.finish ? def : null; }
/** The room's other pieces while one is carried (it and what stands on it left out), worked out once at pick-up. */
function _hsOthers(S, u) {
  const riders = u ? new Set(houseOnTop(S.pieces, u).map(q => q.u)) : new Set();
  return { list: S.pieces.filter(q => q.u !== u && !riders.has(q.u)), riders };
}
function _hsPickUp(R, S, p, drag) {
  if (!S.move) _hsMoveToggle(R, S, true);
  if (S.carry) _hsCarryCancel(R, S);
  const def = _hsDefOf(p.d); if (!def) return;
  const O = _hsOthers(S, p.u);
  S.carry = { u: p.u, d: p.d, v: p.v | 0, r: p.r | 0, x: p.x, y: p.y, z: p.z || 0, orig: { x: p.x, y: p.y, z: p.z || 0, r: p.r | 0 }, from: 'room', ok: true, why: '', mode: drag ? 'pointer' : 'keys', drag: !!drag, down: drag && S.ptr ? { x: S.ptr.x, y: S.ptr.y } : null, others: O.list, riders: O.riders, dirty: true, lit: _hsLitKey(p) };
  _hsCarryStart(R, S);
  try { if (typeof gartPlayerAct === 'function') gartPlayerAct('pick', 420); } catch (e) { /* a pose */ }
}
function _hsCarryFromBag(R, S, d) {
  const def = _hsDefOf(d); if (!def) return;
  if (S.carry) _hsCarryCancel(R, S);
  if (!S.move) _hsMoveToggle(R, S, true);
  S.chest = false;
  if (S.pieces.length >= HOUSE_ROOM_MAX) { _grmSay(`There is room for ${HOUSE_ROOM_MAX} things in here. Put something away first.`); return; }
  const M = _grm.me, at = _hsInFront(S, def, M);
  S.carry = { u: null, d, v: 0, r: 0, x: at.x, y: at.y, z: at.z, orig: null, from: 'bag', ok: false, why: '', mode: 'keys', drag: false, others: S.pieces.slice(), riders: new Set(), dirty: true, lit: false };
  _hsCarryStart(R, S);
  _hsBagPaint(R, S);
}
function _hsCarryStart(R, S) {
  const C = S.carry, s = _hsNative();
  if (s) {
    const scene = s.context.scene, key = houseTexture(scene, C.d, C.v, C.lit);
    const im = scene.add.image(C.x, C.y - C.z, key || '__DEFAULT').setDepth(9000).setAlpha(.82); s.root.add(im);
    const fp = scene.add.graphics().setDepth(105); s.root.add(fp);
    S.ghost = { im, fp, key: key || '', lastOk: null, lastX: NaN, lastY: NaN, lastR: -1 };
    C.key = key || '';
    _hsGhostTexture(S);
    _hsSync(R, S);   // (its own picture leaves its place)
  } else _grmPaint();
  S.blocks = houseBlocks(C.others, S.slot);
  _hsHint(R, S); S.promptKey = null;
  try { if (typeof _fxSound === 'function') _fxSound('tick'); } catch (e) { /* no sound */ }
}
function _hsGhostTexture(S) {
  const C = S.carry, G = S.ghost, s = _hsNative(); if (!C || !G || !s) return;
  const key = houseTexture(s.context.scene, C.d, C.v, C.lit);
  if (!key) { G.im.setVisible(false); return; }
  if (G.key !== key || !G.im.visible) { G.im.setTexture(key).setVisible(true); G.key = key; C.key = key; const b = houseArtBox(C.d); G.im.setOrigin(-b[0] / (b[2] - b[0]), -b[1] / (b[3] - b[1])); }
}
function _hsCarryClear(S) {
  const G = S.ghost; if (G) { try { if (G.im.active) G.im.destroy(); if (G.fp.active) G.fp.destroy(); } catch (e) { /* gone with the room */ } }
  S.ghost = null; S.carry = null;
}
/** Put it back where it was (Esc), or out of your hands (it came from your things: it stays in them). */
function _hsCarryCancel(R, S) {
  if (!S.carry) return;
  _hsCarryClear(S);
  S.blocks = houseBlocks(S.pieces, S.slot);
  if (S.native) _hsSync(R, S); else _grmPaint();
  _hsHint(R, S); _hsBagPaint(R, S); S.promptKey = null;
}
/** Someone else moved or put away what you were carrying. */
function _hsMoveDrop(R, S, why) { if (!S.carry) return; _hsCarryClear(S); if (why === 'gone') _grmSay('Someone put that away while you had it.'); _hsHint(R, S); }
/** Where a piece would go in front of you, by its kind: beside you on the floor, or on the wall above you. */
function _hsInFront(S, def, M) {
  const sh = houseShape(def), face = M && M.face < 0 ? -1 : 1, mx = M ? M.x : 480, my = M ? M.y : 480;
  if (sh.hp === 'wall') return { x: mx + face * (sh.w / 2 + 24), y: Math.min(HOUSE_SHELL.hang.y1 - 8, 360), z: 0 };
  if (sh.hp === 'rug') return { x: mx + face * (sh.w / 2 + 20), y: my + sh.d / 2, z: 0 };
  return { x: mx + face * (sh.w / 2 + 26), y: my + 4, z: 0 };
}
/** Does it fit here? '' or why. Feet in the room count for floor things. */
function _hsFitWhy(S, def, x, y, z) {
  const C = S.carry, why = houseFits(C.others, def, x, y, z, C.u || '', null); if (why) return why;
  const sh = houseShape(def); if (z || sh.hp !== 'floor') return '';
  const b = houseBox({ x, y }, def), feet = _hsFeet(S);
  for (const [fx, fy] of feet) if (fx > b.x0 - 6 && fx < b.x1 + 6 && fy > b.y0 - 6 && fy < b.y1 + 8) return 'Someone is standing there';
  return '';
}
/** The nearest place it fits to where it is wanted (up to HOUSE_SNAP room px), or the wanted place with why it does not. */
function _hsSnap(S, def, tx, ty, tz) {
  const sh = houseShape(def), C = S.carry;
  // a small thing over a top stands on it
  if (sh.hp === 'top') {
    for (const q of C.others) {
      const top = houseTopOf(q, gardenDecor(q.d)); if (!top) continue;
      const qd = houseDrawn(q, gardenDecor(q.d)); if (tx < top.x0 - 10 || tx > top.x1 + 10 || ty < qd.y0 - 20 || ty > q.y + 6) continue;
      const lo = top.x0 + sh.w / 2 + 1, hi = top.x1 - sh.w / 2 - 1; if (hi < lo) continue;
      for (const dx of [0, 8, -8, 16, -16, 24, -24, 32, -32, 40, -40]) { const x = Math.round(Math.max(lo, Math.min(hi, tx + dx))); if (!_hsFitWhy(S, def, x, top.y, top.z)) return { x, y: top.y, z: top.z, ok: true, why: '', moved: dx !== 0 }; }
    }
    tz = 0;
  }
  if (sh.hp === 'wall') ty = Math.max(HOUSE_SHELL.hang.y0 + sh.h, Math.min(HOUSE_SHELL.hang.y1, ty));
  else { const F = HOUSE_SHELL.floor; ty = Math.max(F.y0 + (sh.hp === 'rug' ? sh.d : sh.d) - 2, Math.min(F.y1, ty)); }
  tx = Math.round(tx); ty = Math.round(ty);
  const first = _hsFitWhy(S, def, tx, ty, 0); if (!first) return { x: tx, y: ty, z: 0, ok: true, why: '', moved: false };
  for (let r = 6; r <= HOUSE_SNAP; r += 6) for (let a = 0; a < 16; a++) {
    const ang = a / 16 * Math.PI * 2, x = Math.round(tx + Math.cos(ang) * r), y = Math.round(ty + Math.sin(ang) * r * (sh.hp === 'wall' ? 1 : .6));
    if (!_hsFitWhy(S, def, x, y, 0)) return { x, y, z: 0, ok: true, why: '', moved: true };
  }
  return { x: tx, y: ty, z: 0, ok: false, why: first, moved: false };
}
function _hsMoveFrame(R, S, dt) {
  const C = S.carry; if (!C) return;
  const def = gardenDecor(C.d); if (!def) return;
  const M = _grm.me;
  // where it is wanted: the pointer, or in front of you as you walk
  let tx, ty, tz = C.z;
  if (C.mode === 'pointer' && S.ptr) { tx = S.ptr.x; ty = houseShape(def).hp === 'wall' ? S.ptr.y + houseShape(def).h / 2 : S.ptr.y + (houseShape(def).hp === 'rug' ? houseShape(def).d / 2 : 6); }
  else if (M && (M.moving || C.dirty)) { const f = _hsInFront(S, def, M); tx = f.x; ty = f.y; tz = f.z; }
  else if (!C.dirty) { _hsGhostDraw(S, def); return; }
  if (tx == null) tx = C.x, ty = C.y;
  if (!C.dirty && Math.abs(tx - (C.wx || 0)) < 2 && Math.abs(ty - (C.wy || 0)) < 2) { _hsGhostDraw(S, def); return; }
  C.wx = tx; C.wy = ty; C.dirty = false;
  const at = _hsSnap(S, def, tx, ty, tz);
  C.x = at.x; C.y = at.y; C.z = at.z; C.ok = at.ok; C.why = at.why; C.moved = at.moved;
  _hsGhostDraw(S, def);
}
/** The ghost where the piece would go, and its footprint: green where it fits, red where it does not. */
function _hsGhostDraw(S, def) {
  const C = S.carry, G = S.ghost; if (!C) return;
  if (!G) { if (!S.native && (C.lx !== C.x || C.ly !== C.y || C.lok !== C.ok)) { C.lx = C.x; C.ly = C.y; C.lok = C.ok; _grmPaint(); } return; }
  if (!G.key) _hsGhostTexture(S);
  if (G.lastX === C.x && G.lastY === C.y && G.lastOk === C.ok && G.lastR === C.r && G.lastZ === C.z) return;
  G.lastX = C.x; G.lastY = C.y; G.lastOk = C.ok; G.lastR = C.r; G.lastZ = C.z;
  G.im.setPosition(C.x, C.y - C.z).setScale((C.r ? -1 : 1) / HOUSE_TEX_K, 1 / HOUSE_TEX_K).setAlpha(C.ok ? .86 : .55).setTint(C.ok ? 0xffffff : 0xff9a8a);
  G.im.setDepth(C.ok ? 1000 + C.y + (C.z ? 1.8 : -.3) : 9000);
  const sh = houseShape(def), col = C.ok ? 0x8ae08a : 0xf06a5a;
  G.fp.clear();
  if (sh.hp === 'wall') { const b = houseBox(C, def); G.fp.lineStyle(2, col, .9).strokeRoundedRect(b.x0 - 3, b.y0 - 3, b.x1 - b.x0 + 6, b.y1 - b.y0 + 6, 5).setDepth(130); }
  else if (C.z > 0) { G.fp.fillStyle(col, .35).fillEllipse(C.x, C.y - C.z, sh.w + 8, 7).setDepth(1000 + C.y + 1.7); }
  else { const b = houseBox(C, def); G.fp.fillStyle(col, .26).fillRoundedRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4, 6).lineStyle(2, col, .85).strokeRoundedRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4, 6).setDepth(105); }
}
/** Set it down where the ghost is. */
function _hsPlace(R, S) {
  const C = S.carry; if (!C) return false;
  const def = gardenDecor(C.d);
  if (!C.ok) { _grmSay((C.why || 'It does not fit there') + '.'); try { gpTone([220], { force: true, len: .14, vol: .05 }); } catch (e) { /* no sound */ } return true; }
  let op;
  if (C.from === 'room') {
    if (C.x === C.orig.x && C.y === C.orig.y && C.z === C.orig.z && C.r === C.orig.r) { _hsCarryCancel(R, S); return true; }
    op = { o: 'move', u: C.u, x: C.x, y: C.y, z: C.z, r: C.r };
  } else { const u = _gdUid('h'); op = { o: 'put', s: S.slot, d: C.d, x: C.x, y: C.y, z: C.z, r: C.r, u, lk: 'hf.' + u }; }
  const name = String(def.name).toLowerCase(), moved = C.moved;
  _hsCarryClear(S);
  if (gpVisiting()) { if (typeof _hsGuestDo === 'function') _hsGuestDo(R, S, op); }
  else {
    const r = houseDo(op, op.o === 'put' ? 'Brought in the ' + name : 'Moved the ' + name, { feet: null });
    if (!r.ok) { _grmSay(r.msg + '.'); _hsRoomRefresh(R, S, false); _hsHint(R, S); return true; }
    if (op.o === 'put') _hsPutReward(R, S);
  }
  _hsRoomRefresh(R, S, false); _hsHint(R, S);
  try { if (typeof _fxSound === 'function') _fxSound('pop'); } catch (e) { /* no sound */ }
  _hsPuff(S, op.x, op.y - (op.z || 0));
  if (moved) _grmSay('Moved over a little, so it fits.', 3000);
  return true;
}
/** Q: into your things. */
function _hsPutAway(R, S) {
  const C = S.carry; if (!C) return false;
  if (C.from === 'bag') { _hsCarryCancel(R, S); _grmSay('Back in your things.', 3000); return true; }
  const def = gardenDecor(C.d), op = { o: 'lift', u: C.u };
  _hsCarryClear(S);
  if (gpVisiting()) { if (typeof _hsGuestDo === 'function') _hsGuestDo(R, S, op); }
  else { const r = houseDo(op, 'Put away the ' + String(def.name).toLowerCase()); if (!r.ok) _grmSay(r.msg + '.'); }
  _hsRoomRefresh(R, S, false); _hsHint(R, S); _hsBagPaint(R, S);
  _grmSay(gpVisiting() ? `The ${String(def.name).toLowerCase()} goes in your friend’s chest.` : `The ${String(def.name).toLowerCase()} is in your things.`, 3500);
  try { if (typeof _fxSound === 'function') _fxSound('tick'); } catch (e) { /* no sound */ }
  return true;
}
function _hsTurn(R, S) {
  const C = S.carry; if (!C) return false;
  const def = gardenDecor(C.d), sh = houseShape(def);
  if (!sh.rot) { _grmSay(`${def.name} looks the same either way round.`, 3000); return true; }
  C.r = C.r ? 0 : 1; C.dirty = true;
  try { gpTone([520], { force: true, len: .08, vol: .04 }); } catch (e) { /* no sound */ }
  return true;
}
/** A little puff of dust where something was set down. */
function _hsPuff(S, x, y) {
  const s = _hsNative(); if (!s || !gardenMotionOn()) return;
  const scene = s.context.scene, key = _hsGlowKey(scene);
  for (let i = 0; i < 6; i++) { const im = scene.add.image(x + (Math.random() - .5) * 30, y - 4, key).setTint(0xe8dcc8).setAlpha(.5).setScale(.22 + Math.random() * .12).setDepth(9500); s.root.add(im); scene.tweens.add({ targets: im, x: im.x + (Math.random() - .5) * 40, y: im.y - 10 - Math.random() * 12, alpha: 0, scale: .05, duration: 520 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => im.destroy() }); }
}
/** Rewards for setting out your own house: the first thing, then ten, then twenty-five. */
function _hsPutReward(R, S) {
  const g = _gdG(), n = (Number(g.hs.puts) || 0) + 1; g.hs.puts = n;
  if (n === 1 && gpGrant('hs-first-piece', { 'mat:stone': 1 })) { _grmSay('It looks more like yours already. Under the floorboard you find a good stone.', 7000); try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } return; }
  if (n === 10 && gpGrant('hs-ten', { 'decor:hf-rocking-chair': 1 })) { _grmSay('Ten things set out: it is a home now. Somebody has left a rocking chair in your chest, with a ribbon on it.', 9000); try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } return; }
  if (n === 25 && gpGrant('hs-25', { 'decor:hf-wall-clock': 1 })) { _grmSay('Every corner just so. A wall clock turns up in your chest, ticking already.', 9000); try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } }
}

/* ---------- papers and floors ---------- */
function _hsFinish(R, S, id) {
  const def = gardenDecor(id); if (!def || !def.finish) return;
  const op = { o: def.finish, s: S.slot, d: id, lk: 'hfw.' + S.slot + '.' + _gdUid('') };
  if (gpVisiting()) { if (typeof _hsGuestDo === 'function' && _hsGuestDo(R, S, op)) _hsSweep(S, def.finish); return; }
  const r = houseDo(op, (def.finish === 'wall' ? 'Papered the walls: ' : 'Laid the floor: ') + def.name.toLowerCase());
  if (!r.ok) { _grmSay(r.msg + '.'); return; }
  _hsSweep(S, def.finish);
  _hsRoomRefresh(R, S, false); _hsBagPaint(R, S); _hsHint(R, S);
  const base = def.finish === 'wall' ? HOUSE_WALL0 : HOUSE_FLOOR0;
  const gift = id !== base && gpGrant('hs-first-finish', { 'mat:timber': 1 });
  _grmSay(id === base ? (def.finish === 'wall' ? 'Back to plain limewash. The paper is in your things.' : 'Back to bare boards. The old floor is in your things.') : `${def.name}, all done.${gift ? ' Behind the old one you find a good length of timber.' : ' The old one is in your things.'}`, 6000);
  try { if (typeof _fxSound === 'function') _fxSound('chime'); } catch (e) { /* no sound */ }
}
/** A sweep of light across the wall or floor while the new one goes on. */
function _hsSweep(S, which) {
  const s = _hsNative(); if (!s || !gardenMotionOn()) return;
  const scene = s.context.scene, wall = which === 'wall', y0 = wall ? 150 : 400, h = wall ? 250 : 200;
  const band = scene.add.rectangle(-120, y0, 120, h, 0xfff4dc, .35).setOrigin(0, 0).setDepth(wall ? 99 : 105).setBlendMode(Phaser.BlendModes.ADD); s.root.add(band);
  scene.tweens.add({ targets: band, x: 980, duration: 900, ease: 'Sine.easeInOut', onComplete: () => band.destroy() });
}

/* ---------- input while setting out ---------- */
function _hsMoveTap(R, S, p) {
  S.ptr = p;
  if (S.carry) { S.carry.mode = 'pointer'; S.carry.dirty = true; _hsMoveFrame(R, S, 0); if (S.carry.drag) return true; return _hsPlace(R, S); }
  if (!S.move) return false;
  const hit = _hsHit(S, p.x, p.y);
  if (hit) { _hsPickUp(R, S, hit, true); return true; }
  return false;   // (the floor: walk there; the door: out)
}
function _hsMoveUp(R, S) {
  const C = S.carry; if (!C || !C.drag) return;
  C.drag = false;
  const moved = C.down && S.ptr && Math.hypot(S.ptr.x - C.down.x, S.ptr.y - C.down.y) > 8;
  if (moved) _hsPlace(R, S);   // (dragged: let go to set it down; a click picks it up and a second click sets it down)
}
function _hsMoveCancelDrag(R, S) { if (S.carry) S.carry.drag = false; }
function _hsMoveKey(R, S, k) {
  if (S.carry) {
    if (k === 'e' || k === 'Enter' || k === ' ') { S.carry.mode = 'keys'; return _hsPlace(R, S); }
    if (k === 'r') return _hsTurn(R, S);
    if (k === 'q') return _hsPutAway(R, S);
    if (/^(Arrow|[wasd]$)/.test(k)) { S.carry.mode = 'keys'; S.carry.dirty = true; }
    return false;
  }
  if (k === 'e' || k === 'Enter' || k === ' ') {
    const M = _grm.me; if (!M) return false;
    let best = null, bd = HOUSE_REACH;
    for (const q of S.pieces) { const sh = houseShape(gardenDecor(q.d)); if (!sh) continue; const fy = sh.hp === 'wall' ? 420 : q.y, fx = Math.max(q.x - sh.w / 2, Math.min(q.x + sh.w / 2, M.x)), d = Math.hypot(M.x - fx, (M.y - fy) * 1.2) + ((q.z || 0) > 0 ? -6 : 0); if (d < bd) { bd = d; best = q; } }
    if (best) { _hsPickUp(R, S, best, false); return true; }
    if (Math.hypot(M.x - HOUSE_SHELL.stand.x, M.y - HOUSE_SHELL.stand.y) < HOUSE_REACH) { gardenRoomLeave(); return true; }
    return true;
  }
  return false;
}
function _hsMoveEsc(R, S) {
  if (S.carry) { _hsCarryCancel(R, S); _grmSay('Put back where it was.', 2500); return true; }
  if (S.chest && !S.move) { S.chest = false; _hsBagPaint(R, S); return true; }
  if (S.move) { _hsMoveToggle(R, S, false); return true; }
  return false;
}
/** The prompt while setting out: what E picks up. */
function _hsMovePromptRow(R, S) {
  if (S.carry) return null;
  const M = _grm.me; if (!M) return null;
  let best = null, bd = HOUSE_REACH;
  for (const q of S.pieces) { const def = gardenDecor(q.d), sh = houseShape(def); if (!sh) continue; const fy = sh.hp === 'wall' ? 420 : q.y, fx = Math.max(q.x - sh.w / 2, Math.min(q.x + sh.w / 2, M.x)), d = Math.hypot(M.x - fx, (M.y - fy) * 1.2) + ((q.z || 0) > 0 ? -6 : 0); if (d < bd) { bd = d; best = { words: 'Pick up the ' + String(def.name).toLowerCase().replace(/^a /, ''), x: q.x, y: q.y - (q.z || 0) - sh.h }; } }
  return best;
}

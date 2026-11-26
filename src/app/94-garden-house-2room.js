/* ============================================================
   YOUR OWN HOUSE, going in and being there. Your house is found by kind (houseFindHome, 94-garden-house-0rules.js): the free
   home-kind building with a door nearest the garden's heart. Walk to its door: "E  Go in" (or its bubble's "Go in"), and you are
   inside, in the hidden rooms' engine (94-garden-world-4rooms.js, GardenNativeRooms): one room a screen, painted
   (94-garden-house-1shell.js), its furniture drawn as itself (94-garden-house-1furn.js), sorted with the people so you walk
   behind the table.

     gardenHouseMine()            your house: { id, word, look, name, door } or null (on a visit: your friend's, from their snapshot)
     gardenHouseReserve(things, saved)  the villagers' home solver leaves it alone (94-garden-wonder-0vale-folk.js)
     gardenHouseActRows(px, py)   "E  Go in" at its door (94-garden-zz-7act-1core.js asks)
     gardenHouseItems(id, items)  "Go in" in its bubble (94-garden-world-4rooms.js gardenRoomItems)
     gardenHouseGo()              walk to the door and go in
     gardenHouseRoomRow(id)       the room's row ('hs-0'), one object for good: friends' steps in and out find it (gardenRoomHear)
     gardenHouseDoorPt(R)         its door, from the layout (_grmDoorPt)
     GRM_PLAY.house               the room's play: begin, tap, key, esc, frame... (registered by _hsBoot, on first use)

   Inside, by kind (rule 17: any piece of a kind does what its kind does): a light switches, a chest opens your things, a bed
   gives a nap, a seat a rest, books a page, a clock the real time; the window looks out, the fire warms you, the door lets you out.
   Moving and setting out things: 94-garden-house-3arrange.js. Friends: 94-garden-house-6share.js.
   SAVES: g.hs (the house), g.hr (its rooms), g.hf (what stands in them); one op at a time through the rules file, with Undo.
   No top-level calls: everything is registered on first use (_hsBoot), so the load order of the files never matters.
   ============================================================ */
const _hs = { booted: false, rows: new Map(), mine: null, mineKey: '', mineAt: 0, saidNear: false, keys: [], arrive: null };
const HOUSE_REACH = 92;            // room px: how near you stand to use a thing
const HOUSE_DOOR_REACH = 1.8;      // cells: how near the door outside offers "Go in"

/* ---------- which house ---------- */
function _hsBoot() {
  if (!_hs.modded && typeof wdMod === 'function' && typeof _hsOutsideModDef === 'function') { _hs.modded = true; wdMod(_hsOutsideModDef()); }   // (the cottage outside as it grows: 94-garden-house-4grow.js)
  if (_hs.booted) return true;
  if (typeof GRM_PLAY === 'undefined' || typeof GRM === 'undefined') return false;
  GRM_PLAY.house = HOUSE_PLAY;
  _hs.booted = true;
  return true;
}
/** The villagers' saved homes (and the hidden rooms' buildings): nobody else's house is yours. */
function _hsTaken(saved) {
  const taken = new Set();
  try {
    if (saved) { for (const v of Object.values(saved)) if (v) taken.add(String(v)); }
    else if (typeof _wdG === 'function') { for (const [k, v] of Object.entries(_wdG() || {})) if (k.startsWith('vh.') && v) taken.add(String(v)); }
  } catch (e) { /* none */ }
  try { if (typeof GRM_ROOMS !== 'undefined') for (const R of GRM_ROOMS) if (R.at) taken.add(R.at); } catch (e) { /* none */ }
  return taken;
}
/** A house's door in the layout: its static row's door cell, or for a placed thing its foot. */
function _hsDoorOf(t) {
  if (!t) return null;
  let row = null; try { row = (gardenIslandData().static || []).find(q => q.id === t.id) || null; } catch (e) { row = null; }
  if (row && row.door && Number.isFinite(row.door.x)) return { x: row.door.x + .5, y: row.door.y + .5 };
  if (t.src === 'thing') return { x: t.x, y: t.y + .42 };
  return null;
}
function _hsOpenAt(d) { try { return !gardenZoneLockAt(Math.floor(d.x), Math.floor(d.y)); } catch (e) { return true; } }
function _hsThings() { try { return typeof gardenAffordThings === 'function' ? gardenAffordThings() : []; } catch (e) { return []; } }
function _hsNameOf(t, word) {
  let n = ''; try { const s = typeof gardenLandSight === 'function' ? gardenLandSight(t.id) : null; n = (s && s.name) || t.name || ''; } catch (e) { n = t && t.name || ''; }
  n = String(n || '').replace(/^the /i, ''); if (!n) n = word === 'cottage' ? 'Your cottage' : 'Your ' + (word || 'house');
  return n.charAt(0).toUpperCase() + n.slice(1);
}
/** Your house (or, on a visit, your friend's). Worked out at most every 2 s, from the layout's own things. */
function gardenHouseMine() {
  let m = null; try { m = gardenHere(); } catch (e) { return null; }
  const visit = m && m.visit, g = visit ? null : _gdG(), hs = visit ? (visit.snap && visit.snap.hs) : g.hs || {};
  const want = visit ? (hs && hs.h) || '' : hs.home || '';
  const now = performance.now(), key = (visit ? 'v:' + visit.fid : 'me') + '|' + want + '|' + (typeof gardenIslandData === 'function' ? gardenIslandData().id : '');
  if (_hs.mineKey === key && now - _hs.mineAt < 2000) return _hs.mine;
  _hs.mineKey = key; _hs.mineAt = now;
  const things = _hsThings();
  let t = want ? things.find(q => q.id === want && houseHomeWord(q)) : null;
  if (!t && visit) { _hs.mine = null; return null; }   // (their house is not in this world's layout: no door)
  if (!t) t = houseFindHome(things, GARDEN_LAND_HEART, _hsTaken(null), _hsDoorOf, q => { const d = _hsDoorOf(q); return !!d && _hsOpenAt(d); });
  if (!t) { _hs.mine = null; return null; }
  const word = houseHomeWord(t), door = _hsDoorOf(t);
  _hs.mine = door ? { id: t.id, word, look: (visit ? hs.l : hs.look) || houseLookOf(word), name: _hsNameOf(t, word), door, visit: !!visit, moved: visit ? true : !!hs.home } : null;
  return _hs.mine;
}
/** For the villagers' home solver: your house, so nobody new moves into it. */
function gardenHouseReserve(things, saved) {
  try {
    const g = _gdG(); if (g.hs && g.hs.home) return [g.hs.home];
    const t = houseFindHome(things, GARDEN_LAND_HEART, _hsTaken(saved || {}), _hsDoorOf, q => { const d = _hsDoorOf(q); return !!d && _hsOpenAt(d); });
    return t ? [t.id] : [];
  } catch (e) { return []; }
}
function gardenHouseDoorPt(R) { try { const H = gardenHouseMine(); return H && (!R || !R.home || R.home === H.id) ? { x: H.door.x, y: H.door.y } : null; } catch (e) { return null; } }

/* ---------- the way in, outside ---------- */
function _hsSym() {
  return '<path d="M-17 0V-30Q-17 -42 0 -42Q17 -42 17 -30V0Z" fill="#6a4a2e"/><path d="M-13 0V-29Q-13 -37 0 -37Q13 -37 13 -29V0Z" fill="#8a5e38"/>'
    + '<path d="M-13 -22H13M-13 -11H13" stroke="#5a3a22" stroke-width="2"/><circle cx="8" cy="-16" r="1.8" fill="#d8b45a"/>'
    + '<circle cx="-16" cy="-38" r="4" fill="#d8687a"/><circle cx="-20" cy="-31" r="3.4" fill="#e8909a"/><circle cx="16" cy="-40" r="3.6" fill="#d8687a"/><circle cx="-15" cy="-45" r="2.6" fill="#5a8a44"/><circle cx="19" cy="-34" r="2.6" fill="#5a8a44"/>'
    + '<path d="M-21 0H21V3H-21Z" fill="#a8a296"/>';
}
function gardenHouseActRows(px, py) {
  try { return _hsActRows(px, py); } catch (e) { if (!_hs.warned) { _hs.warned = true; console.error('[house]', e); } return []; }   // (the house never stops the garden's prompt)
}
function _hsActRows(px, py) {
  if (typeof _gw === 'undefined' || !_gw.on) return [];
  _hsBoot();
  const H = gardenHouseMine(); if (!H) return [];
  const d = Math.hypot(H.door.x - px, (H.door.y - py) * 1.3);
  if (!H.visit && !H.moved && !_hs.saidNear && d < 4) { _hs.saidNear = true; try { gardenMessage(`${H.name} stands empty, its door on the latch. A note pinned to it says: “For whoever keeps the garden now.”`, { ambient: true, source: 'house-near', icon: 'house' }); } catch (e) { /* only words */ } }
  const post = _hsPostRow(H, px, py);
  if (d > HOUSE_DOOR_REACH) return post ? [post] : [];
  // (at the door, with the doorstep as where you stand: in the doorway or on the step it is offered whichever way you face; the prompt floats over the door)
  return (post ? [post] : []).concat([{ key: 'house:' + H.id, act: 'house', house: H.id, src: 'house:' + H.id, words: H.visit ? 'Go in' : H.moved ? 'Go in' : 'Go in: it is yours', name: H.name, x: H.door.x, y: H.door.y, stand: { x: H.door.x, y: H.door.y + .75 }, promptY: H.door.y - 1.7, pri: 0.8 }]);
}
/** "E  Check the post" at your mailbox while a letter waits (the mailbox stands where 94-garden-house-4grow.js draws it). */
function _hsPostRow(H, px, py) {
  if (H.visit || !H.moved || typeof _hsPostUnread !== 'function' || typeof _hsOutBox !== 'function') return null;
  if (_hs.postRev !== _gd.rev) { _hs.postRev = _gd.rev; _hs.postN = _hsPostUnread(); }
  if (!_hs.postN) return null;
  const B = _hsOutBox(H.id); if (!B) return null;
  const W = GARDEN_WORLD, mx = (B.cx - B.w * .2) / W.cellW, my = (B.foot + 6 - W.sky) / W.cellH;
  if (Math.hypot(mx - px, (my - py) * 1.3) > 1.5) return null;
  return { key: 'house-post:' + H.id, act: 'house', house: H.id, post: 1, src: 'house-post:' + H.id, words: 'Check the post', name: 'your mailbox', x: mx, y: my, stand: { x: mx, y: my + .55 }, promptY: my - 1.3, pri: .9 };
}
function gardenHouseItems(id, items) {
  let H = null; try { H = gardenHouseMine(); } catch (e) { H = null; } if (!H || H.id !== id) return;
  items.unshift({ svg: `<svg viewBox="-30 -60 60 66" width="26" height="26" aria-hidden="true">${_hsSym()}</svg>`, label: 'Go in', cls: 'is-go grm-way', run: () => gardenHouseGo() });
  if (H.moved && typeof _hsPlanOpen === 'function' && (!H.visit || (typeof _glvLive === 'function' && _glvLive()))) items.splice(1, 0, { svg: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 11L12 4L21 11" fill="none" stroke="#6a4a2e" stroke-width="2" stroke-linejoin="round"/><path d="M6 10V20H18V10" fill="#f4e6c8" stroke="#6a4a2e" stroke-width="1.6"/><path d="M14 20V14H18" fill="none" stroke="#a8865a" stroke-width="1.4" stroke-dasharray="2 2"/></svg>`, label: H.visit ? 'Their plans' : 'Build on', cls: 'grm-way', run: () => { try { gardenBubbleClose(); } catch (e) { /* closed */ } _hsPlanOpen(); } });
}
/** Walk to the door and go in (or, from the mailbox's prompt, read the post). */
function gardenHouseGo(spot) {
  if (spot && spot.post) { if (typeof _hsPostOpen === 'function') _hsPostOpen(); _hs.postRev = -1; return true; }
  if (!_hsBoot()) return false;
  const H = gardenHouseMine(); if (!H) return false;
  const R = gardenHouseRoomRow('hs-0'); if (!R) return false;
  try { _hsWarm(R); } catch (e) { /* drawn on the way in */ }
  _hs.arrive = { slot: 0, via: 'left' };
  gardenRoomGo(R);
  return true;
}

/* ---------- the room's row ---------- */
/** The house as it is now: { home, kind, look, rooms, pieces } (your garden's, or your friend's from their snapshot, with what you asked for on top). */
function _hsView() {
  let m = null; try { m = gardenHere(); } catch (e) { return null; }
  if (m && m.visit) { const v = houseFromWire(m.visit.snap && m.visit.snap.hs); return v && typeof _hsGuestOver === 'function' ? _hsGuestOver(v) : v; }
  const g = _gdG(), hs = g.hs || {};
  if (!hs.home) { const H = gardenHouseMine(); return H ? { home: H.id, kind: H.word, look: H.look, rooms: { 0: { st: 2, w: HOUSE_WALL0, f: HOUSE_FLOOR0 } }, pieces: [], fresh: true } : null; }
  const rooms = {}; for (const [k, r] of Object.entries(g.hr || {})) if (r && typeof r === 'object') rooms[k] = { st: r.st || 0, w: r.w || HOUSE_WALL0, f: r.f || HOUSE_FLOOR0, d: r.d || '' };
  return { home: hs.home, kind: hs.kind || 'cottage', look: HOUSE_LOOKS.includes(hs.look) ? hs.look : 'thatch', rooms, pieces: housePieces(g), jar: hs.jar || null, hw: hs.hw || null, guest: hs.guest || null, bn: typeof hs.bn === 'string' && HOUSE_BANNER_RE.test(hs.bn) ? hs.bn : '', stars: Number(hs.stars) || 0, hands: Array.isArray(hs.hands) ? hs.hands : [] };
}
/** The light outside now, as the window shows it. */
function _hsLight() {
  let m = null; try { m = gardenHere(); } catch (e) { m = null; }
  return { tod: HOUSE_TOD.includes(m && m.tod) ? m.tod : 'day', season: (m && m.season) || 'summer', wx: m && m.rain ? (m.rain.snow ? 2 : m.rain.now ? 1 : 0) : 0 };
}
function _hsPaintParams(R) {
  const v = _hsView(), rooms = (v && v.rooms) || {}, room = rooms[String(R.slot)] || { w: HOUSE_WALL0, f: HOUSE_FLOOR0 }, L = _hsLight();
  const sh = houseShellFor(R.slot, rooms), guest = v && v.guest && v.guest.n && sh.way && sh.way.to === v.guest.s ? String(v.guest.n).slice(0, 22) : '';
  return { slot: R.slot, open: !!sh.way, guest, look: (v && v.look) || 'thatch', wall: room.w || HOUSE_WALL0, floor: room.f || HOUSE_FLOOR0, tod: L.tod, season: L.season, wx: L.wx };
}
/** The painting this room wants now, registered with the painted rooms under its own key (only the last few are kept). */
function _hsPaintKey(R) {
  const P = _hsPaintParams(R), key = houseShellKey(P) + (P.guest ? '|' + P.guest : '');
  if (typeof GRA_ROOMS !== 'undefined' && !GRA_ROOMS[key]) {
    GRA_ROOMS[key] = houseShellSpec(P); _hs.keys.push(key);
    while (_hs.keys.length > 10) { const old = _hs.keys.shift(); if (old !== key) delete GRA_ROOMS[old]; }
  }
  return key;
}
function gardenHouseRoomRow(id) {
  const m = /^hs-([0-7])$/.exec(String(id || '')); if (!m) return null;
  if (_hs.rows.has(id)) return _hs.rows.get(id);
  if (!_hsBoot()) return null;
  const slot = Number(m[1]);
  const R = {
    id, slot, house: true, play: 'house', door: 'plank', verb: 'Go in', bg: '#1a120c',
    get home() { const H = gardenHouseMine(); return H ? H.id : ''; },
    get name() { const H = gardenHouseMine(), n = H ? H.name : 'The house'; return slot ? n + ': ' + houseRoomName(slot).replace(/^The /, 'the ') : n; },
    floor: Object.freeze({ x0: 38, x1: 922, y0: 410, y1: 572 }),
    get blocks() { const S = _grm.R === R && _grm.S; return (S && S.blocks) || []; },
    get spawn() { const S = _grm.R === R && _grm.S; return (S && S.spawn) || (S && S.shell || HOUSE_SHELL).spawn; },
    get paintKey() { return _hsPaintKey(R); },
    get say() { return _hsSayIn(R); },
    get how() { return gpVisiting() || (_grm.S && _grm.S.movedIn) ? '' : 'Move things (at the top) to set your room out. The chest keeps your things.'; },
    sym: _hsSym,
    art() { return _hsSvgRoom(R); },
  };
  _hs.rows.set(id, R);
  return R;
}
function _hsSayIn(R) {
  const H = gardenHouseMine(), L = _hsLight();
  if (R.slot) {
    const v = _hsView(), guest = v && v.guest && v.guest.s === R.slot ? v.guest.n : '';
    if (gpVisiting()) return { 1: 'Your friend’s parlour. Somebody has plumped the cushions.', 2: 'Your friend’s loft, under the roof. It smells of warm thatch.', 3: guest ? `${guest}’s room, in your friend’s house.` : 'Your friend’s guest room. The bed is made.' }[R.slot] || 'Your friend’s house.';
    const lines = { 1: { dawn: 'The parlour. The window seat is cold and the light is grey and gold.', day: 'The parlour. The sun is on the window seat.', dusk: 'The parlour. The little fire is lit, and the window has gone blue.', night: 'The parlour. Only the fire, and the clock you have not got yet.' }, 2: { dawn: 'The loft. The round window is the first thing in the house to get the sun.', day: 'The loft. Dust turns slowly in the light from the round window.', dusk: 'The loft. The rafters go gold, then dark.', night: 'The loft. You can hear the thatch settle.' }, 3: { dawn: 'The guest room, quiet and made up.', day: 'The guest room. Fresh sheets, and the window box out in the sun.', dusk: 'The guest room. Someone could be very comfortable in here.', night: 'The guest room, its curtains drawn.' } };
    return (guest ? `${guest}’s room. ` : '') + ((lines[R.slot] || {})[L.tod] || houseRoomName(R.slot) + '.');
  }
  if (gpVisiting()) { let who = 'your friend'; try { who = _gdvFirst() || who; } catch (e) { /* the plain word */ } return `${who}’s ${H && H.word || 'house'}. You wipe your feet.`; }
  if (!_gdG().hs || !_gdG().hs.home || (_grm.S && _grm.S.movedIn)) return `${H ? H.name : 'The cottage'}. Aired and swept, the fire laid and lit. A note on the table: “It is yours, dear. Mother Thistle.”`;
  return { dawn: 'Home. The first light is at the window.', day: 'Home. The fire is in, and the kettle is on the hob.', dusk: 'Home. The fire is the brightest thing in the room.', night: 'Home. The fire has burned low and warm.' }[L.tod] || 'Home.';
}

/* ---------- inside: the play ---------- */
/** The native room's state, while this is the room you are in. */
function _hsNative() { const s = window.GardenNativeRooms && GardenNativeRooms.current(); return s && !s.music && s.R && s.R.house ? s : null; }
function _hsInside() { return !!(_grm.on && _grm.R && _grm.R.house && _grm.S); }
function _hsFeet(S) { const out = []; if (_grm.me) out.push([_grm.me.x, _grm.me.y]); for (const Q of _grm.m.values()) out.push([Q.x, Q.y]); return out; }
const HOUSE_PLAY = {
  begin(R, S) {
    const t0 = performance.now();
    S.slot = R.slot; S.rev = -1; S.vrev = -1; S.snapRef = null; S.move = false; S.carry = null; S.imgs = new Map(); S.lamps = new Map(); S.lampList = []; S.clocks = new Map(); S.blocks = []; S.pieces = []; S.dirty = false; S.pend = new Map();
    S.native = !!_hsNative(); S.t = 0; S.lightAt = 0; S.keyNow = R.paintKey; S.near = null; S.nearAt = 0;
    S.leave = () => _hsEnd(R, S);
    if (_hs.dirty) { S.dirty = true; _hs.dirty = false; }
    if (!gpVisiting()) _hsMoveIn(R, S);
    S.shell = houseShellFor(R.slot, ((_hsView() || {}).rooms) || {});
    const A = _hs.arrive && _hs.arrive.slot === R.slot ? _hs.arrive : null; _hs.arrive = null;
    S.spawn = A && A.via === 'way' && S.shell.way ? S.shell.way.spawn : S.shell.spawn;
    { const s = _hsNative(); if (s && s.doorMark && s.doorMark.root) s.doorMark.root.setPosition(S.shell.hatch ? 30 : 0, S.shell.hatch ? -30 : -82); }   // (the way-out badge on the wall over the door you came in by, not on its panels; in the loft over the ladder's top)
    _hsRoomRefresh(R, S, true);
    _hsUi(R, S);
    if (typeof _hsWarmMaybe === 'function') setTimeout(() => { if (_grm.S === S && _hsInside()) _hsWarmMaybe(R, S); }, 2200);   // (a knock, once the room is drawn)
    try { if (typeof _fxSound === 'function') _fxSound('pop'); } catch (e) { /* no sound */ }
    S.beginMs = Math.round((performance.now() - t0) * 10) / 10;   // (what going in costs this house's own code: gardenHouseDebug())
  },
  spots(R, S) { return S.native ? [] : _hsSvgSpots(R, S); },
  act(R, S, id) { const u = String(id).replace(/^p:/, ''), p = S.pieces.find(q => q.u === u); if (!p) return; if (S.move) { if (typeof _hsPickUp === 'function') _hsPickUp(R, S, p); } else _hsUse(R, S, p); },
  tap(R, S, p) {
    if (S.move || S.carry) return typeof _hsMoveTap === 'function' && _hsMoveTap(R, S, p);
    const hit = _hsHit(S, p.x, p.y);
    if (hit) { const U = _hsUseOf(hit); if (!U) return false; _hsWalkTo(S, _hsStandAt(hit), () => _hsUse(R, S, hit)); return true; }
    const sh = S.shell || HOUSE_SHELL, D = sh.door;
    if (p.x >= D.x0 - 8 && p.x <= D.x1 + 8 && p.y >= D.y0 - 10 && p.y <= 448) { _hsWalkTo(S, sh.stand, () => _hsBack(R, S)); return true; }
    const Y = sh.way; if (Y && p.x >= Y.x0 - 8 && p.x <= Y.x1 + 8 && p.y >= Y.y0 - 10 && p.y <= 448) { _hsWalkTo(S, Y.stand, () => _hsOn(R, S)); return true; }
    const W = sh.window; if (p.x >= W.x0 && p.x <= W.x1 && p.y >= W.y0 && p.y <= W.y1 + (W.kind === 'bay' ? 56 : 0)) { _hsWalkTo(S, { x: (W.x0 + W.x1) / 2, y: 424 }, () => _hsShellUse(R, S, 'window')); return true; }
    const F = sh.hearth; if (F && sh.fire && p.x >= F.x0 && p.x <= F.x1 && p.y >= sh.fire.y0 - 40 && p.y <= 452) { _hsWalkTo(S, { x: (F.x0 + F.x1) / 2, y: 462 }, () => _hsShellUse(R, S, 'fire')); return true; }
    return false;
  },
  key(R, S, k) {
    if (S.move || S.carry) return typeof _hsMoveKey === 'function' && _hsMoveKey(R, S, k);
    if (k !== 'e' && k !== 'Enter' && k !== ' ') return false;
    const n = _hsNearest(S); if (!n) return false;
    if (n.shell === 'door') { _hsBack(R, S); return true; }
    if (n.shell === 'way') { _hsOn(R, S); return true; }
    if (n.shell) { _hsShellUse(R, S, n.shell); return true; }
    _hsUse(R, S, n.p); return true;
  },
  esc(R, S) { return typeof _hsMoveEsc === 'function' && _hsMoveEsc(R, S); },
  up(R, S) { if (typeof _hsMoveUp === 'function') _hsMoveUp(R, S); },
  cancel(R, S) { if (typeof _hsMoveCancelDrag === 'function') _hsMoveCancelDrag(R, S); },
  frame(R, S, dt) {
    S.t += dt;
    const fresh = gpVisiting() ? (typeof _gdv !== 'undefined' ? _gdv.rev : 0) !== S.vrev : _gd.rev !== S.rev;   // (no work a frame: a number compared)
    if (fresh) { S.vrev = typeof _gdv !== 'undefined' ? _gdv.rev : 0; if (!gpVisiting() || _hsSnapRef() !== S.snapRef || S.pend.size) _hsRoomRefresh(R, S, false); }
    if (S.t - S.lightAt > 60) { S.lightAt = S.t; if (R.paintKey !== S.keyNow) _hsShellSwap(R, S); }
    if (S.swap) _hsShellSwapStep(S);
    if (typeof _hsMoveFrame === 'function') _hsMoveFrame(R, S, dt);
    if (S.t - S.nearAt > .16) { S.nearAt = S.t; _hsPrompt(R, S); }
    if (S.lampList.length && gardenMotionOn()) for (let i = 0; i < S.lampList.length; i++) { const L = S.lampList[i]; if (L.glow.active) L.glow.setAlpha(L.a * (.86 + Math.sin(S.t * 8.3 + L.ph) * .08 + Math.sin(S.t * 19.7 + L.ph * 2) * .05)); }
    if (S.clocks.size && (S.clockAt == null || S.t - S.clockAt > 5)) { S.clockAt = S.t; _hsClocks(S); }
    if (S.pend.size && typeof _hsGuestPendTick === 'function') _hsGuestPendTick(R, S);
    if (S.heldList && S.heldList.length) _hsHeldFrame(S);
    if (S.warm && typeof _hsWarmFrame === 'function') _hsWarmFrame(R, S, dt);   // a housewarming (94-garden-house-5warm.js)
  },
};
function _hsSnapRef() { try { const m = gardenHere(); return m && m.visit && m.visit.snap ? m.visit.snap.hs || null : null; } catch (e) { return null; } }
/** Moving in, the first time you go in: the house is yours, with its first things (free). */
function _hsMoveIn(R, S) {
  const g = _gdG(); if (g.hs && g.hs.home) {
    // (the layout moved your house: the same rooms, the new house)
    const H = gardenHouseMine(); if (H && H.id !== g.hs.home && !_hsThings().some(t => t.id === g.hs.home)) { g.hs.home = H.id; g.hs.kind = H.word; g.hs.look = houseLookOf(H.word); _gdSaveQuiet(); }
    // (a house moved into before there were guest books: one turns up, wrapped, by the door)
    if (!Object.values(g.hf || {}).some(p => p && p.d === 'hf-guest-book') && _hsGrant('hs-guestbook', { 'decor:hf-guest-book': 1 }) && typeof _grmLater === 'function') _grmLater(R, S, () => _grmSay('A parcel by the door: a guest book on a little stand, “for the friends who come”. It is in your chest: set it out with Move things.', 9000), 9400);
    return;
  }
  const H = gardenHouseMine(); if (!H) return;
  const op = { o: 'home', h: H.id, k: H.word, l: houseLookOf(H.word), day: _gdToday(), us: HOUSE_START.map(() => _gdUid('h')) };
  const r = houseDo(op, 'Moved in', { noUndo: true }); if (!r.ok) return;
  S.movedIn = true;
  const gift = _hsGrant('hs-home', { 'mat:timber': 2, 'mat:stone': 1 });
  if (typeof _grmLater === 'function') _grmLater(R, S, () => _grmSay(`It is yours now: the bed, the table, the chest and the rest. ${gift ? 'Behind the door you find 2 timber and a good stone, left for you. ' : ''}Click Move things to set it out your way.`, 10000), 9400);
}
/** A once-ever gift (as gpGrant, the same ledger line and mark), saved quietly: the garden outside is hidden while you are in, and is drawn
 *  again once as you leave (a full repaint behind the room was a long task on going in). */
function _hsGrant(key, items) {
  const g = _gdG(), k = 'plg.' + key;
  if (g.led[k] || g.seen['pl.gr.' + key]) return false;
  g.led[k] = { d: _gdToday(), k: 'pl', i: items, n: 1 }; g.seen['pl.gr.' + key] = _gdToday();
  _gdSaveQuiet(); if (_hsInside()) _grm.S.dirty = true;
  return true;
}
/** One change to your own house, through the rules file: checked, applied once, saved (quietly: the garden outside is not drawn again), with Undo. */
function houseDo(op, label, o) {
  o = o || {};
  const g = _gdG(), W = { g, has: gardenHas, coins: gardenWallet().coins, feet: o.feet || null, today: _gdToday() };
  const why = houseOpCheck(W, op, '');
  if (why) return { ok: false, msg: why };
  const mark = _gdMark(houseOpTouches(op, g));
  houseOpApply(g, op, '', { now: _gdNow(), today: _gdToday(), tomorrow: _gdAddDays(_gdToday(), 1) });
  if (!o.noUndo) _gdPushUndo(label || 'A change in your house', mark);
  _gdSaveQuiet();
  if (typeof _hsSnapSoon === 'function') _hsSnapSoon();
  const S = _hsInside() ? _grm.S : null; if (S) S.dirty = true;
  return { ok: true };
}

/* ---------- drawing what stands in the room (the painted rooms: Phaser images of their own, sorted with the people) ---------- */
function _hsDepth(p, S) { const sh = houseShape(gardenDecor(p.d)); if (!sh) return 100; if (sh.hp === 'rug') return 110 + p.y / 1000; if (sh.hp === 'wall') return 120 + p.y / 1000; return 1000 + p.y + ((p.z || 0) > 0 ? 1.8 : -.3); }
function _hsLitKey(p) { const sh = houseShape(gardenDecor(p.d)); return !!(sh && sh.lit && p.l); }
function _hsTexInUse(key) { const S = _hsInside() ? _grm.S : null; if (!S || !S.imgs) return false; for (const it of S.imgs.values()) if (it.key === key) return true; return S.carry && S.carry.key === key; }
/** Everything about the room again: the view, the people's blocks, the pictures. first: just come in. */
function _hsRoomRefresh(R, S, first) {
  S.rev = _gd.rev; S.snapRef = gpVisiting() ? _hsSnapRef() : null;
  const v = _hsView(); S.view = v;
  S.pieces = v ? v.pieces.filter(p => p.s === S.slot) : [];
  S.shell = houseShellFor(R.slot, (v && v.rooms) || {});
  if (S.carry && S.carry.u && !S.pieces.some(p => p.u === S.carry.u) && typeof _hsMoveDrop === 'function') _hsMoveDrop(R, S, 'gone');
  S.blocks = _hsBlocksFor(S, S.pieces.filter(p => !(S.carry && S.carry.u === p.u)));
  if (S.native) _hsSync(R, S); else if (!first) _grmPaint();
  if (!first && R.paintKey !== S.keyNow) _hsShellSwap(R, S);
  if (typeof _hsBagPaint === 'function') _hsBagPaint(R, S);
}
function _hsGlowKey(scene) {
  const key = 'gdhouse-glow'; if (scene.textures.exists(key)) return key;
  const c = document.createElement('canvas'); c.width = c.height = 64; const cx = c.getContext('2d'), g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(.35, 'rgba(255,214,140,.45)'); g.addColorStop(1, 'rgba(255,200,120,0)'); cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
  scene.textures.addCanvas(key, c); return key;
}
const _HS_FLAME = Object.freeze({ 'hf-candlestick': [0, -30, 150], 'hf-oil-lamp': [0, -27, 210], 'hf-standard-lamp': [0, -96, 280] });   // (room px over the foot, at HOUSE_ART_K)
/** Make the room's pictures match its pieces: one image each (created when its texture is baked), lamps and their light, clocks' hands. */
function _hsSync(R, S) {
  const s = _hsNative(); if (!s) return;
  const scene = s.context.scene, keep = new Set(), tod = _hsLight().tod, tint = { night: 0xa6a2b4, dusk: 0xe4d4cc, dawn: 0xf0e6e4 }[tod] || 0xffffff;   // (the room's own light on its things: dimmer and bluer at night)
  _hst.onReady = () => { if (_hsInside() && _grm.S === S && _hsNative() === s) _hsSync(R, S); };
  for (const p of S.pieces) {
    if (S.carry && S.carry.u === p.u) continue;
    { const sh0 = houseShape(gardenDecor(p.d)); if (sh0 && sh0.hp === 'string') continue; }   // (fairy lights draw themselves: 94-garden-house-7lights.js)
    const key = houseTexture(scene, p.d, p.v, _hsLitKey(p)); if (!key) continue;
    keep.add(p.u);
    let it = S.imgs.get(p.u);
    if (!it || !it.im.active) { const im = scene.add.image(0, 0, key); s.root.add(im); it = { im, key: '' }; S.imgs.set(p.u, it); }
    if (it.key !== key) { it.im.setTexture(key); it.key = key; const b = houseArtBox(p.d); it.im.setOrigin(-b[0] / (b[2] - b[0]), -b[1] / (b[3] - b[1])); }
    it.im.setPosition(p.x, p.y - (p.z || 0)).setScale((p.r ? -1 : 1) / HOUSE_TEX_K, 1 / HOUSE_TEX_K).setDepth(_hsDepth(p, S)).setAlpha(p.pend ? .62 : 1);
    if (it.tint !== (_hsLitKey(p) ? 0xffffff : tint)) { it.tint = _hsLitKey(p) ? 0xffffff : tint; if (it.tint === 0xffffff) it.im.clearTint(); else it.im.setTint(it.tint); }
    it.p = p;
  }
  for (const [u, it] of S.imgs) if (!keep.has(u)) { if (it.im.active) it.im.destroy(); S.imgs.delete(u); }
  // the lamps: a soft flame glow, and a light the room's lighting takes up (s.lights is read every frame)
  const base = (s.paintSpec && s.paintSpec.lights ? s.paintSpec.lights : []).map(l => Object.assign({}, l)), lit = new Set();
  for (const p of S.pieces) {
    if (!_hsLitKey(p) || (S.carry && S.carry.u === p.u)) continue;
    const f = _HS_FLAME[p.d] || [0, -30, 160], x = p.x + f[0] * (p.r ? -1 : 1), y = p.y - (p.z || 0) + f[1];
    const dark = tod === 'night' ? 1 : tod === 'dusk' || tod === 'dawn' ? .7 : .4;   // (a lamp in daylight only warms what is near it)
    lit.add(p.u); base.push({ id: 'hs-lamp-' + p.u, x, y, radius: f[2], height: 60, color: '#ffcf80', intensity: .42 * dark + .08, flicker: p.d !== 'hf-standard-lamp' });
    let L = S.lamps.get(p.u);
    if (!L || !L.glow.active) { const glow = scene.add.image(x, y, _hsGlowKey(scene)).setBlendMode(Phaser.BlendModes.ADD); s.root.add(glow); L = { glow, a: .4, ph: Math.random() * 6 }; S.lamps.set(p.u, L); }
    L.a = .14 + .3 * dark; L.glow.setPosition(x, y).setScale(f[2] / 220).setAlpha(L.a).setDepth(_hsDepth(p, S) + .05);
  }
  for (const [u, L] of S.lamps) if (!lit.has(u)) { if (L.glow.active) L.glow.destroy(); S.lamps.delete(u); }
  S.lampList = [...S.lamps.values()];
  s.lights = base;
  // clocks keep the real time: two hands over the painted face
  const clocks = new Set();
  for (const p of S.pieces) {
    if (p.d !== 'hf-wall-clock' || !S.imgs.has(p.u)) continue; clocks.add(p.u);
    let C = S.clocks.get(p.u); if (!C || !C.g.active) { const gr = scene.add.graphics(); s.root.add(gr); C = { g: gr, min: -1 }; S.clocks.set(p.u, C); }
    C.g.setPosition(p.x, p.y - 41).setDepth(_hsDepth(p, S) + .02); C.min = -1;
  }
  for (const [u, C] of S.clocks) if (!clocks.has(u)) { if (C.g.active) C.g.destroy(); S.clocks.delete(u); }
  _hsClocks(S);
  if (typeof _hsStringsSync === 'function') _hsStringsSync(R, S);
}
function _hsClocks(S) {
  let h = 12, mi = 0; try { const p = Clock.parts(_gdNow()); h = p.h; mi = p.mi; } catch (e) { const d = new Date(); h = d.getHours(); mi = d.getMinutes(); }
  for (const C of S.clocks.values()) {
    if (!C.g.active || C.min === h * 60 + mi) continue; C.min = h * 60 + mi;
    const am = (mi / 60) * Math.PI * 2 - Math.PI / 2, ah = ((h % 12) / 12 + mi / 720) * Math.PI * 2 - Math.PI / 2;
    C.g.clear().lineStyle(2, 0x2a1a10, 1).lineBetween(0, 0, Math.cos(ah) * 7.4, Math.sin(ah) * 7.4).lineStyle(1.3, 0x2a1a10, 1).lineBetween(0, 0, Math.cos(am) * 11.5, Math.sin(am) * 11.5).fillStyle(0x2a1a10, 1).fillCircle(0, 0, 1.7);
  }
}
/** Bake the room's pieces ahead, while you walk to the door. */
function _hsWarm(R) {
  const scene = window.GardenNative && GardenNative.scene && GardenNative.scene(); if (!scene) return;
  const v = _hsView(); if (!v) return;
  const list = v.fresh ? HOUSE_START.map(p => ({ d: p.d, v: 0, l: 0 })) : v.pieces.filter(p => p.s === R.slot);
  for (const p of list) houseTexture(scene, p.d, p.v, _hsLitKey(p));
}

/* ---------- the room's painting: a new one (a new paper, the evening coming on) fades in over the old ---------- */
function _hsShellSwap(R, S) {
  const s = _hsNative(); S.keyNow = R.paintKey;
  if (!s || !s.paintSpec || !window.GardenRoomArt) return;
  const spec = GardenRoomArt.spec(R); if (!spec) return;
  let old = s.background;
  if (S.swap) { old = S.swap.old; try { S.swap.next.destroy(); } catch (e) { /* gone */ } S.swap = null; }   // (a second change while the first still bakes: the first goes, the picture on screen stays until the newest is in)
  const next = GardenRoomArt.create(s, R);
  try { next.root.setDepth(.5); const plate = next.root.list && next.root.list[0]; if (plate && plate.type === 'Rectangle') plate.setVisible(false); } catch (e) { /* the plate shows: still a picture */ }
  S.swap = { next, old, t: 0 };
  s.background = next; s.paintSpec = spec;
  if (S.native) _hsSync(R, S);   // (the room's own lights come from the new painting)
}
function _hsShellSwapStep(S) {
  const W = S.swap; W.t++;
  if (W.shownAt == null && W.next.status && W.next.status.fx != null) W.shownAt = S.t;   // (baked and fading in: the old picture goes once the new one is in)
  if ((W.shownAt != null && S.t - W.shownAt > .6) || W.t > 900) { try { W.old.destroy(); } catch (e) { /* gone */ } try { W.next.root.setDepth(0); } catch (e) { /* fine */ } S.swap = null; }
}

/* ---------- what is where, and what it does ---------- */
/** The piece under a point in the room (the topmost drawn), or null. */
function _hsHit(S, x, y) {
  let best = null, bd = -Infinity;
  for (const p of S.pieces) {
    if (S.carry && S.carry.u === p.u) continue;
    const def = gardenDecor(p.d), sh = houseShape(def); if (!sh) continue;
    let inside;
    if (sh.hp === 'rug') { const cx0 = p.x, cy0 = p.y - sh.d / 2; inside = Math.hypot((x - cx0) / (sh.w / 2), (y - cy0) / (sh.d / 2 + 4)) <= 1; }
    else { const b = houseDrawn(p, def), pad = sh.w < 30 ? 8 : 2; inside = x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + 4; }
    if (!inside) continue;
    const d = _hsDepth(p, S); if (d > bd) { bd = d; best = p; }
  }
  return best;
}
/** Where you stand to use a piece: in front of it, on the floor. */
function _hsStandAt(p) {
  const sh = houseShape(gardenDecor(p.d)) || { hp: 'floor', w: 40 }, F = _grm.R.floor || GRM.floor;
  if (sh.hp === 'wall') return { x: p.x, y: Math.max(F.y0 + 6, 418) };
  const me = _grm.me, side = me && me.x < p.x ? -1 : 1;
  return { x: p.x, y: Math.min(F.y1 - 2, p.y + 22), side };
}
function _hsWalkTo(S, pt, then) { const c = _grmClamp(pt.x, pt.y); _grmWalk(c.x, c.y, then); }
const HOUSE_USE = Object.freeze({
  light: p => p.l ? 'Put it out' : 'Light it', store: () => 'Open the chest', bed: () => 'Have a nap', seat: () => 'Sit a while', books: () => 'Read a while',
  clock: () => 'What time is it?', plant: () => 'Water it', picture: () => 'Look at it', shelf: () => 'Look at the jars',
  lights: () => 'Look at the lights', guestbook: () => gpVisiting() ? 'Sign the guest book' : 'Read the guest book', dye: () => 'Use the dye pot', banner: () => gpVisiting() ? 'Look at their banner' : 'Change your banner',
});
function _hsUseOf(p) { const sh = houseShape(gardenDecor(p.d)); const f = sh && HOUSE_USE[sh.fk]; return f ? f(p) : ''; }
/** The nearest thing to use, from where you stand: a piece by kind, or the door, the window, the fire. */
function _hsNearest(S) {
  const M = _grm.me; if (!M) return null;
  let best = null, bd = HOUSE_REACH;
  const consider = (x, y, row) => { const d = Math.hypot(M.x - x, (M.y - y) * 1.2); if (d < bd) { bd = d; best = row; } };
  const sh = S.shell || HOUSE_SHELL;
  consider(sh.stand.x, sh.stand.y, { shell: 'door', words: _hsDoorWords(sh), x: (sh.door.x0 + sh.door.x1) / 2, y: sh.door.y0 });
  if (sh.way) consider(sh.way.stand.x, sh.way.stand.y, { shell: 'way', words: _hsWayWords(sh), x: (sh.way.x0 + sh.way.x1) / 2, y: Math.max(sh.way.y0, 200) });
  const W = sh.window; if (M.y < 446) consider(Math.max(W.x0 + 10, Math.min(W.x1 - 10, M.x)), 418, { shell: 'window', words: sh.kind === 'parlour' ? 'Sit in the window seat' : sh.kind === 'loft' ? 'Look out over the vale' : 'Look out', x: (W.x0 + W.x1) / 2, y: W.y0 });
  const F = sh.fire; if (F) consider(Math.max(F.x0, Math.min(F.x1, M.x)), 456, { shell: 'fire', words: sh.kind === 'parlour' ? 'Sit by the fire' : 'Warm your hands', x: (F.x0 + F.x1) / 2, y: F.y0 - 20 });
  for (const p of S.pieces) {
    const w = _hsUseOf(p); if (!w) continue;
    const sh = houseShape(gardenDecor(p.d)), str = sh.hp === 'string', fy = sh.hp === 'wall' || str ? 420 : p.y, fx = str ? Math.max(p.x, Math.min(p.x + houseSpan(p.v), M.x)) : sh.hp === 'wall' ? p.x : Math.max(p.x - sh.w / 2, Math.min(p.x + sh.w / 2, M.x));
    consider(fx, fy, { p, words: w + (str ? '' : ' (' + houseLowName(gardenDecor(p.d)) + ')'), x: str ? fx : p.x, y: str ? p.y - 14 : p.y - (p.z || 0) - sh.h });
  }
  return best;
}
/** The prompt over the thing nearest you: "E  Light it (brass candlestick)". Drawn in the room (a Phaser text), moved only when it changes. */
function _hsPrompt(R, S) {
  const s = _hsNative(); if (!s) return;
  const n = S.move || S.carry ? (typeof _hsMovePromptRow === 'function' ? _hsMovePromptRow(R, S) : null) : _hsNearest(S);
  const words = n ? n.words : '', key = n ? words + '|' + Math.round(n.x) + '|' + Math.round(n.y) : '';
  if (key === S.promptKey) return; S.promptKey = key;
  if (!S.prompt || !S.prompt.c.active) {
    const scene = s.context.scene, c = scene.add.container(0, 0).setDepth(9600), bg = scene.add.graphics(), kb = scene.add.graphics();
    const t = scene.add.text(0, 0, '', { fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff2d8', resolution: 2 }).setOrigin(0, .5), e = scene.add.text(0, 0, 'E', { fontFamily: 'Inter, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#2a1a10', resolution: 2 }).setOrigin(.5, .5);
    c.add([bg, kb, e, t]); s.root.add(c); S.prompt = { c, bg, kb, t, e };
  }
  const P = S.prompt; P.c.setVisible(!!n); if (!n) return;
  P.t.setText(words); const w = P.t.width + 46, h = 28;
  P.bg.clear().fillStyle(0x18120c, .9).fillRoundedRect(-w / 2, -h / 2, w, h, 9).lineStyle(1, 0xffdca0, .45).strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
  P.kb.clear().fillStyle(0xffe6b0, 1).fillRoundedRect(-w / 2 + 7, -9, 20, 18, 4); P.e.setPosition(-w / 2 + 17, 0); P.t.setPosition(-w / 2 + 34, 0);
  P.c.setPosition(Math.max(w / 2 + 8, Math.min(960 - w / 2 - 8, n.x)), Math.max(24, n.y - 22));
}
/** Using a piece, by its kind. */
function _hsUse(R, S, p) {
  const def = gardenDecor(p.d), sh = houseShape(def); if (!sh) return;
  const name = houseLowName(def), M = _grm.me;
  if (M) { M.face = p.x >= M.x ? 1 : -1; }
  _hsKick(S, p);
  switch (sh.fk) {
    case 'light': _hsDoOrAsk(R, S, { o: 'use', u: p.u }, p.l ? 'Put out the ' + name : 'Lit the ' + name, p.l ? `You put out the ${name}.` : `You light the ${name}. The room is warmer for it.`); return;
    case 'store': if (typeof _hsChestOpen === 'function') _hsChestOpen(R, S, p); return;
    case 'bed': _hsNap(R, S, p); return;
    case 'seat': _grmSay(_hsLine('seat', p, [`You sit a while in the ${name}. Nothing needs doing just now.`, `You sit in the ${name} and listen to the fire.`, `You put your feet up. The ${name} creaks, kindly.`])); return;
    case 'books': _grmSay(_hsLine('books', p, ['“Sow the sweet things late and the hardy things early.” A good rule, underlined twice.', 'An almanac from a year long gone. Every frost is circled in pencil.', 'A very long novel. Somebody has turned down the corner of page twelve, and then given up.', 'A book of knots. You learn the bowline, again.', 'A seed list, half crossed out. “Marigolds: the good ones.”'])); return;
    case 'clock': _grmSay(`The clock says ${_hsTimeWords()}.`); return;
    case 'plant': _grmSay(_hsLine('plant', p, [`You water the ${name}. It looks pleased about it.`, `The ${name} is doing well. You turn it to the light.`])); try { gpTone([660, 880], { force: true, len: .18, vol: .04 }); } catch (e) { /* no sound */ } return;
    case 'picture': _grmSay(p.d === 'hf-mirror' ? 'You check your hat. It is fine. It was always fine.' : ['The hills, in a summer that went on and on.', 'The falls, painted from somewhere very wet.', 'The quay at evening, with one boat coming in.'][(p.v | 0) % 3]); return;
    case 'shelf': _grmSay('Jam, pickled onions, and one jar nobody has ever managed to open.'); return;
    case 'lights': { const t = _hsLight().tod; _grmSay(t === 'dusk' || t === 'night' ? 'You watch the little lights for a while. One of them is blue, and it is your favourite.' : 'They come on by themselves at dusk, one by one.'); return; }
    case 'guestbook': if (typeof _hsGuestBookOpen === 'function') _hsGuestBookOpen(); return;
    case 'dye': if (typeof _hsDyeOpen === 'function') _hsDyeOpen(R, S, p); return;
    case 'banner': if (typeof _hsBannerOpen === 'function') _hsBannerOpen(); return;
  }
}
function _hsLine(kind, p, lines) { return lines[gardenHash(kind + '|' + p.u + '|' + _gdToday()) % lines.length]; }
function _hsTimeWords() {
  let h = 12, mi = 0; try { const p = Clock.parts(_gdNow()); h = p.h; mi = p.mi; } catch (e) { const d = new Date(); h = d.getHours(); mi = d.getMinutes(); }
  const words = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'], r = Math.round(mi / 5) * 5, hh = r > 30 ? h + 1 : h, w = words[hh % 12];
  if (r === 0 || r === 60) return w + ' o’clock'; if (r === 15) return 'quarter past ' + words[h % 12]; if (r === 30) return 'half past ' + words[h % 12]; if (r === 45) return 'quarter to ' + w;
  return r < 30 ? `${r} past ${words[h % 12]}` : `${60 - r} to ${w}`;
}
function _hsKick(S, p) {
  const it = S.imgs.get(p.u); if (!it || !it.im.active || !gardenMotionOn()) return;
  const s = _hsNative(); if (!s) return;
  const sx = it.im.scaleX, sy = it.im.scaleY;
  s.context.scene.tweens.add({ targets: it.im, scaleX: sx * 1.06, scaleY: sy * .93, duration: 90, yoyo: true, ease: 'Sine.easeOut', onComplete: () => { if (it.im.active) it.im.setScale(sx, sy); } });
}
/** A nap, once a day something comes of it. */
function _hsNap(R, S, p) {
  const s = _hsNative();
  if (s && gardenMotionOn()) { const r = s.context.scene.add.rectangle(0, 0, 960, 600, 0x0a0812, 0).setOrigin(0, 0).setDepth(9700); s.root.add(r); s.context.scene.tweens.add({ targets: r, alpha: .72, duration: 700, yoyo: true, hold: 900, onComplete: () => r.destroy() }); }
  if (gpVisiting()) { _grmSay('You lie down for a moment on your friend’s bed. Very comfortable. You get up before anyone sees.'); return; }
  const dream = _hsLine('nap', p, ['You dream the garden is very small and you are very large. Everything fits in a teacup.', 'You dream of rain on the roof, and wake to find it was only the fire.', 'You doze off and dream of a fish that tells a joke. You cannot remember the end.', 'A short sleep, and a long dream about bees.']);
  const got = _hsGive('house.nap', { 'mat:timber': 1 });
  setTimeout(() => { if (_grm.S === S) _grmSay(dream + (got ? ' You wake rested, and find a good piece of timber under the bed.' : ''), 9000); }, gardenMotionOn() ? 1600 : 0);
  if (got) { try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } }
}
/** The room's own things: the window (a seat in the parlour's bay, the vale from the loft), the fire (the kettle in the kitchen, a
 *  quiet minute by the parlour's grate). Each gives a small thing once a day (_hsGive, quietly: the garden outside is not drawn again). */
function _hsShellUse(R, S, what) {
  const M = _grm.me, sh = S.shell || HOUSE_SHELL, mine = !gpVisiting();
  if (what === 'window') {
    if (M) M.face = 1; const L = _hsLight();
    if (sh.kind === 'parlour') {
      const got = mine && _hsGive('house.seat', { 'mat:timber': 1 });
      _grmSay('You curl up in the window seat. ' + _hsWindowWords(L) + (got ? ' Down the side of the cushion: a good length of timber, somehow.' : ''), 9000);
      if (got) { try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } }
      return;
    }
    if (sh.kind === 'loft') {
      const far = { spring: 'Blossom on every orchard, all the way to the hills.', summer: 'The whole vale in leaf, and the water shining in the middle of it.', autumn: 'The woods gone copper, and smoke from somebody’s bonfire.', winter: 'Frost on every roof in the vale but yours.' }[L.season] || '';
      const got = mine && _hsGive('house.loft', { 'mat:stone': 1 });
      _grmSay('From up here you can see over the hedges. ' + far + (got ? ' On the ledge, a smooth grey stone somebody put there to look at the view: you keep it.' : ''), 9000);
      if (got) { try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } }
      return;
    }
    _grmSay(_hsWindowWords(L)); return;
  }
  if (what === 'fire') {
    if (M) M.face = 1;
    if (!mine) { _grmSay(sh.kind === 'parlour' ? 'You sit by your friend’s little fire for a minute. It is very good at being a fire.' : 'You warm your hands at your friend’s fire.'); return; }
    if (sh.kind === 'parlour') {
      const got = _hsGive('house.parlour', { 'mat:timber': 1, 'mat:stone': 1 });
      _grmSay(got ? 'You sit by the little fire and do nothing at all for a whole minute. It does you good. In the coal scuttle: a log split just right, and a stone that keeps the heat.' : 'You sit by the fire a while. It crackles, and you let it.', 9000);
      if (got) { try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } }
      return;
    }
    const got = _hsGive('house.kettle', { 'mat:stone': 1 });
    _grmSay(got ? 'You warm your hands and make a pot of tea. On the hearth, in the ash, a smooth stone that keeps the heat: you keep it.' : 'You warm your hands at the fire. The kettle sings to itself.');
    if (got) { try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } }
  }
}
/** A small thing once a day (as _grGive, the same daily ledger line and the same limits), saved quietly while you are indoors: the garden
 *  outside is hidden and is drawn again once as you leave. */
function _hsGive(key, gift) {
  const g = _gdG(), today = _gdToday(), k = 'rwd.' + today + '.' + key;
  if (g.led[k] || gpVisiting()) return false;
  let matLeft = typeof GR_ECON !== 'undefined' ? GR_ECON.matDay : 6; const i = {};
  for (const [lk, e] of Object.entries(g.led)) if (lk.startsWith('rwd.' + today + '.') && e && e.i) for (const [it, n] of Object.entries(e.i)) if (it.startsWith('mat:')) matLeft -= Number(n) || 0;
  for (const [it, n] of Object.entries(gift)) { const v = it.startsWith('mat:') ? Math.min(n, matLeft) : n; if (v > 0) { i[it] = v; if (it.startsWith('mat:')) matLeft -= v; } }
  if (!Object.keys(i).length) return false;
  g.led[k] = { d: today, k: 'pl', i, x: 0, n: 1 };
  _gdSaveQuiet(); if (_hsInside()) _grm.S.dirty = true;
  return true;
}
/** The words on the way back and the way on. */
function _hsDoorWords(sh) { return { 0: 'Go out', 1: 'Back to the kitchen', 2: 'Down the ladder', 3: 'Back to the loft' }[sh.slot] || 'Go out'; }
function _hsWayWords(sh) {
  const to = sh.way && sh.way.to, v = _hsView(), g = v && v.guest && v.guest.s === to ? v.guest.n : '';
  return to === 1 ? 'Through to the parlour' : to === 2 ? 'Up the ladder' : to === 3 ? (g ? `Into ${g}’s room` : 'Into the guest room') : 'Go through';
}
/** What blocks feet in the room's own shell: the hatch in the loft's floor, the foot of the parlour's ladder. */
function _hsShellBlocks(sh) {
  const out = [];
  if (sh && sh.hatch) out.push([(sh.door.x0 + sh.door.x1) / 2, 424, 66, 24]);
  if (sh && sh.way && sh.way.kind === 'ladder') out.push([(sh.way.x0 + sh.way.x1) / 2, 410, 46, 14]);
  return out;
}
function _hsBlocksFor(S, pieces) { return houseBlocks(pieces, S.slot).concat(_hsShellBlocks(S.shell)); }
/** Back through the left door: out of the house from the kitchen, else to the room before. */
function _hsBack(R, S) { const sh = S.shell || HOUSE_SHELL; if (sh.left < 0) { gardenRoomLeave(); return; } _hsGoRoom(sh.left, 'way'); }
/** On through the way on (the parlour's doorway, the loft's ladder, the guest room's door). */
function _hsOn(R, S) { const sh = S.shell || HOUSE_SHELL; if (sh.way) _hsGoRoom(sh.way.to, 'left'); }
/** Into another room of the house: the iris closes, the room behind you is put away and the next is opened in the same task (nothing of
 *  the garden outside is drawn between them), and you come in at the door you went through (via 'left': its way back; 'way': its way on). */
function _hsGoRoom(slot, via) {
  if (!_hsBoot() || _hs.going) return;
  const R = gardenHouseRoomRow('hs-' + slot); if (!R) return;
  const S0 = _hsInside() ? _grm.S : null; if (S0 && S0.carry && typeof _hsCarryCancel === 'function') _hsCarryCancel(_grm.R, S0);
  try { _hsWarm(R); } catch (e) { /* drawn as you come in */ }
  _hs.going = true;
  const go = () => {
    _hs.going = false; _hs.arrive = { slot, via };
    const native = !!(window.GardenNative && GardenNative.inRoom && GardenNative.inRoom());
    _hs.swapping = true;
    try {
      if (native) { GardenNative.leaveRoom(); gardenRoomEnter(R); return; }
      gardenRoomLeave(); setTimeout(() => { _hs.arrive = { slot, via }; gardenRoomEnter(R); }, 470);   // (the standard room needs its close to finish)
    } finally { _hs.swapping = false; }
  };
  try { if (typeof _fxSound === 'function') _fxSound('pop'); } catch (e) { /* no sound */ }
  if (!gardenMotionOn()) { go(); return; }
  const el = document.createElement('div'); el.className = 'grm-through hs-through'; el.style.setProperty('--grm-c', '#1a120c');
  el.innerHTML = `<i></i><b><svg viewBox="-30 -60 60 66" width="96" height="96" aria-hidden="true">${_hsSym()}</svg></b><span>${esc(houseRoomName(slot))}</span>`;
  document.body.appendChild(el);
  setTimeout(go, 660); setTimeout(() => el.remove(), 1500);
}
function _hsWindowWords(L) {
  const sky = L.wx === 2 ? 'Snow is coming down, slow and serious.' : L.wx === 1 ? 'Rain on the glass, and the garden drinking it.' : { dawn: 'The sun is just over the hills.', day: 'A clear day over the hills.', dusk: 'The sky over the hills is going gold and then rose.', night: 'Stars over the hills, and the garden asleep.' }[L.tod];
  const time = { spring: 'Blossom on the branch outside.', summer: 'Flowers all along the hedge.', autumn: 'The branch outside has gone to gold.', winter: 'The branch outside is bare, and very still.' }[L.season] || '';
  return sky + ' ' + time;
}
/** A change: done here for your house, asked of your friend's computer for theirs. */
function _hsDoOrAsk(R, S, op, label, said) {
  if (gpVisiting()) { if (typeof _hsGuestDo === 'function' && _hsGuestDo(R, S, op)) { if (said) _grmSay(said); } return; }
  const r = houseDo(op, label, { feet: _hsFeet(S) });
  if (!r.ok) { _grmSay(r.msg + '.'); return; }
  _hsRoomRefresh(R, S, false);
  if (said) _grmSay(said);
  try { if (typeof _fxSound === 'function') _fxSound(op.o === 'use' ? 'tick' : 'pop'); } catch (e) { /* no sound */ }
}

/* ---------- the room's own controls ---------- */
function _hsUi(R, S) {
  const root = _grm.root; if (!root) return;
  const bar = root.querySelector('.ee-ui'); if (!bar) return;
  const leave = bar.querySelector('.ee-leave'); if (leave) leave.textContent = 'Go out';
  if (typeof _hsMoveUi === 'function') _hsMoveUi(R, S, bar);
  if (typeof _hsGrowUi === 'function') _hsGrowUi(R, S, bar);
}
function _hsEnd(R, S) {
  if (typeof _hsMoveEnd === 'function') _hsMoveEnd(R, S);
  if (S.warm && typeof _hsWarmEnd === 'function') _hsWarmEnd(S);
  if (typeof _hsStringsEnd === 'function') _hsStringsEnd(S);
  _hst.onReady = null;
  if (S.swap) { try { S.swap.old.destroy(); } catch (e) { /* gone with the room */ } S.swap = null; }
  S.imgs = new Map(); S.lamps = new Map(); S.clocks = new Map(); S.prompt = null;
  if (S.dirty && _hs.swapping) _hs.dirty = true;   // (on to another room of the house: the garden outside is drawn once, when you go out)
  else if (S.dirty || _hs.dirty) { _hs.dirty = false; try { gardenRepaintSoon(); gardenTickSoon(); } catch (e) { /* drawn at the next change */ } }
}

/* ---------- the standard room (no Phaser): the same pieces as SVG spots on a plain painted room ---------- */
function _hsSvgSpots(R, S) {
  const out = [], C = S.carry;
  if (C) {   // the carried piece where it would go, with its footprint (green: it fits; red: it does not)
    const def = gardenDecor(C.d), sh = houseShape(def), b = houseArtBox(C.d), col = C.ok ? '#8ae08a' : '#f06a5a', fb = sh.hp === 'wall' ? houseBox(C, def) : houseBox({ x: C.x, y: C.y }, def);
    out.push({ id: 'carry-fp', still: true, x: 0, y: 0, w: 0, h: 0, art: `<rect x="${fb.x0 - 2}" y="${fb.y0 - 2}" width="${fb.x1 - fb.x0 + 4}" height="${fb.y1 - fb.y0 + 4}" rx="6" fill="${col}" fill-opacity="${sh.hp === 'wall' ? 0 : .26}" stroke="${col}" stroke-width="2"/>` });
    out.push({ id: 'carry', still: true, x: C.x, y: C.y - (C.z || 0) + 0.01, w: 0, h: 0, art: `<g opacity="${C.ok ? .86 : .55}"${C.r ? ' transform="scale(-1 1)"' : ''}><image href="${houseArtUrl(C.d, C.v, C.lit)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/></g>` });
  }
  for (const p of S.pieces) {
    if (C && C.u === p.u) continue;
    const def = gardenDecor(p.d), sh = houseShape(def); if (!sh || sh.hp === 'string') continue;
    const b = houseArtBox(p.d), url = houseArtUrl(p.d, p.v, _hsLitKey(p)), use = _hsUseOf(p);
    out.push({ id: 'p:' + p.u, x: p.x, y: p.y - (p.z || 0), w: Math.max(30, sh.w), h: Math.max(24, sh.hp === 'rug' ? 40 : sh.h), still: !S.move && !use, tip: S.move ? 'Pick it up' : use || def.name, art: `<g${p.r ? ' transform="scale(-1 1)"' : ''}><image href="${url}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/></g>` });
  }
  return out.sort((a, b) => a.y - b.y);
}
function _hsSvgRoom(R) {
  const P = _hsPaintParams(R), A = _grmA, wall = (gardenDecor(P.wall) || {}).look || { c: '#ece2cc' }, floor = (gardenDecor(P.floor) || {}).look || { c: '#9a6a3c', c2: '#6a4426' }, S = HOUSE_SKY[P.tod] || HOUSE_SKY.day;
  const sh = houseShellFor(R.slot, ((_hsView() || {}).rooms) || {}), W = sh.window, F = sh.fire, H = sh.hearth, D = sh.door, Y = sh.way;
  const ceil = sh.ceil.map(([x, y]) => x + ' ' + y).join('L');
  return A.shell(wall.c, wall.c2 || wall.c, floor.c, floor.c2 || floor.c) + A.p(`M0 0H960V${sh.ceil[sh.ceil.length - 1][1]}L${ceil}Z`, '#5a4636') + A.s(`M${ceil}`, '#3e2a1a', 14)
    + A.r(W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0, '#5a3e26') + A.r(W.x0 + 12, W.y0 + 10, W.x1 - W.x0 - 24, W.y1 - W.y0 - 24, S.low) + A.r(W.x0 + 12, W.y0 + (W.y1 - W.y0) * .5, W.x1 - W.x0 - 24, (W.y1 - W.y0) * .3, '#5a8a48')
    + (H && F ? A.r(H.x0, H.y0, H.x1 - H.x0, H.y1 - H.y0, '#b0a898') + A.r(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0, '#1a0e08') + A.flame((F.x0 + F.x1) / 2, F.y1 - 12, 2) + A.glow((F.x0 + F.x1) / 2, F.y1 - 30, 90, .45) : '')
    + (sh.hatch ? A.e((D.x0 + D.x1) / 2, 424, 56, 18, '#1a0e08') + A.r(D.x0 + 18, D.y0, 8, 410 - D.y0, '#8a6238') + A.r(D.x1 - 26, D.y0, 8, 410 - D.y0, '#8a6238') : A.r(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0, sh.slot ? '#3a2a1a' : '#6a4a2e'))
    + (Y ? Y.kind === 'ladder' ? A.r(Y.x0 + 8, Y.y0 - 30, 8, Y.y1 - Y.y0 + 50, '#8a6238') + A.r(Y.x1 - 16, Y.y0 - 30, 8, Y.y1 - Y.y0 + 50, '#8a6238') : A.r(Y.x0, Y.y0, Y.x1 - Y.x0, Y.y1 - Y.y0, Y.kind === 'door' ? '#6a4a2e' : '#3a2a1a') : '')
    + A.r(0, 388, 960, 13, '#4a3220');
}
/** For the console and the sandbox: the house as this page sees it now, and what it cost. */
function gardenHouseDebug() {
  const S = _hsInside() ? _grm.S : null, s = _hsNative();
  return { mine: gardenHouseMine(), inside: !!S, room: S ? _grm.R.id : '', pieces: S ? S.pieces.length : 0, imgs: S ? S.imgs.size : 0, beginMs: S ? S.beginMs : null, key: S ? _grm.R.paintKey : '', bake: s && s.background ? s.background.status : null, texMs: _hst.ms.slice(-12), textures: _hst.keys.length, wireBytes: (JSON.stringify(gardenHouseWire()) || '').length };
}

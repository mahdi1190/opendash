/* ============================================================
   DEPTH: SECRET WAYS AND HIDDEN ALCOVES (26 Nov 2026, the depth lane, its third part). The brief: "a hidden alcove ... short-cuts, a
   secret tunnel between two regions".

   A SECRET WAY is any tunnel row with secret: true (assets/garden/vale-depth.json), its mouths of the kind 'slab': an old flagstone with an
   iron ring, flush in the turf and half grown over, that looks like nothing much (94-garden-paint-vale-1depth-mouths.js draws it). Until
   someone opens it every mouth is shut; look at the slab, heave on its ring (three heaves alone, one with a friend heaving beside you) and
   it grinds aside: the steps go down, the way is open for good, for everyone who comes to this garden. A mouth whose land is not open
   yet stays shut by the land's own rule. The vale's first map (in the deeds cellar, 94-garden-zz-8depth-6finds.js) marks where to look.
   A HIDDEN ALCOVE is any chamber row with alcove: { dx, find }: loose stones (or bricks) in its back wall at dx of its half width. Look at
   them and they come away: a little hollow in the wall with something in it, open from then on for everyone here.
   Nothing here names a place: any row anywhere with these fields works the same.

   SAVED (your garden): seen['dp.s.<tunnel>'] its secret way opened, seen['dp.a.<tunnel>'] its alcove opened, seen['dp.t.<tunnel>'] walked
   through (a mark that outlives the ledger's monthly fold: the ledger line alone came back after forty days and paid again).
   FRIENDS: the snapshot's dp.t carries each tunnel's bits (1 walked, 2 its secret way opened, 8 its alcove opened); a friend's page draws
   your garden by them. A friend who opens yours does it through the host (a guest intent 'tunnel': r 0 the secret way, r 2 the alcove),
   so it is opened in your garden, for good, and everyone sees it at once. They keep what they find in the alcove; the garden keeps the way.
   ============================================================ */
const _gds = { heave: new Map(), looked: new Set(), echo: new Set(), inside: new Map(), backfilled: false, openC: { id: '', v: false, t: -1e9, force: false } };
const GDS = Object.freeze({ heaves: 3, heaveMs: 20000, pay: Object.freeze({ c: 25, x: 8 }), alcovePay: Object.freeze({ c: 4, x: 2 }), friendReach: 2.6 });
/** Whose state to read: yours at home; on a visit, theirs from their snapshot (and what you opened there a moment ago). */
function _gdsBits(id) {
  const snap = typeof _gdfFriendSnap === 'function' ? _gdfFriendSnap() : null;
  if (!snap) return -1;
  const row = snap.dp && Array.isArray(snap.dp.t) ? snap.dp.t.find(r => r[0] === id) : null;
  return (row ? row[1] : 0) | (_gds.echo.has(_gdsEcho(id, 2)) ? 2 : 0) | (_gds.echo.has(_gdsEcho(id, 8)) ? 8 : 0);
}
/** What you opened in this friend's garden a moment ago, before their snapshot says so (keyed by whose garden it is). */
function _gdsEcho(id, bit) { return ((typeof _gdv !== 'undefined' && _gdv.fid) || '') + '|' + id + ':' + bit; }
function _gdsSeen(key) { try { const g = _gdG(); return !!(g && g.seen && g.seen[key]); } catch (e) { return false; } }
/** Is this secret way open (in the garden you stand in)? */
function gardenDepthSecretOpen(T) {
  if (!T || !T.secret) return true;
  const b = _gdsBits(T.id); if (b >= 0) return !!(b & 2);
  return _gdsSeen('dp.s.' + T.id);
}
/** Is this tunnel's hidden alcove open? */
function gardenDepthAlcoveOpen(T) {
  const b = _gdsBits(T.id); if (b >= 0) return !!(b & 8);
  return _gdsSeen('dp.a.' + T.id);
}
/** Walked through (yours: the seen mark, or the ledger line from before it). */
function _gdsWalked(id) { try { const g = _gdG(); return !!(g && ((g.seen && g.seen['dp.t.' + id]) || (g.led && g.led['dpt.' + id]))); } catch (e) { return false; } }
/* every mouth of a secret way stays shut until it is opened; then the land's own rule (builder 2's _gdtOpen) decides each mouth */
if (typeof _gdtOpen === 'function') {
  const _gdsOpen0 = _gdtOpen;
  _gdtOpen = function (T) {   // eslint-disable-line no-func-assign
    const v = _gdsOpen0(T);
    if (!T || !T.secret || gardenDepthSecretOpen(T)) return v;
    return T._gdsShut || (T._gdsShut = T.mouths.map(() => false));
  };
}
/** Forget what was worked out about open mouths (a secret way opened just now): the prompts, the walking and the vale's picture follow. */
function _gdsForget() { try { if (typeof _gdt !== 'undefined') { _gdt.open.clear(); _gdt.openSig = ''; _gdt.listT = 0; } } catch (e) { /* later */ } try { if (typeof _ga !== 'undefined') _ga.listT = 0; } catch (e) { /* later */ } _gds.landT = 0; }
/** Which secret ways are open, as part of the land's own signature (gardenLevelLandSig): when one opens the world paints the ground again (its
 *  slab dragged aside, the steps showing) and builds its walking grid again (the hole stops the feet). From the raw rows (gardenThingsPlaced:
 *  cheap, and never the tunnels' own geometry, which reads the grid), looked at twice a second. */
function _gdsLandSig() {
  const now = performance.now(); if (_gds.landT && now - _gds.landT < 500) return _gds.landS; _gds.landT = now;
  let s = ''; try { for (const r of typeof gardenThingsPlaced === 'function' ? gardenThingsPlaced() : []) if (r && r.kind === 'tunnel' && r.secret && gardenDepthSecretOpen({ id: r.id, secret: true })) s += r.id + ','; } catch (e) { s = ''; }
  return (_gds.landS = s ? 'dps:' + s : '');
}
if (typeof gardenLevelLandSig === 'function') {
  const _gdsLandSig0 = gardenLevelLandSig;
  gardenLevelLandSig = function (level) { const s = _gdsLandSig0(level), d = _gdsLandSig(); return d ? s + '|' + d : s; };   // eslint-disable-line no-func-assign
}
/* ---------- the slab: look at it, heave on its ring ---------- */
function _gdsSlabAt(m) { return { x: m.x + m.fx * 0.58, y: m.y + m.fy * 0.58 }; }
gardenDepthPromptRows((out, C, px, py) => {
  if (C || typeof gardenTunnels !== 'function') return;
  for (const T of gardenTunnels()) {
    if (!T.secret || gardenDepthSecretOpen(T)) continue;
    for (const m of T.mouths) {
      if (m.by !== 'slab') continue;
      const s = _gdsSlabAt(m); if (Math.abs(s.x - px) > 3 || Math.abs(s.y - py) > 3) continue;
      if (typeof gardenZoneLockAt === 'function') { try { if (gardenZoneLockAt(Math.floor(m.x), Math.floor(m.y))) continue; } catch (e) { /* open */ } }   // (in land not open yet: nobody stands there)
      out.push({ key: 'dps:' + T.id + ':' + m.i, act: 'dpslab', name: '', x: s.x, y: s.y, promptY: s.y - 1.2, stand: { x: m.x, y: m.y }, deg: null, lift: 0, src: 'dps:' + T.id + ':' + m.i, kind: 'depth', dq: true, reach: 2, pri: 0.6, T, m });
    }
  }
});
function _gdsFriendNear(x, y) {
  try { if (typeof _gll === 'undefined' || !_gll.actors) return null; for (const A of _gll.actors.values()) if (A && !A.me && Number.isFinite(A.x) && Math.hypot(A.x - x, A.y - y) < GDS.friendReach) return A; } catch (e) { /* alone */ }
  return null;
}
gardenDepthActs('dpslab', {
  words: (r) => { const H = _gds.heave.get(r.T.id); return H && performance.now() - H.t < GDS.heaveMs ? 'Heave again' : _gds.looked.has(r.T.id) ? 'Heave on the ring' : 'Look at the old slab'; },
  run: (r) => {
    const T = r.T, m = r.m, s = _gdsSlabAt(m);
    _gdqFace(s.x, s.y);
    if (!_gds.looked.has(T.id)) {
      _gds.looked.add(T.id);
      const knows = typeof gardenLifeHas === 'function' && gardenLifeHas('k', 'first-map');
      _gdqSay('An old flagstone with an iron ring set in it, half grown over. Cold air breathes up round its edge.' + (knows ? ' The mark on the old map: ' + T.name + '.' : ' Something is down there.'), 'search');
      return true;
    }
    const now = performance.now(); let H = _gds.heave.get(T.id); if (!H || now - H.t > GDS.heaveMs) H = { n: 0, t: now };
    H.n++; H.t = now; _gds.heave.set(T.id, H);
    try { if (typeof gartPlayerAct === 'function') gartPlayerAct('dig', 900); gardenSfx('dig'); } catch (e) { /* quiet */ }
    const A = _gdsFriendNear(s.x, s.y);
    if (A || H.n >= GDS.heaves) { _gds.heave.delete(T.id); _gdsOpenSecret(T, m, A); return true; }
    _gdqSay(H.n === 1 ? 'The ring bites your hands. The slab shifts, a finger’s width. Again!' : 'It grinds an inch further. Grit pours into the dark under it. Once more!', 'hand');
    return true;
  },
});
/** Open a secret way: here for good (your garden), or ask the host to (a friend's live garden). */
function _gdsOpenSecret(T, m, A) {
  const who = A ? String(A.n || 'your friend').split(/\s+/)[0] : '';
  if (_gdqVisiting()) {
    if (typeof _glvLive === 'function' && _glvLive() && typeof _glvIntent === 'function') {
      _glvIntent('tunnel', { p: T.id, r: 0, x: Math.floor(m.x), y: Math.floor(m.y) });
      _gds.echo.add(_gdsEcho(T.id, 2)); _gdsForget();
      _gdqSay((who ? 'You and ' + who + ' heave together. ' : '') + 'The slab grinds aside. Steps go down into the dark: ' + T.name + ' is open, in this garden, for good.', 'key-round');
      try { gardenSfx('gate'); } catch (e) { /* quiet */ }
    } else _gdqSay('It will not shift from here. Heave on it when your friend has their garden open to you, and it opens for them too.', 'hand');
    return;
  }
  let g = null; try { g = _gdG(); } catch (e) { g = null; } if (!g || !g.seen) return;
  const first = !g.seen['dp.s.' + T.id];
  g.seen['dp.s.' + T.id] = _gdfToday();
  if (first && !g.led['dps.' + T.id]) g.led['dps.' + T.id] = { d: _gdfToday(), k: 'dp', c: GDS.pay.c, x: GDS.pay.x, n: 1 };
  _gdsForget();
  try { _gdSave(); } catch (e) { /* with the next change */ }
  try { gardenSfx('gate'); } catch (e) { /* quiet */ }
  _gdqSay((who ? 'You and ' + who + ' heave together, and the' : 'The') + ' slab grinds aside. Steps go down into the cold dark: you have found ' + T.name + '!' + (first ? ` +${GDS.pay.c} coins, +${GDS.pay.x} XP.` : ''), 'key-round');
}
/* the prompt over an open slab sits low, as over steps (a slab has nothing standing up) */
if (typeof _gdtRows === 'function') {
  const _gdsRows0 = _gdtRows;
  _gdtRows = function () { const rows = _gdsRows0(); for (const r of rows) if (r.mouth && r.mouth.by === 'slab') r.promptY = r.y - 1.5; return rows; };   // eslint-disable-line no-func-assign
}
/* ---------- the words at a slab mouth, open or shut ---------- */
if (typeof _gdtWords === 'function') {
  const _gdsWords0 = _gdtWords;
  _gdtWords = function (r) {   // eslint-disable-line no-func-assign
    const m = r && r.mouth;
    if (m && m.by === 'slab') {
      if (r.act === 'tunnelin') { const A = typeof _gdtFriendIn === 'function' ? _gdtFriendIn(r.tunnel) : null; return A ? 'Follow ' + String(A.n || 'your friend').split(/\s+/)[0] + ' in' : 'Go down the old steps'; }
      if (r.act === 'tunnelshut') return 'Look at the slab overhead';
      if (r.act === 'tunnelout' && typeof _gdtRegion === 'function') { const C = typeof _gdt !== 'undefined' ? _gdt.cur : null, R = _gdtRegion(m), back = C && C.inBy && _gdtRegion(C.inBy).zone === R.zone; return back || !R.name ? 'Climb back up the steps' : 'Climb up into ' + (typeof _gdtThe === 'function' ? _gdtThe(R.name) : R.name); }
    }
    return _gdsWords0(r);
  };
}
if (typeof _gdtShutWords === 'function') {
  const _gdsShut0 = _gdtShutWords;
  _gdtShutWords = function (T, m) {   // eslint-disable-line no-func-assign
    if (m && m.by === 'slab') { const R = typeof _gdtRegion === 'function' ? _gdtRegion(m) : { name: '' }, where = R.name && typeof _gdtThe === 'function' ? _gdtThe(R.name) : 'the land above'; return 'A slab lies over the top of the steps and will not shift from below. This way comes out in ' + where + ': it will open when ' + where + ' does.'; }
    return _gdsShut0(T, m);
  };
}
/* ---------- the hidden alcoves ---------- */
/** A chamber's alcove in world px: x, the wall's foot under it (y), and whether the wall is rock. */
function _gdsAlcoveOf(T, c) {
  const a = c.alcove; if (!a) return null;
  const x = c.x + a.dx * c.rx, foot = c.rect ? c.y - c.ry : c.y - c.ry * Math.sqrt(Math.max(0, 1 - a.dx * a.dx));
  return { x, y: foot, rock: (GARDEN_TUNNEL_STYLES[T.style] || {}).wall === 'rock', brick: (GARDEN_TUNNEL_STYLES[T.style] || {}).wall === 'brick', find: a.find, c };
}
gardenDepthPromptRows((out, C, px, py) => {
  if (!C) return;
  const W = GARDEN_WORLD, cur = gardenTunnelChamberAt(C.T, px * W.cellW, W.sky + py * W.cellH);
  for (const c of C.T.ells) {
    const A = _gdsAlcoveOf(C.T, c); if (!A) continue;
    const open = gardenDepthAlcoveOpen(C.T), x = A.x / W.cellW, y = (A.y + 16 - W.sky) / W.cellH, top = (A.y - 30 - W.sky) / W.cellH;
    if (open && (!A.find || _gdfHas(A.find))) continue;
    out.push({ key: 'dpa:' + C.T.id + ':' + c.i, act: 'dpalcove', name: '', x, y, promptY: top - 0.4, stand: null, deg: null, lift: 0, src: 'dpa:' + C.T.id + ':' + c.i, kind: 'depth', dq: true, reach: 1.9, pri: 0.5 + (c.i === cur ? 0.6 : 0), T: C.T, A, open });
  }
});
gardenDepthActs('dpalcove', {
  words: (r) => (r.open ? 'Take ' + ((GDF_KEEP_ROW.get(r.A.find) || {}).name || 'it').replace(/^An? /, 'the ').replace(/^The /, 'the ') : r.A.brick ? 'Look at the loose bricks' : 'Look at the loose stones'),
  run: (r) => {
    const W = GARDEN_WORLD; _gdqFace(r.A.x / W.cellW, (r.A.y - 20 - W.sky) / W.cellH);
    try { if (typeof gartPlayerAct === 'function') gartPlayerAct('pick', 900); } catch (e) { /* fine */ }
    if (r.open) { if (r.A.find && !_gdfHas(r.A.find)) _gdfKeep(r.A.find, { pay: { c: 10, x: 4 } }); return true; }
    _gdsOpenAlcove(r.T, r.A);
    return true;
  },
});
function _gdsOpenAlcove(T, A) {
  const what = A.brick ? 'bricks' : 'stones';
  try { gardenSfx('dig'); } catch (e) { /* quiet */ }
  if (_gdqVisiting()) {
    if (typeof _glvLive === 'function' && _glvLive() && typeof _glvIntent === 'function') _glvIntent('tunnel', { p: T.id, r: 2 });
    _gds.echo.add(_gdsEcho(T.id, 8));
  } else {
    let g = null; try { g = _gdG(); } catch (e) { g = null; } if (!g || !g.seen) return;
    const first = !g.seen['dp.a.' + T.id];
    g.seen['dp.a.' + T.id] = _gdfToday();
    if (first && !g.led['dpa.' + T.id]) g.led['dpa.' + T.id] = { d: _gdfToday(), k: 'dp', c: GDS.alcovePay.c, x: GDS.alcovePay.x, n: 1 };
    try { _gdSave(); } catch (e) { /* later */ }
  }
  _gdqSay(`A cold draught comes from between the ${what}. One moves when you push it, then the next: they come away in your hands, and behind them is a little hollow in the wall.` + (A.find && !_gdfHas(A.find) ? ' Something is tucked inside.' : ''), 'search');
  const set = _gds.inside.get(T.id); if (set) set.sig = '';
  _gds.openC.force = true;
}
/* the alcove as drawn, in the tunnel's own picture: loose stones (or bricks) in the wall while it is hidden, a dark hollow once open */
function _gdsAlcoveTex(sc, A, open, seed) {
  const key = 'gds|alc|' + (A.brick ? 'b' : 'r') + (open ? 'o' : 'c') + '|' + (seed % 4);
  if (sc.textures.exists(key)) return key;
  const w = 34, h = 46, K = 2, cv = document.createElement('canvas'); cv.width = w * K; cv.height = h * K; const x = cv.getContext('2d'); x.scale(K, K); x.translate(w / 2, h - 6);
  let s = (seed >>> 0) % 2147483647 || 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const col = A.brick ? ['#8e5a40', '#6a412e', '#b07a58', '#5a4636'] : ['#6e665a', '#4e483f', '#948a7a', '#3e3a33'];
  if (!open && A.brick) {   // bricks, the size of the wall's own, in running bond, each a little proud of the wall with a dark gap round it (they have come loose)
    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 2), bw = 11.4, bh = 4.6, bx = -11.6 + (i % 2) * 12.2 + (row % 2) * 3 + (r() - 0.5) * 0.8, by = -33 + row * 6.2 + (r() - 0.5) * 0.6;
      x.fillStyle = 'rgba(10,8,6,.8)'; x.fillRect(bx - 0.9, by - 0.9, bw + 1.8, bh + 1.8);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(bx + 1.2, by + 1.2, bw, bh);
      x.fillStyle = col[Math.floor(r() * 3)]; x.fillRect(bx, by, bw, bh); x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(bx, by, bw, 1.1); x.fillRect(bx, by, 1.1, bh);
    }
  } else if (!open) {   // rock: a patch of rounded stones packed into a hole in the face, paler than the rock round them, a thin dark crack where it has come loose
    x.strokeStyle = 'rgba(14,12,10,.7)'; x.lineWidth = 1.1; x.beginPath(); x.ellipse(0, -23, 12, 10.5, 0, 0, Math.PI * 2); x.stroke();
    for (let i = 0; i < 7; i++) {
      const a = i / 6 * Math.PI * 2 + r() * 0.5, d = i ? 6.4 : 0, bx = Math.cos(a) * d * 1.15, by = -23 + Math.sin(a) * d * 0.95, rx = 4 + r() * 1.5, ry = 3.3 + r() * 1.1;
      x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(bx + 0.8, by + 0.9, rx, ry, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = col[Math.floor(r() * 3)]; x.beginPath(); x.ellipse(bx, by, rx, ry, r() * 0.8, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.ellipse(bx - rx * 0.3, by - ry * 0.35, rx * 0.45, ry * 0.3, 0, 0, Math.PI * 2); x.fill();
    }
  }
  if (!open) {   // a pale line of dust where the draught comes through, grit fallen at its foot
    x.strokeStyle = 'rgba(228,220,200,.45)'; x.lineWidth = 0.7; x.beginPath(); x.moveTo(-11, -12.6); x.lineTo(11, -12.6); x.stroke();
    x.fillStyle = 'rgba(20,16,12,.5)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(-8 + r() * 16, -2 + r() * 2, 1.6 + r() * 1.6, 1, 0, 0, Math.PI * 2); x.fill(); }   // (grit fallen at its foot)
  } else {   // an arched hollow in the wall, a stone sill, the stones that came out lying on the floor below it
    x.fillStyle = col[3]; x.beginPath(); x.moveTo(-11, -9); x.lineTo(-11, -27); x.quadraticCurveTo(0, -38, 11, -27); x.lineTo(11, -9); x.closePath(); x.fill();
    x.fillStyle = '#0a0807'; x.beginPath(); x.moveTo(-9, -10); x.lineTo(-9, -26); x.quadraticCurveTo(0, -35.5, 9, -26); x.lineTo(9, -10); x.closePath(); x.fill();
    const g = x.createLinearGradient(0, -34, 0, -10); g.addColorStop(0, 'rgba(10,8,7,0)'); g.addColorStop(1, 'rgba(70,58,44,.55)'); x.fillStyle = g; x.fillRect(-9, -34, 18, 24);
    x.fillStyle = col[2]; x.fillRect(-12, -10, 24, 3.2); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-12, -10, 24, 1);
    for (let i = 0; i < 5; i++) { const bx = -12 + r() * 24, by = -1 + r() * 3, rr = 2 + r() * 1.8; x.fillStyle = 'rgba(10,8,6,.5)'; x.beginPath(); x.ellipse(bx + 0.8, by + 0.8, rr, rr * 0.6, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = col[Math.floor(r() * 3)]; if (A.brick) x.fillRect(bx - rr, by - rr * 0.6, rr * 2, rr * 1.2); else { x.beginPath(); x.ellipse(bx, by, rr, rr * 0.65, 0, 0, Math.PI * 2); x.fill(); } }
  }
  sc.textures.addImage(key, cv);
  return key;
}
function _gdsInsideFrame(C, now) {
  const st = typeof _gdi !== 'undefined' ? _gdi.st : null; if (!st || !st.shown || !C || !C.T) return;
  const sc = st.scene, rec = st.rec, a = rec && rec.im ? rec.im.alpha : 0, oc = _gds.openC;
  if (oc.id !== C.T.id || now - oc.t > 1000 || oc.force) { oc.id = C.T.id; oc.t = now; oc.force = false; oc.v = gardenDepthAlcoveOpen(C.T); }   // (once a second, or at once after you open it)
  const open = oc.v, sig = (open ? 'o' : 'c');
  let set = _gds.inside.get(C.T.id);
  if (!set || set.scene !== sc || set.sig !== sig || (set.items[0] && !set.items[0].im.active)) {
    if (set) for (const q of set.items) { try { q.im.destroy(); if (q.glint) q.glint.destroy(); } catch (e) { /* gone */ } }
    set = { scene: sc, sig, items: [] };
    const L = st.figs._inner || st.figs.target;
    for (const c of C.T.ells) {
      const A = _gdsAlcoveOf(C.T, c); if (!A) continue;
      const im = sc.add.image(A.x, A.y, _gdsAlcoveTex(sc, A, open, _gdqHash(C.T.id + c.i))).setOrigin(0.5, 40 / 46).setScale(0.5).setDepth(A.y - 1).setVisible(false);
      L.add(im); if (typeof _gdi !== 'undefined') _gdi.sortDue = true;
      let glint = null; if (open && A.find && typeof _gdfInsideTex === 'function') { glint = sc.add.image(A.x, A.y - 20, _gdfInsideTex(sc)).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setDepth(A.y - 0.5); L.add(glint); }   // (in the hollow, behind whoever stands in front of it)
      set.items.push({ A, im, glint, ph: (_gdqHash(C.T.id + c.i) % 628) / 100 });
    }
    _gds.inside.set(C.T.id, set);
  }
  const t = now / 1000;
  if (!set.flagT || now - set.flagT > 1000) { set.flagT = now; for (const q of set.items) q.had = !!(q.A.find && _gdfHas(q.A.find)); }   // (once a second: nothing made each frame)
  for (const q of set.items) {
    const on = a > 0.02; if (q.im.visible !== on) q.im.setVisible(on); if (on && Math.abs(q.im.alpha - a) > 0.02) q.im.setAlpha(a);
    if (q.glint) { const g = on && q.A.find && !q.had; if (q.glint.visible !== g) q.glint.setVisible(g); if (g) { const k = 0.5 + 0.5 * Math.max(0, Math.sin(t * 2.1 + q.ph)) ** 3; q.glint.setAlpha(a * (0.3 + 0.7 * k)).setScale(0.3 + 0.3 * k); } }
  }
}
if (typeof gardenTunnelStageFrame === 'function') {
  const _gdsStage0 = gardenTunnelStageFrame;
  gardenTunnelStageFrame = function (C, now) { _gdsStage0(C, now); try { _gdsInsideFrame(C, now); } catch (e) { /* drawn as it is */ } };   // eslint-disable-line no-func-assign
}
if (typeof gardenTunnelStageClose === 'function') {
  const _gdsClose0 = gardenTunnelStageClose;
  gardenTunnelStageClose = function (force) { try { for (const set of _gds.inside.values()) for (const q of set.items) { if (q.im.active && q.im.visible) q.im.setVisible(false); if (q.glint && q.glint.active) q.glint.setVisible(false); } } catch (e) { /* gone */ } return _gdsClose0(force); };   // eslint-disable-line no-func-assign
}
/* ---------- walked through: a mark that outlives the ledger's fold ---------- */
if (typeof _gdtDone === 'function') {
  const _gdsDone0 = _gdtDone;
  _gdtDone = function (C, m) {   // eslint-disable-line no-func-assign
    if (!_gdqVisiting() && C && C.T && _gdsSeen('dp.t.' + C.T.id)) return;   // (walked before: paid then, said then)
    _gdsDone0(C, m);
    try { const g = _gdG(); if (!_gdqVisiting() && g && g.seen && g.led && g.led['dpt.' + C.T.id]) { g.seen['dp.t.' + C.T.id] = g.led['dpt.' + C.T.id].d || _gdfToday(); _gdSave(); } } catch (e) { /* later */ }
  };
}
/** A garden walked before this mark existed: its ledger lines give the marks, once. */
function _gdsBackfill() {
  if (_gds.backfilled) return; _gds.backfilled = true;
  try { const g = _gdG(); let n = 0; if (g && g.led && g.seen) for (const k of Object.keys(g.led)) if (k.startsWith('dpt.') && !g.seen['dp.t.' + k.slice(4)]) { g.seen['dp.t.' + k.slice(4)] = g.led[k].d || _gdfToday(); n++; } if (n && typeof _gdSaveQuiet === 'function') _gdSaveQuiet(); } catch (e) { _gds.backfilled = false; }
}
/* ---------- what friends are told: each tunnel's bits ---------- */
if (typeof gardenDepthTunnelWire === 'function') {
  const _gdsWire0 = gardenDepthTunnelWire;
  gardenDepthTunnelWire = function () {   // eslint-disable-line no-func-assign
    let dp = null; try { dp = _gdsWire0(); } catch (e) { dp = null; }
    _gdsBackfill();   // (your own garden's bits, wherever you are standing: the snapshot is always of your garden)
    const B = GARDEN_DEPTH_WIRE.bits, t = [];
    try { for (const T of gardenTunnels()) { const bits = (_gdsWalked(T.id) ? B.walked : 0) | (T.secret && _gdsSeen('dp.s.' + T.id) ? B.opened : 0) | (_gdsSeen('dp.a.' + T.id) ? B.alcove : 0); if (bits && GARDEN_DEPTH_WIRE.id.test(T.id)) t.push([T.id, bits]); } } catch (e) { /* as it was */ }
    if (!t.length) { if (dp && dp.t) { const o = Object.assign({}, dp); delete o.t; return Object.keys(o).length ? o : null; } return dp; }
    return Object.assign({}, dp || {}, { t: t.slice(0, GARDEN_DEPTH_WIRE.tunnels) });
  };
}
if (typeof gardenDepthFacts === 'function') {
  const _gdsFacts0 = gardenDepthFacts;
  gardenDepthFacts = function () {   // eslint-disable-line no-func-assign
    const f = Object.assign({}, _gdsFacts0());
    try {
      _gdsBackfill();
      const T = gardenTunnels(), walked = T.filter(t => _gdsWalked(t.id)).length;
      f.tunnelsSeen = walked; f.tunnelsOf = T.length; f.tunnelsAll = T.length && walked >= T.length ? 1 : 0;
      f.secretWays = T.filter(t => t.secret && _gdsSeen('dp.s.' + t.id)).length;
      f.alcovesOpened = T.filter(t => _gdsSeen('dp.a.' + t.id)).length;
    } catch (e) { /* none */ }
    return f;
  };
}
/* ---------- a friend opening yours (the host decides, in your garden) ---------- */
/** The host's side of a guest's 'tunnel' intent: p the tunnel, r 0 its secret way, r 2 its alcove. '' when done (put), else why not. */
function gardenDepthHostIntent(ev, put) {
  const T = typeof gardenTunnels === 'function' ? gardenTunnels().find(t => t.id === String(ev.p || '')) : null; if (!T) return 'gone';
  const g = _gdG(), r = ev.r | 0;
  if (r === 0) {
    if (!T.secret) return 'kind'; if (g.seen['dp.s.' + T.id]) return 'have';
    const mark = _gdMark([['seen', 'dp.s.' + T.id]]); g.seen['dp.s.' + T.id] = _gdfToday();
    _gdsForget(); setTimeout(() => { try { if (typeof _glhSnapAll === 'function') _glhSnapAll(); } catch (e) { /* the next world check */ } }, 60);
    try { gardenToast((typeof _glhByName === 'function' ? _glhByName(ev.f) : 'A friend') + ' found ' + T.name + ' in your garden and heaved its slab open!', { icon: 'key-round' }); } catch (e) { /* quiet */ }
    try { _gdSave(); } catch (e) { /* with the diary */ }
    return put(mark, { noUndo: true, p: T.id, r: 0 });
  }
  if (r === 2) {
    if (!T.ells.some(c => c.alcove)) return 'kind'; if (g.seen['dp.a.' + T.id]) return 'have';
    const mark = _gdMark([['seen', 'dp.a.' + T.id]]); g.seen['dp.a.' + T.id] = _gdfToday();
    setTimeout(() => { try { if (typeof _glhSnapAll === 'function') _glhSnapAll(); } catch (e) { /* later */ } }, 60);
    try { _gdSave(); } catch (e) { /* with the diary */ }
    return put(mark, { noUndo: true, p: T.id, r: 2 });
  }
  return 'kind';
}
/* the host said no (or an older relay does not know the intent): what you opened there is shut again on your screen */
if (typeof _glvResult === 'function') {
  const _gdsRes0 = _glvResult;
  _glvResult = function (b) {   // eslint-disable-line no-func-assign
    try { if (b && !b.ok && b.t === 'tunnel' && typeof _glv !== 'undefined' && _glv.pending && _glv.pending.has(b.i)) { const P = _glv.pending.get(b.i); if (P && P.f && P.f.p) { _gds.echo.delete(_gdsEcho(String(P.f.p), 2)); _gds.echo.delete(_gdsEcho(String(P.f.p), 8)); _gdsForget(); } } } catch (e) { /* as it was */ }
    return _gdsRes0(b);
  };
}
if (typeof _glhLand === 'function') {
  const _gdsLand0 = _glhLand;
  _glhLand = function (ev, put, m) { if (ev && ev.t === 'tunnel') return gardenDepthHostIntent(ev, put, m); return _gdsLand0(ev, put, m); };   // eslint-disable-line no-func-assign
}
if (typeof _glhDiaryWhat === 'function') {
  const _gdsDiary0 = _glhDiaryWhat;
  _glhDiaryWhat = function (e, n) {   // eslint-disable-line no-func-assign
    if (e && e.t === 'tunnel') { const who = typeof _glhByName === 'function' ? _glhByName(e.f) : 'A friend', T = typeof gardenTunnels === 'function' ? gardenTunnels().find(t => t.id === e.p) : null; return `${who} opened ${T ? (e.r === 2 ? 'a hidden alcove in ' + T.name : T.name) : 'a way underground'}`; }
    return _gdsDiary0(e, n);
  };
}

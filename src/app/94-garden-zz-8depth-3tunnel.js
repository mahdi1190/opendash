/* ============================================================
   DEPTH: TUNNELS AND UNDERGROUND (26 Nov 2026, the depth lane, its second part). The owner: "add tunnels etc, add more depth into the
   game and locations"; the brief: "Real tunnels you walk through: through hills and cliffs ... a mine or cave with a few chambers, cellars
   under buildings reached by a hatch or stairs. Entering one: the world above dims and the tunnel's own walls and dark show, lit by lanterns
   or your own light; coming out the other end. Friends see you go in and come out and can follow."

   A TUNNEL IS A KIND OF THING (GARDEN_KINDS.tunnel), placed as layout data (assets/garden/vale-depth.json), read by its kind: nothing here
   names a place or a cell. Its geometry is gardenTunnelGeom (94-garden-zz-8depth-0rules.js): mouths (a hatch, an arch, an adit, steps), the
   passages between them, chambers. A mouth whose land is not open yet is shut (drawn shut: a rockfall, a locked gate) until it opens.
     gardenTunnels()            every tunnel found standing on this layout, placed as its row says
     gardenTunnelGo(T, m)       walk to mouth m's threshold and go in (E at the prompt, a click on it)
     gardenTunnelLeave(m)       out by mouth m (its stair: E, a click, or walk up it into the daylight)
     gardenDepthTunnelWhere()   where you are underground: { id, n (the chamber) } or null (the snapshot's pw, 94-garden-zz-8depth-1under.js)

   INSIDE. The world above is veiled and the inside is drawn over it at its own place under the ground (94-garden-zz-8depth-4inside.js: the
   stage, the inside's picture, the dark and your light). The feet are held to the tunnel's own floor (its passages, chambers and open
   stairs), nothing of the world above; the camera follows as ever, so you come out where the far mouth really is. Walk up an open stair
   into the daylight and you go out; a shut one says why. The place kept for next time is the mouth you went in by, never inside.

   FRIENDS. One gl:em when you go in (act-tunnelin, at the threshold), one when you come out (act-tunnelout, at the mouth you come out of),
   and act-intunnel now and then while you are inside (and to whoever arrives): their copy of you walks into the mouth and fades; while you
   are inside and they are not, a faint warm glow moves under the hill where you walk; inside the same tunnel you see each other in its own
   light; at the mouth their prompt says "Follow Sam in". The garden's snapshot says where you are (pw: ['t', id, chamber]).
   ============================================================ */
const _gdt = { list: null, listT: 0, geo: new Map(), cur: null, said: {}, seen: '', tellAt: null, toldT: 0, openSig: '', open: new Map(), notes: new Set(), near: null, nearT: 0, stuckT: 0 };
const GDT = Object.freeze({ inMs: 1150, outMs: 1050, reach: 2.2, pay: Object.freeze({ c: 10, x: 5 }), tellMs: 6000 });
function _gdtW() { return GARDEN_WORLD; }
function _gdtEase(q) { q = q < 0 ? 0 : q > 1 ? 1 : q; return q * q * (3 - 2 * q); }
function _gdtFaceDeg(m, out) { const f = out ? { n: 's', s: 'n', e: 'w', w: 'e' }[m.face] : m.face; return f === 'n' ? -90 : f === 's' ? 90 : f === 'e' ? 0 : 180; }
/** Every tunnel found standing (gardenAffordThings: its kind, where its row puts it), as geometry. A row that does not fit is left out with a
 *  console note. Looked at again at most once a second. */
function gardenTunnels() {
  const now = performance.now();
  if (_gdt.list && now - _gdt.listT < 1000) return _gdt.list;
  _gdt.listT = now;
  const out = [];
  try {
    const rows = new Map(); for (const r of (typeof gardenThingsPlaced === 'function' ? gardenThingsPlaced() : [])) if (r && r.kind === 'tunnel' && r.id) rows.set(r.id, r);
    if (rows.size && typeof gardenAffordThings === 'function') for (const t of gardenAffordThings()) {
      if (!t || t.kind !== 'tunnel' || t.src !== 'thing') continue;
      const row = rows.get(t.id); if (!row) continue;
      const key = t.id + '@' + t.x.toFixed(2) + ',' + t.y.toFixed(2);
      let G = _gdt.geo.get(key);
      if (!G) { G = gardenTunnelGeom(row, t.x, t.y, _gdtW()); G.key = key; G.row = row; _gdt.geo.set(key, G); if (_gdt.geo.size > 64) _gdt.geo.delete(_gdt.geo.keys().next().value); }
      if (G.fault) { if (!_gdt.notes.has(key)) { _gdt.notes.add(key); console.info('[garden depth] tunnel left out: ' + t.id + ' (' + G.fault + ')'); } continue; }
      out.push(G);
    }
  } catch (e) { console.error('[garden depth] tunnels', e); }
  return (_gdt.list = out);
}
function _gdtById(id) { for (const T of gardenTunnels()) if (T.id === id) return T; return null; }
/** Which of a tunnel's mouths are open now: a mouth whose ground is in land not open yet is shut (drawn shut, cannot be used). */
function _gdtOpen(T) {
  let sig = ''; try { sig = (typeof _GD_LAND !== 'undefined' && _GD_LAND ? _GD_LAND.size : 0) + '|' + (typeof gardenVisitOn === 'function' && gardenVisitOn() && typeof _gdv !== 'undefined' ? _gdv.fid : ''); } catch (e) { sig = ''; }
  if (sig !== _gdt.openSig) { _gdt.openSig = sig; _gdt.open.clear(); }
  let v = _gdt.open.get(T.key);
  if (!v) { v = T.mouths.map(m => { try { return typeof gardenZoneLockAt === 'function' ? !gardenZoneLockAt(Math.floor(m.x), Math.floor(m.y)) : true; } catch (e) { return true; } }); _gdt.open.set(T.key, v); }
  return v;
}
/** The region a mouth comes out in (its name for the words: "Go up on to the Cloudbreak mountains"). */
function _gdtRegion(m) {
  try { const c = gardenIslandBaseCell(Math.floor(m.x), Math.floor(m.y)); const z = c && c.regionZone != null ? c.regionZone : typeof gardenZoneOf === 'function' ? gardenZoneOf(Math.floor(m.x), Math.floor(m.y)) : null; const r = z != null && typeof gardenIslandRegionForZone === 'function' ? gardenIslandRegionForZone(z) : null; return { zone: z, name: r && r.name ? r.name : '' }; } catch (e) { return { zone: null, name: '' }; }
}
/** The words for a shut mouth, seen from inside. */
function _gdtShutWords(T, m) {
  const R = _gdtRegion(m), where = R.name || 'the land beyond';
  if (m.by === 'steps' || m.by === 'hatch') return 'Fallen rock blocks the way up. Daylight shows through a crack: this way comes out in ' + where + '. It will open when ' + where + ' does.';
  return 'A locked gate stands across the way: it comes out in ' + where + ', and opens when ' + where + ' does.';
}
function _gdtSay(key, text, icon) { const now = performance.now(); if (now - (_gdt.said[key] || -1e9) < 9000) return; _gdt.said[key] = now; try { gardenToast(text, icon ? { icon } : undefined); } catch (e) { /* quiet */ } }
/** Someone inside this tunnel now (a friend's copy): the first one's name, for "Follow Sam in". */
function _gdtFriendIn(T) {
  try { if (typeof _gll === 'undefined' || !_gll.actors) return null; for (const A of _gll.actors.values()) if (A && !A.me && A.dpT === T.id) return A; } catch (e) { /* alone */ }
  return null;
}
/* ---------- the prompts ---------- */
/** The prompts outside: one at each open mouth's threshold ("Go down into the cellar", "Follow Sam in"). */
function _gdtRows() {
  const out = [];
  for (const T of gardenTunnels()) {
    const open = _gdtOpen(T);
    for (const m of T.mouths) {
      if (!open[m.i]) continue;
      if (_gw.grid && typeof gardenWorldFree === 'function' && !gardenWorldFree(m.x, m.y, 0.05) && typeof _gwNearestFreePt === 'function' && !_gwNearestFreePt(m.x, m.y, 0.6)) { const k = T.key + ':' + m.i; if (!_gdt.notes.has(k)) { _gdt.notes.add(k); console.info('[garden depth] a mouth nobody can stand at: ' + T.id + ' ' + m.i); } continue; }
      const ax = m.x + m.fx * 0.42, ay = m.y + m.fy * 0.42;
      out.push({ key: 'dp:' + T.id + ':' + m.i, act: 'tunnelin', name: T.name, x: ax, y: ay, promptY: ay - (m.by === 'hatch' || m.by === 'steps' ? 1.55 : 2.6), stand: { x: m.x, y: m.y }, deg: _gdtFaceDeg(m), lift: 0, src: 'dp:' + T.id, kind: 'tunnel', tunnel: T, mouth: m, pri: 0.8 });
    }
  }
  return out;
}
/** The prompts inside: at each mouth's stair (out, or why it is shut). */
function _gdtInsideRows() {
  const C = _gdt.cur; if (!C || C.phase !== 'inside') return [];
  const out = [], open = _gdtOpen(C.T), px = _gw.px, py = _gw.py;
  for (const m of C.T.mouths) {
    const d = Math.hypot(m.ix - px, (m.iy - py) * 1.3); if (d > 1.5) continue;
    out.push({ key: 'dpo:' + C.T.id + ':' + m.i, act: open[m.i] ? 'tunnelout' : 'tunnelshut', name: C.T.name, x: m.ix, y: m.iy, promptY: m.iy - 1.9, stand: null, deg: _gdtFaceDeg(m, true), lift: 0, src: 'dpo:' + C.T.id, kind: 'tunnel', tunnel: C.T, mouth: m, inside: true, d });
  }
  return out.sort((a, b) => a.d - b.d);
}
function _gdtWords(r) {
  const m = r.mouth, T = r.tunnel;
  if (r.act === 'tunnelin') {
    const A = _gdtFriendIn(T); if (A) return 'Follow ' + String(A.n || 'your friend').split(/\s+/)[0] + ' in';
    if (m.by === 'hatch') return T.style === 'cellar' ? 'Go down into the cellar' : 'Open the hatch and go down';
    if (m.by === 'steps') return 'Go down the steps';
    if (m.by === 'adit') return 'Go into the old mine';
    return 'Go in under the arch';
  }
  if (r.act === 'tunnelout') {
    const C = _gdt.cur, R = _gdtRegion(m), back = C && C.inBy && _gdtRegion(C.inBy).zone === R.zone;
    const up = m.by === 'hatch' || m.by === 'steps';
    if (back || !R.name) return up ? 'Go back up' : 'Go back out';
    return (up ? 'Go up into ' : 'Go out into ') + R.name;
  }
  if (r.act === 'tunnelshut') return m.by === 'steps' || m.by === 'hatch' ? 'Look at the fallen rock' : 'Look at the gate';
  return '';
}
/* ---------- going in and coming out ---------- */
/** Walk to mouth m's threshold and go in. */
function gardenTunnelGo(T, m) {
  if (!T || !m || _gdt.cur || typeof _gw === 'undefined' || !_gw.on || _gw.boat) return false;
  if (typeof _ght !== 'undefined' && (_ght.lv || _ght.climb || _ght.swim)) return false;
  if (!_gdtOpen(T)[m.i]) { _gdtSay('shut:' + T.id + m.i, _gdtShutWords(T, m)); return false; }
  if (typeof gartActStop === 'function') gartActStop();
  const go = () => { if (!_gdt.cur) _gdtStart(T, m); };
  const far = Math.hypot((m.x - _gw.px) * _gdtW().cellW, (m.y - _gw.py) * _gdtW().cellH);
  if (far < 16) go();
  else if (!gardenWalkToPoint({ x: m.x, y: m.y }, (ok) => { if (ok !== false) go(); }, { radius: 1.6 })) { try { gameDeny(null, { say: 'You cannot get there.' }); } catch (e) { /* fine */ } return false; }
  return true;
}
function _gdtStart(T, m) {
  _gw.path = []; _gw.then = null; _gw.spd = 0; _gw.moving = false;
  const motion = typeof _gaMotion === 'function' ? _gaMotion() : true;
  _gdt.cur = { T, m, inBy: m, outBy: null, phase: 'in', t0: performance.now(), ms: motion ? GDT.inMs : 260, from: { x: _gw.px, y: _gw.py }, to: { x: m.ix + m.fx * 0.32, y: m.iy + m.fy * 0.32 }, armed: T.mouths.map(() => false), seen: new Set(), n: 0, adopted: false, node: null, k: 0 };
  _gaFace(_gdtFaceDeg(m)); try { _gwBody(); } catch (e) { /* fine */ }
  try { gardenSfx(m.by === 'hatch' || m.by === 'arch' ? 'door' : 'step'); } catch (e) { /* quiet */ }
  _gaTell('tunnelin', m.x, m.y);
  if (_ga.el) _ga.el.hidden = true;
  try { if (typeof gardenTunnelStageOpen === 'function') gardenTunnelStageOpen(T); } catch (e) { console.error('[garden depth] stage', e); }
}
/** Out by mouth m: to its stair foot (along the passages), then up into the daylight. */
function gardenTunnelLeave(m) {
  const C = _gdt.cur; if (!C || C.phase !== 'inside' || !m) return false;
  if (!_gdtOpen(C.T)[m.i]) { _gdtSay('shut:' + C.T.id + m.i, _gdtShutWords(C.T, m)); return false; }
  const go = () => {
    const c = _gdt.cur; if (!c || c.phase !== 'inside') return;
    _gw.path = []; _gw.then = null; _gw.spd = 0; _gw.moving = false;
    c.phase = 'out'; c.t0 = performance.now(); c.ms = (typeof _gaMotion === 'function' && !_gaMotion()) ? 260 : GDT.outMs; c.from = { x: _gw.px, y: _gw.py }; c.to = { x: m.x, y: m.y }; c.m = m; c.outBy = m;
    _gaFace(_gdtFaceDeg(m, true)); try { _gwBody(); } catch (e) { /* fine */ }
    try { gardenSfx(m.by === 'hatch' || m.by === 'arch' ? 'door' : 'step'); } catch (e) { /* quiet */ }
    _gaTell('tunnelout', m.x, m.y);
    if (_ga.el) _ga.el.hidden = true;
  };
  const far = Math.hypot(m.ix - _gw.px, (m.iy - _gw.py) * 1.3);
  if (far < 0.55) go();
  else if (!gardenWalkToPoint({ x: m.ix, y: m.iy }, (ok) => { if (ok !== false) go(); })) return false;
  return true;
}
/** Each frame: the walk in or out, and what happens inside (the stairs you walk up, the chambers you find, telling friends where you are). */
function _gdtFrame(now) {
  const C = _gdt.cur;
  if (!C) { _gdtIdle(now); return; }
  if (typeof _gw === 'undefined' || !_gw.on) return;
  if (C.phase === 'in' || C.phase === 'out') {
    const k = Math.min(1, (now - C.t0) / C.ms), q = _gdtEase(k); C.k = k;
    _gw.px = C.from.x + (C.to.x - C.from.x) * q; _gw.py = C.from.y + (C.to.y - C.from.y) * q;
    if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
    if (C.phase === 'in') {
      // down the stair: the figure sinks into the dark of the mouth, then is seen again inside, in its own light
      if (k >= 0.5 && !C.adopted) _gdtAdoptMe(C);
      _gdtAlpha(k < 0.5 ? Math.max(0, 1 - k / 0.42) : Math.min(1, (k - 0.5) / 0.3));
      if (k >= 1) { C.phase = 'inside'; C.t0 = now; _gdtAlpha(1); _gdtInsideFirst(C); try { _gwBody(); } catch (e) { /* fine */ } }
    } else {
      if (k >= 0.5 && C.adopted) _gdtReleaseMe(C);
      _gdtAlpha(k < 0.5 ? Math.max(0, 1 - k / 0.42) : Math.min(1, (k - 0.5) / 0.3));
      if (k >= 1) { _gdtFinish(C, now); return; }
    }
    if (_gw.cam) _gw.cam.dirty = true;
  } else if (C.phase === 'inside') {
    if (C.adopted && _gw.node && C.node !== _gw.node) _gdtAdoptMe(C);   // (the world was drawn again: its new figure goes into the tunnel too)
    { const W0 = _gdtW(); if (!gardenTunnelFree(C.T, _gw.px * W0.cellW, W0.sky + _gw.py * W0.cellH, -40, null)) { _gdtEnd(); return; } }   // (moved far out of it by something else, a journey on the map: the tunnel is left behind, where you are)
    const open = _gdtOpen(C.T), W = _gdtW();
    for (const m of C.T.mouths) {
      const d = Math.hypot(m.ox - _gw.px, (m.oy - _gw.py) * 1.3);
      if (d > GARDEN_TUNNEL.arm) C.armed[m.i] = true;
      if (open[m.i] && C.armed[m.i] && d < GARDEN_TUNNEL.out + 0.25) { gardenTunnelLeave(m); break; }   // (up the stair into the daylight)
      if (!open[m.i] && Math.hypot(m.ix - _gw.px, (m.iy - _gw.py) * 1.3) < 0.75) _gdtSay('shut:' + C.T.id + m.i, _gdtShutWords(C.T, m));   // (rule 15: the rock you see stops you, and says why)
    }
    const n = gardenTunnelChamberAt(C.T, _gw.px * W.cellW, W.sky + _gw.py * W.cellH);
    if (n >= 0) { C.n = n; if (!C.seen.has(n)) { C.seen.add(n); _gdtChamberFirst(C, n); } }
    _gdtRetell(now);
  }
  try { if (typeof gardenTunnelStageFrame === 'function') gardenTunnelStageFrame(C, now); } catch (e) { if (!_gdt.failT || now - _gdt.failT > 8000) { _gdt.failT = now; console.error('[garden depth] stage', e); } }
}
/** Your figure's own opacity while you go in or out (the height file's way: _ghtAlpha). */
function _gdtAlpha(a) { try { if (typeof _ghtAlpha === 'function') _ghtAlpha(_gw.node, a); else if (_gw.node && _gw.node.target) _gw.node.target.setAlpha(a); } catch (e) { /* drawn as it is */ } }
/** Your figure into the tunnel's own drawing (over the veiled world), and back out. */
function _gdtAdoptMe(C) { try { if (typeof gardenTunnelStageAdopt === 'function' && _gw.node && gardenTunnelStageAdopt(_gw.node)) { C.adopted = true; C.node = _gw.node; } } catch (e) { console.error('[garden depth] adopt', e); } }
function _gdtReleaseMe(C) { try { if (typeof gardenTunnelStageRelease === 'function') gardenTunnelStageRelease(C.node || _gw.node, true); } catch (e) { console.error('[garden depth] release', e); } C.adopted = false; C.node = null; }
/** Out in the daylight: the stage away, your feet on the ground at the mouth, a word the first time through. */
function _gdtFinish(C, now) {
  const m = C.outBy || C.inBy;
  _gdt.cur = null;
  if (C.adopted) _gdtReleaseMe(C);
  _gdtAlpha(1);
  _gw.px = m.x - m.fx * 0.08; _gw.py = m.y - m.fy * 0.08; _gw.path = []; _gw.moving = false;
  if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
  try { if (typeof gardenTunnelStageClose === 'function') gardenTunnelStageClose(); } catch (e) { /* gone */ }
  try { _gwBody(); } catch (e) { /* fine */ }
  if (typeof gardenLiveWalked === 'function') try { gardenLiveWalked({ x: _gw.px, y: _gw.py }); } catch (e) { /* alone */ }
  _gdtDone(C, m);
  _gdt.groundAt = [now, now + 1500, now + 5000];   // (said out three times: a copy that missed the way out never stays underground)
  if (_gw.cam) _gw.cam.dirty = true;
}
/** Out of it where you are (something else moved you far away): the stage away, nothing moved. */
function _gdtEnd() {
  const C = _gdt.cur; if (!C) return;
  _gdt.cur = null;
  try { if (C.adopted) _gdtReleaseMe(C); } catch (e) { /* gone */ }
  _gdtAlpha(1);
  try { if (typeof gardenTunnelStageClose === 'function') gardenTunnelStageClose(true); } catch (e) { /* gone */ }
  _gdt.groundAt = [performance.now(), performance.now() + 1500];
}
/** Back on the ground at once, at the mouth you went in by (the garden closed, the tunnel gone from the layout). */
function _gdtAbort() {
  const C = _gdt.cur; if (!C) return;
  _gdt.cur = null;
  try { if (C.adopted) _gdtReleaseMe(C); } catch (e) { /* gone */ }
  _gdtAlpha(1);
  const m = C.inBy; if (m && typeof _gw !== 'undefined') { _gw.px = m.x - m.fx * 0.08; _gw.py = m.y - m.fy * 0.08; _gw.path = []; if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; } }
  try { if (typeof gardenTunnelStageClose === 'function') gardenTunnelStageClose(true); } catch (e) { /* gone */ }
}
/** Outside: bake the inside of a tunnel you are walking up to, a little each frame, so going in never waits; and a tunnel gone from the
 *  layout while you were in it puts you back out. */
function _gdtIdle(now) {
  if (typeof _gw === 'undefined' || !_gw.on) return;
  if (now - _gdt.nearT >= 700) {   // (which mouth is near: looked at twice a second or so)
    _gdt.nearT = now;
    let best = null, bd = 6;
    for (const T of gardenTunnels()) for (const m of T.mouths) { const d = Math.hypot(m.x - _gw.px, m.y - _gw.py); if (d < bd) { bd = d; best = T; } }
    _gdt.near = best; _gdt.nearDone = false;
    if (!best && typeof gardenTunnelForget === 'function') try { gardenTunnelForget(); } catch (e) { /* later */ }
  }
  if (_gdt.near && !_gdt.nearDone && typeof gardenTunnelPrebake === 'function') try { _gdt.nearDone = gardenTunnelPrebake(_gdt.near) === true; } catch (e) { _gdt.nearDone = true; }   // (a slice each frame, in what the frames leave over)
}
/* ---------- the first time ---------- */
function _gdtInsideFirst(C) {
  let g = null; try { g = _gdG(); } catch (e) { g = null; }
  const light = typeof gardenTunnelLight === 'function' ? gardenTunnelLight() : { lantern: false };
  if (g && g.disc && !g.disc['dp.inside']) { g.disc['dp.inside'] = typeof _gdToday === 'function' ? _gdToday() : '1'; try { _gdSave(); } catch (e) { /* later */ } try { gardenToast('Underground. ' + (light.lantern ? 'Your lantern lights the way.' : 'You strike a candle: a lantern would light more of the way.') + ' Walk back to the daylight to come out.', { icon: 'lamp' }); } catch (e) { /* quiet */ } }
  try { if (GARDEN_ACTS.tunnelin) _gaFirst({ id: 'tunnelin', row: GARDEN_ACTS.tunnelin }); } catch (e) { /* fine */ }
}
function _gdtChamberFirst(C, n) {
  const c = C.T.ells.find(e => e.i === n), R = c && GARDEN_CHAMBERS[c.what]; if (!R) return;
  let g = null; try { g = _gdG(); } catch (e) { g = null; }
  const key = 'dp.c.' + C.T.id + '.' + n; if (!g || !g.seen || g.seen[key] || (typeof gardenVisitOn === 'function' && gardenVisitOn())) return;
  g.seen[key] = typeof _gdToday === 'function' ? _gdToday() : '1'; try { _gdSave(); } catch (e) { /* later */ }
  const line = { shelves: 'Shelves of old boxes and ledgers, thick with dust.', bench: 'A bench cut into the rock, worn smooth by drovers resting.', well: 'A well shaft, cold air breathing up from the water far below.', barrels: 'Barrels laid down in the cool, waiting for the cider.', tub: 'An old ore tub on its rails, half full of spoil.', crystals: 'Crystals in the rock, catching your light.', pool: 'A still pool, so clear you can see the stones on its bottom.', worms: 'Tiny green lights on the ceiling.', none: 'Your footsteps come back to you.' }[R.piece];
  if (line) try { gardenToast(line, { icon: 'sparkles' }); } catch (e) { /* quiet */ }
}
/** Out of a tunnel: the first time out of each one, a few coins and a line in your journal (its ledger line pays once, by id); the ribbons
 *  count them (gardenDepthFacts). In a friend's garden it is theirs, and nothing is counted. */
function _gdtDone(C, m) {
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) return;
  let g = null; try { g = _gdG(); } catch (e) { g = null; } if (!g || !g.led) return;
  const key = 'dpt.' + C.T.id; if (g.led[key]) return;
  const through = !!(C.outBy && C.inBy && C.outBy.i !== C.inBy.i);
  g.led[key] = { d: typeof _gdToday === 'function' ? _gdToday() : '', k: 'dp', c: GDT.pay.c, x: GDT.pay.x, n: 1 };
  try { _gdSave(); } catch (e) { /* with the next change */ }
  const F = gardenDepthFacts(), more = F.tunnelsOf - F.tunnelsSeen;
  try { gardenToast((through ? 'Through ' : 'Explored ') + C.T.name + '. +' + GDT.pay.c + ' coins, +' + GDT.pay.x + ' XP' + (more > 0 ? ' (' + more + ' more way' + (more > 1 ? 's' : '') + ' underground to find)' : ''), { icon: 'map-pin' }); } catch (e) { /* quiet */ }
  try { gardenSfx('sparkle'); } catch (e) { /* quiet */ }
}
/* ---------- where you are, for the snapshot and the rest of the game ---------- */
function gardenDepthTunnelWhere() {
  const C = _gdt.cur; if (!C) return null;
  if ((C.phase === 'in' && C.k < 0.5) || (C.phase === 'out' && C.k >= 0.5)) return null;
  return { id: C.T.id, n: Math.max(0, C.n | 0) };
}
/** dp: the tunnels you have been through (bit 1), for friends (gardenSnapshot). */
function gardenDepthTunnelWire() {
  let g = null; try { g = _gdG(); } catch (e) { g = null; } if (!g || !g.led) return null;
  const t = []; for (const k of Object.keys(g.led)) if (k.startsWith('dpt.')) { const id = k.slice(4); if (GARDEN_DEPTH_WIRE.id.test(id)) t.push([id, 1]); }
  return t.length ? { t: t.slice(0, GARDEN_DEPTH_WIRE.tunnels) } : null;
}
/** The chambers, for other parts of the game to use by kind (bats roost, glow-worms): [{ kind: 'chamber', what, id, x, y (cells), lit }]. */
function gardenDepthChamberPlaces() {
  const out = [];
  for (const T of gardenTunnels()) for (const c of T.ells) out.push({ kind: 'chamber', what: c.what, id: T.id + ':' + c.i, x: c.cx, y: c.cy, lit: !!(GARDEN_CHAMBERS[c.what] && GARDEN_CHAMBERS[c.what].lamp) });
  return out;
}
/** The ids of the tunnels on this layout (for the rules: a friend's intent names one). */
function gardenDepthTunnelIds() { return gardenTunnels().map(T => T.id); }
/** Are you underground (or on your way)? Other parts of the game stand aside (no swim, no climb, no room). */
function gardenTunnelBusy() { return !!_gdt.cur; }
/* The facts the ribbons read: the ways underground you have been through, of how many there are. */
if (typeof gardenDepthFacts === 'function') {
  const _gdtFacts0 = gardenDepthFacts;
  gardenDepthFacts = function () {   // eslint-disable-line no-func-assign
    const f = Object.assign({}, _gdtFacts0());
    let g = null; try { g = _gdG(); } catch (e) { g = null; }
    const ids = gardenTunnels().map(T => T.id), seen = ids.filter(id => g && g.led && g.led['dpt.' + id]).length;
    f.tunnelsSeen = seen; f.tunnelsOf = ids.length; f.tunnelsAll = ids.length && seen >= ids.length ? 1 : 0;
    return f;
  };
}
/* ---------- walking inside: the tunnel's own floor, nothing of the world above ---------- */
/** Can the feet be at (x, y) (cells) in the tunnel you are in? */
function _gdtFree(x, y, m) {
  const C = _gdt.cur, W = _gdtW();
  return gardenTunnelFree(C.T, x * W.cellW, W.sky + y * W.cellH, GARDEN_TUNNEL.foot + (m || 0) * W.cellW, _gdtOpen(C.T));
}
/** A way through the tunnel from a to b (cells): along its own floor (a grid a quarter of a cell across, built once per tunnel), the corners
 *  cut where the feet can go straight. null when b cannot be reached from a. */
function _gdtRoute(T, a, b) {
  const W = _gdtW(), q = 0.25, x0 = Math.floor(T.cbox[0]) - 1, y0 = Math.floor(T.cbox[1]) - 1, nx = Math.ceil((T.cbox[2] - x0 + 1) / q), ny = Math.ceil((T.cbox[3] - y0 + 1) / q);
  const open = _gdtOpen(T), key = open.join('');
  if (!T.grid || T.gridKey !== key) { const g = new Uint8Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const cx = x0 + (i + 0.5) * q, cy = y0 + (j + 0.5) * q; g[j * nx + i] = gardenTunnelFree(T, cx * W.cellW, W.sky + cy * W.cellH, GARDEN_TUNNEL.foot + 2, open) ? 1 : 0; } T.grid = g; T.gridKey = key; }
  const g = T.grid, at = (p) => { const i = Math.max(0, Math.min(nx - 1, Math.floor((p.x - x0) / q))), j = Math.max(0, Math.min(ny - 1, Math.floor((p.y - y0) / q))); return j * nx + i; };
  const near = (p) => { let k = at(p); if (g[k]) return k; let best = -1, bd = 1e9; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { if (!g[j * nx + i]) continue; const d = Math.hypot(x0 + (i + 0.5) * q - p.x, y0 + (j + 0.5) * q - p.y); if (d < bd) { bd = d; best = j * nx + i; } } return best; };
  const s = near(a), e = near(b); if (s < 0 || e < 0) return null;
  const prev = new Int32Array(nx * ny).fill(-1), Q = [s]; prev[s] = s;
  for (let h = 0; h < Q.length && prev[e] < 0; h++) { const k = Q[h], i = k % nx, j = (k - i) / nx; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const kk = jj * nx + ii; if (!g[kk] || prev[kk] >= 0) continue; if (di && dj && (!g[j * nx + ii] || !g[jj * nx + i])) continue; prev[kk] = k; Q.push(kk); } }
  if (prev[e] < 0) return null;
  const cells = []; for (let k = e; k !== s; k = prev[k]) cells.push(k); cells.reverse();
  const pts = cells.map(k => { const i = k % nx, j = (k - i) / nx; return { x: x0 + (i + 0.5) * q, y: y0 + (j + 0.5) * q }; });
  pts.push({ x: b.x, y: b.y });
  // straight wherever the feet can go straight
  const los = (p, r) => { const n = Math.max(1, Math.ceil(Math.hypot((r.x - p.x) * W.cellW, (r.y - p.y) * W.cellH) / 4)); for (let k = 1; k <= n; k++) { const t = k / n; if (!_gdtFree(p.x + (r.x - p.x) * t, p.y + (r.y - p.y) * t, 0)) return false; } return true; };
  const out = []; let from = a;
  for (let i = 0; i < pts.length;) { let j = pts.length - 1; while (j > i && !los(from, pts[j])) j--; out.push(pts[j]); from = pts[j]; i = j + 1; }
  return out;
}
if (typeof _gwFree === 'function') {
  const _gdtFree0 = _gwFree;
  _gwFree = function (x, y, m) {   // eslint-disable-line no-func-assign
    const C = _gdt.cur; if (!C) return _gdtFree0(x, y, m);
    if (C.phase !== 'inside') return true;   // (on the stair, going in or out: nothing pushes you)
    return _gdtFree(x, y, m);
  };
}
/** Outside, pressing into an open mouth (walking into the dark of an adit, on to an open hatch): after a moment you go in, as E would. */
function _gdtPushIn(dx, dy) {
  const now = performance.now(), l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  for (const T of gardenTunnels()) { const open = _gdtOpen(T); for (const m of T.mouths) {
    if (!open[m.i] || Math.hypot(m.x - _gw.px, (m.y - _gw.py) * 1.3) > 0.62 || ux * m.fx + uy * m.fy < 0.7) continue;
    if (!_gdt.push || _gdt.push.m !== m || now - _gdt.push.last > 160) _gdt.push = { m, t0: now, last: now }; else _gdt.push.last = now;
    if (now - _gdt.push.t0 > 260) { _gdt.push = null; gardenTunnelGo(T, m); }
    return;
  } }
}
if (typeof _gwMoveBy === 'function') {
  const _gdtMove0 = _gwMoveBy;
  _gwMoveBy = function (dx, dy) {   // eslint-disable-line no-func-assign
    const C = _gdt.cur; if (!C) { const ok = _gdtMove0(dx, dy); if (!ok && (dx || dy) && !(typeof _ght !== 'undefined' && (_ght.swim || _ght.lv || _ght.climb))) { try { _gdtPushIn(dx, dy); } catch (e) { /* walked as before */ } } return ok; }
    if (C.phase !== 'inside') return false;
    const x0 = _gw.px, y0 = _gw.py;
    if (_gwFree(x0 + dx, y0 + dy)) { _gw.px += dx; _gw.py += dy; return true; }
    // along the wall: the step turned a little at a time (in px, as the eye sees it) until it goes on, slower the more it turns, so a
    // curved wall slides you round it rather than holding you (a straight wall: one of the two axes)
    const W = _gdtW(), vx = dx * W.cellW, vy = dy * W.cellH;
    for (let k = 1; k <= 8; k++) for (const s of [1, -1]) { const a = s * k * 0.17, c = Math.cos(a), sn = Math.sin(a), rx = (vx * c - vy * sn) * c / W.cellW, ry = (vx * sn + vy * c) * c / W.cellH; if (_gwFree(x0 + rx, y0 + ry)) { _gw.px = x0 + rx; _gw.py = y0 + ry; return true; } }
    if (dx && _gwFree(x0 + dx, y0)) { _gw.px += dx; return true; }
    if (dy && _gwFree(x0, y0 + dy)) { _gw.py += dy; return true; }
    return false;
  };
}
if (typeof gardenWalkToPoint === 'function') {
  const _gdtWalk0 = gardenWalkToPoint;
  gardenWalkToPoint = function (pt, then, o) {   // eslint-disable-line no-func-assign
    const C = _gdt.cur; if (!C) return _gdtWalk0(pt, then, o);
    if (C.phase !== 'inside' || !pt) return false;
    let tgt = { x: pt.x, y: pt.y };
    if (!_gwFree(tgt.x, tgt.y)) { const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(tgt.x, tgt.y, 1.6) : null; if (!f) return false; tgt = f; }
    const way = _gdtRoute(C.T, { x: _gw.px, y: _gw.py }, tgt); if (!way || !way.length) return false;
    _gw.path = way; _gw.then = then || null; _gw.goal = tgt; _gw.repaths = 0; _gw.blockT = 0; _gw.clickRun = false;
    if (typeof gardenLiveWalked === 'function') try { gardenLiveWalked(tgt); } catch (e) { /* alone */ }
    return true;
  };
}
/* A click inside: on the floor you walk there; on a stair you go out (or are told why not); anything else does nothing (never a cast, a
   pick or a walk to a door up in the world). */
if (typeof gardenWorldClick === 'function') {
  const _gdtClick0 = gardenWorldClick;
  gardenWorldClick = function (it, cell, ev, m) {   // eslint-disable-line no-func-assign
    const C = _gdt.cur; if (!C || typeof _gw === 'undefined' || !_gw.on) return _gdtClick0(it, cell, ev, m);
    if (C.phase !== 'inside') return true;
    const pt = (typeof _gwPointAt === 'function' && _gwPointAt(ev)) || (cell ? { x: cell.x + 0.5, y: cell.y + 0.5 } : null); if (!pt) return true;
    for (const mo of C.T.mouths) if (Math.hypot(mo.x - pt.x, (mo.y - pt.y) * 1.3) < 0.75 || Math.hypot(mo.ix - pt.x, (mo.iy - pt.y) * 1.3) < 0.45) { if (_gdtOpen(C.T)[mo.i]) gardenTunnelLeave(mo); else _gdtSay('shut:' + C.T.id + mo.i, _gdtShutWords(C.T, mo)); return true; }
    if (!gardenWalkToPoint(pt, null, { radius: 2 })) { try { gameDeny(null, { at: ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : null, say: 'The rock is solid there.' }); } catch (e) { /* fine */ } }
    return true;
  };
}
// (no bridge or door of the world above pulls you round underground)
if (typeof _gwCrossingSteer === 'function') { const _gdtCross0 = _gwCrossingSteer; _gwCrossingSteer = function (ux, uy, step) { return _gdt.cur ? null : _gdtCross0(ux, uy, step); }; }   // eslint-disable-line no-func-assign
if (typeof _gwDoorSteer === 'function') { const _gdtDoor0 = _gwDoorSteer; _gwDoorSteer = function (ux, uy) { return _gdt.cur ? null : _gdtDoor0(ux, uy); }; }   // eslint-disable-line no-func-assign
if (typeof gardenHeightDepth === 'function') {   // (drawn at your feet's own depth in the tunnel's drawing: nothing of the world above lifts you)
  const _gdtDepth0 = gardenHeightDepth;
  gardenHeightDepth = function () { const C = _gdt.cur; if (C && C.adopted) return _gdtW().sky + _gw.py * _gdtW().cellH + 0.001; return _gdtDepth0(); };   // eslint-disable-line no-func-assign
}
if (typeof gardenHeightReflects === 'function') { const _gdtRef0 = gardenHeightReflects; gardenHeightReflects = function () { return _gdt.cur ? false : _gdtRef0(); }; }   // eslint-disable-line no-func-assign
if (typeof gardenSwimStart === 'function') { const _gdtSwim0 = gardenSwimStart; gardenSwimStart = function () { return _gdt.cur ? false : _gdtSwim0(); }; }   // eslint-disable-line no-func-assign
if (typeof gardenClimb === 'function') { const _gdtClimb0 = gardenClimb; gardenClimb = function (w, up) { return _gdt.cur ? false : _gdtClimb0(w, up); }; }   // eslint-disable-line no-func-assign
/* ---------- the prompts and E ---------- */
if (typeof _gaStaticRows === 'function') {
  const _gdtRows0 = _gaStaticRows;
  _gaStaticRows = function () { const rows = _gdtRows0(); if (_gdt.cur) return rows; try { for (const r of _gdtRows()) rows.push(r); } catch (e) { /* no tunnels */ } return rows; };   // eslint-disable-line no-func-assign
}
if (typeof gartActNearby === 'function') {
  const _gdtNear0 = gartActNearby;
  gartActNearby = function () {   // eslint-disable-line no-func-assign
    const C = _gdt.cur; if (!C) return _gdtNear0();
    if (C.phase !== 'inside') return [];
    return _gdtInsideRows();
  };
}
if (typeof gartActRun === 'function') {
  const _gdtRun0 = gartActRun;
  gartActRun = function (id, spot) {   // eslint-disable-line no-func-assign
    if (id === 'tunnelin') return gardenTunnelGo(spot && spot.tunnel, spot && spot.mouth);
    if (id === 'tunnelout') return gardenTunnelLeave(spot && spot.mouth);
    if (id === 'tunnelshut') { const C = _gdt.cur; if (C && spot && spot.mouth) { _gdt.said['shut:' + C.T.id + spot.mouth.i] = 0; _gdtSay('shut:' + C.T.id + spot.mouth.i, _gdtShutWords(C.T, spot.mouth)); } return true; }
    if (_gdt.cur) return false;
    return _gdtRun0(id, spot);
  };
}
if (typeof _gaWords === 'function') {
  const _gdtWords0 = _gaWords;
  _gaWords = function (r) { if (r && (r.act === 'tunnelin' || r.act === 'tunnelout' || r.act === 'tunnelshut') && r.mouth) return _gdtWords(r); return _gdtWords0(r); };   // eslint-disable-line no-func-assign
}
if (typeof gartActInteract === 'function') {
  const _gdtE0 = gartActInteract;
  gartActInteract = function () { const C = _gdt.cur; if (C && C.phase !== 'inside') return true; return _gdtE0(); };   // eslint-disable-line no-func-assign
}
if (typeof gartActFrame === 'function') {
  const _gdtFrame0 = gartActFrame;
  gartActFrame = function () {   // eslint-disable-line no-func-assign
    try { _gdtFrame(performance.now()); } catch (e) { console.error('[garden depth] tunnel', e); try { _gdtAbort(); } catch (e2) { _gdt.cur = null; } }
    return _gdtFrame0();
  };
}
/* ---------- the place kept for next time, leaving the garden, your pet ---------- */
if (typeof _gwSaveSoon === 'function') {   // (the place kept is the mouth you went in by, never inside the hill)
  const _gdtSave0 = _gwSaveSoon;
  _gwSaveSoon = function () {   // eslint-disable-line no-func-assign
    const C = _gdt.cur; if (!C || !C.inBy) return _gdtSave0();
    const x = _gw.px, y = _gw.py, m = C.inBy; _gw.px = m.x - m.fx * 0.08; _gw.py = m.y - m.fy * 0.08; try { return _gdtSave0(); } finally { _gw.px = x; _gw.py = y; }
  };
}
if (typeof gardenWorldStop === 'function') {
  const _gdtStop0 = gardenWorldStop;
  gardenWorldStop = function (keepOn) { if (!keepOn && _gdt.cur) { try { _gdtAbort(); } catch (e) { _gdt.cur = null; } } return _gdtStop0(keepOn); };   // eslint-disable-line no-func-assign
}
if (typeof gardenLifePetGoal === 'function') {   // (your pet waits by the mouth you went in by, and is there when you come out of it)
  const _gdtPet0 = gardenLifePetGoal;
  gardenLifePetGoal = function (P, dt) {   // eslint-disable-line no-func-assign
    const C = _gdt.cur;
    if (C && P && typeof _gw !== 'undefined' && P === _gw.pet) { const m = C.inBy, side = m.fx ? 0 : 0.85; return { x: m.x - m.fx * 0.7 + side, y: m.y - m.fy * 0.6 + 0.25, near: 0.6 }; }
    return _gdtPet0(P, dt);
  };
}
/* ---------- friends ---------- */
/** Telling friends where you are: when someone new arrives (1.5 s and 5 s later) and every 6 s while you are underground; out in the
 *  daylight again, said three times. Each is the same state, so one more changes nothing. */
function _gdtRetell(now) {
  if (typeof _gll === 'undefined' || !_gll.actors || !_gll.actors.size) return;
  const sig = [..._gll.actors.keys()].join(',');
  if (sig !== _gdt.seen) { const added = sig.split(',').some(k => k && !_gdt.seen.split(',').includes(k)); _gdt.seen = sig; if (added) _gdt.tellAt = [now + 1500, now + 5000]; }
  const due = (_gdt.tellAt && _gdt.tellAt.length && now >= _gdt.tellAt[0]) || now - _gdt.toldT > GDT.tellMs;
  if (!due) return;
  if (_gdt.tellAt && _gdt.tellAt.length && now >= _gdt.tellAt[0]) _gdt.tellAt.shift();
  _gdt.toldT = now;
  _gaTell('intunnel', _gw.px, _gw.py);
}
/** Out again: 'onground' told a few times (the height file's word for "on the ground, here"), so every copy of you comes up. */
function _gdtGroundTell(now) {
  const G = _gdt.groundAt; if (!G || !G.length || now < G[0]) return; G.shift();
  if (_gdt.cur) { _gdt.groundAt = null; return; }
  try { if (typeof _gll !== 'undefined' && _gll.actors && _gll.actors.size) _gaTell('onground', _gw.px, _gw.py); } catch (e) { /* alone */ }
}
/** The tunnel and mouth a friend's message speaks of: the mouth whose threshold is nearest (x, y), within 1.6 cells. */
function _gdtMouthNear(x, y) {
  let best = null, bd = 1.6;
  for (const T of gardenTunnels()) for (const m of T.mouths) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = { T, m }; } }
  return best;
}
/** The tunnel whose floor takes in (x, y) (a friend inside it). */
function _gdtTunnelAt(x, y) {
  const W = _gdtW(), px = x * W.cellW, py = W.sky + y * W.cellH;
  for (const T of gardenTunnels()) if (gardenTunnelFree(T, px, py, -10, null)) return T;
  return null;
}
/** Their copy, told they went in at (ev.x, ev.y): walks to the threshold if it is not there, then down into the mouth, fading. */
function _gdtRemoteIn(A, ev) {
  const hit = _gdtMouthNear(ev.x, ev.y); if (!hit) return;
  const start = () => { A.dpGo = { kind: 'in', T: hit.T, m: hit.m, t0: performance.now(), from: { x: A.x, y: A.y } }; A.tx = null; A.ty = null; A.way = null; };
  if (Math.hypot(A.x - hit.m.x, A.y - hit.m.y) > 6 || A.dpT) { A.x = hit.m.x; A.y = hit.m.y; start(); }
  else if (Math.hypot(A.x - hit.m.x, A.y - hit.m.y) > 0.15 && typeof _gllWalkVia === 'function') { _gllWalkVia(A, null, hit.m.x, hit.m.y); A.then = start; }
  else start();
}
/** Their copy, told they came out at (ev.x, ev.y): seen climbing up out of that mouth, into the daylight. */
function _gdtRemoteOut(A, ev) {
  const hit = _gdtMouthNear(ev.x, ev.y); if (!hit) { _gdtRemoteGround(A); return; }
  A.dpGo = { kind: 'out', T: hit.T, m: hit.m, t0: performance.now(), from: { x: hit.m.ix, y: hit.m.iy } }; A.tx = null; A.ty = null; A.way = null; A.then = null;
  A.x = hit.m.ix; A.y = hit.m.iy;
}
/** Their copy, told they are underground at (ev.x, ev.y): put there at once (no walk over the hill). */
function _gdtRemoteInside(A, ev) {
  const T = _gdtTunnelAt(ev.x, ev.y) || (A.dpT && _gdtById(A.dpT)); if (!T) return;
  if (A.dpGo && A.dpGo.kind === 'in') return;   // (on the way in already)
  A.dpGo = null; A.dpT = T.id; A.x = ev.x; A.y = ev.y; A.tx = null; A.ty = null; A.way = null; A.then = null; A.key = '';
}
function _gdtRemoteGround(A) { if (A.dpT || A.dpGo) { A.dpT = null; A.dpGo = null; try { if (typeof gardenTunnelStageRelease === 'function') gardenTunnelStageRelease(A.root, false); } catch (e) { /* gone */ } _gdtFriendLook(A, true, false); } }
/** How their copy is drawn: whole (outside, or in the same tunnel as you, in its light), or hidden under the hill with a faint glow where
 *  they walk (they are underground and you are not, or in another tunnel). */
function _gdtFriendLook(A, seen, glow) {
  try {
    const a = seen ? 1 : 0;
    if (A.root && typeof _ghtAlpha === 'function') _ghtAlpha(A.root, a);
    if (A.spr) A.spr.label = seen ? A.n : (A.n + ' is in ' + ((A.dpT && _gdtById(A.dpT)) || { name: 'a tunnel' }).name);
    if (typeof gardenTunnelGlow === 'function') gardenTunnelGlow(A, glow);
  } catch (e) { /* drawn as it is */ }
}
/** Each step of their copy: the walk in or out, and where they are drawn while underground. */
function _gdtRemoteStep(A) {
  const G = A.dpGo, now = performance.now(), C = _gdt.cur, mineIn = C && C.adopted ? C.T.id : '';
  if (G) {
    const k = Math.min(1, (now - G.t0) / GDT.inMs), q = _gdtEase(k), m = G.m;
    A.tx = null; A.ty = null; A.way = null;
    if (G.kind === 'in') {
      A.x = G.from.x + (m.ix + m.fx * 0.32 - G.from.x) * q; A.y = G.from.y + (m.iy + m.fy * 0.32 - G.from.y) * q;
      const inSame = mineIn === G.T.id;
      if (k >= 0.5) { A.dpT = G.T.id; if (inSame && typeof gardenTunnelStageAdopt === 'function') gardenTunnelStageAdopt(A.root); }
      if (k >= 1) { A.dpGo = null; A.moving = false; A.key = ''; }
      const a = k < 0.5 ? Math.max(0, 1 - k / 0.42) : inSame ? Math.min(1, (k - 0.5) / 0.3) : 0;
      if (A.root && typeof _ghtAlpha === 'function') _ghtAlpha(A.root, a);
      if (typeof gardenTunnelGlow === 'function') gardenTunnelGlow(A, k >= 0.5 && !inSame);
      return;
    }
    // out: up the stair into the daylight
    A.x = G.from.x + (m.x - G.from.x) * q; A.y = G.from.y + (m.y - G.from.y) * q;
    const wasSame = mineIn && mineIn === G.T.id;
    if (k >= 0.5 && A.dpT) { A.dpT = null; try { if (typeof gardenTunnelStageRelease === 'function') gardenTunnelStageRelease(A.root, false); } catch (e) { /* gone */ } }
    const a = k < 0.5 ? (wasSame ? Math.max(0, 1 - k / 0.42) : 0) : Math.min(1, (k - 0.5) / 0.3);
    if (A.root && typeof _ghtAlpha === 'function') _ghtAlpha(A.root, a);
    if (typeof gardenTunnelGlow === 'function') gardenTunnelGlow(A, false);
    if (k >= 1) { A.dpGo = null; A.moving = false; A.key = ''; _gdtFriendLook(A, true, false); }
    return;
  }
  if (A.dpT) {
    const same = mineIn === A.dpT;
    if (same) { if (typeof gardenTunnelStageAdopt === 'function') gardenTunnelStageAdopt(A.root); _gdtFriendLook(A, true, false); }
    else { try { if (typeof gardenTunnelStageRelease === 'function') gardenTunnelStageRelease(A.root, false); } catch (e) { /* gone */ } _gdtFriendLook(A, false, true); }
  }
}
if (typeof _gllEmoteAt === 'function') {
  const _gdtEmAt0 = _gllEmoteAt;
  _gllEmoteAt = function (A, ev) {   // eslint-disable-line no-func-assign
    const e = ev && String(ev.e);
    if (A && (e === GA_WIRE + 'tunnelin' || e === GA_WIRE + 'tunnelout' || e === GA_WIRE + 'intunnel')) {   // (before the whole-state rule: these are not moves of the act table)
      if (!Number.isFinite(ev.x) || !Number.isFinite(ev.y)) return;
      try { if (e === GA_WIRE + 'tunnelin') _gdtRemoteIn(A, ev); else if (e === GA_WIRE + 'tunnelout') _gdtRemoteOut(A, ev); else _gdtRemoteInside(A, ev); } catch (er) { console.error('[garden depth] friend', er); }
      return;
    }
    if (A && e === GA_WIRE + 'onground' && (A.dpT || A.dpGo) && !(A.dpGo && A.dpGo.kind === 'out')) { _gdtRemoteGround(A); }
    return _gdtEmAt0(A, ev);
  };
}
if (typeof _gllStep === 'function') {
  const _gdtStep0 = _gllStep;
  _gllStep = function (A, dt, quiet) {   // eslint-disable-line no-func-assign
    if (A && !A.me) {
      // a visit: the host's own garden snapshot says they are underground (a friend who arrives while you are in a tunnel)
      try { if (A.w === 0 && typeof _glv !== 'undefined' && _glv.snap && _glv.snap.pw !== A._gdtPw) { const pw = _glv.snap.pw; A._gdtPw = pw; if (Array.isArray(pw) && pw[0] === 't' && !A.dpT && !A.dpGo) { const T = _gdtById(pw[1]); if (T) { A.dpT = T.id; const c = T.ells.find(q => q.i === pw[2]) || T.ells[0]; if (c && !_gdtTunnelAt(A.x, A.y)) { A.x = c.cx; A.y = c.cy; } } } } } catch (e) { /* as before */ }
      if (A.dpGo || A.dpT) { try { _gdtRemoteStep(A); } catch (e) { A.dpGo = null; } }
    }
    return _gdtStep0(A, dt, quiet);
  };
}
if (typeof _glhWalk === 'function') {   // (the host routes a guest's walk: underground, along the tunnel's own floor, never refused for the land above)
  const _gdtHostWalk0 = _glhWalk;
  _glhWalk = function (A, ev) {   // eslint-disable-line no-func-assign
    if (A && A.dpT && Number.isFinite(ev.x) && Number.isFinite(ev.y)) {
      const T = _gdtById(A.dpT); let turns = null;
      try { if (T) { const way = _gdtRoute(T, { x: A.x, y: A.y }, { x: ev.x, y: ev.y }); if (way && way.length > 1) turns = way.slice(0, -1).slice(0, 12).map(p => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]); } } catch (e) { turns = null; }
      _gllWalkVia(A, turns, ev.x, ev.y);
      if (_gll.actors.size > 1) _glhSend('all', 'go', { w: ev.w, x: ev.x, y: ev.y, ...(turns ? { r: turns } : {}), ...(Number.isInteger(ev.h) ? { h: ev.h } : {}) });
      return;
    }
    return _gdtHostWalk0(A, ev);
  };
}
/* A friend's figure taken into your tunnel's drawing stays there, whatever row its feet are in (the world's own placing would put it back
   among the things of the world above). */
if (typeof gardenRowPlace === 'function') {
  const _gdtPlace0 = gardenRowPlace;
  gardenRowPlace = function (layer, node, z) {   // eslint-disable-line no-func-assign
    if (node && node._gdtIn) { try { node.target.setDepth(GARDEN_WORLD.sky + z * GARDEN_WORLD.cellH); if (typeof gardenTunnelStageSorted === 'function') gardenTunnelStageSorted(); } catch (e) { /* drawn as it is */ } return; }
    return _gdtPlace0(layer, node, z);
  };
}
/* Every frame, outside too: the word that you are back out. */
if (typeof gartActFrame === 'function') {
  const _gdtFrameG0 = gartActFrame;
  gartActFrame = function () { try { _gdtGroundTell(performance.now()); } catch (e) { /* alone */ } return _gdtFrameG0(); };   // eslint-disable-line no-func-assign
}

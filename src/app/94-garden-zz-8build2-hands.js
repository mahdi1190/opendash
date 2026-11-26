/* ============================================================
   BUILD 2: YOUR HANDS, Animal Crossing's way. The owner, 20 Nov 2026: "pick up items, place them down and really customise and
   build your garden ... in a game way not a designer way".

   Hold something from your pockets (a decoration, seeds, compost, a plant lifted whole) or pick up something that stands in the
   garden: a soft square glows on the ground in front of your feet where it will go, green when it fits and soft red when it does
   not (the prompt says why, in a line). E (or Space, or a click on the square) puts it down, R turns it, X puts it back (a thing
   you picked up from the garden goes into your pockets), Esc changes your mind. A spot that is nearly right slides up to two
   squares to the nearest one that fits. Clicking a free spot walks you over and puts it there.

     gardenB2Hold(item)        hold a thing from your pockets ('decor:bench', 'seed:rose', 'fertiliser')
     gardenB2HoldRec(e, s)     hold a whole thing kept in a pocket ({ u, m }: a plant in its pot, a decoration kept whole)
     gardenB2PickUp(uid)       pick up a decoration that stands in the garden (yours, or your friend's when you play together)
     gardenB2HoldThing(H)      hold anything else the building tools make (94-garden-zz-8build2-land.js: a sign you made, a bench
                               of the vale moved with the stakes): H { k, fw, fh, name, ... }
     gardenB2Put()             put it down where the square is (E)        gardenB2Turn()   R
     gardenB2HandsBack()       X: back into your pockets (94-garden-zz-8build2-ring.js gardenB2PutBack calls it)
     gardenB2HandsEsc()        Esc: nothing changes, your hands are empty
     gardenB2LiftWhole(uid)    the spade on your own plant: it comes up whole, roots and all, growth kept, into your pockets

   Where the square goes is read from the walking and placing data only (_gdPlaceOk: the layout's own areas, what stands there, what
   blocks walking; rule 17): no named place anywhere. Speed: one small hook runs each frame while something is held, and only moves
   numbers; the placing check runs when the square moves to another cell (at most about ten times a second), and the ghost is drawn
   once per thing held (a turn draws it again). Nothing runs while your hands are empty.
   ============================================================ */
const _gb2h = { held: null, sim: null, sq: null, sqOk: null, sqBad: null, door: null, pcx: -1e9, pcy: -1e9, dir: -1, dirty: true, chkT: 0, x: 0, y: 0, why: '', snapped: false, none: false, plantUid: '', gkey: null, gart: '', hideT: 0, at: null };

function gardenB2Holding() { return !!_gb2h.held; }
function gardenB2Held() { return _gb2h.held; }
/** The pocket item in your hands, or '' (a thing picked up from the garden is not in your pockets until you put it there). */
function gardenB2HeldItem() { const H = _gb2h.held; return H && H.item ? H.item : ''; }
function _gb2hThe(name) { return typeof _gdPutName === 'function' ? _gdPutName({ name }) : 'the ' + String(name || 'that').toLowerCase(); }
function _gb2hSay(text, o) { try { gardenMessage(text, Object.assign({ icon: 'hand', ms: 6000 }, o || {})); } catch (e) { /* quiet */ } }
function _gb2hDeny(text) {
  let at = null;
  try { const A = _gb2h, H = A.held, box = _ghBox(), p = H && _ghProject(A.x + H.fw / 2, A.y), r = box && box.getBoundingClientRect(); if (p && r) at = { x: r.left + p.x, y: r.top + p.y }; } catch (e) { at = null; }
  try { gameDeny(null, { at, say: String(text || 'Not there.').replace(/\.?$/, '.') }); } catch (e) { /* quiet */ }
}
function _gb2hFirst(key, text) { try { const g = _gdG(); if (g.seen['b2.hd.' + key]) return; g.seen['b2.hd.' + key] = _gdToday(); _gb2Save(); _gb2hSay(text, { ms: 9000 }); } catch (e) { /* said next time */ } }

/* ---------- holding ---------- */
/** Start holding H (it replaces whatever was in your hands; a thing picked up from the garden goes back where it stood). */
function gardenB2HoldThing(H) {
  if (!H || typeof _gw === 'undefined' || !_gw.on) return false;
  if (typeof _ga !== 'undefined' && _ga.carry) { _gb2hDeny('Set down what you are carrying first'); return false; }
  if (_gb2h.held) _gb2hEnd(true);
  try { if (typeof _gh !== 'undefined' && _gh.bag) { _gh.bag = false; _ghBag(); } gardenBubbleClose(); } catch (e) { /* no panel */ }
  try { if (typeof _gdp !== 'undefined') { if (_gdp.moving && typeof gardenMoveEnd === 'function') gardenMoveEnd(); _gdp.seed = ''; _gdp.decor = ''; if (_gdpTool() !== 'hand') _gdpPickTool('hand'); } } catch (e) { /* no page */ }
  if (typeof _gb2 !== 'undefined') _gb2.tool = 'hands';
  H.fw = Math.max(1, H.fw || 1); H.fh = Math.max(1, H.fh || 1); H.r = (Number(H.r) || 0) & 3;
  Object.assign(_gb2h, { held: H, dirty: true, pcx: -1e9, gkey: null, gart: '', none: false, at: null, aimed: false });
  if (!_gb2h.sim) _gb2h.sim = gardenWorldAdd({ id: 'gb2-hands', simulationOnly: true, x: 0, y: 0, update: () => _gb2hTick() });
  if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop();
  _gb2hRing();
  try { gardenSfx('tab'); } catch (e) { /* quiet */ }
  return true;
}
function gardenB2Hold(item) {
  const k = String(item || ''), i = k.indexOf(':'), kind = i < 0 ? k : k.slice(0, i), id = i < 0 ? '' : k.slice(i + 1);
  if (kind === 'decor') {
    const def = gardenDecor(id); if (!def) return false;
    if (!gardenB2HoldThing({ k: 'decor', item: k, id, def, fw: def.w || 1, fh: def.h || 1, r: 0, name: def.name })) return false;
    _gb2hFirst('decor', `The ${def.name.toLowerCase()} is in your hands. The square in front of your feet shows where it will go: E puts it down${def.rot ? ', R turns it' : ''}, X puts it back in your pockets. Or click a free spot.`);
    return true;
  }
  if (kind === 'seed') {
    const def = gardenPlant(id); if (!def) return false;
    if (!gardenB2HoldThing({ k: 'seed', item: k, id, def, fw: def.fp || 1, fh: def.fp || 1, name: def.name })) return false;
    _gb2hFirst('seed', 'Seeds in your hand. Face a bed (or anywhere this seed can grow) and press E to plant one, then walk on and plant the next. X puts them back.');
    return true;
  }
  if (k === 'fertiliser') {
    if (!gardenB2HoldThing({ k: 'feed', item: k, fw: 1, fh: 1, name: 'Compost' })) return false;
    _gb2hFirst('feed', 'Compost in your hand. Face a plant and press E to give it half a day of growth. X puts it back.');
    return true;
  }
  return false;
}
/** A whole thing kept in a pocket (a plant in its pot, a decoration kept with its look): hold it to put it out again. */
function gardenB2HoldRec(e, s) {
  if (!e || !e.u) return false;
  const kind = e.m === 'plants' ? 'plant' : 'decor', it = gardenPlacementItem(gardenModel(), kind, e.u);
  if (!it || !it.packed) return false;
  const fw = kind === 'plant' ? it.def.fp || 1 : it.def.w || 1, fh = kind === 'plant' ? it.def.fp || 1 : it.def.h || 1;
  if (!gardenB2HoldThing({ k: 'move', m: e.m === 'plants' ? 'plants' : 'decor', uid: e.u, id: it.def.id, def: it.def, fw, fh, r: it.r || 0, v: it.v || 0, stage: it.stage || 1, variant: it.variant || 0, packed: true, pk: s, name: it.def.name })) return false;
  _gb2hFirst('rec', kind === 'plant' ? 'Your plant in its pot. Face a good spot and press E to plant it again: it keeps its growth.' : 'Face open ground and press E to put it out again, just as it was.');
  return true;
}
/** Pick up a decoration that stands in the garden: it follows the square in front of you until you put it down. */
function gardenB2PickUp(uid) {
  let m = null; try { m = gardenHere(); } catch (e) { return false; }
  const d = m && gardenDecorById(m, uid); if (!d || d.pend) return false;
  if (m.visit && typeof gardenVisitMayMove === 'function' && !gardenVisitMayMove(uid)) return false;
  if (!gardenB2HoldThing({ k: 'move', m: 'decor', uid, id: d.def.id, def: d.def, fw: d.def.w || 1, fh: d.def.h || 1, r: d.r || 0, v: d.v || 0, placed: true, ox: d.x, oy: d.y, name: d.def.name, visit: !!m.visit })) return false;
  _gb2hFirst('pick', `You picked up the ${d.def.name.toLowerCase()}. Walk to where it should go and press E${d.def.rot ? ' (R turns it)' : ''}. X puts it in your pockets, Esc leaves it where it was.`);
  return true;
}

/* ---------- the square in front of your feet ---------- */
/** Where a w x h thing goes when you face dir (0 east, 1 towards you, 2 west, 3 away), beside your feet, never under them. */
function _gb2hAim(fw, fh, pcx, pcy, dir) {
  if (dir === 0) return [pcx + 1, pcy - fh + 1];
  if (dir === 2) return [pcx - fw, pcy - fh + 1];
  const x = pcx - ((fw - 1) >> 1);
  return dir === 1 ? [x, pcy + 1] : [x, pcy - fh];
}
function _gb2hWhy(H, x, y, m) {
  const W = GARDEN_WORLD;
  if (x < 0 || y < 0 || x + H.fw > W.cols || y + H.fh > W.rows) return 'That is off the edge of the garden';
  if (H.k === 'decor') return _gdPlaceOk(m, H.def, x, y, 'decor');
  if (H.k === 'seed') return _gdPlaceOk(m, H.def, x, y, 'plant');
  if (H.k === 'move') { const why = _gdPlaceOk(m, H.def, x, y, H.m === 'plants' ? 'plant' : 'decor', H.uid); return why || (H.placed && x === H.ox && y === H.oy ? 'It is there already' : ''); }
  if (typeof H.why === 'function') return H.why(x, y, m) || '';
  return '';
}
/** The square itself and the spot it lands on now (a slide of up to two squares when the spot ahead is nearly right). */
function _gb2hAimNow() {
  const A = _gb2h, H = A.held; if (!H) return;
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  const pcx = Math.floor(_gw.px), pcy = Math.floor(_gw.py);
  A.snapped = false; A.none = false; A.plantUid = '';
  if (H.k === 'feed') {   // compost: the plant in front of you
    const c = typeof gartMoveFacingDeg === 'function' ? gartMoveFacingDeg() * Math.PI / 180 : Math.PI / 2, fx = _gw.px + Math.cos(c) * 0.9, fy = _gw.py + Math.sin(c) * 0.7;
    let best = null, bd = 1.6;
    for (const p of m.plants) { const d = Math.hypot(p.x + p.fp / 2 - fx, (p.y + p.fp - 0.5 - fy) * 1.2); if (d < bd) { bd = d; best = p; } }
    if (!best) { A.none = true; A.why = ''; _gb2hDraw(); return; }
    A.x = best.x; A.y = best.y; H.fw = H.fh = best.fp || 1; A.plantUid = best.uid; A.aimed = true;
    const pl = _gdG().plants[best.uid];
    A.why = best.def.special === 'heart' ? 'The old oak grows with your work, not with compost' : gardenHas('fertiliser') < 1 ? 'You have no compost left' : pl && pl.f && _gdDayOf(pl.f) === m.today ? 'It was fed today already' : best.stage >= 4 && !best.def.yield ? 'It is fully grown: save the compost for something younger' : '';
    _gb2hDraw(); return;
  }
  const [x0, y0] = A.at ? [A.at.x, A.at.y] : _gb2hAim(H.fw, H.fh, pcx, pcy, A.dir);
  let why = _gb2hWhy(H, x0, y0, m), x = x0, y = y0;
  if (why && !A.at && !H.noSnap) {
    found: for (let r = 1; r <= GDZ_SNAP_R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const qx = x0 + dx, qy = y0 + dy;
      if (pcx >= qx && pcx < qx + H.fw && pcy >= qy && pcy < qy + H.fh) continue;   // (never under your own feet)
      if (!_gb2hWhy(H, qx, qy, m)) { x = qx; y = qy; why = ''; A.snapped = true; break found; }
    }
  }
  A.x = x; A.y = y; A.why = why; A.aimed = true;
  _gb2hDraw();
}
const GDZ_SNAP_R = 2;   // squares: how far a nearly-right spot slides to one that fits (GDZ_STRICT.snap, the designer's own number)
/** The way you face, in four: 0 east, 1 towards you, 2 west, 3 away (the walker's heading, any angle). */
function _gb2hDir() { const deg = typeof gartMoveFacingDeg === 'function' ? gartMoveFacingDeg() : 90, h = (Number.isFinite(deg) ? deg : 90) * Math.PI / 180, c = Math.cos(h), s = Math.sin(h); return Math.abs(c) >= Math.abs(s) ? (c > 0 ? 0 : 2) : (s > 0 ? 1 : 3); }
/** Once a frame while something is held: only numbers, unless the square moves to another cell. */
function _gb2hTick() {
  const A = _gb2h, H = A.held;
  if (!H || typeof _gw === 'undefined' || !_gw.on) return;
  const now = performance.now();
  if (now - A.hideT > 300) { A.hideT = now; _gb2hHideSource(true); }
  const dir = _gb2hDir(), pcx = Math.floor(_gw.px), pcy = Math.floor(_gw.py);
  if (pcx === A.pcx && pcy === A.pcy && dir === A.dir && !A.dirty) return;
  if (now - A.chkT < 90) return;   // (at most about ten checks a second: the next frame tries again)
  if (A.at && (pcx !== A.pcx || pcy !== A.pcy)) A.at = null;   // (a spot chosen with the mouse holds until you walk on)
  A.chkT = now; A.pcx = pcx; A.pcy = pcy; A.dir = dir; A.dirty = false;
  _gb2hAimNow();
}
/** The square on the ground (one small group under everything that stands, made once and then only moved) and the ghost of what you hold. */
function _gb2hDraw() {
  const A = _gb2h, H = A.held, W = GARDEN_WORLD;
  let g = A.sq;
  if (!g || !g.isConnected) {
    const host = typeof _gdp !== 'undefined' && _gdp.svg ? _gdp.svg.querySelector('.gd-dz') || _gdp.svg.querySelector('.gd-ui') : null;
    if (!host || typeof gardenSceneElement !== 'function') return;
    g = gardenSceneElement('g'); g.setAttribute('class', 'gb2-target'); g.setAttribute('pointer-events', 'none');
    g.innerHTML = '<rect rx="8" fill="#effbe4" fill-opacity="0.5" stroke="#4fae3c" stroke-width="2.6" stroke-opacity="0.95"/><rect rx="8" fill="#fde4dc" fill-opacity="0.5" stroke="#cf5a48" stroke-width="2.6" stroke-opacity="0.95" opacity="0"/>';
    host.appendChild(g); A.sq = g; A.sqOk = g.firstChild; A.sqBad = g.lastChild;
    const d = gardenSceneElement('g'); d.setAttribute('pointer-events', 'none'); d.innerHTML = '<ellipse rx="11" ry="7" fill="#ffffff" fill-opacity="0.92" stroke="#2fa84f" stroke-width="2.6"/>'; d.setAttribute('opacity', '0'); host.appendChild(d); A.door = d;
  }
  const show = !!H && !A.none, ok = show && !A.why;
  for (const [el, on] of [[A.sqOk, show && ok], [A.sqBad, show && !ok]]) {
    if (!el) continue;
    el.setAttribute('opacity', on ? '1' : '0');
    if (on) { el.setAttribute('x', (A.x * W.cellW + 3).toFixed(1)); el.setAttribute('y', (W.sky + A.y * W.cellH + 3).toFixed(1)); el.setAttribute('width', Math.max(4, H.fw * W.cellW - 6).toFixed(1)); el.setAttribute('height', Math.max(4, H.fh * W.cellH - 6).toFixed(1)); }
  }
  if (A.door) { const dm = show && ok && A.doorAt; A.door.setAttribute('opacity', dm ? '1' : '0'); if (dm) A.door.setAttribute('transform', `translate(${((A.doorAt.x + 0.5) * W.cellW).toFixed(1)} ${(W.sky + (A.doorAt.y + 0.5) * W.cellH).toFixed(1)})`); }
  _gb2hGhost();
}
/** The ghost: the very thing at the square, see-through (the vale's own drawing of it when it already stands somewhere). */
function _gb2hGhost() {
  const A = _gb2h, H = A.held, nw = typeof GardenNative !== 'undefined' && GardenNative.active() && GardenNative.world();
  if (!nw || typeof nw.designPreview !== 'function') return;
  if (!H || A.none || H.k === 'feed') { if (A.gkey) { try { nw.designPreview(null); } catch (e) { /* gone */ } A.gkey = null; } return; }
  if (!A.gkey || A.gkey.H !== H || A.gkey.r !== H.r || A.gkey.v !== H.v) { A.gkey = { H, r: H.r, v: H.v }; A.gart = H.source ? '' : _gb2hArt(H); }
  try {
    const ok = H.source ? nw.designPreview({ key: A.gkey, source: H.source, x: A.x, y: A.y, ox: H.ox, oy: H.oy, valid: !A.why })
      : A.gart ? nw.designPreview({ key: A.gkey, html: A.gart, words: H.words || null, x: A.x, y: A.y, ox: 0, oy: 0, valid: !A.why }) : false;
    if (!ok && H.source) { H.source = ''; A.gkey = null; }   // (its drawing is not on the stage yet: the square alone shows where it goes)
  } catch (e) { A.gkey = null; }
}
/** What a held thing looks like, drawn with its feet where the ghost's anchor is (the middle of the square's first cell, at its foot). */
function _gb2hArt(H) {
  if (typeof H.art === 'function') return H.art() || '';
  const W = GARDEN_WORLD; let m = null; try { m = gardenHere(); } catch (e) { return ''; }
  const plant = H.k === 'seed' || (H.k === 'move' && H.m === 'plants'), def = H.def; if (!def) return '';
  const ground = !plant && def.layer === 'ground';
  const opts = plant ? { kind: 'plant', stage: H.k === 'seed' ? 1 : Math.max(1, H.stage || 1), variant: H.variant || 0, season: m.season, size: 'l', tod: m.tod, t: 0 }
    : { kind: 'decor', season: m.season, variant: H.v || 0, v: H.v || 0, size: 'l', t: 0, tod: m.tod, r: H.r || 0, show: null };
  let frag = ''; try { frag = _gdArt(def.id, opts); } catch (e) { frag = ''; }
  if (!frag) return '';
  const dx = (H.fw / 2 - 0.5) * W.cellW, dy = (H.fh - 1) * W.cellH + (ground ? 4 : 0);
  return `<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) ${ground ? `scale(${(W.cellW / 64).toFixed(3)} ${(W.cellH / 40).toFixed(3)})` : 'scale(0.75)'}">${frag}</g>`;
}
/** A thing picked up from where it stands is not drawn there while you carry it (again after a repaint of the world). */
function _gb2hHideSource(hide) {
  const H = _gb2h.held; if (!H || !H.placed || H.source) return;
  try { const nw = GardenNative.world(), rec = nw && nw.entities && nw.entities.get((H.m === 'plants' ? 'plant:' : 'decor:') + H.uid); if (rec && rec.root && rec.root.setAlpha) { const a = hide ? 0 : 1; if (rec.root.alpha !== a) rec.root.setAlpha(a); } } catch (e) { /* not drawn */ }
}
/** Your hands are empty again: the square and the ghost go, and nothing runs each frame any more. quiet: no word, no sound. */
function _gb2hEnd(quiet) {
  const A = _gb2h, H = A.held;
  if (H && H.placed) _gb2hHideSource(false);
  if (H && typeof H.end === 'function') { try { H.end(); } catch (e) { /* fine */ } }
  A.held = null; A.at = null; A.none = false;
  try { const nw = typeof GardenNative !== 'undefined' && GardenNative.active() && GardenNative.world(); if (nw && A.gkey) nw.designPreview(null); } catch (e) { /* gone */ }
  A.gkey = null; A.gart = '';
  if (A.sim) { try { A.sim.remove(); } catch (e) { /* gone */ } A.sim = null; }
  for (const el of [A.sqOk, A.sqBad, A.door]) if (el) try { el.setAttribute('opacity', '0'); } catch (e) { /* gone */ }
  if (typeof _ga !== 'undefined') { _ga.t = 0; _ga.list = null; }
  _gb2hRing();
  void quiet;
}
function _gb2hRing() { try { if (typeof _gb2RingPaint === 'function') _gb2RingPaint(); if (typeof _gb2GearChanged === 'function') _gb2GearChanged(); } catch (e) { /* no stage */ } }
function gardenB2HandsEmpty() { if (_gb2h.held) _gb2hEnd(true); }

/* ---------- putting it down, turning it, putting it back ---------- */
function _gb2hVerb(H) {
  if (H.k === 'seed') return `Plant ${_gb2hThe(H.def.name)} here`;
  if (H.k === 'feed') { let n = 'it'; try { const p = gardenPlantById(gardenHere(), _gb2h.plantUid); if (p) n = _gb2hThe(p.def.name); } catch (e) { /* it */ } return `Give ${n} compost`; }
  if (H.k === 'move' && H.m === 'plants') return `Plant ${_gb2hThe(H.name)} here`;
  if (H.verb) return H.verb;
  return `Put ${_gb2hThe(H.name)} here`;
}
/** E, Space, or the prompt: put it down at the square. */
function gardenB2Put() {
  const A = _gb2h, H = A.held; if (!H) return false;
  if (!A.at) { A.dir = _gb2hDir(); A.pcx = Math.floor(_gw.px); A.pcy = Math.floor(_gw.py); }
  A.dirty = false; _gb2hAimNow();
  if (A.none) { _gb2hDeny(H.k === 'feed' ? 'Face a plant to give it compost' : 'Turn to face open ground'); return true; }
  if (A.why) { _gb2hDeny(A.why); return true; }
  return _gb2hPutAt(A.x, A.y);
}
function _gb2hPutAt(x, y) {
  const A = _gb2h, H = A.held; if (!H) return false;
  const W = GARDEN_WORLD;
  let r = null;
  try {
    if ((H.k === 'decor' || (H.k === 'move' && H.m === 'decor')) && H.def && H.def.layer !== 'ground' && gardenDecorCol(H.def) === 'full') { const why = _gb2hReachWhy(x, y, H.fw, H.fh); if (why) { _gb2hDeny(why); A.dirty = true; return true; } }   // (a wall of fence or hedge may never shut anyone out)
    if (H.k === 'decor') r = gardenPlaceDecor(H.id, x, y, H.r || 0);
    else if (H.k === 'seed') r = gardenPlantAt(H.id, x, y);
    else if (H.k === 'feed') r = gardenFeed(A.plantUid);
    else if (H.k === 'move') {
      if (H.placed) _gb2hHideSource(false);
      r = H.m === 'plants' ? gardenMovePlant(H.uid, x, y) : gardenMoveDecor(H.uid, x, y);
      if (r && r.ok && H.m === 'decor') { let n = 0; try { const rec = _gdG().decor[H.uid]; n = rec && !H.visit ? ((H.r - (Number(rec.r) || 0)) & 3) : 0; } catch (e) { n = 0; } for (let i = 0; i < n; i++) gardenRotateDecor(H.uid); }
      if (r && r.ok && H.pk != null) _gb2hRecLeft(H.uid);
    } else if (typeof H.put === 'function') r = H.put(x, y);
  } catch (e) { console.error('[garden hands]', e); r = { ok: false, msg: 'That did not work. Try again.' }; }
  if (!r || r.ok === false) { if (H.placed) _gb2hHideSource(true); _gb2hDeny((r && r.msg) || 'Not there'); A.dirty = true; return true; }
  try { gardenSfx('place'); } catch (e) { /* quiet */ }
  try { if (window.GardenNativeActions && H.k !== 'decor' && H.k !== 'move') GardenNativeActions.effect(H.k === 'feed' ? 'plant' : 'place', (x + H.fw / 2) * W.cellW, W.sky + (y + H.fh) * W.cellH - 2, { width: H.fw * W.cellW * 0.65, height: H.fh * W.cellH * 0.3 }); } catch (e) { /* no dust */ }
  // what is left in your hands: more of the same from your pockets (a row of seeds, a run of fence); a thing you carried is down now
  if (H.k === 'decor' || H.k === 'seed' || H.k === 'feed') { A.dirty = true; A.gkey = null; A.at = null; setTimeout(() => { try { if (typeof _gb2HandCheck === 'function') _gb2HandCheck(); } catch (e) { /* fine */ } _gb2hRing(); }, 160); }
  else _gb2hEnd(true);
  return true;
}
/** Would a thing that blocks walking, standing on these squares, cut off land or a door you can reach now? '' or why. (The designer's
 *  reach rule, by the walking grid: the squares it would stand on counted as shut.) Once, when you put it down. */
function _gb2hReachWhy(x, y, w, h) {
  if (typeof _gwBuildGrid !== 'function' || typeof _gb2lFlood !== 'function') return '';
  let m = null; try { m = gardenHere(); } catch (e) { return ''; }
  const W = GARDEN_WORLD, grid = _gwBuildGrid(m), before = _gb2lFlood(grid), st = W.start, g2 = new Uint8Array(grid);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const i = (y + dy) * W.cols + x + dx; if (i >= 0 && i < g2.length) g2[i] = 1; }
  if (g2[st.y * W.cols + st.x]) return 'Keep this spot clear: it is where you come into the garden';
  const after = _gb2lFlood(g2);
  for (const p of gardenPropsNow()) if (p.act && p.door && (!p.needs || gardenWorkOwned(p.needs))) { const k = p.door.y * W.cols + p.door.x; if (before[k] && !after[k]) return 'That would block the way to ' + _gb2hThe(p.name); }
  for (let i = 0; i < after.length; i++) if (before[i] && !after[i] && !g2[i]) { const cx = i % W.cols, cy = (i - cx) / W.cols; return 'That would cut off ' + _gb2lPlaceName(cx, cy) + ': you could not walk there any more'; }
  return '';
}
/** R: a quarter turn (for a thing with a front). */
function gardenB2Turn() {
  const H = _gb2h.held; if (!H) return false;
  const turns = H.k === 'decor' || (H.k === 'move' && H.m === 'decor') ? !!(H.def && H.def.rot) : !!H.turn;
  if (!turns) { _gb2hDeny(`${H.name || 'It'} looks the same every way round`); return true; }
  if (typeof H.turn === 'function') H.turn(); else H.r = ((H.r || 0) + 1) & 3;
  _gb2h.dirty = true; _gb2h.gkey = null; _gb2hAimNow(); _gb2hRing();
  try { gardenSfx('tab'); } catch (e) { /* quiet */ }
  return true;
}
/** X: a thing from your pockets goes back in them; a thing you picked up goes into your pockets (on a friend's visit it stays where
 *  it was); a thing a tool made says for itself (H.back). */
function gardenB2HandsBack() {
  const H = _gb2h.held; if (!H) return false;
  if (typeof H.back === 'function') { const r = H.back(); _gb2hEnd(true); if (r && r.msg) _gb2hSay(r.msg, { icon: 'package', ms: 4000 }); return true; }
  if (H.k === 'move' && H.placed && H.m === 'decor' && !H.visit) {
    _gb2hHideSource(false);
    const r = gardenRemoveDecor(H.uid); _gb2hEnd(true);
    if (r && r.ok) { try { gardenSfx('place'); } catch (e) { /* quiet */ } _gb2hSay(`The ${H.name.toLowerCase()} is in your pockets.`, { icon: 'package', ms: 3500 }); }
    else if (r) _gb2hDeny(r.msg);
    return true;
  }
  _gb2hEnd(true);
  return true;
}
/** Esc: your hands are empty and nothing has changed (a thing you picked up is still where it stood). */
function gardenB2HandsEsc() { if (!_gb2h.held) return false; const H = _gb2h.held; _gb2hEnd(true); if (H.placed) _gb2hSay(`The ${String(H.name || 'thing').toLowerCase()} stays where it was.`, { ms: 2500 }); return true; }
/** A plant or decoration that was kept whole in a pocket is out in the garden now: that pocket is free. */
function _gb2hRecLeft(uid) {
  try { const v = gardenB2View(), slots = v.slots.slice(); let ch = false; slots.forEach((e, s) => { if (e && e.u === uid) { slots[s] = null; ch = true; } }); if (ch) _gb2Write(slots); } catch (e) { /* the next look clears it */ }
}

/* ---------- the mouse: a click while you hold something ---------- */
/** A click on a free spot walks you over and puts it there; a click where it cannot go just walks you there. True: handled. */
function gardenB2Click(it, cell, ev) {
  const A = _gb2h, H = A.held; if (!H || !cell || typeof _gw === 'undefined' || !_gw.on) return false;
  let m = null; try { m = gardenHere(); } catch (e) { return false; }
  const at = ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : null;
  if (H.k === 'feed') {
    const p = it && it.kind === 'plant' ? gardenPlantById(m, it.uid) : _gdpPlantAtCell(m, cell);
    if (!p) { if (!gardenWalkToPoint({ x: cell.x + 0.5, y: cell.y + 0.5 }, null, { radius: 8 })) gameDeny(null, { at, say: 'You cannot get there.' }); return true; }
    if (!gardenWalkAct({ x: p.x + p.fp / 2, y: p.y + p.fp + 0.4 }, () => { const r = gardenFeed(p.uid); if (!r.ok) gameDenyOf(r, null, { at }); else { try { gardenSfx('place'); } catch (e) { /* quiet */ } } }, { face: { x: p.x, y: p.y }, near: 70 })) gameDeny(null, { at, say: 'You cannot get to it.' });
    return true;
  }
  // on the square itself: there; else the click is the middle of where it goes
  const onSq = !A.none && cell.x >= A.x && cell.x < A.x + H.fw && cell.y >= A.y && cell.y < A.y + H.fh;
  const x = onSq ? A.x : cell.x - ((H.fw - 1) >> 1), y = onSq ? A.y : cell.y - H.fh + 1, why = _gb2hWhy(H, x, y, m);
  if (why) { if (onSq) { _gb2hDeny(why); return true; } if (!gardenWalkToPoint({ x: cell.x + 0.5, y: cell.y + 0.5 }, null, { radius: 8 })) gameDeny(null, { at, say: 'You cannot get there.' }); return true; }
  const near = Math.hypot(x + H.fw / 2 - _gw.px, (y + H.fh - 0.5 - _gw.py) * 1.2);
  if (near <= 2.6) { A.at = { x, y }; A.pcx = Math.floor(_gw.px); A.pcy = Math.floor(_gw.py); A.dirty = false; _gb2hAimNow(); return _gb2hPutAt(x, y) || true; }
  const dx = _gw.px - (x + H.fw / 2), dy = _gw.py - (y + H.fh), d = Math.hypot(dx, dy) || 1, stand = { x: x + H.fw / 2 + dx / d * (H.fw / 2 + 0.9), y: y + H.fh - 0.4 + dy / d * (H.fh / 2 + 0.9) };
  if (!gardenWalkAct(stand, () => { if (_gb2h.held !== H) return; A.at = { x, y }; A.pcx = Math.floor(_gw.px); A.pcy = Math.floor(_gw.py); _gb2hAimNow(); if (!A.why) _gb2hPutAt(x, y); else _gb2hDeny(A.why); }, { face: { x, y }, near: 70, radius: 3 })) gameDeny(null, { at, say: 'You cannot get there.' });
  return true;
}

/* ---------- the one prompt ---------- */
/** While you hold something, the prompt is only about it (Tab never offers "Sit on the bench" with a bench in your arms). */
function gardenB2HandRows() {
  const A = _gb2h, H = A.held; if (!H) return null;
  if (!A.aimed && !A.none) return [];   // (the square is not placed yet: no prompt for a moment)
  const words = A.none ? (H.k === 'feed' ? 'Face a plant to give it compost' : 'Turn to face open ground') : A.why ? 'Not here: ' + A.why.charAt(0).toLowerCase() + A.why.slice(1) : _gb2hVerb(H) + (A.snapped ? ' (moved over a little)' : '');
  return [{ key: 'b2put:' + words, act: 'b2-put', b2: () => gardenB2Put(), words, name: '', x: A.x + H.fw / 2, y: A.y + H.fh, src: 'b2put', promptY: A.y - 0.75 }];
}
/** What your hands can do here when they are empty: pick up a decoration of the garden (and, with the spade, lift a plant whole). */
function gardenB2HandPickRows(px, py, rows, tool) {
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  if (!m || m.worldPending || (m.visit && !m.visit.live)) return;
  if (tool === 'hands') for (const d of m.decor) {
    if (d.pend) continue;
    const w = d.def.w || 1, h = d.def.h || 1, fx = d.x + w / 2, fy = d.y + h - 0.2;
    if (Math.abs(fx - px) > w / 2 + GA_REACH || Math.hypot(Math.max(0, Math.abs(fx - px) - w / 2), (fy - py) * 1.3) > 1.7) continue;
    if (m.visit && typeof gardenVisitMayMove === 'function' && !gardenVisitMayMove(d.uid)) continue;
    rows.push({ key: 'b2pick:' + d.uid, act: 'b2-pick', b2: () => gardenB2PickUp(d.uid), words: `Pick up ${_gb2hThe(d.def.name)}`, name: d.def.name, x: Math.max(d.x + 0.3, Math.min(d.x + w - 0.3, px)), y: fy, src: 'b2pick:' + d.uid, promptY: d.y + h - 1.7 });
  }
  if (tool === 'spade' && !m.visit) for (const p of m.plants) {
    if (p.def.special === 'heart') continue;
    const fx = p.x + p.fp / 2, fy = p.y + p.fp - 0.2;
    if (Math.hypot(fx - px, (fy - py) * 1.3) > 1.6) continue;
    const rec = _gdG().plants[p.uid]; if (!rec || rec.by) continue;
    rows.push({ key: 'b2lift:' + p.uid, act: 'b2-lift', b2: () => gardenB2LiftWhole(p.uid), words: `Lift ${_gb2hThe(p.def.name)} whole`, name: p.def.name, x: fx, y: fy, src: 'b2lift:' + p.uid, promptY: p.y + p.fp - 1.9 });
  }
}

/* ---------- the spade: a plant lifted whole ---------- */
/** Your own plant comes up whole (its growth and history kept) and goes into your pockets in a pot; with your pockets full it goes
 *  home to your storage. A friend's plant, the old oak, and a friend's garden: the spade digs as it always did. -> true when handled. */
function gardenB2LiftWhole(uid) {
  let m = null; try { m = gardenHere(); } catch (e) { return false; }
  if (!m || m.visit) return false;
  const p = gardenPlantById(m, uid), rec = _gdG().plants[uid];
  if (!p || !rec || rec.by || p.def.special === 'heart') return false;
  const name = p.def.name.toLowerCase().replace(/^the /, '');
  const r = gardenDo({ o: 'stow', u: uid, m: 'plants' }, { pre: () => _gdLiveTouched(uid), msg: `Lifted the ${name}, roots and all`, label: 'lifting the ' + name, icon: 'shovel' });
  if (!r.ok) { gameDenyOf(r, null); return true; }
  _gdEmit('dig', { uid, id: p.def.id, x: p.x, y: p.y, fp: p.fp });
  let inPk = false; try { const v = gardenB2View(), slots = v.slots.slice(), i = slots.indexOf(null); if (i >= 0) { slots[i] = { u: uid, m: 'plants' }; _gb2Write(slots); inPk = true; } } catch (e) { inPk = false; }
  try { gardenSfx('harvest'); } catch (e) { try { gardenSfx('place'); } catch (e2) { /* quiet */ } }
  _gb2hSay(inPk ? `The ${name} came up whole and is in your pockets in a pot, still growing. Hold it to plant it somewhere else.` : `Your pockets are full, so Perpetua took the ${name} home in its pot. It is in your storage, under Kept whole.`, { icon: 'shovel', ms: 6500 });
  return true;
}

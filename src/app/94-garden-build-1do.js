/* ============================================================
   BUILD YOUR VALE, phase 1 on the page (C:/tmp/r3/design/build-PLAN.md 2.1 and 7): gardenDo, and things you put down stay.

     gardenDo(op, o)        the one entry point for a change to YOUR garden: checks (gardenOpCheck), applies once (gardenOpApply),
                            saves once, offers Undo, and Undo is the op's inverse. o: { msg, label, icon, quiet, pre () -> extra
                            Undo rows already marked (a friend's diary lines), noUndo, inverse (another op to take it back with) }
     gardenOpWorld(m)       this garden now, as the rules file asks for it

   Things you carry (a basket, a log: any layout thing whose KIND has a carry act, rule 17) are saved where you set them down
   (g.dr, one row per thing, so a thing can never be in two places), for everyone: you, your other devices, and every friend in
   the garden. Anyone there can pick one up again; the host's page decides who got it first (one claim wins, once). Who carries
   what is in each person's look (gl:dg i, h). The host tells everyone where things lie with gl:dr, the whole list each time.
     gardenDropAt(key)      where a thing lies now (cells), or null: at its own place in the layout
     gardenCarryWhy(key)    '' when you may pick it up now, else why (somebody else carries it)
     gardenCarryGrab(key)   you pick it up: saved at once at home; asked of the host on a visit
     gardenCarrySet(key, x, y)  you set it down: a saved drop op; on a visit the host applies it
     gardenDropShow()       what every screen draws follows the list: hidden while carried, drawn where it lies
   ============================================================ */
const _gbd = { lay: new Map(), lost: null, hostGrab: new Map(), ask: null, drl: null, held: new Map(), pend: new Map(), from: new Map(), memoKey: null, memo: null, sentSig: '', sentAt: 0, heard: null, showSig: '', thingKey: null, things: null };
const GB_RESEND_MS = 20000;

/* ---------- gardenDo ---------- */
/** The things of this layout that can be carried (by kind, rule 17), at their own places: worked out once per layout and level (the scan is
 *  40 ms when it has to look again, so drawing what lies about never asks it on its own). */
function _gbdThings() {
  if (typeof gardenAffordThings !== 'function' || typeof GARDEN_KINDS === 'undefined') return new Map();
  let id = ''; try { id = gardenIslandData().id + '|' + GARDEN_WORLD.lh + '|' + (gardenModel().areas || []).length; } catch (e) { id = ''; }
  if (_gbd.things && _gbd.thingKey === id && _gbd.things.size) return _gbd.things;
  const list = gardenAffordThings(), map = new Map();
  for (const t of list) { const K = t && t.src === 'thing' && GARDEN_KINDS[t.kind]; if (K && (K.acts || []).some(a => a.carry)) map.set(t.id, { id: t.id, x: t.x, y: t.y, kind: t.kind, art: K.art || '' }); }
  _gbd.thingKey = id; _gbd.things = map;
  return map;
}
function gardenCarryThing(key) { return _gbdThings().get(String(key)) || null; }
function _gbWaterWhy(m, uid, who) {
  const p = gardenPlantById(m, uid); if (!p) return 'Nothing to water there';
  if (!p.def.thirst || p.def.special === 'heart') return p.def.cat === 'water' ? 'It lives in the pond: never thirsty' : 'Its roots go deep: it finds its own water';
  if (m.rain.now) return 'The rain is watering everything for you';
  if (!p.thirsty && (m.now - p.lastWater) / _GD_H < Math.min(8, p.def.thirst / 2)) return 'Already happy: watered not long ago';
  if (!who && m.water.left < 1) return 'The can is empty: it refills tomorrow, and with every task you finish';
  return '';
}
function gardenOpWorld(m) {
  m = m || gardenModel();
  return {
    g: _gdG(), cols: GARDEN_WORLD.cols, rows: GARDEN_WORLD.rows, now: m.now, today: m.today,
    placeOk: (kind, def, x, y, ignore) => _gdPlaceOk(m, def, x, y, kind, ignore),
    has: (item) => gardenHas(item), plant: gardenPlant, decor: gardenDecor, thing: gardenCarryThing,
    free: (x, y) => typeof _gwFree !== 'function' || _gwFree(x, y, 0.15),
    heldBy: (item) => _gbd.held.get(gardenDropKey(item)) || '',
    waterWhy: (uid, who) => _gbWaterWhy(m, uid, who),
    dry: (uid) => { const p = gardenPlantById(m, uid); return p ? p.dry : 0; },
  };
}
function gardenDo(op, o) {
  o = o || {};
  const m = gardenModel(), W = gardenOpWorld(m), who = o.who || '';
  if (o.anyGround) W.free = () => true;   // (where your own feet are: the walker has already said it is ground you stand on)
  if (m.worldPending && (op.o === 'put' || op.o === 'plant')) return _gdNo('The garden update needs to finish before you can place anything');
  const why = gardenOpCheck(W, op, who); if (why) return _gdNo(why);
  if (!op.at) op.at = W.now; if (!op.day) op.day = W.today;
  const g = _gdG(), extra = typeof o.pre === 'function' ? o.pre() || [] : [];
  const mark = [..._gdMark(gardenOpTouches(op, g)), ...extra];
  const res = gardenOpApply(g, op, who, W);
  if (o.noUndo) { if (o.noPaint) _gdSaveQuiet(); else { _gdSave(); gardenTickSoon(); } return { ok: true, msg: o.msg || '', res }; }
  const out = _gdDone(o.msg || '', o.label || 'that', mark, { icon: o.icon, quiet: o.quiet, noPaint: o.noPaint });
  const u = _gd.undo[_gd.undo.length - 1];
  if (u) { u.inv = o.inverse || res.inverse; u.also = extra.map(r => r[0] + '\0' + r[1]); }
  return Object.assign(out, { res });
}
/** Undo of a step made by gardenDo: its inverse op, through the same rules file; the friends' diary rows it also touched go back as they were. */
function _gbdUndoApply(u, g) {
  gardenOpApply(g, u.inv, '', gardenOpWorld());
  const also = new Set(u.also || []);
  for (const [k, id, old] of u.mark.slice().reverse()) { if (!also.has(k + '\0' + id)) continue; if (!g[k]) g[k] = {}; if (old === undefined) delete g[k][id]; else g[k][id] = old; }
  if (u.inv.o === 'drop' || u.inv.o === 'grab') setTimeout(gardenDropChanged, 0);
}

/* ---------- where things lie ---------- */
function _gbdLive() { return typeof _gll !== 'undefined' && _gll.role === 'visit' && typeof _glvLive === 'function' && _glvLive(); }
function _gbdVisit() { return typeof gardenVisitOn === 'function' && gardenVisitOn(); }
/** The rows of what lies about here: [[key, item, x tenths, y tenths]]. Your garden's own, or the garden you are visiting (the host's word). */
function gardenDropList() {
  if (_gbdVisit()) {
    // live, the host's latest word first (gl:dr, heard even before the whole garden has come: a reloaded page waits for its snapshot, and
    // until then an old saved copy said the basket was at home while the host had it elsewhere: critic, 21 Nov); then the snapshot's own
    if (_gbdLive() && _gbd.heard && Array.isArray(_gbd.drl)) return _gbd.drl;
    const s = _gbdLive() && _glv.snap ? _glv.snap : typeof _gdv !== 'undefined' ? _gdv.clean : null;
    // (knocking again after a reload: the host's last word this computer heard, when it is newer than the copy they last shared; the copy
    // drew the basket where the host had set it down before, not where a friend left it since: critic, 21 Nov)
    const R = _glvLive() ? null : _gbdHeardBefore();
    if (R && !(s && Number(s.at) > R.at)) return R.l;
    return s && Array.isArray(s.dr) ? s.dr : [];
  }
  return gardenDropRows(_gdG());
}
/** The host's last word on where things lie, kept on this computer for the garden you visit (a page reloaded during a visit draws them
 *  where they really are while it knocks again). Only a convenience: the host's next word always wins. */
const GB_HEARD_KEY = 'odGardenDropsHeard';
function _gbdHeardKeep(l) {
  try { const fid = typeof _gdv !== 'undefined' ? _gdv.fid : ''; if (!fid) return; const sig = fid + JSON.stringify(l); if (sig === _gbd.keptSig) return; _gbd.keptSig = sig; _gbd.heardBefore = null; localStorage.setItem(GB_HEARD_KEY, JSON.stringify({ fid, at: _gscNow(), l })); } catch (e) { /* no storage: the host says again */ }
}
function _gbdHeardBefore() {
  try {
    const fid = typeof _gdv !== 'undefined' ? _gdv.fid : ''; if (!fid) return null;
    if (_gbd.heardBefore && _gbd.heardBefore.fid === fid) return _gbd.heardBefore.v;
    const o = JSON.parse(localStorage.getItem(GB_HEARD_KEY) || 'null');
    const v = o && o.fid === fid && Number.isFinite(o.at) && _gscNow() - o.at < 3 * 86400000 ? { at: o.at, l: gardenDropClean(o.l) } : null;
    _gbd.heardBefore = { fid, v }; return v;
  } catch (e) { return null; }
}
/** Does this garden say where its things lie (a garden on this version)? An older host's garden: what friends set down is only for the visit. */
function gardenDropKnown() {
  if (!_gbdVisit()) return true;
  if (!_glvLive() && _gbdHeardBefore()) return true;
  if (_gbdLive() && !_glv.snap && !_gbd.heard) return false;   // (live, and nothing heard yet: an old saved copy is not the host's word; drawn when it comes)
  const s = _gbdLive() && _glv.snap ? _glv.snap : typeof _gdv !== 'undefined' ? _gdv.clean : null;
  return !!(s && (Array.isArray(s.dr) || s.drOk)) || !!_gbd.heard;
}
function _gbdMap() {
  const list = gardenDropList(), key = list.length ? list : null;
  if (_gbd.memoKey === key && _gbd.memo && _gbd.memoLen === list.length && _gbd.memoRev === _gd.rev) return _gbd.memo;
  const map = new Map(); for (const r of list) map.set(r[0], { x: r[2] / 10, y: r[3] / 10, i: r[1] });
  _gbd.memoKey = key; _gbd.memo = map; _gbd.memoLen = list.length; _gbd.memoRev = _gd.rev;
  return map;
}
/** Where a thing lies now (cells), or null (at its own place). Your own set-down waiting for the host's word counts first. */
function gardenDropAt(key) {
  const p = _gbd.pend.get(key);
  if (p) return p.home ? null : p;
  return _gbdMap().get(key) || null;
}
/** Who carries it: '@host' the garden's owner, a friend's id, a slot ('w3'), or ''. */
function _gbdHolder(key) {
  if (_ga.carry && _ga.carry.id === key) return '@me';
  if (_gbd.held.has(key)) return _gbd.held.get(key);
  try { for (const A of _gll.actors.values()) if (A.carryId === key) return 'w' + A.w; } catch (e) { /* alone */ }
  return '';
}
function gardenCarryWhy(key) {
  const by = _gbdHolder(key);
  if (!by || by === '@me') return '';
  let who = '';
  try { const A = /^w\d+$/.test(by) ? _gll.actors.get(Number(by.slice(1))) : [..._gll.actors.values()].find(a => a.f === by); if (A && A.n) who = String(A.n).split(/\s+/)[0]; else if (by === '@host' && _gbdVisit() && typeof _gdvFirst === 'function') who = _gdvFirst() || ''; } catch (e) { /* someone */ }
  return who ? `${who} is carrying that.` : 'Someone is carrying that already.';
}
/** E pressed beside a friend who is carrying something (it is in their arms, so no prompt offers it), with nothing nearer to do than
 *  them: who has it, in plain words, or ''. near: the prompt's row, if one is showing (a seat or a stall nearer than the friend wins). */
function gardenCarryHeldNear(near) {
  if (_ga.carry || typeof _gll === 'undefined' || !_gll.actors || !_gll.actors.size || typeof _gw === 'undefined') return '';
  const px = _gw.px, py = _gw.py, nd = near ? Math.hypot(near.x - px, (near.y - py) * 1.3) : Infinity;
  let best = null, bd = Math.min(1.5, nd - 0.15);
  for (const A of _gll.actors.values()) {
    if (!A || A.me || A.rm || !Number.isFinite(A.x) || !Number.isFinite(A.y)) continue;
    let key = A.carryId || '';
    if (!key) for (const [k, by] of _gbd.held) if (by === 'w' + A.w || (A.f && by === A.f)) { key = k; break; }
    if (!key) continue;
    const d = Math.hypot(A.x - px, (A.y - py) * 1.3); if (d < bd) { bd = d; best = { A, key }; }
  }
  if (!best) return '';
  const who = best.A.n ? String(best.A.n).split(/\s+/)[0] : 'Your friend', t = gardenCarryThing(best.key), K = t && GARDEN_KINDS[t.kind];
  const name = K && K.name ? String(K.name).replace(/^the /i, '').toLowerCase() : 'that';
  return `${who} is carrying the ${name}. When they set it down, you can pick it up.`;
}
/** You pick it up. At home: saved at once (it no longer lies anywhere). On a visit: asked of the host, carried at once; if the host says
 *  someone else got it first, it leaves your arms again (gardenCarryRefused). Returns '' or why not. */
function gardenCarryGrab(key) {
  const item = 'thing:' + key, why = gardenCarryWhy(key); if (why) return why;
  _gbd.from.set(key, gardenDropAt(key));
  if (_gbdVisit()) {
    if (!_gbdLive()) return '';   // (a saved copy: only for this visit, as before)
    _gbd.pend.delete(key);
    _glvIntent('grab', { p: key });
    _gbd.ask = { key, at: performance.now() };   // (an answer that never comes: it leaves your arms again, gardenDropTick)
    return '';
  }
  const r = gardenDo({ o: 'grab', i: item }, { noUndo: true, noPaint: true });   // (drawn as a sprite of its own: no repaint of the garden, 30-40 ms)
  if (!r.ok) return r.msg;
  _gbd.held.set(key, '@host');
  gardenDropChanged();
  return '';
}
/** You set it down at x, y (cells). Saved, with Undo (it goes back to where you picked it up). */
function gardenCarrySet(key, x, y) {
  const item = 'thing:' + key, fx = Math.max(0, Math.round(x * 10)), fy = Math.max(0, Math.round(y * 10)), was = _gbd.from.get(key);
  _gbd.from.delete(key);
  if (_gbdVisit()) {
    const t = gardenCarryThing(key), home = t && Math.hypot(t.x - x, t.y - y) <= GB_HOME_NEAR;
    _gbd.pend.set(key, home ? { home: true, at: performance.now() } : { x: fx / 10, y: fy / 10, at: performance.now() });
    if (_gbdLive()) _glvIntent('set', { p: key, fx, fy });
    gardenDropShow(true);
    return '';
  }
  _gbd.held.delete(key);
  const back = was ? { o: 'drop', i: item, fx: Math.round(was.x * 10), fy: Math.round(was.y * 10), rec: null } : { o: 'grab', i: item, rec: null };
  if (was) back.rec = { i: item, x: back.fx, y: back.fy, at: _gdNow() };
  const t = gardenCarryThing(key), name = t && GARDEN_KINDS[t.kind] ? String(GARDEN_KINDS[t.kind].name || 'it').replace(/^the /, '') : 'it';
  const r = gardenDo({ o: 'drop', i: item, fx, fy }, { label: 'setting down the ' + name, quiet: true, inverse: back, anyGround: true, noPaint: true });
  gardenDropChanged();
  return r.ok ? '' : r.msg;
}
/** Where a carried thing can lie near x, y (cells): its whole drawn foot on open ground (the walker's own test, across the kind's width),
 *  and in sight (no roof over it, not behind you), this spot or the nearest within a cell and a half. Null: no room near here. By kind: the width is the kind's. */
function gardenCarryRoom(key, x, y, notMine) {
  if (typeof _gwFree !== 'function') return { x, y };
  const t = gardenCarryThing(key), K = t && GARDEN_KINDS[t.kind], half = Math.max(0.15, ((K && K.w) || 0.5) / 2);
  // and in sight: never where a building's picture stands over it (the walkable strip behind a cottage is under its roof), nor under
  // your own figure; asked of the painted world, by its pictures, so any layout's buildings count (rule 17)
  // (half a cell south of it under a roof too: just over a roof's top line it seemed to sit on the roof)
  const NW = typeof _gw !== 'undefined' && _gw.nativeWorld, cov = (px, py) => !!(NW && typeof NW.covered === 'function' && NW.covered(px, py, 26));
  let hid = false;
  const seen = (px, py) => { const v = !cov(px, py) && !cov(px, py + 0.45) && !(!notMine && Math.abs(px - _gw.px) < 0.3 && py < _gw.py - 0.05 && py > _gw.py - 1.3); if (!v) hid = true; return v; };
  // (and open ground just in front of it: a hedge, a sign or a wall a step south is drawn over its foot, rule 12)
  const ok = (px, py) => _gwFree(px, py, 0.12) && _gwFree(px - half, py, 0.08) && _gwFree(px + half, py, 0.08) && _gwFree(px, py - 0.25, 0.08) && _gwFree(px, py + 0.45, 0.08) && seen(px, py);
  if (ok(x, y)) return { x, y };
  for (let r = 0.2; r <= 1.41; r += 0.2) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.75; if (ok(px, py)) return { x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10 }; }
  return hid ? { hidden: true } : null;
}
/** E pressed just where a thing lay a moment ago, that a friend has just picked up: one plain line, and nothing else happens (the next
 *  thing near you, a stall, a seat, does not open in its place: critic, 21 Nov). -> true when it said so. */
function gardenCarryLost() {
  const L = _gbd.lost; if (!L || _ga.carry) return false;
  if (performance.now() - L.at > 2500 || Math.hypot(_gw.px - L.x, _gw.py - L.y) > 1.6) return false;
  _gbd.lost = null;
  let who = 'Someone';
  try {
    const A = /^w\d+$/.test(L.by) ? _gll.actors.get(Number(L.by.slice(1))) : [..._gll.actors.values()].find(a => a.f === L.by);
    if (A && A.n) who = String(A.n).split(/\s+/)[0]; else if (L.by === '@host' && _gbdVisit() && typeof _gdvFirst === 'function') who = _gdvFirst() || who;
  } catch (e) { /* someone */ }
  try { gardenToast(`${who} picked that up just before you.`, { icon: 'hand' }); } catch (e) { /* fine */ }
  return true;
}
/** Your arms are emptied without a word (you left the garden it belongs to): it stays in that garden, where its host has it. */
function gardenCarryForget() {
  _gbd.ask = null;
  if (!_ga.carry) return;
  const id = _ga.carry.id; _ga.carry = null;
  try { _gaHide.delete(id); _gaCarriedSweep(true); if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* fine */ }
}
/** A pick-up the host has not answered in a few seconds (a dropped line, a host page reloading): it is not in your arms after all. */
function _gbdAskCheck() {
  const a = _gbd.ask; if (!a) return;
  const P = typeof _glv !== 'undefined' && _glv.pending ? [..._glv.pending].find(([, q]) => q && q.t === 'grab' && q.f && q.f.p === a.key) : null;
  if (!P) { _gbd.ask = null; return; }   // (answered, yes or no)
  if (performance.now() - a.at < 6000 && _gbdLive()) return;
  _glv.pending.delete(P[0]); _gbd.ask = null;
  if (_ga.carry && _ga.carry.id === a.key) {
    gardenCarryRefused({ t: 'grab', f: { p: a.key } }, 'quiet');
    try { gardenToast('Your friend’s garden did not answer, so it is still where it was. Try again in a moment.', { icon: 'hand' }); } catch (e) { /* fine */ }
  }
}
/** The host said no (someone else picked it up just before you): it leaves your arms, and says so in plain words. */
function gardenCarryRefused(P, why) {
  const key = P && P.f && P.f.p; if (!key) return;
  if (P.t === 'grab' && _ga.carry && _ga.carry.id === key) {
    _ga.carry = null; _gaHide.delete(key); _gaShow(key, true); _gaCarriedSweep(true); _ga.list = null;
    try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* fine */ }
    let who = 'Someone'; try { const h = _gbdHolder(key), A = /^w\d+$/.test(h) ? _gll.actors.get(Number(h.slice(1))) : null; if (A && A.n) who = String(A.n).split(/\s+/)[0]; } catch (e) { /* someone */ }
    if (why !== 'quiet') try { gardenToast(why === 'held' ? `${who} picked that up just before you.` : 'That could not be picked up just now.', { icon: 'hand' }); } catch (e) { /* fine */ }
  }
  if (P.t === 'set') { _gbd.pend.delete(key); try { gardenToast('That could not be put down there. It is back where it was.', { icon: 'hand' }); } catch (e) { /* fine */ } }
  gardenDropShow(true);
}
/* ---------- drawing what lies about ---------- */
/** Every screen: a thing being carried is not on the ground; a thing that lies somewhere is drawn there (a sprite of the world, sorted by
 *  its foot, with its contact shadow); a thing back at its own place is drawn there by the world itself (one repaint, never while you walk). */
function gardenDropShow(force) {
  if (typeof _gaShow !== 'function') return;
  const now = performance.now();
  for (const [k, p] of _gbd.pend) if (now - p.at > 8000 || (_gbdMap().has(k) ? Math.abs(_gbdMap().get(k).x - p.x) < 0.05 && Math.abs(_gbdMap().get(k).y - p.y) < 0.05 : p.home)) _gbd.pend.delete(k);
  if (!gardenDropKnown()) return;
  const want = [];
  const nowL = performance.now();
  for (const t of _gbdThings().values()) {
    const by = _gbdHolder(t.id), held = !!by, at = gardenDropAt(t.id);
    // where each thing last lay, and when someone else took it from there (E pressed there a moment later says so, gardenCarryLost)
    if (!held) _gbd.lay.set(t.id, at || { x: t.x, y: t.y });
    else if (by === '@me' || (by === '@host' && !_gbdVisit())) _gbd.lay.delete(t.id);   // (in your own arms: nothing lost)
    else if (by !== '@me' && !(by === '@host' && !_gbdVisit()) && _gbd.lay.has(t.id)) { const w = _gbd.lay.get(t.id); _gbd.lay.delete(t.id); _gbd.lost = { id: t.id, x: w.x, y: w.y, by, at: nowL }; }
    want.push(t.id + ':' + (held ? 'h' : at ? Math.round(at.x * 10) + ',' + Math.round(at.y * 10) : _gaRec(t.id) ? 'home' : 'homes'));   // (homes: back at its own place, and the world has no picture of it there yet)
  }
  const sig = want.join('|');
  if (!force && sig === _gbd.showSig) return;
  const was = _gbd.showSig; _gbd.showSig = sig;
  const before = new Map(); for (const row of was ? was.split('|') : []) before.set(row.slice(0, row.lastIndexOf(':')), row.slice(row.lastIndexOf(':') + 1));
  for (const row of want) {
    const id = row.slice(0, row.lastIndexOf(':')), st = row.slice(row.lastIndexOf(':') + 1);
    if (st === 'h') { _gaHide.set(id, Infinity); _gaShow(id, false); const d = _ga.down && _ga.down.get(id); if (d) { try { d.remove(); } catch (e) { /* gone */ } _ga.down.delete(id); } continue; }
    if (_gaHide.get(id) === Infinity) _gaHide.delete(id);
    if (st === 'home') {   // the world's own picture of it, at its own place
      const d = _ga.down && _ga.down.get(id);
      if (d) { try { d.remove(); } catch (e) { /* gone */ } _ga.down.delete(id); }
      _gaShow(id, true);
      continue;
    }
    if (st === 'homes') {
      // back home, and the world was built while it lay elsewhere: drawn there as a sprite of its own (a whole repaint of the world was
      // 20-40 ms on every friend's screen, every time: speed, critic 21 Nov) until the world next draws it itself. Never for a thing that
      // was always at home (out of view, the world simply has not drawn it yet)
      const b = before.get(id), d = _ga.down && _ga.down.get(id), t = _gbdThings().get(id);
      if (t && (d || (b && b !== 'home' && b !== 'homes'))) { if (!d || Math.abs(d.x - t.x) > 0.05 || Math.abs(d.y - t.y) > 0.05) _gaSetDownDraw(id, t.x, t.y); }
      continue;
    }
    const at = gardenDropAt(id); _gaShow(id, false);
    const d = _ga.down && _ga.down.get(id);
    if (!d || Math.abs(d.x - at.x) > 0.05 || Math.abs(d.y - at.y) > 0.05) _gaSetDownDraw(id, at.x, at.y);
  }
  _ga.list = null;
}
/** Something lies somewhere else now: draw it, tell the friends here, and remember it for the fingerprint. */
function gardenDropChanged() {
  _gbd.memo = null;
  gardenDropShow(true);
  gardenDropTell('all');
}
/* ---------- the host ---------- */
function _gbdHosting() { return typeof _gll !== 'undefined' && _gll.role === 'host' && typeof _glh !== 'undefined' && _glh.on && typeof _glhAnyone === 'function' && _glhAnyone(); }
/** gl:dr: where every thing lies, and who carries what, to everyone here (or one friend who has just come in). */
function gardenDropTell(to, force) {
  if (!_gbdHosting()) return;
  const l = gardenDropRows(_gdG()), h = [];
  for (const [k, who] of _gbd.held) { if (who === '@host') h.push([k, 0]); else { for (const A of _gll.actors.values()) if (A.f === who) { h.push([k, A.w]); break; } } }
  const body = { l, h: h.slice(0, 8) }, sig = JSON.stringify(body), now = performance.now();
  if (to === 'all' && !force && sig === _gbd.sentSig && now - _gbd.sentAt < GB_RESEND_MS) return;
  if (to === 'all') { _gbd.sentSig = sig; _gbd.sentAt = now; }
  try { _glhSend(to, 'dr', body); } catch (e) { /* the next tick */ }
}
/** A friend asked to pick something up or set it down (gl:do grab / set). The same rules file as your own. -> '' or why. */
function gardenDropIntent(ev, put) {
  const key = String(ev.p || ''), item = 'thing:' + key, f = ev.f, g = _gdG();
  const W = gardenOpWorld();
  const holder = _gbd.held.get(key) || '';
  if (ev.t === 'grab') {
    if (holder && holder !== f) return 'held';
    if (_ga.carry && _ga.carry.id === key) return 'held';
    const op = { o: 'grab', i: item }, why = gardenOpCheck(W, op, f); if (why) return why === 'Someone is carrying that already' ? 'held' : 'gone';
    const mark = _gdMark(gardenOpTouches(op, g));
    const res = gardenOpApply(g, op, f, W);
    _gbd.held.set(key, f);
    _gbd.hostGrab.set(key, { f, at: performance.now(), inv: res.inverse });   // (until their own look says it is in their arms: gardenDropTick)
    setTimeout(gardenDropChanged, 0);
    return put(mark, { noUndo: true, p: key });
  }
  if (holder && holder !== f) return 'held';
  const op = { o: 'drop', i: item, fx: ev.fx, fy: ev.fy }, why = gardenOpCheck(Object.assign({}, W, { free: () => true }), op, f);   // (their feet were there: their screen checked the ground)
  if (why) return 'gone';
  const mark = _gdMark(gardenOpTouches(op, g));
  gardenOpApply(g, op, f, W);
  _gbd.held.delete(key);
  setTimeout(gardenDropChanged, 0);
  return put(mark, { noUndo: true, p: key, x: Math.min(GARDEN_WORLD.cols - 1, Math.floor(ev.fx / 10)), y: Math.min(GARDEN_WORLD.rows - 1, Math.floor(ev.fy / 10)) });
}
/** A friend left while carrying something: it is set down where they last stood (nothing is ever lost), saved like any set-down. */
function gardenDropLeft(A, only) {
  if (!A || !A.f) return;
  let any = false;
  for (const [key, who] of [..._gbd.held]) {
    if (who !== A.f || (only && key !== only)) continue;
    _gbd.held.delete(key);
    const t = gardenCarryThing(key);
    let x = Number.isFinite(A.x) ? A.x : (t || {}).x, y = Number.isFinite(A.y) ? A.y + 0.1 : (t || {}).y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    // on open ground in sight near where they stood, as your own set-down is; none near: back at its own place
    const r = Number.isFinite(A.x) ? gardenCarryRoom(key, x, y, true) : null;
    if (r && !r.hidden) { x = r.x; y = r.y; } else if (t) { x = t.x; y = t.y; }
    gardenOpApply(_gdG(), { o: 'drop', i: 'thing:' + key, fx: Math.round(x * 10), fy: Math.round(y * 10), at: _gdNow() }, A.f, gardenOpWorld());
    any = true;
  }
  if (any) { _gdSave(); setTimeout(gardenDropChanged, 0); }
}
/** Four times a second (94-garden-live-8sync.js _glyTick, alone too): drawn as the list says; the host's list again when it changed, and now and then anyway (a lost message comes right). */
function gardenDropTick() {
  try {
    // another garden (you went home, or on a visit): what was in your arms stayed in the garden you left (its host set it down where you
    // stood), and nothing from there is remembered here
    const gk = _gbdVisit() ? 'v:' + (typeof _gdv !== 'undefined' ? _gdv.fid || '' : '') : 'home';
    if (_gbd.gk !== gk) {
      if (_gbd.gk != null) gardenCarryForget();
      _gbd.gk = gk; _gbd.lay.clear(); _gbd.lost = null; _gbd.pend.clear(); _gbd.held.clear(); _gbd.hostGrab.clear(); _gbd.from.clear(); _gbd.heard = null; _gbd.drl = null; _gbd.memo = null; _gbd.showSig = '';
    }
    _gbdAskCheck();
    if (_gbdHosting()) {
      for (const [k, who] of [..._gbd.held]) if (who !== '@host' && ![..._gll.actors.values()].some(A => A.f === who)) _gbd.held.delete(k);
      // a friend's pick-up said yes to, that their screen never took (the answer was lost, or their page gave up waiting): after a while it
      // goes back where it lay, so it is never shown in nobody's arms on one screen and in someone's on another
      const nowP = performance.now();
      // and one that was in their arms and is not any more, with no set-down asked for (their page went elsewhere, or gave up): it is set
      // down where they stand, as when someone leaves (nothing is ever lost, and every screen agrees nobody holds it)
      for (const [k, q] of [..._gbd.hostGrab]) {
        const A = [..._gll.actors.values()].find(a => a.f === q.f);
        if (_gbd.held.get(k) !== q.f) { _gbd.hostGrab.delete(k); continue; }
        if (!A) continue;   // (gone: gardenDropLeft)
        if (A.carryId === k) { q.seen = true; q.off = 0; continue; }
        if (q.seen) { if (!q.off) { q.off = nowP; continue; } if (nowP - q.off < 4000) continue; _gbd.hostGrab.delete(k); gardenDropLeft(A, k); continue; }
        if (nowP - q.at < 8000) continue;
        _gbd.hostGrab.delete(k); _gbd.held.delete(k);
        if (q.inv) { gardenOpApply(_gdG(), Object.assign({}, q.inv, { at: _gdNow() }), q.f, gardenOpWorld()); _gdSave(); }
        setTimeout(gardenDropChanged, 0);
      }
      gardenDropTell('all');
    }
    if (typeof _gll === 'undefined' || _gll.role !== 'visit') for (const [k, who] of [..._gbd.held]) if (who === '@host' && !(_ga.carry && _ga.carry.id === k)) _gbd.held.delete(k);   // (your arms are empty: nothing is yours to carry)
    gardenDropShow(false);
  } catch (e) { /* next tick */ }
}
/* ---------- a guest ---------- */
/** gl:dr from the host: the whole list. */
function gardenDropIn(ev) {
  if (!ev || !_gbdLive()) return;
  const l = gardenDropClean(ev.l);
  // kept whether or not the whole garden has come yet (a reloaded page: its snapshot is asked for, 94-garden-live-8sync.js)
  _gbd.drl = l; _gbdHeardKeep(l);
  if (_glv.snap) _glv.snap.dr = l;   // (in place: a new snapshot object would send the world's scan and the visit's model round again, 40 ms, for a list they do not read)
  _gbd.heard = performance.now();
  _gbd.held.clear();
  for (const r of Array.isArray(ev.h) ? ev.h.slice(0, 8) : []) if (Array.isArray(r) && typeof r[0] === 'string' && Number.isInteger(r[1]) && r[1] !== _glv.w) _gbd.held.set(r[0], 'w' + r[1]);
  _gbd.memo = null;
  gardenDropShow(true);
}
/** The whole garden has come from the host (gl:snap): its list of what lies about is the latest word. */
function gardenDropSnapIn(snap) {
  if (!snap || !Array.isArray(snap.dr)) return;
  _gbd.drl = snap.dr; _gbd.heard = performance.now(); _gbd.memo = null; _gbdHeardKeep(snap.dr);
  setTimeout(() => { try { gardenDropShow(true); } catch (e) { /* next tick */ } }, 0);
}
/** The fingerprint of what lies about (gl:sum h3): the same from what the host has and what a guest was told. */
function gardenDropSum(rows) { return gardenHash((rows || []).map(r => r.join(',')).sort().join(';')) >>> 0; }

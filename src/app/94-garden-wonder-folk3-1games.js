/* ============================================================
   GAMES WITH THE VALE'S FOLK, the engine (npcs-PLAN 1.4 and 3.9; the folk3 plan, steps 2 and 5). One engine does the shared parts of
   every game once: the offer, gathering at the start, the countdown, play, the podium, the rewards, what each villager remembers, and
   playing with friends. Each game is one small module (94-garden-wonder-folk3-2race.js, -3seek.js, -4stones.js, -5hunt.js) added with
   valeGameAdd(id, impl).
   HOW A GAME STARTS: Play on a villager's talk card (a picture and a word per game they play here), a villager who comes over to ask
   ("Race you to the sign!": once a day at most each, never during a talk, fishing, a story day's heavy part or another game), the Games
   board (any notice board: E "Games board"), or a friend's figure (Race, Hide and seek...: no villager needed). A friend near the start
   gets E "Join in".
   THE HOST REFEREES (as contests do, 94-garden-live-7contest.js): alone, you are the host. The host's page starts the round, keeps the
   score and says the end (gm|start, gm|state, gm|end, gm|stop: host-only fx). A guest sends only its own moves (gm|act: a flag reached,
   someone found, a throw, a dig), its join and leave, and a request to start one (gm|ask); the host checks each against what it sees.
   Rewards are paid on each person's own computer from the end, inside their own day's caps (games never pay coins):
     friendship +1 with each villager you played with (once a day per villager per game; on a visit at most +1 a villager a day),
     1 XP for each of the day's first three rounds of a game, 2 XP and a material for the day's first win of a game,
     the prize ladders (VALE_PRIZES: placeable things, once ever per step: in your bag, friends see them once put out), the ribbons
     (gardenFacts: Fleet of foot, Seeker, Seven skips, Treasure hunter), and your best on the Games board (friends see it: wd.gb).
   THE FOLK REMEMBER: vgm.<villager> = { g, d, r: 'won' | 'lost' } (you won, or they did), said once next time you talk ("You beat me
   in the race! I've been practising."), and asked about again ("Rematch?").
   Saved (garden.wd, entry by entry): vg.<game>.<villager> (played today), vgv.<villager> (friendship from a visit today), vgd.<game>
   ({d, n}: rounds today), vb.<game> (your best), vr.<game> (your wins), vgp.<game> (rounds played), vgm.<villager>, vgms.<villager> (the
   memory said), vgi.<villager> (asked you today), vgi (the last ask's day and minute).
     valeGameAdd(id, impl)       a game's module
     gardenGameStart(game, o)     start one: o { by: villager who asked, folk: [ids], at: {x, y} }
     gardenGameBusy()             a round is on here (no tellers walk over, folk sent more often)
     gardenGameLeave()            you leave (Esc, the chip's button): no harm done
     gardenGameTalkActs(row, F, S) / gardenGameTalkLines(row, F)   the talk card's Play button and the villager's memory of your last game
     gardenGameActRows(px, py)    the prompt's rows (Join in, Found you!, Dig, the Games board)
     gardenGameFolkTap(id)        a click on someone in the game (true: it was a move)
     gardenGameHeard(A, ev) / gardenGameGuestEvent(ev)   the wire: the host hears a guest; a guest hears the host
     gardenGameFriendButtons(A, close)   a friend's figure menu's games
     gardenGameWire(w)            wd.gb: your records for a friend's Games board
     gardenFolkFacts()            the ribbons' facts
     gardenGameDev(game)          console only: start one now with whoever is about
   ============================================================ */
const _vgm = { impl: new Map(), R: null, G: null, chip: null, dim: null, tickT: 0, sendT: 0, sig: '', inv: null, keys: false, crates: [], lastStart: null, ask: null, msgT: 0 };
function valeGameAdd(id, impl) { _vgm.impl.set(id, impl); }
function _vgOn() { return typeof gardenFolkLive === 'function' && gardenFolkLive(); }
function _vgHostSide() { return typeof _gll === 'undefined' || _gll.role !== 'visit'; }
function _vgFriends() { try { return typeof _gll !== 'undefined' && _gll.role === 'host' && typeof _glh !== 'undefined' && _glh.on && _glhAnyone(); } catch (e) { return false; } }
function _vgMeSlot() { try { return typeof _gll !== 'undefined' && _gll.role === 'visit' ? _glv.w : 0; } catch (e) { return 0; } }
function _vgName(w) {
  if (w === _vgMeSlot()) return 'You';
  try { const A = _gll.actors.get(w); if (A && A.n) return String(A.n).split(/\s+/)[0].slice(0, 16); } catch (e) { /* alone */ }
  return w === 0 ? 'Your host' : 'A friend';
}
function _vgPos(w) {
  if (w === _vgMeSlot()) return typeof _gw !== 'undefined' ? { x: _gw.px, y: _gw.py } : null;
  try { const A = _gll.actors.get(w); return A && Number.isFinite(A.x) ? { x: A.x, y: A.y } : null; } catch (e) { return null; }
}
function _vgFolkName(id) { const r = VALE_FOLK_ROW.get(id); return r ? r.name.replace(/^The /, 'the ') : id; }
function _vgFolkCap(id) { const r = VALE_FOLK_ROW.get(id); return r ? r.name : id; }
function _vgD(a, b) { return Math.hypot(a.x - b.x, (a.y - b.y) * 1.3); }
function gardenGameBusy() { return !!(_vgm.R || (_vgm.G && !_vgm.G.over)); }
function gardenGameFolkBusy(id) { const R = _vgm.R || _vgm.G; return !!(R && !R.over && (R.folk || []).includes(id)); }
/** The kind's own name for a thing ('the sign', 'the well'). */
function _vgKindName(kind) { const K = typeof GARDEN_KINDS !== 'undefined' && GARDEN_KINDS[kind]; return (K && K.name) || 'the ' + String(kind || 'place').replace(/-/g, ' '); }
/** A line for a villager at a moment of a game, picked by the day (the same on every device); {at} filled. */
function vgLine(id, game, moment, at) {
  const L = ((VF3_LINES[id] || {})[game] || {})[moment]; if (!L || !L.length) return '';
  const t = L[(typeof gardenHash === 'function' ? gardenHash('vg|' + _wdToday() + id + game + moment + (_vgm.R ? _vgm.R.i : '')) : 0) % L.length];
  return t.replace('{at}', at || 'over there');
}
/** Who is out and could play now, nearest you first. */
function _vgAbout(max) {
  const out = []; if (typeof _vfr === 'undefined' || !_vfr.on || typeof _gw === 'undefined') return out;
  for (const V of _vfr.list || []) { if (!VALE_GAME_FOLK[V.id] || !gardenFolkFree(V.id, 'game')) continue; const d = Math.hypot(V.x - _gw.px, V.y - _gw.py); if (d <= (max || 30)) out.push({ id: V.id, d }); }
  return out.sort((a, b) => a.d - b.d).map(o => o.id);
}
/** Can this game be played near here now: '' or why not (a game with nothing it needs is never offered). */
function gardenGameCan(game, at) {
  const I = _vgm.impl.get(game); if (!I || !VALE_GAMES[game]) return 'no such game';
  if (!_vgOn()) return 'The folk are not about.';
  try { return I.can ? I.can(at || { x: _gw.px, y: _gw.py }) || '' : ''; } catch (e) { console.error('[vale games]', e); return 'not here'; }
}
/* ---------- starting ---------- */
function _vgNewId() { return 'g' + Math.floor(Math.random() * 2176782336).toString(36) + (++_vgm.seq || (_vgm.seq = 1)).toString(36); }
function gardenGameStart(game, o) {
  o = o || {};
  if (!_vgHostSide()) return _vgAskHost(game, o.by);
  if (_vgm.R) { try { gardenToast('A game is on already.'); } catch (e) { /* fine */ } return false; }
  const G = VALE_GAMES[game], I = _vgm.impl.get(game); if (!G || !I || !_vgOn()) return false;
  const at = o.at || { x: _gw.px, y: _gw.py };
  const why = gardenGameCan(game, at); if (why) { try { gardenToast(why); } catch (e) { /* fine */ } return false; }
  let folk = Array.isArray(o.folk) ? o.folk.filter(id => gardenFolkFree(id, 'game') && valeGamePlays(id, game)) : valeGamePlayers(game, _vgAbout(32), o.by);
  if (folk.length > G.folk[1]) folk = folk.slice(0, G.folk[1]);
  let gid = 'vale'; try { gid = (state && state.garden && state.garden.id) || 'vale'; } catch (e) { gid = 'vale'; }
  _vgm.n = (_vgm.n || 0) + 1;
  const R = _vgm.R = { i: _vgNewId(), game, G, I, host: true, phase: 'gather', t0: performance.now(), pt: performance.now(), at: { x: at.x, y: at.y }, by: o.by || '', folk, helpers: [], people: new Map(), data: {}, sprites: [], seed: gid + '|' + _wdToday() + '|' + game + '|' + _vgm.n, said: 0, over: false, guest: o.guest != null ? o.guest : null };
  if (o.me !== false) R.people.set(_vgMeSlot(), { w: _vgMeSlot(), me: true, score: 0, place: 0, done: false, n: 0 });
  if (o.guest != null) R.people.set(o.guest, { w: o.guest, me: false, score: 0, place: 0, done: false, n: 0 });
  // the villager who asked and is no player (Bramble with his map) stays by the start to see it go
  if (o.by && !folk.includes(o.by) && gardenFolkFree(o.by, 'game')) R.helpers.push(o.by);
  _vgm.lastStart = { game, by: o.by || '', folk: folk.slice() };
  try { if (typeof wdTalkClose === 'function') wdTalkClose(true); } catch (e) { /* none open */ }
  try { I.setup(R, (ok, why2) => { if (_vgm.R !== R) return; if (!ok) { _vgFail(R, why2); return; } R.ready = true; _vgSend(R, 'start'); }); } catch (e) { console.error('[vale games]', e); _vgFail(R, VF3_SAY.noWhere); return false; }
  _vgGatherFolk(R);
  _vgChipPaint(true);
  _vgKeys();
  return true;
}
/** Everyone in the game makes for the start (at a run: they want to play). Each module may give its own places (start lines). */
function _vgGatherFolk(R) {
  const spots = R.I.gather ? R.I.gather(R) : null;
  R.folk.forEach((id, k) => {
    const to = (spots && spots[k]) || _vgBeside(R.at, k + 1);
    gardenFolkDrive(id, { to, gait: 'r', by: 'game', noTalk: true, face: R.at, then: () => { R.inAt = R.inAt || {}; R.inAt[id] = performance.now(); } });
  });
  R.helpers.forEach((id, k) => gardenFolkDrive(id, { to: _vgBeside(R.at, -2 - k), gait: 'w', by: 'game', noTalk: true, face: R.at, pose: '' }));
}
/** A free place a little to one side of a point (k: which: +1 right, -1 left, then wider, a row back), clear of everything drawn. */
function _vgBeside(p, k) {
  const side = k < 0 ? -1 : 1, n = Math.abs(k), dx = side * (0.9 + 0.75 * ((n - 1) % 3)), dy = Math.floor((n - 1) / 3) * 0.7 + 0.15;
  const want = { x: p.x + dx, y: p.y + dy };
  const ok = (x, y) => (typeof _gwFree !== 'function' || _gwFree(x, y)) && (typeof _vfrBodyOk !== 'function' || _vfrBodyOk(x, y, '', true));
  if (ok(want.x, want.y)) return want;
  for (const [ox, oy] of [[0, 0.5], [0, -0.5], [side * 0.6, 0], [side * 1.2, 0.3], [-side * 0.8, 0.6], [0, 1.1], [side * 1.8, 0]]) if (ok(want.x + ox, want.y + oy)) return { x: want.x + ox, y: want.y + oy };
  const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(want.x, want.y, 2.5) : null; return f || want;
}
function _vgFail(R, why) {
  const by = R.by || R.folk[0];
  const line = why || VF3_SAY.noWhere;
  _vgEnd(R, true);
  try { if (by && typeof wdTalk === 'function') wdTalk({ name: _vgFolkCap(by), art: gardenCastSvg(VALE_FOLK_ROW.get(by).cast), lines: [line], actions: [], at: { x: _gw.px, y: _gw.py }, bye: 'All right' }); else gardenToast(line); } catch (e) { /* fine */ }
}
/* ---------- the round, on the host ---------- */
function _vgHostFrame(dt) {
  const R = _vgm.R; if (!R) return;
  const now = performance.now(), secs = (now - R.pt) / 1000;
  R.tickAcc = (R.tickAcc || 0) + dt;
  if (R.phase === 'gather') {
    // the course is found meanwhile (the path service, sliced); folk run to the start; at most the game's own gather time
    const allIn = R.folk.every(id => (R.inAt && R.inAt[id]) || !gardenFolkDriven(id) || (gardenFolkDriven(id).failed));
    if ((R.ready && (allIn || secs > R.G.gather + 4)) || secs > R.G.gather + 8) {   // (a few seconds more for anyone still running there)
      if (!R.ready) { _vgFail(R, VF3_SAY.noWhere); return; }
      // anyone who could not get there is left out (they go back to their day)
      for (const id of R.folk.slice()) if (!(R.inAt && R.inAt[id])) { const D = gardenFolkDriven(id); const V = _vf3V(id); if (!D || !V || Math.hypot(V.x - R.at.x, V.y - R.at.y) > 6) { R.folk.splice(R.folk.indexOf(id), 1); gardenFolkRelease(id, 'game'); } }
      _vgPhase(R, 'ready');
    }
  } else if (R.phase === 'ready') {
    if (R.I.readyTick) { try { R.I.readyTick(R, secs); } catch (e) { console.error('[vale games]', e); } }
    if (secs >= R.G.ready) { _vgPhase(R, 'play'); }
  } else if (R.phase === 'play') {
    if (R.tickAcc >= 0.1) { const t = R.tickAcc; R.tickAcc = 0; try { R.I.tick(R, t, now); } catch (e) { console.error('[vale games]', e); } }
    const capped = secs > R.G.cap;
    if (capped || (R.I.done && R.I.done(R))) _vgResult(R, capped);
  } else if (R.phase === 'result') {
    if (R.tickAcc >= 0.1) { R.tickAcc = 0; if (R.I.after) { try { R.I.after(R, now); } catch (e) { /* fine */ } } }
    if (secs > 14) _vgEnd(R);
  }
  if (now - _vgm.sendT > 5000 || R.dirty) { R.dirty = false; _vgm.sendT = now; _vgSend(R, 'state'); }
  if (now - _vgm.msgT > 250) { _vgm.msgT = now; _vgChipPaint(); }
}
function _vgPhase(R, ph) {
  R.phase = ph; R.pt = performance.now(); R.dirty = true;
  if (ph === 'ready') { try { if (R.I.ready) R.I.ready(R); } catch (e) { console.error('[vale games]', e); } _vgCountdown(R); }
  if (ph === 'play') { R.goT = performance.now(); try { if (R.I.go) R.I.go(R); } catch (e) { console.error('[vale games]', e); } try { gardenSfx('cheer'); } catch (e) { /* quiet */ } }
  _vgChipPaint(true);
}
/** Ready, steady, go: three notes, the last one higher (the starter's word in the chip). */
function _vgCountdown(R) {
  if (R.game !== 'race') return;
  const n = R.G.ready; for (let k = 0; k < n; k++) setTimeout(() => { if (_vgm.R !== R) return; try { wdSound([[k === n - 1 ? 880 : 587, 0.18, 'triangle', 0.05]]); } catch (e) { /* quiet */ } }, k * 1000 + 20);
}
/** The end of play: places, the podium, the rewards (yours here; each friend's on their own computer from gm|end). */
function _vgResult(R, capped) {
  if (R.phase === 'result') return;
  let res = []; try { res = R.I.result(R, capped) || []; } catch (e) { console.error('[vale games]', e); res = []; }
  R.res = res; R.phase = 'result'; R.pt = performance.now(); R.dirty = true;
  const pod = _vgPodium(R, res);
  _vgSend(R, 'end', pod);
  const me = R.people.get(_vgMeSlot());
  if (me && !me.left) _vgReward(R.game, R.folk, res, _vgMeSlot(), false);
  _vgFolkAfter(R, res);
  _vgChipPaint(true);
}
/** After the result the folk react: the winner cheers, the others clap (on the podium when they placed), then they go back to their day. */
function _vgFolkAfter(R, res) {
  const first = res[0];
  for (const id of R.folk) {
    const placed = (R.podium || []).find(p => p.v === id);
    const pose = first && first.v === id ? 'cheer' : first && first.w != null ? 'clap' : 'clap';
    if (placed) gardenFolkDrive(id, { to: placed.stand, gait: 'r', by: 'game', noTalk: true, face: 1, then: () => { const D = gardenFolkDriven(id); if (D) { D.lift = placed.lift; D.z = placed.z; D.pose = pose; D.view = 's'; } } });
    else { const D = gardenFolkDriven(id); if (D) { D.pose = pose; D.to = null; if (_vf3V(id) && _vf3V(id).path) _vf3V(id).path.length = 0; } }
  }
  for (const id of R.helpers) { const D = gardenFolkDriven(id); if (D) D.pose = 'clap'; }
}
function _vgEnd(R, quiet) {
  if (!R || R.over) return;
  R.over = true;
  if (_vgm.R === R) _vgm.R = null;
  try { if (R.I.clear) R.I.clear(R); } catch (e) { console.error('[vale games]', e); }
  for (const S of R.sprites) { try { S.remove(); } catch (e) { /* gone */ } }
  R.sprites.length = 0;
  _vgCratesOff();
  gardenFolkRelease('*', 'game');
  if (R.phase !== 'result' || quiet) _vgSend(R, 'stop');
  _vgDim(false);
  _vgChipPaint(true);
}
function gardenGameLeave() {
  const R = _vgm.R;
  if (R) {
    const me = R.people.get(_vgMeSlot());
    if (R.phase === 'result') { _vgEnd(R); return true; }
    if (me) { me.left = true; me.done = true; R.dirty = true; }
    const anyone = [...R.people.values()].some(p => !p.left);
    if (!anyone) { _vgEnd(R, true); try { gardenToast(VF3_SAY.left); } catch (e) { /* fine */ } }
    else _vgChipPaint(true);
    return true;
  }
  const G = _vgm.G;
  if (G) { try { if (G.joined && !G.over) gardenLiveFx('gm', 'leave', { i: G.i }); } catch (e) { /* alone */ } _vgGuestClear(); return true; }
  return false;
}
/* ---------- the podium: three crates beside the finish, the placed folk on them ---------- */
const VG_CRATE_H = Object.freeze([0.52, 0.38, 0.27]);   // in H: first, second, third
function _vgCrateSvg(k) {
  const H = typeof GARDEN_H === 'number' ? GARDEN_H : 41, h = Math.round(H * VG_CRATE_H[k]), w = 26 - k * 2, x = -w / 2;
  const wood = ['#b8875a', '#9a6c42', '#d8a878', '#6e4a2a'][0], dark = '#7a5232', lite = '#e2b888', num = String(k + 1);
  const ros = ['#e8b830', '#c0c8d0', '#c8803c'][k];
  return `<g class="gvg-crate"><ellipse cx="0" cy="1.2" rx="${w * 0.62}" ry="3.2" fill="#2a2418" opacity=".26"/>`
    + `<path d="M${x - 2} 1.2q${w * 0.3} -2.6 ${w + 4} -0.4" stroke="#5f8a3a" stroke-width="1.4" fill="none" opacity=".7"/>`
    + `<rect x="${x}" y="${-h}" width="${w}" height="${h}" rx="1.4" fill="${wood}"/>`
    + `<rect x="${x}" y="${-h}" width="${w}" height="3" rx="1" fill="${lite}"/>`
    + `<rect x="${x + w - 4}" y="${-h + 2}" width="4" height="${h - 2}" fill="${dark}" opacity=".45"/>`
    + `<path d="M${x + 1.5} ${-h + 4}l${w - 3} ${h - 6}M${x + w - 1.5} ${-h + 4}l${-(w - 3)} ${h - 6}" stroke="${dark}" stroke-width="1.6" opacity=".55"/>`
    + `<path d="M${x} ${-h * 0.5}h${w}" stroke="${dark}" stroke-width="1" opacity=".4"/>`
    + `<circle cx="0" cy="${-h * 0.55}" r="5.2" fill="${ros}"/><circle cx="0" cy="${-h * 0.55}" r="3.4" fill="#fff6dc" opacity=".9"/>`
    + `<text x="0" y="${-h * 0.55 + 2.4}" text-anchor="middle" font-size="6.4" font-weight="700" fill="#4a3420" font-family="Georgia, serif">${num}</text>`
    + `<path d="M${x - 3} 0.8q2 -3.4 4 -0.6M${x + w - 1} 0.8q2 -3 3.6 -0.4" stroke="#6a9a44" stroke-width="1.1" fill="none" opacity=".75"/></g>`;
}
/** Where the podium goes: open, free ground beside the place, three crates side by side (second, first, third), never on a figure,
 *  never in front of or behind anything that stands (its foot, its post: the crates once hid a sign's post), in front first. */
const VG_FLAT_RE = /^(road|plaza|path|field|plot|pond|crossing|ford|bridge|pier|stepping|leaf-pile|ball|log$)/;
function _vgPodiumAt(p, avoid) {
  const C = typeof _vfr !== 'undefined' && _vfr.ctx ? _vfr.ctx : null, things = C ? C.things : (typeof gardenAffordThings === 'function' ? gardenAffordThings() : []);
  const ok = (x, y) => {
    for (const q of avoid || []) if (Math.abs(q.x - x) < 1.8 && q.y - y < 1.3 && y - q.y < 2.4) return false;   // (a flag a little behind the crates stood out of the winner's head)
    for (const k of [-1, 0, 1]) for (const ex of [-0.32, 0, 0.32]) {
      const cx = x + k * 0.62 + ex;
      if (typeof _gwFree === 'function' && !_gwFree(cx, y)) return false;
      if (typeof gardenTerrainAt === 'function' && !/^(open-grass|path|sand|snow)$/.test(gardenTerrainAt(cx, y))) return false;   // (on open ground: never a bed, a building's yard or the water)
      if (typeof _vfpBedAt === 'function' && _vfpBedAt(cx, y)) return false;
    }
    for (const t of things) { if (!t.kind || VG_FLAT_RE.test(t.kind)) continue; const B = C ? C.base(t) : t, hw = (B.w || t.w || 1) / 2 + 1.25; if (Math.abs(B.x - x) < hw && y > B.y - Math.max(1.2, (B.h || 1.2) + 0.4) && y < B.y + 1.1) return false; }
    if (typeof _vfrFigures === 'function' && _vfrFigures().some(F => Math.abs(F.x - x) < 1.6 && F.y - y < 1.0 && y - F.y < 2.4)) return false;   // (nobody just behind it: the folk stood on it cover them)
    return !(typeof gardenTerrainAt === 'function' && /water|deep/.test(gardenTerrainAt(x, y)));
  };
  for (let r = 1.6; r <= 6.2; r += 0.5) for (let a = 0; a < 16; a++) { const t = Math.PI / 2 + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * Math.PI / 8, x = p.x + Math.cos(t) * r, y = p.y + Math.sin(t) * r * 0.6; if (ok(x, y)) return { x, y }; }
  return null;
}
function _vgCratesOff() { for (const S of _vgm.crates) { try { S.remove(); } catch (e) { /* gone */ } } _vgm.crates = []; }
function _vgCratesAt(at) {
  _vgCratesOff(); if (!at || typeof wdSprite !== 'function') return [];
  const out = [];
  [[1, -0.62], [0, 0], [2, 0.62]].forEach(([k, dx]) => {
    const S = wdSprite({ id: 'vg-crate-' + k, x: at.x + dx, y: at.y, hit: 0.3, hitUp: 2, label: ['First', 'Second', 'Third'][k], ground: true, still: true, svg: _vgCrateSvg(k), lift: 0, update() { } });
    _vgm.crates.push(S); out.push({ k, x: at.x + dx, y: at.y, lift: Math.round((typeof GARDEN_H === 'number' ? GARDEN_H : 41) * VG_CRATE_H[k]) - 1, z: at.y + 0.02 });
  });
  return out;
}
function _vgPodium(R, res) {
  R.podium = [];
  if (res.length < 2) return null;   // (a round on your own: no podium to stand alone on)
  const avoid = R.sprites.filter(S => S && Number.isFinite(S.x)).map(S => ({ x: S.x, y: S.y }));   // (the game's own flags and chests)
  const at = _vgPodiumAt(R.I.podium ? R.I.podium(R) : R.at, avoid); if (!at) return null;
  const crates = _vgCratesAt(at); R.podium = [];
  res.slice(0, 3).forEach((r, k) => { const c = crates.find(q => q.k === k); if (c && r.v) R.podium.push({ v: r.v, stand: { x: c.x, y: c.y - 0.01 }, lift: c.lift, z: c.z }); });
  try { gardenSfx('cheer'); } catch (e) { /* quiet */ }
  return at;
}
/* ---------- rewards, records and what the folk remember ---------- */
/** Your own reward for a round (host or guest, each on their own computer). res: places best first [{w | v, score, place}]. */
function _vgReward(game, folk, res, me, visit) {
  const W = _wdG(), today = _wdToday(), G = VALE_GAMES[game], I = _vgm.impl.get(game); if (!G) return;
  const mine = res.find(r => r.w === me); if (!mine) return;
  const won = mine.place === 1 && !mine.tie, said = [];
  // friendship with each villager who played (their keepsake and their story come with it)
  let warm = 0;
  for (const id of folk) {
    const k = 'vg.' + game + '.' + id; if (W[k] === today) continue;
    if (visit) { if (W['vgv.' + id] === today) continue; W['vgv.' + id] = today; }
    W[k] = today; if (typeof _wkAdd === 'function') { _wkAdd(id, 1); warm++; }
    if (typeof _wkHeartUp === 'function') { const L = []; _wkHeartUp(id, VALE_FOLK_ROW.get(id).name, L); if (L.length) said.push(...L); }
    // they remember how it went (you beat them, or they beat you)
    const theirs = res.find(r => r.v === id);
    W['vgm.' + id] = { g: game, d: today, r: theirs && theirs.place < mine.place ? 'lost' : 'won' };
  }
  const d = W['vgd.' + game] && W['vgd.' + game].d === today ? W['vgd.' + game] : { d: today, n: 0 }; d.n++; W['vgd.' + game] = d;
  W['vgp.' + game] = (Number(W['vgp.' + game]) || 0) + 1;
  let xp = 0, mat = '';
  try { if (d.n <= 3 && _grGive('gm.' + game + '.' + d.n, { x: 1 })) xp += 1; } catch (e) { /* not ready */ }
  if (won) {
    W['vr.' + game] = (Number(W['vr.' + game]) || 0) + 1;
    try { if (_grGive('gmw.' + game, { x: 2, [G.mat]: 1 })) { xp += 2; mat = G.matWords; } } catch (e) { /* not ready */ }
  }
  // your best (a race's time, the time to find everyone, the most skips, the time to dig all three)
  const best = I && I.best ? I.best(mine, won) : null;
  let pb = false;
  if (Number.isFinite(best)) { const old = Number(W['vb.' + game]); if (!Number.isFinite(old) || (G.best === 'low' ? best < old : best > old)) { W['vb.' + game] = best; pb = Number.isFinite(old); } }
  // the prize ladder: a placeable thing at each step, once ever
  const n = game === 'stones' ? Number(W['vb.stones']) || 0 : Number(W['vr.' + game]) || 0, prizes = [];
  for (const [step, decor] of valePrizeStep(game, n)) { try { if (typeof gpGrant === 'function' && gpGrant('gm-' + game + '-' + step, { ['decor:' + decor]: 1 })) prizes.push(decor); } catch (e) { /* not ready */ } }
  _wdSave(); try { _gdSave(); } catch (e) { /* the wd save carries it */ }
  // one line that says what you got (plain words; nothing about streaks or counts to come)
  const bits = [];
  if (xp) bits.push('+' + xp + ' XP');
  if (mat) bits.push(mat);
  if (warm) bits.push(folk.length === 1 ? _vgFolkCap(folk[0]) + ' is a little fonder of you' : 'the folk are a little fonder of you');
  if (pb) bits.push('your best yet: ' + valeBestWords(game, best));
  const head = won ? VF3_SAY.first : VF3_SAY.place(mine.place), tail = bits.join(', ');
  try { gardenToast(head + (tail ? ' ' + tail[0].toUpperCase() + tail.slice(1) + '.' : ''), { icon: G.icon }); } catch (e) { /* fine */ }
  for (const id of prizes) { const def = typeof gardenDecor === 'function' ? gardenDecor(id) : null; if (def) setTimeout(() => { try { gardenToast(`A prize: ${def.name}. It is in your bag, to put out where you like.`, { icon: 'gift' }); } catch (e) { /* fine */ } }, 1600); }
  if (said.length) setTimeout(() => { try { wdAmbient(said[0], 7000, 'folk'); } catch (e) { /* quiet */ } }, 2600);
}
/** The talk card's memory of the last game with you: said once, within a week. */
function gardenGameTalkLines(row, F) {
  try {
    const W = _wdG(), m = W['vgm.' + row.id]; if (!m || !m.d || W['vgms.' + row.id] === m.d || _wdDaysBetween(m.d, _wdToday()) > 7) return [];
    const t = vgLine(row.id, m.g, m.r === 'won' ? 'memWon' : 'memLost'); if (!t) return [];
    W['vgms.' + row.id] = m.d; return [t];
  } catch (e) { return []; }
}
/** The talk card's Play: the games this villager plays here, each a button. Not shown when nothing can be played. */
function gardenGameTalkActs(row, F, S) {
  try {
    if (!row || gardenGameBusy() || !VALE_GAME_FOLK[row.id]) return [];
    const games = (VALE_GAME_FOLK[row.id].asks || []).filter(g => _vgm.impl.has(g) && (valeGamePlays(row.id, g) || (VALE_GAME_FOLK[row.id][g] || {}).maker) && !gardenGameCan(g));
    if (!games.length) return [];
    return [{ label: VF3_SAY.play, run: (T) => T.say(VF3_SAY.pick, games.map((g, k) => ({ label: VALE_GAMES[g].word, primary: k === 0, run: () => { wdTalkClose(true); gardenGameStart(g, { by: row.id }); } }))) }];
  } catch (e) { console.error('[vale games]', e); return []; }
}
/* ---------- the folk ask you to play ---------- */
const VG_ASK = Object.freeze({ gap: 9 * 60000, near: 16, still: 4000 });
function _vgAskTick(m) {
  if (m.visit || !_vgOn() || gardenGameBusy() || _vgm.inv || (typeof _wd !== 'undefined' && (_wd.talk || _wd.t < 40))) return;
  if (typeof wdWalkingLately === 'function' && wdWalkingLately()) { _vgm.stillT = performance.now(); return; }
  if (performance.now() - (_vgm.stillT || 0) < VG_ASK.still) return;
  try { if ((typeof _wtHeavyToday === 'function' && _wtHeavyToday()) || (typeof _gwFishBusy === 'function' && _gwFishBusy()) || (typeof gartActBusy === 'function' && gartActBusy()) || (typeof gardenWorldCovered === 'function' && gardenWorldCovered())) return; } catch (e) { return; }
  const W = _wdG(), today = m.today, now = performance.now();
  if (now - (_vgm.askAt || -1e9) < VG_ASK.gap) return;
  if (W.vtl && W.vtl.d === today && !W.vtl.done) { const V = _vf3V(W.vtl.id); if (V && V.visit) return; }   // (someone is on the way over with a story)
  if (W['vgi'] && W['vgi'].d === today && W['vgi'].n >= 2) return;   // (two asks a day at most)
  for (const id of _vgAbout(VG_ASK.near)) {
    const row = VALE_GAME_FOLK[id]; if (!row || !row.asks || W['vgi.' + id] === today) continue;
    if (gardenHash('vgask|' + today + id) % 3 === 0) continue;   // (not every day)
    const game = row.asks.find(g => _vgm.impl.has(g) && !gardenGameCan(g)); if (!game) continue;
    const V = _vf3V(id); if (!V || V.visit || V.hold) continue;
    const at = typeof _vfrTalkSpot === 'function' ? _vfrTalkSpot(V, _gw.px, _gw.py) : null; if (!at) continue;
    _vgm.askAt = now; W['vgi.' + id] = today; W['vgi'] = { d: today, n: (W['vgi'] && W['vgi'].d === today ? W['vgi'].n : 0) + 1 }; _wdSave();
    const words = _vgm.impl.get(game).askAt ? _vgm.impl.get(game).askAt({ x: _gw.px, y: _gw.py }) : '';
    _vgm.inv = { id, game, at: words, t0: now };
    gardenFolkDrive(id, { to: at, gait: id === 'pip' || id === 'quince' ? 'r' : 'w', by: 'game', face: { x: _gw.px, y: _gw.py }, then: () => _vgAskSay() });
    return;
  }
}
function _vgAskSay() {
  const I = _vgm.inv; if (!I) return;
  const V = _vf3V(I.id); if (!V) { _vgm.inv = null; return; }
  if ((typeof _wd !== 'undefined' && _wd.talk) || Math.hypot(V.x - _gw.px, V.y - _gw.py) > 6 || gardenGameBusy()) { _vgm.inv = null; gardenFolkRelease(I.id, 'game'); return; }
  const row = VALE_FOLK_ROW.get(I.id), at = I.at, game = I.game, id = I.id;
  gardenFolkPose(id, id === 'pip' ? 'point' : '', { x: _gw.px, y: _gw.py });
  const ask = vgLine(id, game, 'ask', at) || ('Fancy a game? ' + VALE_GAMES[game].name);
  let answered = false;
  try {
    wdTalk({ name: row.name, art: gardenCastSvg(row.cast), lines: [ask], at: { x: V.x, y: V.y }, bye: VF3_SAY.notNow,
      actions: [{ label: VF3_SAY.yes, primary: true, run: (T) => { answered = true; _vgm.inv = null; const say = vgLine(id, game, 'yes', at); wdTalkClose(true); gardenGameStart(game, { by: id }); if (say) try { wdAmbient('“' + say + '”', 4200, 'folk'); } catch (e) { /* quiet */ } } }],
      onClose: () => { if (answered) return; _vgm.inv = null; const no = vgLine(id, game, 'no', at); if (no) try { wdAmbient('“' + no + '”', 4200, 'folk'); } catch (e) { /* quiet */ } gardenFolkRelease(id, 'game'); } });
  } catch (e) { _vgm.inv = null; gardenFolkRelease(id, 'game'); }
}
/* ---------- the prompt: join in, the game's own moves, the Games board ---------- */
function gardenGameActRows(px, py) {
  const out = [];
  try {
    const R = _vgm.R, G = _vgm.G;
    if (R && !R.over) {
      const me = R.people.get(_vgMeSlot());
      if ((!me || me.left) && R.phase !== 'result' && (R.phase !== 'play' || R.I.late) && Math.hypot(R.at.x - px, R.at.y - py) < 8) out.push({ key: 'vg-join', act: 'game', src: 'vg', run: () => _vgJoinMe(), words: VF3_SAY.join(R.G.word), x: px, y: py, pri: 3 });
      if (me && !me.left && R.phase === 'play' && R.I.rows) out.push(...R.I.rows(R, px, py, _vgMeSlot()));
    } else if (G && !G.over) {
      if (!G.joined && G.phase !== 3 && (G.phase !== 2 || (G.I && G.I.late)) && Math.hypot(G.at.x - px, G.at.y - py) < 8) out.push({ key: 'vg-join', act: 'game', src: 'vg', run: () => _vgGuestJoin(), words: VF3_SAY.join(VALE_GAMES[G.game].word), x: px, y: py, pri: 3 });
      if (G.joined && G.phase === 2 && G.I && G.I.gRows) out.push(...G.I.gRows(G, px, py));
    }
    if (!R && !(G && !G.over)) out.push(..._vgBoardRows(px, py));
    if (!R && !(G && !G.over) && typeof gardenKitActRows === 'function') out.push(...gardenKitActRows(px, py));   // (the day's kit: a stall, the brazier, the card table: 94-garden-wonder-folk3-6kit.js)
  } catch (e) { console.error('[vale games]', e); }
  for (const r of out) if (r.run) r.down = true;   // (a game's move is offered whichever way you face: the prompt keeps rows marked so even when behind you)
  return out;
}
function _vgJoinMe() {
  const R = _vgm.R; if (!R) return false;
  const w = _vgMeSlot(), p = R.people.get(w);
  if (p) { p.left = false; p.done = false; } else R.people.set(w, { w, me: true, score: 0, place: 0, done: false, n: 0 });
  R.dirty = true; _vgChipPaint(true);
  if (Math.hypot(R.at.x - _gw.px, R.at.y - _gw.py) > 1.5) { try { gardenWalkToPoint(R.at, null, { radius: 1.2 }); } catch (e) { /* walk yourself */ } }
  return true;
}
/** A click on someone in the game: the module's move (Found you!), or nothing while they are busy playing. */
function gardenGameFolkTap(id) {
  const I = _vgm.inv; if (I && I.id === id) { const V = _vf3V(id); if (V && Math.hypot(V.x - _gw.px, V.y - _gw.py) < 3) { gardenFolkRelease(id, 'game'); const D = gardenFolkDrive(id, { by: 'game', face: { x: _gw.px, y: _gw.py } }); void D; _vgAskSay(); return true; } }
  const R = _vgm.R;
  if (R && !R.over && (R.folk.includes(id) || R.helpers.includes(id))) {
    if (R.phase === 'play' && R.I.tap && R.I.tap(R, id, _vgMeSlot())) return true;
    if (R.phase === 'result') return false;   // (after a game you can talk to them again)
    return true;
  }
  const G = _vgm.G;
  if (G && !G.over && (G.folk || []).includes(id)) { if (G.phase === 2 && G.I && G.I.gTap) G.I.gTap(G, id); return true; }
  return false;
}
/* ---------- the chip: the rule, how it is going, Leave game; at the end the places, Play again or That's enough ---------- */
function _vgChipEl() {
  const box = typeof _ghBox === 'function' ? _ghBox() : null; if (!box) return null;
  let c = _vgm.chip;
  if (!c || !c.isConnected || c.parentNode !== box) {
    if (c) c.remove();
    c = document.createElement('div'); c.className = 'gvg-chip'; c.setAttribute('role', 'status');
    c.innerHTML = '<span class="gvg-ic" aria-hidden="true"></span><span class="gvg-tx"><b class="gvg-name"></b><span class="gvg-line"></span></span><span class="gvg-big" aria-live="polite"></span><span class="gvg-go"></span>';
    c.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    box.appendChild(c); _vgm.chip = c; c._sig = '';
  }
  return c;
}
function _vgChipPaint(force) {
  const R = _vgm.R, G = _vgm.G;
  const on = (R && !R.over) || (G && !G.over);
  if (!on) { if (_vgm.chip) { _vgm.chip.remove(); _vgm.chip = null; } return; }
  const c = _vgChipEl(); if (!c) return;
  const v = R && !R.over ? _vgChipHost(R) : _vgChipGuest(G); if (!v) return;
  const sig = v.name + '|' + v.line + '|' + v.big + '|' + v.btns.map(b => b[0]).join(',') + '|' + (v.rows || '') + '|' + (v.meter || 0);
  if (!force && c._sig === sig) return;
  c._sig = sig;
  // the swinging marker (skimming: throw when it is in the middle): a CSS animation started where the clock says it is
  let mt = c.querySelector('.gvg-meter');
  if (v.meter) {
    if (!mt) { mt = document.createElement('span'); mt.className = 'gvg-meter'; mt.setAttribute('aria-hidden', 'true'); mt.innerHTML = '<span class="gvg-mid"></span><i></i>'; c.querySelector('.gvg-tx').appendChild(mt); }
    const sw = typeof VGT_SWING === 'number' ? VGT_SWING : 1400, i = mt.querySelector('i');
    i.style.animationDuration = sw + 'ms'; i.style.animationDelay = -((performance.now() - v.meter) % (sw * 2)) + 'ms';
  } else if (mt) mt.remove();
  c.dataset.phase = v.phase || '';
  c.querySelector('.gvg-ic').innerHTML = typeof icon === 'function' ? icon(v.icon || 'gamepad-2') : '';
  c.querySelector('.gvg-name').textContent = v.name;
  c.querySelector('.gvg-line').textContent = v.line;
  const big = c.querySelector('.gvg-big'); big.textContent = v.big || ''; big.hidden = !v.big;
  let rows = c.querySelector('.gvg-rows'); if (v.rows) { if (!rows) { rows = document.createElement('ol'); rows.className = 'gvg-rows'; c.querySelector('.gvg-tx').appendChild(rows); } rows.innerHTML = v.rows; } else if (rows) rows.remove();
  const go = c.querySelector('.gvg-go'); go.textContent = '';
  for (const [label, run, primary] of v.btns) { const b = typeof uiButton === 'function' ? uiButton({ label, size: 'sm', kind: primary ? 'primary' : 'ghost', run }) : document.createElement('button'); if (typeof uiButton !== 'function') { b.textContent = label; b.onclick = run; } go.appendChild(b); }
}
function _vgRowsHtml(res, nameOf) {
  return res.slice(0, 5).map(r => `<li${r.w === _vgMeSlot() ? ' class="is-me"' : ''}><span>${esc(String(r.place))}</span><b>${esc(nameOf(r))}</b><em>${esc(r.words || '')}</em></li>`).join('');
}
function _vgChipHost(R) {
  const secs = (performance.now() - R.pt) / 1000, me = R.people.get(_vgMeSlot()), playing = me && !me.left;
  const v = { name: R.G.name, icon: R.G.icon, line: '', big: '', btns: [], phase: R.phase };
  if (R.phase === 'gather') { v.line = R.ready ? 'Everyone to the start!' : (R.I.finding ? R.I.finding(R) : 'Getting ready...'); if (playing) v.btns.push([VF3_SAY.leave, () => gardenGameLeave()]); else v.btns.push([VF3_SAY.join(R.G.word), () => _vgJoinMe(), true]); }   // (a friend started it: join in)
  else if (R.phase === 'ready') {
    if (R.I.readyLine) { const o = R.I.readyLine(R, secs); v.line = o.line; v.big = o.big || ''; }
    else { const k = Math.min(VF3_SAY.ready.length - 1, Math.floor(secs)); v.line = R.G.rule; v.big = VF3_SAY.ready[k]; }
    if (playing) v.btns.push([VF3_SAY.leave, () => gardenGameLeave()]); else v.btns.push([VF3_SAY.join(R.G.word), () => _vgJoinMe(), true]);
  } else if (R.phase === 'play') {
    v.line = (R.I.line ? R.I.line(R, _vgMeSlot()) : '') || R.G.rule;
    v.big = R.I.big ? R.I.big(R, secs) : '';
    v.meter = R.I.meter ? R.I.meter(R, _vgMeSlot()) : 0;
    if (playing) v.btns.push([VF3_SAY.leave, () => gardenGameLeave()]);
    else if (R.I.late) v.btns.push([VF3_SAY.join(R.G.word), () => _vgJoinMe(), true]);
    if (R.I.giveUp && secs > R.I.giveUp && playing) v.btns.unshift(['Give up', () => { R.giveUp = true; }]);
  } else if (R.phase === 'result') {
    const res = R.res || [];
    v.line = res.length ? (res[0].w === _vgMeSlot() ? (res[0].tie ? VF3_SAY.tie : VF3_SAY.first) : _vgResName(res[0]) + ' won!') : 'All done.';
    v.rows = _vgRowsHtml(res, _vgResName);
    v.btns.push([VF3_SAY.again, () => _vgAgain(R), true], [VF3_SAY.enough, () => _vgEnd(R)]);
  }
  return v;
}
function _vgResName(r) { return r.v ? _vgFolkCap(r.v) : _vgName(r.w); }
function _vgAgain(R) {
  // (hide and seek: the other way round next time, when it is just you and them)
  const swap = R.G.again && _vgm.impl.has(R.G.again) && !gardenGameCan(R.G.again) && ![...R.people.values()].some(p => !p.me && !p.left);
  const L = { game: swap ? R.G.again : R.game, by: R.by || R.folk[0] || '', folk: R.folk.concat(R.helpers) }; _vgEnd(R);
  setTimeout(() => gardenGameStart(L.game, swap ? { by: L.by } : { by: L.by, folk: L.folk }), 60);   // (swapped: whoever is about joins in again)
}
/* ---------- Esc leaves the game ---------- */
function _vgKeys() {
  if (_vgm.keys) return; _vgm.keys = true;
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !gardenGameBusy() || ev.defaultPrevented) return;
    if (typeof _wd !== 'undefined' && _wd.talk) return;
    if (document.querySelector('[role="dialog"][aria-modal="true"]') || (typeof gardenWorldCovered === 'function' && gardenWorldCovered())) return;   // (Esc closes the panel first)
    const tg = ev.target; if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    if (gardenGameLeave()) { ev.preventDefault(); ev.stopPropagation(); }
  }, true);
}
/** The soft dimming while someone counts with their eyes shut (hide and seek): a CSS layer over the world, never a repaint. */
function _vgDim(on, text) {
  const box = typeof _ghBox === 'function' ? _ghBox() : null; if (!box) return;
  if (!on) { box.classList.remove('gvg-counting'); if (_vgm.dim) { _vgm.dim.classList.remove('is-on'); const d = _vgm.dim; _vgm.dim = null; setTimeout(() => d.remove(), 500); } return; }
  let d = _vgm.dim; if (!d || !d.isConnected) { d = document.createElement('div'); d.className = 'gvg-dim'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = '<span></span>'; box.appendChild(d); _vgm.dim = d; box.classList.add('gvg-counting'); requestAnimationFrame(() => d.classList.add('is-on')); }
  const s = d.firstChild; if (s.textContent !== (text || '')) s.textContent = text || '';
}
/* ---------- with friends: the wire ---------- */
function _vgFolkWord(R) { return R.folk.slice(0, 4).join('_') || 'none'; }
function _vgSend(R, step, extra) {
  if (!R || !_vgFriends()) return;
  try {
    if (step === 'start') { const o = { i: R.i, p: R.game, x: Math.floor(R.at.x), y: Math.floor(R.at.y), n: R.G.cap, v: _vgFolkWord(R), ql: 0 }; const l = R.I.wire ? R.I.wire(R) : null; if (l && l.length) o.l = l.slice(0, 8); gardenLiveFx('gm', 'start', o); return; }
    if (step === 'state') {
      const ph = { gather: 0, ready: 1, play: 2, result: 3 }[R.phase] || 0, l = [];
      for (const p of R.people.values()) if (!p.left && p.w <= 8) l.push([p.w, Math.max(0, Math.min(9999, Math.round(p.score || 0))), Math.max(0, Math.min(99, p.n || 0))]);
      const o = { i: R.i, ql: ph, n: Math.max(0, Math.min(600, Math.round(R.G.cap - (performance.now() - R.pt) / 1000))), v: (R.I.folkWord ? R.I.folkWord(R) : _vgFolkWord(R)).slice(0, 64) };
      if (l.length) o.l = l.slice(0, 8);
      const sig = JSON.stringify(o); if (sig === _vgm.sig && performance.now() - (_vgm.sigT || 0) < 4500) return; _vgm.sig = sig; _vgm.sigT = performance.now();   // (the same state again only after a while: friends' screens know the round is still on)
      gardenLiveFx('gm', 'state', o); return;
    }
    if (step === 'end') {
      const l = [], folk = [];
      for (const r of R.res || []) { if (r.w != null && r.w <= 8) l.push([r.w, Math.max(0, Math.min(9999, Math.round(r.score || 0))), Math.max(0, Math.min(99, r.place))]); else if (r.v) folk.push(r.v + r.place); }
      const o = { i: R.i, v: (folk.join('_') || 'none').slice(0, 64) }; if (l.length) o.l = l.slice(0, 8);
      if (extra) { o.x = Math.floor(extra.x); o.y = Math.floor(extra.y); o.tt = Math.min(9, Math.round((extra.x % 1) * 9)) * 10 + Math.min(9, Math.round((extra.y % 1) * 9)); }   // (the podium's place, to a ninth of a cell)
      const w1 = (R.res || [])[0]; if (w1 && w1.w != null) o.to = w1.w;
      gardenLiveFx('gm', 'end', o); return;
    }
    if (step === 'stop') { gardenLiveFx('gm', 'stop', { i: R.i }); }
  } catch (e) { /* only a message */ }
}
/** The host hears a guest's game message (94-garden-live-3host.js, hook W2). Friends are trusted: an ask just starts the game. */
function gardenGameHeard(A, ev) {
  if (!ev || !A || !_vgHostSide()) return;
  const R = _vgm.R, e = ev.e, w = A.w;
  if (e === 'ask') {
    if (R) { if (!R.people.has(w) && R.phase !== 'result') { R.people.set(w, { w, me: false, score: 0, place: 0, done: false, n: 0 }); R.dirty = true; } return; }
    const game = String(ev.p || ''); if (!VALE_GAMES[game]) return;
    const by = typeof ev.v === 'string' && VALE_FOLK_ROW.has(ev.v) ? ev.v : '';
    gardenGameStart(game, { by, at: Number.isFinite(A.x) ? { x: A.x, y: A.y } : null, me: false, guest: w });
    return;
  }
  if (!R || ev.i !== R.i) return;
  if (e === 'join') { if (R.phase === 'result') return; const p = R.people.get(w); if (p) { p.left = false; } else R.people.set(w, { w, me: false, score: 0, place: 0, done: false, n: 0 }); R.dirty = true; _vgChipPaint(true); return; }
  if (e === 'leave') { const p = R.people.get(w); if (p) { p.left = true; p.done = true; R.dirty = true; } if (![...R.people.values()].some(q => !q.left)) _vgEnd(R, true); return; }
  if (e === 'act') { const p = R.people.get(w); if (!p || p.left || R.phase !== 'play') return; try { if (R.I.act && R.I.act(R, w, ev, A)) R.dirty = true; } catch (err) { console.error('[vale games]', err); } }
}
function _vgAskHost(game, by) {
  try { gardenLiveFx('gm', 'ask', { i: 'a' + Math.floor(Math.random() * 1e6).toString(36), p: game, v: by || undefined }); gardenToast(`Asked: ${VALE_GAMES[game].name}`); return true; } catch (e) { return false; }
}
/** A guest hears the host's round (94-garden-live-2visit.js, hook W3). */
function gardenGameGuestEvent(ev) {
  if (!ev || _vgHostSide()) return;
  const e = ev.e;
  if (e === 'start') {
    if (!VALE_GAMES[ev.p] || !_vgm.impl.has(ev.p)) return;
    _vgGuestClear();
    const G = _vgm.G = { i: ev.i, game: ev.p, G: VALE_GAMES[ev.p], I: _vgm.impl.get(ev.p), at: { x: ev.x + 0.5, y: ev.y + 0.5 }, folk: String(ev.v || '').split('_').filter(id => VALE_FOLK_ROW.has(id)), phase: Number(ev.ql) || 0, people: [], joined: false, over: false, lastT: performance.now(), pt: performance.now(), l: Array.isArray(ev.l) ? ev.l : [], sprites: [] };
    try { if (G.I.gStart) G.I.gStart(G, ev); } catch (err) { console.error('[vale games]', err); }
    _vgKeys(); _vgChipPaint(true);
    if (Math.hypot(G.at.x - _gw.px, G.at.y - _gw.py) < 14) { try { gardenToast(`${G.G.name}: walk up to the start and press E to join in.`, { icon: G.G.icon }); } catch (e2) { /* fine */ } }
    return;
  }
  const G = _vgm.G; if (!G || ev.i !== G.i) return;
  G.lastT = performance.now();
  if (e === 'state') {
    const ph = Number(ev.ql) || 0; if (ph !== G.phase) { G.phase = ph; G.pt = performance.now(); }
    G.secs = Number(ev.n) || 0; G.people = Array.isArray(ev.l) ? ev.l : []; G.fw = String(ev.v || '');
    const was = G.joined; G.joined = G.people.some(r => r[0] === _vgMeSlot());
    if (G.joined && !was) { try { gardenToast('You’re in!', { icon: G.G.icon }); } catch (e2) { /* fine */ } }
    try { if (G.I.gState) G.I.gState(G, ev); } catch (err) { console.error('[vale games]', err); }
    _vgChipPaint();
    return;
  }
  if (e === 'end') {
    G.phase = 3; G.pt = performance.now(); G.over = false; G.ended = true;
    const res = [];
    for (const r of Array.isArray(ev.l) ? ev.l : []) res.push({ w: r[0], score: r[1], place: r[2], words: G.I.words ? G.I.words(r[1]) : '' });
    for (const t of String(ev.v || '').split('_')) { const m = /^([a-z]+)(\d+)$/.exec(t); if (m && VALE_FOLK_ROW.has(m[1])) res.push({ v: m[1], place: Number(m[2]), score: 0, words: '' }); }
    res.sort((a, b) => a.place - b.place);
    G.res = res;
    if (Number.isFinite(ev.x) && Number.isFinite(ev.y)) { const fx = Math.floor((Number(ev.tt) || 0) / 10) / 9, fy = ((Number(ev.tt) || 0) % 10) / 9; _vgCratesAt({ x: ev.x + fx, y: ev.y + fy }); }
    if (G.joined) _vgReward(G.game, G.folk, res, _vgMeSlot(), true);
    try { if (G.I.gEnd) G.I.gEnd(G, ev); } catch (err) { console.error('[vale games]', err); }
    _vgChipPaint(true);
    setTimeout(() => { if (_vgm.G === G) _vgGuestClear(); }, 12000);
    return;
  }
  if (e === 'stop') { if (G.joined && !G.ended) { try { gardenToast(VF3_SAY.hostGone); } catch (e2) { /* fine */ } } _vgGuestClear(); }
}
function _vgGuestJoin() { const G = _vgm.G; if (!G || G.over) return false; try { gardenLiveFx('gm', 'join', { i: G.i }); } catch (e) { /* alone */ } if (Math.hypot(G.at.x - _gw.px, G.at.y - _gw.py) > 1.5) { try { gardenWalkToPoint(G.at, null, { radius: 1.2 }); } catch (e) { /* walk yourself */ } } return true; }
function _vgGuestClear() {
  const G = _vgm.G; if (!G) return;
  G.over = true; _vgm.G = null;
  try { if (G.I && G.I.gClear) G.I.gClear(G); } catch (e) { /* gone */ }
  for (const S of G.sprites) { try { S.remove(); } catch (e) { /* gone */ } }
  _vgCratesOff(); _vgDim(false); _vgChipPaint(true);
}
function _vgChipGuest(G) {
  const v = { name: G.G.name, icon: G.G.icon, line: '', big: '', btns: [], phase: ['gather', 'ready', 'play', 'result'][G.phase] || '' };
  if (G.phase === 3) { v.line = G.res && G.res.length ? (G.res[0].w === _vgMeSlot() ? VF3_SAY.first : _vgResName(G.res[0]) + ' won!') : 'All done.'; v.rows = _vgRowsHtml(G.res || [], _vgResName); v.btns.push([VF3_SAY.enough, () => _vgGuestClear()]); return v; }
  if (!G.joined) { v.line = 'Walk up to the start and press E to join in.'; v.btns.push([VF3_SAY.join(G.G.word), () => _vgGuestJoin(), true]); return v; }
  v.line = (G.I.gLine ? G.I.gLine(G) : '') || G.G.rule;
  v.meter = G.phase === 2 && G.I.gMeter ? G.I.gMeter(G) : 0;
  if (G.phase === 1 && G.game === 'race') { const k = Math.min(2, Math.floor((performance.now() - G.pt) / 1000)); v.big = VF3_SAY.ready[k]; }
  v.btns.push([VF3_SAY.leave, () => gardenGameLeave()]);
  return v;
}
function _vgGuestFrame(dt) {
  const G = _vgm.G; if (!G || G.over) return;
  if (performance.now() - G.lastT > 16000) { _vgGuestClear(); return; }
  try { if (G.I.gFrame) G.I.gFrame(G, dt); } catch (e) { console.error('[vale games]', e); }
  if (performance.now() - _vgm.msgT > 250) { _vgm.msgT = performance.now(); _vgChipPaint(); }
}
/** A friend's figure menu (94-garden-live-3host.js and -2visit.js, hook W5): play a game with them, no villager needed. */
function gardenGameFriendButtons(A, close) {
  const out = []; if (!A || gardenGameBusy() || typeof _gsvBtn !== 'function') return out;
  for (const g of ['race', 'seek']) {
    if (!_vgm.impl.has(g)) continue;
    if (_vgHostSide() && gardenGameCan(g)) continue;
    out.push(_gsvBtn(VALE_GAMES[g].word, { icon: VALE_GAMES[g].icon, kind: 'btn-ghost', tip: VALE_GAMES[g].rule, run: () => { close(); if (_vgHostSide()) { const R0 = gardenGameStart(g, {}); if (R0 && _vgm.R) { _vgm.R.people.set(A.w, { w: A.w, me: false, score: 0, place: 0, done: false, n: 0 }); _vgm.R.dirty = true; } } else _vgAskHost(g, ''); } }));
  }
  return out;
}
/* ---------- the Games board: any notice board says what is on and your bests ---------- */
function _vgBoardRows(px, py) {
  if (typeof gardenAffordThings !== 'function') return [];
  const now = performance.now();
  if (!_vgm.boards || now - _vgm.boardsT > 3000) { _vgm.boardsT = now; _vgm.boards = gardenAffordThings().filter(t => t.kind === 'notice-board'); }
  for (const t of _vgm.boards) {
    if (Math.hypot(t.x - px, (t.y - py) * 1.3) > 2.4) continue;
    return [{ key: 'vg-board:' + t.id, act: 'game', src: 'vgb:' + t.id, run: () => gardenGameBoard(t), words: VF3_SAY.board, x: t.x, y: t.y, promptY: t.y - 2.4, pri: 0.2 }];
  }
  return [];
}
function gardenGameBoard(t) {
  const m = gardenHere(), W = _wdG(), lines = [], acts = [];
  const about = m.visit ? [] : _vgAbout(60);
  const wants = [];
  for (const id of about) { const r = VALE_GAME_FOLK[id]; const g = r && (r.asks || []).find(q => _vgm.impl.has(q) && !gardenGameCan(q)); if (g) wants.push([id, g]); if (wants.length >= 3) break; }
  if (wants.length) lines.push(wants.map(([id, g]) => `${_vgFolkCap(id)} wants ${g === 'race' ? 'a race' : g === 'seek' ? 'a game of hide and seek' : g === 'stones' ? 'to skim stones' : 'a treasure hunt'}.`).join(' '));
  else lines.push(m.visit ? 'The games here are your host’s. Walk up to one of their folk, or ask your host.' : 'Nobody is out for a game just now. Try again later, or ask someone.');
  const best = VALE_GAME_IDS.filter(g => Number.isFinite(Number(W['vb.' + g])) || Number(W['vr.' + g]) > 0).map(g => `${VALE_GAMES[g].word}: ${Number(W['vr.' + g]) || 0} won${Number.isFinite(Number(W['vb.' + g])) && W['vb.' + g] !== undefined ? ', best ' + valeBestWords(g, Number(W['vb.' + g])) : ''}`);
  { const yl = typeof gardenYearBoardLine === 'function' ? gardenYearBoardLine(m) : ''; if (yl) lines.unshift(yl); }   // (what is on today, and a festival coming: 94-garden-wonder-folk3-7year.js)
  lines.push(best.length ? 'Yours: ' + best.join('. ') + '.' : 'Your wins and bests go up here once you have played.');
  if (m.visit) { const gb = (_wdTheir(m).gb) || []; if (gb.length) lines.push('Your host’s: ' + gb.map(r => `${(VALE_GAMES[r[0]] || { word: r[0] }).word}: ${r[2]} won${r[1] ? ', best ' + valeBestWords(r[0], r[1]) : ''}`).join('. ') + '.'); }
  if (wants.length && !m.visit) { const [id, g] = wants[0]; acts.push({ label: `Ask ${_vgFolkCap(id)}`, primary: true, run: () => { wdTalkClose(true); gardenGameStart(g, { by: id }); } }); }
  if (_vgFriends() && !gardenGameCan('race')) acts.push({ label: 'Race your friends', run: () => { wdTalkClose(true); gardenGameStart('race', {}); } });
  wdTalk({ name: 'Games board', art: '', lines, actions: acts, at: { x: t.x, y: t.y }, bye: 'Close' });
  return true;
}
/* ---------- your records, for a friend's Games board (wd.gb), and the ribbons' facts ---------- */
function gardenGameWire(w) {
  try {
    const out = [];
    for (const g of VALE_GAME_IDS) {
      const wins = Math.max(0, Math.min(999, Number(w['vr.' + g]) || 0)), b = Number(w['vb.' + g]), best = Number.isFinite(b) ? Math.max(0, Math.min(9999, Math.round(b))) : 0;
      if (wins || best) out.push([g, best, wins]);
    }
    return out.length ? out.slice(0, 6) : null;
  } catch (e) { return null; }
}
function gardenFolkFacts() {
  try {
    const W = _wdG(), Y = typeof gardenYearFacts === 'function' ? gardenYearFacts() : {}, C = typeof gardenChronicleFacts === 'function' ? gardenChronicleFacts() : {};   // (the week, the fair and the vale's story: 94-garden-wonder-folk3-7year.js, -9chron.js)
    return { vgRace: Number(W['vr.race']) || 0, vgSeek: Number(W['vr.seek']) || 0, vgSkip: Number(W['vb.stones']) || 0, vgHunt: Number(W['vr.hunt']) || 0, vyFest: Number(Y.fest) || 0, vhist: Number(C.vhist) || 0 };
  } catch (e) { return null; }
}
/* ---------- the world's loop ---------- */
wdMod({
  id: 'vale-games', pref: 'folk', visit: true,
  begin() { },
  frame(dt) { try { if (_vgm.R) _vgHostFrame(dt); else if (_vgm.G) _vgGuestFrame(dt); } catch (e) { console.error('[vale games]', e); } },
  tick(m) {
    try {
      if (_vgm.R && (m.visit || !_vgOn())) _vgEnd(_vgm.R, true);
      if (_vgm.G && !m.visit) _vgGuestClear();
      if (!m.visit) _vgAskTick(m);
      if (_vgm.inv && performance.now() - _vgm.inv.t0 > 45000) { const id = _vgm.inv.id; _vgm.inv = null; if (!(typeof _wd !== 'undefined' && _wd.talk)) gardenFolkRelease(id, 'game'); }
    } catch (e) { console.error('[vale games]', e); }
  },
  end() { if (_vgm.R) _vgEnd(_vgm.R, true); _vgGuestClear(); if (_vgm.inv) { gardenFolkRelease(_vgm.inv.id, 'game'); _vgm.inv = null; } _vgCratesOff(); _vgChipPaint(true); },
});
/** Console only (and the sandbox check): start a game now with whoever is about. */
function gardenGameDev(game, by) { return gardenGameStart(game || 'race', { by: by || '' }); }

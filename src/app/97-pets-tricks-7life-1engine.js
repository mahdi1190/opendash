/* ============================================================
   PETS, THE HUNDRED THINGS (round 3, Nov 2026): what a pet does with the world, with you and with other pets.
   The owner: "pets doing stuff in puddles and anything else. Think of 100 things and implement."

   ONE ROW IS ONE THING (PET_LIFE, 97-pets-tricks-7life-2rows.js): {n (its number in the owner's list), id, name, group, how ('world' | 'you' |
   'pets' | 'event'), clip(s), at (a kind of thing in the world it goes to), when(P, C) -> true when it may happen, run (optional, its own steps),
   unlock ({bond: n}: a friend level; {trick: id}: a trick it has learned), diary (a line for the pet's journal the first time), need (a world object
   the painters have not placed yet: the row waits for it), cd (seconds before it may happen again)}.

     petLifeThink(P, W)     the roaming loop asks before its own pick (97-pets-7roam.js): maybe one of these instead. True when one started
     petLifeTick(P, W, dt)  every frame for your companion: watches what you do (stand still, run, sit, fish, go indoors) and queues a reaction
     petLifeEvent(kind)     something happened (a pat, an emote, a photo): your companion answers
     petLifeTry(id, o)      play one now (o.here: where the pet stands); the round-3 checking scripts drive every row through it
     petLifeList()          every row with whether it is unlocked, its hint and how it is set off (the pet page and the checks)
     petLifeCelebrate(id)   an unlock: a little party, a line in the garden's messages

   FRIENDS SEE THEM with nothing new on the wire: every one is a clip of the clip library, and your companion's clips already go out by id
   (gardenLivePet 'pet', one every few seconds, never a stream; 94-garden-live-5pets.js plays them on the friend's copy, and an older app ignores
   an id it does not know). Where the pet walks to goes out as it always did (gl:pp). REDUCED MOTION or the Fun level Off: the roaming loop does not
   run, so none of this does. OFF SCREEN: P.clip plays nothing for a pet out of view, and the rows only read a few numbers.
   ============================================================ */
const _pl = { q: [], stillT: 0, moveT: 0, lastMoveT: 0, room: false, tod: '', bite: false, built: 0, thingsKey: '', things: null, fished: -1, festSeen: '', greeted: 0, lastPat: 0, sulked: 0, tries: 0, cel: [] };
/** Kinds of thing in the world a row can go to, matched on a landmark's kind or a placed thing's id. A kind with no match yet is a data row for
 *  the painters (PET_LIFE_SPOTS below): place a landmark or decoration with that id and the rows that wait for it start on their own. */
const PET_LIFE_KINDS = Object.freeze([
  ['bench', /^(ld-seat|bench|stone-bench|driftwood-seat|picnic-blanket|deckchair|bistro-set|gazebo)$/],
  ['well', /^(ld-wish|wishing-well)$/],
  ['pump', /^(ld-pump|water-pump|water-butt)$/],
  ['trough', /trough|^ld-churn$/],
  ['fire', /^(fire-pit|ld-clamp|dc-clay-oven|dc-cauldron)$/],
  ['bell', /bell|^ld-chapel$/],
  ['maypole', /maypole/],
  ['mill', /^ld-mill$|play-mill/],
  ['hay', /^ld-barn$|hay/],
  ['chime', /chime/],
  ['board', /^(notice-board|lake-board|ld-finger|ld-mile)$/],
  ['lighthouse', /^ld-lighthouse$|^dc-lighthouse$/],
  ['treehouse', /^ld-treehouse$|^ld-hollow$/],
  ['stall', /^(market-stall|garden-shop|tackle-shop)$/],
  ['maze', /^ld-turf$|maze|^box-hedge$/],
  ['stump', /^ld-stump$|^log-pile$/],
  ['wall', /^ld-wall$|^ld-stones$/],
  ['music', /music|^dc-gramophone$/],
  ['bed', /pet-bed|pet-basket|basket/],
  ['slide', /slide/],
  ['swing', /^(swing-seat|rope-swing|hammock)$/],
  ['pier', /pier|jetty|^ld-boathouse$|^lake-hall$/],
  ['falls', /^ld-falls$/],
  ['leaves', /^leaf-pile$/],
  ['bath', /^(bird-bath|fountain|mini-pond)$/],
  ['chair', /^(play-chair|deckchair)$/],
]);
/** World objects some rows want that the map does not have yet: the painters place one (a landmark or decoration with a matching id) and the row runs. */
const PET_LIFE_SPOTS = Object.freeze([
  { kind: 'slide', rows: [66], ask: 'A playground slide (or garden steps) a pet can try to climb: id containing "slide".' },
  { kind: 'swing', rows: [67], ask: 'A rope swing over the brook (id "rope-swing"); the swing seat and hammock count meanwhile.' },
  { kind: 'bell', rows: [71], ask: 'A bell that rings (id containing "bell"); the ruined chapel stands in for it meanwhile.' },
  { kind: 'maypole', rows: [77], ask: 'The maypole on the green as its own landmark (id "ld-maypole"): today it is painted into the green, so pets cannot find it.' },
  { kind: 'chime', rows: [80], ask: 'A wind chime a pet can bump (id containing "chime").' },
  { kind: 'bed', rows: [76], ask: 'A pet bed or basket to place (decoration id "pet-bed").' },
  { kind: 'music', rows: [99], ask: 'A music box to place or find (id containing "music").' },
  { kind: 'pier', rows: [69], ask: 'The end of the pier as a spot (id "ld-pier"); the boathouse and the lake hall stand in meanwhile.' },
]);
function _plSoon(P, id, secs) { const k = 'at_l-' + id; return !P[k] || performance.now() - P[k] > secs * 1000; }
function _plMark(P, id) { P['at_l-' + id] = performance.now(); }
/** Every thing a row can go to, by kind, read once each time the garden changes (the roaming loop's own key). */
function _plThings() {
  let S = null; try { S = _ptwSpots(); } catch (e) { return {}; }
  if (_pl.things && _pl.thingsKey === S.key) return _pl.things;
  const out = {}, put = (kind, x, y, name) => { (out[kind] || (out[kind] = [])).push({ x, y, name }); };
  const match = (id, x, y, name) => { for (const [kind, re] of PET_LIFE_KINDS) if (re.test(id)) put(kind, x, y, name); };
  try { for (const p of gardenLandProps()) match(String(p.kind || ''), p.x + p.w / 2, p.y + p.h, p.name); } catch (e) { /* none */ }
  try { for (const o of gardenWorldObjects(S.model)) { if (o.kind === 'plant') continue; match(String(o.id || ''), o.top.x, o.y + (o.h || 1), o.name); } } catch (e) { /* none */ }
  out.tree = S.shade.slice(); out.shore = S.shore.slice(); out.drink = S.drink.slice(); out.warm = S.warm.slice();
  _pl.things = out; _pl.thingsKey = S.key;
  return out;
}
/** The nearest thing of a kind within the pet's reach (a pet that follows you stays near you). */
function _plNear(P, kind, R) {
  const list = typeof kind === 'string' ? (_plThings()[kind] || []) : kind;
  if (!list.length) return null;
  const pl = P.me ? _ptwPlayer() : null, cx = pl ? pl.x : P.x, cy = pl ? pl.y : P.y, reach = R || (pl ? 5 : 12);
  let best = null, bd = reach;
  for (const q of list) { const d = Math.hypot(q.x - cx, (q.y - cy) * 1.4); if (d < bd) { bd = d; best = q; } }
  return best;
}
/** What you are doing, as a pet sees it: 'sit', 'lie', 'dance', 'fish', 'climb', 'boat', 'room' or ''. The player's own moves (feat/player-moves) may say more through gardenPlayerDoing(). */
function _plDoing() {
  try { if (typeof gardenPlayerDoing === 'function') { const d = gardenPlayerDoing(); if (d) return String(d.kind || d); } } catch (e) { /* below */ }
  if (typeof _grm !== 'undefined' && _grm && _grm.on) return 'room';
  // the player's moves (feat/player-moves, 94-garden-zz-7act-1core.js): what the interaction system says you are doing, in a pet's words
  try { if (typeof gartActBusy === 'function' && gartActBusy() && typeof _ga !== 'undefined' && _ga.cur) { const id = String(_ga.cur.id || _ga.cur.act || (_ga.cur.row && _ga.cur.row.id) || ''); const k = { sit: 'sit', dangle: 'sit', lean: 'sit', lie: 'lie', nap: 'lie', angel: 'lie', ladder: 'climb', climbtree: 'climb', row: 'boat', read: 'talk', look: 'talk', photo: 'photo', warm: 'sit', feed: 'sit' }[id]; if (k) return k; } } catch (e) { /* below */ }
  if (typeof _gw === 'undefined' || !_gw) return '';
  if (_gw.boat) return 'boat';
  if (_gw.fishing && ['cast', 'wait', 'bite', 'reel'].includes(_gw.fishing.state)) return 'fish';
  if (typeof _pe !== 'undefined' && _pe && _pe.hold) return 'sit';
  return '';
}
function _plBondOk(n) { try { return (typeof _ptcBondBest === 'function' ? _ptcBondBest(_ptS()) : 1) >= n; } catch (e) { return false; } }
function _plOwned(row) {
  const u = row.unlock; if (!u) return true;
  try { if (u.trick) return typeof petBookOwned === 'function' && petBookOwned(u.trick); if (u.bond) return typeof petBookOwned === 'function' ? petBookOwned('lf-' + row.id) : _plBondOk(u.bond); } catch (e) { return false; }
  return true;
}
function _plSuits(P, clip) { return !clip || typeof petClipSuits !== 'function' || petClipSuits(clip, P.look.species); }
function _plClips(row) { return [].concat(row.clip || []); }
/** Play clips one after another where it stands, then rest. Your companion first comes to where you can see it (round 3, the critic: rows played
 *  three cells off or out of the frame read as a dog walking about): beside you, never on you, facing you, and, when the row's own thing is not
 *  there (no puddle on a dry day, no flower bed by the plaza), with the thing drawn at its feet for the length of the row (_plProp). */
function _plPlay(P, clips, rest, after, o) {
  o = o || {};
  clips = clips.filter(c => _plSuits(P, c) && (typeof petClipDef !== 'function' || petClipDef(c) || PET_CLIPS[c]));
  const tight = !!(P.lifeCur && (P.lifeCur.group === 'you' || P.lifeCur.tight));
  if (P.me && !_pl.here && !o.at && !o.staged && !(P.lifeCur && P.lifeCur.stay) && _plFar(P, tight)) { const t = _plStage(P, tight); if (t) { P.lifeStaged = 1; P.walkTo(t.x, t.y, true, () => { _plFacePlayer(P); _plPlay(P, clips, rest, after, Object.assign({}, o, { staged: 1 })); }); return; } }
  let row = P.lifeCur, kind = o.prop || row && (row.propAlways || (P.lifeStaged || _pl.here) && row.prop);
  // the thing it needs goes only on ground where it makes sense: if where it stands is a road, a plaza or a bed's edge, it moves to a spot
  // beside you where the thing fits; with none in reach the row plays without it
  if (kind && P.me && !_pl.here && !o.noProp && !o.fitted && typeof _plGroundOk === 'function') {
    const pl = _ptwPlayer(), side = pl ? (P.x >= pl.x ? 1 : -1) : 1;
    if (!_plGroundOk(kind, P.x, P.y, side, P)) { const t = _plStage(P, false, kind); if (t && Math.hypot(t.x - P.x, t.y - P.y) > 0.05) { P.walkTo(t.x, t.y, true, () => { _plFacePlayer(P); _plPlay(P, clips, rest, after, Object.assign({}, o, { staged: 1, fitted: 1 })); }); return; } if (!t) kind = ''; }
  }
  const next = (i) => {
    if (i >= clips.length) { P.sit(); P.busy = rest == null ? 1.2 : rest; if (after) after(); return; }
    P.clip(clips[i], _plMs(clips[i]), () => next(i + 1), i > 0 ? { quiet: true } : undefined);
    if (i === 0) _plCopy(P, clips[0]);
  };
  next(0);
  // drawn after the first clip has started: a clip can change the pet's pose picture, and the thing belongs in the one that shows
  if (kind && clips.length && !o.noProp) _plProp(P, kind, clips.reduce((t, c) => t + _plMs(c), 0));
}
function _plMs(c) { const lib = typeof petClipDef === 'function' ? petClipDef(c) : null; return lib ? lib.ms : (PET_CLIPS[c] || [0, 1200])[1]; }
/** Where you can see it: inside the camera with a margin (a cell and a bit from each edge). */
function _plSeen(x, y) { try { if (typeof _gwInView !== 'function' || !_gw || !_gw.cam || !_gw.cam.w) return true; return _gwInView(x, y, -1.1); } catch (e) { return true; } }
/** A spot a pet may stand on for a while: walkable with room round it (not in a hedge or a bush), and in view. */
function _plStandOk(x, y) { try { if (typeof gardenWorldFree === 'function' ? !gardenWorldFree(x, y, 0.3) : !_ptwFree(x, y)) return false; } catch (e) { return false; } return _plSeen(x, y); }
/** Too far from you to read (over two cells, or out of view), or so close it would stand on you. */
function _plFar(P, tight) { const pl = _ptwPlayer(); if (!pl) return false; const d = Math.hypot(pl.x - P.x, (pl.y - P.y) * 1.4); return d > (tight ? 1.15 : 2.1) || Math.abs(pl.x - P.x) < 0.5 && Math.abs(pl.y - P.y) < 0.6 || !_plSeen(P.x, P.y); }
/** Your companion's stage: just beside you (two thirds of a cell to a cell off, a little in front), on the side it is already on. */
function _plStage(P, near, kind) {
  const pl = _ptwPlayer(); if (!pl) return null;
  if (kind === '-') kind = ''; else if (!kind && P.lifeCur && !_pl.here) kind = P.lifeCur.propAlways || P.lifeCur.prop || '';
  const s = P.x >= pl.x ? 1 : -1, sz = typeof _ptwH === 'function' ? Math.max(0, (_ptwH(P.look.species) - 32) / 48) : 0;
  // bigger pets stand a little further off so the two figures never overlap (round 3: pets drawn larger)
  let ring = near ? [[0.62, 0.12], [0.58, 0.3], [0.72, -0.08]] : [[0.78, 0.1], [0.7, 0.32], [0.95, -0.06], [1.05, 0.34], [1.25, 0.12]];
  if (kind) ring = [[0.85, 0.12], [1.0, 0.3], [1.0, -0.1], [1.25, 0.15], [1.2, 0.45], [1.5, 0.1], [1.4, -0.25], [1.7, 0.35], [2.0, 0.1]];
  for (const [a0, b] of ring) for (const k of [s, -s]) { const a = a0 + sz, x = pl.x + a * k, y = pl.y + b; if (_plStandOk(x, y) && (!kind || typeof _plGroundOk !== 'function' || _plGroundOk(kind, x, y, k, P))) return { x, y, free: true, stage: 1 }; }
  return kind && arguments.length < 3 ? _plStage(P, near, '-') : null;   // no ground for the thing near you: stand beside you anyway (the row then plays without it)
}
/** Walk beside a thing, face it, do it. False when there is no way there. Your companion only goes to a thing you can see (a row played off screen
 *  is a row nobody sees); when the thing is out of view, a row that brings its own (a puddle, flowers, a leaf pile) plays beside you instead. */
function _plGoDo(P, t, clips, rest, after, run) {
  if (_pl.here) { _plPlay(P, clips, rest, after); return true; }   // (petLifeTry with here: the checking tool plays it where the pet stands)
  const row = P.lifeCur, pl = _ptwPlayer();
  // beside the thing, but not where you stand (round 3: walked up to the well yourself, the one spot beside it was yours, and the row gave up)
  const clearOfYou = (q) => !pl || Math.abs(q.x - pl.x) > _plHalf(P) + 0.14 || Math.abs(q.y - pl.y) > 0.42;
  const freeT = t && t.free ? (clearOfYou(t) ? t : [0.5, -0.5, 0.9, -0.9].map(k => ({ x: t.x + k + Math.sign(k) * _plHalf(P), y: t.y, free: true, stage: t.stage })).find(q => _ptwFree(q.x, q.y) && clearOfYou(q)) || t) : null;
  const near = t && (t.free ? freeT : [[0, .8], [-.9, .5], [.9, .5], [0, 1.3], [-1.3, .8], [1.3, .8], [-1.6, .2], [1.6, .2], [0, 1.8]].map(([x, y]) => ({ x: t.x + x, y: t.y + y })).find(q => _ptwFree(q.x, q.y) && clearOfYou(q)));
  const dN = near && pl ? Math.hypot(near.x - pl.x, (near.y - pl.y) * 1.4) : 99, onYou = near && !clearOfYou(near);
  if (P.me && pl && (!near || !_plSeen(near.x, near.y) || dN > ((row && (row.prop || row.propAlways)) ? 2.4 : 4.5) || onYou || t.free && !t.stage)) {
    if (!(row && (row.prop || row.propAlways || row.stageOk)) && !(near && t.free && _plSeen(near.x, near.y))) return false;
    const s = _plStage(P, !!(row && (row.group === 'you' || row.tight))); if (!s) return false;
    P.lifeStaged = 1; P.walkTo(s.x, s.y, !!run || true, () => { _plFacePlayer(P); _plPlay(P, clips, rest, after, { at: 1 }); });
    return true;
  }
  if (!near) return false;
  P.walkTo(near.x, near.y, !!run, () => { if (t.x !== near.x && !t.free) P.dir = t.x >= P.x ? 1 : -1; _plPlay(P, clips, rest, after, { at: 1 }); });
  return true;
}
/* Round 3, the critic: rows with you must really touch you (a pet landed on your head, stood on your leg, high-fived the air, waved from two
   cells off). _plTouch: the spot beside you for a kind of contact, from the pet's own drawn size: 'side' (spin, wave, bow, cheer: close, never
   overlapping), 'five' (its raised paw meets your hand), 'lap' (beside you on the bench, its head across your lap), 'feet' (just in front of you,
   its chin on your shoes). It comes there, faces you, and only then plays. */
function _plHalf(P) { const W = typeof GARDEN_WORLD !== 'undefined' ? GARDEN_WORLD.cellW : 48; return (typeof _ptwH === 'function' ? _ptwH(P.look.species) : 32) * 0.46 / W; }
const _PL_TOUCH = Object.freeze({ side: [1, 0.24, 0.04], five: [0.62, 0.2, 0.03], lap: [0.55, 0.12, 0.08], feet: [0.5, 0.02, 0.16] });
function _plTouch(P, how) {
  const pl = _ptwPlayer(); if (!pl) return null;
  const [k, add, dy] = _PL_TOUCH[how] || _PL_TOUCH.side, d = _plHalf(P) * k + add, s = P.x >= pl.x ? 1 : -1;
  for (const side of [s, -s]) for (const ey of [0, 0.08, -0.06]) { const x = pl.x + side * d, y = pl.y + dy + ey; if (_ptwFree(x, y)) return { x, y, side }; }
  return null;
}
/** Come to the touch spot, face you, then play the clips (after: when done). False when there is no room beside you. */
function _plCome(P, how, clips, rest, after) {
  const t = _plTouch(P, how); if (!t) return false;
  const go = () => { P.dir = -t.side; _plPlay(P, clips, rest, after, { at: 1, noProp: 1 }); };
  if (Math.hypot(t.x - P.x, (t.y - P.y) * 1.4) < 0.06) { P.x = t.x; P.y = t.y; go(); return true; }
  P.walkTo(t.x, t.y, Math.hypot(t.x - P.x, t.y - P.y) > 1.5, go);
  return true;
}
function _plSpotNear(P, r) { for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28, d = 0.8 + Math.random() * (r || 1.6), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d * 0.7; if (_ptwFree(x, y)) return { x, y, free: true }; } return null; }
function _plBesidePlayer(P, dx) { const pl = _ptwPlayer(); if (!pl) return null; for (const [a, b] of [[dx || 0.7, 0.25], [-(dx || 0.7), 0.25], [0, 0.55], [0.9, -0.1], [-0.9, -0.1]]) { const x = pl.x + a, y = pl.y + b; if (_ptwFree(x, y)) return { x, y, free: true }; } return null; }
function _plFacePlayer(P) { const pl = _ptwPlayer(); if (pl) P.dir = pl.x >= P.x ? 1 : -1; }
function _plDiary(row) { if (row.diary && typeof _ptNote === 'function') _ptNote('life-' + row.id); }
function _plCtx(P, W) {
  const m = W.m, pl = _ptwPlayer();
  let cell = null; try { cell = gardenLandCell(Math.floor(P.x), Math.floor(P.y)); } catch (e) { cell = null; }
  const onPath = (() => { try { return !!gardenLandPathAt(Math.floor(P.x), Math.floor(P.y)) || !!(cell && cell.lane); } catch (e) { return false; } })();
  return { W, m, pl, me: !!P.me, tod: m.tod, season: m.season, rain: W.rain, wet: W.wet, snow: W.snow, night: W.night, day: W.day, dusk: m.tod === 'dusk' || m.tod === 'evening', winter: m.season === 'winter', summer: m.season === 'summer', autumn: m.season === 'autumn', spring: m.season === 'spring',
    onPath, dPl: pl ? Math.hypot(pl.x - P.x, (pl.y - P.y) * 1.4) : 99, doing: P.me ? _plDoing() : '', stillT: _pl.stillT, pets: W.pets.filter(q => q !== P && !_ptwGone(q)), swims: _ptwHas(P, 'swim'), flies: _ptwFlier(P), digs: _ptwHas(P, 'dig'), species: P.look.species };
}
function _plStart(P, row, C, forced) {
  _plMark(P, row.id); _pl.lastAny = performance.now();
  P.lifeCur = row; P.lifeStaged = 0;
  let ok = false;
  try {
    if (row.run) ok = row.run(P, C, row, forced) !== false;
    else if (row.at) { const t = _plNear(P, row.at, forced ? 40 : 0) || (forced || row.prop || row.stageOk) && _plSpotNear(P); ok = !!t && _plGoDo(P, t, _plClips(row), row.rest); }
    else { _plPlay(P, _plClips(row), row.rest); ok = true; }
  } catch (e) { ok = false; try { console.error('[pet life]', row.id, e); } catch (x) { /* quiet */ } }
  if (!ok) P.lifeCur = null;
  if (ok) { _plDiary(row); P.lifeRow = row.id; P.lifeAt = performance.now(); P.lifeHold = P.lifeAt + Math.min(12000, 2500 + _plClips(row).reduce((t, c) => t + ((typeof petClipDef === 'function' && petClipDef(c) || {}).ms || 1200), 0)); }
  return ok;
}
function _plPickable(P, row, C) {
  if (!/^(world|you|pets)$/.test(row.how) || C.night && !P.per.night && !row.night || row.need && !(_plThings()[row.need] || []).length) return false;
  if (row.me && !P.me) return false;
  if (!_plSoon(P, row.id, row.cd || 90) || !_plOwned(row)) return false;
  for (const c of _plClips(row)) if (!_plSuits(P, c)) return false;
  if (row.at && !row.run) { const t = _plNear(P, row.at); if (!t && !row.prop && !row.stageOk) return false; if (t && P.me && !_plSeen(t.x, t.y) && !row.prop && !row.stageOk) return false; }
  try { return !!row.when(P, C); } catch (e) { return false; }
}
function petLifeThink(P, W) {
  if (!P || !W || P.wow || P.tx != null || typeof PET_LIFE === 'undefined') return false;
  const now = performance.now();
  if (P.me && _pl.q.length) { const id = _pl.q.shift(), row = PET_LIFE_BY[id]; if (row && _plOwned(row)) { const C = _plCtx(P, W); if (_plStart(P, row, C)) return true; } }
  if (P.lifeNext && now < P.lifeNext) return false;
  P.lifeNext = now + 4000 + Math.random() * 7000;   // a few seconds between ideas: the old habits (sniff, nap, wander) still fill the rest
  if (Math.random() < 0.35) return false;
  const C = _plCtx(P, W), pool = [];
  let sum = 0;
  for (const row of PET_LIFE) if (_plPickable(P, row, C)) { const w = row.w || 1; pool.push([row, w]); sum += w; }
  if (!pool.length) return false;
  let r = Math.random() * sum;
  for (const [row, w] of pool) { r -= w; if (r <= 0) return _plStart(P, row, C); }
  return false;
}
/** Every frame for your companion: what you are up to, measured, and a reaction queued when something changes. Numbers only. */
function petLifeTick(P, W, dt) {
  if (!P || !P.me || typeof _gw === 'undefined') return;
  _plScarfSeason(W);
  const pl = _ptwPlayer(), doing = _plDoing();
  if (pl && pl.moving) { _pl.moveT += dt; _pl.stillT = 0; } else { if (_pl.moveT > 0) _pl.lastMoveT = _pl.moveT; _pl.moveT = 0; _pl.stillT += dt; }
  if (_pl.stillT - dt < 30 && _pl.stillT >= 30 && !doing && Math.hypot(P.x - _gw.px, P.y - _gw.py) < 5) petLifeEvent('still');   // half a minute stood still: it comes to lie on your feet
  // 46: it greets you each time you come into the garden (the first time, and again when you come back from another page: the loop stops while
  // the garden is shut, so a gap of a few seconds between ticks is a return)
  const tNow = performance.now(); if (_pl.lastTick && tNow - _pl.lastTick > 3000 && state && state.view === 'garden') _pl.greeted = 0; _pl.lastTick = tNow;
  if (!_pl.greeted) { _pl.greeted = 1; _pl.built = Date.now(); if (!_ptwVisiting()) petLifeEvent('greet'); }   // clock-ok: a gap
  if (P.pose === 'sleep' && P.busy > 8 && !_ptS().lifeFav && !_ptwVisiting() && _ptwFree(P.x, P.y)) { const p = _ptS(true); p.lifeFav = [Math.round(P.x * 10) / 10, Math.round(P.y * 10) / 10]; _ptNote('life-favspot'); }
  const room = doing === 'room';
  if (room !== _pl.room) { _pl.room = room; petLifeEvent(room ? 'goodbye' : 'welcome-back'); }
  if (W && W.m && _pl.tod && _pl.tod === 'night' && W.m.tod !== 'night') petLifeEvent('morning');
  if (W && W.m) _pl.tod = W.m.tod;
  const F = _gw.fishing, bite = !!(F && F.state === 'bite');
  if (bite && !_pl.bite && P.fishingWatch && P.tx == null && !(P.root && P.root._pcH)) { P.clip('jump', 900, () => P.sit({ eyes: 'sparkle', mouth: 'open' }), { quiet: true }); }
  _pl.bite = bite;
  if (pl && !pl.moving && _pl.lastMoveT > 14 && !P.fishingWatch) { _pl.lastMoveT = 0; if (Math.random() < 0.6) petLifeEvent('tired'); }
  try { if (typeof gardenFacts === 'function' && (_pl.fTick = (_pl.fTick || 0) + 1) % 120 === 1) { const f = gardenFacts(), n = Number(f && f.fished) || 0; if (_pl.fished >= 0 && n > _pl.fished && Math.hypot(P.x - _gw.px, P.y - _gw.py) < 8) _ptNote('life-firstcatch'); _pl.fished = n; } } catch (e) { /* later */ }
}
const _PL_EVENTS = Object.freeze({ still: 'on-your-feet', greet: 'greet', 'welcome-back': 'door-wait', goodbye: 'goodbye-wave', morning: 'morning', tired: 'run-tired', pat: 'happy-spin', photo: 'photo-pose', 'emote-dance': 'dance-with', 'emote-waltz': 'dance-with', 'emote-boogie': 'dance-with', 'emote-sit': 'bench-lap', 'emote-wave': 'wave-back', 'emote-cheer': 'cheer-with', 'emote-bow': 'bow-with', 'emote-clap': 'cheer-with' });
function petLifeEvent(kind) {
  // 47: every third pat in a row (each within a few seconds of the last) and it spins for joy; the pats in between are its little hop
  if (kind === 'pat') { const now = Date.now(); _plPatN = now - (_pl.lastPat || 0) < 6000 ? _plPatN + 1 : 1; _pl.lastPat = now; if (_plPatN % 3) return; }   // clock-ok: a gap
  const id = _PL_EVENTS[kind]; if (!id || typeof PET_LIFE_BY === 'undefined' || !PET_LIFE_BY[id]) return;
  if (_pl.q.includes(id) || _pl.q.length > 3) return;
  _pl.q.push(id);
  const P = typeof _ptw !== 'undefined' && _ptw.pets.find(q => q.me);
  if (kind !== 'pat' && P && !P.wow && !P.guide && !P.fishingWatch && !(typeof petGardenPlayBusy === 'function' && petGardenPlayBusy(P)) && P.busy > 0 && P.tx == null) { P.busy = 0; P.cb = null; P.lifeNext = 0; }
}
/** Play one now (the checks, and the assistant): your companion, wherever it can. -> what happened. */
function petLifeTry(id, o) {
  const row = typeof PET_LIFE_BY !== 'undefined' && (PET_LIFE_BY[id] || PET_LIFE.find(r => r.n === Number(id)));
  if (!row) return { ok: false, why: 'no such row' };
  const P = typeof _ptw !== 'undefined' && _ptw.pets.find(q => (o && o.pack ? !q.me : q.me));
  if (!P) return { ok: false, why: 'no pet out' };
  const W = _ptw.W || _ptwWorld(); if (!W) return { ok: false, why: 'no garden' };
  P.tx = null; P.arrive = null; P.busy = 0; P.cb = null; if (P.clipH) { try { P.clipH.stop(true); } catch (e) { /* gone */ } P.clipH = null; }
  for (const c of _plClips(row)) if (!_plSuits(P, c)) return { ok: false, why: 'does not suit a ' + P.look.species, clip: c };
  const C = _plCtx(P, W);
  _pl.here = !!(o && o.here); let ok = false;
  try { ok = _plStart(P, row, C, true); } finally { _pl.here = false; }
  return { ok, id: row.id, n: row.n, clip: _plClips(row) };
}
function petLifeList() {
  if (typeof PET_LIFE === 'undefined') return [];
  const things = _plThings();
  return PET_LIFE.map(r => ({ n: r.n, id: r.id, name: r.name, group: r.group, how: r.how, trigger: r.says || '', clips: _plClips(r), unlocked: _plOwned(r), unlock: r.unlock || null, hint: r.hint || '', waitsFor: r.need && !(things[r.need] || []).length ? r.need : '' }));
}
/** A new thing learned: the pet throws a little party where it is, and the garden says so. */
function petLifeCelebrate(id) {
  const row = typeof petBookRow === 'function' && petBookRow(id); if (!row || !row.life) return;
  _pl.cel.push(row); if (_pl.cel.length > 1) return;   // several at once (a friend level reached): one party, one line
  setTimeout(() => { const rows = _pl.cel.splice(0); _plParty(rows); }, 250);
}
function _plParty(rows) {
  const row = rows[rows.length - 1], P = typeof _ptw !== 'undefined' && _ptw.pets.find(q => q.me), name = typeof petName === 'function' ? petName() : 'Your pet';
  const list = rows.map(r => r.name), words = list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0];
  if (typeof gardenMessage === 'function') gardenMessage(`${name} learned something new: ${words}! Tap ${name} to play.`, { icon: 'party-popper' });
  if (typeof _fxSound === 'function') _fxSound('chime');
  if (P && !P.wow && P.tx == null) { P.busy = 0; P.cb = null; P.lifeCur = null; P.sit({ eyes: 'sparkle', mouth: 'open' }); _plPlay(P, ['l-party', row.clip || 'proud'], 1.5); }
}
/** Copy-cat (44): another pet nearby saw that, and tries the same a moment later. */
function _plCopy(P, clip) {
  if (!clip || !/^(jump|spin|wiggle|l-wiggle|sniff|l-sniff|stretch|yawn|l-splash|l-dandelion|l-batgrass|dig|roll|pounce|l-greet|l-flakes|l-rainbow)$/.test(clip) || Math.random() > 0.5) return;
  const W = _ptw.W; if (!W) return;
  const Q = W.pets.find(q => q !== P && !_ptwGone(q) && q.tx == null && !q.wow && q.pose !== 'sleep' && !(q.root && q.root._pcH) && Math.hypot(q.x - P.x, q.y - P.y) < 3 && _plSoon(q, 'copycat', 40) && _plSuits(q, clip));
  if (!Q) return;
  _plMark(Q, 'copycat');
  setTimeout(() => { if (Q.tx != null || Q.wow) return; Q.busy = 0; Q.cb = null; Q.lifeCur = null; Q.dir = P.x >= Q.x ? 1 : -1; _plPlay(Q, [clip], 1.5); }, 900);
}
/** Tap your pet: the games you have unlocked together (rows with how 'menu'), as items of the pet's little bubble. */
function petLifeMenuItems(P) {
  if (!P || !P.me || typeof PET_LIFE === 'undefined') return [];
  const icons = { tug: 'paw-print', 'belly-rub': 'heart', 'high-five': 'hand', 'play-dead': 'skull', 'beg-trick': 'sparkles', hoop: 'circle-dot' };
  const words = { tug: 'Tug of war', 'belly-rub': 'Belly rub', 'high-five': 'High five', 'play-dead': 'Play dead', 'beg-trick': 'Pretty please', hoop: 'Through the hoop' };
  return PET_LIFE.filter(r => r.how === 'menu' && _plOwned(r) && _plClips(r).every(c => _plSuits(P, c))).map(r => ({ ic: icons[r.id] || 'paw-print', label: words[r.id], text: words[r.id], run: () => {
    if (typeof gardenBubbleClose === 'function') gardenBubbleClose();
    P.tx = null; P.arrive = null; P.busy = 0; P.cb = null; P.lifeCur = null; _plFacePlayer(P); _plDiary(r);
    if (r.id === 'belly-rub' && typeof petBondGive === 'function') { try { petBondGive('pat'); } catch (e) { /* only a moment */ } }
    if (!_plCome(P, r.id === 'high-five' ? 'five' : 'side', _plClips(r), 1.5, () => P.hearts())) _plPlay(P, _plClips(r), 1.5, () => P.hearts());
  } }));
}

/* ---------- round 2 of the hundred things: the loose ones ---------- */
/** 85: up into the treehouse, and out of its window. The window is a spot on the treehouse's own row (94-garden-lands-0table.js: pet.window, world
 *  pixels from its foot); the pet goes to the foot of the ladder, hops, and is up at the window with the sill in front of it, then comes down. */
function _plTreehouse(P) {
  let row = null, prop = null;
  try { row = (typeof GARDEN_LAND_SIGHTS !== 'undefined' ? GARDEN_LAND_SIGHTS : []).find(r => r.id === 'ld-treehouse'); prop = gardenLandProps().find(p => p.id === 'ld-treehouse'); } catch (e) { return false; }
  if (!prop) return false;
  const win = (prop.pet && prop.pet.window) || (row && row.pet && row.pet.window) || [-24, -126];
  const foot = { x: prop.x + prop.w / 2, y: prop.y + prop.h };
  const near = _pl.here ? { x: P.x, y: P.y } : (_ptwBeside(foot) || (typeof gardenWorldNearestFree === 'function' ? gardenWorldNearestFree(foot.x, foot.y + 0.7, 2.5) : null)); if (!near) return false;
  const up = () => {
    const was = { x: P.x, y: P.y };
    P.dir = 1; P.x = foot.x; P.y = foot.y + 0.04;   // drawn just in front of the treehouse, at its foot
    P.perch = { dx: win[0], up: -win[1] - 4 };   // feet just below the window's bottom edge: the wall and sill hide the body, the head shows in the window
    _plPlay(P, ['l-window'], 0, () => { P.perch = null; P.x = was.x; P.y = was.y; _plPlay(P, ['jump'], 0.6); }, { at: 1 });
    _plSill(P, _plMs('l-window'));
  };
  if (_pl.here) { _plPlay(P, ['jump'], 0, up); return true; }
  P.walkTo(near.x, near.y, false, () => _plPlay(P, ['jump'], 0, up));
  return true;
}
/** 93: the winter scarf. The first shiver of the winter, it puts one on (a pet that already wears something at the neck keeps that), and it stays
 *  on all winter: it is the look's own neck item, so it is saved, shown on the pet page and sent to friends like any accessory. Spring takes it off. */
const PL_SCARF = 'pi-cbandwinter';
function _plScarf(on) {
  try {
    const g = petGet(); if (!g.has) return false;
    const S = _ptS(true), look = Object.assign({}, g.look); delete look.name;
    if (on) { if (look.itemNeck) return false; S.lifeScarf = 1; petSet({ look: Object.assign(look, { itemNeck: PL_SCARF }) }); return true; }
    if (!S.lifeScarf) return false;
    S.lifeScarf = 0; if (look.itemNeck === PL_SCARF) petSet({ look: Object.assign(look, { itemNeck: '' }) });
    return true;
  } catch (e) { return false; }
}
let _plScarfT = 0;
function _plScarfSeason(W) { const t = performance.now(); if (t - _plScarfT < 15000) return; _plScarfT = t; try { if (W && W.m && W.m.season && W.m.season !== 'winter' && _ptS().lifeScarf) _plScarf(false); } catch (e) { /* next time */ } }
/** 100: leaving the garden (the Home button, the garden's Leave button, a page opened from the sidebar): your companion waves first, where you can
 *  see it, and the page changes a moment later. Only for your own tap or key (never a page change the app makes by itself), and not twice in a row. */
let _plByeT = 0, _plInputT = 0;
try { addEventListener('pointerdown', () => { _plInputT = performance.now(); }, true); addEventListener('keydown', () => { _plInputT = performance.now(); }, true); } catch (e) { /* no window */ }
function _plGoodbye(go) {
  try {
    const now = performance.now();
    if (typeof state === 'undefined' || !state || state.view !== 'garden' || now - _plInputT > 800 || now - _plByeT < 5000) return false;
    if (typeof _ptw === 'undefined' || !_ptw.pets || !_pcMotionOn() || typeof _ptwVisiting === 'function' && _ptwVisiting()) return false;
    const P = _ptw.pets.find(q => q.me); if (!P || !P.root || P.wow) return false;
    if (typeof _gwInView === 'function' && _gw && _gw.cam && _gw.cam.w && !_gwInView(P.x, P.y, 0.3)) return false;
    _plByeT = now;
    P.tx = null; P.arrive = null; P.busy = 0; P.cb = null; P.perch = null;
    P.lifeCur = null;
    // more than a step away: it trots over first, so the wave is beside you and to you (the page waits a little longer for it)
    const t = _plTouch(P, 'side'), pl = _ptwPlayer();
    if (t && pl && Math.hypot(t.x - P.x, t.y - P.y) > 0.08 && Math.hypot(t.x - P.x, t.y - P.y) < 4) { P.walkTo(t.x, t.y, true, () => { P.dir = -t.side; _plPlay(P, ['l-wave'], 1.5, null, { at: 1 }); }); setTimeout(go, 1350 + Math.min(1300, Math.hypot(t.x - P.x, t.y - P.y) * 420)); }
    else { _plFacePlayer(P); _plPlay(P, ['l-wave'], 1.5, null, { at: 1 }); setTimeout(go, 1350); }
    return true;
  } catch (e) { return false; }
}
if (typeof setView === 'function') {
  const _plSetView0 = setView;
  setView = function (v) { const self = this, args = arguments; if (v !== 'garden' && _plGoodbye(() => _plSetView0.apply(self, args))) return; return _plSetView0.apply(this, arguments); };
}

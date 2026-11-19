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
     petLifeTry(id)         play one now, wherever it can (the checking tool, tools/pet-life-check.mjs, and the assistant)
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
/** Play clips one after another where it stands, then rest. */
function _plPlay(P, clips, rest, after) {
  clips = clips.filter(c => _plSuits(P, c) && (typeof petClipDef !== 'function' || petClipDef(c) || PET_CLIPS[c]));
  const next = (i) => {
    if (i >= clips.length) { P.sit(); P.busy = rest == null ? 1.2 : rest; if (after) after(); return; }
    const lib = typeof petClipDef === 'function' ? petClipDef(clips[i]) : null, ms = lib ? lib.ms : (PET_CLIPS[clips[i]] || [0, 1200])[1];
    P.clip(clips[i], ms, () => next(i + 1), i > 0 ? { quiet: true } : undefined);
    if (i === 0) _plCopy(P, clips[0]);
  };
  next(0);
}
/** Walk beside a thing, face it, do it. False when there is no way there. */
function _plGoDo(P, t, clips, rest, after, run) {
  const near = t && (t.free ? t : _ptwBeside(t)); if (!near) return false;
  P.walkTo(near.x, near.y, !!run, () => { if (t.x !== near.x) P.dir = t.x >= P.x ? 1 : -1; _plPlay(P, clips, rest, after); });
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
  let ok = false;
  try {
    if (row.run) ok = row.run(P, C, row, forced) !== false;
    else if (row.at) { const t = forced ? (_plNear(P, row.at, 40) || _plSpotNear(P)) : _plNear(P, row.at); ok = !!t && _plGoDo(P, t, _plClips(row), row.rest); }
    else { _plPlay(P, _plClips(row), row.rest); ok = true; }
  } catch (e) { ok = false; try { console.error('[pet life]', row.id, e); } catch (x) { /* quiet */ } }
  if (ok) { _plDiary(row); P.lifeRow = row.id; P.lifeAt = performance.now(); P.lifeHold = P.lifeAt + Math.min(12000, 2500 + _plClips(row).reduce((t, c) => t + ((typeof petClipDef === 'function' && petClipDef(c) || {}).ms || 1200), 0)); }
  return ok;
}
function _plPickable(P, row, C) {
  if (!/^(world|you|pets)$/.test(row.how) || C.night && !P.per.night && !row.night || row.need && !(_plThings()[row.need] || []).length) return false;
  if (row.me && !P.me) return false;
  if (!_plSoon(P, row.id, row.cd || 90) || !_plOwned(row)) return false;
  for (const c of _plClips(row)) if (!_plSuits(P, c)) return false;
  if (row.at && !row.run && !_plNear(P, row.at)) return false;
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
  const pl = _ptwPlayer(), doing = _plDoing();
  if (pl && pl.moving) { _pl.moveT += dt; _pl.stillT = 0; } else { if (_pl.moveT > 0) _pl.lastMoveT = _pl.moveT; _pl.moveT = 0; _pl.stillT += dt; }
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
const _PL_EVENTS = Object.freeze({ greet: 'greet', 'welcome-back': 'door-wait', goodbye: 'goodbye-wave', morning: 'morning', tired: 'run-tired', pat: 'happy-spin', photo: 'photo-pose', 'emote-dance': 'dance-with', 'emote-waltz': 'dance-with', 'emote-boogie': 'dance-with', 'emote-sit': 'bench-lap', 'emote-wave': 'wave-back', 'emote-cheer': 'cheer-with', 'emote-bow': 'bow-with', 'emote-clap': 'cheer-with' });
function petLifeEvent(kind) {
  if (kind === 'pat') _pl.lastPat = Date.now();   // clock-ok: a gap
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
  return { ok: _plStart(P, row, C, true), id: row.id, n: row.n, clip: _plClips(row) };
}
function petLifeList() {
  if (typeof PET_LIFE === 'undefined') return [];
  const things = _plThings();
  return PET_LIFE.map(r => ({ n: r.n, id: r.id, name: r.name, group: r.group, how: r.how, trigger: r.says || '', clips: _plClips(r), unlocked: _plOwned(r), unlock: r.unlock || null, hint: r.hint || '', waitsFor: r.need && !(things[r.need] || []).length ? r.need : '' }));
}
/** A new thing learned: the pet throws a little party where it is, and the garden says so. */
function petLifeCelebrate(id) {
  const row = typeof petBookRow === 'function' && petBookRow(id); if (!row || !row.life) return;
  const P = typeof _ptw !== 'undefined' && _ptw.pets.find(q => q.me), name = typeof petName === 'function' ? petName() : 'Your pet';
  if (typeof gardenMessage === 'function') gardenMessage(`${name} learned something new: ${row.name}!`, { icon: 'party-popper' });
  if (typeof _fxSound === 'function') _fxSound('chime');
  if (P && !P.wow && P.tx == null) { P.busy = 0; P.cb = null; P.sit({ eyes: 'sparkle', mouth: 'open' }); _plPlay(P, ['l-party', row.clip || 'proud'], 1.5); }
}
/** Copy-cat (44): another pet nearby saw that, and tries the same a moment later. */
function _plCopy(P, clip) {
  if (!clip || !/^(jump|spin|wiggle|sniff|stretch|yawn|l-splash|l-dandelion|l-batgrass|dig|roll|pounce|l-greet)$/.test(clip) || Math.random() > 0.5) return;
  const W = _ptw.W; if (!W) return;
  const Q = W.pets.find(q => q !== P && !_ptwGone(q) && q.tx == null && !q.wow && q.pose !== 'sleep' && !(q.root && q.root._pcH) && Math.hypot(q.x - P.x, q.y - P.y) < 3 && _plSoon(q, 'copycat', 40) && _plSuits(q, clip));
  if (!Q) return;
  _plMark(Q, 'copycat');
  setTimeout(() => { if (Q.tx != null || Q.wow) return; Q.busy = 0; Q.cb = null; Q.dir = P.x >= Q.x ? 1 : -1; _plPlay(Q, [clip], 1.5); }, 900);
}
/** Tap your pet: the games you have unlocked together (rows with how 'menu'), as items of the pet's little bubble. */
function petLifeMenuItems(P) {
  if (!P || !P.me || typeof PET_LIFE === 'undefined') return [];
  const icons = { tug: 'paw-print', 'belly-rub': 'heart', 'high-five': 'hand', 'play-dead': 'skull', 'beg-trick': 'sparkles', hoop: 'circle-dot' };
  const words = { tug: 'Tug of war', 'belly-rub': 'Belly rub', 'high-five': 'High five', 'play-dead': 'Play dead', 'beg-trick': 'Pretty please', hoop: 'Through the hoop' };
  return PET_LIFE.filter(r => r.how === 'menu' && _plOwned(r) && _plClips(r).every(c => _plSuits(P, c))).map(r => ({ ic: icons[r.id] || 'paw-print', label: words[r.id], text: words[r.id], run: () => {
    if (typeof gardenBubbleClose === 'function') gardenBubbleClose();
    P.tx = null; P.arrive = null; P.busy = 0; P.cb = null; _plFacePlayer(P); _plDiary(r);
    if (r.id === 'belly-rub' && typeof petBondGive === 'function') { try { petBondGive('pat'); } catch (e) { /* only a moment */ } }
    _plPlay(P, _plClips(r), 1.5, () => P.hearts());
  } }));
}

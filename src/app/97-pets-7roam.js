/* ============================================================
   PETS in your garden (2.23, agent 'pets'). Your companion follows you; up to three
   others you let out (the collection) roam on their own. They sniff flowers, chase
   butterflies, nap in the sun, greet each other, shake off the rain, sleep at night.
   And now and then a rare visitor shows up, waiting for the right lure.

   2.32: it runs on a visit too (your companion, at the same size as at home, in the garden you stand in: the old small follower of the world was all a
   visit had, which looked wrong beside a friend's pet and could not say where it was). The pack stays home, and no rare visitor comes to a garden that is not yours.

   One small loop: requestAnimationFrame only while your garden page is showing and the
   tab is visible; a transform per pet, the limbs are CSS clips (97-pets.css). With
   reduced motion or the Fun level Off the pets stay still: the garden's own sitting
   companion is drawn instead (petGardenWorldOwns false), rare visitors still come.

   THE BEHAVIOUR LIBRARY. Nothing here knows a species. A species' persona (97-pets-0kit.js)
   may list likes: [names]; a behaviour says when it would like to run and what it does:
     PET_BEHAVIOURS[name] = {like (optional: needs this in the persona's likes), when(P, W) -> weight, run(P, W)}
   New behaviour = one entry. P: a roaming pet (say, walkTo, sit, sleep, clip, then). W: {m (the garden's model), rain, night, day, pets}.
   ============================================================ */
const _ptw = { on: false, svg: null, pets: [], key: '', raf: 0, last: 0, enc: null, encKey: '', flies: [], bubble: null, timer: 0 };
const _PTW_NS = 'http://www.w3.org/2000/svg';
/* How many of the pets you let out are about on one visit: this share of visits has one, two, three (never more than you let out). The others are having a lie-down, and take turns. */
const PET_ROAM_ODDS = Object.freeze([0.55, 0.33, 0.12]);
function _ptwMotion() { return _ptMotionOk() && _ptFun() !== 'off'; }
/** True while you are in a friend's garden (a visit, live or the saved copy). */
function _ptwVisiting() { try { return typeof gardenVisitOn === 'function' && !!gardenVisitOn(); } catch (e) { return false; } }
/** While true the garden's own follower stands aside (94-garden-world-0walk.js asks). */
function petGardenWorldOwns() { return _ptw.on && _ptwMotion() && _ptw.pets.length > 0; }
/** Where your pets are in the world, for whatever lives alongside them: [{x, y (cells), species, me (the one that follows you), moving}]. */
function _ptwGone(P) { return !!P.me && typeof gpPetAway === 'function' && gpPetAway(); }   // on a little journey (94-garden-play-1pet.js): it is not here to do anything
function petGardenPositions() { return _ptw.pets.filter(P => !_ptwGone(P)).map(P => ({ x: P.x, y: P.y, species: P.look.species, me: !!P.me, moving: P.tx != null })); }
function _ptwCell(x, y) { const W = GARDEN_WORLD; return { x: x * W.cellW, y: W.sky + y * W.cellH }; }
function _ptwFree(x, y) { try { return gardenWorldFree(x, y, 0.14); } catch (e) { return true; } }
function _ptwPlayer() { return typeof _gw !== 'undefined' && _gw && _gw.on !== false ? { x: _gw.px, y: _gw.py, moving: !!_gw.moving, busy: !!_gw.reel } : null; }
/** A sprite's height in the garden's units: small things stay small, big things never tower over you. */
function _ptwH(id) { const sp = petSpecies(id) || {}; return 24 + 20 * Math.min(1, Number(sp.h) || 0.3); }

/* ---------- a pet in the garden ---------- */
function _ptwNew(look, me) {
  const per = petPersona(look.species), g = document.createElementNS(_PTW_NS, 'g');
  g.setAttribute('class', 'gd-pet ptw' + (me ? ' is-me' : ''));
  g.setAttribute('data-live', '1');   // the loop owns it: the scene's patch puts it back in its row and never removes it
  g.dataset.ptw = look.species;
  const lift = document.createElementNS(_PTW_NS, 'g'), face = document.createElementNS(_PTW_NS, 'g');
  lift.setAttribute('class', 'ptw-lift'); face.setAttribute('class', 'ptw-face');
  lift.appendChild(face); g.appendChild(lift);
  const p = _ptwPlayer() || { x: 8, y: 8 };
  const P = { look, me, per, node: g, face, lift, x: p.x - 1.2 - Math.random() * 2, y: p.y + Math.random(), tx: null, ty: null, dir: 1, pose: '', mood: '', act: '', run: false, speed: 1, cb: null, t: Math.random() * 4, z: -1, cache: {}, cool: 0, busy: 0 };
  if (!_ptwFree(P.x, P.y)) { P.x = p.x; P.y = p.y; }
  P.draw = (pose, mood) => {
    if (P.me && P.pose === 'sleep' && pose !== 'sleep' && typeof gardenLivePet === 'function') gardenLivePet('nap', 'off');
    const k = pose + '|' + (mood ? mood.eyes + mood.mouth + (mood.extra || '') : '');
    if (P.mood === k) return;
    P.mood = k; P.pose = pose; P.lastMood = mood;
    if (!P.cache[k]) P.cache[k] = petSvgGroup(look, { h: _ptwH(look.species), pose, mood: mood || { eyes: 'open', mouth: 'smile' }, cls: 'pt-live pt-fun-' + _ptFun() });
    face.innerHTML = P.cache[k];   // allow-listed ids and numbers only
    P.root = face.firstChild;
    if (P.root) { if (P.act) P.root.classList.add('pt-act-' + P.act); if (P.run) P.root.classList.add('pt-run'); }
  };
  P.clip = (name, ms, then, o) => {
    if (P.me && !P.wow && !(o && o.quiet) && typeof gardenLivePet === 'function' && /^[A-Za-z0-9_-]{1,64}$/.test(String(name))) gardenLivePet('pet', name);   // the others see it (94-garden-live-5pets.js)
    // 2.23: the clip library first (97-pets-tricks-0clips.js); nothing runs for a pet out of view
    const lib = typeof petClipDef === 'function' ? petClipDef(name) : null;
    if (lib && P.root) {
      const was = P.pose, mood = P.lastMood;
      if (lib.pose !== was || lib.face) P.draw(lib.pose, lib.face || mood || { eyes: 'open', mouth: 'smile' });
      let seen = true;
      try { const r = P.node.getBoundingClientRect(); seen = r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight; } catch (e) { seen = true; }
      if (seen && P.root) P.clipH = petClipRun(P.root, name);
      P.busy = lib.ms / 1000; P.cb = () => { if (lib.pose !== was || lib.face) P.draw(was || 'sit', mood || { eyes: 'open', mouth: 'smile' }); if (then) then(); };
      return;
    }
    P.setAct(name); P.busy = (ms || 1200) / 1000; P.cb = () => { P.setAct(''); if (then) then(); };
  };
  P.setAct = (n) => { if (P.root && P.act) P.root.classList.remove('pt-act-' + P.act); P.act = n || ''; if (P.root && n) P.root.classList.add('pt-act-' + n); };
  P.walkTo = (x, y, run, then) => { P.tx = x; P.ty = y; P.run = !!run; P.speed = run ? 2 : 1; P.stuck = 0; P.draw('walk'); if (P.root) P.root.classList.toggle('pt-run', P.run); P.arrive = then || null; };
  P.sit = (mood) => { P.tx = null; P.run = false; P.draw('sit', mood); };
  P.sleep = (s) => { if (P.me && typeof gardenLivePet === 'function') gardenLivePet('nap', 'on'); P.tx = null; P.draw('sleep', { eyes: 'closed', mouth: 'calm', extra: 'zzz' }); P.busy = s; P.cb = null; };
  P.hearts = () => _ptwHearts(P);
  P.draw('sit');
  return P;
}
/* ---------- pets and the world: water, perches, seats ----------
   The owner, 1 Nov 2026: pets should interact with the world and objects. A water pet goes in and swims; a flying pet lands on what is really standing there; a cat takes a bench, a dog goes to a fountain or digs.
   HOW FRIENDS SEE THE SAME, WITH NOTHING NEW ON THE WIRE. Where a pet is goes out as it always did (gl:pp, in tenths of a cell). What it is doing there is worked out from where it is and what stands in the garden: a duck on a water
   cell is swimming, an owl at a perch's point is on that perch. Every screen has the same garden, so every screen draws the same. Perch points are kept to tenths of a cell so the place that is sent lands on them exactly.
   Only open land and open water count (a shut gate, or water past the floats, is not somewhere to go). Moved objects come from the live rows, so a thing the designer moved takes its perch with it. With reduced motion or the Fun level Off none of this runs: the pets stay still. */
const PET_HABIT_BY_SPECIES = Object.freeze({
  duck: ['swim'], goose: ['swim'], penguin: ['swim'], otter: ['swim', 'dig'], axolotl: ['swim'], frog: ['swim'], octopus: ['swim'], capybara: ['swim'], flamingo: ['swim'],
  owl: ['perch'], parrot: ['perch'], wren: ['perch'], robin: ['perch'], phoenix: ['perch'], bat: ['perch'], bee: ['perch'], butterfly: ['perch'],
  cat: ['seat'], fox: ['seat', 'dig'], kitsune: ['seat'], redpanda: ['seat'], raccoon: ['seat', 'drink'], lion: ['seat'], tiger: ['seat', 'drink'], squirrel: ['seat', 'dig'], koala: ['seat'], panda: ['seat'],
  dog: ['drink', 'dig'], wolf: ['drink', 'dig'], fawn: ['drink'], lamb: ['drink'], pony: ['drink'], unicorn: ['drink'], alpaca: ['drink'], goat: ['drink', 'seat'], piglet: ['drink', 'dig'], bear: ['drink'],
  rabbit: ['dig'], hamster: ['dig'], guinea: ['dig'], hedgehog: ['dig'], mole: ['dig'], badger: ['dig'], mouse: ['dig'], ferret: ['dig'], jackalope: ['dig'],
});
function _ptwHabits(id) { const own = PET_HABIT_BY_SPECIES[id]; if (own) return own; const g = (petSpecies(id) || {}).gait; return g === 'fly' ? ['perch'] : g === 'paddle' ? ['swim'] : g === 'scurry' || g === 'hop' ? ['dig'] : g === 'trot' ? ['drink'] : []; }
function _ptwHas(P, h) { return (P.habits || (P.habits = _ptwHabits(P.look.species))).includes(h); }
function _ptwFlier(P) { return P.per.flies || _ptwHas(P, 'perch'); }
/* How high up the top of each drawn thing is (stage pixels above its foot), and for what you can sit on, the seat. From the drawings in 94-garden-lands-2art.js; anything not here goes by its `tall`. */
const PET_TOPS = Object.freeze({ lamp: 33, cross: 44, statue: 56, topiary: 44, gate: 50, cairn: 33, stump: 24, wall: 24, hay: 38, barrels: 30, picnic: 22, mile: 26, finger: 40, seat: 28 });
const PET_SEATS = Object.freeze({ seat: 15, wall: 24, stump: 24, picnic: 22, mile: 26, hay: 38, barrels: 30 });
const PET_NOT_PERCH = new Set(['boat', 'reed-bank', 'old-angler', 'jetty-post', 'ld-bridge', 'ld-rope', 'ld-sunk', 'ld-labyrinth', 'lf-rill', 'land-finds']);
const PET_DRINKS = new Set(['fountain', 'bird-bath', 'mini-pond', 'wishing-well', 'lf-fountain', 'lf-well', 'ld-wish', 'ld-pump']);
const _ptwS = { at: 0, built: 0, key: '', water: null, shore: [], perch: [], seat: [], drink: [], top: new Map() };
const _ptwTenth = (v) => Math.round(v * 10) / 10;
function _ptwSpots() {
  const t = performance.now(); if (_ptwS.water && t - _ptwS.at < 1000) return _ptwS;
  _ptwS.at = t;
  let m = null; try { m = gardenHere(); } catch (e) { return _ptwS; }
  const key = [m.visit ? m.visit.key : 'me', m.plants.length, m.decor.length, m.areas.length, gardenLakeOpenTo(), typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0, gardenPierMore(), _GD_WALK_EXTRA.size, _GD_ICE.size].join('|');
  if (_ptwS.water && _ptwS.key === key && t - _ptwS.built < 30000) return _ptwS;
  _ptwS.key = key; _ptwS.built = t;
  const G = GARDEN_WORLD, water = new Uint8Array(G.cols * G.rows), shore = [], perch = [], seat = [], drink = [], top = new Map(), zoneOk = (x, y) => { const n = gardenZoneOf(Math.floor(x), Math.floor(y)); return !n || m.areas.includes('zn-' + n); };
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) if (gardenIsWater(x, y) && !gardenWaterNo(x, y, m)) water[y * G.cols + x] = 1;
  const wet = (x, y) => x >= 0 && y >= 0 && x < G.cols && y < G.rows && !!water[y * G.cols + x];
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (water[y * G.cols + x] || !zoneOk(x, y) || !gardenWalkable(x, y)) continue;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (wet(x + dx, y + dy) && wet(x + dx * 2, y + dy * 2)) { shore.push({ x: x + 0.5 + dx * 0.25, y: y + 0.5 + dy * 0.25, wx: x + 0.5 + dx * 1.7, wy: y + 0.5 + dy * 1.7 }); break; }
  }
  const add = (id, x, y, z, up, seatUp, name) => {
    if (!zoneOk(x, y)) return;
    const row = { id, x: _ptwTenth(x), y: _ptwTenth(y), z, up: Math.round(up), name };
    if (up >= 14) { perch.push(row); top.set(row.x + ',' + row.y, row); }
    if (seatUp) { const s = Object.assign({}, row, { x: _ptwTenth(x + 0.2), y: _ptwTenth(y + 0.1), up: Math.round(seatUp), seat: 1 }); seat.push(s); top.set(s.x + ',' + s.y, s); }
  };
  let rows = []; try { rows = gardenWorldObjects(m); } catch (e) { rows = []; }
  for (const o of rows) {
    if (PET_NOT_PERCH.has(o.id) || (o.kind === 'plant' && o.height < 28)) continue;
    add(o.uid, o.top.x, o.top.y, o.z, o.top.lift, o.kind === 'decor' && gardenDecor(o.id) && gardenDecor(o.id).effect && gardenDecor(o.id).effect.kind === 'sit' ? o.top.lift : 0, o.name);
    if (PET_DRINKS.has(o.id)) drink.push({ x: o.top.x, y: o.y + o.h, name: o.name });
  }
  for (const p of gardenLandProps()) {
    if (PET_NOT_PERCH.has(p.id) || !p.tall || p.walk) continue;
    const art = String(p.kind || '').replace(/^l[df]-/, ''), x = p.x + p.w / 2, y = p.y + p.h - 0.1;
    add(p.id, x, y, p.y + p.h, PET_TOPS[art] != null ? PET_TOPS[art] : p.tall * 48 * 0.9, PET_SEATS[art] || 0, p.name);
    if (PET_DRINKS.has(p.id)) drink.push({ x, y: p.y + p.h, name: p.name });
  }
  Object.assign(_ptwS, { water, shore, perch, seat, drink, top });
  return _ptwS;
}
function _ptwWet(x, y) { const S = _ptwSpots(), G = GARDEN_WORLD, cx = Math.floor(x), cy = Math.floor(y); return !!S.water && cx >= 0 && cy >= 0 && cx < G.cols && cy < G.rows && !!S.water[cy * G.cols + cx]; }
function _ptwTopAt(x, y) { return _ptwSpots().top.get(_ptwTenth(x) + ',' + _ptwTenth(y)) || null; }
function _ptwMayStand(P, t) { return !!t && (t.seat ? _ptwHas(P, 'seat') : _ptwFlier(P)); }
/** May this pet be here at all? (A friend's copy asks too, before it believes a place.) */
function _ptwCanStand(P, x, y) { return _ptwFlier(P) || _ptwFree(x, y) || (_ptwHas(P, 'swim') && _ptwWetEdge(x, y)) || _ptwMayStand(P, _ptwTopAt(x, y)); }
/** On the water, or at its very edge going in or out: the shore cell's own feet test would stop it a step short. */
function _ptwWetEdge(x, y) { return _ptwWet(x, y) || _ptwWet(x, y + 0.2) || _ptwWet(x, y - 0.2) || _ptwWet(x + 0.2, y) || _ptwWet(x - 0.2, y); }
function _ptwCanStep(P, x, y) {
  if (_ptwFlier(P) || _ptwFree(x, y) || (_ptwHas(P, 'swim') && _ptwWetEdge(x, y))) return true;
  if ((P.up || 0) > 1) return true;   // hopping down
  return _ptwHas(P, 'seat') && P.tx != null && !!_ptwTopAt(P.tx, P.ty) && Math.hypot(P.tx - x, P.ty - y) < 1.7;   // the last hop up
}
/** How it stands where it is, worked out from there alone: {up (px above the ground), sink (px under the water), z (the row it is drawn in)}. Eased, so nothing jumps. */
function _ptwStand(P, dt) {
  const fly = _ptwFlier(P), sits = _ptwHas(P, 'seat'), swims = _ptwHas(P, 'swim');
  if (!fly && !sits && !swims) return { up: 0, sink: 0, z: P.y };
  const t = fly || sits ? _ptwTopAt(P.x, P.y) : null, on = t && _ptwMayStand(P, t) ? t : null, goal = (fly || sits) && P.tx != null ? _ptwTopAt(P.tx, P.ty) : null;
  let want = on && P.tx == null ? on.up : 0;
  if (fly && P.tx != null) want = Math.max(24, goal ? goal.up : 0, Math.hypot(P.tx - P.x, P.ty - P.y) > 0.4 ? 26 : 0);   // in the air
  else if (sits && P.tx != null && goal && Math.hypot(P.tx - P.x, P.ty - P.y) < 0.9) want = goal.up;   // the hop up
  const rate = _ptwMotion() ? 150 * dt : 1e9;
  P.up = (P.up || 0) + Math.max(-rate, Math.min(rate, want - (P.up || 0)));
  const wet = swims && !(P.up > 1) && _ptwWet(P.x, P.y);
  if (wet !== !!P.wet) _ptwSwimSet(P, wet);
  return { up: P.up, sink: wet ? P.sinkPx : 0, z: on && P.tx == null ? on.z + 0.01 : P.y };
}
let _ptwClipN = 0;
/** On the water: the lower part of it is under the surface, and there are rings round it. */
function _ptwSwimSet(P, on) {
  P.wet = on;
  if (!P.clipId) {
    P.clipId = 'ptw-w' + (++_ptwClipN); P.sinkPx = Math.round(_ptwH(P.look.species) * 0.3);
    const c = document.createElementNS(_PTW_NS, 'clipPath'), r = document.createElementNS(_PTW_NS, 'rect'), w = document.createElementNS(_PTW_NS, 'g');
    c.setAttribute('id', P.clipId); r.setAttribute('x', '-120'); r.setAttribute('y', '-300'); r.setAttribute('width', '240'); r.setAttribute('height', String(300 - P.sinkPx)); c.appendChild(r); P.node.insertBefore(c, P.node.firstChild);
    w.setAttribute('class', 'ptw-ripple'); const rx = Math.round(_ptwH(P.look.species) * 0.5);
    w.innerHTML = `<ellipse cx="0" cy="${-P.sinkPx}" rx="${rx + 3}" ry="3.4" fill="#ffffff" fill-opacity="0.22"/><ellipse class="ptw-ring" cx="0" cy="${-P.sinkPx}" rx="${rx + 2}" ry="3" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="1.100"/>`;
    P.node.appendChild(w); P.rip = w;
  }
  if (on) P.lift.setAttribute('clip-path', `url(#${P.clipId})`); else P.lift.removeAttribute('clip-path');
  P.rip.style.display = on ? '' : 'none';
}
/** Things near enough to go to: a pet that follows you stays near you, the others go where they like. */
function _ptwNearby(P, list, xy) {
  const pl = P.me ? _ptwPlayer() : null, cx = pl ? pl.x : P.x, cy = pl ? pl.y : P.y, R = pl ? 4.6 : 13, out = [];
  for (const q of list) { const a = xy ? xy(q) : q; if (Math.hypot(a.x - cx, (a.y - cy) * 1.4) <= R) out.push(q); }   // (measured as _ptwComeAlong measures it: it must not be called back before it gets there)
  return out;
}
const _ptwPick1 = (list) => list[Math.floor(Math.random() * list.length)];
function _ptwTaken(row, P) { return _ptw.pets.concat(typeof _gllRoams !== 'undefined' ? _gllRoams.map(R => R.P) : []).some(q => q !== P && ((q.tx === row.x && q.ty === row.y) || (q.x === row.x && q.y === row.y))); }
function _ptwSoon(P, id, secs) { const t = performance.now(), k = 'at_' + id; if (P[k] && t - P[k] < secs * 1000) return false; return true; }
/* ---------- the behaviour library ---------- */
const PET_BEHAVIOURS = {
  swim: { when: (P) => (_ptwHas(P, 'swim') && _ptwSoon(P, 'swim', 35) && _ptwNearby(P, _ptwSpots().shore).length ? 6 : 0), run(P) {
    P.at_swim = performance.now();
    const list = _ptwNearby(P, _ptwSpots().shore); if (!list.length) { P.busy = 1; return; }
    list.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
    const s = _ptwPick1(list.slice(0, 6)), pad = (n) => {
      if (n <= 0) { P.walkTo(s.x, s.y, false, () => { P.sit(); P.clip('shake', 900, () => { P.sit(); P.busy = 1; }); }); return; }
      for (let i = 0; i < 8; i++) { const x = s.wx + (Math.random() - 0.5) * 5, y = s.wy + (Math.random() - 0.5) * 2.6; if (_ptwWet(x, y) && _ptwWet(x, y + 0.4) && _ptwWet(x + 0.4, y) && _ptwWet(x - 0.4, y)) { P.walkTo(x, y, false, () => { P.sit(); P.busy = 2 + Math.random() * 3; P.cb = () => pad(n - 1); }); return; } }
      pad(0);
    };
    P.walkTo(s.x, s.y, false, () => { P.walkTo(s.wx, s.wy, false, () => { P.sit(); P.busy = 1.5 + Math.random() * 2; P.cb = () => pad(2 + Math.floor(Math.random() * 2)); }); });
  } },
  perch: { when: (P) => (_ptwFlier(P) && _ptwSoon(P, 'perch', 12) && _ptwNearby(P, _ptwSpots().perch).length ? 7 : 0), run(P) {
    P.at_perch = performance.now();
    const list = _ptwNearby(P, _ptwSpots().perch).filter(q => !_ptwTaken(q, P)); if (!list.length) { P.busy = 1; return; }
    const t = _ptwPick1(list);
    P.walkTo(t.x, t.y, false, () => { P.dir = Math.random() < 0.5 ? 1 : -1; P.sit(); const stay = 7 + Math.random() * 12; if (Math.random() < 0.5 && typeof petClipSuits === 'function' && petClipSuits('preen', P.look.species)) P.clip('preen', 1500, () => { P.sit(); P.busy = stay; }, { quiet: true }); else P.busy = stay; });
  } },
  seat: { when: (P, W) => (_ptwHas(P, 'seat') && !W.rain && _ptwSoon(P, 'seat', 25) && _ptwNearby(P, _ptwSpots().seat).length ? 5 : 0), run(P) {
    P.at_seat = performance.now();
    const list = _ptwNearby(P, _ptwSpots().seat).filter(q => !_ptwTaken(q, P)); if (!list.length) { P.busy = 1; return; }
    const t = _ptwPick1(list), beside = [[0, 0.75], [-0.9, 0.5], [0.9, 0.5], [0, 1.1], [-1.2, 0.2], [1.2, 0.2]].map(([a, b]) => [t.x + a, t.y + b]).find(([a, b]) => _ptwFree(a, b));
    if (!beside) { P.busy = 1; return; }
    P.walkTo(beside[0], beside[1], false, () => { P.walkTo(t.x, t.y, false, () => { P.dir = Math.random() < 0.5 ? 1 : -1; P.sit({ eyes: 'happy', mouth: 'smile' }); P.busy = 8 + Math.random() * 14; }); });
  } },
  drink: { when: (P) => (_ptwHas(P, 'drink') && _ptwSoon(P, 'drink', 30) && (_ptwNearby(P, _ptwSpots().drink).length || _ptwNearby(P, _ptwSpots().shore).length) ? 4 : 0), run(P) {
    P.at_drink = performance.now();
    const S = _ptwSpots(), a = _ptwNearby(P, S.drink), b = _ptwNearby(P, S.shore), t = a.length ? _ptwPick1(a) : _ptwPick1(b); if (!t) { P.busy = 1; return; }
    const near = [[0, 0.45], [-0.8, 0.3], [0.8, 0.3], [0, 0.9], [-1.2, 0.3], [1.2, 0.3]].map(([q, w]) => [t.x + q, t.y + w]).find(([q, w]) => _ptwFree(q, w)); if (!near) { P.busy = 1; return; }
    P.walkTo(near[0], near[1], false, () => { P.sit(); P.dir = t.x >= P.x ? 1 : -1; P.clip('sniff', 2200, () => { P.sit(); if (Math.random() < 0.4) P.hearts(); P.busy = 1; }); });
  } },
  dig: { when: (P, W) => (_ptwHas(P, 'dig') && !W.rain && _ptwSoon(P, 'dig', 45) && typeof petClipSuits === 'function' && petClipSuits('dig', P.look.species) ? 2.5 : 0), run(P) {
    P.at_dig = performance.now();
    for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28, x = P.x + Math.cos(a) * 1.8, y = P.y + Math.sin(a) * 1.2; if (_ptwFree(x, y) && !gardenLandPathAt(Math.floor(x), Math.floor(y)) && !(gardenLandCell(Math.floor(x), Math.floor(y)) || {}).lane) { P.walkTo(x, y, false, () => { P.sit(); P.clip('dig', 2000, () => { P.sit(); P.busy = 1; }); }); return; } }
    P.busy = 1;
  } },
  wander: { when: () => 3, run(P) {
    for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28, d = 1.5 + Math.random() * 3.5, x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d * 0.7; if (_ptwFree(x, y)) { P.walkTo(x, y, false, () => { P.sit(); P.busy = 1 + Math.random() * 3; }); return; } }
    P.busy = 2;
  } },
  idle: { when: () => 3, run(P) { const acts = P.per.acts, n = typeof petIdlePick === 'function' ? petIdlePick(P.look.species, P.per) : acts[Math.floor(Math.random() * acts.length)], lib = typeof petClipDef === 'function' ? petClipDef(n) : null, c = lib ? [n, lib.ms] : PET_CLIPS[n] || PET_CLIPS.look; P.sit(); P.clip(c[0], c[1], () => { P.sit(); P.busy = 1 + Math.random() * 2; }); } },
  flowers: { like: 'flowers', when: (P, W) => (W.blooms.length ? 2.4 : 0), run(P, W) {
    const f = W.blooms[Math.floor(Math.random() * W.blooms.length)];
    const near = [[-0.9, 0.2], [0.9, 0.2], [0, 0.9], [-0.6, 0.7], [0.6, 0.7]].map(([a, b]) => [f.x + 0.5 + a, f.y + 0.5 + b]).find(([a, b]) => _ptwFree(a, b));
    if (!near) { P.busy = 1; return; }
    P.walkTo(near[0], near[1], false, () => { P.sit(); P.dir = f.x + 0.5 >= P.x ? 1 : -1; P.clip('sniff', 2400, () => { if (Math.random() < 0.4) P.hearts(); P.busy = 1; }); });
  } },
  butterflies: { like: 'butterflies', when: (P, W) => (W.day && !W.rain && W.m.season !== 'winter' && !_ptw.flies.length ? 1.6 : 0), run(P) {
    const F = _ptwFly(P); if (!F) { P.busy = 1; return; }
    const leg = (n) => {
      if (n <= 0 || !F.alive) { P.sit({ eyes: 'happy', mouth: 'open' }); P.clip('jump', 800, () => { P.sit(); P.busy = 2; }); return; }
      const x = F.x + (Math.random() - 0.5), y = F.y + 0.4;
      P.walkTo(_ptwFree(x, y) ? x : P.x, _ptwFree(x, y) ? y : P.y, true, () => { P.sit({ eyes: 'open', mouth: 'open' }); P.clip('pounce', 700, () => leg(n - 1)); });
    };
    leg(2 + Math.floor(Math.random() * 2));
  } },
  sun: { like: 'sun', when: (P, W) => (W.day && !W.rain ? 4 * P.per.nap : 0), run(P) { P.sleep(14 + Math.random() * 16); } },
  friends: { like: 'friends', when: (P, W) => (W.pets.length > 1 ? 1.6 : 0), run(P, W) {
    const others = W.pets.filter(q => q !== P), o = others[Math.floor(Math.random() * others.length)];
    P.walkTo(o.x + (o.x > P.x ? -1 : 1), o.y + 0.1, true, () => {
      P.sit({ eyes: 'happy', mouth: 'open' }); P.dir = o.x >= P.x ? 1 : -1;
      P.clip('wiggle', 1500, () => { P.hearts(); P.busy = 2; });
      if (!o.tx && o.pose !== 'sleep' && o.busy < 1) { o.sit({ eyes: 'happy', mouth: 'open' }); o.dir = -P.dir; o.clip('jump', 800, () => { o.sit(); o.busy = 1; }); }
    });
  } },
};
function _ptwPick(P, W) {
  const likes = P.per.likes, list = [];
  let sum = 0;
  for (const B of Object.values(PET_BEHAVIOURS)) { if (B.like && !likes.includes(B.like)) continue; const w = B.when(P, W); if (w > 0) { list.push([B, w]); sum += w; } }
  let r = Math.random() * sum;
  for (const [B, w] of list) { r -= w; if (r <= 0) { B.run(P, W); return; } }
  P.busy = 2;
}
/* ---------- the world around them ---------- */
function _ptwWorld() {
  let m = null;
  try { m = typeof gardenHere === 'function' ? gardenHere() : gardenModel(); } catch (e) { return null; }   // (2.32: the garden you stand in; on a visit it is theirs)
  const rain = !!(m.rain && m.rain.now);
  return { m, rain, night: m.tod === 'night', day: m.tod === 'day', pets: _ptw.pets, blooms: (m.plants || []).filter(p => p.stage >= 3 && p.def && ['flower', 'wild', 'herb', 'exotic'].includes(p.def.cat)).slice(0, 40) };
}
/** Your companion comes along, whatever it was up to: it wakes, leaves off and keeps re-aiming as you walk. Too far, or stuck behind something, and it hops to your heel. True while it is on its way. */
function _ptwComeAlong(P) {
  const pl = P.me && !P.wow ? _ptwPlayer() : null; if (!pl) return false;
  const d = Math.hypot(pl.x - P.x, (pl.y - P.y) * 1.4);
  if (d > 9 || P.lost) {
    P.lost = false;
    const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(pl.x - 0.8, pl.y + 0.3, 2) : null;
    if (f) { P.x = f.x; P.y = f.y; P.tx = null; P.z = -1; }
  }
  if (d <= (pl.moving ? 2 : 5)) return false;
  if (P.busy > 0) { P.busy = 0; P.cb = null; if (P.act) P.setAct(''); }
  const a = Math.atan2(P.y - pl.y, P.x - pl.x);
  P.walkTo(pl.x + Math.cos(a) * 1.1, pl.y + Math.sin(a) * 0.7, d > 4);
  return true;
}
/** It has noticed a creature (94-garden-life-4react.js): watch, sniff, give chase. True while that is what it is doing. */
function _ptwLifeGoal(P, dt) {
  if (!P.me || P.wow || typeof gardenLifePetGoal !== 'function') return false;
  const g = gardenLifePetGoal(P, dt);
  if (!g) { if (P.lifeGoal) { P.lifeGoal = false; P.tx = null; P.run = false; P.setAct(''); P.sit(); P.busy = 0.6; } return false; }
  P.lifeGoal = true; P.busy = 0; P.cb = null;
  const G = GARDEN_WORLD, d = Math.hypot((g.x - P.x) * G.cellW, (g.y - P.y) * G.cellH);
  if (d <= (g.near || 8) || g.near >= 999) { if (P.tx != null || P.pose !== 'sit') { P.tx = null; P.run = false; P.sit({ eyes: 'open', mouth: 'open' }); } return true; }
  P.walkTo(g.x, g.y, !!g.fast); P.arrive = () => {};
  return true;
}
function _ptwThink(P, W, dt) {
  if (P.me && !P.wow && typeof petCueCheck === 'function' && petCueCheck('garden')) return;   // the assistant asked: a dozing pet wakes for it
  if (_ptwLifeGoal(P, dt)) return;
  if (_ptwComeAlong(P)) return;
  if (P.busy > 0) { P.busy -= dt; if (P.busy <= 0 && P.cb) { const c = P.cb; P.cb = null; c(); } if (P.busy > 0) return; }
  if (P.tx != null) return;
  if (P.wow) { P.busy = 0.5; return; }   // 2.23: in the middle of something wonderful
  const pl = _ptwPlayer();
  if (P.me && pl && (pl.moving || pl.busy)) { P.sit(); P.busy = 0.6; return; }
  if (P.me && typeof petSurpriseMaybe === 'function' && !_ptwVisiting() && !(_gw && _gw.reel) && petSurpriseMaybe('garden', 8)) return;
  if (P.pose === 'sleep' && W.night && !P.per.night) { P.busy = 12; return; }
  if (W.night && !P.per.night) { P.sleep(30); return; }   // bedtime
  if (W.rain && Math.random() < 0.35) { P.sit(); P.clip('shake', 900, () => { P.clip('shiver', 1800, () => { P.busy = 1; }); }); return; }
  if (W.m.season === 'winter' && !W.rain && Math.random() < 0.12) { P.sit({ eyes: 'happy', mouth: 'open' }); P.clip('jump', 800, () => { P.sit(); P.busy = 1; }); return; }
  _ptwPick(P, W);
}
function _ptwStep(P, dt, t) {
  if (P.tx != null) {
    const W = GARDEN_WORLD, dx = (P.tx - P.x) * W.cellW, dy = (P.ty - P.y) * W.cellH, d = Math.hypot(dx, dy);
    if (d < 3) { P.x = P.tx; P.y = P.ty; P.tx = null; P.run = false; const c = P.arrive; P.arrive = null; if (P.root) P.root.classList.remove('pt-run'); if (c) c(); else { P.sit(); P.busy = 0.5; } }
    else {
      const sp = Math.min(d, 44 * P.per.speed * P.speed * dt), nx = P.x + dx / d * sp / W.cellW, ny = P.y + dy / d * sp / W.cellH;
      if (Math.abs(dx) > 3) P.dir = dx > 0 ? 1 : -1;
      if (_ptwCanStep(P, nx, ny)) { P.x = nx; P.y = ny; }
      else if (_ptwCanStep(P, nx, P.y)) P.x = nx;
      else if (_ptwCanStep(P, P.x, ny)) P.y = ny;
      else if (++P.stuck > 20) { P.tx = null; P.arrive = null; P.run = false; P.sit(); P.busy = 1; if (P.me) { P.lost = true; P.busy = 0.2; } }
    }
  }
  const off = gardenCull(P, P.node, P.x, P.y);
  const T = _ptwStand(P, Math.min(0.2, dt || 0));
  if (off && P.node.isConnected) return;   // (far from the view: it carries on with its day, off the page)
  const pos = _ptwCell(P.x, P.y), tf = `translate(${pos.x.toFixed(1)} ${(pos.y - T.up + T.sink).toFixed(1)})`;
  if (tf !== P.tf) { P.tf = tf; P.node.setAttribute('transform', tf); P.node.setAttribute('data-z', (T.z + 0.002).toFixed(2)); }
  const fd = P.dir < 0 ? 'scale(-1 1)' : '';
  if (fd !== P.fd) { P.fd = fd; P.face.setAttribute('transform', fd); }
  const z = Math.floor(T.z * 2);
  if (z !== P.z || !P.node.isConnected) { P.z = z; _ptwPlace(P.node, T.z); }
}
function _ptwPlace(node, y) { if (typeof _gwPlace === 'function') _gwPlace(node, y); else { const l = _ptw.svg && _ptw.svg.querySelector('.gd-objects'); if (l && !node.isConnected) l.appendChild(node); } }
function _ptwHearts(P) {
  const l = _ptw.svg && _ptw.svg.querySelector('.gd-actors'); if (!l) return;
  const pos = _ptwCell(P.x, P.y), g = document.createElementNS(_PTW_NS, 'g');
  g.setAttribute('class', 'ptw-hearts'); g.setAttribute('transform', `translate(${pos.x.toFixed(1)} ${(pos.y - _ptwH(P.look.species) - 3).toFixed(1)})`);
  g.innerHTML = '<g class="ptw-h1"><path d="M0 4C-6 0-6-4-3-5c1.500-.400 2.500.400 3 1.500.500-1.100 1.500-1.900 3-1.500 3 1 3 5-3 9z" fill="#f2607a"/></g><g class="ptw-h2"><path transform="translate(7 -3) scale(.7)" d="M0 4C-6 0-6-4-3-5c1.500-.400 2.500.400 3 1.500.500-1.100 1.500-1.900 3-1.500 3 1 3 5-3 9z" fill="#f58aa0"/></g>';
  l.appendChild(g); setTimeout(() => g.remove(), 1300);
}
/* a butterfly to chase, decorative: it flutters off when it has had enough */
function _ptwFly(P) {
  const l = _ptw.svg && _ptw.svg.querySelector('.gd-actors'); if (!l) return null;
  const F = { x: P.x + 2 * (Math.random() < 0.5 ? -1 : 1), y: P.y, a: Math.random() * 6, alive: true, life: 8, node: document.createElementNS(_PTW_NS, 'g') };
  const c = ['#f08fb3', '#f6c63a', '#7cb2ea', '#f2a65a'][Math.floor(Math.random() * 4)];
  F.node.setAttribute('class', 'ptw-fly');
  F.node.innerHTML = `<g class="ptw-fly-l"><ellipse cx="-3" cy="-1.200" rx="3" ry="4" fill="${c}"/></g><g class="ptw-fly-r"><ellipse cx="3" cy="-1.200" rx="3" ry="4" fill="${c}"/></g><ellipse cx="0" cy="0" rx=".7" ry="2.600" fill="#3a2e38"/>`;
  l.appendChild(F.node); _ptw.flies.push(F);
  return F;
}
function _ptwFlies(dt, t) {
  for (const F of _ptw.flies) {
    F.life -= dt; F.a += dt * 1.1;
    F.x += Math.cos(F.a * 1.7) * dt * 1.5; F.y += Math.sin(F.a * 1.1) * dt * 0.9;
    F.x = Math.max(1, Math.min(GARDEN_WORLD.cols - 2, F.x)); F.y = Math.max(1, Math.min(GARDEN_WORLD.rows - 2, F.y));
    const pos = _ptwCell(F.x, F.y);
    F.node.setAttribute('transform', `translate(${pos.x.toFixed(1)} ${(pos.y - 18 - Math.sin(t * 3 + F.a) * 4).toFixed(1)})`);
    if (F.life <= 0) { F.alive = false; F.node.remove(); }
  }
  if (_ptw.flies.some(f => !f.alive)) _ptw.flies = _ptw.flies.filter(f => f.alive);
}

/* ---------- a rare visitor ---------- */
function _ptwEncounter(W) {
  const E = _ptwVisiting() ? null : petEncounterNow(W.m), key = E ? E.key : '';
  if (key === _ptw.encKey) return;
  _ptw.encKey = key;
  if (_ptw.enc) { _ptw.enc.node.remove(); _ptw.enc = null; _ptwBubbleClose(); }
  if (!E) return;
  // a free spot, the same on every device
  const G = GARDEN_WORLD; let rs = E.h, cell = null;
  const rnd = () => ((rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 40 && !cell; i++) { const x = 1 + Math.floor(rnd() * (G.cols - 2)), y = 1 + Math.floor(rnd() * (G.rows - 2)); if (_ptwFree(x, y) && (typeof gardenAreaOpenAt !== 'function' || gardenAreaOpenAt(x, y))) cell = { x: x + 0.5, y: y + 0.6 }; }
  if (!cell) return;
  const look = petDefault(E.id), g = document.createElementNS(_PTW_NS, 'g'), pos = _ptwCell(cell.x, cell.y);
  g.setAttribute('class', 'gd-pet ptw ptw-wild'); g.setAttribute('data-live', '1'); g.dataset.enc = E.id;
  g.setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`); g.setAttribute('data-z', cell.y.toFixed(2));
  g.innerHTML = `<g class="ptw-glow"><ellipse cx="0" cy="0" rx="22" ry="8" fill="#fff4c0" opacity=".55"/></g>` + petSvgGroup(look, { h: _ptwH(E.id), pose: 'sit', mood: { eyes: 'open', mouth: 'smile' }, cls: _ptwMotion() ? 'pt-live pt-fun-full pt-act-look' : '' })
    + `<g class="ptw-sparks"><path transform="translate(-14 -${_ptwH(E.id) + 2})" d="M0-4L1-1L4 0L1 1L0 4L-1 1L-4 0L-1-1z" fill="#f6d35e"/><path transform="translate(13 -${_ptwH(E.id) - 6})" d="M0-3L.8-.8L3 0L.8 .8L0 3L-.8 .8L-3 0L-.8-.8z" fill="#fff4c0"/></g>`;
  _ptwPlace(g, cell.y);
  _ptw.enc = { E, node: g, cell };
}
function _ptwBubbleClose() { if (_ptw.bubble) { _ptw.bubble.remove(); _ptw.bubble = null; } }
/** You clicked a rare visitor: with the lure it is yours; without, it asks for it (a picture, and a way to get one). */
function _ptwEncClick() {
  const e = _ptw.enc; if (!e) return;
  const act = () => {
    const r = petEncounterMeet(e.E.id);
    if (r.ok) { e.node.remove(); _ptw.enc = null; _ptwBubbleClose(); return; }
    _ptDeny(e.node, { say: 'It wants the right lure' });
    _ptwBubble(e);
  };
  if (typeof gardenWalkToPoint === 'function') { const beside = [[-1, 0.5], [1, 0.5], [0, 1], [-1, -0.2], [1, -0.2]].map(([a, b]) => ({ x: e.cell.x + a, y: e.cell.y + b })).find(q => _ptwFree(q.x, q.y)) || e.cell;   // you stop next to it, not on it
    const near = _gw && Math.hypot(_gw.px - e.cell.x, _gw.py - e.cell.y) < 1.8; if (near) { act(); return; }
    if (gardenWalkToPoint(beside, act, { radius: 1.6 })) return; }
  act();
}
function _ptwBubble(e) {
  _ptwBubbleClose();
  const l = PET_LURES.find(x => x.id === e.E.lure), box = _ptw.svg && _ptw.svg.parentElement;
  if (!l || !box) return;
  const b = _ptEl('div', 'ptw-bubble');
  const held = petLureHave(l.id), art = _ptEl('span', 'ptw-bubble-a'); art.innerHTML = petTreatSvg(l.art, 34); art.setAttribute('data-tip', l.label); b.appendChild(art);
  const get = uiButton({ label: '', icon: 'plus', kind: 'secondary', size: 'sm', tip: 'Get ' + l.label.toLowerCase(), run: () => {
    const r = petLureBuy(l.id);
    if (!r.ok) { _ptDeny(get, { kind: r.why === 'coins' ? 'coins' : '', badge: r.need, say: 'Not enough ' + r.why }); return; }
    const m = petEncounterMeet(e.E.id);
    if (m.ok) { e.node.remove(); _ptw.enc = null; _ptwBubbleClose(); }
  } });
  get.appendChild(_ptCostIcon(l.treats ? 'treats' : 'coins', l.treats || l.coins, 13));
  b.appendChild(get);
  if (held) b.classList.add('has-lure');
  const rb = box.getBoundingClientRect(), rn = e.node.getBoundingClientRect();
  b.style.left = (rn.left - rb.left + rn.width / 2) + 'px'; b.style.top = (rn.top - rb.top - 8) + 'px';
  if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
  box.appendChild(b);
  _ptw.bubble = b;
  clearTimeout(_ptw.bubbleT); _ptw.bubbleT = setTimeout(_ptwBubbleClose, 7000);
}

/* ---------- start, stop, the loop ---------- */
function _ptwRosterKey() { const g = petGet(); return g.has && g.on ? JSON.stringify([g.look, g.name, _ptwVisiting(), _ptwMotion(), petPackLooks().map(l => [l.species, l.coat, l.marks])]) : ''; }   // (reduced motion switched on: they sit down at once)
function _ptwBuild() {
  for (const P of _ptw.pets) P.node.remove();
  _ptw.pets = [];
  const g = petGet();
  if (!g.has || !g.on || !_ptwMotion()) return;
  _ptw.pets.push(_ptwNew(petWithItems(g.look, 'me'), true));
  if (!_ptwVisiting()) for (const l of _ptwOutToday()) _ptw.pets.push(_ptwNew(l, false));   // (the pack stays home: nobody else would see it)
}
/** Who of the pack is about on this visit: chosen once when you come in, so nobody vanishes while you are here. */
function _ptwOutToday() {
  const all = petPackLooks(), key = all.map(l => l.species).join(',');
  if (all.length < 2) return all;
  if (_ptw.outKey !== key || !_ptw.out) {
    let r = Math.random(), n = 1;
    PET_ROAM_ODDS.some((p, i) => { if (r < p) { n = i + 1; return true; } r -= p; return false; });
    _ptw.outKey = key; _ptw.out = all.map(l => [Math.random(), l.species]).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
  }
  return all.filter(l => _ptw.out.includes(l.species));
}
function _ptwFrame(now) {
  _ptw.raf = 0;
  if (!_ptw.on) return;
  if (!_ptw.svg || !_ptw.svg.isConnected || document.hidden) return;   // the check below starts it again
  // calm (94-garden-world-0walk.js _gwCalm): nobody is looking, so the pets stand where they are and this looks in four times a second
  if (typeof _gwCalm !== 'undefined' && _gwCalm.on) { _ptw.last = 0; if (typeof gardenLivePets === 'function') gardenLivePets(_ptw.pets); if (_ptw.pets.length) _ptw.idleT = setTimeout(() => { _ptw.idleT = 0; if (_ptw.on && !_ptw.raf && !document.hidden) _ptw.raf = requestAnimationFrame(_ptwFrame); }, 250); return; }
  const dt = Math.min(0.2, (now - (_ptw.last || now)) / 1000); _ptw.last = now;
  _ptw.tThink = (_ptw.tThink || 0) - dt;
  if (_ptw.tThink <= 0) { _ptw.tThink = 0.25; _ptw.W = _ptwWorld(); if (_ptw.W) _ptwEncounter(_ptw.W); }
  const W = _ptw.W;
  let going = _ptw.flies.length > 0;
  if (W) for (const P of _ptw.pets) { if (_ptwGone(P)) continue; _ptwThink(P, W, dt); _ptwStep(P, dt, now / 1000); if (P.tx != null) going = true; }
  if (_ptw.pets.length && typeof gardenLivePets === 'function') gardenLivePets(_ptw.pets);   // (2.32) where they really are, to who is in this garden with you
  if (_ptw.flies.length) _ptwFlies(dt, now / 1000);
  // walking: every frame. Sitting about: a few looks a second is plenty (their limbs are CSS). Nobody out: _ptwCheck looks in once a second
  if (going) _ptw.raf = requestAnimationFrame(_ptwFrame);
  else if (_ptw.pets.length) _ptw.idleT = setTimeout(() => { _ptw.idleT = 0; if (_ptw.on && !_ptw.raf && !document.hidden) _ptw.raf = requestAnimationFrame(_ptwFrame); }, 110);
}
function _ptwClick(ev) {
  const t = ev.target && ev.target.closest ? ev.target.closest('.ptw') : null;
  if (!t) return;
  ev.stopImmediatePropagation(); ev.preventDefault();
  if (ev.type !== 'pointerdown') return;
  if (t.classList.contains('ptw-wild')) { _ptwEncClick(); return; }
  const P = _ptw.pets.find(q => q.node === t);
  if (!P) return;
  if (P.me) { const r = petPat(); if (r.ok && typeof _ptCheer === 'function') { /* the pet's joy is the feedback */ } if (typeof petBookTick === 'function') { const tt = petBookTick('pat'); for (const id of tt.secret) petSecretReveal(id); } }
  P.tx = null; P.sit({ eyes: 'happy', mouth: 'open' }); P.hearts();
  P.clip('jump', 800, () => { P.sit(); P.busy = 1.5; }, { quiet: true });
}
function _ptwCheck() {
  const onPage = typeof state !== 'undefined' && state && (String(state.view || '') === 'garden' || _ptwVisiting()) && typeof _gdp !== 'undefined' && _gdp && _gdp.svg && _gdp.svg.isConnected;
  if (!onPage) { if (_ptw.on) _ptwStop(); _ptw.out = null; return; }
  if (_ptw.svg !== _gdp.svg) { _ptwStop(); _ptw.svg = _gdp.svg; _ptw.on = true; _ptw.key = ''; for (const type of ['pointerdown', 'pointerup', 'click']) _ptw.svg.addEventListener(type, _ptwClick, true); }
  const key = _ptwRosterKey();
  if (key !== _ptw.key) { _ptw.key = key; _ptwBuild(); }
  // 2.23: a secret that comes true while you are out in the garden with your pet
  if (typeof petBookTick === 'function' && (_ptw.bookT = (_ptw.bookT || 0) + 1) % 60 === 5 && _ptw.pets.length) { const tt = petBookTick(''); for (const id of tt.secret) petSecretReveal(id); }
  for (const P of _ptw.pets) if (!P.node.isConnected) { P.z = -1; P.tf = null; _ptwPlace(P.node, P.y); }
  if (_ptw.enc && !_ptw.enc.node.isConnected) _ptwPlace(_ptw.enc.node, _ptw.enc.cell.y);
  if (!_ptw.pets.length) { try { const W = _ptwWorld(); if (W) _ptwEncounter(W); } catch (e) { /* later */ } return; }   // nobody out: no frames at all, but a rare visitor may still come
  if (!_ptw.raf && !_ptw.idleT && !document.hidden) { _ptw.last = 0; _ptw.raf = requestAnimationFrame(_ptwFrame); }
}
function _ptwStop() {
  _ptw.on = false; cancelAnimationFrame(_ptw.raf); _ptw.raf = 0; if (_ptw.idleT) { clearTimeout(_ptw.idleT); _ptw.idleT = 0; }
  if (_ptw.svg) for (const type of ['pointerdown', 'pointerup', 'click']) _ptw.svg.removeEventListener(type, _ptwClick, true);
  for (const P of _ptw.pets) P.node.remove();
  for (const F of _ptw.flies) F.node.remove();
  if (_ptw.enc) _ptw.enc.node.remove();
  _ptwBubbleClose();
  _ptw.pets = []; _ptw.flies = []; _ptw.enc = null; _ptw.encKey = ''; _ptw.svg = null; _ptw.key = '';
}
if (typeof document !== 'undefined') {
  setInterval(_ptwCheck, 1000);
  document.addEventListener('visibilitychange', _ptwCheck);
  document.addEventListener('opendash:pet', () => setTimeout(_ptwCheck, 50));
}

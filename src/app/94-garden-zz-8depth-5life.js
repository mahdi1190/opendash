/* ============================================================
   DEPTH: WHAT LIVES UNDERNEATH (26 Nov 2026, the depth lane, its third part). The brief: "things to find only underneath (a crab under the
   pier, a lost item under the bridge, cave crystals ...)". This file: the creatures that live under raised things and underground, and the
   small prompt registry the depth lane's finds (94-garden-zz-8depth-6finds.js) and secrets (7secret.js) share.

   BY KIND, NEVER BY NAME (rule 17). Each creature names the KIND of place it lives in, and finds every such place on any layout:
     dipper           under a footbridge over running water (a crossing of kind footbridge over one of the layout's rivers), mornings: it bobs
                      on a stone at the foot of a trestle post and walks into the stream
     daubentons-bat   under a bridge with arches (a crossing whose kind has spans), dusk and night, spring to autumn: two skim the water
     velvet-crab      on the piles under a pier (a thing of kind pier), in low light, spring to autumn
     common-toad      under a log that lies over a brook (a crossing of kind log), spring to autumn, more after rain: look under it
     well-shrimp      in still water underground (a chamber whose piece is a pool or a well): pale and blind
     herald-moth      asleep on the rock walls of a mine or a drift (a chamber in a tunnel of rock), autumn and winter
   Each is a row of the Field Journal (GL_CREATURE: the book, its clue and its picture, the life kit's own art), paid once by rarity when you
   first watch it (gardenLifeFound), never spawned by the life engine (it is not in GARDEN_CREATURES): this file draws it where it lives.

   THE SAME ON EVERY SCREEN. Whether a creature is there today, and where it is in its round, come from the day, the place's id and the
   clock: two friends standing at the same bridge see the same dipper on the same stone, with no message between them.

   THE PROMPTS (gardenDepthPromptRows / gardenDepthActs): a provider adds rows near you (outside, or in the tunnel you are in); an act says
   its words and does it. One wrapper each round gartActNearby, _gaWords and gartActRun serves the whole lane.
   ============================================================ */
const GDQ = { rows: [], acts: Object.create(null), scratch: [] };
/** A provider of prompt rows: fn(out, C, px, py) pushes rows near (px, py) (cells); C is the tunnel you are in (inside it), else null. */
function gardenDepthPromptRows(fn) { if (typeof fn === 'function') GDQ.rows.push(fn); }
/** An act of the lane: { words(row), run(row) }. A row carries dq: true and act: its id. */
function gardenDepthActs(id, def) { if (id && def) GDQ.acts[id] = def; }
function _gdqDist(r, px, py) { const d = Math.hypot(r.x - px, (r.y - py) * 1.3); return r.stand ? Math.min(d, Math.hypot(r.stand.x - px, (r.stand.y - py) * 1.3)) : d; }
/** The lane's rows in reach now, nearest first. */
function _gdqNear(C, px, py) {
  const out = GDQ.scratch; out.length = 0;
  for (const fn of GDQ.rows) { try { fn(out, C, px, py); } catch (e) { if (!_gdq.failT || performance.now() - _gdq.failT > 10000) { _gdq.failT = performance.now(); console.error('[garden depth] prompt', e); } } }
  const reach = typeof GA_REACH === 'number' ? GA_REACH : 2.2, list = [];
  for (const r of out) { r._d = _gdqDist(r, px, py); if (r._d <= (r.reach || reach)) list.push(r); }
  list.sort((a, b) => (a._d - (a.pri || 0)) - (b._d - (b.pri || 0)));
  return list;
}
const _gdq = { failT: 0 };
if (typeof gartActNearby === 'function') {
  const _gdqNear0 = gartActNearby;
  gartActNearby = function () {   // eslint-disable-line no-func-assign
    const base = _gdqNear0();
    if (typeof _gw === 'undefined' || !_gw.on) return base;
    const C = typeof _gdt !== 'undefined' ? _gdt.cur : null; if (C && C.phase !== 'inside') return base;
    const mine = _gdqNear(C, _gw.px, _gw.py); if (!mine.length) return base;
    // merged by distance with what the world offers (its own order kept): the nearer thing is offered first
    const out = []; let i = 0, j = 0;
    while (i < base.length || j < mine.length) {
      if (j >= mine.length) { out.push(base[i++]); continue; }
      if (i >= base.length) { out.push(mine[j++]); continue; }
      if (mine[j]._d - (mine[j].pri || 0) < _gdqDist(base[i], _gw.px, _gw.py) - (base[i].pri || 0)) out.push(mine[j++]); else out.push(base[i++]);
    }
    return out;
  };
}
if (typeof _gaWords === 'function') {
  const _gdqWords0 = _gaWords;
  _gaWords = function (r) { if (r && r.dq && GDQ.acts[r.act]) { try { return GDQ.acts[r.act].words(r) || ''; } catch (e) { return ''; } } return _gdqWords0(r); };   // eslint-disable-line no-func-assign
}
if (typeof gartActRun === 'function') {
  const _gdqRun0 = gartActRun;
  gartActRun = function (id, spot) {   // eslint-disable-line no-func-assign
    if (spot && spot.dq && GDQ.acts[id]) { try { return GDQ.acts[id].run(spot) !== false; } catch (e) { console.error('[garden depth] act', id, e); return false; } }
    return _gdqRun0(id, spot);
  };
}
/* E while swimming: the height file makes E do nothing in the water (2.75.7: a door, a net or a cast was done from mid-water), but the
   lane's own rows are meant to be done from the water (a glint under a bridge, mussels on a pile, the mason's mark): the prompt shows
   them, so E does what the prompt says. Only a row of this lane; anything else stays as the water has it. */
if (typeof gartActInteract === 'function') {
  const _gdqE0 = gartActInteract;
  gartActInteract = function () {   // eslint-disable-line no-func-assign
    if (_gdqSwimming() && typeof _ga !== 'undefined' && _ga.near && _ga.near.dq && GDQ.acts[_ga.near.act] && _ga.el && !_ga.el.hidden) { gartActRun(_ga.near.act, _ga.near); return true; }
    return _gdqE0();
  };
}
/* ---------- shared small things ---------- */
function _gdqHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** A number in [0, 1) that is the same on every screen for this key today. */
function _gdqDay01(key) { let d = ''; try { d = _gdToday(); } catch (e) { d = ''; } return (_gdqHash(d + '|' + key) % 100000) / 100000; }
/** The garden you stand in: its season, its time of day, its rain (looked at once a second: asked every frame, it is the same). */
const _gdqHereC = { t: -1e9, v: null };
function _gdqHere() { const now = performance.now(); if (now - _gdqHereC.t < 1000 && _gdqHereC.v) return _gdqHereC.v; _gdqHereC.t = now; try { _gdqHereC.v = gardenHere(); } catch (e) { _gdqHereC.v = null; } return _gdqHereC.v; }
function _gdqHour() { try { const p = Clock.parts(_gdNow()); return p.h + p.mi / 60; } catch (e) { return 12; } }
function _gdqVisiting() { return typeof gardenVisitOn === 'function' && !!gardenVisitOn(); }
function _gdqSay(text, icon) { try { gardenToast(text, icon ? { icon } : undefined); } catch (e) { /* quiet */ } }
function _gdqSwimming() { return typeof _ght !== 'undefined' && !!(_ght.swim && _ght.swim.on && !_ght.swim.out); }
/** Turn to face (x, y) (cells). */
function _gdqFace(x, y) { try { if (typeof _gaFace === 'function') _gaFace(Math.atan2((y - _gw.py) * 30, (x - _gw.px) * 48) * 180 / Math.PI); if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* as it is */ } }

/* ---------- the creatures ---------- */
const GDL_LIFE = Object.freeze([
  Object.freeze({ id: 'dipper', name: 'Dipper', group: 'bird', rarity: 'uncommon', place: 'stream', watch: 'Watch the dipper', reach: 3.4,
    art: ['bird', { body: '#3a2a22', belly: '#7a4228', bib: '#f6f2ea', head: '#5a3a2a', wing: '#2e221c', beak: '#1e1814', leg: '#8a7a6a', k: 0.86, tail: 5 }],
    when: { tod: ['dawn', 'day'], before: 13 }, chance: 0.8,
    book: { hint: 'Under a footbridge over running water, in the morning.', blurb: 'Bobs on a stone, then walks straight into the stream and along the bottom. Comes up somewhere else, quite dry.' },
    seen: 'A dipper on the stone under the bridge: it bobs, and bobs, then walks into the stream and along the bottom.' }),
  Object.freeze({ id: 'daubentons-bat', name: 'Daubenton’s bat', group: 'animal', rarity: 'rare', place: 'arch', watch: 'Watch the bats', reach: 4,
    art: ['bat', { c: '#6e5a48', k: 0.74 }], when: { tod: ['dusk', 'night'], seasons: ['spring', 'summer', 'autumn'] }, chance: 0.9,
    book: { hint: 'Under the arches of a stone bridge, at dusk, spring to autumn.', blurb: 'Skims an inch over the water under the bridge and scoops up flies with its big feet.' },
    seen: 'Two bats skim the water under the arches, back and forth, a finger’s width above it.' }),
  Object.freeze({ id: 'velvet-crab', name: 'Velvet swimming crab', group: 'pond', rarity: 'uncommon', place: 'pile', watch: 'Look at the crab', reach: 2.6,
    art: ['crab', { c: '#5a4466', d: '#2e2236', k: 0.86 }], when: { tod: ['dawn', 'dusk', 'night'], seasons: ['spring', 'summer', 'autumn'] }, chance: 0.75,
    book: { hint: 'On the piles under a pier, when the light is low, spring to autumn.', blurb: 'Red eyes and blue-lined legs. Holds its claws up at you and means every bit of it.' },
    seen: 'A velvet crab on the pile, claws up, red eyes daring you to come any nearer.' }),
  Object.freeze({ id: 'common-toad', name: 'Common toad', group: 'pond', rarity: 'common', place: 'log', watch: 'Look under the log', reach: 2.4,
    art: ['frog', { c: '#8a6a48', d: '#5a4430', b: '#cdb490', k: 0.86 }], when: { seasons: ['spring', 'summer', 'autumn'] }, chance: 0.7, wet: 1,
    book: { hint: 'Look under a log that lies over a brook, spring to autumn. After rain is best.', blurb: 'Warty, golden-eyed and in no hurry at all. Walks rather than hops.' },
    seen: 'Under the end of the log, in the damp: a toad, golden-eyed and not at all pleased to be found.', none: 'Under the log: woodlice, and the smell of wet earth. Nobody at home today.' }),
  Object.freeze({ id: 'well-shrimp', name: 'Well shrimp', group: 'pond', rarity: 'rare', place: 'still', watch: 'Look into the water', reach: 2.4,
    art: ['thing', { svg: '' }], when: {}, chance: 1,
    book: { hint: 'In still water deep underground. Bring a light.', blurb: 'Pale as a ghost and blind as a stone. It has never once seen the sun, and does not miss it.' },
    seen: 'In the still water, something pale and unhurried: a tiny shrimp with no eyes at all. A well shrimp.', well: 'Far down the shaft your light finds the water, and something pale turning in it: a well shrimp.' }),
  Object.freeze({ id: 'herald-moth', name: 'Herald moth', group: 'insect', rarity: 'uncommon', place: 'rockwall', watch: 'Look at the moth', reach: 2.6,
    art: ['moth', { c: '#b8642e', c2: '#5e3418', k: 0.86 }], when: { seasons: ['autumn', 'winter'] }, chance: 0.85,
    book: { hint: 'Asleep on the rock walls of a mine or a cave, in autumn and winter.', blurb: 'Sleeps out the winter underground, its wings folded round it like a little orange cloak.' },
    seen: 'On the rock, wings folded like a cloak: a herald moth, asleep until spring.' }),
]);
/** The well shrimp's picture (the life kit has no shrimp): a pale curled body, its segments, long feelers. Feet at 0, 0, about 14 across. */
function _gdlShrimpSvg() {
  const A = GART, c = '#e8e2d6', d = '#b8ae9c';
  return `<g transform="translate(0 -3)">${A.P(c, 'M-7 0C-7 -3 -3 -4.6 1 -4.4C4.4 -4.2 6.6 -2.4 6.4 0.2C6.2 1.6 4.8 1.4 4.2 0.4C3.4 -1 1.6 -1.6 -0.4 -1.4C-3 -1.2 -4.4 -0.2 -5.6 1C-6.6 1.8 -7 1 -7 0z')}`
    + A.S(d, 0.5, 'M-3 -3.4Q-2.6 -1.8 -3.2 -0.8M-0.4 -4.2Q0 -2.4 -0.6 -1.4M2.2 -4Q2.6 -2.4 2 -1.2', 0.8) + A.S(c, 0.45, 'M6.2 -0.6Q9 -2.6 11.4 -1.6M6 0Q8.6 0.4 10.6 2.2', 0.85)
    + A.S(d, 0.4, 'M-1 -0.6L-1.6 1.4M1 -0.8L0.8 1.2M3 -0.4L3.2 1.4', 0.7) + A.P(c, 'M-7 0L-9.4 -1.4L-9 1.2z', 0.9) + `</g>`;
}
/* the book rows (GL_CREATURE): the engine never spawns these, it only knows them for the Field Journal and its payments */
const GDL_BOOK = new Map();
for (const L of GDL_LIFE) {
  const art = L.id === 'well-shrimp' ? ['thing', { svg: _gdlShrimpSvg() }] : L.art;
  const def = Object.freeze({ id: L.id, name: L.name, group: L.group, rarity: L.rarity, tags: [], habitat: 'ground', art, when: {}, behaviours: [], react: { mark: 'heart' }, book: L.book, under: true });
  GDL_BOOK.set(L.id, def);
  try { if (typeof GL_CREATURE !== 'undefined' && !GL_CREATURE.has(L.id)) GL_CREATURE.set(L.id, def); } catch (e) { /* the book without it */ }
}
const _gdlf = { places: null, key: '', keyT: 0, sprites: new Map(), shownT: 0, inside: new Map(), peek: null };
/** Is it in season and in its hours now, in the garden you stand in? */
function _gdlfWhen(L, here) {
  const w = L.when || {};
  if (w.seasons && here && !w.seasons.includes(here.season)) return false;
  if (w.tod && here && !w.tod.includes(here.tod)) return false;
  if (w.before && _gdqHour() >= w.before) return false;
  return true;
}
/** Is it there today at this place (the same answer on every screen)? */
function _gdlfToday(L, placeId, here) {
  if (!_gdlfWhen(L, here)) return false;
  let ch = L.chance == null ? 1 : L.chance;
  if (L.wet && here && here.rain && (here.rain.now || (here.rain.last && here.now - here.rain.last < 12 * 3600000))) ch = 1;   // (after rain the toad is always home)
  return _gdqDay01(L.id + '|' + placeId) < ch;
}
/** Every place under a raised thing where one of these lives, found by kind on this layout (cached with the zones). */
function gardenDepthLifePlaces() {
  const now = performance.now(); if (_gdlf.places && now - _gdlf.keyT < 1000) return _gdlf.places; _gdlf.keyT = now;
  const zs = typeof gardenUnderZones === 'function' ? gardenUnderZones() || [] : [], key = (typeof _gdu !== 'undefined' ? _gdu.key : '') + '|' + zs.length;
  if (_gdlf.places && key === _gdlf.key) return _gdlf.places;
  const out = [], W = GARDEN_WORLD, D = typeof gardenIslandData === 'function' ? gardenIslandData() : null, rivers = (D && D.presentation && D.presentation.rivers) || {};
  for (const z of zs) {
    if (z.deck && z.swim && z.kind === 'footbridge' && z.crossing && rivers[z.crossing.over]) {   // running water under a footbridge: two stones in the stream just upstream of its far beam
      // (the far side, out across the deck from its far beam: what stands in front of a bridge, a tree's crown, never hides it there; clear of the far rail as drawn)
      const d = z.deck, far = (t, dy) => { const q = z.crossing.deckPoint(t / d.L, -d.hw * d.near), o = z.crossing.deckPoint(t / d.L, 0), n = Math.hypot(q.x - o.x, q.y - o.y) || 1; return { x: q.x + (q.x - o.x) / n * dy, y: q.y + (q.y - o.y) / n * dy }; }, p = z.posts.length ? z.posts[_gdqHash(z.id) % z.posts.length] : null, mid = (z.wet[0] + z.wet[1]) / 2;
      const a = far(p ? p.t : mid, 18), b = far(z.wet[0] + (z.wet[1] - z.wet[0]) * 0.22, 17);
      out.push({ kind: 'stream', id: z.id, z, a, b, name: z.name });
    }
    if (z.deck && z.swim && z.rule && z.rule.spans && z.open && z.open.length) {   // arches: the bats loop over the water before them
      const d = z.deck, o = z.open[_gdqHash(z.id) % z.open.length], q = z.crossing.deckPoint((o[0] + o[1]) / 2 / d.L, d.hw * d.near);
      out.push({ kind: 'arch', id: z.id, z, a: { x: q.x, y: q.y + (z.face || 20) + 16 }, rx: Math.max(18, (o[1] - o[0]) * 0.55), name: z.name });
    }
    if (z.rect && z.kind === 'pier' && z.posts && z.posts.length) {   // a pier's piles: one for the crab
      const p = z.posts[_gdqHash(z.id + 'c') % z.posts.length], mid = (z.rect[0] + z.rect[2]) / 2 * W.cellW;
      out.push({ kind: 'pile', id: z.id, z, a: { x: p.x + (p.x < mid ? 8 : -8), y: p.y - 3 }, name: z.name });   // (clinging to the post as drawn at the deck's edge, at the waterline: the swimmer's pile is a little further out)
    }
    if (z.peek && z.crossing && z.deck) {   // a log over a brook: the toad under its bank end
      const c = z.crossing, end = _gdqHash(z.id) % 2 ? c.a : c.b, other = end === c.a ? c.b : c.a, L = Math.hypot(other.x - end.x, other.y - end.y) || 1;
      out.push({ kind: 'log', id: z.id, z, a: { x: end.x - (other.x - end.x) / L * 9, y: end.y - (other.y - end.y) / L * 4 + 7 }, name: z.name });
    }
  }
  for (const p of out) { p.x = p.a.x / W.cellW; p.y = (p.a.y - W.sky) / W.cellH; }
  _gdlf.key = key; _gdlf.places = out;
  return out;
}
/** The creature that lives in a kind of place. */
function _gdlfOf(kind) { for (const L of GDL_LIFE) if (L.place === kind) return L; return null; }
/** Where a creature is now in its round (world px and lift), the same on every screen: t from the clock, its place's own seed. */
function _gdlfPose(L, P, now, o) {
  const s = (_gdqHash(P.id + L.id) % 997) / 997, t = now / 1000 + s * 100;
  o.alpha = 1; o.flip = false; o.lift = 0; o.clip = 'blink';
  if (L.place === 'stream') {   // on its stone, bobbing; every half minute it walks into the stream and comes up on the other stone
    const cyc = 34, k = ((t / cyc) % 1 + 1) % 1, at = Math.floor(t / cyc) % 2 ? P.a : P.b, other = at === P.a ? P.b : P.a;
    const p = k < 0.82 ? at : other; o.x = p.x; o.y = p.y; o.flip = p.x > other.x;
    o.alpha = k < 0.76 ? 1 : k < 0.8 ? 1 - (k - 0.76) / 0.04 : k < 0.86 ? 0 : Math.min(1, (k - 0.86) / 0.05);
    o.clip = 'blink tail-bob'; o.dive = k >= 0.76 && k < 0.9;
  } else if (L.place === 'arch') {   // a figure of eight just over the water before the arch
    const w = t * 0.9 + (o.n || 0) * 2.1; o.x = P.a.x + Math.sin(w) * P.rx; o.y = P.a.y + Math.sin(w * 2) * 5 + (o.n || 0) * 3; o.lift = 9 + Math.sin(w * 3) * 3; o.flip = Math.cos(w) < 0; o.clip = 'flap-b';
  } else if (L.place === 'pile') {   // clinging to the pile at the water, now and then a sidle along it
    const k = Math.sin(t * 0.35); o.x = P.a.x + (k > 0.7 ? (k - 0.7) * 12 : 0); o.y = P.a.y; o.clip = k > 0.7 ? 'legs-walk blink' : 'blink';
  } else { o.x = P.a.x; o.y = P.a.y; o.flip = !!(_gdqHash(P.id) % 2); o.clip = 'blink'; }
  return o;
}
function _gdlfMarkup(L, clip, flip) {
  const def = GDL_BOOK.get(L.id), art = typeof gardenLifeArt === 'function' ? gardenLifeArt(def) : { svg: '' }, k = (typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 0.8) * (L.place === 'arch' ? 0.9 : 1);
  const sh = L.place === 'arch' ? '' : `<ellipse class="gl-sh" cx="0" cy="0.5" rx="5" ry="1.5" fill="#14242a" fill-opacity="0.22"/>`;
  const stone = L.place === 'stream' ? `<ellipse cx="0.6" cy="1.6" rx="9" ry="3" fill="#2e3a36" fill-opacity="0.5"/><path d="M-8 1.2C-8 -2.6 -3 -4.2 1 -4C5.4 -3.8 8.6 -2 8.4 1C6 2.6 -5 2.8 -8 1.2z" fill="#6e6a5e"/><path d="M-6.4 -1.2C-4 -3.4 1 -3.6 4 -2.6C1 -2.2 -3 -1.4 -6.4 -0.4z" fill="#a49e8c" opacity="0.8"/><path d="M-9 1.6Q0 3.8 9 1.6" fill="none" stroke="#e8f2ee" stroke-width="0.8" opacity="0.6"/>` : '';
  void k; return `${stone}${sh}<g class="gl-pose" transform="${_gdlfPoseTf(L, flip)}"><g class="gl-art" data-clip="${clip}">${art.svg}</g></g>`;
}
/** Each frame (outside): the creatures under the raised things on screen, drawn where they are in their round. */
function _gdlfFrame(now) {
  if (typeof _gw === 'undefined' || !_gw.on || typeof gardenWorldAdd !== 'function') return;
  const C = typeof _gdt !== 'undefined' ? _gdt.cur : null;
  // which are wanted (looked at twice a second): in its place today, its place near the view
  if (now - _gdlf.shownT > 500) {
    _gdlf.shownT = now;
    const here = _gdqHere(), want = new Set();
    if (!C) for (const P of gardenDepthLifePlaces()) {
      const L = _gdlfOf(P.kind); if (!L || L.place === 'log') continue;   // (the toad is under its log: looked for, never sitting out)
      if (Math.abs(P.x - _gw.px) > 22 || Math.abs(P.y - _gw.py) > 16 || !_gdlfToday(L, P.id, here)) continue;
      for (let n = 0; n < (L.place === 'arch' ? 2 : 1); n++) want.add(L.id + '|' + P.id + '|' + n);
    }
    if (_gdlf.peek && now < _gdlf.peek.until) want.add(_gdlf.peek.key);
    for (const [k, S] of _gdlf.sprites) if (!want.has(k)) { try { S.remove(); } catch (e) { /* gone */ } _gdlf.sprites.delete(k); }
    for (const k of want) if (!_gdlf.sprites.has(k)) {
      const [id, pid, n] = k.split('|'), L = GDL_LIFE.find(q => q.id === id), P = L ? gardenDepthLifePlaces().find(q => q.id === pid && q.kind === L.place) : null; if (!L || !P) continue;
      const flies = L.place === 'arch';   // (a bat on the wing keeps the frames coming while it is in view: the world's loop counts a sprite that updates)
      const S = gardenWorldAdd({ id: 'dpl-' + k, x: P.x, y: P.y, svg: _gdlfMarkup(L, 'blink', false), still: !flies, update: flies ? () => {} : undefined, hit: 0.4, hitUp: 8, label: L.name, cursor: 'hand', onClick: () => { const r = _gdlfRowOf(P, L); if (r) gartActRun(r.act, r); } });
      S._gdl = { L, P, n: +n || 0, clip: 'blink', flip: false, alpha: 1, o: { n: +n || 0 } }; _gdlf.sprites.set(k, S);
    }
  }
  const W = GARDEN_WORLD, t = typeof _gdNow === 'function' ? _gdNow() : Date.now();   // clock-ok: the same round on every screen
  for (const S of _gdlf.sprites.values()) {
    const q = S._gdl, o = _gdlfPose(q.L, q.P, t, q.o);
    if (_gdlf.peek && _gdlf.peek.S === S) { o.x = q.P.a.x; o.y = q.P.a.y; o.alpha = Math.min(1, (_gdlf.peek.until - now) / 600); o.clip = 'blink'; }
    S.x = o.x / W.cellW; S.y = (o.y - W.sky) / W.cellH; S.lift = o.lift || 0;
    if (q.node !== S.node) { q.node = S.node; q.poseEl = null; q.alpha = -1; }   // (a new node, the world drawn again: found afresh)
    if (q.clip !== o.clip) { q.clip = o.clip; q.flip = o.flip; S.svg = _gdlfMarkup(q.L, o.clip, o.flip); if (S.node) S.node.innerHTML = S.svg; q.poseEl = null; }
    else if (q.flip !== o.flip) {   // a turn: only the pose's transform, never the whole drawing again
      q.flip = o.flip; S.svg = _gdlfMarkup(q.L, o.clip, o.flip);
      const pe = S.node ? q.poseEl || (q.poseEl = S.node.querySelector('.gl-pose')) : null;
      if (pe) pe.setAttribute('transform', _gdlfPoseTf(q.L, o.flip)); else if (S.node) S.node.innerHTML = S.svg;
    }
    const a = Math.round(o.alpha * 20) / 20; if (q.alpha !== a && S.node) { q.alpha = a; if (a >= 1) S.node.removeAttribute('opacity'); else S.node.setAttribute('opacity', String(a)); S.hit = a > 0.3 ? 0.4 : 0; }
  }
}
function _gdlfPoseTf(L, flip) { const k = (typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 0.8) * (L.place === 'arch' ? 0.9 : 1); return `translate(0 ${L.place === 'stream' ? -2.6 : 0}) scale(${flip ? -k : k} ${k})`; }
/** Gone from the garden (the world stopped): the sprites go too, and come back when wanted. */
function _gdlfClear() { for (const S of _gdlf.sprites.values()) { try { S.remove(); } catch (e) { /* gone */ } } _gdlf.sprites.clear(); _gdlf.peek = null; }
/* ---------- watching one: the prompt, the book ---------- */
function _gdlfRowOf(P, L) {
  return { key: 'dpl:' + L.id + ':' + P.id, act: 'dplook', name: L.name, x: P.x, y: P.y, promptY: P.y - 1.6, stand: null, deg: null, lift: 0, src: 'dpl:' + P.id, kind: 'depth', dq: true, reach: L.reach || 2.6, pri: 0.3, life: L, place: P };
}
gardenDepthPromptRows((out, C, px, py) => {
  if (C) return;
  const here = _gdqHere();
  for (const P of gardenDepthLifePlaces()) {
    if (Math.abs(P.x - px) > 5 || Math.abs(P.y - py) > 5) continue;
    const L = _gdlfOf(P.kind); if (!L) continue;
    if (L.place !== 'log' && !_gdlfToday(L, P.id, here)) continue;   // (nothing there today: nothing to watch; a log is always looked under)
    out.push(_gdlfRowOf(P, L));
  }
});
/** The Field Journal page a creature belongs on: the region of a place it lives (by the place's own cell), so a new layout puts it right. */
const _gdlfPages = new Map();
function _gdlfPageOf(L) {
  if (_gdlfPages.has(L.id)) return _gdlfPages.get(L.id);
  let page = '';
  try {
    const W = GARDEN_WORLD, at = [];
    for (const P of gardenDepthLifePlaces()) if (P.kind === L.place) at.push([P.x, P.y]);
    if (!at.length && typeof gardenTunnels === 'function') for (const T of gardenTunnels()) for (const p of _gdlfInsidePlaces(T)) if (p.L === L) at.push([p.x / W.cellW, (p.y - W.sky) / W.cellH]);
    for (const [x, y] of at) { const c = gardenIslandBaseCell(Math.floor(x), Math.floor(y)), z = c && c.regionZone != null ? c.regionZone : null, p = z != null && typeof GARDEN_JOURNAL_PAGES !== 'undefined' ? GARDEN_JOURNAL_PAGES.find(q => q.zone === z) : null; if (p) { page = p.id; break; } }
  } catch (e) { page = ''; }
  if (page) _gdlfPages.set(L.id, page);
  return page;
}
/* once watched, a creature from under the vale has its card on its region's page too (Birds & beasts): only then, so a page that was full
   stays full (the book's own page counts are never made harder) */
if (typeof _gjSeenRows === 'function') {
  const _gdlfSeen0 = _gjSeenRows;
  _gjSeenRows = function (pageId) {   // eslint-disable-line no-func-assign
    const rows = _gdlfSeen0(pageId);
    try { for (const L of GDL_LIFE) if (typeof gardenLifeHas === 'function' && gardenLifeHas('c', L.id) && _gdlfPageOf(L) === pageId && !rows.some(r => r.id === L.id)) rows.push(GDL_BOOK.get(L.id)); } catch (e) { /* as before */ }
    return rows;
  };
}
/** You watched it: it goes in your Field Journal the first time (paid once by its rarity), and a word about it every time. */
function _gdlfSaw(L, words) {
  const first = typeof gardenLifeHas === 'function' && !gardenLifeHas('c', L.id);
  _gdqSay(words || L.seen, L.group === 'bird' ? 'bird' : L.group === 'insect' ? 'bug' : 'sparkles');
  if (first) { const pg = _gdlfPageOf(L); if (pg && typeof _gj !== 'undefined') { _gj.page = pg; _gj.kind = 'seen'; } }   // (the book's button opens on its page)
  if (first && typeof gardenLifeFound === 'function') setTimeout(() => { try { gardenLifeFound('c', L.id, { userAction: true }); } catch (e) { /* the book later */ } }, 1400);
  try { if (typeof gardenSfx === 'function') gardenSfx(L.group === 'bird' ? 'cheer' : 'sparkle'); } catch (e) { /* quiet */ }
}
gardenDepthActs('dplook', {
  words: (r) => r.life.watch,
  run: (r) => {
    const L = r.life, P = r.place, here = _gdqHere();
    _gdqFace(P.x, P.y);
    if (L.place === 'log') {   // under the log: lift its end a little and look (a crouch); the toad sits out for a few seconds when it is home
      if (!_gdqSwimming() && typeof gartPlayerAct === 'function') gartPlayerAct('pick', 900);
      if (!_gdlfToday(L, P.id, here)) { _gdqSay(L.when.seasons && here && !L.when.seasons.includes(here.season) ? 'Under the log: nothing but cold earth. Toads sleep out the winter somewhere deeper.' : L.none); return true; }
      const key = L.id + '|' + P.id + '|0';
      _gdlf.peek = { key, until: performance.now() + 6500, S: null }; _gdlf.shownT = 0; _gdlfFrame(performance.now()); _gdlf.peek.S = _gdlf.sprites.get(key) || null;
      _gdlfSaw(L); return true;
    }
    if (L.place === 'stream') { const t = typeof _gdNow === 'function' ? _gdNow() : Date.now(), o = _gdlfPose(L, P, t, {}); if (o.dive) { _gdlfSaw(L, 'Where it was, a ring on the water. A moment later the dipper bobs up on the other stone, quite dry.'); return true; } }   // clock-ok: its round
    _gdlfSaw(L); return true;
  },
});
/* ---------- underground: the moth asleep on the rock, the shrimp in the pool, drawn in the tunnel's own picture ---------- */
/** The places in a tunnel where one of these lives: [{ L, c (its chamber), x, y (world px) }]. By the chamber's piece and the tunnel's walls. */
function _gdlfInsidePlaces(T) {
  if (T._gdlf) return T._gdlf;
  const out = [], rock = (GARDEN_TUNNEL_STYLES[T.style] || {}).wall === 'rock';
  for (const c of T.ells) {
    const R = GARDEN_CHAMBERS[c.what]; if (!R) continue;
    if (R.piece === 'pool' && c.hole) out.push({ L: GDL_LIFE.find(q => q.id === 'well-shrimp'), c, x: c.hole.x, y: c.hole.y, pool: true });
    if (R.piece === 'well' && c.hole) out.push({ L: GDL_LIFE.find(q => q.id === 'well-shrimp'), c, x: c.hole.x, y: c.hole.y, well: true });
    if (rock && !out.some(p => p.L.id === 'herald-moth')) {   // on the back wall's far end, clear of the chamber's piece (to one side when a passage runs on through: the other end) and of its lamp
      const side = c.pieceDx ? 1 : (_gdqHash(T.id + c.i) % 2 ? 1 : -1), k = 0.86, x = c.x + side * c.rx * k, edge = c.rect ? c.y - c.ry : c.y - c.ry * Math.sqrt(1 - k * k);
      out.push({ L: GDL_LIFE.find(q => q.id === 'herald-moth'), c, x, y: edge - 16, wall: true });
    }
  }
  T._gdlf = out; return out;
}
gardenDepthPromptRows((out, C, px, py) => {
  if (!C) return;
  const W = GARDEN_WORLD, here = _gdqHere(), cur = gardenTunnelChamberAt(C.T, px * W.cellW, W.sky + py * W.cellH);
  for (const p of _gdlfInsidePlaces(C.T)) {
    if (!p.L || !_gdlfToday(p.L, C.T.id + ':' + p.c.i, here)) continue;
    const x = p.x / W.cellW, y = (p.y - W.sky) / W.cellH, fy = p.wall ? (p.y + 30 - W.sky) / W.cellH : y;   // (a moth on the wall is looked at from the floor below it)
    out.push({ key: 'dpl:' + p.L.id + ':' + C.T.id + ':' + p.c.i, act: 'dplookin', name: p.L.name, x, y: fy, promptY: (p.wall ? y : fy) - 1.2, stand: null, deg: null, lift: 0, src: 'dpl:' + C.T.id + ':' + p.c.i + ':' + p.L.id, kind: 'depth', dq: true, reach: 2.2, pri: 0.2 + (p.c.i === cur ? 0.6 : 0), life: p.L, place: p });
  }
});
gardenDepthActs('dplookin', {
  words: (r) => (r.place.well ? 'Look down the well' : r.life.watch),
  run: (r) => { _gdqFace(r.x, r.y); _gdlfSaw(r.life, r.place.well ? r.life.well : r.life.seen); return true; },
});
/** The textures of the creatures drawn inside (painted once, on canvas: a sleeping moth, a swimming shrimp). */
function _gdlfInsideTex(sc) {
  const key = 'gdlf|moth', key2 = 'gdlf|shrimp';
  if (!sc.textures.exists(key)) {   // the herald moth asleep on the rock: wings folded in a tent, orange with two pale lines, seen from above
    const c = document.createElement('canvas'); c.width = 48; c.height = 40; const x = c.getContext('2d'); x.scale(2, 2); x.translate(12, 12);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(1.2, 1.6, 6.4, 3.4, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#8a4a22'; x.beginPath(); x.moveTo(0, -7); x.bezierCurveTo(5, -5, 7, 2, 4.6, 5.6); x.lineTo(0, 3.6); x.lineTo(-4.6, 5.6); x.bezierCurveTo(-7, 2, -5, -5, 0, -7); x.fill();
    x.fillStyle = '#c4703a'; x.beginPath(); x.moveTo(0, -6.4); x.bezierCurveTo(-4.4, -4.6, -6.2, 1.6, -4.2, 5); x.lineTo(0, 3.2); x.closePath(); x.fill();
    x.strokeStyle = '#f2e2c4'; x.globalAlpha = 0.8; x.lineWidth = 0.6; x.beginPath(); x.moveTo(-4.6, 0.4); x.lineTo(0, -1.4); x.lineTo(4.6, 0.4); x.moveTo(-3.6, 3); x.lineTo(0, 1.8); x.lineTo(3.6, 3); x.stroke(); x.globalAlpha = 1;
    x.fillStyle = '#e88a3a'; x.beginPath(); x.ellipse(-2.4, -1.8, 1, 0.8, 0, 0, Math.PI * 2); x.ellipse(2.4, -1.8, 1, 0.8, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#5e3418'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(-0.6, -6.8); x.quadraticCurveTo(-2.4, -9.6, -4.4, -9.8); x.moveTo(0.6, -6.8); x.quadraticCurveTo(2.4, -9.6, 4.4, -9.8); x.stroke();
    sc.textures.addImage(key, c);
  }
  if (!sc.textures.exists(key2)) {   // the well shrimp from above, curled a little, nearly see-through
    const c = document.createElement('canvas'); c.width = 40; c.height = 24; const x = c.getContext('2d'); x.scale(2, 2); x.translate(10, 6);
    x.fillStyle = 'rgba(232,226,214,.85)'; x.beginPath(); x.moveTo(-7, 0); x.bezierCurveTo(-6, -3, 2, -3.4, 5.6, -1.2); x.bezierCurveTo(6.6, -0.4, 6.2, 1.2, 5, 1); x.bezierCurveTo(1, 0.4, -4, 1.6, -7, 0); x.fill();
    x.strokeStyle = 'rgba(184,174,156,.9)'; x.lineWidth = 0.4; for (const s of [-3.4, -1, 1.4, 3.4]) { x.beginPath(); x.moveTo(s, -1.8); x.lineTo(s - 0.4, 0.6); x.stroke(); }
    x.strokeStyle = 'rgba(232,226,214,.8)'; x.lineWidth = 0.4; x.beginPath(); x.moveTo(5.6, -0.8); x.quadraticCurveTo(8, -3, 9.6, -2.6); x.moveTo(5.6, 0); x.quadraticCurveTo(8.4, 0.6, 9.4, 2.4); x.stroke();
    sc.textures.addImage(key2, c);
  }
  return [key, key2];
}
/** Each frame inside: the moth on its wall, the shrimp turning in its pool (only while they are there today). */
function _gdlfInsideFrame(C, now) {
  const st = typeof _gdi !== 'undefined' ? _gdi.st : null; if (!st || !st.shown || !C || !C.T) return;
  const sc = st.scene, here = _gdqHere(), rec = st.rec, a = rec && rec.im ? rec.im.alpha : 0;
  let set = _gdlf.inside.get(C.T.id), stale = !set || set.scene !== sc;
  if (!stale) for (let i = 0; i < set.items.length; i++) if (!set.items[i].im.active) { stale = true; break; }
  if (stale) {
    if (set) for (const q of set.items) { try { q.im.destroy(); } catch (e) { /* gone */ } }
    const [moth, shrimp] = _gdlfInsideTex(sc), L = st.figs._inner || st.figs.target;
    set = { scene: sc, items: [] };
    for (const p of _gdlfInsidePlaces(C.T)) {
      if (!p.L || p.well) continue;
      const im = sc.add.image(p.x, p.y, p.pool ? shrimp : moth).setScale(p.pool ? 0.5 : 0.64).setVisible(false).setDepth(p.pool ? p.y - 30 : p.c.y - p.c.ry - 2);
      L.add(im); _gdi.sortDue = true; set.items.push({ p, im, ph: (_gdqHash(C.T.id + p.c.i) % 628) / 100 });
    }
    _gdlf.inside.set(C.T.id, set);
  }
  const t = now / 1000;
  if (!set.flagT || now - set.flagT > 1000) { set.flagT = now; for (const q of set.items) q.today = _gdlfToday(q.p.L, C.T.id + ':' + q.p.c.i, here); }   // (asked once a second: nothing made each frame)
  for (const q of set.items) {
    const on = a > 0.02 && q.today;
    if (q.im.visible !== on) q.im.setVisible(on);
    if (!on) continue;
    if (Math.abs(q.im.alpha - a) > 0.02) q.im.setAlpha(a);
    if (q.p.pool && (typeof gardenMotionOn !== 'function' || gardenMotionOn())) { const h = q.p.c.hole, w = t * 0.4 + q.ph, fx = Math.sin(w) > 0; q.im.setPosition(h.x + Math.cos(w) * h.rx * 0.45, h.y + Math.sin(w) * h.ry * 0.4); if (q.im.flipX !== fx) q.im.setFlipX(fx); }   // (round the pool, always seen side on: it turns as it goes, never stands on end)
  }
}
function _gdlfInsideHide() { for (const set of _gdlf.inside.values()) for (const q of set.items) { try { if (q.im.active && q.im.visible) q.im.setVisible(false); } catch (e) { /* gone */ } } }
if (typeof gardenTunnelStageFrame === 'function') {
  const _gdlfStage0 = gardenTunnelStageFrame;
  gardenTunnelStageFrame = function (C, now) { _gdlfStage0(C, now); try { _gdlfInsideFrame(C, now); } catch (e) { /* drawn as it is */ } };   // eslint-disable-line no-func-assign
}
if (typeof gardenTunnelStageClose === 'function') {
  const _gdlfClose0 = gardenTunnelStageClose;
  gardenTunnelStageClose = function (force) { try { _gdlfInsideHide(); } catch (e) { /* gone */ } return _gdlfClose0(force); };   // eslint-disable-line no-func-assign
}
/* ---------- the facts the ribbons read: how many of the creatures that live under this layout's things you have watched ---------- */
function _gdlfKindsHere() {
  const kinds = new Set(gardenDepthLifePlaces().map(P => P.kind));
  try { for (const T of typeof gardenTunnels === 'function' ? gardenTunnels() : []) for (const p of _gdlfInsidePlaces(T)) if (p.L) kinds.add(p.L.place); } catch (e) { /* none */ }
  return GDL_LIFE.filter(L => kinds.has(L.place));
}
if (typeof gardenDepthFacts === 'function') {
  const _gdlfFacts0 = gardenDepthFacts;
  gardenDepthFacts = function () {   // eslint-disable-line no-func-assign
    const f = Object.assign({}, _gdlfFacts0());
    try { const here = _gdlfKindsHere(), seen = here.filter(L => typeof gardenLifeHas === 'function' && gardenLifeHas('c', L.id)).length; f.lifeBelowSeen = seen; f.lifeBelowOf = here.length; f.lifeBelowAll = here.length && seen >= here.length ? 1 : 0; } catch (e) { /* none */ }
    return f;
  };
}
if (typeof gartActFrame === 'function') {
  const _gdlfFrame0 = gartActFrame;
  gartActFrame = function () { try { _gdlfFrame(performance.now()); } catch (e) { if (!_gdlf.failT || performance.now() - _gdlf.failT > 10000) { _gdlf.failT = performance.now(); console.error('[garden depth] life', e); } } return _gdlfFrame0(); };   // eslint-disable-line no-func-assign
}
if (typeof gardenWorldStop === 'function') {
  const _gdlfStop0 = gardenWorldStop;
  gardenWorldStop = function (keepOn) { if (!keepOn) { try { _gdlfClear(); } catch (e) { /* gone */ } } return _gdlfStop0(keepOn); };   // eslint-disable-line no-func-assign
}

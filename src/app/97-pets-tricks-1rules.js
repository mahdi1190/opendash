/* ============================================================
   PETS, THE TRICK BOOK: the rules (2.23, agent 'craft'). The owner: "buy more animations for the pets", then "a top tier of spectacular wow animations ... rarity tiers ... pets occasionally do a
   rare one unprompted ... very rare ones can only be found through secret conditions: first shown as ??? in the trick book, and unlocking is a big moment".

   A TRICK IS ONE ROW of PET_TRICK_BOOK, made by _tb(id, name, tier, how, more):
     tier   common | rare | epic | legendary | mythical (PET_TIERS)
     clip   a row of PET_CLIP_LIB (97-pets-tricks-0clips.js), or wow: a row of PET_WOW (97-pets-tricks-3wow.js). Defaults to a clip of the same id.
     how    how you get it, one of:
              {free: 1}        every pet does this anyway (a mood)
              {old: 'spin'}    one of the first ten tricks (PET_TRICKS): taught with treats as it always was
              {treats: n} and/or {coins: n}   bought
              {bond: n}        friend level n with any pet        {level: n}   the game's level        {streak: n}   best streak
              {fact: ['fished', 50]}  a garden milestone (any gardenFacts key)        {craft: <recipe>}  made at the bench
              {secret: {tod, season, clear, rain, hour: [a, b], md: [['08-10', '08-14']], bond, fact, tricks, act: 'pat'}, hint}  found by doing it: shown as ??? until then. Nothing says what it is.
     the row's look: icon (a kit icon), blurb

   PRICES fit what a day earns: a good day is about 15 treats (5 from tasks, 6 from focus, 4 from the garden) and up to 120 coins, and a treat also goes in the pet. Nothing here can be farmed: treats and coins are only ever spent, and
   earned tricks come from slow counts. Saves: a bought trick is a line of state.pet.buy ('trick:<id>', with its own coin ledger line, so Undo works); an earned or secret one is state.pet.tricks[id] (older versions ignore unknown ids, and the sync merges entry by entry).

     petBookRow(id)         the row
     petBookOwned(id, p?)   do you have it?
     petBookList(species?)  rows with {owned, suits, secretHidden, why, can, pay: [['treats', n], ['coins', n]]}
     petBookBuy(id, pay)    -> {ok, why?, spent?}
     petBookUndo(id)
     petBookTick(act)       works out what has been earned, and whether a secret just came true. -> {earned: [ids], secret: [ids]}
     petBookOwnedIds(sp)    what your pet does on its own, by species
     petBookCount()         {owned, total}
   Pure at load; Node runs it for the assistant.
   ============================================================ */
const PET_TIERS = Object.freeze({ common: { label: 'Common', c: '#8aa0a8', rank: 0 }, rare: { label: 'Rare', c: '#3b8ad6', rank: 1 }, epic: { label: 'Epic', c: '#8a5ad6', rank: 2 }, legendary: { label: 'Legendary', c: '#e0982c', rank: 3 }, mythical: { label: 'Mythical', c: '#e0478a', rank: 4 } });
function _tb(id, name, tier, how, more) { return Object.assign({ id, name, tier, how }, more || {}); }
const PET_TRICK_BOOK = Object.freeze([
  // moods: every pet has these, and does them on its own
  _tb('sneeze', 'Sneeze', 'common', { free: 1 }), _tb('yawn', 'Yawn and stretch', 'common', { free: 1 }), _tb('hiccup', 'Hiccups', 'common', { free: 1 }), _tb('nap', 'Forty winks', 'common', { free: 1 }),
  _tb('think', 'Big idea', 'common', { free: 1 }), _tb('peek', 'Peekaboo', 'common', { free: 1 }), _tb('nod', 'Nod', 'common', { free: 1 }), _tb('wink', 'Wink', 'common', { free: 1 }), _tb('sway', 'A little sway', 'common', { free: 1 }), _tb('earwiggle', 'Ear wiggle', 'common', { free: 1 }),
  // the first ten
  _tb('highfive', 'Wave', 'common', { old: 'highfive' }, { clip: 'wave' }), _tb('spin', 'Spin', 'common', { old: 'spin' }), _tb('speak', 'Speak', 'common', { old: 'speak' }), _tb('rollover', 'Roll over', 'common', { old: 'rollover' }), _tb('jump', 'Big jump', 'common', { old: 'jump' }), _tb('dance', 'Happy dance', 'rare', { old: 'dance' }), _tb('bow', 'Take a bow', 'common', { old: 'bow' }), _tb('moonwalk', 'Moonwalk', 'rare', { old: 'moonwalk' }), _tb('backflip', 'Backflip', 'rare', { old: 'backflip' }),
  // common: small treats
  _tb('salute', 'Salute', 'common', { treats: 3 }), _tb('laugh', 'Giggles', 'common', { treats: 3 }), _tb('bigwag', 'The big wag', 'common', { treats: 3 }), _tb('beg', 'Pretty please', 'common', { treats: 3 }), _tb('blowkiss', 'Blow a kiss', 'common', { treats: 4 }), _tb('dizzy', 'Dizzy', 'common', { treats: 4 }), _tb('tiptoe', 'Tiptoe', 'common', { treats: 4 }), _tb('tailflick', 'Tail flourish', 'common', { treats: 4 }), _tb('proud', 'Proud pose', 'common', { treats: 4 }), _tb('startled', 'Startled jump', 'common', { treats: 4 }), _tb('honk', 'Honk', 'common', { treats: 5 }), _tb('thump', 'Foot thump', 'common', { treats: 5 }), _tb('shelltuck', 'Shy', 'common', { treats: 5 }), _tb('clawsnap', 'Claw snap', 'common', { treats: 6 }), _tb('headturn', 'Head turn', 'common', { treats: 6 }), _tb('puffup', 'Puff up', 'common', { treats: 6 }),
  // rare: a day's treats, or a few days' coins
  _tb('boogie', 'Boogie', 'rare', { treats: 6, coins: 60 }), _tb('headbang', 'Headbanger', 'rare', { treats: 6, coins: 60 }), _tb('march', 'Quick march', 'rare', { treats: 6, coins: 60 }), _tb('hopscotch', 'Hopscotch', 'rare', { treats: 6, coins: 60 }), _tb('digup', 'Dig for treasure', 'rare', { treats: 6, coins: 60 }), _tb('tantrum', 'Tantrum', 'rare', { treats: 7, coins: 70 }), _tb('chasetail', 'Chase your tail', 'rare', { treats: 7, coins: 70 }), _tb('sing', 'Sing', 'rare', { treats: 8, coins: 80 }), _tb('windmill', 'Windmill', 'rare', { treats: 8, coins: 80 }), _tb('twirl', 'Pirouette', 'rare', { treats: 8, coins: 80 }), _tb('rearup', 'Rear up', 'rare', { treats: 8, coins: 80 }), _tb('jazz', 'Jazz hands', 'rare', { treats: 8, coins: 80 }), _tb('somersault', 'Somersault', 'rare', { treats: 8, coins: 80 }), _tb('highjump', 'Sky jump', 'rare', { treats: 9, coins: 90 }), _tb('zoomies', 'Zoomies', 'rare', { treats: 9, coins: 90 }), _tb('hula', 'Hula', 'rare', { treats: 9, coins: 90 }), _tb('boing', 'Boing', 'rare', { treats: 9, coins: 90 }), _tb('manetoss', 'Mane toss', 'rare', { treats: 9, coins: 90 }), _tb('featherfan', 'Show off', 'rare', { treats: 9, coins: 90 }), _tb('boo', 'Boo!', 'rare', { treats: 9, coins: 90 }), _tb('bellyslide', 'Belly slide', 'rare', { treats: 9, coins: 90 }), _tb('beepspin', 'Beep spin', 'rare', { treats: 9, coins: 90 }), _tb('inkpuff', 'Ink cloud', 'rare', { treats: 9, coins: 90 }), _tb('chestthump', 'Chest thump', 'rare', { treats: 9, coins: 90 }), _tb('loop', 'Loop the loop', 'rare', { treats: 9, coins: 90 }),
  // epic: saved up for, or earned
  _tb('juggle', 'Juggle', 'epic', { treats: 14, coins: 180 }), _tb('balance', 'Nose balance', 'epic', { treats: 14, coins: 180 }), _tb('robotdance', 'Robot dance', 'epic', { treats: 14, coins: 180 }), _tb('cartwheel', 'Cartwheel', 'epic', { treats: 16, coins: 200 }), _tb('playdead', 'Play dead', 'epic', { treats: 16, coins: 200 }), _tb('firebreath', 'Fire breath', 'epic', { treats: 20, coins: 260 }),
  _tb('confetti', 'Confetti cannon', 'epic', { treats: 18, coins: 240 }, { wow: 'confetti' }), _tb('bubbles', 'Bubble cloud', 'epic', { treats: 16, coins: 220 }, { wow: 'bubbles' }), _tb('petalwhirl', 'Petal whirlwind', 'epic', { fact: ['bouquets', 5] }, { wow: 'petalwhirl' }), _tb('comet', 'Comet dash', 'epic', { fact: ['fished', 40] }, { wow: 'comet' }), _tb('portal', 'Portal hop', 'epic', { coins: 600 }, { wow: 'portal' }),
  // legendary: earned, a small event
  _tb('fireflies', 'Firefly heart', 'legendary', { bond: 5 }, { wow: 'fireflies' }), _tb('goldenhour', 'Golden hour', 'legendary', { bond: 7 }, { wow: 'goldenhour' }), _tb('rainbow', 'Rainbow bloom', 'legendary', { fact: ['harvests', 150] }, { wow: 'rainbow' }), _tb('ascend', 'Ascension', 'legendary', { streak: 30 }, { wow: 'ascend' }), _tb('dragon', 'Dragon spirit', 'legendary', { level: 25 }, { wow: 'dragon' }), _tb('phoenix', 'Phoenix rebirth', 'legendary', { fact: ['rareFish', 3] }, { wow: 'phoenix' }),
  // secrets: ??? until you stumble on them
  _tb('aurora', 'Northern lights', 'legendary', { secret: { season: 'winter', tod: 'night', clear: 1, bond: 3 }, hint: 'A cold, clear night together.' }, { wow: 'aurora' }),
  _tb('constellation', 'Constellation', 'mythical', { secret: { hour: [0, 3], clear: 1, bond: 4 }, hint: 'Outside in the small hours, under a clear sky.' }, { wow: 'constellation' }),
  _tb('timestop', 'Stopped clock', 'mythical', { secret: { hour: [0, 0], min: [0, 5], act: 'pat' }, hint: 'A pat, exactly as the day turns.' }, { wow: 'timestop' }),
  _tb('meteors', 'Meteor shower', 'mythical', { secret: { md: [['08-10', '08-14'], ['12-12', '12-15']], tod: 'night', clear: 1 }, hint: 'The nights the sky is busiest.' }, { wow: 'meteors' }),
  _tb('galaxy', 'Galaxy in its paws', 'mythical', { secret: { tricks: 30, tod: 'night', act: 'perform' }, hint: 'Show it thirty tricks, then ask once more, after dark.' }, { wow: 'galaxy' }),
]);
const _TB_MAP = new Map(PET_TRICK_BOOK.map(r => [r.id, r]));
function petBookRow(id) { return _TB_MAP.get(String(id)) || null; }

/* ---------- do you have it? ---------- */
function _tbFacts() { try { return typeof gardenFacts === 'function' ? gardenFacts() : {}; } catch (e) { return {}; } }
function _tbCtx(p) { let u = {}; try { u = petUnlockCtx(); } catch (e) { u = {}; } return { levelMax: Number(u.levelMax) || 1, bestStreak: Number(u.bestStreak) || 0, game: !!u.game, bond: _ptcBondBest(p), F: _tbFacts(), crafted: (() => { try { return typeof gardenCraftedSet === 'function' ? gardenCraftedSet() : new Set(); } catch (e) { return new Set(); } })() }; }
function _tbEarned(r, c) {
  const h = r.how;
  if (h.bond) return c.bond >= h.bond;
  if (h.level) return c.game && c.levelMax >= h.level;
  if (h.streak) return c.game && c.bestStreak >= h.streak;
  if (h.fact) return (Number(c.F[h.fact[0]]) || 0) >= h.fact[1];
  if (h.craft) return c.crafted.has(h.craft);
  return false;
}
function petBookOwned(id, p0, ctx) {
  const r = petBookRow(id); if (!r) return false;
  const p = p0 || _ptS(), h = r.how;
  if (h.free) return true;
  if (h.old) { const t = petTrick(h.old); return !!(t && (t.id === 'sit' || (p.tricks && p.tricks[h.old]))); }
  if (p.tricks && p.tricks[id]) return true;
  if (p.buy && p.buy['trick:' + id]) return true;
  if (h.bond || h.level || h.streak || h.fact || h.craft) return _tbEarned(r, ctx || _tbCtx(p));
  return false;
}
function _tbWhy(r, c) {
  const h = r.how;
  if (h.bond) return { kind: 'bond', have: Math.min(c.bond, h.bond), of: h.bond, line: 'Friend level ' + h.bond };
  if (h.level) return { kind: 'level', have: Math.min(c.levelMax, h.level), of: h.level, line: 'Level ' + h.level };
  if (h.streak) return { kind: 'streak', have: Math.min(c.bestStreak, h.streak), of: h.streak, line: `A ${h.streak}-day streak` };
  if (h.fact) { const words = { fished: 'Catch {n} fish', harvests: 'Pick {n} times', bouquets: 'Make {n} bouquets', rareFish: 'Land {n} rare fish' }[h.fact[0]] || 'Do it {n} times'; return { kind: 'fact', have: Math.min(Number(c.F[h.fact[0]]) || 0, h.fact[1]), of: h.fact[1], line: words.replace('{n}', h.fact[1]) }; }
  return null;
}
/** Every row, as the book shows it. */
function petBookList(species) {
  const p = _ptS(), c = _tbCtx(p), sp = species || (p.look && p.look.species);
  let T = 0, coins = 0;
  try { T = petTreats().have; } catch (e) { T = 0; }
  try { const w = _ptcWallet(); coins = w ? w.coins : 0; } catch (e) { coins = 0; }
  return PET_TRICK_BOOK.map(r => {
    const owned = petBookOwned(r.id, p, c), h = r.how, oldT = h.old ? petTricks().find(t => t.id === h.old) : null;
    const pay = [];
    if (oldT && !owned && !oldT.lock) pay.push(['treats', oldT.cost]);
    if (h.treats) pay.push(['treats', h.treats]);
    if (h.coins) pay.push(['coins', h.coins]);
    const clip = r.wow ? null : (r.clip || r.id);
    return { id: r.id, def: r, owned, tier: r.tier, wow: !!r.wow, clip, suits: r.wow ? true : petClipSuits(clip, sp), hidden: !!h.secret && !owned, why: owned ? null : (oldT && oldT.lock ? { line: oldT.lock } : _tbWhy(r, c)), pay, canTreats: T, canCoins: coins };
  });
}
function petBookCount() { const p = _ptS(), c = _tbCtx(p), rows = PET_TRICK_BOOK.filter(r => !r.how.free); return { owned: rows.filter(r => petBookOwned(r.id, p, c)).length, total: rows.length }; }
/** Pay for a trick. */
function petBookBuy(id, pay) {
  const r = petBookRow(id), p = _ptcS();
  if (!r) return { ok: false, why: 'unknown' };
  if (!p.look) return { ok: false, why: 'nopet' };
  if (petBookOwned(id, p)) return { ok: true, already: true };
  const h = r.how;
  if (h.old) { const res = petTeach(h.old); return res.ok ? { ok: true, spent: (petTrick(h.old) || {}).cost || 0, pay: 'treats' } : { ok: false, why: 'treats', msg: res.msg }; }
  const buy = _ptcMap(p, 'buy'), key = 'trick:' + id, today = _ptToday();
  const via = pay || (h.treats ? 'treats' : 'coins');
  if (via === 'treats' && h.treats) {
    if (petTreats().have < h.treats) return { ok: false, why: 'treats', need: h.treats };
    buy[key] = { d: today, t: h.treats };
  } else if (via === 'coins' && h.coins) {
    const led = _ptcSpendCoins(h.coins);
    if (!led) return { ok: false, why: 'coins', need: h.coins };
    buy[key] = { d: today, c: h.coins, led };
  } else return { ok: false, why: 'unknown' };
  _ptNote('trick-' + id);
  petSet({}, {});
  return { ok: true, spent: via === 'treats' ? h.treats : h.coins, pay: via };
}
function petBookUndo(id) {
  const r = petBookRow(id); if (!r) return false;
  if (r.how.old) { petUnteach(r.how.old); return true; }
  const p = _ptcS(), b = p.buy && p.buy['trick:' + id];
  if (p.journal) delete p.journal['trick-' + id];
  return b ? petBuyUndo('trick:' + id) : false;
}

/* ---------- secrets: is it true right now? ---------- */
function _tbSecretTrue(s, env, act, ctx) {
  if (s.act && s.act !== act) return false;
  if (s.tod && env.tod !== s.tod) return false;
  if (s.season && env.season !== s.season) return false;
  if (s.clear && env.rain) return false;
  if (s.rain && !env.rain) return false;
  if (s.hour && (env.h < s.hour[0] || env.h > s.hour[1])) return false;
  if (s.min && (env.m < s.min[0] || env.m > s.min[1])) return false;
  if (s.md && !s.md.some(([a, b]) => env.md >= a && env.md <= b)) return false;
  if (s.bond && ctx.bond < s.bond) return false;
  if (s.fact && (Number(ctx.F[s.fact[0]]) || 0) < s.fact[1]) return false;
  if (s.tricks && env.nTricks < s.tricks) return false;
  return true;
}
function _tbEnv(p) {
  let tod = 'day', season = 'summer', rain = false;
  try { if (typeof gardenModel === 'function' && typeof state !== 'undefined' && state.garden && state.garden.since) { const m = gardenModel(); tod = m.tod; season = m.season; rain = !!(m.rain && m.rain.now); } } catch (e) { /* the plain day above */ }
  let h = 12, mi = 0;
  try { const q = Clock.parts(Clock.now()); h = q.h; mi = q.mi || 0; } catch (e) { const d = new Date(); h = d.getHours(); mi = d.getMinutes(); }   // clock-ok: fallback only
  const today = _ptToday(); let n = 0;
  const c = _tbCtx(p); for (const r of PET_TRICK_BOOK) if (!r.how.free && petBookOwned(r.id, p, c)) n++;
  return { tod, season, rain, h, m: mi, md: today.slice(5, 10), nTricks: n, ctx: c };
}
/** Earned things, noted once; a secret that has just come true, kept for good. act: 'pat', 'perform' or '' (a look around). */
function petBookTick(act) {
  const out = { earned: [], secret: [] };
  try {
    const p = _ptS(); if (!p.look) return out;
    const env = _tbEnv(p), c = env.ctx; let ch = false;
    for (const r of PET_TRICK_BOOK) {
      const h = r.how;
      if (h.secret) {
        if (p.tricks && p.tricks[r.id]) continue;
        if (_tbSecretTrue(h.secret, env, act || '', c)) { p.tricks[r.id] = _ptToday(); _ptNote('trick-' + r.id); out.secret.push(r.id); ch = true; }
      } else if ((h.bond || h.level || h.streak || h.fact || h.craft) && !(p.tricks && p.tricks[r.id]) && _tbEarned(r, c)) {
        // earned once, it is yours whatever happens to the count later
        p.tricks[r.id] = _ptToday(); _ptNote('trick-' + r.id); out.earned.push(r.id); ch = true;
      }
    }
    if (ch) { p.updatedAt = Date.now(); if (typeof saveUI === 'function') saveUI(); }   // clock-ok: a real time stamp
  } catch (e) { try { console.error('[tricks]', e); } catch (x) { /* quiet */ } }
  return out;
}
/** What this pet does on its own: its moods and every trick you own that suits it (spectacles are handled apart: they are rare). */
function petBookOwnedIds(species, p0) {
  const p = p0 || _ptS(), c = _tbCtx(p), out = [];
  for (const r of PET_TRICK_BOOK) { if (r.wow) continue; const clip = r.clip || r.id; if (petClipSuits(clip, species) && petBookOwned(r.id, p, c)) out.push(clip); }
  return out;
}
function petBookWowOwned(p0) { const p = p0 || _ptS(), c = _tbCtx(p); return PET_TRICK_BOOK.filter(r => r.wow && petBookOwned(r.id, p, c)); }
/** What goes out to a friend: only ids of tricks that are yours (no more than 24; the showiest first), not the free moods. */
function petBookWire() {
  try { const p = _ptS(), c = _tbCtx(p); return PET_TRICK_BOOK.filter(r => !r.how.free && petBookOwned(r.id, p, c)).sort((a, b) => PET_TIERS[b.tier].rank - PET_TIERS[a.tier].rank).slice(0, 24).map(r => r.id); } catch (e) { return []; }
}
/** Ask the open page to perform a trick (the assistant's tool): a small note in the state, played once. */
function petPerformCue(id) {
  const r = petBookRow(id), p = _ptcS();
  if (!r) return { ok: false, why: 'unknown' };
  if (!p.look) return { ok: false, why: 'nopet' };
  if (!petBookOwned(id, p)) return { ok: false, why: 'locked' };
  p.cue = { id, at: _gdNowSafe() };
  petSet({}, {});
  return { ok: true };
}
function _gdNowSafe() { try { return typeof Clock !== 'undefined' ? Clock.now() : Date.now(); } catch (e) { return Date.now(); } }   // clock-ok: a stamp, compared with itself

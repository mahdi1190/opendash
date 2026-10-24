/* ============================================================
   PETS, the page side (2.18, agent 'pets'): state.pet, the mood that follows
   your day, treats you earn by finishing things, tricks, the journal, sharing
   with friends and the API other modules draw with. The kit is
   97-pets-0kit.js (tables, checks), 97-pets-0kitdraw.js and
   97-pets-0kitspecies.js (the drawing); the page, the builder, the Home widget
   and the Friends panels are 97-pets-2ui.js; pets in scenes and beside the
   full figure are 97-pets-3scene.js. CSS: src/styles/97-pets.css.

   NEVER GUILT. A pet is never sad, hungry or ill because of you: treats are a
   treat, not food it needs; on a quiet day it naps in the sun; late at night it
   sleeps. Moods only ever go up: happy on a streak, excited on a level up,
   playful after a focus session, content otherwise.

   state.pet (a UI key: saveUI, never an undo step; synced like the profile,
   lib/sync/manifest.mjs '── pets ──'):
     {v: 1, look: {species, breed, coat, marks, eyes, collar, collarCol, bandana, bandanaCol, bow, bowCol,
      hat, hatCol, glasses, glassesCol} | null (no pet yet), name, born (the day you adopted it),
      on (shown: false puts it away, nothing is lost), share (friends see it), scenes (it walks with you),
      fed: {day: n} treats given, petted: {day: n}, tricks: {id: day taught}, journal: {key: {d, k, n?}},
      collected: {'hat:witch': day} seasonal items kept for good, updatedAt}
   Treats EARNED are worked out from the data on every device (gameStats: a treat per task finished, at most
   five a day, two per focus session of 10 minutes or more, three a day without the game, three to welcome
   you); only what you GIVE is kept, so two devices never disagree.

   PUBLIC API (safe to call at any time; never throws):
     petGet()                       {has, look (with name), name, born, on, share, scenes, ...} (a copy)
     petHas()                       you have a pet and it is shown
     petSet(patch, o)               merge (look per field), save, share soon. o.quiet: no event
     petAdopt(look)                 a new companion (a journal line, welcome treats)
     petMood()                      {key, eyes, mouth, extra, pose, line}: what your pet is doing now
     petTreats()                    {earned, spent, have, todayFed, cap}
     petFeed()                      give a treat -> {ok, msg, treat}
     petPat()                       a pat -> {ok, n}
     petTricks()                    [{id, label, icon, cost, lock, taught}]
     petTeach(id) / petUnteach(id)  teach a trick (spends treats) / take it back (Undo)
     petJournal()                   [{key, d, icon, line}] newest first
     petUnlockCtx()                 what petLockOf reads (level, best streak, collected, today)
     petEl(who, size, o)            the pet as an element, or null when there is none. who: 'me' | null (yours), a
                                    friend view from window.Friends (their shared pet), or a pet object. size: px.
                                    o {pose, mood, motion (default true), cls}. Agent 'you' puts it on the card and the hub.
     petCardBadge(who, o)           a small badge: the pet and its name, or null. Yours opens the pet page; a
                                    friend's gets a pat (hearts, on this computer only). o {size (default 36), label}
     petGardenSprite(who, opts)     THE GARDEN'S API (agent 'garden-engine'): your pet (or a friend's) as an SVG <g>
                                    string for the garden's own <svg>, '' when none (or your Fun level is Off).
                                    opts {x, y (its feet, in the garden's units), h (its height there, default 22),
                                    pose ('walk' | 'sit' | 'sleep'; default from its mood), face (1 | -1),
                                    wander: [x0, x1] (it trots between the two and back, CSS only; still under
                                    reduced motion), dur (s), delay (s)}. Classes: ptg, ptg-wander.
                                    Also window.petGardenSprite. The garden engine's own form is accepted too:
                                    petGardenSprite({season, tod, size, readOnly, rain, friend?}) -> [{id, svg (art units,
                                    64 a cell, feet at 0,0), w: 1, mood}] | null (docs/dev/GARDEN.md section 7).
     petPayload()                   the 'pet' field friends get (profilePayload adds it), or null
     window.OpenDashPets            {get, set, el, badge, gardenSprite, mood, treats, payload}
     document event 'opendash:pet'  detail {pet}: it changed (here or synced)
   Friend pets are data drawn here: allow-listed ids through the kit's tables and a plain-text name (textContent).
   ============================================================ */
const _pt = { uid: 0, shareT: 0, excitedUntil: 0, reactUntil: 0, awakeUntil: 0, playUntil: 0, memo: null, memoAt: 0, booted: false };
const PET_FEED_CAP = 8;
const PET_NAMES = Object.freeze(['Biscuit', 'Pickle', 'Mochi', 'Pepper', 'Noodle', 'Bean', 'Clover', 'Maple', 'Pip', 'Nugget', 'Waffles', 'Ziggy', 'Bramble',
  'Toast', 'Sprout', 'Pebble', 'Muffin', 'Juniper', 'Sushi', 'Pudding', 'Pumpkin', 'Basil', 'Fig', 'Mango', 'Poppy', 'Crumpet', 'Nimbus', 'Comet', 'Doodle', 'Tofu', 'Dumpling', 'Marmalade']);
const _PT_SPECIES_NAMES = { robot: ['Bolt', 'Sparky', 'Gizmo', 'Widget'], dragon: ['Ember', 'Cinder', 'Smaug-ish', 'Puff'], phoenix: ['Ember', 'Blaze', 'Sunny'], unicorn: ['Stardust', 'Twinkle', 'Glimmer'], axolotl: ['Bubbles', 'Wiggles', 'Blub'], tortoise: ['Speedy', 'Pebble', 'Sage'], duck: ['Puddles', 'Waddles'], frog: ['Hopper', 'Lily'], owl: ['Hoot', 'Professor'] };

/** state.pet, filled in. Reading never adds the key (someone who never adopts carries nothing); write: true makes it. */
function _ptS(write) {
  if (typeof state === 'undefined' || !state) return { v: 1, look: null, fed: {}, petted: {}, tricks: {}, journal: {}, collected: {} };
  if (!state.pet || typeof state.pet !== 'object' || Array.isArray(state.pet)) {
    if (!write) return { v: 1, look: null, fed: {}, petted: {}, tricks: {}, journal: {}, collected: {} };
    state.pet = { v: 1, look: null };
  }
  const p = state.pet;
  for (const k of ['fed', 'petted', 'tricks', 'journal', 'collected']) if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {};
  if (!p.v) p.v = 1;
  return p;
}
function _ptToday() { try { return todayStr(); } catch (e) { return new Date().toISOString().slice(0, 10); } }   // clock-ok: fallback only
function _ptHour() { try { return Clock.parts(Clock.now()).h; } catch (e) { return new Date().getHours(); } }   // clock-ok: fallback only
function _ptDays(a, b) { const x = Date.parse(a + 'T12:00:00Z'), y = Date.parse(b + 'T12:00:00Z'); return Number.isFinite(x) && Number.isFinite(y) ? Math.round((y - x) / 864e5) : 0; }
function _ptHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function _ptStats() { try { return typeof gameStats === 'function' ? gameStats() : null; } catch (e) { return null; } }
function _ptFun() { try { return typeof memFunLevel === 'function' ? memFunLevel() : typeof gameFun === 'function' ? gameFun() : 'subtle'; } catch (e) { return 'subtle'; } }
function _ptMotionOk() {
  try { if (window.Motion && Motion.prefersReduced && Motion.prefersReduced()) return false; } catch (e) { /* below */ }
  try { return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return true; }
}
function _ptEmit() { try { document.dispatchEvent(new CustomEvent('opendash:pet', { detail: { pet: petGet() } })); } catch (e) { /* old browser */ } }

/* ---------- the pet ---------- */
function petGet() {
  const p = _ptS();
  const look = p.look && typeof p.look === 'object' ? petNormalize(Object.assign({}, p.look, { name: p.name })) : null;
  return { has: !!look, look, name: look ? (look.name || '') : '', born: typeof p.born === 'string' ? p.born : '', on: p.on !== false, share: p.share !== false, scenes: p.scenes !== false,
    fed: Object.assign({}, p.fed), petted: Object.assign({}, p.petted), tricks: Object.assign({}, p.tricks), collected: Object.assign({}, p.collected), updatedAt: Number(p.updatedAt) || 0 };
}
function petHas() { const g = petGet(); return g.has && g.on; }
function petName(g) { g = g || petGet(); return g.name || (g.look ? (petSpecies(g.look.species) || {}).label || 'Your pet' : 'Your pet'); }
function petSet(patch, o) {
  o = o || {};
  const p = _ptS(true);
  if (!patch || typeof patch !== 'object') return petGet();
  const hadName = !!p.name;
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'look') p.look = v && typeof v === 'object' ? (() => { const n = petNormalize(Object.assign({}, p.look || {}, v)); delete n.name; return n; })() : null;
    else if (k === 'name') p.name = petText(v, PET_MAX.name);
    else if (['on', 'share', 'scenes'].includes(k)) p[k] = v !== false;
    else if (['fed', 'petted', 'tricks', 'journal', 'collected'].includes(k) && v && typeof v === 'object') p[k] = Object.assign({}, p[k], v);
    else if (k === 'born' && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) p.born = v;
  }
  if (p.name && !hadName && p.look) _ptNote('name');
  p.updatedAt = Date.now();   // clock-ok: a real time stamp (what the sync and friends sort by)
  _pt.memo = null;
  if (typeof saveUI === 'function') saveUI();
  if (!o.quiet) _ptEmit();
  _ptShareSoon();
  return petGet();
}
/** A new companion: today is its birthday here; a journal line; three welcome treats (in petTreats). */
function petAdopt(look) {
  const today = _ptToday(), p = _ptS(), first = !p.born;
  const lk = petNormalize(look || petDefault());
  const name = lk.name || p.name || '';
  delete lk.name;
  petSet({ look: lk, name, on: true, born: p.born || today }, { quiet: true });
  if (first) _ptNote('adopt', { d: today });
  _ptCollectSeasonal(true);
  _ptEmit();
  return petGet();
}
function petRandomName(species, seed) {
  const own = _PT_SPECIES_NAMES[species] || [];
  const all = own.concat(PET_NAMES);
  return all[(seed == null ? Math.floor(Math.random() * 1e9) : seed) % all.length];
}

/* ---------- unlocks and seasonal items ---------- */
function petUnlockCtx() {
  const s = _ptStats(), g = typeof state !== 'undefined' && state && state.game && state.game.seen ? state.game.seen : {};
  const best = s && s.streaks && s.streaks.done ? Math.max(Number(s.streaks.done.best) || 0, Number(s.streaks.done.current) || 0) : 0;
  return { game: !!s, levelMax: Math.max(1, Number(g.levelMax) || 1, s ? Number(s.level.max) || s.level.level : 1), bestStreak: best, collected: _ptS().collected, today: _ptToday() };
}
function petLocked(field, id, species) { try { return petLockOf(field, id, petUnlockCtx(), species || (_ptS().look || {}).species); } catch (e) { return ''; } }
/** Seasonal accessories: in season they are collected, and stay yours for good. */
function _ptCollectSeasonal(silent) {
  const p = _ptS();
  if (!p.look) return [];
  const today = _ptToday(), got = [];
  for (const [field, opts] of Object.entries(PET_ACC)) for (const o of opts) {
    if (!o.season) continue;
    const key = field + ':' + o.id;
    if (!p.collected[key] && petSeasonOn(o.season, today)) { p.collected[key] = today; got.push(o.label); }
  }
  if (!got.length) return [];
  if (typeof saveUI === 'function') saveUI();
  if (!silent && typeof toast === 'function' && _ptFun() !== 'off') {
    toast(`New for ${petName()} this season: ${got.join(', ')}. Yours to keep.`, { icon: 'paw-print', timeout: 9000, action: { label: 'Try it on', run: () => { if (typeof setView === 'function') setView('pet:wardrobe'); } } });
  }
  return got;
}

/* ---------- the mood: it follows your day, and only ever goes up ---------- */
const _PT_LINES = {
  content: ['{n} is happy just being here.', '{n} is watching the clouds go by.', '{n} is keeping an eye on your list.', '{n} is having a little stretch.', '{n} is sitting with you, quietly.', '{n} is people-watching.'],
  happy: ['{n} is beaming: a {s}-day streak!', '{n} can tell it is a good day.', '{n} is wiggling with joy.', '{n} is so proud of you.'],
  excited: ['{n} is bouncing: you levelled up!', 'Sparkles everywhere: {n} saw that!', '{n} cannot sit still. What a moment.'],
  focused: ['{n} is keeping you company while you focus.', '{n} is curled up nearby, very quiet.', '{n} is guarding your focus time.'],
  playful: ['{n} wants to play after that focus session.', '{n} found a leaf and is very proud of it.'],
  sleepy: ['{n} is fast asleep. Sweet dreams.', '{n} is snoozing. It is late.', '{n} is dreaming of {t}s.'],
  dozy: ['{n} is having an afternoon nap in the sun.', '{n} is resting, just like the garden.', '{n} is dozing happily.'],
  reacting: ['{n} loves that.', '{n} leans in for more.', 'Happy {n}!'],
};
const _PT_TREAT_LABEL = { fish: 'fish biscuit', bone: 'biscuit bone', carrot: 'carrot', seed: 'sunflower seed', leaf: 'crisp leaf', berry: 'berry', strawberry: 'strawberry', pellet: 'tasty pellet',
  bamboo: 'bamboo shoot', pea: 'pea', millet: 'millet spray', chilli: 'little chilli', sunberry: 'sunberry', apple: 'apple', battery: 'fresh battery', cookie: 'cookie' };
function petTreatLabel(look) { const sp = petSpecies(look && look.species); return _PT_TREAT_LABEL[sp ? sp.treat : 'cookie'] || 'treat'; }
function _ptLine(key, g, extra) {
  const lines = _PT_LINES[key] || _PT_LINES.content, n = petName(g);
  const s = lines[_ptHash(_ptToday() + key + (g.look ? g.look.species : '')) % lines.length];
  return s.replace(/\{n\}/g, n).replace(/\{s\}/g, String(extra && extra.streak || 3)).replace(/\{t\}/g, petTreatLabel(g.look));
}
function petMood() {
  const g = petGet();
  if (!g.look) return null;
  const now = Date.now(), h = _ptHour();   // clock-ok: moments are real time
  if (_pt.memo && now - _pt.memoAt < 20000 && now > _pt.reactUntil && _pt.memo.key !== 'reacting') return _pt.memo;
  const s = typeof gameOn === 'function' && !gameOn() ? null : _ptStats();
  const st = s && s.streaks && s.streaks.done ? s.streaks.done : null;
  let m;
  if (now < _pt.reactUntil) m = { key: 'reacting', eyes: 'happy', mouth: 'open', extra: 'hearts', pose: 'sit' };
  else if (now < _pt.excitedUntil) m = { key: 'excited', eyes: 'sparkle', mouth: 'open', extra: 'sparkle', pose: 'sit' };
  else if ((h >= 22 || h < 6) && now > _pt.awakeUntil) m = { key: 'sleepy', eyes: 'closed', mouth: 'calm', extra: 'zzz', pose: 'sleep' };
  else if (typeof gameFocusRun === 'function' && (() => { try { return !!gameFocusRun(); } catch (e) { return false; } })()) m = { key: 'focused', eyes: 'open', mouth: 'calm', extra: '', pose: 'sit' };
  else if (now < _pt.playUntil) m = { key: 'playful', eyes: 'happy', mouth: 'open', extra: '', pose: 'walk' };
  else if (st && st.todayDone && st.current >= 3) m = { key: 'happy', eyes: 'happy', mouth: 'open', extra: '', pose: 'sit', streak: st.current };
  else if (_ptLastCare() > now - 45 * 60000) m = { key: 'happy', eyes: 'happy', mouth: 'smile', extra: '', pose: 'sit' };
  else if (h >= 13 && h < 17 && s && !(s.done && s.done.byDay && s.done.byDay[_ptToday()])) m = { key: 'dozy', eyes: 'closed', mouth: 'calm', extra: 'zzz', pose: 'sleep' };
  else m = { key: 'content', eyes: 'open', mouth: 'smile', extra: '', pose: 'sit' };
  m.line = _ptLine(m.key, g, m);
  if (m.key !== 'reacting') { _pt.memo = m; _pt.memoAt = now; }
  return m;
}
function _ptLastCare() { return Number(_pt.lastCare) || 0; }
/** Wake it for a minute (clicking a sleeping pet: it stretches, yawns and says hello). */
function petWake(ms) { _pt.awakeUntil = Date.now() + (ms || 60000); _pt.memo = null; }   // clock-ok: UI timing

/* ---------- treats: earned from the data, only what you give is kept ---------- */
function petTreats() {
  const p = _ptS(), today = _ptToday();
  const out = { earned: 0, spent: 0, have: 0, todayFed: Number(p.fed[today]) || 0, cap: PET_FEED_CAP, todayEarned: 0 };
  if (!p.look || !p.born) return out;
  let earned = 3;
  const s = _ptStats();
  if (s && s.done && s.done.byDay) {
    for (const [d, n] of Object.entries(s.done.byDay)) if (d >= p.born && d <= today) { const k = Math.min(5, Number(n) || 0); earned += k; if (d === today) out.todayEarned += k; }
    let sessions = [];
    try { sessions = typeof gameFocusSessions === 'function' ? gameFocusSessions(p.born, today) : []; } catch (e) { sessions = []; }
    const perDay = {};
    for (const x of sessions) if (x && x.ms >= 10 * 60000) { perDay[x.day] = (perDay[x.day] || 0) + 1; if (perDay[x.day] <= 3) { earned += 2; if (x.day === today) out.todayEarned += 2; } }
  } else {
    earned += 3 * Math.max(0, _ptDays(p.born, today) + 1);
    out.todayEarned = 3;
  }
  let spent = 0;
  for (const n of Object.values(p.fed)) spent += Math.max(0, Number(n) || 0);
  for (const id of Object.keys(p.tricks)) { const t = petTrick(id); if (t) spent += t.cost || 0; }
  out.earned = earned; out.spent = spent; out.have = Math.max(0, earned - spent);
  return out;
}
function petFeed() {
  const g = petGet();
  if (!g.look) return { ok: false, msg: 'Adopt a companion first.' };
  const t = petTreats(), today = _ptToday(), n = petName(g), label = petTreatLabel(g.look);
  if (t.todayFed >= PET_FEED_CAP) return { ok: false, full: true, msg: `${n} is full and very content. Treats keep for tomorrow.` };
  if (t.have < 1) return { ok: false, msg: `No treats in the jar yet. Finishing a task earns one${typeof gameOn === 'function' && gameOn() ? ', a focus session two' : ''}.` };
  const p = _ptS(), total = Object.values(p.fed).reduce((a, x) => a + (Number(x) || 0), 0) + 1;
  petSet({ fed: { [today]: t.todayFed + 1 } }, { quiet: true });
  _pt.lastCare = Date.now(); _pt.reactUntil = Date.now() + 2600; _pt.memo = null;   // clock-ok: UI timing
  for (const k of [1, 10, 50, 100, 250, 500, 1000]) if (total === k) _ptNote('treat-' + k, { n: k });
  _ptCareAward(g);
  _ptEmit();
  return { ok: true, treat: (petSpecies(g.look.species) || {}).treat || 'cookie', msg: [`${n} loved the ${label}!`, `Nom nom. ${n} says thank you.`, `${n} munched the ${label} happily.`][total % 3] };
}
function petPat() {
  const g = petGet();
  if (!g.look) return { ok: false };
  const today = _ptToday(), p = _ptS(), n = (Number(p.petted[today]) || 0) + 1;
  const total = Object.values(p.petted).reduce((a, x) => a + (Number(x) || 0), 0) + 1;
  // pats are counted at most 50 a day (enough for any affection) so the journal stays meaningful
  if (n <= 50) petSet({ petted: { [today]: n } }, { quiet: true });
  _pt.lastCare = Date.now(); _pt.reactUntil = Date.now() + 1800; _pt.memo = null;   // clock-ok: UI timing
  if ((_ptHour() >= 22 || _ptHour() < 6)) petWake(45000);
  for (const k of [1, 10, 100, 500, 1000]) if (total === k) _ptNote('pat-' + k, { n: k });
  _ptCareAward(g);
  return { ok: true, n };
}
/** A little XP once a day for time with your pet (the game's own cap applies). */
function _ptCareAward(g) {
  try { if (typeof gameAward === 'function') gameAward({ kind: 'pet', key: _ptToday(), xp: 3, label: 'Time with ' + petName(g), quiet: true }); } catch (e) { /* no game */ }
}

/* ---------- tricks ---------- */
function petTricks() {
  const p = _ptS(), ctx = petUnlockCtx();
  return PET_TRICKS.map(t => {
    let lock = '';
    if (ctx.game) { if (t.level && ctx.levelMax < t.level) lock = 'Reach level ' + t.level; else if (t.streak && ctx.bestStreak < t.streak) lock = 'A ' + t.streak + '-day streak'; }
    return { id: t.id, label: t.label, icon: t.icon, cost: t.cost || 0, anim: t.anim, lock, taught: t.id === 'sit' ? (p.tricks.sit || p.born || true) : p.tricks[t.id] || '' };
  });
}
function petTeach(id) {
  const t = petTricks().find(x => x.id === id);
  if (!t) return { ok: false, msg: 'There is no such trick.' };
  if (t.taught && id !== 'sit') return { ok: true, already: true };
  if (t.lock) return { ok: false, msg: `${t.label} unlocks with ${t.lock.replace(/^Reach /, '').replace(/^A /, 'a ')}.` };
  const have = petTreats().have;
  if (have < t.cost) return { ok: false, msg: `${t.label} takes ${t.cost} treats to teach. There ${have === 1 ? 'is' : 'are'} ${have} in the jar.` };
  petSet({ tricks: { [id]: _ptToday() } }, { quiet: true });
  _ptNote('trick-' + id);
  if (petTricks().every(x => x.taught)) _ptNote('tricks-all');
  _ptEmit();
  return { ok: true };
}
function petUnteach(id) {
  const p = _ptS();
  if (!p.tricks[id]) return;
  delete p.tricks[id];
  delete p.journal['trick-' + id];
  petSet({}, {});
}

/* ---------- the journal: milestones, kept for good ---------- */
const _PT_J = {
  adopt: ['heart', (n) => `${n} came home. Welcome!`], name: ['tag', (n) => `You named your companion ${n}.`],
  'tricks-all': ['crown', (n) => `${n} knows every trick there is. A true star.`],
};
function _ptNote(key, o) {
  const p = _ptS(true);
  if (p.journal[key]) return false;
  if (Object.keys(p.journal).length >= PET_MAX.journal) return false;
  const e = { d: (o && o.d) || _ptToday(), k: key.split('-')[0] };
  if (o && Number.isFinite(o.n)) e.n = o.n;
  p.journal[key] = e;
  if (typeof saveUI === 'function') saveUI();
  return true;
}
function _ptJournalLine(key, e, n, look) {
  const fixed = _PT_J[key];
  if (fixed) return { icon: fixed[0], line: fixed[1](n) };
  const [k, rest] = [key.split('-')[0], key.split('-').slice(1).join('-')];
  const num = Number(rest);
  switch (k) {
    case 'treat': return { icon: 'cookie', line: num === 1 ? `${n}'s first treat: a ${petTreatLabel(look)}.` : `${num} treats shared with ${n}.` };
    case 'pat': return { icon: 'heart', line: num === 1 ? `The first pat. ${n} approves.` : `${num.toLocaleString()} pats for ${n}.` };
    case 'trick': { const t = petTrick(rest); return { icon: t ? t.icon : 'sparkles', line: `${n} learned ${t ? t.label.toLowerCase() : 'a trick'}!` }; }
    case 'level': return { icon: 'trophy', line: `${n} was there when you reached level ${num}.` };
    case 'streak': return { icon: 'zap', line: `A ${num}-day streak, with ${n} cheering you on.` };
    case 'together': return { icon: 'calendar-heart', line: num >= 365 ? `${Math.round(num / 365) === 1 ? 'A whole year' : Math.round(num / 365) + ' years'} together with ${n}.` : num >= 30 ? `${Math.round(num / 30) === 1 ? 'A month' : Math.round(num / 30) + ' months'} together with ${n}.` : `${num === 7 ? 'A week' : num + ' days'} together with ${n}.` };
    case 'season': return { icon: 'gift', line: `${n} got something new for the season.` };
    default: return { icon: 'paw-print', line: `A good day with ${n}.` };
  }
}
function petJournal() {
  const p = _ptS(), g = petGet(), n = petName(g);
  return Object.entries(p.journal).filter(([k, e]) => e && /^\d{4}-\d{2}-\d{2}$/.test(String(e.d)))
    .map(([key, e]) => Object.assign({ key, d: e.d }, _ptJournalLine(key, e, n, g.look)))
    .sort((a, b) => (b.d.localeCompare(a.d)) || a.key.localeCompare(b.key));
}
/** Milestones the days bring: weeks and months together, streaks and levels (checked on boot, on the game's moments, hourly). */
function _ptMilestones() {
  const p = _ptS();
  if (!p.look || !p.born) return;
  const today = _ptToday(), days = _ptDays(p.born, today);
  for (const k of [7, 30, 100, 182, 365, 730]) if (days >= k) _ptNote('together-' + k, { d: Clock && Clock.addDays ? Clock.addDays(p.born, k) : today, n: k });
  const s = _ptStats();
  if (s && s.streaks && s.streaks.done) for (const k of [7, 14, 30, 60, 100, 365]) if (s.streaks.done.current >= k && s.streaks.done.since >= p.born) _ptNote('streak-' + k, { n: k });
}

/* ---------- drawing for others: you, a friend, a pet object ---------- */
function _ptWho(who) {
  if (who == null || who === 'me' || (who && typeof who === 'object' && who.self === true)) {
    const g = petGet();
    return { me: true, look: g.look && g.on ? g.look : null, name: g.name, g };
  }
  if (typeof who !== 'object') return { look: null };
  let raw = null, owner = '';
  if (who.profile && typeof who.profile === 'object') { raw = who.profile.pet; owner = typeof friendName === 'function' ? friendName(who) : (who.nick || who.name || ''); }
  else if (who.pet && typeof who.pet === 'object') raw = who.pet;
  else if (typeof who.species === 'string') raw = who;
  const look = petSanitize(raw);
  return { friend: !!who.profile, look, name: look ? look.name : '', owner: petText(owner, 40), game: who.game || null };
}
function _ptFriendMood(w) {
  const g = w.game && typeof w.game === 'object' ? w.game : null;
  return g && Number(g.streak) >= 3 ? { eyes: 'happy', mouth: 'smile', pose: 'sit' } : { eyes: 'open', mouth: 'smile', pose: 'sit' };
}
function _ptLabel(w) {
  const sp = w.look ? (petSpecies(w.look.species) || {}).label || 'pet' : 'pet';
  if (w.me) return `${w.name || 'Your pet'}, your ${sp.toLowerCase()}`;
  if (w.owner) return `${w.name || 'Their pet'}, ${w.owner}'s ${sp.toLowerCase()}`;
  return `${w.name || 'A pet'}, a ${sp.toLowerCase()}`;
}
function petEl(who, size, o) {
  try {
    o = Object.assign({}, typeof size === 'object' && size ? size : {}, o || {});
    const sz = Math.max(16, Math.min(512, Math.round(Number(typeof size === 'object' && size ? size.size : size) || 48)));
    const w = _ptWho(who);
    if (!w.look) return null;
    const fun = _ptFun();
    const mood = o.mood || (w.me ? petMood() : _ptFriendMood(w)) || {};
    const pose = o.pose || mood.pose || 'sit';
    const el = document.createElement('span');
    el.className = 'pt-el' + (w.me ? ' is-me' : '') + ' pt-fun-' + fun + (mood.key ? ' pt-m-' + String(mood.key).replace(/[^a-z]/g, '') : '') + (o.cls ? ' ' + String(o.cls).replace(/[^a-z0-9 _-]/gi, '') : '');
    el.style.setProperty('--pt-size', sz + 'px');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', _ptLabel(w));
    el.innerHTML = petSvg(w.look, { size: sz, pose, mood, motion: o.motion !== false && fun !== 'off' && _ptMotionOk(), crop: o.crop });   // built from allow-listed ids and numbers only (97-pets-0kit*.js)
    el._petPose = pose;
    return el;
  } catch (e) { console.error('[pets] petEl', e); return null; }
}
function petCardBadge(who, o) {
  try {
    o = o || {};
    const w = _ptWho(who);
    if (!w.look || (w.me && _ptFun() === 'off')) return null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pt-badge' + (w.me ? ' is-me' : '');
    const pe = petEl(who, o.size || 36, { motion: true });
    if (!pe) return null;
    b.appendChild(pe);
    if (o.label !== false) { const t = document.createElement('span'); t.className = 'pt-badge-n'; t.textContent = w.name || (petSpecies(w.look.species) || {}).label || 'Pet'; b.appendChild(t); }
    b.setAttribute('aria-label', w.me ? `${w.name || 'Your pet'}: open your pet's page` : `${_ptLabel(w)}: give them a pat`);
    b.setAttribute('data-tip', w.me ? (petMood() || {}).line || 'Your pet' : `Give ${w.name || 'them'} a pat`);
    b.onclick = (e) => {
      e.stopPropagation();
      if (w.me) { if (typeof setView === 'function') setView('pet'); return; }
      petHeartsAt(b);
    };
    return b;
  } catch (e) { console.error('[pets] badge', e); return null; }
}
/** A little burst of hearts over an element (local only: nothing is sent). */
function petHeartsAt(el, n) {
  if (!el || !el.getBoundingClientRect || !_ptMotionOk() || _ptFun() === 'off') return;
  const host = el.closest('.pt-stage') || el;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const cnt = n || (_ptFun() === 'full' ? 5 : 3);
  for (let i = 0; i < cnt; i++) {
    const h = document.createElement('span');
    h.className = 'pt-heart';
    h.setAttribute('aria-hidden', 'true');
    h.style.setProperty('--dx', ((i - (cnt - 1) / 2) * 14 + (Math.random() * 8 - 4)).toFixed(0) + 'px');
    h.style.setProperty('--dl', (i * 70) + 'ms');
    h.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 17C2 11 2 5 6 4c2-.5 3.4.6 4 2 .6-1.4 2-2.5 4-2 4 1 4 7-4 13z" fill="#f2607a"/></svg>';
    host.appendChild(h);
    setTimeout(() => h.remove(), 1400 + i * 70);
  }
}
/** Is this the garden engine's context ({season, tod, size, readOnly, rain}: docs/dev/GARDEN.md), not a who? */
function _ptIsGardenCtx(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x) && !x.profile && !x.pet && typeof x.species !== 'string' && x.self !== true
    && ['season', 'tod', 'size', 'readOnly', 'rain'].some(k => Object.prototype.hasOwnProperty.call(x, k));
}
/**
 * The garden engine's form (agent 'garden-engine', 94-garden-3render.js): [{id, svg, w, mood}] | null. svg is a fragment
 * in the garden's art units (64 = one cell wide), the feet at (0, 0), facing right, explicit colours; the engine places it
 * and moves it (a wanderer flips it with scaleX(-1) while it goes left). Your own garden only (readOnly: a friend's garden,
 * where their pet belongs; ctx.friend, a friend view, brings theirs). Asleep at night, sitting in the rain.
 */
function _ptGardenList(ctx) {
  const w = ctx.friend ? _ptWho(ctx.friend) : ctx.readOnly ? { look: null } : _ptWho('me');
  if (!w.look || (w.me && _ptFun() === 'off')) return null;
  const motion = _ptMotionOk();
  const mood = w.me ? (petMood() || {}) : _ptFriendMood(w);
  const pose = ctx.tod === 'night' || mood.pose === 'sleep' ? 'sleep' : ctx.rain || !motion ? 'sit' : 'walk';
  const svg = petSvgGroup(w.look, { h: 46, pose, mood: pose === 'sleep' ? { eyes: 'closed' } : mood, cls: motion ? 'pt-live pt-fun-' + _ptFun() : '' });
  return svg ? [{ id: 'pet-' + w.look.species, svg, w: 1, walk: pose === 'walk', mood: pose === 'sleep' ? 'sleepy' : mood.key || 'content' }] : null;
}
/** THE GARDEN'S API (see the header). An SVG <g> string; '' when there is no pet to show. */
function petGardenSprite(who, opts) {
  try {
    if (opts === undefined && _ptIsGardenCtx(who)) return _ptGardenList(who);
    opts = opts || {};
    const w = _ptWho(who);
    if (!w.look || (w.me && _ptFun() === 'off')) return '';
    const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const x = num(opts.x, 0), y = num(opts.y, 0), h = Math.max(6, Math.min(200, num(opts.h, 22)));
    const motion = opts.motion !== false && _ptMotionOk();
    const mood = w.me ? (petMood() || {}) : _ptFriendMood(w);
    const wander = Array.isArray(opts.wander) && opts.wander.length === 2 && opts.wander.every(v => Number.isFinite(Number(v))) ? opts.wander.map(Number) : null;
    let pose = opts.pose || (mood.pose === 'sleep' ? 'sleep' : wander && motion ? 'walk' : mood.pose === 'walk' ? 'walk' : 'sit');
    if (!PET_POSES.includes(pose)) pose = 'sit';
    const face = opts.face === -1 ? -1 : 1;
    const inner = petSvgGroup(w.look, { h, pose, mood: pose === 'sleep' ? { eyes: 'closed' } : mood, face, cls: motion ? 'pt-live pt-fun-' + _ptFun() : '' });
    if (!inner) return '';
    const R = (v) => Math.round(v * 10) / 10;
    if (wander && motion && pose === 'walk') {
      const dx = wander[1] - wander[0], dur = Math.max(6, Math.min(90, num(opts.dur, Math.abs(dx) / Math.max(4, h * 0.35) * 2 + 3))), dl = Math.max(0, num(opts.delay, (_ptHash(w.name + x) % 100) / 10));
      return `<g class="ptg ptg-wander" transform="translate(${R(wander[0])} ${R(y)})" style="--ptg-dx:${R(dx)}px;--ptg-dur:${R(dur)}s;--ptg-dl:-${R(dl)}s"><g class="ptg-move"><g class="ptg-face">${inner}</g></g></g>`;
    }
    return `<g class="ptg" transform="translate(${R(x)} ${R(y)})">${inner}</g>`;
  } catch (e) { console.error('[pets] garden sprite', e); return ''; }
}

/* ---------- friends: the 'pet' field of your profile (lib/profile-pets.mjs has its schema) ---------- */
function petPayload() {
  const p = _ptS();
  if (!p.look || p.on === false || p.share === false) return null;
  const w = petWire(Object.assign({}, p.look, { name: p.name }));
  if (w && p.scenes === false) w.walks = false;   // it stays home when you visit a friend's scene
  return w;
}
function _ptShareSoon() {
  clearTimeout(_pt.shareT);
  _pt.shareT = setTimeout(() => { try { if (typeof profileShareNow === 'function') profileShareNow(false).catch(() => {}); } catch (e) { /* no profile */ } }, 3500);
}

/* ---------- the profile card (agent 'you's profileExtend, 97-profile-1core.js): the pet beside the avatar ---------- */
/** Your pet as your own card shows it: out and about (not put away), shared with friends or not. */
function _ptMineOnCard() {
  const p = _ptS();
  if (!p.look || p.on === false) return null;
  return petWire(Object.assign({}, p.look, { name: p.name }));
}
/** On a card: yours (opens the pet page) or a friend's (a pat). Your own card shows your pet even when you keep it to yourself; the preview shows what friends get. */
function _ptCardPet(card, view, o) {
  const look = view && view.profile && view.profile.ext ? view.profile.ext.pet : null;
  if (!look || !card || (view.me && _ptFun() === 'off')) return;
  const b = petCardBadge(view.me ? 'me' : look, { size: o && o.compact ? 46 : 64, label: !(o && o.compact) });
  if (!b) return;
  b.classList.add('pt-card-pet');
  const av = card.querySelector('.pf-card-av');
  if (av && av.parentNode) av.parentNode.insertBefore(b, av.nextSibling); else card.appendChild(b);
}
// profileExtend is a function declaration in 97-profile-1core.js (hoisted: callable here, before that file runs)
if (typeof profileExtend === 'function') {
  // integrate 2.18: `mine` keeps your pet on YOUR card even when friends do not see it (the preview still shows what they get)
  try { profileExtend({ key: 'pet', order: 20, wire: () => petPayload() || undefined, mine: () => _ptMineOnCard() || undefined, sanitize: (v) => petSanitize(v), card: (el, view, o) => _ptCardPet(el, view, o) }); } catch (e) { console.error('[pets] profile field', e); }
}

/* ---------- boot and the game's moments ---------- */
function _ptBoot() {
  if (_pt.booted) return; _pt.booted = true;
  try { _ptCollectSeasonal(false); _ptMilestones(); } catch (e) { console.error('[pets]', e); }
}
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(_ptBoot, 5000), { once: true });
  document.addEventListener('opendash:game', (e) => {
    try {
      const d = e && e.detail ? e.detail : {}, p = _ptS();
      if (!p.look) return;
      if (d.kind === 'level' || d.kind === 'achievement') {
        _pt.excitedUntil = Date.now() + 30 * 60000; _pt.memo = null;   // clock-ok: a moment lasts half an hour
        if (d.kind === 'level' && Number(d.level) > 1) _ptNote('level-' + Math.floor(Number(d.level)), { n: Math.floor(Number(d.level)) });
      }
      if (d.kind === 'focus' && d.action === 'stop' && Number(d.ms) >= 10 * 60000) { _pt.playUntil = Date.now() + 20 * 60000; _pt.memo = null; }   // clock-ok: playful after a real session
      _ptMilestones();
    } catch (err) { /* never in the way */ }
  });
  setInterval(() => { try { if (_pt.booted) { _pt.memo = null; _ptCollectSeasonal(false); _ptMilestones(); } } catch (e) { /* quiet */ } }, 60 * 60000);
  window.petGardenSprite = petGardenSprite;
  window.OpenDashPets = Object.freeze({
    get: () => petGet(), set: (patch) => petSet(patch), el: (who, size, o) => petEl(who, size, o), badge: (who, o) => petCardBadge(who, o),
    gardenSprite: (who, o) => petGardenSprite(who, o), mood: () => petMood(), treats: () => petTreats(), payload: () => petPayload(),
  });
}

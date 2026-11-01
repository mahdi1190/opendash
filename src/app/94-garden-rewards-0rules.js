/* ============================================================
   REWARDS, the rules (docs/dev/REWARDS.md). The owner, 1 Nov 2026: "make sure that all features somehow relate back to the dashboard, giving coins, unlockables etc ... And maybe even things that lead to expanding the garden, designing the garden."
   Tables and sums only, no DOM at load: Node's page engine runs this too (lib/agent-engine.mjs).

     gardenRewardWorkDay(inp, e, d)   what one day's real work earned besides coins: worked out from the same data as the coins, so every device agrees and nothing is saved
     gardenRewardTrailInfo(t, m)      can this path be opened early with survey pegs?
     gardenRewardOpenTrail(id)        open it: the item land:<trail id>, one Undo. gardenLandsOpen already opens what you own, gardenLandsWire tells friends
     gardenRewardEarly(def)           levels a section comes early because you opened its path early
     gardenRewardOffer(cost)          what materials could take off a price     gardenRewardQuote(cost)  the same, only while the second buy button is being pressed
     gardenDesignRows(m)              the design items, for the yard and for the garden designer

   ECONOMY. Coins stay where they were: nothing here pays a coin. Materials cannot be sold. The most they do is take GR_ECON.offShare off a price at GR_ECON.offEach coins each.
   Work: at most 4 pegs, 4 timber, 2 stone, 2 maggots and 20 tickets a day. Play: at most GR_ECON.matDay materials a day, and its tickets and XP stay inside GP_ECON.
   ============================================================ */
const GR_ECON = Object.freeze({
  from: '2026-11-01',   // a day's work earns these from this day on: an old save is not handed its whole past at once
  matDay: 6,            // materials a day from play (once-only milestones aside)
  offEach: 3, offShare: 0.2,   // a material takes 3 coins off, and at most a fifth of the price comes off
  trailEarly: 2,        // a path can be opened this many levels before its gate would open
});
/* The bag's new things. Ids are stable: never rename or reuse one. */
const GR_MATERIALS = Object.freeze([
  Object.freeze({ id: 'peg', name: 'Survey pegs', one: 'survey peg', from: 'Finished tasks', goes: 'Opening a path early, and a way marker' }),
  Object.freeze({ id: 'timber', name: 'Timber', one: 'timber', from: 'Focus time and pruning', goes: 'Land, building, fences and paths' }),
  Object.freeze({ id: 'stone', name: 'Field stone', one: 'field stone', from: 'Finished tasks, digs and forage', goes: 'Land, building, paths and ornaments' }),
  Object.freeze({ id: 'reed', name: 'Reeds', one: 'bundle of reeds', from: 'Fish and bugs you catch', goes: 'Land, building, fences and ground' }),
]);
/* What real work earns besides coins. by 'task': one step for each `per` finished tasks. by 'focus': one step for each `per` minutes. */
const GR_WORK = Object.freeze([
  Object.freeze({ by: 'task', per: 1, item: 'mat:peg', each: 1, max: 4 }),
  Object.freeze({ by: 'task', per: 1, item: 'ticket', each: 3, max: 4 }),
  Object.freeze({ by: 'task', per: 2, item: 'mat:stone', each: 1, max: 2 }),
  Object.freeze({ by: 'focus', per: 25, item: 'mat:timber', each: 1, max: 4 }),
  Object.freeze({ by: 'focus', per: 15, item: 'ticket', each: 1, max: 8 }),
  Object.freeze({ by: 'focus', per: 50, item: 'bait:maggot', each: 1, max: 2 }),
]);
function gardenRewardTasksOf(inp) {
  let n = 0;
  for (const x of (inp && inp.done) || []) if (x && x.first && !(x.gapMs >= 0 && x.gapMs < GARDEN_ECON.minTaskGapMs)) n++;
  return n;
}
function gardenRewardWorkDay(inp, e, d) {
  if (!inp || d < GR_ECON.from) return null;
  const tasks = gardenRewardTasksOf(inp), focus = (e && e.focusMin) || 0, out = {};
  for (const r of GR_WORK) { const n = Math.min(r.max, Math.floor((r.by === 'task' ? tasks : focus) / r.per)); if (n > 0) out[r.item] = (out[r.item] || 0) + n * r.each; }
  return out;
}

/* ---------- paths opened early ---------- */
function gardenRewardTrailPegs(t) { return 3 + Math.round(t.lv / 2); }
function gardenRewardTrailInfo(t, m) {
  const lv = m.level.level, open = m.areas.includes(t.id), fromOk = !t.from || m.areas.includes(t.from), pegs = gardenRewardTrailPegs(t), have = gardenHas('mat:peg');
  return { t, open, fromOk, pegs, have, early: !open && fromOk && lv < t.lv && lv >= t.lv - GR_ECON.trailEarly, opensAt: t.lv - GR_ECON.trailEarly };
}
function gardenRewardOpenTrail(id) {
  const t = GARDEN_LAND_TRAILS.find(x => x.id === id); if (!t) return _gdNo('There is no such path');
  const m = gardenModel(), I = gardenRewardTrailInfo(t, m);
  if (I.open) return _gdNo(`${t.name} is open already`);
  if (!I.early) return _gdNo(I.fromOk ? `You can open ${t.name} from garden level ${I.opensAt}` : 'The path before it has to open first');
  if (I.have < I.pegs) return _gdNo(`${t.name} takes ${I.pegs} survey pegs: you have ${I.have}`);
  const lk = 'b.' + m.today + '.' + _gdUid(''), mark = _gdMark([['led', lk]]);
  _gdG().led[lk] = { d: m.today, k: 'b', i: { ['land:' + id]: 1, 'mat:peg': -I.pegs }, n: 1 };
  _gdEmit('land', { id, x: 30, y: 11, w: 3, h: 1 });
  const done = _gdDone(`${t.name} is open`, `opening ${t.name.toLowerCase()}`, mark, { icon: 'footprints' });
  gardenModel();
  return done;
}
/** Paths you opened early before their gate's level, for gardenLandsWire: a friend's copy opens them too. */
function gardenRewardTrailsWire(m) { return GARDEN_LAND_TRAILS.filter(t => m.level.level < t.lv && gardenHas('land:' + t.id) > 0).map(t => t.id); }
function gardenRewardEarly(def) { return def && def.via && gardenHas('land:' + def.via) > 0 ? GR_ECON.trailEarly : 0; }

/* ---------- materials off a price ---------- */
const _grw = { use: false };
function gardenRewardOffer(cost) {
  const most = Math.floor(cost * GR_ECON.offShare / GR_ECON.offEach); let left = most; const i = {};
  for (const r of GR_MATERIALS) { if (r.id === 'peg' || left <= 0) continue; const n = Math.min(left, gardenHas('mat:' + r.id)); if (n > 0) { i['mat:' + r.id] = -n; left -= n; } }
  const used = most - left;
  return used > 0 ? { c: cost - used * GR_ECON.offEach, i, n: used } : null;
}
function gardenRewardQuote(cost) { return _grw.use ? gardenRewardOffer(cost) : null; }
function gardenRewardWithMaterials(run) { _grw.use = true; try { return run(); } finally { _grw.use = false; } }

/* ---------- design items ---------- */
/* One row per item for the yard and the coming garden designer. The decoration rows themselves are in GARDEN_DECOR (the server checks against that file), drawn in 94-garden-rewards-1art.js.
   kind: path | fence | ground | ornament. need: what the yard takes. open: when it shows as yours to make; how: the same in plain words. */
function _grD(id, kind, need, how, open) { return Object.freeze({ id, kind, need: Object.freeze(need), how, open: open || (() => true) }); }
const GR_DESIGN = Object.freeze([
  _grD('rw-path-bark', 'path', { 'mat:timber': 1 }, 'From the start'),
  _grD('rw-path-cobble', 'path', { 'mat:stone': 2 }, 'From the start'),
  _grD('rw-path-sleeper', 'path', { 'mat:timber': 2 }, 'Own 3 pieces of land', c => c.sections >= 3),
  _grD('rw-path-shell', 'path', { 'mat:reed': 2, ticket: 2 }, 'Catch 10 kinds of fish', c => c.fish >= 10),
  _grD('rw-fence-hurdle', 'fence', { 'mat:timber': 2 }, 'From the start'),
  _grD('rw-fence-kerb', 'fence', { 'mat:stone': 2 }, 'Build 1 thing on your land', c => c.built >= 1),
  _grD('rw-fence-rope', 'fence', { 'mat:timber': 1, 'mat:reed': 2 }, 'Catch 25 kinds of fish', c => c.fish >= 25),
  _grD('rw-ground-bark', 'ground', { 'mat:timber': 1 }, 'From the start'),
  _grD('rw-ground-clover', 'ground', { 'mat:reed': 1, ticket: 2 }, 'Win 1 ribbon', c => c.ribbons >= 1),
  _grD('rw-ground-moss', 'ground', { 'mat:stone': 1, 'mat:reed': 1 }, 'Own 8 pieces of land', c => c.sections >= 8),
  _grD('rw-ground-sand', 'ground', { 'mat:stone': 1, 'mat:reed': 1 }, 'Catch 10 kinds of bug', c => c.bugs >= 10),
  _grD('rw-ground-slate', 'ground', { 'mat:stone': 2 }, 'Build 5 things on your land', c => c.built >= 5),
  _grD('rw-orn-logs', 'ornament', { 'mat:timber': 4 }, 'From the start'),
  _grD('rw-orn-marker', 'ornament', { 'mat:timber': 2, 'mat:peg': 2 }, 'Open a path early', c => c.earlyTrails >= 1),
  _grD('rw-orn-cairn', 'ornament', { 'mat:stone': 3 }, 'Learn 1 pattern of stars', c => c.stars >= 1),
  _grD('rw-orn-sheaf', 'ornament', { 'mat:reed': 3 }, 'Walk to the island in the lake', c => c.isle >= 1),
  _grD('rw-orn-urn', 'ornament', { 'mat:stone': 5, ticket: 10 }, 'Own 25 pieces of land', c => c.sections >= 25),
  // the themed ones (94-garden-style-3decor.js)
  _grD('dc-shell-pile', 'ornament', { 'mat:reed': 2, ticket: 2 }, 'Catch 5 kinds of fish', c => c.fish >= 5),
  _grD('dc-net-rack', 'ornament', { 'mat:timber': 2, 'mat:reed': 3 }, 'Catch 10 kinds of fish', c => c.fish >= 10),
  _grD('dc-cottage-gate', 'fence', { 'mat:timber': 3 }, 'From the start'),
  _grD('dc-lavender-tub', 'ornament', { 'mat:timber': 1, 'mat:reed': 2 }, 'From the start'),
  _grD('dc-dead-tree', 'ornament', { 'mat:timber': 4, ticket: 6 }, 'Read 1 letter', c => c.letters >= 1),
  _grD('dc-broken-column', 'ornament', { 'mat:stone': 4 }, 'Find 3 curios', c => c.curios >= 3),
  _grD('dc-ruin-arch', 'ornament', { 'mat:stone': 8, 'mat:timber': 1 }, 'Own 15 pieces of land', c => c.sections >= 15),
  _grD('dc-stone-head', 'ornament', { 'mat:stone': 6, ticket: 8 }, 'Find 10 curios', c => c.curios >= 10),
  _grD('dc-old-wall', 'fence', { 'mat:stone': 2 }, 'Find 1 curio', c => c.curios >= 1),
  _grD('dc-stone-lion', 'ornament', { 'mat:stone': 5, ticket: 4 }, 'Build 5 things on your land', c => c.built >= 5),
]);
/** What the milestones and the design items read. All from your own garden; nothing is sent. */
function gardenRewardCtx(m) {
  const g = _gdG(), W = g.wd || {};
  return {
    sections: GARDEN_LAND_SECTIONS.filter(s => m.areas.includes(s.id)).length,
    built: GARDEN_LAND_FEATURES.filter(f => gardenHas('feat:' + f.id) > 0).length,
    curios: GARDEN_LAND_CURIOS.filter(c => gardenHas('cur:' + c.id) > 0).length,
    fish: Object.keys(g.fl || {}).length, bugs: Object.keys(g.bl || {}).length, ribbons: Object.keys(g.rib || {}).length,
    placed: Object.keys(g.decor || {}).length,
    stars: Object.keys(W).filter(k => k.startsWith('sk.')).length, letters: Object.keys(W).filter(k => k.startsWith('lr.')).length, isle: W.isle ? 1 : 0,
    earlyTrails: GARDEN_LAND_TRAILS.filter(t => gardenHas('land:' + t.id) > 0).length,
  };
}
function gardenDesignRows(m) {
  const c = gardenRewardCtx(m);
  return GR_DESIGN.map(r => { const def = gardenDecor(r.id); return def ? Object.assign({}, r, { def, isOpen: !!r.open(c), can: Object.entries(r.need).every(([k, n]) => gardenHas(k) >= n) }) : null; }).filter(Boolean);
}

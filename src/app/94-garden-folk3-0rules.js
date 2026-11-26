/* ============================================================
   PLAYING WITH THE VALE'S FOLK, the rules (npcs-PLAN 1.4 and 3.9; the folk3 plan, steps 1 to 5). Pure: no page, no DOM, no clock of
   its own, nothing called at load. It sorts after 94-garden-folk-3path.js and before every wonder file, so the game files and the
   runner's hooks find these tables at once.

   GAMES ARE DATA. VALE_GAMES holds one row per game (its rule in one line, how long it may run, how a best is counted, the material a
   win brings); VALE_GAME_FOLK says who plays what and how (Pip is quick but stops to look at the water, Tam always hides farthest away,
   the angler throws flat stones). A game asks for KINDS of things and for terrain (a finish of a finish kind along the lanes, hideable
   things, a calm water edge, things to bury treasure by), never a named place (rule 17): a layout without them simply does not offer it.

   Rewards are the economy's own (94-garden-play-0kit.js, 94-garden-rewards-0rules.js): games pay XP, friendship and materials inside the
   day's caps, never coins; the prize ladders below are placeable things given once ever per step, and the ribbons pay their coins once.

   VF3_RUN                      a villager's run, world px a second (you run at GW_SPEED.run, 260)
   VF3_POSE_CLS[pose]           the classes a pose adds to a cast drawing (src/styles/94-garden-folk3.css moves the named groups)
   VF3_POSE_VIEW[pose]          the drawing a standing pose reads best in ('s' face on; otherwise side on)
   valeGameFolkOk(ids, flags)   true when nobody in the list is 'no' or 'cold' with anyone else in it (Hollin is never put beside Quince)
   valeGamePlayers(game, have)  the villagers who play `game`, best first, out of those who are about
   valeRaceBand(lead, steady)   a folk racer's speed share from how far ahead (+) or behind (-) of the best person they are, in cells
   valeSkips(q, calm, r)        the skips a throw makes from its quality (0..1), how calm the water is (0..1) and a little luck (0..1)
   valePrizeStep(game, n)       the prize ladder's rows reached at `n` wins (or best, for skimming)
   ============================================================ */
const VF3_RUN = 250;
/** Poses for the folk (all three drawings carry the gca-* group names: gca-up the body, gca-hd the head, gca-ar / gca-lg a (near) and b (far)). */
const VF3_POSE_CLS = Object.freeze({
  cheer: 'gca-cheer', clap: 'gca-clap', point: 'gca-point', crouch: 'gca-crouch', peek: 'gca-crouch gca-peek', count: 'gca-count', listen: 'gca-listen',
  boots: 'gca-boots', throw: 'gca-throw', ready: 'gca-ready', seek: 'gca-seekp', dig: 'gca-dig', shrug: 'gca-shrug', laugh: 'gca-laugh',
});
const VF3_POSE_VIEW = Object.freeze({ cheer: 's', clap: 's', count: 's', shrug: 's', laugh: 's' });
/** The kinds a race may finish at: things you can see from a way off and touch (a sign, a bell, a well, a post box). */
const VALE_FINISH_KINDS = Object.freeze(['signpost', 'milestone', 'bell', 'well', 'village-well', 'garden-well', 'postbox', 'sundial', 'pump', 'notice-board', 'maypole']);
/** Things big enough to hide behind (trees come from the painter's own trunk list; tall decorations by their drawn height). */
const VALE_HIDE_KINDS = Object.freeze(['hay', 'reeds', 'log-pile', 'barn', 'stall', 'boat', 'building', 'hollow', 'treehouse', 'tower', 'wall']);
/** Things treasure may be buried beside (the hole is dug on open ground next to it). */
const VALE_HUNT_KINDS = Object.freeze(['tree', 'fruit-tree', 'bench', 'stump', 'log-seat', 'well', 'village-well', 'signpost', 'milestone', 'stones', 'sundial', 'log-pile', 'hay', 'lamp', 'postbox', 'bath', 'trough']);
/** No game uses water this near a thing of these kinds (the mill race is out of play: FUN-ROADMAP rule 6). */
const VALE_NO_PLAY_NEAR = Object.freeze({ kinds: ['mill'], r: 10 });
const VALE_GAMES = Object.freeze({
  race: Object.freeze({ id: 'race', name: 'Race you!', word: 'Race', icon: 'flag', rule: 'First to the finish. Follow the flags.', folk: [0, 3], gather: 12, ready: 3, cap: 75, after: 20, best: 'low', unit: 'time', px: [1600, 6500], wide: [1200, 9000], mat: 'mat:stone', matWords: 'a spare sett from Bramble' }),
  seek: Object.freeze({ id: 'seek', name: 'Hide and seek', word: 'Hide and seek', icon: 'eye', rule: 'They hide. You look. Walk up to someone and press E: Found you!', folk: [1, 3], gather: 6, ready: 10, cap: 210, best: 'low', unit: 'secs', r: 12, mat: 'mat:timber', matWords: 'a good stick Tam found' }),
  stones: Object.freeze({ id: 'stones', name: 'Skimming stones', word: 'Skimming', icon: 'waves', rule: 'Three throws each, turn about. The most skips wins. Throw when the marker is in the middle.', folk: [1, 2], gather: 8, ready: 2, cap: 150, best: 'high', unit: 'skips', throws: 3, r: 6, mat: 'mat:stone', matWords: 'a flat stone, the best kind' }),
  hunt: Object.freeze({ id: 'hunt', name: 'Treasure hunt', word: 'Treasure', icon: 'map', rule: 'Three things are buried. Read the clue, find the place, press E to dig.', folk: [1, 2], gather: 4, ready: 2, cap: 300, best: 'low', unit: 'secs', r: 26, spots: 3, mat: 'mat:timber', matWords: 'an old plank from the chest' }),
});
const VALE_GAME_IDS = Object.freeze(Object.keys(VALE_GAMES));
/** Who plays what, and how. asks: the games they ask you to play, in the order they like them. A villager not listed plays nothing yet. */
const VALE_GAME_FOLK = Object.freeze({
  pip: Object.freeze({ asks: ['race', 'stones', 'seek'], race: { pace: 1.05, stop: 'water' }, seek: { hide: 'middle', tell: 'tail', every: [15, 25] }, stones: { skips: [3, 9] }, hunt: { pace: 1.1, wrong: 1 } }),
  quince: Object.freeze({ asks: ['seek', 'race'], race: { pace: 0.98, steady: 1 }, seek: { hide: 'near', tell: 'giggle', every: [18, 30] }, stones: { skips: [2, 6] } }),
  tam: Object.freeze({ asks: ['hunt', 'seek'], seek: { hide: 'farthest', tell: 'soil', at: 60 }, hunt: { pace: 0.8, dig: 1 } }),
  bramble: Object.freeze({ asks: ['hunt'], race: { pace: 0.9, starter: 1 }, hunt: { maker: 1 } }),
  angler: Object.freeze({ asks: ['stones'], stones: { skips: [5, 8], few: 1 } }),
  perpetua: Object.freeze({ race: { keeper: 1 } }),
});
/** A villager who plays `game` at all (a starter or a keeper only helps). */
function valeGamePlays(id, game) { const r = VALE_GAME_FOLK[id]; const g = r && r[game]; return !!g && !g.starter && !g.keeper && !g.maker; }
/** Everyone in the list gets on (never two who are 'no' or 'cold' with each other in one game). */
function valeGameFolkOk(ids, flags) {
  if (typeof valeFolkRel !== 'function') return true;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const r = valeFolkRel(ids[i], ids[j], flags); if (r === 'no' || r === 'cold') return false; }
  return true;
}
/** The villagers who play `game`, best first (the one who asked first), out of `have` (ids about now), at most the game's own number. */
function valeGamePlayers(game, have, first) {
  const G = VALE_GAMES[game]; if (!G) return [];
  const out = []; if (first && valeGamePlays(first, game)) out.push(first);
  for (const id of have) { if (out.length >= G.folk[1]) break; if (out.includes(id) || !valeGamePlays(id, game)) continue; if (valeGameFolkOk(out.concat(id))) out.push(id); }
  return out;
}
/** A folk racer's speed share: a little slower when well ahead of the best person, a little quicker when well behind, so you win a
 *  little over half the time; a steady one never speeds up. lead: cells ahead (+) or behind (-). */
function valeRaceBand(lead, steady) {
  let b = 1;
  if (lead > 3) b = 0.92 - Math.min(0.07, (lead - 3) * 0.01);
  else if (lead < -3 && !steady) b = 1.08 + Math.min(0.04, (-lead - 3) * 0.008);
  return Math.max(0.85, Math.min(1.12, b));
}
/** The skips a throw makes: the throw's quality (0..1: how near the middle you let go), the water's calm (0..1) and a little luck (0..1).
 *  1 to 12; a perfect throw on still water goes 10 to 12. */
function valeSkips(q, calm, luck) {
  const k = Math.max(0, Math.min(1, q)) * (0.7 + 0.3 * Math.max(0, Math.min(1, calm)));
  return Math.max(1, Math.min(12, Math.round(1 + k * 9 + (luck - 0.35) * 2.6)));
}
/** A folk throw: their own range, with luck. */
function valeFolkSkips(id, luck) { const g = (VALE_GAME_FOLK[id] || {}).stones || { skips: [2, 6] }; const [a, b] = g.skips; return Math.max(1, Math.min(12, Math.round(a + (b - a) * luck))); }
/** The prize ladders: placeable things, each given once ever, by your wins (by your best throw, for skimming). They are GARDEN_DECOR rows
 *  (94-garden-0catalog.js) and painted in 94-garden-native-painted-decor-8games.js. */
const VALE_PRIZES = Object.freeze({
  race: Object.freeze([[1, 'vg-race-pennant'], [3, 'vg-ribbon-rack'], [6, 'vg-podium'], [12, 'vg-race-cup']]),
  seek: Object.freeze([[1, 'vg-seek-lantern'], [3, 'vg-ready-board'], [6, 'vg-hiding-hoop']]),
  stones: Object.freeze([[5, 'vg-stone-cairn'], [8, 'vg-tally-board'], [12, 'vg-twelve-stone']]),
  hunt: Object.freeze([[1, 'vg-treasure-chest'], [3, 'vg-map-post'], [6, 'vg-x-stone']]),
});
function valePrizeStep(game, n) { return (VALE_PRIZES[game] || []).filter(r => n >= r[0]); }
/** What a game's best is in words: a race in seconds (from tenths), a round of seeking in seconds, skips. */
function valeBestWords(game, v) {
  if (!Number.isFinite(v)) return '';
  if (game === 'race') return (v / 10).toFixed(1) + ' s';
  if (game === 'stones') return v + (v === 1 ? ' skip' : ' skips');
  const s = Math.round(v); return s >= 60 ? Math.floor(s / 60) + ' min ' + (s % 60) + ' s' : s + ' s';
}

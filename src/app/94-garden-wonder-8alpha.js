/* ============================================================
   THE ALPHA BOOST. While the game is in alpha testing, every garden is lifted to the top once so the whole vale can be tried:
   the highest level, a big purse of coins, timber and stone, every tool, rod and net, and a sack of compost.
   The owner, 24 Nov 2026: "max out my garden level etc too ... as we are still in alpha testing state; we can reset it when we enter beta."
   It is one ledger line (plg.alpha1), written once in your own garden, so it syncs and shows on every device like any other gift,
   and a mark in `seen` (pl.gr.alpha1, gpGrant's kind), because the ledger folds lines older than 40 days into the bank: with
   the line alone the boost was given again 40 days on. A garden boosted before the mark existed gets it from its line.
   For beta: set `on` to false (no new boosts), and the garden reset clears the line with everything else.
   ============================================================ */
const GARDEN_ALPHA_BOOST = Object.freeze({ on: true, key: 'plg.alpha1', seen: 'pl.gr.alpha1', level: 99, coins: 1000000, timber: 5000, stone: 5000, compost: 200 });
function gardenAlphaBoosted() { const g = _gdG(), B = GARDEN_ALPHA_BOOST; return !!(g && (g.led && g.led[B.key] || g.seen && g.seen[B.seen])); }
/** The mark for a garden boosted before it existed, while its line is still in the ledger (so every device has it before the fold). */
function _gabMark() {
  const g = _gdG(), B = GARDEN_ALPHA_BOOST, e = g && g.led && g.led[B.key];
  if (!e || !g.seen || g.seen[B.seen] || typeof gardenVisitOn === 'function' && gardenVisitOn()) return;
  g.seen[B.seen] = e.d || _gdToday(); _gdSave();
}
function _gabItems() {
  const B = GARDEN_ALPHA_BOOST, i = { 'mat:timber': B.timber, 'mat:stone': B.stone, fertiliser: B.compost };
  for (const t of GARDEN_TOOLS) if (t.kind !== 'consumable') i['tool:' + t.id] = 1;
  for (const r of (typeof GARDEN_RODS !== 'undefined' ? GARDEN_RODS : [])) if (r && r.id) i['gear:' + r.id] = 1;
  for (const r of (typeof GARDEN_NETS !== 'undefined' ? GARDEN_NETS : [])) if (r && r.id) i['gear:' + r.id] = 1;
  return i;
}
/** Gives it, once. False when it is off, already given (here or on another device), or you are visiting a friend. */
function gardenAlphaBoost() {
  const B = GARDEN_ALPHA_BOOST, g = _gdG();
  if (!B.on || !g || !g.since || !g.led || gardenAlphaBoosted()) return false;
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) return false;
  g.led[B.key] = { d: _gdToday(), k: 'pl', c: B.coins, x: 25 * B.level * (B.level - 1), i: _gabItems(), n: 0 };
  g.seen[B.seen] = _gdToday();
  _gdSave();
  if (typeof gardenMessage === 'function') gardenMessage(`Alpha tester boost: level ${B.level}, ${B.coins.toLocaleString()} coins, ${B.timber.toLocaleString()} timber and stone, and every tool, rod and net. Have fun trying everything!`, { icon: 'gift', ms: 12000 });
  return true;
}
wdMod({
  id: 'alpha-boost', fun: false,
  begin() { _gabMark(); gardenAlphaBoost(); },
  tick() { if (!gardenAlphaBoosted()) gardenAlphaBoost(); else _gabMark(); },
  end() {},
});

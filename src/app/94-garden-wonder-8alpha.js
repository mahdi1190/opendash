/* ============================================================
   THE ALPHA BOOST. While the game is in alpha testing, every garden is lifted to the top once so the whole vale can be tried:
   the highest level, a big purse of coins, timber and stone, every tool, rod and net, and a sack of compost.
   The owner, 24 Nov 2026: "max out my garden level etc too ... as we are still in alpha testing state; we can reset it when we enter beta."
   It is one ledger line (plg.alpha1), written once in your own garden, so it syncs and shows on every device like any other gift.
   For beta: set `on` to false (no new boosts), and the garden reset clears the line with everything else.
   ============================================================ */
const GARDEN_ALPHA_BOOST = Object.freeze({ on: true, key: 'plg.alpha1', level: 99, coins: 1000000, timber: 5000, stone: 5000, compost: 200 });
function gardenAlphaBoosted() { const g = _gdG(); return !!(g && g.led && g.led[GARDEN_ALPHA_BOOST.key]); }
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
  _gdSave();
  if (typeof gardenMessage === 'function') gardenMessage(`Alpha tester boost: level ${B.level}, ${B.coins.toLocaleString()} coins, ${B.timber.toLocaleString()} timber and stone, and every tool, rod and net. Have fun trying everything!`, { icon: 'gift', ms: 12000 });
  return true;
}
wdMod({
  id: 'alpha-boost', fun: false,
  begin() { gardenAlphaBoost(); },
  tick() { if (!gardenAlphaBoosted()) gardenAlphaBoost(); },
  end() {},
});

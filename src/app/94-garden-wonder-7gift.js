/* ============================================================
   THE STARTER KIT. A wrapped present tucked away near where you start, in your own garden only. Press it and you walk over and open it, once:
   the mark in `seen` keeps it opened after the ledger folds its line into the bank, and both are the same on every device.
   The owner, 11 Nov 2026 (C:/tmp/gamedesign/FUN_PLAN.md #1): a small starter kit, a few tools, some seeds and one keepsake. No coin pile and no level jump,
   so the gates and the land still open one at a time (the 1 Nov kit gave 50,000 coins and level 20; gardens start fresh in Fleetwater Vale).
   To stop giving it, set `on` to false. Whoever has opened it keeps it.
   ============================================================ */
const GARDEN_EARLY_GIFT = Object.freeze({
  on: true, coins: 0, xp: 0,
  tools: Object.freeze(['can-2']),                 // GARDEN_TOOLS: a bigger watering can
  gear: Object.freeze(['rod-2']),                  // a better rod than the bamboo one (the rest are still there to earn)
  fert: 3,                                         // feeds for a plant
  seeds: 5, seedKinds: 3,                          // of each of this many quick, common kinds
  keepsake: 'clover',                              // GARDEN_KEEPSAKES: one four-leaf clover, pressed in the card
  spots: Object.freeze([[13.5, 14.5], [12.5, 17.5], [23.5, 12.5], [26.5, 14.5], [14.5, 18.5], [26.5, 18.5]]),   // world cells: tucked around the front garden, the first that is free
});
const _wdg = { S: null, at: null, hintT: 0 };
let _wdgHinted = false;
function gardenEarlyGiftTaken() { const g = _gdG(); return !!(g.led['plg.early'] || g.seen['pl.gr.early']); }
function _wdgPace(p) { const r = { fast: 0, quick: 0, medium: 1, normal: 1, slow: 2, tree: 3, ancient: 4 }[p.grow]; return r == null ? 1 : r; }   // quick growers first: the first bloom is the first moment
function _wdgItems() {
  const G = GARDEN_EARLY_GIFT, i = {};
  for (const id of G.tools) if (typeof _GD_TOOL === 'undefined' || _GD_TOOL.has(id)) i['tool:' + id] = 1;
  for (const id of G.gear) i['gear:' + id] = 1;
  if (G.fert) i.fertiliser = G.fert;
  const quick = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && p.rarity === 'common' && p.lv <= 1 && p.cat === 'flower' && p.id !== G.keepsake).sort((a, b) => _wdgPace(a) - _wdgPace(b) || a.price - b.price);
  for (const p of quick.slice(0, G.seedKinds)) i['seed:' + p.id] = G.seeds;
  return i;
}
function _wdgKitWords() {
  const G = GARDEN_EARLY_GIFT, seeds = Object.keys(_wdgItems()).filter(k => k.startsWith('seed:')).map(k => (gardenPlant(k.slice(5)) || {}).name).filter(Boolean).map(n => n.toLowerCase());
  return `A bigger watering can, a better rod, ${G.fert} bags of compost for your plants, and ${G.seeds} seeds each of ${seeds.length > 1 ? seeds.slice(0, -1).join(', ') + ' and ' + seeds[seeds.length - 1] : seeds[0] || 'something quick'}. And a four-leaf clover, pressed in the card, for luck.`;
}
/** Opens it. False if it has been opened already, here or on another device. */
function gardenEarlyGiftOpen() {
  const G = GARDEN_EARLY_GIFT, g = _gdG();
  if (!G.on || !g.since || gardenEarlyGiftTaken()) return false;
  g.led['plg.early'] = { d: _gdToday(), k: 'pl', c: G.coins, x: G.xp, i: _wdgItems(), n: 1 };
  g.seen['pl.gr.early'] = _gdToday();
  _gdSave();
  if (G.keepsake && typeof gardenLifeFound === 'function') gardenLifeFound('k', G.keepsake, { quiet: true });   // the keepsake goes in the book (94-garden-life-6book.js)
  return true;
}
function _wdgArt() {
  return `<g class="gl-gift">${GART.P('#2f6f8e', GART.rrect(-9, -14, 18, 14, 1.6))}${GART.P('#f2c432', GART.rect(-1.6, -14, 3.2, 14) + GART.rect(-9, -8.6, 18, 2.8))}${GART.P('#f2c432', 'M0 -14C-7 -21 -9 -14 0 -14C9 -14 7 -21 0 -14z')}</g><g class="gl-twinkle" transform="translate(9 -20)"><path d="M0 -6L1.4 -1.4L6 0L1.4 1.4L0 6L-1.4 1.4L-6 0L-1.4 -1.4z" fill="#fff4b8"/></g>`;
}
function _wdgDrop() { if (_wdg.S) { _wdg.S.remove(); _wdg.S = null; } _wdg.at = null; }
function _wdgOpen() {
  const a = _wdg.at; if (!a || !gardenEarlyGiftOpen()) { _wdgDrop(); return; }
  const G = GARDEN_EARLY_GIFT;
  _wdgDrop();
  _glFx(a.x, a.y, 'sparkle', { lift: 14 }); _glSound('twinkle');
  wdTalk({ name: 'A note on the ribbon', at: a, art: _wdgArt(), bye: 'Thank you', lines: [
    'Welcome to the garden. A few things to start you off.',
    _wdgKitWords() + ' It is all in your bag.',
    'The rest is out there. Every gate opens with something you find, so have a look around.',
  ] });
}
function _wdgPlace(m) {
  if (_wdg.S || !GARDEN_EARLY_GIFT.on || !_gdG().since || gardenEarlyGiftTaken()) return;
  const open = ([x, y]) => gardenWorldFree(x, y, 0.3) && !m.occ.has(Math.floor(x) + ',' + Math.floor(y)) && (typeof gardenAreaOpenAt !== 'function' || gardenAreaOpenAt(x, y));
  // (spots are v3 cells: moved onto this island first; the traveller lingers just right of the arrival, so a spot is kept clear of that)
  let c = GARDEN_EARLY_GIFT.spots.map(([x, y]) => { const p = gardenStarterCell(x, y, 'start'); return [p.x, p.y]; }).find(open);
  if (!c) { const f = _gwNearestFreePt(GARDEN_WORLD.start.x - 2, GARDEN_WORLD.start.y + 1, 4); if (!f) return; c = [f.x, f.y]; }   // (left of the arrival: the traveller lingers to its right)
  _wdg.at = { x: c[0], y: c[1] };
  _wdg.S = wdSprite({ id: 'wd-early-gift', x: c[0], y: c[1], still: true, hit: 1, hitUp: 8, label: 'A starter kit, with your name on it', cursor: 'hand', svg: _wdgArt(), onClick: _wdgOpen });
  _wdg.hintT = 4;
}
wdMod({
  id: 'early-gift', fun: false,
  begin(m) { _wdg.S = null; _wdg.at = null; _wdgPlace(m); },
  tick(m) {
    if (gardenEarlyGiftTaken()) { _wdgDrop(); return; }   // (opened on another device)
    _wdgPlace(m);
    if (_wdg.S && !_wdgHinted && (_wdg.hintT -= 1) <= 0) { _wdgHinted = true; wdAmbient(`Something is glinting near ${_wdLandmark(_wdg.at.x, _wdg.at.y)}.`, 8000, 'gift'); }
  },
  end() { _wdgDrop(); },
});

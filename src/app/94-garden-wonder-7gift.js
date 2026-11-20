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
// The starter kit: an oak crate stood in the grass, the rod and the watering can's rose poking out of it, a blue cloth
// tied over the seeds with a yellow ribbon and a name tag. Its foot sits on a soft contact shadow, with grass grown up
// round it, so it reads as set down on the ground, not floating (rule 13 of the round 3 brief).
function _wdgArt() {
  return `<g class="gl-gift"><ellipse cx="1" cy="0.4" rx="13" ry="2.8" fill="#2a3018" opacity=".32"/>`
    + `<path d="M-3 -15L-6 -33" stroke="#8a6a46" stroke-width="1.1" stroke-linecap="round"/><path d="M-6 -33q4 4 3 9" stroke="#e8e2d0" stroke-width=".4" fill="none"/>`
    + `<path d="M6 -14l3 -6l4 -1l-1 3l-3 1z" fill="#5e8aa8"/><ellipse cx="12.4" cy="-20.4" rx="1.6" ry="2.2" fill="#3e6a88"/>`
    + `<path d="M-10 -13.4L-9.4 0H9.4L10 -13.4Z" fill="#a07a52"/><path d="M-10 -13.4L-9.4 0H-6L-6.4 -13.4Z" fill="#c8a070" opacity=".8"/><path d="M6.4 -13.4L6 0H9.4L10 -13.4Z" fill="#6e5236"/>`
    + `<path d="M-9.8 -9.4H9.8M-9.6 -4.8H9.6" stroke="#5e4630" stroke-width=".7"/><path d="M-10.4 -14.6H10.4V-12.6H-10.4Z" fill="#7e5e3c"/>`
    + `<path d="M-7 -13Q-8 -19 0 -19.6Q8 -19 7 -13Z" fill="#2f6f8e"/><path d="M-7 -13Q-7.6 -17.6 -2 -18.8L-3 -13Z" fill="#5a98b8" opacity=".8"/>`
    + `<path d="M-1 -19.4V-13" stroke="#f2c432" stroke-width="1.6"/><path d="M-1 -19C-6 -24 -8 -19 -1 -19C6 -24 6 -19 -1 -19z" fill="#f2c432"/><path d="M-1 -19l-3 4M-1 -19l2.6 4.4" stroke="#e0a820" stroke-width=".9"/>`
    + `<path d="M5.4 -8.6l4.6 -1v3.4l-4.6 .6z" fill="#f6efdc"/><path d="M5.4 -8.6l-1.6 -1.4" stroke="#c8bfa8" stroke-width=".4"/>`
    + `<path d="M-12 .6q1 -4 0 -6M-10.6 .8q1.6 -3 1 -5M11 .6q-1 -4 0 -6M12.6 .8q0 -3 1.4 -4.4M-2 .8q.4 -2.4 -.6 -3.6" stroke="#6e9a46" stroke-width=".8" fill="none" stroke-linecap="round"/></g>`
    + `<g class="gl-twinkle" transform="translate(11 -26)"><path d="M0 -5L1.2 -1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2 -1.2z" fill="#fff4b8"/></g>`;
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
    'The rest is out there. Every gate opens with something you find. Start with the Forest arch, just west of here: it needs garden shears, and Mother Thistle left hers by the reed bank, where you can hear the falls.',
  ] });
}
/** The welcome on arrival: a real note over the garden (an ambient line is only logged, never shown), naming the kit and the first thing to do. */
function _wdgWelcome() {
  const a = _wdg.at; if (!a) return;
  const near = _wdLandmark(a.x, a.y), go = () => { if (_wdg.at && typeof gardenWalkToPoint === 'function') gardenWalkToPoint({ x: _wdg.at.x, y: _wdg.at.y }, _wdgOpen, { radius: 1.2 }); };
  if (!gardenMessage(`Welcome to Fleetwater Vale! A starter kit with your name on it is waiting near ${near}: a watering can, a rod, compost and seeds. Tap the little blue present to open it.`, { icon: 'gift', ms: 16000, action: { label: 'Take me there', run: go } }))
    wdAmbient(`Something is glinting near ${near}.`, 8000, 'gift');
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
    if (_wdg.S && !_wdgHinted && (_wdg.hintT -= 1) <= 0 && gardenShownNow()) { _wdgHinted = true; _wdgWelcome(); }
  },
  end() { _wdgDrop(); },
});

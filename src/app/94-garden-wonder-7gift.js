/* ============================================================
   THE EARLY GIFT. The owner, 1 Nov 2026: new and first users get loads of money, a decent level, materials and items, to thank them for being early and to play with everything; "a clickable item we pick up, hidden somewhere".
   A wrapped present tucked away near where you start, in your own garden only. Press it and you walk over and open it, once: the mark in `seen` keeps it opened after the ledger folds its line into the bank, and both are the same on every device.
   To stop giving it, set `on` to false. Whoever has opened it keeps it.
   ============================================================ */
const GARDEN_EARLY_GIFT = Object.freeze({
  on: true, coins: 50000, xp: 9500,                // 9500 is what garden level 20 takes (gardenLevelOf)
  mats: Object.freeze({ peg: 40, timber: 80, stone: 80, reed: 80 }), tickets: 50, treats: 40,
  gear: Object.freeze(['rod-2', 'rod-3', 'rod-4', 'net-2', 'net-3']),   // the golden ones are still there to earn
  bait: 25, seeds: 5, seedKinds: 24,               // of each bait on sale; of each of this many kinds of seed
  spots: Object.freeze([[13.5, 14.5], [12.5, 17.5], [23.5, 12.5], [26.5, 14.5], [14.5, 18.5], [26.5, 18.5]]),   // world cells: tucked around the front garden, the first that is free
});
const _wdg = { S: null, at: null, hintT: 0 };
let _wdgHinted = false;
function gardenEarlyGiftTaken() { const g = _gdG(); return !!(g.led['plg.early'] || g.seen['pl.gr.early']); }
function _wdgItems() {
  const G = GARDEN_EARLY_GIFT, i = { ticket: G.tickets, ptreat: G.treats };
  for (const [id, n] of Object.entries(G.mats)) i['mat:' + id] = n;
  for (const id of G.gear) i['gear:' + id] = 1;
  for (const b of GARDEN_BAITS) if (b.price > 0) i['bait:' + b.id] = G.bait;
  for (const id of [...new Set(_gdSeedPool(p => p.rarity === 'common' || p.rarity === 'uncommon'))].slice(0, G.seedKinds)) i['seed:' + id] = G.seeds;
  return i;
}
/** Opens it. False if it has been opened already, here or on another device. */
function gardenEarlyGiftOpen() {
  const G = GARDEN_EARLY_GIFT, g = _gdG();
  if (!G.on || !g.since || gardenEarlyGiftTaken()) return false;
  g.led['plg.early'] = { d: _gdToday(), k: 'pl', c: G.coins, x: G.xp, i: _wdgItems(), n: 1 };
  g.seen['pl.gr.early'] = _gdToday();
  _gdSave();
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
    'Thank you for being one of the first people here. This is for you, so you can try everything.',
    `${G.coins.toLocaleString('en-GB')} coins, and enough experience for garden level 20. Timber, stone, reeds and survey pegs for building. Better rods and nets, bait, seeds, tickets and pet treats. It is all in your bag.`,
  ] });
}
function _wdgPlace(m) {
  if (_wdg.S || !GARDEN_EARLY_GIFT.on || !_gdG().since || gardenEarlyGiftTaken()) return;
  const open = ([x, y]) => gardenWorldFree(x, y, 0.3) && !m.occ.has(Math.floor(x) + ',' + Math.floor(y)) && (typeof gardenAreaOpenAt !== 'function' || gardenAreaOpenAt(x, y));
  let c = GARDEN_EARLY_GIFT.spots.find(open);
  if (!c) { const f = _gwNearestFreePt(GARDEN_WORLD.start.x + 2, GARDEN_WORLD.start.y + 1, 4); if (!f) return; c = [f.x, f.y]; }
  _wdg.at = { x: c[0], y: c[1] };
  _wdg.S = wdSprite({ id: 'wd-early-gift', x: c[0], y: c[1], still: true, hit: 1, hitUp: 8, label: 'A present, with your name on it', cursor: 'hand', svg: _wdgArt(), onClick: _wdgOpen });
  _wdg.hintT = 4;
}
wdMod({
  id: 'early-gift', fun: false,
  begin(m) { _wdg.S = null; _wdg.at = null; _wdgPlace(m); },
  tick(m) {
    if (gardenEarlyGiftTaken()) { _wdgDrop(); return; }   // (opened on another device)
    _wdgPlace(m);
    if (_wdg.S && !_wdgHinted && (_wdg.hintT -= 1) <= 0) { _wdgHinted = true; wdWhisper(`Something is glinting near ${_wdLandmark(_wdg.at.x, _wdg.at.y)}.`, 8000); }
  },
  end() { _wdgDrop(); },
});

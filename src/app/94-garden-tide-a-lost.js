/* ============================================================
   LOST AND FOUND (FUN-ROADMAP phase 2, theme B). Most days one of the vale's folk has lost something that matters to them ("my
   spectacles, last seen near water"). It turns up as a glint beside a thing of that kind somewhere in the open vale (any bench, any
   signpost, any pier or bridge, any lamp, well or fire: by kind, never by place). They tell you when you talk to them, and the
   others mention it too. With a pet, it puts its nose down and leads you a little closer now and then. Give it back: they are
   delighted, say why it matters, and pay you in coins and friendship.
   Smaller things turn up too, with a clue tag ("smells of soup"): give one to whoever you think owns it (the wrong one says so), or
   hand it in at any post box, where Perpetua guesses the owner, badly. Unclaimed after a week, it is yours to keep.
   With friends, live: a friend who finds it in your vale can give it back too, and the villager thanks you both by name
   (tide|lback to the host). Their app keeps a note of it in their snapshot (ti.lf), so the host's agrees even later.
   Everything is worked out from the strand's number (94-garden-tide-0rules.js gardenTideSeed) and the day, so a friend sees the
   same thing in the same place. Saved: g.wd['tlf.<day>'] 'g' found, 'r' given back, 'f' a friend gave it back; g.wd['tlfh.<day>']
   heard about it; on a friend's vale g.wd['tlfv.<friend>.<day>']; the clue-tag things g.wd['tlo.<day>'] ('g', 'r', or {p: day} at
   the post office); g.wd['tlok.<day>'] kept after a week; rewards in the ledger (tlr.<day>, tlor.<day>, tlok.<day>).
   ============================================================ */
const GT_LOST_KINDS = Object.freeze({
  water: Object.freeze(['pier', 'fishing-bank', 'bridge', 'boat']), seat: Object.freeze(['bench', 'seat', 'log-seat', 'stump', 'picnic']),
  sign: Object.freeze(['signpost', 'notice-board', 'milestone']), lamp: Object.freeze(['lamp']), well: Object.freeze(['well', 'garden-well', 'village-well', 'pump', 'trough']),
  fire: Object.freeze(['campfire', 'fire']), wall: Object.freeze(['wall', 'stones', 'sundial']),
});
const GT_LOST_WHERE = Object.freeze({ water: 'near water', seat: 'by a bench', sign: 'by a signpost', lamp: 'under a lamp', well: 'by a well', fire: 'by a fire', wall: 'by an old wall' });
// what the folk lose: whose, where it turns up (a kind of place), and why it matters (said when it comes back). The art is drawn below.
const GT_LOST = Object.freeze([
  Object.freeze({ id: 'spectacles', v: 'tam', name: 'spectacles', it: 'them', where: 'water', why: 'Without them I dig in circles. Now I can see what I have been digging all week. Oh. Hm. Well, thank you.' }),
  Object.freeze({ id: 'trowel', v: 'tam', name: 'little trowel', it: 'it', where: 'well', why: 'My grandmother’s trowel. It has dug more of this vale than anyone. I would have missed it terribly.' }),
  Object.freeze({ id: 'pencil', v: 'bramble', name: 'best pencil', it: 'it', where: 'seat', why: 'Every map in the vale was drawn with that pencil. The other pencils are not the same. They know it, too.' }),
  Object.freeze({ id: 'map-case', v: 'bramble', name: 'map case', it: 'it', where: 'sign', why: 'Forty years of maps in there. Some of them are even right. Thank you. Truly.' }),
  Object.freeze({ id: 'scarf', v: 'pip', name: 'red scarf', it: 'it', where: 'seat', why: 'My mum knitted it the winter the river froze. It has been in the river more times than I have. Thank you!' }),
  Object.freeze({ id: 'float', v: 'pip', name: 'lucky float', it: 'it', where: 'water', why: 'Every big fish I ever caught came up under that float. Well, both of them. Thank you!' }),
  Object.freeze({ id: 'thimble', v: 'thistle', name: 'silver thimble', it: 'it', where: 'seat', why: 'I have darned every sock in the vale wearing that. It was a present, a long time ago. You are kind.' }),
  Object.freeze({ id: 'ladle', v: 'thistle', name: 'soup ladle', it: 'it', where: 'fire', why: 'No soup tonight without it, and the frogs were looking forward to soup. They will thank you in their own way.' }),
  Object.freeze({ id: 'quill', v: 'wick', name: 'writing quill', it: 'it', where: 'lamp', why: 'I write down every star I see with that. It is one of my own feathers, from a younger year. I am grateful.' }),
  Object.freeze({ id: 'chart', v: 'wick', name: 'star chart', it: 'it', where: 'wall', why: 'I could find the stars without it, of course. I simply prefer to know where they are. Thank you.' }),
  Object.freeze({ id: 'honey-spoon', v: 'quince', name: 'honey spoon', it: 'it', where: 'well', why: 'The bees know that spoon. They will not let me have honey with any other. You have saved my breakfast.' }),
  Object.freeze({ id: 'bee-brush', v: 'quince', name: 'bee brush', it: 'it', where: 'sign', why: 'For brushing bees off the jam, very gently. They do not mind it. They mind everything else.' }),
]);
// smaller things with a clue tag: whose they are is for you to guess (the tag says something about them)
const GT_ODD = Object.freeze([
  Object.freeze({ id: 'spoon', name: 'wooden spoon', clue: 'smells of soup', v: 'thistle', where: 'seat' }),
  Object.freeze({ id: 'mitten', name: 'odd mitten', clue: 'full of soil', v: 'tam', where: 'wall' }),
  Object.freeze({ id: 'button', name: 'brass button', clue: 'smells of the river', v: 'pip', where: 'water' }),
  Object.freeze({ id: 'ribbon', name: 'hair ribbon', clue: 'sticky with honey', v: 'quince', where: 'seat' }),
  Object.freeze({ id: 'rubber', name: 'pencil rubber', clue: 'grey with map smudges', v: 'bramble', where: 'sign' }),
  Object.freeze({ id: 'cup', name: 'tiny teacup', clue: 'smells of the woods at night', v: 'wick', where: 'lamp' }),
  Object.freeze({ id: 'glove', name: 'gardening glove', clue: 'smells of lavender', v: 'quince', where: 'well' }),
  Object.freeze({ id: 'bell', name: 'little bell', clue: 'has a hedgehog’s prickle caught in it', v: 'thistle', where: 'fire' }),
  Object.freeze({ id: 'boat', name: 'toy boat', clue: 'still wet', v: 'pip', where: 'water' }),
  Object.freeze({ id: 'nib', name: 'pen nib', clue: 'has star dust on it, or ink', v: 'wick', where: 'wall' }),
]);
const GT_ODD_NO = Object.freeze({
  pip: 'Not mine, I am afraid. I would remember a thing like that. I would probably have lost it in the river.', quince: 'Oh, how lovely. But no, not mine.',
  bramble: 'Not mine. I keep a list of everything I own. It is a very short list.', tam: 'No. I would know it by the feel. That one does not feel like mine.',
  thistle: 'Not mine, dear. Ask about. Somebody will be missing it.', wick: 'I do not own that. I own very few things, and all of them are in my nest.',
});
const GT_PERPETUA_GUESS = Object.freeze(['Perpetua looks at it for a very long time. “The owl’s,” she says. It is almost certainly not the owl’s.', '“I know exactly whose this is,” says Perpetua, and writes MINE on the label, and then crosses it out.', 'Perpetua puts it in the lost things box with great care. “The badger,” she says. “Or someone shaped like the badger.”', '“A week,” says Perpetua. “If nobody comes, it is yours. Nobody ever comes. I deliver everything else.”']);
const GT_LOST_PAY = Object.freeze({ c: 15, x: 3, odd: 8, keep: 5, friend: 5 });
const _gtl = { key: '', at: null, oddKey: '', odd: null, hintT: 0, img: new Map(), atlas: false, busy: false };

/* ---------- today's lost thing, where it turned up ---------- */
function _gtlDay() { try { const T = gardenTideNow(); return _gtdIso(T.lm); } catch (e) { return _gdToday(); } }   // (the garden's own day: a friend's, on a visit)
function _gtlOpen(x, y) { try { const z = gardenIslandZoneAt(Math.floor(x), Math.floor(y)); const m = gardenHere(); return !z || (m.areas || []).includes('zn-' + z); } catch (e) { return true; } }
/** A place beside a thing of one of these kinds (seeded), on open ground in open land: {x, y, t} or null. */
function _gtlPlace(kinds, salt) {
  let list = []; try { list = gardenAffordThings(); } catch (e) { return null; }
  const want = new Set(kinds), things = list.filter(t => want.has(t.kind) && t.src !== 'decor' && _gtlOpen(t.x, t.y)).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (!things.length) return null;
  const r = gardenRand(gardenHash('tide-lost-at|' + salt));
  for (let k = 0; k < Math.min(8, things.length); k++) {
    const t = things[Math.floor(r() * things.length)];
    for (const [dx, dy] of [[.55, .55], [-.55, .55], [.9, .2], [-.9, .2], [0, .85], [.4, -.45], [-.4, -.45]]) {
      const x = t.x + dx * Math.max(1, (t.w || 1) * .6), y = t.y + dy, c = gardenIslandBaseCell(x, y);
      if (!c || !c.land || c.freshwater || c.solid || c.staticId || (typeof gardenTideShallows === 'function' && gardenTideShallows(x, y))) continue;
      if (typeof _gwFree === 'function' && !_gwFree(x, y)) continue;
      if (!_gtlOpen(x, y)) continue;
      return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, t };
    }
  }
  return null;
}
/** The folk's lost thing today: {iso, row, at {x, y}} or null (about two days in seven, nobody has lost anything). */
function gardenLostToday() {
  const iso = _gtlDay(), seed = gardenTideSeed(), key = iso + '|' + seed + '|' + (gardenHere().areas || []).length;
  if (_gtl.key === key) return _gtl.at;
  _gtl.key = key; _gtl.at = null;
  const h = gardenHash('tide-lost|' + seed + '|' + iso);
  if (h % 7 < 2) return null;
  const row = GT_LOST[h % GT_LOST.length], at = _gtlPlace(GT_LOST_KINDS[row.where], seed + '|' + iso + '|' + row.id);
  if (at) _gtl.at = { iso, row, at };
  return _gtl.at;
}
/** Today's smaller thing with a clue tag: {iso, row, at} or null. */
function gardenOddToday() {
  const iso = _gtlDay(), seed = gardenTideSeed(), key = iso + '|' + seed + '|' + (gardenHere().areas || []).length;
  if (_gtl.oddKey === key) return _gtl.odd;
  _gtl.oddKey = key; _gtl.odd = null;
  const h = gardenHash('tide-odd|' + seed + '|' + iso);
  if (h % 7 < 2) return null;
  const row = GT_ODD[h % GT_ODD.length], at = _gtlPlace(GT_LOST_KINDS[row.where], seed + '|odd|' + iso + '|' + row.id);
  const L = gardenLostToday();
  if (at && !(L && Math.hypot(L.at.x - at.x, L.at.y - at.y) < 3)) _gtl.odd = { iso, row, at };
  return _gtl.odd;
}
function _gtlKey(iso) { return gardenShoreVisit() && typeof _gtcFriendTag === 'function' ? 'tlfv.' + _gtcFriendTag() + '.' + iso : 'tlf.' + iso; }
function _gtlState(iso) { return _gdG().wd[_gtlKey(iso)] || ''; }
/** Has a friend given it back in your vale (live, or as their snapshot says)? */
function _gtlFriendBack(iso) {
  const dn = gardenShoreDay(iso), snap = gardenShoreVisit();
  if (snap) return snap.ti && Array.isArray(snap.ti.lf) && snap.ti.lf.some(r => r[0] === 'me' && r[1] === dn) ? 'Your friend' : '';   // (on a visit: your host has given it back already)
  for (const f of gardenShoreFriends()) { const pair = typeof gtgPair === 'function' ? gtgPair(f.id) : ''; if (pair && Array.isArray(f.ti.lf) && f.ti.lf.some(r => r[0] === pair && r[1] === dn)) return f.name; }
  return '';
}
function _gtlOddKey(iso) { return gardenShoreVisit() && typeof _gtcFriendTag === 'function' ? 'tlov.' + _gtcFriendTag() + '.' + iso : 'tlo.' + iso; }
/** The things you are carrying for someone: [{kind: 'lost'|'odd', iso, row}]. Today's, and a clue-tag thing from the last few days. */
function gardenLostCarried() {
  const now = performance.now(); if (_gtl.carried && now - _gtl.carriedT < 800) return _gtl.carried;
  const out = _gtl.carried = [], W = _gdG().wd, L = gardenLostToday(); _gtl.carriedT = now;
  if (L && _gtlState(L.iso) === 'g') out.push({ kind: 'lost', iso: L.iso, row: L.row });
  const pre = gardenShoreVisit() && typeof _gtcFriendTag === 'function' ? 'tlov.' + _gtcFriendTag() + '.' : 'tlo.';
  for (const k of Object.keys(W)) { if (!k.startsWith(pre) || W[k] !== 'g') continue; const iso = k.slice(pre.length), O = _gtlOddFor(iso); if (O) out.push({ kind: 'odd', iso, row: O }); }
  return out;
}
function _gtlOddFor(iso) { const h = gardenHash('tide-odd|' + gardenTideSeed() + '|' + iso); return GT_ODD[h % GT_ODD.length]; }

/* ---------- picking it up ---------- */
function gardenLostRows(px, py) {
  const out = [], L = gardenLostToday(), O = gardenOddToday();
  if (L && !_gtlState(L.iso) && !_gtlFriendBack(L.iso) && Math.hypot(L.at.x - px, (L.at.y - py) * 1.3) < 1.6) out.push({ key: 'tide:lost:' + L.iso, act: 'scoop', tide: { kind: 'lost', iso: L.iso }, words: `Pick up the ${L.row.name}`, name: 'the ' + L.row.name, x: L.at.x, y: L.at.y, stand: { x: L.at.x, y: L.at.y + .14 }, pri: .7 });
  if (O && !_gdG().wd[_gtlOddKey(O.iso)] && Math.hypot(O.at.x - px, (O.at.y - py) * 1.3) < 1.6) out.push({ key: 'tide:odd:' + O.iso, act: 'scoop', tide: { kind: 'odd', iso: O.iso }, words: `Pick up the ${O.row.name}`, name: 'the ' + O.row.name, x: O.at.x, y: O.at.y, stand: { x: O.at.x, y: O.at.y + .14 }, pri: .68 });
  // a post box: hand in a clue-tag thing nobody has claimed
  const carried = gardenLostCarried().filter(c => c.kind === 'odd');
  if (carried.length && !gardenShoreVisit()) {
    let boxes = []; try { boxes = gardenAffordThings().filter(t => t.kind === 'postbox'); } catch (e) { boxes = []; }
    for (const b of boxes) if (Math.hypot(b.x - px, (b.y - py) * 1.3) < 2) { const c = carried[0]; out.push({ key: 'tide:post:' + c.iso, act: 'read', tide: { kind: 'odd-post', iso: c.iso }, words: `Hand in the ${c.row.name} at the post box`, name: 'the post box', x: b.x, y: b.y, stand: gardenShoreFree({ x: b.x, y: b.y + .6 }, .8), pri: .5 }); break; }
  }
  return out;
}
function _gtlPick(iso) {
  const L = gardenLostToday(); if (!L || L.iso !== iso || _gtlState(iso)) return;
  const W = _gdG().wd; W[_gtlKey(iso)] = 'g'; _wdSave(); _gtl.carried = null;
  const who = gardenShoreFolkName(L.row.v);
  try { gardenCatchMoment('lost', L.row.id, { isNew: false }); } catch (e) { /* only a picture */ }
  setTimeout(() => gardenShoreSay(`${who}’s ${L.row.name}! ${who} will be glad to have ${L.row.it} back.`, 'heart', 6000), 2700);
  gardenShoreEmit('lost', { found: true });
}
function _gtlPickOdd(iso) {
  const O = gardenOddToday(); if (!O || O.iso !== iso) return;
  const W = _gdG().wd, k = _gtlOddKey(iso); if (W[k]) return; W[k] = 'g'; _wdSave(); _gtl.carried = null;
  try { gardenCatchMoment('lost', 'odd-' + O.row.id, { isNew: false }); } catch (e) { /* only a picture */ }
  setTimeout(() => gardenShoreSay(`A ${O.row.name}, with a tag on it: “${O.row.clue}”. Whose could it be? Ask about, or hand it in at a post box.`, 'search', 8000), 2700);
  gardenShoreEmit('lost', { odd: true });
}
function _gtlPost(iso) {
  const W = _gdG().wd, k = 'tlo.' + iso, O = _gtlOddFor(iso); if (W[k] !== 'g') return;
  W[k] = { p: _gdToday() }; _wdSave(); _gtl.carried = null;
  gardenShoreSay(GT_PERPETUA_GUESS[gardenHash('tide-post|' + iso) % GT_PERPETUA_GUESS.length] + ` (The ${O.name} is in the lost things box. If nobody claims it in a week, it is yours.)`, 'mail', 9000);
}

/* ---------- giving it back: the folk's talk ---------- */
gardenShoreFolkOn((row, F, S) => {
  if (!GT_SHORE_FOLK.includes(row.id)) return null;
  const out = { lines: [], actions: [] }, L = gardenLostToday(), W = _gdG().wd, who = (id) => gardenShoreFolkName(id);
  if (L) {
    const st = _gtlState(L.iso), back = _gtlFriendBack(L.iso), owner = row.id === L.row.v;
    if (owner && st === 'g') {
      out.lines.push(`Is that… my ${L.row.name}?`);
      out.actions.push({ label: `Give back the ${L.row.name}`, primary: true, run: (T) => _gtlGiveBack(L, T, S) });
    } else if (owner && !st && !back) {
      if (W['tlfh.' + L.iso] !== row.id) { W['tlfh.' + L.iso] = row.id; _wdSave(); }
      out.lines.push(`I have lost my ${L.row.name}. Last seen ${GT_LOST_WHERE[L.row.where]}. If you see ${L.row.it}, I would be so grateful.`);
    } else if (owner && (st === 'r' || back)) out.lines.push(back && st !== 'r' ? `${back} found my ${L.row.name} and brought ${L.row.it} back to me. Do thank them for me.` : `Thank you again for my ${L.row.name}.`);
    else if (!owner && st === 'g') out.lines.push(`That looks like ${who(L.row.v)}’s ${L.row.name}. ${who(L.row.v)} has been looking everywhere.`);
    else if (!owner && !st && !back && !W['tlfh.' + L.iso] && gardenHash('tide-lost-say|' + L.iso + row.id) % 2 === 0) { W['tlfh.' + L.iso] = L.row.v; _wdSave(); out.lines.push(`Have you seen ${who(L.row.v)}? ${who(L.row.v)} has lost ${L.row.name === 'spectacles' ? 'a pair of spectacles' : 'a ' + L.row.name}, ${GT_LOST_WHERE[L.row.where]}, somebody said.`); }
  }
  for (const c of gardenLostCarried().filter(q => q.kind === 'odd')) out.actions.push({ label: `Is this yours? (the ${c.row.name})`, run: (T) => _gtlAskOdd(c, row, T, S) });
  return out;
});
/** The lost thing goes back: delight, why it matters, a reward (and the friend who helped, by name). */
function _gtlGiveBack(L, T, S) {
  const W = _gdG().wd, k = _gtlKey(L.iso); if (W[k] !== 'g') return;
  W[k] = 'r'; _wdSave(); _gtl.carried = null;
  const gift = { c: GT_LOST_PAY.c, x: GT_LOST_PAY.x };
  gardenShoreGive('tlr.' + (gardenShoreVisit() ? _gtcFriendTag() + '.' : '') + L.iso, gift);
  try { if (typeof _wkAdd === 'function') _wkAdd(L.row.v, 2); } catch (e) { /* friendship is a bonus */ }
  if (!_gdG().disc['td.lost.' + L.row.id]) { _gdG().disc['td.lost.' + L.row.id] = _gdToday(); _gdSave(); }
  try { if (S && Number.isFinite(S.x)) { _glFx(S.x, S.y, 'sparkle', { lift: 40 }); _glSound('twinkle'); } } catch (e) { /* only a flourish */ }
  T.say(`${L.row.why} (${gardenShoreGiftWords(gift).replace(/^./, c => c.toUpperCase())}, and ${gardenShoreFolkName(L.row.v)} likes you a little more.)`, []);
  if (gardenShoreLive() === 'guest') { try { gardenLiveFx('tide', 'lback', { i: L.row.v, v: L.row.id }); } catch (e) { /* alone */ } }
  if (gardenShoreVisit()) { const m = gardenHere(); if (m.visit && m.visit.fid && typeof gtgPair === 'function') { W['tlfg.' + m.visit.fid + '.' + gardenShoreDay(L.iso)] = 1; _wdSave(); } }
  gardenShoreEmit('lost', { back: true, who: L.row.v });
}
function _gtlAskOdd(c, row, T, S) {
  const W = _gdG().wd, k = gardenShoreVisit() ? 'tlov.' + _gtcFriendTag() + '.' + c.iso : 'tlo.' + c.iso; if (W[k] !== 'g') return;
  if (row.id !== c.row.v) { T.say(GT_ODD_NO[row.id] || 'Not mine, I am afraid.', []); return; }
  W[k] = 'r'; _wdSave(); _gtl.carried = null;
  const gift = { c: GT_LOST_PAY.odd, x: 2 };
  gardenShoreGive('tlor.' + c.iso + '.' + c.row.id, gift);
  try { if (typeof _wkAdd === 'function') _wkAdd(row.id, 1); } catch (e) { /* a bonus */ }
  try { if (S && Number.isFinite(S.x)) { _glFx(S.x, S.y, 'sparkle', { lift: 40 }); _glSound('twinkle'); } } catch (e) { /* a flourish */ }
  T.say(`My ${c.row.name}! “${c.row.clue}”, it says on the tag? Well, yes. That is me all over. Thank you. (${gardenShoreGiftWords(gift).replace(/^./, ch => ch.toUpperCase())}.)`, []);
  gardenShoreEmit('lost', { odd: true, back: true, who: row.id });
}
/** A friend gave it back in your vale, live: the villager thanks you both. */
gardenShoreFxOn('lback', (A, ev) => {
  if (gardenShoreLive() !== 'host') return;
  const L = gardenLostToday(); if (!L || String(ev.v || '') !== L.row.id) return;
  const W = _gdG().wd, k = 'tlf.' + L.iso; if (W[k] === 'r' || W[k] === 'f') return;
  W[k] = 'f'; _wdSave();
  const who = String(A && A.n || 'Your friend').split(/\s+/)[0], v = gardenShoreFolkName(L.row.v);
  gardenShoreSay(`${who} found ${v}’s ${L.row.name} and gave ${L.row.it} back. ${v} says thank you to you both.`, 'heart', 8000);
  gardenShoreGive('tlfb.' + L.iso, { c: GT_LOST_PAY.friend, x: 1 });
});
/** For the snapshot (ti.lf): the lost things you gave back in friends' vales lately, as [pair mark, day]. */
GT_WIRE.push((out) => {
  if (typeof gtgPair !== 'function') return;
  const W = _gdG().wd, rows = [], cut = gardenShoreDay() - 3;
  for (const k of Object.keys(W)) { if (!k.startsWith('tlfg.')) continue; const p = k.split('.'), dn = Number(p.pop()), fid = p.slice(1).join('.'); if (!Number.isInteger(dn)) continue; if (dn < cut) { delete W[k]; continue; } const h = gtgPair(fid); if (h) rows.push([h, dn]); }
  rows.sort((a, b) => b[1] - a[1]);
  { const iso = _gtlDay(), st = W['tlf.' + iso]; if (st === 'r' || st === 'f') rows.unshift(['me', gardenShoreDay(iso)]); }   // (today's in your own vale has gone back: a visiting friend sees it gone too)
  if (rows.length) out.lf = rows.slice(0, 3);
});

/* ---------- your pet's nose; a week at the post office ---------- */
function _gtlHint() {
  const L = gardenLostToday(); if (!L || _gtlState(L.iso) || _gtlFriendBack(L.iso) || !_gdG().wd['tlfh.' + L.iso] || typeof _gw === 'undefined' || !_gw.on) return;
  const P = typeof gpPetMe === 'function' ? gpPetMe() : null; if (!P) return;
  const dx = L.at.x - _gw.px, dy = L.at.y - _gw.py, d = Math.hypot(dx, dy * 1.3); if (d < 2.5 || d > 16) return;
  const now = performance.now(); if (now - _gtl.hintT < 28000) return; _gtl.hintT = now;
  const dir = Math.abs(dx) > Math.abs(dy) * 1.3 ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
  const name = typeof gpPet === 'function' && gpPet() ? gpPet().name : 'Your pet';
  gardenShoreSay(`${name} has its nose to the ground. ${d < 7 ? 'Warm, very warm' : 'Warmer'}… off to the ${dir}.`, 'footprints', 5000);
  try { if (P.walkTo && !P.busy) { const k = Math.min(1, 3 / d), tx = _gw.px + dx * k, ty = _gw.py + dy * k; if (typeof _gwFree !== 'function' || _gwFree(tx, ty)) P.walkTo(tx, ty, false, () => { try { if (P.setAct) P.setAct('sniff'); } catch (e) { /* it sits */ } }); } } catch (e) { /* the words are enough */ }
}
function _gtlPostTick() {
  const W = _gdG().wd, today = _gdToday();
  for (const k of Object.keys(W)) {
    if (!k.startsWith('tlo.')) continue; const v = W[k], iso = k.slice(4);
    if (v && typeof v === 'object' && v.p && _wdDaysBetween(v.p, today) >= 7 && !W['tlok.' + iso]) {
      const O = _gtlOddFor(iso); W['tlok.' + iso] = today; W[k] = 'k'; _wdSave();
      gardenShoreGive('tlok.' + iso, { c: GT_LOST_PAY.keep, x: 1 });
      gardenShoreSay(`A note from Perpetua: “Nobody came for the ${O.name}. It is yours now. I have put it with your keepsakes.” (And ${GT_LOST_PAY.keep} coins for the trouble.)`, 'mail', 9000);
    }
    if (_wdDaysBetween(iso, today) > 30 && (v === 'r' || v === 'k')) delete W[k];
  }
  for (const k of Object.keys(W)) if (/^tlf[hv]?\./.test(k)) { const iso = k.split('.').pop(); if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && _wdDaysBetween(iso, today) > 20) delete W[k]; }
}

/* ---------- drawn: the thing itself where it turned up, and a glint over it ---------- */
const GT_LOST_ART = Object.freeze({
  spectacles: '<g fill="none" stroke="#3a3a42" stroke-width="1.3"><circle cx="-5" cy="0" r="4"/><circle cx="5" cy="0" r="4"/><path d="M-1 -0.5q1 -1.4 2 0M-9 -1l-3 -2M9 -1l3 -2"/></g><circle cx="-5" cy="0" r="3.2" fill="#d8ecf0" opacity="0.6"/><circle cx="5" cy="0" r="3.2" fill="#d8ecf0" opacity="0.6"/><path d="M-7 -1.6l2 -1M3 -1.6l2 -1" stroke="#fff" stroke-width="0.8"/>',
  trowel: '<path d="M-11 4l7 -4" stroke="#8a5a34" stroke-width="2.6" stroke-linecap="round"/><path d="M-4 0l5 -3q5 -2 8 1q-1 4 -6 5z" fill="#a8b0b8" stroke="#5a6068" stroke-width="0.7"/>',
  pencil: '<path d="M-11 3l18 -8l2 3l-18 8z" fill="#e8c23a" stroke="#8a6a1a" stroke-width="0.6"/><path d="M7 -5l5 -1l-3 4z" fill="#e8c8a0"/><path d="M11.4 -5.6l.8 -.2l-.4 .8z" fill="#3a3a3a"/><path d="M-11 3l-2 1l2 2z" fill="#e88a9a"/>',
  'map-case': '<rect x="-10" y="-3.4" width="20" height="6.8" rx="3.4" fill="#8a5a34" stroke="#4a2e18" stroke-width="0.7"/><rect x="6" y="-3.6" width="3" height="7.2" rx="1" fill="#c8a04a"/><path d="M-8 -1.6h12" stroke="#b07a4a" stroke-width="0.8"/>',
  scarf: '<path d="M-10 -2q5 -3 10 0q5 3 10 0l-1 4q-5 3 -10 0q-5 -3 -9 0z" fill="#d8503a" stroke="#8a2a1a" stroke-width="0.6"/><path d="M-3 -1l0 4M3 0l0 4" stroke="#f4e6d0" stroke-width="1.2"/><path d="M6 2l1 6M8 2l2 5" stroke="#d8503a" stroke-width="1.4"/>',
  float: '<path d="M0 -9v4" stroke="#3a3a3a" stroke-width="0.8"/><ellipse cx="0" cy="0" rx="3.4" ry="5.4" fill="#f4f0e6" stroke="#5a5048" stroke-width="0.6"/><path d="M-3.4 0a3.4 5.4 0 0 1 6.8 0z" fill="#d8453a"/><path d="M0 5.4v3" stroke="#5a5048" stroke-width="0.8"/>',
  thimble: '<path d="M-4 4l1 -8q3 -3 6 0l1 8z" fill="#c8ccd2" stroke="#6a7078" stroke-width="0.7"/><g fill="#8a9098"><circle cx="-1" cy="-2" r=".5"/><circle cx="1" cy="-2" r=".5"/><circle cx="0" cy="0" r=".5"/><circle cx="-1.6" cy="1.4" r=".5"/><circle cx="1.6" cy="1.4" r=".5"/></g><path d="M-2.6 -3.4q1.4 -1.2 2.4 -1.2" stroke="#fff" stroke-width="0.7" fill="none"/>',
  ladle: '<path d="M-11 -6l10 7" stroke="#9a6a3a" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="3" cy="3" rx="5" ry="3.4" fill="#a87a4a" stroke="#5a3a1a" stroke-width="0.7"/><ellipse cx="3" cy="2.4" rx="3.4" ry="2" fill="#6a4426"/>',
  quill: '<path d="M-10 7q4 -10 16 -15q-2 9 -14 14z" fill="#e8dcc4" stroke="#8a7a5a" stroke-width="0.6"/><path d="M-10 7l13 -12" stroke="#8a7a5a" stroke-width="0.6"/><path d="M-10 7l-2 2" stroke="#3a3a3a" stroke-width="1.2"/>',
  chart: '<rect x="-9" y="-6" width="18" height="12" rx="1" fill="#2a3a5a" stroke="#c8b890" stroke-width="0.8"/><g fill="#f4e6a8"><circle cx="-5" cy="-2" r=".9"/><circle cx="-1" cy="-4" r=".7"/><circle cx="3" cy="-1" r="1"/><circle cx="6" cy="3" r=".7"/><circle cx="-4" cy="3" r=".6"/></g><path d="M-5 -2L-1 -4L3 -1L6 3" stroke="#c8b890" stroke-width="0.4" fill="none"/>',
  'honey-spoon': '<path d="M-11 6l11 -8" stroke="#a87a4a" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="3" cy="-4" rx="4" ry="3.4" fill="#d8a83a" stroke="#8a6020" stroke-width="0.7"/><path d="M0 -6h6M-.4 -4h7M0 -2h6" stroke="#8a6020" stroke-width="0.6"/>',
  'bee-brush': '<rect x="-11" y="-1.4" width="12" height="2.8" rx="1.4" fill="#a87a4a"/><path d="M1 -3.4q7 0 9 3.4q-2 3.4 -9 3.4z" fill="#e8d8a8" stroke="#a89060" stroke-width="0.6"/><path d="M3 -2l5 1M3 0h6M3 2l5 -1" stroke="#c8b480" stroke-width="0.5"/>',
  'odd-spoon': '<path d="M-11 5l11 -7" stroke="#b08a5a" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="3" cy="-4" rx="4" ry="2.8" fill="#c8a070" stroke="#7a5a34" stroke-width="0.6"/>',
  'odd-mitten': '<path d="M-6 6v-8q0 -5 5 -5q5 0 5 5v8z" fill="#5a8ac8" stroke="#2a4a7a" stroke-width="0.7"/><path d="M4 -1q4 -1 4 3q0 3 -4 2" fill="#5a8ac8" stroke="#2a4a7a" stroke-width="0.7"/><path d="M-6 3h10" stroke="#f4f0e6" stroke-width="1.6"/><g fill="#6a4e30"><circle cx="-2" cy="-1" r=".8"/><circle cx="1" cy="1" r=".7"/></g>',
  'odd-button': '<circle r="5" fill="#d8a83a" stroke="#8a6020" stroke-width="0.8"/><circle r="3.4" fill="none" stroke="#f4d88a" stroke-width="0.6"/><g fill="#6a4818"><circle cx="-1.2" cy="-1.2" r=".7"/><circle cx="1.2" cy="-1.2" r=".7"/><circle cx="-1.2" cy="1.2" r=".7"/><circle cx="1.2" cy="1.2" r=".7"/></g>',
  'odd-ribbon': '<path d="M-2 0q-8 -6 -9 0q1 6 9 0q8 -6 9 0q-1 6 -9 0z" fill="#e87a9a" stroke="#a84a6a" stroke-width="0.6"/><path d="M-1 1l-3 6M1 1l3 6" stroke="#e87a9a" stroke-width="1.6"/><circle r="1.6" fill="#c85a7a"/>',
  'odd-rubber': '<rect x="-6" y="-3" width="12" height="6" rx="1.4" fill="#e8a0a8" stroke="#a86a72" stroke-width="0.6"/><path d="M-6 0h12" stroke="#8a8a90" stroke-width="1.4" opacity="0.6"/>',
  'odd-cup': '<path d="M-5 -3h10l-1 6q-4 2 -8 0z" fill="#f4f0e6" stroke="#8a8478" stroke-width="0.6"/><path d="M5 -1.4q3 0 2.4 2.4q-.6 1.6 -3 1" fill="none" stroke="#8a8478" stroke-width="0.7"/><path d="M-4 -1h8" stroke="#5a7ab0" stroke-width="0.8"/><ellipse cx="0" cy="4" rx="6" ry="1.2" fill="#f4f0e6" stroke="#8a8478" stroke-width="0.5"/>',
  'odd-glove': '<path d="M-5 6v-6l-3 -4l2 -1l2 3v-6h2v5v-7h2v7v-6h2v6l2 -3l2 1l-3 5v6z" fill="#b8c87a" stroke="#6a7a3a" stroke-width="0.6"/><path d="M-5 5h10" stroke="#8a5a9a" stroke-width="1.4"/>',
  'odd-bell': '<path d="M-5 3q0 -9 5 -9q5 0 5 9z" fill="#d8b84a" stroke="#8a6a20" stroke-width="0.7"/><rect x="-6" y="3" width="12" height="2" rx="1" fill="#c8a03a"/><circle cx="0" cy="6.2" r="1.3" fill="#8a6a20"/><path d="M-2.6 -2q1 -2.6 2.4 -2.8" stroke="#fff" stroke-width="0.8" fill="none"/>',
  'odd-boat': '<path d="M-9 1h18l-3 5h-12z" fill="#c85a3a" stroke="#7a3020" stroke-width="0.6"/><path d="M0 1v-11" stroke="#7a5a34" stroke-width="0.9"/><path d="M0.6 -10l7 7h-7z" fill="#f4f0e6" stroke="#a89a80" stroke-width="0.5"/>',
  'odd-nib': '<path d="M-2 -7h4l1 7l-3 6l-3 -6z" fill="#c8c0b0" stroke="#5a5448" stroke-width="0.6"/><path d="M0 -2v8" stroke="#3a3a42" stroke-width="0.6"/><circle cx="0" cy="-2" r=".8" fill="#3a3a42"/><g fill="#f4e6a8"><circle cx="4" cy="-5" r=".6"/><circle cx="-4" cy="-3" r=".5"/></g>',
});
function gardenLostSvg(id, px) { const s = GT_LOST_ART[id]; return s ? `<svg viewBox="-16 -16 32 32" width="${px || 32}" height="${px || 32}" aria-hidden="true"><ellipse cx="1" cy="8" rx="10" ry="2.4" fill="#2a2418" opacity="0.18"/>${s}</svg>` : ''; }
/** A lost thing for the catch moment (94-garden-fish-5moment.js GART_MOMENTS.lost): its name and picture. */
function gardenLostDef(id) { const L = GT_LOST.find(r => r.id === id); if (L) return { id, name: gardenShoreFolkName(L.v) + '’s ' + L.name }; const O = GT_ODD.find(r => 'odd-' + r.id === id); return O ? { id, name: 'A ' + O.name } : null; }
const GT_LATLAS = 'gt-lost', GT_LOST_TWO = Object.freeze(['lost', 'odd']);
function _gtlAtlas(scene) {
  if (_gtl.atlas && scene.textures.exists(GT_LATLAS)) return true;
  if (_gtl.busy) return false; _gtl.busy = true;
  const ids = Object.keys(GT_LOST_ART), cols = 8, cell = 40, tex = scene.textures.exists(GT_LATLAS) ? scene.textures.get(GT_LATLAS) : scene.textures.createCanvas(GT_LATLAS, cols * cell, Math.ceil(ids.length / cols) * cell);
  if (!tex) { _gtl.busy = false; return false; }
  const cx = tex.context; let left = ids.length;
  ids.forEach((id, i) => {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell; if (!tex.has(id)) tex.add(id, 0, x, y, cell, cell);
    const img = new Image(), fin = () => { if (--left <= 0) { tex.refresh(); _gtl.atlas = true; _gtl.busy = false; } };
    img.onload = () => { try { cx.drawImage(img, x + 2, y + 2, cell - 4, cell - 4); } catch (e) { /* skip */ } fin(); };
    img.onerror = fin;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(gardenLostSvg(id, 36).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  });
  return false;
}
const GardenTideLostSprites = {
  id: 'lost',
  paint(scene, root) { this.scene = scene; this.root = root; this.t = 0; this.o = {}; },
  clear() { for (const k of Object.keys(this.o || {})) for (const im of Object.values(this.o[k])) { try { im.destroy(); } catch (e) { /* gone */ } } this.o = {}; this.scene = null; },
  tick(time, view) {
    const scene = this.scene; if (!scene) return;
    if (time - this.t > 700) {
      this.t = time;
      if (!_gtlAtlas(scene) || typeof _gtc === 'undefined' || !_gtc.atlas) return;
      const L = gardenLostToday(), O = gardenOddToday(), W = GARDEN_WORLD;
      const want = { lost: L && !_gtlState(L.iso) && !_gtlFriendBack(L.iso) ? { at: L.at, frame: L.row.id } : null, odd: O && !_gdG().wd[_gtlOddKey(O.iso)] ? { at: O.at, frame: 'odd-' + O.row.id } : null };
      for (const k of ['lost', 'odd']) {
        const w = want[k], x = w ? w.at.x * W.cellW : 0, y = w ? W.sky + w.at.y * W.cellH : 0, inView = w && x > view.x - 80 && x < view.x + view.w + 80 && y > view.y - 80 && y < view.y + view.h + 80;
        let o = this.o[k];
        if (!inView) { if (o) for (const im of Object.values(o)) im.setVisible(false); continue; }
        if (!o) { o = this.o[k] = { thing: scene.add.image(0, 0, GT_LATLAS, w.frame).setDepth(-9345.16).setOrigin(.5, .7), tw: scene.add.image(0, 0, GT_ATLAS, 'twinkle').setDepth(-9345.15).setBlendMode(1) }; this.root.add(o.thing); this.root.add(o.tw); if (this.root.sort) this.root.sort('depth'); }
        if (o.thing.frame.name !== w.frame) o.thing.setFrame(w.frame);
        o.thing.setVisible(true).setPosition(x, y).setScale(19 / 36); o.tw.setVisible(true).setPosition(x + 4, y - 10);
      }
    }
    // the glint: brighter now and then, so it catches your eye from a little way off
    const t = time / 1000, motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
    for (const k of GT_LOST_TWO) { const o = this.o[k]; if (!o || !o.tw.visible) continue; const u = ((t * .5 + (k === 'odd' ? .4 : 0)) % 2.2) / 2.2, a = motion ? Math.max(0, Math.sin(Math.min(1, u * 4) * Math.PI)) : .6; o.tw.setAlpha(.25 + a * .7).setScale(.22 + a * .26); }
  },
};
if (window.GardenPaintTide) GardenPaintTide.parts.push(GardenTideLostSprites);
GT_ROW_SOURCES.push((px, py) => gardenLostRows(px, py));
GT_RUN.lost = (spot) => _gtcDo('scoop', spot, () => _gtlPick(spot.tide.iso), .62);
GT_RUN.odd = (spot) => _gtcDo('scoop', spot, () => _gtlPickOdd(spot.tide.iso), .62);
GT_RUN['odd-post'] = (spot) => _gtcDo('read', spot, () => _gtlPost(spot.tide.iso), .5);
setTimeout(() => { if (typeof wdMod === 'function') wdMod({ id: 'tide-lost', visit: true, fun: false, begin() { this.t = 0; }, tick(m) { try { _gtlHint(); } catch (e) { /* a hint can wait */ } if (m.visit) return; const now = Date.now(); if (now - this.t > 120000) { this.t = now; try { _gtlPostTick(); } catch (e) { /* tomorrow */ } } } }); }, 0);   // clock-ok: the post's pace

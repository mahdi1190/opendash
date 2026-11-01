/* ============================================================
   GARDEN WONDER, the snail post and letters (docs/dev/HUNDRED_WORLD.md, rows 3 to 6).
   Every letter comes by Perpetua, a snail with a satchel, in the world, at a snail's pace. Walk up and she hands it over; miss her and it waits in the post box with its flag up. No toast, no badge beyond the Keepsakes menu.

   WD_LETTERS: one row per letter. if(F): when it could come; after: the letter it follows; days: how long after that; find: a buried thing it sets you looking for (94-garden-wonder-3finds.js); gift: what is in the envelope.
   Saved: l.<id> (the day it came), lr.<id> (the day you read it), ld (the last day anything came: at most one a day). A gift to a caller makes a letter of its own: gift.<caller>.<n>.
   ============================================================ */
const WD_LETTERS = Object.freeze([
  { id: 'post', from: 'Perpetua', if: () => true, text: ['Post.', 'I bring the post here now. The last one retired, or stopped, it is hard to tell with slugs.', 'I am not fast. It was on time when I left.'], sign: 'Perpetua, Post' },
  { id: 'w1', from: 'W.', after: 'post', days: 1, find: 'tin', text: ['To whoever has the garden now.', 'They tell me someone does. Good. It wants someone. I kept it for forty-one years and left it in a hurry, and I left things behind. I don’t want them back. I would only like to know they were found.', 'Start with the tin. I kept my seed labels under the step by the notice board, because nobody looks down.'], sign: 'Yours, W.' },
  { id: 'w2', from: 'W.', afterFind: 'tin', days: 1, find: 'glasses', text: ['You found the tin. I know because the snail told me. She tells everybody everything, eventually.', 'T. is my son. Tomas. He was not allowed the sweet peas.', 'I used to go out to the island of an evening, to read where nobody could ask me anything. I think my glasses are still there, on the stone seat. You can only get across at dawn or at dusk, when the stones come up. I expect you have noticed. I expect you notice most things by now.'], sign: 'W.' },
  { id: 'w3', from: 'W.', afterFind: 'glasses', days: 2, find: 'boat', text: ['Thank you for the glasses. I don’t need them. I have others. I only hated to think of them out there on their own.', 'Tomas had a little boat that he lost off the end of the pier when he was seven. He looked for it all one summer. Things come ashore by the reeds, after rain. They always did. Go and look, next time it rains.'], sign: 'W.' },
  { id: 'w4', from: 'W.', afterFind: 'boat', days: 2, find: 'page', text: ['Oh, you found it. I had to sit down.', 'There is a page of my diary under the sundial. I tore it out and I hid it there, and I told myself you could only read it at noon, which is the kind of thing I said in those days. Humour me. Go at noon.'], sign: 'W.' },
  { id: 'w5', from: 'W.', afterFind: 'page', days: 2, find: 'photo', text: ['So now you know that part.', 'There was only ever one photograph of the two of us in the garden, and I lost it the winter I moved the beds. I have an idea where it went. Everything small in that garden ends up in the same place, sooner or later. You might ask the mice. There is a door. You will see it at dusk, if you look at your oldest tree.'], sign: 'W.' },
  { id: 'w6', from: 'W.', afterFind: 'photo', days: 3, find: 'whistle', text: ['They have it on the wall? I can’t tell you how glad I am. Leave it with them. It was never so well looked after.', 'Tomas cut a whistle from the elder by the woods the week before he left, and hung it on the fence post nearest the forest, at the end of the lane past the sundial, and told me not to take it down. I never did. It will be there still, if the post is.'], sign: 'W.' },
  { id: 'w7', from: 'W.', afterFind: 'whistle', days: 3, gift: { pear: 1 }, text: ['He came back, you know. Not to stay. Last spring, with his hair gone grey. He stood at the gate and said it looked smaller. Then he stood a bit longer and said it looked well kept.', 'I said that isn’t me.', 'So thank you. I think this is my last letter: my hand is not what it was, and the snail is getting on. There is a seed in here, from the pear I planted the year he left. Put it somewhere you can see from where you sit.', 'I put my initial on the bench by the reeds, a long time ago. You can add yours. I would like that.'], sign: 'Wren' },
  { id: 'tam1', from: 'Tam', metAt: 'tam', days: 2, text: ['Dear neighbour,', 'Your sprinkler went through my spare room. I don’t mind. I was not using it. I only mention it so that you know there are rooms.'], sign: 'Tam (below)' },
  { id: 'bramble1', from: 'Bramble', metAt: 'bramble', days: 3, text: ['I enclose nothing. I had meant to enclose a map of your garden, but it is not finished, and when it is finished it will be wrong.', 'You have a good lake. I want that on record. I have seen some lakes.'], sign: 'B.' },
  { id: 'pip1', from: 'Pip', metAt: 'pip', days: 2, card: 'river', text: ['Up the river! It goes on! I said it did! There is a place where it splits in two and you have to decide, so I went up both.', 'Wish you were here. You would hate it, it’s very wet.'], sign: 'Pip' },
  { id: 'pip2', from: 'Pip', after: 'pip1', days: 12, card: 'hills', text: ['There are hills here that nobody has told about the sea. I told them. They didn’t take it well.', 'The weather is mostly weather.'], sign: 'Pip' },
  { id: 'pip3', from: 'Pip', after: 'pip2', days: 20, card: 'sea', text: ['Found the sea. It’s all right. There is rather a lot of it, and nowhere to sit.', 'I thought of your pier. Coming back soon, or else much later.'], sign: 'Pip' },
  { id: 'thistle1', from: 'Mother Thistle', metAt: 'thistle', days: 4, text: ['Dear,', 'I have told all the frogs that you are a nice person. They did not say anything, but they looked as if they were thinking it over.'], sign: 'Mother Thistle' },
  { id: 'wick1', from: 'Wick', if: F => F.stars >= 1, days: 0, text: ['You found one. Now you will see it every year, whether you like it or not. That’s what knowing something is.', 'Nobody ever writes to me, so I thought I would.'], sign: 'W. No, not that W. The owl.' },
  { id: 'wick2', from: 'Wick', if: F => F.stars >= 12, after: 'wick1', days: 0, text: ['That is all twelve. It took you a year, because they don’t come up any faster than that. There is nothing I can give you for it. It was already yours, it was just over your head.'], sign: 'Wick' },
]);
const WD_LETTER_ROW = new Map(WD_LETTERS.map(r => [r.id, r]));
function _wdGiftLetters() {
  const W = _wdG(), out = [];
  for (const k of Object.keys(W)) { if (!k.startsWith('fg.')) continue; const [, who, n] = k.split('.'), row = WD_FOLK_ROW.get(who), e = W[k]; if (!row || !e || !e.d) continue; out.push({ id: `gift.${who}.${n}`, from: row.name, text: row.thanks(e.name || 'thing'), sign: row.name, due: e.d, back: row.back }); }
  return out;
}
function _wdLetterOf(id) { return WD_LETTER_ROW.get(id) || _wdGiftLetters().find(x => x.id === id) || null; }
/** The next letter that may come today, or null. */
function _wdLetterDue(m) {
  const W = _wdG(), today = m.today;
  if (W.ld === today) return null;
  const ago = (d, n) => !!d && _wdDaysBetween(d, today) >= (n || 0);
  for (const r of _wdGiftLetters()) if (!W['l.' + r.id] && ago(r.due, 2)) return r;
  const F = wdFacts(m, '');
  for (const r of WD_LETTERS) {
    if (W['l.' + r.id]) continue;
    if (r.after && !ago(W['l.' + r.after], r.days)) continue;
    if (r.afterFind && !ago(W['ff.' + r.afterFind], r.days)) continue;
    if (r.metAt && !ago(W['fv.' + r.metAt], r.days)) continue;
    if (r.if && !r.if(F)) continue;
    return r;
  }
  return null;
}
function _wdLetterArrive(r) {
  const W = _wdG(), today = _wdToday();
  W['l.' + r.id] = today; W.ld = today;
  if (r.find) W['fa.' + r.find] = today;
  _wdSave();
}
/** Read: what was in the envelope comes out once, whichever device opened it, because its ledger key is the letter's. */
function _wdLetterRead(r) {
  const W = _wdG(), g = _gdG(), today = _wdToday();
  if (!W['lr.' + r.id]) W['lr.' + r.id] = today;
  let item = '';
  if (r.gift && r.gift.pear) item = 'seed:pear';
  if (r.back === 'fertiliser') item = 'fertiliser';
  if (r.back === 'seed') { const pool = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && gardenInSeason(p, gardenModel().season)); const p = pool.length ? pool[gardenHash(r.id) % pool.length] : null; if (p) item = 'seed:' + p.id; }
  if (item && !g.led['wdl.' + r.id]) { g.led['wdl.' + r.id] = { d: today, k: 'wd', i: { [item]: 1 }, n: 1 }; r.got = item; }
  _gdSave();
  _wdPostFlag();
}
const _WD_CARDS = Object.freeze({
  river: '<rect width="280" height="130" fill="#bfe0ea"/><path d="M0 70C50 55 90 80 140 62S240 50 280 66V130H0z" fill="#7aae6a"/><path d="M120 130C130 100 150 84 138 66C160 80 170 104 186 130z" fill="#6fb6d8"/><path d="M138 66C126 56 120 50 104 46M138 66C150 56 168 50 182 44" fill="none" stroke="#6fb6d8" stroke-width="5"/><circle cx="238" cy="30" r="14" fill="#fff3bf"/>',
  hills: '<rect width="280" height="130" fill="#f3d9c0"/><path d="M0 92C40 50 90 44 130 80C160 50 220 40 280 84V130H0z" fill="#8a9a6a"/><path d="M0 112C60 90 120 96 170 112S250 112 280 104V130H0z" fill="#6a7e50"/><circle cx="60" cy="34" r="16" fill="#ffefb0"/>',
  sea: '<rect width="280" height="130" fill="#cfe6ef"/><rect y="62" width="280" height="68" fill="#4e8ea8"/><path d="M0 76h60M90 90h80M190 74h70M30 106h70M170 112h90" stroke="#a8d0dc" stroke-width="2.4"/><path d="M0 130V116C40 110 90 122 140 130z" fill="#e2cfa0"/><path d="M204 62l10-22 3 22z" fill="#fff"/>',
});
function wdLetterPage(r) {
  const fresh = !_wdGet('lr.' + r.id);
  _wdLetterRead(r);
  wdPage({ title: r.card ? 'A postcard from ' + r.from : 'A letter from ' + r.from, art: r.card ? `<svg viewBox="0 0 280 130" class="wd-card" role="img" aria-label="A picture on the front of the card">${_WD_CARDS[r.card]}</svg>` : '', text: r.text, sign: r.sign, foot: fresh && r.got ? `There was something in the envelope: ${_wdItemWords(r.got)}. It is in your bag.` : '' });
}
function _wdItemWords(item) { if (item === 'fertiliser') return 'a bag of fertiliser'; const p = item.startsWith('seed:') ? gardenPlant(item.slice(5)) : null; return p ? 'a ' + p.name.toLowerCase().replace(/ tree$/, '') + ' seed' : 'something small'; }
function _wdLettersHad() { const W = _wdG(), all = [...WD_LETTERS, ..._wdGiftLetters()]; return all.filter(r => W['l.' + r.id]).sort((a, b) => String(W['l.' + b.id]).localeCompare(String(W['l.' + a.id]))); }
function _wdUnread() { const W = _wdG(); return _wdLettersHad().filter(r => !W['lr.' + r.id]).length; }
function gardenWonderBadge() { try { return _wdUnread(); } catch (e) { return 0; } }
/* ---------- the snail ---------- */
const _wdp = { snail: null, flag: null, tried: false };
function _wdSnailSvg() {
  const A = GART;
  return `<g class="wd-flip">${A.P('#000000', A.ell(0, 0.5, 13, 2.4), 0.16)}${A.P('#c8b48a', 'M-14 0C-12 -3 -4 -3 6 -3C10 -3 13 -7 13 -12C13 -14 17 -14 17 -11C17 -4 14 0 8 0z')}${A.S('#c8b48a', 1, 'M14 -14L13 -18M16.4 -14L17.6 -18')}${A.P('#1c1512', A.circ(13, -18.4, 0.8) + A.circ(17.6, -18.4, 0.8))}${A.P('#a0623a', A.circ(-2, -9, 8.4))}${A.S('#6e4024', 1.3, 'M-2 -9m-1.6 0a1.6 1.6 0 1 1 1.6 1.6a3.6 3.6 0 1 1 3.6 -3.6a5.8 5.8 0 1 1 -5.8 -3.2')}${A.P('#3a64a0', A.rrect(-12, -10, 8, 8, 1.6))}${A.P('#f4ead8', A.rect(-10.6, -8.4, 5, 3.2))}${A.S('#2c4a78', 0.9, 'M-8 -10L-1 -16')}${A.P('#c8362a', 'M7 -13.6h11l-1.4 -3.6h-7.6z')}</g>`;
}
function _wdSnailStart(r, m) {
  const G = GARDEN_WORLD, dest = WD_AT.postWalk, x0 = Math.max(dest.x - 19, Math.min(dest.x - 2.5, _gw.px - 3));
  const near = Math.abs(_gw.py - dest.y) < 9 && Math.abs(_gw.px - dest.x) < 20;
  void m;
  _wdp.snail = wdSprite({
    id: 'wd-snail', svg: _wdSnailSvg(), x: near ? x0 : dest.x - 3, y: dest.y, hit: 0.7, hitUp: 8, label: 'Perpetua, with the post', cursor: 'hand', letter: r,
    update(dt, S) {
      if (S.hold) return;
      S.x += 0.14 * dt;
      S.lift = 0;
      if (S.x >= dest.x) { _wdLetterArrive(S.letter); _wdPostFlag(); wdWhisper('Perpetua has left something in the post box.', 5000); S.remove(); _wdp.snail = null; }
    },
    onAim(S) { S.hold = true; },
    onClick(S) {
      _wdLetterArrive(S.letter); _wdPostFlag();
      const first = !_wdGet('fs.perpetua.hello'); _wdSet('fs.perpetua.hello', _wdToday());
      const quick = ['You’re early. I’m not used to that. It’s for you.', 'Post. I had it here somewhere. It’s the only thing I’m carrying.', 'Sorry it’s late. Or early. I have rather lost track.', 'You could have waited at the box. Most people don’t bother to come and meet me. Here.'];
      wdTalk({ name: 'Perpetua', art: `<g transform="translate(-2 0) scale(1.6)">${_wdSnailSvg()}</g>`, lines: [first ? 'Perpetua. Post. I’ve been coming since before you got up, and I mean some time last week.' : quick[gardenHash(S.letter.id) % quick.length]], at: { x: S.x, y: S.y },
        actions: [{ label: 'Read it', primary: true, run: () => { wdTalkClose(true); wdLetterPage(S.letter); } }], bye: 'Later' });
      S.remove(); _wdp.snail = null; void G;
    },
  });
}
/** The flag on the post box: up while something is unread. */
function _wdPostFlag() {
  const un = _wdUnread();
  if (!un) { if (_wdp.flag) { _wdp.flag.remove(); _wdp.flag = null; } return; }
  if (_wdp.flag || !_wd.on) return;
  _wdp.flag = wdSprite({ id: 'wd-flag', x: WD_AT.postFlag.x, y: WD_AT.postFlag.y, z: WD_AT.postFlag.y + 0.08, lift: 0, still: true, hit: 0.5, hitUp: 26, label: 'Something in the post box', cursor: 'hand',
    svg: '<g transform="translate(9 -38)"><rect x="-1" y="0" width="1.6" height="15" fill="#7a5a38"/><path d="M0.6 0h10l-2.4 3.2l2.4 3.2h-10z" fill="#d8402f"/></g>',
    onClick: () => { const un2 = _wdLettersHad().filter(r => !_wdGet('lr.' + r.id)); if (un2.length) wdLetterPage(un2[un2.length - 1]); } });
}
wdMod({
  id: 'post', pref: 'post',
  begin() { _wdp.snail = null; _wdp.flag = null; _wdp.tried = false; _wdPostFlag(); },
  tick(m) {
    if (_wdp.tried || _wdp.snail || _wd.t < 40 || _wd.still) return;
    _wdp.tried = true;
    const r = _wdLetterDue(m);
    if (r) _wdSnailStart(r, m);
  },
  end() { _wdp.snail = null; _wdp.flag = null; },
});
/* ---------- the Keepsakes panel: letters, what you have found, the days to come ---------- */
const _wdb = { tab: 'letters' };
function gardenWonderBox(el, m) {
  el.textContent = '';
  el.classList.add('wd-box');
  const un = _wdUnread();
  el.appendChild(_gdxChips([['letters', un ? `Letters (${un})` : 'Letters'], ['found', 'Found'], ['days', 'The year']], _wdb.tab, (k) => { _wdb.tab = k; gardenWonderBox(el, m); }));
  const body = _gdpEl('div', 'wd-box-in'); el.appendChild(body);
  if (_wdb.tab === 'letters') _wdBoxLetters(body, () => gardenWonderBox(el, m));
  else if (_wdb.tab === 'found' && typeof wdBoxFound === 'function') wdBoxFound(body, m);
  else if (typeof wdBoxDays === 'function') wdBoxDays(body, m);
}
function _wdBoxLetters(el, again) {
  const had = _wdLettersHad();
  if (!had.length) { el.appendChild(_gdpEl('p', 'muted wd-box-empty', 'Nothing yet. Keep an eye on the lane: the post is slow, but it comes.')); return; }
  const W = _wdG();
  for (const r of had) {
    const b = _gdpEl('button', 'wd-letter' + (W['lr.' + r.id] ? '' : ' is-new')); b.type = 'button';
    b.innerHTML = `<span class="wd-env" aria-hidden="true">${r.card ? icon('image') : icon('mail')}</span>`;
    const t = _gdpEl('span', 'wd-letter-t'); t.appendChild(_gdpEl('b', null, r.from)); t.appendChild(_gdpEl('small', 'muted', (W['lr.' + r.id] ? '' : 'New. ') + String(W['l.' + r.id]))); b.appendChild(t);
    b.onclick = () => { wdLetterPage(r); setTimeout(again, 200); };
    el.appendChild(b);
  }
}

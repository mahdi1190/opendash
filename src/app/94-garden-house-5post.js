/* ============================================================
   YOUR OWN HOUSE, the guest book and the mailbox.

   The guest book stands by the front door (a piece of kind 'guestbook': any guest book works the same, wherever it is put). It is the
   garden's own guestbook (94-garden-social-*.js: one line a day from each friend, kept by the friends' server, so it can be signed when
   you are out): a friend in your house writes in it there, and you read it there, as a book.

   The mailbox stands by your door outside (94-garden-house-4grow.js draws it, its flag up while a letter waits). The vale's folk write
   to you about the house (HOUSE_LETTERS): a welcome, the builders' plans, thank-you notes after a housewarming, a dye pot, the seasons.
   One a day at most, each with something in the envelope that leads on (seeds, stone, a piece for the house). Read at the mailbox, or
   on the doormat inside. Nothing about the vale's story: these are neighbours' notes. Saved in g.hs.mail { id: { a: day came, r: day read } }.
   No top-level calls.
   ============================================================ */
const HOUSE_LETTERS = Object.freeze([
  Object.freeze({ id: 'hl-welcome', from: 'Mother Thistle', when: H => H.days >= 1, gift: Object.freeze({ 'seed:marigold': 2 }), text: Object.freeze(['Dear,', 'I hope the cottage is keeping you warm. It has always been a warm house, even when nobody was in it, which is a thing houses can do if they were happy once.', 'I have put two packets of marigolds in with this. The good ones. Sow them where you can see them from the window.']), sign: 'Mother Thistle' }),
  Object.freeze({ id: 'hl-plans', from: 'Bramble', after: 'hl-welcome', days: 1, gift: Object.freeze({ 'mat:stone': 2 }), text: Object.freeze(['I have drawn up plans for your cottage. You did not ask. Nobody asks.', 'A parlour through the end wall. A loft. A room for a guest, should you ever have one, which I doubt, though you seem the sort.', 'The builders want coins, timber and stone. Put them in the jar and they come at night, like owls, but with hammers. I enclose two stones towards it.']), sign: 'B.' }),
  Object.freeze({ id: 'hl-dye', from: 'Quince', when: H => H.built(1) && H.since(1) >= 1, gift: Object.freeze({ 'decor:hf-dye-pot': 1 }), text: Object.freeze(['Hello neighbour!', 'I have two dye pots and only one of me, so one is yours now. Boil up blueberries for a blue, beetroot for a red, onion skins for gold. Your rugs will never be the same, which is the point.', 'Bring me some of the blue one day. I have a scarf that is tired of being beige.']), sign: 'Quince' }),
  Object.freeze({ id: 'hl-guest', from: 'Tam', when: H => H.built(3) && H.since(3) >= 1, gift: Object.freeze({ 'mat:timber': 2 }), text: Object.freeze(['A guest room.', 'In my experience guests stay longer than you expect, eat more than they say, and are the best part of a house. I have never had one. I have a spare room for it, should it come up.', 'Timber enclosed, for a bed. They will want a bed.']), sign: 'Tam (below)' }),
  Object.freeze({ id: 'hl-loft', from: 'Pip', when: H => H.built(2) && H.since(2) >= 1, card: 'loft', gift: Object.freeze({ 'mat:timber': 1 }), text: Object.freeze(['A loft! I can see your round window from the river. It winks at me in the mornings.', 'I wrote this on a boat. That is why it is wet. Keep the timber dry, at least.']), sign: 'Pip' }),
  Object.freeze({ id: 'hl-stars', from: 'Wick', when: H => H.stars >= 4, gift: Object.freeze({ 'decor:hf-mirror': 1 }), text: Object.freeze(['I am told your house has four stars. Bramble has never given me more than two, and I have a hollow oak.', 'Here is a mirror. You can look in it and see a person with a four-star house. I shall be looking at a two-star owl.']), sign: 'Wick' }),
]);
/** The thank-you notes after a housewarming (one, the day after, from whoever came first), and a letter each season. */
const HOUSE_THANKS = Object.freeze({
  thistle: Object.freeze(['Thank you for having us, dear. I ate three scones and I regret nothing.', 'Seeds enclosed. Plant them near the door so people coming in see something nice first.']),
  pip: Object.freeze(['Thanks for the party! I counted the windows on the way home. You have a good number.', 'Here are some seeds I found in my pocket. They might be anything.']),
  tam: Object.freeze(['Thank you for the housewarming. The house is warmer now. I checked the floor.', 'I enclose seeds. They were in my spare room. Most things are.']),
  bramble: Object.freeze(['My notes on your housewarming: good tea, adequate chairs, excellent company, apart from Pip.', 'Seeds enclosed, for the front. A house is judged by its front.']),
  quince: Object.freeze(['What a lovely afternoon! Your house smells like somewhere people are happy.', 'Seeds in here, for something to pick and put in a jug on your table.']),
  wick: Object.freeze(['Thank you for having me. I stayed until it was properly dark, which is when a house is most itself.', 'Seeds enclosed. I do not know what they are. Neither, I suspect, do they.']),
});
const HOUSE_SEASON_LETTERS = Object.freeze({
  spring: Object.freeze({ from: 'Quince', text: Object.freeze(['Spring! Open every window you have. Let the winter out of the corners.', 'Seeds for the season enclosed, from my tin.']), sign: 'Quince' }),
  summer: Object.freeze({ from: 'Pip', text: Object.freeze(['It is too hot to write. I am writing anyway, from under a bridge.', 'Have some seeds. Water them more than you think.']), sign: 'Pip' }),
  autumn: Object.freeze({ from: 'Mother Thistle', text: Object.freeze(['The evenings are drawing in, dear. Light the fire early and draw the curtains late, so you get both.', 'A few seeds for next year. Autumn is when next year starts, whatever the calendar says.']), sign: 'Mother Thistle' }),
  winter: Object.freeze({ from: 'Wick', text: Object.freeze(['Long nights. My favourite. Look out of your highest window after supper: the stars are clearer over your roof than over mine.', 'Seeds enclosed, for when it is warm again. It will be.']), sign: 'Wick' }),
});
function _hsMail() { const hs = _gdG().hs || {}; return hs.mail && typeof hs.mail === 'object' ? hs.mail : {}; }
/** What the letters can ask about the house (pure reads of your own garden). */
function _hsMailFacts() {
  const g = _gdG(), hs = g.hs || {}, today = _gdToday(), hr = g.hr || {}, days = d => typeof _wdDaysBetween === 'function' && d ? _wdDaysBetween(d, today) : 0;
  return { days: days(hs.m), stars: Number(hs.stars) || 0, built: s => !!(hr[String(s)] && Number(hr[String(s)].st) === 2), since: s => days(hr[String(s)] && hr[String(s)].d), today };
}
/** The next letter that may come today (one a day), or null. */
function _hsPostDue() {
  const g = _gdG(), hs = g.hs || {}; if (!hs.home || hs.mailDay === _gdToday()) return null;
  const M = _hsMail(), H = _hsMailFacts(), ago = (id, n) => M[id] && M[id].a && typeof _wdDaysBetween === 'function' && _wdDaysBetween(M[id].a, H.today) >= n;
  for (const L of HOUSE_LETTERS) { if (M[L.id]) continue; if (L.after && !ago(L.after, L.days || 0)) continue; if (L.when && !L.when(H)) continue; return L; }
  const hw = hs.hw; if (hw && hw.done && hw.d && hw.d < H.today && !M['hl-thx-' + hw.s + '-' + hw.d]) { const c = houseCallersFor(hw.seed, null)[0]; if (c && HOUSE_THANKS[c.id]) { const row = VALE_FOLK_ROW.get(c.id); return { id: 'hl-thx-' + hw.s + '-' + hw.d, from: row ? row.name : c.id, text: HOUSE_THANKS[c.id], sign: row ? row.name : c.id, seeds: 2 }; } }
  const season = gardenHere().season, yr = H.today.slice(0, 4), sid = 'hl-s-' + season + '-' + yr, SL = HOUSE_SEASON_LETTERS[season];
  if (SL && H.days >= 3 && !M[sid]) return Object.assign({ id: sid, seeds: 3 }, SL);
  return null;
}
/** Every letter that came, newest first: the table's rows and the thank-you and season notes (rebuilt from their ids). */
function _hsPostHad() {
  const M = _hsMail(), out = [];
  for (const [id, e] of Object.entries(M)) {
    if (!e || !e.a) continue;
    let L = HOUSE_LETTERS.find(r => r.id === id) || null;
    const thx = /^hl-thx-(\d)-(\d{4}-\d{2}-\d{2})$/.exec(id), sea = /^hl-s-(spring|summer|autumn|winter)-\d{4}$/.exec(id);
    if (!L && thx && e.from && HOUSE_THANKS[e.from]) { const row = VALE_FOLK_ROW.get(e.from); L = { id, from: row ? row.name : e.from, text: HOUSE_THANKS[e.from], sign: row ? row.name : e.from, seeds: 2 }; }
    if (!L && sea) L = Object.assign({ id, seeds: 3 }, HOUSE_SEASON_LETTERS[sea[1]]);
    if (L) out.push(Object.assign({ a: e.a, r: e.r || '' }, L));
  }
  return out.sort((x, y) => String(y.a).localeCompare(String(x.a)));
}
function _hsPostUnread() { return _hsPostHad().filter(L => !L.r).length; }
/** A letter comes: at most one a day, while you are about your house or garden. */
function _hsPostTick() {
  if (gpVisiting()) return;
  const now = performance.now(); if (now - (_hsPostTick.at || 0) < 15000) return; _hsPostTick.at = now;   // (a few compares, every quarter minute)
  const L = _hsPostDue(); if (!L) return;
  const g = _gdG(), hs = g.hs; if (!hs.mail || typeof hs.mail !== 'object') hs.mail = {};
  const e = { a: _gdToday() }; const thx = /^hl-thx-/.test(L.id) ? (houseCallersFor((hs.hw || {}).seed, null)[0] || {}).id : ''; if (thx) e.from = thx;
  hs.mail[L.id] = e; hs.mailDay = _gdToday();
  _gdSaveQuiet();
  if (typeof _hsOutsideSoon === 'function') _hsOutsideSoon();
  try { if (typeof wdAmbient === 'function') wdAmbient(`There is a letter in your mailbox, from ${L.from}.`, 5000, 'post'); } catch (e2) { /* only words */ }
}
/** Read a letter: what was in the envelope comes out once (its ledger key is the letter's). */
function _hsPostRead(L) {
  const g = _gdG(), hs = g.hs, M = hs.mail || (hs.mail = {}), today = _gdToday();
  if (M[L.id] && !M[L.id].r) M[L.id].r = today;
  let foot = '';
  const k = 'hml.' + L.id;
  if (!g.led[k]) {
    const i = {};
    if (L.gift) for (const [it, n] of Object.entries(L.gift)) if (n > 0 && (!it.startsWith('decor:') || gardenDecor(it.slice(6)))) i[it] = n;
    if (L.seeds) { const pool = typeof GARDEN_PLANTS !== 'undefined' ? GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && (typeof gardenInSeason !== 'function' || gardenInSeason(p, gardenHere().season))) : [], p = pool.length ? pool[gardenHash(L.id) % pool.length] : null; if (p) i['seed:' + p.id] = L.seeds; }
    if (Object.keys(i).length) { g.led[k] = { d: today, k: 'hs', i, n: 1 }; foot = 'In the envelope: ' + Object.entries(i).map(([it, n]) => _hsItemWords(it, n)).join(', ') + '. It is in your things.'; }
  }
  _gdSaveQuiet(); if (_hsInside()) _grm.S.dirty = true;
  if (typeof _hsOutsideSoon === 'function') _hsOutsideSoon();
  return foot;
}
function _hsItemWords(it, n) {
  const num = ['no', 'a', 'two', 'three', 'four', 'five', 'six'][n] || String(n);
  if (it === 'mat:stone') return n === 1 ? 'a good stone' : `${num} good stones`;
  if (it === 'mat:timber') return n === 1 ? 'a length of timber' : `${num} lengths of timber`;
  if (it.startsWith('seed:')) { const p = gardenPlant(it.slice(5)); return `${num} packet${n === 1 ? '' : 's'} of ${p ? p.name.toLowerCase().replace(/ tree$/, '') : ''} seeds`.replace('  ', ' '); }
  if (it.startsWith('decor:')) { const d = gardenDecor(it.slice(6)); return d && typeof _gscA === 'function' ? _gscA(houseLowName(d)) : 'a present'; }
  return 'something';
}
/** The mailbox: the newest unread letter, or the letters that came. On a visit: their mailbox is theirs. */
function _hsPostOpen() {
  if (gpVisiting()) { gardenToast('Your friend’s mailbox. It is not yours to open.', { icon: 'mail' }); return; }
  const had = _hsPostHad();
  if (!had.length) { gardenToast('Nothing in the mailbox yet. The vale writes when there is news.', { icon: 'mail' }); return; }
  const L = had.find(x => !x.r) || had[0];
  _hsLetterPage(L, had);
}
function _hsLetterPage(L, had) {
  const foot = _hsPostRead(L);
  const card = L.card === 'loft' ? '<svg viewBox="0 0 280 130" class="wd-card" role="img" aria-label="A drawing of a cottage with a round window in its roof"><rect width="280" height="130" fill="#cfe4ef"/><path d="M0 96Q70 80 140 92T280 88V130H0z" fill="#7aa060"/><path d="M90 96V70L140 40L190 70V96Z" fill="#f2ead8"/><path d="M84 72L140 34L196 72" fill="none" stroke="#b8945a" stroke-width="9" stroke-linejoin="round"/><circle cx="140" cy="62" r="8" fill="#3a5a7a" stroke="#f2ead8" stroke-width="2"/><rect x="133" y="78" width="14" height="18" fill="#6a4a2e"/><path d="M200 100q10-8 20 0" stroke="#5a8ab0" stroke-width="3" fill="none"/></svg>' : '';
  if (typeof wdPage !== 'function') { gardenToast(L.text.join(' '), { icon: 'mail' }); return; }
  wdPage({ title: (L.card ? 'A postcard from ' : 'A letter from ') + L.from, art: card, text: L.text, sign: L.sign, foot, after(el) {
    const more = (had || []).filter(x => x.id !== L.id);
    if (!more.length) return;
    const box = gpEl('div', 'hs-mail-more'); box.appendChild(gpEl('p', 'muted hs-mail-h', 'Other letters'));
    for (const M of more.slice(0, 8)) { const b = gpEl('button', 'btn btn-ghost btn-sm', `${M.from}${M.r ? '' : ' (new)'}`); b.type = 'button'; b.onclick = () => { try { closeDialog(); } catch (e) { /* closed */ } setTimeout(() => _hsLetterPage(M, _hsPostHad()), 60); }; box.appendChild(b); }
    el.appendChild(box);
  } });
}
/** The mailbox by your door: a little wooden box on a post, its red flag up while a letter waits (drawn round its foot, world px). */
function _hsMailboxSvg(B) {
  const up = !gpVisiting() && _hsPostUnread() > 0;
  return '<ellipse cx="1" cy="1" rx="7" ry="2" fill="#2a2418" opacity=".25"/>'
    + '<path d="M-3 1q2 -5 1 -8M3 1q-1 -4 1 -6M0 1q0 -4 -1 -5" stroke="#5a8a3a" stroke-width="1" fill="none"/>'
    + '<rect x="-1.4" y="-24" width="2.8" height="25" fill="#6a4a2a"/><rect x="-1.4" y="-24" width="1" height="25" fill="#9a7448" opacity=".7"/>'
    + '<path d="M-8 -24V-31Q-8 -36 0 -36Q8 -36 8 -31V-24Z" fill="#3a5a4a"/><path d="M-8 -24V-31Q-8 -36 0 -36" fill="none" stroke="#5a8a6a" stroke-width="1"/><rect x="-8" y="-25" width="16" height="2" fill="#2a4038"/>'
    + '<rect x="-3" y="-31" width="6" height="1.4" rx=".7" fill="#e8d8b0"/>'
    + (up ? '<rect x="7.4" y="-38" width="1.2" height="10" fill="#4a3a2a"/><path d="M8.6 -38h5l-1.2 1.8l1.2 1.8h-5z" fill="#d8402f"/>' : '<rect x="7.4" y="-30" width="9" height="1.2" fill="#4a3a2a"/><path d="M14 -30v4l1.8 -1.2l1.8 1.2v-4z" fill="#d8402f"/>');
}

/* ---------- the guest book ---------- */
/** Use a guest book (any piece of its kind): yours to read, or your friend's to sign. */
function _hsGuestBookOpen() {
  if (typeof openDialog !== 'function') return;
  const m = gardenHere(), visit = m && m.visit, fid = visit ? visit.fid : '', H = gardenHouseMine();
  openDialog({ title: visit ? 'Their guest book' : 'Your guest book', width: 520, className: 'hs-book-dlg gd-popup', body(el) {
    const book = gpEl('div', 'hs-book'), left = gpEl('div', 'hs-book-p hs-book-l'), right = gpEl('div', 'hs-book-p hs-book-r');
    left.appendChild(gpEl('p', 'hs-book-title', (H && H.name) || 'The cottage'));
    left.appendChild(gpEl('p', 'hs-book-sub', 'Guests'));
    left.appendChild(gpEl('p', 'hs-book-note', visit ? 'Write a line for them. They read it in their guest book, by the door.' : 'Friends who come by write a line here, one a day each.'));
    book.appendChild(left); book.appendChild(right); el.appendChild(book);
    if (visit) {
      const c = typeof gardenSocialFriendCached === 'function' ? gardenSocialFriendCached(fid) : null, mine = (c && c.mine || []).filter(a => a.t === 'sign').slice(0, 5), signed = !!(c && typeof _gsvLeft === 'function' && !_gsvLeft(c, 'sign'));
      if (mine.length) for (const a of mine) { const li = gpEl('div', 'hs-book-e'); li.appendChild(gpEl('q', null, a.txt || '')); li.appendChild(gpEl('span', 'hs-book-who', 'You')); right.appendChild(li); }
      else right.appendChild(gpEl('p', 'hs-book-empty', 'The page is fresh. Be the first to write on it.'));
      const form = gpEl('div', 'hs-book-f'), inp = document.createElement('input'); inp.type = 'text'; inp.className = 'input'; inp.maxLength = typeof GSOC_TEXT_MAX !== 'undefined' ? GSOC_TEXT_MAX : 120; inp.placeholder = signed ? 'Signed today: again tomorrow' : 'A few kind words'; inp.disabled = signed; inp.setAttribute('aria-label', 'Write in the guest book');
      const go = () => { if (typeof gardenSocialSign === 'function' && gardenSocialSign(fid, inp.value, inp)) { inp.value = ''; const got = _hsGive('house.signed', { 'mat:stone': 1 }); if (got) gardenToast('You sign the guest book. On the stand, a smooth stone for whoever signs: you take it.', { icon: 'feather', kind: 'ok' }); } };
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); go(); } });
      const b = gpEl('button', 'btn btn-primary btn-sm', 'Sign'); b.type = 'button'; b.onclick = go; b.disabled = signed;
      form.appendChild(inp); form.appendChild(b); el.appendChild(form);
      setTimeout(() => { try { inp.focus(); } catch (e) { /* fine */ } }, 50);
      return;
    }
    const d = typeof _gsc !== 'undefined' && _gsc.data ? _gsc.data : null, list = d && Array.isArray(d.book) ? d.book.filter(a => !a.hid).slice(0, 12) : [];
    if (!list.length) { right.appendChild(gpEl('p', 'hs-book-empty', 'No one has signed it yet. When friends come in, they can write a line here.')); return; }
    for (const a of list) {
      const f = typeof _gscFriend === 'function' ? _gscFriend(a.f) : null, who = f && typeof gardenSocialName === 'function' ? gardenSocialName(f) : 'A friend';
      const li = gpEl('div', 'hs-book-e'); li.appendChild(gpEl('q', null, a.txt || '')); li.appendChild(gpEl('span', 'hs-book-who', `${who}${typeof _gsvAgo === 'function' ? ', ' + _gsvAgo(a.at) : ''}`)); right.appendChild(li);
    }
  } });
}

/* ============================================================
   THE TRAVELLING GNOME and BOTTLE POST (docs/dev/GARDEN_TOGETHER.md section 24). Two things that take days and go to a friend, both by the same sealed snapshot.
   THE GNOME. Everyone has one by the post box. Take it on a visit and leave it there: it stands in their garden for three days, friends who call there see it, and a photo of it goes in your Memories. Then it comes home with a pennant on its hat. wd['tg.gn'] = {at: friend, d}; pennants wd['tg.gp.<friend>'] = day. The snapshot says where it stays only as gtgPair, which only the two of you can match, and how many pennants (`gb`). A garden lists the gnomes staying with it as colour numbers (`gs`), so its visitors see them.
   THE BOTTLE. Pick a friend and a line from the book (never free text: GTG_BOTTLE_LINES, the index goes on the wire) and it sets off. Three days later it is bobbing in their lake (frozen in, in winter). Snapshot `bt` [[mark, line, day sent]], the last three; `bw` how many wait unread, so a visitor sees them too.
   ============================================================ */
const GTG_GN = Object.freeze({ days: 3, hostTicket: 3, homeTicket: 6, at3: Object.freeze({ ticket: 15 }), at6: Object.freeze({ ticket: 25, 'mat:stone': 5 }) });
const GTG_GN_AT = Object.freeze(Object.assign(_wdPt('post-box', 1.1, 0.5), { guest: _wdPt('notice-board', -3.4, 0.5) }));   // world cells: yours at home; those staying with you stand in a row from here
const GTG_BOTTLE_AT = Object.freeze([[19, 23.4], [31.5, 22.6], [23, 26.6]]);   // world cells: where a bottle comes to rest
const GTG_BOTTLE = Object.freeze({ days: 3, keep: 3, read: 3, send: 1 });
/* Append only: the index is what is sent. No names, no links, nothing but kindness. */
const GTG_BOTTLE_LINES = Object.freeze(['Thinking of you.', 'Your garden looked lovely last time.', 'Hope today was kind to you.', 'Well done, by the way.', 'Come round soon.', 'Saw a fish that reminded me of you.', 'I owe you a cup of tea.', 'Keep going. It is worth it.', 'I hope it stops raining where you are.', 'Nothing to say. Just this bottle.', 'Happy whatever it is today.', 'Your tomatoes are better than mine and I have made my peace with it.']);
function _gtgnStamps() { const W = _gtgW(); return Object.keys(W).filter(k => k.startsWith('tg.gp.')).length; }
function _gtgnAway() { const a = _gtgW()['tg.gn']; return a && a.at ? a : null; }
gtgWire((o) => {
  const a = _gtgnAway(), n = _gtgnStamps(); if (a) { const h = gtgPair(a.at); if (h) o.gn = h; } if (n) o.gb = Math.min(99, n);
  const gs = _gtgnGuests().map(f => (gardenHash('gn|' + f.id) >>> 0) % 9999); if (gs.length) o.gs = gs.slice(0, 4);
});
function _gtgnGuests() { return gtgFriends().filter(f => f.tg.gn && f.tg.gn === gtgPair(f.id)).slice(0, 4); }
function gtgGnomeSvg(seed, pennants) {
  const A = GART, hats = ['#c8382a', '#2a6ab4', '#3a8a4a', '#c88a1a', '#8a3ab4', '#d8588a'], hat = hats[Math.abs(seed) % hats.length], coat = ['#3a6a8a', '#8a4a2a', '#4a7a3a', '#6a4a8a'][Math.abs(seed >> 3) % 4];
  let s = A.P('#000000', A.ell(0, 1, 10, 3), 0.2) + A.P('#4a3a2a', A.rrect(-7, -5, 6, 5, 1) + A.rrect(1, -5, 6, 5, 1)) + A.P(coat, 'M-8 -5L-7 -18Q0 -21 7 -18L8 -5z') + A.P('#f0d8c0', A.circ(0, -21, 5.4)) + A.P('#f4f4ec', 'M-6 -21Q-7 -12 0 -9Q7 -12 6 -21Q0 -17 -6 -21z') + A.P('#e8a890', A.circ(0, -20.6, 1.6)) + A.P(hat, 'M-7 -24Q0 -22 7 -24L0 -42z');
  for (let i = 0; i < Math.min(6, pennants || 0); i++) s += A.P(['#f4d03a', '#ffffff', '#5a9ae8'][i % 3], `M${-3 + i * 1.2} ${-38 + i * 2.2}l-5 -2l5 -2z`);
  return s;
}
function _gtgnLeave(fid, m) {
  const W = _gtgW(); W['tg.gn'] = { at: fid, d: m.today }; _gdSave();
  try { if (typeof _gscPublish === 'function') _gscPublish(true).catch(() => {}); } catch (e) { /* the next check tells them */ }
  _gtgnDraw(gardenHere());
  wdWhisper('It looks at home. Three days, it says.', 5000);
  setTimeout(async () => {   // the postcard: drawn here, kept here, sent to nobody
    try { const G = _gtgnSpot(0), blob = await _glsBlob(_glsFrame(Math.round(G.x), Math.round(G.y))); await memPhotoKeep(blob, { iso: _gdToday(), ts: Clock.now(), kind: 'garden', at: fid }); gardenToast('A photo of your gnome is in your Memories', { icon: 'camera', timeout: 5000, action: { label: 'See it', run: () => setView('memories:photos') } }); } catch (e) { /* only a postcard */ }
  }, 1200);
}
function _gtgnSpot(i) { const g = GTG_GN_AT.guest; return { x: g.x - i * 0.9, y: g.y + (i % 2) * 0.35 }; }
function _gtgnHomeTick(m) {
  const a = _gtgnAway(); if (!a || m.visit) return;
  if (_wdDaysBetween(a.d, m.today) < GTG_GN.days) return;
  const W = _gtgW(), n0 = _gtgnStamps(), first = !W['tg.gp.' + a.at], who = _gscFirst(a.at);
  W['tg.gp.' + a.at] = m.today; W['tg.gn'] = { d: m.today };
  gpGrant(`tg-gn-${a.at}-${a.d}`, { ticket: GTG_GN.homeTicket });
  const n = _gtgnStamps();
  if (first && n >= 3 && n0 < 3) gpGrant('tg-gn-3', Object.assign({}, GTG_GN.at3));
  if (first && n >= 6 && n0 < 6) gpGrant('tg-gn-6', Object.assign({}, GTG_GN.at6));
  _gdSave(); gtgPublishSoon(); _gtgnDraw(m);
  wdWhisper(first ? `Your gnome is home from ${who}’s, with a new pennant on its hat.` : `Your gnome is home from ${who}’s, and will not say what happened.`, 8000);
}
function _gtgnDraw(m) {
  const a = _gtgnAway(), theirs = _gtgTheirs(m), n = _gtgnStamps(), seed = gardenHash('gn|' + (gtgMeId() || 'me')) >>> 0;
  if (m.visit) {
    const fid = m.visit.fid, here = !!a && a.at === fid, list = (theirs.gs || []).slice(0, 4);
    const mineIn = here && !list.includes(seed % 9999);
    const drawn = list.concat(mineIn ? [seed % 9999] : []);
    for (let i = 0; i < 5; i++) {
      const v = drawn[i]; if (v == null) { gtgSprite('gn-g' + i, null); continue; }
      const P = _gtgnSpot(i), mine = v === seed % 9999 && here;
      gtgSprite('gn-g' + i, { x: P.x, y: P.y, z: P.y, hit: 0.6, hitUp: 12, label: mine ? 'Your gnome' : 'A gnome', svg: gtgGnomeSvg(v, mine ? n : 0), onClick: () => wdTalk({ lines: [mine ? `Your gnome. It is staying for ${GTG_GN.days} days, and seems to be enjoying the view.` : 'Someone’s gnome. It has come to stay for a few days, and it is not telling you whose.'], bye: 'Leave it' }) });
    }
    if (!a && gtgFriendList().some(f => f.id === fid)) {   // it came along
      const x = GTG_GN_AT.guest.x + 1, y = GTG_GN_AT.guest.y;
      gtgSprite('gn-me', { x, y, z: y, hit: 0.6, hitUp: 12, label: 'Your gnome came with you', svg: gtgGnomeSvg(seed, n), onClick: () => wdTalk({ lines: ['Your gnome came along. It would like to stay here a few days, if nobody minds.'], actions: [{ label: 'Leave it here', primary: true, run: () => { wdTalkClose(true); _gtgnLeave(fid, m); } }], bye: 'Not this time' }) });
    } else gtgSprite('gn-me', null);
    return;
  }
  const away = a && a.at;
  const P = GTG_GN_AT;
  gtgSprite('gn-me', away ? { x: P.x, y: P.y, z: P.y, hit: 0.6, hitUp: 8, label: 'An empty plinth', svg: GART.P('#000000', GART.ell(0, 1, 9, 2.6), 0.2) + GART.P('#a8a498', GART.rrect(-7, -5, 14, 5, 1)), onClick: () => wdTalk({ lines: [`A clean patch and a note: gone to ${_gscFirst(a.at)}’s. Back in ${Math.max(1, GTG_GN.days - _wdDaysBetween(a.d, m.today))} day${GTG_GN.days - _wdDaysBetween(a.d, m.today) === 1 ? '' : 's'}.`], bye: 'Fair enough' }) }
    : { x: P.x, y: P.y, z: P.y, hit: 0.6, hitUp: 12, label: 'Your gnome', svg: gtgGnomeSvg(seed, n), onClick: () => wdTalk({ lines: [n ? `Your gnome. It has been to ${n} garden${n === 1 ? '' : 's'}, and has the pennants to prove it.` : 'Your gnome. It has never been anywhere. Next time you visit a friend, it will come along, and you can leave it there.'], bye: 'Goodbye' }) });
  const g = _gtgnGuests();
  for (let i = 0; i < 5; i++) {
    const f = g[i]; if (!f) { gtgSprite('gn-g' + i, null); continue; }
    const Q = _gtgnSpot(i), key = `tg-gh-${f.id}-${m.today.slice(0, 7)}`;
    gtgSprite('gn-g' + i, { x: Q.x, y: Q.y, z: Q.y, hit: 0.6, hitUp: 12, label: `${f.name}’s gnome`, svg: gtgGnomeSvg(gardenHash('gn|' + f.id) >>> 0, Number(f.tg.gb) || 0), onClick: () => { const paid = gpGrant(key, { ticket: GTG_GN.hostTicket }); wdTalk({ lines: [`${f.name}’s gnome has come to stay. It says nothing, and looks at your garden as if it might buy it.${paid ? ` It had ${GTG_GN.hostTicket} tickets in its hat, which you may keep.` : ''}`], bye: 'Make yourself at home' }); } });
  }
}
wdMod({ id: 'tg-gnome', visit: true, begin(m) { _gtgnDraw(m); }, painted(m) { _gtgnDraw(m); }, tick(m) { if (Math.floor(_wd.t) % 15 === 0) { _gtgnHomeTick(m); _gtgnDraw(m); } } });
/* ---------- the bottle ---------- */
gtgWire((o) => {
  const W = _gtgW(), sent = [];
  for (const k of Object.keys(W)) if (k.startsWith('tg.bt.') && W[k]) { const p = k.split('.'); sent.push({ fid: p[2], dn: Number(p[3]), l: Number(W[k].l) || 0 }); }
  sent.sort((a, b) => b.dn - a.dn);
  const bt = []; for (const s of sent.slice(0, GTG_BOTTLE.keep)) { const h = gtgPair(s.fid); if (h) bt.push([h, s.l, s.dn]); }
  if (bt.length) o.bt = bt;
  const un = _gtgbWaiting().length; if (un) o.bw = Math.min(9, un);
});
function _gtgbWaiting() {
  const W = _gtgW(), now = gtgDayNum(), out = [];
  for (const f of gtgFriends()) {
    if (!Array.isArray(f.tg.bt)) continue;
    const h = gtgPair(f.id); if (!h) continue;
    for (const r of f.tg.bt) if (r[0] === h && now >= r[2] + GTG_BOTTLE.days && !W[`tg.br.${f.id}.${r[2]}`] && GTG_BOTTLE_LINES[r[1]]) out.push({ fid: f.id, name: f.name, l: r[1], dn: r[2] });
  }
  return out.slice(0, GTG_BOTTLE_AT.length);
}
function _gtgbSvg() { const A = GART; return A.P('#0a2a3a', A.ell(0, 2, 13, 3), 0.25) + `<g transform="rotate(-24)">` + A.P('#6a9a7a', A.rrect(-10, -5, 15, 10, 3), 0.85) + A.P('#6a9a7a', A.rrect(4, -2.4, 7, 4.8, 1), 0.85) + A.P('#b88a4a', A.rrect(10, -2, 3, 4, 0.6)) + A.P('#f4ead0', A.rrect(-7, -2.6, 9, 5, 0.5)) + A.P('#ffffff', A.rrect(-8, -4, 9, 1.2, 0.5), 0.6) + '</g>'; }
function _gtgbDraw(m) {
  const rows = m.visit ? new Array(Math.min(GTG_BOTTLE_AT.length, Number(_gtgTheirs(m).bw) || 0)).fill(null) : _gtgbWaiting();
  GTG_BOTTLE_AT.forEach(([x, y], i) => {
    const B = rows[i];
    if (i >= rows.length) { gtgSprite('bt-' + i, null); return; }
    gtgSprite('bt-' + i, { x, y, z: y, hit: 0.9, hitUp: 2, label: 'A bottle in the water', svg: _gtgbSvg(), onClick: () => {
      if (!B) { wdTalk({ lines: ['A bottle. It is not for you, and you leave it where it is.'], bye: 'Leave it' }); return; }
      const W = _gtgW(); W[`tg.br.${B.fid}.${B.dn}`] = m.today; _gdSave();
      const paid = gpGrant(`tg-bt-${B.fid}-${B.dn}`, { ticket: GTG_BOTTLE.read });
      gtgPublishSoon();
      wdTalk({ lines: [`A bottle from ${B.name}. It has been in the water ${GTG_BOTTLE.days} days.`, `"${GTG_BOTTLE_LINES[B.l]}"${paid ? `  There were ${GTG_BOTTLE.read} tickets rolled up with the note.` : ''}`], actions: [{ label: 'Send one back', primary: true, run: () => { wdTalkClose(true); gardenBottlePostOpen(B.fid); } }], bye: 'Keep it', onClose: () => _gtgbDraw(gardenHere()), closeQuiet: true });
      _gtgbDraw(gardenHere());
    } });
  });
}
function gardenBottlePostOpen(to) {
  gpStage('Bottle post', (el) => {
    el.classList.add('tg-panel');
    const friends = gtgFriendList();
    el.appendChild(gpEl('p', 'muted', 'It takes three days to reach their lake, and they have to find it. You choose a line from the book.'));
    if (!friends.length) { el.appendChild(gpEl('p', 'muted', 'This needs a friend to send it to. Add one under Friends.')); return; }
    const sel = document.createElement('select'); sel.className = 'tg-sel'; sel.setAttribute('aria-label', 'Send to'); for (const f of friends) { const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; if (f.id === to) o.selected = true; sel.appendChild(o); }
    const pick = gpEl('label', 'tg-pick'); pick.append(gpEl('span', null, 'To '), sel); el.appendChild(pick);
    const list = gpEl('div', 'tg-lines');
    GTG_BOTTLE_LINES.forEach((t, i) => {
      const b = gpEl('button', 'tg-line', t); b.type = 'button';
      b.onclick = () => {
        const W = _gtgW(), fid = sel.value, dn = gtgDayNum(), key = `tg.bt.${fid}.${dn}`;
        if (W[key]) { gardenToast(`One bottle a day to ${_gscFirst(fid)}: the next can go tomorrow.`, { icon: 'waves', timeout: 4000 }); return; }
        W[key] = { l: i }; _gdSave();
        try { if (typeof _gscPublish === 'function') _gscPublish(true).catch(() => {}); } catch (e) { /* the next check tells them */ }
        const paid = _grGive('did.bottle', { ticket: GTG_BOTTLE.send });
        gardenToast(`It floats off towards ${_gscFirst(fid)}. Three days.${paid ? ' 1 ticket' : ''}`, { icon: 'waves', kind: 'ok', timeout: 5000 });
        if (typeof gardenPopupClose === 'function') gardenPopupClose();
        document.querySelector('.tg-panel')?.closest('[role=dialog]')?.querySelector('.dlg-close, [aria-label="Close"]')?.click();
      };
      list.appendChild(b);
    });
    el.appendChild(list);
  });
}
gardenPlayAdd({ id: 'tg-bottle', name: 'Bottle post', icon: 'waves', group: 'secret', blurb: 'Send a line from the book to a friend. It takes three days to reach their lake.', status: () => { try { const n = _gtgbWaiting().length; return n ? `${n} in your lake` : ''; } catch (e) { return ''; } }, open: () => gardenBottlePostOpen() });
wdMod({ id: 'tg-bottle', visit: true, begin(m) { _gtgbDraw(m); }, painted(m) { _gtgbDraw(m); }, tick(m) { if (Math.floor(_wd.t) % 15 === 7) _gtgbDraw(m); } });

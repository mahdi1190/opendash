/* ============================================================
   SONGS between friends (2.26): send a friend a song, album, playlist or artist to listen to, and what arrives. The kind is 'song'
   (lib/friends/songs.mjs; docs/dev/FRIENDS.md section 9): {t, id, n, by?, note?, at?}. Only a Spotify id and plain text cross the wire,
   never a picture or a link. The link is made here from the id after musicOk checked it, and the cover comes from this computer's own
   server by id. A friend does not need Spotify linked to open what you send; if YOU have it linked you can also play it or queue it.

     musicSendDialog({to?, item?})    find something (musicPick), then choose friends and add a line
     musicSongCard(b, {mine})         the card of a song in the feed and on a friend's page
   Friends.describe('song'), a panel on a friend's page ("Music"), a toast when one arrives and a command: Send a song to a friend.
   ============================================================ */
const _mu = { box: new Map() };

function _muFName(f) { try { if (typeof friendName === 'function') return friendName(f); } catch (e) { /* plain name */ } return (f && typeof f.name === 'string' && f.name) || 'A friend'; }
/** A song from a friend (or from our own feed), cleaned: {t, id, n, by, note} | null. */
function _muSongClean(b) {
  if (!b || typeof b !== 'object' || !musicOk(b.t, b.id)) return null;
  const n = _muText(b.n, 100);
  if (!n) return null;
  return { t: b.t, id: b.id, n, by: _muText(b.by, 100), note: _muText(b.note, 140) };
}
function _muFriends() {
  let list = [];
  try { list = window.Friends && typeof window.Friends.list === 'function' ? window.Friends.list() || [] : []; } catch (e) { list = []; }
  const rank = (f) => ({ online: 0, focusing: 1, travelling: 2, away: 3 })[f.presence] ?? 4;
  return list.filter(f => f && f.status === 'friend' && /^[0-9a-f]{16}$/.test(String(f.id || ''))).sort((a, b) => rank(a) - rank(b) || _muFName(a).localeCompare(_muFName(b)));
}

/* ---------- the card ---------- */
function musicSongCard(b, o) {
  const s = _muSongClean(b);
  if (!s) return null;
  o = o || {};
  const card = _muEl('div', 'mu-song' + (o.mine ? ' is-mine' : ''));
  card.appendChild(musicCoverEl(s.t, s.id, s.n, { size: o.compact ? 52 : 64 }));
  const tx = _muEl('div', 'mu-song-tx');
  tx.appendChild(_muEl('div', 'mu-song-k', musicLabel(s.t)));
  tx.appendChild(_muEl('div', 'mu-n', s.n));
  if (s.by) tx.appendChild(_muEl('div', 'mu-s', s.by));
  if (s.note) tx.appendChild(_muEl('p', 'mu-note', '“' + s.note + '”'));
  const acts = _muEl('div', 'mu-song-acts');
  const item = { t: s.t, id: s.id, n: s.n };
  if (spotifyLinked()) {
    acts.appendChild(uiButton({ label: 'Play', icon: 'play', kind: 'primary', size: 'sm', run: (e, btn) => { btn.disabled = true; musicPlay(item).finally(() => { btn.disabled = false; }); } }));
    if (s.t === 'track') acts.appendChild(uiButton({ label: 'Queue', icon: 'list-plus', kind: 'secondary', size: 'sm', run: (e, btn) => { btn.disabled = true; musicQueue(item).finally(() => { btn.disabled = false; }); } }));
    acts.appendChild(uiButton({ label: 'Open in Spotify', icon: 'external-link', kind: 'ghost', size: 'sm', run: () => musicOpen(s.t, s.id) }));
  } else {
    acts.appendChild(uiButton({ label: 'Open in Spotify', icon: 'external-link', kind: 'secondary', size: 'sm', run: () => musicOpen(s.t, s.id) }));
  }
  tx.appendChild(acts);
  card.appendChild(tx);
  return card;
}

/* ---------- sending ---------- */
/** Send a song: find it, then choose who gets it. Passing item skips the search; to preselects a friend. */
function musicSendDialog(o) {
  o = o || {};
  const st = { item: o.item && musicOk(o.item.t, o.item.id) ? { t: o.item.t, id: o.item.id, n: _muText(o.item.n, 100), by: _muText(o.item.by, 100) } : null,
    to: new Set(Array.isArray(o.to) ? o.to : o.to ? [o.to] : []), note: _muText(o.note, 140) };
  const find = () => musicPick({ title: 'Find something to send', types: ['track', 'album', 'playlist', 'artist'], type: 'track', pickLabel: 'Send this',
    onPick: (it) => { st.item = { t: it.t, id: it.id, n: it.n, by: it.by || '' }; _muSendStep(st, find); } });
  if (st.item) _muSendStep(st, find); else find();
}
function _muSendStep(st, find) {
  const friends = _muFriends();
  let note;
  openDialog({ title: 'Send a song', size: 'md', resizeKey: 'music-send',
    body: (el, close) => {
      const it = st.item;
      const prev = _muEl('div', 'mu-send-item');
      prev.appendChild(musicCoverEl(it.t, it.id, it.n, { size: 56 }));
      const tx = _muEl('div', 'mu-tx'); tx.appendChild(_muEl('span', 'mu-song-k', musicLabel(it.t))); tx.appendChild(_muEl('span', 'mu-n', it.n)); if (it.by) tx.appendChild(_muEl('span', 'mu-s', it.by));
      prev.appendChild(tx);
      prev.appendChild(uiButton({ label: 'Change', icon: 'search', kind: 'ghost', size: 'sm', run: () => { st.note = note ? note.value : st.note; close(); find(); } }));
      el.appendChild(prev);
      const who = _muEl('div', 'mu-send-who'); who.setAttribute('role', 'group'); who.setAttribute('aria-label', 'Send to');
      who.appendChild(_muEl('div', 'mu-send-h', 'Send to'));
      if (!friends.length) {
        who.appendChild(_muEl('p', 'muted', 'You have no friends to send to yet. Add one in Friends first.'));
        who.appendChild(uiButton({ label: 'Open Friends', icon: 'users', kind: 'secondary', size: 'sm', run: () => { close(); setView('friends'); } }));
      }
      for (const f of friends) {
        const lab = _muEl('label', 'mu-who');
        const cb = _muEl('input'); cb.type = 'checkbox'; cb.checked = st.to.has(f.id);
        cb.onchange = () => { if (cb.checked) st.to.add(f.id); else st.to.delete(f.id); };
        lab.appendChild(cb);
        if (typeof profileAvatarEl === 'function') { try { const av = profileAvatarEl(f, { size: 28 }); if (av) lab.appendChild(av); } catch (e) { /* the name is enough */ } }
        lab.appendChild(_muEl('span', 'mu-who-n', _muFName(f)));
        who.appendChild(lab);
      }
      el.appendChild(who);
      const field = _muEl('label', 'field');
      field.appendChild(_muEl('span', 'field-label', 'Add a line (optional)'));
      note = _muEl('input', 'control'); note.type = 'text'; note.maxLength = 140; note.placeholder = 'Listen to this one on a walk'; note.value = st.note;
      field.appendChild(note); el.appendChild(field);
      el.appendChild(_muEl('p', 'muted mu-send-fine', 'They get the name and a link to open in Spotify. They do not need Spotify linked to Freeflo.'));
    },
    actions: [
      { label: 'Cancel', run: () => {} },
      { label: 'Send', icon: 'send', primary: true, disabled: !friends.length, run: async () => {
        const ids = friends.map(f => f.id).filter(id => st.to.has(id));
        if (!ids.length) { toast('Choose who to send it to.', { icon: 'users' }); return false; }
        const it = st.item, line = _muText(note ? note.value : st.note, 140);
        const body = { t: it.t, id: it.id, n: it.n, ...(it.by ? { by: it.by } : {}), ...(line ? { note: line } : {}), at: Date.now() };   // clock-ok: a real time stamp
        const r = await window.Friends.send(ids.length === 1 ? ids[0] : ids, 'song', body);
        const names = ids.map(id => friends.find(f => f.id === id)).filter(Boolean).map(_muFName);
        const who = names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
        if (r && !r.sent && !r.queued) { toast(`${who} isn’t receiving songs from you right now.`, { kind: 'err' }); return false; }
        toast(r && r.queued && !r.sent ? `“${it.n}” is waiting to send to ${who}` : `Sent “${it.n}” to ${who}`, { kind: 'ok', icon: 'music' });
        return undefined;
      } },
    ] });
}

/* ---------- a friend's page, the feed, arrivals ---------- */
/** The button next to Cheer on a friend's page (96-friends-2tabs.js asks for it). */
function musicFriendAction(f) {
  if (!f || f.status !== 'friend' || !/^[0-9a-f]{16}$/.test(String(f.id || ''))) return null;
  return uiButton({ label: 'Song', icon: 'music', size: 'sm', tip: `Send ${_muFName(f)} a song to listen to`, run: () => musicSendDialog({ to: f.id }) });
}
function _muPanel(sec, f) {
  if (!f || f.status !== 'friend' || !/^[0-9a-f]{16}$/.test(String(f.id || ''))) return false;
  const name = _muFName(f);
  const top = _muEl('div', 'mu-panel-top');
  top.appendChild(uiButton({ label: `Send ${name} a song`, icon: 'send', kind: 'secondary', size: 'sm', run: () => musicSendDialog({ to: f.id }) }));
  sec.appendChild(top);
  const box = _muEl('div', 'mu-panel-list');
  sec.appendChild(box);
  const st = _mu.box.get(f.id) || {};
  _mu.box.set(f.id, st);
  const paint = (entries) => {
    box.replaceChildren();
    const cards = (entries || []).map(e => musicSongCard(e.b, { mine: e.dir === 'out', compact: true })).filter(Boolean);
    if (!cards.length) { box.appendChild(_muEl('p', 'muted mu-small', `No songs yet. Send ${name} something to listen to, or wait for one from them.`)); return; }
    for (const c of cards.slice(0, 5)) box.appendChild(c);
  };
  if (st.entries) paint(st.entries); else box.appendChild(_muEl('span', 'muted mu-small', 'Loading…'));
  if (!st.busy && (!st.entries || Date.now() - (st.at || 0) > 8000)) {   // clock-ok: a cache age
    st.busy = true;
    window.Friends.feed({ friend: f.id, kind: 'song', limit: 12 }).then((entries) => {
      st.entries = (entries || []).filter(e => e && e.k === 'song'); st.at = Date.now();   // clock-ok: a cache age
      if (box.isConnected) paint(st.entries);
    }).catch((e) => {
      if (box.isConnected && !st.entries) { box.replaceChildren(); box.appendChild(_muEl('p', 'muted mu-small', `Couldn’t load songs: ${typeof netErrorReason === 'function' ? netErrorReason(e) : 'try again'}.`)); }
    }).finally(() => { st.busy = false; });
  }
  return true;
}
function _muDescribe(e, f) {
  const s = _muSongClean(e && e.b);
  if (!s) return null;
  const mine = e.dir === 'out' || e.dir === 'local';
  const names = mine ? (Array.isArray(e.to) ? e.to : e.f ? [e.f] : []).map(id => { try { return window.Friends.get(id); } catch (x) { return null; } }).filter(Boolean).map(_muFName) : [];
  const who = names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  const what = s.t === 'track' ? 'a song' : s.t === 'album' ? 'an album' : s.t === 'playlist' ? 'a playlist' : 'an artist';
  const text = mine ? `You sent ${who || 'a friend'} ${what}` : `${f ? _muFName(f) : 'A friend'} sent you ${what}`;
  return { icon: 'music', text, tone: 'warm', el: musicSongCard(s, { mine, compact: true }) };
}
(function _muWire() {
  if (typeof window === 'undefined') return;
  const F = window.Friends;
  if (!F) return;
  try { F.describe('song', (e, f) => _muDescribe(e, f)); } catch (e) { console.error('[music] describe', e); }
  try { F.registerPanel({ id: 'music', where: 'friend', zone: 'fold', order: 32, title: 'Music', icon: 'music', render: (sec, f) => _muPanel(sec, f) }); } catch (e) { console.error('[music] panel', e); }
  try {
    F.on('song', (m, f) => {
      if (!m || m.revoked || !f || !f.id) return;
      const s = _muSongClean(m.b);
      if (!s) return;
      _mu.box.delete(f.id);
      toast(`${_muFName(f)} sent you ${s.t === 'track' ? 'a song' : musicLabel(s.t).toLowerCase()}: ${s.n}`, { icon: 'music', action: { label: 'Open', run: () => setView('friends:' + f.id) } });
    });
  } catch (e) { console.error('[music] arrivals', e); }
})();
registerCommand({ id: 'send-song', label: 'Send a song to a friend', icon: 'send', group: 'Friends', keywords: 'music spotify share listen suggest track album playlist', run: () => musicSendDialog() });

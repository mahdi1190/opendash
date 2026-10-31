/* ============================================================
   MUSIC, the shared pieces (2.26): cover tiles, links, the search picker, play and queue. Spotify is linked in 56-spotify.js; your
   favourites and top artists on your card are 98-music-1profile.js; sending a friend a song is 98-music-2songs.js.

     MUSIC_TYPES                         [[type, plural, singular]] song / album / playlist / artist
     musicOk(t, id)                      is this a Spotify type and a 22-letter id?
     musicUrl(t, id)                     https://open.spotify.com/<t>/<id> | ''  (an id that passed musicOk only)
     musicOpen(t, id)                    open it in Spotify (a new tab; the Spotify app takes it when it is installed)
     musicCoverEl(t, id, name, {size})   the cover as an element: a plain tile with the first letter, and the picture over it
                                         when this computer may ask for covers (Spotify linked, or the switch in its set-up)
     musicPick({title, types, type, onPick(item), hint})   search dialog; item = {t, id, n, by, sub}
     musicPlay(item) / musicQueue(item)  start it / add the song to the queue on your Spotify (Premium; an app must be open)
   Everything from Spotify or a friend is put on the page with textContent only; an id is checked before it is used in an address.
   ============================================================ */
const MUSIC_TYPES = Object.freeze([['track', 'Songs', 'Song'], ['album', 'Albums', 'Album'], ['playlist', 'Playlists', 'Playlist'], ['artist', 'Artists', 'Artist']]);
const _MU_ID_RE = /^[0-9A-Za-z]{22}$/;

function musicOk(t, id) { return MUSIC_TYPES.some(x => x[0] === t) && _MU_ID_RE.test(String(id || '')); }
function musicUrl(t, id) { return musicOk(t, id) ? `https://open.spotify.com/${t}/${id}` : ''; }
function musicOpen(t, id) { const u = musicUrl(t, id); if (u) window.open(u, '_blank', 'noopener'); }
function musicLabel(t, plural) { const x = MUSIC_TYPES.find(m => m[0] === t); return x ? x[plural ? 1 : 2] : 'Music'; }
function _muEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

/** May this page ask its server for covers? Spotify linked, or the switch is on (the server decides again). */
function musicArtOn() {
  const s = typeof spotifyKnown === 'function' ? spotifyKnown() : null;
  if (!s && typeof spotifyStatus === 'function') spotifyStatus().catch(() => {});   // first look: the covers appear when it answers
  return !!(s && (s.connected || s.art));
}
function _muLoadImg(el) {
  if (!el || el.classList.contains('has-img') || el.querySelector('img')) return;
  const t = el.getAttribute('data-t'), id = el.getAttribute('data-id');
  if (!musicOk(t, id) || !musicArtOn()) return;
  const img = new Image();
  img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.draggable = false;
  img.onload = () => el.classList.add('has-img');
  img.onerror = () => img.remove();
  img.src = `/api/spotify/art?t=${t}&id=${id}`;
  el.appendChild(img);
}
function musicCoverEl(t, id, name, o) {
  o = o || {};
  const el = _muEl('span', 'mu-art mu-art-' + (musicOk(t, id) ? t : 'track') + (o.cls ? ' ' + o.cls : ''));
  el.style.setProperty('--mu-size', (Number(o.size) || 44) + 'px');
  let h = 0; for (const ch of String(id || name || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
  el.style.setProperty('--mu-h', String(h));
  if (musicOk(t, id)) { el.setAttribute('data-t', t); el.setAttribute('data-id', id); }
  el.setAttribute('aria-hidden', 'true');
  el.appendChild(_muEl('span', 'mu-art-i', (Array.from(String(name || '').trim())[0] || '♪').toUpperCase()));
  _muLoadImg(el);
  return el;
}
// the covers appear on the tiles already on screen when Spotify gets linked or the switch is turned on
document.addEventListener('opendash:spotify', () => { for (const el of document.querySelectorAll('.mu-art[data-id]:not(.has-img)')) _muLoadImg(el); });

/* ---------- play and queue ---------- */
async function musicPlay(item) {
  if (!item || !musicOk(item.t, item.id)) return false;
  try { await spotifyApi('/api/spotify/play', { method: 'POST', body: { t: item.t, id: item.id } }); toast(`Playing ${item.n || 'it'} on Spotify`, { kind: 'ok', icon: 'play' }); return true; }
  catch (e) { _muPlayError('play that', e); return false; }
}
async function musicQueue(item) {
  if (!item || item.t !== 'track' || !musicOk('track', item.id)) return false;
  try { await spotifyApi('/api/spotify/queue', { method: 'POST', body: { id: item.id } }); toast(`Added ${item.n || 'the song'} to your queue`, { kind: 'ok', icon: 'list-plus' }); return true; }
  catch (e) { _muPlayError('add that to your queue', e); return false; }
}
function _muPlayError(what, e) {
  if (e && e.code === 'SPOTIFY_AUTH') { toast('Spotify needs you to sign in again.', { kind: 'err', action: { label: 'Sign in', run: () => { if (typeof spotifySetup === 'function') spotifySetup(); } } }); return; }
  toastError(what, e);
}

/* ---------- the search picker ---------- */
/**
 * musicPick({title, types, type, onPick(item), hint}): a search dialog. Type to search; paste a Spotify link to find that one;
 * with nothing typed it offers yours (your playlists, your top artists and songs). Up/Down and Enter choose; Esc closes.
 */
function musicPick(o) {
  o = o || {};
  const types = (Array.isArray(o.types) && o.types.length ? o.types : MUSIC_TYPES.map(x => x[0])).filter(t => MUSIC_TYPES.some(m => m[0] === t));
  const st = { type: types.includes(o.type) ? o.type : types[0], q: '', items: [], offset: 0, next: false, busy: false, err: null, seq: 0, sel: -1, ctl: null, head: '', timer: 0, linked: null };
  let close = () => {};
  const finish = (item) => { close(); if (typeof o.onPick === 'function') { try { o.onPick(item); } catch (e) { console.error('[music] pick', e); } } };

  const root = _muEl('div', 'mu-pick-body');
  const bar = _muEl('div', 'mu-bar');
  const input = _muEl('input', 'control mu-q'); input.type = 'search'; input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = 120;
  input.placeholder = o.hint || 'Search, or paste a Spotify link'; input.setAttribute('aria-label', 'Search Spotify'); input.setAttribute('autofocus', '');
  bar.appendChild(input);
  const tabs = _muEl('div', 'mu-tabs'); tabs.setAttribute('role', 'tablist');
  const status = _muEl('div', 'mu-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const list = _muEl('div', 'mu-list'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Results');
  const more = _muEl('div', 'mu-more');
  root.append(bar);
  if (types.length > 1) root.appendChild(tabs);
  root.append(status, list, more);

  const paintTabs = () => {
    tabs.replaceChildren();
    for (const t of types) {
      const b = _muEl('button', 'mu-tab', musicLabel(t, true)); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', t === st.type ? 'true' : 'false');
      if (t === st.type) b.setAttribute('aria-current', 'true');
      b.onclick = () => { if (t === st.type) return; st.type = t; st.items = []; st.offset = 0; st.next = false; st.err = null; paintTabs(); go(true); input.focus(); };
      tabs.appendChild(b);
    }
  };
  const paintRows = () => {
    list.replaceChildren();
    st.items.forEach((it, i) => {
      const row = _muEl('button', 'mu-row'); row.type = 'button'; row.setAttribute('role', 'option'); row.dataset.i = String(i);
      row.setAttribute('aria-selected', i === st.sel ? 'true' : 'false');
      row.appendChild(musicCoverEl(it.t, it.id, it.n, { size: 44 }));
      const tx = _muEl('span', 'mu-tx');
      tx.appendChild(_muEl('span', 'mu-n', it.n));
      const sub = [it.by, it.sub].filter(Boolean).join(' · ');
      if (sub) tx.appendChild(_muEl('span', 'mu-s', sub));
      row.appendChild(tx);
      row.appendChild(_muEl('span', 'mu-go', o.pickLabel || 'Choose'));
      row.onclick = () => finish(it);
      row.onmouseenter = () => mark(i, false);
      list.appendChild(row);
    });
    more.replaceChildren();
    if (st.next && !st.busy) more.appendChild(uiButton({ label: 'Show more', kind: 'ghost', size: 'sm', run: () => go(false) }));
  };
  const mark = (i, scroll) => {
    st.sel = i;
    for (const r of list.children) r.setAttribute('aria-selected', Number(r.dataset.i) === i ? 'true' : 'false');
    const r = list.children[i]; if (scroll !== false && r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
  };
  const say = (text, tone) => { status.textContent = text || ''; status.className = 'mu-status' + (tone ? ' is-' + tone : ''); };
  const notLinked = () => {
    list.replaceChildren(); more.replaceChildren(); status.textContent = ''; status.className = 'mu-status';
    const em = _muEl('div', 'mu-empty'); em.innerHTML = icon('music', 'i-lg');
    em.appendChild(_muEl('p', null, 'Link your Spotify to search for music here.'));
    em.appendChild(uiButton({ label: 'Set up Spotify', icon: 'arrow-right', kind: 'primary', size: 'sm', run: () => { close(); if (typeof spotifySetup === 'function') spotifySetup(); } }));
    list.appendChild(em);
  };

  async function go(reset) {
    const my = ++st.seq;
    if (st.ctl) { try { st.ctl.abort(); } catch (e) { /* done already */ } }
    if (st.linked === null) {
      say('Checking Spotify…');
      try { const s = await spotifyStatus(); st.linked = !!(s && s.connected && !s.needsAuth); } catch (e) { st.linked = false; }
      if (my !== st.seq) return;
    }
    if (!st.linked) { notLinked(); return; }
    const q = st.q.trim();
    if (reset) { st.offset = 0; st.items = []; st.sel = -1; }
    let path;
    st.head = '';
    if (q) path = `/api/spotify/search?type=${st.type}&q=${encodeURIComponent(q)}&offset=${st.offset}`;
    else if (st.type === 'playlist') { path = `/api/spotify/playlists?offset=${st.offset}`; st.head = 'Your playlists'; }
    else if (st.type === 'artist') { path = '/api/spotify/top?type=artists&range=medium&limit=10'; st.head = 'Your top artists'; }
    else if (st.type === 'track') { path = '/api/spotify/top?type=tracks&range=medium&limit=10'; st.head = 'Your top songs'; }
    else { st.items = []; st.next = false; paintRows(); say('Search for an album, or paste a Spotify link.'); return; }
    st.busy = true; st.err = null; st.ctl = typeof AbortController === 'function' ? new AbortController() : null;
    say(reset || !st.items.length ? 'Searching…' : 'Loading more…');
    try {
      const j = await spotifyApi(path, st.ctl ? { signal: st.ctl.signal } : undefined);
      if (my !== st.seq) return;
      const got = (Array.isArray(j.items) ? j.items : []).filter(x => x && musicOk(x.t, x.id));
      st.items = reset ? got : st.items.concat(got);
      st.next = !!j.next; st.offset = (Number(j.offset) || 0) + 10;
      st.busy = false;
      paintRows();
      if (st.items.length && st.sel < 0) mark(0, false);
      say(st.items.length ? st.head : (q ? `Nothing found for “${q}”.` : 'Nothing here yet.'));
    } catch (e) {
      if (my !== st.seq || (e && e.name === 'AbortError')) return;
      st.busy = false; st.err = e;
      if (e && (e.code === 'SPOTIFY_AUTH' || e.code === 'NOT_CONFIGURED')) { st.linked = false; notLinked(); return; }
      say(typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'Spotify could not answer.', 'err');
      more.replaceChildren(uiButton({ label: 'Try again', icon: 'refresh-cw', kind: 'ghost', size: 'sm', run: () => go(reset) }));
    } finally { if (my === st.seq) st.busy = false; }
  }
  input.addEventListener('input', () => { st.q = input.value; clearTimeout(st.timer); st.timer = setTimeout(() => go(true), 280); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!st.items.length) return; e.preventDefault(); mark(Math.max(0, Math.min(st.items.length - 1, st.sel + (e.key === 'ArrowDown' ? 1 : -1)))); }
    else if (e.key === 'Enter') { e.preventDefault(); clearTimeout(st.timer); const it = st.items[st.sel >= 0 ? st.sel : 0]; if (it) finish(it); else go(true); }
  });
  paintTabs();
  close = openDialog({ title: o.title || 'Find music', size: 'md', fixed: true, height: 640, className: 'mu-pick', resizeKey: 'music-pick', body: (el) => { el.appendChild(root); },
    actions: [{ label: 'Cancel', run: () => {} }], onClose: () => { clearTimeout(st.timer); st.seq++; if (st.ctl) { try { st.ctl.abort(); } catch (e) { /* done */ } } } });
  go(true);
  return close;
}

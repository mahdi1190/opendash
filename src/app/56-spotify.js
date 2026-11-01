/* ============================================================
   SPOTIFY, the link (2.26): Connections card, the one-time set-up and the sign-in. The server half is lib/spotify.mjs and
   server/routes/spotify.mjs: the person makes their own Spotify app (free; its owner needs Premium), pastes the Client ID, and
   signs in. No password and no client secret ever pass through Freeflo; the tokens stay in this computer's secret store.
   What it is for: searching songs, albums, playlists and artists (98-music-0core.js), your favourites and top artists on your card
   (98-music-1profile.js) and sending a friend a song (98-music-2songs.js).

     spotifyApi(path, {method, body, signal})   fetch against /api/spotify/* -> json, or throws Error {code, status}
     spotifyStatus(force)                       Promise<status>  (cached for a while)
     spotifyKnown()                             the last status we saw, or null (never asks)
     spotifyLinked()                            true when signed in and nothing needs you
     spotifyConnectionCard(all)                 the Connections card
     spotifySetup()                             the set-up drawer
   Names, titles and messages from Spotify or a friend are put on the page with textContent only.
   ============================================================ */
const _spot = { status: null, at: 0, loading: null, busy: false, watch: null };

async function spotifyApi(path, opts) { return _srcApi(path, opts); }
/** The last status we saw (the Connections list carries one too), or null. */
function spotifyKnown() {
  if (_spot.status) return _spot.status;
  try { const all = typeof Connections !== 'undefined' && Connections.all ? Connections.all() : null; if (all && all.spotify) return all.spotify; } catch (e) { /* not loaded yet */ }
  return null;
}
function spotifyLinked() { const s = spotifyKnown(); return !!(s && s.connected && !s.needsAuth); }
function spotifyStatus(force) {
  if (_spot.loading) return _spot.loading;
  if (!force && _spot.status && Date.now() - _spot.at < 30000) return Promise.resolve(_spot.status);   // clock-ok: a cache age
  _spot.loading = spotifyApi('/api/spotify/status').then((s) => {
    const was = _spot.status;
    _spot.status = s; _spot.at = Date.now();   // clock-ok: a cache age
    if (!was || was.connected !== s.connected || was.art !== s.art) { try { document.dispatchEvent(new CustomEvent('opendash:spotify', { detail: { status: s } })); } catch (e) { /* old browser */ } }
    return s;
  }).finally(() => { _spot.loading = null; });
  return _spot.loading;
}

/** Spotify's card on the Connections page: status first, one sentence, one action; the details sit under More. */
function spotifyConnectionCard(all) {
  const s = (all && all.spotify) || spotifyKnown() || {};
  if (all && all.spotify) { _spot.status = all.spotify; _spot.at = Date.now(); }   // clock-ok: a cache age
  const card = _connEl('section', 'card conn-card spotify-card');
  card.dataset.conn = 'spotify';
  const head = _connEl('div', 'conn-head');
  const mark = _connEl('span', 'conn-ic'); mark.innerHTML = icon('music'); mark.setAttribute('aria-hidden', 'true');
  const names = _connEl('div', 'conn-titles');
  names.append(_connEl('div', 'conn-name', 'Spotify'), _connEl('div', 'conn-sub', 'Songs for friends · top artists · read and play'));
  head.append(mark, names); card.appendChild(head);
  card.appendChild(s.needsAuth ? setStatusLine('warn', 'Needs you', 'Sign in again')
    : s.error ? setStatusLine('warn', 'Needs you', typeof s.error === 'string' ? s.error : 'Open set-up to reconnect')
      : s.connected ? setStatusLine('ok', 'Connected', s.name ? 'Signed in as ' + s.name : '')
        : s.configured ? setStatusLine('idle', 'Ready to connect')
          : setStatusLine('off', 'Not set up'));
  card.appendChild(_connEl('p', 'conn-text', s.connected ? 'Search for music, show your favourites and top artists on your card, and send friends songs.' : 'Link your Spotify to search music, show your top artists on your card and send friends songs.'));
  const row = _connEl('div', 'set-action'); card.appendChild(row);
  if (s.connected && !s.needsAuth) row.appendChild(uiButton({ label: 'Pick a song for a friend', icon: 'send', kind: 'primary', size: 'sm', run: () => { if (typeof musicSendDialog === 'function') musicSendDialog(); } }));
  else row.appendChild(uiButton({ label: s.configured ? (s.needsAuth ? 'Sign in again' : 'Sign in with Spotify') : 'Set up Spotify', icon: 'arrow-right', kind: s.configured ? 'primary' : 'secondary', size: 'sm', run: () => (s.configured ? spotifySignIn() : spotifySetup()) }));
  setFold(card, 'conn-spotify-more', 'More', ({ body }) => {
    body.appendChild(_connEl('p', 'conn-note', 'Freeflo asks Spotify for what you search, your top artists and your playlists, and can start a song on a Spotify app you have open (Premium). It never changes your library or playlists.'));
    body.appendChild(_connEl('p', 'conn-note', 'Friends only get the name and Spotify id of what you send. A friend does not need Spotify linked to open it.'));
    const acts = _connEl('div', 'assistant-actions');
    acts.appendChild(uiButton({ label: s.configured ? 'Manage Spotify' : 'Set-up steps', icon: 'settings', kind: 'ghost', size: 'sm', run: () => spotifySetup() }));
    body.appendChild(acts);
  });
  return card;
}

function _spotStopWatch() { if (_spot.watch) _spot.watch(); }
/** Open Spotify's sign-in in a new tab; when you come back to this one, look again. */
function spotifySignIn() {
  _spotStopWatch();
  let departed = false, stopped = false, checking = false;
  const leave = () => { departed = true; };
  const cleanup = () => {
    stopped = true;
    window.removeEventListener('blur', leave); window.removeEventListener('focus', returned); document.removeEventListener('visibilitychange', visibility);
    if (_spot.watch === cleanup) _spot.watch = null;
  };
  const returned = async () => {
    if (stopped || !departed || checking || document.visibilityState === 'hidden') return;
    departed = false; checking = true;
    try {
      const s = await spotifyStatus(true);
      try { await connRefresh({ force: true }); } catch (e) { /* the list catches up on its own */ }
      if (s.connected || !s.configured) { cleanup(); if (s.connected) toast(s.name ? `Spotify connected as ${s.name}` : 'Spotify connected', { dismiss: true, kind: 'ok', icon: 'music' }); }
      if (state.view === 'connections' || state.view === 'profile') renderMain();
    } catch (e) { /* try again when the tab is back */ } finally { checking = false; }
  };
  const visibility = () => { if (document.visibilityState === 'hidden') leave(); else return returned(); };
  _spot.watch = cleanup;
  window.addEventListener('blur', leave); window.addEventListener('focus', returned); document.addEventListener('visibilitychange', visibility);
  let popup;
  try {
    // An empty tab first so a blocked pop-up can be told from an allowed one; its opener is dropped before it goes to Spotify.
    popup = window.open('about:blank', '_blank');
    if (popup) { popup.opener = null; popup.location.replace(location.origin + '/api/spotify/connect'); return; }
  } catch (e) { if (popup) try { popup.close(); } catch (_) { /* already closed */ } }
  cleanup();
  toast('The sign-in tab didn’t open. You can sign in here instead', { kind: 'info', timeout: 8000, action: { label: 'Sign in here', run: () => location.assign('/api/spotify/connect') } });
}

/** The set-up: the steps, the Client ID, the sign-in and the cover-art switch. */
function spotifySetup() {
  let alive = true;
  openDrawer({ title: 'Spotify', width: 580, onClose: () => { alive = false; }, body: async (el, close) => {
    el.appendChild(_connEl('p', 'conn-text', 'Link your own Spotify to search for music, show your favourites and top artists on your card, and send friends songs to listen to.'));
    let s;
    try { s = await spotifyStatus(true); }
    catch (e) {
      if (!alive) return;
      const p = _connEl('p', 'conn-note', 'The Spotify status did not load: ' + netErrorMessage(e) + ' ');
      p.appendChild(uiButton({ label: 'Try again', icon: 'refresh-cw', kind: 'ghost', size: 'sm', run: () => { close(); spotifySetup(); } }));
      el.appendChild(p);
      return;
    }
    if (!alive) return;
    el.appendChild(_connEl('p', 'callout info conn-msg spotify-msg', 'Spotify lets an app made in Development Mode work only while its owner has Premium, and for up to 5 people you add. Friends you send songs to do not need any of this: they open the link in Spotify.'));
    if (s.error) { const er = _connEl('p', 'conn-note', typeof s.error === 'string' ? s.error : 'Please sign in again.'); er.setAttribute('role', 'alert'); el.appendChild(er); }
    if (s.configured) {
      const actions = _connEl('div', 'assistant-actions');
      actions.appendChild(uiButton({ label: s.connected ? 'Sign in again' : 'Sign in with Spotify', icon: 'log-in', kind: s.connected ? 'secondary' : 'primary', size: 'sm', run: () => spotifySignIn() }));
      if (s.connected || s.needsAuth) actions.appendChild(uiButton({ label: 'Disconnect Spotify', icon: 'unplug', kind: 'secondary', size: 'sm', run: async (e, b) => {
        b.disabled = true;
        try { await spotifyApi('/api/spotify/disconnect', { method: 'POST', body: {} }); _spotStopWatch(); await spotifyStatus(true); await connRefresh({ force: true }); close(); toast('Spotify disconnected', { kind: 'ok' }); if (state.view === 'connections' || state.view === 'profile') renderMain(); }
        catch (err) { if (alive) b.disabled = false; toastError('disconnect Spotify', err); }
      } }));
      el.appendChild(actions);
      if (s.connected) el.appendChild(_connEl('p', 'conn-note', s.name ? `Signed in as ${s.name}.` : 'Signed in.'));
      else el.appendChild(_connEl('p', 'conn-note', 'A new tab opens on Spotify. Allow access there, then come back to this one.'));
    }
    if (s.configured) {
      // Where can it play? (an open Spotify app only counts once Spotify can see it)
      if (s.connected) {
        const dev = _connEl('p', 'conn-note spotify-dev'); dev.setAttribute('role', 'status'); dev.setAttribute('aria-live', 'polite');
        const btn = uiButton({ label: 'Check where it can play', icon: 'refresh-cw', kind: 'ghost', size: 'sm', run: async (e, b) => {
          b.disabled = true; dev.textContent = 'Looking…';
          try {
            const j = await spotifyApi('/api/spotify/devices');
            const list = Array.isArray(j.devices) ? j.devices : [];
            dev.textContent = list.length ? 'Spotify can see: ' + list.map(d => `${d.name}${d.type ? ' (' + d.type.toLowerCase() + ')' : ''}${d.active ? ', playing now' : ''}`).join('; ') + '.'
              : 'Spotify can’t see an open Spotify app right now. Open it on your phone or computer and play anything for a second.';
          } catch (err) { dev.textContent = netErrorMessage(err, 'Spotify didn’t answer. Try again in a moment.'); }
          if (alive) b.disabled = false;
        } });
        el.append(dev, btn);
      }
      // Your app can serve 5 people (you and 4 more): a friend pastes your Client ID instead of making an app of their own
      const share = _connEl('details', 'spotify-share');
      share.appendChild(_connEl('summary', null, 'Let friends use your Spotify app (up to 4)'));
      share.appendChild(_connEl('p', 'conn-note', 'Spotify lets one app serve 5 people: you and 4 more. A friend does not need to make an app. They open Connections > Spotify > Set up Spotify, paste this Client ID and sign in. You then add them under User management in the dashboard (their name and the email of their Spotify account). The ID is not a secret, but only people you add can use it. Friends who only receive songs need none of this.'));
      share.appendChild(_connCode(s.clientId || '', 'Copy Client ID', 'Client ID'));
      el.appendChild(share);
    }
    const details = _connEl('details', 'spotify-setup'); details.open = !s.configured;
    details.appendChild(_connEl('summary', null, s.configured ? 'Change the Client ID' : 'One-time Spotify set-up (about two minutes)'));
    const link = uiButton({ label: 'Open the Spotify developer dashboard', icon: 'external-link', kind: 'ghost', size: 'sm', run: () => window.open('https://developer.spotify.com/dashboard', '_blank', 'noopener') });
    const redirect = s.redirectUri || 'http://127.0.0.1:' + (location.port || '4173') + '/api/spotify/callback';
    details.appendChild(_connSteps([
      ['Sign in at developer.spotify.com/dashboard with your Spotify account and choose Create app.', link],
      ['Give it any name and description. Tick Web API. For the redirect URI, paste this address exactly (Spotify does not accept “localhost”):', _connCode(redirect, 'Copy address', 'address')],
      'Save the app, open its Settings and copy the Client ID. It is not a secret, and you do not need the client secret.',
      'Paste the Client ID below and save. Then choose Sign in with Spotify. (Using a friend’s app? Paste their Client ID, and ask them to add your Spotify email under User management.)',
    ]));
    const field = _connEl('label', 'field spotify-id');
    field.appendChild(_connEl('span', 'field-label', 'Client ID'));
    const input = _connEl('input', 'control'); input.type = 'text'; input.maxLength = 64; input.autocomplete = 'off'; input.spellcheck = false;
    input.placeholder = '32 letters and numbers'; if (s.clientId) input.value = s.clientId;
    field.appendChild(input); details.appendChild(field);
    const feedback = _connEl('p', 'conn-note'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); details.appendChild(feedback);
    const save = uiButton({ label: 'Save Client ID', icon: 'check', kind: 'primary', size: 'sm', run: async (e, b) => {
      const v = input.value.trim();
      if (!/^[0-9a-fA-F]{32}$/.test(v)) { feedback.textContent = 'A Client ID is 32 letters and numbers. Copy it from your app’s Settings in the dashboard.'; input.focus(); return; }
      b.disabled = true; input.disabled = true; feedback.textContent = 'Saving…';
      try {
        await spotifyApi('/api/spotify/configure', { method: 'PUT', body: { clientId: v } });
        _spotStopWatch(); await spotifyStatus(true); await connRefresh({ force: true });
        if (alive) { close(); spotifySetup(); }
        toast('Client ID saved. Sign in with Spotify to finish', { kind: 'ok' });
      } catch (err) { if (alive) { feedback.textContent = netErrorMessage(err); b.disabled = false; input.disabled = false; } }
    } });
    details.appendChild(save);
    if (s.configured) {
      details.appendChild(uiButton({ label: 'Remove the Spotify set-up', icon: 'trash-2', kind: 'ghost', size: 'sm', run: async (e, b) => {
        if (!(await confirmDialog({ title: 'Remove the Spotify set-up?', text: 'This signs you out of Spotify here and forgets the Client ID. Songs already on your card and in your feed stay.', confirmLabel: 'Remove', danger: true }))) return;
        b.disabled = true;
        try { await spotifyApi('/api/spotify/configure', { method: 'PUT', body: { clientId: '' } }); _spotStopWatch(); await spotifyStatus(true); await connRefresh({ force: true }); close(); toast('Spotify set-up removed', { kind: 'ok' }); if (state.view === 'connections' || state.view === 'profile') renderMain(); }
        catch (err) { if (alive) b.disabled = false; toastError('remove the Spotify set-up', err); }
      } }));
    }
    el.appendChild(details);
    // Covers: with Spotify linked they are on. Without it, a friend's song shows a plain tile unless you allow the picture to be asked for.
    const art = _connEl('div', 'spotify-art');
    const sw = _settingsSwitch(!!(s.art || s.connected), 'Show cover art for songs friends send', async (on) => {
      try { await spotifyApi('/api/spotify/configure', { method: 'PUT', body: { art: on } }); sw.setAttribute('aria-checked', on ? 'true' : 'false'); await spotifyStatus(true); try { document.dispatchEvent(new CustomEvent('opendash:spotify', { detail: { status: _spot.status } })); } catch (e) { /* old browser */ } }
      catch (err) { toastError('change that', err); }
    }, !!s.connected);   // linked: covers are on, nothing to choose
    art.append(_connEl('div', 'spotify-art-t', 'Show cover art for songs friends send'), sw,
      _connEl('p', 'conn-note', 'Off, a friend’s song shows a plain tile and the link still works. On, Freeflo asks Spotify for the cover by the song’s id (nothing else leaves this computer) and keeps it here. While Spotify is linked, covers are on.'));
    el.appendChild(art);
  } });
}

registerCommand({ id: 'connect-spotify', label: 'Connect Spotify', icon: 'music', group: 'Connections', keywords: 'music songs playlist artists friends listen', run: () => { setView('connections'); spotifySetup(); } });

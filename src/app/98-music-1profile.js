/* ============================================================
   MUSIC on your profile card (2.26): up to three favourites (a song, an album, a playlist) and your top artists from Spotify, as the
   optional profile field 'music' (lib/friends/songs.mjs is its server half). Nothing shows until you choose something; the top
   artists are yours to switch on, and refresh themselves about once a day while Spotify is linked.

   state.profile.music = {f: {track?, album?, playlist?}, a: [{id, n}], show: bool, r: 'short'|'medium'|'long', at: ms}
     f.<type> = {t, id, n, by?}   a Spotify item you chose (the id is checked before it is ever used in an address)
   What friends get (wire): {f: [{t, id, n, by?}] (3), a: [{id, n}] (5), r}. A friend's value is cleaned again here with
   profileText, and the card draws it with textContent: a name from a friend is never markup.

     musicProfileCard(changed)     the card on the Profile page (Settings style)
     musicRefreshTop(force)        read your top artists again (only when the switch is on and Spotify is linked)
   ============================================================ */
const _MU_SLOTS = Object.freeze([['track', 'Favourite song'], ['album', 'Favourite album'], ['playlist', 'Favourite playlist']]);
const _MU_RANGES = Object.freeze([['short', '4 weeks'], ['medium', '6 months'], ['long', 'All time']]);
const _MU_TOP_EVERY = 20 * 3600 * 1000;

function _muText(s, n) { return typeof profileText === 'function' ? profileText(s, n) : String(s || '').replace(/\s+/g, ' ').trim().slice(0, n); }
function _muSlotOk(t, x) { return !!(x && typeof x === 'object' && x.t === t && musicOk(t, x.id) && _muText(x.n, 80)); }
/** Your music settings, cleaned (whatever is in the state, from any version or device). */
function musicMine() {
  const p = typeof _pfState === 'function' ? _pfState() : null;
  const raw = p && p.music && typeof p.music === 'object' ? p.music : {};
  const f = {};
  for (const [t] of _MU_SLOTS) if (raw.f && _muSlotOk(t, raw.f[t])) f[t] = { t, id: raw.f[t].id, n: _muText(raw.f[t].n, 80), by: _muText(raw.f[t].by, 60) };
  const a = (Array.isArray(raw.a) ? raw.a : []).filter(x => x && musicOk('artist', x.id) && _muText(x.n, 50)).slice(0, 5).map(x => ({ id: x.id, n: _muText(x.n, 50) }));
  return { f, a, show: raw.show === true, r: _MU_RANGES.some(x => x[0] === raw.r) ? raw.r : 'medium', at: Number(raw.at) || 0 };
}
function _muSave(patch) {
  const next = Object.assign({}, musicMine(), patch);
  if (typeof profileSet === 'function') profileSet({ music: next });
  return next;
}
/** What friends get from your music settings (profile field 'music'), or undefined for nothing. */
function _muWire(sp) {
  const m = sp && sp.music && typeof sp.music === 'object' ? sp.music : null;
  if (!m) return undefined;
  const c = musicMine();
  const f = _MU_SLOTS.map(([t]) => c.f[t]).filter(Boolean).map(x => ({ t: x.t, id: x.id, n: x.n, ...(x.by ? { by: x.by } : {}) }));
  const a = c.show ? c.a.map(x => ({ id: x.id, n: x.n })) : [];
  if (!f.length && !a.length) return undefined;
  return { ...(f.length ? { f } : {}), ...(a.length ? { a, r: c.r } : {}) };
}
/** A music value from a friend (or from _muWire), cleaned for drawing: {f, a, r} | null. */
function _muSanitize(v) {
  if (!v || typeof v !== 'object') return null;
  const f = (Array.isArray(v.f) ? v.f : []).filter(x => x && typeof x === 'object' && musicOk(x.t, x.id)).slice(0, 3)
    .map(x => ({ t: x.t, id: x.id, n: _muText(x.n, 80), by: _muText(x.by, 60) })).filter(x => x.n);
  const a = (Array.isArray(v.a) ? v.a : []).filter(x => x && typeof x === 'object' && musicOk('artist', x.id)).slice(0, 5)
    .map(x => ({ id: x.id, n: _muText(x.n, 50) })).filter(x => x.n);
  return f.length || a.length ? { f, a, r: _MU_RANGES.some(x => x[0] === v.r) ? v.r : '' } : null;
}

/* ---------- on the card ---------- */
function _muCard(card, view, o) {
  const m = view && view.profile && view.profile.ext ? view.profile.ext.music : null;
  if (!m || !card) return;
  const compact = !!(o && o.compact);
  const wrap = _muEl('div', 'pf-card-music' + (compact ? ' is-compact' : ''));
  wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 'Music');
  for (const x of m.f.slice(0, compact ? 2 : 3)) {
    const b = _muEl('button', 'mu-fav'); b.type = 'button';
    b.setAttribute('data-tip', `${musicLabel(x.t)}: ${x.n}${x.by ? ' · ' + x.by : ''}. Open in Spotify`);
    b.appendChild(musicCoverEl(x.t, x.id, x.n, { size: compact ? 34 : 40 }));
    const tx = _muEl('span', 'mu-tx');
    tx.appendChild(_muEl('span', 'mu-n', x.n));
    tx.appendChild(_muEl('span', 'mu-s', x.by || musicLabel(x.t)));
    b.appendChild(tx);
    b.onclick = () => musicOpen(x.t, x.id);
    wrap.appendChild(b);
  }
  if (m.a.length) {
    const row = _muEl('div', 'mu-artists');
    row.appendChild(_muEl('span', 'mu-artists-l', m.r === 'short' ? 'Lately' : m.r === 'long' ? 'All-time top artists' : 'Top artists'));
    const faces = _muEl('div', 'mu-artist-faces');
    const shown = m.a.slice(0, compact ? 3 : 5);
    for (const x of shown) {
      const b = _muEl('button', 'mu-artist'); b.type = 'button';
      b.setAttribute('data-tip', `${x.n}. Open in Spotify`); b.setAttribute('aria-label', `${x.n}, open in Spotify`);
      b.appendChild(musicCoverEl('artist', x.id, x.n, { size: compact ? 28 : 38 }));
      b.onclick = () => musicOpen('artist', x.id);
      faces.appendChild(b);
    }
    row.appendChild(faces);
    if (!compact) row.appendChild(_muEl('span', 'mu-artist-names', shown.map(x => x.n).join(', ')));
    wrap.appendChild(row);
  }
  card.appendChild(wrap);
}

/* ---------- your top artists ---------- */
let _muTopBusy = null;
/** Read your top artists from Spotify and keep them in your music settings. false when there was nothing to do. */
function musicRefreshTop(force) {
  const m = musicMine();
  if (!m.show || !spotifyLinked()) return Promise.resolve(false);
  if (!force && m.at && Date.now() - m.at < _MU_TOP_EVERY) return Promise.resolve(false);   // clock-ok: a cache age
  if (_muTopBusy) return _muTopBusy;
  _muTopBusy = spotifyApi(`/api/spotify/top?type=artists&range=${m.r}&limit=5`).then((j) => {
    const a = (Array.isArray(j.items) ? j.items : []).filter(x => x && musicOk('artist', x.id)).slice(0, 5).map(x => ({ id: x.id, n: _muText(x.n, 50) })).filter(x => x.n);
    const same = JSON.stringify(a) === JSON.stringify(m.a);
    _muSave({ a, at: Date.now() });   // clock-ok: when it was read
    return !same;
  }).finally(() => { _muTopBusy = null; });
  return _muTopBusy;
}

/* ---------- the Profile page's card ---------- */
function musicProfileCard(changed) {
  const { card, body } = _settingsCard('Music', 'What you love listening to. Friends see it on your card.');
  const done = () => { if (typeof changed === 'function') changed(); };
  const paint = () => {
    body.replaceChildren();
    const m = musicMine();
    for (const [t, label] of _MU_SLOTS) {
      const cur = m.f[t];
      const ctl = _muEl('div', 'mu-slot');
      const choose = (text) => uiButton({ label: text, icon: 'search', kind: cur ? 'ghost' : 'secondary', size: 'sm', run: () => musicPick({
        title: `Choose your ${label.toLowerCase()}`, types: [t], pickLabel: 'Pick',
        onPick: (it) => { const f = Object.assign({}, musicMine().f, { [t]: { t, id: it.id, n: it.n, by: it.by || '' } }); _muSave({ f }); paint(); done(); },
      }) });
      if (cur) {
        const chip = _muEl('span', 'mu-chip');
        chip.appendChild(musicCoverEl(cur.t, cur.id, cur.n, { size: 30 }));
        const tx = _muEl('span', 'mu-tx'); tx.appendChild(_muEl('span', 'mu-n', cur.n)); if (cur.by) tx.appendChild(_muEl('span', 'mu-s', cur.by));
        chip.appendChild(tx);
        ctl.append(chip, choose('Change'), uiButton({ label: 'Remove', icon: 'x', kind: 'ghost', size: 'sm', run: () => { const f = Object.assign({}, musicMine().f); delete f[t]; _muSave({ f }); paint(); done(); } }));
      } else ctl.appendChild(choose('Choose…'));
      body.appendChild(_settingsRow(label, '', ctl));
    }
    // top artists
    const linked = spotifyLinked();
    const sw = _settingsSwitch(m.show, 'Show my top artists', async (on) => {
      if (on && !linked) { toast('Link Spotify first, then switch this on.', { icon: 'music', action: { label: 'Set up', run: () => spotifySetup() } }); return; }
      _muSave({ show: on });
      paint(); done();
      if (on) { try { await musicRefreshTop(true); } catch (e) { toastError('read your top artists', e); } paint(); done(); }
    });
    const topCtl = _muEl('div', 'mu-top');
    topCtl.appendChild(sw);
    body.appendChild(_settingsRow('Show my top artists', linked ? 'The five artists you play most, from Spotify. They update about once a day.' : 'Needs Spotify linked in Connections.', topCtl));
    if (m.show) {
      body.appendChild(_settingsRow('Listening over', '', _settingsSeg(_MU_RANGES.map(([k, l]) => [k, l]), m.r, async (k) => {
        if (k === m.r) return;
        _muSave({ r: k }); paint(); done();
        try { await musicRefreshTop(true); } catch (e) { toastError('read your top artists', e); }
        paint(); done();
      })));
      const list = _muEl('div', 'mu-top-list');
      if (m.a.length) for (const x of m.a) { const c = _muEl('span', 'mu-chip'); c.appendChild(musicCoverEl('artist', x.id, x.n, { size: 26 })); c.appendChild(_muEl('span', 'mu-n', x.n)); list.appendChild(c); }
      else list.appendChild(_muEl('span', 'muted', linked ? 'Reading your top artists…' : 'Link Spotify to see them here.'));
      const refresh = uiButton({ label: 'Update now', icon: 'refresh-cw', kind: 'ghost', size: 'sm', run: async (e, b) => { b.disabled = true; try { await musicRefreshTop(true); toast('Top artists updated', { kind: 'ok' }); } catch (err) { toastError('read your top artists', err); } paint(); done(); } });
      refresh.disabled = !linked;
      body.appendChild(_settingsRow('Right now', '', (() => { const w = _muEl('div', 'mu-top-now'); w.append(list, refresh); return w; })()));
    }
    if (!linked) body.appendChild(_settingsRow('Spotify', 'Link it to search music and show your top artists.', uiButton({ label: 'Set up Spotify', icon: 'arrow-right', kind: 'secondary', size: 'sm', run: () => spotifySetup() })));
  };
  paint();
  document.addEventListener('opendash:spotify', () => { if (card.isConnected) paint(); });
  return card;
}

// profileExtend is a function declaration in 97-profile-1core.js, which has run by now (this file sorts after it)
if (typeof profileExtend === 'function') {
  try { profileExtend({ key: 'music', order: 30, wire: (sp) => _muWire(sp), sanitize: (v) => _muSanitize(v), card: (el, view, o) => _muCard(el, view, o) }); } catch (e) { /* the card does fine without it */ }
}
// the artists follow your listening: look again soon after start when the switch is on (no request at all while it is off)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(() => {
    try { if (!musicMine().show) return; spotifyStatus().then(() => musicRefreshTop(false)).catch(() => {}); } catch (e) { /* never in the way */ }
  }, 12000), { once: true });
}

/* ============================================================
   LISTENING TO (2.28): "Listening to <song>" on a friend's card while they play something, like a status line. It is asked for, never
   broadcast: opening a friend's card sends them music:ask (lib/friends/songs.mjs), and their Freeflo answers with music:now, only if they
   turned "Show what I'm listening to" on (Profile > Music), Spotify is linked there and a song is playing (never a podcast, a local file or a
   Spotify private session). A friend who says nothing in their profile (music.l) is never asked.

   The relay hands each friend a small daily allowance of posts, so this side keeps its own budget: one ask per friend every 2.5 minutes at
   most, 24 a day, and only while that card is on screen. An answer says how far into the song they were, so the line keeps counting by itself
   and goes away when the song would have ended.

     musicNowEl(friendId, {along})  the line (an element that repaints itself); asks if the budget allows. along: a click plays the song on your own Spotify (a live garden's Listen along). 'me' is your own card: it reads your own
                                    Spotify (GET /api/spotify/now) every 15 seconds while the card is on screen, so you see what friends would see
     musicNowReceive(friendId, b)   a music:now body from a friend (Friends.on does this); cleaned here
     musicListenSet(on)             your switch: tells this computer's server whether to answer (and keeps music.l in your profile)
   Names come from a friend: textContent only, after profileText; the link is made from an id that passed musicOk.
   ============================================================ */
const _mun = { now: new Map(), els: new Set(), timer: 0 };
const _MUN_GAP_MS = 150000, _MUN_DAY = 24, _MUN_KEY = 'od-mu-asks';

/** What a friend is playing now, while it would still be playing: {id, n, by, pos, dur, got} | null. */
function _munEntry(friendId) {
  const e = _mun.now.get(friendId);
  if (!e || !e.on) return null;
  const left = e.dur > 0 ? (e.dur - e.pos) * 1000 - (Date.now() - e.got) : 90000 - (Date.now() - e.got);   // clock-ok: a song's remaining time
  return left > -8000 ? e : null;
}
function musicNowReceive(friendId, b) {
  if (!/^[0-9a-f]{16}$/.test(String(friendId || ''))) return;
  _munSet(friendId, b);
}
function _munSet(friendId, b) {
  const got = Date.now();   // clock-ok: when it arrived
  const on = !!(b && b.on === true && musicOk('track', b.id));
  const n = on ? _muText(b.n, 100) : '';
  if (on && n) {
    const num = (v, max) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.round(Number(v)))) : 0);
    _mun.now.set(friendId, { on: true, id: b.id, n, by: _muText(b.by, 100), pos: num(b.pos, 86400), dur: num(b.dur, 86400), got });
  } else _mun.now.set(friendId, { on: false, got });
  if (_mun.now.size > 200) _mun.now.delete(_mun.now.keys().next().value);
  _munPaintAll(friendId);
}

/** Your own card: what you are playing, from your own Spotify (the same answer a friend would be given). */
let _munMineAt = 0;
function _munMine() {
  const t = Date.now();   // clock-ok: a rate window
  if (t - _munMineAt < 12000 || !(typeof spotifyLinked === 'function' && spotifyLinked())) return;
  _munMineAt = t;
  spotifyApi('/api/spotify/now').then((j) => { if (j && j.now) _munSet('me', j.now); }).catch(() => { /* Spotify busy: the line stays as it was */ });
}

/** May we ask this friend now? One ask every 2.5 minutes and 24 a day each (kept in this browser; a private window just asks once per page). */
function _munBudget(friendId) {
  const day = new Date().toISOString().slice(0, 10), t = Date.now();   // clock-ok: a budget window
  let all = {};
  try { all = JSON.parse(localStorage.getItem(_MUN_KEY) || '{}') || {}; } catch (e) { all = {}; }
  const row = all[friendId] && all[friendId].d === day ? all[friendId] : { d: day, n: 0, t: 0 };
  if (t - row.t < _MUN_GAP_MS || row.n >= _MUN_DAY) return false;
  all[friendId] = { d: day, n: row.n + 1, t };
  for (const k of Object.keys(all)) if (all[k].d !== day) delete all[k];
  try { localStorage.setItem(_MUN_KEY, JSON.stringify(all)); } catch (e) { /* private window: the gap in memory still holds */ }
  return true;
}
const _munLast = new Map();
function musicAskNow(friendId) {
  const F = typeof window !== 'undefined' ? window.Friends : null;
  if (!F || typeof F.send !== 'function' || !/^[0-9a-f]{16}$/.test(String(friendId || ''))) return false;
  const t = Date.now();   // clock-ok: a rate window
  if (t - (_munLast.get(friendId) || 0) < _MUN_GAP_MS || !_munBudget(friendId)) return false;
  _munLast.set(friendId, t);
  F.send(friendId, 'music:ask', { v: 1 }).catch(() => { /* offline or off: no line, nothing to say */ });
  return true;
}

/* ---------- the line ---------- */
function _munPaint(el) {
  const id = el.getAttribute('data-f'), e = _munEntry(id);
  el.hidden = !e;
  if (!e) { el.removeAttribute('data-song'); return; }
  if (el.getAttribute('data-song') !== e.id + ':' + e.got) {
    el.setAttribute('data-song', e.id + ':' + e.got);
    el.replaceChildren();
    const eq = _muEl('span', 'mu-eq'); eq.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) eq.appendChild(_muEl('i'));
    const tx = _muEl('span', 'mu-tx');
    tx.appendChild(_muEl('span', 'mu-now-k', el.hasAttribute('data-along') ? 'Listen along' : 'Listening to'));
    tx.appendChild(_muEl('span', 'mu-n', e.n));
    if (e.by) tx.appendChild(_muEl('span', 'mu-s', e.by));
    el.append(eq, tx);
    if (e.dur > 0) { const bar = _muEl('span', 'mu-now-bar'); bar.setAttribute('aria-hidden', 'true'); bar.appendChild(_muEl('i')); el.appendChild(bar); }
    const along = el.hasAttribute('data-along');
    el.setAttribute('data-tip', along ? `${e.n}${e.by ? ' · ' + e.by : ''}. Play it on your Spotify` : `${id === 'me' ? 'What friends see right now: ' : ''}${e.n}${e.by ? ' · ' + e.by : ''}. Open in Spotify`);
    el.setAttribute('aria-label', along ? `Listen along to ${e.n}${e.by ? ' by ' + e.by : ''}: play it on your Spotify` : `Listening to ${e.n}${e.by ? ' by ' + e.by : ''}. Open in Spotify`);
    el.onclick = along ? () => { musicPlay({ t: 'track', id: e.id, n: e.n }); } : () => musicOpen('track', e.id);
  }
  const fill = el.querySelector('.mu-now-bar i');
  if (fill && e.dur > 0) fill.style.width = Math.max(0, Math.min(100, ((e.pos * 1000 + (Date.now() - e.got)) / (e.dur * 1000)) * 100)).toFixed(1) + '%';   // clock-ok: progress
}
function _munPaintAll(friendId) { for (const el of _mun.els) if (el.isConnected && (!friendId || el.getAttribute('data-f') === friendId)) _munPaint(el); }
function _munTick() {
  for (const el of [..._mun.els]) {
    if (!el.isConnected) { _mun.els.delete(el); continue; }
    _munPaint(el);
    const id = el.getAttribute('data-f');
    if (id === 'me') _munMine();   // your own card keeps up with your own player
    else if (!_munEntry(id)) musicAskNow(id);   // the song ended (or there was no answer): ask again if the budget allows
  }
  if (!_mun.els.size) { clearInterval(_mun.timer); _mun.timer = 0; }
}
/** The "Listening to" line for one friend's card (hidden until they answer). */
function musicNowEl(friendId, o) {
  const el = _muEl('button', 'mu-now'); el.type = 'button'; el.hidden = true; el.setAttribute('data-f', friendId);
  if (o && o.along) el.setAttribute('data-along', '1');
  _mun.els.add(el);
  if (!_mun.timer) _mun.timer = setInterval(_munTick, 5000);
  _munPaint(el);
  if (friendId === 'me') setTimeout(() => { if (el.isConnected) _munMine(); }, 200);
  else if (!_munEntry(friendId)) setTimeout(() => { if (el.isConnected) musicAskNow(friendId); }, 400);   // after the card is on the page
  return el;
}

/* ---------- your switch ---------- */
/** Turn answering on or off: this computer's server (it does the answering) and your profile's music.l (so friends know to ask). */
async function musicListenSet(on) {
  try { await spotifyApi('/api/spotify/configure', { method: 'PUT', body: { listen: !!on } }); }
  catch (e) { toastError('change that', e); return false; }
  if (typeof _muSave === 'function') _muSave({ l: !!on });
  toast(on ? 'Friends who open your card can now see the song you are playing.' : 'Friends no longer see what you are listening to.', { kind: 'ok', icon: 'music' });
  return true;
}

(function _munWire() {
  if (typeof window === 'undefined') return;
  const F = window.Friends;
  if (F) { try { F.on('music:now', (m, f) => { if (m && !m.revoked && f && f.id) musicNowReceive(f.id, m.b); }); } catch (e) { console.error('[music] listening', e); } }
  // this computer's server answers only if it knows: keep it in step with your profile after a start (or a sync from another computer)
  window.addEventListener('load', () => setTimeout(() => {
    try {
      spotifyStatus().then((s) => {
        if (!s || !s.connected) return null;
        const want = musicMine().l === true;
        if (want !== !!s.listen) return spotifyApi('/api/spotify/configure', { method: 'PUT', body: { listen: want } }).then(() => spotifyStatus(true));
        return null;
      }).catch(() => {});
    } catch (e) { /* never in the way */ }
  }, 14000), { once: true });
})();

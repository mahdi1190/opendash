// server/routes/spotify.mjs - Spotify (lib/spotify.mjs): link an account, search, top artists, play, covers.
//
// Every route goes through the normal router (server/router.mjs): 127.0.0.1 only, the Host check (421), same-origin on
// every /api/ request (403), JSON bodies (415) with limits (413). Only the expiring, one-use OAuth callback takes a
// navigation from another site. No answer ever carries a token or a secret.
//
//   GET  /api/spotify/status                         -> {ok, configured, clientId, art, connected, needsAuth, name, error, scopes, redirectUri}
//   PUT  /api/spotify/configure {clientId?, art?, listen?}  -> status   (clientId '' removes the set-up; art: show covers without linking;
//                                                     listen: answer a friend who asks what you are listening to)
//   GET  /api/spotify/connect                        -> 302 to Spotify's sign-in (opened by the page in a new tab)
//   GET  /api/spotify/callback?code=&state=          -> an HTML page (the only cross-site route here)
//   POST /api/spotify/disconnect                     -> status
//   GET  /api/spotify/search?q=&type=&offset=        -> {ok, items:[{t,id,n,by,sub}], offset, next}   (q may be a Spotify link)
//   GET  /api/spotify/top?type=artists|tracks&range=short|medium|long -> {ok, range, items}
//   GET  /api/spotify/playlists?offset=              -> {ok, items, offset, next}   (yours)
//   GET  /api/spotify/now                            -> {ok, now:{on, id?, n?, by?, pos?, dur?}}   (what a friend who asks would be told; read-only)
//   GET  /api/spotify/devices                        -> {ok, devices:[{id, name, type, active}]}   (the Spotify apps that are open)
//   POST /api/spotify/play {t, id}                   -> {ok, device?}   (Premium; a Spotify app must be open: it is named when none was active)
//   POST /api/spotify/queue {id}                     -> {ok, device?, started?}   (a song, to the end of the queue; started: nothing was playing, so it began)
//   Also: answers a friend's music:ask with music:now, only while 'listen' is on (see lib/friends/songs.mjs)
//   GET  /api/spotify/art?t=&id=                     -> the cover picture (from this computer's cache, else asked from Spotify by id)
//
// It also loads lib/friends/songs.mjs, so the friends kind 'song' and the profile field 'music' are defined before the
// friends engine starts (every route file loads first).

import '../../lib/friends/songs.mjs';
import { spotifyFor, SPOTIFY_TYPES, SPOTIFY_ID_RE, SPOTIFY_CALLBACK_PATH } from '../../lib/spotify.mjs';
import { esc, HttpError } from '../http.mjs';

export default function register(app) {
  const spotify = app.ctx.spotify || spotifyFor(app.ctx.dataDir);
  const redirectUri = c => `http://127.0.0.1:${c.port}${SPOTIFY_CALLBACK_PATH}`;
  const safeError = e => new HttpError(e.status || 500, e.code ? e.message : 'Spotify could not complete the request.', { code: e.code || 'SPOTIFY_ERROR', ...(e.retryAfter ? { retryAfter: e.retryAfter } : {}) });
  // A friend opened your card and asked "what are you listening to?" (music:ask): answered only when you switched it on and
  // Spotify is linked, and at most once every 20 s per friend. Nothing is sent unless they ask.
  const asked = new Map();
  let wired = null;
  async function answer(f) {
    if (!f || f.status !== 'friend' || !/^[0-9a-f]{16}$/.test(String(f.id || ''))) return;
    if (f.perms && f.perms.profile === false) return;   // a friend who may not see your card (made through a group, not chosen yet) is not told what you play
    const t = Date.now();   // clock-ok: a rate window
    if (t - (asked.get(f.id) || 0) < 20000) return;
    asked.set(f.id, t); if (asked.size > 500) asked.delete(asked.keys().next().value);
    const st = await spotify.status();
    if (!st.connected || st.needsAuth || !st.listen) return;
    let now = { on: false };
    try { now = await spotify.nowPlaying(); } catch { return; }   // Spotify busy or signed out: say nothing rather than "not playing"
    const body = now.on ? { on: true, id: now.id, n: now.n, by: now.by, pos: now.pos, dur: now.dur, at: t } : { on: false, at: t };
    await app.ctx.friends.send(f.id, 'music:now', body);
  }
  function attachListening() {
    const fr = app.ctx.friends;
    if (!fr || wired === fr || typeof fr.on !== 'function') return;
    wired = fr;
    fr.on('music:ask', (msg, f) => { Promise.resolve().then(() => answer(f)).catch(() => { /* never in the way */ }); });
  }
  if (typeof app.onReady === 'function') app.onReady(async () => { attachListening(); });

  const wrap = fn => async c => { try { return { ok: true, ...(await fn(c)) }; } catch (e) { throw safeError(e); } };

  app.route({ path: '/api/spotify/status', method: 'GET', quiet: true, handler: wrap(async c => { attachListening(); return spotify.status({ redirectUri: redirectUri(c) }); }) });
  app.route({ path: '/api/spotify/configure', method: 'PUT', handler: wrap(async c => {
    const b = (await c.body()) || {};
    return { ...(await spotify.configure({ clientId: typeof b.clientId === 'string' ? b.clientId.slice(0, 80) : undefined, art: typeof b.art === 'boolean' ? b.art : undefined, listen: typeof b.listen === 'boolean' ? b.listen : undefined })), redirectUri: redirectUri(c) };
  }) });
  app.route({ path: '/api/spotify/connect', method: 'GET', sameOrigin: true, handler: async c => {
    try { c.res.writeHead(302, { Location: await spotify.authUrl(redirectUri(c)), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); c.res.end(); }
    catch (e) { throw safeError(e); }
  } });
  app.route({ path: SPOTIFY_CALLBACK_PATH, method: 'GET', crossSite: true, handler: async c => {
    c.res.setHeader('Referrer-Policy', 'no-referrer'); c.res.setHeader('Cache-Control', 'no-store');
    let title, message, status = 200;
    try {
      const st = await spotify.callback({ state: c.query.get('state'), code: c.query.get('code'), error: c.query.get('error') });
      title = 'Spotify connected'; message = st.name ? `Signed in as ${st.name}. You can close this tab and go back to Freeflo.` : 'You can close this tab and go back to Freeflo.';
      app.ctx.log?.('note', 'Spotify connected');
    } catch (e) { title = 'Spotify could not connect'; message = e.code ? e.message : 'The connection could not finish. Go back to Freeflo and try again.'; status = e.status || 400; }
    return c.send(status, `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><body style="font:16px system-ui;padding:3rem;max-width:36rem"><h2>${esc(title)}</h2><p>${esc(message)}</p><p><a href="/#view=connections">Back to Freeflo</a></p></body>`, 'text/html; charset=utf-8');
  } });
  app.route({ path: '/api/spotify/disconnect', method: 'POST', handler: wrap(async c => { await c.body({ allowEmpty: true }); const out = await spotify.disconnect(); app.ctx.log?.('note', 'Spotify disconnected'); return out; }) });

  app.route({ path: '/api/spotify/search', method: 'GET', quiet: true, handler: wrap(async c => spotify.search({ q: c.query.get('q') || '', type: c.query.get('type') || 'track', offset: c.query.get('offset') })) });
  app.route({ path: '/api/spotify/top', method: 'GET', quiet: true, handler: wrap(async c => spotify.top({ type: c.query.get('type') || 'artists', range: c.query.get('range') || 'medium', limit: c.query.get('limit') })) });
  app.route({ path: '/api/spotify/playlists', method: 'GET', quiet: true, handler: wrap(async c => spotify.myPlaylists({ offset: c.query.get('offset') })) });
  app.route({ path: '/api/spotify/now', method: 'GET', quiet: true, handler: wrap(async () => ({ now: await spotify.nowPlaying() })) });
  app.route({ path: '/api/spotify/devices', method: 'GET', quiet: true, handler: wrap(async () => ({ devices: await spotify.devices() })) });
  app.route({ path: '/api/spotify/play', method: 'POST', handler: wrap(async c => { const b = (await c.body()) || {}; return spotify.play({ t: String(b.t || ''), id: String(b.id || '') }); }) });
  app.route({ path: '/api/spotify/queue', method: 'POST', handler: wrap(async c => { const b = (await c.body()) || {}; return spotify.queue({ id: String(b.id || '') }); }) });

  app.route({ path: '/api/spotify/art', method: 'GET', quiet: true, handler: async c => {
    const t = c.query.get('t') || '', id = c.query.get('id') || '';
    if (!SPOTIFY_TYPES.includes(t) || !SPOTIFY_ID_RE.test(id)) return c.send(400, 'bad request');
    let art = null;
    try { art = await spotify.artFor({ t, id }); } catch { art = null; }
    if (!art) return c.send(404, 'no cover', 'text/plain; charset=utf-8', { 'Cache-Control': 'private, max-age=60' });
    return c.send(200, art.bytes, art.type, { 'Cache-Control': 'private, max-age=86400' });
  } });
}

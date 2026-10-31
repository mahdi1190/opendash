// lib/spotify.mjs - Spotify, linked straight from this computer (Freeflo 2.26).
//
// What it is for: search songs, albums, playlists and artists; show a few favourites and your top artists on
// your profile card; send a friend a song to listen to; play it or queue it on your own Spotify (Premium).
//
// How the link works: Authorization Code with PKCE (https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow).
// There is no client secret anywhere: the person makes their own Spotify app (free, but since February 2026 a
// Development Mode app needs its owner to have Premium, and allows 5 users), pastes its Client ID, and signs in.
// The redirect address is http://127.0.0.1:<port>/api/spotify/callback (Spotify no longer accepts "localhost").
//
// Secrets (lib/secret-store.mjs, this computer only): 'spotify-client' {clientId, revision, art} and
// 'spotify-tokens' {access_token, refresh_token, expires_at, scope, me, needsAuth, error}.
//
// Everything that leaves this computer goes through ONE place, request(), to a short list of fixed hosts, and
// api() only lets the routes below through (the same idea as the bank connectors' allowlist client):
//   accounts.spotify.com   authorize, token (PKCE, refresh)
//   api.spotify.com        GET me, search, me/top/{artists,tracks}, me/playlists, {tracks,albums,artists,playlists}/<id>;
//                          PUT me/player/play, POST me/player/queue (these two move the music: Premium)
//   open.spotify.com       oEmbed, only to find a cover when nobody has given us the picture's address
//   i.scdn.co, mosaic.scdn.co, *.spotifycdn.com   the cover pictures (https, no redirects, 400 KB at most)
// A friend can never make this code ask for anything else: the only thing from a friend that reaches a request is
// a 22-character Spotify id that passed SPOTIFY_ID_RE.
//
// Development Mode, February 2026: search returns at most 10 a page (use offset), GET me has no country, email or
// product, popularity and followers are gone. This module needs none of them.
//
// Node stdlib only.

import { randomBytes, createHash } from 'node:crypto';
import { join } from 'node:path';
import { promises as fsp } from 'node:fs';
import { secretStore } from './secret-store.mjs';
import { deviceRoot } from './devicedir.mjs';

export const SPOTIFY_SCOPES = Object.freeze(['user-top-read', 'user-read-playback-state', 'user-modify-playback-state', 'playlist-read-private']);
export const SPOTIFY_TYPES = Object.freeze(['track', 'album', 'playlist', 'artist']);
export const SPOTIFY_ID_RE = /^[0-9A-Za-z]{22}$/;
export const SPOTIFY_CLIENT_ID_RE = /^[0-9a-f]{32}$/;
export const SPOTIFY_RANGES = Object.freeze({ short: 'short_term', medium: 'medium_term', long: 'long_term' });
export const SPOTIFY_PAGE = 10;
export const SPOTIFY_CALLBACK_PATH = '/api/spotify/callback';

const AUTH = 'https://accounts.spotify.com/authorize';
const TOKEN = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com';
const OEMBED = 'https://open.spotify.com/oembed';
const ART_MAX = 400 * 1024;
const ART_KEEP = 400;          // cover files kept on this computer
const services = new Map();
const fail = (code, message, status = 409, extra) => Object.assign(new Error(message), { code, status }, extra || {});

/** The routes api() lets through: [method, path pattern]. Anything else is refused before a request is made. */
const ALLOWED = Object.freeze([
  ['GET', /^\/v1\/me$/],
  ['GET', /^\/v1\/search$/],
  ['GET', /^\/v1\/me\/top\/(artists|tracks)$/],
  ['GET', /^\/v1\/me\/playlists$/],
  ['GET', /^\/v1\/(tracks|albums|artists|playlists)\/[0-9A-Za-z]{22}$/],
  ['PUT', /^\/v1\/me\/player\/play$/],
  ['POST', /^\/v1\/me\/player\/queue$/],
]);

// ─── pure helpers (no network) ───────────────────────────────────────────
/** One line of plain text: control, bidi and zero-width characters out, runs of space folded, cut to max. */
export function cleanLine(v, max = 100) {
  if (typeof v !== 'string') return '';
  const s = v.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, max).join('');
}
/** 'https://open.spotify.com/track/<id>?si=..', '.../intl-fr/album/<id>' or 'spotify:playlist:<id>' -> {t, id} | null. */
export function parseSpotifyLink(text) {
  const s = String(text || '').trim().slice(0, 400);
  let m = /^spotify:(track|album|playlist|artist):([0-9A-Za-z]{22})$/.exec(s);
  if (!m) m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2,5}\/)?(track|album|playlist|artist)\/([0-9A-Za-z]{22})(?:[/?#].*)?$/.exec(s);
  return m ? { t: m[1], id: m[2] } : null;
}
/** The page of a Spotify item on the web (what "Open in Spotify" opens). null for anything that is not a type and an id. */
export function spotifyWebUrl(t, id) {
  return SPOTIFY_TYPES.includes(t) && SPOTIFY_ID_RE.test(String(id || '')) ? `https://open.spotify.com/${t}/${id}` : null;
}
/** Is this a cover picture address we may fetch? https, a Spotify image host, no credentials, no port. */
export function artUrlOk(url) {
  let u; try { u = new URL(String(url)); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  const h = u.hostname.toLowerCase();
  return h === 'i.scdn.co' || h === 'mosaic.scdn.co' || /^[a-z0-9-]+\.spotifycdn\.com$/.test(h) || /^[a-z0-9-]+\.scdn\.co$/.test(h);
}
/** The picture to use from Spotify's images list: the smallest one that is at least 160 wide, else the biggest. */
export function pickArt(images) {
  const list = (Array.isArray(images) ? images : []).filter(i => i && typeof i.url === 'string' && artUrlOk(i.url));
  if (!list.length) return null;
  const sized = list.filter(i => Number(i.width) >= 160).sort((a, b) => a.width - b.width);
  return (sized[0] || list.sort((a, b) => (Number(b.width) || 0) - (Number(a.width) || 0))[0]).url;
}
const names = (list, n = 3) => (Array.isArray(list) ? list.map(a => a && cleanLine(a.name, 60)).filter(Boolean).slice(0, n).join(', ') : '');
/**
 * One Spotify object in the shape the page and friends use: {t, id, n, by, sub}. n = the name, by = the artist(s) or
 * owner, sub = the album / year / genre. No picture address: covers are fetched by id (artFor).
 */
export function shapeItem(t, x) {
  if (!SPOTIFY_TYPES.includes(t) || !x || typeof x !== 'object' || !SPOTIFY_ID_RE.test(String(x.id || ''))) return null;
  const n = cleanLine(x.name, 100);
  if (!n) return null;
  let by = '', sub = '', images = x.images;
  if (t === 'track') { by = names(x.artists); sub = x.album ? cleanLine(x.album.name, 80) : ''; images = x.album && x.album.images; }
  else if (t === 'album') { by = names(x.artists); sub = [String(x.release_date || '').slice(0, 4), x.album_type === 'single' ? 'Single' : x.album_type === 'compilation' ? 'Compilation' : ''].filter(Boolean).join(' · '); }
  else if (t === 'playlist') { by = x.owner ? cleanLine(x.owner.display_name, 60) : ''; }
  else { sub = Array.isArray(x.genres) ? x.genres.map(g => cleanLine(g, 30)).filter(Boolean).slice(0, 2).join(', ') : ''; }
  return { t, id: x.id, n, by, sub, _art: pickArt(images) };
}

function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === '\x89PNG') return { ext: 'png', type: 'image/png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

export function createSpotify({ dataDir, fetchFn = (...a) => fetch(...a), now = () => Date.now() }) {
  const store = secretStore(dataDir);   // this computer only
  const CLIENT = 'spotify-client', TOKENS = 'spotify-tokens';
  const pending = new Map();            // state -> {verifier, redirectUri, revision, expires}
  const artUrls = new Map();            // 't:id' -> a cover picture address Spotify gave us (kept small)
  const artMiss = new Map();            // 't:id' -> when we failed (not asked again for ten minutes)
  let generation = 0, refreshing = null, lastError = null, artBusy = 0;
  const read = key => store.get(key).catch(e => { if (e.code === 'SECRET_CORRUPT') return null; throw e; });
  const client = async () => { const c = await read(CLIENT); return c && typeof c === 'object' && SPOTIFY_CLIENT_ID_RE.test(c.clientId || '') && c.revision ? c : null; };
  /** The set-up record as saved, even before there is a Client ID (the cover-art switch is kept there too). */
  const rawClient = async () => { const c = await read(CLIENT); return c && typeof c === 'object' ? c : {}; };
  const live = (c, t) => !!(c && t && t.revision === c.revision && typeof t.refresh_token === 'string' && t.refresh_token);

  async function status({ redirectUri } = {}) {
    const c = await client(), t = await read(TOKENS), has = live(c, t), raw = await rawClient();
    return {
      configured: !!c, clientId: c ? c.clientId : null, art: !!raw.art, connected: has && !t.needsAuth, needsAuth: has && !!t.needsAuth,
      name: has && t.me ? t.me.name : null, error: lastError || (has ? t.error || null : null),
      scopes: has && typeof t.scope === 'string' ? t.scope.split(/\s+/).filter(s => SPOTIFY_SCOPES.includes(s)) : [],
      ...(redirectUri ? { redirectUri } : {}),
    };
  }

  /** Save the Client ID (and the cover-art switch). A new Client ID signs the old link out. clientId: '' removes the set-up. */
  async function configure({ clientId, art } = {}) {
    return store.lock(CLIENT, async () => {
      const prev = await client(), raw = await rawClient();
      if (clientId === '') {
        generation++; pending.clear(); lastError = null;
        await store.set(TOKENS, null); await store.set(CLIENT, { art: !!raw.art });
        return { ...(await status()), changed: true };
      }
      let next = prev ? { ...prev } : null;
      if (typeof clientId === 'string') {
        const id = clientId.trim().toLowerCase();
        if (!SPOTIFY_CLIENT_ID_RE.test(id)) throw fail('BAD_REQUEST', 'A Spotify Client ID is 32 letters and numbers. Copy it from your app in the Spotify developer dashboard.', 400);
        if (!prev || prev.clientId !== id) {
          generation++; pending.clear(); lastError = null;
          await store.set(TOKENS, null);
          next = { clientId: id, revision: randomBytes(16).toString('hex'), art: !!raw.art };
        }
      }
      if (typeof art === 'boolean') {
        next = { ...(next || raw), art };
      }
      if (next) await store.set(CLIENT, next);
      return { ...(await status()), changed: true };
    });
  }

  async function authUrl(redirectUri) {
    const c = await client();
    if (!c) throw fail('NOT_CONFIGURED', 'Add your Spotify Client ID in Connections first.');
    let u; try { u = new URL(redirectUri); } catch { throw fail('BAD_REQUEST', 'Invalid Spotify callback.', 400); }
    if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || u.username || u.password || u.pathname !== SPOTIFY_CALLBACK_PATH || u.search || u.hash) throw fail('BAD_REQUEST', 'Invalid Spotify callback.', 400);
    for (const [s, p] of pending) if (p.expires <= now()) pending.delete(s);
    while (pending.size >= 20) pending.delete(pending.keys().next().value);
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url');
    pending.set(state, { verifier, redirectUri, revision: c.revision, generation, expires: now() + 600000 });
    lastError = null;
    return AUTH + '?' + new URLSearchParams({ client_id: c.clientId, response_type: 'code', redirect_uri: redirectUri, scope: SPOTIFY_SCOPES.join(' '), state,
      code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') });
  }

  /** One request to a fixed host. JSON back ({} for an empty answer). Never follows a redirect. */
  async function request(url, options = {}, { json = true, max = 2 * 1024 * 1024 } = {}) {
    let response, bytes;
    try {
      response = await fetchFn(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
      bytes = Buffer.from(await response.arrayBuffer());
    } catch { throw fail('SPOTIFY_NETWORK', 'Spotify could not be reached. Check your connection and try again.', 502); }
    if (bytes.length > max) throw fail('SPOTIFY_LIMIT', 'Spotify sent back too much data.', 502);
    if (!json) return { response, bytes };
    let doc = {};
    if (bytes.length) { try { doc = JSON.parse(bytes.toString('utf8')); } catch { throw fail('SPOTIFY_RESPONSE', 'Spotify sent back something unreadable.', 502); } }
    return { response, doc: doc && typeof doc === 'object' ? doc : {} };
  }
  const form = body => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });

  function tokensFrom(doc, c, old = {}) {
    if (typeof doc.access_token !== 'string' || !doc.access_token || doc.access_token.length > 4096) throw fail('SPOTIFY_RESPONSE', 'Spotify sent back an invalid sign-in.', 502);
    // "When a refresh token is not returned, continue using the existing token."
    const refresh = typeof doc.refresh_token === 'string' && doc.refresh_token ? doc.refresh_token : old.refresh_token;
    if (typeof refresh !== 'string' || !refresh || refresh.length > 4096) throw fail('SPOTIFY_AUTH', 'Spotify did not give an ongoing sign-in. Connect again.', 400);
    return { ...old, revision: c.revision, access_token: doc.access_token, refresh_token: refresh,
      scope: typeof doc.scope === 'string' ? doc.scope : old.scope || '', expires_at: now() + Math.max(60, Math.min(86400, Number(doc.expires_in) || 3600)) * 1000, needsAuth: false, error: null };
  }
  function tokenError(doc, status) {
    const e = doc && doc.error;
    if (e === 'invalid_client' || (e === 'invalid_request' && /client/i.test(String(doc.error_description || '')))) return fail('SPOTIFY_CLIENT', 'Spotify did not accept this Client ID. Copy it again from your app in the developer dashboard.', 400);
    if (e === 'invalid_grant') return fail('SPOTIFY_AUTH', 'Spotify needs you to sign in again.', 401);
    return fail('SPOTIFY_RESPONSE', 'Spotify could not finish the sign-in. Try again.', status >= 500 ? 502 : 400);
  }

  async function callback({ state, code, error }) {
    const key = String(state || ''), p = pending.get(key); pending.delete(key);
    if (!p || p.expires <= now() || p.generation !== generation) throw fail('OAUTH_STATE', 'This sign-in expired or was not started from Freeflo. Start again.', 400);
    try {
      if (error || !code || String(code).length > 4096) throw fail('OAUTH_CANCELLED', 'Spotify sign-in was cancelled or could not finish. Start again.', 400);
      const c = await client(); if (!c || c.revision !== p.revision) throw fail('SPOTIFY_CHANGED', 'The Spotify set-up changed. Try again.', 409);
      const { response, doc } = await request(TOKEN, form({ grant_type: 'authorization_code', code: String(code), redirect_uri: p.redirectUri, client_id: c.clientId, code_verifier: p.verifier }));
      if (!response.ok) throw tokenError(doc, response.status);
      const t = tokensFrom(doc, c);
      const me = await call('GET', '/v1/me', {}, t.access_token);
      t.me = { id: cleanLine(me.id, 80), name: cleanLine(me.display_name || me.id, 60) };
      await store.lock(CLIENT, async () => {
        if (p.generation !== generation || (await client())?.revision !== p.revision) throw fail('SPOTIFY_CHANGED', 'The Spotify set-up changed. Try again.', 409);
        generation++; pending.clear();
        await store.set(TOKENS, t); lastError = null;
      });
      return status();
    } catch (e) { if (p.generation === generation) lastError = e.code ? e.message : 'Spotify could not connect. Try again.'; throw e; }
  }

  /** A live access token, refreshed when it is about to run out (one refresh at a time). */
  function access({ force = false } = {}) {
    if (refreshing) return refreshing;
    const epoch = generation;
    refreshing = store.lock(CLIENT, async () => {
      const c = await client(), old = await read(TOKENS);
      if (epoch !== generation) throw fail('SPOTIFY_CHANGED', 'The Spotify set-up changed. Try again.', 409);
      if (!live(c, old) || old.needsAuth) throw fail('SPOTIFY_AUTH', 'Connect Spotify in Connections first.', 401);
      let t = old;
      if (force || !old.access_token || old.expires_at <= now() + 60000) {
        try {
          const { response, doc } = await request(TOKEN, form({ grant_type: 'refresh_token', refresh_token: old.refresh_token, client_id: c.clientId }));
          if (!response.ok) throw tokenError(doc, response.status);
          t = tokensFrom(doc, c, old);
          if (epoch !== generation) throw fail('SPOTIFY_CHANGED', 'The Spotify set-up changed. Try again.', 409);
          await store.set(TOKENS, t);
        } catch (e) {
          if (epoch === generation && e.code === 'SPOTIFY_AUTH') await store.set(TOKENS, { ...old, needsAuth: true, error: e.message });
          throw e;
        }
      }
      return t.access_token;
    }).finally(() => { refreshing = null; });
    return refreshing;
  }

  /** The one door to api.spotify.com: a listed method and path, nothing else. */
  async function call(method, path, { query, body } = {}, token) {
    if (!ALLOWED.some(([m, re]) => m === method && re.test(path))) throw fail('SPOTIFY_REFUSED', 'That Spotify request is not allowed.', 400);
    const u = new URL(path, API);
    if (u.origin !== API) throw fail('SPOTIFY_REFUSED', 'That Spotify request is not allowed.', 400);
    for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    const send = async (tk) => request(u.href, { method, headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    let tk = token || await access();
    let r = await send(tk);
    if (r.response.status === 401 && !token) { tk = await access({ force: true }); r = await send(tk); }   // Spotify may drop a token early
    if (r.response.ok) return r.doc;
    const err = r.doc && r.doc.error, reason = err && typeof err === 'object' ? String(err.reason || '') : '';
    const st = r.response.status;
    if (st === 401) throw fail('SPOTIFY_AUTH', 'Spotify needs you to sign in again.', 401);
    if (reason === 'PREMIUM_REQUIRED') throw fail('SPOTIFY_PREMIUM', 'Playing from here needs Spotify Premium.', 403);
    if (reason === 'NO_ACTIVE_DEVICE' || (st === 404 && /player/.test(path))) throw fail('SPOTIFY_NO_DEVICE', 'Open Spotify on your phone, computer or web player first, then try again.', 404);
    if (st === 403) throw fail('SPOTIFY_NOT_ALLOWED', 'Spotify refused this account. The app’s owner needs Premium, and your Spotify account must be added under User management in the developer dashboard.', 403);
    if (st === 429) throw fail('SPOTIFY_BUSY', 'Spotify is busy. Try again in a moment.', 429, { retryAfter: Number(r.response.headers.get('retry-after')) || 5 });
    if (st === 404) throw fail('SPOTIFY_GONE', 'Spotify could not find that.', 404);
    throw fail('SPOTIFY_RESPONSE', 'Spotify could not do that just now.', 502);
  }
  const remember = (item) => {
    if (item && item._art) {
      artUrls.set(item.t + ':' + item.id, item._art);
      if (artUrls.size > 600) artUrls.delete(artUrls.keys().next().value);
    }
    if (item) delete item._art;
    return item;
  };

  // ─── reading ───────────────────────────────────────────────────────────
  /** {items:[{t,id,n,by,sub}], offset, next}. Link or uri typed instead of words: that one item. */
  async function search({ q, type = 'track', offset = 0 } = {}) {
    const text = cleanLine(q, 120);
    if (!text) return { items: [], offset: 0, next: false, q: '' };
    if (!SPOTIFY_TYPES.includes(type)) throw fail('BAD_REQUEST', 'Choose songs, albums, playlists or artists.', 400);
    const link = parseSpotifyLink(text);
    if (link) { const one = await lookup(link.t, link.id); return { items: one ? [one] : [], offset: 0, next: false, q: text, link: true }; }
    const off = Math.max(0, Math.min(900, Math.floor(Number(offset) || 0)));
    const doc = await call('GET', '/v1/search', { query: { q: text, type, limit: SPOTIFY_PAGE, offset: off } });
    const bag = doc[type + 's'] || {};
    const items = (Array.isArray(bag.items) ? bag.items : []).filter(Boolean).map(x => remember(shapeItem(type, x))).filter(Boolean);
    return { items, offset: off, next: !!bag.next && off + SPOTIFY_PAGE < 1000, q: text };
  }
  async function lookup(t, id) {
    if (!SPOTIFY_TYPES.includes(t) || !SPOTIFY_ID_RE.test(String(id || ''))) throw fail('BAD_REQUEST', 'That is not a Spotify link.', 400);
    const query = t === 'playlist' ? { fields: 'id,name,owner(display_name),images' } : undefined;
    return remember(shapeItem(t, await call('GET', `/v1/${t}s/${id}`, { query })));
  }
  /** Your top artists (or tracks) over 4 weeks ('short'), 6 months ('medium') or all time ('long'). */
  async function top({ type = 'artists', range = 'medium', limit = 10 } = {}) {
    if (type !== 'artists' && type !== 'tracks') throw fail('BAD_REQUEST', 'Choose artists or tracks.', 400);
    const tr = SPOTIFY_RANGES[range]; if (!tr) throw fail('BAD_REQUEST', 'Choose 4 weeks, 6 months or all time.', 400);
    const doc = await call('GET', `/v1/me/top/${type}`, { query: { time_range: tr, limit: Math.max(1, Math.min(20, Math.floor(Number(limit)) || 10)) } });
    const t = type === 'artists' ? 'artist' : 'track';
    return { range, items: (Array.isArray(doc.items) ? doc.items : []).map(x => remember(shapeItem(t, x))).filter(Boolean) };
  }
  /** Your own playlists (the ones you made and the ones you follow). */
  async function myPlaylists({ offset = 0 } = {}) {
    const off = Math.max(0, Math.min(900, Math.floor(Number(offset) || 0)));
    const doc = await call('GET', '/v1/me/playlists', { query: { limit: SPOTIFY_PAGE, offset: off } });
    return { items: (Array.isArray(doc.items) ? doc.items : []).filter(Boolean).map(x => remember(shapeItem('playlist', x))).filter(Boolean), offset: off, next: !!doc.next && off + SPOTIFY_PAGE < 1000 };
  }

  // ─── playing (Spotify Premium, on a device that is open) ───────────────
  async function play({ t, id }) {
    const url = spotifyWebUrl(t, id); if (!url) throw fail('BAD_REQUEST', 'That is not a Spotify item.', 400);
    await call('PUT', '/v1/me/player/play', { body: t === 'track' ? { uris: [`spotify:track:${id}`] } : { context_uri: `spotify:${t}:${id}` } });
    return { ok: true };
  }
  async function queue({ id }) {
    if (!SPOTIFY_ID_RE.test(String(id || ''))) throw fail('BAD_REQUEST', 'Only a song can be added to the queue.', 400);
    await call('POST', '/v1/me/player/queue', { query: { uri: `spotify:track:${id}` } });
    return { ok: true };
  }

  // ─── cover pictures ────────────────────────────────────────────────────
  const artDir = () => join(deviceRoot(dataDir), 'cache', 'spotify-art');
  /** May we ask Spotify for covers? Linked, or the person switched "Show cover art" on. */
  async function artAllowed() {
    if ((await rawClient()).art) return true;
    return live(await client(), await read(TOKENS));
  }
  async function artFromDisk(base) {
    for (const ext of ['jpg', 'png', 'webp']) {
      try { return { bytes: await fsp.readFile(join(artDir(), `${base}.${ext}`)), type: ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp' }; } catch { /* next */ }
    }
    return null;
  }
  async function artAddress(t, id) {
    const known = artUrls.get(t + ':' + id);
    if (known) return known;
    const { response, doc } = await request(OEMBED + '?' + new URLSearchParams({ url: spotifyWebUrl(t, id) }).toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok || !artUrlOk(doc.thumbnail_url)) return null;
    return doc.thumbnail_url;
  }
  /** The cover of a song, album, playlist or artist by id: {bytes, type} | null (cached on this computer; null also when covers are off). */
  async function artFor({ t, id }) {
    if (!SPOTIFY_TYPES.includes(t) || !SPOTIFY_ID_RE.test(String(id || ''))) return null;
    const base = `${t}-${id}`, miss = artMiss.get(base);
    const cached = await artFromDisk(base);
    if (cached) return cached;
    if (miss && now() - miss < 10 * 60000) return null;
    if (!(await artAllowed()) || artBusy >= 4) return null;
    artBusy++;
    try {
      const addr = await artAddress(t, id);
      if (!addr) throw new Error('no cover');
      const { response, bytes } = await request(addr, { headers: { Accept: 'image/*' } }, { json: false, max: ART_MAX });
      const kind = response.ok ? sniff(bytes) : null;
      if (!kind) throw new Error('not a picture');
      await fsp.mkdir(artDir(), { recursive: true });
      await fsp.writeFile(join(artDir(), `${base}.${kind.ext}`), bytes);
      pruneArt().catch(() => {});
      return { bytes, type: kind.type };
    } catch { artMiss.set(base, now()); if (artMiss.size > 1000) artMiss.clear(); return null; }
    finally { artBusy--; }
  }
  async function pruneArt() {
    const dir = artDir(), files = await fsp.readdir(dir);
    if (files.length <= ART_KEEP) return;
    const rows = [];
    for (const f of files) { try { rows.push({ f, at: (await fsp.stat(join(dir, f))).mtimeMs }); } catch { /* gone */ } }
    rows.sort((a, b) => a.at - b.at);
    for (const r of rows.slice(0, rows.length - ART_KEEP + 50)) await fsp.unlink(join(dir, r.f)).catch(() => {});
  }

  /** Sign out: the tokens go, the Client ID stays (so signing in again is one click). */
  async function disconnect() {
    generation++; pending.clear(); lastError = null;
    await store.lock(CLIENT, async () => { const c = await client(); await store.set(TOKENS, null); if (c) await store.set(CLIENT, { ...c, revision: randomBytes(16).toString('hex') }); });
    return status();
  }
  return { status, configure, authUrl, callback, search, lookup, top, myPlaylists, play, queue, artFor, artAllowed, disconnect };
}

export function spotifyFor(dataDir) {
  if (!services.has(dataDir)) services.set(dataDir, createSpotify({ dataDir }));
  return services.get(dataDir);
}

// lib/google.mjs — the SINGLE Google connection of versions before 2.15.
//
// Superseded by Google accounts (any number side by side): the provider
// lib/accounts/google.mjs, the Node side lib/accounts-google.mjs, Connections >
// + Add Google account (docs/dev/ACCOUNTS.md). The old connection (secret
// google-tokens) is moved into one account at start-up, and /api/google/connect
// now sends the browser to Connections, so nothing here makes a new one. What
// stays: googleStatus() (also counting Google accounts signed in on this
// computer, for /api/health and the connector gate) and the read helpers for a
// copy that still has the old tokens. The notes below describe the old set-up.
//
// Uses the OAuth 2.0 installed-application flow with a loopback redirect, so
// the dashboard talks to Google directly and needs no Claude session and no
// Cowork. Free: both APIs sit well inside Google's no-cost quota for personal
// use.
//
// One-time setup (see README-STANDALONE.md for the click-by-click version):
//   1. console.cloud.google.com -> new project
//   2. Enable the Gmail API and the Google Calendar API
//   3. OAuth consent screen -> External -> add yourself as a test user
//   4. Credentials -> Create OAuth client ID -> Desktop app -> download JSON
//   5. Save it as  <data dir>/secrets/google-client.json  (the server moves it
//      to this computer's secret store at its next start, lib/devicedir.mjs)
//
// Then click Connect Google in the dashboard. The refresh token is kept in
// this computer's secret store (lib/secret-store.mjs, key google-tokens) and
// reused after that; it never travels with the data folder.
//
// Node stdlib only.

import { join } from 'node:path';
import { secretStore, fileBackend } from './secret-store.mjs';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let STORE = null;
let _clientCache = null;
let _tokenCache = null;

/**
 * store: this computer's secret store (lib/secret-store.mjs) holding the OAuth
 * client and the tokens; a folder path still works (its JSON files).
 */
export function initGoogle(store) {
  STORE = typeof store === 'string' ? secretStore(null, { backend: fileBackend(store) }) : store || null;
  _clientCache = null; _tokenCache = null;
}
const secrets = () => { if (!STORE) throw new Error('Google is not set up on this server'); return STORE; };
const TOKENS = 'google-tokens';

// Accept the credentials file under its tidy name OR exactly as Google names
// the download (client_secret_<id>.apps.googleusercontent.com.json). Renaming
// it is the single most common place this setup goes wrong, so don't require it.
async function clientKey() {
  const s = secrets();
  if (await s.has('google-client')) return 'google-client';
  const hit = (await s.list()).find(k => !k.includes('/') && k.toLowerCase().startsWith('client_secret'));
  return hit || 'google-client';   // the preferred name when nothing is there
}

/** The OAuth client credentials the user downloaded from Google Cloud. */
async function loadClient() {
  if (_clientCache) return _clientCache;
  const raw = await secrets().get(await clientKey());
  if (!raw) return null;
  // Google wraps desktop credentials under "installed" (older exports use "web").
  const c = raw.installed || raw.web || raw;
  if (!c.client_id || !c.client_secret) {
    throw new Error('google-client.json has no client_id/client_secret');
  }
  _clientCache = { id: c.client_id, secret: c.client_secret };
  return _clientCache;
}

async function loadTokens() {
  if (_tokenCache) return _tokenCache;
  _tokenCache = await secrets().get(TOKENS);
  return _tokenCache;
}

async function saveTokens(t) {
  _tokenCache = t;
  await secrets().set(TOKENS, t);
}

/** Google accounts signed in on this computer (secret store keys accounts/<id>, provider google). */
async function signedInAccounts() {
  if (!STORE || typeof STORE.list !== 'function') return [];
  const out = [];
  for (const k of await STORE.list('accounts/').catch(() => [])) {
    const d = await STORE.get(k).catch(() => null);
    if (d && d.provider === 'google' && d.refresh_token && !d.needsAuth) out.push(d.email || null);
  }
  return out;
}

export async function googleStatus() {
  const client = await loadClient().catch(() => null);
  const tokens = await loadTokens().catch(() => null);
  const accounts = await signedInAccounts();
  const where = STORE && STORE.location;
  const key = STORE ? await clientKey().catch(() => 'google-client') : 'google-client';
  return {
    configured: !!client,        // client_secret.json present
    connected: !!(tokens && tokens.refresh_token) || accounts.length > 0,
    account: (tokens && tokens.account) || accounts.find(Boolean) || null,
    accounts: accounts.length,      // Google accounts (the multi-account way) signed in here
    clientFile: where ? join(where, key + '.json') : null,   // file backend only (never sent to the page)
    secretsDir: where || null,
  };
}

// The old sign-in flow (authUrl, its OAuth state and exchangeCode, without PKCE) and
// its /api/google/callback route were removed: nothing started it any more (2.15+
// signs in through lib/accounts/google.mjs, with PKCE).

/** A valid access token, refreshing if the cached one has expired. */
async function accessToken() {
  const tokens = await loadTokens();
  if (!tokens || !tokens.refresh_token) throw new Error('Google not connected');
  if (tokens.access_token && tokens.expires_at > Date.now() + 60000) {
    return tokens.access_token;
  }
  const client = await loadClient();
  const body = new URLSearchParams({
    client_id: client.id,
    client_secret: client.secret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(`token refresh failed: ${data.error_description || data.error || r.status}`
      + '. Reconnect Google from the dashboard.');
  }
  tokens.access_token = data.access_token;
  tokens.expires_at = Date.now() + (data.expires_in || 3600) * 1000;
  await saveTokens(tokens);
  return tokens.access_token;
}

async function apiGet(url, explicitTokens) {
  const token = explicitTokens ? explicitTokens.access_token : await accessToken();
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    let detail = '';
    try { const e = await r.json(); detail = e.error?.message || ''; } catch (x) {}
    throw new Error(`Google API ${r.status}${detail ? ': ' + detail : ''}`);
  }
  return r.json();
}

const header = (payload, name) => {
  const h = (payload?.headers || []).find(x => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
};

/**
 * Recent inbox threads, shaped like what the dashboard's triage view expects:
 * { id, subject, sender, snippet, date }
 */
export async function recentEmails(days = 7, max = 40) {
  const q = encodeURIComponent(`newer_than:${days}d -in:sent -in:trash in:inbox`);
  const list = await apiGet(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${max}`);
  const ids = (list.messages || []).map(m => m.id);
  // Metadata format keeps the payload small: headers + snippet, no bodies.
  const msgs = await Promise.all(ids.map(id => apiGet(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`
    + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date'
  ).catch(() => null)));
  return msgs.filter(Boolean).map(m => ({
    id: m.id,
    subject: header(m.payload, 'Subject') || '(no subject)',
    sender: header(m.payload, 'From') || '',
    snippet: (m.snippet || '').slice(0, 350),
    date: header(m.payload, 'Date') || '',
  }));
}

/** Recent threads to or from one address, for the person panel. */
export async function personEmails(email, max = 12) {
  const q = encodeURIComponent(`from:${email} OR to:${email}`);
  const list = await apiGet(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${max}`);
  const ids = (list.messages || []).map(m => m.id);
  const msgs = await Promise.all(ids.map(id => apiGet(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`
    + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date'
  ).catch(() => null)));
  return msgs.filter(Boolean).map(m => ({
    id: m.id,
    subject: header(m.payload, 'Subject') || '(no subject)',
    sender: header(m.payload, 'From') || '',
    snippet: (m.snippet || '').slice(0, 200),
    date: header(m.payload, 'Date') || '',
  }));
}

/** Today's and tomorrow's events, shaped like the dashboard's calCache (times in config.timezone, else this computer's zone). */
export async function todayEvents(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 2);
  const q = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '25',
    timeZone,
  });
  const data = await apiGet(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`);
  return (data.items || []).map(e => ({
    id: e.id,
    summary: e.summary || '(no title)',
    start: e.start,
    end: e.end,
    location: e.location || '',
    hangoutLink: e.hangoutLink || '',
  }));
}

export async function disconnect() {
  _tokenCache = null;
  if (STORE && await STORE.has(TOKENS).catch(() => false)) await STORE.set(TOKENS, {}).catch(() => {});
}

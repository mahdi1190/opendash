// lib/accounts/google.mjs - the Google provider: Gmail and Google Calendar,
// read-only, any number of accounts side by side (docs/dev/ACCOUNTS.md).
//
// PURE, PLATFORM-AGNOSTIC JS: no node: imports, no file access. The network,
// the token store and the OAuth redirect are adapters from the core
// (lib/accounts/core.mjs); Web Crypto makes the PKCE pair and the state.
//
// Sign-in: the OAuth 2.0 installed-app flow (RFC 8252) with PKCE S256 and a
// single-use state, login_hint from the typed address, access_type=offline and
// prompt=consent (so Google always returns a refresh token). The redirect is
// whatever the adapter says: loopback (the local server), custom scheme (a
// mobile app) or web. A desktop (loopback) Google client still needs its
// client secret in practice; it is a provider setting, injected at build time
// (lib/accounts/shipped.mjs) or the user's own (Connections > Advanced), never
// typed in a normal flow. Mobile (iOS/Android) Google clients have none.
//
// Scopes, least first, per feature the user ticks:
//   always    openid email                 who the account is (id token)
//   calendar  calendar.readonly            calendars and events (sensitive scope)
//   mail      gmail.readonly               message metadata + Gmail's snippet (restricted scope)
// gmail.metadata is not enough: it has no snippet and refuses Gmail's search
// (q=), and Email triage shows and reads the snippet. No Drive scope.
//
// Reads (GET only, hosts gmail.googleapis.com and www.googleapis.com, paths
// /gmail/v1/users/me/ and /calendar/v3/ only; tokens are POSTed only to
// oauth2.googleapis.com/token and /revoke). Shapes are the existing snapshot
// shapes (lib/inbox-sources.mjs, lib/calendar-sources.mjs), with the fields
// the Google presets add (lib/inbox.mjs Message, lib/calendar.mjs Event).
//
// Token document (secret store key accounts/<id>, device-local):
//   { provider:'google', clientId, sub, email, hd?, scope:[...], access_token,
//     refresh_token, expires_at, needsAuth?, legacy? }

import { fail, cleanText, cleanEmail, pkcePair, jwtClaims, sha256Hex } from './core.mjs';
import { shippedGoogleClient } from './shipped.mjs';

// ─── Endpoints and scopes ─────────────────────────────────────────────────
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GCAL = 'https://www.googleapis.com/calendar/v3';
/** The only hosts a data request may reach (GET), with the paths each may use. */
export const GOOGLE_API_HOSTS = Object.freeze(['gmail.googleapis.com', 'www.googleapis.com']);
const API_PATHS = Object.freeze({ 'gmail.googleapis.com': /^\/gmail\/v1\/users\/me\/[A-Za-z0-9/_-]+$/, 'www.googleapis.com': /^\/calendar\/v3\/[A-Za-z0-9/_.%@#+-]+$/ });
const TOKEN_POSTS = Object.freeze([GOOGLE_TOKEN_URL, GOOGLE_REVOKE_URL]);

export const GOOGLE_SCOPES = Object.freeze({
  base: Object.freeze(['openid', 'email']),
  calendar: 'https://www.googleapis.com/auth/calendar.readonly',
  mail: 'https://www.googleapis.com/auth/gmail.readonly',
});
const FEATURE_ORDER = ['calendar', 'mail'];          // least sensitive first

const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,200}\.apps\.googleusercontent\.com$/;
const SECRET_RE = /^[\x21-\x7e]{8,512}$/;
const GMAIL_ID_RE = /^[A-Za-z0-9_-]{1,120}$/;
const EVENT_ID_RE = /^[A-Za-z0-9_@.\-]{1,200}$/;
const CAL_ID_RE = /^(primary|[A-Za-z0-9._%+#\-]{1,160}@[A-Za-z0-9.\-]{1,120}\.[A-Za-z]{2,24})$/;
const TZ_RE = /^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/;
const MAX_BYTES = 5 * 1024 * 1024;
const PERSONAL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

export const isGoogleClientId = (s) => CLIENT_ID_RE.test(String(s || ''));
export const isGoogleClientSecret = (s) => SECRET_RE.test(String(s || ''));

// ─── Features and scopes ──────────────────────────────────────────────────
/** {mail, calendar} (or ['mail', ...]) -> {mail, calendar}; nothing given means both. */
export function normaliseFeatures(f) {
  if (f == null) return { mail: true, calendar: true };
  const list = Array.isArray(f) ? f : Object.keys(f).filter((k) => f[k] === true);
  return { mail: list.includes('mail'), calendar: list.includes('calendar') };
}
/** The scopes for the ticked features, least first. Throws when none is ticked. */
export function scopesFor(features) {
  const f = normaliseFeatures(features);
  if (!f.mail && !f.calendar) throw fail('BAD_REQUEST', 'Choose email, calendar or both.', 400);
  return [...GOOGLE_SCOPES.base, ...FEATURE_ORDER.filter((k) => f[k]).map((k) => GOOGLE_SCOPES[k])];
}
const scopeList = (s) => (Array.isArray(s) ? s.map(String) : String(s || '').split(/\s+/)).filter(Boolean);
/** Which features a granted scope string (or list) allows. */
export function featuresGranted(scope) {
  const have = new Set(scopeList(scope));
  return { mail: have.has(GOOGLE_SCOPES.mail), calendar: have.has(GOOGLE_SCOPES.calendar) };
}
/** Granted scopes worth recording (ours only, in our order). */
function grantedScopes(scope) {
  const have = new Set(scopeList(scope));
  const out = [];
  if (have.has('openid')) out.push('openid');
  if (have.has('email') || have.has('https://www.googleapis.com/auth/userinfo.email')) out.push('email');
  for (const k of FEATURE_ORDER) if (have.has(GOOGLE_SCOPES[k])) out.push(GOOGLE_SCOPES[k]);
  return out;
}

/** A first guess at the account kind from the address (the id token's hd claim settles it). */
export const guessKind = (email) => (PERSONAL_DOMAINS.has(String(email || '').split('@').pop().toLowerCase()) ? 'personal' : 'work');

// ─── Client settings ─────────────────────────────────────────────────────
/**
 * A Google OAuth client from what a user pastes or uploads: Google's
 * downloaded JSON ({installed:{client_id, client_secret}} or {web:...}),
 * {clientId, clientSecret}, or a bare client ID string. The secret is
 * optional (mobile clients have none). Endpoint URLs in a download are ignored.
 */
export function parseGoogleClient(input) {
  let doc = input;
  if (typeof doc === 'string') {
    const t = doc.trim();
    if (isGoogleClientId(t)) return { clientId: t, clientSecret: null };
    try { doc = JSON.parse(t); } catch { throw fail('BAD_REQUEST', 'Paste the client ID, or the JSON file Google Cloud gave you.', 400); }
  }
  const c = doc && typeof doc === 'object' ? (doc.installed || doc.web || doc) : null;
  const clientId = c && String(c.client_id || c.clientId || '').trim();
  const secret = c && (c.client_secret || c.clientSecret);
  if (!isGoogleClientId(clientId)) throw fail('BAD_REQUEST', 'That is not a Google OAuth client ID (it ends in .apps.googleusercontent.com).', 400);
  if (secret != null && secret !== '' && !isGoogleClientSecret(secret)) throw fail('BAD_REQUEST', 'That client secret does not look right. Copy it again from Google Cloud.', 400);
  return { clientId, clientSecret: secret ? String(secret) : null };
}

// ─── Requests (pure builders) ─────────────────────────────────────────────
/** The consent page URL. loginHint picks the account; prompt=consent always returns a refresh token. */
export function buildAuthUrl({ clientId, redirectUri, scopes, state, challenge, loginHint }) {
  const q = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: scopes.join(' '),
    state, code_challenge: challenge, code_challenge_method: 'S256',
    access_type: 'offline', prompt: loginHint ? 'consent' : 'select_account consent',
  });
  if (loginHint) q.set('login_hint', loginHint);
  return `${GOOGLE_AUTH_URL}?${q}`;
}
/** Form body for the token endpoint; client_secret only when there is one. */
export function tokenBody(params, clientSecret) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) q.set(k, String(v));
  if (clientSecret) q.set('client_secret', clientSecret);
  return q.toString();
}

/** May this request leave the device? GET to the data hosts/paths, POST to the token endpoints, nothing else. */
export function isAllowedRequest(url, method = 'GET') {
  let u;
  try { u = new URL(String(url)); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  const m = String(method).toUpperCase();
  if (m === 'POST') return TOKEN_POSTS.includes(u.origin + u.pathname) && !u.search && !u.hash;
  if (m !== 'GET' || u.hash) return false;
  const re = API_PATHS[u.hostname];
  return !!re && re.test(u.pathname);
}

// ─── Responses ────────────────────────────────────────────────────────────
/** A token endpoint error -> an AccountError with plain words (no provider detail). */
export function tokenError(status, doc = {}) {
  const e = String(doc.error || '');
  if (e === 'invalid_grant') return fail('NEEDS_SIGN_IN', 'Google needs you to sign in to this account again.', 401);
  if (e === 'admin_policy_enforced' || e === 'org_internal') return fail('NEEDS_ADMIN_APPROVAL', 'Your organisation\'s Google admin has not allowed OpenDash yet.', 409);
  if (e === 'invalid_client' || e === 'unauthorized_client' || (e === 'invalid_request' && /client_secret/i.test(String(doc.error_description || '')))) {
    return fail('NOT_CONFIGURED', 'Google did not accept this copy of OpenDash\'s Google app. Check the client ID and secret under Advanced, or switch back to the built-in one.', 409);
  }
  if (status === 429 || status >= 500) return fail('PROVIDER_BUSY', 'Google is busy right now. Try again in a few minutes.', 503);
  return fail('PROVIDER_RESPONSE', 'Google could not finish the sign-in. Try again.', 502);
}

/** A token response -> the token fields to keep. old: the previous document (refresh-token rotation). */
export function parseTokens(doc, { now = Date.now(), old = null } = {}) {
  if (!doc || typeof doc.access_token !== 'string' || !doc.access_token || doc.access_token.length > 4096) throw fail('PROVIDER_RESPONSE', 'Google returned an unreadable sign-in. Try again.', 502);
  if (doc.token_type && String(doc.token_type).toLowerCase() !== 'bearer') throw fail('PROVIDER_RESPONSE', 'Google returned an unreadable sign-in. Try again.', 502);
  const refresh = typeof doc.refresh_token === 'string' && doc.refresh_token ? doc.refresh_token : (old && old.refresh_token) || null;
  const life = Math.max(60, Math.min(86400, Number(doc.expires_in) || 3600));
  return {
    access_token: doc.access_token,
    refresh_token: refresh,
    expires_at: now + life * 1000,
    scope: doc.scope ? grantedScopes(doc.scope) : (old && Array.isArray(old.scope) ? old.scope : []),
  };
}

/**
 * Who signed in, from the id token. It comes straight from Google's token
 * endpoint over TLS, which OpenID Connect Core 3.1.3.7 (6) accepts in place
 * of checking the signature; issuer, audience and expiry are still checked.
 */
export function identityFrom(idToken, { clientId, now = Date.now() } = {}) {
  const c = jwtClaims(idToken);
  const bad = () => fail('PROVIDER_RESPONSE', 'Google did not say which account signed in. Try again.', 502);
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(c.iss)) throw bad();
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(clientId)) throw bad();
  if (!(Number(c.exp) * 1000 > now - 5 * 60000)) throw bad();
  const sub = typeof c.sub === 'string' && /^[\x21-\x7e]{1,255}$/.test(c.sub) ? c.sub : null;
  const email = cleanEmail(c.email);
  if (!sub || !email) throw bad();
  const hd = typeof c.hd === 'string' && /^[A-Za-z0-9.-]{1,190}$/.test(c.hd) ? c.hd.toLowerCase() : null;
  return { sub, email, emailVerified: c.email_verified === true || c.email_verified === 'true', hd, name: cleanText(c.name, 120) };
}

/** A data API error -> an AccountError. */
export function apiError(status, doc = {}) {
  const err = (doc && doc.error) || {};
  const reasons = [...(Array.isArray(err.errors) ? err.errors.map((x) => x && x.reason) : []), ...(Array.isArray(err.details) ? err.details.map((x) => x && x.reason) : []), err.status].map(String);
  if (status === 401) return fail('NEEDS_SIGN_IN', 'Google needs you to sign in to this account again.', 401);
  if (status === 403 && reasons.some((r) => /insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(r))) {
    return fail('MISSING_PERMISSIONS', 'OpenDash is not allowed to read this yet. Sign in again and tick the box for it on Google\'s screen.', 403);
  }
  if (status === 403 && reasons.some((r) => /accessNotConfigured|SERVICE_DISABLED/i.test(r))) {
    return fail('NOT_CONFIGURED', 'This Google app does not have the Gmail or Calendar API switched on. If it is your own app, enable both APIs in Google Cloud.', 409);
  }
  if (status === 429 || (status === 403 && reasons.some((r) => /rateLimitExceeded|userRateLimitExceeded|RATE_LIMIT_EXCEEDED/i.test(r))) || status >= 500) {
    return fail('PROVIDER_BUSY', 'Google is busy right now. Try again in a few minutes.', 503);
  }
  return fail('PROVIDER_RESPONSE', 'Google could not complete the request. Try again.', 502);
}

// ─── Text helpers ─────────────────────────────────────────────────────────
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' };
/** Gmail snippets carry HTML entities (&#39; &amp;): decode them to plain text. */
export function decodeEntities(s) {
  return String(s == null ? '' : s).replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]{2,6});/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k[0] === '#') {
      const n = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(n) && n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
    }
    return ENTITIES[k] !== undefined ? ENTITIES[k] : m;
  });
}
/** '"Sam Lee" <sam@x.org>' / 'sam@x.org' -> {name, email}. */
export function parseFrom(s) {
  const t = String(s || '').trim();
  const m = /^(.*?)\s*<([^<>]+)>\s*$/.exec(t);
  const email = cleanEmail(m ? m[2] : t);
  let name = m ? m[1] : (email ? '' : t);
  name = cleanText(name.replace(/^"+|"+$/g, '').replace(/\\"/g, '"'), 80);
  return { name, email };
}
const toIso = (v) => {
  if (v == null || v === '') return null;
  const n = /^\d{10,13}$/.test(String(v)) ? Number(v) * (String(v).length <= 10 ? 1000 : 1) : Date.parse(String(v));
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : null;
};
const validDay = (d) => DAY_RE.test(d || '') && Number.isFinite(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const isDateTime = (s) => typeof s === 'string' && DT_RE.test(s) && validDay(s.slice(0, 10)) && Number.isFinite(Date.parse(s));

// ─── Gmail ────────────────────────────────────────────────────────────────
export const MAIL_LIMITS = Object.freeze({ pageSize: 100, pages: 5, threads: 300, parallel: 6, budgetMs: 90000 });

/** messages.list in the inbox since a moment (epoch seconds). */
export function gmailListUrl({ afterSec, pageToken, max = MAIL_LIMITS.pageSize }) {
  const q = new URLSearchParams({ q: `in:inbox after:${Math.max(0, Math.floor(afterSec))} -in:draft -in:chats`, maxResults: String(max), includeSpamTrash: 'false' });
  if (pageToken) q.set('pageToken', String(pageToken).slice(0, 200));
  return `${GMAIL}/messages?${q}`;
}
/** messages.get with headers and snippet only (never a body). */
export function gmailMessageUrl(id) {
  if (!GMAIL_ID_RE.test(String(id))) throw fail('PROVIDER_RESPONSE', 'Google returned an unreadable list.', 502);
  const q = new URLSearchParams([['format', 'metadata'], ['metadataHeaders', 'Subject'], ['metadataHeaders', 'From'], ['metadataHeaders', 'Date'], ['metadataHeaders', 'Message-ID'],
    ['fields', 'id,threadId,labelIds,snippet,internalDate,payload/headers']]);
  return `${GMAIL}/messages/${id}?${q}`;
}
/** messages.list pages (newest first) -> one entry per thread: its newest message and how many it has in the window. */
export function threadsFromList(pages, max = MAIL_LIMITS.threads) {
  const byThread = new Map();
  for (const p of pages) {
    for (const m of (p && Array.isArray(p.messages) ? p.messages : [])) {
      if (!m || !GMAIL_ID_RE.test(String(m.id)) || !GMAIL_ID_RE.test(String(m.threadId || m.id))) continue;
      const t = String(m.threadId || m.id);
      const hit = byThread.get(t);
      if (hit) hit.count++;
      else if (byThread.size < max) byThread.set(t, { threadId: t, messageId: String(m.id), count: 1 });
    }
  }
  return [...byThread.values()];
}
const header = (raw, name) => {
  const hs = raw && raw.payload && Array.isArray(raw.payload.headers) ? raw.payload.headers : [];
  const h = hs.find((x) => x && String(x.name).toLowerCase() === name.toLowerCase());
  return h ? String(h.value || '') : '';
};
/** A Gmail web link that opens the thread in THIS account (authuser), not whichever is signed in first. */
export function gmailLink(email, threadId) {
  return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(email)}#all/${encodeURIComponent(threadId)}`;
}
/** One messages.get answer -> a Message, or null. ctx: {id, sourceId, accountId, email, count}. */
export function parseGmailMessage(raw, { id, sourceId, accountId = 'default', email, count = 1 } = {}) {
  if (!raw || !GMAIL_ID_RE.test(String(raw.id)) || !GMAIL_ID_RE.test(String(raw.threadId || raw.id))) return null;
  const threadId = String(raw.threadId || raw.id);
  const date = toIso(raw.internalDate) || toIso(header(raw, 'Date'));
  if (!date) return null;
  const labels = Array.isArray(raw.labelIds) ? raw.labelIds.map(String) : [];
  const from = parseFrom(header(raw, 'From'));
  const cat = labels.find((l) => /^CATEGORY_[A-Z]+$/.test(l));
  const mid = cleanText(header(raw, 'Message-ID'), 200);
  return {
    id, ...(mid ? { messageId: mid } : {}), threadId, lastMessageId: String(raw.id), sourceId, accountId,
    subject: cleanText(header(raw, 'Subject'), 200) || '(no subject)', from,
    sender: from.name && from.email ? `${from.name} <${from.email}>` : from.email || from.name || 'Unknown sender',
    date, snippet: cleanText(decodeEntities(raw.snippet), 300),
    unread: labels.includes('UNREAD'), important: labels.includes('IMPORTANT'),
    ...(cat ? { category: cat.slice(9).toLowerCase() } : {}),
    count: Math.max(1, Number(count) || 1), link: email ? gmailLink(email, threadId) : '',
  };
}

// ─── Google Calendar ─────────────────────────────────────────────────────
export const CALENDAR_LIMITS = Object.freeze({ calendars: 40, requests: 60, events: 2000, budgetMs: 60000, pageSize: 250 });
const SWATCHES = ['blue', 'violet', 'green', 'teal', 'orange', 'pink', 'indigo', 'amber', 'red', 'slate'];
const RESPONSES = new Set(['accepted', 'declined', 'tentative', 'needsAction']);
const EVENT_TYPES = new Set(['default', 'outOfOffice', 'focusTime', 'workingLocation', 'birthday', 'fromGmail']);
const JOIN_HOSTS = [/^meet\.google\.com$/, /(^|\.)zoom\.us$/, /^teams\.microsoft\.com$/, /^teams\.live\.com$/, /(^|\.)webex\.com$/, /^whereby\.com$/, /^meet\.jit\.si$/];

export function calendarListUrl(pageToken) {
  const q = new URLSearchParams({ maxResults: '250', minAccessRole: 'reader', fields: 'items(id,summary,summaryOverride,primary,accessRole,timeZone,hidden,deleted),nextPageToken' });
  if (pageToken) q.set('pageToken', String(pageToken).slice(0, 200));
  return `${GCAL}/users/me/calendarList?${q}`;
}
export function eventsUrl(calendarId, { timeMin, timeMax, timeZone, pageToken }) {
  if (!CAL_ID_RE.test(String(calendarId))) throw fail('PROVIDER_RESPONSE', 'Google returned an unreadable calendar list.', 502);
  const q = new URLSearchParams({
    timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: String(CALENDAR_LIMITS.pageSize), showDeleted: 'false',
    fields: 'items(id,status,summary,start,end,location,htmlLink,hangoutLink,conferenceData(entryPoints(entryPointType,uri),conferenceSolution(name)),attendees(email,displayName,self,organizer,optional,responseStatus,resource),organizer(email,displayName,self),recurringEventId,iCalUID,eventType,transparency,colorId,updated),nextPageToken',
  });
  if (timeZone && TZ_RE.test(timeZone)) q.set('timeZone', timeZone);
  if (pageToken) q.set('pageToken', String(pageToken).slice(0, 200));
  return `${GCAL}/calendars/${encodeURIComponent(calendarId)}/events?${q}`;
}

/** 'sam.lee@example.org' as a calendar name -> 'Sam Lee' (as lib/calendar.mjs friendlyCalendarName). */
function friendlyName(summary, id) {
  let s = String(summary || '').trim();
  if (!s || s === id || cleanEmail(s)) {
    const addr = cleanEmail(s) ? s : String(id || '');
    if (/@(group|import)\.(v\.)?calendar\.google\.com$/.test(addr)) return s && !cleanEmail(s) ? s : 'Shared calendar';
    const local = addr.split('@')[0].replace(/[._+\-]+/g, ' ').replace(/\d+/g, ' ').trim();
    s = local ? local.split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Calendar';
  }
  s = s.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  return (s || 'Calendar').slice(0, 60);
}
/** One calendarList entry -> {googleId, name, googleName?, primary?, accessRole?, timeZone?} or null. */
export function parseCalendar(c) {
  if (!c || typeof c !== 'object' || c.deleted || c.hidden) return null;
  const id = String(c.id || '').trim();
  if (!CAL_ID_RE.test(id) || id === 'primary') return null;
  if (!['owner', 'writer', 'reader'].includes(c.accessRole)) return null;
  const raw = cleanText(c.summaryOverride || c.summary || '', 80);
  const out = { googleId: id, name: friendlyName(raw, id) };
  if (raw && raw !== out.name) out.googleName = raw;
  if (c.primary === true) out.primary = true;
  out.accessRole = c.accessRole;
  if (typeof c.timeZone === 'string' && TZ_RE.test(c.timeZone)) out.timeZone = c.timeZone;
  return out;
}
function safeJoinUrl(u) {
  try {
    const url = new URL(String(u || ''));
    if (url.protocol !== 'https:' || url.username || url.password || !JOIN_HOSTS.some((re) => re.test(url.hostname.toLowerCase()))) return '';
    return url.href.length <= 500 ? url.href : '';
  } catch { return ''; }
}
/** Google's event link, opened in THIS account (authuser). */
function calendarLink(u, email) {
  const s = String(u || '');
  if (!/^https:\/\/(www\.google\.com\/calendar\/|calendar\.google\.com\/)[A-Za-z0-9_\-./?=&%+]{1,600}$/.test(s)) return '';
  return email ? `${s}${s.includes('?') ? '&' : '?'}authuser=${encodeURIComponent(email)}` : s;
}
function when(w) {
  if (!w || typeof w !== 'object') return null;
  if (isDateTime(w.dateTime)) return typeof w.timeZone === 'string' && TZ_RE.test(w.timeZone) ? { dateTime: w.dateTime, timeZone: w.timeZone } : { dateTime: w.dateTime };
  if (typeof w.date === 'string' && validDay(w.date)) return { date: w.date };
  return null;
}
function person(p) {
  if (!p || typeof p !== 'object') return null;
  const email = cleanEmail(p.email), name = cleanText(p.displayName || '', 80);
  return email || name ? { email, name } : null;
}
/**
 * One Google event -> an Event (the Google preset's fields, lib/calendar.mjs),
 * or null to drop it (cancelled, unreadable). ctx: {id, calendarId, email}.
 * Descriptions are not read. An instance of a repeating event shares its
 * iCalUID with every other instance, so it is kept only on single events
 * (the cross-source de-dup in lib/sources.mjs keys on it).
 */
export function parseEvent(e, { id, calendarId, email } = {}) {
  if (!e || typeof e !== 'object' || !EVENT_ID_RE.test(String(e.id)) || e.status === 'cancelled') return null;
  const start = when(e.start);
  if (!start) return null;
  const allDay = !!start.date;
  let end = when(e.end);
  if (!end || !!end.date !== allDay || (allDay ? end.date <= start.date : Date.parse(end.dateTime) < Date.parse(start.dateTime))) {
    end = allDay ? { date: addDays(start.date, 1) } : { dateTime: start.dateTime };
  }
  const out = { id, calendarId, summary: cleanText(e.summary, 200) || '(no title)', start, end, allDay, status: e.status === 'tentative' ? 'tentative' : 'confirmed' };
  const loc = cleanText(e.location, 200);
  if (loc) out.location = loc;
  const conf = e.conferenceData || {};
  const video = Array.isArray(conf.entryPoints) ? conf.entryPoints.find((p) => p && p.entryPointType === 'video') : null;
  const joinUrl = safeJoinUrl(e.hangoutLink) || safeJoinUrl(video && video.uri);
  if (joinUrl) { out.conferenceUrl = joinUrl; out.conferenceName = cleanText(conf.conferenceSolution && conf.conferenceSolution.name, 40) || null; }
  const link = calendarLink(e.htmlLink, email);
  if (link) { out.htmlLink = link; out.link = link; }
  const attendees = [];
  let selfResponse = null;
  for (const a of Array.isArray(e.attendees) ? e.attendees : []) {
    if (!a || a.resource) continue;
    const p = person(a);
    if (!p) continue;
    const response = RESPONSES.has(a.responseStatus) ? a.responseStatus : 'needsAction';
    if (a.self) selfResponse = response;
    if (attendees.length < 60) attendees.push({ ...p, ...(a.self ? { self: true } : {}), ...(a.organizer ? { organizer: true } : {}), ...(a.optional ? { optional: true } : {}), response });
  }
  if (attendees.length) out.attendees = attendees;
  const org = person(e.organizer);
  if (org) { if (e.organizer.self === true) org.self = true; out.organizer = org; }
  if (selfResponse) out.selfResponse = selfResponse;
  if (typeof e.recurringEventId === 'string' && e.recurringEventId) out.recurring = true;
  else if (typeof e.iCalUID === 'string' && e.iCalUID.length <= 300 && /^[\x21-\x7e]+$/.test(e.iCalUID)) out.iCalUID = e.iCalUID;
  if (isDateTime(e.updated)) out.updated = e.updated;
  const camel = String(e.eventType || 'default');
  if (EVENT_TYPES.has(camel) && camel !== 'default') out.eventType = camel;
  if (typeof e.colorId === 'string' && /^\d{1,2}$/.test(e.colorId)) out.colorId = e.colorId;
  if (e.transparency === 'transparent') out.free = true;
  return out;
}

// ─── Migration (pure part) ───────────────────────────────────────────────
export const LEGACY_SCOPES = Object.freeze([GOOGLE_SCOPES.mail, GOOGLE_SCOPES.calendar]);
/**
 * The pre-2.15 single Google connection (google-client.json + google-tokens.json,
 * lib/google.mjs) -> {client, email, tokens} for one account, or null when
 * there is nothing usable (no refresh token, no client, no known address).
 * The refresh token only works with the client that issued it, so the old
 * client becomes the user's own Google app (Advanced).
 */
export function legacyGoogleConnection(clientDoc, tokensDoc) {
  let client = null;
  try { client = clientDoc ? parseGoogleClient(clientDoc) : null; } catch { client = null; }
  const t = tokensDoc && typeof tokensDoc === 'object' ? tokensDoc : null;
  const email = cleanEmail(t && t.account);
  if (!client || !t || typeof t.refresh_token !== 'string' || !t.refresh_token || !email) return null;
  return {
    client, email,
    tokens: {
      provider: 'google', clientId: client.clientId, sub: null, email, scope: [...LEGACY_SCOPES],
      access_token: typeof t.access_token === 'string' ? t.access_token : null,
      refresh_token: t.refresh_token, expires_at: Number(t.expires_at) || 0, legacy: true,
    },
  };
}

// ─── The Google app setting (provider config) ────────────────────────────
export const GOOGLE_APP_KEY = 'google-client';
/** The key holding the user's own Google app: 'google-client', else an old client_secret_* download, else null. */
async function appKey(store) {
  if (typeof store.has === 'function' ? await store.has(GOOGLE_APP_KEY) : (await store.get(GOOGLE_APP_KEY)) != null) return GOOGLE_APP_KEY;
  const keys = typeof store.list === 'function' ? await store.list().catch(() => []) : [];
  return keys.find((k) => !k.includes('/') && /^client_secret/i.test(k)) || null;
}
/** The user's own Google app on this device, or null (none, switched off, or unreadable). */
export async function readGoogleApp(store) {
  let key, raw;
  try { key = await appKey(store); if (!key) return null; raw = await store.get(key); } catch { return null; }
  if (!raw) return null;
  try { return parseGoogleClient(raw); } catch { return null; }
}

/**
 * googleConfig({store, env}) -> the provider's ctx.config (lib/accounts.mjs
 * loads it with this module). It reads the secret store at every call, so a
 * change is seen at once by every copy:
 *   clientId()          the client new sign-ins use: the user's own app (secret
 *                       'google-client', this device only) wins over the built-in
 *                       one (lib/accounts/shipped.mjs, or OPENDASH_GOOGLE_CLIENT_ID /
 *                       _SECRET in env)
 *   clientSecret(id)    the secret that belongs to that client id, else null
 *   knownClient(id)     may tokens from this client still be refreshed?
 *   describe()          {available, custom, builtIn, hasSecret, clientIdHint} (never a secret)
 *   save(input | null)  the user's own app (Google's JSON, {clientId, clientSecret}
 *                       or a bare id; the same id with no secret keeps the saved
 *                       one); null = the built-in app (a saved null also hides an
 *                       old client_secret_* download)
 * store: a SecretStore (get/set, optionally has/list).
 */
export function googleConfig({ store, env } = {}) {   // env: left out = shipped.mjs reads the environment itself
  if (!store || typeof store.get !== 'function') throw new Error('googleConfig needs a secret store');
  const builtIn = () => shippedGoogleClient(env);
  const own = () => readGoogleApp(store);
  const current = async () => (await own()) || builtIn();
  return {
    clientId: async () => { const c = await current(); return c ? c.clientId : null; },
    async clientSecret(id) {
      const o = await own();
      if (o && o.clientId === id) return o.clientSecret || null;
      const b = builtIn();
      return b && b.clientId === id ? b.clientSecret || null : null;
    },
    async knownClient(id) { const o = await own(), b = builtIn(); return !!id && ((!!o && o.clientId === id) || (!!b && b.clientId === id)); },
    async describe() {
      const o = await own(), b = builtIn(), c = o || b;
      return { available: !!c, custom: !!o, builtIn: !!b, hasSecret: !!(c && c.clientSecret), clientIdHint: o ? o.clientId.split('.')[0].slice(0, 10) + '…' : null };
    },
    async save(input) {
      if (input == null || input === '') { await store.set(GOOGLE_APP_KEY, null); return this.describe(); }
      const c = parseGoogleClient(input);
      const o = await own();
      const next = { clientId: c.clientId, clientSecret: c.clientSecret || (o && o.clientId === c.clientId ? o.clientSecret : null) || null };
      await store.set(GOOGLE_APP_KEY, next);
      return this.describe();
    },
  };
}

// ─── The provider ─────────────────────────────────────────────────────────
/** A tiny pool: run fn over items, at most n at a time, in order of results. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

/**
 * createGoogleProvider(ctx) -> the provider (docs/dev/ACCOUNTS.md section 6).
 * ctx.config (all optional functions):
 *   clientId(redirectKind)  -> the client ID new sign-ins use (the user's own wins over the shipped one)
 *   clientSecret(clientId)  -> that client's secret, or null (mobile clients have none)
 *   knownClient(clientId)   -> may tokens from this client still be refreshed? (default: it is the current one)
 * ctx.redirect is read at each sign-in (a getter: the port can change).
 */
export function createGoogleProvider(ctx) {
  const { fetch: fetchFn, vault, pending, accountIdFor } = ctx;
  const record = async (id) => { try { return typeof ctx.account === 'function' ? await ctx.account(id) : null; } catch { return null; } };
  const config = ctx.config || {};
  const now = typeof ctx.now === 'function' ? ctx.now : () => Date.now();
  const log = typeof ctx.log === 'function' ? ctx.log : () => {};
  // Config functions may be plain or async (googleConfig reads the secret store each time).
  const cfg = async (name, ...a) => { try { return typeof config[name] === 'function' ? await config[name](...a) : null; } catch { return null; } };
  const currentClient = async (kind) => { const id = await cfg('clientId', kind); return isGoogleClientId(id) ? id : null; };
  const secretFor = async (id) => { const s = await cfg('clientSecret', id); return isGoogleClientSecret(s) ? s : null; };
  const knownClient = async (id, kind) => (typeof config.knownClient === 'function' ? !!(await cfg('knownClient', id)) : id === (await currentClient(kind)));

  async function request(url, init = {}, timeoutMs = 20000) {
    if (!isAllowedRequest(url, init.method || 'GET')) throw fail('PROVIDER_RESPONSE', 'Google returned a link OpenDash does not follow.', 502);
    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(Math.max(1, Math.min(20000, timeoutMs))) : undefined;
    let r, text;
    try { r = await fetchFn(url, { ...init, redirect: 'error', ...(signal ? { signal } : {}) }); text = await r.text(); }
    catch { throw fail('PROVIDER_NETWORK', 'Google could not be reached. Check the internet connection and try again.', 502); }
    if (text.length > MAX_BYTES) throw fail('PROVIDER_LIMIT', 'Google returned too much data at once.', 502);
    let doc = {};
    try { doc = text ? JSON.parse(text) : {}; } catch { if (r.ok) throw fail('PROVIDER_RESPONSE', 'Google returned an unreadable answer. Try again.', 502); }
    return { ok: !!r.ok, status: Number(r.status) || 0, doc: doc && typeof doc === 'object' ? doc : {} };
  }
  const post = (url, body) => request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body });

  // A refusal is remembered on the token document, so later reads fail at once without asking Google.
  const SIGN_IN = () => fail('NEEDS_SIGN_IN', 'Google needs you to sign in to this account again.', 401);
  const refused = (old) => ({ ...old, needsAuth: true, access_token: null, expires_at: 0 });
  /** Google refused this access token even after a refresh: remember it (unless a newer sign-in replaced it meanwhile). */
  async function markNeedsAuth(accountId, token) {
    await vault.update(accountId, (old) => (old && old.access_token === token ? refused(old) : null)).catch(() => {});
  }

  /**
   * A valid access token. Refreshes when it is (nearly) expired, or when
   * `rejected` is the token Google just refused. One refresh at a time per
   * account (the vault queue: concurrent callers share it); a new refresh
   * token from Google replaces the old (rotation). A refusal (invalid_grant)
   * is written to the token document, so later reads fail without a request.
   */
  async function accessToken(accountId, { rejected = null } = {}) {
    return vault.refresh(accountId, async (old) => {
      if (!old || old.provider !== 'google' || !old.refresh_token || old.needsAuth) return { error: SIGN_IN() };
      if (old.access_token && old.expires_at > now() + 60000 && old.access_token !== rejected) return { value: old.access_token };
      if (!(await knownClient(old.clientId))) return { doc: refused(old), error: fail('NEEDS_SIGN_IN', 'OpenDash\'s Google app setting changed. Sign in to this account again.', 401) };
      const r = await post(GOOGLE_TOKEN_URL, tokenBody({ grant_type: 'refresh_token', refresh_token: old.refresh_token, client_id: old.clientId }, await secretFor(old.clientId)));
      if (!r.ok) {
        const e = tokenError(r.status, r.doc);
        if (e.code !== 'NEEDS_SIGN_IN') return { error: e };
        log('note', 'google: a saved sign-in was refused; the account needs signing in again');
        return { doc: refused(old), error: e };
      }
      const t = parseTokens(r.doc, { now: now(), old });
      if (t.refresh_token !== old.refresh_token) log('info', 'google: the refresh token was rotated');
      return { doc: { ...old, ...t, needsAuth: false }, value: t.access_token };
    });
  }

  const authGet = (url, token, timeoutMs) => request(url, { method: 'GET', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }, timeoutMs);
  /** GET one Google API URL for an account: after a 401, one retry with a refreshed token. */
  async function apiGet(accountId, url, timeoutMs) {
    let token = await accessToken(accountId);
    let r = await authGet(url, token, timeoutMs);
    if (r.status === 401) {
      const stale = token;
      token = await accessToken(accountId, { rejected: stale });
      // A refresh already under way may have handed back the refused token: ask once more.
      if (token === stale) token = await accessToken(accountId, { rejected: stale });
      r = await authGet(url, token, timeoutMs);
      if (r.status === 401) await markNeedsAuth(accountId, token);
    }
    if (!r.ok) throw apiError(r.status, r.doc);
    return r.doc;
  }

  async function tokenDoc(accountId, feature) {
    const doc = await vault.read(accountId);
    if (!doc || doc.provider !== 'google' || !doc.refresh_token || doc.needsAuth) throw SIGN_IN();
    if (feature && !featuresGranted(doc.scope)[feature]) {
      throw fail('MISSING_PERMISSIONS', feature === 'mail' ? 'OpenDash is not allowed to read this Gmail yet. Sign in again and tick "Read your email".' : 'OpenDash is not allowed to read this Google Calendar yet. Sign in again and tick "See your calendars".', 403);
    }
    return doc;
  }

  return {
    id: 'google',

    async configured() {
      const kind = ctx.redirect && ctx.redirect.kind;
      const id = await currentClient(kind);
      if (!id) return { ok: false, reason: 'Google sign-in is not set up in this copy of OpenDash. Use Advanced to add your own Google app.' };
      return { ok: true, ...(kind === 'loopback' && !(await secretFor(id)) ? { warning: 'This Google desktop app has no client secret; Google usually asks for one.' } : {}) };
    },

    async beginSignIn({ loginHint, kind, accountId, features } = {}) {
      const redirect = ctx.redirect;
      if (!redirect || typeof redirect.uri !== 'function') throw fail('NOT_CONFIGURED', 'OpenDash cannot receive a Google sign-in here.', 409);
      const clientId = await currentClient(redirect.kind);
      if (!clientId) throw fail('NOT_CONFIGURED', 'Google sign-in is not set up in this copy of OpenDash. Use Advanced to add your own Google app.', 409);
      const f = normaliseFeatures(features);
      const scopes = scopesFor(f);
      const hint = cleanEmail(loginHint);
      const { verifier, challenge } = await pkcePair();
      const redirectUri = redirect.uri();
      const state = pending.begin({ provider: 'google', verifier, redirectUri, clientId, features: f, scopes, loginHint: hint, accountId: accountId || null });
      return { url: buildAuthUrl({ clientId, redirectUri, scopes, state, challenge, loginHint: hint }), state, kind: kind || guessKind(hint) };
    },

    async handleCallback(params = {}, pend = {}) {
      if (params.error) {
        throw String(params.error) === 'access_denied'
          ? fail('OAUTH_CANCELLED', 'Google sign-in was cancelled. Start again when you are ready.', 400)
          : fail('OAUTH_CANCELLED', 'Google sign-in could not finish. Start again.', 400);
      }
      const code = String(params.code || '');
      if (!code || code.length > 4096) throw fail('OAUTH_CANCELLED', 'Google sign-in could not finish. Start again.', 400);
      if (!pend.verifier || !isGoogleClientId(pend.clientId)) throw fail('OAUTH_STATE', 'This sign-in expired or was not started from OpenDash. Start again.', 400);
      if (!(await knownClient(pend.clientId, ctx.redirect && ctx.redirect.kind))) throw fail('OAUTH_STATE', 'OpenDash\'s Google app setting changed during sign-in. Start again.', 400);
      const r = await post(GOOGLE_TOKEN_URL, tokenBody({ grant_type: 'authorization_code', code, client_id: pend.clientId, redirect_uri: pend.redirectUri, code_verifier: pend.verifier }, await secretFor(pend.clientId)));
      if (!r.ok) throw tokenError(r.status, r.doc);
      const t = parseTokens(r.doc, { now: now() });
      if (!t.refresh_token) throw fail('PROVIDER_RESPONSE', 'Google did not allow an ongoing connection. Remove OpenDash at myaccount.google.com/permissions, then add the account again.', 502);
      const who = identityFrom(r.doc.id_token, { clientId: pend.clientId, now: now() });
      const want = normaliseFeatures(pend.features);
      const got = featuresGranted(t.scope);
      const features = { mail: want.mail && got.mail, calendar: want.calendar && got.calendar };
      if (!features.mail && !features.calendar) throw fail('MISSING_PERMISSIONS', 'Google did not give OpenDash access to email or calendar. Start again and tick the boxes on Google\'s screen.', 403);
      let id = pend.accountId || null;
      if (id) {
        // "Sign in again" must come back as the same Google account (same sub; same address when no sub is known yet).
        const before = await vault.read(id).catch(() => null);
        const was = (before && cleanEmail(before.email)) || cleanEmail(pend.loginHint);
        if (before && before.sub ? before.sub !== who.sub : (was && was !== who.email)) {
          throw fail('WRONG_ACCOUNT', `You signed in as ${who.email}. To sign this account in again, choose ${was || 'the same account'} on Google's screen.`, 409);
        }
      } else id = await accountIdFor({ provider: 'google', email: who.email });
      await vault.write(id, { provider: 'google', clientId: pend.clientId, sub: who.sub, email: who.email, ...(who.hd ? { hd: who.hd } : {}), ...t, needsAuth: false });
      return { id, provider: 'google', email: who.email, displayName: who.name || '', kind: who.hd ? 'work' : 'personal', scopes: t.scope, features, status: 'connected' };
    },

    accessToken: (accountId) => accessToken(accountId),

    async fetchMail(accountId, { source = {}, days = 14, todayIso } = {}) {
      const doc = await tokenDoc(accountId, 'mail');
      const name = (await record(accountId))?.email || doc.email;
      // The mailbox switched off in the source (account chips): nothing is read.
      if ((source.accounts || []).some((a) => a && a.id === 'default' && a.enabled === false)) return { accounts: [{ id: 'default', name }], messages: [], count: 0, warnings: [] };
      const daysSafe = Math.min(60, Math.max(1, Math.round(Number(days)) || 14));
      const base = validDay(todayIso) ? Date.parse(todayIso + 'T00:00:00Z') : now();
      const afterSec = Math.floor((base - daysSafe * 86400000) / 1000);
      const deadline = now() + MAIL_LIMITS.budgetMs;
      const pages = [], warnings = [];
      let pageToken = null;
      for (let n = 0; n < MAIL_LIMITS.pages; n++) {
        const page = await apiGet(accountId, gmailListUrl({ afterSec, pageToken }));
        pages.push(page);
        pageToken = typeof page.nextPageToken === 'string' && page.nextPageToken ? page.nextPageToken : null;
        if (!pageToken) break;
      }
      let threads = threadsFromList(pages);
      if (pageToken || threads.length >= MAIL_LIMITS.threads) warnings.push(`Only the newest ${threads.length} conversations are shown.`);
      let failed = 0, late = false;
      const sid = String(source.id || 'google');
      const raws = await pool(threads, MAIL_LIMITS.parallel, async (t) => {
        if (now() > deadline) { late = true; return null; }
        try { return await apiGet(accountId, gmailMessageUrl(t.messageId)); }
        catch (e) { if (e.code === 'NEEDS_SIGN_IN' || e.code === 'MISSING_PERMISSIONS') throw e; failed++; return null; }
      });
      const messages = [];
      for (let i = 0; i < threads.length; i++) {
        if (!raws[i]) continue;
        const id = 'gm' + (await sha256Hex(sid + '|' + threads[i].threadId)).slice(0, 24);
        const m = parseGmailMessage(raws[i], { id, sourceId: sid, accountId: 'default', email: doc.email, count: threads[i].count });
        if (m) messages.push(m);
      }
      messages.sort((a, b) => b.date.localeCompare(a.date));
      if (failed) warnings.push(`${failed} message${failed === 1 ? '' : 's'} could not be read this time.`);
      if (late) warnings.push('Reading the inbox took too long; the rest comes with the next update.');
      return { accounts: [{ id: 'default', name }], messages, count: messages.length, warnings };
    },

    async fetchCalendar(accountId, { source = {}, from, to, timeZone } = {}) {
      if (!validDay(from) || !validDay(to) || from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000) throw fail('BAD_REQUEST', 'Choose a valid calendar date range of at most one year.', 400);
      const doc = await tokenDoc(accountId, 'calendar');
      const sid = String(source.id || 'google');
      const budget = { left: CALENDAR_LIMITS.requests, until: now() + CALENDAR_LIMITS.budgetMs };
      const ok = () => budget.left > 0 && now() < budget.until;
      const warnings = [];
      const cals = [];
      let pageToken = null;
      for (let n = 0; n < 3 && ok(); n++) {
        budget.left--;
        const page = await apiGet(accountId, calendarListUrl(pageToken));
        for (const raw of Array.isArray(page.items) ? page.items : []) { const c = parseCalendar(raw); if (c && cals.length < CALENDAR_LIMITS.calendars && !cals.some((x) => x.googleId === c.googleId)) cals.push(c); }
        pageToken = typeof page.nextPageToken === 'string' && page.nextPageToken ? page.nextPageToken : null;
        if (!pageToken) break;
      }
      // Primary first, group calendars last (as the Google preset orders them).
      const rank = (c) => (c.primary ? 0 : /@group\.(v\.)?calendar\.google\.com$/.test(c.googleId) ? 2 : 1);
      cals.sort((a, b) => rank(a) - rank(b));
      const timeMin = addDays(from, -1) + 'T00:00:00Z', timeMax = addDays(to, 2) + 'T00:00:00Z';
      const events = [];
      const calendars = [];
      for (const [i, c] of cals.entries()) {
        const key = 'c' + (await sha256Hex(c.googleId)).slice(0, 24);
        calendars.push({ id: key, name: c.name, ...(c.googleName ? { googleName: c.googleName } : {}), ...(c.primary ? { primary: true } : {}), accessRole: c.accessRole, ...(c.timeZone ? { timeZone: c.timeZone } : {}), color: SWATCHES[i % SWATCHES.length] });
        let token = null, more = false;
        do {
          if (!ok() || events.length >= CALENDAR_LIMITS.events) { warnings.push('The calendar update reached its limit. Switch off calendars you do not need to see more events.'); more = false; break; }
          budget.left--;
          const page = await apiGet(accountId, eventsUrl(c.googleId, { timeMin, timeMax, timeZone, pageToken: token }), budget.until - now());
          for (const raw of Array.isArray(page.items) ? page.items : []) {
            if (events.length >= CALENDAR_LIMITS.events) break;
            const id = 'gc' + (await sha256Hex(sid + '|' + c.googleId + '|' + String(raw && raw.id))).slice(0, 24);
            const ev = parseEvent(raw, { id, calendarId: `${sid}/${key}`, email: doc.email });
            if (ev) events.push(ev);
          }
          token = typeof page.nextPageToken === 'string' && page.nextPageToken ? page.nextPageToken : null;
          more = !!token;
        } while (more);
        if (!ok() || events.length >= CALENDAR_LIMITS.events) break;
      }
      return { calendars, events, count: events.length, warnings: [...new Set(warnings)] };
    },

    async disconnect(accountId) {
      pending.clear((v) => v.accountId === accountId);
      const doc = await vault.read(accountId).catch(() => null);
      await vault.remove(accountId);
      // Best effort: tell Google to forget this grant too (no tokens left on this device either way).
      if (doc && doc.provider === 'google' && (doc.refresh_token || doc.access_token)) {
        await post(GOOGLE_REVOKE_URL, tokenBody({ token: doc.refresh_token || doc.access_token })).catch(() => {});
      }
    },

    /** A Google Workspace admin can block apps it has not configured: where to ask. */
    async approvalHelp(account) {
      const domain = String(account && account.email || '').split('@').pop();
      const id = (await currentClient(ctx.redirect && ctx.redirect.kind)) || '';
      const body = `Hello,\n\nI would like to use OpenDash (a local, read-only dashboard) with my ${domain} Google account. Could you allow it in the Google Admin console (Security > Access and data control > API controls > Manage third-party app access), OAuth client ID:\n${id}\n\nIt asks only for read-only access to email and calendar.\n\nThank you.`;
      return { consentUrl: 'https://admin.google.com/ac/owl/list?tab=configuredApps', mailto: `mailto:?subject=${encodeURIComponent('Please allow OpenDash for Google')}&body=${encodeURIComponent(body)}`, tenant: domain };
    },
  };
}

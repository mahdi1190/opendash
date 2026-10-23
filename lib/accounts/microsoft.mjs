// lib/accounts/microsoft.mjs - the Microsoft provider: personal Outlook /
// Hotmail and work or school Microsoft 365, any number of accounts, read-only
// mail and calendar through Microsoft Graph (docs/dev/ACCOUNTS.md section 6).
//
// PURE JS (no node: imports; fetch, tokens and the redirect are adapters).
// Public native client: PKCE S256, no client secret, one-use state.
//
// Safety rules (unchanged from the single-account module):
//   - Graph is GET-only and confined to https://graph.microsoft.com/v1.0/me...
//   - redirect:'error'; paging links to another host or path are refused
//     before any token is sent; responses over 5 MB are refused
//   - never message bodies or attachments; calendar: 40 requests, 60 s, 1,000 events
//   - tokens only through the vault; messages to the user never repeat
//     Microsoft's error descriptions

import { fail, cleanText, cleanEmail, emailDomain, pkcePair, sha256Hex, jwtClaims } from './core.mjs';
import { isClientId } from './shipped.mjs';

export const PERSONAL_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';
export const BASE_SCOPES = Object.freeze(['openid', 'profile', 'offline_access', 'User.Read']);
export const FEATURE_SCOPES = Object.freeze({ mail: 'Mail.Read', calendar: 'Calendars.Read' });
// Reserved for sync storage (a later step, only when the user chooses it). Never requested here.
export const SYNC_SCOPE = 'Files.ReadWrite.AppFolder';
const LOGIN = 'https://login.microsoftonline.com/';
const GRAPH = 'https://graph.microsoft.com';

// ─── Personal or work, from the typed address ────────────────────────────
// Microsoft's own consumer domains, and public mail providers (a gmail.com
// address can be a personal Microsoft account, never a work directory).
const MS_CONSUMER = /^(?:hotmail|outlook|live|msn|windowslive|passport)\.(?:com|net|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/;
const PUBLIC_MAIL = /^(?:gmail\.com|googlemail\.com|yahoo\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})|ymail\.com|rocketmail\.com|icloud\.com|me\.com|mac\.com|aol\.(?:com|co\.uk)|proton\.me|protonmail\.com|pm\.me|gmx\.(?:com|de|net|co\.uk|at|ch)|web\.de|yandex\.(?:com|ru)|mail\.ru|zoho\.com|btinternet\.com|sky\.com|virginmedia\.com|talktalk\.net|qq\.com|163\.com)$/;
export function isPersonalDomain(domain) { const d = String(domain || '').toLowerCase(); return MS_CONSUMER.test(d) || PUBLIC_MAIL.test(d); }
/** 'personal' for consumer / public mail domains, else 'work'. */
export const guessKind = (email) => (isPersonalDomain(emailDomain(email)) ? 'personal' : 'work');
/** The authority to sign in at: /consumers for personal accounts, /organizations for work. */
export const authorityFor = (kind) => (kind === 'personal' ? 'consumers' : 'organizations');
export function scopesFor(features = {}) {
  return [...BASE_SCOPES, ...(features.mail !== false ? [FEATURE_SCOPES.mail] : []), ...(features.calendar !== false ? [FEATURE_SCOPES.calendar] : [])];
}

// ─── Microsoft sign-in errors -> plain language ──────────────────────────
const ADMIN = new Set([65001, 90094, 90095, 900941, 90099, 650056, 650052, 7000112, 50105, 90093]);
const DEVICE = new Set([53000, 53001, 53002, 53003, 530003, 530032]);
const WRONG_TYPE = new Set([50020, 500200, 50034, 9002331, 500201, 50177]);
const CANCEL = new Set([65004]);
const SETUP = new Set([700016, 50011, 500113, 7000215, 700025]);
/** AADSTS codes in a token-endpoint body or an authorize error. */
export function aadCodes({ error_codes, error_description, description } = {}) {
  const out = new Set();
  for (const c of Array.isArray(error_codes) ? error_codes : []) if (Number.isFinite(Number(c))) out.add(Number(c));
  for (const m of String(error_description || description || '').matchAll(/AADSTS(\d{4,9})/g)) out.add(Number(m[1]));
  return out;
}
/**
 * Classify a Microsoft sign-in or token error. Returns an AccountError
 * (never with Microsoft's own text). kind: what we asked for ('personal'|'work').
 */
export function classifyMicrosoftError({ error, error_description, error_codes, error_subcode } = {}, { kind = 'work', email = '', tenantId } = {}) {
  const codes = aadCodes({ error_codes, error_description });
  const has = (set) => [...codes].some((c) => set.has(c));
  if (has(DEVICE)) return fail('DEVICE_NOT_ALLOWED', 'Your organisation only allows this account on its own computers. Use your work computer, or ask your IT team.', 403);
  if (has(WRONG_TYPE)) {
    const retryKind = kind === 'work' ? 'personal' : 'work';
    return fail('WRONG_ACCOUNT_TYPE', retryKind === 'personal' ? 'This looks like a personal Microsoft account. Try again as a personal account.' : 'This looks like a work or school account. Try again as a work account.', 400, { retryKind });
  }
  if (has(ADMIN) || ((error === 'consent_required' || error === 'interaction_required') && kind === 'work')) {
    return fail('NEEDS_ADMIN_APPROVAL', 'Your organisation needs to approve OpenDash once.', 403, { account: { email: cleanEmail(email), kind: 'work', ...(tenantId ? { tenantId } : emailDomain(email) ? { tenantId: emailDomain(email) } : {}) } });
  }
  if (has(SETUP)) return fail('PROVIDER_SETUP', 'This copy of OpenDash is not set up for Microsoft sign-in yet. Ask the person who gave you OpenDash, or use your own app under Advanced.', 409);
  if (has(CANCEL) || error === 'access_denied' || error_subcode === 'cancel') return fail('OAUTH_CANCELLED', 'Microsoft sign-in was cancelled. Start again when you are ready.', 400);
  if (error === 'invalid_grant') return fail('NEEDS_SIGN_IN', 'Microsoft needs you to sign in again.', 401);
  if (error === 'temporarily_unavailable' || error === 'server_error') return fail('PROVIDER_BUSY', 'Microsoft is busy right now. Try again in a minute.', 503);
  return fail('OAUTH_CANCELLED', 'Microsoft sign-in could not finish. Start again.', 400);
}

const safeLink = (raw) => { try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password && /(^|\.)outlook\.(com|live\.com|office\.com|office365\.com)$/.test(u.hostname) ? u.href : ''; } catch { return ''; } };
const timeout = (ms) => (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(Math.max(1, Math.min(20000, ms))) : undefined);
const validDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && Number.isFinite(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;

/** The admin-consent link and a prefilled email to the IT admin. */
export function approvalHelp({ clientId, email = '', tenantId, displayName = '', redirectUri } = {}) {
  if (!isClientId(clientId)) return null;
  const tenant = (tenantId && /^[A-Za-z0-9.-]{1,100}$/.test(tenantId) ? tenantId : '') || emailDomain(email) || 'organizations';
  const q = new URLSearchParams({ client_id: clientId, ...(redirectUri ? { redirect_uri: redirectUri } : {}) });
  const consentUrl = `${LOGIN}${encodeURIComponent(tenant)}/adminconsent?${q}`;
  const subject = 'Please approve OpenDash (read-only) for my work email and calendar';
  const body = [
    'Hello,', '',
    'I would like to see my work email and calendar in OpenDash, a personal dashboard that runs on my own computer. Our Microsoft 365 needs an administrator to approve it once.', '',
    'It only asks to read: my basic profile (User.Read), my email (Mail.Read) and my calendar (Calendars.Read). It cannot send, change or delete anything, and nothing is sent to any OpenDash server.', '',
    'If you are an administrator, you can approve it here:', consentUrl, '',
    `Application (client) ID: ${clientId}`,
    'After approving, your browser may show a page that does not load. That is expected: the approval is done.', '',
    'Thank you' + (cleanText(displayName, 80) ? ',\n' + cleanText(displayName, 80) : ''),
  ].join('\n');
  const mailto = 'mailto:?' + new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20');
  return { consentUrl, mailto, tenant, subject, body };
}

/**
 * createMicrosoftProvider(ctx) -> provider (docs/dev/ACCOUNTS.md section 6).
 * ctx.config.clientId() -> the client ID to use for NEW sign-ins (the user's
 * own, else the shipped one). Existing tokens remember the ID they came from.
 */
export function createMicrosoftProvider(ctx) {
  const { vault, pending, log = () => {} } = ctx;
  const now = ctx.now || (() => Date.now());
  const fetchFn = ctx.fetch || globalThis.fetch;
  const clientId = () => { const c = ctx.config && typeof ctx.config.clientId === 'function' ? ctx.config.clientId() : null; return isClientId(c) ? c : null; };
  const account = async (id) => (typeof ctx.account === 'function' ? ctx.account(id) : null);

  async function request(url, options, timeoutMs = 20000) {
    let r;
    try { r = await fetchFn(url, { ...options, redirect: 'error', signal: timeout(timeoutMs) }); }
    catch { throw fail('PROVIDER_NETWORK', 'Microsoft could not be reached. Check the internet connection and try again.', 502); }
    let text;
    try { text = await r.text(); } catch { throw fail('PROVIDER_NETWORK', 'Microsoft could not be reached. Try again.', 502); }
    if (text.length > 5 * 1024 * 1024) throw fail('PROVIDER_LIMIT', 'Microsoft returned too much data.', 502);
    let doc;
    try { doc = text ? JSON.parse(text) : {}; } catch { throw fail('PROVIDER_RESPONSE', 'Microsoft returned an unreadable response.', 502); }
    return { ok: !!r.ok, status: r.status, doc: doc && typeof doc === 'object' ? doc : {} };
  }
  async function tokenRequest(authority, body, who) {
    const r = await request(`${LOGIN}${encodeURIComponent(authority)}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
    if (r.ok) return r.doc;
    if (r.status === 429) throw fail('PROVIDER_BUSY', 'Microsoft is busy right now. Try again in a minute.', 429);
    throw classifyMicrosoftError(r.doc, who);
  }
  /** Graph GET, only under /v1.0/me. 401 -> NEEDS_SIGN_IN; 403 -> NEEDS_ADMIN_APPROVAL on work accounts. */
  async function graph(path, token, headers = {}, timeoutMs, who = {}) {
    const u = new URL(path, GRAPH);
    if (u.origin !== GRAPH || u.username || u.password || !/^\/v1\.0\/me(?:\/?$|\/)/.test(u.pathname)) throw fail('PROVIDER_RESPONSE', 'Microsoft returned an unsafe data link.', 502);
    const r = await request(u.href, { method: 'GET', headers: { Authorization: 'Bearer ' + token, ...headers } }, timeoutMs);
    if (r.ok) return r.doc;
    if (r.status === 401) throw fail('NEEDS_SIGN_IN', 'Microsoft needs you to sign in again.', 401);
    if (r.status === 403) {
      const gcode = String(r.doc && r.doc.error && r.doc.error.code || '');
      if (who.kind === 'personal') throw fail('PROVIDER_REFUSED', 'Microsoft refused access to this account. Sign in again and allow the read-only permissions.', 403);
      throw fail('NEEDS_ADMIN_APPROVAL', 'Your organisation needs to approve OpenDash once.', 403, { graphCode: cleanText(gcode, 60) });
    }
    if (r.status === 404 && /MailboxNotEnabled|ResourceNotFound/i.test(String(r.doc && r.doc.error && r.doc.error.code || ''))) throw fail('PROVIDER_REFUSED', 'This mailbox cannot be read through Microsoft 365 (it may be on an older mail server).', 409);
    if (r.status === 429) throw fail('PROVIDER_BUSY', 'Microsoft is busy right now. Try again in a minute.', 429);
    throw fail('PROVIDER_RESPONSE', 'Microsoft could not complete the request. Try again.', 502);
  }
  const grantedOf = (doc) => String(doc.scope || '').split(/\s+/).filter(Boolean).map((s) => s.replace(/^https:\/\/graph\.microsoft\.com\//i, ''));
  function needScopes(features) { return ['user.read', ...(features.mail !== false ? ['mail.read'] : []), ...(features.calendar !== false ? ['calendars.read'] : [])]; }
  function tokenDoc(doc, base, features, who) {
    const granted = grantedOf(doc);
    const lower = granted.map((s) => s.toLowerCase());
    if (!doc.access_token) throw fail('PROVIDER_RESPONSE', 'Microsoft did not finish the sign-in. Try again.', 502);
    if (!needScopes(features).every((s) => lower.includes(s))) {
      if (who.kind === 'work') throw fail('NEEDS_ADMIN_APPROVAL', 'Your organisation needs to approve OpenDash once.', 403, { account: { email: cleanEmail(who.email), kind: 'work', ...(who.tenantId ? { tenantId: who.tenantId } : {}) } });
      throw fail('MISSING_PERMISSIONS', 'Allow the read-only email and calendar permissions to connect.', 400);
    }
    const t = {
      ...base, provider: 'microsoft', access_token: doc.access_token, refresh_token: doc.refresh_token || base.refresh_token,
      expires_at: now() + Math.max(60, Math.min(86400, Number(doc.expires_in) || 3600)) * 1000, scope: granted.filter((s) => !/^(openid|profile|offline_access|email)$/i.test(s)), needsAuth: false,
    };
    if (!t.refresh_token) throw fail('NEEDS_SIGN_IN', 'Microsoft did not allow an ongoing connection. Sign in again.', 401);
    return t;
  }

  async function beginSignIn({ loginHint, kind, accountId, features } = {}) {
    const id = clientId();
    if (!id) throw fail('NOT_CONFIGURED', 'Microsoft sign-in is not set up in this copy of OpenDash yet.', 409);
    const email = cleanEmail(loginHint);
    if (!email) throw fail('BAD_REQUEST', 'Type your full email address, for example name@outlook.com.', 400);
    const k = kind === 'personal' || kind === 'work' ? kind : guessKind(email);
    const f = { mail: !features || features.mail !== false, calendar: !features || features.calendar !== false };
    const authority = authorityFor(k);
    const redirectUri = ctx.redirect.uri();
    const scopes = scopesFor(f);
    const { verifier, challenge } = await pkcePair();
    const state = pending.begin({ provider: 'microsoft', verifier, redirectUri, clientId: id, authority, loginHint: email, kind: k, scopes, features: f, ...(accountId ? { accountId } : {}) });
    const q = new URLSearchParams({
      client_id: id, response_type: 'code', redirect_uri: redirectUri, response_mode: 'query', scope: scopes.join(' '), state,
      code_challenge: challenge, code_challenge_method: 'S256', login_hint: email,
    });
    return { url: `${LOGIN}${authority}/oauth2/v2.0/authorize?${q}`, state, kind: k, authority };
  }

  async function handleCallback(params = {}, pend) {
    if (!pend || pend.provider !== 'microsoft') throw fail('OAUTH_STATE', 'This sign-in expired or was not started from OpenDash. Start again.', 400);
    const who = { kind: pend.kind, email: pend.loginHint };
    if (params.error) throw classifyMicrosoftError(params, who);
    const code = String(params.code || '');
    if (!code || code.length > 8192) throw fail('OAUTH_CANCELLED', 'Microsoft sign-in was cancelled or could not finish. Start again.', 400);
    const doc = await tokenRequest(pend.authority, { client_id: pend.clientId, grant_type: 'authorization_code', code, redirect_uri: pend.redirectUri, code_verifier: pend.verifier, scope: pend.scopes.join(' ') }, who);
    const claims = jwtClaims(doc.id_token);
    const tid = typeof claims.tid === 'string' && /^[0-9a-f-]{36}$/i.test(claims.tid) ? claims.tid.toLowerCase() : null;
    const kind = tid ? (tid === PERSONAL_TENANT ? 'personal' : 'work') : pend.kind;
    const tokens = tokenDoc(doc, { clientId: pend.clientId, authority: kind === 'personal' ? 'consumers' : tid || pend.authority, ...(tid && kind === 'work' ? { tenantId: tid } : {}) }, pend.features, { ...who, kind, tenantId: tid });
    const me = await graph('/v1.0/me?$select=id,mail,userPrincipalName,displayName', tokens.access_token, {}, undefined, { kind });
    const email = cleanEmail(me.mail) || cleanEmail(me.userPrincipalName) || cleanEmail(claims.preferred_username) || cleanEmail(claims.email) || pend.loginHint;
    const id = pend.accountId && (await account(pend.accountId))?.email === email ? pend.accountId : await ctx.accountIdFor({ provider: 'microsoft', email, tenantId: tid && kind === 'work' ? tid : undefined });
    tokens.subject = await sha256Hex('ms|' + cleanText(me.id || claims.oid || email, 200));
    await vault.write(id, tokens);
    log('note', `accounts: Microsoft ${kind} sign-in finished`);
    return {
      id, provider: 'microsoft', email, displayName: cleanText(me.displayName || claims.name, 120), kind,
      ...(kind === 'work' && tid ? { tenantId: tid } : {}), scopes: tokens.scope, features: pend.features, status: 'connected', error: null,
    };
  }

  /** A valid access token for one account: refresh is serialized per account and rotates. */
  async function accessToken(accountId) {
    return vault.refresh(accountId, async (old) => {
      if (!old || !old.refresh_token) throw fail('NEEDS_SIGN_IN', 'Sign in to this Microsoft account again.', 401);
      if (old.needsAuth) throw fail('NEEDS_SIGN_IN', 'Microsoft needs you to sign in again.', 401);
      if (old.access_token && old.expires_at > now() + 60000) return { value: old.access_token };
      const who = { kind: old.authority === 'consumers' ? 'personal' : 'work', email: (await account(accountId))?.email || '', tenantId: old.tenantId };
      const features = { mail: (old.scope || []).some((s) => /^mail\.read$/i.test(s)) || !old.scope, calendar: (old.scope || []).some((s) => /^calendars\.read$/i.test(s)) || !old.scope };
      let doc;
      try {
        doc = await tokenRequest(old.authority || 'common', { client_id: old.clientId, grant_type: 'refresh_token', refresh_token: old.refresh_token, scope: ['offline_access', ...(old.scope && old.scope.length ? old.scope : ['User.Read', 'Mail.Read', 'Calendars.Read'])].join(' ') }, who);
      } catch (e) {
        // Marked in the same queued section (calling the vault from here would wait on itself).
        if (e.code === 'NEEDS_SIGN_IN') return { doc: { ...old, needsAuth: true }, error: e };
        throw e;
      }
      const t = tokenDoc(doc, old, features, who);
      return { doc: t, value: t.access_token };
    });
  }
  async function markSignIn(accountId, token) {
    await vault.update(accountId, (cur) => (cur && cur.access_token === token ? { ...cur, needsAuth: true } : null)).catch(() => {});
  }
  async function kindOf(accountId) { const a = await account(accountId); return a ? a.kind : 'work'; }
  async function g(accountId, token, path, headers, timeoutMs) {
    try { return await graph(path, token, headers, timeoutMs, { kind: await kindOf(accountId) }); }
    catch (e) { if (e.code === 'NEEDS_SIGN_IN') await markSignIn(accountId, token); throw e; }
  }
  const available = (budget) => !budget || (budget.left > 0 && now() < budget.until);
  async function pages(accountId, path, token, headers, budget) {
    const rows = []; let url = new URL(path, GRAPH), more = null;
    for (let n = 0; n < 20 && url; n++) {
      if (!available(budget)) return { rows, partial: true };
      if (budget) budget.left--;
      const doc = await g(accountId, token, url.href, headers, budget ? budget.until - now() : undefined);
      if (!Array.isArray(doc.value)) throw fail('PROVIDER_RESPONSE', 'Microsoft returned an unreadable list.', 502);
      rows.push(...doc.value.slice(0, 1000 - rows.length)); more = doc['@odata.nextLink'];
      if (!more || rows.length >= 1000) return { rows, partial: !!more };
      let next;
      try { next = new URL(more); } catch { throw fail('PROVIDER_RESPONSE', 'Microsoft returned an unsafe paging link.', 502); }
      if (next.origin !== GRAPH || next.pathname !== url.pathname || next.username || next.password) throw fail('PROVIDER_RESPONSE', 'Microsoft returned an unsafe paging link.', 502);
      url = next;
    }
    return { rows, partial: !!more };
  }

  /** Recent Inbox messages (previews only) in the snapshot shape of lib/inbox-sources.mjs. */
  async function fetchMail(accountId, { source = {}, days = 14, todayIso } = {}) {
    const acc = await account(accountId);
    const name = (acc && acc.email) || source.label || 'Outlook';
    if ((source.accounts || []).some((a) => a.id === 'default' && a.enabled === false)) return { accounts: [{ id: 'default', name }], messages: [], count: 0, warnings: [] };
    const token = await accessToken(accountId);
    const daysSafe = Math.min(30, Math.max(1, Number(days) || 14));
    const since = new Date((/^\d{4}-\d{2}-\d{2}$/.test(todayIso || '') ? Date.parse(todayIso + 'T00:00:00Z') : now()) - daysSafe * 86400000).toISOString();
    const q = new URLSearchParams({ '$select': 'id,internetMessageId,conversationId,subject,from,receivedDateTime,bodyPreview,isRead,importance,webLink', '$filter': 'receivedDateTime ge ' + since, '$orderby': 'receivedDateTime desc', '$top': '100' });
    const { rows, partial } = await pages(accountId, '/v1.0/me/mailFolders/inbox/messages?' + q, token);
    const messages = [];
    for (const m of rows) {
      if (!m || !m.id || !Number.isFinite(Date.parse(m.receivedDateTime))) continue;
      const from = { name: cleanText(m.from?.emailAddress?.name, 120), email: cleanText(m.from?.emailAddress?.address, 120).toLowerCase() };
      messages.push({
        id: 'ms' + (await sha256Hex(source.id + '|' + m.id)).slice(0, 24), messageId: cleanText(m.internetMessageId || m.id, 200), threadId: cleanText(m.conversationId, 120), sourceId: source.id, accountId: 'default',
        subject: cleanText(m.subject, 200) || '(no subject)', from, sender: from.name && from.email ? `${from.name} <${from.email}>` : from.email || from.name,
        date: new Date(m.receivedDateTime).toISOString(), snippet: cleanText(m.bodyPreview, 300), unread: !m.isRead, important: m.importance === 'high', count: 1, link: safeLink(m.webLink),
      });
    }
    return { accounts: [{ id: 'default', name }], messages, count: messages.length, warnings: partial ? ['Only the first 1,000 recent messages are shown.'] : [] };
  }

  /** Events from every calendar (recurring instances included) in the snapshot shape of lib/calendar-sources.mjs. */
  async function fetchCalendar(accountId, { source = {}, from, to } = {}) {
    if (!validDay(from) || !validDay(to) || from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000) throw fail('BAD_REQUEST', 'Choose a valid calendar date range of at most one year.', 400);
    const token = await accessToken(accountId), events = [], warnings = [], budget = { left: 40, until: now() + 60000 };
    const cals = await pages(accountId, '/v1.0/me/calendars?$select=id,name&$top=100', token, undefined, budget);
    const listed = cals.rows.slice(0, 40);
    const ids = [];
    for (const cal of listed) ids.push('c' + (await sha256Hex(cal.id)).slice(0, 24));
    for (let ci = 0; ci < listed.length; ci++) {
      const cal = listed[ci], calKey = ids[ci];
      if (!available(budget) || events.length >= 1000) { warnings.push('Calendar update reached its limit. Narrow the selected calendars to include more events.'); break; }
      if ((source.accounts || []).some((a) => a.id === calKey && a.enabled === false)) continue;
      const q = new URLSearchParams({ startDateTime: from + 'T00:00:00Z', endDateTime: new Date(Date.parse(to + 'T00:00:00Z') + 86400000).toISOString(), '$top': '100',
        '$select': 'id,subject,start,end,isAllDay,isCancelled,iCalUId,location,attendees,webLink,originalStartTimeZone' });
      const got = await pages(accountId, '/v1.0/me/calendars/' + encodeURIComponent(cal.id) + '/calendarView?' + q, token, { Prefer: 'outlook.timezone="UTC"' }, budget);
      if (got.partial) warnings.push('A busy calendar was limited to its first 1,000 events.');
      for (const raw of got.rows) {
        if (events.length >= 1000) { warnings.push('Only the first 1,000 calendar events are shown.'); break; }
        if (!raw || !raw.id || raw.isCancelled) continue;
        let times = raw;
        // All-day dates belong to their original calendar zone, not UTC.
        if (raw.isAllDay && raw.originalStartTimeZone && raw.originalStartTimeZone !== 'UTC') {
          if (!/^[A-Za-z0-9_ /()+:-]{1,100}$/.test(raw.originalStartTimeZone)) continue;
          if (!available(budget)) { warnings.push('Some all-day events could not be included within this update. Narrow the selected calendars.'); break; }
          budget.left--;
          times = await g(accountId, token, '/v1.0/me/events/' + encodeURIComponent(raw.id) + '?$select=start,end', { Prefer: `outlook.timezone="${raw.originalStartTimeZone}"` }, budget.until - now());
        }
        const date = (v) => { const value = String(v?.dateTime || ''); return raw.isAllDay ? { date: value.slice(0, 10) } : { dateTime: new Date(/(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : value + 'Z').toISOString() }; };
        let start, end;
        try { start = date(times.start); end = date(times.end); } catch { continue; }
        if (raw.isAllDay && (!validDay(start.date) || !validDay(end.date) || start.date >= end.date)) continue;
        if (!raw.isAllDay && !(Date.parse(end.dateTime) > Date.parse(start.dateTime))) continue;
        events.push({ id: 'ms' + (await sha256Hex(source.id + '|' + cal.id + '|' + raw.id)).slice(0, 24), summary: cleanText(raw.subject, 200) || '(no title)', start, end,
          calendarId: source.id + '/' + calKey, status: 'confirmed', iCalUID: cleanText(raw.iCalUId, 200), location: cleanText(raw.location?.displayName, 200), link: safeLink(raw.webLink),
          attendees: (raw.attendees || []).slice(0, 100).map((a) => ({ email: cleanText(a.emailAddress?.address, 120), displayName: cleanText(a.emailAddress?.name, 120), responseStatus: ({ accepted: 'accepted', declined: 'declined', tentativelyAccepted: 'tentative' })[a.status?.response] || 'needsAction' })) });
      }
    }
    return { calendars: listed.map((c, i) => ({ id: ids[i], name: cleanText(c.name, 60) || source.label || 'Calendar' })), events, count: events.length, warnings };
  }

  return {
    id: 'microsoft',
    async configured() { return clientId() ? { ok: true } : { ok: false, reason: 'Microsoft sign-in is not set up in this copy of OpenDash yet.' }; },
    beginSignIn, handleCallback, accessToken, fetchMail, fetchCalendar,
    async disconnect(accountId) { pending.clear((v) => v.accountId === accountId); await vault.remove(accountId); },
    async approvalHelp(acc) {
      let redirectUri;
      try { redirectUri = ctx.redirect && ctx.redirect.kind === 'loopback' ? ctx.redirect.uri() : undefined; } catch { redirectUri = undefined; }
      return approvalHelp({ clientId: clientId(), email: acc.email, tenantId: acc.tenantId, displayName: acc.displayName, redirectUri });
    },
  };
}

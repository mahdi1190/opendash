// Direct Microsoft Graph reads for personal Outlook/Hotmail and Microsoft365.
// Public native-app OAuth: /common, PKCE S256, one-use state, no client secret.
// Credentials stay in the selected data folder; no AI or shell commands.
import { randomBytes, createHash } from 'node:crypto';
import { join } from 'node:path';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { cleanText } from './calendar-jobkit.mjs';

export const MICROSOFT_SCOPES = Object.freeze(['offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read']);
const AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0/';
const GRAPH = 'https://graph.microsoft.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const services = new Map();
const fail = (code, message, status = 409) => Object.assign(new Error(message), { code, status });
const hash = s => createHash('sha256').update(String(s)).digest('hex').slice(0, 24);
const safeLink = raw => { try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password && /(^|\.)outlook\.(com|live\.com|office\.com|office365\.com)$/.test(u.hostname) ? u.href : ''; } catch { return ''; } };

export function createMicrosoft({ dataDir, fetchFn = fetch, now = () => Date.now() }) {
  const clientFile = join(dataDir, 'secrets', 'microsoft-client.json');
  const tokenFile = join(dataDir, 'secrets', 'microsoft-tokens.json');
  const states = new Map(); let generation = 0, refreshing = null;
  const read = file => readJson(file, { fallback: null }).catch(() => null);
  const client = async () => { const c = await read(clientFile); return c && UUID.test(c.clientId) ? c : null; };
  async function configure(clientId) {
    if (!UUID.test(String(clientId || ''))) throw fail('BAD_REQUEST', 'Enter the Microsoft application (client) ID.', 400);
    return withLock(clientFile, async () => {
      if ((await client())?.clientId === clientId) return { ...(await status()), changed: false };
      generation++; states.clear();
      await withLock(tokenFile, () => writeJson(tokenFile, null, { mode: 0o600 }));
      await writeJson(clientFile, { clientId }, { mode: 0o600 });
      return { ...(await status()), changed: true };
    });
  }
  async function status() {
    const c = await client(), t = await read(tokenFile);
    const connected = !!(c && t && t.clientId === c.clientId && t.refresh_token && !t.needsAuth);
    return { configured: !!c, connected, account: connected ? t.account || null : null, needsAuth: !!t?.needsAuth,
      supports: ['personal', 'work-school'], readOnly: true };
  }
  async function authUrl(redirectUri) {
    const c = await client(); if (!c) throw fail('NOT_CONFIGURED', 'Microsoft sign-in needs an app registration first. Open Microsoft connection setup.');
    const u = new URL(redirectUri);
    if (u.protocol !== 'http:' || u.hostname !== 'localhost' || u.pathname !== '/api/microsoft/callback' || u.search || u.hash) throw fail('BAD_REQUEST', 'Invalid Microsoft callback.', 400);
    for (const [s, v] of states) if (v.expires < now()) states.delete(s);
    while (states.size >= 20) states.delete(states.keys().next().value);
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url');
    states.set(state, { verifier, redirectUri, clientId: c.clientId, expires: now() + 600000, generation });
    const q = new URLSearchParams({ client_id: c.clientId, response_type: 'code', redirect_uri: redirectUri, response_mode: 'query',
      scope: MICROSOFT_SCOPES.join(' '), state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' });
    return AUTH + 'authorize?' + q;
  }
  async function request(url, options, timeoutMs = 20000) {
    let r;
    try { r = await fetchFn(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(Math.max(1, Math.min(20000, timeoutMs))) }); }
    catch { throw fail('MICROSOFT_NETWORK', 'Microsoft could not be reached. Try again.', 502); }
    let text; try { text = await r.text(); } catch { throw fail('MICROSOFT_NETWORK', 'Microsoft could not be reached. Try again.', 502); }
    if (text.length > 5 * 1024 * 1024) throw fail('MICROSOFT_LIMIT', 'Microsoft returned too much data.', 502);
    let doc; try { doc = JSON.parse(text); } catch { throw fail('MICROSOFT_RESPONSE', 'Microsoft returned an unreadable response.', 502); }
    if (!r.ok) throw fail(r.status === 401 || doc.error === 'invalid_grant' ? 'MICROSOFT_AUTH' : r.status === 403 ? 'MICROSOFT_CONSENT' : 'MICROSOFT_RESPONSE',
      r.status === 403 ? 'Microsoft access was refused. A work or school administrator may need to approve this connection.' : r.status === 401 || doc.error === 'invalid_grant' ? 'Microsoft needs you to sign in again.' : 'Microsoft could not complete the request. Try again.', r.status === 429 ? 429 : 502);
    return doc;
  }
  const tokenRequest = body => request(AUTH + 'token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
  async function graph(path, token, headers = {}, timeoutMs) {
    const u = new URL(path, GRAPH);
    if (u.origin !== GRAPH || u.username || u.password || !/^\/v1\.0\/me(?:\/?$|\/)/.test(u.pathname)) throw fail('MICROSOFT_RESPONSE', 'Microsoft returned an unsafe data link.', 502);
    try { return await request(u.href, { method: 'GET', headers: { Authorization: 'Bearer ' + token, ...headers } }, timeoutMs); }
    catch (e) {
      if (e.code === 'MICROSOFT_AUTH') await withLock(tokenFile, async () => { const t = await read(tokenFile); if (t?.access_token === token) await writeJson(tokenFile, { ...t, needsAuth: true }, { mode: 0o600 }); });
      throw e;
    }
  }
  function tokens(doc, c, old = {}) {
    const granted = String(doc.scope || '').split(/\s+/).map(s => s.replace(/^https:\/\/graph.microsoft.com\//, '').toLowerCase());
    if (!doc.access_token || !['user.read', 'mail.read', 'calendars.read'].every(s => granted.includes(s))) throw fail('MICROSOFT_CONSENT', 'Allow the requested read-only email and calendar permissions to connect.');
    const t = { ...old, clientId: c.clientId, access_token: doc.access_token, refresh_token: doc.refresh_token || old.refresh_token, expires_at: now() + Math.max(60, Math.min(86400, Number(doc.expires_in) || 3600)) * 1000, needsAuth: false };
    if (!t.refresh_token) throw fail('MICROSOFT_AUTH', 'Microsoft did not allow an ongoing connection. Sign in again.');
    return t;
  }
  async function callback({ state, code, error }) {
    const pending = states.get(String(state || '')); states.delete(String(state || ''));
    if (!pending || pending.expires < now() || pending.generation !== generation) throw fail('OAUTH_STATE', 'This sign-in expired or was not started from OpenDash. Start again.', 400);
    if (error || !code || String(code).length > 8192) throw fail('OAUTH_CANCELLED', 'Microsoft sign-in was cancelled or could not finish. Start again.', 400);
    const c = await client(); if (!c || c.clientId !== pending.clientId) throw fail('OAUTH_STATE', 'Microsoft setup changed. Start sign-in again.', 400);
    const t = tokens(await tokenRequest({ client_id: c.clientId, grant_type: 'authorization_code', code, redirect_uri: pending.redirectUri, code_verifier: pending.verifier }), c);
    const me = await graph('/v1.0/me?$select=id,mail,userPrincipalName', t.access_token);
    t.account = cleanText(me.mail || me.userPrincipalName, 120); t.accountId = cleanText(me.id, 120);
    if (pending.generation !== generation) throw fail('OAUTH_STATE', 'Microsoft connection changed. Start again.', 400);
    await withLock(tokenFile, () => { if (pending.generation !== generation) throw fail('OAUTH_STATE', 'Microsoft connection changed. Start again.', 400); return writeJson(tokenFile, t, { mode: 0o600 }); });
    return status();
  }
  async function accessToken() {
    if (refreshing) return refreshing;
    refreshing = withLock(tokenFile, async () => {
      const c = await client(), old = await read(tokenFile);
      if (!c || !old?.refresh_token || old.clientId !== c.clientId || old.needsAuth) throw fail('MICROSOFT_AUTH', 'Connect Microsoft in Connections first.');
      if (old.access_token && old.expires_at > now() + 60000) return old.access_token;
      try { const t = tokens(await tokenRequest({ client_id: c.clientId, grant_type: 'refresh_token', refresh_token: old.refresh_token, scope: MICROSOFT_SCOPES.join(' ') }), c, old); await writeJson(tokenFile, t, { mode: 0o600 }); return t.access_token; }
      catch (e) { if (e.code === 'MICROSOFT_AUTH') await writeJson(tokenFile, { ...old, needsAuth: true }, { mode: 0o600 }); throw e; }
    }).finally(() => { refreshing = null; });
    return refreshing;
  }
  const available = budget => !budget || (budget.left > 0 && Date.now() < budget.until);
  async function pages(path, token, headers, budget) {
    const rows = []; let url = new URL(path, GRAPH), more = null;
    for (let n = 0; n < 20 && url; n++) {
      if (!available(budget)) return { rows, partial: true };
      if (budget) budget.left--;
      const doc = await graph(url.href, token, headers, budget ? budget.until - Date.now() : undefined);
      if (!Array.isArray(doc.value)) throw fail('MICROSOFT_RESPONSE', 'Microsoft returned an unreadable list.', 502);
      rows.push(...doc.value.slice(0, 1000 - rows.length)); more = doc['@odata.nextLink'];
      if (!more || rows.length >= 1000) return { rows, partial: !!more };
      const next = new URL(more);
      if (next.origin !== GRAPH || next.pathname !== url.pathname || next.username || next.password) throw fail('MICROSOFT_RESPONSE', 'Microsoft returned an unsafe paging link.', 502);
      url = next;
    }
    return { rows, partial: !!more };
  }
  async function email(source, { days = 14, todayIso } = {}) {
    if ((source.accounts || []).some(a => a.id === 'default' && a.enabled === false)) return { accounts: [{ id: 'default', name: (await read(tokenFile))?.account || source.label }], messages: [], count: 0, warnings: [] };
    const token = await accessToken(); const t = await read(tokenFile);
    const daysSafe = Math.min(30, Math.max(1, Number(days) || 14));
    const since = new Date((/^\d{4}-\d{2}-\d{2}$/.test(todayIso || '') ? Date.parse(todayIso + 'T00:00:00Z') : now()) - daysSafe * 86400000).toISOString();
    const q = new URLSearchParams({ '$select': 'id,internetMessageId,conversationId,subject,from,receivedDateTime,bodyPreview,isRead,importance,webLink', '$filter': 'receivedDateTime ge ' + since, '$orderby': 'receivedDateTime desc', '$top': '100' });
    const { rows, partial } = await pages('/v1.0/me/mailFolders/inbox/messages?' + q, token);
    const accountOn = !(source.accounts || []).some(a => a.id === 'default' && a.enabled === false);
    const messages = accountOn ? rows.filter(m => m.id && Number.isFinite(Date.parse(m.receivedDateTime))).map(m => {
      const from = { name: cleanText(m.from?.emailAddress?.name, 120), email: cleanText(m.from?.emailAddress?.address, 120).toLowerCase() };
      return { id: 'ms' + hash(source.id + '|' + m.id), messageId: cleanText(m.internetMessageId || m.id, 200), threadId: cleanText(m.conversationId, 120), sourceId: source.id, accountId: 'default',
        subject: cleanText(m.subject, 200) || '(no subject)', from, sender: from.name && from.email ? `${from.name} <${from.email}>` : from.email || from.name,
        date: new Date(m.receivedDateTime).toISOString(), snippet: cleanText(m.bodyPreview, 300), unread: !m.isRead, important: m.importance === 'high', count: 1, link: safeLink(m.webLink) };
    }) : [];
    return { accounts: [{ id: 'default', name: t.account || source.label }], messages, count: messages.length, warnings: partial ? ['Only the first 1,000 recent messages are shown.'] : [] };
  }
  async function calendar(source, { from, to } = {}) {
    const validDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && Number.isFinite(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
    if (!validDay(from) || !validDay(to) || from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000) throw fail('BAD_REQUEST', 'Choose a valid calendar date range of at most one year.', 400);
    const token = await accessToken(), events = [], warnings = [], budget = { left: 40, until: Date.now() + 60000 };
    const cals = await pages('/v1.0/me/calendars?$select=id,name&$top=100', token, undefined, budget);
    for (const cal of cals.rows.slice(0, 40)) {
      if (!available(budget) || events.length >= 1000) { warnings.push('Calendar update reached its limit. Narrow the selected calendars to include more events.'); break; }
      const accountId = 'c' + hash(cal.id);
      if ((source.accounts || []).some(a => a.id === accountId && a.enabled === false)) continue;
      const q = new URLSearchParams({ startDateTime: from + 'T00:00:00Z', endDateTime: new Date(Date.parse(to + 'T00:00:00Z') + 86400000).toISOString(), '$top': '100',
        '$select': 'id,subject,start,end,isAllDay,isCancelled,iCalUId,location,attendees,webLink,originalStartTimeZone' });
      const got = await pages('/v1.0/me/calendars/' + encodeURIComponent(cal.id) + '/calendarView?' + q, token, { Prefer: 'outlook.timezone="UTC"' }, budget);
      if (got.partial) warnings.push('A busy calendar was limited to its first 1,000 events.');
      for (const raw of got.rows) {
        if (events.length >= 1000) { warnings.push('Only the first 1,000 calendar events are shown.'); break; }
        if (!raw.id || raw.isCancelled) continue;
        let times = raw;
        // All-day dates belong to their original calendar zone, not UTC.
        if (raw.isAllDay && raw.originalStartTimeZone && raw.originalStartTimeZone !== 'UTC') {
          if (!/^[A-Za-z0-9_ /()+:-]{1,100}$/.test(raw.originalStartTimeZone)) continue;
          if (!available(budget)) { warnings.push('Some all-day events could not be included within this update. Narrow the selected calendars.'); break; }
          budget.left--;
          times = await graph('/v1.0/me/events/' + encodeURIComponent(raw.id) + '?$select=start,end', token, { Prefer: `outlook.timezone="${raw.originalStartTimeZone}"` }, budget.until - Date.now());
        }
        const date = v => { const value = String(v?.dateTime || ''); return raw.isAllDay ? { date: value.slice(0, 10) } : { dateTime: new Date(/(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : value + 'Z').toISOString() }; };
        let start, end; try { start = date(times.start); end = date(times.end); } catch { continue; }
        if (raw.isAllDay && (!validDay(start.date) || !validDay(end.date) || start.date >= end.date)) continue;
        if (!raw.isAllDay && Date.parse(end.dateTime) <= Date.parse(start.dateTime)) continue;
        events.push({ id: 'ms' + hash(source.id + '|' + cal.id + '|' + raw.id), summary: cleanText(raw.subject, 200) || '(no title)', start, end,
          calendarId: source.id + '/' + accountId, status: 'confirmed', iCalUID: cleanText(raw.iCalUId, 200), location: cleanText(raw.location?.displayName, 200), link: safeLink(raw.webLink),
          attendees: (raw.attendees || []).slice(0, 100).map(a => ({ email: cleanText(a.emailAddress?.address, 120), displayName: cleanText(a.emailAddress?.name, 120), responseStatus: ({ accepted: 'accepted', declined: 'declined', tentativelyAccepted: 'tentative' })[a.status?.response] || 'needsAction' })) });
      }
      cal.accountId = accountId;
    }
    return { calendars: cals.rows.slice(0, 40).map(c => ({ id: c.accountId || 'c' + hash(c.id), name: cleanText(c.name, 60) || source.label })), events, count: events.length, warnings };
  }
  async function disconnect() { generation++; states.clear(); await withLock(tokenFile, () => writeJson(tokenFile, null, { mode: 0o600 })); return status(); }
  return { configure, status, authUrl, callback, email, calendar, disconnect };
}

export function microsoftFor(dataDir) { if (!services.has(dataDir)) services.set(dataDir, createMicrosoft({ dataDir })); return services.get(dataDir); }

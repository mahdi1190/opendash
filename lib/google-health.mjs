// Direct, read-only Google Health v4 integration. OAuth credentials, tokens and
// the small health snapshot live only in this integration's local secret files.
// https://developers.google.com/health/setup
// https://developers.google.com/health/endpoints
import { randomBytes, createHash } from 'node:crypto';
import { join } from 'node:path';
import { readJson, writeJson, withLock } from './fsutil.mjs';

export const GOOGLE_HEALTH_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
]);
export const GOOGLE_HEALTH_AVAILABILITY = 'Google is currently pausing new Google Health API projects. An approved Google Cloud project is required.';
const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const API = 'https://health.googleapis.com';
const services = new Map();
const fail = (code, message, status = 409) => Object.assign(new Error(message), { code, status });
const ID = /^[A-Za-z0-9-]{1,63}$/;
const validDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && Number.isFinite(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
const dayAfter = d => new Date(Date.parse(d + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
const civil = day => { const [year, month, date] = day.split('-').map(Number); return { date: { year, month, day: date }, time: {} }; };
const civilDay = value => { const d = value?.date; if (!d) return null; const out = `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`; return validDay(out) ? out : null; };
const count = n => n !== null && n !== undefined && n !== '' && Number.isSafeInteger(Number(n)) && Number(n) >= 0 ? Number(n) : null;
const permissionsFor = scopes => ({ activity: scopes?.includes(GOOGLE_HEALTH_SCOPES[0]) || false, sleep: scopes?.includes(GOOGLE_HEALTH_SCOPES[1]) || false });

function parseCredentials(input) {
  let doc = input;
  if (typeof doc === 'string') { try { doc = JSON.parse(doc); } catch { throw fail('BAD_REQUEST', 'Choose the credentials JSON downloaded from Google Cloud.', 400); } }
  const c = doc?.web || doc?.installed;
  if (!c || !/^[A-Za-z0-9_-]{8,200}\.apps\.googleusercontent\.com$/.test(c.client_id || '') || !/^[\x21-\x7e]{8,512}$/.test(c.client_secret || '')) {
    throw fail('BAD_REQUEST', 'Choose a Google OAuth client credentials JSON containing a client ID and client secret.', 400);
  }
  // Ignore downloaded endpoint URLs: credentials can never redirect tokens.
  return { clientId: c.client_id, clientSecret: c.client_secret };
}

export function createGoogleHealth({ dataDir, fetchFn = fetch, now = () => Date.now() }) {
  const clientFile = join(dataDir, 'secrets', 'google-health-client.json');
  const tokenFile = join(dataDir, 'secrets', 'google-health-tokens.json');
  const states = new Map();
  let generation = 0, refreshing = null, syncing = null, lastError = null;
  const read = file => readJson(file, { fallback: null });
  const client = async () => { const c = await read(clientFile); return c?.clientId && c?.clientSecret && c?.revision ? c : null; };
  const changed = () => fail('GOOGLE_HEALTH_CHANGED', 'Google Health connection changed. Try again.', 409);
  const current = (c, t) => !!(c && t?.revision === c.revision && t?.refresh_token && ID.test(t?.identity?.healthUserId || ''));

  async function status({ redirectUri } = {}) {
    const c = await client(), t = await read(tokenFile), hasAccount = current(c, t);
    return { configured: !!c, connected: hasAccount && !t.needsAuth, account: hasAccount ? 'Google Health' : null,
      identity: hasAccount ? { healthUserId: t.identity.healthUserId, ...(t.identity.legacyUserId ? { legacyUserId: t.identity.legacyUserId } : {}) } : null,
      permissions: permissionsFor(hasAccount ? t.scopes : []), needsAuth: hasAccount && !!t.needsAuth,
      lastSync: hasAccount ? t.lastSync || null : null, snapshot: hasAccount && !t.needsAuth ? t.snapshot || null : null,
      error: lastError || (hasAccount ? t.error || null : null), readOnly: true, availabilityNotice: GOOGLE_HEALTH_AVAILABILITY,
      ...(redirectUri ? { redirectUri } : {}) };
  }

  async function configure(credentials) {
    const parsed = parseCredentials(credentials);
    return withLock(clientFile, async () => {
      const previous = await client();
      if (previous?.clientId === parsed.clientId && previous.clientSecret === parsed.clientSecret) return { ...(await status()), changed: false };
      generation++; states.clear(); lastError = null;
      await writeJson(tokenFile, null, { mode: 0o600 });
      await writeJson(clientFile, { ...parsed, revision: randomBytes(16).toString('hex') }, { mode: 0o600 });
      return { ...(await status()), changed: true };
    });
  }

  async function authUrl(redirectUri) {
    const c = await client();
    if (!c) throw fail('NOT_CONFIGURED', 'Add Google Health OAuth credentials in Connections first.');
    let u; try { u = new URL(redirectUri); } catch { throw fail('BAD_REQUEST', 'Invalid Google Health callback.', 400); }
    if (u.protocol !== 'http:' || u.hostname !== 'localhost' || u.username || u.password || u.pathname !== '/api/google-health/callback' || u.search || u.hash) throw fail('BAD_REQUEST', 'Invalid Google Health callback.', 400);
    for (const [s, p] of states) if (p.expires <= now()) states.delete(s);
    while (states.size >= 20) states.delete(states.keys().next().value);
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url');
    states.set(state, { verifier, redirectUri, revision: c.revision, generation, expires: now() + 600000 });
    lastError = null;
    return AUTH + '?' + new URLSearchParams({ client_id: c.clientId, redirect_uri: redirectUri, response_type: 'code',
      scope: GOOGLE_HEALTH_SCOPES.join(' '), access_type: 'offline', prompt: 'consent select_account', state,
      code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') });
  }

  async function request(url, options) {
    let response, text;
    try { response = await fetchFn(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) }); text = await response.text(); }
    catch { throw fail('GOOGLE_HEALTH_NETWORK', 'Google Health could not be reached. Try again.', 502); }
    if (text.length > 5 * 1024 * 1024) throw fail('GOOGLE_HEALTH_LIMIT', 'Google Health returned too much data.', 502);
    let doc; try { doc = JSON.parse(text); } catch { throw fail('GOOGLE_HEALTH_RESPONSE', 'Google Health returned an unreadable response.', 502); }
    if (!response.ok) {
      const reason = Array.isArray(doc?.error?.details) ? doc.error.details.find(d => typeof d.reason === 'string')?.reason : '';
      if (reason === 'ACCOUNT_NOT_LINKED') throw fail('ACCOUNT_NOT_LINKED', 'Open the Google Health mobile app and link this Google Account, then connect again.', 400);
      if (reason === 'MISSING_OAUTH_SCOPE') throw fail('GOOGLE_HEALTH_SCOPE', 'A Google Health read permission was removed. Reconnect to allow it again.', 403);
      if (response.status === 401 || doc?.error === 'invalid_grant') throw fail('GOOGLE_HEALTH_AUTH', 'Google Health needs you to sign in again.', 401);
      if (response.status === 403) throw fail('GOOGLE_HEALTH_ACCESS', 'Google Health access was refused. Check API access and consent in Google Cloud. ' + GOOGLE_HEALTH_AVAILABILITY, 403);
      if (response.status === 429) throw fail('GOOGLE_HEALTH_RATE_LIMIT', 'Google Health is busy. Try syncing again later.', 429);
      if (doc?.error === 'invalid_client') throw fail('GOOGLE_HEALTH_CLIENT', 'Google rejected these OAuth credentials. Download the client credentials again from Google Cloud.', 400);
      throw fail('GOOGLE_HEALTH_RESPONSE', 'Google Health could not complete the request. Check your Google Cloud setup and try again.', 502);
    }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw fail('GOOGLE_HEALTH_RESPONSE', 'Google Health returned an unreadable response.', 502);
    return doc;
  }
  const tokenRequest = (c, body) => request(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...body }) });
  const health = (path, accessToken, body) => {
    const u = new URL(path, API);
    if (u.origin !== API || !u.pathname.startsWith('/v4/users/me/') || u.username || u.password) throw fail('GOOGLE_HEALTH_RESPONSE', 'Google Health returned an unsafe data link.', 502);
    // POST is used only for the documented read-only daily aggregation query.
    if (body && u.pathname !== '/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp') throw fail('GOOGLE_HEALTH_RESPONSE', 'Unsupported Google Health request.', 502);
    return request(u.href, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  };

  function tokens(doc, c, old = {}) {
    const scopes = typeof doc.scope === 'string' ? doc.scope.split(/\s+/).filter(s => GOOGLE_HEALTH_SCOPES.includes(s)) : old.scopes || [];
    if (!scopes.length) throw fail('GOOGLE_HEALTH_PERMISSIONS', 'Allow steps or sleep read access on the Google consent screen to connect.', 400);
    if (typeof doc.access_token !== 'string' || !doc.access_token || doc.access_token.length > 16384 || (doc.token_type && doc.token_type.toLowerCase() !== 'bearer')) throw fail('GOOGLE_HEALTH_RESPONSE', 'Google returned an invalid sign-in response.', 502);
    const t = { ...old, revision: c.revision, access_token: doc.access_token, refresh_token: doc.refresh_token || old.refresh_token, scopes,
      expires_at: now() + Math.max(1, Math.min(86400, Number(doc.expires_in) || 3600)) * 1000, needsAuth: false, error: null };
    if (typeof t.refresh_token !== 'string' || !t.refresh_token || t.refresh_token.length > 16384) throw fail('GOOGLE_HEALTH_AUTH', 'Google did not grant an ongoing connection. Connect again and allow offline access.', 400);
    return t;
  }
  function identityOf(doc) {
    if (!ID.test(doc.healthUserId || '')) throw fail('GOOGLE_HEALTH_RESPONSE', 'Google Health did not return a linked health account.', 502);
    return { healthUserId: doc.healthUserId, ...(ID.test(doc.legacyUserId || '') ? { legacyUserId: doc.legacyUserId } : {}) };
  }

  async function callback({ state, code, error }) {
    const key = String(state || ''), pending = states.get(key); states.delete(key);
    if (!pending || pending.expires <= now() || pending.generation !== generation) throw fail('OAUTH_STATE', 'This sign-in expired or was not started from OpenDash. Start again.', 400);
    try {
      if (error || !code || String(code).length > 8192) throw fail('OAUTH_CANCELLED', 'Google Health sign-in was cancelled or could not finish. Start again.', 400);
      const c = await client(); if (!c || c.revision !== pending.revision) throw changed();
      const t = tokens(await tokenRequest(c, { grant_type: 'authorization_code', code, redirect_uri: pending.redirectUri, code_verifier: pending.verifier }), c);
      // OAuth alone does not prove this Google Account has a Health profile.
      t.identity = identityOf(await health('/v4/users/me/identity', t.access_token));
      t.connectionId = randomBytes(16).toString('hex');
      await withLock(clientFile, async () => {
        if (pending.generation !== generation || (await client())?.revision !== pending.revision) throw changed();
        generation++; states.clear();
        await writeJson(tokenFile, t, { mode: 0o600 }); lastError = null;
      });
      return status();
    } catch (e) { if (pending.generation === generation) lastError = e.code ? e.message : 'Google Health could not connect. Try again.'; throw e; }
  }

  async function access() {
    if (refreshing) return refreshing;
    const epoch = generation;
    refreshing = withLock(clientFile, async () => {
      const c = await client(), old = await read(tokenFile);
      if (epoch !== generation) throw changed();
      if (!current(c, old) || old.needsAuth) throw fail('GOOGLE_HEALTH_AUTH', 'Connect Google Health in Connections first.', 401);
      let t = old;
      if (!old.access_token || old.expires_at <= now() + 60000) {
        try {
          t = tokens(await tokenRequest(c, { grant_type: 'refresh_token', refresh_token: old.refresh_token }), c, old);
          if (epoch !== generation) throw changed();
          await writeJson(tokenFile, t, { mode: 0o600 });
        } catch (e) {
          if (epoch === generation && e.code === 'GOOGLE_HEALTH_AUTH') await writeJson(tokenFile, { ...old, needsAuth: true, error: e.message }, { mode: 0o600 });
          throw e;
        }
      }
      return { token: t.access_token, scopes: t.scopes, revision: c.revision, connectionId: t.connectionId, generation: epoch, identity: t.identity };
    }).finally(() => { refreshing = null; });
    return refreshing;
  }

  async function sync({ today } = {}) {
    if (today !== undefined && !validDay(today)) throw fail('BAD_REQUEST', 'Choose a valid sync date.', 400);
    if (syncing) return syncing;
    syncing = syncOnce(today).finally(() => { syncing = null; });
    return syncing;
  }
  async function syncOnce(today) {
    let session;
    try {
      session = await access();
      const endDay = today || new Date(now()).toISOString().slice(0, 10);
      const from = new Date(Date.parse(endDay + 'T00:00:00Z') - 6 * 86400000).toISOString().slice(0, 10), to = dayAfter(endDay);
      const permissions = permissionsFor(session.scopes), warnings = [], steps = [], sleep = [];
      const readPermitted = async (scope, path, body) => {
        try { return await health(path, session.token, body); }
        catch (e) {
          if (e.code !== 'GOOGLE_HEALTH_SCOPE') throw e;
          session.scopes = session.scopes.filter(s => s !== scope);
          warnings.push((scope === GOOGLE_HEALTH_SCOPES[0] ? 'Steps' : 'Sleep') + ' permission was removed. Reconnect to allow it again.');
          return null;
        }
      };
      const identity = identityOf(await health('/v4/users/me/identity', session.token));
      if (identity.healthUserId !== session.identity.healthUserId) throw fail('GOOGLE_HEALTH_AUTH', 'Google Health account changed. Connect again.', 401);
      if (permissions.activity) {
        const doc = await readPermitted(GOOGLE_HEALTH_SCOPES[0], '/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp', { range: { start: civil(from), end: civil(to) }, windowSizeDays: 1, pageSize: 100 }) || {};
        if (doc.rollupDataPoints !== undefined && !Array.isArray(doc.rollupDataPoints)) throw fail('GOOGLE_HEALTH_RESPONSE', 'Google Health returned unreadable step data.', 502);
        for (const row of (doc.rollupDataPoints || []).slice(0, 100)) {
          const date = civilDay(row.civilStartTime), value = count(row.steps?.countSum);
          if (date && date >= from && date < to && value !== null) steps.push({ date, count: value });
        }
        if (doc.nextPageToken) warnings.push('Some step data was limited. Try syncing a shorter period later.');
      } else warnings.push('Steps permission was not granted. Reconnect to add steps.');
      if (permissions.sleep) {
        let pageToken = '';
        const seen = new Set();
        for (let page = 0; page < 4; page++) {
          const q = new URLSearchParams({ filter: `sleep.interval.civil_end_time >= "${from}" AND sleep.interval.civil_end_time < "${to}"`, pageSize: '25', ...(pageToken ? { pageToken } : {}) });
          const doc = await readPermitted(GOOGLE_HEALTH_SCOPES[1], '/v4/users/me/dataTypes/sleep/dataPoints:reconcile?' + q);
          if (!doc) { sleep.length = 0; break; }
          if (doc.dataPoints !== undefined && !Array.isArray(doc.dataPoints)) throw fail('GOOGLE_HEALTH_RESPONSE', 'Google Health returned unreadable sleep data.', 502);
          for (const row of (doc.dataPoints || []).slice(0, 25)) {
            const s = row.sleep, start = s?.interval?.startTime, end = s?.interval?.endTime, minutesAsleep = count(s?.summary?.minutesAsleep);
            if (Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && Date.parse(end) > Date.parse(start)) {
              const key = start + '|' + end;
              if (!seen.has(key)) { seen.add(key); sleep.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString(), minutesAsleep }); }
            }
          }
          pageToken = typeof doc.nextPageToken === 'string' ? doc.nextPageToken : '';
          if (!pageToken) break;
          if (pageToken.length > 8192) throw fail('GOOGLE_HEALTH_RESPONSE', 'Google Health returned an invalid page token.', 502);
          if (page === 3) warnings.push('Sleep sync was limited to 100 recent sessions.');
        }
      } else warnings.push('Sleep permission was not granted. Reconnect to add sleep.');
      const snapshot = { from, to: endDay, steps: steps.sort((a, b) => a.date.localeCompare(b.date)), sleep: sleep.sort((a, b) => b.end.localeCompare(a.end)), warnings };
      await withLock(clientFile, async () => {
        const c = await client(), t = await read(tokenFile);
        if (session.generation !== generation || !current(c, t) || t.revision !== session.revision || t.connectionId !== session.connectionId) throw changed();
        await writeJson(tokenFile, { ...t, scopes: session.scopes, needsAuth: !session.scopes.length, snapshot, lastSync: new Date(now()).toISOString(),
          error: session.scopes.length ? null : 'Google Health read permissions were removed. Reconnect to allow steps or sleep again.' }, { mode: 0o600 }); lastError = null;
      });
      return { ok: true, ...(await status()) };
    } catch (e) {
      if (!session || session.generation === generation) {
        lastError = e.code ? e.message : 'Google Health could not sync. Try again.';
        if (session && ['GOOGLE_HEALTH_AUTH', 'GOOGLE_HEALTH_SCOPE', 'ACCOUNT_NOT_LINKED'].includes(e.code)) await withLock(clientFile, async () => {
          const t = await read(tokenFile);
          if (session.generation === generation && t?.connectionId === session.connectionId) await writeJson(tokenFile, { ...t, needsAuth: true, error: lastError }, { mode: 0o600 });
        });
      }
      throw e;
    }
  }

  async function disconnect() {
    // Invalidate pending and in-flight work before waiting for the disk lock.
    generation++; states.clear(); lastError = null;
    await withLock(clientFile, async () => {
      const c = await client();
      await writeJson(tokenFile, null, { mode: 0o600 });
      if (c) await writeJson(clientFile, { ...c, revision: randomBytes(16).toString('hex') }, { mode: 0o600 });
    });
    return status();
  }
  return { configure, status, authUrl, callback, sync, disconnect };
}

export function googleHealthFor(dataDir) {
  if (!services.has(dataDir)) services.set(dataDir, createGoogleHealth({ dataDir }));
  return services.get(dataDir);
}

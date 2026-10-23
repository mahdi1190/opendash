// The Google provider (lib/accounts/google.mjs) against synthetic Google
// responses only: no network, no real accounts, no files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  createGoogleProvider, scopesFor, featuresGranted, normaliseFeatures, buildAuthUrl, isAllowedRequest, parseGoogleClient,
  tokenError, apiError, parseTokens, identityFrom, decodeEntities, parseFrom, threadsFromList, parseGmailMessage, gmailMessageUrl,
  eventsUrl, parseCalendar, parseEvent, legacyGoogleConnection, GOOGLE_SCOPES, GOOGLE_TOKEN_URL, GOOGLE_REVOKE_URL, LEGACY_SCOPES,
} from '../lib/accounts/google.mjs';
import { createAccounts, createVault, createPendingStore, memorySecretStore, loopbackRedirect, customSchemeRedirect } from '../lib/accounts/core.mjs';
import { shippedGoogleClient, SHIPPED } from '../lib/accounts/shipped.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT = 'synthetic-desktop-1234.apps.googleusercontent.com';
const SECRET = 'GOCSPX-synthetic-secret';
const MOBILE = 'synthetic-ios-5678.apps.googleusercontent.com';
const NOW0 = Date.UTC(2026, 9, 23, 12, 0, 0);
const CAL = GOOGLE_SCOPES.calendar, MAIL = GOOGLE_SCOPES.mail;
const atGmail = (local) => `${local}@gmail.com`;   // a public-mail address (personal), built so no address is written out

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const idToken = (claims) => `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: 'https://accounts.google.com', aud: CLIENT, exp: Math.floor(NOW0 / 1000) + 3600, ...claims })}.c2lnbmF0dXJl`;
const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const form = (init) => Object.fromEntries(new URLSearchParams(String(init.body || '')));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const s256 = (v) => createHash('sha256').update(v).digest('base64url');

/** A fake Google: token endpoint + Gmail + Calendar, scripted per test. Every URL must pass the allow-list. */
function fakeGoogle(opts = {}) {
  const calls = [];
  const people = opts.people || {};                 // refresh/access token -> {sub, email}
  const state = { refreshes: 0, rotate: false, deny: new Set(), exchange: null };
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    assert.ok(isAllowedRequest(url, init.method || 'GET'), 'request outside the allow-list: ' + (init.method || 'GET') + ' ' + url);
    assert.equal(init.redirect, 'error', 'redirects are never followed');
    const u = new URL(url);
    if (u.href === GOOGLE_TOKEN_URL) {
      const f = form(init);
      if (f.grant_type === 'authorization_code') return state.exchange ? state.exchange(f) : reply({ error: 'invalid_grant' }, 400);
      state.refreshes++;
      if (state.deny.has(f.refresh_token)) return reply({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, 400);
      const who = people[f.refresh_token];
      if (!who) return reply({ error: 'invalid_grant' }, 400);
      const access = `at-${who.email}-${state.refreshes}`;
      people[access] = who;
      return reply({ access_token: access, expires_in: 3599, token_type: 'Bearer', scope: who.scope || `openid ${CAL} ${MAIL}`, ...(state.rotate ? { refresh_token: f.refresh_token + '-r' } : {}) });
    }
    if (u.href === GOOGLE_REVOKE_URL) return opts.revoke ? opts.revoke(form(init)) : reply({});
    const token = String((init.headers || {}).Authorization || '').replace(/^Bearer /, '');
    const who = people[token];
    if (!who || (opts.expired && opts.expired.has(token))) return reply({ error: { code: 401, status: 'UNAUTHENTICATED' } }, 401);
    return opts.api ? opts.api(u, who, calls) : reply({});
  };
  return { fetch, calls, state, people };
}

function provider({ fetch, now = () => NOW0, clientId = CLIENT, secret = SECRET, redirect = loopbackRedirect({ port: 4900 }), store = memorySecretStore(), known } = {}) {
  const vault = createVault(store), pending = createPendingStore({ now });
  const ids = new Map();
  let n = 0;
  const p = createGoogleProvider({
    fetch, now, vault, pending, redirect, log: () => {},
    config: { clientId: () => clientId, clientSecret: (id) => (id === clientId ? secret : null), ...(known ? { knownClient: known } : {}) },
    accountIdFor: async ({ email }) => { if (!ids.has(email)) ids.set(email, 'acc_' + String(++n).padStart(16, '0')); return ids.get(email); },
  });
  return { p, vault, pending, store };
}
/** Put a signed-in account straight into the vault. */
async function seed(vault, id, { email, refresh, access = null, expires = 0, scope = ['openid', 'email', CAL, MAIL], clientId = CLIENT, sub = 'sub-' + email }) {
  await vault.write(id, { provider: 'google', clientId, sub, email, scope, access_token: access, refresh_token: refresh, expires_at: expires, needsAuth: false });
}

// ─── Purity, scopes, settings ─────────────────────────────────────────────
test('the Google provider is pure JS: no node: imports, only the account core', () => {
  const src = readFileSync(join(ROOT, 'lib', 'accounts', 'google.mjs'), 'utf8');
  const imports = [...src.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./core.mjs']);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bnode:|require\(|import\(|process\.|Buffer\b|globalThis\.fetch/);
});

test('scopes: least first, mail and calendar are separate ticks, never Drive', () => {
  assert.deepEqual(scopesFor({ calendar: true }), ['openid', 'email', CAL]);
  assert.deepEqual(scopesFor({ mail: true }), ['openid', 'email', MAIL]);
  assert.deepEqual(scopesFor({ mail: true, calendar: true }), ['openid', 'email', CAL, MAIL]);
  assert.deepEqual(scopesFor(undefined), ['openid', 'email', CAL, MAIL], 'nothing chosen means both');
  assert.deepEqual(scopesFor(['mail']), ['openid', 'email', MAIL]);
  assert.throws(() => scopesFor({ mail: false, calendar: false }), { code: 'BAD_REQUEST' });
  assert.equal(MAIL, 'https://www.googleapis.com/auth/gmail.readonly');
  assert.equal(CAL, 'https://www.googleapis.com/auth/calendar.readonly');
  assert.ok(!scopesFor().some((s) => /drive|gmail\.(modify|send|compose)|calendar$|calendar\.events/.test(s)));
  assert.deepEqual(featuresGranted(`openid https://www.googleapis.com/auth/userinfo.email ${CAL}`), { mail: false, calendar: true });
  assert.deepEqual(normaliseFeatures({ mail: true, calendar: 'yes' }), { mail: true, calendar: false });
});

test('client settings: Google download JSON, bare id, optional secret; shipped placeholders are not a client', () => {
  assert.deepEqual(parseGoogleClient({ installed: { client_id: CLIENT, client_secret: SECRET, token_uri: 'https://evil.example/token' } }), { clientId: CLIENT, clientSecret: SECRET });
  assert.deepEqual(parseGoogleClient(JSON.stringify({ web: { client_id: CLIENT, client_secret: SECRET } })), { clientId: CLIENT, clientSecret: SECRET });
  assert.deepEqual(parseGoogleClient(`  ${MOBILE} `), { clientId: MOBILE, clientSecret: null });
  assert.deepEqual(parseGoogleClient({ clientId: MOBILE }), { clientId: MOBILE, clientSecret: null });
  assert.throws(() => parseGoogleClient('not-a-client'), { code: 'BAD_REQUEST' });
  assert.throws(() => parseGoogleClient({ installed: { client_id: CLIENT, client_secret: 'bad secret with spaces' } }), { code: 'BAD_REQUEST' });
  assert.equal(SHIPPED.googleClientId, 'OPENDASH_GOOGLE_CLIENT_ID');
  assert.equal(SHIPPED.googleClientSecret, 'OPENDASH_GOOGLE_CLIENT_SECRET');
  assert.equal(shippedGoogleClient({}), null, 'placeholders mean: not set up in this copy');
  assert.deepEqual(shippedGoogleClient({ OPENDASH_GOOGLE_CLIENT_ID: CLIENT, OPENDASH_GOOGLE_CLIENT_SECRET: SECRET }), { clientId: CLIENT, clientSecret: SECRET });
  assert.deepEqual(shippedGoogleClient({ OPENDASH_GOOGLE_CLIENT_ID: CLIENT }), { clientId: CLIENT, clientSecret: null });
  assert.deepEqual(shippedGoogleClient({ OPENDASH_GOOGLE_CLIENT_ID: CLIENT, OPENDASH_GOOGLE_CLIENT_SECRET: 'OPENDASH_GOOGLE_CLIENT_SECRET' }), { clientId: CLIENT, clientSecret: null });
});

// ─── PKCE and state ──────────────────────────────────────────────────────
test('sign-in URL: PKCE S256 + single-use state + login_hint; no secret ever in the URL', async () => {
  const { p, pending } = provider({ fetch: async () => assert.fail('no network before the callback') });
  const a = await p.beginSignIn({ loginHint: 'Person@example.org', features: { calendar: true } });
  const u = new URL(a.url);
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  const q = Object.fromEntries(u.searchParams);
  assert.equal(q.client_id, CLIENT);
  assert.equal(q.redirect_uri, 'http://localhost:4900/api/accounts/callback');
  assert.equal(q.response_type, 'code');
  assert.equal(q.scope, `openid email ${CAL}`);
  assert.equal(q.code_challenge_method, 'S256');
  assert.equal(q.access_type, 'offline');
  assert.equal(q.prompt, 'consent');
  assert.equal(q.login_hint, 'person@example.org');
  assert.equal(q.state, a.state);
  assert.match(a.state, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(a.kind, 'work', 'a non-Gmail address is a first guess at Workspace');
  assert.ok(!u.href.includes(SECRET) && !('client_secret' in q));
  const pend = pending.peek(a.state);
  assert.match(pend.verifier, /^[A-Za-z0-9_-]{43,128}$/);
  assert.equal(q.code_challenge, s256(pend.verifier), 'challenge = base64url(SHA-256(verifier))');
  assert.deepEqual(pend.features, { mail: false, calendar: true });
  const b = await p.beginSignIn({ loginHint: atGmail('person') });
  assert.notEqual(b.state, a.state);
  assert.notEqual(pending.peek(b.state).verifier, pend.verifier, 'a fresh verifier per sign-in');
  assert.equal(b.kind, 'personal');
  assert.ok(pending.take(a.state));
  assert.equal(pending.take(a.state), null, 'a state works once');
  await assert.rejects(p.beginSignIn({ loginHint: 'x@example.org', features: { mail: false, calendar: false } }), { code: 'BAD_REQUEST' });
});

test('not set up: placeholder client id -> NOT_CONFIGURED before anything leaves the device', async () => {
  const { p } = provider({ fetch: async () => assert.fail('no network'), clientId: 'OPENDASH_GOOGLE_CLIENT_ID' });
  assert.equal((await p.configured()).ok, false);
  await assert.rejects(p.beginSignIn({ loginHint: 'a@example.com' }), { code: 'NOT_CONFIGURED' });
  const { p: q } = provider({ fetch: async () => assert.fail('no network'), secret: null });
  const c = await q.configured();
  assert.equal(c.ok, true);
  assert.match(c.warning, /client secret/);
});

test('callback: code + verifier (+ secret on desktop) are exchanged; identity from the id token; tokens go to the vault only', async () => {
  const g = fakeGoogle();
  const { p, pending, store } = provider({ fetch: g.fetch });
  const a = await p.beginSignIn({ loginHint: 'sam@example.org', features: { mail: true, calendar: true } });
  const pend = pending.take(a.state);
  g.state.exchange = (f) => {
    assert.equal(f.grant_type, 'authorization_code');
    assert.equal(f.code, 'synthetic-code');
    assert.equal(f.code_verifier, pend.verifier);
    assert.equal(f.client_id, CLIENT);
    assert.equal(f.client_secret, SECRET);
    assert.equal(f.redirect_uri, 'http://localhost:4900/api/accounts/callback');
    return reply({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3599, token_type: 'Bearer', scope: `openid https://www.googleapis.com/auth/userinfo.email ${CAL} ${MAIL}`, id_token: idToken({ sub: '1001', email: 'Sam@example.org', email_verified: true, hd: 'example.org' }) });
  };
  const acc = await p.handleCallback({ code: 'synthetic-code', state: a.state }, pend);
  assert.deepEqual(acc, { id: 'acc_0000000000000001', provider: 'google', email: 'sam@example.org', displayName: '', kind: 'work', scopes: ['openid', 'email', CAL, MAIL], features: { mail: true, calendar: true }, status: 'connected' });
  assert.ok(!JSON.stringify(acc).includes('rt-1') && !JSON.stringify(acc).includes('at-1'), 'the record carries no token');
  const doc = JSON.parse(store._map.get('accounts/acc_0000000000000001'));
  assert.equal(doc.refresh_token, 'rt-1');
  assert.equal(doc.clientId, CLIENT);
  assert.equal(doc.sub, '1001');
  assert.equal(doc.expires_at, NOW0 + 3599000);
  assert.equal(g.calls.length, 1, 'one token request, no profile call');
});

test('callback on a mobile (custom-scheme) client: no client secret is sent', async () => {
  const g = fakeGoogle();
  const { p, pending } = provider({ fetch: g.fetch, clientId: MOBILE, secret: null, redirect: customSchemeRedirect({ scheme: 'com.googleusercontent.apps.synthetic-ios-5678' }) });
  const a = await p.beginSignIn({ loginHint: 'kim@example.com', features: { calendar: true } });
  assert.equal(new URL(a.url).searchParams.get('redirect_uri'), 'com.googleusercontent.apps.synthetic-ios-5678:/oauth2redirect');
  g.state.exchange = (f) => {
    assert.ok(!('client_secret' in f));
    return reply({ access_token: 'at-m', refresh_token: 'rt-m', expires_in: 3600, scope: `openid email ${CAL}`, id_token: idToken({ aud: MOBILE, sub: '2002', email: 'kim@example.com' }) });
  };
  const acc = await p.handleCallback({ code: 'c', state: a.state }, pending.take(a.state));
  assert.equal(acc.kind, 'personal');
  assert.deepEqual(acc.features, { mail: false, calendar: true });
});

test('callback refusals: cancelled, nothing granted, partial grant, bad id token, no refresh token, wrong account on re-sign-in', async () => {
  const g = fakeGoogle();
  const { p, pending, vault } = provider({ fetch: g.fetch });
  const start = async (o) => { const a = await p.beginSignIn({ loginHint: 'sam@example.com', ...o }); return [a, pending.take(a.state)]; };
  let [a, pend] = await start();
  await assert.rejects(p.handleCallback({ error: 'access_denied', state: a.state }, pend), { code: 'OAUTH_CANCELLED' });
  assert.equal(g.calls.length, 0);
  const grant = (scope, claims = {}, extra = {}) => () => reply({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope, id_token: idToken({ sub: '1', email: 'sam@example.com', ...claims }), ...extra });
  [a, pend] = await start();
  g.state.exchange = grant('openid email');
  await assert.rejects(p.handleCallback({ code: 'c' }, pend), { code: 'MISSING_PERMISSIONS' });
  [a, pend] = await start();
  g.state.exchange = grant(`openid email ${CAL}`);
  assert.deepEqual((await p.handleCallback({ code: 'c' }, pend)).features, { mail: false, calendar: true }, 'an unticked box on Google\'s screen switches that feature off');
  [a, pend] = await start();
  g.state.exchange = grant(`openid email ${MAIL}`, { aud: 'someone-else.apps.googleusercontent.com' });
  await assert.rejects(p.handleCallback({ code: 'c' }, pend), { code: 'PROVIDER_RESPONSE' });
  [a, pend] = await start();
  g.state.exchange = grant(`openid email ${MAIL}`, { iss: 'https://evil.example' });
  await assert.rejects(p.handleCallback({ code: 'c' }, pend), { code: 'PROVIDER_RESPONSE' });
  [a, pend] = await start();
  g.state.exchange = () => reply({ access_token: 'at', expires_in: 3600, scope: `openid email ${MAIL}`, id_token: idToken({ sub: '1', email: 'sam@example.com' }) });
  await assert.rejects(p.handleCallback({ code: 'c' }, pend), { code: 'PROVIDER_RESPONSE', message: /myaccount\.google\.com\/permissions/ });
  [a, pend] = await start();
  g.state.exchange = () => reply({ error: 'invalid_request', error_description: 'client_secret is missing.' }, 400);
  await assert.rejects(p.handleCallback({ code: 'c' }, pend), { code: 'NOT_CONFIGURED' });
  // Re-sign-in of acc_9 (sam) that comes back as another Google account: refused, nothing written.
  await seed(vault, 'acc_0000000000000009', { email: 'sam@example.com', refresh: 'rt-sam', sub: '1' });
  const r = await p.beginSignIn({ loginHint: 'sam@example.com', accountId: 'acc_0000000000000009' });
  g.state.exchange = grant(`openid email ${MAIL}`, { sub: '77', email: 'other@example.com' });
  await assert.rejects(p.handleCallback({ code: 'c' }, pending.take(r.state)), { code: 'WRONG_ACCOUNT', message: /other@example.com/ });
  assert.equal((await vault.read('acc_0000000000000009')).refresh_token, 'rt-sam');
});

test('the core service end to end: begin -> callback -> registry record; state is single-use and expires', async () => {
  let clock = NOW0;
  const g = fakeGoogle();
  g.state.exchange = () => reply({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: `openid email ${CAL} ${MAIL}`, id_token: idToken({ sub: '5', email: 'lee@example.com', exp: Math.floor(clock / 1000) + 3600 }) });
  let reg = { version: 1, accounts: [] };
  const svc = createAccounts({
    registry: { read: async () => structuredClone(reg), mutate: async (fn) => { const list = structuredClone(reg.accounts); const r = await fn(list); reg = { version: 1, accounts: list }; return r; } },
    secrets: memorySecretStore(), providers: { google: createGoogleProvider }, providerConfig: { google: { clientId: () => CLIENT, clientSecret: () => SECRET } },
    redirect: loopbackRedirect({ port: 4900 }), fetch: g.fetch, now: () => clock, deviceId: 'host-aaaaaaaa',
  });
  const b = await svc.begin({ provider: 'google', email: 'lee@example.com', features: { mail: true, calendar: false } });
  const state = new URL(b.url).searchParams.get('state');
  const out = await svc.callback({ state, code: 'c' });
  assert.equal(out.account.email, 'lee@example.com');
  assert.equal(out.account.status, 'connected');
  assert.deepEqual(reg.accounts[0].features, { mail: true, calendar: false });
  assert.ok(!JSON.stringify(reg).includes('"rt"'), 'no token in the registry');
  await assert.rejects(svc.callback({ state, code: 'c' }), { code: 'OAUTH_STATE' });
  const b2 = await svc.begin({ provider: 'google', email: 'lee@example.com' });
  clock += 11 * 60000;
  await assert.rejects(svc.callback({ state: new URL(b2.url).searchParams.get('state'), code: 'c' }), { code: 'OAUTH_STATE' });
});

// ─── Refresh, rotation, invalid_grant ─────────────────────────────────────
test('refresh: once per account even when many reads start together; a new refresh token replaces the old', async () => {
  const g = fakeGoogle({ people: { 'rt-a': { email: 'a@example.com' } }, api: () => reply({ messages: [] }) });
  const { p, vault } = provider({ fetch: g.fetch });
  await seed(vault, 'acc_000000000000000a', { email: 'a@example.com', refresh: 'rt-a' });
  const tokens = await Promise.all([1, 2, 3, 4, 5].map(() => p.accessToken('acc_000000000000000a')));
  assert.equal(g.state.refreshes, 1, 'concurrent callers share one refresh');
  assert.ok(tokens.every((t) => t === tokens[0]));
  assert.equal(await p.accessToken('acc_000000000000000a'), tokens[0], 'a valid token is reused');
  assert.equal(g.state.refreshes, 1);
  const refresh = g.calls.find((c) => c.url === GOOGLE_TOKEN_URL);
  assert.equal(refresh.init.method, 'POST');
  assert.deepEqual(form(refresh.init), { grant_type: 'refresh_token', refresh_token: 'rt-a', client_id: CLIENT, client_secret: SECRET });
  // Rotation
  g.state.rotate = true;
  g.people['rt-a-r'] = { email: 'a@example.com' };
  await vault.update('acc_000000000000000a', (d) => ({ ...d, expires_at: 0 }));
  await p.accessToken('acc_000000000000000a');
  assert.equal((await vault.read('acc_000000000000000a')).refresh_token, 'rt-a-r');
  g.state.rotate = false;
  await vault.update('acc_000000000000000a', (d) => ({ ...d, expires_at: 0 }));
  await p.accessToken('acc_000000000000000a');
  assert.equal((await vault.read('acc_000000000000000a')).refresh_token, 'rt-a-r', 'no new refresh token: the old one stays');
});

test('a 401 from Gmail refreshes once and retries with the new token', async () => {
  const expired = new Set(['at-stale']);
  const g = fakeGoogle({ people: { 'rt-a': { email: 'a@example.com' }, 'at-stale': { email: 'a@example.com' } }, expired, api: () => reply({ messages: [] }) });
  const { p, vault } = provider({ fetch: g.fetch });
  await seed(vault, 'acc_000000000000000a', { email: 'a@example.com', refresh: 'rt-a', access: 'at-stale', expires: NOW0 + 3600000 });
  const r = await p.fetchMail('acc_000000000000000a', { source: { id: 'email-gmail-a' }, days: 7, todayIso: '2026-10-23' });
  assert.equal(r.count, 0);
  assert.equal(g.state.refreshes, 1);
  const gets = g.calls.filter((c) => c.url.startsWith('https://gmail.googleapis.com/'));
  assert.deepEqual(gets.map((c) => c.init.headers.Authorization), ['Bearer at-stale', 'Bearer at-a@example.com-1']);
});

test('invalid_grant (revoked) -> NEEDS_SIGN_IN, remembered: the next read asks Google nothing; the core marks needs-sign-in', async () => {
  const g = fakeGoogle({ people: { 'rt-a': { email: 'a@example.com' } } });
  g.state.deny.add('rt-a');
  let reg = { version: 1, accounts: [{ id: 'acc_000000000000000a', provider: 'google', email: 'a@example.com', status: 'connected', features: { mail: true, calendar: true }, createdAt: new Date(NOW0).toISOString() }] };
  const secrets = memorySecretStore();
  const svc = createAccounts({
    registry: { read: async () => structuredClone(reg), mutate: async (fn) => { const list = structuredClone(reg.accounts); const r = await fn(list); reg = { version: 1, accounts: list }; return r; } },
    secrets, providers: { google: createGoogleProvider }, providerConfig: { google: { clientId: () => CLIENT, clientSecret: () => SECRET } },
    redirect: loopbackRedirect({ port: 4900 }), fetch: g.fetch, now: () => NOW0,
  });
  await seed(svc.vault, 'acc_000000000000000a', { email: 'a@example.com', refresh: 'rt-a' });
  await assert.rejects(svc.fetchMail('acc_000000000000000a', { source: { id: 'email-g' }, days: 7 }), { code: 'NEEDS_SIGN_IN' });
  assert.equal(reg.accounts[0].status, 'needs-sign-in');
  assert.equal(reg.accounts[0].error.code, 'NEEDS_SIGN_IN');
  assert.equal((await svc.vault.read('acc_000000000000000a')).needsAuth, true);
  const before = g.calls.length;
  await assert.rejects(svc.fetchCalendar('acc_000000000000000a', { source: { id: 'calendar-g' }, from: '2026-10-01', to: '2026-10-31' }), { code: 'NEEDS_SIGN_IN' });
  assert.equal(g.calls.length, before, 'no request after a refusal');
});

test('tokens from a Google app that is no longer set up are not refreshed (sign in again)', async () => {
  const g = fakeGoogle({ people: { 'rt-a': { email: 'a@example.com' } } });
  const { p, vault } = provider({ fetch: g.fetch });
  await seed(vault, 'acc_000000000000000a', { email: 'a@example.com', refresh: 'rt-a', clientId: 'old-client-1.apps.googleusercontent.com' });
  await assert.rejects(p.accessToken('acc_000000000000000a'), { code: 'NEEDS_SIGN_IN', message: /setting changed/ });
  assert.equal(g.calls.length, 0);
  const { p: q, vault: v2 } = provider({ fetch: g.fetch, known: (id) => id === 'old-client-1.apps.googleusercontent.com' || id === CLIENT, secret: SECRET });
  await seed(v2, 'acc_000000000000000a', { email: 'a@example.com', refresh: 'rt-a', clientId: 'old-client-1.apps.googleusercontent.com' });
  await q.accessToken('acc_000000000000000a');
  assert.equal(form(g.calls[0].init).client_id, 'old-client-1.apps.googleusercontent.com', 'a token refreshes with the client that issued it');
  assert.ok(!('client_secret' in form(g.calls[0].init)), 'the current client\'s secret never goes with another client id');
});

// ─── Multi-account isolation ─────────────────────────────────────────────
test('two Google accounts side by side: own tokens, own refresh, own ids; removing one leaves the other', async () => {
  const api = (u, who) => {
    if (u.pathname.endsWith('/messages')) return reply({ messages: [{ id: 'm1', threadId: 't1' }] });
    return reply({ id: 'm1', threadId: 't1', labelIds: ['INBOX'], snippet: `for ${who.email}`, internalDate: String(NOW0 - 3600000), payload: { headers: [{ name: 'Subject', value: 'Hi' }, { name: 'From', value: 'Pat <pat@example.org>' }] } });
  };
  const g = fakeGoogle({ people: { 'rt-a': { email: 'a@example.com' }, 'rt-b': { email: 'b@example.org' } }, api });
  const { p, vault, store } = provider({ fetch: g.fetch });
  await seed(vault, 'acc_000000000000000a', { email: 'a@example.com', refresh: 'rt-a' });
  await seed(vault, 'acc_000000000000000b', { email: 'b@example.org', refresh: 'rt-b' });
  const [ma, mb] = await Promise.all([
    p.fetchMail('acc_000000000000000a', { source: { id: 'email-google-a' }, todayIso: '2026-10-23' }),
    p.fetchMail('acc_000000000000000b', { source: { id: 'email-google-b' }, todayIso: '2026-10-23' }),
  ]);
  assert.equal(g.state.refreshes, 2, 'one refresh each, never shared');
  assert.equal(ma.messages[0].snippet, 'for a@example.com');
  assert.equal(mb.messages[0].snippet, 'for b@example.org');
  assert.notEqual(ma.messages[0].id, mb.messages[0].id, 'the same Gmail thread id in two accounts gives two OpenDash ids');
  assert.equal(ma.accounts[0].name, 'a@example.com');
  assert.match(mb.messages[0].link, /authuser=b%40example.org#all\/t1$/);
  for (const c of g.calls.filter((x) => x.url.startsWith('https://gmail'))) {
    const tok = c.init.headers.Authorization;
    assert.ok(tok.includes('a@example.com') || tok.includes('b@example.org'));
  }
  await p.disconnect('acc_000000000000000a');
  assert.equal(await vault.read('acc_000000000000000a'), null);
  assert.equal((await vault.read('acc_000000000000000b')).refresh_token, 'rt-b');
  assert.deepEqual([...store._map.keys()], ['accounts/acc_000000000000000b']);
  const revoke = g.calls.find((c) => c.url === GOOGLE_REVOKE_URL);
  assert.deepEqual(form(revoke.init), { token: 'rt-a' });
});

test('disconnect still removes the tokens when Google cannot be reached to revoke', async () => {
  const g = fakeGoogle({ revoke: () => { throw new Error('offline'); } });
  const { p, vault } = provider({ fetch: g.fetch });
  await seed(vault, 'acc_000000000000000a', { email: 'a@example.com', refresh: 'rt-a' });
  await p.disconnect('acc_000000000000000a');
  assert.equal(await vault.read('acc_000000000000000a'), null);
});

// ─── Gmail shape ─────────────────────────────────────────────────────────
test('fetchMail: newest message per thread, the triage shape, metadata only', async () => {
  const msgs = {
    m3: { id: 'm3', threadId: 't1', labelIds: ['INBOX', 'UNREAD', 'IMPORTANT', 'CATEGORY_PERSONAL'], snippet: 'Can you send the &quot;draft&quot; &amp; slides? It&#39;s due', internalDate: String(Date.UTC(2026, 9, 22, 9, 30)),
      payload: { headers: [{ name: 'Subject', value: 'Re: Draft‮' }, { name: 'From', value: '"Sam Lee" <Sam@example.org>' }, { name: 'Date', value: 'Thu, 22 Oct 2026 10:30:00 +0100' }, { name: 'Message-ID', value: '<abc@mail.example.org>' }] } },
    m2: { id: 'm2', threadId: 't2', labelIds: ['INBOX'], snippet: '', internalDate: String(Date.UTC(2026, 9, 21, 8, 0)), payload: { headers: [{ name: 'From', value: 'noreply@example.org' }] } },
  };
  const g = fakeGoogle({
    people: { 'rt-a': { email: 'me@example.com' } },
    api: (u) => {
      if (u.pathname === '/gmail/v1/users/me/messages') {
        assert.equal(u.searchParams.get('q'), `in:inbox after:${Date.UTC(2026, 9, 16) / 1000} -in:draft -in:chats`);
        if (!u.searchParams.get('pageToken')) return reply({ messages: [{ id: 'm3', threadId: 't1' }, { id: 'm2', threadId: 't2' }], nextPageToken: 'p2' });
        return reply({ messages: [{ id: 'm1', threadId: 't1' }] });
      }
      const id = u.pathname.split('/').pop();
      assert.equal(u.searchParams.get('format'), 'metadata', 'never a body');
      assert.deepEqual(u.searchParams.getAll('metadataHeaders'), ['Subject', 'From', 'Date', 'Message-ID']);
      return reply(msgs[id]);
    },
  });
  const { p, vault } = provider({ fetch: g.fetch });
  await seed(vault, 'acc_000000000000000a', { email: 'me@example.com', refresh: 'rt-a' });
  const r = await p.fetchMail('acc_000000000000000a', { source: { id: 'email-google-me' }, days: 7, todayIso: '2026-10-23' });
  assert.equal(r.count, 2);
  assert.deepEqual(r.accounts, [{ id: 'default', name: 'me@example.com' }]);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.messages[0], {
    id: 'gm' + sha('email-google-me|t1').slice(0, 24), messageId: '<abc@mail.example.org>', threadId: 't1', lastMessageId: 'm3', sourceId: 'email-google-me', accountId: 'default',
    subject: 'Re: Draft', from: { name: 'Sam Lee', email: 'sam@example.org' }, sender: 'Sam Lee <sam@example.org>', date: '2026-10-22T09:30:00.000Z',
    snippet: 'Can you send the "draft" & slides? It\'s due', unread: true, important: true, category: 'personal', count: 2,
    link: 'https://mail.google.com/mail/u/?authuser=me%40example.com#all/t1',
  });
  assert.equal(r.messages[1].subject, '(no subject)');
  assert.equal(r.messages[1].sender, 'noreply@example.org');
  assert.equal(g.calls.filter((c) => /\/messages\/m1\b/.test(c.url)).length, 0, 'only the newest message of a thread is read');
});

test('fetchMail refuses without the Gmail permission, before any request', async () => {
  const g = fakeGoogle();
  const { p, vault } = provider({ fetch: g.fetch });
  await seed(vault, 'acc_000000000000000a', { email: 'a@example.com', refresh: 'rt-a', scope: ['openid', 'email', CAL] });
  await assert.rejects(p.fetchMail('acc_000000000000000a', {}), { code: 'MISSING_PERMISSIONS' });
  await assert.rejects(p.fetchMail('acc_0000000000000404', {}), { code: 'NEEDS_SIGN_IN' });
  assert.equal(g.calls.length, 0);
});

test('Gmail parsing helpers: entities, senders, threads, ids', () => {
  assert.equal(decodeEntities('a &amp; b &lt;c&gt; &#8217; &#x41; &bogus;'), 'a & b <c> ’ A &bogus;');
  assert.deepEqual(parseFrom('"Lee, Sam" <SAM@x.example.org>'), { name: 'Lee, Sam', email: 'sam@x.example.org' });
  assert.deepEqual(parseFrom('Just A Name'), { name: 'Just A Name', email: '' });
  assert.deepEqual(threadsFromList([{ messages: [{ id: 'a', threadId: 'T' }, { id: 'b', threadId: 'T' }, { id: '../x', threadId: 'U' }, { id: 'c' }] }]), [{ threadId: 'T', messageId: 'a', count: 2 }, { threadId: 'c', messageId: 'c', count: 1 }]);
  assert.throws(() => gmailMessageUrl('../../settings'), { code: 'PROVIDER_RESPONSE' });
  assert.equal(parseGmailMessage({ id: 'x', threadId: 'x', payload: {} }, { id: 'gm1' }), null, 'no date: dropped');
});

// ─── Calendar shape ──────────────────────────────────────────────────────
test('fetchCalendar: calendars (primary first, hidden and free/busy-only left out), events in the preset shape, paging', async () => {
  const g = fakeGoogle({
    people: { 'rt-a': { email: 'me@example.com' } },
    api: (u) => {
      if (u.pathname === '/calendar/v3/users/me/calendarList') {
        assert.equal(u.searchParams.get('minAccessRole'), 'reader');
        return reply({ items: [
          { id: 'team@group.calendar.google.com', summary: 'Team', accessRole: 'reader' },
          { id: 'me@example.com', summary: 'me@example.com', primary: true, accessRole: 'owner', timeZone: 'Europe/London' },
          { id: 'hidden@group.calendar.google.com', summary: 'Hidden', accessRole: 'reader', hidden: true },
          { id: 'boss@example.org', summary: 'Boss', accessRole: 'freeBusyReader' },
        ] });
      }
      const cal = decodeURIComponent(u.pathname.split('/')[4]);
      assert.equal(u.searchParams.get('singleEvents'), 'true');
      assert.equal(u.searchParams.get('timeMin'), '2026-09-30T00:00:00Z');
      assert.equal(u.searchParams.get('timeMax'), '2026-11-02T00:00:00Z');
      assert.equal(u.searchParams.get('timeZone'), 'Europe/London');
      if (cal === 'me@example.com' && !u.searchParams.get('pageToken')) {
        return reply({ nextPageToken: 'n2', items: [
          { id: 'ev1', status: 'confirmed', summary: 'Supervision', start: { dateTime: '2026-10-23T10:00:00+01:00', timeZone: 'Europe/London' }, end: { dateTime: '2026-10-23T11:00:00+01:00' },
            hangoutLink: 'https://meet.google.com/abc-defg-hij', htmlLink: 'https://www.google.com/calendar/event?eid=ZXYx', iCalUID: 'ev1@example.org', location: 'Room 1',
            attendees: [{ email: 'me@example.com', self: true, responseStatus: 'accepted' }, { email: 'Prof@example.org', displayName: 'Prof', organizer: true, responseStatus: 'needsAction' }, { email: 'room@resource.calendar.google.com', resource: true }],
            organizer: { email: 'prof@example.org', displayName: 'Prof' } },
          { id: 'gone', status: 'cancelled', start: { date: '2026-10-24' } },
        ] });
      }
      if (cal === 'me@example.com') return reply({ items: [{ id: 'ev2_20261026', recurringEventId: 'ev2', iCalUID: 'ev2@example.org', summary: 'Weekly', start: { date: '2026-10-26' }, end: { date: '2026-10-27' }, transparency: 'transparent', eventType: 'outOfOffice' }] });
      return reply({ items: [{ id: 'tev', summary: 'Team day', start: { dateTime: '2026-10-28T09:00:00Z' }, end: { dateTime: '2026-10-28T08:00:00Z' }, hangoutLink: 'https://evil.example/join' }] });
    },
  });
  const { p, vault } = provider({ fetch: g.fetch });
  await seed(vault, 'acc_000000000000000a', { email: 'me@example.com', refresh: 'rt-a' });
  const r = await p.fetchCalendar('acc_000000000000000a', { source: { id: 'calendar-google-me' }, from: '2026-10-01', to: '2026-10-31', timeZone: 'Europe/London' });
  const kMe = 'c' + sha('me@example.com').slice(0, 24), kTeam = 'c' + sha('team@group.calendar.google.com').slice(0, 24);
  assert.deepEqual(r.calendars, [
    { id: kMe, name: 'Me', googleName: 'me@example.com', primary: true, accessRole: 'owner', timeZone: 'Europe/London', color: 'blue' },
    { id: kTeam, name: 'Team', accessRole: 'reader', color: 'violet' },
  ]);
  assert.equal(r.count, 3);
  assert.deepEqual(r.events[0], {
    id: 'gc' + sha('calendar-google-me|me@example.com|ev1').slice(0, 24), calendarId: `calendar-google-me/${kMe}`, summary: 'Supervision',
    start: { dateTime: '2026-10-23T10:00:00+01:00', timeZone: 'Europe/London' }, end: { dateTime: '2026-10-23T11:00:00+01:00' }, allDay: false, status: 'confirmed',
    location: 'Room 1', conferenceUrl: 'https://meet.google.com/abc-defg-hij', conferenceName: null,
    htmlLink: 'https://www.google.com/calendar/event?eid=ZXYx&authuser=me%40example.com', link: 'https://www.google.com/calendar/event?eid=ZXYx&authuser=me%40example.com',
    attendees: [{ email: 'me@example.com', name: '', self: true, response: 'accepted' }, { email: 'prof@example.org', name: 'Prof', organizer: true, response: 'needsAction' }],
    organizer: { email: 'prof@example.org', name: 'Prof' }, selfResponse: 'accepted', iCalUID: 'ev1@example.org',
  });
  const weekly = r.events[1];
  assert.deepEqual([weekly.allDay, weekly.start, weekly.end, weekly.recurring, weekly.free, weekly.eventType, 'iCalUID' in weekly], [true, { date: '2026-10-26' }, { date: '2026-10-27' }, true, true, 'outOfOffice', false]);
  const team = r.events[2];
  assert.equal(team.calendarId, `calendar-google-me/${kTeam}`);
  assert.equal(team.end.dateTime, team.start.dateTime, 'an end before the start is clamped');
  assert.ok(!('conferenceUrl' in team), 'only known video hosts are join links');
  assert.ok(!g.calls.some((c) => c.url.includes('hidden%40') || c.url.includes('boss%40')));
  await assert.rejects(p.fetchCalendar('acc_000000000000000a', { from: '2026-10-31', to: '2026-10-01' }), { code: 'BAD_REQUEST' });
  await assert.rejects(p.fetchCalendar('acc_000000000000000a', { from: '2026-01-01', to: '2027-06-01' }), { code: 'BAD_REQUEST' });
});

test('calendar parsing helpers refuse unsafe ids and links', () => {
  assert.throws(() => eventsUrl('../users/me', { timeMin: 'a', timeMax: 'b' }), { code: 'PROVIDER_RESPONSE' });
  assert.equal(parseCalendar({ id: 'primary', accessRole: 'owner' }), null);
  assert.equal(parseEvent({ id: 'x', start: { dateTime: 'tomorrow' } }, {}), null);
  const ev = parseEvent({ id: 'x', start: { date: '2026-10-01' }, htmlLink: 'https://evil.example/calendar/event?eid=1', hangoutLink: 'http://meet.google.com/x' }, { id: 'gc1', calendarId: 's/c', email: 'a@example.com' });
  assert.deepEqual([ev.end, 'htmlLink' in ev, 'conferenceUrl' in ev], [{ date: '2026-10-02' }, false, false]);
});

// ─── Host allow-list ─────────────────────────────────────────────────────
test('host allow-list: GET only to Gmail/Calendar API paths, POST only to the token endpoints', () => {
  const yes = [
    ['https://gmail.googleapis.com/gmail/v1/users/me/messages?q=x', 'GET'],
    ['https://www.googleapis.com/calendar/v3/users/me/calendarList', 'GET'],
    ['https://www.googleapis.com/calendar/v3/calendars/en.uk%23holiday%40group.v.calendar.google.com/events?x=1', 'GET'],
    ['https://oauth2.googleapis.com/token', 'POST'],
    ['https://oauth2.googleapis.com/revoke', 'POST'],
  ];
  const no = [
    ['http://gmail.googleapis.com/gmail/v1/users/me/messages', 'GET'],
    ['https://gmail.googleapis.com:8443/gmail/v1/users/me/messages', 'GET'],
    ['https://user:pw@gmail.googleapis.com/gmail/v1/users/me/messages', 'GET'],
    ['https://gmail.googleapis.com/gmail/v1/users/someone@example.org/messages', 'GET'],
    ['https://gmail.googleapis.com/gmail/v1/users/me/messages/1/trash', 'POST'],
    ['https://gmail.googleapis.com/gmail/v1/users/me/messages/1', 'DELETE'],
    ['https://www.googleapis.com/drive/v3/files', 'GET'],
    ['https://www.googleapis.com/oauth2/v3/userinfo', 'GET'],
    ['https://googleapis.com.evil.example/gmail/v1/users/me/messages', 'GET'],
    ['https://evil.example/token', 'POST'],
    ['https://oauth2.googleapis.com/token', 'GET'],
    ['https://oauth2.googleapis.com/token?code=x', 'POST'],
    ['https://www.googleapis.com/calendar/v3/users/me/calendarList#x', 'GET'],
    ['not a url', 'GET'],
  ];
  for (const [u, m] of yes) assert.equal(isAllowedRequest(u, m), true, `${m} ${u}`);
  for (const [u, m] of no) assert.equal(isAllowedRequest(u, m), false, `${m} ${u}`);
});

// ─── Errors ──────────────────────────────────────────────────────────────
test('error mapping: plain words, codes the core understands, no provider detail', () => {
  assert.equal(tokenError(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }).code, 'NEEDS_SIGN_IN');
  assert.equal(tokenError(400, { error: 'admin_policy_enforced' }).code, 'NEEDS_ADMIN_APPROVAL');
  assert.equal(tokenError(401, { error: 'invalid_client' }).code, 'NOT_CONFIGURED');
  assert.equal(tokenError(503, {}).code, 'PROVIDER_BUSY');
  assert.equal(tokenError(400, { error: 'weird', error_description: 'secret detail' }).message.includes('secret detail'), false);
  assert.equal(apiError(401, {}).code, 'NEEDS_SIGN_IN');
  assert.equal(apiError(403, { error: { errors: [{ reason: 'insufficientPermissions' }] } }).code, 'MISSING_PERMISSIONS');
  assert.equal(apiError(403, { error: { status: 'PERMISSION_DENIED', details: [{ reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' }] } }).code, 'MISSING_PERMISSIONS');
  assert.equal(apiError(403, { error: { errors: [{ reason: 'accessNotConfigured' }] } }).code, 'NOT_CONFIGURED');
  assert.equal(apiError(429, {}).code, 'PROVIDER_BUSY');
  assert.equal(apiError(403, { error: { errors: [{ reason: 'userRateLimitExceeded' }] } }).code, 'PROVIDER_BUSY');
  assert.equal(apiError(404, {}).code, 'PROVIDER_RESPONSE');
  const t = parseTokens({ access_token: 'a', expires_in: 999999, scope: `openid ${MAIL} https://www.googleapis.com/auth/drive` }, { now: 0, old: { refresh_token: 'keep' } });
  assert.deepEqual(t, { access_token: 'a', refresh_token: 'keep', expires_at: 86400000, scope: ['openid', MAIL] });
  assert.throws(() => parseTokens({ access_token: 'a', token_type: 'MAC' }), { code: 'PROVIDER_RESPONSE' });
  assert.throws(() => identityFrom('x.y.z', { clientId: CLIENT, now: NOW0 }), { code: 'PROVIDER_RESPONSE' });
  assert.throws(() => identityFrom(idToken({ sub: '1', email: 'a@example.com', exp: Math.floor(NOW0 / 1000) - 3600 }), { clientId: CLIENT, now: NOW0 }), { code: 'PROVIDER_RESPONSE' });
  assert.deepEqual(identityFrom(idToken({ sub: '1', email: 'A@Example.com', name: 'A‮B' }), { clientId: CLIENT, now: NOW0 }), { sub: '1', email: 'a@example.com', emailVerified: false, hd: null, name: 'A B' });
});

// ─── Migration (pure part) ───────────────────────────────────────────────
test('the old single Google connection becomes one account\'s token document, kept on its own client', async () => {
  const legacy = legacyGoogleConnection({ installed: { client_id: CLIENT, client_secret: SECRET } }, { refresh_token: 'rt-old', access_token: 'at-old', expires_at: NOW0 + 1000, account: 'Me@Example.com' });
  assert.deepEqual(legacy, {
    client: { clientId: CLIENT, clientSecret: SECRET }, email: 'me@example.com',
    tokens: { provider: 'google', clientId: CLIENT, sub: null, email: 'me@example.com', scope: [...LEGACY_SCOPES], access_token: 'at-old', refresh_token: 'rt-old', expires_at: NOW0 + 1000, legacy: true },
  });
  assert.equal(legacyGoogleConnection({ installed: { client_id: CLIENT, client_secret: SECRET } }, {}), null, 'disconnected (empty tokens file)');
  assert.equal(legacyGoogleConnection(null, { refresh_token: 'rt', account: 'a@example.com' }), null, 'no client: the token cannot be refreshed');
  assert.equal(legacyGoogleConnection({ installed: { client_id: CLIENT } }, { refresh_token: 'rt' }), null, 'no address known');
  // The migrated document works with the provider: mail and calendar, refreshed with the old client.
  const g = fakeGoogle({ people: { 'rt-old': { email: 'me@example.com' } }, api: () => reply({ messages: [] }) });
  const { p, vault } = provider({ fetch: g.fetch });
  await vault.write('acc_00000000000000aa', legacy.tokens);
  await p.fetchMail('acc_00000000000000aa', { source: { id: 'email-google-me' } });
  assert.deepEqual(form(g.calls[0].init), { grant_type: 'refresh_token', refresh_token: 'rt-old', client_id: CLIENT, client_secret: SECRET });
});

test('buildAuthUrl without a hint lets the person choose the account', () => {
  const u = new URL(buildAuthUrl({ clientId: CLIENT, redirectUri: 'http://localhost:1/x', scopes: ['openid'], state: 's', challenge: 'c' }));
  assert.equal(u.searchParams.get('prompt'), 'select_account consent');
  assert.equal(u.searchParams.has('login_hint'), false);
});

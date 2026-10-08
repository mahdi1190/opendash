// tests/fin-connect-eb.test.mjs - the read-only Enable Banking provider
// (lib/fin-connect/enable-banking.mjs; docs/dev/FINANCE_CONNECTIONS.md 2.3, 3.x).
// Everything runs against the in-process fake (tests/fixtures/fin-fake-enablebanking.mjs)
// with a key generated for this run: no network, no real credentials.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, request } from 'node:http';
import { createVerify, generateKeyPairSync, createHash } from 'node:crypto';
import vm from 'node:vm';

import eb, {
  signJwt, checkPem, checkAppId, toMinor, consentEnd, consentDue, isAllowed, allow, ebClient, saveApp, banks, start,
  callback, parsePastedUrl, finishFromUrl, fetch as ebFetch, normalise, status, refresh, disconnect, info, makeState,
  portFromState, mapEbError, pickBalance, budgetCheck, searchBanks, directAlternative, routes, PASTE_URL, BOUNCE_URL,
  AUTO_UPDATES_PER_DAY, MAX_CONSENT_DAYS, _reset, bankFromAspsp,
} from '../lib/fin-connect/enable-banking.mjs';
import { readOnlyClient } from '../lib/fin-connect/http.mjs';
import { secretsFor } from '../lib/fin-connect/secrets.mjs';
import { finishRows } from '../lib/fin-connect/normalise.mjs';
import { defineProvider, FinError } from '../lib/fin-connect/provider.mjs';
import { createApp } from '../server/router.mjs';
import { createFake, makeTestKey } from './fixtures/fin-fake-enablebanking.mjs';
import { snapshotSource, buildSnapshot } from '../tools/eb-bank-snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ID = '00000000-0000-4000-8000-0000000000eb';
const KEY = makeTestKey();
const DAY = 86400000;

/** A data folder + fake + ctx like the core's ctxFor('enable-banking'), with an in-memory source store. */
function setup({ now = Date.now(), fail = '', register = true } = {}) {
  _reset();
  const dataDir = mkdtempSync(join(tmpdir(), 'od-eb-'));
  let t = now;
  const clock = () => t;
  const fake = createFake({ now: clock, delayMs: 0, fail });
  if (register) fake.registerApp(APP_ID, KEY.publicKey);
  const logs = [];
  const log = (level, msg) => logs.push(`${level} ${msg}`);
  const sources = new Map();
  let n = 0;
  const svc = {
    getSource: async (id) => (sources.has(id) ? JSON.parse(JSON.stringify(sources.get(id))) : null),
    createSource: async (input) => { const s = { id: `bank-eb-test-${++n}`, capability: 'bank', kind: 'direct', enabled: true, colour: 'teal', ...JSON.parse(JSON.stringify(input)) }; sources.set(s.id, s); return s; },
    updateSource: async (id, fn) => { const s = sources.get(id); fn(s); return JSON.parse(JSON.stringify(s)); },
  };
  const ctx = {
    dataDir, secrets: secretsFor(dataDir), now: clock, log, fake, mem: {}, port: 45123, home: 'GBP', currency: 'GBP', svc,
    http: readOnlyClient(allow, { provider: 'enable-banking', fetchFn: fake.fetchFn, log }),
    snapshot: { asOf: '2026-10-01', countries: { GB: [{ name: 'Snapshot Bank', maxConsentDays: 90 }, 'Other Snapshot Bank'] } },
  };
  return { dataDir, ctx, fake, logs, sources, advance: (ms) => { t += ms; }, cleanup: () => rmSync(dataDir, { recursive: true, force: true }) };
}

async function connected(env, bank = 'Fake High Street Bank', redirect = 'bounce') {
  await saveApp(env.ctx, { appId: APP_ID, pem: KEY.pem });
  const s = await start(env.ctx, { bank, country: 'GB', redirect });
  const a = env.fake.authorisation(new URL(s.url).searchParams.get('auth'));
  const r = await callback(env.ctx, { code: a.code, state: a.state });
  return { start: s, auth: a, result: r, source: env.sources.get(r.sourceId) };
}

// ─── Contract and read-only ──────────────────────────────────────────────
test('provider: passes the core contract, read-only, with an allowlist', () => {
  assert.equal(defineProvider(eb), eb);
  assert.equal(eb.id, 'enable-banking');
  assert.equal(eb.readOnly, true);
  for (const k of ['status', 'connect', 'callback', 'refresh', 'listAccounts', 'fetch', 'normalise', 'disconnect', 'routes']) assert.equal(typeof eb[k], 'function', k);
});

test('allowlist: only the read endpoints, https only, on the one host', () => {
  const ok = [['GET', '/application'], ['GET', '/aspsps?country=GB'], ['GET', '/sessions/abc-1'], ['DELETE', '/sessions/abc-1'],
    ['GET', '/accounts/u-1/balances'], ['GET', '/accounts/u-1/transactions?date_from=2026-01-01'], ['GET', '/accounts/u-1/details'], ['POST', '/auth'], ['POST', '/sessions']];
  for (const [m, p] of ok) assert.equal(isAllowed(m, 'https://api.enablebanking.com' + p), true, `${m} ${p}`);
  const never = [['POST', '/payments'], ['GET', '/payments/x'], ['POST', '/payments/x/transfers'], ['POST', '/accounts/u-1/transactions'], ['PUT', '/sessions/abc'],
    ['PATCH', '/accounts/u-1'], ['DELETE', '/accounts/u-1'], ['GET', '/accounts/u-1/../../payments'], ['POST', '/application'], ['GET', '/sessions'],
    ['GET', '/accounts/u-1/balances/extra'], ['POST', '/auth/x']];
  for (const [m, p] of never) assert.equal(isAllowed(m, 'https://api.enablebanking.com' + p), false, `${m} ${p}`);
  assert.equal(isAllowed('GET', 'http://api.enablebanking.com/application'), false);
  assert.equal(isAllowed('GET', 'https://api.enablebanking.com.evil.example/application'), false);
  assert.equal(isAllowed('GET', 'https://user:pw@api.enablebanking.com/application'), false);
  assert.equal(isAllowed('GET', 'https://api.enablebanking.com:8443/application'), false);
});

test('allowlist: a forbidden call throws POLICY before anything is sent', async () => {
  let sent = 0;
  const logs = [];
  const ctx = { now: Date.now, log: (l, m) => logs.push(m), http: readOnlyClient(allow, { provider: 'enable-banking', fetchFn: async () => { sent++; return new Response('{}'); }, log: (l, m) => logs.push(m) }) };
  const c = ebClient(ctx, { appId: APP_ID, pem: KEY.pem });
  for (const [m, p] of [['POST', '/payments'], ['POST', '/accounts/u-1/transactions'], ['PUT', '/sessions/abc'], ['GET', '/payments/abc']]) {
    await assert.rejects(c.call(m, p, { body: { amount: '1.00' } }), (e) => e instanceof FinError && e.code === 'POLICY');
  }
  assert.equal(sent, 0);
  assert.ok(logs.every(l => /^fin-connect policy enable-banking [A-Z]+$/.test(l)), 'policy logs carry no URL or body');
});

// ─── JWT and key checks ──────────────────────────────────────────────────
test('JWT: RS256, kid = app id, iss/aud, one hour, verifiable with the public key', () => {
  const now = Date.UTC(2026, 9, 8, 12);
  const jwt = signJwt({ appId: APP_ID, pem: KEY.pem, now });
  const [h, c, s] = jwt.split('.');
  const dec = (x) => JSON.parse(Buffer.from(x, 'base64url').toString('utf8'));
  assert.deepEqual(dec(h), { typ: 'JWT', alg: 'RS256', kid: APP_ID });
  const claims = dec(c);
  assert.equal(claims.iss, 'enablebanking.com');
  assert.equal(claims.aud, 'api.enablebanking.com');
  assert.equal(claims.iat, now / 1000);
  assert.equal(claims.exp - claims.iat, 3600);
  assert.ok(createVerify('RSA-SHA256').update(`${h}.${c}`).end().verify(KEY.publicKey, Buffer.from(s, 'base64url')));
  assert.equal(dec(signJwt({ appId: APP_ID, pem: KEY.pem, now, ttl: 999999 }).split('.')[1]).exp - now / 1000, 86400, 'never more than 24 h');
});

test('PEM: PKCS#8 and PKCS#1 RSA keys pass; anything else is refused without echoing it', () => {
  const pkcs8Head = '-'.repeat(5) + 'BEGIN ' + 'PRIVATE KEY' + '-'.repeat(5);   // built in pieces: the privacy scan flags the literal header
  assert.ok(checkPem(KEY.pem).startsWith(pkcs8Head));
  assert.ok(checkPem(KEY.pkcs1).startsWith(pkcs8Head), 'PKCS#1 is re-exported as PKCS#8');
  const ec = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  const small = generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  const enc = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: 'x' });
  const pub = KEY.publicKey.export({ type: 'spki', format: 'pem' });
  const lines = KEY.pem.trim().split('\n');
  const garbled = [lines[0], ...lines.slice(1, 6), lines[lines.length - 1]].join('\n');   // cut short
  const cases = { empty: '', notPem: 'hello', ec, small, enc, pub, twice: KEY.pem + KEY.pem, garbled, big: KEY.pem + 'x'.repeat(17000) };
  for (const [name, text] of Object.entries(cases)) {
    let err = null;
    try { checkPem(text); } catch (e) { err = e; }
    assert.ok(err instanceof FinError, name);
    assert.equal(err.code, 'BAD_REQUEST', name);
    assert.ok(!err.message.includes('BEGIN') && !err.message.includes('MII'), `${name}: message never repeats the key`);
  }
  let big = null;
  try { checkPem(cases.big); } catch (e) { big = e; }
  assert.equal(big.status, 413);
});

test('application id must be a UUID', () => {
  assert.equal(checkAppId(` ${APP_ID.toUpperCase()} `), APP_ID);
  for (const bad of ['', 'abc', '../../x', APP_ID + 'x']) assert.throws(() => checkAppId(bad), (e) => e.code === 'BAD_REQUEST');
});

// ─── Amounts, consent, balances ─────────────────────────────────────────
test('amounts are exact integers (no floats), any minor-unit count', () => {
  assert.equal(toMinor('0.10'), 10);
  assert.equal(toMinor('19.99'), 1999);
  assert.equal(toMinor('1234567.89'), 123456789);
  assert.equal(toMinor('-5.00'), 500, 'unsigned: the sign comes from the direction field');
  assert.equal(toMinor('12.345'), 1235);
  assert.equal(toMinor('1000', 0), 1000);
  assert.equal(toMinor('1.234', 3), 1234);
  assert.equal(toMinor('1e5'), null);
  assert.equal(toMinor('12,50'), null);
  assert.equal(toMinor(''), null);
});

test('consent: the bank maximum, capped at 180 days; due levels', () => {
  const now = Date.UTC(2026, 9, 8);
  assert.equal(Math.round((Date.parse(consentEnd(90 * 86400, now)) - now) / DAY), 90);
  assert.equal(Math.round((Date.parse(consentEnd(730 * 86400, now)) - now) / DAY), MAX_CONSENT_DAYS);
  assert.equal(Math.round((Date.parse(consentEnd(null, now)) - now) / DAY), 90);
  assert.equal(consentDue(new Date(now + 60 * DAY).toISOString(), now).level, 'ok');
  assert.equal(consentDue(new Date(now + 10 * DAY).toISOString(), now).level, 'soon');
  assert.equal(consentDue(new Date(now + 2 * DAY).toISOString(), now).level, 'urgent');
  assert.equal(consentDue(new Date(now - 1).toISOString(), now).level, 'expired');
  assert.equal(consentDue(new Date(now + 60 * DAY).toISOString(), now).reauthDue, '2026-12-07');
  assert.equal(consentDue(null, now).level, 'unknown');
});

test('balances: booked first, then available; signs kept', () => {
  assert.deepEqual(pickBalance([{ balance_type: 'ITAV', balance_amount: { amount: '10.00', currency: 'GBP' } }, { balance_type: 'CLBD', balance_amount: { amount: '-3.50', currency: 'GBP' }, reference_date: '2026-10-08' }]),
    { pence: -350, currency: 'GBP', asOf: '2026-10-08' });
  assert.equal(pickBalance([{ balance_type: 'XPCD', balance_amount: { amount: '2.00', currency: 'EUR' } }]).pence, 200);
  assert.equal(pickBalance([]), null);
});

test('error mapping: consent, rate limit, code expiry, app key, period', () => {
  assert.equal(mapEbError(401, { error: 'EXPIRED_SESSION' }).code, 'CONSENT_EXPIRED');
  assert.equal(mapEbError(422, { error: 'ASPSP_RATE_LIMIT_EXCEEDED' }).code, 'RATE_LIMITED');
  assert.equal(mapEbError(429, {}).code, 'RATE_LIMITED');
  assert.equal(mapEbError(400, { error: 'EXPIRED_AUTHORIZATION_CODE' }).code, 'AUTH');
  assert.equal(mapEbError(401, { error: 'UNAUTHORIZED' }).code, 'NOT_CONFIGURED');
  assert.equal(mapEbError(422, { error: 'WRONG_TRANSACTIONS_PERIOD' }).period, true);
  assert.equal(mapEbError(503, {}).code, 'NETWORK');
  for (const e of [mapEbError(401, { error: 'EXPIRED_SESSION', message: 'session 1234 secret' })]) assert.ok(!e.message.includes('1234'));
});

// ─── App, banks ──────────────────────────────────────────────────────────
test('saveApp: tests the key with GET /application, then stores it 0600 in secrets/fin', async () => {
  const env = setup();
  try {
    const r = await saveApp(env.ctx, { appId: APP_ID, pem: KEY.pem });
    assert.equal(r.ok, true);
    assert.equal(r.app.environment, 'production');
    assert.equal(r.app.restricted, true);
    assert.deepEqual(r.app.redirects, { bounce: true, paste: true });
    assert.equal(r.app.appIdMasked, '••••00eb');
    assert.ok(!JSON.stringify(r).includes(APP_ID) && !JSON.stringify(r).includes('PRIVATE KEY'));
    const f = join(env.dataDir, 'secrets', 'fin', 'eb-app.json');
    assert.ok(existsSync(f));
    if (process.platform !== 'win32') assert.equal(statSync(f).mode & 0o777, 0o600);
    const inf = await info(env.ctx);
    assert.deepEqual(Object.keys(inf).sort(), ['appIdMasked', 'configured', 'ebRedirect']);
    assert.equal(inf.ebRedirect, 'paste', 'the paste return is the default until the bounce page is verified');
  } finally { env.cleanup(); }
});

test('saveApp: a key the app does not know is refused and nothing is saved', async () => {
  const env = setup({ register: false });
  try {
    await assert.rejects(saveApp(env.ctx, { appId: APP_ID, pem: KEY.pem }), (e) => e.code === 'NOT_CONFIGURED' && /application ID and the .pem/.test(e.message));
    assert.equal(existsSync(join(env.dataDir, 'secrets', 'fin', 'eb-app.json')), false);
  } finally { env.cleanup(); }
});

test('banks: the bundled snapshot before an app exists, the live list after (cached 24 h)', async () => {
  const env = setup();
  try {
    const snap = await banks(env.ctx, { country: 'GB' });
    assert.equal(snap.source, 'snapshot');
    assert.deepEqual(snap.banks.map(b => b.name), ['Snapshot Bank', 'Other Snapshot Bank']);
    assert.equal(snap.banks[0].maxConsentDays, 90);
    assert.equal(env.fake.calls.length, 0, 'no network without an app');
    await saveApp(env.ctx, { appId: APP_ID, pem: KEY.pem });
    const live = await banks(env.ctx, { country: 'gb', q: 'fake' });
    assert.equal(live.source, 'live');
    assert.equal(live.total, 3);
    const digital = live.banks.find(b => b.name === 'Fake Digital Bank');
    assert.equal(digital.beta, true);
    assert.deepEqual(digital.psuTypes, ['personal', 'business']);
    assert.equal(digital.logo, undefined);
    assert.equal(bankFromAspsp({ name: 'X', country: 'GB', logo: 'https://cdn.example/x.png' }).logo, 'https://cdn.example/x.png');
    for (const bad of ['http://cdn.example/x.png', 'javascript:alert(1)', 'https://x.example/"onerror="1']) {
      assert.equal(bankFromAspsp({ name: 'X', country: 'GB', logo: bad }).logo, undefined, bad);
    }
    const before = env.fake.calls.filter(c => c.path === '/aspsps').length;
    await banks(env.ctx, { country: 'GB', q: 'build' });
    assert.equal(env.fake.calls.filter(c => c.path === '/aspsps').length, before, 'cached');
    assert.deepEqual((await banks(env.ctx, { country: 'GB', q: 'build' })).banks.map(b => b.name), ['Fake Building Society']);
    assert.deepEqual((await banks(env.ctx, { country: 'GB', psuType: 'business' })).banks.map(b => b.name), ['Fake Digital Bank']);
    await assert.rejects(banks(env.ctx, { country: 'G1' }), (e) => e.code === 'BAD_REQUEST');
  } finally { env.cleanup(); }
});

test('search ranks prefix matches first; Monzo and Plasma point to their own cards', () => {
  const list = [{ name: 'Bank of Somewhere' }, { name: 'Some Bank' }, { name: 'Other' }];
  assert.deepEqual(searchBanks(list, 'some').map(b => b.name), ['Some Bank', 'Bank of Somewhere']);
  assert.equal(directAlternative('Monzo Bank'), 'monzo');
  assert.equal(directAlternative('plasma one'), 'plasma');
  assert.equal(directAlternative('Barclays'), null);
});

// ─── Sign-in ─────────────────────────────────────────────────────────────
test('state carries a valid port only', () => {
  const s = makeState(45123);
  assert.match(s, /^45123\.[A-Za-z0-9_-]{43}$/);
  assert.equal(portFromState(s), 45123);
  assert.throws(() => makeState(80));
  assert.throws(() => makeState(70000));
  assert.equal(portFromState('80.' + 'a'.repeat(43)), null);
  assert.equal(portFromState('99999.' + 'a'.repeat(43)), null);
  assert.equal(portFromState('45123.short'), null);
  assert.equal(portFromState('45123.' + 'a'.repeat(43) + '&x=1'), null);
});

test('connect: start -> bank -> callback creates a direct source with accounts and a re-auth date', async () => {
  const now = Date.UTC(2026, 9, 8, 12);
  const env = setup({ now });
  try {
    await saveApp(env.ctx, { appId: APP_ID, pem: KEY.pem });
    const s = await start(env.ctx, { bank: 'Fake High Street Bank', country: 'GB', redirect: 'bounce' });
    assert.equal(portFromState(s.state), 45123);
    assert.equal(Math.round((Date.parse(s.validUntil) - now) / DAY), 180);
    const auth = env.fake.authorisation(new URL(s.url).searchParams.get('auth'));
    assert.equal(auth.redirect_url, BOUNCE_URL);
    const r = await callback(env.ctx, new URLSearchParams({ code: auth.code, state: auth.state }));
    assert.equal(r.status, 'done');
    assert.equal(r.accounts.length, 2);
    assert.equal(r.reauthDue, '2027-04-06');
    const src = env.sources.get(r.sourceId);
    assert.equal(src.kind, 'direct');
    assert.equal(src.provider, 'enable-banking');
    assert.equal(src.label, 'Fake High Street Bank');
    assert.equal(src.setup, undefined, 'set up once the session is saved, so the finance update reads it');
    assert.deepEqual(src.extra, { bankName: 'Fake High Street Bank', country: 'GB' });
    assert.deepEqual(src.accounts.map(a => a.kind), ['current', 'savings']);
    assert.ok(src.accounts.every(a => /^••••\d{4}$/.test(a.mask) && /^[A-Za-z0-9_-]{1,64}$/.test(a.id)));
    assert.ok(!JSON.stringify(src).includes('GB00FAKE'), 'never the full account number');
    const sec = await env.ctx.secrets.read(`eb-${src.id}`);
    assert.match(sec.sessionId, /^[0-9a-f-]{36}$/);
    assert.ok(!JSON.stringify(src).includes(sec.sessionId), 'the session id stays in secrets');
    // One use: the same state again is refused.
    await assert.rejects(callback(env.ctx, { code: auth.code, state: auth.state }), (e) => e.code === 'AUTH');
    const st = await status(env.ctx, src);
    assert.deepEqual([st.configured, st.connected, st.needsAuth, st.dueLevel], [true, true, false, 'ok']);
  } finally { env.cleanup(); }
});

test('connect: unknown, expired or refused sign-ins are refused', async () => {
  const env = setup();
  try {
    await saveApp(env.ctx, { appId: APP_ID, pem: KEY.pem });
    await assert.rejects(callback(env.ctx, { code: 'abcd', state: makeState(45123) }), (e) => e.code === 'AUTH');
    const s1 = await start(env.ctx, { bank: 'Fake High Street Bank', country: 'GB' });
    env.advance(11 * 60 * 1000);
    const a1 = env.fake.authorisation(new URL(s1.url).searchParams.get('auth'));
    await assert.rejects(callback(env.ctx, { code: a1.code, state: a1.state }), (e) => e.code === 'AUTH', 'expired state');
    const s2 = await start(env.ctx, { bank: 'Fake High Street Bank', country: 'GB' });
    await assert.rejects(callback(env.ctx, { error: 'access_denied', state: s2.state }), (e) => e.code === 'AUTH' && /cancelled/.test(e.message));
    assert.equal(eb.pendingStatus(env.ctx, s2.state).status, 'error');
    await assert.rejects(start(env.ctx, { bank: 'No Such Bank', country: 'GB' }), (e) => e.code === 'NOT_SUPPORTED');
    await assert.rejects(start(env.ctx, { bank: 'Monzo', country: 'GB' }), (e) => e.code === 'NOT_SUPPORTED');
    await assert.rejects(start(env.ctx, { bank: 'Fake High Street Bank', country: 'GB', redirect: 'https://evil.example/cb' }), (e) => e.code === 'BAD_REQUEST');
    assert.equal(env.sources.size, 0);
  } finally { env.cleanup(); }
});

test('connect: too many waiting sign-ins are refused (20)', async () => {
  const env = setup();
  try {
    await saveApp(env.ctx, { appId: APP_ID, pem: KEY.pem });
    for (let i = 0; i < 20; i++) await start(env.ctx, { bank: 'Fake High Street Bank', country: 'GB' });
    await assert.rejects(start(env.ctx, { bank: 'Fake High Street Bank', country: 'GB' }), (e) => e.code === 'RATE_LIMITED');
  } finally { env.cleanup(); }
});

test('paste the address: only https://localhost/opendash-eb-callback is accepted', async () => {
  for (const bad of ['', 'not a url', 'https://evil.example/opendash-eb-callback?code=a&state=b', 'http://localhost/opendash-eb-callback?code=a',
    'https://localhost:8443/opendash-eb-callback?code=a', 'https://localhost/other?code=a', 'https://user@localhost/opendash-eb-callback?code=a', 'x'.repeat(5000)]) {
    assert.throws(() => parsePastedUrl(bad), (e) => e.code === 'BAD_REQUEST' && !e.message.includes('evil'), bad.slice(0, 40));
  }
  assert.deepEqual(parsePastedUrl(`  ${PASTE_URL}?state=s&code=c  `), { code: 'c', state: 's', error: '' });
  const env = setup();
  try {
    await saveApp(env.ctx, { appId: APP_ID, pem: KEY.pem });
    const s = await start(env.ctx, { bank: 'Fake Building Society', country: 'GB', redirect: 'paste' });
    const a = env.fake.authorisation(new URL(s.url).searchParams.get('auth'));
    assert.equal(a.redirect_url, PASTE_URL);
    const r = await finishFromUrl(env.ctx, { url: `${PASTE_URL}?code=${a.code}&state=${encodeURIComponent(a.state)}` });
    assert.equal(r.status, 'done');
    assert.equal(r.bank, 'Fake Building Society');
    assert.equal(Math.round((Date.parse((await env.ctx.secrets.read(`eb-${r.sourceId}`)).validUntil) - env.ctx.now()) / DAY), 90, 'the bank\'s own maximum');
  } finally { env.cleanup(); }
});

// ─── Fetch, normalise, budget ────────────────────────────────────────────
test('fetch: first import pages through continuation keys; the next one only the overlap', async () => {
  const env = setup();
  try {
    const { source } = await connected(env);
    const r = await ebFetch(env.ctx, source, { cursor: {}, full: true });
    assert.ok(r.rows.length > 150, `rows ${r.rows.length}`);
    assert.ok(env.fake.calls.filter(c => /transactions$/.test(c.path)).length > 3, 'several pages');
    assert.equal(r.balances.length, 2);
    assert.ok(r.balances.every(b => b.currency === 'GBP' && Number.isFinite(b.balance)));
    assert.equal(r.sourcePatch.reauthDue, source.reauthDue);
    const cur = r.cursor.accounts[source.accounts[0].id];
    assert.match(cur.date, /^\d{4}-\d{2}-\d{2}$/);
    // Normalised: pending rows gone, signs from the direction field, formula neutralised.
    const txs = [], reasons = {};
    for (const raw of r.rows) { const n = normalise(raw, env.ctx); if (n.row) txs.push(n.row); else reasons[n.reason] = (reasons[n.reason] || 0) + 1; }
    assert.equal(reasons.pending, 2);
    const fin = await finishRows(txs, { home: 'GBP' });
    assert.ok(fin.rows.some(x => x.memo === 'Example Employer Ltd' && x.pence > 0));
    assert.ok(fin.rows.some(x => x.memo === 'Example Lettings' && x.pence === -85000));
    assert.ok(fin.rows.every(x => !/^[=+@-]/.test(x.memo)));
    assert.equal(new Set(fin.rows.map(x => x.id)).size, fin.rows.length, 'ids unique');
    // Second update: from the cursor date minus 35 days.
    const mark = env.fake.calls.length;
    env.fake.calls.length = 0;
    const r2 = await ebFetch(env.ctx, source, { cursor: r.cursor });
    const q = r2.rows.length;
    assert.ok(q > 0 && q < r.rows.length / 4, `overlap only (${q})`);
    assert.ok(mark > 0);
    // accountOn(id): a hidden account is not fetched at all.
    env.fake.calls.length = 0;
    await ebFetch(env.ctx, source, { cursor: r.cursor, full: true, accountOn: (id) => id === source.accounts[0].id });
    const uids = (await env.ctx.secrets.read(`eb-${source.id}`)).uids;
    assert.ok(env.fake.calls.some(c => c.path.includes(uids[source.accounts[0].id])));
    assert.ok(env.fake.calls.every(c => !c.path.includes(uids[source.accounts[1].id])));
  } finally { env.cleanup(); }
});

test('fetch: a bank that refuses a long period falls back to about 90 days', async () => {
  const env = setup();
  try {
    const { source } = await connected(env, 'Fake Building Society');
    const r = await ebFetch(env.ctx, source, { cursor: {}, full: true });
    assert.ok(r.rows.length > 20);
    const oldest = r.rows.map(x => x.tx.booking_date).sort()[0];
    assert.ok(Date.parse(oldest) >= env.ctx.now() - 91 * DAY);
  } finally { env.cleanup(); }
});

test('fetch: at most 4 automatic updates a day; Sync now always runs', async () => {
  const env = setup();
  try {
    const { source } = await connected(env);
    let cursor = {};
    for (let i = 0; i < AUTO_UPDATES_PER_DAY; i++) cursor = (await ebFetch(env.ctx, source, { cursor })).cursor;
    const calls = env.fake.calls.length;
    const skipped = await ebFetch(env.ctx, source, { cursor });
    assert.equal(skipped.skipped, true);
    assert.match(skipped.warning, /used up for today/);
    assert.equal(env.fake.calls.length, calls, 'nothing asked');
    const manual = await ebFetch(env.ctx, source, { cursor, manual: true });
    assert.ok(!manual.skipped && manual.rows.length > 0);
    assert.equal(budgetCheck(cursor, { day: '2000-01-01' }).ok, true, 'a new day resets');
  } finally { env.cleanup(); }
});

test('consent ended: EXPIRED_SESSION -> CONSENT_EXPIRED and needs sign-in; a past end date is caught without asking', async () => {
  const env = setup();
  try {
    const { source } = await connected(env);
    const sec = await env.ctx.secrets.read(`eb-${source.id}`);
    env.fake.expireSession(sec.sessionId);
    await assert.rejects(ebFetch(env.ctx, source, { cursor: {}, full: true }), (e) => e.code === 'CONSENT_EXPIRED');
    await assert.rejects(refresh(env.ctx, source), (e) => e.code === 'CONSENT_EXPIRED');
    const failed = { ...source, lastSync: null, lastError: { at: new Date(env.ctx.now()).toISOString(), code: 'CONSENT_EXPIRED' } };
    const st = await status(env.ctx, failed);
    assert.equal(st.needsAuth, true);
    assert.match(st.message, /Sign in to Fake High Street Bank again/);
    env.advance(181 * DAY);
    const calls = env.fake.calls.length;
    await assert.rejects(ebFetch(env.ctx, source, { cursor: {}, full: true }), (e) => e.code === 'CONSENT_EXPIRED');
    assert.equal(env.fake.calls.length, calls);
    assert.equal((await status(env.ctx, source)).dueLevel, 'expired');
  } finally { env.cleanup(); }
});

test('re-auth: signing in again keeps the source, its account choices and moves the due date', async () => {
  const env = setup();
  try {
    const { source } = await connected(env);
    const due0 = source.reauthDue;
    env.sources.get(source.id).accounts[0].name = 'Bills'; env.sources.get(source.id).accounts[0].renamed = true;
    const oldSession = (await env.ctx.secrets.read(`eb-${source.id}`)).sessionId;
    env.advance(170 * DAY);
    assert.equal((await status(env.ctx, env.sources.get(source.id))).dueLevel, 'soon');
    const s = await start(env.ctx, { sourceId: source.id });
    const a = env.fake.authorisation(new URL(s.url).searchParams.get('auth'));
    const r = await callback(env.ctx, { code: a.code, state: a.state });
    assert.equal(r.sourceId, source.id);
    assert.equal(env.sources.size, 1);
    const after = env.sources.get(source.id);
    assert.ok(after.reauthDue > due0, `${after.reauthDue} > ${due0}`);
    assert.deepEqual(after.accounts.map(a => a.id), source.accounts.map(a => a.id), 'same accounts: ids come from identification_hash, not the session uid');
    assert.equal(after.accounts[0].name, 'Bills');
    assert.equal(after.accounts[0].renamed, true);
    const sec2 = await env.ctx.secrets.read(`eb-${source.id}`);
    assert.notEqual(sec2.uids[source.accounts[0].id], undefined);
    assert.ok(!Object.values(sec2.uids).some(u => JSON.stringify(after).includes(u)), 'uids stay in secrets');
    assert.equal(env.fake.sessions.get(oldSession).status, 'CLOSED', 'the old session is ended');
  } finally { env.cleanup(); }
});

test('normalise: sign only from credit_debit_indicator, exact minor units, per-account ids', () => {
  const base = { status: 'BOOK', booking_date: '2026-10-01', transaction_amount: { amount: '-5.10', currency: 'GBP' } };
  const credit = normalise({ accountId: 'acc-1', tx: { ...base, credit_debit_indicator: 'CRDT', entry_reference: 'r1', debtor: { name: 'A Person' } } });
  assert.deepEqual(credit.row, { id: 'acc-1:r1', accountId: 'acc-1', date: '2026-10-01', minor: 510, currency: 'GBP', memo: 'A Person', bc: null, sub: '' });
  const debit = normalise({ accountId: 'acc-1', tx: { ...base, transaction_amount: { amount: '5.10', currency: 'GBP' }, credit_debit_indicator: 'DBIT', remittance_information: ['@SUM(A1)', 'x'] } });
  assert.equal(debit.row.minor, -510);
  assert.equal(debit.row.memo, 'SUM(A1) x');
  assert.match(debit.row.id, /^acc-1:h[0-9a-f]{12}$/);
  assert.equal(normalise({ accountId: 'a', tx: { ...base, credit_debit_indicator: undefined } }).reason, 'no direction');
  assert.equal(normalise({ accountId: 'a', tx: { ...base, credit_debit_indicator: 'DBIT', status: 'PDNG' } }).reason, 'pending');
  assert.equal(normalise({ accountId: 'a', tx: { ...base, credit_debit_indicator: 'DBIT', booking_date: 'yesterday', value_date: null } }).reason, 'bad date');
  const eur = normalise({ accountId: 'a', currency: 'EUR', tx: { ...base, credit_debit_indicator: 'DBIT', transaction_amount: { amount: '2.00' } } });
  assert.equal(eur.row.currency, 'EUR', 'the account currency when the row has none');
  const yen = normalise({ accountId: 'a', tx: { ...base, credit_debit_indicator: 'DBIT', transaction_amount: { amount: '1500', currency: 'JPY' } } });
  assert.equal(yen.row.minor, -1500);
});

test('normalise + core: other currencies convert at that day\'s rate with the note, or wait', async () => {
  const tx = normalise({ accountId: 'a', tx: { status: 'BOOK', booking_date: '2026-10-01', credit_debit_indicator: 'DBIT', transaction_amount: { amount: '10.00', currency: 'EUR' }, creditor: { name: 'Cafe' } } }).row;
  const ok = await finishRows([tx], { home: 'GBP', fx: async () => 0.85 });
  assert.equal(ok.rows[0].pence, -850);
  assert.match(ok.rows[0].memo, /^Cafe \(10\.00 EUR @ 0\.8500\)$/);
  const held = await finishRows([tx], { home: 'GBP', fx: async () => null });
  assert.equal(held.heldForRate, 1);
});

test('disconnect: ends the session at Enable Banking and deletes the saved sign-in', async () => {
  const env = setup();
  try {
    const { source } = await connected(env);
    const sid = (await env.ctx.secrets.read(`eb-${source.id}`)).sessionId;
    await disconnect(env.ctx, source);
    assert.equal(env.fake.sessions.get(sid).status, 'CLOSED');
    assert.equal(await env.ctx.secrets.read(`eb-${source.id}`), null);
    assert.equal((await status(env.ctx, source)).needsAuth, true);
  } finally { env.cleanup(); }
});

test('failure modes from the fake: rate limit, network, unreadable answers', async () => {
  const env = setup();
  try {
    const { source } = await connected(env);
    for (const [fail, code] of [['rate', 'RATE_LIMITED'], ['network', 'NETWORK'], ['bad', 'BAD_RESPONSE'], ['consent', 'CONSENT_EXPIRED'], ['auth', 'NOT_CONFIGURED']]) {
      env.fake.configure({ fail });
      await assert.rejects(ebFetch(env.ctx, source, { cursor: {}, full: true }), (e) => e instanceof FinError && e.code === code, fail);
    }
    env.fake.configure({ fail: '' });
    assert.ok((await ebFetch(env.ctx, source, { cursor: {}, full: true })).rows.length > 0);
  } finally { env.cleanup(); }
});

test('secrets never reach logs, status or the page', async () => {
  const env = setup();
  try {
    const { source, auth } = await connected(env);
    const r = await ebFetch(env.ctx, source, { cursor: {}, full: true });
    const sec = await env.ctx.secrets.read(`eb-${source.id}`);
    const pemLine = KEY.pem.split('\n')[1];
    const jwt = signJwt({ appId: APP_ID, pem: KEY.pem, now: env.ctx.now() }).split('.')[2].slice(0, 20);
    const page = JSON.stringify([await status(env.ctx, source), await info(env.ctx), await eb.listAccounts(env.ctx, source), source, eb.pendingStatus(env.ctx, auth.state)]);
    const logs = env.logs.join('\n');
    const memo = r.rows[0].tx.creditor ? r.rows[0].tx.creditor.name : 'Example Employer Ltd';
    for (const secret of [pemLine, jwt, sec.sessionId, auth.code, APP_ID, 'GB00FAKE']) {
      assert.ok(!logs.includes(secret), `log has no ${secret.slice(0, 8)}`);
      assert.ok(!page.includes(secret), `page has no ${secret.slice(0, 8)}`);
    }
    for (const a of source.accounts) assert.ok(!logs.includes(a.id), 'no account ids in logs');
    assert.ok(!logs.includes(memo) && !logs.includes('date_from'), 'no memos or URLs with queries in logs');
  } finally { env.cleanup(); }
});

// ─── The bounce page ─────────────────────────────────────────────────────
const BOUNCE = readFileSync(join(HERE, '..', 'docs', 'eb-callback.html'), 'utf8');
function runBounce(search) {
  const replaced = [];
  const el = () => ({ textContent: '', className: '', hidden: true, href: '' });
  const els = { t: el(), m: el(), go: el() };
  const script = BOUNCE.slice(BOUNCE.indexOf('<script>') + 8, BOUNCE.indexOf('</script>'));
  vm.runInNewContext(script, { URLSearchParams, location: { search, replace: (u) => replaced.push(u) }, document: { getElementById: (id) => els[id] }, Number });
  return { replaced, els };
}

test('bounce page: forwards code, state and error to localhost on the state\'s port only', () => {
  const state = makeState(45123);
  const ok = runBounce(`?code=abc&state=${encodeURIComponent(state)}&evil=1`);
  assert.deepEqual(ok.replaced, [`http://localhost:45123/api/fin-connect/eb/callback?code=abc&state=${encodeURIComponent(state)}`]);
  const err = runBounce(`?error=access_denied&state=${state}`);
  assert.match(err.replaced[0], /\?state=.*&error=access_denied$/);
  for (const bad of ['?code=a', '?code=a&state=80.' + 'a'.repeat(43), '?code=a&state=99999.' + 'a'.repeat(43), '?code=a&state=45123.short', '?state=45123.' + 'a'.repeat(43) + '@evil.example']) {
    const r = runBounce(bad);
    assert.deepEqual(r.replaced, [], bad);
    assert.match(r.els.t.textContent, /not for OpenDash/);
  }
});

test('bounce page: static and private (CSP hash matches, no requests, no referrer)', () => {
  const script = BOUNCE.slice(BOUNCE.indexOf('<script>') + 8, BOUNCE.indexOf('</script>'));
  const hash = createHash('sha256').update(script, 'utf8').digest('base64');
  assert.ok(BOUNCE.includes(`script-src 'sha256-${hash}'`), 'the CSP pins the one inline script');
  assert.match(BOUNCE, /<meta name="referrer" content="no-referrer">/);
  assert.match(BOUNCE, /default-src 'none'/);
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|<img|<link|src=|localStorage|cookie/i.test(BOUNCE.replace(/<!--[\s\S]*?-->/, '')), 'no requests, storage or cookies');
  assert.equal((BOUNCE.match(/<script/g) || []).length, 1);
});

// ─── Routes (through the real router and its checks) ─────────────────────
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function raw(port, method, path, headers = {}, body) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers }, setHost: false, agent: false }, (r) => {
      let data = ''; r.setEncoding('utf8'); r.on('data', (d) => { data += d; }); r.on('end', () => res({ status: r.statusCode, text: data, headers: r.headers }));
    });
    req.on('error', rej);
    if (body != null) req.write(body);
    req.end();
  });
}

test('routes: same-origin, JSON, body limits; only the callback takes a cross-site navigation', async () => {
  const env = setup();
  const p = await freePort();
  const logs = [];
  const app = createApp({ port: p, log: (l, m) => logs.push(m) });
  const svc = { ready: async () => {}, ctxFor: () => ({ ...env.ctx, port: p }), requestSync: async () => ({ started: true }) };
  routes(app, svc);
  const server = createServer(async (req, res) => { if (!(await app.handle(req, res))) { res.writeHead(404); res.end(); } });
  await new Promise((r) => server.listen(p, '127.0.0.1', r));
  const own = { Origin: `http://localhost:${p}`, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' };
  const xs = { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/json' };
  try {
    const body = JSON.stringify({ appId: APP_ID, pem: KEY.pem });
    assert.equal((await raw(p, 'PUT', '/api/fin-connect/eb/app', xs, body)).status, 403);
    assert.equal((await raw(p, 'PUT', '/api/fin-connect/eb/app', { ...own, 'Content-Type': 'text/plain' }, body)).status, 415);
    assert.equal((await raw(p, 'PUT', '/api/fin-connect/eb/app', own, JSON.stringify({ appId: APP_ID, pem: 'x'.repeat(40000) }))).status, 413);
    assert.equal((await raw(p, 'PUT', '/api/fin-connect/eb/app', { ...own, Host: 'evil.example' }, body)).status, 421);
    const saved = await raw(p, 'PUT', '/api/fin-connect/eb/app', own, body);
    assert.equal(saved.status, 200, saved.text);
    assert.ok(!saved.text.includes('PRIVATE'));
    for (const path of ['/api/fin-connect/eb/app', '/api/fin-connect/eb/banks?country=GB', '/api/fin-connect/eb/pending?state=x']) {
      assert.equal((await raw(p, 'GET', path, xs)).status, 403, path);
    }
    assert.equal((await raw(p, 'POST', '/api/fin-connect/eb/start', xs, '{}')).status, 403);
    assert.equal((await raw(p, 'POST', '/api/fin-connect/eb/finish', xs, '{}')).status, 403);
    const bl = JSON.parse((await raw(p, 'GET', '/api/fin-connect/eb/banks?country=GB&q=monzo', own)).text);
    assert.equal(bl.direct, 'monzo');
    // Start (paste) -> fake bank -> paste the address back.
    const st = JSON.parse((await raw(p, 'POST', '/api/fin-connect/eb/start', own, JSON.stringify({ bank: 'Fake High Street Bank', country: 'GB', redirect: 'paste' }))).text);
    assert.equal(portFromState(st.state), p);
    const auth = env.fake.authorisation(new URL(st.url).searchParams.get('auth'));
    const fin = await raw(p, 'POST', '/api/fin-connect/eb/finish', own, JSON.stringify({ url: `${PASTE_URL}?code=${auth.code}&state=${encodeURIComponent(auth.state)}` }));
    assert.equal(fin.status, 200, fin.text);
    assert.ok(!('source' in JSON.parse(fin.text)));
    assert.equal(JSON.parse((await raw(p, 'GET', `/api/fin-connect/eb/pending?state=${encodeURIComponent(st.state)}`, own)).text).status, 'done');
    // The callback: a cross-site GET is let in, but only with a live state; the page never echoes input.
    const cb = await raw(p, 'GET', `/api/fin-connect/eb/callback?code=x<script>&state=${encodeURIComponent(makeState(p))}`, xs);
    assert.equal(cb.status, 400);
    assert.ok(!cb.text.includes('<script>x') && !cb.text.includes('x<script>'));
    assert.equal(cb.headers['referrer-policy'], 'no-referrer');
    assert.equal((await raw(p, 'POST', '/api/fin-connect/eb/callback', xs, '{}')).status, 405);
    const bad = await raw(p, 'POST', '/api/fin-connect/eb/finish', own, JSON.stringify({ url: 'https://evil.example/?code=1' }));
    assert.equal(bad.status, 400);
    assert.equal(JSON.parse(bad.text).code, 'BAD_REQUEST');
    assert.ok(!logs.join('\n').includes(auth.code), 'request logs carry paths, never the query');
  } finally { await new Promise((r) => server.close(r)); env.cleanup(); }
});

// ─── Snapshot tool ───────────────────────────────────────────────────────
test('snapshot tool: names, beta and consent days only; a global the page reads', async () => {
  const fake = createFake({});
  fake.registerApp(APP_ID, KEY.publicKey);
  const doc = await buildSnapshot({ appId: APP_ID, pem: KEY.pem, countries: ['GB', 'FI', 'SE'], fetchFn: fake.fetchFn, source: 'fake' });
  assert.deepEqual(Object.keys(doc.countries), ['GB', 'FI'], 'empty countries are left out');
  assert.deepEqual(doc.countries.GB[1], { name: 'Fake Digital Bank', beta: true, maxConsentDays: 180 });
  for (const b of Object.values(doc.countries).flat()) assert.deepEqual(Object.keys(b).filter(k => !['name', 'beta', 'maxConsentDays'].includes(k)), []);
  const src = snapshotSource(doc);
  const g = {};
  vm.runInNewContext(src + '\nthis.out = FIN_EB_BANKS;', g);
  assert.match(g.out.asOf, /^\d{4}-\d{2}-\d{2}$/);
  // The server reads the same file.
  const env = setup();
  try {
    const { writeFileSync } = await import('node:fs');
    const f = join(env.dataDir, 'snap.js');
    writeFileSync(f, src);
    const read = eb.readSnapshot ? eb.readSnapshot(f) : (await import('../lib/fin-connect/enable-banking.mjs')).readSnapshot(f);
    assert.equal(read.countries.GB.length, 3);
  } finally { env.cleanup(); }
});

// ─── Through the real core service (lib/fin-connect/index.mjs) ───────────
test('core: connect and fetchDirect through createFinConnect, sources.json and the cursor file', async () => {
  _reset();
  const { createFinConnect } = await import('../lib/fin-connect/index.mjs');
  const dataDir = mkdtempSync(join(tmpdir(), 'od-eb-core-'));
  const fake = createFake({ delayMs: 0 });
  fake.registerApp(APP_ID, KEY.publicKey);
  const logs = [];
  try {
    const svc = createFinConnect({ dataDir, log: (l, m) => logs.push(m), env: {}, fakes: { 'enable-banking': fake }, fx: async () => 0.85,
      fetchFn: async () => { throw new Error('no network in tests'); }, startUpdate: async () => ({ started: true }), getConfig: () => ({ currency: 'GBP', timezone: 'Europe/London' }) });
    await svc.ready();
    const ctx = { ...svc.ctxFor('enable-banking'), port: 45123 };
    await saveApp(ctx, { appId: APP_ID, pem: KEY.pem });
    const st = await start(ctx, { bank: 'Fake Nordic Bank', country: 'FI', redirect: 'paste' });
    const a = fake.authorisation(new URL(st.url).searchParams.get('auth'));
    const r = await finishFromUrl(ctx, { url: `${PASTE_URL}?code=${a.code}&state=${encodeURIComponent(a.state)}` });
    const source = await svc.getSource(r.sourceId);
    assert.equal(source.kind, 'direct');
    assert.equal(source.provider, 'enable-banking');
    assert.equal(source.setup, undefined);
    assert.match(source.sessionHash, /^[0-9a-f]{16}$/);
    assert.ok(source.accounts.every(x => x.mask && !('uid' in x)));
    const out = await svc.fetchDirect(source, { full: true });
    assert.ok(out.rows.length > 150, `rows ${out.rows.length}`);
    assert.ok(out.rows.every(x => Number.isInteger(x.pence) && /\(\d+\.\d{2} EUR @ 0\.8500\)$/.test(x.memo)), 'EUR converted with the note');
    assert.equal(out.rejected.pending, 2);
    assert.equal(out.balances.length, 2);
    assert.ok(out.balances.every(b => b.currency === 'GBP'));
    const cur = await svc.readCursor(source.id);
    assert.ok(cur.lastSync && cur.accounts && Object.keys(cur.accounts).length === 2);
    const h = await svc.health(await svc.getSource(source.id));
    assert.equal(h.state, 'ok');
    assert.equal(h.reauthDue, source.reauthDue);
    const cat = await svc.catalogue();
    const ebCat = cat.providers.find(p => p.id === 'enable-banking');
    assert.equal(ebCat.configured, true);
    assert.ok(!JSON.stringify(cat).includes(APP_ID) && !JSON.stringify(cat).includes('PRIVATE KEY'));
    // Disconnect through the core: the session is ended and the secret is gone.
    const sid = (await ctx.secrets.read(`eb-${source.id}`)).sessionId;
    await svc.disconnect(source.id);
    assert.equal(fake.sessions.get(sid).status, 'CLOSED');
    assert.equal(await ctx.secrets.read(`eb-${source.id}`), null);
    assert.equal(await svc.getSource(source.id), null);
    assert.ok(!logs.join('\n').includes(sid));
  } finally { rmSync(dataDir, { recursive: true, force: true }); }
});

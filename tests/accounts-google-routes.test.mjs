// Google accounts end to end through the real router and the Node binding:
// the own-app setting, begin with ticked features, the sign-in return, the
// first read into a snapshot, and the move of the old single connection.
// A private server on a free port (never 4173), temp folders, a fake Google.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request } from 'node:http';
import { createApp } from '../server/router.mjs';
import registerAccounts from '../server/routes/accounts.mjs';
import registerGoogle from '../server/routes/google.mjs';
import { createAccountsService } from '../lib/accounts.mjs';
import { dataPaths } from '../lib/datadir.mjs';
import { secretStore, fileBackend } from '../lib/secret-store.mjs';
import { GOOGLE_TOKEN_URL, GOOGLE_SCOPES } from '../lib/accounts/google.mjs';

const OWN = 'synthetic-own-3333.apps.googleusercontent.com', OWN_SECRET = 'GOCSPX-own-synthetic-3';
const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const idToken = (claims) => `${b64({ alg: 'RS256' })}.${b64({ iss: 'https://accounts.google.com', aud: OWN, exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}.c2ln`;

let base, port, srv;
const servers = [];
function raw(p, method, path, headers = {}, body) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port: p, method, path, headers: { Host: `localhost:${p}`, ...headers }, setHost: false, agent: false }, (r) => {
      let data = ''; r.setEncoding('utf8'); r.on('data', (d) => { data += d; }); r.on('end', () => res({ status: r.statusCode, text: data, headers: r.headers }));
    });
    req.on('error', rej);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}
const SAME = (p) => ({ Origin: `http://localhost:${p}`, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' });
const EVIL = { Origin: 'https://accounts.google.com', 'Sec-Fetch-Site': 'cross-site' };

/** A data folder + its own secret folder + a server on a free port, with a scripted Google. */
async function serverFor(name, google, { prepare } = {}) {
  const dir = join(base, name, 'data'); mkdirSync(dir, { recursive: true });
  const store = secretStore(null, { backend: fileBackend(join(base, name, 'secrets')) });
  if (prepare) await prepare(store);
  const ctx = { dataDir: dir, get paths() { return dataPaths(dir); }, log: () => {} };
  const s = createServer(async (req, res) => { if (!(await app.handle(req, res))) { res.statusCode = 404; res.end(); } });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  servers.push(s);
  const p = s.address().port;
  ctx.port = p;
  ctx.accounts = createAccountsService({ dataDir: dir, port: () => p, fetchFn: google, deviceId: 'device-google-1', store });
  const app = createApp(ctx);
  registerAccounts(app);
  registerGoogle(app);
  return { dir, store, port: p, ctx };
}

before(() => { base = mkdtempSync(join(tmpdir(), 'accounts-google-routes-')); delete process.env.OPENDASH_GOOGLE_CLIENT_ID; delete process.env.OPENDASH_GOOGLE_CLIENT_SECRET; });
after(async () => { for (const s of servers) await new Promise((r) => s.close(r)); rmSync(base, { recursive: true, force: true }); });

test('own Google app -> begin with only mail ticked -> sign-in return -> account, its email source and a first snapshot', async () => {
  const calls = [];
  const google = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url) === GOOGLE_TOKEN_URL) {
      const f = Object.fromEntries(new URLSearchParams(init.body));
      assert.equal(f.client_secret, OWN_SECRET);
      assert.match(f.code_verifier, /^[A-Za-z0-9_-]{43,128}$/);
      return reply({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600, scope: `openid email ${GOOGLE_SCOPES.mail}`, id_token: idToken({ sub: '42', email: 'pat.synthetic@gmail.com' }) });
    }
    const u = new URL(url);
    assert.equal(init.method, 'GET');
    if (u.pathname.endsWith('/messages')) return reply({ messages: [{ id: 'm1', threadId: 't1' }] });
    return reply({ id: 'm1', threadId: 't1', labelIds: ['INBOX', 'UNREAD'], snippet: 'Hello &amp; welcome', internalDate: String(Date.now() - 60000), payload: { headers: [{ name: 'Subject', value: 'Welcome' }, { name: 'From', value: 'Sam <sam@example.test>' }] } });
  };
  const { dir, store, port: p } = await serverFor('one', google);
  let info = JSON.parse((await raw(p, 'GET', '/api/accounts', SAME(p))).text);
  assert.deepEqual(info.providers.google, { available: false, custom: false, builtIn: false, hasSecret: false, clientIdHint: null });
  const nope = await raw(p, 'POST', '/api/accounts/begin', SAME(p), { provider: 'google', email: 'pat.synthetic@gmail.com' });
  assert.equal(nope.status, 409); assert.equal(JSON.parse(nope.text).code, 'NOT_CONFIGURED');

  const bad = await raw(p, 'PUT', '/api/accounts/google-app', SAME(p), { clientId: 'not-a-client' });
  assert.equal(bad.status, 400);
  const saved = await raw(p, 'PUT', '/api/accounts/google-app', SAME(p), { json: JSON.stringify({ installed: { client_id: OWN, client_secret: OWN_SECRET } }) });
  assert.equal(saved.status, 200);
  assert.ok(!saved.text.includes(OWN_SECRET) && !saved.text.includes(OWN), 'never the secret or the full id back');
  assert.deepEqual(JSON.parse(saved.text), { available: true, custom: true, builtIn: false, hasSecret: true, clientIdHint: 'synthetic-…' });
  assert.deepEqual(await store.get('google-client'), { clientId: OWN, clientSecret: OWN_SECRET });

  const begin = JSON.parse((await raw(p, 'POST', '/api/accounts/begin', SAME(p), { provider: 'google', email: 'Pat.Synthetic@gmail.com', features: { mail: true, calendar: false } })).text);
  const u = new URL(begin.url);
  assert.equal(u.origin, 'https://accounts.google.com');
  assert.equal(u.searchParams.get('scope'), `openid email ${GOOGLE_SCOPES.mail}`);
  assert.equal(u.searchParams.get('redirect_uri'), `http://localhost:${p}/api/accounts/callback`);
  assert.equal(u.searchParams.get('login_hint'), 'pat.synthetic@gmail.com');
  assert.equal(begin.kind, 'personal');

  // Google sends the browser back: a cross-site navigation, accepted only with the state.
  const back = await raw(p, 'GET', `/api/accounts/callback?state=${encodeURIComponent(u.searchParams.get('state'))}&code=synthetic-code`, EVIL);
  assert.equal(back.status, 200, back.text);
  assert.match(back.text, /pat\.synthetic@gmail\.com is now connected/);
  assert.ok(!back.text.includes('rt-1') && !back.text.includes('at-1'));

  info = JSON.parse((await raw(p, 'GET', '/api/accounts', SAME(p))).text);
  assert.equal(info.accounts.length, 1);
  const a = info.accounts[0];
  assert.deepEqual([a.provider, a.email, a.kind, a.status, a.features], ['google', 'pat.synthetic@gmail.com', 'personal', 'connected', { mail: true, calendar: false }]);
  assert.ok(!readFileSync(join(dir, 'accounts.json'), 'utf8').includes('rt-1'), 'no token in the data folder');
  assert.equal((await store.get('accounts/' + a.id)).refresh_token, 'rt-1');
  const sources = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.filter((s) => s.account === a.id);
  assert.deepEqual(sources.map((s) => [s.capability, s.kind, s.enabled]), [['email', 'google', true]]);
  const snap = JSON.parse(readFileSync(join(dir, 'inbox', 'sources', sources[0].id + '.json'), 'utf8'));
  assert.equal(snap.messages.length, 1);
  assert.deepEqual([snap.messages[0].subject, snap.messages[0].snippet, snap.messages[0].unread, snap.messages[0].sourceId], ['Welcome', 'Hello & welcome', true, sources[0].id]);
  assert.ok(!calls.some((c) => /calendar/.test(c.url)), 'calendar was not ticked: never read');

  // GET begin (opened in a new tab) takes the features as a list.
  const r302 = await raw(p, 'GET', '/api/accounts/begin?provider=google&email=pat.synthetic%40gmail.com&features=calendar', { 'Sec-Fetch-Site': 'same-origin' });
  assert.equal(r302.status, 302);
  assert.equal(new URL(r302.headers.location).searchParams.get('scope'), `openid email ${GOOGLE_SCOPES.calendar}`);

  // The old "Connect Google" address now leads to Connections; it never starts a single connection.
  const old = await raw(p, 'GET', '/api/google/connect', { 'Sec-Fetch-Site': 'same-origin' });
  assert.deepEqual([old.status, old.headers.location], [302, '/#view=connections']);
  assert.equal(await store.get('google-tokens'), null);

  // Back to the built-in app (there is none in this copy): Google is not available any more.
  const reset = JSON.parse((await raw(p, 'PUT', '/api/accounts/google-app', SAME(p), { clientId: null })).text);
  assert.deepEqual([reset.available, reset.custom], [false, false]);
});

test('the old single Google connection appears as an account with its sources at the first request', async () => {
  const google = async (url) => (String(url) === GOOGLE_TOKEN_URL ? reply({ access_token: 'at-x', expires_in: 3600 }) : reply({ messages: [], items: [] }));
  const { dir, store, port: p } = await serverFor('legacy', google, {
    prepare: async (s) => {
      await s.set('google-client', { installed: { client_id: OWN, client_secret: OWN_SECRET } });
      await s.set('google-tokens', { refresh_token: 'rt-old', access_token: null, expires_at: 0, account: 'old.synthetic@gmail.com' });
    },
  });
  const info = JSON.parse((await raw(p, 'GET', '/api/accounts', SAME(p))).text);
  assert.equal(info.accounts.length, 1);
  const a = info.accounts[0];
  assert.deepEqual([a.provider, a.email, a.legacy, a.status, a.features, a.here.signedIn], ['google', 'old.synthetic@gmail.com', true, 'connected', { mail: true, calendar: true }, true]);
  assert.equal(info.providers.google.custom, true, 'the old app stays this computer\'s own Google app');
  assert.equal(await store.get('google-tokens'), null);
  const sources = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.filter((s) => s.account === a.id);
  assert.deepEqual(sources.map((s) => s.capability).sort(), ['calendar', 'email']);
  const sync = JSON.parse((await raw(p, 'POST', '/api/accounts/sync', SAME(p), { id: a.id })).text);
  assert.deepEqual(sync.results.map((r) => [r.feature, r.ok]).sort(), [['calendar', true], ['mail', true]]);
  assert.ok(existsSync(join(dir, 'calendar', 'sources')) && readdirSync(join(dir, 'calendar', 'sources')).length === 1);
});

test('signing an account in again as a different Google account is refused and keeps the old sign-in', async () => {
  let who = { sub: '7', email: 'first.synthetic@gmail.com' };
  const google = async (url) => (String(url) === GOOGLE_TOKEN_URL
    ? reply({ access_token: 'at', refresh_token: 'rt-' + who.sub, expires_in: 3600, scope: `openid email ${GOOGLE_SCOPES.mail} ${GOOGLE_SCOPES.calendar}`, id_token: idToken(who) })
    : reply({ messages: [], items: [] }));
  const { store, port: p } = await serverFor('wrong', google, { prepare: (s) => s.set('google-client', { clientId: OWN, clientSecret: OWN_SECRET }) });
  const go = async (body) => new URL(JSON.parse((await raw(p, 'POST', '/api/accounts/begin', SAME(p), body)).text).url).searchParams.get('state');
  const s1 = await go({ provider: 'google', email: who.email });
  assert.equal((await raw(p, 'GET', `/api/accounts/callback?state=${s1}&code=c`, EVIL)).status, 200);
  const id = JSON.parse((await raw(p, 'GET', '/api/accounts', SAME(p))).text).accounts[0].id;
  who = { sub: '8', email: 'second.synthetic@gmail.com' };
  const s2 = await go({ provider: 'google', accountId: id });
  const page = await raw(p, 'GET', `/api/accounts/callback?state=${s2}&code=c`, EVIL);
  assert.equal(page.status, 409);
  assert.match(page.text, /You signed in as second\.synthetic@gmail\.com/);
  assert.equal((await store.get('accounts/' + id)).refresh_token, 'rt-7');
  assert.equal(JSON.parse((await raw(p, 'GET', '/api/accounts', SAME(p))).text).accounts.length, 1);
});

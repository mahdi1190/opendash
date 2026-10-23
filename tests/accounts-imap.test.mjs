// "+ Other email": the 'imap' provider on the accounts contract
// (lib/accounts/imap.mjs through lib/accounts/core.mjs and the Node binding
// lib/accounts.mjs), against the in-process fake IMAP server over TLS with a
// throwaway certificate (strict checks on; the test trusts its own CA). No
// real network, temp folders only, never the real device folder.
//   - connect: test, then save; the password only in the secret store
//   - friendly errors: wrong password, IMAP off, app password / 2-step needed, busy, unreachable
//   - iCloud's user-name fallback; Gmail / Outlook sent to the one-click buttons
//   - fetchMail: exactly the message shape the Microsoft provider produces
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFakeImap, rawMessage, selfSignedCert } from './fixtures/imap-fake-server.mjs';
import { createAccounts, createVault, createPendingStore, memorySecretStore } from '../lib/accounts/core.mjs';
import { createImapProvider, classifyImapError, mapMessages, MAX_MESSAGES } from '../lib/accounts/imap.mjs';
import { createMicrosoftProvider } from '../lib/accounts/microsoft.mjs';
import { lookupProvider } from '../lib/accounts/imap-providers.mjs';
import { ImapError } from '../lib/accounts/imap-wire.mjs';
import { nodeImapTransport } from '../lib/imap-transport.mjs';
import { createAccountsService } from '../lib/accounts.mjs';
import { secretStore, fileBackend } from '../lib/secret-store.mjs';

const PASS = 'abcdefghijklmnop';
const CERT = selfSignedCert();
const B = 'b-alt';
const MESSAGES = [
  { uid: 10, flags: ['\\Seen'], internalDate: '2026-09-01T09:00:00Z', raw: rawMessage({ subject: 'Too old', body: 'old' }) },
  { uid: 11, flags: [], internalDate: '2026-10-20T08:30:00Z', raw: rawMessage({ from: '=?UTF-8?Q?Ren=C3=A9e_Dupont?= <Renee@Example.COM>', subject: '=?UTF-8?B?UsOpdW5pb24gw6AgMTBo?=', messageId: '<a1@example.com>',
    contentType: `multipart/alternative; boundary="${B}"`, encoding: '', body: [`--${B}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: quoted-printable', '', 'On se voit =C3=A0 10h ? Merci.', `--${B}`, 'Content-Type: text/html; charset=utf-8', '', '<p>HTML version</p>', `--${B}--`].join('\r\n') }) },
  { uid: 12, flags: ['\\Flagged', '\\Seen'], internalDate: '2026-10-22T18:00:00Z', raw: rawMessage({ from: 'shop@example.org', subject: 'Grüße', contentType: 'text/html; charset=iso-8859-1', encoding: 'base64', body: Buffer.from('<div>Gr\xfc\xdfe aus <b>K\xf6ln</b></div>', 'latin1').toString('base64') }) },
  { uid: 13, flags: [], internalDate: '2026-10-21T07:00:00Z', raw: rawMessage({ subject: 'Invoice', contentType: 'multipart/mixed; boundary=mx', encoding: '', body: ['--mx', 'Content-Type: application/pdf; name=a.pdf', 'Content-Disposition: attachment; filename=a.pdf', 'Content-Transfer-Encoding: base64', '', 'SECRETPDFDATA', '--mx--'].join('\r\n') }) },
];
const EXPECTED_KEYS = ['accountId', 'count', 'date', 'from', 'id', 'important', 'link', 'messageId', 'sender', 'snippet', 'sourceId', 'subject', 'threadId', 'unread'];

function registry() {
  const doc = { version: 1, accounts: [] };
  return { doc, read: async () => JSON.parse(JSON.stringify(doc)), mutate: async (fn) => { const list = JSON.parse(JSON.stringify(doc.accounts)); const r = await fn(list); doc.accounts = list; return r; } };
}
/** The core with the imap provider, pointed at a fake server (its address replaces the provider table's). */
function service(srv, { lookup, timeoutMs = 3000 } = {}) {
  const reg = registry(), secrets = memorySecretStore();
  const svc = createAccounts({
    registry: reg, secrets, providers: { imap: createImapProvider },
    providerConfig: { imap: { openTransport: nodeImapTransport({ ca: CERT.cert }), timeoutMs, sessionMs: 10000,
      lookup: lookup || (async (email) => { const p = lookupProvider(email); return p.kind === 'known' || p.kind === 'other' ? { ...p, imap: { host: '127.0.0.1', port: srv.port, security: 'tls' } } : p; }) } },
    now: () => Date.parse('2026-10-23T12:00:00Z'), deviceId: 'deviceaaaa1',
  });
  return { svc, reg, secrets };
}
const everything = (x) => JSON.stringify(x);

let srv;
before(async () => { srv = await startFakeImap({ tls: CERT, messages: MESSAGES, users: { 'name@yahoo.com': PASS, 'name': 'icloud-app-pass', 'me@gmx.de': 'normal pass' } }); });
after(async () => { await srv.close(); });

test('connect: tested first, then the password goes to the secret store only; the record names the server', async () => {
  const { svc, reg, secrets } = service(srv);
  const out = await svc.connect({ provider: 'imap', email: 'Name@Yahoo.com', password: ' abcd efgh ijkl mnop ' });   // pasted with spaces
  const a = out.account;
  assert.equal(a.provider, 'imap'); assert.equal(a.email, 'name@yahoo.com'); assert.equal(a.status, 'connected');
  assert.deepEqual(a.features, { mail: true, calendar: false }, 'an IMAP account has no calendar (a calendar link is separate)');
  assert.deepEqual(a.server, { service: 'yahoo', host: '127.0.0.1', port: srv.port, security: 'tls' });
  assert.equal(a.fetcher, 'deviceaaaa1');
  assert.deepEqual(out.inbox, { exists: MESSAGES.length });
  assert.equal(out.isNew, true);
  assert.doesNotMatch(everything(reg.doc), new RegExp(PASS), 'no password in the registry');
  assert.doesNotMatch(everything(out), new RegExp(PASS), 'no password in the answer');
  const saved = await secrets.get('accounts/' + a.id);
  assert.deepEqual([saved.provider, saved.username, saved.password, saved.host, saved.service], ['imap', 'name@yahoo.com', PASS, '127.0.0.1', 'yahoo']);
  assert.ok(!srv.commands.some((c) => ['SELECT', 'STORE', 'UID STORE', 'APPEND', 'EXPUNGE', 'COPY'].includes(c.verb)));
  // connecting again (a new app password) keeps the same account, its features and fetcher
  await svc.setFeatures(a.id, { mail: true });
  const again = await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: PASS, accountId: a.id });
  assert.equal(again.account.id, a.id); assert.equal(again.isNew, false);
  assert.equal(reg.doc.accounts.length, 1);
  // remove: the device's secret goes too
  await svc.remove(a.id);
  assert.equal(await secrets.get('accounts/' + a.id), null);
  assert.equal(reg.doc.accounts.length, 0);
});

test('connect refused: nothing is saved; the reasons are plain', async () => {
  const { svc, reg, secrets } = service(srv);
  const e = await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: 'my-normal-password' }).catch((x) => x);
  assert.equal(e.code, 'WRONG_PASSWORD'); assert.match(e.message, /app password/);
  assert.doesNotMatch(e.message, /AUTHENTICATIONFAILED|Failure|IMAP/, 'never the server’s own words');
  assert.equal(reg.doc.accounts.length, 0); assert.equal(secrets._map.size, 0);
  assert.equal((await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: '   ' }).catch((x) => x)).code, 'BAD_REQUEST');
  assert.equal((await svc.connect({ provider: 'imap', email: 'not an address', password: 'x' }).catch((x) => x)).code, 'BAD_REQUEST');
  const g = await svc.connect({ provider: 'imap', email: 'me@gmail.com', password: 'x' }).catch((x) => x);
  assert.equal(g.code, 'USE_ONE_CLICK'); assert.equal(g.retryProvider, 'google');
  assert.equal((await svc.connect({ provider: 'imap', email: 'me@hotmail.co.uk', password: 'x' }).catch((x) => x)).retryProvider, 'microsoft');
  assert.equal((await svc.connect({ provider: 'imap', email: 'name@other.example', password: 'x', host: 'not a host' }).catch((x) => x)).code, 'BAD_REQUEST');
  assert.equal(srv.commands.filter((c) => c.verb === 'AUTHENTICATE' || c.verb === 'LOGIN').length > 0, true);
});

test('server answers -> friendly errors (through a real session, and the classifier on its own)', async () => {
  const cases = [
    [{ code: 'AUTHENTICATIONFAILED', text: 'Invalid credentials (Failure)' }, 'WRONG_PASSWORD'],
    [{ code: 'ALERT', text: 'Application-specific password required: https://support.example/apppasswords' }, 'APP_PASSWORD_NEEDED'],
    [{ code: 'AUTHENTICATIONFAILED', text: 'Please turn on two-step verification and use an app password' }, 'TWO_STEP_NEEDED'],
    [{ code: null, text: 'You are yet to enable IMAP for your account. Please contact your administrator.' }, 'IMAP_DISABLED'],
    [{ code: 'ALERT', text: 'IMAP access is disabled for this account' }, 'IMAP_DISABLED'],
    [{ code: 'UNAVAILABLE', text: 'Temporary server error, try again later' }, 'PROVIDER_BUSY'],
    [{ code: 'CONTACTADMIN', text: 'Login refused' }, 'PROVIDER_REFUSED'],
  ];
  for (const [loginError, code] of cases) {
    const s = await startFakeImap({ tls: CERT, users: {}, loginError });
    try {
      const { svc } = service(s);
      const e = await svc.connect({ provider: 'imap', email: 'name@gmx.com', password: 'whatever' }).catch((x) => x);
      assert.equal(e.code, code, loginError.text);
      assert.ok(e.message.length > 20 && e.message.length < 300);
      if (code === 'IMAP_DISABLED') assert.match(e.message, /GMX: Settings > POP3 & IMAP/, 'provider-specific help');
    } finally { await s.close(); }
  }
  const c = (kind, extra = {}, who = {}) => classifyImapError(new ImapError(kind, extra.text || 'x', extra), { host: 'imap.example.com', ...who }).code;
  assert.equal(c('TIMEOUT'), 'PROVIDER_NETWORK');
  assert.equal(c('NETWORK', { cause: 'ENOTFOUND' }), 'IMAP_UNREACHABLE');
  assert.equal(c('NETWORK', { cause: 'ECONNREFUSED' }, { service: 'proton', host: '127.0.0.1' }), 'BRIDGE_NOT_RUNNING');
  assert.equal(c('TLS', { cause: 'DEPTH_ZERO_SELF_SIGNED_CERT' }), 'IMAP_NOT_TRUSTED');
  assert.match(classifyImapError(new ImapError('TLS', 'x'), { service: 'proton', host: '127.0.0.1' }).message, /Proton Mail Bridge/);
  assert.equal(c('INSECURE'), 'IMAP_NOT_SECURE');
  assert.equal(c('NO', { code: 'LOGINDISABLED' }, { stage: 'login' }), 'IMAP_NOT_SECURE');
  assert.equal(c('TOO_BIG'), 'PROVIDER_LIMIT');
  assert.equal(c('PROTOCOL'), 'PROVIDER_RESPONSE');
  assert.equal(c('BYE', { text: 'Too many simultaneous connections' }), 'PROVIDER_BUSY');
  assert.equal(c('NO', { code: 'AUTHENTICATIONFAILED' }, { stage: 'login', connected: true }), 'NEEDS_SIGN_IN', 'a saved password that stops working: sign in again');
  assert.equal(c('NO', { text: 'Mailbox locked' }, { stage: 'read' }), 'PROVIDER_RESPONSE');
});

test('an unreachable server, and a server whose certificate is not trusted: the password is never sent', async () => {
  const gone = await startFakeImap({ tls: CERT });
  const port = gone.port; await gone.close();
  const { svc } = service({ port });
  assert.equal((await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: PASS }).catch((x) => x)).code, 'IMAP_UNREACHABLE');
  const other = selfSignedCert();          // a certificate the client does not trust
  const s = await startFakeImap({ tls: other, users: { 'name@yahoo.com': PASS } });
  try {
    const e = await service(s).svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: PASS }).catch((x) => x);
    assert.equal(e.code, 'IMAP_NOT_TRUSTED');
    assert.equal(s.commands.length, 0, 'nothing was sent');
  } finally { await s.close(); }
});

test('iCloud: the whole address first, then the name before @ (Apple accepts either)', async () => {
  const { svc, secrets } = service(srv);
  const { account } = await svc.connect({ provider: 'imap', email: 'name@icloud.com', password: 'icloud-app-pass' });
  assert.equal(account.server.service, 'icloud');
  assert.equal((await secrets.get('accounts/' + account.id)).username, 'name');
  // a typed user name wins (Proton Bridge shows its own)
  const typed = await svc.connect({ provider: 'imap', email: 'someone@gmx.de', username: 'me@gmx.de', password: 'normal pass' });
  assert.equal((await secrets.get('accounts/' + typed.account.id)).username, 'me@gmx.de');
});

test('fetchMail: previews decoded, flags kept, newest first, the same shape as the Microsoft provider', async () => {
  const { svc } = service(srv);
  const { account } = await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: PASS });
  const before = srv.commands.length;
  const got = await svc.fetchMail(account.id, { source: { id: 'email-mail-aaaa', accounts: [] }, days: 14, todayIso: '2026-10-23' });
  assert.equal(got.count, 3, 'the September message is older than 14 days');
  assert.deepEqual(got.accounts, [{ id: 'default', name: 'name@yahoo.com' }]);
  assert.deepEqual(got.messages.map((m) => m.subject), ['Grüße', 'Invoice', 'Réunion à 10h'], 'newest first; encoded words decoded');
  const [shop, invoice, renee] = got.messages;
  assert.equal(renee.snippet, 'On se voit à 10h ? Merci.', 'quoted-printable utf-8, the plain part');
  assert.deepEqual(renee.from, { name: 'Renée Dupont', email: 'renee@example.com' });
  assert.equal(renee.sender, 'Renée Dupont <renee@example.com>');
  assert.equal(renee.unread, true); assert.equal(renee.important, false);
  assert.equal(renee.messageId, '<a1@example.com>');
  assert.equal(renee.date, '2026-10-20T08:30:00.000Z');
  assert.equal(shop.snippet, 'Grüße aus Köln', 'base64 iso-8859-1 HTML');
  assert.equal(shop.unread, false); assert.equal(shop.important, true, 'flagged = important');
  assert.equal(invoice.snippet, '', 'an attachment is never read');
  assert.equal(renee.link, 'https://mail.yahoo.com/');
  assert.match(renee.id, /^im[a-f0-9]{24}$/);
  const again = await svc.fetchMail(account.id, { source: { id: 'email-mail-aaaa', accounts: [] }, days: 14, todayIso: '2026-10-23' });
  assert.deepEqual(again.messages.map((m) => m.id), got.messages.map((m) => m.id), 'stable ids');
  // read-only on the wire: EXAMINE, BODY.PEEK only, flags untouched
  const sent = srv.commands.slice(before);
  assert.ok(sent.some((c) => c.verb === 'EXAMINE') && !sent.some((c) => c.verb === 'SELECT'));
  for (const c of sent.filter((x) => x.verb === 'UID FETCH')) assert.doesNotMatch(c.raw, /BODY\[|RFC822(?!\.SIZE)/i, c.raw);
  assert.ok(srv.messages.find((m) => m.uid === 11).flags.length === 0, 'still unread on the server');
  // the same keys and kinds of value as Microsoft's messages
  const ms = await microsoftMessage();
  for (const m of got.messages) {
    assert.deepEqual(Object.keys(m).sort(), EXPECTED_KEYS);
    assert.deepEqual(Object.keys(m).sort(), Object.keys(ms).sort());
    for (const k of EXPECTED_KEYS) assert.equal(typeof m[k], typeof ms[k], k);
    assert.deepEqual(Object.keys(m.from).sort(), Object.keys(ms.from).sort());
    assert.ok(!('body' in m) && !('html' in m));
  }
  // switched off in the source: nothing read
  const n = srv.commands.length;
  assert.equal((await svc.fetchMail(account.id, { source: { id: 'email-mail-aaaa', accounts: [{ id: 'default', enabled: false }] } })).count, 0);
  assert.equal(srv.commands.length, n);
  // calendar: not through IMAP (a calendar link instead)
  assert.equal((await svc.fetchCalendar(account.id, { from: '2026-10-01', to: '2026-10-30' }).catch((x) => x)).code, 'FEATURE_OFF');
});

async function microsoftMessage() {
  const vault = createVault(memorySecretStore());
  await vault.write('acc_0000000000000001', { provider: 'microsoft', access_token: 'synthetic', refresh_token: 'r', expires_at: Date.parse('2027-01-01'), scope: ['Mail.Read'] });
  const fetch = async (url) => ({ ok: true, status: 200, text: async () => JSON.stringify(new URL(url).pathname.endsWith('/messages')
    ? { value: [{ id: 'm1', internetMessageId: '<x@y>', conversationId: 'c1', subject: 'S', from: { emailAddress: { name: 'N', address: 'n@example.com' } }, receivedDateTime: '2026-10-22T10:00:00Z', bodyPreview: 'p', isRead: true, importance: 'normal', webLink: 'https://outlook.live.com/mail/0/x' }] }
    : { value: [] }) });
  const p = createMicrosoftProvider({ fetch, now: () => Date.parse('2026-10-23T12:00:00Z'), vault, pending: createPendingStore(), config: { clientId: () => '00000000-0000-4000-8000-000000000001' }, account: async () => ({ email: 'me@hotmail.com', kind: 'personal' }) });
  return (await p.fetchMail('acc_0000000000000001', { source: { id: 'email-outlook-aaaa' } })).messages[0];
}

test('fetchMail: a revoked app password marks the account "sign in again"; unreadable messages are left out with a note; a big inbox is capped', async () => {
  const s = await startFakeImap({ tls: CERT, users: { 'name@yahoo.com': PASS }, messages: [...MESSAGES, { uid: 14, flags: [], internalDate: '2026-10-22T09:00:00Z', brokenStructure: true, raw: rawMessage({ subject: 'broken' }) }] });
  try {
    const { svc } = service(s);
    const { account } = await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: PASS });
    const got = await svc.fetchMail(account.id, { source: { id: 'email-mail-bbbb' }, days: 14, todayIso: '2026-10-23' });
    assert.equal(got.count, 3);
    assert.ok(got.warnings.some((w) => /could not be read/.test(w)));
    s.commands.length = 0;
  } finally { await s.close(); }
  // the password is revoked on the server
  const s2 = await startFakeImap({ tls: CERT, users: { 'name@yahoo.com': 'a-new-one' }, messages: MESSAGES });
  try {
    const { svc, reg } = service(s2);
    const { account } = await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: 'a-new-one' });
    s2.close();
    const s3 = await startFakeImap({ tls: CERT, users: {}, messages: MESSAGES });
    // point the saved secret at the new server (same account, password now refused)
    const doc = await svc.vault.read(account.id);
    await svc.vault.write(account.id, { ...doc, port: s3.port });
    const e = await svc.fetchMail(account.id, { source: { id: 'email-mail-cccc' }, days: 14, todayIso: '2026-10-23' }).catch((x) => x);
    assert.equal(e.code, 'NEEDS_SIGN_IN');
    assert.equal(reg.doc.accounts[0].status, 'needs-sign-in');
    assert.match(reg.doc.accounts[0].error.message, /app password/);
    await s3.close();
  } finally { await s2.close().catch(() => {}); }
  // more than MAX_MESSAGES recent messages: the newest are kept, with a note
  const many = Array.from({ length: MAX_MESSAGES + 5 }, (_, i) => ({ uid: 1000 + i, flags: ['\\Seen'], internalDate: new Date(Date.parse('2026-10-20T00:00:00Z') + i * 60000).toISOString(), raw: rawMessage({ subject: 'n' + i, body: 'b' + i }) }));
  const s4 = await startFakeImap({ tls: CERT, users: { 'name@yahoo.com': PASS }, messages: many });
  try {
    const { svc } = service(s4);
    const { account } = await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: PASS });
    const got = await svc.fetchMail(account.id, { source: { id: 'email-mail-dddd' }, days: 14, todayIso: '2026-10-23' });
    assert.equal(got.count, MAX_MESSAGES);
    assert.equal(got.messages[0].subject, 'n' + (MAX_MESSAGES + 4));
    assert.ok(got.warnings.some((w) => /newest 300/.test(w)));
  } finally { await s4.close(); }
});

test('mapMessages: junk rows are skipped; a message without a sender or subject still reads plainly', async () => {
  const out = await mapMessages([null, { uid: 0 }, { uid: 5, envelope: { subject: '', from: [] }, internalDate: null }, { uid: 6, flags: ['\\Seen'], internalDate: '2026-10-01T00:00:00.000Z', envelope: { subject: '', from: [], sender: [{ name: '', mailbox: 'x', host: 'y.example' }] }, preview: 'a‮b' }],
    { sourceId: 'email-mail-x', uidValidity: 7, link: 'javascript:alert(1)' });
  assert.equal(out.length, 1);
  assert.equal(out[0].subject, '(no subject)');
  assert.equal(out[0].from.email, 'x@y.example', 'Sender when there is no From');
  assert.equal(out[0].link, '', 'only https links');
  assert.equal(out[0].snippet, 'a b');
});

test('the Node binding: registry file and data folder never hold the password; the secret lives in the per-computer store; an email source, no calendar source', async () => {
  const base = mkdtempSync(join(tmpdir(), 'imap-node-'));
  try {
    const dataDir = join(base, 'data'), secretsDir = join(base, 'device', 'secrets');
    mkdirSync(dataDir, { recursive: true });
    const store = secretStore(dataDir, { backend: fileBackend(secretsDir) });
    const svc = createAccountsService({ dataDir, store, deviceId: 'deviceaaaa1', fetchFn: async () => { throw new Error('no network'); },
      imap: { openTransport: nodeImapTransport({ ca: CERT.cert }), mx: false, lookup: async (email) => ({ ...lookupProvider(email), imap: { host: '127.0.0.1', port: srv.port, security: 'tls' } }) } });
    assert.equal((await svc.providersInfo()).imap.available, true);
    const info = await svc.imapLookup('name@yahoo.com');
    assert.equal(info.name, 'Yahoo Mail');
    const { account } = await svc.connect({ provider: 'imap', email: 'name@yahoo.com', password: PASS });
    const files = [];
    const walk = (d) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else files.push(f); } };
    walk(dataDir);
    assert.ok(files.some((f) => f.endsWith('accounts.json')));
    for (const f of files) assert.ok(!readFileSync(f).includes(PASS), `no password in ${f}`);
    const reg = JSON.parse(readFileSync(join(dataDir, 'accounts.json'), 'utf8'));
    assert.equal(reg.accounts[0].server.service, 'yahoo');
    assert.ok(readFileSync(join(secretsDir, 'accounts', account.id + '.json'), 'utf8').includes(PASS), 'the secret is in the per-computer store');
    const sources = JSON.parse(readFileSync(join(dataDir, 'sources.json'), 'utf8')).sources.filter((s) => s.account === account.id);
    assert.deepEqual(sources.map((s) => [s.capability, s.kind]), [['email', 'imap']]);
    assert.deepEqual(await svc.readsHere(sources), sources, 'read on this computer');
    await svc.remove(account.id);
    assert.ok(!existsSync(join(secretsDir, 'accounts', account.id + '.json')));
  } finally { rmSync(base, { recursive: true, force: true }); }
  if (process.env.LOCALAPPDATA) assert.ok(!existsSync(join(process.env.LOCALAPPDATA, 'OpenDash')), 'the real device folder is never touched');
});

test('without the one-click sign-ins (no client ID anywhere): Gmail through + Other email, Outlook "coming soon"; with one, the redirects come back', async () => {
  const base = mkdtempSync(join(tmpdir(), 'imap-soon-'));
  const saved = { ms: process.env.OPENDASH_MICROSOFT_CLIENT_ID, gid: process.env.OPENDASH_GOOGLE_CLIENT_ID, gs: process.env.OPENDASH_GOOGLE_CLIENT_SECRET };
  delete process.env.OPENDASH_MICROSOFT_CLIENT_ID; delete process.env.OPENDASH_GOOGLE_CLIENT_ID; delete process.env.OPENDASH_GOOGLE_CLIENT_SECRET;
  try {
    const dataDir = join(base, 'data');
    mkdirSync(dataDir, { recursive: true });
    const store = secretStore(dataDir, { backend: fileBackend(join(base, 'device', 'secrets')) });
    const svc = createAccountsService({ dataDir, store, deviceId: 'deviceaaaa1', fetchFn: async () => { throw new Error('no network'); }, imap: { openTransport: async () => { throw new Error('never dialled'); }, mx: false } });
    const info = await svc.providersInfo();
    assert.deepEqual([info.microsoft.available, info.google.available], [false, false], 'nothing configured in this copy');
    const g = await svc.imapLookup('me@gmail.com');
    assert.deepEqual([g.kind, g.id, g.imap.host], ['known', 'gmail', 'imap.gmail.com']);
    const o = await svc.imapLookup('me@hotmail.com');
    assert.deepEqual([o.kind, o.title], ['soon', 'Outlook and Hotmail are coming soon']);
    const refused = await svc.connect({ provider: 'imap', email: 'me@outlook.com', password: 'x' }).catch((e) => e);
    assert.equal(refused.code, 'COMING_SOON', 'refused before any connection');
    // A Microsoft client ID appears (the user's own app): Outlook goes back to the one-click button.
    await svc.microsoftApp.set('00000000-0000-4000-8000-0000000000bb');
    assert.equal((await svc.imapLookup('me@hotmail.com')).kind, 'redirect');
    assert.equal((await svc.imapLookup('me@gmail.com')).kind, 'known', 'Google is still off');
  } finally {
    for (const [k, v] of [['OPENDASH_MICROSOFT_CLIENT_ID', saved.ms], ['OPENDASH_GOOGLE_CLIENT_ID', saved.gid], ['OPENDASH_GOOGLE_CLIENT_SECRET', saved.gs]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(base, { recursive: true, force: true });
  }
});

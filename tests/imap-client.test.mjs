// "+ Other email": the IMAP client (lib/accounts/imap-wire.mjs) over the Node
// transport (lib/imap-transport.mjs) against the in-process fake server
// (tests/fixtures/imap-fake-server.mjs, 127.0.0.1, a random port, no real
// network): sign-in (AUTHENTICATE PLAIN with and without SASL-IR, LOGIN with a
// synchronizing literal), EXAMINE (never SELECT), SEARCH / FETCH with literals,
// chunked answers, malformed and oversized answers, timeouts, BYE, strict
// certificate checks (IMAPS and STARTTLS) and the STARTTLS injection refusal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startFakeImap, rawMessage, selfSignedCert } from './fixtures/imap-fake-server.mjs';
import { createImapClient, ImapError } from '../lib/accounts/imap-wire.mjs';
import { nodeImapTransport } from '../lib/imap-transport.mjs';

const td = new TextDecoder();
const USER = 'jo@yahoo.com', PASS = 'abcdefghijklmnop';
const MESSAGES = [
  { uid: 101, flags: ['\\Seen'], internalDate: '2026-10-01T09:00:00Z', raw: rawMessage({ subject: 'Old one', body: 'too old' }) },
  { uid: 205, flags: [], internalDate: '2026-10-20T08:30:00Z', raw: rawMessage({ subject: '=?UTF-8?B?Q2Fmw6kgImF0IiAxMA==?=', from: '"Sam \\"T\\"" <sam@example.com>', body: 'Caf=C3=A9 at 10?', encoding: 'quoted-printable', messageId: '<m205@example.com>' }) },
  { uid: 206, flags: ['\\Flagged'], internalDate: '2026-10-21T18:00:00Z', raw: rawMessage({ subject: 'Ünïcode subject', body: 'line one\r\nA9 OK not a tag\r\n{5}\r\nend' }) },
];
const open = (srv, o = {}) => createImapClient({ openTransport: nodeImapTransport(o.transport || {}), host: '127.0.0.1', port: srv.port, security: o.security || 'none', allowInsecure: o.allowInsecure !== false && !o.security, timeoutMs: o.timeoutMs || 3000, sessionMs: o.sessionMs || 10000, limits: o.limits });
const verbs = (srv) => srv.commands.map((c) => c.verb);
const kindOf = async (p) => { try { await p; return 'ok'; } catch (e) { assert.ok(e instanceof ImapError, String(e && e.stack)); return e.kind + (e.code ? ':' + e.code : ''); } };

test('a whole read-only session: AUTHENTICATE PLAIN (SASL-IR), EXAMINE, UID SEARCH SINCE, UID FETCH with literals, LOGOUT', async () => {
  const srv = await startFakeImap({ users: { [USER]: PASS }, messages: MESSAGES });
  try {
    const c = open(srv);
    await c.open();
    await c.login(USER, PASS);
    const box = await c.examine('INBOX');
    assert.deepEqual(box, { exists: 3, uidValidity: 4242, uidNext: 207, readOnly: true });
    const uids = await c.uidSearchSince('2026-10-09');
    assert.deepEqual(uids, [205, 206]);
    const rows = await c.uidFetch(uids, '(UID FLAGS INTERNALDATE ENVELOPE BODYSTRUCTURE BODY.PEEK[TEXT]<0.400>)');
    assert.equal(rows.length, 2);
    const m205 = rows.find((r) => r.uid === 205), m206 = rows.find((r) => r.uid === 206);
    assert.equal(m205.envelope.subject, '=?UTF-8?B?Q2Fmw6kgImF0IiAxMA==?=', 'raw header text: encoded words are decoded by the provider');
    assert.deepEqual(m205.envelope.from, [{ name: 'Sam "T"', mailbox: 'sam', host: 'example.com' }]);
    assert.equal(m205.envelope.messageId, '<m205@example.com>');
    assert.equal(m206.envelope.subject, 'Ünïcode subject', 'a non-ASCII subject comes as a literal');
    assert.equal(td.decode(m206.sections.TEXT), 'line one\r\nA9 OK not a tag\r\n{5}\r\nend', 'a literal with a fake tag and braces inside');
    assert.deepEqual(m206.flags, ['\\Flagged']);
    assert.equal(m206.internalDate, '2026-10-21T18:00:00.000Z');
    assert.ok(Array.isArray(m206.bodyStructure));
    await c.logout();
    assert.deepEqual(verbs(srv), ['AUTHENTICATE', 'EXAMINE', 'UID SEARCH', 'UID FETCH', 'LOGOUT']);
    assert.ok(srv.messages.every((m) => m.uid !== 205 || !m.flags.includes('\\Seen')), 'BODY.PEEK never marks mail read');
  } finally { await srv.close(); }
});

test('LOGIN with a synchronizing literal (no LITERAL+, no AUTH=PLAIN), and AUTHENTICATE PLAIN without SASL-IR', async () => {
  const pw = 'päss wörd';
  const srv = await startFakeImap({ caps: ['IMAP4rev1'], users: { 'jo@gmx.de': pw } });
  try {
    const c = open(srv);
    await c.open();
    await c.login('jo@gmx.de', pw);
    await c.examine();
    await c.logout();
    assert.deepEqual(verbs(srv), ['LOGIN', 'EXAMINE', 'LOGOUT'], 'the greeting listed the capabilities');
    assert.equal(srv.stats.syncLiterals, 1, 'the non-ASCII password went as a literal, after the server said go ahead');
  } finally { await srv.close(); }
  const srv2 = await startFakeImap({ caps: ['IMAP4rev1', 'AUTH=PLAIN'], users: { [USER]: PASS } });
  try {
    const c = open(srv2);
    await c.open();
    await c.login(USER, PASS);
    assert.equal((await c.examine()).readOnly, true);
    c.close();
  } finally { await srv2.close(); }
});

test('sign-in refused: the response code reaches the caller; LOGINDISABLED; and no password over an unverified link', async () => {
  const srv = await startFakeImap({ users: { [USER]: PASS }, loginError: { code: 'AUTHENTICATIONFAILED', text: 'Invalid credentials (Failure)' } });
  try {
    const c = open(srv);
    await c.open();
    assert.equal(await kindOf(c.login(USER, 'wrong')), 'NO:AUTHENTICATIONFAILED');
    // still usable: a second try on the same connection
    await c.login(USER, PASS);
    c.close();
    // allowInsecure off (the real setting): plain TCP never carries the password
    const before = srv.commands.length;
    const strict = open(srv, { allowInsecure: false });
    await strict.open();
    assert.equal(await kindOf(strict.login(USER, PASS)), 'INSECURE');
    strict.close();
    assert.ok(!srv.commands.slice(before).some((x) => x.verb === 'LOGIN' || x.verb === 'AUTHENTICATE'));
  } finally { await srv.close(); }
  const srv2 = await startFakeImap({ caps: ['IMAP4rev1', 'LOGINDISABLED'], users: { [USER]: PASS } });
  try {
    const c = open(srv2);
    await c.open();
    assert.equal(await kindOf(c.login(USER, PASS)), 'NO:LOGINDISABLED');
    c.close();
  } finally { await srv2.close(); }
});

test('framing under stress: every answer arrives one byte at a time', async () => {
  const srv = await startFakeImap({ users: { [USER]: PASS }, messages: MESSAGES, chunk: 1 });
  try {
    const c = open(srv);
    await c.open(); await c.login(USER, PASS); await c.examine();
    const rows = await c.uidFetch([206], '(UID ENVELOPE BODY.PEEK[TEXT])');
    assert.equal(td.decode(rows[0].sections.TEXT), 'line one\r\nA9 OK not a tag\r\n{5}\r\nend');
    await c.logout();
  } finally { await srv.close(); }
});

test('malformed answers: an unreadable FETCH line is skipped and counted; a broken greeting or a stray tag fails cleanly', async () => {
  const srv = await startFakeImap({
    users: { [USER]: PASS }, messages: MESSAGES,
    onCommand: ({ tag, verb }) => verb === 'UID FETCH' ? `* 1 FETCH (UID 205 ENVELOPE ("unclosed\r\n* 2 FETCH (UID 206 FLAGS (\\Seen))\r\n* 3 FETCH UID 9\r\n${tag} OK FETCH completed\r\n` : null,
  });
  try {
    const c = open(srv);
    await c.open(); await c.login(USER, PASS); await c.examine();
    const rows = await c.uidFetch([205, 206], '(UID FLAGS ENVELOPE)');
    assert.deepEqual(rows.map((r) => r.uid), [206]);
    assert.ok(c.malformed >= 2);
    c.close();
  } finally { await srv.close(); }
  for (const greeting of ['garbage without a tag\r\n', '* NO go away\r\n', 'A001 OK too early\r\n']) {
    const s = await startFakeImap({ greeting });
    try { assert.match(await kindOf(open(s).open()), /^(?:PROTOCOL|BYE)/, greeting); } finally { await s.close(); }
  }
  const s2 = await startFakeImap({ users: { [USER]: PASS }, onCommand: ({ verb }) => verb === 'EXAMINE' ? 'A999 OK not yours\r\n' : null });
  try {
    const c = open(s2);
    await c.open(); await c.login(USER, PASS);
    assert.equal(await kindOf(c.examine()), 'PROTOCOL');
  } finally { await s2.close(); }
});

test('oversized answers are refused before they are read (TOO_BIG), and the connection is closed', async () => {
  const srv = await startFakeImap({
    users: { [USER]: PASS }, messages: MESSAGES,
    onCommand: ({ tag, verb }) => verb === 'UID FETCH' ? `* 1 FETCH (UID 205 BODY[TEXT] {50000000}\r\n${'x'.repeat(1000)}` : verb === 'UID SEARCH' ? `* SEARCH ${'1 '.repeat(4000)}\r\n${tag} OK done\r\n` : null,
  });
  try {
    const c = open(srv, { limits: { maxLiteral: 1024 * 1024, maxLine: 4096 } });
    await c.open(); await c.login(USER, PASS); await c.examine();
    assert.equal(await kindOf(c.uidSearchSince('2026-10-01')), 'TOO_BIG');
    assert.equal(await kindOf(c.noop()), 'TOO_BIG', 'the session is over');
    const c2 = open(srv, { limits: { maxLiteral: 1024 * 1024 } });
    await c2.open(); await c2.login(USER, PASS); await c2.examine();
    assert.equal(await kindOf(c2.uidFetch([205], '(UID BODY.PEEK[TEXT])')), 'TOO_BIG');
  } finally { await srv.close(); }
});

test('timeouts: a server that stops answering, a greeting that never comes; BYE and a dropped connection', async () => {
  const srv = await startFakeImap({ users: { [USER]: PASS }, messages: MESSAGES, hangOn: 'UID FETCH' });
  try {
    const c = open(srv, { timeoutMs: 150 });
    await c.open(); await c.login(USER, PASS); await c.examine();
    const t0 = Date.now();
    assert.equal(await kindOf(c.uidFetch([205], '(UID FLAGS)')), 'TIMEOUT');
    assert.ok(Date.now() - t0 < 2000);
  } finally { await srv.close(); }
  const silent = await startFakeImap({ greeting: '' });
  try { assert.equal(await kindOf(open(silent, { timeoutMs: 150 }).open()), 'TIMEOUT'); } finally { await silent.close(); }
  const session = await startFakeImap({ users: { [USER]: PASS }, onCommand: ({ verb }) => verb === 'NOOP' ? null : null });
  try {
    const c = open(session, { timeoutMs: 3000, sessionMs: 200 });
    await c.open(); await c.login(USER, PASS);
    await new Promise((r) => setTimeout(r, 250));
    assert.equal(await kindOf(c.examine()), 'TIMEOUT', 'the whole session has a time limit too');
  } finally { await session.close(); }
  const bye = await startFakeImap({ greeting: '* BYE Too many connections from your IP\r\n' });
  try {
    const e = await open(bye).open().catch((x) => x);
    assert.equal(e.kind, 'BYE'); assert.match(e.message, /Too many connections/);
  } finally { await bye.close(); }
  const drop = await startFakeImap({ users: { [USER]: PASS }, onCommand: ({ verb }, s) => (verb === 'EXAMINE' ? '* BYE Server shutting down\r\n' : null) });
  try {
    const c = open(drop);
    await c.open(); await c.login(USER, PASS);
    const p = c.examine();
    setTimeout(() => drop.close(), 50);
    assert.match(await kindOf(p), /^(?:BYE|NETWORK)/);
  } finally { await drop.close().catch(() => {}); }
});

test('IMAPS: strict certificate checks (self-signed refused; trusted CA accepted; wrong host name refused)', async () => {
  const good = selfSignedCert({ dns: ['localhost'], ips: ['127.0.0.1'] });
  const srv = await startFakeImap({ tls: good, users: { [USER]: PASS } });
  try {
    // the real setting: Node's trusted roots only -> this certificate is not trusted, nothing is sent
    const e = await createImapClient({ openTransport: nodeImapTransport(), host: '127.0.0.1', port: srv.port, security: 'tls', timeoutMs: 3000 }).open().catch((x) => x);
    assert.equal(e.kind, 'TLS'); assert.match(String(e.cause), /SELF_SIGNED|UNABLE|CERT/);
    assert.equal(srv.commands.length, 0);
    // trusted (the test's own CA): verified, secure, and the password may be sent
    const c = createImapClient({ openTransport: nodeImapTransport({ ca: good.cert }), host: '127.0.0.1', port: srv.port, security: 'tls', timeoutMs: 3000 });
    await c.open();
    assert.equal(c.secure, true);
    await c.login(USER, PASS);
    assert.equal((await c.examine()).readOnly, true);
    await c.logout();
  } finally { await srv.close(); }
  const other = selfSignedCert({ cn: 'imap.other.example', dns: ['imap.other.example'], ips: [] });
  const srv2 = await startFakeImap({ tls: other, users: { [USER]: PASS } });
  try {
    const e = await createImapClient({ openTransport: nodeImapTransport({ ca: other.cert }), host: '127.0.0.1', port: srv2.port, security: 'tls', timeoutMs: 3000 }).open().catch((x) => x);
    assert.equal(e.kind, 'TLS', 'a trusted certificate for another name is still refused');
    assert.match(String(e.cause), /ALTNAME|HOSTNAME|CERT/);
  } finally { await srv2.close(); }
});

test('STARTTLS: upgrade then sign in; refused when not offered; injected data after OK is refused', async () => {
  const cert = selfSignedCert();
  const srv = await startFakeImap({ starttls: cert, caps: ['IMAP4rev1', 'AUTH=PLAIN', 'SASL-IR'], users: { [USER]: PASS } });
  try {
    const c = createImapClient({ openTransport: nodeImapTransport({ ca: cert.cert }), host: '127.0.0.1', port: srv.port, security: 'starttls', timeoutMs: 3000 });
    await c.open();
    assert.equal(c.secure, true);
    await c.login(USER, PASS);
    await c.examine();
    await c.logout();
    assert.deepEqual(verbs(srv).slice(0, 4), ['STARTTLS', 'CAPABILITY', 'AUTHENTICATE', 'EXAMINE'], 'capabilities are asked again after TLS');
  } finally { await srv.close(); }
  const plain = await startFakeImap({ users: { [USER]: PASS } });
  try {
    const e = await createImapClient({ openTransport: nodeImapTransport({ ca: cert.cert }), host: '127.0.0.1', port: plain.port, security: 'starttls', timeoutMs: 3000 }).open().catch((x) => x);
    assert.equal(e.kind, 'INSECURE');
    assert.ok(!plain.commands.some((x) => x.verb === 'LOGIN' || x.verb === 'AUTHENTICATE'));
  } finally { await plain.close(); }
  const inject = await startFakeImap({ starttls: cert, users: { [USER]: PASS }, injectAfterStarttls: '* OK [CAPABILITY IMAP4rev1 AUTH=PLAIN] injected\r\n' });
  try {
    const e = await createImapClient({ openTransport: nodeImapTransport({ ca: cert.cert }), host: '127.0.0.1', port: inject.port, security: 'starttls', timeoutMs: 3000 }).open().catch((x) => x);
    assert.equal(e.kind, 'PROTOCOL');
    assert.ok(!inject.commands.some((x) => x.verb === 'LOGIN' || x.verb === 'AUTHENTICATE'));
  } finally { await inject.close(); }
});

test('the transport refuses nonsense and reports an unreachable server as NETWORK', async () => {
  const t = nodeImapTransport({ connectTimeoutMs: 1000 });
  assert.equal(await kindOf(t({ host: '', port: 993, tls: true })), 'NETWORK');
  assert.equal(await kindOf(t({ host: '127.0.0.1', port: 0, tls: true })), 'NETWORK');
  const srv = await startFakeImap({});
  const port = srv.port;
  await srv.close();                  // nothing listens there now
  const e = await t({ host: '127.0.0.1', port, tls: false }).catch((x) => x);
  assert.equal(e.kind, 'NETWORK'); assert.equal(e.cause, 'ECONNREFUSED');
});

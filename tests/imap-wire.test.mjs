// "+ Other email": the pure IMAP protocol layer (lib/accounts/imap-wire.mjs):
// framing with literals across any chunking, the response parser, command
// building (quoting, synchronizing and non-synchronizing literals), the
// read-only allowlist, size caps, dates and sequence sets, and the purity rule
// (no node: imports, so the same file runs in a phone or desktop app).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createResponseReader, parseResponse, buildCommand, str, raw, checkCommand, imapDate, parseInternalDate, uidSet,
  parseFetch, parseEnvelope, text, ImapError,
} from '../lib/accounts/imap-wire.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const te = new TextEncoder(), td = new TextDecoder();
const frames = (reader, ...chunks) => chunks.flatMap((c) => reader.push(typeof c === 'string' ? te.encode(c) : c)).map((f) => td.decode(f));

test('purity: the IMAP, MIME and provider-table files import nothing from node: (they run in apps too)', () => {
  for (const f of ['imap-wire.mjs', 'imap.mjs', 'mime.mjs', 'imap-providers.mjs']) {
    const src = readFileSync(join(ROOT, 'lib', 'accounts', f), 'utf8');
    assert.doesNotMatch(src, /from\s+['"]node:|require\(|import\(\s*['"]node:/, f);
    for (const m of src.matchAll(/from\s+'([^']+)'/g)) assert.match(m[1], /^\.\/(?:core|imap-wire|mime|imap-providers)\.mjs$/, `${f} imports only pure siblings (${m[1]})`);
    assert.doesNotMatch(src, /\bprocess\.|\bBuffer\b|globalThis\.require/, `${f} uses no Node globals`);
  }
});

test('framing: whole lines, CRLF or LF, split anywhere', () => {
  const r = createResponseReader();
  assert.deepEqual(frames(r, '* OK hel', 'lo\r\nA1 OK done\r', '\n* 3 EXISTS\n'), ['* OK hello', 'A1 OK done', '* 3 EXISTS']);
  const r2 = createResponseReader();
  const all = '* 1 FETCH (UID 7)\r\nA2 OK FETCH completed\r\n';
  const out = [];
  for (const ch of all) out.push(...frames(r2, ch));          // one byte at a time
  assert.deepEqual(out, ['* 1 FETCH (UID 7)', 'A2 OK FETCH completed']);
});

test('framing: a literal keeps its CR LF and braces inside, even when chunks end mid-literal', () => {
  const body = 'line one\r\nA9 OK fake tag inside the literal\r\n{5}\r\nend';
  const n = te.encode(body).length;
  const wire = `* 1 FETCH (UID 3 BODY[TEXT] {${n}}\r\n${body} FLAGS (\\Seen))\r\nA3 OK done\r\n`;
  for (const size of [1, 2, 3, 7, 16, 1000]) {
    const r = createResponseReader();
    const out = [];
    for (let i = 0; i < wire.length; i += size) out.push(...frames(r, wire.slice(i, i + size)));
    assert.equal(out.length, 2, `chunk size ${size}`);
    assert.equal(out[1], 'A3 OK done');
    const f = parseFetch(parseResponse(te.encode(out[0])).values);
    assert.equal(td.decode(f.sections.TEXT), body);
    assert.deepEqual(f.flags, ['\\Seen']);
  }
  // literal8, non-synchronizing and zero-length literals
  const r = createResponseReader();
  const got = frames(r, '* 2 FETCH (UID 4 BINARY[1] ~{3}\r\nabc BODY[2] {0}\r\n)\r\n');
  const f = parseFetch(parseResponse(te.encode(got[0])).values);
  assert.equal(td.decode(f.sections['1']), 'abc');
  assert.equal(f.sections['2'].length, 0);
});

test('caps: a too-long line, a too-big literal, response or session is refused (TOO_BIG)', () => {
  const big = (lim, ...chunks) => assert.throws(() => { const r = createResponseReader(lim); for (const c of chunks) r.push(te.encode(c)); }, (e) => e instanceof ImapError && e.kind === 'TOO_BIG');
  big({ maxLine: 64 }, '* OK ' + 'x'.repeat(100));                    // no line end yet: still too long
  big({ maxLine: 64 }, '* OK ' + 'x'.repeat(100) + '\r\n');
  big({ maxLiteral: 10 }, '* 1 FETCH (BODY[] {11}\r\n');               // refused before the bytes arrive
  big({ maxResponse: 50 }, '* 1 FETCH (BODY[] {40}\r\n' + 'y'.repeat(40) + ' BODY[1] {40}\r\n');
  big({ maxSession: 100 }, '* OK a\r\n'.repeat(20));
  // under the caps: fine
  const r = createResponseReader({ maxLine: 64, maxLiteral: 10 });
  assert.equal(r.push(te.encode('* 1 FETCH (BODY[] {10}\r\n0123456789)\r\n')).length, 1);
});

test('parser: status responses with codes, untagged data, continuation', () => {
  const p = (s) => parseResponse(te.encode(s));
  assert.deepEqual((({ tag, type, code, codeArgs, text }) => ({ tag, type, code, codeArgs, text }))(p('A1 NO [AUTHENTICATIONFAILED] Invalid credentials (Failure)')),
    { tag: 'A1', type: 'NO', code: 'AUTHENTICATIONFAILED', codeArgs: [], text: 'Invalid credentials (Failure)' });
  const g = p('* OK [CAPABILITY IMAP4rev1 SASL-IR AUTH=PLAIN] Dovecot ready.');
  assert.equal(g.code, 'CAPABILITY'); assert.deepEqual(g.codeArgs, ['IMAP4rev1', 'SASL-IR', 'AUTH=PLAIN']);
  assert.deepEqual(p('* OK [UIDVALIDITY 3857529045] UIDs valid').codeArgs, ['3857529045']);
  assert.equal(p('A2 OK [READ-ONLY] EXAMINE completed').code, 'READ-ONLY');
  const e = p('* 172 EXISTS'); assert.equal(e.type, 'EXISTS'); assert.equal(e.num, 172);
  assert.deepEqual(p('* SEARCH 2 84 882').values, ['2', '84', '882']);
  assert.deepEqual(p('* SEARCH').values, []);
  assert.deepEqual(p('* CAPABILITY IMAP4rev1 STARTTLS LOGINDISABLED').values, ['IMAP4rev1', 'STARTTLS', 'LOGINDISABLED']);
  assert.deepEqual(p('* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft $Junk)').values, [['\\Answered', '\\Flagged', '\\Deleted', '\\Seen', '\\Draft', '$Junk']]);
  assert.deepEqual((({ tag, type }) => ({ tag, type }))(p('+ Ready for literal')), { tag: '+', type: 'CONTINUE' });
  assert.equal(p('+').tag, '+');
  assert.equal(p('* BYE Too many connections').type, 'BYE');
  // malformed: unclosed list or string, a tagged data line
  for (const bad of ['* 1 FETCH (UID 1 FLAGS (\\Seen)', '* 1 FETCH (ENVELOPE ("unclosed', 'A1 FETCH (UID 1)', '', '* 1 FETCH (BODY[] {10}\r\nabc)']) {
    assert.throws(() => p(bad), (x) => x instanceof ImapError && x.kind === 'PROTOCOL', JSON.stringify(bad));
  }
});

test('parser: a whole FETCH with ENVELOPE (literals, NIL, escapes, groups), BODYSTRUCTURE and sections', () => {
  const subj = 'Café "menu"';
  const sb = te.encode(subj);
  const wire = '* 12 FETCH (UID 345 FLAGS (\\Seen \\Flagged) INTERNALDATE "17-Jul-1996 02:44:25 -0700" RFC822.SIZE 4286 '
    + `ENVELOPE ("Wed, 17 Jul 1996 02:23:25 -0700 (PDT)" {${sb.length}}\r\n${subj} (("Terry \\"T\\" Gray" NIL "gray" "mail.example.org")) `
    + '(("Terry Gray" NIL "gray" "mail.example.org")) NIL ((NIL NIL "list" NIL)("A" NIL "a" "x.org")(NIL NIL NIL NIL)) NIL NIL "<parent@x>" "<B27397-0100000@mail.example.org>") '
    + 'BODYSTRUCTURE (("TEXT" "PLAIN" ("CHARSET" "US-ASCII") NIL NIL "7BIT" 1152 23)("TEXT" "HTML" ("CHARSET" "utf-8") NIL NIL "BASE64" 300 4) "ALTERNATIVE" ("BOUNDARY" "b1") NIL NIL) '
    + 'BODY[HEADER.FIELDS (CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] {28}\r\nContent-Type: text/plain\r\n\r\n BODY[1]<0> "short")';
  const r = createResponseReader();
  const [f] = r.push(te.encode(wire + '\r\n'));
  const res = parseResponse(f);
  assert.equal(res.type, 'FETCH'); assert.equal(res.num, 12);
  const m = parseFetch(res.values);
  assert.equal(m.uid, 345);
  assert.deepEqual(m.flags, ['\\Seen', '\\Flagged']);
  assert.equal(m.internalDate, '1996-07-17T09:44:25.000Z');
  assert.equal(m.size, 4286);
  assert.equal(m.envelope.subject, subj, 'a literal subject, UTF-8');
  assert.deepEqual(m.envelope.from, [{ name: 'Terry "T" Gray', mailbox: 'gray', host: 'mail.example.org' }]);
  assert.deepEqual(m.envelope.to, [{ name: 'A', mailbox: 'a', host: 'x.org' }], 'group markers are skipped');
  assert.equal(m.envelope.inReplyTo, '<parent@x>');
  assert.equal(m.envelope.messageId, '<B27397-0100000@mail.example.org>');
  assert.ok(Array.isArray(m.bodyStructure) && Array.isArray(m.bodyStructure[0]));
  assert.match(td.decode(m.sections.HEADER), /^Content-Type: text\/plain/);
  assert.equal(td.decode(m.sections['1']), 'short', 'a quoted section with <origin>');
  assert.equal(parseEnvelope(['x']), null);
  assert.equal(text(null), ''); assert.equal(text(te.encode('hé')), 'hé');
});

test('commands: quoting, literals for non-ASCII / CR LF, synchronizing vs LITERAL+', () => {
  const dec = (segs) => segs.map((s) => ({ text: td.decode(s.bytes), wait: s.wait }));
  assert.deepEqual(dec(buildCommand('A1', 'LOGIN', [str('me@yahoo.com'), str('ab"c\\d')])), [{ text: 'A1 LOGIN "me@yahoo.com" "ab\\"c\\\\d"\r\n', wait: false }]);
  const pw = 'päss';
  const n = te.encode(pw).length;
  assert.deepEqual(dec(buildCommand('A2', 'LOGIN', [str('me@gmx.de'), str(pw)])), [
    { text: `A2 LOGIN "me@gmx.de" {${n}}\r\n`, wait: true }, { text: pw + '\r\n', wait: false }]);
  assert.deepEqual(dec(buildCommand('A3', 'LOGIN', [str('mé'), str(pw)], { literalPlus: true })), [
    { text: `A3 LOGIN {3+}\r\nmé {${n}+}\r\n${pw}\r\n`, wait: false }]);
  // two synchronizing literals: three writes, the first two wait for '+'
  assert.deepEqual(dec(buildCommand('A4', 'LOGIN', [str('mé'), str(pw)])).map((s) => s.wait), [true, true, false]);
  assert.throws(() => buildCommand('A5', 'UID FETCH', [raw('1\r\nA6 STORE 1 +FLAGS (\\Deleted)')]), (e) => e.kind === 'REFUSED');
});

test('read-only allowlist: SELECT, STORE, EXPUNGE, APPEND, COPY and fetches that mark mail read are never sent', () => {
  for (const v of ['SELECT', 'STORE', 'UID STORE', 'EXPUNGE', 'UID EXPUNGE', 'APPEND', 'COPY', 'UID COPY', 'MOVE', 'UID MOVE', 'DELETE', 'CREATE', 'RENAME', 'SUBSCRIBE', 'FETCH', 'SEARCH', 'IDLE', 'ENABLE', 'SETACL', 'XYZ']) {
    assert.throws(() => checkCommand(v, []), (e) => e instanceof ImapError && e.kind === 'REFUSED', v);
  }
  for (const items of ['(BODY[TEXT])', '(UID BODY[1]<0.400>)', '(RFC822)', '(UID RFC822.TEXT)', '(BINARY[1])', '(FLAGS BODY[])', '(body[header])']) {
    assert.throws(() => checkCommand('UID FETCH', [raw('1:5'), raw(items)]), (e) => e.kind === 'REFUSED', items);
  }
  for (const items of ['(UID FLAGS INTERNALDATE ENVELOPE BODYSTRUCTURE)', '(UID BODY.PEEK[1.2]<0.1200>)', '(BODY.PEEK[HEADER.FIELDS (CONTENT-TYPE)] BODY.PEEK[TEXT]<0.3000>)', '(RFC822.SIZE)', '(BINARY.PEEK[1])']) {
    assert.equal(checkCommand('UID FETCH', [raw('1:5'), raw(items)]), 'UID FETCH', items);
  }
  for (const v of ['CAPABILITY', 'STARTTLS', 'LOGIN', 'AUTHENTICATE', 'UID SEARCH', 'NOOP', 'LOGOUT']) assert.equal(checkCommand(v, []), v);
  assert.equal(checkCommand('examine', [str('INBOX')]), 'EXAMINE');
});

test('dates and sequence sets', () => {
  assert.equal(imapDate('2026-10-09'), '9-Oct-2026');
  assert.equal(imapDate(Date.UTC(2026, 0, 31, 23, 59)), '31-Jan-2026');
  assert.throws(() => imapDate('soon'), (e) => e.kind === 'REFUSED');
  assert.equal(parseInternalDate('17-Jul-1996 02:44:25 -0700'), '1996-07-17T09:44:25.000Z');
  assert.equal(parseInternalDate(' 7-Feb-2026 23:00:00 +0100'), '2026-02-07T22:00:00.000Z');
  assert.equal(parseInternalDate('yesterday'), null);
  assert.equal(uidSet([5, 1, 2, 3, 9, 10, 12, 3]), '1:3,5,9:10,12');
  assert.equal(uidSet([]), '');
  assert.equal(uidSet([0, -1, 'x', 7]), '7');
});

// "+ Other email": the MIME preview decoding (lib/accounts/mime.mjs):
// quoted-printable, base64 (also cut off by a partial fetch), charsets
// (utf-8, iso-8859-1, windows-1252, us-ascii), RFC 2047 encoded words,
// multipart walking (nested alternative, HTML only, attachments skipped),
// BODYSTRUCTURE part choice, HTML to text. Synthetic messages only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeQuotedPrintable, decodeBase64, decodeCharset, decodeTransfer, decodeWords, parseHeaders, parseContentType,
  htmlToText, previewText, previewFromEntity, splitMultipart, bodyParts, pickTextPart, partText, toBytes, binaryString,
} from '../lib/accounts/mime.mjs';

const td = new TextDecoder();
const latin1 = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

test('quoted-printable: escapes, soft breaks, and a cut-off end', () => {
  assert.equal(td.decode(decodeQuotedPrintable('Caf=C3=A9 =E2=80=93 cr=C3=A8me')), 'Café – crème');
  assert.equal(td.decode(decodeQuotedPrintable('a long =\r\nline joined=\nhere')), 'a long line joinedhere');
  assert.equal(td.decode(decodeQuotedPrintable('trailing soft break =  \r\nnext')), 'trailing soft break next');
  assert.equal(td.decode(decodeQuotedPrintable('x = y and =ZZ stays')), 'x = y and =ZZ stays');
  assert.equal(td.decode(decodeQuotedPrintable('cut =C3')), 'cut �', 'a whole escape of a cut multi-byte char');
  assert.equal(td.decode(decodeQuotedPrintable('cut =C')), 'cut ');
  assert.equal(td.decode(decodeQuotedPrintable('cut =')), 'cut ');
});

test('base64: line breaks and junk ignored, a cut-off last group dropped', () => {
  const enc = b64('Hello, wörld! This is a longer text for line wrapping.');
  const wrapped = enc.match(/.{1,20}/g).join('\r\n');
  assert.equal(td.decode(decodeBase64(wrapped)), 'Hello, wörld! This is a longer text for line wrapping.');
  assert.equal(td.decode(decodeBase64(enc.slice(0, 14))), 'Hello, wö', 'a partial fetch cuts mid-group: the bytes it fully holds');
  assert.equal(td.decode(decodeBase64(enc.slice(0, 9))), 'Hello,', 'one stray character is dropped');
  assert.equal(decodeBase64('!!!').length, 0);
  assert.equal(td.decode(decodeTransfer('SGk=', 'BASE64')), 'Hi');
  assert.equal(td.decode(decodeTransfer('Hi', '8bit')), 'Hi');
});

test('charsets: utf-8, iso-8859-1, windows-1252, us-ascii, unknown -> utf-8', () => {
  assert.equal(decodeCharset(latin1('Gr\xfc\xdfe aus K\xf6ln'), 'ISO-8859-1'), 'Grüße aus Köln');
  assert.equal(decodeCharset(latin1('\x93quoted\x94 \x80 5'), 'windows-1252'), '“quoted” € 5');
  assert.equal(decodeCharset(latin1('\x80 10'), 'iso-8859-1'), '€ 10', 'iso-8859-1 is read as windows-1252 (as browsers do)');
  assert.equal(decodeCharset(new TextEncoder().encode('naïve'), 'us-ascii'), 'naïve', 'mislabelled UTF-8 is still read');
  assert.equal(decodeCharset(latin1('plain'), '"us-ascii"'), 'plain');
  assert.equal(decodeCharset(new TextEncoder().encode('ok ✓'), 'x-unknown-charset'), 'ok ✓');
  assert.equal(decodeCharset(new TextEncoder().encode('ünï'), 'UTF8'), 'ünï');
});

test('RFC 2047 encoded words: B and Q, adjacent words joined (a character split across them)', () => {
  assert.equal(decodeWords('=?UTF-8?B?' + b64('Réunion à 10h') + '?='), 'Réunion à 10h');
  assert.equal(decodeWords('=?iso-8859-1?Q?Caf=E9_cr=E8me?= ready'), 'Café crème ready');
  const bytes = new TextEncoder().encode('日本語');
  const w1 = btoa(String.fromCharCode(...bytes.slice(0, 4))), w2 = btoa(String.fromCharCode(...bytes.slice(4)));
  assert.equal(decodeWords(`=?UTF-8?B?${w1}?= =?UTF-8?B?${w2}?=`), '日本語');
  assert.equal(decodeWords('Re: =?utf-8?q?hello?= world'), 'Re: hello world');
  assert.equal(decodeWords('no words here'), 'no words here');
  assert.equal(decodeWords(null), '');
});

test('headers and Content-Type: unfolding, parameters, RFC 2231', () => {
  const h = parseHeaders('Content-Type: multipart/alternative;\r\n\tboundary="b 1"\r\nSubject: one\r\nSubject: two\r\n');
  assert.equal(h.get('content-type'), 'multipart/alternative; boundary="b 1"');
  assert.equal(h.get('subject'), 'one', 'the first one wins');
  assert.deepEqual(parseContentType('Text/HTML; Charset="ISO-8859-1"; name=x.html'), { type: 'text', subtype: 'html', params: { charset: 'ISO-8859-1', name: 'x.html' } });
  assert.equal(parseContentType("application/pdf; filename*=utf-8''r%C3%A9sum%C3%A9.pdf").params.filename, 'résumé.pdf');
  assert.deepEqual(parseContentType(''), { type: 'text', subtype: 'plain', params: {} });
});

test('HTML to text, and the preview line (quotes, signatures and reply headers dropped)', () => {
  const html = '<html><head><style>p{color:red}</style><title>T</title></head><body><p>Hello&nbsp;<b>Sam</b> &amp; team</p><script>alert(1)</script><!-- hidden --><p>Fish &#163;5 &#x20AC;3 &hellip;</p></body></html>';
  assert.equal(previewText(htmlToText(html)), 'Hello Sam & team Fish £5 €3 …');
  assert.equal(previewText('Thanks!\n\nOn Mon, 1 Jan 2026 Sam wrote:\n> old text'), 'Thanks!');
  assert.equal(previewText('See you\n-- \nSam\nPhone'), 'See you');
  assert.equal(previewText('a‮b​c\td'), 'a b c d', 'bidi and zero-width characters removed');
  assert.equal(previewText('x'.repeat(500)).length, 300);
});

const ALT = (b, plainEnc, plainBody, htmlBody) => [
  `--${b}`, 'Content-Type: text/plain; charset=utf-8', `Content-Transfer-Encoding: ${plainEnc}`, '', plainBody,
  `--${b}`, 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: quoted-printable', '', htmlBody,
  `--${b}--`, ''].join('\r\n');

test('multipart preview: plain wins over HTML; nested mixed > alternative; attachments are never decoded', () => {
  const alt = ALT('alt1', 'quoted-printable', 'Caf=C3=A9 at 10?', '<p>Caf=C3=A9 <b>at</b> 10?</p>');
  const msg = ['Content-Type: multipart/mixed; boundary="mix"', '', 'This is a MIME message.', '--mix', 'Content-Type: multipart/alternative; boundary="alt1"', '', alt,
    '--mix', 'Content-Type: application/pdf; name="secret.pdf"', 'Content-Disposition: attachment; filename="secret.pdf"', 'Content-Transfer-Encoding: base64', '', b64('PDF SECRET CONTENT'),
    '--mix--', ''].join('\r\n');
  assert.equal(previewFromEntity(latin1(msg)), 'Café at 10?');
  // HTML only, base64
  const htmlOnly = ['Content-Type: multipart/alternative; boundary=zz', '', '--zz', 'Content-Type: text/html; charset=iso-8859-1', 'Content-Transfer-Encoding: base64', '',
    btoa('<div>Gr\xfc\xdfe <i>aus</i> K\xf6ln</div>'), '--zz--'].join('\r\n');
  assert.equal(previewFromEntity(htmlOnly), 'Grüße aus Köln');
  // only an attachment: no preview at all (its content is never read)
  const att = ['Content-Type: multipart/mixed; boundary=q', '', '--q', 'Content-Type: text/plain; name=notes.txt', 'Content-Disposition: attachment', '', 'ATTACHED TEXT', '--q--'].join('\r\n');
  assert.equal(previewFromEntity(att), '');
  // body only, headers given separately (IMAP BODY[TEXT] + HEADER.FIELDS), cut off mid-part
  const body = ALT('b2', 'base64', b64('Lunch on Friday? Let me know which day suits you best.'), '<p>x</p>');
  const enc64 = b64('Lunch on Friday? Let me know which day suits you best.');
  const cut = body.slice(0, body.indexOf(enc64) + 33);   // a partial fetch ends inside the base64 text
  assert.match(previewFromEntity(cut, { headers: 'Content-Type: multipart/alternative; boundary=b2' }), /^Lunch on Friday\? Let me/);
  // single part, quoted-printable, latin-1
  assert.equal(previewFromEntity(latin1('Caf=E9 cr=E8me'), { headers: new Map([['content-type', 'text/plain; charset=iso-8859-1'], ['content-transfer-encoding', 'quoted-printable']]) }), 'Café crème');
  // no Content-Type at all: us-ascii text
  assert.equal(previewFromEntity('Subject: x\r\n\r\nPlain old mail'), 'Plain old mail');
  assert.deepEqual(splitMultipart('--x\r\nA\r\n--x\r\nB\r\n--x--', 'x'), ['A', 'B']);
  assert.deepEqual(splitMultipart('no boundary', ''), []);
});

test('BODYSTRUCTURE: part numbers, dispositions, and which part to preview', () => {
  const single = ['TEXT', 'PLAIN', ['CHARSET', 'ISO-8859-1'], null, null, 'QUOTED-PRINTABLE', '120', '3', null, null, null, null];
  assert.deepEqual(pickTextPart(single), { part: '1', subtype: 'plain', charset: 'ISO-8859-1', encoding: 'quoted-printable', size: 120 });
  const nested = [
    [['TEXT', 'PLAIN', ['CHARSET', 'utf-8'], null, null, 'BASE64', '400', '6'], ['TEXT', 'HTML', ['CHARSET', 'utf-8'], null, null, '7BIT', '900', '20'], 'ALTERNATIVE', ['BOUNDARY', 'a'], null, null],
    ['APPLICATION', 'PDF', ['NAME', 'x.pdf'], null, null, 'BASE64', '5000', null, ['ATTACHMENT', ['FILENAME', 'x.pdf']], null],
    'MIXED', ['BOUNDARY', 'm'], null, null,
  ];
  assert.deepEqual(bodyParts(nested).map((p) => [p.part, p.type + '/' + p.subtype, p.disposition]), [['1.1', 'text/plain', ''], ['1.2', 'text/html', ''], ['2', 'application/pdf', 'attachment']]);
  assert.equal(pickTextPart(nested).part, '1.1');
  // HTML only, with a text attachment first: the attachment is skipped
  const htmlOnly = [['TEXT', 'PLAIN', ['CHARSET', 'us-ascii', 'NAME', 'notes.txt'], null, null, '7BIT', '10', '1', null, ['ATTACHMENT', null], null, null], ['TEXT', 'HTML', null, null, null, '8BIT', '50', '2'], 'MIXED'];
  assert.deepEqual(pickTextPart(htmlOnly), { part: '2', subtype: 'html', charset: 'us-ascii', encoding: '8bit', size: 50 });
  // an image only, or junk: nothing to preview
  assert.equal(pickTextPart(['IMAGE', 'PNG', null, null, null, 'BASE64', '9000']), null);
  assert.equal(pickTextPart('junk'), null);
  assert.equal(pickTextPart([]), null);
  // partText decodes one part with its encoding and charset
  assert.equal(partText(latin1(btoa('Gr\xfc\xdfe')), { subtype: 'plain', charset: 'iso-8859-1', encoding: 'base64' }), 'Grüße');
  assert.equal(partText(latin1('<b>hi</b>'), { subtype: 'html' }), ' hi ');
  assert.equal(partText(latin1('x'), { type: 'image' }), '');
  assert.equal(binaryString(toBytes('ab\xff')), 'ab\xff');
});

// tools/privacy-scan.mjs: every generic rule, the private term list, image
// metadata, forbidden paths, the allowlist, the CLI and the git index.
//
// Every "secret" below is synthetic and is put together at run time, so this
// file itself passes the scanner (it is part of the repository it scans).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { crc32 } from '../lib/zip.mjs';
import {
  scanText, scanFile, scanTree, scanPathName, parseTerms, termMatcher, loadAllow, forbiddenPath,
  emailAllowed, authorAllowed, luhn, ibanValid, mask, formatFinding, countByRule, pngTextChunks,
  jpegMetadata, icoImages, commitLogFindings, gitIdentityFindings, DEFAULT_ALLOW, RULE_IDS, main,
  deriveTerms, parseProject, lineHash,
} from '../tools/privacy-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = (t) => { const d = mkdtempSync(join(tmpdir(), 'privacy-scan-')); t.after(() => rmSync(d, { recursive: true, force: true })); return d; };
const put = (root, rel, data) => { const f = join(root, ...rel.split('/')); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, data); return f; };
const rules = (findings) => findings.map(f => f.rule).sort();
const scan = (text, rel = 'src/app/x.js', opts = {}) => scanText(text, { rel, ...opts });
const capture = () => {
  const lines = [], out = [];
  return { lines, out, log: (s) => { lines.push(String(s)); out.push(String(s)); }, error: (s) => lines.push(String(s)), text: () => lines.join('\n') };
};

// ─── Synthetic values, assembled so the source never holds them whole ─────
const at = (local, domain) => [local, domain].join('@');
const PERSONAL_EMAIL = at('jane.doe', 'mailbox-demo.co.uk');
const NOREPLY_EMAIL = at('12345+octocat', 'users.noreply.github.com');
const UK_MOBILE = ['07123', '456789'].join(' ');
const DRAMA_MOBILE = ['07700', '900123'].join(' ');
const POSTCODE = ['AB1', '2DE'].join(' ');
const WIN_PATH = ['C:', 'Users', 'jdoe', 'Documents', 'notes.txt'].join('\\');
const MAC_PATH = ['', 'Users', 'jdoe', 'Desktop'].join('/');
const HOME_PATH = ['', 'home', 'jdoe', 'app'].join('/');
const GH_TOKEN = ['ghp', 'a1B2'.repeat(9)].join('_');
const ANTHROPIC_KEY = ['sk', 'ant', 'api03', 'Q'.repeat(40)].join('-');
const AWS_ID = ['AKIA', 'Z7Q2'.repeat(4)].join('');
const GOOGLE_SECRET = ['GOCSPX', 'k'.repeat(28)].join('-');
const JWT = ['eyJ' + 'hbGciOiJIUzI1NiJ9', 'eyJ' + 'zdWIiOiIxMjM0In0', 'c2lnbmF0dXJl'.repeat(2)].join('.');
const PEM = ['-----BEGIN', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');
const HEX64 = 'ab12'.repeat(16);

function luhnComplete(prefix) {
  for (let d = 0; d <= 9; d++) if (luhn(prefix + d)) return prefix + d;
  throw new Error('unreachable');
}
const CARD = luhnComplete('453201511283036');
function makeIban(country, bban) {
  const num = (bban + country + '00').replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of num) rem = (rem * 10 + Number(d)) % 97;
  return `${country}${String(98 - rem).padStart(2, '0')}${bban}`;
}
const IBAN = makeIban('GB', 'ACME' + '314159' + '26535897');

// ─── Generic text rules ────────────────────────────────────────────────────
test('e-mail: personal addresses are findings; noreply and reserved example domains are not', () => {
  assert.deepEqual(rules(scan(`contact ${PERSONAL_EMAIL} today`)), ['email']);
  assert.deepEqual(scan(`Author: ${NOREPLY_EMAIL}`), []);
  for (const ok of [at('alex', 'example.com'), at('sam', 'example.org'), at('noreply', 'acme.com'), at('you', 'acme.com'), 'git@github.com']) {
    assert.equal(emailAllowed(ok), true, ok);
    assert.deepEqual(scan(`x ${ok} y`), [], ok);
  }
  assert.deepEqual(scan('import logo from "./logo@2x.png";'), [], 'file names with @ are not addresses');
  assert.deepEqual(scan(`fetch("https://user:${'p'.repeat(6)}@host.acme.dev/x")`), [], 'user:password@host in a URL is not an address');
});

test('phone numbers and UK postcodes; documented drama ranges and example postcodes pass', () => {
  assert.deepEqual(rules(scan(`call ${UK_MOBILE}`)), ['phone']);
  assert.deepEqual(rules(scan(`call +44 ${UK_MOBILE.slice(1)}`)), ['phone']);
  assert.deepEqual(scan(`call ${DRAMA_MOBILE}`), []);
  assert.deepEqual(scan('id 07123456789 is a bare digit run'), [], 'no separators: treated as an id');
  assert.deepEqual(rules(scan(`lives at ${POSTCODE}`)), ['uk-postcode']);
  assert.deepEqual(scan('send it to SW1A 1AA'), []);
  assert.deepEqual(scan(`ref ${POSTCODE.replace(' ', '')} in a hash`), [], 'no space and no hint: not a postcode');
  assert.deepEqual(rules(scan(`postcode: ${POSTCODE.replace(' ', '')}`)), ['uk-postcode']);
});

test('absolute paths in a user folder; placeholders like <you> pass', () => {
  for (const p of [WIN_PATH, MAC_PATH, HOME_PATH, WIN_PATH.replace(/\\/g, '/')]) assert.deepEqual(rules(scan(`open "${p}"`)), ['user-path'], p);
  for (const p of ['C:\\Users\\<you>\\opendash', '/Users/<you>/opendash', '/home/runner/work', '~/opendash', 'C:\\Users\\%USERNAME%\\x', '/home/alex/opendash']) {
    assert.deepEqual(scan(`open "${p}"`), [], p);
  }
});

test('folders inside a scratch folder of a developer\'s machine are warnings; files in Temp and placeholders pass', () => {
  for (const p of [['C:', 'tmp', 'design', 'mock', 'a.html'].join('/'), ['C:', 'Temp', 'proj-x', 'b.json'].join('\\'), ['', 'c', 'tmp', 'proj-x', 'b.json'].join('/')]) {
    const f = scan(`see ${p}`);
    assert.deepEqual(rules(f), ['local-path'], p);
    assert.equal(f[0].severity, 'warn', p);
  }
  for (const p of ['C:/tmp/<you>/data', ['C:', 'Temp', 'dashboard-start-4301.stamp'].join('\\'), 'https://host.example/c/tmp/x/y', '../opendash-release/opendash']) {
    assert.deepEqual(scan(`see ${p}`), [], p);
  }
});

test('work or school cloud-folder names (they carry an organisation) are findings; personal and placeholder ones pass', () => {
  const org = ['Glob', 'ex Ltd'].join('');
  for (const p of [`C:/Users/<you>/OneDrive - ${org}/Documents`, `~/Library/CloudStorage/OneDrive-${org}/x`, `D:/Dropbox (${org})/plans`]) {
    assert.deepEqual(rules(scan(`open "${p}"`)), ['cloud-folder'], p);
  }
  for (const p of ['C:/Users/<you>/OneDrive/Documents', '~/Library/CloudStorage/OneDrive-Personal/x', 'OneDrive - Contoso', 'OneDrive-safe retries', 'OneDrive - <Organisation>']) {
    assert.deepEqual(scan(`open "${p}"`), [], p);
  }
});

test('links to another repository of the project\'s owner are warnings (needs "repository" in the allowlist file)', (t) => {
  const project = parseProject('Octo-Org/OpenDash.git');
  assert.deepEqual(project, { owner: 'octo-org', repo: 'opendash' });
  assert.equal(parseProject('not a repository'), null);
  const other = ['https://github.com', 'octo-org', 'old-private-notes'].join('/');
  const f = scan(`it was ${other}.git`, 'README.md', { project });
  assert.deepEqual(rules(f), ['other-repo']);
  assert.equal(f[0].severity, 'warn');
  for (const ok of ['https://github.com/octo-org/opendash/issues', 'git@github.com:octo-org/OpenDash.git', 'https://github.com/nvm-sh/nvm', 'https://github.com/octo-org/octo-org.github.io']) {
    assert.deepEqual(scan(ok, 'README.md', { project }), [], ok);
  }
  assert.deepEqual(scan(`it was ${other}`, 'README.md'), [], 'off when the project is not known');
  const root = tmp(t);
  assert.deepEqual(loadAllow(put(root, 'a.json', JSON.stringify({ repository: 'octo-org/opendash', allow: [] }))).project, { owner: 'octo-org', repo: 'opendash' });
  assert.throws(() => loadAllow(put(root, 'b.json', JSON.stringify({ repository: 'nope', allow: [] }))), /owner\/name/);
  assert.ok(loadAllow(DEFAULT_ALLOW(ROOT)).project, 'the committed allowlist names the public repository');
});

test('tokens and keys: GitHub, Anthropic, AWS, Google, JWT, private keys, the dashboard token', () => {
  const cases = [
    [`token=${GH_TOKEN}`, 'github-token'],
    [`key: ${ANTHROPIC_KEY}`, 'anthropic-key'],
    [`id ${AWS_ID}`, 'aws-key'],
    [`secret ${GOOGLE_SECRET}`, 'google-secret'],
    [JSON.stringify({ client_secret: 's'.repeat(12) }), 'google-secret'],
    [`Bearer ${JWT}`, 'jwt'],
    [PEM, 'private-key'],
    [`local token: ${HEX64}`, 'dashboard-token'],
  ];
  for (const [text, rule] of cases) assert.deepEqual(rules(scan(text)), [rule], text.slice(0, 20));
  assert.deepEqual(scan('the AWS docs use AKIAIOSFODNN7EXAMPLE'), []);
  assert.deepEqual(scan(`sha256 token digest ${HEX64}`), [], 'a hash next to "token" is not a token');
  assert.deepEqual(rules(scanFile('data/local-token', Buffer.from(HEX64 + '\n'))), ['dashboard-token'], 'a bare token file');
});

test('bank details: IBAN (checksum), sort code, account number, Luhn-valid card numbers', () => {
  assert.equal(ibanValid(IBAN), true);
  assert.deepEqual(rules(scan(`pay ${IBAN}`)), ['iban']);
  assert.deepEqual(scan(`pay ${IBAN.slice(0, -1)}${IBAN.endsWith('1') ? '2' : '1'}`), [], 'bad checksum');
  assert.deepEqual(scan('pay GB82WEST12345698765432'), [], 'the IBAN registry example');
  const sort = ['20', '45', '67'].join('-');
  assert.deepEqual(rules(scan(`sort code ${sort}`)), ['sort-code']);
  assert.deepEqual(scan(`sort code ${['00', '00', '00'].join('-')}`), []);
  assert.deepEqual(rules(scan(`account number: ${['3141', '5926'].join('')}`)), ['account-number']);
  assert.deepEqual(scan(`account number: ${['1234', '5678'].join('')}`), [], 'placeholder digits');
  assert.equal(luhn(CARD), true);
  assert.deepEqual(rules(scan(`card ${CARD}`)), ['card-number']);
  assert.deepEqual(rules(scan(`card ${CARD.match(/.{1,4}/g).join(' ')}`)), ['card-number']);
  assert.deepEqual(scan('test card 4242424242424242'), [], 'documented test card');
  assert.deepEqual(scan(`card ${CARD.slice(0, -1)}${(Number(CARD.at(-1)) + 1) % 10}`), [], 'fails Luhn');
  assert.deepEqual(scan('at 1696334400000 ms'), [], 'an epoch timestamp is not a card');
});

test('money: a warning in app code, ignored in tests', () => {
  const f = scan('balance £1,234.56 left', 'src/app/x.js');
  assert.deepEqual(rules(f), ['money']);
  assert.equal(f[0].severity, 'warn');
  assert.deepEqual(scan('balance £1,234.56 left', 'tests/x.test.mjs'), []);
  assert.deepEqual(scan('a £0 placeholder', 'src/app/x.js'), []);
});

test('an inline privacy-scan:allow comment skips the generic rules on that line only', () => {
  assert.deepEqual(scan(`x ${PERSONAL_EMAIL} // privacy-scan:allow`), []);
  assert.deepEqual(rules(scan(`x ${PERSONAL_EMAIL} // privacy-scan:allow\ny ${PERSONAL_EMAIL}`)), ['email']);
});

test('findings carry file:line:col and the rule; excerpts are masked unless asked', () => {
  const [f] = scan(`one\ntwo ${GH_TOKEN}`, 'lib/a.mjs');
  assert.equal(f.file, 'lib/a.mjs');
  assert.equal(f.line, 2);
  assert.equal(f.col, 5);
  const line = formatFinding(f);
  assert.match(line, /^lib\/a\.mjs:2:5 {2}error \[github-token\]/);
  assert.ok(!line.includes(GH_TOKEN), 'masked');
  assert.ok(formatFinding(f, { show: true }).includes(GH_TOKEN));
  assert.ok(!mask(GH_TOKEN).includes(GH_TOKEN.slice(4)));
  assert.deepEqual(countByRule([...scan(PEM), ...scan(PEM), ...scan(JWT)]), { 'private-key': 2, jwt: 1 });
  for (const id of ['email', 'phone', 'uk-postcode', 'user-path', 'github-token', 'anthropic-key', 'aws-key', 'google-secret', 'jwt', 'private-key', 'dashboard-token', 'iban', 'sort-code', 'account-number', 'card-number', 'money', 'private-term', 'image-metadata', 'forbidden-path', 'git-author']) {
    assert.ok(RULE_IDS.includes(id), id);
  }
});

// ─── Private terms ─────────────────────────────────────────────────────────
const TERMS_TEXT = '# private names, never committed\nZephyrine\nAcme Widgets   # an employer\n\nqx\n';

test('private terms: whole words, case-insensitive, reported by line number only', () => {
  const p = parseTerms(TERMS_TEXT);
  assert.deepEqual(p.terms.map(t => t.n), [2, 3, 5]);
  assert.equal(p.terms[1].term, 'Acme Widgets');
  assert.equal(p.warnings.length, 1, 'a two-letter term is warned about');
  const terms = termMatcher(p.terms);
  const f = scan('Met ZEPHYRINE at acme   widgets.\nZephyrines and xZephyrine do not count.', 'docs/a.md', { terms });
  assert.deepEqual(f.map(x => [x.rule, x.line, x.message]), [
    ['private-term', 1, 'private term #2 (line number in the term file)'],
    ['private-term', 1, 'private term #3 (line number in the term file)'],
  ]);
  for (const x of f) assert.ok(!/zephyrine|acme/i.test(formatFinding(x)), 'the term itself is never printed');
  assert.ok(!/zephyrine/i.test(formatFinding(f[0], { show: true })), 'not even with --show');
  assert.deepEqual(rules(scanPathName('docs/zephyrine-notes.md', { terms })), ['private-term']);
  assert.deepEqual(scan(`Zephyrine // privacy-scan:allow`, 'a.js', { terms }).length, 1, 'inline allow never hides a private term');
});

// An invented data folder (every name below is made up).
function fakeDataDir(t) {
  const data = tmp(t);
  put(data, 'config.json', JSON.stringify({ userName: 'Zephyrine Quill', myEmails: [at('zeph.q', 'mailbox-demo.co.uk')] }));
  put(data, 'state/dashboard-state.json', JSON.stringify({
    people: [
      { name: 'Orlando Vexley (supervisor)', emails: [at('o.vexley', 'mailbox-demo.co.uk')], aliases: ['vex-office2', 'Ozzy'] },
      { name: 'Sam Taylor' }, { name: 'Jo' }, 'not a person',
    ],
    streams: [{ id: 'quillcorp', label: 'Quillcorp' }, { id: 'work', label: 'Work' }, { id: 'home', label: 'Home & admin' }],
  }));
  return data;
}

test('deriveTerms: names, addresses, aliases and one-word streams from a data folder; ordinary words skipped', (t) => {
  const d = deriveTerms(fakeDataDir(t));
  assert.deepEqual(d.terms.map(x => x.term), ['Zephyrine', 'Quill', at('zeph.q', 'mailbox-demo.co.uk'), 'Orlando', 'Vexley',
    at('o.vexley', 'mailbox-demo.co.uk'), 'vex-office2', 'Ozzy', 'Quillcorp']);
  assert.deepEqual(d.counts, { 'your name': 2, 'e-mail address': 2, 'person name': 3, alias: 1, stream: 1 });
  assert.deepEqual(d.terms.map(x => x.n), ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']);
  const terms = termMatcher(d.terms);
  const f = scan('// ask orlando\nconst s = "Quillcorp";\nSam and Alex work at home.', 'src/a.js', { terms });
  assert.deepEqual(f.map(x => [x.line, x.message]), [[1, 'private term d4 (from the data folder: person name)'], [2, 'private term d9 (from the data folder: stream)']]);
  assert.deepEqual(deriveTerms(tmp(t)), { terms: [], counts: {} }, 'an empty folder gives nothing');
});

test('CLI --terms-from: findings by number and kind only, never the term; a folder that is not a data folder is refused', async (t) => {
  const data = fakeDataDir(t);
  const root = tmp(t);
  put(root, 'src/a.js', '// ask Orlando about it\nconst s = \'quillcorp\';\n');
  put(root, 'docs/b.md', 'Sam and Alex work from home.\n');
  const empty = put(tmp(t), 'terms.txt', '');
  const c = capture();
  assert.equal(await main([root, '--terms', empty, '--terms-from', data, '--no-allow'], c), 1);
  assert.match(c.text(), /src\/a\.js:1:8 {2}error \[private-term\] private term d4 \(from the data folder: person name\)/);
  assert.match(c.text(), /src\/a\.js:2:12 {2}error \[private-term\] private term d9 \(from the data folder: stream\)/);
  assert.ok(!c.text().includes('docs/b.md:'), 'ordinary words and the example names are not terms');
  assert.match(c.text(), /0 private term\(s\) from the given file \+ 9 from the data folder \(2 your name, 2 e-mail address, 3 person name, 1 alias, 1 stream\)/);
  assert.ok(!/orlando|quillcorp|zephyrine|vexley/i.test(c.text()), 'no term is ever printed');
  const e = capture();
  assert.equal(await main([root, '--no-allow', '--terms-from', tmp(t)], e), 2);
  assert.match(e.text(), /not a data folder/);
});

// ─── Images ────────────────────────────────────────────────────────────────
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(extra = []) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), ...extra, chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0, 0]))), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const tEXt = (k, v) => chunk('tEXt', Buffer.from(`${k}\0${v}`, 'latin1'));
const zTXt = (k, v) => chunk('zTXt', Buffer.concat([Buffer.from(`${k}\0\0`, 'latin1'), deflateSync(Buffer.from(v, 'latin1'))]));
const iTXt = (k, v) => chunk('iTXt', Buffer.concat([Buffer.from(`${k}\0\0\0\0\0`, 'latin1'), Buffer.from(v, 'utf8')]));

test('PNG: a clean image passes; tEXt / zTXt / iTXt metadata and private terms inside it are findings', () => {
  const terms = termMatcher(parseTerms(TERMS_TEXT).terms);
  assert.deepEqual(scanFile('assets/brand/a.png', png([tEXt('Software', 'a renderer')]), { terms }), []);
  const dirty = png([tEXt('Author', 'Someone'), zTXt('Comment', 'shot at Zephyrine'), iTXt('Description', `mail ${PERSONAL_EMAIL}`)]);
  assert.deepEqual(pngTextChunks(dirty).map(c => `${c.chunk}:${c.key}`), ['tEXt:Author', 'zTXt:Comment', 'iTXt:Description']);
  const f = scanFile('assets/brand/a.png', dirty, { terms });
  assert.deepEqual(countByRule(f), { 'image-metadata': 3, email: 1, 'private-term': 1 });
  assert.ok(f.find(x => x.rule === 'private-term').file.startsWith('assets/brand/a.png (PNG zTXt'));
});

function ico(inner) {
  const head = Buffer.alloc(6 + 16);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  head[6] = 1; head[7] = 1; head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
  head.writeUInt32LE(inner.length, 14); head.writeUInt32LE(22, 18);
  return Buffer.concat([head, inner]);
}

test('ICO: the PNGs inside an icon are scanned like any PNG', () => {
  const dirty = ico(png([tEXt('Author', 'Someone')]));
  assert.equal(icoImages(dirty).length, 1);
  assert.deepEqual(rules(scanFile('assets/brand/favicon.ico', dirty)), ['image-metadata']);
  assert.deepEqual(scanFile('assets/brand/favicon.ico', ico(png())), [], 'no "unscanned binary" warning either');
  assert.deepEqual(rules(scanFile('assets/brand/broken.ico', Buffer.from([0, 0, 1, 0, 9, 0]))), ['unscanned-binary'], 'a damaged icon is left for a human');
});

function jpegWithExif({ artist, gps }) {
  // TIFF, little-endian: IFD0 at 8 with Artist (ASCII) and a GPS IFD pointer; the GPS IFD holds GPSLatitudeRef.
  const art = Buffer.from(artist + '\0', 'latin1');
  const ifd0 = 8, n0 = gps ? 2 : 1;
  const strOff = ifd0 + 2 + n0 * 12 + 4;
  const gpsOff = strOff + art.length;
  const tiff = Buffer.alloc(gpsOff + (gps ? 2 + 12 + 4 : 0));
  tiff.write('II', 0, 'latin1'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(ifd0, 4);
  tiff.writeUInt16LE(n0, ifd0);
  let e = ifd0 + 2;
  tiff.writeUInt16LE(0x013b, e); tiff.writeUInt16LE(2, e + 2); tiff.writeUInt32LE(art.length, e + 4); tiff.writeUInt32LE(strOff, e + 8);
  if (gps) {
    e += 12;
    tiff.writeUInt16LE(0x8825, e); tiff.writeUInt16LE(4, e + 2); tiff.writeUInt32LE(1, e + 4); tiff.writeUInt32LE(gpsOff, e + 8);
    tiff.writeUInt16LE(1, gpsOff);
    tiff.writeUInt16LE(1, gpsOff + 2); tiff.writeUInt16LE(2, gpsOff + 4); tiff.writeUInt32LE(2, gpsOff + 6); tiff.write('N\0', gpsOff + 10, 'latin1');
  }
  art.copy(tiff, strOff);
  const app1Body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const app1 = Buffer.alloc(4); app1[0] = 0xff; app1[1] = 0xe1; app1.writeUInt16BE(app1Body.length + 2, 2);
  const com = Buffer.from('a note', 'utf8');
  const comHead = Buffer.from([0xff, 0xfe, 0, com.length + 2]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, app1Body, comHead, com, Buffer.from([0xff, 0xda, 0, 2, 0xff, 0xd9])]);
}

test('JPEG: EXIF author and GPS, comment segments, private terms in EXIF text', () => {
  const terms = termMatcher(parseTerms(TERMS_TEXT).terms);
  const jpg = jpegWithExif({ artist: 'Zephyrine', gps: true });
  const meta = jpegMetadata(jpg);
  assert.equal(meta.exif.gps, true);
  assert.deepEqual(meta.exif.fields, [{ name: 'Artist', text: 'Zephyrine' }]);
  assert.deepEqual(meta.comments, ['a note']);
  const f = scanFile('docs/shot.jpg', jpg, { terms });
  assert.deepEqual(countByRule(f), { 'image-metadata': 3, 'private-term': 1 });
  assert.ok(f.some(x => /GPS/.test(x.message)));
});

test('SVG: editor and creator metadata is a finding; its text is scanned for terms', () => {
  const terms = termMatcher(parseTerms(TERMS_TEXT).terms);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><metadata><dc:creator>Someone</dc:creator></metadata><text>Acme Widgets</text></svg>';
  assert.deepEqual(rules(scanFile('assets/brand/x.svg', Buffer.from(svg), { terms })), ['image-metadata', 'private-term']);
  assert.deepEqual(scanFile('assets/brand/y.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1"/></svg>'), { terms }), []);
});

// ─── Folders, forbidden paths, the allowlist ───────────────────────────────
test('a folder scan never reads data/, state/ or secrets/ and flags them, and a committed term list', (t) => {
  const root = tmp(t);
  put(root, 'src/ok.js', 'export const x = 1;\n');
  put(root, 'data/state/dashboard-state.json', JSON.stringify({ email: PERSONAL_EMAIL }));
  put(root, 'secrets/client_secret.json', '{}');
  put(root, 'tools/privacy-terms.txt', 'Zephyrine\n');
  put(root, 'notes/old-backup-2026.json', '{}');
  const r = scanTree(root, { useGitignore: false });
  assert.deepEqual(r.findings.map(f => `${f.rule} ${f.file}`).sort(), [
    'forbidden-path data/', 'forbidden-path notes/old-backup-2026.json', 'forbidden-path secrets/', 'forbidden-path tools/privacy-terms.txt',
  ]);
  assert.ok(!r.findings.some(f => f.rule === 'email'), 'nothing inside data/ was read');
  assert.equal(forbiddenPath('.claude/settings.json', false), null, 'a reviewed project settings file may be scanned');
  assert.equal(forbiddenPath('.claude/settings.local.json', false).rule, 'forbidden-path');
  assert.equal(forbiddenPath('.claude/skills', true), null, 'the shared project skills folder may be scanned');
  assert.equal(forbiddenPath('.claude/skills/animation-pack/SKILL.md', false), null, 'a shared project skill is committed content (its text is still scanned)');
  assert.equal(forbiddenPath('.claude/worktrees', true).rule, 'forbidden-path', 'the rest of .claude/ stays per-machine');
});

test('allowlist: narrow, reasoned exceptions; private terms by a glob and forbidden paths can never be allowed', (t) => {
  const root = tmp(t);
  const file = put(root, 'allow.json', JSON.stringify({ allow: [{ rule: 'email', path: 'docs/**', match: '@mailbox-demo\\.co\\.uk$', why: 'test' }] }));
  const a = loadAllow(file);
  assert.deepEqual(scan(`x ${PERSONAL_EMAIL}`, 'docs/a.md', { allowed: a.allowed }), []);
  assert.equal(scan(`x ${PERSONAL_EMAIL}`, 'src/a.js', { allowed: a.allowed }).length, 1, 'other paths still flagged');
  assert.equal(a.entries[0].used, 1);
  for (const rule of ['private-term', 'forbidden-path']) {
    const bad = put(root, `${rule}.json`, JSON.stringify({ allow: [{ rule, path: '**', why: 'no' }] }));
    assert.throws(() => loadAllow(bad), /cannot be allowed/);
  }
  assert.throws(() => loadAllow(put(root, 'nowhy.json', JSON.stringify({ allow: [{ rule: 'email', path: '**' }] }))), /needs rule, path and why/);
  assert.doesNotThrow(() => loadAllow(DEFAULT_ALLOW(ROOT)), 'the committed allowlist is valid');
});

test('allowlist: a private term only on one reviewed line (exact path + line_sha256), never by a glob, * or match', (t) => {
  const root = tmp(t);
  const terms = termMatcher(parseTerms('Zephyrine\n').terms);
  const line = "const words = ['zephyrine', 'other'];";
  const text = `// header\n${line}\r\nconst x = 'Zephyrine';\n`;
  const a = loadAllow(put(root, 'allow.json', JSON.stringify({ allow: [
    { rule: 'private-term', path: 'src/a.js', line_sha256: lineHash(line), why: 'reviewed: a generic word list' },
    { rule: '*', path: '**', why: 'a catch-all never covers a private term' },
  ] })));
  const terms3 = (txt, rel) => scanText(txt, { rel, terms, allowed: a.allowed }).filter(f => f.rule === 'private-term');
  const found = terms3(text, 'src/a.js');
  assert.deepEqual(found.map(f => f.line), [3], 'only the reviewed line (CRLF or not) is allowed');
  assert.ok(/^[0-9a-f]{64}$/.test(found[0].lineHash) && !JSON.stringify({ ...found[0], text: undefined }).includes('ephyrine'));
  assert.equal(a.entries[0].used, 1);
  assert.equal(terms3(text, 'src/b.js').length, 2, 'another file is not covered');
  assert.equal(terms3(text.replace("'other'", "'more'"), 'src/a.js').length, 2, 'an edited line comes back');
  for (const bad of [{ path: 'src/*.js', line_sha256: lineHash(line) }, { path: 'src/a.js' }, { path: 'src/a.js', line_sha256: 'abc' }, { path: 'src/a.js', line_sha256: lineHash(line), match: 'z' }]) {
    assert.throws(() => loadAllow(put(root, 'bad.json', JSON.stringify({ allow: [{ rule: 'private-term', why: 'no', ...bad }] }))), /cannot be allowed/);
  }
});

// ─── The command line ──────────────────────────────────────────────────────
test('CLI: exit 0 when clean, 1 on findings, 2 for a missing term file; --json; terms never printed', async (t) => {
  const root = tmp(t);
  put(root, 'src/a.js', 'export const a = 1;\n');
  let c = capture();
  assert.equal(await main([root, '--no-terms', '--no-allow'], c), 0);
  assert.match(c.text(), /0 error\(s\), 0 warning\(s\) - clean/);

  put(root, 'docs/notes.md', `Ask Zephyrine.\nKey ${GH_TOKEN}\n`);
  const termFile = put(tmp(t), 'privacy-terms.txt', TERMS_TEXT);
  c = capture();
  assert.equal(await main([root, '--terms', termFile, '--no-allow'], c), 1);
  assert.match(c.text(), /docs\/notes\.md:1:5 {2}error \[private-term\] private term #2/);
  assert.match(c.text(), /docs\/notes\.md:2:5 {2}error \[github-token\]/);
  assert.match(c.text(), /3 private term\(s\) from the given file/);
  assert.ok(!/zephyrine/i.test(c.text()), 'the term is not in the output');
  assert.ok(!c.text().includes(GH_TOKEN), 'the token is masked');

  c = capture();
  assert.equal(await main([root, '--terms', termFile, '--no-allow', '--json'], c), 1);
  const j = JSON.parse(c.out.join('\n'));
  assert.deepEqual(j.counts, { 'github-token': 1, 'private-term': 1 });
  assert.ok(!/zephyrine/i.test(JSON.stringify(j)));

  c = capture();
  assert.equal(await main([root, '--no-terms', '--no-allow', '--summary'], c), 1);
  assert.ok(!c.text().includes('docs/notes.md:'), '--summary prints counts only');
  assert.match(c.text(), /1 {2}github-token/);

  c = capture();
  assert.equal(await main([root, '--terms', join(root, 'missing.txt')], c), 2);
});

test('CLI: warnings pass unless --strict', async (t) => {
  const root = tmp(t);
  put(root, 'src/a.js', 'const label = "£12.50";\n');
  assert.equal(await main([root, '--no-terms', '--no-allow'], capture()), 0);
  assert.equal(await main([root, '--no-terms', '--no-allow', '--strict'], capture()), 1);
});

// ─── Git: commit identity, commit messages, the index ──────────────────────
test('git authors: only noreply addresses may author or commit', () => {
  assert.equal(authorAllowed(NOREPLY_EMAIL), true);
  assert.equal(authorAllowed(at('octocat', 'users.noreply.github.com')), true);
  assert.equal(authorAllowed(PERSONAL_EMAIL), false);
  const log = [
    `${'a'.repeat(40)}\0${NOREPLY_EMAIL}\0${NOREPLY_EMAIL}\0Initial commit\n\x1e`,
    `${'b'.repeat(40)}\0${PERSONAL_EMAIL}\0${NOREPLY_EMAIL}\0Fix ${GH_TOKEN}\n\x1e`,
  ].join('\n');
  const f = commitLogFindings(log);
  assert.deepEqual(f.map(x => `${x.file} ${x.rule}`), ['(commit bbbbbbbbbb) git-author', '(commit bbbbbbbbbb) message github-token']);
});

const hasGit = spawnSync('git', ['--version'], { windowsHide: true }).status === 0;

test('--staged scans the git index (not the work tree) and the commit identity', { skip: !hasGit && 'git is not installed' }, async (t) => {
  const repo = tmp(t);
  const g = (...args) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(g('init', '-q').status, 0);
  g('config', 'user.name', 'Test');
  g('config', 'user.email', NOREPLY_EMAIL);
  g('config', 'core.autocrlf', 'false');
  put(repo, 'src/a.js', `export const k = "${GH_TOKEN}";\n`);
  put(repo, 'src/b.js', 'export const b = 2;\n');
  assert.equal(g('add', 'src/b.js').status, 0);
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot };
  let c = capture();
  assert.equal(await main(['--staged', '--repo', repo, '--no-terms', '--no-allow'], { ...c, env }), 0, c.text());
  assert.match(c.text(), /git index of/);
  assert.equal(g('add', 'src/a.js').status, 0);
  c = capture();
  assert.equal(await main(['--staged', '--repo', repo, '--no-terms', '--no-allow'], { ...c, env }), 1);
  assert.match(c.text(), /src\/a\.js:1:\d+ {2}error \[github-token\]/);
  assert.deepEqual(gitIdentityFindings(repo, { GIT_AUTHOR_EMAIL: PERSONAL_EMAIL }).map(f => f.rule), ['git-author']);
  assert.deepEqual(gitIdentityFindings(repo, {}, { osUser: 'jdoe' }), []);
  // The name is published too: never an e-mail address, and not this computer's
  // account name (what a global user.name often is).
  const named = (env, osUser = 'jdoe') => gitIdentityFindings(repo, env, { osUser }).map(f => `${f.file} ${f.severity}`);
  assert.deepEqual(named({ GIT_AUTHOR_NAME: PERSONAL_EMAIL }), ['(GIT_AUTHOR_NAME) error']);
  assert.deepEqual(named({}, 'TEST'), ['(git config user.name) warn'], 'same as the account name, any case');
  assert.deepEqual(named({ GIT_COMMITTER_NAME: 'jdoe' }), ['(GIT_COMMITTER_NAME) warn']);
  g('config', '--unset', 'user.name');
  const noName = gitIdentityFindings(repo, { GIT_COMMITTER_NAME: 'Test' }, { osUser: 'jdoe' });
  if (!spawnSync('git', ['-C', repo, 'config', 'user.name'], { windowsHide: true }).stdout.toString().trim()) {
    assert.deepEqual(noName.map(f => `${f.file} ${f.severity}`), ['(git config user.name) warn'], 'no name set at all');
  }
});

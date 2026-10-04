// tools/privacy-deep.mjs (privacy-scan --deep): more terms from a data folder,
// terms hidden inside identifiers, glued, accented or split by invisible
// characters, hashes, encoded text, machine ids and coordinates; findings by
// number and kind only, never the term.
//
// Every "private" value below is invented, and the ones a rule looks for are
// put together at run time, so this file itself passes the scanner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { crc32 } from '../lib/zip.mjs';
import { main, lineHash } from '../tools/privacy-scan.mjs';
import { fold, termTokens, textTokens, tokenMatcher, deriveDeepTerms, decodedViews, nearLocation, makeDeep, MACHINE_RULES } from '../tools/privacy-deep.mjs';

const tmp = (t) => { const d = mkdtempSync(join(tmpdir(), 'privacy-deep-')); t.after(() => rmSync(d, { recursive: true, force: true })); return d; };
const put = (root, rel, data) => { const f = join(root, ...rel.split('/')); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, data); return f; };
const json = (v) => JSON.stringify(v, null, 1);
const capture = () => {
  const lines = [];
  return { lines, log: (s) => lines.push(String(s)), error: (s) => lines.push(String(s)), text: () => lines.join('\n') };
};
const at = (local, domain) => [local, domain].join('@');
const ZW = String.fromCharCode(0x200b), SHY = String.fromCharCode(0xad), ACUTE = String.fromCharCode(0x301);
const T = (term, n = 'd1', note = 'from the data folder: person name') => ({ n, term, note });

test('tokens: folded (case, accents, invisible characters), identifiers split at case and digit changes', () => {
  assert.equal(fold('Jose' + ACUTE), 'jose');
  assert.equal(fold('Pri' + ZW + 'ya'), 'priya');
  assert.deepEqual(termTokens("Dana O'Rourke-Quembly"), ['dana', 'o', 'rourke', 'quembly']);
  const { plain, sub } = textTokens('const danaQuembly2 = x_dana;');
  assert.deepEqual(plain.map(p => p.v), ['const', 'danaquembly2', 'x', 'dana']);
  assert.deepEqual(sub.map(p => p.v), ['const', 'dana', 'quembly', '2', 'x', 'dana']);
});

test('the matcher: phrases across short gaps (not lines), identifiers, glued names; the project owner is not a name', () => {
  const terms = [T('Dana'), T('Quillfeather', 'd2'), T('Harrow Bay Clinic', 'e1', 'from the data folder: organisation'), T('octo', 'd3')];
  const deep = makeDeep({ terms, project: { owner: 'octo1190', repo: 'demo' } });
  const msgs = (text) => deep.scanFile('src/a.js', text, [], {}).map(f => `${f.line} ${f.message.replace(/ \(from the data folder: [^)]+\)/, '')}`);
  assert.deepEqual(msgs('see Harrow  Bay - Clinic\n'), ['1 private term e1']);
  assert.deepEqual(msgs('Harrow Bay\nClinic\n'), [], 'a phrase does not run over a line break');
  assert.deepEqual(msgs('const danaTasks = 1;'), ['1 private term d1 (inside an identifier)']);
  assert.deepEqual(msgs('x = "quillfeathers2024"'), ['1 private term d2 (glued to other letters)']);
  assert.deepEqual(msgs(`Da${SHY}na and Dana${ACUTE}`), ['1 private term d1 (with accents dropped, or look-alike or invisible characters)',
    '1 private term d1 (with accents dropped, or look-alike or invisible characters)']);
  assert.deepEqual(msgs('https://github.com/octo1190/demo'), [], "the owner's handle is not a name inside a word");
  assert.deepEqual(deep.scanName('docs/dana-notes.md').map(f => f.message.replace(/ \(from[^)]+\)/, '')), ['private term d1 in the file name']);
  // A thousand terms are as quick as one.
  const many = tokenMatcher(Array.from({ length: 1000 }, (_, i) => T(`Term${i} Place${i}`, `e${i}`)));
  const { plain } = textTokens('x term999 place999 y');
  assert.deepEqual(many.find(plain, 'x term999 place999 y').map(h => h.t.n), ['e999']);
});

function dataFolder(root) {
  const mail = at('dana.quembly', 'harrowbay-clinic.co.uk');
  put(root, 'config.json', json({ userName: 'Dana Quembly', myEmails: [mail], location: { name: 'Kestrelford', lat: 52.1234, lon: -1.9876 } }));
  put(root, 'state/dashboard-state.json', json({
    streams: [{ id: 'quill', label: 'Quill project' }],
    people: [{ id: 'p1', name: 'Mirela Thornquist', org: 'Harrow Bay Clinic', email: at('mirela', 'harrowbay-clinic.co.uk') }],
    custom: [{ id: 'u-7f3k9q2', title: 'Send the Quillfeather grant report to Mirela', notes: 'x' }],
    resources: [{ id: 'r-12ab34', label: 'Grant folder', path: 'C:\\Work\\Quillfeather-Grant\\drafts', url: 'https://wiki.harrowbay-clinic.co.uk/quill/plan' }],
  }));
  put(root, 'calendar/calendar.json', json({ events: [{ id: 'ev-9z8y7x6w', summary: 'Kestrelford rowing club social', location: 'Boathouse, Kestrelford',
    attendees: [{ email: at('t.okafor', 'rowing-kestrel.org'), displayName: 'Tobi Okafor' }] }] }));
  put(root, 'email/inbox.json', json({ emails: [{ id: 'm-5544aa', from: `Tobi Okafor <${at('t.okafor', 'rowing-kestrel.org')}>`, subject: 'Boat rota for the autumn' }] }));
  put(root, 'finance/_system/analysis.json', json({ tx: [{ merchant: 'Kestrel Deli', description: 'KESTREL DELI 0042 ON 02 OCT CPM', amount: -12.4 }] }));
  return mail;
}

test('deriveDeepTerms: titles, organisations, places, merchants, ids, links, hosts, domains, folders, hashes, coordinates', (t) => {
  const data = tmp(t);
  const mail = dataFolder(data);
  const d = deriveDeepTerms(data, { env: {}, machine: false });
  const kinds = (k) => d.terms.filter(x => x.note === `from the data folder: ${k}`).map(x => x.term);
  assert.ok(kinds('title').includes('Send the Quillfeather grant report to Mirela'));
  assert.ok(kinds('title').includes('Kestrelford rowing club social'));
  assert.ok(kinds('title').includes('Boat rota for the autumn'));
  assert.ok(kinds('title').includes('Quill project'), 'a two-word stream label');
  assert.ok(kinds('organisation').includes('Harrow Bay Clinic'));
  assert.ok(kinds('place').includes('Boathouse, Kestrelford'));
  assert.ok(kinds('merchant').includes('Kestrel Deli'));
  assert.ok(kinds('record id').includes('u-7f3k9q2') && kinds('record id').includes('ev-9z8y7x6w'));
  assert.ok(kinds('e-mail domain').includes('harrowbay-clinic.co.uk'));
  assert.ok(kinds('e-mail address').includes(at('t.okafor', 'rowing-kestrel.org')));
  assert.ok(kinds('web host').includes('wiki.harrowbay-clinic.co.uk'));
  assert.ok(kinds('link').includes('wiki.harrowbay-clinic.co.uk/quill/plan'));
  assert.ok(kinds('folder name').includes('Quillfeather-Grant'));
  assert.ok(kinds('md5 hash of a private term').includes(createHash('md5').update(mail).digest('hex')));
  assert.deepEqual(d.coords, [{ lat: 52.1234, lon: -1.9876 }]);
  assert.equal(kinds('title word').length, 0, 'single words only with words:true');
  const w = deriveDeepTerms(data, { env: {}, machine: false, words: true });
  assert.ok(w.terms.some(x => x.term === 'Kestrelford' && / word$/.test(x.note)));
  // Machine names: from the environment given.
  const m = deriveDeepTerms(null, { env: { USERNAME: 'dquembly77', COMPUTERNAME: 'QUILL-PC9' } });
  assert.ok(m.terms.some(x => x.term === 'dquembly77' && x.note.endsWith('user name')));
  assert.ok(m.terms.some(x => x.term === 'QUILL-PC9' && x.note.endsWith('computer name')));
});

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(extra = []) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), ...extra,
    chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0, 0]))), chunk('IEND', Buffer.alloc(0))]);
}

test('encoded text is decoded and scanned again: base64, data: URIs (image metadata too), %-encoding, escapes, character references', () => {
  const mail = at('dana.quembly', 'harrowbay-clinic.co.uk');
  const b64 = Buffer.from(`contact ${mail} about Quillfeather`).toString('base64');
  const pct = encodeURIComponent(mail);
  const esc = [...'Quillfeather'].map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  const ent = mail.replace('@', '&commat;').replace(/\./g, '&#46;');
  const img = png([chunk('tEXt', Buffer.from('Author\0Mirela Thornquist', 'latin1'))]).toString('base64');
  const text = [`a = "${b64}";`, `b = "mailto:${pct}";`, `c = "${esc}";`, `d = '${ent}';`, `e = "data:image/png;base64,${img}";`].join('\n');
  assert.deepEqual(decodedViews(text).map(v => v.kind), ['a data: URI', 'base64', '%-encoding', 'escapes', 'HTML character references']);
  const deep = makeDeep({ terms: [T('Quillfeather', 'd2'), T('Thornquist', 'd3')] });
  const found = deep.scanFile('src/a.js', text, [], {}).map(f => `${f.line} ${f.rule} ${f.message.replace(/ \(from the data folder: [^)]+\)/, '')}`);
  for (const want of ['1 email', '1 private-term private term d2', '2 email', '3 private-term private term d2', '4 email', '5 image-metadata', '5 private-term private term d3']) {
    assert.ok(found.some(f => f.startsWith(want)), `${want} in ${found.join(' | ')}`);
  }
  assert.ok(found.every(f => /decoded from/.test(f)), found.join(' | '));
  // Hex is not base64, and plain code is left alone.
  assert.deepEqual(decodedViews(`const h = '${'ab12'.repeat(16)}'; const s = "plain text";`), []);
});

test('machine ids: Windows SIDs and default computer names, MAC addresses, public IPv4 (not private, documentation or test files)', () => {
  const sid = ['S', '1', '5', '21', '1180699209', '877415012', '3182924384', '1004'].join('-');
  const pc = ['DESKTOP', 'Q7R2K9B'].join('-');
  const mac = ['3c', '22', 'fb', '9a', '1e', '07'].join(':');
  const ip = ['81', '2', '69', '160'].join('.');
  const deep = makeDeep({});
  const rules = (text, rel = 'src/a.js') => deep.scanFile(rel, text, [], {}).map(f => `${f.severity} ${f.message.split(' ').slice(0, 3).join(' ')}`);
  assert.deepEqual(rules(`${sid}\n${pc}\n${mac}\n${ip}\n`), ['error a Windows security', 'error a default Windows', 'warn a MAC address', 'warn a public IPv4']);
  assert.deepEqual(rules(['10.0.0.1', '192.168.1.20', '127.0.0.1', '198.51.100.7', '8.8.8.8'].join(' ')), []);
  assert.deepEqual(rules(`fetch('${ip}')`, 'tests/ssrf.test.mjs'), [], 'tests use public addresses on purpose');
  assert.deepEqual(rules('<path d="M3.5.7.7 1.3 1.5"/>', 'icons/x.svg'), []);
  assert.equal(MACHINE_RULES.length, 4);
});

test('coordinates near a saved location (either order), not elsewhere', () => {
  const home = [{ lat: 52.1234, lon: -1.9876 }];
  assert.equal(nearLocation('center: [52.13, -1.99]', home).length, 1);
  assert.equal(nearLocation('{ "type": "Point", "coordinates": [-1.9, 52.2] }', home).length, 1);
  assert.equal(nearLocation('lat: 51.5072, lon: -0.1276', home).length, 0);
  assert.equal(nearLocation('ratio 0.5, 0.25', home).length, 0);
  const deep = makeDeep({ coords: home });
  assert.deepEqual(deep.scanFile('src/w.js', 'const at = { lat: 52.12, lon: -1.98 };', [], {}).map(f => f.rule), ['near-location']);
});

test('CLI --deep: findings by number and kind only, never a term; the allowlist pins still apply', async (t) => {
  const data = tmp(t), root = tmp(t);
  const mail = dataFolder(data);
  put(root, 'src/app.js', [
    '// Kestrelford rowing club social: the RSVP list',          // a calendar title
    'const quillfeatherGrant = 1;',                               // a word of a task title inside an identifier
    `const avatar = 'https://www.gravatar.com/avatar/${createHash('md5').update(mail).digest('hex')}';`,
    `const note = "${Buffer.from('A note for Mirela Thornquist about the rota').toString('base64')}";`,
    'const ok = 1;',
  ].join('\n'));
  put(root, 'README.md', 'Plain text, nothing private.\n');
  // Without --deep the base scan finds the names only where they are whole words: none of these.
  let c = capture();
  assert.equal(await main([root, '--no-allow', '--terms-from', data], c), 0, c.text());
  c = capture();
  assert.equal(await main([root, '--no-allow', '--terms-from', data, '--deep', '--json'], c), 1);
  const out = c.text();
  const r = JSON.parse(c.lines.find(l => l.startsWith('{')));
  const where = r.findings.map(f => `${f.file}:${f.line} ${f.message.replace(/private term \S+ /, '')}`);
  for (const want of ['src/app.js:1 (from the data folder: title)', 'src/app.js:3 (from the data folder: md5 hash of a private term)',
    'src/app.js:4 (from the data folder: person name) (decoded from base64)']) assert.ok(where.includes(want), `${want} in ${where.join(' | ')}`);
  for (const secret of ['Kestrelford', 'Quillfeather', 'Mirela', 'Thornquist', 'harrowbay', 'Dana', mail]) assert.ok(!out.includes(secret), `never printed: ${secret}`);
  assert.match(r.terms, /deep pass: \d+ more term\(s\) \(.*title.*\), 1 saved location/);
  // A reviewed line, pinned by its hash, is allowed for the deep pass too.
  const allow = put(tmp(t), 'allow.json', json({ allow: [{ rule: 'private-term', path: 'src/app.js', line_sha256: lineHash('// Kestrelford rowing club social: the RSVP list'), why: 'test' }] }));
  c = capture();
  await main([root, '--allow', allow, '--terms-from', data, '--deep', '--json'], c);
  const r2 = JSON.parse(c.lines.find(l => l.startsWith('{')));
  assert.ok(!r2.findings.some(f => f.file === 'src/app.js' && f.line === 1), 'the pinned line is allowed');
  assert.ok(r2.findings.some(f => f.file === 'src/app.js' && f.line === 3));
  // --deep with --no-terms: encodings and machine ids only (what CI could run).
  c = capture();
  assert.equal(await main([root, '--no-allow', '--no-terms', '--deep'], c), 0, c.text());
});

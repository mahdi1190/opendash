// The release's built-in app registrations (tools/release-client-ids.mjs,
// tools/release-package.mjs --client-ids): read from the environment only,
// validated, written into the ZIP's lib/accounts/shipped.mjs only (the export
// on disk and the repository never change), and the zip's privacy check
// allows exactly those values in exactly that file. Synthetic values, built at
// run time so no client-ID-shaped literal is in the repository.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readClientIds, injectShipped, allowEntries, SHIPPED_REL, masked } from '../tools/release-client-ids.mjs';
import { buildZip } from '../tools/release-package.mjs';
import { readZip } from '../lib/zip.mjs';
import { scanText } from '../tools/privacy-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MS = '00000000-0000-4000-8000-0000000000aa';
const GID = ['123456789012', 'abcdefghijklmnopqrstuvwxyz012345'].join('-') + '.apps.googleusercontent.com';
const GSECRET = ['GOCSPX', 'Synthetic0123456789abcdefghij'].join('-');
const ENV = { OPENDASH_MICROSOFT_CLIENT_ID: MS, OPENDASH_GOOGLE_CLIENT_ID: GID, OPENDASH_GOOGLE_CLIENT_SECRET: GSECRET };
const base = mkdtempSync(join(tmpdir(), 'od-release-ids-'));
after(() => rmSync(base, { recursive: true, force: true }));
const shippedSrc = readFileSync(join(ROOT, SHIPPED_REL), 'utf8');

test('the values come from the environment, checked; Google id and secret together', () => {
  assert.deepEqual(readClientIds(ENV), { values: { microsoftClientId: MS, googleClientId: GID, googleClientSecret: GSECRET }, missing: [], errors: [] });
  assert.deepEqual(readClientIds({}).missing, ['OPENDASH_MICROSOFT_CLIENT_ID', 'OPENDASH_GOOGLE_CLIENT_ID', 'OPENDASH_GOOGLE_CLIENT_SECRET']);
  assert.match(readClientIds({ OPENDASH_MICROSOFT_CLIENT_ID: 'not-a-guid' }).errors[0], /Microsoft application \(client\) ID/);
  assert.match(readClientIds({ OPENDASH_MICROSOFT_CLIENT_ID: 'OPENDASH_MICROSOFT_CLIENT_ID' }).errors[0], /placeholder/);
  assert.match(readClientIds({ OPENDASH_GOOGLE_CLIENT_ID: GID }).errors[0], /go together/);
  assert.match(readClientIds({ ...ENV, OPENDASH_GOOGLE_CLIENT_SECRET: "x'; process.exit(1); '" }).errors.join(' '), /Google client secret/, 'nothing that could break out of the string');
  assert.equal(masked(GSECRET), 'GOCS…(36 chars)');
});

test('shipped.mjs gets exactly the values, once; with OPENDASH_SHIPPED_IDS=off they are ignored', async () => {
  const out = injectShipped(shippedSrc, readClientIds(ENV).values);
  const changed = out.split('\n').filter((l, i) => l !== shippedSrc.split('\n')[i]);
  assert.equal(changed.length, 3, 'only the three placeholder lines change');
  assert.ok(changed.every(l => /^\s+(microsoftClientId|googleClientId|googleClientSecret): '/.test(l)));
  assert.throws(() => injectShipped(out, { microsoftClientId: MS }), /placeholder .* is not there/, 'never written twice');
  const f = join(base, 'shipped.mjs');
  writeFileSync(f, out);
  const m = await import(pathToFileURL(f).href);
  assert.equal(m.shippedMicrosoftClientId({}), MS);
  assert.deepEqual(m.shippedGoogleClient({}), { clientId: GID, clientSecret: GSECRET });
  assert.equal(m.shippedMicrosoftClientId({ OPENDASH_SHIPPED_IDS: 'off' }), null, "the zip's own tests see a copy without built-in apps");
  assert.equal(m.shippedGoogleClient({ OPENDASH_SHIPPED_IDS: 'off' }), null);
  assert.equal((await import('../lib/accounts/shipped.mjs')).SHIPPED.microsoftClientId, 'OPENDASH_MICROSOFT_CLIENT_ID', 'the repository keeps its placeholders');
});

test('into the zip only: the export on disk is unchanged, the zip entry holds the values', () => {
  const exp = join(base, 'export');
  mkdirSync(join(exp, 'lib', 'accounts'), { recursive: true });
  writeFileSync(join(exp, 'package.json'), JSON.stringify({ name: 'opendash', version: '9.9.9' }));
  writeFileSync(join(exp, 'build.mjs'), '// build\n');
  writeFileSync(join(exp, SHIPPED_REL), shippedSrc);
  const ids = readClientIds(ENV).values;
  const z = buildZip(exp, '9.9.9', { transform: (rel, buf) => (rel === SHIPPED_REL ? Buffer.from(injectShipped(buf.toString('utf8'), ids)) : buf) });
  const entry = readZip(z.buffer).find(e => e.name === `${z.top}/${SHIPPED_REL}`);
  const text = Buffer.from(entry.data).toString('utf8');
  assert.ok(text.includes(`'${MS}'`) && text.includes(`'${GID}'`) && text.includes(`'${GSECRET}'`));
  assert.equal(readFileSync(join(exp, SHIPPED_REL), 'utf8'), shippedSrc, 'the export folder never holds them');
});

test("the zip's privacy check allows these values in shipped.mjs and nowhere else", () => {
  const ids = readClientIds(ENV).values;
  const text = injectShipped(shippedSrc, ids);
  const entries = allowEntries(ids);
  assert.equal(entries.length, 3);
  assert.ok(entries.every(e => e.path === SHIPPED_REL && e.why));
  const allowed = (f, rel) => entries.some(e => e.path === rel && new RegExp(e.match).test(f.text));
  const plainScan = scanText(text, { rel: SHIPPED_REL });
  assert.ok(plainScan.some(f => f.rule === 'google-secret'), 'without the entries the scan refuses the injected secret');
  assert.deepEqual(scanText(text, { rel: SHIPPED_REL, allowed }).filter(f => f.severity === 'error'), [], 'with them: expected');
  assert.ok(scanText(`const s = '${GSECRET}';\n`, { rel: 'lib/other.mjs', allowed }).some(f => f.rule === 'google-secret'), 'the same value anywhere else is still refused');
  const other = ['GOCSPX', 'AnotherSecret0123456789abcdefgh'].join('-');
  assert.ok(scanText(`googleClientSecret: '${other}',\n`, { rel: SHIPPED_REL, allowed }).some(f => f.rule === 'google-secret'), 'another secret in shipped.mjs is still refused');
});

// Updates: version rules, the release feed, installing a release zip (checksum,
// unsafe paths, backup, rollback, files a release dropped), the git path with a
// stand-in git, the routes on a real in-process server (never applying to the
// real app folder), and the page's pure rules.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createZip } from '../lib/zip.mjs';
import * as U from '../lib/updater.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const tmp = (p) => mkdtempSync(join(tmpdir(), p));

/** A release zip like the real one: one top folder, the files a build needs. */
function makeZip(version, extra = [], { omit = [], pkgVersion = version, top = `opendash-v${version}` } = {}) {
  const files = [
    ['package.json', JSON.stringify({ name: 'opendash', version: pkgVersion })],
    ['build.mjs', '// build ' + version], ['serve.mjs', '// serve ' + version],
    ['server/index.mjs', '// server ' + version], ['src/body.html', '<body>' + version + '</body>'],
    ['src/app/10-a.js', '// a ' + version], ['src/app/20-b.js', '// b ' + version],
    ...extra,
  ].filter(([n]) => !omit.includes(n));
  return createZip(files.map(([n, d]) => ({ name: `${top}/${n}`, data: d })));
}
function release(version, zip, { sums } = {}) {
  const name = `opendash-v${version}.zip`;
  return { version, tag: `v${version}`, name: `OpenDash v${version}`, notes: 'notes', publishedAt: null, url: 'https://github.com/mahdi1190/opendash/releases',
    zip: { name, url: `https://github.com/mahdi1190/opendash/releases/download/v${version}/${name}`, size: zip.length },
    sums: { name: 'SHA256SUMS.txt', url: `https://github.com/mahdi1190/opendash/releases/download/v${version}/SHA256SUMS.txt`, size: 100 },
    _sums: sums ?? `${sha(zip)}  ${name}\n` };
}
/** A fetch that serves a release's two files from memory. */
function fakeFetch(rel, zip) {
  return async (url) => {
    const body = url === rel.zip.url ? zip : url === rel.sums.url ? Buffer.from(rel._sums) : null;
    if (!body) return new Response('nope', { status: 404 });
    return new Response(body, { status: 200, headers: { 'content-length': String(body.length) } });
  };
}
function appFolder(version = '1.0.0') {
  const root = tmp('upd-app-'), data = tmp('upd-data-');
  for (const [n, d] of [['package.json', JSON.stringify({ version })], ['build.mjs', '// old build'], ['serve.mjs', '// old serve'], ['server/index.mjs', '// old server'],
    ['src/body.html', 'old'], ['src/app/10-a.js', '// old a'], ['src/app/30-gone.js', '// dropped by the release'], ['server/routes/zz-gone.mjs', '// dropped route'],
    ['index.html', 'BUILT PAGE']]) {
    mkdirSync(dirname(join(root, n)), { recursive: true }); writeFileSync(join(root, n), d);
  }
  mkdirSync(join(root, 'data'), { recursive: true }); writeFileSync(join(root, 'data', 'mine.json'), 'MY DATA');
  return { root, data, done: () => { rmSync(root, { recursive: true, force: true }); rmSync(data, { recursive: true, force: true }); } };
}

describe('versions', () => {
  test('parse and compare', () => {
    assert.deepEqual(U.parseVersion('v2.3.0'), { major: 2, minor: 3, patch: 0, pre: '' });
    assert.equal(U.parseVersion('2.3'), null);
    assert.equal(U.parseVersion('latest'), null);
    assert.equal(U.compareVersions('2.10.0', '2.9.9'), 1);
    assert.equal(U.compareVersions('2.2.1', '2.2.1'), 0);
    assert.equal(U.compareVersions('2.2.1', 'v2.3.0'), -1);
    assert.equal(U.compareVersions('2.3.0-rc.1', '2.3.0'), -1, 'a pre-release is older than its release');
    assert.equal(U.compareVersions('2.3.0-rc.2', '2.3.0-rc.10'), -1);
    assert.equal(U.compareVersions('x', '2.0.0'), null);
  });
});

describe('the release feed', () => {
  const gh = (o) => ({ tag_name: 'v2.3.0', name: 'OpenDash v2.3.0', body: 'Changes', published_at: '2026-10-05T10:00:00Z', html_url: 'https://github.com/mahdi1190/opendash/releases/tag/v2.3.0',
    assets: [
      { name: 'opendash-v2.3.0.zip', size: 5, browser_download_url: 'https://github.com/mahdi1190/opendash/releases/download/v2.3.0/opendash-v2.3.0.zip' },
      { name: 'SHA256SUMS.txt', size: 5, browser_download_url: 'https://github.com/mahdi1190/opendash/releases/download/v2.3.0/SHA256SUMS.txt' }], ...o });
  test('a normal release is understood', () => {
    const r = U.normaliseRelease(gh());
    assert.equal(r.version, '2.3.0'); assert.equal(r.zip.name, 'opendash-v2.3.0.zip'); assert.ok(r.sums.url.endsWith('SHA256SUMS.txt'));
  });
  test('drafts, pre-releases, odd tags and downloads from elsewhere are not trusted', () => {
    assert.equal(U.normaliseRelease(gh({ draft: true })), null);
    assert.equal(U.normaliseRelease(gh({ prerelease: true })), null);
    assert.equal(U.normaliseRelease(gh({ tag_name: 'nightly' })), null);
    const evil = U.normaliseRelease(gh({ assets: [{ name: 'opendash-v2.3.0.zip', browser_download_url: 'https://evil.example/opendash-v2.3.0.zip' }] }));
    assert.equal(evil.zip, null, 'a zip from another host is dropped');
    assert.equal(U.normaliseRelease(gh({ html_url: 'https://evil.example/x' })).url, 'https://github.com/mahdi1190/opendash/releases');
  });
  test('checkLatest turns failures into plain sentences', async () => {
    const f = (r) => async () => r;
    const ok = await U.checkLatest({ fetchImpl: f(new Response(JSON.stringify(gh()), { status: 200 })), env: {} });
    assert.equal(ok.version, '2.3.0');
    await assert.rejects(U.checkLatest({ fetchImpl: f(new Response('', { status: 404 })), env: {} }), /No release has been published/);
    await assert.rejects(U.checkLatest({ fetchImpl: f(new Response('', { status: 403 })), env: {} }), /limiting/);
    await assert.rejects(U.checkLatest({ fetchImpl: async () => { throw new Error('ENOTFOUND'); }, env: {} }), /offline/);
    await assert.rejects(U.checkLatest({ fetchImpl: f(new Response('not json', { status: 200 })), env: {} }), /does not understand/);
  });
  test('SHA256SUMS lookup', () => {
    const h = 'a'.repeat(64);
    assert.equal(U.sumFor(`${h}  opendash-v1.zip\n${'b'.repeat(64)} *other.zip`, 'opendash-v1.zip'), h);
    assert.equal(U.sumFor(`${h}  opendash-v1.zip`, 'opendash-v2.zip'), null);
  });
});

describe('installing a release zip', () => {
  test('replaces the app, keeps data and the built page, backs up what it replaced, drops what the release dropped', async () => {
    const app = appFolder();
    try {
      const zip = makeZip('1.1.0', [['src/app/40-new.js', '// new']]);
      const rel = release('1.1.0', zip);
      const r = await U.applyZipUpdate({ repoRoot: app.root, dataDir: app.data, release: rel, current: '1.0.0', fetchImpl: fakeFetch(rel, zip), env: {} });
      assert.equal(r.to, '1.1.0');
      assert.equal(JSON.parse(readFileSync(join(app.root, 'package.json'), 'utf8')).version, '1.1.0');
      assert.equal(readFileSync(join(app.root, 'src/app/10-a.js'), 'utf8'), '// a 1.1.0');
      assert.equal(readFileSync(join(app.root, 'src/app/40-new.js'), 'utf8'), '// new');
      assert.ok(!existsSync(join(app.root, 'src/app/30-gone.js')), 'a module the release dropped would still be concatenated into the page');
      assert.ok(!existsSync(join(app.root, 'server/routes/zz-gone.mjs')), 'a dropped route would still be auto-loaded');
      assert.equal(readFileSync(join(app.root, 'data/mine.json'), 'utf8'), 'MY DATA');
      assert.equal(readFileSync(join(app.root, 'index.html'), 'utf8'), 'BUILT PAGE');
      assert.equal(readFileSync(join(r.backup, 'src/app/10-a.js'), 'utf8'), '// old a');
      assert.equal(readFileSync(join(r.backup, 'src/app/30-gone.js'), 'utf8'), '// dropped by the release');
      assert.ok(r.backup.startsWith(app.data), 'the backup lives in the data folder');
    } finally { app.done(); }
  });
  test('a download that does not match its checksum installs nothing', async () => {
    const app = appFolder();
    try {
      const zip = makeZip('1.1.0');
      const rel = release('1.1.0', zip, { sums: `${'0'.repeat(64)}  opendash-v1.1.0.zip\n` });
      await assert.rejects(U.applyZipUpdate({ repoRoot: app.root, dataDir: app.data, release: rel, current: '1.0.0', fetchImpl: fakeFetch(rel, zip), env: {} }), /checksum/);
      assert.equal(readFileSync(join(app.root, 'build.mjs'), 'utf8'), '// old build');
    } finally { app.done(); }
  });
  test('no entry for the zip in SHA256SUMS.txt, or a refused address, installs nothing', async () => {
    const app = appFolder();
    try {
      const zip = makeZip('1.1.0');
      const rel = release('1.1.0', zip, { sums: `${sha(zip)}  something-else.zip\n` });
      await assert.rejects(U.applyZipUpdate({ repoRoot: app.root, dataDir: app.data, release: rel, current: '1.0.0', fetchImpl: fakeFetch(rel, zip), env: {} }), /no entry/);
      const bad = { ...release('1.1.0', zip), zip: { name: 'opendash-v1.1.0.zip', url: 'https://evil.example/z.zip' } };
      await assert.rejects(U.applyZipUpdate({ repoRoot: app.root, dataDir: app.data, release: bad, current: '1.0.0', fetchImpl: async () => { throw new Error('must not be called'); }, env: {} }), /unexpected address|checksum|SHA256SUMS/);
    } finally { app.done(); }
  });
  test('a bad zip is refused: wrong folder, wrong version, missing build files, escaping paths', async () => {
    const app = appFolder();
    try {
      for (const [label, zip, re] of [
        ['another top folder', makeZip('1.1.0', [], { top: 'something-else' }), /outside its own folder/],
        ['wrong version inside', makeZip('1.1.0', [], { pkgVersion: '9.9.9' }), /is version 9\.9\.9/],
        ['no build.mjs', makeZip('1.1.0', [], { omit: ['build.mjs'] }), /missing build\.mjs/],
      ]) {
        const rel = release('1.1.0', zip);
        await assert.rejects(U.applyZipUpdate({ repoRoot: app.root, dataDir: app.data, release: rel, current: '1.0.0', fetchImpl: fakeFetch(rel, zip), env: {} }), re, label);
        assert.equal(readFileSync(join(app.root, 'build.mjs'), 'utf8'), '// old build', label + ': nothing changed');
      }
      assert.throws(() => U.unpackRelease(Buffer.from('not a zip at all, but long enough to pass the size check'), '1.1.0'), /zip/);
    } finally { app.done(); }
  });
  test('data, state, secrets, .git and .env inside a zip are never written', () => {
    const files = U.unpackRelease(makeZip('1.1.0', [['data/x.json', '{}'], ['state/s.json', '{}'], ['secrets/k', 'k'], ['.git/config', 'c'], ['.env', 'E'], ['index.html', 'I'], ['docs/README.md', 'ok']]), '1.1.0');
    const paths = files.map(f => f.path);
    for (const bad of ['data/x.json', 'state/s.json', 'secrets/k', '.git/config', '.env', 'index.html']) assert.ok(!paths.includes(bad), bad);
    assert.ok(paths.includes('docs/README.md'));
  });
  test('a write that fails half way puts the old files back', async () => {
    const app = appFolder();
    try {
      // a file where a folder is needed makes the second write fail after the first succeeded
      writeFileSync(join(app.root, 'blocker'), 'a file');
      const files = [{ path: 'build.mjs', data: Buffer.from('// NEW build') }, { path: 'blocker/inside.txt', data: Buffer.from('x') }];
      await assert.rejects(U.installFiles({ repoRoot: app.root, dataDir: app.data, files, from: '1.0.0' }), /old ones were put back/);
      assert.equal(readFileSync(join(app.root, 'build.mjs'), 'utf8'), '// old build');
      assert.equal(readFileSync(join(app.root, 'blocker'), 'utf8'), 'a file');
    } finally { app.done(); }
  });
  test('describeState: install kind, availability and why not', () => {
    const app = appFolder();
    try {
      const latest = { version: '1.1.0', name: 'n', notes: '', publishedAt: null, url: 'u', zip: { name: 'z', url: 'u' }, sums: { name: 's', url: 'u' } };
      let d = U.describeState({ state: { auto: false, latest, checkedAt: 'x', error: null }, current: '1.0.0', repoRoot: app.root });
      assert.equal(d.kind, 'zip'); assert.equal(d.available, true); assert.equal(d.canApply, true);
      d = U.describeState({ state: { auto: false, latest, checkedAt: 'x', error: null }, current: '1.1.0', repoRoot: app.root });
      assert.equal(d.available, false); assert.equal(d.upToDate, true);
      d = U.describeState({ state: { auto: false, latest, checkedAt: 'x', error: null }, current: '1.0.0', repoRoot: app.root, canRestart: false });
      assert.equal(d.canApply, false); assert.match(d.reason, /start-opendash/);
      d = U.describeState({ state: { auto: false, latest: { ...latest, zip: null }, checkedAt: 'x', error: null }, current: '1.0.0', repoRoot: app.root });
      assert.equal(d.canApply, false);
      mkdirSync(join(app.root, '.git'));
      assert.equal(U.installKind(app.root), 'git');
      assert.equal(U.describeState({ state: { auto: false, latest: { ...latest, zip: null }, checkedAt: 'x', error: null }, current: '1.0.0', repoRoot: app.root }).canApply, true, 'git needs no zip');
    } finally { app.done(); }
  });
});

describe('updating a git checkout', () => {
  const rel = { version: '1.1.0', tag: 'v1.1.0' };
  const git = (script) => async (args) => { const k = args[0]; const r = script[k]; return typeof r === 'function' ? r(args) : (r || { ok: true, out: '', err: '' }); };
  test('fast-forwards to the tag', async () => {
    const calls = [];
    const run = async (args) => { calls.push(args.join(' ')); return { ok: true, out: '', err: '' }; };
    const r = await U.applyGitUpdate({ repoRoot: '.', release: rel, current: '1.0.0', run });
    assert.equal(r.mode, 'git');
    assert.deepEqual(calls, ['status --porcelain --untracked-files=no', 'fetch origin refs/tags/v1.1.0:refs/tags/v1.1.0', 'merge --ff-only v1.1.0']);
  });
  test('refuses changes, diverged history, a missing git and odd tags', async () => {
    await assert.rejects(U.applyGitUpdate({ repoRoot: '.', release: rel, current: '1', run: git({ status: { ok: true, out: ' M lib/x.mjs', err: '' } }) }), /uncommitted/);
    await assert.rejects(U.applyGitUpdate({ repoRoot: '.', release: rel, current: '1', run: git({ merge: { ok: false, out: '', err: 'not possible' } }) }), /own commits/);
    await assert.rejects(U.applyGitUpdate({ repoRoot: '.', release: rel, current: '1', run: git({ status: { ok: false, missing: true, out: '', err: 'ENOENT' } }) }), /not installed/);
    await assert.rejects(U.applyGitUpdate({ repoRoot: '.', release: { version: '1', tag: '--upload-pack=evil' }, current: '1', run: git({}) }), /plain version/);
  });
});

describe('the routes', () => {
  let dir, port, srv, feed, feedPort, feedBody;
  const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const raw = (method, path, { headers = {}, body } = {}) => new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers } }, (r) => {
      let d = ''; r.setEncoding('utf8'); r.on('data', c => { d += c; });
      r.on('end', () => { let json = null; try { json = JSON.parse(d); } catch {} res({ status: r.statusCode, text: d, json }); });
    });
    req.on('error', rej); if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body)); req.end();
  });
  const same = () => ({ Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' });
  const post = (path, body = {}, extra = {}) => raw('POST', path, { headers: { 'Content-Type': 'application/json', ...same(), ...extra }, body });

  before(async () => {
    dir = tmp('upd-route-');
    feedPort = await freePort();
    feedBody = { tag_name: 'v99.0.0', name: 'OpenDash v99.0.0', body: 'Big news', published_at: '2099-01-01T00:00:00Z', html_url: 'https://github.com/mahdi1190/opendash/releases/tag/v99.0.0',
      assets: [{ name: 'opendash-v99.0.0.zip', size: 1, browser_download_url: `http://127.0.0.1:${feedPort}/dl/opendash-v99.0.0.zip` }, { name: 'SHA256SUMS.txt', size: 1, browser_download_url: `http://127.0.0.1:${feedPort}/dl/SHA256SUMS.txt` }] };
    feed = createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(feedBody)); });
    await new Promise(r => feed.listen(feedPort, '127.0.0.1', r));
    process.env.DASHBOARD_UPDATE_FEED = `http://127.0.0.1:${feedPort}/latest`;
    process.env.DASHBOARD_UPDATE_CHECK_GAP_MS = '0';
    port = await freePort();
    const { main } = await import('../server/index.mjs');
    srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
  });
  after(async () => { await srv?.close(); await new Promise(r => feed.close(r)); delete process.env.DASHBOARD_UPDATE_FEED; delete process.env.DASHBOARD_UPDATE_CHECK_GAP_MS; rmSync(dir, { recursive: true, force: true }); });

  test('status before any check, then a check finds the newer release and remembers it', async () => {
    const s0 = await raw('GET', '/api/update/status', { headers: same() });
    assert.equal(s0.status, 200);
    assert.equal(s0.json.available, false); assert.equal(s0.json.latest, null); assert.equal(s0.json.auto, false);
    const c = await post('/api/update/check');
    assert.equal(c.status, 200, c.text);
    assert.equal(c.json.available, true); assert.equal(c.json.latest.version, '99.0.0'); assert.equal(c.json.latest.notes, 'Big news');
    assert.ok(c.json.checkedAt);
    assert.equal(JSON.parse(readFileSync(join(dir, 'update-check.json'), 'utf8')).latest.version, '99.0.0');
    assert.equal((await raw('GET', '/api/update/status', { headers: same() })).json.latest.version, '99.0.0');
  });
  test('the daily-check switch is stored and validated', async () => {
    assert.equal((await post('/api/update/settings', { auto: true })).json.auto, true);
    assert.equal((await post('/api/update/settings', { auto: 'yes' })).status, 400);
    assert.equal((await post('/api/update/settings', { auto: false })).json.auto, false);
  });
  test('applying is refused for: another site, a wrong version, a server that cannot restart', async () => {
    assert.equal((await raw('POST', '/api/update/apply', { headers: { 'Content-Type': 'application/json' }, body: { version: '99.0.0' } })).status, 401, 'no page, no token');
    assert.equal((await raw('POST', '/api/update/apply', { headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' }, body: { version: '99.0.0' } })).status, 403);
    assert.equal((await post('/api/update/apply', {})).status, 400);
    const r = await post('/api/update/apply', { version: '99.0.0' });
    assert.equal(r.status, 501, 'in this test process nothing can restart the server, so nothing is installed: ' + r.text);
  });
  test('GitHub unreachable is a sentence, and the page keeps what it knew', async () => {
    const old = process.env.DASHBOARD_UPDATE_FEED;
    process.env.DASHBOARD_UPDATE_FEED = 'http://127.0.0.1:1/none';
    const c = await post('/api/update/check');
    process.env.DASHBOARD_UPDATE_FEED = old;
    assert.equal(c.status, 200);
    assert.match(c.json.error, /Could not reach/);
    assert.equal(c.json.latest.version, '99.0.0', 'the earlier answer is kept');
  });
});

describe('the page', () => {
  const src = readFileSync(join(ROOT, 'src/app/58-settings-updates.js'), 'utf8');
  const grab = (name) => new Function(`${src.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n}\\n`))[0]}; return ${name};`)();
  const upSummary = grab('upSummary'), upCheckDue = grab('upCheckDue');
  test('what the Updates page says', () => {
    assert.equal(upSummary(null).tone, 'idle');
    assert.match(upSummary({ available: true, latest: { version: '2.3.0' }, current: '2.2.1' }).text, /2\.3\.0 is available/);
    assert.equal(upSummary({ upToDate: true, current: '2.2.1' }).tone, 'ok');
    assert.equal(upSummary({ error: 'Could not reach GitHub', current: '2.2.1' }).tone, 'err');
    assert.match(upSummary({ current: '2.2.1' }).text, /Not checked yet/);
  });
  test('the daily check only runs when switched on and a day old', () => {
    const now = Date.parse('2026-10-05T12:00:00Z');
    assert.equal(upCheckDue({ auto: false, checkedAt: null }, now), false, 'off means off');
    assert.equal(upCheckDue({ auto: true, checkedAt: null }, now), true);
    assert.equal(upCheckDue({ auto: true, checkedAt: '2026-10-05T01:00:00Z' }, now), false);
    assert.equal(upCheckDue({ auto: true, checkedAt: '2026-10-03T01:00:00Z' }, now), true);
  });
  test('the page never sends anything about the user and escapes release text', () => {
    assert.ok(!/innerHTML[^;]*notes/.test(src), 'release notes go in with textContent');
    assert.ok(src.includes('pre.textContent = st.latest.notes'));
  });
});

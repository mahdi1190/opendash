// tools/release-rules.mjs + tools/release-export.mjs: the release is an
// allowlist, private paths never leave, the export builds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { classifyTop, neverRule, collectRelease, globToRegExp, NEVER } from '../tools/release-rules.mjs';
import { planExport, writeExport, dropIgnored, buildInputsMissing, main } from '../tools/release-export.mjs';
import { ROOT, fakeRepo, tempDir, put, PUBLISHED, LEFT_OUT } from './release-fixture.mjs';

const quiet = () => { const lines = []; return { lines, log: (s) => lines.push(String(s)), error: (s) => lines.push(String(s)), text: () => lines.join('\n') }; };
function listFiles(dir, base = '') {
  const out = [];
  for (const e of readdirSync(join(dir, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listFiles(dir, rel)); else out.push(rel);
  }
  return out.sort();
}

test('rules: user data, secrets, logs, backups, local config and built files are never published', () => {
  const never = ['data/state/x.json', 'data', 'state/', 'secrets/client_secret.json', 'backups/a.json', 'sync-backups/a.json', 'logs/a.txt', 'src/x.log',
    'tools/apply_sync.py', 'dashboard-backup-2026-01-01.json', 'docs/old-backup.json', 'migration-plans/a.json', '.env', 'lib/.env.local',
    'data/local-token', 'runtime.json', 'tools/privacy-terms.txt', 'certs/key.pem', '.claude/settings.local.json', 'node_modules/a.js',
    'index.html', 'dist/opendash-v1.0.0.zip', 'SHA256SUMS.txt', 'release-notes.md', 'x/.DS_Store', 'a.tmp-123', 'src/.vscode/settings.json',
    'dashboard-data-2026-10-03.json', 'docs/opendash-data-2026-10-03.json', 'opendash-backup-2026-10-03.json'];
  for (const p of never) assert.ok(neverRule(p), p);
  for (const p of ['src/app/12-home.js', 'server/index.mjs', 'tests/ok.test.mjs', 'docs/USAGE.md', 'tools/migrate.mjs', 'tools/release-export.mjs',
    'tools/privacy-scan.mjs', 'lib/state-keys.mjs', 'vendor/fonts/InterVariable-latin.woff2', 'src/app/04-core-persistence.js', 'lib/datadir.mjs']) {
    assert.equal(neverRule(p), null, p);
  }
  for (const r of NEVER) assert.ok(['private', 'local', 'build', 'internal', 'noise'].includes(r.kind) && r.why, r.re.source);
  // Maintainers' working notes stay in the repository but never ship.
  for (const p of ['docs/dev/BRANDING_PLAN.md', 'docs/dev/GITHUB_SETUP.md', 'docs/internal/', 'docs/internal/notes.md']) assert.equal(neverRule(p)?.kind, 'internal', p);
  for (const p of ['docs/dev/RELEASING.md', 'docs/dev/PRIVACY-SCAN.md', 'docs/INSTALL.md']) assert.equal(neverRule(p), null, p);
});

test('rules: the top level is an allowlist; anything new must be added on purpose', () => {
  for (const n of ['README.md', 'README-STANDALONE.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'MODULES.md',
    'CLAUDE.md', 'package.json', 'build.mjs', 'serve.mjs', 'check.bat', 'start-dashboard.bat', 'start-dashboard.sh', 'start-opendash.bat', 'start-opendash.sh',
    '.gitignore', '.gitattributes', '.editorconfig']) {
    assert.equal(classifyTop(n, false).keep, true, n);
  }
  for (const d of ['src', 'server', 'lib', 'mcp', 'tools', 'vendor', 'tests', 'docs', '.github']) assert.equal(classifyTop(d, true).keep, true, d);
  assert.deepEqual(classifyTop('assets', true), { keep: 'partial', only: ['brand'] });
  for (const [n, dir] of [['data', true], ['state', true], ['secrets', true], ['index.html', false], ['.claude', true], ['node_modules', true]]) {
    const c = classifyTop(n, dir);
    assert.equal(c.keep, false, n);
    assert.ok(c.why, n);
  }
  assert.match(classifyTop('scratch.txt', false).why, /not on the allowlist/);
  assert.match(classifyTop('playground', true).why, /not on the allowlist/);
});

test('globToRegExp: ** spans folders, * stays inside one', () => {
  assert.ok(globToRegExp('tests/**').test('tests/a/b.mjs'));
  assert.ok(globToRegExp('**/*.png').test('assets/brand/png/a.png'));
  assert.ok(globToRegExp('**/*.png').test('a.png'));
  assert.ok(!globToRegExp('src/*.js').test('src/app/a.js'));
  assert.ok(globToRegExp('src/*.js').test('src/a.js'));
});

test('collectRelease: exactly the allowlisted files; every left-out path is reported once, with a reason', (t) => {
  const repo = fakeRepo(tempDir(t));
  const { files, excluded } = collectRelease(repo);
  assert.deepEqual(files.map(f => f.rel), PUBLISHED);
  const ex = new Map(excluded.map(e => [e.rel, e]));
  for (const rel of new Set(Object.values(LEFT_OUT))) {
    assert.ok(ex.has(rel), `${rel} is reported as left out`);
    assert.ok(ex.get(rel).why, rel);
  }
  assert.ok(!excluded.some(e => e.rel.startsWith('data/')), 'the data folder is never walked');
  assert.equal(ex.get('data').kind, 'private');
  assert.equal(ex.get('tools/apply_sync.py').kind, 'private');
});

test('release-export: copies the plan, never the private paths, and proves the export builds', async (t) => {
  const repo = fakeRepo(tempDir(t));
  const out = join(tempDir(t), 'opendash');
  const c = quiet();
  assert.equal(await main(['--src', repo, '--out', out], c), 0, c.text());
  assert.deepEqual(listFiles(out), PUBLISHED);
  for (const f of listFiles(out)) assert.ok(!readFileSync(join(out, f), 'utf8').includes('PRIVATE-FIXTURE-CONTENT'), f);
  assert.ok(!existsSync(join(out, 'index.html')), 'the build check builds into a temp file, not the export');
  assert.match(c.text(), /build check: node build\.mjs --syntax ok, node build\.mjs ok/);
  assert.match(c.text(), /- data\/ {2}\[private\]/);
  assert.match(c.text(), /- tools\/apply_sync\.py {2}\[private\]/);
  assert.match(c.text(), /Next: node tools\/privacy-scan\.mjs/);
  // Line endings and bytes are copied as they are (release-package normalises launchers).
  assert.equal(readFileSync(join(out, 'start-dashboard.sh'), 'utf8'), readFileSync(join(repo, 'start-dashboard.sh'), 'utf8'));
});

test('release-export: --dry-run and --list write nothing; the default out is next to the repo', async (t) => {
  const repo = fakeRepo(tempDir(t));
  const out = join(tempDir(t), 'never-made');
  const c = quiet();
  assert.equal(await main(['--src', repo, '--out', out, '--dry-run', '--list'], c), 0);
  assert.ok(!existsSync(out));
  assert.match(c.text(), /Dry run: nothing written/);
  assert.match(c.text(), / {4}src\/app\.js {2}\d+ KB/);
  assert.match(c.text(), new RegExp(`Included: ${PUBLISHED.length} files`));
  const d = quiet();
  assert.equal(await main(['--src', repo, '--dry-run'], d), 0);
  assert.match(d.text(), /opendash-release[\\/]opendash/);
});

test('release-export: a re-export replaces the old tree but keeps its .git; refuses unsafe targets', async (t) => {
  const repo = fakeRepo(tempDir(t));
  const out = join(tempDir(t), 'opendash');
  assert.equal(await main(['--src', repo, '--out', out, '--no-build'], quiet()), 0);
  put(out, '.git/HEAD', 'ref: refs/heads/main\n');
  put(out, 'stale.txt', 'from an older export\n');
  assert.equal(await main(['--src', repo, '--out', out, '--no-build'], quiet()), 0);
  assert.ok(existsSync(join(out, '.git', 'HEAD')), '.git kept');
  assert.ok(!existsSync(join(out, 'stale.txt')), 'stale files removed');

  const plan = planExport(repo);
  assert.throws(() => writeExport(plan, join(repo, 'release')), /outside the source tree/);
  const other = tempDir(t);
  writeFileSync(join(other, 'precious.txt'), 'keep me\n');
  const c = quiet();
  assert.equal(await main(['--src', repo, '--out', other, '--no-build'], c), 2);
  assert.match(c.text(), /does not look like an earlier export/);
  assert.ok(existsSync(join(other, 'precious.txt')));
  assert.equal(await main(['--src', tempDir(t)], quiet()), 2, 'not the app');
});

test('release-export: a broken build fails the export (exit 1)', async (t) => {
  const repo = fakeRepo(tempDir(t));
  writeFileSync(join(repo, 'build.mjs'), 'process.exit(3);\n');
  const c = quiet();
  assert.equal(await main(['--src', repo, '--out', join(tempDir(t), 'o')], c), 1);
  assert.match(c.text(), /does not build/);
});

test('the real repository: the release plan holds no private path and has what the app needs', async () => {
  const plan = planExport(ROOT);
  const rels = new Set(plan.files.map(f => f.rel));
  for (const need of ['build.mjs', 'serve.mjs', 'package.json', 'LICENSE', 'README.md',
    'tools/privacy-scan.mjs', 'tools/release-export.mjs', 'tools/release-package.mjs', 'tools/release-rules.mjs', 'tools/release-offline.mjs',
    'tools/release-trace.mjs', 'tools/supervisor.mjs', 'tools/migrate.mjs', 'mcp/server.mjs', 'src/body.html', 'src/sw.js']) {
    assert.ok(rels.has(need), need);
  }
  // The launchers, whatever the branding names them (start-<name>.bat / .sh).
  assert.ok([...rels].some(r => /^start-[\w-]+\.bat$/.test(r)) && [...rels].some(r => /^start-[\w-]+\.sh$/.test(r)), 'a .bat and a .sh launcher');
  // Every file build.mjs inlines when present (it skips missing ones silently).
  const build = await import(pathToFileURL(join(ROOT, 'build.mjs')).href);
  for (const f of [...build.FONT_FILES.map(x => x.file), build.ICON_SPRITE, ...build.FAVICON_FILES.map(x => x.file)]) if (existsSync(join(ROOT, f))) assert.ok(rels.has(f), f);
  for (const f of plan.files) {
    assert.equal(neverRule(f.rel), null, f.rel);
    assert.ok(!/^(data|state|secrets|\.claude|node_modules)\//.test(f.rel), f.rel);
  }
  assert.ok(!rels.has('index.html') && !rels.has('tools/apply_sync.py'));
  for (const d of ['data', 'state', 'secrets']) if (existsSync(join(ROOT, d))) assert.ok(plan.excluded.some(e => e.rel === d), d);
});

test('an export folder never gets a data folder by accident', (t) => {
  // The export's own .gitignore is the repo's: data/ stays ignored after a first run there.
  const gi = readFileSync(join(ROOT, '.gitignore'), 'utf8');
  assert.match(gi, /^\/?data\/$/m);
  const out = tempDir(t);
  mkdirSync(join(out, 'data'));
  const c = quiet();
  return main(['--src', fakeRepo(tempDir(t)), '--out', out, '--no-build'], c).then(async code => {
    assert.equal(code, 2, 'a folder with data/ in it is not an earlier export');
    assert.ok(existsSync(join(out, 'data')));
    // Not even --force replaces a folder that holds user data (replacing deletes all but .git).
    put(out, 'data/state/dashboard-state.json', '{}');
    const f = quiet();
    assert.equal(await main(['--src', fakeRepo(tempDir(t)), '--out', out, '--no-build', '--force'], f), 2);
    assert.match(f.text(), /never replaces user data/);
    assert.ok(existsSync(join(out, 'data', 'state', 'dashboard-state.json')), 'the data is still there');
  });
});

test('dropIgnored: what git ignores leaves the plan, each path reported once', () => {
  const f = (rel) => ({ rel, full: rel, size: 1, mode: 0o644 });
  const plan = { files: ['docs/a.md', 'docs/private/x.md', 'docs/private/y/z.md', 'tools/apply_sync.py', 'src/a.js', 'src/private.js'].map(f), excluded: [] };
  dropIgnored(plan, new Set(['docs/private/', 'tools/apply_sync.py', 'src/priv']));
  assert.deepEqual(plan.files.map(x => x.rel), ['docs/a.md', 'src/a.js', 'src/private.js'], 'a prefix of a name is not a match');
  assert.deepEqual(plan.excluded.map(e => [e.rel, e.dir, e.kind]), [['docs/private', true, 'ignored'], ['tools/apply_sync.py', false, 'ignored']]);
  assert.equal(dropIgnored({ files: [f('a')], excluded: [] }, null).files.length, 1, 'not a work tree: nothing changes');
});

const hasGit = spawnSync('git', ['--version'], { windowsHide: true }).status === 0;

test('release-export: in a git work tree, files the .gitignore ignores are never exported', { skip: !hasGit && 'git is not installed' }, async (t) => {
  const repo = fakeRepo(tempDir(t));
  put(repo, '.gitignore', 'data/\nnotes-*.md\n');
  put(repo, 'docs/notes-private.md', 'PRIVATE-FIXTURE-CONTENT\n');
  assert.equal(spawnSync('git', ['init', '-q', repo], { windowsHide: true }).status, 0);
  const out = join(tempDir(t), 'opendash');
  const c = quiet();
  assert.equal(await main(['--src', repo, '--out', out, '--no-build'], c), 0, c.text());
  assert.ok(!existsSync(join(out, 'docs', 'notes-private.md')), 'an ignored file stays behind');
  assert.match(c.text(), /- docs\/notes-private\.md {2}\[ignored\] ignored by git/);
  assert.ok(existsSync(join(out, 'docs', 'USAGE.md')));
  // --no-gitignore copies it (the allowlist alone decides).
  const out2 = join(tempDir(t), 'opendash');
  assert.equal(await main(['--src', repo, '--out', out2, '--no-build', '--no-gitignore'], quiet()), 0);
  assert.ok(existsSync(join(out2, 'docs', 'notes-private.md')));
});

test('release-export: a file the source build reads but the release leaves out fails the export', async (t) => {
  const repo = fakeRepo(tempDir(t));
  // A build that inlines an optional file from a folder that is not on the allowlist.
  put(repo, 'build.mjs', [
    "import { writeFileSync, existsSync, readFileSync } from 'node:fs';",
    'const a = process.argv.slice(2);',
    "const extra = existsSync('extras/banner.txt') ? readFileSync('extras/banner.txt', 'utf8') : '';",
    "if (!a.includes('--syntax')) writeFileSync(a.includes('--out') ? a[a.indexOf('--out') + 1] : 'index.html', '<!doctype html>' + extra);",
    '',
  ].join('\n'));
  put(repo, 'extras/banner.txt', 'a banner');
  const c = quiet();
  assert.equal(await main(['--src', repo, '--out', join(tempDir(t), 'o')], c), 1, c.text());
  assert.match(c.text(), /the source build reads files the release leaves out[^]*\n {2}extras\/banner\.txt\n/);
  assert.match(c.text(), /- extras\/ {2}\[unlisted\]/, 'the left-out folder is in the list above the error');
  // Without the extra file the same build passes, and says so.
  rmSync(join(repo, 'extras'), { recursive: true, force: true });
  const ok = quiet();
  assert.equal(await main(['--src', repo, '--out', join(tempDir(t), 'o2')], ok), 0, ok.text());
  assert.match(ok.text(), /every file the build reads is in the release/);
});

test('buildInputsMissing: the real build reads only files that are in the release', () => {
  const plan = planExport(ROOT);
  const r = buildInputsMissing(ROOT, new Set(plan.files.map(f => f.rel)));
  assert.equal(r.error, undefined, r.error);
  assert.deepEqual(r.missing, [], 'build.mjs reads files the allowlist leaves out');
  // And it does notice: drop the vendored font from the set.
  const font = plan.files.find(f => /^vendor\/fonts\/.+\.woff2$/.test(f.rel));
  if (font) assert.deepEqual(buildInputsMissing(ROOT, new Set(plan.files.filter(f => f !== font).map(f => f.rel))).missing, [font.rel]);
});

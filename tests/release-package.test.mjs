// tools/release-package.mjs (the zip, SHA256SUMS.txt, release notes, the
// extract + build + test check), tools/release-offline.mjs, and the shape of
// the CI and release workflows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createZip, readZip } from '../lib/zip.mjs';
import { changelogSection, releaseBytes, buildZip, checkZip, tapSummary, main, SEMVER, launchers, downloadLine } from '../tools/release-package.mjs';
import { main as exportMain } from '../tools/release-export.mjs';
import { ROOT, fakeRepo, tempDir, CHANGELOG, PUBLISHED } from './release-fixture.mjs';

const quiet = () => { const lines = []; return { lines, log: (s) => lines.push(String(s)), error: (s) => lines.push(String(s)), text: () => lines.join('\n') }; };
async function anExport(t, opts) {
  const out = join(tempDir(t), 'opendash');
  const c = quiet();
  assert.equal(await exportMain(['--src', fakeRepo(tempDir(t), opts), '--out', out, '--no-build'], c), 0, c.text());
  return out;
}
/** Unix permission bits of each entry, from the zip's central directory. */
function zipModes(buf) {
  const modes = {};
  let p = buf.readUInt32LE(buf.length - 22 + 16);
  while (buf.readUInt32LE(p) === 0x02014b50) {
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    modes[buf.toString('utf8', p + 46, p + 46 + nlen)] = (buf.readUInt32LE(p + 38) >>> 16) & 0o777;
    p += 46 + nlen + xlen + clen;
  }
  return modes;
}

test('changelogSection: the right version, up to the next heading or link list', () => {
  const s = changelogSection(CHANGELOG, '1.2.3');
  assert.equal(s.heading, '[1.2.3] - 2026-10-03');
  assert.equal(s.body, '### Added\n\n- A thing for Alex and Sam.');
  assert.equal(changelogSection(CHANGELOG, 'v1.2.3').heading, '[1.2.3] - 2026-10-03', 'a leading v is fine');
  assert.equal(changelogSection(CHANGELOG, '1.2.3-rc.1').body, '- A release candidate.');
  assert.equal(changelogSection(CHANGELOG, '1.2.2').body, '- An older thing.', 'stops at the link references');
  assert.equal(changelogSection(CHANGELOG, '1.2'), null);
  assert.equal(changelogSection('## v2.0.0\nNew.\n## v1.0.0\nOld.', '2.0.0').body, 'New.');
  assert.equal(changelogSection('## 2.0.0 (2026-10-03)\r\nCRLF file.\r\n', '2.0.0').body, 'CRLF file.');
  assert.equal(changelogSection('## [1.2.3-rc.1]\nOnly an rc.', '1.2.3'), null, 'a release never picks up its rc notes');
});

test('versions: semantic versions only', () => {
  for (const v of ['0.0.0-test', '1.2.3', '10.0.1-rc.1', '2.0.0+build.5']) assert.ok(SEMVER.test(v), v);
  for (const v of ['1.2', 'v1.2.3', '01.2.3', '1.2.3-', 'latest']) assert.ok(!SEMVER.test(v), v);
});

test('releaseBytes: batch files get CRLF, shell scripts LF, everything else is untouched', () => {
  assert.equal(releaseBytes('start-dashboard.bat', Buffer.from('a\nb\r\nc\n')).toString(), 'a\r\nb\r\nc\r\n');
  assert.equal(releaseBytes('start-dashboard.sh', Buffer.from('a\r\nb\n')).toString(), 'a\nb\n');
  const png = Buffer.from([0x89, 0x50, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(releaseBytes('a.png', png), png);
});

test('release notes name the launchers the zip really has (they follow a rename)', () => {
  assert.deepEqual(launchers(['start-opendash.bat', 'start-opendash.sh', 'tools/start-x.sh', 'README.md']), { bat: 'start-opendash.bat', sh: 'start-opendash.sh' });
  assert.deepEqual(launchers(['README.md', 'tools/start-x.bat']), { bat: null, sh: null }, 'only top-level launchers count');
  assert.deepEqual(launchers(['start-dashboard.bat', 'start-dashboard.sh', 'start-opendash.bat', 'start-opendash.sh']), { bat: 'start-opendash.bat', sh: 'start-opendash.sh' }, 'never the old-name shims');
  const line = downloadLine('opendash-v2.0.0.zip', ['start-opendash.bat', 'start-opendash.sh']);
  assert.match(line, /`opendash-v2\.0\.0\.zip`/);
  assert.match(line, /`start-opendash\.bat` on Windows or `sh start-opendash\.sh` on macOS \/ Linux/);
  assert.ok(!line.includes('start-dashboard'));
  assert.match(downloadLine('x.zip', []), /run the launcher in the folder/);
});

test('buildZip / checkZip: one top folder, nothing excluded, a zip with a private path is refused', async (t) => {
  const exp = await anExport(t);
  const z = buildZip(exp, '1.2.3', { mtime: new Date(2026, 9, 3) });
  assert.equal(z.top, 'opendash-v1.2.3');
  const { problems, items } = checkZip(z.buffer, z.top, z.entries.map(e => e.name));
  assert.deepEqual(problems, []);
  assert.deepEqual(items.map(e => e.name.slice(z.top.length + 1)).sort(), PUBLISHED);
  assert.equal(zipModes(z.buffer)['opendash-v1.2.3/start-dashboard.sh'], 0o755);
  assert.equal(zipModes(z.buffer)['opendash-v1.2.3/README.md'], 0o644);

  const bad = createZip([
    { name: 'opendash-v1.2.3/README.md', data: 'ok' },
    { name: 'opendash-v1.2.3/data/state/dashboard-state.json', data: '{}' },
    { name: 'elsewhere/x.txt', data: 'x' },
  ]);
  const res = checkZip(bad, 'opendash-v1.2.3');
  assert.equal(res.problems.length, 2);
  assert.match(res.problems.join('\n'), /data\/state\/dashboard-state\.json: user data folder/);
  assert.match(res.problems.join('\n'), /outside opendash-v1\.2\.3\/: elsewhere\/x\.txt/);

  mkdirSync(join(exp, 'data'));
  writeFileSync(join(exp, 'data', 'config.json'), '{}');
  assert.throws(() => buildZip(exp, '1.2.3'), /paths a release must not contain[\s\S]*data\//);
});

test('release-package: zip + SHA256SUMS.txt + release notes, verified by extracting, building and testing', async (t) => {
  const exp = await anExport(t);
  const dist = tempDir(t);
  const c = quiet();
  assert.equal(await main(['--from', exp, '--version', '1.2.3', '--out', dist], c), 0, c.text());
  const zip = readFileSync(join(dist, 'opendash-v1.2.3.zip'));
  const digest = createHash('sha256').update(zip).digest('hex');
  assert.equal(readFileSync(join(dist, 'SHA256SUMS.txt'), 'utf8'), `${digest}  opendash-v1.2.3.zip\n`);
  const notes = readFileSync(join(dist, 'release-notes.md'), 'utf8');
  assert.match(notes, /^### Added\n\n- A thing for Alex and Sam\./);
  assert.match(notes, /run `start-dashboard\.bat` on Windows or `sh start-dashboard\.sh` on macOS \/ Linux/, 'the launchers the zip really has');
  assert.ok(!notes.includes('An older thing') && !notes.includes('release candidate') && !notes.includes('Nothing yet'));
  assert.ok(notes.includes(digest));
  const items = readZip(zip);
  const get = (rel) => items.find(e => e.name === `opendash-v1.2.3/${rel}`).data.toString('utf8');
  assert.equal(get('start-dashboard.bat'), '@echo off\r\nnode build.mjs\r\nnode serve.mjs\r\n');
  assert.equal(get('start-dashboard.sh'), '#!/bin/sh\nnode build.mjs\nexec node serve.mjs\n');
  assert.ok(!items.some(e => /PRIVATE-FIXTURE-CONTENT/.test(e.data.toString('latin1'))));
  for (const step of ['ok   node build.mjs --syntax', 'ok   node build.mjs', 'ok   node tools/privacy-scan.mjs --no-terms', 'ok   node --test tests/*.test.mjs (1 files)']) {
    assert.ok(c.text().includes(step), step);
  }
  assert.match(c.text(), /tests 1, pass 1, fail 0/);
  assert.match(c.text(), /Verified: the zip builds, passes its tests and the generic privacy scan\./);
});

test('release-package: SOURCE_DATE_EPOCH makes the zip byte-for-byte reproducible', async (t) => {
  const exp = await anExport(t);
  const a = tempDir(t), b = tempDir(t);
  const prev = process.env.SOURCE_DATE_EPOCH;
  process.env.SOURCE_DATE_EPOCH = String(Date.UTC(2026, 9, 3) / 1000);
  t.after(() => { if (prev === undefined) delete process.env.SOURCE_DATE_EPOCH; else process.env.SOURCE_DATE_EPOCH = prev; });
  assert.equal(await main([exp, '1.2.3', '--out', a, '--no-verify'], quiet()), 0, 'positional form');
  assert.equal(await main([exp, '1.2.3', '--out', b, '--no-verify'], quiet()), 0);
  assert.equal(readFileSync(join(a, 'SHA256SUMS.txt'), 'utf8'), readFileSync(join(b, 'SHA256SUMS.txt'), 'utf8'));
});

test('release-package: a failing test in the zip fails the release', async (t) => {
  const exp = await anExport(t);
  writeFileSync(join(exp, 'tests', 'broken.test.mjs'), "import { test } from 'node:test';\nimport assert from 'node:assert';\ntest('broken', () => assert.equal(1, 2));\n");
  const c = quiet();
  assert.equal(await main(['--from', exp, '--version', '1.2.3', '--out', tempDir(t)], c), 1);
  assert.match(c.text(), /FAIL node --test/);
  assert.match(c.text(), /Failing tests \(1\):\n {2}broken {2}\(tests\/broken\.test\.mjs:3\)/);
  assert.match(c.text(), /NOT verified/);
});

test('release-package: version and changelog rules', async (t) => {
  const exp = await anExport(t);
  const dist = tempDir(t);
  let c = quiet();
  assert.equal(await main(['--from', exp, '--version', '9.9.9', '--out', dist, '--no-verify'], c), 1, 'a release needs its changelog section');
  assert.match(c.text(), /has no section for 9\.9\.9/);
  c = quiet();
  assert.equal(await main(['--from', exp, '--version', '0.0.0-test', '--out', dist, '--no-verify'], c), 0, 'a pre-release may go without');
  assert.match(readFileSync(join(dist, 'release-notes.md'), 'utf8'), /^Pre-release build 0\.0\.0-test\./);
  assert.ok(existsSync(join(dist, 'opendash-v0.0.0-test.zip')));
  c = quiet();
  assert.equal(await main(['--from', exp, '--version', '1.2.4', '--out', dist, '--check-package-version', '--no-verify'], c), 1);
  assert.match(c.text(), /package\.json says 1\.2\.3, the tag says 1\.2\.4/);
  assert.equal(await main(['--from', exp, '--version', '1.2.3', '--out', dist, '--check-package-version', '--no-verify'], quiet()), 0);
  assert.equal(await main(['--from', exp, '--version', 'one', '--out', dist], quiet()), 2);
  assert.equal(await main(['--from', exp], quiet()), 2);
  assert.equal(await main(['--from', exp, '--version', '1.2.3', '--out', join(exp, 'dist')], quiet()), 2, '--out inside the export');
  assert.equal(await main(['--from', exp, '--version', '1.2.3', '--name', '../x', '--out', dist], quiet()), 2);
});

test('tapSummary: counts and the failing tests, with their file and line, from node --test TAP output', () => {
  const tap = [
    'TAP version 13',
    '# Subtest: outer',
    '    # Subtest: inner',
    '    not ok 1 - inner',
    '      ---',
    "      location: 'C:\\\\work\\\\opendash\\\\tests\\\\a.test.mjs:4:38'",
    "      failureType: 'testCodeFailure'",
    '      ...',
    'not ok 1 - outer',
    '  ---',
    "  location: '/home/runner/work/opendash/tests/a.test.mjs:4:1'",
    "  failureType: 'subtestsFailed'",
    '  ...',
    'ok 2 - fine',
    '# tests 5', '# pass 3', '# fail 1', '# skipped 1', '# todo 0', '# cancelled 0',
  ].join('\n');
  const s = tapSummary(tap);
  assert.deepEqual({ tests: s.tests, pass: s.pass, fail: s.fail, skipped: s.skipped }, { tests: 5, pass: 3, fail: 1, skipped: 1 });
  assert.deepEqual(s.failed, [
    { depth: 1, name: 'inner', file: 'tests/a.test.mjs:4', failureType: 'testCodeFailure' },
    { depth: 0, name: 'outer', file: 'tests/a.test.mjs:4', failureType: 'subtestsFailed' },
  ]);
});

test('release-offline: other hosts are unreachable, this machine still answers', () => {
  const shim = pathToFileURL(join(ROOT, 'tools', 'release-offline.mjs')).href;
  const script = [
    "import http from 'node:http';",
    "import dns from 'node:dns/promises';",
    "const srv = http.createServer((q, r) => r.end('local ok')).listen(0, '127.0.0.1');",
    "await new Promise(r => srv.once('listening', r));",
    'const out = [];',
    "out.push(await (await fetch(`http://127.0.0.1:${srv.address().port}/`)).text());",
    "try { await fetch('http://example.com/'); out.push('online'); } catch (e) { out.push('fetch ' + (e.cause && e.cause.code)); }",
    "try { await dns.lookup('example.com'); out.push('dns online'); } catch (e) { out.push('dns ' + e.code); }",
    'srv.close();',
    "console.log(out.join('|'));",
  ].join('\n');
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, [`--import=${shim}`, '--input-type=module', '-e', script], { encoding: 'utf8', env, timeout: 20000, windowsHide: true });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'local ok|fetch ENETUNREACH|dns ENOTFOUND');
});

// ─── The workflows and repository settings ─────────────────────────────────
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('CI workflow: push + PR; Linux, Windows, macOS x Node 20, 22, 24; build, tests, privacy scan', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /^on:\n {2}push:[\s\S]*?\n {2}pull_request:/m);
  assert.match(ci, /os: \[ubuntu-latest, windows-latest, macos-latest\]/);
  assert.match(ci, /node: \[20, 22, 24\]/);
  assert.match(ci, /fail-fast: false/);
  for (const step of ['node build.mjs --syntax', 'node build.mjs\n', 'node --test tests/*.test.mjs', 'node tools/privacy-scan.mjs --no-terms']) assert.ok(ci.includes(step), step);
  assert.match(ci, /CLAUDE_CLI_PATH: .*no-claude-cli/);
  assert.match(ci, /permissions:\n {2}contents: read/);
  const runs = [...ci.matchAll(/^\s+run: (.*)$/gm)].map(m => m[1]).join('\n');
  assert.ok(!/npm (install|ci)/.test(runs), 'zero dependencies: nothing to install');
});

test('release workflow: on v* tags; export, scan, package, then a release with the zip, sums and notes', () => {
  const rel = read('.github/workflows/release.yml');
  assert.match(rel, /tags: \['v\*'\]/);
  assert.match(rel, /contents: write/);
  const order = ['tools/release-export.mjs', 'tools/privacy-scan.mjs "$RUNNER_TEMP/opendash" --no-terms', 'tools/release-package.mjs', 'gh release create'];
  let at = -1;
  for (const s of order) { const i = rel.indexOf(s); assert.ok(i > at, `${s} comes next`); at = i; }
  for (const f of ['.zip"', 'SHA256SUMS.txt"', '--notes-file "$RUNNER_TEMP/dist/release-notes.md"', 'GH_TOKEN: ${{ github.token }}']) assert.ok(rel.includes(f), f);
  assert.match(rel, /--check-package-version/);
});

test('workflows: every action is pinned to a full commit SHA (version in a comment); checkouts keep no credentials', () => {
  for (const f of ['.github/workflows/ci.yml', '.github/workflows/release.yml']) {
    const y = read(f);
    const uses = [...y.matchAll(/uses:\s*(\S+)(.*)$/gm)].map(m => ({ ref: m[1], rest: m[2] }));
    assert.ok(uses.length >= 2, f);
    for (const u of uses) {
      assert.match(u.ref, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `${f}: ${u.ref} (a tag can be moved; a commit SHA cannot)`);
      assert.match(u.rest, /^\s+# v\d+\.\d+\.\d+\s*$/, `${f}: ${u.ref} needs its version as a comment (Dependabot keeps both)`);
    }
    const checkouts = (y.match(/actions\/checkout@/g) || []).length;
    assert.equal((y.match(/persist-credentials: false/g) || []).length, checkouts, f);
    assert.ok(!/\t/.test(y), `${f}: YAML must not contain tabs`);
  }
});

test('workflows: least privilege, and no trigger that runs fork code with secrets', () => {
  const ci = read('.github/workflows/ci.yml'), rel = read('.github/workflows/release.yml');
  for (const [f, y] of [['ci', ci], ['release', rel]]) {
    assert.ok(!/pull_request_target|workflow_run/.test(y), `${f}: no pull_request_target / workflow_run`);
    assert.match(y, /^permissions:/m, `${f}: top-level permissions`);
    assert.ok(!/permissions:\s*write-all|:\s*write-all/.test(y), `${f}: never write-all`);
    // Untrusted event text is never pasted into a shell line.
    assert.ok(!/\$\{\{\s*github\.(event|head_ref)/.test(y), `${f}: no github.event / head_ref in expressions`);
  }
  const ciPerms = /^permissions:\n((?:  .*\n)+)/m.exec(ci)[1].trim().split('\n').map(s => s.trim());
  assert.deepEqual(ciPerms, ['contents: read'], 'CI reads only');
  assert.ok(!/^ +permissions:/m.test(ci), 'no job in CI widens it');
  const relPerms = /^permissions:\n((?:  .*\n)+)/m.exec(rel)[1].trim().split('\n').map(s => s.trim().replace(/\s+#.*$/, '')).sort();
  assert.deepEqual(relPerms, ['attestations: write', 'contents: write', 'id-token: write'], 'release: exactly what publishing and provenance need');
  assert.match(rel, /tags: \['v\*'\]/, 'release runs on tags only');
});

test('.gitattributes and .editorconfig: LF everywhere, CRLF for batch files, binaries untouched', () => {
  const ga = read('.gitattributes');
  assert.match(ga, /^\* text=auto eol=lf$/m);
  assert.match(ga, /^\*\.bat text eol=crlf$/m);
  assert.match(ga, /^\*\.sh text eol=lf$/m);
  assert.match(ga, /^\*\.png binary$/m);
  const ec = read('.editorconfig');
  assert.match(ec, /^root = true$/m);
  assert.match(ec, /^end_of_line = lf$/m);
  assert.match(ec, /\[\*\.\{bat,cmd\}\]\nend_of_line = crlf/);
});

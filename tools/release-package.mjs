#!/usr/bin/env node
// tools/release-package.mjs - turn a release export into the downloadable zip.
//
//   node tools/release-package.mjs --from <export dir> --version 1.2.0
//   node tools/release-package.mjs <export dir> 1.2.0          (the same)
//   Options:
//     --out <dir>               where the files go (default: <export>/../dist)
//     --name <name>             file and folder name (default: opendash)
//     --no-verify               skip the extract + build + test check
//     --no-tests                verify, but without the test suite
//     --offline                 run the tests with no network and no Claude CLI
//                               (tools/release-offline.mjs, CLAUDE_CLI_PATH -> a missing file)
//     --keep                    keep the extracted copy (its path is printed)
//     --check-package-version   fail unless package.json has the same version (release CI)
//
// Writes, into --out:
//   opendash-v<version>.zip   the export (minus .git) under one top folder
//                             opendash-v<version>/, made with lib/zip.mjs (no
//                             dependencies). *.bat/*.cmd get CRLF and *.sh LF line
//                             endings (as .gitattributes gives a git checkout);
//                             *.sh are marked executable.
//   SHA256SUMS.txt            `sha256sum -c` format
//   release-notes.md          this version's section of CHANGELOG.md (or docs/CHANGELOG.md)
//                             + the checksum; a pre-release (X.Y.Z-pre) without one
//                             gets a placeholder, a release without one fails
//
// Checks: the export holds nothing tools/release-rules.mjs leaves out; every
// zip entry is inside the top folder and allowed; the zip is extracted into a
// fresh temp folder, which must pass node build.mjs --syntax, node build.mjs,
// node --test tests/*.test.mjs and the generic privacy scan.
// SOURCE_DATE_EPOCH (seconds) fixes the timestamps inside the zip.
// Exit codes: 0 ok, 1 a check failed, 2 usage or file error.

import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createZip, readZip } from '../lib/zip.mjs';
import { collectRelease, neverRule } from './release-rules.mjs';

// Where the changelog may live (the first one found is used).
export const CHANGELOGS = ['CHANGELOG.md', 'docs/CHANGELOG.md'];
export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const inside = (parent, child) => {
  const r = relative(resolve(parent), resolve(child));
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
};
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** The CHANGELOG section of `version`: {heading, body} or null. Headings like "## [1.2.0] - 2026-10-03" or "## v1.2.0". */
export function changelogSection(text, version) {
  const lines = String(text).split(/\r?\n/);
  const v = String(version).replace(/^v/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Not followed by '-': "1.2.0" must not pick up the "1.2.0-rc.1" section.
  const head = new RegExp(`^(#{1,3})\\s*\\[?v?${v}\\]?(?=[\\s(\\u2013\\u2014]|$)`, 'i');
  let start = -1, level = 0;
  for (let i = 0; i < lines.length; i++) { const m = head.exec(lines[i]); if (m) { start = i; level = m[1].length; break; } }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^(#{1,6})\s/.exec(lines[i]);
    if ((m && m[1].length <= level) || /^\[[^\]]+\]:\s*\S+/.test(lines[i])) { end = i; break; }
  }
  return { heading: lines[start].replace(/^#+\s*/, '').trim(), body: lines.slice(start + 1, end).join('\n').trim() };
}

/** Line endings as a git checkout with .gitattributes would give them. */
export function releaseBytes(rel, buf) {
  if (/\.(bat|cmd)$/i.test(rel)) return Buffer.from(buf.toString('utf8').replace(/\r?\n/g, '\r\n'), 'utf8');
  if (/\.sh$/i.test(rel)) return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  return buf;
}

/** The launchers at the top of the export (whatever they are named; start-opendash.* over the old-name shims): -> {bat, sh} file names or null. */
export function launchers(rels) {
  const top = rels.filter(r => !r.includes('/')).sort();
  const pick = (re) => { const all = top.filter(r => re.test(r)); return all.find(r => /^start-opendash\./i.test(r)) || all[0] || null; };
  return { bat: pick(/^start-[\w-]+\.bat$/i), sh: pick(/^start-[\w-]+\.sh$/i) };
}

/** The "Download" line of the release notes, naming the launchers the zip really has. */
export function downloadLine(zipName, rels) {
  const l = launchers(rels);
  const run = [l.bat && `\`${l.bat}\` on Windows`, l.sh && `\`sh ${l.sh}\` on macOS / Linux`].filter(Boolean).join(' or ');
  return `**Download:** \`${zipName}\` (unzip it anywhere, then run ${run || 'the launcher in the folder'}; needs Node.js 20 or newer; step by step: \`docs/INSTALL.md\` in the zip).`;
}

/** Build the zip in memory: -> {buffer, top, entries}. Throws if the export holds anything it must not. */
export function buildZip(exportDir, version, { name = 'opendash', mtime = null } = {}) {
  const { files, excluded } = collectRelease(exportDir);
  const bad = excluded.filter(e => e.rel !== '.git');
  if (bad.length) throw new Error(`the export holds paths a release must not contain:\n${bad.map(e => `  ${e.rel}${e.dir ? '/' : ''}  (${e.why})`).join('\n')}`);
  if (!files.some(f => f.rel === 'build.mjs') || !files.some(f => f.rel === 'package.json')) throw new Error(`${exportDir} is not an export of the app (no build.mjs / package.json)`);
  const top = `${name}-v${version}`;
  const when = mtime || (process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000) : new Date());
  const entries = files.map(f => ({
    name: `${top}/${f.rel}`,
    data: releaseBytes(f.rel, readFileSync(f.full)),
    mtime: when,
    mode: /\.(sh|command)$/i.test(f.rel) ? 0o755 : 0o644,
  }));
  return { buffer: createZip(entries), top, entries };
}

/** Check a zip: every entry under `top`, nothing a release must not contain. -> list of problems. */
export function checkZip(buffer, top, expected = null) {
  const problems = [];
  const items = readZip(buffer);
  for (const e of items) {
    if (!e.name.startsWith(`${top}/`)) { problems.push(`outside ${top}/: ${e.name}`); continue; }
    const rel = e.name.slice(top.length + 1);
    const r = neverRule(rel);
    if (r) problems.push(`${rel}: ${r.why}`);
  }
  if (expected) {
    const got = new Set(items.map(e => e.name));
    for (const n of expected) if (!got.has(n)) problems.push(`missing from the zip: ${n}`);
    if (items.length !== expected.length) problems.push(`the zip has ${items.length} entries, expected ${expected.length}`);
  }
  return { problems, items };
}

/** Extract zip items into dir (names already checked by readZip's safeEntryName). */
export function extract(items, dir) {
  for (const e of items) {
    const to = join(dir, ...e.name.split('/'));
    if (!inside(dir, to)) throw new Error(`unsafe zip entry: ${e.name}`);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, e.data);
  }
}

/**
 * Summary of node --test TAP output. failed: [{depth, name, file ('tests/x.test.mjs:12'
 * or null), failureType}]; failureType 'subtestsFailed' marks a parent that only
 * failed because a subtest did.
 */
export function tapSummary(out) {
  const text = String(out);
  const num = (k) => { const m = new RegExp(`^# ${k} (\\d+)`, 'm').exec(text); return m ? Number(m[1]) : null; };
  const lines = text.split(/\r?\n/);
  const failed = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)not ok \d+ - (.*)$/.exec(lines[i]);
    if (!m) continue;
    const f = { depth: m[1].length / 4, name: m[2].trim(), file: null, failureType: null };
    for (let j = i + 1; j < lines.length && j < i + 60; j++) {
      const l = lines[j];
      if (/^\s*\.\.\.$/.test(l) || /^\s*(not )?ok \d+ - /.test(l)) break;
      const loc = /^\s*location: '(.*)'$/.exec(l);
      if (loc) {
        const p = loc[1].replace(/\\\\/g, '/').replace(/\\/g, '/');
        const k = p.lastIndexOf('/tests/');
        f.file = (k >= 0 ? p.slice(k + 1) : p.split('/').pop()).replace(/:(\d+):\d+$/, ':$1');
      }
      const ft = /^\s*failureType: '(.*)'$/.exec(l);
      if (ft) f.failureType = ft[1];
    }
    failed.push(f);
  }
  return { tests: num('tests'), pass: num('pass'), fail: num('fail'), skipped: num('skipped'), todo: num('todo'), cancelled: num('cancelled'), failed };
}

/** Run the checks inside an extracted copy. -> {ok, steps:[{step, ok, detail}], tests} */
export function verifyTree(root, { tests = true, offline = false, log = console.log } = {}) {
  const steps = [];
  // A node --test parent marks its children with NODE_TEST_CONTEXT; a nested
  // `node --test` that inherits it reports to that parent instead of printing TAP.
  const plain = { ...process.env };
  delete plain.NODE_TEST_CONTEXT;
  const env = { ...plain };
  if (offline) {
    env.CLAUDE_CLI_PATH = join(root, 'no-such-dir', process.platform === 'win32' ? 'claude.exe' : 'claude');
    const pre = `--import=${pathToFileURL(join(root, 'tools', 'release-offline.mjs')).href}`;
    env.NODE_OPTIONS = [env.NODE_OPTIONS, pre].filter(Boolean).join(' ');
  }
  const run = (label, args, opts = {}) => {
    const r = spawnSync(process.execPath, args, { cwd: root, env: opts.env || env, encoding: 'utf8', maxBuffer: 1 << 28, windowsHide: true });
    const ok = r.status === 0;
    steps.push({ step: label, ok, status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` });
    log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`);
    return r;
  };
  run('node build.mjs --syntax', ['build.mjs', '--syntax'], { env: plain });
  run('node build.mjs', ['build.mjs'], { env: plain });
  run('node tools/privacy-scan.mjs --no-terms (generic rules)', ['tools/privacy-scan.mjs', '--no-terms', '--summary', '.'], { env: plain });
  let summary = null;
  if (tests) {
    const files = readdirSync(join(root, 'tests')).filter(f => f.endsWith('.test.mjs')).sort().map(f => `tests/${f}`);
    const r = run(`node --test tests/*.test.mjs (${files.length} files${offline ? ', offline, no Claude CLI' : ''})`, ['--test', '--test-reporter=tap', ...files]);
    summary = tapSummary(`${r.stdout || ''}`);
    log(`       tests ${summary.tests}, pass ${summary.pass}, fail ${summary.fail}, skipped ${summary.skipped}`);
  }
  return { ok: steps.every(s => s.ok), steps, tests: summary };
}

export async function main(argv = process.argv.slice(2), { log = console.log, error = console.error } = {}) {
  const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const has = (n) => argv.includes(n);
  if (has('--help') || has('-h')) {
    log('usage: node tools/release-package.mjs --from <export dir> --version X.Y.Z [--out <dir>] [--name opendash] [--no-verify] [--no-tests] [--offline] [--keep] [--check-package-version]');
    return 0;
  }
  const withValue = new Set(['--from', '--version', '--out', '--name']);
  const pos = argv.filter((a, i) => !a.startsWith('--') && !withValue.has(argv[i - 1]));
  const from = val('--from') || pos[0];
  const version = String(val('--version') || pos[1] || '').replace(/^v/, '');
  const name = val('--name') || 'opendash';
  if (!from || !version) { error('release-package: give --from <export dir> and --version X.Y.Z'); return 2; }
  if (!SEMVER.test(version)) { error(`release-package: "${version}" is not a semantic version (X.Y.Z or X.Y.Z-pre)`); return 2; }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) { error('release-package: --name may hold letters, digits, . _ - only'); return 2; }
  const exportDir = resolve(from);
  if (!existsSync(exportDir)) { error(`release-package: no such folder: ${exportDir}`); return 2; }
  const out = resolve(val('--out') || join(dirname(exportDir), 'dist'));
  if (inside(exportDir, out)) { error('release-package: --out must be outside the export'); return 2; }

  let pkg;
  try { pkg = JSON.parse(readFileSync(join(exportDir, 'package.json'), 'utf8')); } catch (e) { error(`release-package: cannot read package.json: ${e.message}`); return 2; }
  if (has('--check-package-version') && pkg.version !== version) {
    error(`release-package: package.json says ${pkg.version}, the tag says ${version}: bump package.json (and CHANGELOG.md) first`);
    return 1;
  }

  // Release notes from CHANGELOG.md.
  const prerelease = version.includes('-');
  const clPath = CHANGELOGS.map(p => join(exportDir, p)).find(p => existsSync(p));
  const section = clPath ? changelogSection(readFileSync(clPath, 'utf8'), version) : null;
  if (!section && !prerelease) { error(`release-package: ${clPath ? relative(exportDir, clPath) : 'CHANGELOG.md'} has no section for ${version} (a heading like "## [${version}] - YYYY-MM-DD")`); return 1; }
  if (!section) log(`  note: no changelog section for ${version}; pre-release, so a placeholder note is used`);

  // The zip.
  let z;
  try { z = buildZip(exportDir, version, { name }); } catch (e) { error(`release-package: ${e.message}`); return 1; }
  const zipName = `${z.top}.zip`;
  const digest = sha256(z.buffer);
  const check = checkZip(z.buffer, z.top, z.entries.map(e => e.name));
  if (check.problems.length) { error(`release-package: the zip failed its check:\n  ${check.problems.join('\n  ')}`); return 1; }

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, zipName), z.buffer);
  writeFileSync(join(out, 'SHA256SUMS.txt'), `${digest}  ${zipName}\n`);
  const notes = [
    section ? section.body : `Pre-release build ${version}. There is no CHANGELOG entry for it yet.`,
    '',
    '---',
    '',
    downloadLine(zipName, z.entries.map(e => e.name.slice(z.top.length + 1))),
    '',
    `**SHA-256:** \`${digest}\``,
    '',
    'Check the download: `sha256sum -c SHA256SUMS.txt` (Linux), `shasum -a 256 -c SHA256SUMS.txt` (macOS),',
    `or \`Get-FileHash ${zipName} -Algorithm SHA256\` in PowerShell (Windows).`,
    '',
  ].join('\n');
  writeFileSync(join(out, 'release-notes.md'), notes);
  log(`Wrote ${join(out, zipName)} (${z.entries.length} files, ${(z.buffer.length / 1048576).toFixed(2)} MB)`);
  log(`      ${join(out, 'SHA256SUMS.txt')}  ${digest}`);
  log(`      ${join(out, 'release-notes.md')}  (${section ? `CHANGELOG: ${section.heading}` : 'placeholder'})`);

  if (has('--no-verify')) return 0;
  // Extract into a fresh folder and prove it builds and passes its tests.
  const work = mkdtempSync(join(tmpdir(), 'release-verify-'));
  let res;
  try {
    extract(check.items, work);
    const root = join(work, z.top);
    log(`Verifying the extracted zip in ${root}`);
    res = verifyTree(root, { tests: !has('--no-tests'), offline: has('--offline'), log });
    const listed = res.tests && res.tests.failed.length;
    for (const s of res.steps.filter(x => !x.ok && !(listed && x.step.startsWith('node --test')))) {
      const tail = s.out.split(/\r?\n/).filter(l => /Error|error|FAIL|✖/.test(l)).slice(0, 40).join('\n');
      error(`--- ${s.step} (exit ${s.status})\n${tail || s.out.slice(-3000)}`);
    }
    if (res.tests && res.tests.failed.length) {
      const leaves = res.tests.failed.filter(x => x.failureType !== 'subtestsFailed');
      error(`Failing tests (${leaves.length}):`);
      for (const f of leaves.slice(0, 80)) error(`  ${f.name}${f.file ? `  (${f.file})` : ''}`);
    }
  } finally {
    if (has('--keep')) log(`Kept ${work}`);
    else rmSync(work, { recursive: true, force: true });
  }
  log(res.ok ? 'Verified: the zip builds, passes its tests and the generic privacy scan.' : 'NOT verified: see above.');
  return res.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; });
}

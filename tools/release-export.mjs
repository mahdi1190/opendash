#!/usr/bin/env node
// tools/release-export.mjs - make the clean, publishable tree of the app.
//
//   node tools/release-export.mjs                    export to ../opendash-release/opendash (next to the repo)
//   node tools/release-export.mjs --out <dir>        export somewhere else
//   node tools/release-export.mjs --dry-run          print what would be copied and left out, write nothing
//   node tools/release-export.mjs --list             also print every file that is copied
//   node tools/release-export.mjs --src <repo>       export another checkout (default: this one)
//   node tools/release-export.mjs --no-build         skip the build check
//   node tools/release-export.mjs --no-gitignore     also copy allowlisted files that git ignores
//   node tools/release-export.mjs --force            replace a non-empty --out that does not look like an export
//
// The file set is the ALLOWLIST in tools/release-rules.mjs: the app's source
// folders and the documents that go with it. User data, secrets, logs,
// backups, the built index.html, local tool config and personal scripts are
// always left out, and everything left out is printed with the reason. When
// the source is a git work tree, whatever its .gitignore ignores is left out
// too (it could never be committed, so it is never released).
//
// After copying it proves the export builds: `node build.mjs --syntax`, then
// `node build.mjs --out <temp file>` inside the export (the export itself gets
// no index.html). The source's own build is traced (tools/release-trace.mjs):
// a file it reads that the allowlist leaves out fails the export, since
// build.mjs skips missing optional parts silently. A previous export in --out
// is replaced (never a folder holding data/, state/ or secrets/); a .git
// folder in it is kept, so a re-export shows up as a normal diff there.
//
// Next steps: node tools/privacy-scan.mjs <out>, then
//             node tools/release-package.mjs --from <out> --version X.Y.Z
// Exit codes: 0 ok, 1 the build check failed, 2 usage or file error.

import { existsSync, mkdirSync, readdirSync, readFileSync, copyFileSync, chmodSync, rmSync, mkdtempSync, statSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectRelease } from './release-rules.mjs';
import { gitIgnored } from './privacy-scan.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_OUT = (src) => join(dirname(resolve(src)), 'opendash-release', 'opendash');

const inside = (parent, child) => {
  const r = relative(resolve(parent), resolve(child));
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
};
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Does `dir` look like an earlier export (safe to replace)? */
function looksLikeExport(dir) {
  const names = readdirSync(dir).filter(n => n !== '.git');
  if (!names.length) return true;
  return names.includes('build.mjs') && names.includes('package.json') && !names.includes('data') && !names.includes('state');
}

/**
 * Drop the plan's files that git ignores in `src` (when it is a work tree).
 * `ignored` is the set from `git ls-files --others --ignored --directory`
 * ('dir/' for a whole folder). -> the plan, with each ignored path listed once.
 */
export function dropIgnored(plan, ignored) {
  if (!ignored || !ignored.size) return plan;
  const hit = (rel) => {
    const parts = rel.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const p = parts.slice(0, i).join('/');
      if (i < parts.length && ignored.has(`${p}/`)) return `${p}/`;
      if (i === parts.length && ignored.has(p)) return p;
    }
    return null;
  };
  const files = [], seen = new Set();
  for (const f of plan.files) {
    const h = hit(f.rel);
    if (!h) { files.push(f); continue; }
    if (seen.has(h)) continue;
    seen.add(h);
    plan.excluded.push({ rel: h.replace(/\/$/, ''), dir: h.endsWith('/'), why: 'ignored by git (.gitignore): it could never be committed, so it is never released', kind: 'ignored' });
  }
  plan.files = files;
  return plan;
}

/** The plan: which files would be copied and what is left out. No writes. */
export function planExport(src = REPO, { useGitignore = true } = {}) {
  src = resolve(src);
  if (!existsSync(join(src, 'build.mjs')) || !existsSync(join(src, 'package.json'))) throw new Error(`${src} is not the app (no build.mjs / package.json)`);
  const plan = { src, ...collectRelease(src) };
  return useGitignore ? dropIgnored(plan, gitIgnored(src)) : plan;
}

/**
 * The source files a build of `root` reads, lists or checks for that are not
 * in `files` (a Set of release paths): the build is traced with
 * tools/release-trace.mjs. -> {missing:[rel], error?}
 */
export function buildInputsMissing(root, files) {
  const tmp = mkdtempSync(join(tmpdir(), 'release-trace-'));
  try {
    const trace = join(tmp, 'trace.json');
    const r = spawnSync(process.execPath, [`--import=${pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'release-trace.mjs')).href}`, 'build.mjs', '--out', join(tmp, 'index.html')],
      { cwd: root, encoding: 'utf8', env: { ...process.env, RELEASE_TRACE_OUT: trace }, windowsHide: true });
    if (r.status !== 0 || !existsSync(trace)) return { missing: [], error: `the source does not build (${`${r.stderr || r.stdout || ''}`.trim().split(/\r?\n/)[0] || `exit ${r.status}`})` };
    // The build resolves relative paths against its cwd, which the OS reports
    // with symlinks resolved (macOS: /var/folders -> /private/var/folders), so
    // a traced path may sit under the real path of root rather than root itself.
    const roots = [...new Set([resolve(root), realpathSync(root)])];
    const inRoot = (abs) => {
      for (const base of roots) {
        const rel = relative(base, abs);
        if (rel && !rel.startsWith('..') && !isAbsolute(rel)) return rel.split('\\').join('/');
      }
      return null;
    };
    const missing = new Set();
    for (const abs of JSON.parse(readFileSync(trace, 'utf8'))) {
      const rel = inRoot(abs);
      if (!rel || files.has(rel)) continue;
      let st;
      try { st = statSync(abs); } catch { continue; }   // checked for but absent in the source too
      if (st.isFile()) missing.add(rel);
    }
    return { missing: [...missing].sort() };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/**
 * Run the build check inside `dir`: syntax, then a full build into a temp
 * file. With source ({root, files}: the source tree and the release paths),
 * the source's own build is traced too: build.mjs silently skips optional
 * parts that are missing (the font, the icon sprite, vendored libraries), so
 * every file it reads in the source must be in the release.
 */
export function buildCheck(dir, { log = console.log, source = null } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'release-build-'));
  try {
    const steps = [['--syntax'], ['--out', join(tmp, 'index.html')]];
    for (const args of steps) {
      const r = spawnSync(process.execPath, ['build.mjs', ...args], { cwd: dir, encoding: 'utf8' });
      if (r.status !== 0) return { ok: false, step: `node build.mjs ${args[0]}`, output: `${r.stdout || ''}${r.stderr || ''}`.trim() };
    }
    const size = statSync(join(tmp, 'index.html')).size;
    let inputs = '';
    if (source) {
      const t = buildInputsMissing(source.root, source.files);
      if (t.error) inputs = `; inputs not checked: ${t.error}`;
      else if (t.missing.length) {
        return { ok: false, step: 'build inputs', output: `the source build reads files the release leaves out, so the export builds a different page:\n  ${t.missing.join('\n  ')}\nAdd them to the allowlist in tools/release-rules.mjs (or, if they were created during the export, run it again).` };
      } else inputs = '; every file the build reads is in the release';
    }
    log(`  build check: node build.mjs --syntax ok, node build.mjs ok (${kb(size)}, written to a temp file${inputs})`);
    return { ok: true, size };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/** Copy the plan into `out`. Keeps out/.git; refuses to replace a folder that is not an export unless force. */
export function writeExport(plan, out, { force = false } = {}) {
  out = resolve(out);
  if (inside(plan.src, out) || inside(out, plan.src)) throw new Error(`--out must be outside the source tree (${out})`);
  if (existsSync(out)) {
    if (!statSync(out).isDirectory()) throw new Error(`${out} is a file`);
    // Replacing the folder deletes everything but .git: never a data folder, not even with --force.
    const precious = ['data', 'state', 'secrets'].filter(n => existsSync(join(out, n)));
    if (precious.length) throw new Error(`${out} holds ${precious.map(n => `${n}/`).join(', ')}: an export never replaces user data (move it out first, or export somewhere else)`);
    if (!looksLikeExport(out) && !force) throw new Error(`${out} is not empty and does not look like an earlier export (add --force to replace it)`);
    for (const n of readdirSync(out)) if (n !== '.git') rmSync(join(out, n), { recursive: true, force: true });
  }
  mkdirSync(out, { recursive: true });
  for (const f of plan.files) {
    const to = join(out, f.rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(f.full, to);
    if (/\.(sh|command)$/i.test(f.rel)) { try { chmodSync(to, 0o755); } catch { /* Windows */ } }
  }
  return out;
}

function printPlan(plan, { list, log }) {
  const bytes = plan.files.reduce((s, f) => s + f.size, 0);
  log(`Source: ${plan.src}`);
  log(`Included: ${plan.files.length} files, ${kb(bytes)}`);
  const top = new Map();
  for (const f of plan.files) { const k = f.rel.includes('/') ? f.rel.split('/')[0] + '/' : f.rel; top.set(k, (top.get(k) || 0) + 1); }
  log('  ' + [...top].map(([k, n]) => (k.endsWith('/') ? `${k} (${n})` : k)).join(', '));
  if (list) for (const f of plan.files) log(`    ${f.rel}  ${kb(f.size)}`);
  log(`Excluded: ${plan.excluded.length}`);
  for (const e of plan.excluded) log(`  - ${e.rel}${e.dir ? '/' : ''}  [${e.kind}] ${e.why}`);
}

export async function main(argv = process.argv.slice(2), { log = console.log, error = console.error } = {}) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--help') || argv.includes('-h')) {
    log('usage: node tools/release-export.mjs [--out <dir>] [--src <repo>] [--dry-run] [--list] [--no-build] [--no-gitignore] [--force]');
    return 0;
  }
  let plan;
  try { plan = planExport(arg('--src') || REPO, { useGitignore: !argv.includes('--no-gitignore') }); } catch (e) { error(`release-export: ${e.message}`); return 2; }
  const out = resolve(arg('--out') || DEFAULT_OUT(plan.src));
  printPlan(plan, { list: argv.includes('--list'), log });
  if (argv.includes('--dry-run')) { log(`Dry run: nothing written (would write ${out}).`); return 0; }
  try { writeExport(plan, out, { force: argv.includes('--force') }); } catch (e) { error(`release-export: ${e.message}`); return 2; }
  log(`Wrote ${out}`);
  if (!argv.includes('--no-build')) {
    const b = buildCheck(out, { log, source: { root: plan.src, files: new Set(plan.files.map(f => f.rel)) } });
    if (!b.ok) { error(`release-export: the export does not build (${b.step}):\n${b.output}`); return 1; }
  }
  log(`Next: node tools/privacy-scan.mjs "${out}"`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; });
}

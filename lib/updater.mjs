// lib/updater.mjs - check for a newer OpenDash release and install it.
//
//   checkLatest({fetchImpl, feed})            -> the newest release (never a draft or pre-release)
//   installKind(repoRoot)                     -> 'git' | 'zip'
//   applyZipUpdate({repoRoot, dataDir, release, current, fetchImpl})
//                                             -> {from, to, written, removed, backup}
//   applyGitUpdate({repoRoot, release, run})  -> {from, to, mode:'git'}
//   readUpdateState / writeUpdateState        <data>/update-check.json (last check + the auto switch)
//
// The only network traffic is GET requests to the project's GitHub releases
// (api.github.com for the list, the release's own download URLs for the zip
// and SHA256SUMS.txt). The feed and the allowed download prefix are fixed in
// code; DASHBOARD_UPDATE_FEED swaps in a mirror (and the tests' local feed).
// A downloaded zip is installed only when its SHA-256 matches the release's
// SHA256SUMS.txt, every path is inside the one top folder, it carries a
// package.json of the expected version, and it has the files a build needs.
// Never touched: data/, state/, secrets/, logs, .env, .git, index.html.
// Everything replaced is copied to <data>/update-backup/<from version>/ first,
// and a failed write puts the old files back.

import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, rm, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { atomicWrite, readJson, writeJson } from './fsutil.mjs';
import { readZip } from './zip.mjs';

export const REPO = 'mahdi1190/opendash';
export const DEFAULT_FEED = `https://api.github.com/repos/${REPO}/releases/latest`;
export const DOWNLOAD_PREFIX = `https://github.com/${REPO}/releases/download/`;
export const ZIP_MAX = 200 * 1024 * 1024;
export const SUMS_MAX = 64 * 1024;
export const NOTES_MAX = 6000;

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseVersion(v) {
  const m = SEMVER.exec(String(v || '').trim().replace(/^v/, ''));
  return m ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || '' } : null;
}
/** -1 | 0 | 1; null when either is not a version. A pre-release sorts before its release. */
export function compareVersions(a, b) {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) return null;
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  const xs = x.pre.split('.'), ys = y.pre.split('.');
  for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
    if (xs[i] === undefined) return -1;
    if (ys[i] === undefined) return 1;
    const xn = /^\d+$/.test(xs[i]), yn = /^\d+$/.test(ys[i]);
    if (xn && yn) { if (+xs[i] !== +ys[i]) return +xs[i] < +ys[i] ? -1 : 1; }
    else if (xn !== yn) return xn ? -1 : 1;
    else if (xs[i] !== ys[i]) return xs[i] < ys[i] ? -1 : 1;
  }
  return 0;
}

function feedUrl(env = process.env) { return String(env.DASHBOARD_UPDATE_FEED || DEFAULT_FEED); }
/** Where a release's files may be downloaded from: GitHub's, or the feed's own origin when a mirror is set. */
export function allowedDownload(url, env = process.env) {
  const u = String(url || '');
  if (u.startsWith(DOWNLOAD_PREFIX)) return true;
  if (env.DASHBOARD_UPDATE_FEED) {
    try { return new URL(u).origin === new URL(env.DASHBOARD_UPDATE_FEED).origin; } catch { return false; }
  }
  return false;
}

/** The GitHub release JSON -> {version, tag, name, notes, publishedAt, url, zip:{name,url,size}, sums:{name,url}} or null. */
export function normaliseRelease(j, env = process.env) {
  if (!j || typeof j !== 'object' || j.draft || j.prerelease) return null;
  const tag = String(j.tag_name || '');
  const version = tag.replace(/^v/, '');
  if (!parseVersion(version)) return null;
  const assets = Array.isArray(j.assets) ? j.assets : [];
  const pick = (name) => {
    const a = assets.find(x => x && x.name === name);
    return a && allowedDownload(a.browser_download_url, env) ? { name, url: String(a.browser_download_url), size: Number(a.size) || 0 } : null;
  };
  const page = typeof j.html_url === 'string' && j.html_url.startsWith(`https://github.com/${REPO}/`) ? j.html_url : `https://github.com/${REPO}/releases`;
  return {
    version, tag: `v${version}`, name: String(j.name || `OpenDash v${version}`).slice(0, 120),
    notes: String(j.body || '').slice(0, NOTES_MAX), publishedAt: typeof j.published_at === 'string' ? j.published_at : null,
    url: page, zip: pick(`opendash-v${version}.zip`), sums: pick('SHA256SUMS.txt'),
  };
}

/** Ask the feed for the newest release. Throws an Error with a plain message on any failure. */
export async function checkLatest({ fetchImpl = globalThis.fetch, env = process.env, timeoutMs = 10000 } = {}) {
  let r;
  try {
    r = await fetchImpl(feedUrl(env), { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'OpenDash-update-check' }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw new Error(e && e.name === 'TimeoutError' ? 'GitHub did not answer in time' : 'Could not reach GitHub (are you offline?)');
  }
  if (r.status === 404) throw new Error('No release has been published yet');
  if (r.status === 403 || r.status === 429) throw new Error('GitHub is limiting requests from this connection; try again later');
  if (!r.ok) throw new Error(`GitHub answered with HTTP ${r.status}`);
  const rel = normaliseRelease(await r.json().catch(() => null), env);
  if (!rel) throw new Error('GitHub sent a release this version does not understand');
  return rel;
}

export function installKind(repoRoot) { return existsSync(join(repoRoot, '.git')) ? 'git' : 'zip'; }

// ─── stored state ───────────────────────────────────────────────────────
export const stateFile = (dataDir) => join(dataDir, 'update-check.json');
export async function readUpdateState(dataDir) {
  const s = await readJson(stateFile(dataDir), { fallback: {} }).catch(() => ({}));
  return {
    auto: s && s.auto === true,
    checkedAt: s && typeof s.checkedAt === 'string' ? s.checkedAt : null,
    latest: s && s.latest && parseVersion(s.latest.version) ? s.latest : null,
    error: s && typeof s.error === 'string' ? s.error : null,
  };
}
export async function writeUpdateState(dataDir, patch) {
  const cur = await readUpdateState(dataDir);
  const next = { ...cur, ...patch };
  await writeJson(stateFile(dataDir), next);
  return next;
}

/** What the page shows: the stored check measured against the running version. */
export function describeState({ state, current, repoRoot, canRestart = true }) {
  const kind = installKind(repoRoot);
  const latest = state.latest;
  const cmp = latest ? compareVersions(latest.version, current) : null;
  let reason = null;
  if (!canRestart) reason = 'Start OpenDash with start-opendash (or node serve.mjs) so it can restart itself after an update.';
  else if (kind === 'zip' && latest && !(latest.zip && latest.sums)) reason = 'This release has no zip and checksum file to install from.';
  return {
    current, kind, auto: state.auto, checkedAt: state.checkedAt, error: state.error,
    latest: latest ? { version: latest.version, name: latest.name, notes: latest.notes, publishedAt: latest.publishedAt, url: latest.url } : null,
    available: cmp === 1, upToDate: cmp !== null && cmp <= 0,
    canApply: !reason, reason,
  };
}

// ─── applying: a release zip ────────────────────────────────────────────
const NEVER_TOUCH = ['data/', 'state/', 'secrets/', 'logs/', '.git/', '.env', 'index.html', 'node_modules/'];
const NEEDED = ['package.json', 'build.mjs', 'serve.mjs', 'server/index.mjs', 'src/body.html'];
// Folders whose files are loaded by name order or by listing: a file the new
// release dropped would still be picked up, so it is removed (after backup).
const PRUNE_DIRS = ['src/app/', 'src/styles/', 'src/finance/', 'server/routes/', 'server/actions/'];
const skipPath = (p) => NEVER_TOUCH.some(n => (n.endsWith('/') ? p.startsWith(n) : p === n));

async function download(url, max, { fetchImpl, env, what }) {
  if (!allowedDownload(url, env)) throw new Error(`refusing to download ${what} from an unexpected address`);
  let r;
  try { r = await fetchImpl(url, { headers: { 'User-Agent': 'OpenDash-update' }, signal: AbortSignal.timeout(180000) }); }
  catch { throw new Error(`could not download ${what} (offline?)`); }
  if (!r.ok) throw new Error(`downloading ${what} failed (HTTP ${r.status})`);
  const len = Number(r.headers.get('content-length')) || 0;
  if (len > max) throw new Error(`${what} is larger than expected`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > max) throw new Error(`${what} is larger than expected`);
  return buf;
}

/** The SHA-256 SHA256SUMS.txt lists for `name` ("<hex>  <name>" or "<hex> *<name>"), else null. */
export function sumFor(text, name) {
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/.exec(line);
    if (m && m[2] === name) return m[1].toLowerCase();
  }
  return null;
}

/** Validate a release zip and turn it into [{path, data}] relative to the app folder. Throws a plain Error. */
export function unpackRelease(zipBuf, version) {
  const entries = readZip(zipBuf, { maxTotal: 600 * 1024 * 1024, maxEntries: 20000 });
  const top = `opendash-v${version}/`;
  const files = [];
  for (const e of entries) {
    if (!e.name.startsWith(top)) throw new Error('the zip has files outside its own folder');
    const path = e.name.slice(top.length);
    if (!path || skipPath(path)) continue;
    files.push({ path, data: e.data });
  }
  for (const n of NEEDED) if (!files.some(f => f.path === n)) throw new Error(`the zip is missing ${n}`);
  let pkg;
  try { pkg = JSON.parse(files.find(f => f.path === 'package.json').data.toString('utf8')); } catch { throw new Error('the zip has an unreadable package.json'); }
  if (pkg.version !== version) throw new Error(`the zip is version ${pkg.version}, not ${version}`);
  return files;
}

function listFiles(root, rel) {
  const out = [];
  const walk = (d) => {
    let names; try { names = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const n of names) {
      const p = join(d, n.name);
      if (n.isDirectory()) walk(p); else if (n.isFile()) out.push(relative(root, p).replace(/\\/g, '/'));
    }
  };
  walk(join(root, rel));
  return out;
}

/** Install `files` over the app folder with a backup and a rollback. Returns {written, removed, backup}. */
export async function installFiles({ repoRoot, dataDir, files, from }) {
  const keep = new Set(files.map(f => f.path));
  const stale = PRUNE_DIRS.flatMap(d => listFiles(repoRoot, d)).filter(p => !keep.has(p));
  const backup = join(dataDir, 'update-backup', String(from || 'previous').replace(/[^0-9A-Za-z.-]/g, '_'));
  await rm(backup, { recursive: true, force: true });
  const changed = [];                       // files whose old content is in the backup (or did not exist)
  const touched = [];
  try {
    for (const f of files) {
      const dest = join(repoRoot, f.path);
      let same = false;
      if (existsSync(dest)) {
        const old = await readFile(dest);
        same = old.equals(f.data);
        if (!same) { await mkdir(dirname(join(backup, f.path)), { recursive: true }); await copyFile(dest, join(backup, f.path)); }
      }
      if (same) continue;
      touched.push({ path: f.path, existed: existsSync(dest) });
      await mkdir(dirname(dest), { recursive: true });
      await atomicWrite(dest, f.data);
      changed.push(f.path);
    }
    for (const p of stale) {
      const dest = join(repoRoot, p);
      await mkdir(dirname(join(backup, p)), { recursive: true });
      await copyFile(dest, join(backup, p));
      touched.push({ path: p, removed: true });
      await rm(dest, { force: true });
    }
  } catch (e) {
    for (const t of touched.reverse()) {
      const dest = join(repoRoot, t.path);
      try {
        if (t.existed || t.removed) await atomicWrite(dest, await readFile(join(backup, t.path)));
        else await rm(dest, { force: true });
      } catch { /* best effort: the backup folder still has the old files */ }
    }
    throw new Error(`could not write the new files (${e && e.message || e}); the old ones were put back`);
  }
  return { written: changed.length, removed: stale.length, backup };
}

export async function applyZipUpdate({ repoRoot, dataDir, release, current, fetchImpl = globalThis.fetch, env = process.env }) {
  if (!release || !release.zip || !release.sums) throw new Error('this release has no zip and checksum file to install from');
  const opts = { fetchImpl, env };
  const sums = (await download(release.sums.url, SUMS_MAX, { ...opts, what: 'SHA256SUMS.txt' })).toString('utf8');
  const want = sumFor(sums, release.zip.name);
  if (!want) throw new Error(`SHA256SUMS.txt has no entry for ${release.zip.name}`);
  const zip = await download(release.zip.url, ZIP_MAX, { ...opts, what: release.zip.name });
  const got = createHash('sha256').update(zip).digest('hex');
  if (got !== want) throw new Error('the download does not match its checksum, so nothing was installed');
  const files = unpackRelease(zip, release.version);
  const r = await installFiles({ repoRoot, dataDir, files, from: current });
  return { from: current, to: release.version, mode: 'zip', ...r };
}

// ─── applying: a git checkout ───────────────────────────────────────────
export function runGit(args, cwd, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, out: String(stdout || '').trim(), err: String(stderr || (err && err.message) || '').trim(), missing: !!(err && err.code === 'ENOENT') });
    });
  });
}

/** Fast-forward a git checkout to the release's tag. Refuses when tracked files are changed or the history has diverged. */
export async function applyGitUpdate({ repoRoot, release, current, run = runGit }) {
  if (!/^v\d+\.\d+\.\d+$/.test(release.tag)) throw new Error('the release tag is not a plain version');
  const st = await run(['status', '--porcelain', '--untracked-files=no'], repoRoot);
  if (st.missing) throw new Error('git is not installed, so this copy cannot be updated from here');
  if (!st.ok) throw new Error(`git could not read this folder: ${st.err.slice(0, 200)}`);
  if (st.out) throw new Error('this copy has uncommitted changes to tracked files; commit or stash them first');
  const f = await run(['fetch', 'origin', `refs/tags/${release.tag}:refs/tags/${release.tag}`], repoRoot);
  if (!f.ok) throw new Error(`git fetch failed: ${f.err.slice(0, 200)}`);
  const m = await run(['merge', '--ff-only', release.tag], repoRoot);
  if (!m.ok) throw new Error('this copy has its own commits, so it cannot simply move to the release (merge it yourself with git)');
  return { from: current, to: release.version, mode: 'git' };
}

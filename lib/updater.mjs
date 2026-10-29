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
// code. DASHBOARD_UPDATE_FEED may only point at the GitHub API or at this
// computer (a local test feed): never another website, and lib/env-files.mjs
// never takes it from the (possibly synced) data folder's .env. Downloads come
// only from GitHub's release URLs (or that local test feed).
// update-check.json lives in the data folder, which another computer or a
// cloud account can write, so applying asks GitHub again and installs only the
// release GitHub names now (a planted file cannot pick an older release).
// A downloaded zip is installed only when its SHA-256 matches the release's
// SHA256SUMS.txt, that file's Ed25519 signature (SHA256SUMS.txt.sig, made in
// the Release workflow with the RELEASE_SIGNING_KEY secret) verifies against
// the public key pinned below (2.19.8; a release without one is refused once
// this version is at least FIRST_SIGNED_VERSION), every path is inside the one top folder, it carries a
// package.json of the expected version, and it has the files a build needs.
// Never touched: data/, state/, secrets/, logs, .env, .git, index.html.
// Everything replaced is copied to <data>/update-backup/<from version>/ first,
// and a failed write puts the old files back.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readFile, rm, copyFile } from 'node:fs/promises';
import { createHash, createPublicKey, verify as verifySig } from 'node:crypto';
import { execFile } from 'node:child_process';
import { installSpawnGuard } from './spawn-guard.mjs';
installSpawnGuard();   // in a test process, never start a real AI agent CLI (lib/spawn-guard.mjs)
import { dirname, join, relative, resolve } from 'node:path';
import { atomicWrite, readJson, writeJson } from './fsutil.mjs';
import { readZip } from './zip.mjs';

export const REPO = 'mahdi1190/opendash';
export const DEFAULT_FEED = `https://api.github.com/repos/${REPO}/releases/latest`;
export const DOWNLOAD_PREFIX = `https://github.com/${REPO}/releases/download/`;
export const ZIP_MAX = 200 * 1024 * 1024;
export const SUMS_MAX = 64 * 1024;
export const NOTES_MAX = 6000;
export const SIG_MAX = 1024;
// The release signing key's public half (Ed25519, SPKI DER, base64). The private half is the
// RELEASE_SIGNING_KEY secret of the Release workflow and exists nowhere else; tools/release-sign.mjs
// refuses to sign with a key that does not match this one.
export const RELEASE_SIGNING_PUBLIC_KEY = 'MCowBQYDK2VwAyEAZFJT/JUc+jKK3Gy11CNOt8q6H7sr7OfgHYGv7GV2eMo=';
// The first release published with a signature. A version at or after it installs only signed
// releases; an older one (or a copy built before the bump) may still take an unsigned one, so it can
// reach the first signed release.
export const FIRST_SIGNED_VERSION = '2.19.8';

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

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
/** A local test feed on this computer (http(s)://127.0.0.1|localhost|[::1]:port/...). */
function loopbackFeed(env) {
  try { const u = new URL(String(env.DASHBOARD_UPDATE_FEED || '')); return (u.protocol === 'http:' || u.protocol === 'https:') && LOOPBACK_HOSTS.has(u.hostname) && !u.username && !u.password ? u : null; } catch { return null; }
}
/** The feed: GitHub's API (DASHBOARD_UPDATE_FEED may pick another GitHub API URL or a loopback test feed, nothing else). */
export function feedUrl(env = process.env) {
  const f = String(env.DASHBOARD_UPDATE_FEED || '');
  if (!f) return DEFAULT_FEED;
  if (f.startsWith(`https://api.github.com/repos/${REPO}/`) || loopbackFeed(env)) return f;
  return DEFAULT_FEED;
}
/** Where a release's files may be downloaded from: GitHub's release URLs, or a loopback test feed's own origin. */
export function allowedDownload(url, env = process.env) {
  const u = String(url || '');
  if (u.startsWith(DOWNLOAD_PREFIX)) {
    // After URL normalisation it must still be under the project's releases ("/../" or "%2e%2e" cannot climb out).
    try { const h = new URL(u).href; return h === u && h.startsWith(DOWNLOAD_PREFIX) && !/%2e|%2f|%5c/i.test(h); } catch { return false; }
  }
  const feed = loopbackFeed(env);
  if (feed) { try { return new URL(u).origin === feed.origin; } catch { return false; } }
  return false;
}

/** True when `sigText` (base64 Ed25519 signature) signs exactly `data` with the pinned release key. Never throws. */
export function verifyReleaseSignature(data, sigText, publicKey = RELEASE_SIGNING_PUBLIC_KEY) {
  try {
    const sig = Buffer.from(String(sigText || '').trim(), 'base64');
    if (sig.length !== 64) return false;
    const key = createPublicKey({ key: Buffer.from(publicKey, 'base64'), format: 'der', type: 'spki' });
    return verifySig(null, Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8'), key, sig);
  } catch { return false; }
}
/** Must a release be signed for this running version to install it? */
export const signatureRequired = (current) => compareVersions(current, FIRST_SIGNED_VERSION) !== -1;

/** The GitHub release JSON -> {version, tag, name, notes, publishedAt, url, zip:{name,url,size}, sums:{name,url}, sig:{name,url}|null} or null. */
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
    url: page, zip: pick(`opendash-v${version}.zip`), sums: pick('SHA256SUMS.txt'), sig: pick('SHA256SUMS.txt.sig'),
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

/** 'git' only for a clone of OpenDash (or a fork named opendash) that git can fast-forward. Anything else,
 *  e.g. a folder whose files were copied over or that still points at another repository, updates from the zip.
 *  A .git FILE (a worktree) counts only when its admin folder's `gitdir` points back at THIS folder: a
 *  folder copied out of a worktree keeps a .git file that points at the original, and git would then
 *  update that other checkout instead. */
export function installKind(repoRoot) {
  const dot = join(repoRoot, '.git');
  if (!existsSync(dot)) return 'zip';
  let cfg;
  try {
    if (!statSync(dot).isDirectory()) {
      const m = /^gitdir:\s*(.+?)\s*$/m.exec(readFileSync(dot, 'utf8'));
      if (!m) return 'zip';
      const admin = resolve(repoRoot, m[1]);
      const back = resolve(admin, readFileSync(join(admin, 'gitdir'), 'utf8').trim());   // <worktree>/.git
      const same = (a, b) => (process.platform === 'win32' || process.platform === 'darwin' ? a.toLowerCase() === b.toLowerCase() : a === b);
      if (!same(back, resolve(dot))) return 'zip';
      const common = existsSync(join(admin, 'commondir')) ? resolve(admin, readFileSync(join(admin, 'commondir'), 'utf8').trim()) : admin;
      cfg = readFileSync(join(common, 'config'), 'utf8');
    } else cfg = readFileSync(join(dot, 'config'), 'utf8');
  } catch { return 'zip'; }
  const urls = [...cfg.matchAll(/^\s*url\s*=\s*(\S+)/gm)].map(m => m[1]);
  return urls.some(u => /[/:][^/:]+\/opendash(\.git)?\/?$/i.test(u)) ? 'git' : 'zip';
}

// ─── stored state ───────────────────────────────────────────────────────
export const stateFile = (dataDir) => join(dataDir, 'update-check.json');
/** A stored release that is shaped like one checkLatest() makes (the file may have been edited by hand or planted). */
function plausibleRelease(r, env = process.env) {
  if (!r || typeof r !== 'object' || !parseVersion(r.version) || r.tag !== `v${r.version}`) return false;
  for (const k of ['zip', 'sums']) if (r[k] != null && !(r[k] && typeof r[k].url === 'string' && allowedDownload(r[k].url, env))) return false;
  if (r.zip && r.zip.name !== `opendash-v${r.version}.zip`) return false;
  return true;
}
export async function readUpdateState(dataDir) {
  const s = await readJson(stateFile(dataDir), { fallback: {} }).catch(() => ({}));
  return {
    auto: s && s.auto === true,
    checkedAt: s && typeof s.checkedAt === 'string' ? s.checkedAt : null,
    latest: s && plausibleRelease(s.latest) ? s.latest : null,
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
  else if (kind === 'zip' && latest && !latest.sig && signatureRequired(current)) reason = 'This release is not signed, so it cannot be installed from here. Download it from the release page instead.';
  return {
    current, kind, auto: state.auto, checkedAt: state.checkedAt, error: state.error,
    latest: latest ? { version: latest.version, name: latest.name, notes: latest.notes, publishedAt: latest.publishedAt, url: latest.url } : null,
    available: cmp === 1, upToDate: cmp !== null && cmp <= 0,
    canApply: !reason, reason,
  };
}

// ─── applying: a release zip ────────────────────────────────────────────
const NEVER_TOUCH = ['data/', 'state/', 'secrets/', 'logs/', '.git/', '.env', 'index.html', 'node_modules/', 'runtime/'];   // runtime/ = the Windows installer's own node.exe
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
  const sumsBuf = await download(release.sums.url, SUMS_MAX, { ...opts, what: 'SHA256SUMS.txt' });
  // The checksums count only when the release key signed them (a mirror, a replaced asset or a
  // stolen GitHub token cannot make a signature).
  if (release.sig) {
    const sig = (await download(release.sig.url, SIG_MAX, { ...opts, what: 'SHA256SUMS.txt.sig' })).toString('utf8');
    if (!verifyReleaseSignature(sumsBuf, sig)) throw new Error('the release signature does not match, so nothing was installed');
  } else if (signatureRequired(current)) throw new Error('this release is not signed, so nothing was installed');
  const sums = sumsBuf.toString('utf8');
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

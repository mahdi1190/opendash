// tools/release-rules.mjs - what goes into a public release of the app, and
// what never does. Shared by tools/release-export.mjs (builds the clean tree),
// tools/release-package.mjs (re-checks the zip) and tools/privacy-scan.mjs
// (flags forbidden paths).
//
// The release is an ALLOWLIST: only the top-level files and folders below are
// copied. Inside those folders every path is checked against NEVER; anything
// that matches is left out, wherever it is. To publish a new top-level file or
// folder, add it here on purpose (a new file is never published by accident).
//
//   classifyTop(name, isDir)   -> {keep:true} | {keep:false, why}
//   neverRule(rel)             -> the NEVER rule a 'a/b/c' path matches, or null
//   collectRelease(root)       -> {files:[{rel, full, size, mode}], excluded:[{rel, dir, why, kind}]}
//   globToRegExp(glob)         -> RegExp for 'a/**/*.js'-style globs (no dependencies)
//
// Zero dependencies, Node >= 20.

import { readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

// ─── Top level: the allowlist ──────────────────────────────────────────────
export const TOP_FILES = [
  /^README[\w.-]*\.md$/i, /^LICEN[CS]E(\.md|\.txt)?$/i, /^CHANGELOG(\.md)?$/i,
  /^CONTRIBUTING(\.md)?$/i, /^CODE_OF_CONDUCT(\.md)?$/i, /^SECURITY(\.md)?$/i, /^SUPPORT(\.md)?$/i,
  /^THIRD_PARTY_NOTICES(\.md)?$/i, /^MODULES\.md$/, /^CLAUDE\.md$/,
  /^package\.json$/, /^build\.mjs$/, /^serve\.mjs$/, /^check\.bat$/i,
  /^start-[\w-]+\.(bat|cmd|sh|command)$/i,
  /^\.(gitignore|gitattributes|editorconfig|nvmrc|node-version)$/,
];
export const TOP_DIRS = ['src', 'server', 'lib', 'mcp', 'cloudflare', 'tools', 'vendor', 'tests', 'docs', '.github'];
// Folders of which only some subfolders are published. An entry is a folder ('brand') or a nested path
// ('skills/animation-pack'); everything else inside the folder is left out and reported.
// .claude/skills/animation-pack is committed source that ships: the animation tool's briefs (tools/lib/anim-templates/)
// tell the reader to open it, and the tool's own tests read it. The rest of .claude is per-machine and never ships.
// assets/objects holds the raster library objects (docs/dev/OBJECT_IMPORT.md): build.mjs embeds them in the page.
export const PARTIAL_DIRS = { assets: ['brand', 'objects'], '.claude': ['skills/animation-pack'] };

// Why well-known top-level entries are left out (anything else: "not on the allowlist").
const TOP_WHY = {
  'data': 'the user data folder (tasks, finances, config, logs): never published',
  'state': 'the legacy personal state folder: never published',
  'secrets': 'OAuth clients and tokens: never published',
  'index.html': 'built file: the launchers run node build.mjs on every start',
  '.git': 'history stays private: the public repo starts from one clean commit',
  '.claude': 'local Claude Code config: settings.json was reviewed and holds machine-specific paths and permissions; settings.local.json is per-machine',
  'node_modules': 'the app has zero npm dependencies',
  'ai-objects': 'the inbox of AI sprite sheets from external agents: working files (the imported objects ship in assets/objects)',
};

// ─── Never published, wherever they are ───────────────────────────────────
// kind: 'private' = personal data or secrets (privacy-scan reports it as an error),
//       'local'   = per-machine tool config, 'build' = generated or release output,
//       'internal' = maintainers' working notes (kept in the repo, not in a release),
//       'noise'   = editor / OS / cache files.
export const NEVER = [
  { re: /(^|\/)data(\/|$)/i, kind: 'private', why: 'user data folder' },
  { re: /(^|\/)state(\/|$)/i, kind: 'private', why: 'legacy personal state folder' },
  { re: /(^|\/)secrets(\/|$)/i, kind: 'private', why: 'OAuth clients and tokens' },
  { re: /(^|\/)(sync-)?backups?(\/|$)/i, kind: 'private', why: 'backups of user data' },
  { re: /(^|\/)logs(\/|$)|\.log$/i, kind: 'private', why: 'logs' },
  { re: /(^|\/)migration-plans(\/|$)/i, kind: 'private', why: 'personal migration plans' },
  { re: /(^|\/)\.env(\.[^/]*)?$/i, kind: 'private', why: 'environment secrets' },
  { re: /(^|\/)(local-token|runtime\.json)$/i, kind: 'private', why: 'per-install token / runtime file' },
  { re: /backup[^/]*\.json$/i, kind: 'private', why: 'backup downloads' },
  { re: /(^|\/)privacy-terms[^/]*$/i, kind: 'private', why: 'the private term list must never be published' },
  { re: /(^|\/)client_secret[^/]*\.json$|(^|\/)(google-)?tokens?\.json$/i, kind: 'private', why: 'Google OAuth client or token file' },
  { re: /\.(pem|p12|pfx|jks|keystore)$|(^|\/)id_(rsa|ed25519|ecdsa)$/i, kind: 'private', why: 'key files' },
  { re: /^tools\/apply_sync\.py$/i, kind: 'private', why: 'personal one-off script (retired, carries real task text)' },
  { re: /^tools\/write_snapshot_local[^/]*\.py$/i, kind: 'private', why: 'personal one-off script' },
  { re: /(^|\/)(dashboard-backup-|[a-z]+-dashboard-|tasks-)[^/]*\.(json|md)$/i, kind: 'private', why: 'personal exports' },
  { re: /(^|\/)(dashboard|opendash)-(backup|data)-[^/]*\.(json|zip)$/i, kind: 'private', why: 'a backup or data export downloaded from the app (old and new names)' },
  { re: /\.pre-standalone$/i, kind: 'private', why: 'pre-2.0 personal copies' },
  { re: /\.(pkl|parquet|sqlite3?|db)$/i, kind: 'private', why: 'data dumps' },
  // `unless` exempts the one shared project skill (see PARTIAL_DIRS); anchored at the top, so a lookalike such as
  // .claude/skills/animation-packs/ or src/.claude/skills/animation-pack/ is still left out.
  { re: /(^|\/)\.claude(\/|$)/i, kind: 'local', why: 'local Claude Code config', unless: /^\.claude\/skills\/animation-pack(\/|$)/i },
  { re: /(^|\/)(node_modules|\.git)(\/|$)/, kind: 'noise', why: 'dependencies / version control' },
  { re: /(^|\/)(__pycache__|\.pytest_cache|\.vscode|\.idea|\.cache|coverage|\.tmp)(\/|$)/i, kind: 'noise', why: 'editor or cache folder' },
  { re: /\.(pyc|tmp|temp|bak|orig|rej|swp|swo)$|~$|(^|\/)~\$|(^|\/)\.~lock\./i, kind: 'noise', why: 'scratch, backup or editor file' },
  { re: /\.tmp-[^/]*$/i, kind: 'noise', why: 'interrupted atomic write' },
  { re: /\.lock$/i, kind: 'noise', why: 'lock file' },
  { re: /(^|\/)(Thumbs\.db|desktop\.ini|\.DS_Store)$/i, kind: 'noise', why: 'OS file' },
  { re: /\.(zip|tgz|7z|rar|tar|tar\.gz)$/i, kind: 'build', why: 'archive (release output or download)' },
  { re: /(^|\/)SHA256SUMS[^/]*$|(^|\/)release-notes\.md$/i, kind: 'build', why: 'release output' },
  { re: /^index\.html$/i, kind: 'build', why: 'built file (node build.mjs)' },
  // The branding work plan lists where personal strings used to be and the
  // owner's open decisions: a working note, not documentation for users. The
  // GitHub settings checklist is the owner's one-off setup notes.
  { re: /^docs\/dev\/(BRANDING_PLAN|GITHUB_SETUP)\.md$|^docs\/internal(\/|$)/i, kind: 'internal', why: 'maintainers\' working notes (not part of a release)' },
];

/** The NEVER rule a forward-slash relative path matches, or null. */
export function neverRule(rel) {
  const p = String(rel).replace(/\\/g, '/');
  return NEVER.find(r => r.re.test(p) && !(r.unless && r.unless.test(p))) || null;
}

/** Is a top-level entry part of the release? */
export function classifyTop(name, isDir) {
  if (isDir && TOP_DIRS.includes(name)) return { keep: true };
  if (isDir && PARTIAL_DIRS[name]) return { keep: 'partial', only: PARTIAL_DIRS[name] };
  if (!isDir && TOP_FILES.some(re => re.test(name))) {
    const n = neverRule(name);
    return n ? { keep: false, why: n.why, kind: n.kind } : { keep: true };
  }
  if (TOP_WHY[name]) return { keep: false, why: TOP_WHY[name], kind: neverRule(name)?.kind || 'local' };
  const n = neverRule(name);
  if (n) return { keep: false, why: n.why, kind: n.kind };
  return { keep: false, why: 'not on the allowlist (add it to tools/release-rules.mjs if it belongs in the release)', kind: 'unlisted' };
}

const posix = (...parts) => parts.filter(Boolean).join('/');

function walk(root, relDir, out) {
  let names;
  try { names = readdirSync(join(root, relDir)).sort(); } catch { return; }
  for (const n of names) {
    const rel = posix(relDir, n);
    const full = join(root, rel);
    let st;
    try { st = lstatSync(full); } catch { continue; }
    const rule = neverRule(rel + (st.isDirectory() ? '/' : ''));
    if (rule) { out.excluded.push({ rel, dir: st.isDirectory(), why: rule.why, kind: rule.kind }); continue; }
    if (st.isSymbolicLink()) { out.excluded.push({ rel, dir: false, why: 'symbolic link (never followed)', kind: 'local' }); continue; }
    if (st.isDirectory()) walk(root, rel, out);
    else if (st.isFile()) out.files.push({ rel, full, size: st.size, mode: st.mode & 0o777 });
  }
}

/**
 * Publish only `paths` (folders or nested paths such as 'skills/animation-pack', relative to `relDir`) and report
 * everything else found along the way as left out, once, at the level where it leaves the published path.
 */
function walkOnly(root, relDir, paths, why, out) {
  const heads = new Map();                                   // first segment -> the deeper paths under it
  for (const p of paths) {
    const [head, ...rest] = p.split('/');
    if (!heads.has(head)) heads.set(head, []);
    if (rest.length) heads.get(head).push(rest.join('/'));
  }
  let names = [];
  try { names = readdirSync(join(root, relDir)).sort(); } catch { return; }
  for (const n of names) {
    const rel = posix(relDir, n);
    let st;
    try { st = lstatSync(join(root, rel)); } catch { continue; }
    if (heads.has(n) && st.isDirectory()) {
      const deeper = heads.get(n);
      if (deeper.length) walkOnly(root, rel, deeper, why, out); else walk(root, rel, out);
      continue;
    }
    // a per-machine folder keeps its own reason and kind (local); anything else is simply not on the published path
    const rule = neverRule(rel + (st.isDirectory() ? '/' : ''));
    out.excluded.push({ rel, dir: st.isDirectory(), why: rule ? rule.why : why, kind: rule ? rule.kind : 'unlisted' });
  }
}

/**
 * Every file of the release in `root`, plus what was left out and why.
 * Excluded folders are listed once (their contents are never read).
 */
export function collectRelease(root) {
  const out = { files: [], excluded: [] };
  let names = [];
  try { names = readdirSync(root).sort(); } catch (e) { throw new Error(`cannot read ${root}: ${e.message}`); }
  for (const name of names) {
    let st;
    try { st = lstatSync(join(root, name)); } catch { continue; }
    const isDir = st.isDirectory();
    if (st.isSymbolicLink()) { out.excluded.push({ rel: name, dir: false, why: 'symbolic link (never followed)', kind: 'local' }); continue; }
    const c = classifyTop(name, isDir);
    if (c.keep === true) {
      if (isDir) walk(root, name, out);
      else out.files.push({ rel: name, full: join(root, name), size: st.size, mode: st.mode & 0o777 });
    } else if (c.keep === 'partial') {
      walkOnly(root, name, c.only, `only ${c.only.map(o => `${name}/${o}/`).join(', ')} is published`, out);
    } else out.excluded.push({ rel: name, dir: isDir, why: c.why, kind: c.kind });
  }
  out.files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return out;
}

/** 'a/**' + '/*.js' style glob -> RegExp over forward-slash relative paths. */
export function globToRegExp(glob) {
  let re = '';
  const g = String(glob).replace(/\\/g, '/');
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        const slash = g[i + 2] === '/';
        re += slash ? '(?:.*/)?' : '.*';
        i += slash ? 2 : 1;
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

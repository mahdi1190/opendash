// lib/workspace-index.mjs - the local WORKSPACE INDEX behind auto-linking (no AI).
//
// The user lists "workspace folders" (Settings > Files & auto-link,
// <data>/index/settings.json). buildIndex() walks them and writes
// <data>/index/files.json: every file's folder, name, size and mtime, the git
// repository it belongs to (with its GitHub remote), and for text-like files a
// short excerpt (headings, titles, header rows); for docx/pptx/xlsx the title
// from docProps/core.xml (pptx: slide titles, xlsx: sheet names). Nothing is
// ever written inside a workspace folder: it is only read.
//
// Rules
//   - Skipped: .git and other VCS folders, node_modules, Python virtual
//     environments (venv, .venv, any folder holding pyvenv.cfg), __pycache__
//     and tool caches, build/dist, hidden (dot) folders, symlinks/junctions
//     (never followed), entries .gitignore files ignore, huge binaries.
//   - "Names only" folders (default: any folder named client_data, secrets,
//     .env or private, plus the user's own names or absolute paths): their
//     files are listed by NAME only. Their contents are never opened, so no
//     excerpt or title from them can reach the page or a model.
//   - Secret-looking files (.env*, keys, certificates, "credentials", "token"
//     ...) are never opened anywhere.
//   - OneDrive "online-only" files are never opened (that would download them):
//     on Windows one PowerShell listing per OneDrive folder finds them first;
//     when that listing fails, no file under that folder is opened.
//   - Incremental: a file whose size and mtime are unchanged keeps its excerpt
//     from the previous index without being opened again.
//   - Limits: files, depth (per folder too), entries per folder, total time;
//     progress is reported through onProgress.
//
// Index shape (compact: dirs are listed once, files point at them):
//   { version, builtAt, ms, roots:[{path, depth, container, files, dirs, truncated, error?}],
//     repos:[{root, remote, github:{owner, repo}|null}],
//     dirs:[{p, r (root index), g (repo index | -1), no? (names only)}],
//     files:[{d (dir index), n, s, m, x? (excerpt), t? (title)}],
//     stats:{files, dirs, read, reused, skipped:{...}, truncated} }

import { readdir, stat, open, readFile } from 'node:fs/promises';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { inflateRawSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { readJson, atomicWrite, writeJson } from './fsutil.mjs';
import { rsrcIsLocalPath, rsrcNormPath, rsrcGithub } from './resources.mjs';

export const INDEX_VERSION = 1;
export const DEFAULT_NAMES_ONLY = Object.freeze(['client_data', 'secrets', '.env', 'private']);
export const SKIP_DIRS = Object.freeze(new Set([
  '.git', '.hg', '.svn', 'node_modules', 'bower_components', 'venv', '.venv', '__pycache__', '.mypy_cache', '.pytest_cache',
  '.ruff_cache', '.tox', '.nox', '.cache', '.next', '.nuxt', '.parcel-cache', '.turbo', '.gradle', '.idea', '.vscode', 'dist', 'build',
  '.ipynb_checkpoints', 'site-packages', '.eggs', 'htmlcov', '.terraform', '$recycle.bin', 'system volume information', 'appdata',
]));
export const DEFAULT_LIMITS = Object.freeze({ maxFiles: 80000, maxDepth: 8, maxMs: 180000, maxEntriesPerDir: 5000, maxTextBytes: 2 * 1024 * 1024, maxZipBytes: 80 * 1024 * 1024, hugeBytes: 200 * 1024 * 1024 });

const TEXT_EXT = new Set(['md', 'markdown', 'rst', 'txt', 'tex', 'bib', 'py', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'json', 'csv', 'tsv', 'ipynb', 'r', 'jl', 'm', 'gms', 'yaml', 'yml', 'toml', 'html', 'sql', 'sh', 'ps1']);
const ZIP_EXT = new Set(['docx', 'pptx', 'xlsx', 'docm', 'pptm', 'xlsm']);
const BIG_BINARY = /\.(iso|img|vhdx?|vmdk|dmg|ova|pak|bin|dat|h5|hdf5|npy|npz|parquet|pkl|pickle|pt|pth|ckpt|safetensors|onnx|mp4|mov|mkv|avi|wmv|zip|7z|rar|tar|gz|tgz)$/i;
const SECRETISH = /^(\.env(\..*)?|.*\.(pem|key|pfx|p12|kdbx|keystore|jks|cer|crt|der|asc|gpg|ovpn)|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|.*(secret|credential|password|passwd|apikey|api[_-]key|token).*|\.netrc|\.npmrc|\.pypirc|known_hosts|authorized_keys)$/i;

export const MAX_EXCERPT = 300;
export const MAX_TITLE = 200;

// ─── Settings ──────────────────────────────────────────────────────────────
// <data>/index/settings.json (personal paths: data folder only, never the repo)
export const DEFAULT_SETTINGS = Object.freeze({
  version: 1,
  enabled: false,              // background auto-linking (start, every few hours, after edits); manual runs always work
  folders: [],                 // [{path, depth?, container?}]
  namesOnly: [],               // extra names or absolute paths whose contents are never read
  autoApply: true,             // "Auto-attach confident links"
  threshold: 0.85,             // auto-apply at or above this judged confidence
  judge: { enabled: true, model: 'claude-haiku-4-5', maxCallsPerHour: 12, batchSize: 6, maxTasksPerRun: 40 },
  intervalHours: 4,            // re-index + re-suggest while the dashboard runs
  maxAutoPerTask: 2,           // at most this many folder-level links attached automatically per task
});
const JUDGE_MODELS = ['claude-haiku-4-5', 'claude-sonnet-5'];

export function indexDir(dataDir) { return path.join(path.resolve(dataDir), 'index'); }
export function indexPaths(dataDir) {
  const dir = indexDir(dataDir);
  return { dir, files: path.join(dir, 'files.json'), settings: path.join(dir, 'settings.json'), status: path.join(dir, 'status.json') };
}

const clampNum = (v, lo, hi, dflt) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
const cleanName = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 300);

/** A clean settings object (unknown fields dropped, folders checked as local absolute paths). */
export function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const folders = [];
  const seen = new Set();
  for (const f of Array.isArray(r.folders) ? r.folders.slice(0, 50) : []) {
    const p = rsrcNormPath(typeof f === 'string' ? f : f && f.path);
    if (!rsrcIsLocalPath(p)) continue;
    const k = /^[A-Za-z]:/.test(p) ? p.toLowerCase() : p;
    if (seen.has(k)) continue;
    seen.add(k);
    const o = { path: p };
    if (f && typeof f === 'object') {
      if (f.depth != null) o.depth = Math.round(clampNum(f.depth, 0, 20, DEFAULT_LIMITS.maxDepth));
      if (f.container === true) o.container = true;
    }
    folders.push(o);
  }
  const namesOnly = [...new Set((Array.isArray(r.namesOnly) ? r.namesOnly : []).map(cleanName).filter(Boolean))].slice(0, 100);
  const j = r.judge && typeof r.judge === 'object' ? r.judge : {};
  return {
    version: 1,
    enabled: r.enabled === true,
    folders,
    namesOnly,
    autoApply: r.autoApply === undefined ? d.autoApply : r.autoApply === true,
    threshold: Math.round(clampNum(r.threshold, 0.5, 0.99, d.threshold) * 100) / 100,
    judge: {
      enabled: j.enabled === undefined ? d.judge.enabled : j.enabled === true,
      model: JUDGE_MODELS.includes(j.model) ? j.model : d.judge.model,
      maxCallsPerHour: Math.round(clampNum(j.maxCallsPerHour, 1, 60, d.judge.maxCallsPerHour)),
      batchSize: Math.round(clampNum(j.batchSize, 1, 12, d.judge.batchSize)),
      maxTasksPerRun: Math.round(clampNum(j.maxTasksPerRun, 1, 200, d.judge.maxTasksPerRun)),
    },
    intervalHours: clampNum(r.intervalHours, 0.5, 48, d.intervalHours),
    maxAutoPerTask: Math.round(clampNum(r.maxAutoPerTask, 0, 5, d.maxAutoPerTask)),
  };
}
export async function loadSettings(dataDir) {
  return normalizeSettings(await readJson(indexPaths(dataDir).settings, { fallback: {} }).catch(() => ({})));
}
export function loadSettingsSync(dataDir) {
  try { return normalizeSettings(JSON.parse(readFileSync(indexPaths(dataDir).settings, 'utf8'))); } catch { return normalizeSettings({}); }
}
export async function saveSettings(dataDir, next) {
  const clean = normalizeSettings(next);
  await writeJson(indexPaths(dataDir).settings, clean, { trailingNewline: true });
  return clean;
}

// ─── Names only ────────────────────────────────────────────────────────────
/** A matcher for "names only" folders: a folder NAME (case-insensitive) or an absolute path (and everything under it). */
export function namesOnlyMatcher(extra = []) {
  const names = new Set(DEFAULT_NAMES_ONLY.map(s => s.toLowerCase()));
  const roots = [];
  for (const e of extra || []) {
    const s = cleanName(e);
    if (!s) continue;
    if (rsrcIsLocalPath(rsrcNormPath(s))) roots.push(rsrcNormPath(s).toLowerCase().replace(/[\\/]+/g, '/'));
    else names.add(s.toLowerCase());
  }
  const norm = (p) => String(p).toLowerCase().replace(/[\\/]+/g, '/');
  const m = (dirPath, name) => {
    if (names.has(String(name || '').toLowerCase())) return true;
    if (!roots.length) return false;
    const p = norm(dirPath);
    return roots.some(r => p === r || p.startsWith(r + '/'));
  };
  /** A folder the user listed BY PATH (or one on the way to it): listed by name even when a .gitignore hides it. */
  m.explicit = (dirPath) => {
    const p = norm(dirPath);
    return roots.some(r => p === r || p.startsWith(r + '/') || r.startsWith(p + '/'));
  };
  return m;
}

// ─── .gitignore ────────────────────────────────────────────────────────────
function globToRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        const prevSlash = i === 0 || glob[i - 1] === '/';
        const nextSlash = glob[i + 2] === '/' || i + 2 === glob.length;
        if (prevSlash && nextSlash) {
          if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
          continue;
        }
        re += '[^/]*'; i += 1; continue;
      }
      re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '[') {
      const end = glob.indexOf(']', i + 1);
      if (end < 0) { re += '\\['; continue; }
      let cls = glob.slice(i + 1, end).replace(/\\/g, '\\\\');
      if (cls[0] === '!') cls = '^' + cls.slice(1);
      re += '[' + cls + ']';
      i = end;
    } else if (c === '\\' && i + 1 < glob.length) { re += '\\' + glob[++i]; }
    else re += c.replace(/[.+^${}()|]/g, '\\$&');
  }
  return re;
}
/** Rules of one .gitignore: [{re, neg, dirOnly}] matched against a path relative to its folder ('a/b.txt'). */
export function parseGitignore(text) {
  const rules = [];
  for (let line of String(text || '').split(/\r?\n/)) {
    if (!line || line[0] === '#') continue;
    line = line.replace(/(?<!\\)\s+$/, '');
    if (!line) continue;
    let neg = false;
    if (line[0] === '!') { neg = true; line = line.slice(1); }
    else if (line.startsWith('\\#') || line.startsWith('\\!')) line = line.slice(1);
    let dirOnly = false;
    if (line.endsWith('/')) { dirOnly = true; line = line.replace(/\/+$/, ''); }
    if (!line) continue;
    const anchored = line.includes('/');
    line = line.replace(/^\/+/, '');
    const body = globToRe(anchored ? line : '**/' + line);
    try { rules.push({ re: new RegExp('^' + body + '$'), neg, dirOnly }); } catch { /* a broken pattern is ignored */ }
  }
  return rules;
}
/** Is rel (relative to the .gitignore's folder, '/'-separated) ignored by these rule sets? sets: [{base (rel prefix), rules}] */
export function gitIgnored(sets, relFromRoot, isDir) {
  let ignored = false;
  for (const set of sets) {
    let rel = relFromRoot;
    if (set.base) {
      if (!relFromRoot.startsWith(set.base + '/')) continue;
      rel = relFromRoot.slice(set.base.length + 1);
    }
    for (const r of set.rules) {
      if (r.dirOnly && !isDir) continue;
      if (r.re.test(rel)) ignored = !r.neg;
    }
  }
  return ignored;
}

// ─── Git ───────────────────────────────────────────────────────────────────
/** {remote, github} of a checkout from its .git/config (no git, no network); credentials are never kept. */
export function gitInfo(dir) {
  try {
    let gitDir = path.join(dir, '.git');
    if (!existsSync(gitDir)) return null;
    if (statSync(gitDir).isFile()) {
      const m = /^gitdir:\s*(.+)$/m.exec(readFileSync(gitDir, 'utf8'));
      if (!m) return { remote: null, github: null };
      gitDir = path.isAbsolute(m[1].trim()) ? m[1].trim() : path.resolve(dir, m[1].trim());
    }
    const cfg = readFileSync(path.join(gitDir, 'config'), 'utf8');
    const sec = /\[remote\s+"origin"\]([\s\S]*?)(?=\n\s*\[|$)/.exec(cfg);
    const url = sec && /^\s*url\s*=\s*(.+)$/m.exec(sec[1]);
    if (!url) return { remote: null, github: null };
    const g = rsrcGithub(url[1].trim());
    if (g) return { remote: g.url, github: { owner: g.owner, repo: g.repo } };
    const u = url[1].trim();
    return { remote: /^https:\/\/[^@\s]+$/.test(u) ? u.slice(0, 300) : null, github: null };
  } catch { return { remote: null, github: null }; }
}

// ─── Excerpts ──────────────────────────────────────────────────────────────
const xmlText = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return ''; } }).replace(/&amp;/g, '&');
const oneLine = (s, max) => String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const uniq = (a) => [...new Set(a.filter(Boolean))];

/** Read the named entries of a zip (docx/pptx/xlsx) without loading the whole file. Zip64 is skipped. */
export async function zipPeek(file, want, { maxEntryBytes = 4 * 1024 * 1024, maxEntries = 30 } = {}) {
  const fh = await open(file, 'r');
  try {
    const { size } = await fh.stat();
    if (size < 22) return {};
    const tailLen = Math.min(size, 65557);
    const tail = Buffer.alloc(tailLen);
    await fh.read(tail, 0, tailLen, size - tailLen);
    let eocd = -1;
    for (let i = tailLen - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return {};
    const cdSize = tail.readUInt32LE(eocd + 12), cdOff = tail.readUInt32LE(eocd + 16);
    if (cdOff === 0xffffffff || cdSize > 16 * 1024 * 1024 || cdOff + cdSize > size) return {};
    const cd = Buffer.alloc(cdSize);
    await fh.read(cd, 0, cdSize, cdOff);
    const found = [];
    for (let p = 0; p + 46 <= cd.length && cd.readUInt32LE(p) === 0x02014b50;) {
      const method = cd.readUInt16LE(p + 10), comp = cd.readUInt32LE(p + 20), nl = cd.readUInt16LE(p + 28), el = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32), off = cd.readUInt32LE(p + 42);
      const name = cd.toString('utf8', p + 46, p + 46 + nl);
      if (want(name) && comp !== 0xffffffff && off !== 0xffffffff && comp <= maxEntryBytes * 4) found.push({ name, method, comp, off });
      p += 46 + nl + el + cl;
    }
    const out = {};
    for (const f of found.slice(0, maxEntries)) {
      const lh = Buffer.alloc(30);
      await fh.read(lh, 0, 30, f.off);
      if (lh.readUInt32LE(0) !== 0x04034b50) continue;
      const start = f.off + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
      const data = Buffer.alloc(f.comp);
      await fh.read(data, 0, f.comp, start);
      try {
        out[f.name] = f.method === 0 ? data.subarray(0, maxEntryBytes).toString('utf8')
          : f.method === 8 ? inflateRawSync(data, { maxOutputLength: maxEntryBytes }).toString('utf8') : undefined;
      } catch { /* too big or broken: skipped */ }
    }
    return out;
  } finally { await fh.close().catch(() => {}); }
}

function coreTitle(xml) {
  if (!xml) return [];
  const pick = (tag) => { const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml); return m ? oneLine(xmlText(m[1]), 160) : ''; };
  return uniq([pick('dc:title'), pick('dc:subject'), pick('cp:keywords')]);
}
/** Office titles: {t: title line, x: excerpt (slide titles / sheet names / headings)}. */
export async function officeText(file, ext) {
  const kind = ext.slice(0, 4);
  const want = (n) => n === 'docProps/core.xml' || (kind === 'pptx' && /^ppt\/slides\/slide\d+\.xml$/.test(n)) || (kind === 'xlsx' && n === 'xl/workbook.xml') || (kind === 'docx' && n === 'word/document.xml');
  const z = await zipPeek(file, want, { maxEntries: 40 });
  const title = coreTitle(z['docProps/core.xml']);
  let parts = [];
  if (kind === 'pptx') {
    const slides = Object.keys(z).filter(n => n.startsWith('ppt/slides/')).sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1])).slice(0, 15);
    for (const n of slides) {
      for (const sp of z[n].split(/<p:sp[ >]/).slice(1)) {
        if (!/<p:ph[^>]*type="(title|ctrTitle)"/.test(sp)) continue;
        const t = oneLine(xmlText((sp.match(/<a:t>([^<]*)<\/a:t>/g) || []).join(' ')), 120);
        if (t) parts.push(t);
        break;
      }
    }
  } else if (kind === 'xlsx') {
    parts = [...String(z['xl/workbook.xml'] || '').matchAll(/<sheet [^>]*name="([^"]*)"/g)].map(m => oneLine(xmlText(m[1]), 60)).slice(0, 12);
  } else if (kind === 'docx') {
    const doc = String(z['word/document.xml'] || '');
    for (const p of doc.split(/<w:p[ >]/).slice(0, 4000)) {
      if (!/<w:pStyle w:val="(Title|Heading1|Heading2|Titre|Heading 1)"/.test(p)) continue;
      const t = oneLine(xmlText((p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).join('')), 120);
      if (t) parts.push(t);
      if (parts.length >= 8) break;
    }
    parts = uniq(parts);
  }
  return { t: oneLine(title.join(' · '), MAX_TITLE) || undefined, x: oneLine(uniq(parts).join(' · '), MAX_EXCERPT) || undefined };
}

/** A short excerpt of a text-like file from its first bytes. */
export function textExcerpt(text, ext) {
  const s = String(text || '').replace(/^﻿/, '');
  const lines = s.split(/\r?\n/);
  let out = [];
  if (['md', 'markdown', 'rst'].includes(ext)) {
    out = lines.filter(l => /^#{1,4}\s+\S/.test(l)).map(l => l.replace(/^#+\s*/, '')).slice(0, 8);
    if (!out.length) out = lines.filter(l => l.trim()).slice(0, 3);
  } else if (ext === 'tex') {
    out = [...s.matchAll(/\\(title|chapter|section|subsection)\*?\{([^{}]{1,160})\}/g)].map(m => m[2]).slice(0, 10);
  } else if (ext === 'bib') {
    out = [...s.matchAll(/\btitle\s*=\s*[{"]\{?([^{}"]{3,160})/gi)].map(m => m[1]).slice(0, 5);
  } else if (ext === 'py') {
    const doc = /^\s*(?:#[^\n]*\n\s*)*(?:"""|''')([\s\S]{1,400}?)(?:"""|''')/.exec(s);
    if (doc) out.push(doc[1]);
    out.push(...[...s.matchAll(/^(?:def|class)\s+([A-Za-z_]\w*)/gm)].map(m => m[1]).slice(0, 10));
  } else if (['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx'].includes(ext)) {
    const head = lines.slice(0, 15).filter(l => /^\s*(\/\/|\/\*|\*)/.test(l)).map(l => l.replace(/^\s*(\/\/+|\/\*+|\*+\/?)\s?/, '')).filter(Boolean);
    out.push(...head.slice(0, 4));
    out.push(...[...s.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|class|const)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]).slice(0, 10));
  } else if (ext === 'csv' || ext === 'tsv') {
    out = [lines[0] || ''];
  } else if (ext === 'json') {
    try {
      const j = JSON.parse(s);
      if (j && typeof j === 'object' && !Array.isArray(j)) {
        for (const k of ['name', 'title', 'description']) if (typeof j[k] === 'string') out.push(j[k]);
        out.push(Object.keys(j).slice(0, 15).join(', '));
      }
    } catch { /* partial or not an object */ }
  } else if (ext === 'ipynb') {
    try {
      const j = JSON.parse(s);
      const md = (j.cells || []).filter(c => c && c.cell_type === 'markdown').slice(0, 3).map(c => (Array.isArray(c.source) ? c.source.join('') : String(c.source || '')));
      out = md.map(m => m.replace(/^#+\s*/gm, '')).slice(0, 3);
    } catch { /* not readable */ }
  } else if (['r', 'jl', 'm', 'gms', 'sql', 'sh', 'ps1', 'yaml', 'yml', 'toml'].includes(ext)) {
    out = lines.slice(0, 20).filter(l => /^\s*(#|%|\*|--|\$ontext)/.test(l)).map(l => l.replace(/^\s*(#+|%+|\*+|--)\s?/, '')).filter(Boolean).slice(0, 4);
  } else if (ext === 'html') {
    const t = /<title>([^<]{1,200})<\/title>/i.exec(s);
    if (t) out.push(xmlText(t[1]));
    out.push(...[...s.matchAll(/<h[12][^>]*>([\s\S]{1,160}?)<\/h[12]>/gi)].map(m => xmlText(m[1])).slice(0, 5));
  } else {
    out = lines.filter(l => l.trim()).slice(0, 3);
  }
  return oneLine(uniq(out.map(x => oneLine(x, 160))).join(' · '), MAX_EXCERPT) || undefined;
}

async function readHead(file, bytes) {
  const fh = await open(file, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const { bytesRead } = await fh.read(buf, 0, bytes, 0);
    return buf.subarray(0, bytesRead).toString('utf8');
  } finally { await fh.close().catch(() => {}); }
}

/** {x, t} for one file, or {} when it is not read. Never throws. */
export async function excerptOf(file, name, size, limits = DEFAULT_LIMITS) {
  const ext = (/\.([A-Za-z0-9]+)$/.exec(name) || [])[1];
  const e = ext ? ext.toLowerCase() : '';
  try {
    if (ZIP_EXT.has(e)) {
      if (size > limits.maxZipBytes) return {};
      return await officeText(file, e);
    }
    if (!TEXT_EXT.has(e)) return {};
    const whole = e === 'json' || e === 'ipynb';
    if (whole && size > limits.maxTextBytes) return {};
    const text = whole ? await readFile(file, 'utf8') : await readHead(file, 16384);
    if (/\u0000/.test(text.slice(0, 2000))) return {};
    return { x: textExcerpt(text, e) };
  } catch { return {}; }
}

// ─── OneDrive online-only files ────────────────────────────────────────────
/** Is this folder inside OneDrive (Windows)? */
export function isOneDrivePath(p, env = process.env) {
  const roots = [env.OneDrive, env.OneDriveConsumer, env.OneDriveCommercial].filter(Boolean).map(r => r.toLowerCase().replace(/[\\/]+$/, ''));
  const lp = String(p).toLowerCase();
  return roots.some(r => lp === r || lp.startsWith(r + '\\') || lp.startsWith(r + '/')) || /[\\/]onedrive( - [^\\/]+)?([\\/]|$)/i.test(String(p));
}
const CLOUD_SCRIPT = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  '[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false',
  'Get-ChildItem -LiteralPath $env:DASH_IDX_ROOT -Recurse -File -Force | Where-Object { ($_.Attributes.value__ -band 0x441000) -ne 0 } | ForEach-Object { $_.FullName }',
  "Write-Output 'CLOUD-DONE'",
].join('\n');
let _spawn = spawn;
export function setIndexSpawn(fn) { _spawn = typeof fn === 'function' ? fn : spawn; }
/** Set of lower-cased paths of online-only files under root, or null when the listing failed. */
export function cloudOnlyFiles(root, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    let child, out = '', done = false;
    const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const timer = setTimeout(() => { try { child && child.kill(); } catch {} finish(null); }, timeoutMs);
    try {
      child = _spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(CLOUD_SCRIPT, 'utf16le').toString('base64')],
        { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, DASH_IDX_ROOT: root } });
    } catch { finish(null); return; }
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => { out += d; if (out.length > 20e6) { try { child.kill(); } catch {} finish(null); } });
    child.on('error', () => finish(null));
    child.on('close', () => {
      if (!/CLOUD-DONE/.test(out)) return finish(null);
      finish(new Set(out.split(/\r?\n/).map(l => l.trim()).filter(l => l && l !== 'CLOUD-DONE').map(l => l.toLowerCase())));
    });
  });
}

// ─── The walk ──────────────────────────────────────────────────────────────
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}

/**
 * Build (or refresh) the index. opts:
 *   folders [{path, depth?, container?}], namesOnly [...], prev (previous index doc),
 *   limits, onProgress({phase, root, files, dirs, ms}), now(), platform, cloudCheck (fn root -> Promise<Set|null>)
 * Returns the index document (not written; writeIndex() does that).
 */
export async function buildIndex({ folders = [], namesOnly = [], prev = null, limits = {}, onProgress = () => {}, now = () => Date.now(), platform = process.platform, cloudCheck = null, signal } = {}) {
  const L = { ...DEFAULT_LIMITS, ...limits };
  const t0 = now();
  const isNamesOnly = namesOnlyMatcher(namesOnly);
  const prevFiles = new Map();
  if (prev && Array.isArray(prev.files) && Array.isArray(prev.dirs)) {
    for (const f of prev.files) { const d = prev.dirs[f.d]; if (d) prevFiles.set(path.join(d.p, f.n).toLowerCase(), f); }
  }
  const doc = { version: INDEX_VERSION, builtAt: null, ms: 0, roots: [], repos: [], dirs: [], files: [], stats: { files: 0, dirs: 0, read: 0, reused: 0, truncated: false, skipped: { dirs: 0, gitignore: 0, huge: 0, links: 0, cloud: 0, namesOnlyFiles: 0, secret: 0 } } };
  const repoIdx = new Map();
  let lastTick = 0;
  const tick = (root, force) => {
    const t = now();
    if (!force && t - lastTick < 250) return;
    lastTick = t;
    onProgress({ phase: 'index', root, files: doc.files.length, dirs: doc.dirs.length, ms: t - t0 });
  };
  const outOfTime = () => now() - t0 > L.maxMs || doc.files.length >= L.maxFiles || (signal && signal.aborted);

  for (const [ri, folder] of folders.entries()) {
    const root = rsrcNormPath(folder.path);
    const info = { path: root, depth: folder.depth ?? L.maxDepth, container: !!folder.container, files: 0, dirs: 0, truncated: false };
    doc.roots.push(info);
    if (!rsrcIsLocalPath(root)) { info.error = 'BAD_PATH'; continue; }
    let st;
    try { st = await stat(root); } catch { info.error = 'MISSING'; continue; }
    if (!st.isDirectory()) { info.error = 'NOT_A_FOLDER'; continue; }
    let cloud = undefined;
    if (platform === 'win32' && isOneDrivePath(root)) {
      onProgress({ phase: 'cloud-check', root, files: doc.files.length, dirs: doc.dirs.length, ms: now() - t0 });
      cloud = await (cloudCheck || cloudOnlyFiles)(root);
      if (cloud === null) info.cloudUnknown = true;
    }
    const maxDepth = Math.min(info.depth, 20);
    // DFS stack: {dir, depth, ign:[{base, rules}], repo, namesOnly}
    const stack = [{ dir: root, rel: '', depth: 0, ign: [], repo: -1, no: isNamesOnly(root, path.basename(root)) }];
    while (stack.length) {
      if (outOfTime()) { info.truncated = true; doc.stats.truncated = true; break; }
      const cur = stack.pop();
      let ents;
      try { ents = await readdir(cur.dir, { withFileTypes: true }); } catch { continue; }
      if (ents.length > L.maxEntriesPerDir) { ents = ents.slice(0, L.maxEntriesPerDir); info.truncated = true; }
      const names = new Set(ents.map(e => e.name));
      if (cur.depth > 0 && names.has('pyvenv.cfg')) { doc.stats.skipped.dirs++; continue; }
      let repo = cur.repo;
      if (names.has('.git')) {
        const gi = gitInfo(cur.dir);
        if (gi) {
          const k = cur.dir.toLowerCase();
          if (!repoIdx.has(k)) { repoIdx.set(k, doc.repos.length); doc.repos.push({ root: cur.dir, remote: gi.remote, github: gi.github }); }
          repo = repoIdx.get(k);
        }
      }
      let ign = cur.ign;
      if (names.has('.gitignore') && !cur.no) {
        try {
          const rules = parseGitignore(readFileSync(path.join(cur.dir, '.gitignore'), 'utf8').slice(0, 200000));
          if (rules.length) ign = ign.concat([{ base: cur.rel, rules }]);
        } catch { /* unreadable: ignored */ }
      }
      const di = doc.dirs.length;
      doc.dirs.push({ p: cur.dir, r: ri, g: repo, ...(cur.no ? { no: 1 } : {}) });
      info.dirs++;
      const files = [];
      const subdirs = [];
      const explicitNo = cur.no && isNamesOnly.explicit(cur.dir);
      for (const e of ents) {
        const name = e.name;
        const rel = cur.rel ? cur.rel + '/' + name : name;
        if (e.isSymbolicLink()) { doc.stats.skipped.links++; continue; }
        if (e.isDirectory()) {
          const lower = name.toLowerCase();
          if (SKIP_DIRS.has(lower) || (name.startsWith('.') && lower !== '.github') || /\.egg-info$/i.test(name)) { doc.stats.skipped.dirs++; continue; }
          const full = path.join(cur.dir, name);
          // A .gitignore'd folder is skipped, unless the user listed it (by path) as "names only":
          // then its file NAMES are indexed (never their contents).
          if (ign.length && gitIgnored(ign, rel, true) && !isNamesOnly.explicit(full)) { doc.stats.skipped.gitignore++; continue; }
          if (cur.depth + 1 > maxDepth) continue;
          subdirs.push({ dir: full, rel, depth: cur.depth + 1, ign, repo, no: cur.no || isNamesOnly(full, name) });
        } else if (e.isFile()) {
          if (name === '.gitignore' || /^(desktop\.ini|thumbs\.db|\.ds_store|~\$.*|\.~lock\..*#)$/i.test(name)) continue;
          if (ign.length && !explicitNo && gitIgnored(ign, rel, false)) { doc.stats.skipped.gitignore++; continue; }
          files.push(name);
        }
      }
      await pool(files, 8, async (name) => {
        if (doc.files.length >= L.maxFiles) return;
        const full = path.join(cur.dir, name);
        let fst;
        try { fst = await stat(full); } catch { return; }
        if (fst.size > L.hugeBytes && BIG_BINARY.test(name)) { doc.stats.skipped.huge++; return; }
        const f = { d: di, n: name, s: fst.size, m: Math.round(fst.mtimeMs) };
        const old = prevFiles.get(full.toLowerCase());
        if (cur.no) doc.stats.skipped.namesOnlyFiles++;
        else if (SECRETISH.test(name)) doc.stats.skipped.secret++;
        else if (cloud === null || (cloud && cloud.has(full.toLowerCase()))) doc.stats.skipped.cloud++;
        else if (old && old.m === f.m && old.s === f.s) {
          if (old.x) f.x = old.x;
          if (old.t) f.t = old.t;
          doc.stats.reused++;
        } else {
          const ex = await excerptOf(full, name, f.s, L);
          if (ex.x) f.x = ex.x;
          if (ex.t) f.t = ex.t;
          if (ex.x || ex.t) doc.stats.read++;
        }
        doc.files.push(f);
        info.files++;
      });
      // Push in reverse so the walk goes in name order.
      subdirs.sort((a, b) => (a.dir < b.dir ? 1 : -1));
      stack.push(...subdirs);
      tick(root);
    }
    tick(root, true);
  }
  doc.stats.files = doc.files.length;
  doc.stats.dirs = doc.dirs.length;
  doc.builtAt = new Date(now()).toISOString();
  doc.ms = now() - t0;
  return doc;
}

export async function readIndex(dataDir) {
  const doc = await readJson(indexPaths(dataDir).files, { fallback: null }).catch(() => null);
  return doc && doc.version === INDEX_VERSION && Array.isArray(doc.files) ? doc : null;
}
export async function writeIndex(dataDir, doc) {
  await atomicWrite(indexPaths(dataDir).files, JSON.stringify(doc));
}

// ─── Likely workspace folders (Settings' suggestions) ──────────────────────
/** Existing folders worth indexing: Documents, Desktop, OneDrive and git repositories under the home folder (2 levels). */
export async function suggestFolders({ home = os.homedir(), env = process.env } = {}) {
  const out = [];
  const seen = new Set();
  const add = (p, why, extra = {}) => {
    const n = rsrcNormPath(p);
    const k = n.toLowerCase();
    if (seen.has(k) || !rsrcIsLocalPath(n)) return;
    try { if (!statSync(n).isDirectory()) return; } catch { return; }
    seen.add(k);
    out.push({ path: n, why, ...extra });
  };
  const od = env.OneDrive || env.OneDriveConsumer || env.OneDriveCommercial;
  for (const base of [od, home].filter(Boolean)) {
    add(path.join(base, 'Documents'), 'Documents', { container: true });
    add(path.join(base, 'Desktop'), 'Desktop', { container: true });
  }
  if (od) add(od, 'OneDrive', { container: true, depth: 3 });
  add(path.join(home, 'Downloads'), 'Downloads', { container: true, depth: 1 });
  const scan = async (dir, level) => {
    let ents;
    try { ents = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name.toLowerCase())) continue;
      const full = path.join(dir, e.name);
      if (existsSync(path.join(full, '.git'))) { add(full, 'Git repository'); continue; }
      if (level < 2) await scan(full, level + 1);
    }
  };
  await scan(home, 1);
  return out.slice(0, 40);
}

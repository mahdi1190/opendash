// lib/relocate/paths.mjs - the path rules of "Move my data out of OneDrive"
// (lib/relocate/index.mjs). Pure functions: no file system, no process state.
// Every function takes the platform, so Windows rules (any case, \ or /) can be
// tested on any computer.
//
//   samePath(a, b, platform)            the same folder? (Windows: any case, either slash)
//   isUnder(child, parent, platform)    child is parent or inside it
//   mapPath(p, mappings, platform)      p with a moved folder's prefix replaced (keeps p's slash style)
//   mapText(text, mappings, platform)   every mention of a moved folder in a text (plain, forward-slash
//                                       and JSON-escaped forms), with the count of replacements
//   syncedFolderKind(p, env)            'OneDrive' | 'Dropbox' | ... when p is inside a cloud-synced folder
//   movedFolderName(name, to, date)     'data (moved to AppData-Local-OpenDash-Data on 2026-10-23)'
//   splitCommand / joinCommand          a Windows command line as tokens and back (quotes kept)
//   repointCommand(cmd, mappings, ...)  a start-up command re-pointed at the moved app and data folders
//
// A mapping is {from, to}. Longer `from` wins, so the data folder inside the
// app folder maps to the new data folder, not to <new app>/data.

import { win32, posix } from 'node:path';

const P = (platform) => (platform === 'win32' ? win32 : posix);
const fold = (s, platform) => (platform === 'win32' ? String(s).replace(/\//g, '\\').toLowerCase() : String(s));
const trimSep = (s, platform) => {
  const x = String(s);
  const root = platform === 'win32' ? /^[A-Za-z]:[\\/]?$/.test(x) || /^[\\/]{1,2}$/.test(x) : x === '/';
  return root ? x : x.replace(platform === 'win32' ? /[\\/]+$/ : /\/+$/, '');
};

/** a and b name the same folder (Windows: any case, either slash; trailing separators ignored). */
export function samePath(a, b, platform = process.platform) {
  if (!a || !b) return false;
  const p = P(platform);
  return fold(trimSep(p.resolve(a), platform), platform) === fold(trimSep(p.resolve(b), platform), platform);
}

/** child is parent itself or somewhere inside it. */
export function isUnder(child, parent, platform = process.platform) {
  if (!child || !parent) return false;
  const p = P(platform);
  const rel = p.relative(p.resolve(parent), p.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !p.isAbsolute(rel));
}

/** The mappings, longest `from` first (so a folder inside a moved folder wins). */
export function sortMappings(mappings) {
  return [...(mappings || [])].filter(m => m && m.from && m.to).sort((a, b) => String(b.from).length - String(a.from).length);
}

/**
 * p with the first matching mapping applied, or p unchanged. The result uses
 * p's slash style: a path written with / stays with / (Claude Code writes
 * them that way), one with \ keeps \.
 */
export function mapPath(p, mappings, platform = process.platform) {
  if (typeof p !== 'string' || !p) return p;
  const win = platform === 'win32';
  const forward = win && p.includes('/') && !p.includes('\\');
  for (const m of sortMappings(mappings)) {
    const from = trimSep(m.from, platform);
    const a = fold(p, platform), f = fold(from, platform);
    if (a === f || a.startsWith(f + (win ? '\\' : '/'))) {
      let out = trimSep(m.to, platform) + p.slice(from.length);
      if (win) out = forward ? out.replace(/\\/g, '/') : out.replace(/\//g, '\\');
      return out;
    }
  }
  return p;
}

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every mention of a moved folder in `text` replaced: written with \, with /,
 * or JSON-escaped (\\). A mention must end at a separator, a quote, white
 * space or the end, so 'opendash-old' never matches
 * 'opendash'. Returns {text, count}.
 */
export function mapText(text, mappings, platform = process.platform) {
  const src = String(text == null ? '' : text);
  const win = platform === 'win32';
  const variants = [];
  for (const m of sortMappings(mappings)) {
    const from = trimSep(m.from, platform), to = trimSep(m.to, platform);
    if (win) {
      const fb = from.replace(/\//g, '\\'), tb = to.replace(/\//g, '\\');
      variants.push({ find: fb.replace(/\\/g, '\\\\'), to: tb.replace(/\\/g, '\\\\') });   // JSON-escaped
      variants.push({ find: fb, to: tb });
      variants.push({ find: fb.replace(/\\/g, '/'), to: tb.replace(/\\/g, '/') });
    } else variants.push({ find: from, to });
  }
  if (!variants.length) return { text: src, count: 0 };
  variants.sort((a, b) => b.find.length - a.find.length);
  const alt = variants.map(v => reEsc(v.find)).join('|');
  const re = new RegExp(`(${alt})(?=$|[\\\\/"'\`\\s,;)\\]}>|])`, win ? 'gi' : 'g');
  let count = 0;
  const out = src.replace(re, (hit) => {
    const v = variants.find(x => (win ? x.find.toLowerCase() === hit.toLowerCase() : x.find === hit));
    if (!v) return hit;
    count++;
    return v.to;
  });
  return { text: out, count };
}

/** True when `text` mentions any mapping's `from` (same rules as mapText). */
export const mentions = (text, mappings, platform = process.platform) => mapText(text, mappings, platform).count > 0;

// ─── Cloud-synced folders ─────────────────────────────────────────────────
const CLOUD_NAMES = [
  ['OneDrive', /[\\/]onedrive( - [^\\/]+)?([\\/]|$)/i],
  ['Dropbox', /[\\/]dropbox( \([^\\/]+\))?([\\/]|$)/i],
  ['Google Drive', /[\\/](google ?drive|my drive|googledrive)([\\/]|$)/i],
  ['iCloud Drive', /[\\/](icloud ?drive|mobile documents)([\\/]|$)/i],
  ['Box', /[\\/]box( sync)?([\\/]|$)/i],
];
/** 'OneDrive' | 'Dropbox' | 'Google Drive' | 'iCloud Drive' | 'Box' when p is inside a cloud-synced folder, else null. */
export function syncedFolderKind(p, env = {}) {
  const s = String(p || '');
  if (!s) return null;
  const roots = [env.OneDrive, env.OneDriveConsumer, env.OneDriveCommercial].filter(Boolean).map(r => r.toLowerCase().replace(/[\\/]+$/, ''));
  const low = s.toLowerCase();
  if (roots.some(r => low === r || low.startsWith(r + '\\') || low.startsWith(r + '/'))) return 'OneDrive';
  for (const [name, re] of CLOUD_NAMES) if (re.test(s)) return name;
  return null;
}

// ─── Names ────────────────────────────────────────────────────────────────
/** YYYY-MM-DD in the computer's own time (the date a person reads in a folder name). */
export function localDate(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The new name of the old folder: '<name> (moved to <where> on <date>)'.
 * <where> is the new path made safe for a folder name (no : \ / and the like),
 * shortened from the home folder and to its last parts so the name stays short.
 */
export function movedFolderName(name, to, date, { home, platform = process.platform } = {}) {
  const p = P(platform);
  let where = String(to || '');
  if (home && isUnder(where, home, platform) && !samePath(where, home, platform)) where = p.relative(p.resolve(home), p.resolve(where));
  let parts = where.split(/[\\/]+/).map(s => s.replace(/:$/, '')).filter(Boolean);
  while (parts.length > 1 && parts.join('-').length > 48) parts = parts.slice(1);
  const safe = parts.join('-').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().slice(-48) || 'another folder';
  return `${name} (moved to ${safe} on ${date})`;
}

/** The first of base, 'base 2', 'base 3' ... that exists() says is free. */
export function freeName(base, exists) {
  if (!exists(base)) return base;
  for (let i = 2; i < 1000; i++) if (!exists(`${base} ${i}`)) return `${base} ${i}`;
  throw new Error('no free folder name');
}

// ─── Start-up commands ────────────────────────────────────────────────────
/** A Windows command line as tokens: [{text, quoted}]. */
export function splitCommand(cmd) {
  const out = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(String(cmd || '')))) out.push(m[1] !== undefined ? { text: m[1], quoted: true } : { text: m[2], quoted: false });
  return out;
}
export const joinCommand = (tokens) => tokens.map(t => (t.quoted || /\s/.test(t.text) ? `"${t.text}"` : t.text)).join(' ');

/**
 * A start-up command (the Run entry, the dashboard-start:// handler) re-pointed:
 * every path token mapped; the --data-dir value mapped, added when the data
 * folder moved away from the app's default place, and dropped when it is the
 * new app's default (<app>/data). Returns the same string when nothing changes.
 */
export function repointCommand(cmd, mappings, { dataDir, defaultDataDir, platform = 'win32' } = {}) {
  const toks = splitCommand(cmd);
  if (!toks.length) return cmd;
  const mapped = toks.map(t => ({ ...t, text: mapPath(t.text, mappings, platform) }));
  const isLauncher = mapped.some(t => /(start-hidden\.mjs|start-opendash\.(bat|sh)|start-dashboard\.(bat|sh))$/i.test(t.text));
  const i = mapped.findIndex(t => t.text === '--data-dir');
  if (i >= 0 && mapped[i + 1]) {
    if (defaultDataDir && samePath(mapped[i + 1].text, defaultDataDir, platform)) mapped.splice(i, 2);
  } else if (isLauncher && dataDir && !(defaultDataDir && samePath(dataDir, defaultDataDir, platform))) {
    mapped.push({ text: '--data-dir', quoted: false }, { text: trimSep(dataDir, platform), quoted: true });
  }
  const out = joinCommand(mapped);
  return joinCommand(toks) === out ? cmd : out;
}

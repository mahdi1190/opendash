/* ============================================================
   FILES & LINKS: the pure resource model (owner: Files & links).
   No DOM, no page globals: lib/resources.mjs evaluates this file in Node so
   the page, the actions layer (MCP + assistant) and migration 070 parse,
   validate and filter resources with exactly the same rules.

   A resource (state.resources[]):
     { id, kind: 'folder'|'file'|'url'|'github'|'drive'|'snippet',
       label, target (absolute path, http(s) URL, or the snippet text),
       lang (snippets), note, pinned, createdAt,
       links: [{ type: 'task'|'stream'|'person'|'section', id }] }

   rsrcDetect(text)        one pasted line -> {kind, target, label} | null
   rsrcParseMany(text)     several lines   -> {items, rejected}
   rsrcGithub(url)         -> {owner, repo, type: repo|pr|issue|tree|blob|commit|..., number?} | null
   rsrcDrive(url)          -> {type: doc|sheet|slides|form|folder|file, id} | null
   rsrcFileType(name)      -> pptx|pdf|docx|xlsx|code|image|archive|video|audio|text|exec|file
   rsrcIcon(r) rsrcKindLabel(r) rsrcDisplayLabel(r) rsrcSendLine(r)
   rsrcNormalize(input, {id, now, existing}) -> resource (throws RsrcError)
   rsrcFor(list, type, id) rsrcFilter(list, filter) rsrcFindSame(list, kind, target)
   ============================================================ */
const RSRC_KINDS = Object.freeze(['folder', 'file', 'url', 'github', 'drive', 'snippet']);
const RSRC_LINK_TYPES = Object.freeze(['task', 'stream', 'person', 'section']);
const RSRC_LIMITS = Object.freeze({ label: 120, target: 2000, snippet: 20000, note: 2000, links: 50, lang: 24, id: 160 });
const RSRC_PATH_KINDS = Object.freeze(['folder', 'file']);
const RSRC_URL_KINDS = Object.freeze(['url', 'github', 'drive']);

// Files the dashboard never opens in their app (they would RUN): Reveal still works.
const RSRC_EXEC_EXT = Object.freeze(['exe', 'com', 'bat', 'cmd', 'ps1', 'psm1', 'psd1', 'vbs', 'vbe', 'js', 'jse', 'mjs', 'cjs', 'wsf', 'wsh', 'ws',
  'msi', 'msp', 'mst', 'scr', 'hta', 'cpl', 'lnk', 'url', 'reg', 'pif', 'application', 'gadget', 'jar', 'appref-ms', 'msc', 'scf', 'inf',
  'sys', 'dll', 'ocx', 'appx', 'appxbundle', 'msix', 'msixbundle', 'settingcontent-ms', 'library-ms', 'search-ms', 'searchconnector-ms',
  'diagcab', 'chm', 'iso', 'img', 'vhd', 'vhdx', 'xll', 'xlam', 'ppam', 'sh', 'bash', 'zsh', 'command', 'tool', 'app', 'desktop', 'appimage', 'run', 'bin', 'py', 'pyw', 'pl', 'rb',
  // more things that run, install or connect when opened (Windows, macOS bundles and installers, Linux packages)
  'vb', 'wsc', 'sct', 'shb', 'shs', 'msu', 'ps1xml', 'psc1', 'xbap', 'website', 'wsb', 'rdp', 'appinstaller', 'vsix', 'vsto', 'hlp',
  'mde', 'ade', 'adp', 'accde', 'theme', 'themepack', 'deskthemepack', 'ins', 'isp', 'jnlp', 'pyz', 'pyzw', 'pyc',
  'pkg', 'mpkg', 'dmg', 'workflow', 'action', 'prefpane', 'terminal', 'webloc', 'inetloc', 'fileloc', 'mobileconfig', 'scpt', 'scptd', 'applescript',
  'deb', 'rpm', 'flatpakref', 'snap']);

const _RSRC_TYPES = {
  pptx: ['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'odp', 'key'],
  pdf: ['pdf'],
  docx: ['doc', 'docx', 'docm', 'odt', 'rtf', 'pages'],
  xlsx: ['xls', 'xlsx', 'xlsm', 'csv', 'tsv', 'ods', 'numbers', 'parquet'],
  code: ['py', 'ipynb', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'json', 'yaml', 'yml', 'toml', 'm', 'r', 'jl', 'c', 'h', 'cpp', 'hpp', 'cs', 'java', 'go', 'rs', 'rb', 'php',
    'sh', 'ps1', 'bat', 'cmd', 'sql', 'tex', 'bib', 'cls', 'sty', 'html', 'css', 'xml', 'gms', 'gdx', 'mod', 'f90', 'f', 'ini', 'cfg', 'lock'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'eps', 'emf', 'ico'],
  archive: ['zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'bz2', 'xz'],
  video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'],
  audio: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac'],
  text: ['txt', 'md', 'markdown', 'log', 'rst'],
};
const _RSRC_TYPE_LABEL = { pptx: 'Presentation', pdf: 'PDF', docx: 'Document', xlsx: 'Spreadsheet', code: 'Code', image: 'Image', archive: 'Archive',
  video: 'Video', audio: 'Audio', text: 'Text', exec: 'Program', file: 'File' };
const _RSRC_TYPE_ICON = { pptx: 'presentation', pdf: 'file-text', docx: 'file-pen-line', xlsx: 'file-spreadsheet', code: 'file-code', image: 'file-image',
  archive: 'file-archive', video: 'file-video', audio: 'file-audio', text: 'file-text', exec: 'file', file: 'file' };

function RsrcError(code, message, field) {
  const e = new Error(message);
  e.name = 'RsrcError'; e.code = code; e.field = field || null;
  return e;
}

const _rsrcCtrl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
function _rsrcLine(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function _rsrcText(v, max) {
  return String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(_rsrcCtrl, '').slice(0, max);
}
function _rsrcUnquote(s) {
  let t = String(s == null ? '' : s).trim();
  for (let i = 0; i < 2; i++) {
    if (t.length >= 2 && ((t[0] === '"' && t[t.length - 1] === '"') || (t[0] === "'" && t[t.length - 1] === "'") || (t[0] === '<' && t[t.length - 1] === '>'))) t = t.slice(1, -1).trim();
  }
  return t;
}

/** The last path segment ('' for a drive root). */
function rsrcBaseName(p) {
  const parts = String(p || '').replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts[parts.length - 1] || '';
}
/** Lower-case extension without the dot ('' when none). */
function rsrcExt(name) {
  const b = rsrcBaseName(name);
  const i = b.lastIndexOf('.');
  return i > 0 && i < b.length - 1 ? b.slice(i + 1).toLowerCase() : '';
}
function rsrcIsExecutable(name) { return RSRC_EXEC_EXT.includes(rsrcExt(name)); }
/** pptx | pdf | docx | xlsx | code | image | archive | video | audio | text | exec | file */
function rsrcFileType(name) {
  const e = rsrcExt(name);
  if (!e) return 'file';
  for (const k of Object.keys(_RSRC_TYPES)) if (_RSRC_TYPES[k].includes(e)) return k;
  if (RSRC_EXEC_EXT.includes(e)) return 'exec';
  return 'file';
}
function rsrcFileTypeLabel(t) { return _RSRC_TYPE_LABEL[t] || 'File'; }
function rsrcFileTypeIcon(t) { return _RSRC_TYPE_ICON[t] || 'file'; }

/** A local absolute path the dashboard accepts: C:\... or /..., never a network (UNC) or device path. */
function rsrcIsLocalPath(p) {
  const s = String(p || '');
  if (!s || s.length > RSRC_LIMITS.target || /[\u0000-\u001f\u007f"<>|*?]/.test(s.replace(/^[A-Za-z]:/, ''))) return false;
  if (/^[\\/]{2}/.test(s)) return false;                         // \\server\share, //server, \\?\ device paths
  if (s.split(/[\\/]+/).some(seg => seg === '..' || seg === '.')) return false;
  if (/^[A-Za-z]:[\\/]/.test(s)) return !/:/.test(s.slice(2));   // no alternate data streams (file:stream)
  return /^\/[^/]/.test(s) || s === '/';
}
/** Tidy a path for storage: one slash style per family, no trailing separator (except a root). */
function rsrcNormPath(p) {
  let s = _rsrcUnquote(p);
  if (/^[A-Za-z]:[\\/]/.test(s)) {
    s = s[0].toUpperCase() + ':\\' + s.slice(3).replace(/[\\/]+/g, '\\');
    if (s.length > 3) s = s.replace(/\\+$/, '');
    return s;
  }
  if (s.startsWith('/')) { s = s.replace(/\/+/g, '/'); if (s.length > 1) s = s.replace(/\/+$/, ''); return s; }
  return s;
}
function _rsrcFileUrlToPath(u) {
  const m = /^file:\/\/(?:localhost)?\/?(.*)$/i.exec(u);
  if (!m) return null;
  let rest;
  try { rest = decodeURIComponent(m[1]); } catch (e) { return null; }
  if (/^[A-Za-z]:[\\/]/.test(rest)) return rest;
  if (/^[A-Za-z]\|[\\/]/.test(rest)) return rest[0] + ':' + rest.slice(2);
  return '/' + rest.replace(/^\/+/, '');
}

/** An http(s) URL without credentials, or '' (never javascript:, data:, file:...). */
function rsrcSafeUrl(u) {
  const s = String(u || '').trim();
  if (!/^https?:\/\/[^\s<>"'`\\]+$/i.test(s) || s.length > RSRC_LIMITS.target) return '';
  const m = /^(https?:\/\/)([^/?#]*)(.*)$/i.exec(s);
  if (!m) return '';
  const host = m[2].replace(/^[^@]*@/, '');                    // drop user:token@
  if (!host || !/^[A-Za-z0-9.\-[\]:]+$/.test(host)) return '';
  return m[1].toLowerCase() + host + m[3];
}

/**
 * GitHub URL -> {owner, repo, type, number?, ref?, path?, url (canonical repo url)}.
 * Accepts https://github.com/o/r[.git][/pull/1|/issues/1|/tree/..|/blob/..|/commit/..|...] and git@github.com:o/r.git.
 */
function rsrcGithub(url) {
  let s = String(url || '').trim();
  const ssh = /^(?:ssh:\/\/)?git@github\.com[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i.exec(s);
  if (ssh) s = `https://github.com/${ssh[1]}/${ssh[2]}`;
  s = rsrcSafeUrl(s);
  const m = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?(?:\/([^?#]*))?(?:[?#].*)?$/i.exec(s);
  if (!m) return null;
  const owner = m[1], repo = m[2];
  if (['orgs', 'settings', 'marketplace', 'features', 'topics', 'collections', 'sponsors', 'notifications', 'login', 'about', 'pricing', 'explore'].includes(owner.toLowerCase())) return null;
  const rest = (m[3] || '').replace(/\/+$/, '').split('/').filter(Boolean);
  const out = { owner, repo, type: 'repo', url: `https://github.com/${owner}/${repo}` };
  const n = rest[1] && /^\d{1,9}$/.test(rest[1]) ? Number(rest[1]) : null;
  if (rest[0] === 'pull' && n) Object.assign(out, { type: 'pr', number: n });
  else if (rest[0] === 'issues' && n) Object.assign(out, { type: 'issue', number: n });
  else if (rest[0] === 'discussions' && n) Object.assign(out, { type: 'discussion', number: n });
  else if ((rest[0] === 'tree' || rest[0] === 'blob') && rest[1]) Object.assign(out, { type: rest[0], ref: rest[1], path: rest.slice(2).join('/') });
  else if (rest[0] === 'commit' && rest[1]) Object.assign(out, { type: 'commit', ref: rest[1].slice(0, 12) });
  else if (rest[0] === 'releases') out.type = 'releases';
  else if (rest[0] === 'actions') out.type = 'actions';
  else if (rest[0] === 'pulls') out.type = 'pulls';
  else if (rest[0] === 'issues') out.type = 'issues';
  else if (rest[0] === 'wiki') out.type = 'wiki';
  return out;
}
/** "owner/repo #12", "owner/repo", "owner/repo: path/file.py". */
function rsrcGithubLabel(g) {
  if (!g) return '';
  const base = `${g.owner}/${g.repo}`;
  if (g.number) return `${base} #${g.number}`;
  if (g.type === 'blob' || g.type === 'tree') return g.path ? `${base}: ${g.path}` : `${base} (${g.ref})`;
  if (g.type === 'commit') return `${base} @${g.ref}`;
  if (['releases', 'actions', 'pulls', 'issues', 'wiki'].includes(g.type)) return `${base} ${g.type}`;
  return base;
}

/** Google Drive / Docs URL -> {type, id}. */
function rsrcDrive(url) {
  const s = rsrcSafeUrl(url);
  if (!s) return null;
  let m = /^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation|forms|drawings)\/(?:u\/\d+\/)?d\/(?:e\/)?([A-Za-z0-9_-]{10,})/i.exec(s);
  if (m) return { type: { document: 'doc', spreadsheets: 'sheet', presentation: 'slides', forms: 'form', drawings: 'drawing' }[m[1].toLowerCase()], id: m[2] };
  m = /^https:\/\/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?(?:mobile\/)?folders|folderview\?id=)\/?([A-Za-z0-9_-]{10,})/i.exec(s);
  if (m) return { type: 'folder', id: m[1] };
  m = /^https:\/\/drive\.google\.com\/(?:file\/(?:u\/\d+\/)?d\/|open\?id=|uc\?(?:export=\w+&)?id=)([A-Za-z0-9_-]{10,})/i.exec(s);
  if (m) return { type: 'file', id: m[1] };
  if (/^https:\/\/(drive|docs)\.google\.com\//i.test(s)) return { type: 'file', id: '' };
  return null;
}
const _RSRC_DRIVE_LABEL = { doc: 'Google Doc', sheet: 'Google Sheet', slides: 'Google Slides', form: 'Google Form', drawing: 'Google Drawing', folder: 'Drive folder', file: 'Drive file' };
function rsrcDriveLabel(d) { return d ? (_RSRC_DRIVE_LABEL[d.type] || 'Drive file') : 'Drive file'; }

function _rsrcDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
/** "example.org" or "example.org › page-name". */
function _rsrcUrlLabel(u) {
  const m = /^https?:\/\/(?:www\.)?([^/?#]+)([^?#]*)/i.exec(u);
  if (!m) return u.slice(0, 60);
  const last = m[2].split('/').filter(Boolean).pop();
  return _rsrcLine(last ? `${m[1]} › ${_rsrcDecode(last)}` : m[1], 80);
}

/**
 * One pasted line -> {kind, target, label} or null when it is neither a path nor a link.
 * opts.isDir(path) -> true|false|null lets Node decide file vs folder for real.
 */
function rsrcDetect(text, opts) {
  opts = opts || {};
  let t = _rsrcUnquote(String(text == null ? '' : text).replace(_rsrcCtrl, '').trim());
  if (!t || t.length > RSRC_LIMITS.target) return null;
  // Markdown link [label](url)
  const md = /^\[([^\]]{1,120})\]\((\S+)\)$/.exec(t);
  let given = '';
  if (md) { given = md[1]; t = md[2]; }
  if (/^file:\/\//i.test(t)) { const p = _rsrcFileUrlToPath(t); if (!p) return null; t = p; }
  if (/^git@github\.com:/i.test(t) || /^ssh:\/\/git@github\.com\//i.test(t)) t = (rsrcGithub(t) || {}).url || t;
  if (/^www\./i.test(t)) t = 'https://' + t;
  if (/^https?:\/\//i.test(t)) {
    const u = rsrcSafeUrl(t);
    if (!u) return null;
    const g = rsrcGithub(u);
    if (g) return { kind: 'github', target: u, label: given || rsrcGithubLabel(g) };
    const d = rsrcDrive(u);
    if (d) return { kind: 'drive', target: u, label: given || rsrcDriveLabel(d) };
    return { kind: 'url', target: u, label: given || _rsrcUrlLabel(u) };
  }
  if (/^[\\/]{2}/.test(t)) return null;                     // network (UNC) and device paths
  if (/^~[\\/]/.test(t) && opts.home) t = String(opts.home).replace(/[\\/]+$/, '') + t.slice(1);
  if (/^[A-Za-z]:[\\/]/.test(t) || t.startsWith('/')) {
    const trailing = /[\\/]$/.test(t);
    const p = rsrcNormPath(t);
    if (!rsrcIsLocalPath(p)) return null;
    let dir = typeof opts.isDir === 'function' ? opts.isDir(p) : null;
    if (dir === null || dir === undefined) dir = trailing || !rsrcExt(p) || /^[A-Za-z]:\\?$/.test(p);
    const base = rsrcBaseName(p) || p;
    return { kind: dir ? 'folder' : 'file', target: p, label: given || base };
  }
  return null;
}

/** Several lines (a multi-line paste) -> {items:[detected], rejected:[line]} (duplicates dropped). */
function rsrcParseMany(text, opts) {
  const items = [], rejected = [], seen = new Set();
  for (const raw of String(text == null ? '' : text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const r = rsrcDetect(line.replace(/^[-*•]\s+/, ''), opts);
    if (!r) { rejected.push(line.slice(0, 200)); continue; }
    const k = r.kind + '|' + rsrcTargetKey(r.kind, r.target);
    if (seen.has(k)) continue;
    seen.add(k); items.push(r);
  }
  return { items, rejected };
}

/** Comparison key for "the same target" (Windows paths are case-insensitive). */
function rsrcTargetKey(kind, target) {
  const t = String(target || '');
  if (RSRC_PATH_KINDS.includes(kind)) return /^[A-Za-z]:/.test(t) ? rsrcNormPath(t).toLowerCase() : rsrcNormPath(t);
  if (RSRC_URL_KINDS.includes(kind)) return t.replace(/\/+$/, '').replace(/^http:/i, 'https:');
  return t;
}
function rsrcFindSame(list, kind, target) {
  if (kind === 'snippet') return null;
  const key = rsrcTargetKey(kind, target);
  const fam = RSRC_PATH_KINDS.includes(kind) ? RSRC_PATH_KINDS : RSRC_URL_KINDS;
  return (Array.isArray(list) ? list : []).find(r => r && fam.includes(r.kind) && rsrcTargetKey(r.kind, r.target) === key) || null;
}

function _rsrcLinkKey(l) { return l.type + ':' + l.id; }
function rsrcNormLinks(links, field) {
  const out = [], seen = new Set();
  if (links == null) return out;
  if (!Array.isArray(links)) throw RsrcError('BAD_VALUE', 'links must be a list of {type, id}', field || 'links');
  links.forEach((l, i) => {
    if (!l || typeof l !== 'object') throw RsrcError('BAD_VALUE', `links[${i}] must be {type, id}`, `${field || 'links'}[${i}]`);
    const type = String(l.type || '').trim().toLowerCase();
    const id = _rsrcLine(l.id, RSRC_LIMITS.id);
    if (!RSRC_LINK_TYPES.includes(type)) throw RsrcError('BAD_VALUE', `links[${i}].type must be one of ${RSRC_LINK_TYPES.join(', ')}`, `${field || 'links'}[${i}].type`);
    if (!id || ['__proto__', 'constructor', 'prototype'].includes(id)) throw RsrcError('BAD_VALUE', `links[${i}].id is empty`, `${field || 'links'}[${i}].id`);
    const k = type + ':' + id;
    if (!seen.has(k)) { seen.add(k); out.push({ type, id }); }
  });
  if (out.length > RSRC_LIMITS.links) throw RsrcError('BAD_VALUE', `at most ${RSRC_LIMITS.links} links`, field || 'links');
  return out;
}

/**
 * A clean resource from user/model input. input: {kind?, target, label?, lang?, note?, pinned?, links?}.
 * kind is detected from the target when missing (a snippet needs kind:'snippet').
 * Throws RsrcError(code, message, field).
 */
function rsrcNormalize(input, o) {
  o = o || {};
  const inp = input && typeof input === 'object' ? input : {};
  let kind = inp.kind == null || inp.kind === '' ? '' : String(inp.kind).trim().toLowerCase();
  if (kind && !RSRC_KINDS.includes(kind)) throw RsrcError('BAD_VALUE', `kind must be one of ${RSRC_KINDS.join(', ')}`, 'kind');
  let target, label = _rsrcLine(inp.label, RSRC_LIMITS.label), lang = '';
  if (kind === 'snippet') {
    target = _rsrcText(inp.target, RSRC_LIMITS.snippet);
    if (!target.trim()) throw RsrcError('BAD_VALUE', 'a snippet needs some text (target)', 'target');
    lang = _rsrcLine(inp.lang, RSRC_LIMITS.lang).toLowerCase().replace(/[^a-z0-9+#._-]/g, '');
    if (!label) label = lang ? `${lang} snippet` : _rsrcLine(target.split('\n').find(x => x.trim()) || 'Snippet', 60);
  } else {
    const d = rsrcDetect(inp.target, o);
    if (!d) {
      const raw = String(inp.target == null ? '' : inp.target).trim();
      if (/^[\\/]{2}[^\\/]/.test(raw)) throw RsrcError('BAD_TARGET', 'network (UNC) paths are not supported: use a local path or a link', 'target');
      if (/^(javascript|data|vbscript|file|ftp|smb):/i.test(raw)) throw RsrcError('BAD_TARGET', 'only http(s) links and local absolute paths are allowed', 'target');
      throw RsrcError('BAD_TARGET', 'target must be an absolute local path (C:\\... or /...) or an http(s) link; for text use kind:"snippet"', 'target');
    }
    if (!kind) kind = d.kind;
    else if (RSRC_PATH_KINDS.includes(kind) !== RSRC_PATH_KINDS.includes(d.kind)) {
      throw RsrcError('BAD_TARGET', RSRC_PATH_KINDS.includes(kind) ? `a ${kind} needs a local path` : `a ${kind} needs an http(s) link`, 'target');
    } else if (kind === 'github' && d.kind !== 'github') throw RsrcError('BAD_TARGET', 'not a GitHub link (https://github.com/owner/repo...)', 'target');
    else if (kind === 'drive' && d.kind !== 'drive') throw RsrcError('BAD_TARGET', 'not a Google Drive link', 'target');
    else if (kind === 'url' && (d.kind === 'github' || d.kind === 'drive')) kind = d.kind;
    target = d.target;
    if (!label) label = d.label;
  }
  const out = {
    id: _rsrcLine(o.id || inp.id, RSRC_LIMITS.id) || ('r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
    kind, label, target,
    ...(kind === 'snippet' && lang ? { lang } : {}),
    note: _rsrcText(inp.note, RSRC_LIMITS.note).trim(),
    pinned: !!inp.pinned,
    links: rsrcNormLinks(inp.links, 'links'),
    createdAt: Number(inp.createdAt) > 0 ? Number(inp.createdAt) : (o.now || Date.now()),
  };
  if (!out.note) delete out.note;
  return out;
}

/** Resources linked to one thing. */
function rsrcFor(list, type, id) {
  return (Array.isArray(list) ? list : []).filter(r => r && Array.isArray(r.links) && r.links.some(l => l && l.type === type && l.id === id))
    .sort((a, b) => (!!b.pinned - !!a.pinned) || ((a.createdAt || 0) - (b.createdAt || 0)));
}

/** filter: {kind, type+id (or task/stream/person/section), q, pinned, unlinked} */
function rsrcFilter(list, f) {
  f = f || {};
  const q = String(f.q || '').trim().toLowerCase();
  const link = f.type && f.id ? { type: f.type, id: f.id } : f.task ? { type: 'task', id: f.task } : f.stream ? { type: 'stream', id: f.stream }
    : f.person ? { type: 'person', id: f.person } : f.section ? { type: 'section', id: f.section } : null;
  return (Array.isArray(list) ? list : []).filter(r => {
    if (!r || typeof r !== 'object') return false;
    if (f.kind && r.kind !== f.kind) return false;
    if (f.pinned === true && !r.pinned) return false;
    if (f.unlinked && Array.isArray(r.links) && r.links.length) return false;
    if (link && !(Array.isArray(r.links) && r.links.some(l => l.type === link.type && l.id === link.id))) return false;
    if (q) {
      const hay = [r.label, r.kind === 'snippet' ? '' : r.target, r.note, r.lang, rsrcKindLabel(r)].join(' ').toLowerCase();
      if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    return true;
  });
}

/** The sprite icon for a resource. */
function rsrcIcon(r) {
  if (!r) return 'link';
  if (r.kind === 'folder') return 'folder';
  if (r.kind === 'file') return rsrcFileTypeIcon(rsrcFileType(r.target));
  if (r.kind === 'snippet') return 'square-code';
  if (r.kind === 'github') {
    const g = rsrcGithub(r.target);
    if (!g) return 'git-branch';
    return g.type === 'pr' || g.type === 'pulls' ? 'git-pull-request' : g.type === 'issue' || g.type === 'issues' ? 'circle-dot' : g.type === 'commit' ? 'git-merge' : g.type === 'blob' ? 'file-code' : 'folder-git-2';
  }
  if (r.kind === 'drive') {
    const d = rsrcDrive(r.target);
    return !d ? 'hard-drive' : d.type === 'slides' ? 'presentation' : d.type === 'sheet' ? 'file-spreadsheet' : d.type === 'doc' ? 'file-text' : d.type === 'folder' ? 'folder' : 'hard-drive';
  }
  return 'link';
}
/** "Folder", "Presentation · PPTX", "GitHub pull request", "Google Slides", "Snippet · python", "Link · example.org". */
function rsrcKindLabel(r) {
  if (!r) return '';
  if (r.kind === 'folder') return 'Folder';
  if (r.kind === 'file') { const t = rsrcFileType(r.target); const e = rsrcExt(r.target); return rsrcFileTypeLabel(t) + (e ? ' · ' + e.toUpperCase() : ''); }
  if (r.kind === 'snippet') return 'Snippet' + (r.lang ? ' · ' + r.lang : '');
  if (r.kind === 'github') {
    const g = rsrcGithub(r.target);
    return !g ? 'GitHub' : g.type === 'pr' ? 'GitHub pull request' : g.type === 'issue' ? 'GitHub issue' : g.type === 'blob' ? 'GitHub file' : g.type === 'tree' ? 'GitHub folder' : g.type === 'commit' ? 'GitHub commit' : 'GitHub repo';
  }
  if (r.kind === 'drive') return rsrcDriveLabel(rsrcDrive(r.target));
  const m = /^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(String(r.target || ''));
  return 'Link' + (m ? ' · ' + m[1] : '');
}
function rsrcDisplayLabel(r) {
  if (!r) return '';
  if (r.label) return r.label;
  if (r.kind === 'github') return rsrcGithubLabel(rsrcGithub(r.target)) || 'GitHub';
  if (RSRC_PATH_KINDS.includes(r.kind)) return rsrcBaseName(r.target) || r.target;
  return String(r.target || '').slice(0, 60);
}
/** What "Send" copies: a ready-to-paste line for an email or a chat. */
function rsrcSendLine(r) {
  if (!r) return '';
  const name = rsrcDisplayLabel(r);
  if (r.kind === 'snippet') return `${name}:\n${r.target}`;
  if (r.kind === 'folder') return `${name} (folder): ${r.target}`;
  if (r.kind === 'file') return `${name}: ${r.target}`;
  return name && name !== r.target ? `${name}: ${r.target}` : String(r.target);
}
/** The link for "Copy link": file:/// URLs for paths, the URL itself otherwise. */
function rsrcLinkOf(r) {
  if (!r) return '';
  if (RSRC_PATH_KINDS.includes(r.kind)) {
    const p = String(r.target).replace(/\\/g, '/');
    return 'file:///' + p.replace(/^\/+/, '').split('/').map(s => /^[A-Za-z]:$/.test(s) ? s : encodeURIComponent(s)).join('/');
  }
  if (r.kind === 'snippet') return '';
  return String(r.target);
}

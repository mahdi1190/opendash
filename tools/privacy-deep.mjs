// tools/privacy-deep.mjs - the deep pass of tools/privacy-scan.mjs (--deep).
//
// The ordinary scan matches the private terms as whole words. Before a public
// release, run the deep pass too:
//
//   node tools/privacy-scan.mjs <export> --terms-from <data dir> --deep
//
// It adds, from the data folder (read only; nothing is ever printed but a
// number and a kind): organisations, places, merchants, multi-word stream,
// tag, task, event and e-mail titles, proper nouns and codes inside titles,
// record ids, links and web hosts, e-mail domains and saved coordinates; and
// this computer's user name, computer name and folder names. Then, in every
// text file and file name, it looks for:
//   - every private term, also inside identifiers (camelCase, snake_case,
//     digits), glued to other words (names of 6+ letters), with accents
//     dropped or invisible characters inserted;
//   - MD5 / SHA-1 / SHA-256 hashes of private e-mail addresses and names
//     (a Gravatar link names its owner);
//   - text hidden by encoding: base64 (data: URIs too; their images get the
//     metadata checks), %-encoding, \u / \x escapes and HTML character
//     references are decoded and every rule runs again on the result;
//   - machine identifiers: Windows SIDs and default computer names, MAC
//     addresses and public IPv4 addresses (rule machine-id);
//   - coordinates within 25 km of a location saved in the data folder (rule
//     near-location).
// Findings use the same rules, allowlist and line_sha256 pins as the ordinary
// scan. Zero dependencies.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { hostname, userInfo } from 'node:os';
import { scanText, scanFile, lineHash, emailAllowed, COMMON_WORDS } from './privacy-scan.mjs';

// ─── Tokens ────────────────────────────────────────────────────────────────
// Invisible characters someone could slip into a name (soft hyphen, zero-width
// space/joiners, bidi marks, word joiner, BOM): part of a token, then dropped.
const INVIS = '\\u00AD\\u034F\\u061C\\u180E\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF';
const DROP = new RegExp(`[\\p{M}${INVIS}]`, 'gu');
const TOKEN = new RegExp(`[\\p{L}\\p{N}\\p{M}${INVIS}]+`, 'gu');
// Parts of an identifier: XMLParser -> XML Parser, danaQuembly2 -> dana Quembly 2.
const SUBTOKEN = /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?[^\p{Lu}\p{N}]+|\p{Lu}+|\p{N}+/gu;
const HAS_INNER = /\p{Ll}\p{Lu}|\p{L}\p{N}|\p{N}\p{L}/u;

/** Lower case, compatibility forms unfolded, accents and invisible characters dropped. */
export const fold = (s) => String(s).normalize('NFKD').replace(DROP, '').toLowerCase();
/** The folded words of a term: "José O'Neil" -> ['jose', 'o', 'neil']. */
export const termTokens = (s) => fold(s).match(/[\p{L}\p{N}]+/gu) || [];

/** Tokens of a text with positions: plain words, and identifier parts (each with the word it is part of). */
export function textTokens(text) {
  const plain = [], sub = [];
  for (const m of String(text).matchAll(TOKEN)) {
    const raw = m[0], start = m.index, end = start + raw.length;
    const v = fold(raw);
    if (!v) continue;
    const p = { v, start, end };
    plain.push(p);
    if (HAS_INNER.test(raw)) {
      for (const s of raw.matchAll(SUBTOKEN)) {
        const sv = fold(s[0]);
        if (sv) sub.push({ v: sv, start: start + s.index, end: start + s.index + s[0].length, word: p });
      }
    } else sub.push({ ...p, word: p });
  }
  return { plain, sub };
}

/**
 * A matcher for many terms at once (thousands are fine): a term matches a run
 * of tokens with at most 4 non-word characters, and no line break, between them.
 * terms: [{n, term, note, glue?}] -> {find(list, text) -> [{start, end, t}], glued(token) -> [t]}
 */
export function tokenMatcher(terms) {
  const first = new Map(), glue = [];
  for (const t of terms) {
    const toks = termTokens(t.term);
    if (!toks.length) continue;
    if (!first.has(toks[0])) first.set(toks[0], []);
    first.get(toks[0]).push({ t, toks });
    if (t.glue && toks.length === 1 && toks[0].length >= 6) glue.push({ t, v: toks[0] });
  }
  for (const list of first.values()) list.sort((a, b) => b.toks.length - a.toks.length);
  const find = (list, text) => {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const cands = first.get(list[i].v);
      if (!cands) continue;
      for (const c of cands) {
        const k = c.toks.length;
        if (i + k > list.length) continue;
        let ok = true;
        for (let j = 1; j < k && ok; j++) {
          const gap = text.slice(list[i + j - 1].end, list[i + j].start);
          ok = list[i + j].v === c.toks[j] && gap.length <= 4 && !gap.includes('\n');
        }
        if (ok) { out.push({ start: list[i].start, end: list[i + k - 1].end, t: c.t, i, k }); break; }
      }
    }
    return out;
  };
  const cache = new Map();
  const glued = (v) => {
    if (!glue.length || v.length < 7) return [];
    if (!cache.has(v)) cache.set(v, glue.filter(g => v.length > g.v.length && v.includes(g.v)).map(g => g.t));
    return cache.get(v);
  };
  return { find, glued, size: terms.length };
}

// ─── Terms from a data folder ─────────────────────────────────────────────
const STOP = new Set(`
  monday tuesday wednesday thursday friday saturday sunday mon tue tues wed thu thur thurs fri sat sun
  january february march april may june july august september october november december jan feb mar apr jun jul aug sep sept oct nov dec
  the and for with from into onto about after before this that these those then than next last first second third final draft
  review meeting call email reply send check update book pay buy plan prep read write finish start submit fix make take get
  daily weekly monthly yearly today tomorrow yesterday tonight morning evening afternoon night weekend
  api mcp pdf csv ics css html json url uri utc bst gmt cet ai ui ux cv faq todo asap fyi eta etc tbc tbd n/a pm am
  claude anthropic google gmail zoom teams outlook excel word powerpoint python github git latex overleaf slack notion drive docs
  sheets slides windows chrome edge firefox safari apple iphone ipad android amazon microsoft linkedin youtube spotify netflix
  whatsapp paypal visa mastercard opendash node javascript npm http https www com org net uk co ac gov edu io app
  phd msc bsc mba uk usa eu nhs bbc
`.trim().split(/\s+/));
const PUBLIC_DOMAINS = new Set(`
  gmail.com googlemail.com google.com google.co.uk hotmail.com hotmail.co.uk outlook.com live.com live.co.uk msn.com
  yahoo.com yahoo.co.uk icloud.com me.com mac.com aol.com protonmail.com proton.me pm.me gmx.com mail.com zoho.com
  github.com githubusercontent.com github.io microsoft.com office.com office365.com microsoftonline.com live.net zoom.us
  apple.com amazon.com amazon.co.uk wikipedia.org anthropic.com claude.ai claude.com openai.com notion.so dropbox.com
  slack.com linkedin.com twitter.com x.com facebook.com instagram.com youtube.com youtu.be doi.org arxiv.org overleaf.com
  gstatic.com googleapis.com googleusercontent.com bbc.co.uk gov.uk open-meteo.com nodejs.org npmjs.com mozilla.org w3.org
  example.com example.org example.net localhost sciencedirect.com springer.com wiley.com elsevier.com nature.com
  researchgate.net orcid.org zenodo.org figshare.com nih.gov ncbi.nlm.nih.gov apache.org echarts.apache.org
`.trim().split(/\s+/));
const GENERIC_SUB = /^(www\d?|m|docs|drive|mail|calendar|meet|accounts|api|app|apps|support|help|en|scholar|login|portal|outlook|teams|web|pubs|link|links|lh\d)$/i;
const GENERIC_FOLDER = new Set(`
  users documents desktop downloads onedrive projects project claude code data src repos repo git github dev tmp temp home
  appdata local roaming program files windows pictures music videos public library application support
  state finance calendar email secrets logs backups opendash dashboard
  dashboard-state config inbox analysis sources connections migrations daily _system
`.trim().split(/\s+/));

const KEY_KIND = [
  [/^(org|organi[sz]ation|company|employer|institution|affiliation|school|university|college|department|dept|workplace)$/i, 'organisation'],
  [/^(location|place|venue|address|city|town|village|admin|area|region|postcode|street|where|room|building)$/i, 'place'],
  [/^(merchant|payee|counterparty|vendor|shop|store|retailer|brand|creditor|beneficiary)$/i, 'merchant'],
  [/^(title|summary|subject|label|name|heading|caption|text|displayName|calendarName|calendar|account|accountName|project|workspace)$/i, 'title'],
];
const ID_KEY = /^(id|uid|ical_?uid|etag|[a-z]+Ids?|[a-z]+_ids?)$/i;
const isPublicHost = (host) => {
  const labels = String(host).toLowerCase().replace(/\.$/, '').split('.');
  while (labels.length > 2 && GENERIC_SUB.test(labels[0])) labels.shift();
  for (let i = 0; i <= labels.length - 2; i++) if (PUBLIC_DOMAINS.has(labels.slice(i).join('.'))) return true;
  return labels.length < 2;
};
// Dates, timestamps, versions and the app's own migration ids ("010-streams-tags") are not record ids.
const looksDate = (s) => /^\d{4}-\d{2}-\d{2}|^\d{10,13}$|^v?\d+(\.\d+)+$|^\d{3}-[a-z][a-z0-9-]*$/.test(s);
const EMAIL_IN = /[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,24}/g;
const URL_IN = /\bhttps?:\/\/[^\s"'<>()[\]{}`\\|^]+/gi;

/**
 * More private terms from a data folder (read only, never printed), and the
 * coordinates saved there. baseTerms: terms already known (their hashes are
 * added). -> {terms:[{n:'e1', term, note, glue}], coords:[{lat, lon}], counts:{kind: n}}
 */
export function deriveDeepTerms(dataDir, { baseTerms = [], env = process.env, machine = true, words: wordKinds = false } = {}) {
  const found = new Map(), coords = [];
  const has = (s) => found.has(s);
  const add = (raw, kind, { glue = false, min = 4 } = {}) => {
    const s = String(raw || '').trim().replace(/\s+/g, ' ');
    const toks = termTokens(s);
    if (!toks.length || s.length > 200) return;
    const key = toks.join(' ');
    if (has(key)) return;
    const meaningful = toks.filter(t => !COMMON_WORDS.has(t) && !STOP.has(t) && !/^\d+$/.test(t));
    if (!meaningful.length) return;
    if (toks.length === 1 && (toks[0].length < min || /^\d+$/.test(toks[0]))) return;
    if (toks.length > 1 && key.replace(/ /g, '').length < 8) return;
    found.set(key, { term: s, kind, glue });
  };
  // Capitalised words and codes. In a title the first word is usually just
  // sentence case ("Book dentist"): it counts only where it is capitalised
  // later in some title too.
  const words = (s, kind, { titleCase = false } = {}) => {
    const parts = String(s).replace(/<[^>]*>/g, ' ').split(/[\s,;:/()[\]"“”'‘’!?&+|]+/).filter(Boolean);
    parts.forEach((w0, i) => {
      const w = w0.replace(/^[-.]+|[-.]+$/g, '');
      if (/^\p{Lu}{3,8}\d{0,3}$/u.test(w)) add(w, `${kind} code`, { min: 3 });             // an acronym or a project code
      else if (/^\p{Lu}[\p{Ll}'’-]{3,}$/u.test(w) && !(titleCase && i === 0)) add(w, `${kind} word`, { glue: kind !== 'title' });
    });
  };
  const email = (e) => {
    const a = String(e).toLowerCase();
    if (emailAllowed(a)) return;
    add(a, 'e-mail address');
    const dom = a.slice(a.lastIndexOf('@') + 1);
    if (!isPublicHost(dom)) add(dom, 'e-mail domain');
  };
  const link = (u0) => {
    const u = u0.replace(/[.,;:!?'")\]]+$/, '');
    let url;
    try { url = new URL(u); } catch { return; }
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!isPublicHost(host)) add(host, 'web host');
    const rest = (url.pathname + url.search).replace(/\/+$/, '');
    if (rest.length > 1) add(host + rest, 'link');
  };
  const folders = (p) => {
    for (const seg of String(p).split(/[\\/]+/)) {
      const org = /^OneDrive ?- ?(.+)$/i.exec(seg);
      if (org) { add(org[1], 'organisation', { glue: true }); continue; }
      const name = seg.replace(/\.[A-Za-z0-9]{1,5}$/, '');   // a file name counts without its extension
      if (!name || /^[A-Za-z]:$/.test(name) || name.startsWith('.') || GENERIC_FOLDER.has(name.toLowerCase())) continue;
      add(name, termTokens(name).length >= 2 ? 'folder name' : 'folder name word', { min: 3 });
    }
  };
  const str = (s, key, inFinance) => {
    if (s.length > 4000) return;
    for (const m of s.matchAll(EMAIL_IN)) email(m[0]);
    for (const m of s.matchAll(URL_IN)) link(m[0]);
    // A local path (C:\..., \\server\..., /Users/..., ~/...): its folder names.
    if (/^(?:[A-Za-z]:[\\/]|\\\\|~[\\/]|\/(?:Users|home|mnt|Volumes)\/)/.test(s) && s.length < 400) { folders(s); return; }
    if (ID_KEY.test(key)) {
      if (s.length >= 8 && s.length <= 120 && /\p{L}/u.test(s) && /\d/.test(s) && !looksDate(s)) add(s, 'record id', { min: 8 });
      return;
    }
    const kk = KEY_KIND.find(([re]) => re.test(key));
    let kind = kk ? kk[1] : null;
    if (!kind && inFinance && /^(description|desc|narrative|reference|memo|details)$/i.test(key)) kind = 'merchant';
    if (!kind || s.length > 160 || /^https?:/i.test(s)) return;
    const n = termTokens(s).length;
    if (kind === 'title') {
      if (n >= 3 || (n === 2 && s.length >= 12)) add(s, 'title');
      words(s, 'title', { titleCase: true });
    } else {
      add(s, n === 1 ? `${kind} word` : kind, { glue: true });   // one word ("Online", "Office") is often ordinary
      words(s, kind);
    }
  };
  const walk = (v, key, inFinance, depth) => {
    if (depth > 40 || v == null) return;
    if (typeof v === 'string') { str(v, key, inFinance); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x, key, inFinance, depth + 1); return; }
    if (typeof v !== 'object') return;
    const lat = Number(v.lat ?? v.latitude), lon = Number(v.lon ?? v.lng ?? v.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat || lon)) coords.push({ lat, lon });
    for (const [k, x] of Object.entries(v)) {
      if (/^(people|person|attendees|organizer|organiser|from|to|cc)$/i.test(k)) people(x);
      walk(x, k, inFinance, depth + 1);
    }
  };
  const people = (x) => {
    for (const p of [].concat(x || [])) {
      if (typeof p === 'string') { words(p, 'person name'); continue; }   // "Name <address>"
      if (!p || typeof p !== 'object') continue;
      for (const k of ['name', 'displayName', 'fullName']) if (typeof p[k] === 'string') words(p[k], 'person name');
      if (typeof p.org === 'string') add(p.org, 'organisation', { glue: true });
    }
  };
  const readJson = (f) => { try { return statSync(f).size <= 64 << 20 ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { return null; } };
  // Every JSON file of the data folder (not secrets/ or logs/); in a backups
  // folder only the 15 newest (older titles and events are there too).
  const dir = dataDir ? resolve(dataDir) : null;
  const jsonTree = (d, depth, inFinance) => {
    let names = [];
    try { names = readdirSync(d); } catch { return; }
    const items = [];
    for (const n of names) {
      const f = join(d, n);
      let st; try { st = statSync(f); } catch { continue; }
      items.push({ n, f, st });
    }
    const isBackups = /^(backups?|daily|archive)$/i.test(basename(d));
    const files = items.filter(x => x.st.isFile() && /\.json$/i.test(x.n) && !(depth === 0 && /^migrations\.json$/i.test(x.n)))   // the app's own migration ids
      .sort((a, b) => b.st.mtimeMs - a.st.mtimeMs).slice(0, isBackups ? 15 : Infinity);
    for (const x of files) { const j = readJson(x.f); if (j) walk(j, '', inFinance, 0); }
    for (const x of items) {
      if (!x.st.isDirectory() || depth >= 5 || /^(secrets|logs|node_modules|\.git)$/i.test(x.n)) continue;
      jsonTree(x.f, depth + 1, inFinance || (depth === 0 && /^finance$/i.test(x.n)));
    }
  };
  if (dir) {
    jsonTree(dir, 0, false);
    const cfg = readJson(join(dir, 'config.json'));
    const fd = cfg && typeof cfg.financeDir === 'string' && cfg.financeDir ? resolve(dir, cfg.financeDir) : null;
    if (fd && !fd.startsWith(dir)) jsonTree(fd, 1, true);
  }

  // This computer: user and computer names, and the folders the data lives in.
  if (machine) {
    let user = '';
    try { user = userInfo().username; } catch { /* none */ }
    // A short user name ("bob", "jd") is usually an ordinary word or initials: a word kind.
    for (const u of [user, env.USERNAME, env.USER, env.LOGNAME, env.USERPROFILE && basename(env.USERPROFILE)]) if (u && !/^(runner|root|user|admin|administrator)$/i.test(u)) add(u, u.length <= 4 ? 'user name word' : 'user name', { min: 3 });
    for (const h of [hostname(), env.COMPUTERNAME, env.USERDOMAIN]) if (h && !/^(localhost|runner)$/i.test(h)) add(h, h.length <= 4 ? 'computer name word' : 'computer name', { min: 3 });
    for (const p of [dir, env.OneDrive, env.OneDriveCommercial, env.OneDriveConsumer]) if (p) folders(resolve(p));
    // The folders in your home folder and in Documents (project names).
    const home = env.USERPROFILE || env.HOME;
    for (const d of home ? [home, join(home, 'Documents'), join(home, 'OneDrive', 'Documents')] : []) {
      let names = [];
      try { names = readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); } catch { continue; }
      for (const n of names) if (!/^(AppData|Application Data|Local Settings|NetHood|PrintHood|Recent|SendTo|Start Menu|Templates|Cookies|My .*|Saved Games|Searches|Links|Favorites|Contacts|3D Objects|IntelGraphicsProfiles|MicrosoftEdgeBackups|ansel|source|repos)$/i.test(n)) folders(n);
    }
  }

  // Hashes of e-mail addresses and names (Gravatar and friends).
  const hashed = new Set();
  const hashes = (s) => {
    const v = String(s).trim().toLowerCase();
    if (v.length < 4 || hashed.has(v)) return;
    hashed.add(v);
    for (const alg of ['md5', 'sha1', 'sha256']) add(createHash(alg).update(v).digest('hex'), `${alg} hash of a private term`, { min: 8 });
  };
  for (const t of baseTerms) hashes(t.term);
  for (const t of [...found.values()]) if (/^(e-mail address|organisation)$/.test(t.kind)) hashes(t.term);

  // Single capitalised words and codes (kinds "... word" / "... code") only with words:true (--deep-words):
  // many are ordinary words, so they make a long list to read.
  const base = new Set(baseTerms.map(t => termTokens(t.term).join(' ')));
  const list = [...found.entries()].filter(([k, t]) => !base.has(k) && (wordKinds || !/ (word|code)$/.test(t.kind))).map(([, t]) => t);
  const terms = list.map((t, i) => ({ n: `e${i + 1}`, term: t.term, note: `from the data folder: ${t.kind}`, glue: t.glue }));
  const counts = {};
  for (const t of list) counts[t.kind] = (counts[t.kind] || 0) + 1;
  return { terms, coords, counts };
}

// ─── Encoded text ──────────────────────────────────────────────────────────
const B64 = /(?<![A-Za-z0-9+/=_-])[A-Za-z0-9+/_-]{32,}={0,2}(?![A-Za-z0-9+/=_-])/g;
const DATA_URI = /data:([\w.+-]+\/[\w.+-]+)?(?:;[\w.+-]+=[\w.+-]+)*;base64,([A-Za-z0-9+/=\s]{16,})/g;
const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', commat: '@', period: '.', lowbar: '_', hyphen: '-', dash: '-' };
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);   // what invalid UTF-8 decodes to
const printable = (s) => { let ok = 0; for (const ch of s) if (/[\p{L}\p{N}\p{P}\p{S}\s]/u.test(ch) && ch !== REPLACEMENT_CHAR) ok++; return s.length ? ok / [...s].length : 0; };
const IMAGE_SIG = (b) => (b[0] === 0x89 && b[1] === 0x50) || (b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x47 && b[1] === 0x49);

/** Encoded spans of a text, decoded: -> [{pos, kind, text?|buf?}] (only where decoding changes something). */
export function decodedViews(text) {
  const out = [];
  const t = String(text);
  const inUri = [];
  for (const m of t.matchAll(DATA_URI)) {
    const buf = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
    inUri.push([m.index, m.index + m[0].length]);
    if (IMAGE_SIG(buf)) out.push({ pos: m.index, kind: 'a data: URI', buf, mime: m[1] || '' });
    else { const s = buf.toString('utf8'); if (printable(s) > 0.9) out.push({ pos: m.index, kind: 'a data: URI', text: s }); }
  }
  for (const m of t.matchAll(B64)) {
    if (inUri.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const s = m[0];
    if (!/[A-Z]/.test(s) || !/[a-z]/.test(s) || !/\d/.test(s)) continue;
    if (/^[0-9a-f]+$/i.test(s)) continue;   // hex, not base64
    const buf = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (buf.length < 12) continue;
    if (IMAGE_SIG(buf)) { out.push({ pos: m.index, kind: 'base64', buf }); continue; }
    const d = buf.toString('utf8');
    if (printable(d) > 0.9 && /[\p{L}]{3}/u.test(d)) out.push({ pos: m.index, kind: 'base64', text: d });
  }
  // Line by line: %-encoding, \u / \x escapes, HTML character references.
  let pos = 0;
  for (const line of t.split('\n')) {
    if (/%[0-9A-Fa-f]{2}/.test(line)) {
      const d = line.replace(/(?:%[0-9A-Fa-f]{2})+/g, (s) => { try { return decodeURIComponent(s); } catch { return s; } });
      if (d !== line) out.push({ pos, kind: '%-encoding', text: d });
    }
    if (/\\u[0-9A-Fa-f]{4}|\\u\{[0-9A-Fa-f]+\}|\\x[0-9A-Fa-f]{2}/.test(line)) {
      const d = line.replace(/\\u\{([0-9A-Fa-f]{1,6})\}|\\u([0-9A-Fa-f]{4})|\\x([0-9A-Fa-f]{2})/g, (s, a, b, c) => {
        const cp = parseInt(a || b || c, 16);
        try { return String.fromCodePoint(cp); } catch { return s; }
      });
      if (d !== line) out.push({ pos, kind: 'escapes', text: d });
    }
    if (/&(#\d+|#x[0-9A-Fa-f]+|[a-z]+);/.test(line)) {
      const d = line.replace(/&#(\d+);|&#x([0-9A-Fa-f]+);|&([a-z]+);/g, (s, dec, hex, name) => {
        if (name) return ENTITY[name] ?? s;
        const cp = dec ? Number(dec) : parseInt(hex, 16);
        try { return String.fromCodePoint(cp); } catch { return s; }
      });
      if (d !== line && /&#|&commat;|&period;/.test(line)) out.push({ pos, kind: 'HTML character references', text: d });
    }
    pos += line.length + 1;
  }
  return out;
}

// ─── Machine identifiers and coordinates ──────────────────────────────────
const PUBLIC_DNS = new Set(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4', '9.9.9.9', '208.67.222.222', '208.67.220.220']);
// Private, loopback, link-local, shared, multicast and reserved ranges, and the three documentation ranges.
const v4Private = ([a, b, c]) => a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254)
  || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  || (a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || (a === 198 && (b === 18 || b === 19));
export const MACHINE_RULES = [
  { re: /S-1-5-21(?:-\d{6,10}){3}(?:-\d{3,})?/g, message: 'a Windows security identifier (SID): it names one account on one computer', severity: 'error' },
  { re: /(?<![\w-])(?:DESKTOP|LAPTOP)-[A-Z0-9]{7,8}(?![\w-])/g, message: 'a default Windows computer name', severity: 'error' },
  {
    re: /(?<![\w:.-])[0-9A-Fa-f]{2}([:-])(?:[0-9A-Fa-f]{2}\1){4}[0-9A-Fa-f]{2}(?![\w:.-])/g, severity: 'warn',
    check: (m) => !/^(00[:-]){5}00$|^(ff[:-]){5}ff$|^00[:-]00[:-]5e[:-]/i.test(m[0]),
    message: 'a MAC address (one network card)',
  },
  {
    re: /(?<![\w.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\w.])/g, severity: 'warn',
    // Tests use public addresses on purpose (SSRF checks); SVG path data and minified code are full of dotted numbers.
    skip: (rel) => /(^|\/)(tests?|fixtures)\//i.test(rel) || /^vendor\//i.test(rel) || /\.svg$/i.test(rel),
    check: (m, line) => {
      const o = m[0].split('.').map(Number);
      if (PUBLIC_DNS.has(m[0]) || v4Private(o) || o[0] === 255) return false;
      return !/version|\bv\d|semver|chrome\/|safari\/|firefox\//i.test(line);
    },
    message: 'a public IPv4 address',
  },
];

const R = 6371;
const km = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const NUM = /-?\d{1,3}\.\d{1,8}(?!\d)/g;
/** Positions of number pairs (lat, lon or lon, lat) within 25 km of a saved location. */
export function nearLocation(text, coords) {
  const out = [];
  if (!coords || !coords.length) return out;
  const nums = [...String(text).matchAll(NUM)].map(m => ({ v: Number(m[0]), i: m.index, e: m.index + m[0].length }));
  for (let k = 0; k + 1 < nums.length; k++) {
    const a = nums[k], b = nums[k + 1];
    if (b.i - a.e > 40 || text.slice(a.e, b.i).includes('\n')) continue;
    for (const [lat, lon] of [[a.v, b.v], [b.v, a.v]]) {
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || (Math.abs(lat) < 1 && Math.abs(lon) < 1)) continue;
      if (coords.some(c => km(c, { lat, lon }) < 25)) { out.push(a.i); break; }
    }
  }
  return out;
}

// ─── The deep pass ─────────────────────────────────────────────────────────
function lines(text) {
  const starts = [0];
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  return (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
    const end = lo + 1 < starts.length ? starts[lo + 1] - 1 : text.length;
    return { line: lo + 1, col: pos - starts[lo] + 1, text: text.slice(starts[lo], end) };
  };
}

/**
 * Build the deep pass. terms: every private term [{n, term, note}] (from a
 * term file, --terms-from and deriveDeepTerms); coords: saved locations;
 * project: {owner, repo} (the owner's handle is not a name inside a word).
 * -> {scanFile(rel, text, prior, opts), scanName(rel, allowed)}
 */
export function makeDeep({ terms = [], coords = [], project = null, perWord = 3 } = {}) {
  // Names (and every term of a term file) are also looked for glued to other letters.
  const matcher = tokenMatcher(terms.map(t => (t.glue !== undefined ? t : { ...t, glue: !t.note || /name|alias|organisation|place/.test(t.note) })));
  const owner = project && project.owner ? fold(project.owner) : null;
  const label = (t, how) => {
    const base = t.note ? `private term ${t.n} (${t.note})` : `private term #${t.n} (line number in the term file)`;
    return how ? `${base} ${how}` : base;
  };
  // A single capitalised word or code from a title, merchant or sender name is
  // often an ordinary word ("Review", "Bank"): a warning, and only its first
  // `perWord` places are listed (the rest are counted).
  const isWordKind = (t) => / (word|code)$/.test(t.note || '');
  const shownPerTerm = new Map();
  let hidden = 0;
  const hiddenTerms = new Set();
  const keep = (t) => {
    if (!isWordKind(t)) return true;
    const n = (shownPerTerm.get(t.n) || 0) + 1;
    shownPerTerm.set(t.n, n);
    if (n <= perWord) return true;
    hidden++; hiddenTerms.add(t.n);
    return false;
  };
  const severityOf = (t) => (isWordKind(t) ? 'warn' : 'error');

  /** Private-term hits in a text: [{pos, t, how}] (how: '' plain, or the way it was hidden). */
  const termHits = (text) => {
    if (!matcher.size) return [];
    const { plain, sub } = textTokens(text);
    const hits = new Map();
    const put = (pos, t, how) => { if (!hits.has(pos)) hits.set(pos, { pos, t, how }); };
    for (const h of matcher.find(plain, text)) {
      const raw = text.slice(h.start, h.end);
      put(h.start, h.t, fold(raw) !== raw.toLowerCase() ? '(with accents dropped, or look-alike or invisible characters)' : '');
    }
    for (const h of matcher.find(sub, text)) {
      if (hits.has(h.start)) continue;
      const w0 = sub[h.i].word, w1 = sub[h.i + h.k - 1].word;
      if (h.start === w0.start && h.end === w1.end) { put(h.start, h.t, ''); continue; }
      if (owner && w0 === w1 && w0.v === owner) continue;   // the project owner's handle
      put(h.start, h.t, '(inside an identifier)');
    }
    for (const p of plain) {
      if (owner && p.v === owner) continue;
      for (const t of matcher.glued(p.v)) put(p.start + Math.max(0, p.v.indexOf(termTokens(t.term)[0])), t, '(glued to other letters)');
    }
    return [...hits.values()];
  };

  const scanName = (rel, allowed = () => false) => termHits(rel)
    .map(h => ({ h, f: { file: rel, line: 0, col: 0, rule: 'private-term', severity: severityOf(h.t), message: `${label(h.t, h.how)} in the file name`, text: '', term: true } }))
    .filter(({ h, f }) => !allowed(f, rel) && keep(h.t)).map(({ f }) => f);

  const scanDeepFile = (rel, text, prior = [], opts = {}, depth = 0) => {
    const allowed = opts.allowed || (() => false);
    const where = lines(text);
    const out = [];
    const key = (f) => `${f.line}:${f.col}:${f.rule}:${f.message}:${f.term ? '' : f.text}`;
    const seen = new Set(prior.map(key));
    const push = (f) => {
      if (seen.has(key(f))) return;
      seen.add(key(f));
      const { t, ...g } = f;   // the term object never leaves this function
      if (!allowed(g, rel) && (!t || depth > 0 || keep(t))) out.push(g);
    };
    const termFinding = (pos, h, how, lineAt = where(pos)) => ({
      file: rel, line: lineAt.line, col: lineAt.col, rule: 'private-term', severity: severityOf(h.t),
      message: label(h.t, how), text: '', term: true, lineHash: lineHash(lineAt.text), t: h.t,
    });
    for (const h of termHits(text)) push(termFinding(h.pos, h, h.how));
    for (const r of MACHINE_RULES) {
      if (r.skip && r.skip(rel)) continue;
      r.re.lastIndex = 0;
      for (const m of text.matchAll(r.re)) {
        const at = where(m.index);
        if (at.text.includes('privacy-scan:allow')) continue;
        if (r.check && !r.check(m, at.text)) continue;
        push({ file: rel, line: at.line, col: at.col, rule: 'machine-id', severity: r.severity, message: r.message, text: m[0] });
      }
    }
    for (const p of nearLocation(text, coords)) {
      const at = where(p);
      if (at.text.includes('privacy-scan:allow')) continue;
      push({ file: rel, line: at.line, col: at.col, rule: 'near-location', severity: 'error', message: 'coordinates within 25 km of a location saved in the data folder', text: at.text.slice(at.col - 1, at.col + 30) });
    }
    if (depth < 2) {
      const plainKeys = new Map();   // what a line already shows without decoding
      const keyOf = (f) => `${f.rule}|${f.message.replace(/ \(.*$/, '')}|${f.term ? '' : f.text}`;
      const shown = (at) => {
        if (!plainKeys.has(at.line)) {
          const fs = [...scanText(at.text, { ...opts, rel, allowed: () => false }), ...scanDeepFile(rel, at.text, [], {}, 9)];
          plainKeys.set(at.line, new Set(fs.map(keyOf)));
        }
        return plainKeys.get(at.line);
      };
      for (const v of decodedViews(text)) {
        const at = where(v.pos);
        const how = `(decoded from ${v.kind})`;
        const remap = (f) => ({ ...f, file: rel, line: at.line, col: at.col, message: `${f.message} ${how}`, lineHash: f.term ? lineHash(at.text) : undefined });
        if (v.buf) {
          for (const f of scanFile(`${rel}:${at.line} (${v.kind})`, v.buf, { ...opts, deep: api })) push({ ...f, file: rel, line: at.line, col: at.col, message: `${f.message} ${how}`, lineHash: f.term ? lineHash(at.text) : undefined });
          continue;
        }
        const inner = [...scanText(v.text, { ...opts, rel, allowed: () => false }), ...scanDeepFile(rel, v.text, [], {}, depth + 1)];
        const before = shown(at);
        // Errors only: a heuristic warning on decoded text is mostly noise (an escaped pound sign in a regex is not an amount).
        for (const f of inner) if (f.severity === 'error' && !before.has(keyOf(f))) push(remap(f));
      }
    }
    return out;
  };
  const api = { scanFile: scanDeepFile, scanName, terms: matcher.size, suppressed: () => ({ hits: hidden, terms: hiddenTerms.size }) };
  return api;
}

#!/usr/bin/env node
// tools/privacy-scan.mjs - look for personal data and secrets before anything
// is published: in a folder (the release export, a checkout) or in the git
// index (what the next commit would contain).
//
//   node tools/privacy-scan.mjs [<dir>]            scan a folder (default: this repo)
//   node tools/privacy-scan.mjs --staged           scan the git index of --repo (default: this repo)
//                                                  plus the git identity that would author the commit
//   Options:
//     --repo <dir>        the git work tree for --staged / --commits
//     --commits <range>   also check the authors, committers and messages of these
//                         commits (e.g. HEAD, or origin/main..HEAD)
//     --terms <file>      the PRIVATE term list (default <repo>/data/privacy-terms.txt,
//                         then $DASHBOARD_DATA_DIR/privacy-terms.txt, when one exists);
//                         --terms - reads it from standard input (nothing on disk);
//                         --no-terms = generic rules only (CI)
//     --terms-from <data dir>  also take private terms from a data folder (read only,
//                         never printed): your name and e-mail addresses, every
//                         person's name parts, e-mail addresses and aliases, and
//                         one-word stream labels and ids. Ordinary words are skipped.
//     --allow <file>      reviewed exceptions (default tools/privacy-allow.json); --no-allow
//     --exclude <glob>    skip paths, e.g. --exclude "data/**" (repeatable)
//     --no-gitignore      in a git work tree, also scan what git ignores (skipped by default:
//                         it cannot be committed; your own data/ folder stays unread)
//     --deep              also the deep pass before a release (tools/privacy-deep.mjs): with
//                         --terms-from, many more terms from the data folder (titles, places,
//                         organisations, merchants, ids, links, e-mail domains, hashes) and this
//                         computer's user, computer and folder names; terms inside identifiers,
//                         glued or with invisible characters; base64, %-, \u- and &#-encoded text;
//                         machine ids (rule machine-id); coordinates near a saved location
//                         (rule near-location). Slow (minutes); never printed but as number + kind
//     --deep-words        with --deep, also single capitalised words and codes from titles,
//                         merchants and senders (a long list of mostly ordinary words: a warning each)
//     --summary           counts per rule only
//     --json              machine-readable report
//     --show              print the matched text in full (local use only, never in CI logs)
//     --strict            warnings fail too
//
// Output: one line per finding, `file:line:col  rule  message  excerpt`. The
// excerpt is masked unless --show; a private term is only ever shown as its
// number in the term file. Exit codes: 0 clean (warnings allowed), 1 findings,
// 2 usage or file error.
//
// THE PRIVATE TERM LIST. Names of real people, places, employers, projects,
// account labels: anything that must not appear in public, one term per line,
// '#' starts a comment. Matched case-insensitively as whole words in every text
// file, file name, PNG text chunk (also PNGs inside .ico files), JPEG EXIF /
// XMP / comment, SVG and commit message. Keep it in the data folder
// (gitignored), or anywhere outside the repo with --terms. It is never
// committed: a file named privacy-terms* in a scanned tree is itself a
// finding. CI runs the generic rules only. How a maintainer builds the list:
// docs/dev/PRIVACY-SCAN.md.
//
// Inline exception: a line containing "privacy-scan:allow" is skipped by the
// generic rules (never by private terms). Prefer tools/privacy-allow.json,
// where every exception carries its reason. Its "repository" ("owner/name",
// the public repository) turns on the other-repo rule: a link to another
// repository of the same owner is a warning (an old or private repository's
// name can say more than it should). A private term is never allowed by a
// glob, '*' or a match (that would publish the term): only on one reviewed
// line, pinned by its exact path and "line_sha256" (the lineHash a --json
// report gives; any edit to that line brings the finding back).
//
// Zero dependencies, Node >= 20. Never reads the data folder's contents (only
// the term file, when it is the default one).

import { readFileSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { inflateSync } from 'node:zlib';
import { userInfo } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { neverRule, globToRegExp } from './release-rules.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_TERMS = (repo = REPO) => join(repo, 'data', 'privacy-terms.txt');
export const DEFAULT_ALLOW = (repo = REPO) => join(repo, 'tools', 'privacy-allow.json');
export const INLINE_ALLOW = 'privacy-scan:allow';

// ─── Values that are fine to publish ──────────────────────────────────────
export const NOREPLY = /^(\d+\+)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?@users\.noreply\.github\.com$/i;
const RESERVED_DOMAIN = /(^|\.)(example\.(com|org|net)|example|test|invalid|localhost|local)$/i;
const PLACEHOLDER_LOCAL = new Set(['you', 'your.name', 'yourname', 'your-name', 'your_name', 'name', 'user', 'username',
  'someone', 'first.last', 'firstname.lastname', 'email', 'mail', 'me']);
const FILE_TLD = /^(png|jpe?g|gif|svg|webp|ico|js|mjs|cjs|ts|css|json|html?|md|txt|woff2?|map|min)$/i;
// Placeholder user-folder names (docs show C:\Users\<you>\..., CI runs as /home/runner).
const PLACEHOLDER_USER = /^([<{[%$(].*|.*[>}\]%)]|you|your-?name|your_name|user(name)?|name|me|someone|example|demo|test|runner|public|default|default user|all users|shared|alex|sam|\*|\.\.\.|…|x)$/i;
// Documented test values: card numbers from the payment providers' docs, the
// IBAN/AWS examples from their specifications, Ofcom's drama phone ranges and
// Royal Mail's format examples. Kept as values so nothing else is let through.
const TEST_CARDS = new Set(['4242424242424242', '4000056655665556', '4111111111111111', '4012888888881881', '5555555555554444',
  '5200828282828210', '5105105105105100', '378282246310005', '371449635398431', '6011111111111117', '6011000990139424',
  '3056930009020004', '36227206271667', '3566002020360505', '6200000000000005', '4000000000000002', '4000000000009995']);
const EXAMPLE_IBANS = new Set(['GB82WEST12345698765432', 'GB33BUKB20201555555555', 'GB29NWBK60161331926819', 'DE89370400440532013000',
  'FR1420041010050500013M02606', 'NL91ABNA0417164300', 'ES9121000418450200051332']);
const EXAMPLE_AWS = new Set(['AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY']);
const DRAMA_PHONE = ['7700900', '1632960', '2079460', '1134960', '1144960', '1154960', '1164960', '1174960', '1184960', '1214960',
  '1314960', '1414960', '1514960', '1614960', '1914980', '8081570', '9098790', '3069990', '2896496'];
const EXAMPLE_POSTCODES = new Set(['SW1A 1AA', 'SW1A 2AA', 'EC1A 1BB', 'W1A 0AX', 'W1A 1AA', 'M1 1AE', 'B33 8TH', 'CR2 6XH', 'DN55 1PT']);
const PLACEHOLDER_DIGITS = new Set(['12345678', '00000000', '87654321', '11111111', '01234567', '123456', '000000', '112233', '010203']);

export function emailAllowed(addr) {
  const a = String(addr).toLowerCase();
  const at = a.lastIndexOf('@');
  const local = a.slice(0, at), domain = a.slice(at + 1);
  return NOREPLY.test(a) || RESERVED_DOMAIN.test(domain) || /^no-?reply$/.test(local)
    || a === 'git@github.com' || PLACEHOLDER_LOCAL.has(local);
}

export function luhn(digits) {
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}
const CARD_IIN = /^(4\d{12}(\d{3}(\d{3})?)?|5[1-5]\d{14}|2(2[2-9]|[3-6]\d|7[01])\d{12}|2720\d{12}|3[47]\d{13}|3(0[0-5]|[68]\d)\d{11,16}|6(011|5\d\d|4[4-9]\d)\d{12,15}|35(2[89]|[3-8]\d)\d{12,15}|62\d{14,17})$/;

export function ibanValid(raw) {
  const s = String(raw).replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rem = (rem * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

// ─── Text rules ────────────────────────────────────────────────────────────
// check(match, ctx) -> null to ignore, or {message, text?}; ctx = {rel, line(), isTest}.
const isTestPath = (rel) => /(^|\/)(tests?|fixtures|__tests__)\//i.test(rel) || /\.test\.[cm]?js$/i.test(rel) || /^tools\/make-fake-[^/]*$/i.test(rel);
const isVendor = (rel) => /^vendor\//i.test(rel);

export const RULES = [
  {
    id: 'email', severity: 'error',
    re: /(?<![\w.+%-])[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}(?![\w-])/g,
    check: (m, ctx) => {
      const a = m[0];
      if (FILE_TLD.test(a.slice(a.lastIndexOf('.') + 1)) || emailAllowed(a)) return null;
      // user:token@host inside a URL is not an address (a real token there is caught by the token rules)
      if (ctx && ctx.text && /:\/\/[^\s\/@]*$/.test(ctx.text.slice(Math.max(0, m.index - 200), m.index))) return null;
      // Google calendar ids: public holiday calendars, and short made-up ids (real ones are long hashes)
      const cal = /@(group\.v|group|resource)\.calendar\.google\.com$/i.exec(a);
      if (cal && (cal[1].toLowerCase() === 'group.v' || a.indexOf('@') < 20)) return null;
      return { message: 'e-mail address (only noreply and example.com/.org addresses may be published)' };
    },
  },
  {
    id: 'phone', severity: 'error', heuristic: true,
    re: /(?<![\w+.\/-])(?:\+44[ -]?(?:\(0\)[ -]?)?|0)(?:[1-37-9][\d \-]{7,11}\d)(?![\w-])|(?<![\w+])\+[1-9]\d{0,2}[ .-]\(?\d{1,4}\)?(?:[ .-]\d{2,5}){1,4}(?![\w-])|\(\d{3}\) ?\d{3}-\d{4}(?![\w-])/g,
    check: (m) => {
      const raw = m[0];
      if (/[ -]{2,}/.test(raw)) return null;
      const digits = raw.replace(/\D/g, '');
      let national;
      if (raw.startsWith('+44')) national = digits.slice(2).replace(/^0/, '');
      else if (raw.startsWith('0')) national = digits.slice(1);
      if (national !== undefined) {
        if (national.length < 9 || national.length > 10) return null;
        if (!/[ -]/.test(raw) && !raw.startsWith('+')) return null;   // a bare 0-prefixed digit run is usually an id
        if (DRAMA_PHONE.some(p => national.startsWith(p))) return null;
        return { message: 'UK phone number' };
      }
      if (digits.length < 9 || digits.length > 15) return null;
      if (/^1555\d{3}01\d\d$/.test(digits) || /^555\d{3}01\d\d$/.test(digits.slice(-10))) return null;
      return { message: 'phone number' };
    },
  },
  {
    id: 'uk-postcode', severity: 'error', heuristic: true,
    re: /(?<![\w-])(GIR ?0AA|(?:[A-PR-UWYZ][0-9]{1,2}|[A-PR-UWYZ][A-HK-Y][0-9]{1,2}|[A-PR-UWYZ][0-9][A-HJKPSTUW]|[A-PR-UWYZ][A-HK-Y][0-9][ABEHMNPRVWXY])( ?)[0-9][ABD-HJLNP-UW-Z]{2})(?![\w-])/g,
    check: (m, ctx) => {
      if (!m[2] && !/post ?code|zip/i.test(ctx.line())) return null;   // no space: only with a hint on the line
      const norm = m[1].replace(/^(.+?) ?(\d[A-Z]{2})$/, '$1 $2');
      if (EXAMPLE_POSTCODES.has(norm)) return null;
      return { message: 'UK postcode' };
    },
  },
  {
    id: 'user-path', severity: 'error',
    re: /(?<![\w])[A-Za-z]:(?:\\{1,2}|\/)(?:Users|Documents and Settings)(?:\\{1,2}|\/)([^\\/\s"'`<>|*?]+)|(?<![\w.~-])(?:\/mnt)?(?:\/[a-zA-Z])?\/(?:Users|home)\/([^\/\s"'`<>|*?\\]+)/g,
    check: (m) => {
      const name = (m[1] || m[2] || '').replace(/[),;:.]+$/, '');
      if (!name || PLACEHOLDER_USER.test(name)) return null;
      return { message: 'absolute path inside a user folder (use <you> or ~ instead)' };
    },
  },
  {
    // A Windows drive path (or Git Bash /c/...) into a folder inside a scratch folder: the
    // developer's own machine layout ("C:/tmp/<project>/..."), meaningless to anyone else.
    // A file directly in the temp folder (C:\Temp\x.stamp) is an ordinary example.
    id: 'local-path', severity: 'warn', heuristic: true,
    re: /(?<![\w])(?:[A-Za-z]:(?:\\{1,2}|\/)|(?<![\w.~-])\/[a-zA-Z]\/)(?:tmp|temp)(?:\\{1,2}|\/)([^\\/\s"'`<>|*?]+)(?=\\|\/)/gi,
    check: (m) => {
      const seg = m[1].replace(/[),;:.]+$/, '');
      if (!seg || PLACEHOLDER_USER.test(seg) || /^(x|y|z|a|b|demo|example|opendash[\w-]*|release[\w-]*|test[\w-]*|scratch|folder|dir)$/i.test(seg)) return null;
      return { message: 'absolute path into a scratch folder on a developer\'s machine (use a relative path or <folder>)' };
    },
  },
  {
    // OneDrive for work or school ("OneDrive - <Organisation>", macOS "OneDrive-<Org>")
    // and Dropbox Business ("Dropbox (<Organisation>)") folder names carry an employer or
    // university name. Case-sensitive: the organisation starts with a capital letter.
    id: 'cloud-folder', severity: 'error',
    re: /OneDrive(?: - |-)([A-Z][^\\/\r\n"'`<>|*?]{1,80})|Dropbox \(([A-Z][^)\r\n]{1,60})\)/g,
    check: (m) => {
      const org = (m[1] || m[2]).replace(/[\s),;:.]+$/, '');
      if (/^(Personal|SharedLibraries\b.*|Org(ani[sz]ation)?|Company|Work|School|Business|Contoso\b.*|Fabrikam\b.*|Example\b.*|Acme\b.*|Your\b.*)$/i.test(org)) return null;
      return { message: 'a work or school cloud-folder name (it carries an organisation\'s name)' };
    },
  },
  {
    // Another repository of the project's owner (needs "repository" in tools/privacy-allow.json).
    id: 'other-repo', severity: 'warn',
    re: /(?<![\w.-])(?:https?:\/\/)?(?:www\.)?github\.com[\/:]([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100})/g,
    check: (m, ctx) => {
      const proj = ctx && ctx.project;
      if (!proj || m[1].toLowerCase() !== proj.owner) return null;
      const repo = m[2].replace(/\.git$/i, '').replace(/\.+$/, '').toLowerCase();
      if (!repo || repo === proj.repo || repo === `${proj.owner}.github.io`) return null;
      return { message: `a link to another repository of ${proj.owner}: is it public, and should its name be here?` };
    },
  },
  {
    id: 'github-token', severity: 'error',
    re: /(?<![\w])(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})(?![\w])/g,
    check: () => ({ message: 'GitHub token' }),
  },
  {
    id: 'anthropic-key', severity: 'error',
    re: /(?<![\w-])sk-ant-[A-Za-z0-9_-]{20,}/g,
    check: () => ({ message: 'Anthropic API key or OAuth token' }),
  },
  {
    id: 'api-token', severity: 'error',
    re: /(?<![\w-])(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{40,}|xox[abposr]-[A-Za-z0-9-]{10,}|(?:sk|rk)_live_[A-Za-z0-9]{20,}|npm_[A-Za-z0-9]{36})(?![\w-])/g,
    check: () => ({ message: 'API token (OpenAI, Slack, Stripe or npm format)' }),
  },
  {
    id: 'aws-key', severity: 'error',
    re: /(?<![A-Z0-9])(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}(?![A-Z0-9])|aws_?secret_?access_?key\W{0,6}([A-Za-z0-9\/+=]{40})(?![A-Za-z0-9\/+=])/gi,
    check: (m) => {
      const v = m[1] || m[0];
      if (EXAMPLE_AWS.has(v)) return null;
      if (!m[1] && !/^(AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}$/.test(m[0])) return null;   // case-sensitive key id
      return { message: m[1] ? 'AWS secret access key' : 'AWS access key id' };
    },
  },
  {
    id: 'google-secret', severity: 'error',
    re: /GOCSPX-[A-Za-z0-9_-]{24,}|(?<![\w-])AIza[0-9A-Za-z_-]{35}(?![\w-])|(?<![\w])ya29\.[0-9A-Za-z_-]{20,}|(?<![\w\/])1\/\/0[0-9A-Za-z_-]{30,}|\b\d{6,}-[0-9a-z]{32}\.apps\.googleusercontent\.com|"client_secret"\s*:\s*"[^"\s]{8,}"/g,
    check: (m) => ({ message: /googleusercontent/.test(m[0]) ? 'Google OAuth client id' : 'Google secret, API key or token' }),
  },
  {
    id: 'jwt', severity: 'error',
    re: /(?<![\w-])eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    check: () => ({ message: 'JSON Web Token' }),
  },
  {
    id: 'private-key', severity: 'error',
    re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/g,
    check: () => ({ message: 'private key' }),
  },
  {
    id: 'dashboard-token', severity: 'error',
    re: /(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])/g,
    check: (m, ctx) => {
      const line = ctx.line();
      if (ctx.text.trim() === m[0]) return { message: 'a dashboard local-token file (64 hex characters)' };
      if (!/token/i.test(line) || /sha|hash|digest|checksum|integrity|hmac|fingerprint/i.test(line)) return null;
      return { message: 'dashboard local token (64 hex characters next to "token")' };
    },
  },
  {
    id: 'iban', severity: 'error',
    re: /(?<![\w])[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?(?![\w])/g,
    check: (m) => {
      const s = m[0].replace(/\s/g, '');
      if (EXAMPLE_IBANS.has(s) || !ibanValid(s)) return null;
      return { message: 'IBAN (valid checksum)' };
    },
  },
  {
    id: 'sort-code', severity: 'error', heuristic: true,
    re: /sort[\s_-]?code\W{0,20}?(\d{2}[- ]?\d{2}[- ]?\d{2})(?![\d-])/gi,
    check: (m) => (PLACEHOLDER_DIGITS.has(m[1].replace(/\D/g, '')) || /^0+$/.test(m[1].replace(/\D/g, '')) ? null : { message: 'bank sort code', text: m[1] }),
  },
  {
    id: 'account-number', severity: 'error', heuristic: true,
    re: /(?:account[\s_-]?(?:number|no\.?|num)|acc(?:t|ount)?[\s_-]?no\.?)\W{0,20}?(\d{8})(?!\d)/gi,
    check: (m) => (PLACEHOLDER_DIGITS.has(m[1]) ? null : { message: 'bank account number', text: m[1] }),
  },
  {
    id: 'card-number', severity: 'error',
    re: /(?<![\d.,\w-])(?:\d[ -]?){12,18}\d(?![\d\w])/g,
    check: (m) => {
      const raw = m[0], digits = raw.replace(/\D/g, '');
      const seps = raw.replace(/\d/g, '');
      if (seps && !(/^ +$/.test(seps) || /^-+$/.test(seps))) return null;
      if (seps && !/^\d{4}([ -]\d{4}){2,3}([ -]\d{1,3})?$|^\d{4}[ -]\d{6}[ -]\d{4,5}$/.test(raw)) return null;
      if (/^(\d)\1+$/.test(digits) || TEST_CARDS.has(digits) || !CARD_IIN.test(digits) || !luhn(digits)) return null;
      return { message: 'payment card number (Luhn-valid)' };
    },
  },
  {
    id: 'money', severity: 'warn', heuristic: true, skip: isTestPath,
    re: /(?:[£€]|(?<![\w])(?:GBP|EUR|USD) ?)\d(?:[\d,]*\d)?(?:\.\d{1,2})?(?:[kKmM](?![\w]))?|(?<![\w$])\$\d{1,3}(?:,\d{3})+(?:\.\d{2})?|(?<![\w$])\$\d+\.\d{2}(?!\d)|(?<![\w.])\d(?:[\d,]*\d)?(?:\.\d{2})? ?(?:GBP|EUR|USD)(?![\w])/g,
    check: (m) => (/^[^\d]*0+(\.0+)?[^\d]*$/.test(m[0]) ? null : { message: 'money-like amount (heuristic: is it a real figure?)' }),
  },
];
export const RULE_IDS = [...RULES.map(r => r.id), 'private-term', 'image-metadata', 'forbidden-path', 'git-author', 'unscanned-binary', 'machine-id', 'near-location'];

// ─── Private terms ─────────────────────────────────────────────────────────
/** -> {terms:[{n, term}], warnings:[]} from a term file (one per line, '#' comments). */
export function parseTerms(text) {
  const terms = [], warnings = [];
  String(text).replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, i) => {
    const t = line.replace(/\s+#.*$/, '').trim();
    if (!t || t.startsWith('#')) return;
    if (t.length < 3) warnings.push(`term on line ${i + 1} is shorter than 3 characters: it will match a lot`);
    terms.push({ n: i + 1, term: t });
  });
  return { terms, warnings };
}
export function termMatcher(terms) {
  if (!terms || !terms.length) return null;
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${sorted.map(t => esc(t.term)).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ');
  const byLower = new Map();
  for (const t of terms) if (!byLower.has(norm(t.term))) byLower.set(norm(t.term), t);
  const find = (s) => byLower.get(norm(s)) ?? sorted.find(t => new RegExp(`^${esc(t.term)}$`, 'iu').test(s));
  const which = (s) => find(s)?.n ?? 0;
  // How a match is reported: a term file's line number, or a data-folder term's number and kind. Never the term.
  const label = (s) => {
    const t = find(s);
    if (!t) return 'private term';
    return t.note ? `private term ${t.n} (${t.note})` : `private term #${t.n} (line number in the term file)`;
  };
  return { re, which, label };
}

// Words that may be stream labels, ids or parts of a name but say nothing on
// their own, plus the made-up names the code and docs use as examples. Never
// taken from a data folder as private terms.
export const COMMON_WORDS = new Set(`
  work home personal private admin health family finance finances money bank budget jobs job career papers paper grants grant
  thesis research study studies learning reading writing teaching projects project side clients client freelance life misc
  other general inbox errands travel fitness school uni university college team group office support service services
  calendar google student students summary mark will doctor launch product house car kids self user you the and for new
  old main default archive someday later today week month year meeting meetings email emails chat notes note ideas idea
  tasks task todo dashboard opendash demo example test sample music sport sports hobby hobbies garden church volunteering
  shopping house household chores reviews review planning plan goals goal habits habit
  alex sam kim taylor jordan lee smith robin acme
`.trim().split(/\s+/));

/**
 * Private terms from a data folder, so nobody has to type them into a file:
 * the user's name and e-mail addresses (config.json), each person's name
 * parts, e-mail addresses and aliases, and one-word stream labels and ids
 * (state/dashboard-state.json). Ordinary words (COMMON_WORDS) and parts
 * shorter than 3 letters are skipped. Read only; the terms are never printed.
 * -> {terms:[{n:'d1', term, note}], counts:{kind: count}}
 */
export function deriveTerms(dataDir) {
  const read = (...rel) => { try { return JSON.parse(readFileSync(join(dataDir, ...rel), 'utf8')); } catch { return null; } };
  const cfg = read('config.json') || {};
  const state = read('state', 'dashboard-state.json') || {};
  const found = new Map();
  const add = (t, kind) => {
    const s = String(t || '').trim();
    if (s.length < 3 || COMMON_WORDS.has(s.toLowerCase()) || found.has(s.toLowerCase())) return;
    found.set(s.toLowerCase(), { term: s, kind });
  };
  const nameParts = (name, kind) => {
    for (const part of String(name || '').replace(/\(.*?\)/g, ' ').split(/[\s,/&+]+/)) {
      const w = part.replace(/^['’-]+|['’.-]+$/g, '');
      if (/^\p{Lu}[\p{L}'’-]{2,}$/u.test(w)) add(w, kind);
    }
  };
  const email = (e) => { if (typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())) add(e.trim().toLowerCase(), 'e-mail address'); };
  nameParts(cfg.userName, 'your name');
  for (const e of [].concat(cfg.myEmails || [])) email(e);
  for (const p of Array.isArray(state.people) ? state.people : []) {
    if (!p || typeof p !== 'object') continue;
    nameParts(p.name, 'person name');
    for (const e of [].concat(p.email || [], p.emails || [])) email(e);
    for (const a of Array.isArray(p.aliases) ? p.aliases : []) {
      if (typeof a !== 'string') continue;
      if (a.includes('@')) email(a);
      else if (a.length >= 6 && /[-_.\d]/.test(a) && !/\s/.test(a)) add(a.toLowerCase(), 'alias');
      else nameParts(a, 'person name');
    }
  }
  for (const s of Array.isArray(state.streams) ? state.streams : []) {
    if (!s || typeof s !== 'object') continue;
    for (const w of [s.label, s.id]) if (typeof w === 'string' && /^[\p{L}\p{N}_-]+$/u.test(w.trim())) add(w.trim(), 'stream');
  }
  const terms = [...found.values()].map((t, i) => ({ n: `d${i + 1}`, term: t.term, note: `from the data folder: ${t.kind}` }));
  const counts = {};
  for (const t of found.values()) counts[t.kind] = (counts[t.kind] || 0) + 1;
  return { terms, counts };
}

// ─── Masking ───────────────────────────────────────────────────────────────
export function mask(s) {
  const t = String(s);
  if (t.length <= 4) return '*'.repeat(t.length);
  const keep = Math.min(4, Math.floor(t.length / 5));
  return `${t.slice(0, keep)}…[${t.length} chars]`;
}

// ─── Scanning text ─────────────────────────────────────────────────────────
function lineIndex(text) {
  const starts = [0];
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  return (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
    return { line: lo + 1, col: pos - starts[lo] + 1, start: starts[lo], end: lo + 1 < starts.length ? starts[lo + 1] - 1 : text.length };
  };
}

/** SHA-256 (hex) of one line without its line ending: pins a reviewed private-term exception. */
export const lineHash = (line) => createHash('sha256').update(String(line).replace(/\r$/, ''), 'utf8').digest('hex');

/**
 * Findings in one text. opts: {rel, label, terms (termMatcher), allowed(f) -> bool, lineOffset}.
 * Each finding: {file, line, col, rule, severity, message, text}.
 */
export function scanText(text, { rel = '', label = '', terms = null, allowed = () => false, project = null } = {}) {
  const out = [];
  const where = lineIndex(text);
  const file = label || rel;
  const isTest = isTestPath(rel), vendor = isVendor(rel);
  for (const rule of RULES) {
    if (rule.skip && rule.skip(rel)) continue;
    if (rule.heuristic && vendor) continue;   // minified third-party code: heuristics only make noise there
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text))) {
      if (m[0] === '') { rule.re.lastIndex++; continue; }
      const pos = where(m.index);
      const lineText = () => text.slice(pos.start, pos.end);
      const r = rule.check(m, { rel, isTest, text, line: lineText, project });
      if (!r) continue;
      if (lineText().includes(INLINE_ALLOW)) continue;
      const f = { file, line: pos.line, col: pos.col, rule: rule.id, severity: rule.severity, message: r.message, text: r.text || m[0] };
      if (!allowed(f, rel)) out.push(f);
    }
  }
  if (terms) {
    terms.re.lastIndex = 0;
    let m;
    while ((m = terms.re.exec(text))) {
      const pos = where(m.index);
      const f = { file, line: pos.line, col: pos.col, rule: 'private-term', severity: 'error', message: terms.label(m[0]), text: m[0], term: true, lineHash: lineHash(text.slice(pos.start, pos.end)) };
      if (!allowed(f, rel)) out.push(f);
    }
  }
  return out;
}

// ─── Images: PNG text chunks, JPEG EXIF/XMP/comments, SVG metadata ────────
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_SAFE_KEYS = /^(software|creation time|xml:com\.adobe\.xmp)$/i;   // XMP is scanned as text, not flagged on its own

/** -> [{chunk, key, text}] for every tEXt / zTXt / iTXt chunk, plus eXIf as {chunk:'eXIf', exif:Buffer}. */
export function pngTextChunks(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  const out = [];
  let p = 8;
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8);
    const data = buf.subarray(p + 8, Math.min(buf.length, p + 8 + len));
    p += 12 + len;
    try {
      if (type === 'tEXt') {
        const z = data.indexOf(0);
        out.push({ chunk: type, key: data.toString('latin1', 0, z), text: data.toString('latin1', z + 1) });
      } else if (type === 'zTXt') {
        const z = data.indexOf(0);
        out.push({ chunk: type, key: data.toString('latin1', 0, z), text: inflateSync(data.subarray(z + 2)).toString('latin1') });
      } else if (type === 'iTXt') {
        const z = data.indexOf(0);
        const key = data.toString('latin1', 0, z);
        const compressed = data[z + 1] === 1;
        let q = z + 3;
        const lang = data.indexOf(0, q); q = lang + 1;
        const tk = data.indexOf(0, q); q = tk + 1;
        const body = data.subarray(q);
        out.push({ chunk: type, key, text: (compressed ? inflateSync(body) : body).toString('utf8') });
      } else if (type === 'eXIf') out.push({ chunk: type, key: 'EXIF', exif: data });
    } catch { out.push({ chunk: type, key: '?', text: '', broken: true }); }
    if (type === 'IEND') break;
  }
  return out;
}

const EXIF_TAGS = {
  0x010e: 'ImageDescription', 0x010f: 'Make', 0x0110: 'Model', 0x013b: 'Artist', 0x8298: 'Copyright',
  0x9286: 'UserComment', 0x9c9b: 'XPTitle', 0x9c9c: 'XPComment', 0x9c9d: 'XPAuthor', 0x9c9e: 'XPKeywords', 0x9c9f: 'XPSubject',
  0xa430: 'CameraOwnerName', 0xa431: 'BodySerialNumber', 0xa435: 'LensSerialNumber', 0x0131: 'Software', 0x0132: 'DateTime',
};
const EXIF_BENIGN = new Set(['Software', 'DateTime']);

/** Parse a TIFF/EXIF block: -> {fields:[{name, text}], gps:boolean}. Never throws. */
export function parseExif(tiff) {
  const res = { fields: [], gps: false };
  try {
    const le = tiff.toString('latin1', 0, 2) === 'II';
    if (!le && tiff.toString('latin1', 0, 2) !== 'MM') return res;
    const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
    const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
    const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    const seen = new Set();
    const ifd = (off, kind) => {
      if (!off || off + 2 > tiff.length || seen.has(off)) return;
      seen.add(off);
      const n = u16(off);
      for (let i = 0; i < n; i++) {
        const e = off + 2 + i * 12;
        if (e + 12 > tiff.length) break;
        const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
        const size = (SIZES[type] || 1) * count;
        const valOff = size <= 4 ? e + 8 : u32(e + 8);
        if (kind === 'gps') { if (tag !== 0) res.gps = true; continue; }
        if (tag === 0x8769) { ifd(u32(e + 8), 'exif'); continue; }
        if (tag === 0x8825) { ifd(u32(e + 8), 'gps'); continue; }
        const name = EXIF_TAGS[tag];
        if (!name || valOff + size > tiff.length) continue;
        const raw = tiff.subarray(valOff, valOff + size);
        let text;
        if (/^XP/.test(name)) text = raw.toString('utf16le');
        else if (name === 'UserComment') text = raw.subarray(8).toString(raw.toString('latin1', 0, 8).startsWith('UNICODE') ? 'utf16le' : 'latin1');
        else text = raw.toString('latin1');
        text = text.replace(/\0+/g, ' ').trim();
        if (text) res.fields.push({ name, text });
      }
      if (kind === 'ifd0') { const next = off + 2 + n * 12; if (next + 4 <= tiff.length) ifd(u32(next), 'ifd0'); }
    };
    ifd(u32(4), 'ifd0');
  } catch { /* a damaged block: whatever was read so far */ }
  return res;
}

/** JPEG metadata: -> {exif:{fields,gps}|null, xmp:string|null, comments:[], iptc:boolean}. null if not a JPEG. */
export function jpegMetadata(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const res = { exif: null, xmp: null, comments: [], iptc: false };
  let p = 2;
  while (p + 4 <= buf.length) {
    if (buf[p] !== 0xff) { p++; continue; }
    const marker = buf[p + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xff) { p += marker === 0xff ? 1 : 2; continue; }
    if (marker === 0xda || marker === 0xd9) break;   // image data starts: no more metadata
    const len = buf.readUInt16BE(p + 2);
    const seg = buf.subarray(p + 4, Math.min(buf.length, p + 2 + len));
    if (marker === 0xe1 && seg.toString('latin1', 0, 6) === 'Exif\0\0') res.exif = parseExif(seg.subarray(6));
    else if (marker === 0xe1 && seg.toString('latin1', 0, 29) === 'http://ns.adobe.com/xap/1.0/\0') res.xmp = seg.subarray(29).toString('utf8');
    else if (marker === 0xfe) res.comments.push(seg.toString('utf8'));
    else if (marker === 0xed) res.iptc = true;
    p += 2 + len;
  }
  return res;
}

const XMP_PERSONAL = /<(dc:creator|dc:rights|photoshop:AuthorsPosition|photoshop:Credit|xmpRights:Owner|Iptc4xmpCore:CreatorContactInfo)\b|exif:GPS(Latitude|Longitude)|(dc:creator|photoshop:Credit)="[^"]+"/;
const SVG_PERSONAL = /<dc:(creator|rights|publisher|contributor)\b|inkscape:export-filename=|sodipodi:docname=|<cc:Agent\b/;

/**
 * The images inside a Windows .ico: -> [Buffer|null] (a PNG, or null for a
 * plain bitmap, which has nowhere to keep metadata), or null if not an icon.
 */
export function icoImages(buf) {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || (buf.readUInt16LE(2) !== 1 && buf.readUInt16LE(2) !== 2)) return null;
  const n = buf.readUInt16LE(4);
  if (!n || 6 + n * 16 > buf.length) return null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = 6 + i * 16;
    const size = buf.readUInt32LE(e + 8), off = buf.readUInt32LE(e + 12);
    if (off + size > buf.length || off < 6 + n * 16) return null;
    const img = buf.subarray(off, off + size);
    out.push(img.subarray(0, 8).equals(PNG_SIG) ? img : null);
  }
  return out;
}

const BINARY_EXT = /\.(woff2?|ttf|otf|eot|ico|gif|webp|bmp|avif|heic|tiff?|pdf|zip|gz|tgz|7z|rar|mp3|mp4|m4a|wav|ogg|webm|mov|exe|dll|so|dylib|bin|wasm|pyc)$/i;
const FONT_EXT = /\.(woff2?|ttf|otf|eot)$/i;

/** Findings for one file (any type). */
export function scanFile(rel, buf, opts = {}) {
  const out = [];
  const meta = (message, sub = '') => out.push({ file: rel + sub, line: 0, col: 0, rule: 'image-metadata', severity: 'error', message, text: '' });
  const sub = (label, text) => {
    const found = scanText(text, { ...opts, rel, label: `${rel} (${label})` });
    out.push(...found);
    if (opts.deep) out.push(...opts.deep.scanFile(rel, text, found, opts, 1).map(f => ({ ...f, file: `${rel} (${label})` })));
  };
  if (/\.png$/i.test(rel) || buf.subarray(0, 8).equals(PNG_SIG)) {
    const chunks = pngTextChunks(buf);
    if (chunks) {
      for (const c of chunks) {
        if (c.exif) {
          const ex = parseExif(c.exif);
          if (ex.gps) meta('PNG eXIf: GPS location');
          for (const f of ex.fields) { if (!EXIF_BENIGN.has(f.name)) meta(`PNG eXIf: ${f.name}`); sub(`EXIF ${f.name}`, f.text); }
          continue;
        }
        if (!PNG_SAFE_KEYS.test(c.key)) meta(`PNG ${c.chunk} chunk '${c.key.slice(0, 40)}' (author, comment or other text metadata)`);
        if (/xmp/i.test(c.key) && XMP_PERSONAL.test(c.text)) meta('PNG XMP: creator, rights or GPS');
        sub(`PNG ${c.chunk} '${c.key.slice(0, 40)}'`, c.text);
      }
      return out;
    }
  }
  if (/\.jpe?g$/i.test(rel) || (buf[0] === 0xff && buf[1] === 0xd8)) {
    const j = jpegMetadata(buf);
    if (j) {
      if (j.exif) {
        if (j.exif.gps) meta('JPEG EXIF: GPS location');
        for (const f of j.exif.fields) { if (!EXIF_BENIGN.has(f.name)) meta(`JPEG EXIF: ${f.name}`); sub(`EXIF ${f.name}`, f.text); }
      }
      if (j.xmp) { if (XMP_PERSONAL.test(j.xmp)) meta('JPEG XMP: creator, rights or GPS'); sub('XMP', j.xmp); }
      for (const c of j.comments) { meta('JPEG comment segment'); sub('comment', c); }
      if (j.iptc) meta('JPEG IPTC/Photoshop metadata block');
      return out;
    }
  }
  if (/\.ico$/i.test(rel)) {
    const imgs = icoImages(buf);
    if (imgs) {
      imgs.forEach((png, i) => { if (png) out.push(...scanFile(`${rel}#${i + 1}`, png, opts)); });
      return out;
    }
  }
  if (BINARY_EXT.test(rel) || buf.subarray(0, 8000).includes(0)) {
    if (!FONT_EXT.test(rel)) out.push({ file: rel, line: 0, col: 0, rule: 'unscanned-binary', severity: 'warn', message: 'binary file not inspected: check its metadata by hand', text: '' });
    return out;
  }
  const text = buf.toString('utf8');
  if (/\.svg$/i.test(rel)) {
    const m = SVG_PERSONAL.exec(text);
    if (m) {
      const pos = lineIndex(text)(m.index);
      out.push({ file: rel, line: pos.line, col: pos.col, rule: 'image-metadata', severity: 'error', message: 'SVG metadata: creator, rights or editor file name', text: m[0] });
    }
  }
  out.push(...scanText(text, { ...opts, rel }));
  if (opts.deep) out.push(...opts.deep.scanFile(rel, text, out, opts));   // --deep: tools/privacy-deep.mjs
  return out;
}

/** Findings in a path name (private terms and e-mail addresses in file names). */
export function scanPathName(rel, { terms = null } = {}) {
  const out = [];
  if (terms) {
    terms.re.lastIndex = 0;
    let m;
    while ((m = terms.re.exec(rel))) out.push({ file: rel, line: 0, col: 0, rule: 'private-term', severity: 'error', message: `${terms.label(m[0])} in the file name`, text: m[0], term: true });
  }
  const em = RULES[0];
  em.re.lastIndex = 0;
  let m;
  while ((m = em.re.exec(rel))) if (em.check(m)) out.push({ file: rel, line: 0, col: 0, rule: 'email', severity: 'error', message: 'e-mail address in the file name', text: m[0] });
  return out;
}

/** Is a path forbidden in a public tree? -> finding or null. */
export function forbiddenPath(rel, isDir) {
  // A reviewed project .claude/settings.json may be published (its text is still
  // scanned); everything else in .claude/ is per-machine.
  if (isDir && /^\.claude$/i.test(rel)) return null;
  if (/^\.claude\/settings\.json$/i.test(rel)) return null;
  const r = neverRule(rel + (isDir ? '/' : ''));
  if (!r || (r.kind !== 'private' && r.kind !== 'local')) return null;
  return { file: rel + (isDir ? '/' : ''), line: 0, col: 0, rule: 'forbidden-path', severity: 'error', message: `${r.why}: must not be published`, text: '' };
}

// ─── Allowlist ─────────────────────────────────────────────────────────────
/** "owner/name" -> {owner, repo} in lower case, or null. */
export function parseProject(s) {
  const m = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100})$/.exec(String(s || '').trim());
  return m ? { owner: m[1].toLowerCase(), repo: m[2].replace(/\.git$/i, '').toLowerCase() } : null;
}

/**
 * Load tools/privacy-allow.json: {repository?, allow:[{rule, path, match?, why}]}
 * -> {allowed(finding, rel), entries, project}.
 */
export function loadAllow(file) {
  if (!file || !existsSync(file)) return { allowed: () => false, entries: [], project: null };
  const j = JSON.parse(readFileSync(file, 'utf8'));
  if (j.repository !== undefined && !parseProject(j.repository)) throw new Error(`${file}: "repository" must look like "owner/name"`);
  const entries = (Array.isArray(j.allow) ? j.allow : []).map((e, i) => {
    if (!e || !e.rule || !e.path || !e.why) throw new Error(`${file}: entry ${i + 1} needs rule, path and why`);
    if (e.rule === 'forbidden-path') throw new Error(`${file}: entry ${i + 1}: ${e.rule} cannot be allowed`);
    // A private term: only one reviewed line (exact path + line_sha256), never a glob or a match (it would name the term).
    if (e.rule === 'private-term' && (!/^[0-9a-f]{64}$/.test(String(e.line_sha256 || '')) || /[*?[\]{}]/.test(e.path) || e.match !== undefined)) {
      throw new Error(`${file}: entry ${i + 1}: private-term cannot be allowed except on one reviewed line (an exact path and its line_sha256, no match)`);
    }
    return { ...e, pathRe: globToRegExp(e.path), matchRe: e.match ? new RegExp(e.match) : null, used: 0 };
  });
  const allowed = (f, rel) => {
    for (const e of entries) {
      if (f.rule === 'private-term' || e.rule === 'private-term') {
        if (f.rule === e.rule && e.path === rel && f.lineHash && f.lineHash === e.line_sha256) { e.used++; return true; }
        continue;   // a '*' or glob entry never allows a private term
      }
      if ((e.rule === '*' || e.rule === f.rule) && e.pathRe.test(rel) && (!e.matchRe || e.matchRe.test(f.text))) { e.used++; return true; }
    }
    return false;
  };
  return { allowed, entries, project: parseProject(j.repository) };
}

// ─── Walking a folder ──────────────────────────────────────────────────────
const SKIP_SILENT = /(^|\/)(\.git|node_modules)$/;

/** Scan a folder. -> {files, findings, skipped:[{rel, why}]} */
/** Paths git ignores in a work tree ('dir/' for folders), or null when root is not one. */
export function gitIgnored(root) {
  if (!existsSync(join(root, '.git'))) return null;
  try {
    const r = spawnSync('git', ['-C', root, 'ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'], { windowsHide: true, maxBuffer: 1 << 26 });
    if (r.status !== 0) return null;
    return new Set(r.stdout.toString('utf8').split('\0').filter(Boolean));
  } catch { return null; }
}

/**
 * Scan a folder. In a git work tree, what git ignores (your own data/, the
 * built index.html) is skipped unless useGitignore is false: it cannot be
 * committed. Outside git (the release export) everything is scanned.
 * -> {files, findings, skipped:[{rel, why}]}
 */
export function scanTree(root, { terms = null, allowed = () => false, exclude = [], useGitignore = true, project = null, deep = null } = {}) {
  const ex = exclude.map(globToRegExp);
  const ignored = useGitignore ? gitIgnored(root) : null;
  const findings = [], skipped = [];
  let files = 0;
  const visit = (relDir) => {
    let names;
    try { names = readdirSync(join(root, relDir)).sort(); } catch { return; }
    for (const n of names) {
      const rel = relDir ? `${relDir}/${n}` : n;
      if (SKIP_SILENT.test(rel)) continue;
      if (ex.some(re => re.test(rel) || re.test(rel + '/'))) { skipped.push({ rel, why: '--exclude' }); continue; }
      if (ignored && (ignored.has(rel) || ignored.has(rel + '/'))) { skipped.push({ rel, why: 'ignored by git' }); continue; }
      let st;
      try { st = lstatSync(join(root, rel)); } catch { continue; }
      const isDir = st.isDirectory();
      const fb = forbiddenPath(rel, isDir);
      if (fb) { findings.push(fb); continue; }   // never read inside it
      findings.push(...scanPathName(rel, { terms }).filter(f => !allowed(f, rel)));
      if (deep) findings.push(...deep.scanName(rel, allowed));
      if (st.isSymbolicLink()) { skipped.push({ rel, why: 'symbolic link' }); continue; }
      if (isDir) { visit(rel); continue; }
      if (!st.isFile()) continue;
      if (rel === 'index.html' && existsSync(join(root, 'build.mjs'))) { skipped.push({ rel, why: 'built from src/ (its sources are scanned)' }); continue; }
      files++;
      findings.push(...scanFile(rel, readFileSync(join(root, rel)), { terms, allowed, project, deep }));
    }
  };
  visit('');
  return { files, findings, skipped };
}

// ─── Git: the index, the identity, commits ─────────────────────────────────
function git(repo, args, input) {
  const r = spawnSync('git', ['-C', repo, ...args], { input, maxBuffer: 1 << 30, windowsHide: true });
  if (r.error) throw new Error(`git is not available: ${r.error.message}`);
  return r;
}

/** Every file in the git index: -> [{rel, mode, data:Buffer}] (one git cat-file process). */
export function gitIndexFiles(repo) {
  const ls = git(repo, ['ls-files', '-s', '-z']);
  if (ls.status !== 0) throw new Error(`not a git work tree: ${repo}\n${ls.stderr}`);
  const entries = ls.stdout.toString('utf8').split('\0').filter(Boolean).map(l => {
    const [meta, rel] = l.split('\t');
    const [mode, sha] = meta.split(' ');
    return { rel, mode, sha };
  });
  if (!entries.length) return [];
  const cat = git(repo, ['cat-file', '--batch'], entries.map(e => e.sha).join('\n') + '\n');
  const buf = cat.stdout;
  let p = 0;
  for (const e of entries) {
    const nl = buf.indexOf(0x0a, p);
    const head = buf.toString('utf8', p, nl).split(' ');
    p = nl + 1;
    if (head[1] === 'missing') { e.data = Buffer.alloc(0); continue; }
    const size = Number(head[2]);
    e.data = buf.subarray(p, p + size);
    p += size + 1;
  }
  return entries;
}

export function authorAllowed(email) {
  const e = String(email || '').trim().toLowerCase();
  return NOREPLY.test(e) || e === 'noreply@github.com' || /^no-?reply@/.test(e);
}

/** This computer's account name (the <name> in C:\Users\<name>), or '' when unknown. */
function osUserName() {
  try { return String(userInfo().username || ''); } catch { return ''; }
}

/**
 * The identity the next commit would use (config + GIT_* env): a noreply e-mail,
 * and a name that is not an e-mail address or this computer's account name
 * (git falls back to a global user.name, often exactly that). opts.osUser: tests.
 */
export function gitIdentityFindings(repo, env = process.env, { osUser = osUserName() } = {}) {
  const out = [];
  const cfg = git(repo, ['config', 'user.email']).stdout.toString().trim();
  const cands = [['git config user.email', cfg], ['GIT_AUTHOR_EMAIL', env.GIT_AUTHOR_EMAIL], ['GIT_COMMITTER_EMAIL', env.GIT_COMMITTER_EMAIL]];
  for (const [where, email] of cands) {
    if (!email) continue;
    if (!authorAllowed(email)) out.push({ file: `(${where})`, line: 0, col: 0, rule: 'git-author', severity: 'error', message: 'commits would carry a non-noreply e-mail (use <id>+<user>@users.noreply.github.com)', text: email });
  }
  if (!cfg && !env.GIT_AUTHOR_EMAIL) out.push({ file: '(git config user.email)', line: 0, col: 0, rule: 'git-author', severity: 'warn', message: 'no commit e-mail is set for this repository', text: '' });
  const name = git(repo, ['config', 'user.name']).stdout.toString().trim();
  const me = String(osUser || '').trim().toLowerCase();
  for (const [where, value] of [['git config user.name', name], ['GIT_AUTHOR_NAME', env.GIT_AUTHOR_NAME], ['GIT_COMMITTER_NAME', env.GIT_COMMITTER_NAME]]) {
    const n = String(value || '').trim();
    if (!n) continue;
    if (n.includes('@')) out.push({ file: `(${where})`, line: 0, col: 0, rule: 'git-author', severity: 'error', message: 'the commit name holds an e-mail address (use the name you publish under)', text: n });
    else if (me && n.toLowerCase() === me) out.push({ file: `(${where})`, line: 0, col: 0, rule: 'git-author', severity: 'warn', message: "the commit name is this computer's user name (set git config user.name to the name you publish under)", text: n });
  }
  if (!name && !env.GIT_AUTHOR_NAME) out.push({ file: '(git config user.name)', line: 0, col: 0, rule: 'git-author', severity: 'warn', message: 'no commit name is set for this repository', text: '' });
  return out;
}

export const COMMIT_LOG_FORMAT = '%H%x00%ae%x00%ce%x00%B%x1e';

/** Authors, committers and messages of a commit range. */
export function gitCommitFindings(repo, range, opts = {}) {
  const r = git(repo, ['log', `--format=${COMMIT_LOG_FORMAT}`, range]);
  if (r.status !== 0) throw new Error(`git log ${range} failed: ${r.stderr}`);
  return commitLogFindings(r.stdout.toString('utf8'), opts);
}

/** Findings in `git log --format=COMMIT_LOG_FORMAT` output. */
export function commitLogFindings(logText, opts = {}) {
  const out = [];
  for (const rec of String(logText).split('\x1e')) {
    const [sha, ae, ce, msg] = rec.replace(/^\s+/, '').split('\0');
    if (!sha) continue;
    const label = `(commit ${sha.slice(0, 10)})`;
    for (const [who, e] of [['author', ae], ['committer', ce]]) {
      if (!authorAllowed(e)) out.push({ file: label, line: 0, col: 0, rule: 'git-author', severity: 'error', message: `${who} e-mail is not a noreply address`, text: e });
    }
    out.push(...scanText(msg || '', { ...opts, rel: '', label: `${label} message` }));
  }
  return out;
}

// ─── Report ────────────────────────────────────────────────────────────────
export function countByRule(findings) {
  const c = {};
  for (const f of findings) c[f.rule] = (c[f.rule] || 0) + 1;
  return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
}
export function formatFinding(f, { show = false } = {}) {
  const loc = f.line ? `${f.file}:${f.line}:${f.col}` : f.file;
  const sev = f.severity === 'warn' ? 'warning' : 'error';
  const ex = !f.text ? '' : f.term ? '' : `  "${show ? f.text : mask(f.text)}"`;
  return `${loc}  ${sev} [${f.rule}] ${f.message}${ex}`;
}

export async function main(argv = process.argv.slice(2), { log = console.log, error = console.error, env = process.env } = {}) {
  const vals = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : a.startsWith(n + '=') ? [a.slice(n.length + 1)] : []));
  const val = (n) => vals(n)[0];
  const has = (n) => argv.includes(n);
  if (has('--help') || has('-h')) { log('usage: node tools/privacy-scan.mjs [<dir>] [--staged] [--repo <dir>] [--commits <range>] [--terms <file>|--no-terms] [--terms-from <data dir>] [--allow <file>|--no-allow] [--exclude <glob>] [--no-gitignore] [--deep [--deep-words]] [--summary] [--json] [--show] [--strict]'); return 0; }
  const withValue = new Set(['--repo', '--commits', '--terms', '--terms-from', '--allow', '--exclude']);
  const positional = argv.filter((a, i) => !a.startsWith('--') && !withValue.has(argv[i - 1]));
  const repo = resolve(val('--repo') || positional[0] || (has('--staged') ? process.cwd() : REPO));
  const root = resolve(positional[0] || REPO);

  // Private terms: a term file and/or a data folder.
  let terms = null, termInfo = 'none (generic rules only)';
  const list = [];
  if (!has('--no-terms')) {
    const info = [];
    const given = val('--terms');
    const cands = given === '-' ? [] : given ? [resolve(given)]
      : [DEFAULT_TERMS(has('--staged') ? repo : REPO), env.DASHBOARD_DATA_DIR && join(resolve(env.DASHBOARD_DATA_DIR), 'privacy-terms.txt')].filter(Boolean);
    const file = cands.find(f => existsSync(f)) || cands[0];
    if (given && given !== '-' && !existsSync(file)) { error(`privacy-scan: term file not found: ${file}`); return 2; }
    if (given === '-' || existsSync(file)) {
      let text;
      try { text = given === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8'); } catch (e) { error(`privacy-scan: cannot read the terms: ${e.message}`); return 2; }
      const p = parseTerms(text);
      for (const w of p.warnings) error(`privacy-scan: ${w}`);
      list.push(...p.terms);
      info.push(`${p.terms.length} private term(s) from ${given === '-' ? 'standard input' : given ? 'the given file' : 'the default term file'}`);
    }
    const from = val('--terms-from');
    if (from) {
      const dir = resolve(from);
      if (!existsSync(join(dir, 'config.json')) && !existsSync(join(dir, 'state', 'dashboard-state.json'))) { error(`privacy-scan: not a data folder (no config.json or state/dashboard-state.json): ${dir}`); return 2; }
      const d = deriveTerms(dir);
      list.push(...d.terms);
      const kinds = Object.entries(d.counts).map(([k, n]) => `${n} ${k}`).join(', ');
      info.push(`${d.terms.length} from the data folder${kinds ? ` (${kinds})` : ''}`);
    }
    if (info.length) { terms = termMatcher(list); termInfo = info.join(' + '); }
  }
  // Allowlist.
  let allow = { allowed: () => false, entries: [], project: null };
  if (!has('--no-allow')) {
    try { allow = loadAllow(val('--allow') ? resolve(val('--allow')) : DEFAULT_ALLOW()); } catch (e) { error(`privacy-scan: ${e.message}`); return 2; }
  }
  const opts = { terms, allowed: allow.allowed, project: allow.project, deep: null };
  // --deep: more terms from the data folder and this computer, terms inside
  // identifiers, hashes, encoded text, machine ids, coordinates (tools/privacy-deep.mjs).
  if (has('--deep')) {
    const D = await import('./privacy-deep.mjs');
    const from = val('--terms-from');
    const d = has('--no-terms') ? { terms: [], coords: [], counts: {} } : D.deriveDeepTerms(from ? resolve(from) : null, { baseTerms: list, env, words: has('--deep-words') });
    opts.deep = D.makeDeep({ terms: [...list, ...d.terms], coords: d.coords, project: allow.project });
    const kinds = Object.entries(d.counts).map(([k, n]) => `${n} ${k}`).join(', ');
    termInfo += `; deep pass: ${d.terms.length} more term(s)${kinds ? ` (${kinds})` : ''}, ${d.coords.length} saved location(s)`;
  }

  let findings = [], files = 0, skipped = [], target;
  try {
    if (has('--staged')) {
      target = `git index of ${repo}`;
      for (const e of gitIndexFiles(repo)) {
        if (vals('--exclude').map(globToRegExp).some(re => re.test(e.rel))) { skipped.push({ rel: e.rel, why: '--exclude' }); continue; }
        const fb = forbiddenPath(e.rel, false) || (e.rel.split('/').slice(0, -1).map((_, i, a) => forbiddenPath(a.slice(0, i + 1).join('/'), true)).find(Boolean));
        if (fb) { findings.push(fb); continue; }
        findings.push(...scanPathName(e.rel, opts).filter(f => !allow.allowed(f, e.rel)));
        if (opts.deep) findings.push(...opts.deep.scanName(e.rel, allow.allowed));
        if (e.mode === '160000') continue;   // submodule
        files++;
        findings.push(...scanFile(e.rel, e.data, opts));
      }
      findings.push(...gitIdentityFindings(repo, env));
    } else {
      target = root;
      const r = scanTree(root, { ...opts, exclude: vals('--exclude'), useGitignore: !has('--no-gitignore') });
      findings = r.findings; files = r.files; skipped = r.skipped;
    }
    if (val('--commits')) findings.push(...gitCommitFindings(repo, val('--commits'), opts));
  } catch (e) { error(`privacy-scan: ${e.message}`); return 2; }

  const errors = findings.filter(f => f.severity === 'error').length;
  const warns = findings.length - errors;
  const counts = countByRule(findings);
  // Private-term entries can only be used when private terms were loaded.
  const unused = allow.entries.filter(e => !e.used && (terms || e.rule !== 'private-term'));
  if (has('--json')) {
    const show = has('--show');
    log(JSON.stringify({ target, files, terms: termInfo, counts, errors, warnings: warns,
      skipped, unusedAllow: unused.map(e => ({ rule: e.rule, path: e.path })), ...(opts.deep ? { deepNotListed: opts.deep.suppressed() } : {}),
      findings: findings.map(f => ({ ...f, text: f.term ? undefined : show ? f.text : mask(f.text), term: undefined })) }, null, 1));
  } else {
    if (!has('--summary')) for (const f of findings) log(formatFinding(f, { show: has('--show') }));
    log(`privacy-scan: ${target}`);
    log(`  ${files} files scanned; private terms: ${termInfo}; ${allow.entries.length} allowlist entries`);
    for (const s of skipped) log(`  skipped ${s.rel}: ${s.why}`);
    for (const e of unused) log(`  note: allowlist entry not used (${e.rule} ${e.path}): remove it?`);
    const hid = opts.deep && opts.deep.suppressed();
    if (hid && hid.hits) log(`  deep pass: ${hid.hits} more hit(s) of ${hid.terms} single-word term(s) not listed (the first 3 places of each are)`);
    if (findings.length) for (const [rule, n] of Object.entries(counts)) log(`  ${String(n).padStart(5)}  ${rule}`);
    log(`  ${errors} error(s), ${warns} warning(s)${errors ? ' - NOT safe to publish' : warns ? ' - review the warnings' : ' - clean'}`);
  }
  return errors || (has('--strict') && warns) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; });
}

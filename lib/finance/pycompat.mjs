// lib/finance/pycompat.mjs - the small pieces of Python behaviour the finance
// pipeline depends on, reproduced exactly so the Node port gives the same
// numbers, keys and text as the original spend.py:
//
//   pyRound(x, nd)        round(x, nd): correctly rounded, ties to even
//   pyFixed(x, nd)        f"{x:.{nd}f}"
//   pyComma2(x)           f"{x:,.2f}"
//   pyRepr(x)             repr(float) (how csv/str writes a float)
//   pyFloat(s)            float(s) (throws like Python on bad input)
//   cmpStr(a, b)          Python str ordering (by code point)
//   splitlines(s)         str.splitlines()
//   pyStrip / pySplit     str.strip() / str.split() with Python's whitespace set
//   W / WS / ND           regex classes for Python's Unicode \w, \s, \d
//   strftime(d, fmt)      %Y %m %d %b %B %a (English, like the C locale)
//
// Node stdlib only. Pure functions, no I/O.

// ─── Rounding ──────────────────────────────────────────────────────────────

// x = mant * 2^exp exactly, as BigInts (finite, non-zero x).
function decompose(x) {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, Math.abs(x));
  const hi = buf.getUint32(0), lo = buf.getUint32(4);
  const bexp = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let exp;
  if (bexp === 0) exp = -1074;                  // subnormal
  else { mant |= 1n << 52n; exp = bexp - 1075; }
  return { mant, exp };
}

/** Digits of |x| rounded to nd decimals (ties to even), as a string. */
function roundDigits(x, nd) {
  const ax = Math.abs(x);
  const s = ax.toFixed(nd);                     // exact value, ties away from zero
  if (ax === 0) return s;
  const { mant, exp } = decompose(ax);
  if (exp >= 0) return s;                       // an integer: no tie possible
  // Tie iff 2 * |x| * 10^nd is an odd integer.
  const num = mant * 2n * 10n ** BigInt(nd);
  const den = 1n << BigInt(-exp);
  if (num % den !== 0n) return s;
  const q = num / den;
  if (q % 2n === 0n) return s;
  // Exact half: toFixed rounded up; Python wants the even neighbour.
  const lowN = (q - 1n) / 2n;                   // floor(|x| * 10^nd)
  const n = lowN % 2n === 0n ? lowN : lowN + 1n;
  let digits = n.toString();
  if (nd > 0) {
    digits = digits.padStart(nd + 1, '0');
    digits = digits.slice(0, -nd) + '.' + digits.slice(-nd);
  }
  return digits;
}

function negative(x) { return x < 0 || Object.is(x, -0); }

/** Python round(x, nd) for a float (nd >= 0). */
export function pyRound(x, nd = 0) {
  if (!Number.isFinite(x)) return x;
  const v = Number(roundDigits(x, nd));
  return negative(x) ? -v : v;
}

/** Python f"{x:.{nd}f}". */
export function pyFixed(x, nd) {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  return (negative(x) ? '-' : '') + roundDigits(x, nd);
}

/** Python f"{x:,.2f}" (thousands separators). */
export function pyComma2(x) {
  const s = pyFixed(x, 2);
  const neg = s.startsWith('-');
  const [i, f] = (neg ? s.slice(1) : s).split('.');
  return (neg ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + f;
}

/** Python repr(float). */
export function pyRepr(x) {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  if (Object.is(x, -0)) return '-0.0';
  const ax = Math.abs(x);
  if (ax !== 0 && (ax >= 1e16 || ax < 1e-4)) {
    const [m, e] = x.toExponential().split('e');
    const n = Number(e);
    return `${m}e${n < 0 ? '-' : '+'}${String(Math.abs(n)).padStart(2, '0')}`;
  }
  const s = String(x);
  return /^-?\d+$/.test(s) ? s + '.0' : s;
}

const DIGITS = '\\d(?:_?\\d)*';
const FLOAT_RE = new RegExp(`^[+-]?(?:${DIGITS}(?:\\.(?:${DIGITS})?)?|\\.${DIGITS})(?:[eE][+-]?${DIGITS})?$`);

/** Python float(s) for the inputs a bank CSV can hold. Throws on bad input. */
export function pyFloat(s) {
  const t = pyStrip(String(s));
  if (FLOAT_RE.test(t)) return Number(t.replace(/_/g, ''));
  const w = t.toLowerCase().replace(/^[+-]/, '');
  if (w === 'inf' || w === 'infinity') return t.startsWith('-') ? -Infinity : Infinity;
  if (w === 'nan') return NaN;
  const e = new Error(`could not convert string to float: '${t}'`);
  e.name = 'ValueError';
  throw e;
}

// ─── Strings ───────────────────────────────────────────────────────────────

/** Python's ordering of str: by code point (UTF-16 order differs above U+D7FF). */
export function cmpStr(a, b) {
  if (a === b) return 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    let x = a.charCodeAt(i), y = b.charCodeAt(i);
    if (x !== y) {
      if (x >= 0xd800 && y >= 0xd800) {
        x = x >= 0xe000 ? x - 0x800 : x + 0x2000;
        y = y >= 0xe000 ? y - 0x800 : y + 0x2000;
      }
      return x < y ? -1 : 1;
    }
  }
  return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
}

/** Number of code points (Python len). */
export const pyLen = (s) => { let n = 0; for (const _ of s) n++; return n; };
/** s[:n] by code points. */
export function pySlice(s, n) {
  let out = '', i = 0;
  for (const ch of s) { if (i++ >= n) break; out += ch; }
  return out;
}

// Python's str.isspace() set (also what \s matches in a str pattern).
const WS_CHARS = '\\t\\n\\x0b\\x0c\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000';
export const WS = `[${WS_CHARS}]`;
export const W = '[\\p{L}\\p{N}_]';            // Python \w (str patterns)
export const ND = '\\p{Nd}';                    // Python \d (str patterns)
const WS_RUN = new RegExp(`${WS}+`, 'gu');
const LEAD = new RegExp(`^${WS}+`, 'u'), TRAIL = new RegExp(`${WS}+$`, 'u');

export const pyStrip = (s) => String(s).replace(LEAD, '').replace(TRAIL, '');
export const pySplit = (s) => String(s).split(WS_RUN).filter(Boolean);
/** re.sub(r"\s+", " ", s) */
export const collapseWs = (s) => String(s).replace(WS_RUN, ' ');
/** s.strip(chars) */
export function stripChars(s, chars) {
  let a = 0, b = s.length;
  while (a < b && chars.includes(s[a])) a++;
  while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}

// Built from strings so this file stays plain ASCII (U+2028/2029 are line breaks).
const LB_CLASS = '[\\n\\r\\x0b\\x0c\\x1c\\x1d\\x1e\\x85\\u2028\\u2029]';
const LINE_BREAK = new RegExp(`\\r\\n|${LB_CLASS}`);
const LINE_BREAK_END = new RegExp(`(\\r\\n|${LB_CLASS})$`);

/** str.splitlines() */
export function splitlines(s) {
  if (!s) return [];
  const parts = s.split(LINE_BREAK);
  if (LINE_BREAK_END.test(s)) parts.pop();
  return parts;
}

/** str.isalnum() for one character. */
export const isAlnum = (ch) => /^[\p{L}\p{N}]$/u.test(ch);

/** Python \b as a JS (u-flag) regex fragment. */
export const B = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`;

// ─── Dates ─────────────────────────────────────────────────────────────────

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_ABBR = MONTHS_FULL.map(m => m.slice(0, 3));
const DAYS_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export { MONTHS_FULL };

/** Days since 1970-01-01 for an ISO date. Dates are pure calendar days (no time zone). */
export function dayNum(iso) {
  return Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);
}
export function isoOf(n) {
  const d = new Date(n * 864e5);
  const y = d.getUTCFullYear();
  return `${String(y).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
/** Monday = 0 (Python date.weekday()). */
export const weekday = (n) => ((n % 7) + 7 + 3) % 7;

/** strftime for %Y %m %d %b %B %a %H %M on a day number (or Date for %H/%M). */
export function strftime(n, fmt) {
  const d = new Date(n * 864e5);
  return fmt.replace(/%([YmdbBa%])/g, (_, c) => ({
    Y: String(d.getUTCFullYear()).padStart(4, '0'),
    m: String(d.getUTCMonth() + 1).padStart(2, '0'),
    d: String(d.getUTCDate()).padStart(2, '0'),
    b: MONTHS_ABBR[d.getUTCMonth()],
    B: MONTHS_FULL[d.getUTCMonth()],
    a: DAYS_ABBR[weekday(n)],
    '%': '%',
  }[c]));
}

// datetime.strptime for the formats spend.py tries, with Python's own rules:
// regex match from the start, then "unconverted data remains" if it did not
// consume everything; case-insensitive month names; invalid days rejected.
const DIRECTIVE = {
  d: '(3[01]|[12][0-9]|0[1-9]|[1-9]| [1-9])',
  m: '(1[0-2]|0[1-9]|[1-9])',
  Y: '([0-9][0-9][0-9][0-9])',
  y: '([0-9][0-9])',
  b: '(' + MONTHS_ABBR.map(s => s.toLowerCase()).join('|') + ')',
  B: '(' + MONTHS_FULL.map(s => s.toLowerCase()).sort((a, b) => b.length - a.length).join('|') + ')',
};
const strpCache = new Map();
function strpRegex(fmt) {
  if (strpCache.has(fmt)) return strpCache.get(fmt);
  const order = [];
  let src = '';
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i];
    if (c === '%') { const k = fmt[++i]; order.push(k); src += DIRECTIVE[k]; }
    else if (/\s/.test(c)) { src += `${WS}+`; while (i + 1 < fmt.length && /\s/.test(fmt[i + 1])) i++; }
    else src += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  const out = { re: new RegExp('^' + src, 'iu'), order };
  strpCache.set(fmt, out);
  return out;
}
/** Returns an ISO date or throws (like datetime.strptime(...).date()). */
export function strptimeDate(s, fmt) {
  const { re, order } = strpRegex(fmt);
  const m = re.exec(s);
  if (!m) throw new Error(`time data '${s}' does not match format '${fmt}'`);
  if (m[0].length !== s.length) throw new Error(`unconverted data remains: ${s.slice(m[0].length)}`);
  let y = 1900, mo = 1, d = 1;
  order.forEach((k, i) => {
    const v = m[i + 1];
    if (k === 'd') d = parseInt(v.trim(), 10);
    else if (k === 'm') mo = parseInt(v, 10);
    else if (k === 'Y') y = parseInt(v, 10);
    else if (k === 'y') { y = parseInt(v, 10); y += y <= 68 ? 2000 : 1900; }
    else if (k === 'b') mo = MONTHS_ABBR.findIndex(x => x.toLowerCase() === v.toLowerCase()) + 1;
    else if (k === 'B') mo = MONTHS_FULL.findIndex(x => x.toLowerCase() === v.toLowerCase()) + 1;
  });
  const dim = new Date(Date.UTC(2000, mo, 0)).getUTCDate();
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const max = mo === 2 ? (leap ? 29 : 28) : dim;
  if (y < 1 || d < 1 || d > max) throw new Error('day is out of range for month');
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ─── Text decoding (spend.py's _read_text) ────────────────────────────────

// cp1252 bytes 0x80-0x9F; null = undefined in cp1252 (Python then falls back to latin-1).
const CP1252 = [0x20ac, null, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, null, 0x017d, null,
  null, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, null, 0x017e, 0x0178];

/** utf-8 (BOM stripped), else cp1252, else latin-1: the first that decodes. */
export function decodeText(buf) {
  try {
    const t = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t;
  } catch { /* not utf-8 */ }
  let cp = true;
  for (const b of buf) if (b >= 0x80 && b <= 0x9f && CP1252[b - 0x80] === null) { cp = false; break; }
  let out = '';
  for (const b of buf) out += String.fromCharCode(cp && b >= 0x80 && b <= 0x9f ? CP1252[b - 0x80] : b);
  return out;
}

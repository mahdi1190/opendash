// lib/finance/categorise.mjs - merchant names and categories, exactly as
// spend.py worked them out:
//
//   cleanMerchant(memo)    "TESCO STORES 1234 ON 02 JUL BCC" -> "TESCO STORES"
//   niceTitle(s)           display case that keeps "SAM'S" as "Sam's"
//   new Categoriser(rules) (memo, merchant, amount, sub, bankCategory) -> [category, how]
//                          order: merchant_overrides -> keyword rules ->
//                          bank_category_map -> defaults
//
// The regexes are Python's (Unicode \w, \d, \s and \b), translated with the
// helpers in pycompat.mjs so every memo cleans to the same merchant.

import { WS, W, ND, B, pyStrip, pySplit, collapseWs, stripChars, pyLen, isAlnum } from './pycompat.mjs';

const ANY = '[^\\n]';   // Python "." (no DOTALL)
const TRAILERS = new RegExp(`${WS}+(ON ${ND}{1,2} [A-Z]{3}( ${ND}{2,4})?)${B}${ANY}*$`, 'u');
const CODES = new RegExp(`${WS}+(BCC|CLP|BGC|DDR|DD|STO|SO|FPI|FPO|TFR|BP|CPT|POS|VIS|DEB|CHG|ATM)$`, 'u');
const MONTHS = new RegExp(`^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)(${ND}{2,4})?$`, 'u');
const CODE_TOKEN = new RegExp(`^(?=${ANY}*${ND})(?=${ANY}*[A-Z])[A-Z0-9]{4,}$|^${ND}+$`, 'u');
const CARD = new RegExp(`${B}${ND}{4}\\*+${ND}{4}${B}|${B}${ND}{6,}${B}`, 'gu');
const NOT_WORDISH = new RegExp(`[^\\p{L}\\p{N}_&@./' -]`, 'gu');
const KEEP_TAIL = new Set(['SQ', 'SUMUP', 'ZETTLE', 'IZ', 'PAYPAL']);
const KEEP_HEAD_NOT = new Set(['SQ', 'SUMUP', 'ZETTLE', 'IZ', 'PAYPAL', 'UBER', 'LIME']);

/** The merchant inside a bank memo (upper case). */
// Direct finance connections (lib/fin-connect/normalise.mjs) keep a converted
// payment's original amount at the end of its memo: "... (<amount> <CCY> @ <rate>)".
// It is not part of the merchant (otherwise every converted row is its own
// merchant). Bank exports never end like this, so spend.py parity is unchanged.
const FX_NOTE = /\s*\(\d+(?:\.\d+)? [A-Z]{3} @ \d+(?:\.\d+)?\)$/;

export function cleanMerchant(memo) {
  let m = pyStrip(String(memo).toUpperCase()).replace(FX_NOTE, '');
  m = m.replace(TRAILERS, '');
  for (let i = 0; i < 2; i++) m = m.replace(CODES, '');
  m = m.replace(CARD, '');
  if (m.includes('*')) {
    const at = m.indexOf('*');
    const head = m.slice(0, at), tail = m.slice(at + 1);
    const hs = pyStrip(head);
    if (pyLen(hs) >= 3 && !KEEP_HEAD_NOT.has(hs)) m = head;
    else if (KEEP_TAIL.has(hs) && pyStrip(tail)) m = tail;
    else { const t = pySplit(tail); m = `${hs} ${t.length ? t[0] : ''}`; }
  }
  m = m.replace(NOT_WORDISH, ' ');
  const toks = pySplit(m);
  while (toks.length > 1 && (MONTHS.test(toks[toks.length - 1]) || CODE_TOKEN.test(toks[toks.length - 1]))) toks.pop();
  m = stripChars(collapseWs(toks.join(' ')), ' .-');
  return m || pyStrip(String(memo).toUpperCase());
}

const WORD = /[\p{L}\p{Nl}\p{No}]+(?:'[\p{L}\p{Nl}\p{No}]+)?/gu;
/** Title case for display; its toUpperCase() is the cleaned merchant again. */
export function niceTitle(s) {
  return String(s).toLowerCase().replace(WORD, w => { const [first, ...rest] = [...w]; return first.toUpperCase() + rest.join('').toLowerCase(); });
}

function keywordPattern(word) {
  const w = pyStrip(String(word)).toUpperCase();
  const chars = [...w];
  const left = isAlnum(chars[0]) ? B : '';
  const right = isAlnum(chars[chars.length - 1]) ? B : '';
  return new RegExp(left + w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + right, 'u');
}

export const DEFAULT_CATEGORIES = ['Uncategorised', 'Income', 'Internal transfers', 'Payments to people', 'Cash'];

export class Categoriser {
  constructor(rules) {
    if (!rules || typeof rules !== 'object' || !Array.isArray(rules.rules)) throw new Error('rules.json has no "rules" list');
    this.exclude = new Set(Array.isArray(rules.exclude_from_spending) ? rules.exclude_from_spending : []);
    this.overrides = new Map();
    for (const [k, v] of Object.entries(rules.merchant_overrides || {})) this.overrides.set(k.toUpperCase(), v);
    this.rules = rules.rules.map(r => [r.category, (r.match || []).filter(w => pyStrip(String(w))).map(keywordPattern)]);
    this.bankMap = new Map();
    for (const [k, v] of Object.entries(rules.bank_category_map || {})) {
      if (String(k).startsWith('_') || typeof v !== 'string' || !pyStrip(v)) continue;
      this.bankMap.set(pyStrip(String(k)).toLowerCase(), v);
    }
  }

  /** Every category the rules can produce (plus the built-in ones). */
  categories() {
    const s = new Set([...DEFAULT_CATEGORIES, ...this.exclude, ...this.overrides.values(), ...this.bankMap.values()]);
    for (const [c] of this.rules) s.add(c);
    return s;
  }

  /** -> [category, how]; how is override | rule | bank | default | unmatched. */
  categorise(memo, merchant, amount, sub, bc) {
    if (this.overrides.has(merchant)) return [this.overrides.get(merchant), 'override'];
    const text = ` ${String(memo).toUpperCase()} `;
    const subU = String(sub || '').toUpperCase();
    for (const [cat, pats] of this.rules) {
      if (pats.some(p => p.test(text))) {
        if (amount > 0 && cat === 'Cash') return ['Income', 'rule'];
        return [cat, 'rule'];
      }
    }
    if (bc) {
      const cat = this.bankMap.get(pyStrip(String(bc)).toLowerCase());
      if (cat) {
        if (amount > 0 && cat === 'Cash') return ['Income', 'bank'];
        return [cat, 'bank'];
      }
    }
    if (subU.includes('CASH') && amount < 0) return ['Cash', 'rule'];
    if (amount > 0) return ['Income', 'default'];
    if (['FT', 'TRANSFER', 'FPO', 'STO', 'STANDING ORDER', 'SO'].includes(subU)) return ['Payments to people', 'default'];
    return ['Uncategorised', 'unmatched'];
  }
}

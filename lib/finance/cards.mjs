// lib/finance/cards.mjs - credit cards in Money. Pure rules plus the one small file they keep.
//
// A card reaches the store two ways: Enable Banking (an account of kind 'card', signs and balance from
// the bank) or a file from the card's website. Card files often list purchases as POSITIVE and payments
// as negative, the opposite of a bank file, so an upload that looks like a card is checked with the
// person first (cardPreview), then saved in the store's own direction under one stable account key
// (cardFile), so overlapping files de-duplicate exactly as bank files do.
//
// THE RULES (markCardRows, run before the transfer match):
//   a charge on the card     spending, on its date
//   money back on the card   a refund: takes spending down, never income
//   a payment to the card    a transfer on both sides: the card's "payment received" row and the bank's
//                            "AMEX" row. rules.json is only written once, so these names live here: they
//                            work for people whose rules.json is older than this file. A person's own
//                            merchant choice (match 'override') is always left alone.
//   a bank payment to a card that is not here   still a transfer (the spending is on the card), and the
//                            note "You pay a card we can't see" says so: unseen in analysis.card_unseen
//
// <finance>/_system/cards.json:
//   {v, cards: {key: {name, issuer, bank, flip, guess?, balance: {amount, date, from: 'typed'|'statement'},
//                     pay: {how: 'full'|'min'|'fixed', amount, day, fromCurrent}}},
//    files: {signature: key | false}}   what a kind of file turned out to be (false: not a card)
//
// The analysis gets `cards` ([{key, name, bank, issuer, owed, asOf, from, pay, lastPaid, to, file}], counted
// ones only) and `card_unseen`. A card's balance never joins analysis.balances: it is money owed, so
// every total of spending money stays clean by itself.
// cardDebts(analysis): the card's balance and date, for the money plan's debts.
// Logs carry counts only.

import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readJson, writeJson, withLock } from '../fsutil.mjs';
import { dataKey, merge, money, parseDate, rowKeyStr } from './store.mjs';
import { cleanMerchant, niceTitle } from './categorise.mjs';
import { transferCategory } from './transfers.mjs';
import { accountKey, plainFile } from './data-sources.mjs';
import { writeCsv } from './csv.mjs';
import { PLACE_COLS, placeCells } from './place.mjs';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const up = (s) => String(s == null ? '' : s).toUpperCase().replace(/[_\s]+/g, ' ').trim();
const toPence = (x) => Math.round(Number(x) * 100);

// ─── Who issued it ──────────────────────────────────────────────────────
const CARD_WORD = '(?:CREDIT ?CARD|CREDIT ?CRD|CC|MASTERCARD|MSTRCRD|VISA ?CARD)';
const ISSUERS = [
  ['amex', 'American Express', /\bAMEX|\bAMERICAN ?EXP/],
  ['barclaycard', 'Barclaycard', /\bBARCLAYCARD\b|\bBARCLAYS? ?(?:CREDIT ?CARD|CC)\b/],
  ['mbna', 'MBNA', /\bMBNA\b/],
  ['capitalone', 'Capital One', /\bCAPITAL ?ONE\b/],
  ['vanquis', 'Vanquis', /\bVANQUIS\b/],
  ['newday', 'NewDay', /\bNEWDAY\b/],
  ['aqua', 'Aqua', /\bAQUA ?(?:CARD|CREDIT)\b/],
  ['marbles', 'Marbles', /\bMARBLES ?(?:CARD|CREDIT)\b/],
  ['fluid', 'Fluid', /\bFLUID ?(?:CARD|CREDIT)\b/],
  ['opus', 'Opus', /\bOPUS ?(?:CARD|CREDIT)\b/],
  ['tesco', 'Tesco Bank', /\bTESCO ?(?:BANK|CREDIT ?CARD|CC)\b/],
  ['sainsburys', 'Sainsbury’s Bank', /\bSAINSBURY'?S? ?(?:BANK|CREDIT ?CARD|CC)\b/],
  ['ms', 'M&S Bank', /\bM ?& ?S ?(?:BANK|CREDIT ?CARD|CC)\b|\bMARKS ?(?:AND|&) ?SPENCER ?(?:BANK|FINANCIAL|CREDIT)\b/],
  ['johnlewis', 'John Lewis Money', /\bJOHN ?LEWIS ?(?:FINANCE|FINANCIAL|MONEY|CREDIT ?CARD|PARTNERSHIP ?CARD)\b/],
  ...[['hsbc', 'HSBC'], ['lloyds', 'Lloyds'], ['halifax', 'Halifax'], ['natwest', 'NatWest', 'NAT ?WEST'], ['rbs', 'Royal Bank of Scotland', 'RBS|ROYAL BANK OF SCOTLAND'], ['santander', 'Santander'], ['nationwide', 'Nationwide'],
    ['tsb', 'TSB'], ['firstdirect', 'First Direct', 'FIRST ?DIRECT'], ['bos', 'Bank of Scotland', 'BOS|BANK OF SCOTLAND'], ['coop', 'Co-operative Bank', 'CO[- ]?OP(?:ERATIVE)?(?: BANK)?'], ['metro', 'Metro Bank', 'METRO ?BANK'],
    ['virgin', 'Virgin Money', 'VIRGIN(?: MONEY)?'], ['chase', 'Chase'], ['citi', 'Citi', 'CITI(?:BANK)?'], ['discover', 'Discover'], ['monzo', 'Monzo'], ['starling', 'Starling']]
    .map(([id, name, w]) => [id, name, new RegExp(`\\b(?:${w || name.toUpperCase()}) ?${CARD_WORD}\\b`)]),
];
const GENERIC_PAY = /\bCREDIT ?CARD\b|\bCREDITCARD\b|\bCREDIT ?CRD\b|\bCC PAYMENT\b|\bCARD REPAYMENT\b/;
const PAID_TO_CARD = /\bPAYMENTS? (?:RECEIVED|RECVD|THANK|- ?THANK|BY|FROM)\b|\bTHANK ?YOU\b|\bDIRECT DEBIT\b|\bAUTO ?PAY|\bAUTOMATIC PAYMENT\b|\bONLINE PAYMENT\b|\bBALANCE TRANSFER\b|^PAYMENT\b|\bBANK PAYMENT\b|\bFASTER PAYMENT\b|\bBACS\b/;
const CARD_THANKS = /\bPAYMENTS? (?:RECEIVED|RECVD)\b|\bPAYMENT\b.*\bTHANK\b|\bTHANK ?YOU\b/;
const MONEY_BACK = /\bREFUND|\bRETURN|\bREVERSAL|\bCASH ?BACK\b|\bCREDIT VOUCHER\b|\bADJUSTMENT\b/;
const CARD_FEE = /\bINTEREST\b|\bANNUAL FEE\b|\bMEMBERSHIP FEE\b|\bLATE (?:PAYMENT )?FEE\b|\bCASH (?:ADVANCE )?FEE\b|\bFOREIGN (?:EXCHANGE|TRANSACTION) FEE\b|\bNON-?STERLING\b/;

/** {id, name} of the card company a text names, or null. */
export function issuerIn(text) {
  const t = up(String(text == null ? '' : text).replace(/[-.]+/g, ' '));
  for (const [id, name, re] of ISSUERS) if (re.test(t)) return { id, name };
  return null;
}
export function issuerName(id) { const x = ISSUERS.find(i => i[0] === id); return x ? x[1] : null; }

/**
 * A row on a BANK account: is it a payment to a credit card? -> {issuer: {id, name} | null} or null.
 * The bank's own category counts as well (credit_card_repayment): that name alone never matched a memo.
 */
export function cardPaymentIn(memo, bankCategory) {
  const t = up(memo);
  const named = issuerIn(t);
  if (named) return { issuer: named };
  if (GENERIC_PAY.test(t) || String(bankCategory || '').toLowerCase() === 'credit_card_repayment') return { issuer: null };
  return null;
}
/** A positive row on a CARD: did money come from the person's bank? */
const paidToCard = (memo) => { const t = up(memo); return !MONEY_BACK.test(t) && PAID_TO_CARD.test(t); };

// ─── Is this file a card? Which way round is it? ────────────────────────
const CARD_HEADERS = /extended details|appears on your statement|card ?member|card ?holder|card (?:number|no\b|ending)|credit card/;
const AMEX_LAYOUT = /extended details|appears on your statement/;

/** -> {likely, strong, flip, issuer, why} for parsed rows (store.mjs parseCsv). */
export function cardLook(rows, name, cat) {
  const meta = rows.meta || {};
  const heads = meta.headers || [];
  const file = plainFile(name);
  let issuer = issuerIn(file);
  if (!issuer && heads.some(h => AMEX_LAYOUT.test(h))) issuer = { id: 'amex', name: 'American Express' };
  const why = [];
  if (heads.some(h => CARD_HEADERS.test(h))) why.push('headers');
  if (issuer) why.push('name');
  if (/credit.?card|card.?statement/i.test(file)) why.push('file');
  if (rows.some(r => /^[x*]{3,}|[x*]{4,}[- ]?\d/i.test(String(r.account || '')))) why.push('account');
  // Only the card's own wording counts here: "DIRECT DEBIT" is on every bank statement too.
  const thanks = rows.filter(r => r.amount && CARD_THANKS.test(up(r.memo)));
  let pos = 0, neg = 0, knownPos = 0, knownNeg = 0;
  for (const r of rows) {
    if (r.amount > 0) pos++; else if (r.amount < 0) neg++;
    if (!cat || !r.amount || paidToCard(r.memo)) continue;
    const [c, how] = cat.categorise(r.memo, cleanMerchant(r.memo), -1, '', null);
    if ((how === 'rule' || how === 'override') && !cat.exclude.has(c)) { if (r.amount > 0) knownPos++; else knownNeg++; }
  }
  const share = pos + neg ? pos / (pos + neg) : 0;
  // Which way round: the file saying so, then its payments to the card (money in on the card, so a
  // negative one means purchases are positive), then shops we know, then the plain majority.
  let flip;
  if (meta.marked) flip = false;
  else if (thanks.length) flip = thanks.filter(r => r.amount < 0).length * 2 > thanks.length;
  else if (knownPos + knownNeg >= 3) flip = knownPos > knownNeg;
  else flip = share >= 0.6;
  const strong = why.length > 0 || (thanks.length > 0 && flip);
  const likely = strong || (flip && rows.length >= 3 && share >= 0.6);
  return { likely, strong, flip: !!flip, issuer, why };
}

/** What a kind of file is remembered by: its columns, its name without dates, the end of its account number. */
export function fileSignature(rows, name) {
  const meta = rows.meta || {};
  const stem = plainFile(name).toLowerCase().replace(/\.csv$/, '').replace(/[\d_\-\s.()]+/g, ' ').trim();
  const acc = rows.find(r => r.account);
  const tail = acc ? String(acc.account).replace(/[^A-Za-z0-9]/g, '').slice(-5) : '';
  return createHash('sha1').update(`${(meta.headers || []).join(',')}|${stem}|${tail}`, 'utf8').digest('hex').slice(0, 16);
}

function statementIn(rows) {
  const meta = rows.meta || {};
  // A running balance: the newest row (files run either way).
  if (meta.balances && meta.balances.length === rows.length && rows.length) {
    const asc = rows[0].date <= rows[rows.length - 1].date;
    const i = asc ? rows.length - 1 : 0;
    try { const v = Math.abs(money(meta.balances[i])); if (Number.isFinite(v) && String(meta.balances[i]).trim()) return { amount: Math.round(v * 100) / 100, date: rows[i].date, from: 'statement' }; } catch { /* no number */ }
  }
  // A line above the table: "Statement balance: £612.40", "Closing balance on 14 Oct 2026 ..."
  for (const line of meta.preamble || []) {
    const m = /(?:statement|closing|new|current|outstanding)\s+balance[^\d£$€]*([£$€]?\s?[\d,]+\.\d{2})/i.exec(line);
    if (!m) continue;
    let v; try { v = Math.abs(money(m[1])); } catch { continue; }
    let date = null;
    const d = /(\d{1,2}[/\- ](?:\d{1,2}|[A-Za-z]{3,9})[/\- ]\d{2,4}|\d{4}-\d{2}-\d{2})/.exec(line);
    if (d) { try { date = parseDate(d[1]); } catch { date = null; } }
    if (Number.isFinite(v)) return { amount: Math.round(v * 100) / 100, date: date || rows.reduce((a, r) => (r.date > a ? r.date : a), ''), from: 'statement' };
  }
  return null;
}

// ─── The file ───────────────────────────────────────────────────────────
export const cardsFile = (dir) => join(dir, '_system', 'cards.json');
const cleanBalance = (b) => (isObj(b) && Number.isFinite(b.amount) && ISO.test(String(b.date)) ? { amount: b.amount, date: b.date, from: b.from === 'statement' ? 'statement' : 'typed' } : null);
export function cleanPay(p) {
  if (!isObj(p) || !['full', 'min', 'fixed'].includes(p.how)) return null;
  const day = Math.round(Number(p.day));
  const amount = Number(p.amount);
  return { how: p.how, ...(Number.isFinite(amount) && amount > 0 ? { amount: Math.round(amount * 100) / 100 } : {}), day: day >= 1 && day <= 31 ? day : null, fromCurrent: p.fromCurrent !== false };
}
export function cleanCards(v) {
  const o = isObj(v) ? v : {};
  const cards = {};
  for (const [k, c] of Object.entries(isObj(o.cards) ? o.cards : {})) {
    if (!isObj(c)) continue;
    const bal = cleanBalance(c.balance), pay = cleanPay(c.pay);
    cards[k] = { name: typeof c.name === 'string' ? c.name.slice(0, 60) : null, issuer: typeof c.issuer === 'string' ? c.issuer : null, bank: typeof c.bank === 'string' ? c.bank : null, flip: !!c.flip,
      ...(c.guess ? { guess: true } : {}), ...(bal ? { balance: bal } : {}), ...(pay ? { pay } : {}) };
  }
  const files = {};
  for (const [k, x] of Object.entries(isObj(o.files) ? o.files : {})) if (x === false || typeof x === 'string') files[k] = x;
  return { v: 1, cards, files };
}
export async function readCards(dir) {
  if (!dir) return cleanCards(null);
  return cleanCards(await readJson(cardsFile(dir), { fallback: null }).catch(() => null));
}
/** fn(reg) changes it, under the file's lock. */
export async function updateCards(dir, fn) {
  const f = cardsFile(dir);
  return withLock(f, async () => {
    const reg = cleanCards(await readJson(f, { fallback: null }).catch(() => null));
    await fn(reg);
    await writeJson(f, reg, { trailingNewline: true });
    return reg;
  });
}

// ─── What the person sees before a file goes in ─────────────────────────
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
export const cleanCardName = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
/** A stable account key for a card from a file: never a whole card number. */
export function cardKeyFor(name, rows) {
  const acc = rows && rows.find(r => r.account);
  const tail = acc ? String(acc.account).replace(/[^0-9]/g, '').slice(-4) : '';
  return `card-${slug(name) || 'file'}${tail.length === 4 ? '-' + tail : ''}`;
}
const niceRow = (r) => ({ m: niceTitle(cleanMerchant(r.memo)).slice(0, 40), a: Math.abs(Number(r.amount)), d: r.date, pay: paidToCard(r.memo) });
/** Up to 3 ordinary rows of one sign, newest first, then a payment if there is one. */
function samples(rows) {
  const s = [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).map(niceRow);
  return [...s.filter(x => !x.pay).slice(0, 3), ...s.filter(x => x.pay).slice(0, 1)];
}
// A connected account's key (<source id>.<account id>): a file of it is the duplicate check's business, never "more of the same".
const viaBank = (k) => /^[a-z0-9][a-z0-9-]{1,40}\./.test(k);
function overlapCard(rows, stored, reg) {
  const sign = new Map();
  for (const r of rows) { const k = `${r.date}|${Math.abs(toPence(r.amount))}`; sign.set(k, (sign.get(k) || 0) + 1); }
  const hits = new Map();
  for (const r of stored) {
    const key = dataKey(r);
    if (!reg.cards[key] || viaBank(key)) continue;
    const k = `${r.date}|${Math.abs(toPence(r.amount))}`;
    if (sign.get(k)) hits.set(key, (hits.get(key) || 0) + 1);
  }
  const best = [...hits.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= Math.max(3, rows.length * 0.3) ? best[0] : null;
}
/** How a file is read with this choice: amounts in the store's direction, one account key. */
function cardRows(rows, key, flip) {
  return rows.map(r => ({ ...r, amount: flip && r.amount ? -r.amount : r.amount, account: key }));
}

/**
 * The preview of a file that looks like a card, or null (a bank file, or one the person said is not a card).
 * pos and neg are the file's own positive and negative rows: the page swaps them when flipped.
 */
export function cardPreview(rows, name, reg, stored, cat) {
  const sig = fileSignature(rows, name);
  if (reg.files[sig] === false) return null;
  const look = cardLook(rows, name, cat);
  const remembered = typeof reg.files[sig] === 'string' && reg.cards[reg.files[sig]] ? reg.files[sig] : null;
  // The same company, unless the file's account number says it is a second card from them.
  const acc = rows.find(r => r.account);
  const tail = acc ? String(acc.account).replace(/[^0-9]/g, '').slice(-4) : '';
  const sameIssuer = look.issuer ? Object.keys(reg.cards).filter(k => !viaBank(k) && reg.cards[k].issuer === look.issuer.id && (tail.length < 4 || !/-\d{4}$/.test(k) || k.endsWith(`-${tail}`))) : [];
  const known = remembered || overlapCard(rows, stored, reg) || (sameIssuer.length === 1 ? sameIssuer[0] : null);
  if (!known && !look.likely) return null;
  const card = known ? reg.cards[known] : null;
  const marked = !!(rows.meta && rows.meta.marked);
  const flip = marked ? false : card ? !!card.flip : look.flip;
  const guess = (card && card.name) || (look.issuer && look.issuer.name) || 'Credit card';
  const key = known || cardKeyFor(guess, rows);
  const mine = stored.filter(r => dataKey(r) === key);
  const fresh = merge(mine, cardRows(rows, key, flip)).length;
  const from = rows.reduce((a, r) => (!a || r.date < a ? r.date : a), null);
  const to = rows.reduce((a, r) => (!a || r.date > a ? r.date : a), null);
  return {
    key, name: guess, known: !!known, issuer: look.issuer ? look.issuer.id : (card && card.issuer) || null, flip, marked, strong: look.strong,
    rows: rows.length, from, to, fresh, repeat: rows.length - fresh,
    pos: samples(rows.filter(r => r.amount > 0)), neg: samples(rows.filter(r => r.amount < 0)),
    statement: statementIn(rows),
    cards: Object.entries(reg.cards).filter(([, c]) => c.name).map(([k, c]) => ({ key: k, name: c.name })),
  };
}

/** The file as it goes into inbox/: the store's direction, one account key, nothing else of the card's export. */
export function cardFile(rows, key, flip) {
  const withPlace = rows.some(r => r.place);
  const fields = ['Date', 'Description', 'Amount', 'Account', 'Type', ...(withPlace ? PLACE_COLS : [])];
  const list = cardRows(rows, key, flip).map(r => ({ r, place: withPlace ? placeCells(r.place) : null }));
  return writeCsv(fields, list, ({ r, place }, k) => {
    if (k === 'Date') return r.date;
    if (k === 'Description') return r.memo;
    if (k === 'Amount') return String(r.amount);
    if (k === 'Account') return r.account;
    if (k === 'Type') return r.subcategory || '';
    return place[PLACE_COLS.indexOf(k)];
  });
}

/**
 * A file that came in by the folder (no one to ask): what it was last time, or, with strong signs of a
 * card, our best reading, marked as a guess for Your data. -> rows to store, plus whether reg changed.
 */
export function cardRowsFromFolder(rows, name, reg, cat) {
  if (!rows.length || /^bank-sync-/.test(plainFile(name))) return { rows, changed: false };
  if (rows.every(r => reg.cards[r.account])) return { rows, changed: false };   // an upload, already read
  const sig = fileSignature(rows, name);
  if (reg.files[sig] === false) return { rows, changed: false };
  const known = typeof reg.files[sig] === 'string' && reg.cards[reg.files[sig]] ? reg.files[sig] : null;
  if (known) return { rows: cardRows(rows, known, !(rows.meta && rows.meta.marked) && reg.cards[known].flip), changed: false };
  const look = cardLook(rows, name, cat);
  if (!look.strong) return { rows, changed: false };
  const label = look.issuer ? look.issuer.name : 'Credit card';
  const key = cardKeyFor(label, rows);
  const flip = !(rows.meta && rows.meta.marked) && (reg.cards[key] ? reg.cards[key].flip : look.flip);
  if (!reg.cards[key]) reg.cards[key] = { name: label, issuer: look.issuer ? look.issuer.id : null, bank: look.issuer ? look.issuer.name : null, flip, guess: true };
  reg.files[sig] = key;
  const st = statementIn(rows);
  if (st && !reg.cards[key].balance) reg.cards[key].balance = st;
  return { rows: cardRows(rows, key, flip), changed: true };
}
export { statementIn };

// ─── Which sources are cards ────────────────────────────────────────────
/** key -> {name, bank, issuer, connected}: the file cards, plus connected accounts the bank calls a card. */
export function cardMap(reg, sources, balanceDoc) {
  const out = new Map();
  for (const [k, c] of Object.entries(reg ? reg.cards : {})) out.set(k, { name: c.name, bank: c.bank, issuer: c.issuer, connected: false });
  for (const s of Array.isArray(sources) ? sources : []) {
    if (!s || s.capability !== 'bank') continue;
    for (const a of s.accounts || []) {
      if (!a || typeof a.id !== 'string') continue;
      const k = accountKey(s, a);
      const own = out.get(k);
      if (!own && !/card|credit/i.test(String(a.kind || ''))) continue;
      const iss = issuerIn(`${s.label || ''} ${a.name || ''}`);
      out.set(k, { name: (own && own.name) || a.name || s.label || 'Credit card', bank: (own && own.bank) || (iss ? iss.name : s.label) || null, issuer: (own && own.issuer) || (iss ? iss.id : null), connected: true });
    }
  }
  for (const b of balanceDoc && Array.isArray(balanceDoc.accounts) ? balanceDoc.accounts : []) {
    if (b && b.acct && /credit|card/i.test(String(b.kind || '')) && !out.has(String(b.acct))) {
      const iss = issuerIn(b.name);
      out.set(String(b.acct), { name: b.name || 'Credit card', bank: iss ? iss.name : null, issuer: iss ? iss.id : null, connected: true });
    }
  }
  return out;
}

// ─── The rules ──────────────────────────────────────────────────────────
const PAY_WINDOW = 7, UNSEEN_DAYS = 90;
/**
 * Applies the rules to the categorised rows. Mutates them. -> {pays: [{row, issuer, key}], ...}:
 * every bank payment to a card, with the card it went to when that can be told.
 */
export function markCardRows(frame, cards, cat) {
  const tc = transferCategory(cat.exclude);
  const asTransfer = (r) => { r.category = tc; r.match = 'card-payment'; r.spend = 0; r.sp = 0; };
  const pays = [], cardIn = [], cardPaid = [];
  for (const r of frame) {
    const key = dataKey(r);
    if (cards.has(key)) {
      if (r.match === 'override') continue;
      if (r.p > 0) {
        if (paidToCard(r.memo)) { asTransfer(r); continue; }
        // Money back. A category from its name keeps it (a Tesco refund takes Groceries down); money in
        // that only fell to Income because it was positive becomes spending going down.
        if (cat.exclude.has(r.category)) { r.category = 'Uncategorised'; r.match = 'refund'; r.spend = -r.amount; r.sp = -r.p; }
        cardIn.push(r);
      } else if (r.p < 0) {
        // A charge is spending, even when a keyword thinks otherwise ("BARCLAYCARD ANNUAL FEE").
        if (CARD_FEE.test(up(r.memo)) && (r.category === 'Uncategorised' || cat.exclude.has(r.category))) { r.category = 'Fees & interest'; r.match = 'rule'; r.spend = -r.amount; r.sp = -r.p; }
      }
      continue;
    }
    if (r.p >= 0 || r.match === 'override') continue;
    const hit = cardPaymentIn(r.memo, r.bc);
    if (!hit) continue;
    asTransfer(r);
    pays.push({ row: r, issuer: hit.issuer, key: null });
  }
  // Which card each payment went to: its other half (same amount, days apart), the company's name, or
  // the only card it could be. A row money-back only because of its wording stops being a refund here.
  // A card with no company of its own learns one from a payment that matched it: "AMEX" paid "Blue card".
  const named = (id) => [...cards.entries()].filter(([, c]) => c.issuer === id).map(([k]) => k);
  const learned = new Map();
  for (const pay of pays) {
    const other = cardIn.find(x => !x.taken && x.p === -pay.row.p && Math.abs(x.n - pay.row.n) <= PAY_WINDOW);
    if (!other) continue;
    other.taken = true; asTransfer(other); pay.key = dataKey(other);
    if (pay.issuer && !cards.get(pay.key).issuer) learned.set(pay.issuer.id, pay.key);
  }
  for (const r of frame) if (cards.has(dataKey(r)) && r.match === 'card-payment' && r.p > 0 && !r.taken) cardPaid.push(r);
  for (const pay of pays) {
    if (pay.key) continue;
    const other = cardPaid.find(x => !x.taken && x.p === -pay.row.p && Math.abs(x.n - pay.row.n) <= PAY_WINDOW);
    if (other) {
      other.taken = true; pay.key = dataKey(other);
      if (pay.issuer && !cards.get(pay.key).issuer) learned.set(pay.issuer.id, pay.key);
    }
  }
  for (const pay of pays) {
    if (pay.key) continue;
    const by = pay.issuer ? named(pay.issuer.id) : [];
    if (by.length === 1) pay.key = by[0];
    else if (pay.issuer && learned.has(pay.issuer.id)) pay.key = learned.get(pay.issuer.id);
    else if (!pay.issuer && cards.size === 1) pay.key = [...cards.keys()][0];
    else if (by.length || (!pay.issuer && cards.size)) pay.seen = true;   // a card here, we can't say which
  }
  for (const r of cardPaid) delete r.taken;
  for (const r of cardIn) delete r.taken;
  return { pays };
}

/** The bank payments to a card that is not here, lately. -> {count, total, last, names} | null */
export function unseenCards(pays, todayN) {
  const lost = pays.filter(x => !x.key && !x.seen && todayN - x.row.n <= UNSEEN_DAYS);
  if (!lost.length) return null;
  const names = [...new Set(lost.map(x => (x.issuer ? x.issuer.name : null)).filter(Boolean))];
  return { count: lost.length, total: lost.reduce((t, x) => t - x.row.p, 0) / 100, last: lost.map(x => x.row.date).sort().pop(), names };
}

// ─── What is owed ───────────────────────────────────────────────────────
/**
 * The analysis' `cards`. Connected: the bank's balance. A bank's sign for a card varies (owed can come as
 * positive or negative), so it is read as the size of the debt. From a file: the balance typed or on the
 * statement, moved on by the rows after its date and by bank payments after the file ends.
 * Left-out cards are not counted, as with every balance (rule.balanceOn).
 */
export function cardEntries({ frame, cards, reg, balanceDoc, rule, pays }) {
  const out = [];
  const balOf = new Map((balanceDoc && Array.isArray(balanceDoc.accounts) ? balanceDoc.accounts : []).filter(b => b && b.acct).map(b => [String(b.acct), b]));
  const byKey = new Map();
  for (const r of frame) { const k = dataKey(r); if (cards.has(k)) (byKey.get(k) || byKey.set(k, []).get(k)).push(r); }
  for (const [key, c] of cards) {
    if (rule && !rule.balanceOn(key)) continue;
    const rows = byKey.get(key) || [];
    const stored = reg ? reg.cards[key] : null;
    if (!rows.length && !c.connected) continue;   // deleted: its details wait in case it comes back
    const to = rows.reduce((a, r) => (!a || r.date > a ? r.date : a), null);
    const paid = pays.filter(x => x.key === key).map(x => x.row);
    let owed = null, asOf = null, from = null;
    const b = balOf.get(key);
    if (c.connected && b && Number.isFinite(Number(b.balance))) {
      owed = Math.abs(Number(b.balance)); asOf = b.asOf || null; from = 'bank';
    } else if (stored && stored.balance) {
      const base = stored.balance;
      let p = toPence(base.amount);
      for (const r of rows) if (r.date > base.date) p -= r.p;
      const after = to && to > base.date ? to : base.date;
      for (const r of paid) if (r.date > after) p += r.p;
      owed = Math.max(0, p) / 100; asOf = base.date; from = base.from;
    }
    const cardSide = rows.filter(r => r.match === 'card-payment' && r.p > 0).map(r => r.date);
    const lastPaid = [...paid.map(r => r.date), ...cardSide].sort().pop() || null;
    out.push({ key, name: c.name || 'Credit card', bank: c.bank || null, issuer: c.issuer || null, owed, asOf, from, pay: (stored && stored.pay) || null, lastPaid, to, file: !c.connected });
  }
  return out.sort((a, b) => (b.owed || 0) - (a.owed || 0) || String(a.name).localeCompare(String(b.name)));
}

/** A card's balance and date: the hook for the money plan's debts (no other part of it is needed here). */
export function cardDebts(analysis) {
  const list = analysis && Array.isArray(analysis.cards) ? analysis.cards : [];
  return list.filter(c => c && Number.isFinite(c.owed)).map(c => ({ key: c.key, name: c.name, balance: c.owed, asOf: c.asOf, from: c.from }));
}

// ─── Flip ───────────────────────────────────────────────────────────────
/**
 * Every stored row of a source the other way round, and the two files keyed by the de-dup key with them.
 * Doing it twice puts everything back. rows, bank, places are changed in place. -> how many rows.
 */
export function flipRows(rows, key, bank, places) {
  let n = 0;
  for (const r of rows) {
    if (dataKey(r) !== key || !Number(r.amount)) continue;
    const was = rowKeyStr(r);
    r.amount = -Number(r.amount);
    n++;
    const now = rowKeyStr(r);
    if (bank && Object.prototype.hasOwnProperty.call(bank, was)) { bank[now] = bank[was]; delete bank[was]; }
    if (places && Object.prototype.hasOwnProperty.call(places, was)) { places[now] = places[was]; delete places[was]; }
  }
  return n;
}

// lib/finance.mjs — the dashboard's Finances view backend.
//
// The spending analysis lives in the finance folder of the user's data dir
// (default <data>/finance; overridable with --finance-dir), never in the repo:
//
//   inbox/                    bank CSV exports waiting to be imported
//   processed/                imported CSVs
//   _system/transactions.csv  master store of every imported transaction
//   _system/rules.json        the user's categorisation rules (a starter set
//                             from lib/finance/default-rules.json on first use)
//   _system/analysis.json     what the Finances view shows
//
// The pipeline (import, de-duplicate, categorise, analyse) is Node:
// lib/finance/pipeline.mjs, a faithful port of the old Python spend.py
// (tools/finance-parity.mjs checks it against Python on real data). Python is
// no longer needed.
//
// An update job, one at a time:
//   1. (unless bank:false) asks the `claude` CLI (headless, read-only Bank
//      connector tools only) for recent transactions on every account;
//   2. validates them strictly and writes a bank-sync CSV into inbox/;
//   3. runs the pipeline (which also imports any CSV the user added by hand);
//   4. stores a short result in _system/dashboard_update.json.
// A CSV upload from the page (importUpload) is checked, written to inbox/ and
// imported straight away; it works without any connection.
//
// Every path this module touches is built from fixed names under FIN_DIR and
// checked to stay inside it. Nothing the model prints is ever executed or
// interpreted — it is parsed as data, validated field by field, and the only
// thing that leaves this module is a CSV of dates, amounts and descriptions.

import { existsSync } from 'node:fs';
import { readFile, readdir, stat, unlink, mkdir } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { runClaude, parseStream, extractJson, CONNECTORS, MODELS, ClaudeError } from './claude-runner.mjs';
import { atomicWrite as fsAtomicWrite, readJson as fsReadJson, withLock } from './fsutil.mjs';
import { cleanPlace, placeCells, PLACE_COLS } from './finance/place.mjs';
import { runPipeline, ensureFinanceDir, loadFrame, checkCsv, crossAccountOverlap, transactionsCsv, todayIn, previewChoices, cardCheck, cardAnswer } from './finance/pipeline.mjs';
import { readChoices, accountKey, allAccountsOff } from './finance/data-sources.mjs';
import { parseCsv } from './finance/store.mjs';

// The fetch session runs under the runner's 'bank-read' profile: only the
// read-only Bank connector tools (CONNECTORS.bank.read) are allowed, the
// Bank write tools and every other connector are denied, and no user/project
// "allow" rule is loaded. Transaction descriptions are untrusted text, so the
// session must not be able to reach anything else.
const BANK = CONNECTORS.bank.prefix;

// The tool loop is long (sync, list, then several paged fetches per account),
// so prefer the stronger model when the allowlist has it.
const FETCH_MODEL = (() => {
  const want = process.env.DASHBOARD_FINANCE_MODEL;
  if (want && MODELS.includes(want)) return want;
  return MODELS.includes('claude-sonnet-5') ? 'claude-sonnet-5' : 'claude-haiku-4-5';
})();
const FETCH_TIMEOUT_MS = Number(process.env.DASHBOARD_FINANCE_TIMEOUT_MS) || 15 * 60 * 1000;
const FIRST_IMPORT_DAYS = 400;
const FULL_REFRESH_DAYS = 730;   // "full" update: everything the bank still holds, up to two years
const OVERLAP_DAYS = 35;
// The CLI stops passing a tool result inline at roughly 50k characters (it
// saves it to a file and asks the model to Read it, which the read-only
// profile forbids). One transaction is about 260 characters, so 200 per page
// overflowed on a full refresh; 75 keeps every page well under the limit.
const PAGE_LIMIT = 75;
const MAX_ROWS = 20000;
const FOLLOW_UP_ROUNDS = 2;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

let FIN = null;
let CURRENCY = 'GBP';
// Set by the route file: the live config (time zone, locale, currency) and a
// way to record what an update learned about the Bank connection.
// Sources (lib/sources.mjs): which bank sources exist, how to fetch a generic
// one (lib/source-adapter.mjs) and where to record each sync.
// share: finances on every device (lib/finance-share.mjs, set by the route): what
// financeData() shows on a device that does not read the bank, and the publish
// after every rebuild on the one that does.
const HOOKS = { getConfig: null, onBankStatus: null, bankSources: null, fetchSource: null, noteSync: null, share: null };

/** dir: the finance folder (normally <data>/finance). opts.currency: ISO code of the account currency. */
export function initFinance(dir, opts = {}) {
  if (!dir) throw new Error('initFinance needs the finance folder');
  FIN = resolve(dir);
  if (typeof opts.currency === 'string' && /^[A-Z]{3}$/.test(opts.currency)) CURRENCY = opts.currency;
  return FIN;
}
export function financeDir() { return FIN; }
/** { getConfig() -> config, onBankStatus({status, message}) } */
export function setFinanceHooks(h = {}) {
  if (typeof h.getConfig === 'function') HOOKS.getConfig = h.getConfig;
  if (typeof h.onBankStatus === 'function') HOOKS.onBankStatus = h.onBankStatus;
  for (const k of ['bankSources', 'fetchSource', 'noteSync']) if (typeof h[k] === 'function') HOOKS[k] = h[k];
  if (h.share === null || (h.share && typeof h.share.view === 'function')) HOOKS.share = h.share;
}
/** After a rebuild: the fetcher publishes it to the other devices (resolves when written; never throws). */
function published() {
  try { return HOOKS.share ? Promise.resolve(HOOKS.share.publish()).catch(() => {}) : Promise.resolve(); } catch { return Promise.resolve(); }
}
/** The shared copy is in charge (sync on and encrypted): {publisher, host} or null. */
async function sharing() {
  try { return HOOKS.share ? await HOOKS.share.sharing() : null; } catch { return null; }
}
function cfg() { try { return (HOOKS.getConfig && HOOKS.getConfig()) || {}; } catch { return {}; } }
function currencyCode() { const c = cfg().currency; return typeof c === 'string' && /^[A-Z]{3}$/.test(c) ? c : CURRENCY; }
/** The currency symbol used in flag notes and the weekly report ("£" for GBP). */
export function currencySymbol(code = currencyCode(), locale = cfg().locale) {
  try {
    const p = new Intl.NumberFormat(locale || 'en-GB', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
    return (p.find(x => x.type === 'currency') || {}).value || code + ' ';
  } catch { return code === 'GBP' ? '£' : code + ' '; }
}
// cfg().timezone is the HOME zone, on purpose (here and in runJob): banks date
// transactions at home, so money days stay on home time while the user travels
// (travel spec 2.3; the page's Clock.home()).
function pipelineOpts() { return { timeZone: cfg().timezone || null, symbol: currencySymbol(), matchTransfers: true }; }
/** Each connected bank source and when it last fetched successfully (CSV imports are not connected). */
async function connectedFetches() {
  try {
    const list = HOOKS.bankSources ? await HOOKS.bankSources() : [];
    return list.filter(s => s.enabled && !s.demo && s.kind !== 'csv' && !allAccountsOff(s)).map(s => ({ id: s.id, label: s.label, at: s.lastSync || null }));
  } catch { return []; }
}
function noteSync(id, r) { try { return HOOKS.noteSync ? Promise.resolve(HOOKS.noteSync(id, r)).catch(() => {}) : null; } catch { return null; } }
function reportBank(patch) { try { HOOKS.onBankStatus && Promise.resolve(HOOKS.onBankStatus(patch)).catch(() => {}); } catch { /* ignore */ } }

/** Path under the finance dir. Throws if it would escape it. */
function fp(...parts) {
  const p = resolve(FIN, ...parts);
  if (p !== FIN && !p.startsWith(FIN + sep)) throw new Error('path escapes the finance folder');
  return p;
}

const ANALYSIS = () => fp('_system', 'analysis.json');
const STORE = () => fp('_system', 'transactions.csv');
const LAST_UPDATE = () => fp('_system', 'dashboard_update.json');
const RULES = () => fp('_system', 'rules.json');
const BUDGETS = () => fp('_system', 'budgets.json');
const BALANCES = () => fp('_system', 'balances.json');
const BAL_HISTORY = () => fp('_system', 'balances_history.json');
const BACKUPS = () => fp('_system', 'backups');
const INBOX = () => fp('inbox');

// The pipeline is built in, so a configured folder is always usable: it is
// created (with starter rules) the first time something is imported.
export function financeAvailable() { return !!FIN; }
/** True once the folder has its _system folder (anything was ever set up). */
export function financeSetUp() { return !!FIN && existsSync(fp('_system')); }

// All writes go through lib/fsutil.mjs (temp file + rename, OneDrive-safe retries).
const atomicWrite = (path, data, opts) => fsAtomicWrite(path, data, opts);
// Missing or unreadable -> null, as before.
async function readJson(path) {
  try { return await fsReadJson(path, { fallback: null }); } catch (e) { return null; }
}

// ─── Dates ───────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}
function validIso(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const ukDate = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

// ─── Store inspection ────────────────────────────────────────────────────
// transactions.csv is written by the pipeline: header then rows whose first
// column is an ISO date. Memos have whitespace collapsed, so no embedded
// newlines — a line split is safe.
async function storeInfo() {
  if (!existsSync(STORE())) return { count: 0, latest: null, earliest: null };
  const lines = (await readFile(STORE(), 'utf8')).split(/\r?\n/).slice(1).filter(Boolean);
  let latest = null, earliest = null;
  for (const l of lines) {
    const d = l.slice(0, 10);
    if (!validIso(d)) continue;
    if (!latest || d > latest) latest = d;
    if (!earliest || d < earliest) earliest = d;
  }
  return { count: lines.length, latest, earliest };
}

async function inboxPending() {
  try { return (await readdir(INBOX())).filter(f => f.toLowerCase().endsWith('.csv')).length; }
  catch (e) { return 0; }
}

// ─── Validation ──────────────────────────────────────────────────────────
// Strip control characters (C0, DEL, C1) and the invisible bidi/zero-width
// set, collapse whitespace, cap the length. Built from code points so the
// source file stays pure ASCII.
const INVISIBLE = (() => {
  const ranges = [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]];
  const hex = n => n.toString(16).padStart(4, '0');
  return new RegExp('[' + ranges.map(([a, b]) => `\\u${hex(a)}-\\u${hex(b)}`).join('') + ']', 'g');
})();
function cleanText(s, max) {
  return String(s)
    .replace(INVISIBLE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * One transaction in, one clean row out (or a reason it was rejected).
 * `minor` is integer pence when the source gives it (exact); otherwise
 * `amount` must be a plain number with at most 2 decimal places.
 */
function normalise(t, ctx) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return { reason: 'not an object' };
  const accountId = t.accountId;
  if (typeof accountId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(accountId)) return { reason: 'bad accountId' };
  if (!validIso(t.date)) return { reason: 'bad date' };
  if (t.date < ctx.from || t.date > ctx.maxDate) return { reason: 'outside window' };
  if (t.status != null && String(t.status).toLowerCase() === 'pending') return { reason: 'pending' };
  const cur = currencyCode();
  if (t.currency != null && t.currency !== cur) return { reason: `not ${cur}` };

  let pence;
  if (t.minor != null) {
    if (!Number.isInteger(t.minor)) return { reason: 'bad amount' };
    pence = t.minor;
  } else {
    if (typeof t.amount !== 'number' || !Number.isFinite(t.amount)) return { reason: 'bad amount' };
    const p = t.amount * 100;
    if (Math.abs(p - Math.round(p)) > 1e-6) return { reason: 'bad amount' };
    pence = Math.round(p);
  }
  if (Math.abs(pence) > 1e9) return { reason: 'implausible amount' };
  // The Bank connector reports money out as negative (type "debit"). Enforce
  // it from `type` where we have it, so a sign slip can never flip spending.
  const type = t.type != null ? String(t.type).toLowerCase() : null;
  if (type === 'debit') pence = -Math.abs(pence);
  else if (type === 'credit') pence = Math.abs(pence);

  let memo = cleanText(t.description == null ? '' : t.description, 200);
  // Memos end up in CSV exports; a leading = would become a spreadsheet formula.
  memo = memo.replace(/^[=+@]+/, '').trim() || '(no description)';

  const id = t.id != null ? cleanText(t.id, 80) : null;
  const cat = t.category != null ? String(t.category) : '';
  const sub = /transfer/i.test(cat) ? 'FT' : '';
  // The connector's own category id wins; the provider's raw category is the fallback.
  const bc = cleanCategory(t.category) || cleanCategory(t.bankCategory);
  // Where it was paid (Spending by country): only when the tool result carries it (lib/finance/place.mjs).
  const place = cleanPlace(t.place, cur);
  return { row: { id, accountId, date: t.date, pence, memo, sub, bc, ...(place ? { place } : {}) } };
}

/**
 * A payment the bank has not settled yet (never stored: its amount and date can still change).
 * Pending dates can be odd (in the future), so they are held to today.
 */
function pendingRow(t, ctx) {
  if (!t || String(t.status || '').toLowerCase() !== 'pending' || typeof t.accountId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(t.accountId) || !validIso(t.date)) return null;
  if (t.currency != null && t.currency !== currencyCode()) return null;
  if (!Number.isInteger(t.minor) || Math.abs(t.minor) > 1e9) return null;
  const type = t.type != null ? String(t.type).toLowerCase() : null;
  const pence = type === 'debit' ? -Math.abs(t.minor) : type === 'credit' ? Math.abs(t.minor) : t.minor;
  const memo = cleanText(t.description == null ? '' : t.description, 200).replace(/^[=+@]+/, '').trim() || '(no description)';
  return { id: t.id != null ? cleanText(t.id, 80) : null, accountId: t.accountId, date: t.date > ctx.to ? ctx.to : t.date, pence, memo };
}

/**
 * Where a Bank tool transaction was paid, when its result says (field names vary between
 * connector versions, so the likely ones are read; none is required): the merchant's
 * country and town, and the original amount and currency of a payment in another one.
 */
function aureliPlace(t) {
  const m = t.merchant && typeof t.merchant === 'object' ? t.merchant : {};
  const loc = t.location && typeof t.location === 'object' ? t.location : (m.location && typeof m.location === 'object' ? m.location : {});
  const pick = (...v) => v.find(x => typeof x === 'string' && x.trim()) || null;
  const lc = pick(t.originalCurrency, t.localCurrency, t.foreignCurrency);
  const amt = [t.originalAmount, t.localAmount, t.foreignAmount].filter(x => x != null && x !== '').map(Number).find(Number.isFinite);
  const la = amt != null ? Math.abs(amt) : null;
  return { cc: pick(t.merchantCountry, t.country, m.country, loc.country, loc.countryCode), city: pick(t.merchantCity, t.city, m.city, loc.city),
    ...(lc && la ? { lc, la } : {}), ol: m.online === true || t.online === true };
}

/** A bank category label, or null. Plain words only; it ends up in a CSV and a JSON key. */
function cleanCategory(s) {
  if (s == null || typeof s !== 'string') return null;
  const v = cleanText(s, 60);
  if (!/^[A-Za-z0-9_ &/.-]{1,60}$/.test(v)) return null;
  if (/^(uncategori[sz]ed|none|null)$/i.test(v)) return null;
  return v;
}

function dedupe(rows) {
  const seen = new Set(), out = [];
  for (const r of rows) {
    if (r.id) {
      const k = r.accountId + '|' + r.id;
      if (seen.has(k)) continue;
      seen.add(k);
    }
    out.push(r);
  }
  return out;
}

// ─── The fetch prompt (fixed text; only server-computed dates go in) ─────
function fetchPrompt(from, to, balFrom) {
  return `You are a read-only data fetcher for a personal spending tracker. Use only the six Bank tools named below. Do not change anything.

1. Call ${BANK}sync_bank_accounts once with no arguments. It only queues a background refresh: do not wait for it, and ignore any "not queued" notes.
2. Call ${BANK}list_transaction_accounts to get every accountId.
3. For EVERY account, fetch every transaction dated from ${from} to ${to} inclusive:
   - Call ${BANK}get_account_transactions with that accountId, from "${from}", to "${to}", limit ${PAGE_LIMIT}.
   - Results come newest first. If a call returns ${PAGE_LIMIT} transactions, call again with the same "from" and with "to" set to the date of the oldest transaction you just received. Repeat until a call returns fewer than ${PAGE_LIMIT}. Transactions on a boundary date will repeat; keep each transaction id once.
   - If a result says it was too large or was saved to a file, never try to open the file: call again for the same account and dates with limit 25, and page as above.
   - An account with no transactions is fine; move on.
4. Balances: call ${BANK}list_portfolios. For each portfolio, call ${BANK}get_portfolio_information with its id. For every asset listed under "Assets" (each shows "[id: ...]"), call ${BANK}get_asset_valuations with that portfolioId, assetIdentifier set to the asset id, and from "${balFrom}". If any of these calls fail, skip balances and carry on.
5. Then print ONLY a JSON array: no prose, no markdown, no code fences. One object per transaction (not balances), copying values exactly from the tool results:
   {"id": "<transaction id>", "date": "YYYY-MM-DD", "amount": <minorUnits divided by 100, as a number; negative for money out>, "description": "<description>", "accountId": "<accountId>", "status": "<status>", "category": "<category, or bankCategory if category is null, or null>"}
   Print [] if there are no transactions.`;
}

/**
 * A follow-up session when the first one stopped paging early (or skipped
 * balances): only the missing date ranges, named by the server. Account ids
 * are re-validated here because they came back from tool results.
 */
function continuePrompt(parts, from, balFrom) {
  const lines = parts.filter(p => /^[A-Za-z0-9_-]{1,64}$/.test(p.accountId) && validIso(p.to))
    .map(p => `   - accountId "${p.accountId}": from "${from}" to "${p.to}"`);
  const steps = [];
  if (lines.length) {
    steps.push(`Fetch the remaining transactions for these accounts (do not call sync_bank_accounts or list_transaction_accounts):
${lines.join('\n')}
   For each one: call ${BANK}get_account_transactions with that accountId, "from" and "to", limit ${PAGE_LIMIT}. Results come newest first. If a call returns ${PAGE_LIMIT} transactions, call again with the same "from" and with "to" set to the date of the oldest transaction you just received, until a call returns fewer than ${PAGE_LIMIT}. If a result says it was too large or was saved to a file, never open the file: call again with limit 25.`);
  }
  if (balFrom) {
    steps.push(`Balances: call ${BANK}list_portfolios. For each portfolio, call ${BANK}get_portfolio_information with its id. For every asset listed under "Assets" (each shows "[id: ...]"), call ${BANK}get_asset_valuations with that portfolioId, assetIdentifier set to the asset id, and from "${balFrom}". If any of these calls fail, skip balances.`);
  }
  return `You are a read-only data fetcher for a personal spending tracker, finishing an earlier fetch. Use only the Bank tools named below. Do not change anything. Do every step; do not stop early.

${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
${steps.length + 1}. Then reply with the single word DONE.`;
}

// ─── Running the CLI (through lib/claude-runner.mjs, 'bank-read' profile) ──
async function runFetchCli(prompt, onProgress) {
  try {
    try {
      return await runFetchOnce(prompt, onProgress);
    } catch (e) {
      // The CLI's first event lists the claude.ai connectors; right after
      // start-up (or while another claude process is loading them) that list
      // can come back incomplete. One quiet retry before saying "not connected".
      if (!(e instanceof ClaudeError) || e.code !== 'TOOL_MISSING' || RETRY_GAP_MS < 0) throw e;
      await new Promise(r => setTimeout(r, RETRY_GAP_MS));
      return await runFetchOnce(prompt, onProgress);
    }
  } catch (e) {
    if (e instanceof ClaudeError) {
      const msg = {
        CLI_MISSING: 'The Claude CLI was not found, so the bank could not be reached. Install Claude Code, or set CLAUDE_CLI_PATH.',
        NOT_SIGNED_IN: 'The Claude CLI is not signed in. Open a terminal, run "claude", sign in, then try again.',
        TIMEOUT: `The bank fetch took longer than ${Math.round(FETCH_TIMEOUT_MS / 60000)} minutes and was stopped. Try again later.`,
        CONNECTOR_AUTH: 'Your Bank connection needs you to sign in again (claude.ai > Settings > Connectors), then try again.',
        TOOL_MISSING: 'The Bank connector is not connected to Claude. Connect it in Connections, then try again.',
        POLICY: 'The bank fetch was stopped because it tried to use a tool outside the read-only Bank tools. Nothing was changed. Try again; if it keeps happening, import a CSV export instead.',
      }[e.code];
      if (msg) e.message = msg;
      // Tell Connections what we learned, so the page greys bank sync out.
      if (e.code === 'CONNECTOR_AUTH') reportBank({ status: 'needs-auth', message: e.message });
      else if (e.code === 'TOOL_MISSING') reportBank({ status: 'missing', message: e.message });
    }
    throw e;
  }
}
const RETRY_GAP_MS = Number(process.env.DASHBOARD_FINANCE_RETRY_MS ?? 3000);
async function runFetchOnce(prompt, onProgress) {
  const out = await runClaude({
    profile: 'bank-read',
    prompt,
    model: FETCH_MODEL,
    timeoutMs: FETCH_TIMEOUT_MS,
    env: { MAX_MCP_OUTPUT_TOKENS: '200000' },
    // A run whose last turn failed can still carry every tool result we need.
    tolerateResultError: true,
    onLine: (line, ev, lines) => { if (onProgress && line.includes('"tool_use"')) onProgress(lines); },
  });
  return out.lines;
}
const mask = id => '…' + String(id).slice(-4);

/**
 * Validate everything the CLI produced. Prefer the raw tool results (exact
 * pence, straight from the connector); fall back to the array the model
 * printed. Both pass through the same strict normaliser.
 */
function collectTransactions(parsed, ctx) {
  const warnings = [], incomplete = [];
  const rejected = {};
  // tally: where rejections are counted (the cross-check against the model's
  // own list must not count the same transactions twice).
  const keep = (list, tally = rejected) => {
    const out = [];
    for (const t of list) {
      const n = normalise(t, ctx);
      if (n.row) out.push(n.row);
      else tally[n.reason] = (tally[n.reason] || 0) + 1;
    }
    return out;
  };

  const txResults = parsed.results.filter(r => r.name === `${BANK}get_account_transactions`);
  const okTx = txResults.filter(r => !r.isError && r.payload && Array.isArray(r.payload.transactions));
  const listRes = parsed.results.find(r => r.name === `${BANK}list_transaction_accounts` && !r.isError && r.payload);
  const accounts = listRes && Array.isArray(listRes.payload.accounts)
    ? listRes.payload.accounts.map(a => a && a.accountId).filter(a => typeof a === 'string') : null;
  // Names for the Connections page and the Finances account chips.
  const accountsSeen = listRes && Array.isArray(listRes.payload.accounts) ? listRes.payload.accounts
    .filter(a => a && typeof a.accountId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(a.accountId))
    .map(a => {
      const nm = cleanText(a.accountName || a.displayName || a.name || a.nickname || '', 60);
      const bank = cleanText(a.connectionName || a.providerName || a.institutionName || '', 40);
      return { id: a.accountId, name: (nm && bank && !nm.toLowerCase().includes(bank.toLowerCase()) ? `${bank} ${nm}` : nm || bank) || ('Account ' + mask(a.accountId)) };
    }) : [];
  // Several accounts with the same name (three "Current Account"s): tell them apart.
  // The short id goes first, so it still shows when a long name is cut off.
  const dupNames = new Set(accountsSeen.filter((a, i) => accountsSeen.findIndex(b => b.name === a.name) !== i).map(a => a.name));
  for (const a of accountsSeen) if (dupNames.has(a.name)) a.name = cleanText(`${mask(a.id)} ${a.name}`, 80);

  // Model's printed array (strict parse first, tolerant of a code fence second).
  let modelRows = null, modelErr = null;
  if (parsed.finalText) {
    let arr = null;
    try { arr = JSON.parse(parsed.finalText.trim()); }
    catch (e) { try { arr = extractJson(parsed.finalText); } catch (e2) { modelErr = 'no JSON array in the reply'; } }
    if (arr && !Array.isArray(arr)) modelErr = 'reply was not a JSON array';
    else if (arr) {
      if (arr.length > MAX_ROWS) modelErr = 'reply had an implausible number of transactions';
      else modelRows = arr;
    }
  }

  let source, rows, pendingRows = [];
  if (okTx.length) {
    source = 'bank tool results';
    const raw = [];
    for (const r of okTx) {
      const acc = r.payload.accountId || r.input.accountId;
      for (const t of r.payload.transactions) {
        if (!t || typeof t !== 'object') continue;
        raw.push({
          id: t.id, date: t.date, minor: t.minorUnits, currency: t.currency, type: t.type,
          status: t.status, description: t.description, category: t.category,
          bankCategory: t.bankCategory, accountId: acc, place: aureliPlace(t),
        });
      }
    }
    if (raw.length > MAX_ROWS) throw new Error('The bank returned an implausible number of transactions; nothing was imported.');
    rows = dedupe(keep(raw));
    pendingRows = raw.map(t => pendingRow(t, ctx)).filter(Boolean);

    // Completeness: did paging reach every transaction the bank said matched?
    const expected = {}, have = {};
    for (const r of okTx) {
      const acc = r.payload.accountId || r.input.accountId;
      const n = Number(r.payload.totalMatching);
      if ((r.input.from || '') <= ctx.from && Number.isFinite(n)) expected[acc] = Math.max(expected[acc] || 0, n);
    }
    const ids = {};
    for (const r of okTx) {
      const acc = r.payload.accountId || r.input.accountId;
      for (const t of r.payload.transactions) if (t && t.id) (ids[acc] = ids[acc] || new Set()).add(t.id);
    }
    for (const [acc, set] of Object.entries(ids)) have[acc] = set.size;
    // Oldest date received per account: where a follow-up fetch picks up.
    const oldest = {};
    for (const r of okTx) {
      const acc = r.payload.accountId || r.input.accountId;
      for (const t of r.payload.transactions) if (t && validIso(t.date) && (!oldest[acc] || t.date < oldest[acc])) oldest[acc] = t.date;
    }
    for (const [acc, n] of Object.entries(expected)) {
      if ((have[acc] || 0) < n) {
        warnings.push(`Account ${mask(acc)}: fetched ${have[acc] || 0} of ${n} transactions. Run Update again to fetch the rest.`);
        incomplete.push({ accountId: acc, to: oldest[acc] || ctx.to || null });
      }
    }
    if (accounts) {
      const fetched = new Set(okTx.map(r => r.payload.accountId || r.input.accountId));
      for (const a of accounts) if (!fetched.has(a)) { warnings.push(`Account ${mask(a)} was not fetched this time.`); incomplete.push({ accountId: a, to: ctx.to || null }); }
    }
    if (modelRows) {
      const m = dedupe(keep(modelRows.map(o => (o && typeof o === 'object' ? { ...o, minor: undefined } : o)), {}));
      if (m.length !== rows.length) warnings.push(`The assistant's summary listed ${m.length} transactions; the bank's own results (used) had ${rows.length}.`);
    }
  } else if (modelRows) {
    source = 'assistant summary';
    rows = dedupe(keep(modelRows.map(o => (o && typeof o === 'object' ? { ...o, minor: undefined, type: undefined } : o))));
    if (modelRows.length && !rows.length) throw new Error('The bank data came back in an unexpected shape; nothing was imported.');
  } else {
    const firstErr = parsed.results.find(r => r.isError);
    const usedBank = parsed.results.some(r => r.name.startsWith(BANK));
    if (!usedBank) {
      throw new Error('Could not reach your Bank connector. Check it is still connected in claude.ai (Settings > Connectors), then try again.'
        + (parsed.resultError ? ` (${cleanText(parsed.resultError, 160)})` : ''));
    }
    throw new Error('The bank did not return any transaction data'
      + (firstErr ? `: ${cleanText(firstErr.text, 200)}` : (modelErr ? ` (${modelErr})` : '.')));
  }
  const nRej = Object.values(rejected).reduce((a, b) => a + b, 0);
  const notable = Object.entries(rejected).filter(([k]) => k !== 'pending' && k !== 'outside window');
  if (notable.length) warnings.push(`Skipped ${notable.reduce((a, [, v]) => a + v, 0)} transaction(s) that failed validation (${notable.map(([k, v]) => `${v} ${k}`).join(', ')}).`);
  return { rows, source, warnings, rejected: nRej, pending: rejected.pending || 0, pendingRows, incomplete, accountsSeen };
}

/**
 * Balance snapshot + per-date history from get_asset_valuations results.
 * Returns null when the session produced none (balances are optional).
 */
function collectBalances(parsed, today) {
  const val = parsed.results.filter(r => r.name === `${BANK}get_asset_valuations` && !r.isError && r.payload
    && typeof r.payload === 'object' && !Array.isArray(r.payload));
  if (!val.length) return null;
  // Currency per asset id, from the portfolio summary text ("[id: X, currency: GBP]").
  const currency = {};
  for (const r of parsed.results) {
    if (r.name !== `${BANK}get_portfolio_information` || r.isError) continue;
    const text = r.payload && typeof r.payload.summary === 'string' ? r.payload.summary : r.text;
    for (const m of String(text).matchAll(/\[id:\s*([A-Za-z0-9_-]{1,64}),\s*currency:\s*([A-Z]{3})\]/g)) currency[m[1]] = m[2];
  }
  const accounts = [], series = {};
  for (const r of val) {
    const p = r.payload;
    const id = typeof p.assetId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(p.assetId) ? p.assetId : null;
    if (!id || !Number.isInteger(p.currentMinorUnits) || Math.abs(p.currentMinorUnits) > 1e11) continue;
    if (accounts.some(a => a.acct === id)) continue;
    accounts.push({
      acct: id,
      name: cleanText(p.assetName || id, 80),
      kind: p.assetClass ? cleanText(p.assetClass, 40) : null,
      balance: p.currentMinorUnits / 100,
      currency: currency[id] || 'GBP',
      asOf: today,
    });
    // Valuations come newest first; the first one seen for a date is that day's closing value.
    const s = series[id] = {};
    for (const v of Array.isArray(p.valuations) ? p.valuations.slice(0, 5000) : []) {
      if (!v || !validIso(v.date) || v.date > today || !Number.isInteger(v.minorUnits)) continue;
      if (!(v.date in s)) s[v.date] = v.minorUnits / 100;
    }
    s[today] = p.currentMinorUnits / 100;
  }
  return accounts.length ? { accounts, series } : null;
}

/** Merge a balance fetch into balances_history.json (one row per date) and write balances.json. */
async function saveBalances(bal, today) {
  const old = await readJson(BAL_HISTORY());
  const byDate = new Map();
  for (const h of Array.isArray(old) ? old : []) {
    if (h && validIso(h.date) && h.accounts && typeof h.accounts === 'object') byDate.set(h.date, { ...h.accounts });
  }
  for (const [acct, s] of Object.entries(bal.series)) {
    for (const [d, v] of Object.entries(s)) {
      const row = byDate.get(d) || {};
      row[acct] = v;
      byDate.set(d, row);
    }
  }
  // Carry each account's last known balance forward so every row's total is complete.
  const last = {}, rows = [];
  for (const d of [...byDate.keys()].sort()) {
    Object.assign(last, byDate.get(d));
    const accounts = { ...last };
    const total = Math.round(Object.values(accounts).reduce((a, b) => a + b, 0) * 100) / 100;
    rows.push({ date: d, total, accounts });
  }
  await atomicWrite(BAL_HISTORY(), JSON.stringify(rows.slice(-4000), null, 1));
  await atomicWrite(BALANCES(), JSON.stringify({ asOf: today, accounts: bal.accounts }, null, 1));
  return rows.length;
}

function csvField(s) {
  const v = String(s);
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

async function writeInboxCsv(rows, stamp) {
  // "Bank category" is read by the pipeline into _system/bank_categories.json.
  // The place columns (Country, City, Local amount, Local currency, Online) are read by the
  // pipeline into _system/tx_places.json (lib/finance/place.mjs), like the bank's categories.
  const lines = ['Number,Date,Account,Amount,Subcategory,Memo,Bank category,' + PLACE_COLS.join(',')];
  for (const r of rows) {
    const amt = (r.pence / 100).toFixed(2);
    lines.push(['', ukDate(r.date), r.accountId, amt, r.sub, r.memo, r.bc || '', ...placeCells(r.place)].map(csvField).join(','));
  }
  const name = `bank-sync-${stamp}.csv`;
  // atomicWrite writes a dot-prefixed temp name first (not *.csv), so the
  // pipeline can never see half a file.
  await atomicWrite(fp('inbox', name), lines.join('\r\n') + '\r\n');
  return name;
}

// ─── Job management (one at a time) ──────────────────────────────────────
let job = null;
let jobSeq = 0;

const STEP_LABEL = {
  starting: 'Starting',
  bank: 'Fetching transactions from your bank (can take a few minutes)',
  csv: 'Saving the new transactions',
  spend: 'Updating the spending analysis',
  done: 'Done',
};

function publicJob(j) {
  if (!j) return null;
  return {
    id: j.id, state: j.state, step: j.step, stepLabel: STEP_LABEL[j.step] || j.step,
    detail: j.detail || null, startedAt: j.startedAt, finishedAt: j.finishedAt || null,
    result: j.result || null, error: j.error || null,
  };
}

export function financeJob() { return publicJob(job); }

// Categorise and CSV uploads re-run the pipeline outside a job; they must not
// overlap with one (the pipeline itself also holds a cross-process lock).
let pipelineBusy = false;
const jobRunning = () => !!(job && job.state === 'running');
export const financeBusy = () => jobRunning() || pipelineBusy;

/**
 * Run the pipeline now (the caller has checked nothing else is running).
 * Outside an update job the new analysis is published at once; a job
 * publishes when it finishes (finishJob), with its result.
 */
async function runPipelineNow({ publish = true } = {}) {
  if (!FIN) throw httpError(400, 'No finance folder is configured.');
  const r = await runPipeline(FIN, { ...pipelineOpts(), ...await dataCountOpts(), fetches: await connectedFetches(), clearEmpty: true });
  if (publish) published();
  return r;
}

/**
 * Store account ids left out of the analysis: accounts switched off (sources.json accounts with
 * enabled: false; Connections' Show in Finances and Your data both write it), and the rest of
 * Your data's choices (imported files and banks no source names: _system/data-choices.json).
 */
async function hiddenAccounts() {
  const list = HOOKS.bankSources ? await HOOKS.bankSources().catch(() => null) : null;
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    for (const a of (s && s.accounts) || []) {
      if (!a || a.enabled !== false || typeof a.id !== 'string') continue;
      out.push(accountKey(s, a));
    }
  }
  const ch = await readChoices(FIN);
  return [...new Set([...out, ...Object.keys(ch.off), ...Object.keys(ch.gone)])];
}
/** What Your data decides for a rebuild (lib/finance/data-sources.mjs). */
async function dataCountOpts() {
  const list = HOOKS.bankSources ? await HOOKS.bankSources().catch(() => null) : null;
  const sources = Array.isArray(list) ? list : [];
  const ch = await readChoices(FIN);
  const pairSkip = [...Object.keys(ch.dup)];
  for (const s of sources) for (const a of (s && s.accounts) || []) if (a && a.hiddenReason === 'duplicate') pairSkip.push(accountKey(s, a));
  const name = String(cfg().userName || '').trim();
  return { hideAccounts: await hiddenAccounts(), untilAccounts: ch.until, dropAccounts: Object.keys(ch.gone), pairSkip, sources, ownName: name };
}
/** The numbers before and after a change of ticks (next: {hide, until, pairSkip}; nothing is written). */
export async function previewDataChoices(next) {
  if (!FIN) throw httpError(400, 'No finance folder is configured.');
  const o = await dataCountOpts();
  return previewChoices(FIN, { ...pipelineOpts(), sources: o.sources, ownName: o.ownName }, { hide: o.hideAccounts, until: o.untilAccounts, pairSkip: o.pairSkip }, next);
}

/**
 * Rebuild the analysis after an account was shown or hidden (no fetch). Skipped
 * while an update or another rebuild runs: that one reads the new choice anyway.
 */
export async function refreshFinanceAnalysis() {
  if (!FIN || !financeSetUp() || financeBusy()) return { ok: false, busy: financeBusy() };
  pipelineBusy = true;
  try { await runPipelineNow(); return { ok: true }; }
  finally { pipelineBusy = false; }
}

/**
 * Start an update job. opts.full: re-read the whole history the bank holds.
 * opts.bank === false: no bank fetch, only import what is in inbox/ and
 * rebuild the analysis (works with no connection at all).
 */
export function startFinanceUpdate(opts = {}) {
  if (financeBusy()) return { started: false, job: publicJob(job) };
  if (!financeAvailable()) return { started: false, error: 'No finance folder is configured.' };
  // opts.only: [sourceId]: read just these bank sources (Connections' "Sync now", a new direct connection).
  // opts.manual: the user asked for it (direct providers with a daily budget always allow these).
  const only = Array.isArray(opts.only) ? opts.only.filter(x => typeof x === 'string' && /^[a-z0-9][a-z0-9-]{1,40}$/.test(x)).slice(0, 10) : null;
  // ── host ── opts.skip: [sourceId]: banks the Claude host reads for this click (lib/remote-jobs.mjs hostFetch).
  const skip = Array.isArray(opts.skip) ? opts.skip.filter(x => typeof x === 'string' && /^[a-z0-9][a-z0-9-]{1,40}$/.test(x)).slice(0, 30) : null;
  job = { id: ++jobSeq, state: 'running', step: 'starting', startedAt: new Date().toISOString(), full: opts.full === true, bank: opts.bank !== false, ...(only && only.length ? { only } : {}), ...(skip && skip.length ? { skip } : {}), ...(opts.manual === true ? { manual: true } : {}) };
  const j = job;
  runJob(j).catch(async (e) => {
    await finishJob(j, { state: 'error', error: String(e && e.message ? e.message : e) });
    process.stdout.write(`  finance update FAILED: ${j.error}\n`);
  });
  return { started: true, job: publicJob(job) };
}

// The record is saved BEFORE the job reads as finished: whoever waits for the
// job (the page, tests) then finds this update's record, never the previous one.
// A failed save fails an ok/warning job (as before); an error job ends anyway.
async function finishJob(j, { state, error }) {
  const fin = { state, finishedAt: new Date().toISOString(), ...(error ? { error } : {}) };
  await saveLastUpdate({ ...j, ...fin }).catch((e) => { if (state !== 'error') throw e; });
  // The other devices get the new analysis and this result before the job reads
  // as finished, so a device that asked for it ("Sync bank" there) sees it at once.
  await published();
  Object.assign(j, fin);
}

async function saveLastUpdate(j) {
  const rec = { at: j.finishedAt, state: j.state, result: j.result || null, error: j.error || null };
  await atomicWrite(LAST_UPDATE(), JSON.stringify(rec, null, 1));
}

async function savePending(sourceId, rows, fetchedAt, prefixed = true) {
  const file = fp('_system', 'pending.json');
  await withLock(file, async () => {
    const doc = await readJson(file) || { sources: {} };
    if (!doc.sources || typeof doc.sources !== 'object') doc.sources = {};
    doc.sources[sourceId] = { fetchedAt: fetchedAt || new Date().toISOString(), rows: rows.map(r => ({ id: r.id, acct: prefixed ? `${sourceId}.${r.accountId}` : String(r.accountId), d: r.date, a: r.pence / 100, memo: r.memo })) };
    await atomicWrite(file, JSON.stringify(doc));
  });
}

async function pendingSnapshot() {
  const doc = await readJson(fp('_system', 'pending.json'));
  const hidden = new Set(await hiddenAccounts());
  const sources = HOOKS.bankSources ? await HOOKS.bankSources() : null;
  const enabled = sources ? new Set(sources.filter(s => s.enabled).map(s => s.id)) : null;
  return Object.entries(doc && doc.sources || {}).filter(([id]) => !enabled || enabled.has(id)).map(([sourceId, s]) => ({ sourceId, fetchedAt: s.fetchedAt, rows: (s.rows || []).filter(r => !hidden.has(r.acct)) }));
}

async function runJob(j) {
  await ensureFinanceDir(FIN);
  const today = todayIn(cfg().timezone || null);
  const info = await storeInfo();
  let from;
  if (j.full) {
    // Everything the bank still holds, so categories refresh on old rows too.
    from = addDays(today, -FULL_REFRESH_DAYS);
    if (info.earliest && info.earliest < from) from = info.earliest;
  } else {
    from = info.latest ? addDays(info.latest, -OVERLAP_DAYS) : addDays(today, -FIRST_IMPORT_DAYS);
  }
  const ctx = { from, to: today, maxDate: addDays(today, 1) };
  const result = j.bank
    ? { from, to: today, full: !!j.full, firstImport: !info.latest, model: FETCH_MODEL, warnings: [] }
    : { bank: false, to: today, warnings: [] };
  j.result = result;
  // Balance history: the whole window on a full refresh or first import, else the overlap.
  const prevHist = await readJson(BAL_HISTORY());
  const balFrom = (j.full || !Array.isArray(prevHist) || !prevHist.length) ? from : addDays(today, -OVERLAP_DAYS);

  // 1. Bank fetch. A failure here is reported but does not stop the manual
  //    route: any CSVs already in inbox/ are still imported below.
  let bankError = null, rows = [];
  // Which bank sources to read (no sources model: the Bank connector as before).
  const bankList = HOOKS.bankSources ? await HOOKS.bankSources().catch(() => null) : null;
  // A bank with every account unticked in Your data is not read at all ("Update bank" only updates what counts).
  const picked = (x) => (!j.only || j.only.includes(x.id)) && !(j.skip && j.skip.includes(x.id)) && !allAccountsOff(x);
  let aureli = bankList ? bankList.find(x => x.preset === 'aureli' && x.enabled && !x.demo) || null : { id: 'bank-aureli', label: 'Bank' };
  if (aureli && !picked(aureli)) aureli = null;
  // Generic MCP banks and direct connections (lib/fin-connect/; one still being set up is skipped).
  const others = bankList ? bankList.filter(x => x.enabled && !x.demo && picked(x) && ((x.kind === 'mcp' && x.preset !== 'aureli') || (x.kind === 'direct' && !x.setup))) : [];
  if (j.bank && !aureli && !others.length && !(j.skip && j.skip.length)) {
    if (bankList && bankList.some(x => x.enabled && !x.demo && x.kind !== 'csv' && allAccountsOff(x))) result.warnings.push('Every connected bank is unticked in Your data, so none was read.');
    else { result.warnings.push('No bank is connected, so only CSV files were imported. Add a bank in Connections.'); result.noBankSources = true; }
  }
  const genericRows = [], genericBalances = [];
  if (j.bank && others.length) {
    j.step = 'bank';
    for (const src of others) {
      j.detail = `Reading ${src.label}`;
      try {
        const r = await HOOKS.fetchSource(src, { from, to: today, maxDate: ctx.maxDate, currency: currencyCode(), timeZone: cfg().timezone || 'UTC', full: !!j.full, manual: !!j.manual });
        for (const row of r.rows) genericRows.push({ ...row, id: null, accountId: `${src.id}.${row.accountId}` });
        for (const b of r.balances || []) genericBalances.push({ ...b, acct: `${src.id}.${b.accountId}` });
        if (r.warning) result.warnings.push(`${src.label}: ${r.warning}`);
        const complete = !r.skipped && !r.cached && !r.incomplete;
        if (complete && Array.isArray(r.pending)) await savePending(src.id, r.pending, r.fetchedAt);
        await noteSync(src.id, { ok: complete, fetchedAt: r.fetchedAt, skipped: !!(r.skipped || r.cached), error: r.warning || 'The fetch was incomplete.', accounts: r.accounts });
        (result.sources = result.sources || []).push({ id: src.id, label: src.label, ok: complete, skipped: !!r.skipped, fetched: r.rows.length, ...(complete ? {} : { error: r.warning || 'No complete fresh fetch.' }) });
      } catch (e) {
        const msg = cleanText(e && e.message ? e.message : e, 200);
        result.warnings.push(`${src.label}: ${msg}`);
        await noteSync(src.id, { ok: false, error: msg, code: e && e.code });
        (result.sources = result.sources || []).push({ id: src.id, label: src.label, ok: false, error: msg });
      }
    }
    // Nothing else to try and every bank failed: the update is a warning, as before.
    if (!aureli && !result.sources.some(x => x.ok)) bankError = result.sources.map(x => `${x.label}: ${x.error}`).join(' ');
    j.detail = null;
  }
  if (j.bank && aureli) j.step = 'bank';
  if (j.bank && aureli) try {
    const lines = await runFetchCli(fetchPrompt(from, today, balFrom), (ls) => {
      const n = ls.filter(l => l.includes(`"name":"${BANK}get_account_transactions"`)).length;
      j.detail = n ? `${n} page${n === 1 ? '' : 's'} of transactions requested so far` : 'Talking to your bank';
    });
    let parsed = parseStream(lines);
    let got = collectTransactions(parsed, ctx);
    // Follow-ups (at most two) when paging stopped early or balances were
    // skipped. Every round's tool results are pooled and re-validated, so a
    // follow-up can only add transactions, never lose any.
    for (let round = 1; round <= FOLLOW_UP_ROUNDS && got.source === 'bank tool results'; round++) {
      const needBal = !collectBalances(parsed, today);
      if (!got.incomplete.length && !(needBal && round === 1)) break;
      j.detail = got.incomplete.length ? 'Fetching the rest of your transactions' : 'Reading your balances';
      try {
        const more = parseStream(await runFetchCli(continuePrompt(got.incomplete, from, needBal ? balFrom : null), () => {}));
        parsed = { calls: parsed.calls, results: parsed.results.concat(more.results), finalText: null, resultError: null };
        got = collectTransactions(parsed, ctx);
        result.followUps = round;
      } catch (e) {
        result.warnings.push('A follow-up fetch did not finish: ' + cleanText(e && e.message ? e.message : e, 160));
        break;
      }
    }
    rows = got.rows;
    Object.assign(result, {
      fetched: rows.length, source: got.source, pendingSkipped: got.pending,
      withBankCategory: rows.filter(r => r.bc).length,
    });
    result.warnings.push(...got.warnings);
    try {
      const bal = collectBalances(parsed, today);
      if (bal) {
        result.balanceAccounts = bal.accounts.length;
        result.balanceDays = await saveBalances(bal, today);
      } else {
        result.warnings.push('No balance information came back this time.');
      }
    } catch (e) {
      result.warnings.push('Balances could not be saved: ' + cleanText(e && e.message ? e.message : e, 160));
    }
    // The connector answered with data: it is connected.
    if (got.source === 'bank tool results') reportBank({ status: 'connected', message: null });
    const complete = got.source === 'bank tool results' && !got.incomplete.length;
    if (complete) await savePending(aureli.id, got.pendingRows || [], new Date().toISOString(), false);
    await noteSync(aureli.id, { ok: complete, error: 'The bank returned an incomplete transaction history.', accounts: got.accountsSeen });
    (result.sources = result.sources || []).unshift({ id: aureli.id, label: aureli.label, ok: complete, fetched: rows.length });
  } catch (e) {
    bankError = String(e && e.message ? e.message : e);
    await noteSync(aureli.id, { ok: false, error: bankError, code: e && e.code });
    (result.sources = result.sources || []).unshift({ id: aureli.id, label: aureli.label, ok: false, error: cleanText(bankError, 200) });
    // Another bank answered: report this one as a warning, not a failed update.
    if (result.sources.some(x => x.ok)) { result.warnings.push(`${aureli.label}: ${cleanText(bankError, 200)}`); bankError = null; }
  }
  if (genericBalances.length) {
    try {
      const prev = await readJson(BALANCES());
      const kept = (prev && Array.isArray(prev.accounts) ? prev.accounts : []).filter(a => a && !genericBalances.some(b => b.acct === a.acct));
      const accs = genericBalances.map(b => ({ acct: b.acct, name: b.name || b.accountId, kind: null, balance: b.balance, currency: b.currency || currencyCode(), asOf: b.asOf || today }));
      const series = {};
      for (const b of genericBalances) series[b.acct] = { [b.asOf || today]: b.balance };
      for (const a of kept) series[a.acct] = { [a.asOf || today]: a.balance };
      await saveBalances({ accounts: [...kept, ...accs], series }, today);
      result.balanceAccounts = (result.balanceAccounts || 0) + accs.length;
    } catch (e) { result.warnings.push('Balances could not be saved: ' + cleanText(e && e.message ? e.message : e, 160)); }
  }
  j.detail = null;

  // 2. CSV into inbox/.
  if (j.bank) j.step = 'csv';
  if (rows.length) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    result.csv = await writeInboxCsv(rows, stamp);
  }
  if (genericRows.length) {
    // Other banks: one more CSV, account column '<sourceId>.<accountId>' so accounts never collide.
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    result.csvSources = await writeInboxCsv(genericRows, stamp + '-sources');
    result.fetched = (result.fetched || 0) + genericRows.length;
  }
  result.inboxFiles = await inboxPending();

  // 3. The pipeline (imports every CSV in inbox/, de-duplicates, analyses).
  j.step = 'spend';
  let summary;
  try {
    summary = await runPipelineNow({ publish: false });
  } catch (e) {
    if (bankError) e.message = `${bankError} Also, ${e.message.charAt(0).toLowerCase()}${e.message.slice(1)}`;
    throw e;
  }
  if (summary) {
    result.imported = Number(summary.imported) || 0;
    result.latest = summary.latest_transaction || null;
    result.storeEmpty = summary.status === 'empty';
    if (Number.isFinite(summary.bank_categories_changed)) result.bankCategoriesChanged = summary.bank_categories_changed;
    if (Array.isArray(summary.errors) && summary.errors.length) {
      result.warnings.push(...summary.errors.map(e => 'CSV problem: ' + cleanText(e, 200)));
    }
  }
  const after = await storeInfo();
  result.total = after.count;
  if (!result.latest) result.latest = after.latest;

  j.step = 'done';
  await finishJob(j, bankError ? { state: 'warning', error: bankError } : { state: result.sources?.some(s => !s.ok) ? 'warning' : 'ok' });
  process.stdout.write(`  finance update ${j.state}: fetched ${result.fetched ?? 0}, imported ${result.imported ?? 0}\n`);
}

// ─── Read side ───────────────────────────────────────────────────────────
/**
 * What the Finances view, the Home money cards, the money brief and the story
 * show. With sync on and another device reading the bank: that device's
 * published copy (meta.remote = {name, online, state, lastSeen, updatedAt, at}; state:
 * open | running | asleep | off | outdated, lib/finance-share.mjs status); before it has
 * published anything, this computer's own (empty) finances with
 * meta.remote.waiting. Otherwise this computer's own finances.
 */
export async function financeData() {
  let v = null;
  try { v = HOOKS.share ? await HOOKS.share.view() : null; } catch { v = null; }
  if (v && v.kind === 'mirror' && v.analysis) {
    const m = v.meta || {};
    // A copy per request, as a fresh read of analysis.json would be (the published copy is cached).
    const analysis = { ...structuredClone(v.analysis), budgets: await readBudgets() };
    const today = todayIn(cfg().timezone || null);
    if (!validIso(analysis.today) || analysis.today < today) analysis.today = today;
    const host = v.host || {};
    return {
      status: 'ok', analysis,
      meta: {
        available: true, setUp: true, currency: m.currency || currencyCode(), lastUpdate: m.lastUpdate || null, inboxPending: 0, job: null, model: null,
        storeCount: m.storeCount ?? analysis.transactions.length, analysisAt: m.analysisAt || null,
        accounts: m.accounts || [], sources: m.sources || [],
        remote: { name: host.name || m.by || 'your other computer', online: !!host.online, state: host.state || null, lastSeen: host.lastSeen || null, updatedAt: m.updatedAt || null, at: m.at || null },
      },
    };
  }
  const d = await localFinanceData();
  if (v && (v.kind === 'waiting' || v.hint)) {
    const host = (v.hint ? v.hint.host : v.host) || {};
    // trial: this device does not take changes from the others yet (Settings > Sync), so nothing can arrive.
    d.meta.remote = { name: host.name || 'your other computer', online: !!host.online, state: host.state || null, lastSeen: host.lastSeen || null, waiting: true, ...(v.hint && v.hint.trial ? { trial: true } : {}) };
  }
  return d;
}

/** This computer's own finances (the finance folder), whatever the other devices do. */
export async function localFinanceData() {
  const meta = {
    available: financeAvailable(),
    setUp: financeSetUp(),
    currency: currencyCode(),
    lastUpdate: await readJson(LAST_UPDATE()),
    inboxPending: await inboxPending(),
    job: publicJob(job),
    model: FETCH_MODEL,
  };
  const st = await storeInfo().catch(() => ({ count: 0, latest: null }));
  meta.storeCount = st.count;
  if (existsSync(ANALYSIS())) {
    const analysis = await readAnalysis();
    if (analysis) {
      meta.analysisAt = (await stat(ANALYSIS())).mtime.toISOString();
      // "Today" is the user's today (config.timezone), not the day the analysis was last built:
      // after midnight the Finances page, its pay cycle and the money brief move on to the new day.
      const today = todayIn(cfg().timezone || null);
      if (!validIso(analysis.today) || analysis.today < today) analysis.today = today;
      return { status: 'ok', analysis, meta };
    }
    meta.analysisError = 'analysis.json could not be read';
  }
  return { status: 'empty', meta };
}

/** analysis.json with the budgets injected (they live in _system/budgets.json). */
async function readAnalysis() {
  const analysis = await readJson(ANALYSIS());
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) return null;
  analysis.budgets = await readBudgets();
  analysis.pending = await pendingSnapshot();
  return analysis;
}

// ─── Write side: categories and budgets ──────────────────────────────────
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const NEW_CATEGORY = /^[A-Za-z][A-Za-z &/-]{1,30}$/;

/**
 * rules.json in its hand-edited layout: one rule per line, one override or
 * bank mapping per line, everything else compact. Round-trips exactly.
 */
function compactJson(v) {
  if (Array.isArray(v)) return '[' + v.map(compactJson).join(', ') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${compactJson(x)}`).join(', ') + '}';
  return JSON.stringify(v);
}
function formatRules(rules) {
  const parts = Object.entries(rules).map(([k, v]) => {
    let body;
    if (Array.isArray(v) && v.length && v.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
      body = '[\n' + v.map(x => '    ' + compactJson(x)).join(',\n') + '\n  ]';
    } else if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) {
      body = '{\n' + Object.entries(v).map(([a, b]) => `    ${JSON.stringify(a)}: ${compactJson(b)}`).join(',\n') + '\n  }';
    } else {
      body = compactJson(v);
    }
    return `  ${JSON.stringify(k)}: ${body}`;
  });
  return '{\n' + parts.join(',\n') + '\n}\n';
}

async function backupFile(path, prefix, keep = 30) {
  if (!existsSync(path)) return null;
  await mkdir(BACKUPS(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').replace(/\..*$/, '');
  let name = `${prefix}-${stamp}.json`, n = 1;
  while (existsSync(fp('_system', 'backups', name))) name = `${prefix}-${stamp}-${n++}.json`;
  await atomicWrite(fp('_system', 'backups', name), await readFile(path, 'utf8'));
  const old = (await readdir(BACKUPS())).filter(f => f.startsWith(prefix + '-') && f.endsWith('.json')).sort();
  for (const f of old.slice(0, Math.max(0, old.length - keep))) await unlink(fp('_system', 'backups', f)).catch(() => {});
  return name;
}

/**
 * Set (or with category null, remove) a merchant override, then re-run
 * the pipeline. `merchant` is a transaction's `m` (the cleaned
 * merchant, title-cased); the override key is its upper-case form.
 */
export async function categoriseMerchant(merchant, category) {
  if (financeBusy()) throw httpError(409, 'An update is running. Try again when it has finished.');
  if (!financeAvailable()) throw httpError(400, 'The finance folder is not set up.');
  if (typeof merchant !== 'string') throw httpError(400, 'merchant must be a string');
  const m = cleanText(merchant, 200);
  if (!m || m.length > 120 || m !== merchant.trim()) throw httpError(400, 'invalid merchant');
  if (category !== null && typeof category !== 'string') throw httpError(400, 'category must be a string or null');

  // With sync on, another device may read the bank: then this is its published copy.
  const sh = await sharing();
  const mirror = !!(sh && !sh.publisher);
  const analysis = mirror ? ((await financeData()).analysis || null) : await readJson(ANALYSIS());
  const known = analysis && Array.isArray(analysis.categories) ? analysis.categories : [];
  let cat = null;
  if (category !== null) {
    cat = category.trim();
    if (!known.includes(cat) && !NEW_CATEGORY.test(cat)) throw httpError(400, 'invalid category');
    const seen = analysis && Array.isArray(analysis.transactions) && analysis.transactions.some(t => t && t.m === m);
    if (!seen) throw httpError(400, 'unknown merchant');
  }
  if (mirror) {
    // The finance computer applies it (now, or when it is next on); until then it is laid over its copy here.
    await HOOKS.share.editOverride(m, cat);
    return { ok: true, changed: true, analysis: (await financeData()).analysis };
  }

  pipelineBusy = true;
  let r;
  try {
    r = await withLock(RULES(), () => categoriseLocked(m, cat));
  } finally {
    pipelineBusy = false;
  }
  // Every device's edit goes through the shared edits, this one's too (noted as applied here).
  if (sh) await HOOKS.share.editOverride(m, cat, { applied: true }).catch(() => {});
  return r;
}

/**
 * Several merchant overrides at once (edits from the other devices, applied by
 * the finance computer): [{m, c|null}] -> true when rules.json changed (then the
 * analysis is rebuilt once). Bad entries are skipped. Waits for a running update.
 */
export async function applyMerchantOverrides(list) {
  if (!FIN || !financeSetUp() || !Array.isArray(list) || !list.length) return false;
  for (let i = 0; financeBusy() && i < 600; i++) await new Promise(r => setTimeout(r, 1000));
  if (financeBusy()) throw httpError(409, 'An update is still running; the edits are applied on the next try.');
  pipelineBusy = true;
  try {
    return await withLock(RULES(), async () => {
      const before = await readFile(RULES(), 'utf8');
      const rules = JSON.parse(before);
      if (!rules || typeof rules !== 'object' || !Array.isArray(rules.rules)) return false;
      const ov = rules.merchant_overrides && typeof rules.merchant_overrides === 'object' ? rules.merchant_overrides : {};
      let n = 0;
      for (const e of list) {
        const m = typeof e.m === 'string' ? cleanText(e.m, 120) : '';
        if (!m) continue;
        const cat = e.c == null ? null : String(e.c).trim();
        if (cat !== null && !NEW_CATEGORY.test(cat) && !(cat.length <= 40 && /^[\w &/.,'()+-]+$/.test(cat))) continue;
        const key = m.toUpperCase();
        const existing = Object.keys(ov).filter(k => k.toUpperCase() === key);
        if (cat === null ? !existing.length : (existing.length === 1 && existing[0] === key && ov[key] === cat)) continue;
        for (const k of existing) delete ov[k];
        if (cat !== null) ov[key] = cat;
        n++;
      }
      if (!n) return false;
      rules.merchant_overrides = ov;
      const text = formatRules(rules);
      if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(rules)) return false;
      await backupFile(RULES(), 'rules');
      await atomicWrite(RULES(), text);
      try { await runPipelineNow(); }
      catch (e) { await atomicWrite(RULES(), before); throw e; }
      process.stdout.write(`  finance categorise: ${n} override(s) from another device\n`);
      return true;
    });
  } finally {
    pipelineBusy = false;
  }
}

/**
 * Several merchants at once, one rebuild: [{merchant, category|null}]. All are checked first; the rules go back if the
 * rebuild fails. The page undoes it by sending the old categories the same way, so one Undo reverts them all.
 */
export async function categoriseMerchants(changes) {
  if (financeBusy()) throw httpError(409, 'An update is running. Try again when it has finished.');
  if (!financeAvailable()) throw httpError(400, 'The finance folder is not set up.');
  if (!Array.isArray(changes) || !changes.length || changes.length > 500) throw httpError(400, 'changes must be a list of 1 to 500');
  const sh = await sharing();
  const mirror = !!(sh && !sh.publisher);
  const analysis = mirror ? ((await financeData()).analysis || null) : await readJson(ANALYSIS());
  const known = analysis && Array.isArray(analysis.categories) ? analysis.categories : [];
  const seen = new Set(analysis && Array.isArray(analysis.transactions) ? analysis.transactions.map(t => t && t.m) : []);
  const list = [];
  for (const c of changes) {
    if (!c || typeof c.merchant !== 'string') throw httpError(400, 'merchant must be a string');
    const m = cleanText(c.merchant, 200);
    if (!m || m.length > 120 || m !== c.merchant.trim()) throw httpError(400, 'invalid merchant');
    if (c.category !== null && typeof c.category !== 'string') throw httpError(400, 'category must be a string or null');
    let cat = null;
    if (c.category !== null) {
      cat = c.category.trim();
      if (!known.includes(cat) && !NEW_CATEGORY.test(cat)) throw httpError(400, 'invalid category');
      if (!seen.has(m)) throw httpError(400, 'unknown merchant');
    }
    list.push([m, cat]);
  }
  if (mirror) {
    for (const [m, cat] of list) await HOOKS.share.editOverride(m, cat);
    return { ok: true, changed: true, analysis: (await financeData()).analysis };
  }
  pipelineBusy = true;
  let r;
  try {
    r = await withLock(RULES(), async () => {
      const before = await readFile(RULES(), 'utf8');
      const rules = JSON.parse(before);
      if (!rules || typeof rules !== 'object' || !Array.isArray(rules.rules)) throw new Error('rules.json is not in the expected shape');
      const ov = rules.merchant_overrides && typeof rules.merchant_overrides === 'object' ? rules.merchant_overrides : {};
      for (const [m, cat] of list) {
        const key = m.toUpperCase();
        for (const k of Object.keys(ov).filter(k => k.toUpperCase() === key)) delete ov[k];
        if (cat !== null) ov[key] = cat;
      }
      rules.merchant_overrides = ov;
      const text = formatRules(rules);
      if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(rules)) throw new Error('rules.json would not round-trip; nothing was changed');
      const backup = await backupFile(RULES(), 'rules');
      await atomicWrite(RULES(), text);
      try { await runPipelineNow(); }
      catch (e) { await atomicWrite(RULES(), before); throw e; }
      process.stdout.write(`  finance categorise: ${list.length} overrides changed (backup ${backup})\n`);
      return { ok: true, changed: true, analysis: await readAnalysis() };
    });
  } finally {
    pipelineBusy = false;
  }
  if (sh) for (const [m, cat] of list) await HOOKS.share.editOverride(m, cat, { applied: true }).catch(() => {});
  return r;
}

async function categoriseLocked(m, cat) {
  {
    const before = await readFile(RULES(), 'utf8');
    const rules = JSON.parse(before);
    if (!rules || typeof rules !== 'object' || !Array.isArray(rules.rules)) throw new Error('rules.json is not in the expected shape');
    const key = m.toUpperCase();
    const ov = rules.merchant_overrides && typeof rules.merchant_overrides === 'object' ? rules.merchant_overrides : {};
    // Drop any differently-cased duplicate of this key too; the pipeline upper-cases keys anyway.
    const existing = Object.keys(ov).filter(k => k.toUpperCase() === key);
    const unchanged = cat === null ? existing.length === 0 : (existing.length === 1 && existing[0] === key && ov[key] === cat);
    if (unchanged) return { ok: true, changed: false, analysis: await readAnalysis() };
    for (const k of existing) delete ov[k];
    if (cat !== null) ov[key] = cat;
    rules.merchant_overrides = ov;
    const text = formatRules(rules);
    if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(rules)) throw new Error('rules.json would not round-trip; nothing was changed');
    const backup = await backupFile(RULES(), 'rules');
    await atomicWrite(RULES(), text);
    try {
      await runPipelineNow();
    } catch (e) {
      await atomicWrite(RULES(), before);   // put the old rules back; analysis.json is untouched
      throw e;
    }
    process.stdout.write(`  finance categorise: override ${cat === null ? 'removed' : 'set'} (backup ${backup})\n`);
    return { ok: true, changed: true, analysis: await readAnalysis() };
  }
}

/** _system/budgets.json is a flat {category: amount} map; anything malformed is ignored. */
export async function localBudgets() {
  if (!FIN) return {};
  const b = await readJson(BUDGETS());
  if (!b || typeof b !== 'object' || Array.isArray(b)) return {};
  const out = {};
  for (const [k, v] of Object.entries(b)) if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v;
  return out;
}
/** The budgets in charge: with sync on and encrypted the shared ones (every device), else budgets.json. */
async function readBudgets() {
  if (await sharing()) {
    const sb = await HOOKS.share.sharedBudgets().catch(() => null);
    if (sb) return sb;
  }
  return localBudgets();
}
/** budgets.json as the shared budgets say (the fetcher keeps it in line, for sync off later). */
export async function writeBudgetsFile(map) {
  if (!FIN) return;
  const out = {};
  for (const [k, v] of Object.entries(map || {})) if (typeof k === 'string' && k.length <= 40 && typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e7) out[k] = Math.round(v * 100) / 100;
  await ensureFinanceDir(FIN);
  await withLock(BUDGETS(), () => atomicWrite(BUDGETS(), JSON.stringify(out, null, 1)));
}

export async function getBudgets() { return { budgets: await readBudgets() }; }

/**
 * Save budgets. base: the budgets the page started from; with sync on only the
 * categories that differ from it are written to the shared budgets (field by
 * field, so a budget another device added meanwhile is kept).
 */
export async function setBudgets(budgets, base = null) {
  if (!budgets || typeof budgets !== 'object' || Array.isArray(budgets)) throw httpError(400, 'budgets must be an object');
  const entries = Object.entries(budgets);
  if (entries.length > 200) throw httpError(400, 'too many budgets');
  const d = await financeData().catch(() => null);
  const known = d && d.analysis && Array.isArray(d.analysis.categories) ? d.analysis.categories : [];
  const out = {};
  for (const [k, v] of entries) {
    if (!known.includes(k) && !NEW_CATEGORY.test(k)) throw httpError(400, `invalid category: ${cleanText(k, 40)}`);
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1e7) throw httpError(400, `invalid amount for ${cleanText(k, 40)}`);
    out[k] = Math.round(v * 100) / 100;
  }
  const sh = await sharing();
  let start = null;
  if (base && typeof base === 'object' && !Array.isArray(base)) {
    start = {};
    for (const [k, v] of Object.entries(base).slice(0, 200)) if (typeof k === 'string' && k.length <= 40 && typeof v === 'number' && Number.isFinite(v) && v >= 0) start[k] = Math.round(v * 100) / 100;
  }
  if (sh) {
    // The shared budgets are in charge; the fetcher's budgets.json follows them. A
    // device that does not read the bank keeps no budgets of its own.
    const eff = await HOOKS.share.saveBudgets(out, start);
    if (sh.publisher) await writeBudgetsFile(eff);
    return { ok: true, budgets: eff };
  }
  if (!FIN) throw httpError(400, 'No finance folder is configured.');
  await ensureFinanceDir(FIN);
  await withLock(BUDGETS(), () => atomicWrite(BUDGETS(), JSON.stringify(out, null, 1)));
  return { ok: true, budgets: out };
}

// ─── CSV upload and export ───────────────────────────────────────────────
const UPLOAD_NAME = /^[A-Za-z0-9 ._()&+-]{1,80}$/;

/**
 * Import a CSV export the user picked in the page. `name` is the file's name,
 * `data` its bytes as base64. The file is parsed first (a file that can't be
 * read is refused with the reason and never lands in inbox/), then written to
 * inbox/ and imported. Works with no connection at all.
 * A file that looks like a credit card is not imported yet: {needsCardCheck, preview} (lib/finance/cards.mjs),
 * and the page sends it again with `card`: the person's answer ({key, name, flip, flipped}), or false (not a card).
 */
export async function importUpload({ name, data, force = false, card } = {}) {
  if (financeBusy()) throw httpError(409, 'An update is running. Try again when it has finished.');
  if (!financeAvailable()) throw httpError(400, 'No finance folder is configured.');
  if (typeof name !== 'string' || typeof data !== 'string') throw httpError(400, 'name and data (base64) are required');
  let base = String(name).split(/[\\/]/).pop().replace(INVISIBLE, '').trim();
  if (!/\.csv$/i.test(base)) throw httpError(400, 'Only .csv files can be imported. Export a CSV from your bank\'s website.');
  base = base.replace(/[^A-Za-z0-9 ._()&+-]/g, '_');
  if (!UPLOAD_NAME.test(base) || base.startsWith('.')) base = 'import.csv';
  if (!/^[A-Za-z0-9+/=\s]*$/.test(data)) throw httpError(400, 'data must be base64');
  const buf = Buffer.from(data, 'base64');
  if (!buf.length) throw httpError(400, 'The file is empty.');
  if (buf.length > MAX_UPLOAD_BYTES) throw httpError(413, 'The file is larger than 5 MB.');
  let check;
  try { check = checkCsv(buf, base); }
  catch (e) { throw httpError(400, `This file could not be read as a bank export: ${cleanText(e && e.message ? e.message : e, 240)}`); }
  if (card === undefined) {
    const preview = await cardCheck(FIN, buf, base).catch(() => null);
    if (preview) return { ok: true, needsCardCheck: true, preview };
  }
  const isAnswer = card === false || (card && typeof card === 'object');
  // An export of an account a bank connection already reads would be counted
  // twice (different account id and wording, same transactions): ask first.
  if (force !== true) {
    const ov = await crossAccountOverlap(FIN, buf, base, isAnswer && card ? cardOverlapRows(buf, base, card) : null).catch(() => null);
    if (ov && ov.matched >= 3 && ov.matched / ov.rows >= 0.6) {
      const e = httpError(409, `This file looks like an account that is already here from another source (probably your bank connection): ${ov.matched} of its ${ov.rows} transactions have the same date and amount as ones already imported, so importing it would count them twice. Nothing was imported. If it really is a different account, import it anyway.`);
      e.code = 'LOOKS_LIKE_DUPLICATE';
      throw e;
    }
  }
  pipelineBusy = true;
  try {
    await ensureFinanceDir(FIN);
    // A card goes in as the store reads it (cards.mjs cardFile). Not a card: as it came, and not asked about again.
    const answered = isAnswer ? await cardAnswer(FIN, buf, base, card) : null;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    let file = `upload-${stamp}-${base}`, n = 1;
    while (existsSync(fp('inbox', file))) file = `upload-${stamp}-${n++}-${base}`;
    await atomicWrite(fp('inbox', file), answered ? answered.buf : buf, { encoding: null });
    const summary = await runPipelineNow();
    const errors = Array.isArray(summary.errors) ? summary.errors.map(e => cleanText(e, 200)) : [];
    process.stdout.write(`  finance import: ${check.rows} rows read, ${summary.imported ?? 0} new\n`);
    return { ok: true, file, rows: check.rows, from: check.from, to: check.to, imported: summary.imported ?? 0, total: summary.total ?? null, errors, ...(answered ? { card: answered.card } : {}), analysis: await readAnalysis() };
  } finally {
    pipelineBusy = false;
  }
}

/** The rows of a card file as they will be stored, for the "is this already here?" check. */
function cardOverlapRows(buf, base, card) {
  const key = typeof card.key === 'string' ? card.key : 'card-new';
  return parseCsv(buf, base).map(r => ({ ...r, amount: card.flip === true && r.amount ? -r.amount : r.amount, account: key }));
}

/** Every stored transaction as CSV text (the replacement for Spending.xlsx). */
export async function exportTransactions() {
  if (!FIN) throw httpError(400, 'No finance folder is configured.');
  const list = HOOKS.bankSources ? await HOOKS.bankSources().catch(() => []) : [];
  return transactionsCsv(await loadFrame(FIN, { matchTransfers: true, sources: list }));
}

// Exposed for tests only.
export const _internals = {
  normalise, parseStream, collectTransactions, collectBalances, fetchPrompt, csvField, validIso, cleanText,
  cleanCategory, formatRules,
};

// Tidy any half-written CSVs left by a crash (only our own temp files: the old
// "<name>.part" form and fsutil's ".<name>.tmp-*" form).
export async function cleanupPartials() {
  if (!FIN) return;
  try {
    for (const f of await readdir(INBOX())) {
      if (/^bank-sync-[\d-]+\.csv\.part$/.test(f) || /^\.bank-sync-[\d-]+\.csv\.tmp-/.test(f)) await unlink(fp('inbox', f)).catch(() => {});
    }
  } catch (e) { /* no inbox yet */ }
}

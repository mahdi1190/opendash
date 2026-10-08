// lib/fin-connect/plasma.mjs - the Plasma One provider (docs/dev/FINANCE_CONNECTIONS.md
// sections 2.1, 3.2, 3.3). Owner: finance connections, Plasma builder.
//
// Plasma One is a stablecoin neobank on the public Plasma chain (chain id 9745).
// There is no Plasma One API, but the wallet's balances and transfers are public
// on-chain, so this provider only needs the user's PUBLIC wallet address. It has
// nothing it could sign or send with, and every request still goes through the
// read-only allowlist (ALLOW, checked by lib/fin-connect/http.mjs readOnlyClient
// and again by allowRequest here) before it leaves.
//
// Data, in order:
//   1. Routescan's Etherscan-style API for chain 9745 (the plasmascan.to data):
//      tokentx (one token's transfers for one address), tokenbalance, tokeninfo.
//      Keyless: 2 requests/s, 10,000/day; an optional free key (secrets
//      plasma-key.json) raises that to 5/s, 100,000/day. A token bucket keeps under it.
//   2. Plasma's public JSON-RPC (rpc.plasma.to): the balance fallback (eth_call
//      balanceOf on a known token only) and the smart-account check (eth_getCode).
//      Transfers have no RPC fallback (eth_getLogs over months of one-second
//      blocks is more than a public RPC answers): when Routescan is down the
//      update keeps the rows it has, says so, and catches up next time.
//
// Tokens: only the contracts in TOKENS count, matched by ADDRESS, never by
// symbol (spam tokens call themselves "USDT" too). Each token the wallet has
// used is one account; USDT0 ("Plasma One") is always there.
//
// Card spending: the Plasma One card (issued by Rain) is paid from the wallet,
// but how a purchase looks on-chain is not documented: probably a transfer to
// a settlement address with no shop name, and some purchases may be combined
// or settled off-chain. So rows say "Plasma One payment · 0x12…ab34" (money in:
// "Plasma One received · ...") unless the
// user named that address (cursor.names, nameAddress()) or it is on the public
// label list (plasma-labels.json: public explorer labels only, each with its
// source; empty until one is public). CARD_NOTE is the honest sentence the page shows.
//
// Amounts: token units -> US cents exactly (BigInt); zero and sub-cent transfers
// are dropped (address-poisoning spam). normalise() returns Tx in USD;
// lib/fin-connect/normalise.mjs converts to the home currency at that day's rate
// and keeps the original in the memo ("... (<amount> USD @ <rate>)"). fetch() asks
// for the same rates first so the cursor never moves past a row still waiting
// for one. Balances are converted here (today's rate), the USD amount kept as `native`.
//
// Exports (the FinProvider contract, lib/fin-connect/provider.mjs, plus pure helpers):
//   default provider {id:'plasma', label, readOnly:true, allow, note, status, info, preview,
//     connect, callback, refresh, listAccounts, fetch, normalise, disconnect,
//     nameAddress, setApiKey, routes}
// Fake mode (DASHBOARD_PLASMA_FAKE=1, tests and screenshots only): the core gives
// ctx.http a fake fetch (tests/fixtures/fin-fake-plasma.mjs), same URLs, same allowlist.
//   checkAddressInput(text) -> {ok:true, address} | {ok:false, code, message}
//   looksLikeSecret, isAddress, toChecksumAddress, shortAddress, addrHash, accountIdFor,
//   allowRequest({method, url, body}), createPlasmaClient({fetchFn|http, apiKey, ...}),
//   unitsToCents, normaliseTransfer, TOKENS, ALLOW, CHAIN_ID, CARD_NOTE
//
// Logs: op, ms and counts only. Never the address, amounts, hashes or URLs.
// Node stdlib only.

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { FinError } from './provider.mjs';
import { readOnlyClient, allowedBy } from './http.mjs';
import { secretsFor } from './secrets.mjs';
import { cleanMemo, dateIn } from './normalise.mjs';
import { keccak256Hex } from './keccak.mjs';

export const CHAIN_ID = 9745;
export const ROUTESCAN_HOST = 'api.routescan.io';
export const ROUTESCAN_PATH = `/v2/network/mainnet/evm/${CHAIN_ID}/etherscan/api`;
export const RPC_HOST = 'rpc.plasma.to';
const ROUTESCAN_URL = `https://${ROUTESCAN_HOST}${ROUTESCAN_PATH}`;
const RPC_URL = `https://${RPC_HOST}/`;

// Verified live on 8 Oct 2026: Routescan tokeninfo for chain 9745 (USDT0: 6
// decimals, USDe: 18) and eth_call on rpc.plasma.to. Lowercase addresses.
export const TOKENS = Object.freeze([
  Object.freeze({ key: 'usdt0', symbol: 'USDT0', label: 'USDT', address: '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb', decimals: 6, currency: 'USD', main: true }),
  Object.freeze({ key: 'usde', symbol: 'USDe', label: 'USDe', address: '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34', decimals: 18, currency: 'USD' }),
]);
const TOKEN_BY_ADDR = new Map(TOKENS.map(t => [t.address, t]));
const TOKEN_BY_KEY = new Map(TOKENS.map(t => [t.key, t]));

export const CARD_NOTE = 'Card purchases come from the blockchain, so they may show as "Plasma One payment" without the shop name, '
  + 'and some may be combined or not show one by one. Transfers show the other address; you can name addresses you recognise.';

const BALANCE_OF = '0x70a08231';
const PAGE = 1000;             // Routescan's page size cap for tokentx
const MAX_PAGES = 60;          // 60,000 transfers per token per update: far beyond a personal wallet
const DUST_CENTS = 1;          // under one cent: address-poisoning spam, dropped

const err = (code, message) => new FinError(code, message);
const MSG = {
  busy: 'The Plasma explorer is busy (rate limit). OpenDash will try again later.',
  key: 'The Plasma explorer refused the API key. Check it in Settings, or remove it to use the free keyless limit.',
  bad: 'The Plasma explorer sent something OpenDash could not read.',
  token: 'That is a token contract, not your wallet.',
  secret: 'That looks like your secret recovery phrase or key. Never paste it anywhere. OpenDash only needs your public address.',
};

// ─── Addresses ───────────────────────────────────────────────────────────
const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
export const isAddress = (s) => typeof s === 'string' && ADDR_RE.test(s);

/** EIP-55 mixed-case checksum form of a 0x address. */
export function toChecksumAddress(addr) {
  const lower = String(addr).toLowerCase().replace(/^0x/, '');
  const hash = keccak256Hex(lower);
  let out = '0x';
  for (let i = 0; i < 40; i++) out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

/** "0x12…ab34": the only form an address takes in the page, memos and messages. */
export function shortAddress(a) {
  const s = String(a || '').toLowerCase();
  return isAddress(s) ? `${s.slice(0, 4)}…${s.slice(-4)}` : '';
}

/** A stable, non-reversible id for an address (sources.json keeps this, never the address). */
export function addrHash(a) {
  return createHash('sha256').update('plasma:' + String(a).toLowerCase()).digest('hex').slice(0, 24);
}

/** Account id: 'w-<12 hex>' for USDT ("Plasma One"), 'w-<12 hex>-<token>' for the others. */
export function accountIdFor(address, tokenKey = 'usdt0') {
  const base = 'w-' + addrHash(address).slice(0, 12);
  const t = TOKEN_BY_KEY.get(tokenKey);
  return !t || t.main ? base : `${base}-${t.key}`;
}

/**
 * True when the text looks like a private key (64 hex, with or without 0x, also
 * inside other text) or a recovery phrase (11-25 words of letters). The page
 * runs the same test before anything leaves it; the server runs it again.
 */
export function looksLikeSecret(text) {
  const s = String(text == null ? '' : text).trim();
  if (/(^|[^0-9a-fA-F])(0x)?[0-9a-fA-F]{64}([^0-9a-fA-F]|$)/.test(s)) return true;
  const words = s.split(/[\s,]+/).filter(Boolean).map(w => w.replace(/^\d+[.)]/, '')).filter(Boolean);
  return words.length >= 11 && words.length <= 25 && words.filter(w => /^[a-zA-Z]{3,8}$/.test(w)).length >= 11;
}

/**
 * Read what the user pasted: an address, optionally as 'plasma:0x..' /
 * 'ethereum:0x..@9745' / without 0x / with spaces. Mixed case must pass the
 * EIP-55 checksum (catches a one-character typo); all-lower or all-upper is accepted.
 */
export function checkAddressInput(text) {
  const raw = String(text == null ? '' : text);
  if (raw.length > 400) return { ok: false, code: 'BAD_REQUEST', message: 'That is too long to be a wallet address.' };
  if (looksLikeSecret(raw)) return { ok: false, code: 'SECRET_REFUSED', message: MSG.secret };
  let s = raw.trim().replace(/^(ethereum|plasma):/i, '').replace(/[/?#].*$/, '').replace(/@\d+$/, '').trim();
  if (!s) return { ok: false, code: 'BAD_REQUEST', message: 'Paste your Plasma wallet address (it starts with 0x).' };
  if (/^[0-9a-fA-F]{40}$/.test(s)) s = '0x' + s;
  if (!ADDR_RE.test(s)) return { ok: false, code: 'BAD_REQUEST', message: 'That is not a wallet address. It should be 0x followed by 40 letters and numbers.' };
  const body = s.slice(2);
  const mixed = body !== body.toLowerCase() && body !== body.toUpperCase();
  if (mixed && toChecksumAddress(s) !== '0x' + body) {
    return { ok: false, code: 'BAD_REQUEST', message: 'That address has a typo (its capital letters do not match). Copy it again from Plasma One.' };
  }
  const address = s.toLowerCase();
  if (/^0x0{40}$/.test(address)) return { ok: false, code: 'BAD_REQUEST', message: 'That is the empty address, not a wallet.' };
  if (TOKEN_BY_ADDR.has(address)) return { ok: false, code: 'BAD_REQUEST', message: MSG.token };
  return { ok: true, address };
}

// ─── Read-only allowlist (design 3.3) ────────────────────────────────────
const RS_ACTIONS = new Set(['account:tokentx', 'account:tokenbalance', 'token:tokeninfo']);
const RS_PARAMS = new Set(['module', 'action', 'address', 'contractaddress', 'startblock', 'endblock', 'page', 'offset', 'sort', 'tag', 'apikey']);
const RPC_METHODS = new Set(['eth_call', 'eth_getCode', 'eth_chainId']);

function routescanOk(u) {
  const q = u.searchParams;
  return [...q.keys()].every(k => RS_PARAMS.has(k)) && RS_ACTIONS.has(`${q.get('module')}:${q.get('action')}`);
}
function rpcOk(body) {
  let j = body;
  if (typeof body === 'string') { try { j = JSON.parse(body); } catch { return false; } }
  const calls = Array.isArray(j) ? j : [j];
  if (!calls.length || calls.length > 10) return false;
  return calls.every(c => {
    if (!c || typeof c !== 'object' || c.jsonrpc !== '2.0' || !RPC_METHODS.has(c.method) || !Array.isArray(c.params)) return false;
    if (c.method !== 'eth_call') return true;
    const call = c.params[0] || {};
    // balanceOf(address) on a known token and nothing else: no value, no from, no other selector.
    return Object.keys(call).every(k => k === 'to' || k === 'data') && TOKEN_BY_ADDR.has(String(call.to || '').toLowerCase())
      && new RegExp(`^${BALANCE_OF}[0-9a-f]{64}$`, 'i').test(String(call.data || ''));
  });
}

export const ALLOW = Object.freeze([
  Object.freeze({ method: 'GET', host: ROUTESCAN_HOST, path: ROUTESCAN_PATH, test: (u) => routescanOk(u) }),
  Object.freeze({ method: 'POST', host: RPC_HOST, path: '/', test: (u, body) => rpcOk(body) }),
]);

/** True only for the reads in ALLOW over https (no port, no credentials). Pure. */
export function allowRequest({ method = 'GET', url, body } = {}) {
  let u;
  try { u = new URL(String(url)); } catch { return false; }
  if (u.protocol !== 'https:' || u.port) return false;
  return !!allowedBy(ALLOW, method, u, body);
}

// ─── Client (Routescan + RPC through the allowlist) ──────────────────────
const sleepReal = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * opts: {http (a readOnlyClient) | fetchFn, apiKey?, minIntervalMs? (default 520 keyless,
 * 210 with a key: under 2/s and 5/s), sleep?, log?}
 */
export function createPlasmaClient(opts = {}) {
  const log = opts.log || (() => {});
  const http = opts.http && typeof opts.http.request === 'function'
    ? opts.http
    : readOnlyClient(ALLOW, { provider: 'plasma', fetchFn: opts.fetchFn || globalThis.fetch, log });
  const sleep = opts.sleep || sleepReal;
  const apiKey = typeof opts.apiKey === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(opts.apiKey) ? opts.apiKey : null;
  const minInterval = Number.isFinite(opts.minIntervalMs) ? opts.minIntervalMs : (apiKey ? 210 : 520);
  let nextAt = 0, calls = 0;

  async function send(method, url, json) {
    if (!allowRequest({ method, url, body: json })) {
      log('warn', `fin-connect policy plasma ${method}`);
      throw err('POLICY', 'OpenDash refused a request that is not on its read-only list.');
    }
    const wait = nextAt - Date.now();
    if (wait > 0) await sleep(wait);
    nextAt = Date.now() + minInterval;
    calls++;
    const r = await http.request(method, url, { ...(json !== undefined ? { json } : {}), label: 'The Plasma network' });
    if (r.status === 429) throw err('RATE_LIMITED', MSG.busy);
    if (r.status === 401 || r.status === 403) throw err('AUTH', MSG.key);
    if (!r.ok) throw err('NETWORK', `The Plasma network answered with an error (${Number(r.status) || 0}). OpenDash will try again later.`);
    return r.json;
  }

  async function routescan(params, retries = 3) {
    const q = new URLSearchParams(params);
    if (apiKey) q.set('apikey', apiKey);
    for (let attempt = 0; ; attempt++) {
      try {
        const j = await send('GET', `${ROUTESCAN_URL}?${q}`);
        if (!j || typeof j !== 'object') throw err('BAD_RESPONSE', MSG.bad);
        if (String(j.status) === '1') return j.result;
        const msg = `${j.message || ''} ${typeof j.result === 'string' ? j.result : ''}`;
        if (/no (transactions|records|token transfers|data)? ?found/i.test(msg)) return [];
        if (/rate limit/i.test(msg)) throw err('RATE_LIMITED', MSG.busy);
        if (/api ?key/i.test(msg)) throw err('AUTH', MSG.key);
        throw err('BAD_RESPONSE', MSG.bad);
      } catch (e) {
        if (e.code !== 'RATE_LIMITED' || attempt >= retries) throw e;
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  async function rpc(method, params) {
    const j = await send('POST', RPC_URL, { jsonrpc: '2.0', id: 1, method, params });
    if (!j || j.error || typeof j.result !== 'string') throw err('BAD_RESPONSE', 'The Plasma network could not answer that request.');
    return j.result;
  }

  return {
    get calls() { return calls; },
    hasKey: !!apiKey,
    /** One page (up to 1,000) of a token's transfers for an address, oldest first, from startblock (inclusive). */
    async tokentx(address, token, startblock = 0, { newest = false } = {}) {
      const res = await routescan({ module: 'account', action: 'tokentx', contractaddress: token.address, address,
        startblock: String(startblock), endblock: '999999999', page: '1', offset: String(PAGE), sort: newest ? 'desc' : 'asc' });
      if (!Array.isArray(res)) throw err('BAD_RESPONSE', MSG.bad);
      return res;
    },
    async tokenBalance(address, token) {
      const res = await routescan({ module: 'account', action: 'tokenbalance', contractaddress: token.address, address, tag: 'latest' });
      if (!/^\d{1,78}$/.test(String(res))) throw err('BAD_RESPONSE', MSG.bad);
      return BigInt(res);
    },
    /** {symbol} when the address is a token contract, else null. */
    async tokenInfo(address) {
      const res = await routescan({ module: 'token', action: 'tokeninfo', contractaddress: address }, 1);
      const first = Array.isArray(res) ? res[0] : null;
      return first && (first.tokenType || first.symbol) ? { symbol: String(first.symbol || '').slice(0, 20) } : null;
    },
    async rpcBalance(address, token) {
      const data = BALANCE_OF + address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
      const hex = await rpc('eth_call', [{ to: token.address, data }, 'latest']);
      if (!/^0x[0-9a-fA-F]{0,64}$/.test(hex)) throw err('BAD_RESPONSE', MSG.bad);
      return hex === '0x' ? 0n : BigInt(hex);
    },
    async hasCode(address) {
      const hex = await rpc('eth_getCode', [address, 'latest']);
      return /^0x[0-9a-fA-F]+$/.test(hex) && hex.length > 2;
    },
  };
}

// ─── Amounts and normalisation ───────────────────────────────────────────
/** Token units (decimal string) -> whole cents, rounded half up; null when unreadable or huge. */
export function unitsToCents(value, decimals) {
  if (!/^\d{1,78}$/.test(String(value))) return null;
  const v = BigInt(value), d = BigInt(decimals);
  let cents;
  if (d >= 2n) { const scale = 10n ** (d - 2n); cents = (v + scale / 2n) / scale; }
  else cents = v * 10n ** (2n - d);
  return cents > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(cents);
}

/**
 * Plain transfer -> raw item for the core (fetch annotates it; normalise reads only this).
 * {kind:'plasma', token, accountId, dir:'in'|'out', other (full address, server only),
 *  name?, value, ts, hash, n, block}
 */
function annotate(t, { address, token, accountId, names, labels: lab }) {
  const me = address.toLowerCase();
  const from = String(t.from || '').toLowerCase(), to = String(t.to || '').toLowerCase();
  const dir = to === me && from !== me ? 'in' : from === me && to !== me ? 'out' : null;
  const other = dir === 'in' ? from : dir === 'out' ? to : null;
  return {
    kind: 'plasma', token: token.key, contract: String(t.contractAddress || '').toLowerCase(), decimals: String(t.tokenDecimal ?? token.decimals),
    accountId, dir, other, name: other ? (names[other] || names[shortAddress(other)] || lab[other] || null) : null,
    value: String(t.value), ts: Number(t.timeStamp), hash: String(t.hash || '').toLowerCase(), n: t.n || 0, block: Number(t.blockNumber),
  };
}

/**
 * Raw item (from fetch) -> Tx {id, accountId, ts, minor (signed US cents), currency:'USD',
 * memo, bc:null, sub:''} | {reason}. Sign from the direction only, never from text.
 */
export function normaliseTransfer(raw) {
  if (!raw || typeof raw !== 'object' || raw.kind !== 'plasma') return { reason: 'not a transfer' };
  const token = TOKEN_BY_KEY.get(raw.token);
  if (!token || raw.contract !== token.address) return { reason: 'other token' };
  if (raw.decimals !== String(token.decimals)) return { reason: 'bad decimals' };
  if (raw.dir !== 'in' && raw.dir !== 'out') return { reason: 'not this wallet' };
  if (!isAddress(raw.other)) return { reason: 'bad address' };
  const cents = unitsToCents(raw.value, token.decimals);
  if (cents == null) return { reason: 'bad amount' };
  if (cents < DUST_CENTS) return { reason: 'dust' };
  if (!Number.isFinite(raw.ts) || raw.ts <= 0) return { reason: 'bad date' };
  const named = raw.name ? cleanMemo(raw.name, 60) : '';
  // "Plasma One payment · 0x12…ab34": the finance merchant cleaner keeps "Plasma One Payment"
  // (one merchant, not one per address) and the description still shows the address.
  const memo = named || `Plasma One ${raw.dir === 'in' ? 'received' : 'payment'} · ${shortAddress(raw.other)}`;
  const id = 'p' + createHash('sha1').update([raw.hash, raw.token, raw.dir, raw.other, raw.value, raw.n].join('|')).digest('hex').slice(0, 19);
  return {
    row: {
      id, accountId: raw.accountId, ts: new Date(raw.ts * 1000).toISOString(), minor: raw.dir === 'in' ? cents : -cents,
      currency: token.currency, memo, bc: null, sub: '',
    },
  };
}

// ─── Secrets (address, optional key) ─────────────────────────────────────
const secrets = (ctx) => (ctx && ctx.secrets && typeof ctx.secrets.read === 'function' ? ctx.secrets : secretsFor(ctx.dataDir));
const SOURCE_ID_RE = /^bank-[a-z0-9][a-z0-9-]{1,38}$/;
const secretName = (sourceId) => `plasma-${sourceId}`;

async function readAddress(ctx, source) {
  if (!source || !SOURCE_ID_RE.test(String(source.id || ''))) throw err('NOT_CONFIGURED', 'This Plasma One wallet is not set up.');
  const s = await secrets(ctx).read(secretName(source.id));
  if (!s || !isAddress(s.address)) throw err('NOT_CONFIGURED', 'This Plasma One wallet needs its address again: disconnect it and add it once more.');
  return s.address.toLowerCase();
}

async function readKey(ctx) {
  const s = await secrets(ctx).read('plasma-key').catch(() => null);
  return s && typeof s.key === 'string' ? s.key : null;
}

/** Save (or with '' remove) the optional Routescan key. Returns {configured}. Never echoes it. */
export async function setApiKey(ctx, key) {
  const k = String(key == null ? '' : key).trim();
  if (!k) { await secrets(ctx).remove('plasma-key'); return { configured: false }; }
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(k)) throw err('BAD_REQUEST', 'That does not look like a Routescan API key.');
  await secrets(ctx).write('plasma-key', { key: k });
  return { configured: true };
}

// ─── Client for a ctx ────────────────────────────────────────────────────
// ctx.http is the core's allowlist client (lib/fin-connect/index.mjs ctxFor); in
// fake mode (DASHBOARD_PLASMA_FAKE=1) it talks to tests/fixtures/fin-fake-plasma.mjs
// instead of the network, same URLs, same allowlist. ctx.fetchFn: tests only.
async function clientFor(ctx) {
  const apiKey = await readKey(ctx).catch(() => null);
  const base = { apiKey, log: ctx.log || (() => {}), sleep: ctx.sleep, minIntervalMs: ctx.minIntervalMs ?? (ctx.fake ? 0 : undefined) };
  if (ctx.fetchFn) return createPlasmaClient({ ...base, fetchFn: ctx.fetchFn });
  const http = typeof ctx.http === 'function' ? ctx.http(provider) : ctx.http;
  return createPlasmaClient({ ...base, ...(http && typeof http.request === 'function' ? { http } : {}) });
}

// ─── Labels (public explorer labels only) ────────────────────────────────
let LABELS = null;
function labels() {
  if (LABELS) return LABELS;
  LABELS = {};
  try {
    const j = JSON.parse(readFileSync(new URL('./plasma-labels.json', import.meta.url), 'utf8'));
    for (const l of Array.isArray(j.labels) ? j.labels : []) {
      if (l && isAddress(l.address) && typeof l.name === 'string' && typeof l.source === 'string') LABELS[l.address.toLowerCase()] = l.name.slice(0, 60);
    }
  } catch { /* no list: generic memos */ }
  return LABELS;
}

// ─── FX (asked in fetch only to keep the cursor honest) ──────────────────
async function rateFor(ctx, from, to, date, cache) {
  if (from === to) return 1;
  const key = `${from}-${to}-${date}`;
  if (cache.has(key)) return cache.get(key);
  let rate = null;
  try {
    const fx = ctx && ctx.fx;
    const fn = typeof fx === 'function' ? fx : fx && typeof fx.rateOn === 'function' ? fx.rateOn.bind(fx) : null;
    const r = fn ? await fn(from, to, date) : null;
    const v = typeof r === 'number' ? r : r && Number(r.rate);
    rate = v > 0 && Number.isFinite(v) ? v : null;
  } catch { rate = null; }
  cache.set(key, rate);
  return rate;
}

const homeOf = (ctx, opts) => {
  const c = opts.home || opts.currency || ctx.home || (ctx.getConfig && (ctx.getConfig() || {}).currency);
  return /^[A-Z]{3}$/.test(String(c || '')) ? c : 'GBP';
};
const zoneOf = (ctx, opts) => opts.timeZone || ctx.timeZone || (ctx.getConfig && (ctx.getConfig() || {}).timezone) || null;

// ─── Reading a wallet ────────────────────────────────────────────────────
async function allTransfers(client, address, token, startblock) {
  const seen = new Set();
  const out = [];
  let start = startblock;
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await client.tokentx(address, token, start);
    let added = 0, last = start;
    const perTx = new Map();
    for (const t of batch) {
      // Routescan has no log index: the same (hash, from, to, value) twice in one tx is two transfers.
      const base = [t.hash, t.from, t.to, t.value].join('|').toLowerCase();
      const n = perTx.get(base) || 0;
      perTx.set(base, n + 1);
      const b = Number(t.blockNumber);
      if (Number.isFinite(b) && b > last) last = b;
      if (seen.has(base + '|' + n)) continue;
      seen.add(base + '|' + n);
      out.push({ ...t, n });
      added++;
    }
    if (batch.length < PAGE || !added) break;
    // The next page starts AT the last block (inclusive), so a block split across pages is read whole.
    start = last;
  }
  return out;
}

async function readWallet(ctx, address, opts = {}) {
  const client = await clientFor(ctx);
  const home = homeOf(ctx, opts);
  const timeZone = zoneOf(ctx, opts);
  const today = opts.today || dateIn(new Date(ctx.now ? +ctx.now() : Date.now()).toISOString(), timeZone);
  const cursor = opts.cursor && typeof opts.cursor === 'object' ? opts.cursor : {};
  // Per account (the core resets cursor.accounts[id] to fetch an account's history again).
  const prevAccounts = cursor.accounts && typeof cursor.accounts === 'object' ? cursor.accounts : {};
  const names = cursor.names && typeof cursor.names === 'object' ? cursor.names : {};
  const rates = new Map();
  const rows = [], accounts = [], balances = [], warnings = [];
  const nextAccounts = {};
  let held = 0;
  for (const token of TOKENS) {
    const accountId = accountIdFor(address, token.key);
    const prev = prevAccounts[accountId] || {};
    const on = !opts.accountOn || opts.accountOn(accountId);
    const startblock = opts.full ? 0 : Number.isInteger(prev.block) && prev.block > 0 ? prev.block : 0;
    let transfers = [], txError = null;
    try { transfers = await allTransfers(client, address, token, startblock); }
    // A refused key or a policy stop is not transient: the source shows it. The rest warns.
    catch (e) { if (e.code === 'POLICY' || e.code === 'AUTH') throw e; txError = e; }
    let units = null;
    try { units = await client.tokenBalance(address, token); }
    catch (e) {
      if (e.code === 'POLICY') throw e;
      units = await client.rpcBalance(address, token).catch(e2 => { if (e2.code === 'POLICY') throw e2; return null; });
    }
    if (txError && token.main && units == null) throw txError;   // nothing at all came back: the source is failing
    const used = token.main || prev.used || transfers.length > 0 || (units != null && units > 0n);
    if (!used) continue;
    if (txError) warnings.push(`${token.label} transfers could not be read this time (${txError.message})`);
    const name = token.main ? 'Plasma One' : `Plasma One ${token.label}`;
    accounts.push({ id: accountId, name, kind: 'wallet', mask: shortAddress(address), currency: token.currency });
    let maxBlock = startblock, heldBlock = null;
    for (const t of transfers) {
      const b = Number(t.blockNumber);
      const raw = annotate(t, { address, token, accountId, names, labels: labels() });
      if (raw.dir && token.currency !== home) {
        const date = dateIn(new Date(raw.ts * 1000).toISOString(), timeZone);
        if (date && await rateFor(ctx, token.currency, home, date, rates) == null) {
          held++;
          if (heldBlock == null || b < heldBlock) heldBlock = b;
        }
      }
      if (Number.isFinite(b) && b > maxBlock) maxBlock = b;
      if (on) rows.push(raw);
    }
    // Rows still waiting for a rate are read again next time: the cursor stops at the first one.
    // A switched-off account keeps its place, so switching it back on brings everything in.
    const block = txError || !on ? startblock : heldBlock != null ? heldBlock : maxBlock;
    nextAccounts[accountId] = { token: token.key, block, used: true, ...(txError ? { lastError: today } : { lastRead: today }) };
    if (units != null) {
      const cents = unitsToCents(units.toString(), token.decimals);
      // In the token's currency (USD): the core converts it at today's rate.
      if (cents != null) balances.push({ accountId, name, balance: cents / 100, currency: token.currency, asOf: today });
    }
  }
  return {
    rows, accounts, balances,
    cursor: { ...cursor, accounts: { ...prevAccounts, ...nextAccounts }, names }, held,
    ...(warnings.length ? { warning: warnings.join('; ') } : {}),
    calls: client.calls,
  };
}

// ─── Preview (before anything is saved) ──────────────────────────────────
/**
 * {address:'0x12…ab34', smartAccount, tokens:[{key, label, amount, currency}], balance:{amount, currency:'USD'},
 *  homeBalance?:{pence, currency}, transfers30d, more30d, empty, note}. Refuses secrets, bad addresses and token contracts.
 */
async function preview(ctx, input = {}) {
  const chk = checkAddressInput(input.address);
  if (!chk.ok) throw err(chk.code, chk.message);
  const address = chk.address;
  const client = await clientFor(ctx);
  // Plasma One wallets are smart accounts (ERC-4337), so code at the address is
  // normal: only a TOKEN contract is refused, and tokeninfo tells them apart.
  const info = await client.tokenInfo(address).catch(e => { if (e.code === 'POLICY') throw e; return null; });
  if (info) throw err('BAD_REQUEST', MSG.token);
  const smartAccount = await client.hasCode(address).catch(e => { if (e.code === 'POLICY') throw e; return null; });
  const since = (ctx.now ? +ctx.now() : Date.now()) / 1000 - 30 * 86400;
  const tokens = [];
  let transfers30d = 0, total = 0, more30d = false;
  for (const token of TOKENS) {
    let units = null;
    try { units = await client.tokenBalance(address, token); }
    catch (e) { if (e.code === 'POLICY') throw e; units = await client.rpcBalance(address, token).catch(() => null); }
    let recent = [];
    try {
      // One call per token: the newest 1,000 transfers. A busier month shows as "1,000+".
      const page = await client.tokentx(address, token, 0, { newest: true });
      recent = page.filter(t => Number(t.timeStamp) >= since && annotate(t, { address, token, accountId: '', names: {}, labels: {} }).dir
        && (unitsToCents(t.value, token.decimals) || 0) >= DUST_CENTS);
      if (page.length >= PAGE && Number(page[page.length - 1].timeStamp) >= since) more30d = true;
    } catch (e) { if (e.code === 'POLICY') throw e; if (token.main && units == null) throw e; }
    const cents = units == null ? null : unitsToCents(units.toString(), token.decimals);
    if (!token.main && !cents && !recent.length) continue;
    transfers30d += recent.length;
    if (cents != null) total += cents;
    tokens.push({ key: token.key, label: token.label, amount: cents == null ? null : cents / 100, currency: token.currency });
  }
  // The same balance in the home currency at today's rate (when one is to hand).
  const home = homeOf(ctx, {});
  const today = dateIn(new Date(ctx.now ? +ctx.now() : Date.now()).toISOString(), zoneOf(ctx, {}));
  const rate = home === 'USD' ? null : await rateFor(ctx, 'USD', home, today, new Map());
  return {
    address: shortAddress(address), smartAccount, tokens, balance: { amount: total / 100, currency: 'USD' },
    ...(rate ? { homeBalance: { pence: Math.round(total * rate), currency: home } } : {}),
    transfers30d, more30d, empty: total === 0 && transfers30d === 0, note: CARD_NOTE,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────
const newSourceId = () => 'bank-plasma-' + randomBytes(3).toString('hex');
const maskOf = (source) => (source && ((source.extra && source.extra.mask) || source.mask)) || null;

/**
 * Check a pasted address and refuse token contracts (Plasma One wallets are smart
 * accounts, so "has code" is normal; tokeninfo tells a token apart). -> address
 */
async function vetAddress(ctx, text, client) {
  const chk = checkAddressInput(text);
  if (!chk.ok) throw err(chk.code, chk.message);
  const info = await client.tokenInfo(chk.address).catch(e => { if (e.code === 'POLICY') throw e; return null; });
  if (info) throw err('BAD_REQUEST', MSG.token);
  return chk.address;
}

const provider = {
  id: 'plasma',
  label: 'Plasma One',
  readOnly: true,
  allow: ALLOW,
  note: CARD_NOTE,

  async status(ctx, source) {
    const configured = await readAddress(ctx, source).then(() => true, () => false);
    return {
      configured, connected: configured, needsAuth: false, reauthDue: null,
      message: configured ? 'Reads the public Plasma chain. Nothing to sign in to.' : 'Add your Plasma wallet address again.',
      mask: maskOf(source),
    };
  },

  /** For the catalogue: whether the optional explorer key is saved (never the key). */
  async info(ctx) { return { apiKeyConfigured: !!(await readKey(ctx).catch(() => null)), note: CARD_NOTE }; },

  preview,

  /**
   * Add a wallet from a pasted address. input: {address, label?}. With the core
   * (ctx.svc) the source is created in sources.json (which also refuses the same
   * wallet twice by addrHash) and the address saved to secrets; without it (unit
   * tests) the source object is only returned. -> {source}
   */
  async connect(ctx, input = {}) {
    const client = await clientFor(ctx);
    const address = await vetAddress(ctx, input.address, client);
    const hash = addrHash(address);
    const mask = shortAddress(address);
    const svc = ctx.svc;
    const existing = svc && typeof svc.allSources === 'function' ? await svc.allSources() : (ctx.sources || []);
    if (existing.some(s => s && s.kind === 'direct' && s.provider === 'plasma' && s.addrHash === hash)) throw err('BUSY', 'That wallet is already connected.');
    const accounts = [{ id: accountIdFor(address), name: 'Plasma One', colour: 'teal', enabled: true, own: true, kind: 'wallet', mask }];
    const label = cleanMemo(input.label || '', 60) || 'Plasma One';
    if (svc && typeof svc.createSource === 'function') {
      const source = await svc.createSource({ provider: 'plasma', label, colour: 'teal', addrHash: hash, extra: { mask }, accounts });
      try { await secrets(ctx).write(secretName(source.id), { address }); }
      catch (e) { await svc.removeSource(source.id).catch(() => {}); throw e; }
      return { source };
    }
    const id = newSourceId();
    await secrets(ctx).write(secretName(id), { address });
    return {
      source: {
        id, capability: 'bank', kind: 'direct', provider: 'plasma', label, colour: 'teal', enabled: true, addrHash: hash, extra: { mask },
        accounts, lastSync: null, lastError: null, createdAt: new Date(ctx.now ? +ctx.now() : Date.now()).toISOString(),
      },
    };
  },

  async callback() { throw err('NOT_FOUND', 'Plasma One has no sign-in step.'); },
  async refresh() { /* nothing to refresh: no tokens, no sessions, no expiry */ },

  async listAccounts(ctx, source) {
    const address = await readAddress(ctx, source);
    const cur = ctx.svc && typeof ctx.svc.readCursor === 'function' ? await ctx.svc.readCursor(source.id).catch(() => ({})) : (source.cursor || {});
    const used = new Set(Object.values((cur && cur.accounts) || {}).filter(v => v && v.used).map(v => v.token));
    return TOKENS.filter(t => t.main || used.has(t.key)).map(t => ({
      id: accountIdFor(address, t.key), name: t.main ? 'Plasma One' : `Plasma One ${t.label}`, kind: 'wallet', mask: shortAddress(address), currency: t.currency,
    }));
  },

  /**
   * opts: {cursor, full, accountOn, today?, timeZone?, home?}. The first run (no
   * cursor) reads the whole history; later runs start at the last block read (old
   * blocks never change; the pipeline drops rows it already has).
   */
  async fetch(ctx, source, opts = {}) {
    const address = await readAddress(ctx, source);
    const t0 = Date.now();
    const out = await readWallet(ctx, address, { home: ctx.home, timeZone: ctx.timeZone, ...opts });
    ctx.log && ctx.log('note', `fin-connect plasma fetch ${Date.now() - t0}ms rows=${out.rows.length} calls=${out.calls}`);
    return out;
  },

  normalise(raw) { return normaliseTransfer(raw); },

  async disconnect(ctx, source) {
    if (!source || !SOURCE_ID_RE.test(String(source.id || ''))) return;
    await secrets(ctx).remove(secretName(source.id));
  },

  /**
   * Name (or with '' unname) a counterparty, by full or short ('0x12…ab34') address.
   * Pure: returns the new names map (kept in the source's cursor). New rows use it.
   */
  nameAddress(names, address, name) {
    const out = { ...(names || {}) };
    let key;
    const a = String(address || '').trim();
    if (/^0x[0-9a-f]{2}…[0-9a-f]{4}$/i.test(a)) key = a.toLowerCase();
    else {
      const chk = checkAddressInput(a);
      if (!chk.ok) throw err(chk.code, chk.message);
      key = chk.address;
    }
    const n = cleanMemo(name, 60);
    if (n) out[key] = n; else delete out[key];
    if (Object.keys(out).length > 500) throw err('BAD_REQUEST', 'That is a lot of names: remove some first.');
    return out;
  },

  setApiKey,

  /**
   * Its own routes (server/routes/fin-connect.mjs: provider.routes(app, svc)). Errors
   * are FinError; the router answers {error, code} with the status.
   *   POST /api/fin-connect/plasma/preview {address}   -> {ok, address:'0x12…ab34', smartAccount, tokens, balance, transfers30d, more30d, note}
   *   POST /api/fin-connect/plasma {address, label?}   -> {ok, source:{id, label, mask}, sync}  (then the first update, full history)
   *   PUT  /api/fin-connect/plasma/key {key}           -> {ok, configured}  ('' removes it; never echoed)
   *   PUT  /api/fin-connect/plasma/names {sourceId, address, name} -> {ok, names: n}  (address: full or '0x12…ab34')
   */
  routes(app, svc) {
    const base = '/api/fin-connect/plasma';
    const ctxOf = async () => { if (svc && typeof svc.ready === 'function') await svc.ready(); return svc.ctxFor('plasma'); };
    app.route({
      path: `${base}/preview`, method: 'POST', methodError: 'POST only',
      handler: async (c) => { const b = await c.body(); return { ok: true, ...(await preview(await ctxOf(), { address: b && b.address })) }; },
    });
    app.route({
      path: base, method: 'POST', methodError: 'POST only',
      handler: async (c) => {
        const b = await c.body();
        const { source } = await provider.connect(await ctxOf(), { address: b && b.address, label: b && b.label });
        const sync = await svc.requestSync(source.id, { waitMs: 0, full: true }).catch(() => null);
        if (sync && !sync.started && !sync.error) svc.requestSync(source.id, { waitMs: 120000, full: true }).catch(() => {});
        return { ok: true, source: { id: source.id, label: source.label, mask: maskOf(source), provider: 'plasma' }, sync: sync ? { started: !!sync.started } : null };
      },
    });
    app.route({
      path: `${base}/key`, method: 'PUT', methodError: 'PUT only',
      handler: async (c) => { const b = await c.body(); return { ok: true, ...(await setApiKey(await ctxOf(), b && b.key)) }; },
    });
    app.route({
      path: `${base}/names`, method: 'PUT', methodError: 'PUT only',
      handler: async (c) => {
        const b = await c.body();
        const s = await svc.getSource(String((b && b.sourceId) || ''));
        if (!s || s.kind !== 'direct' || s.provider !== 'plasma') throw err('NOT_FOUND', 'That wallet is not connected.');
        const cur = await svc.readCursor(s.id);
        cur.names = provider.nameAddress(cur.names, b.address, b.name);
        await svc.writeCursor(s.id, cur);
        return { ok: true, names: Object.keys(cur.names).length };
      },
    });
  },
};

export default provider;

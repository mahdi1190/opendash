// tests/fixtures/fin-fake-enablebanking.mjs - a fake Enable Banking API for
// tests and DASHBOARD_ENABLEBANKING_FAKE=1 (docs/dev/FINANCE_CONNECTIONS.md 3.7).
// It answers the real https://api.enablebanking.com URLs in process: no
// sockets, no network. Every call's JWT is VERIFIED (RS256, kid = a registered
// application, iss/aud, not expired, TTL <= 24 h) against the public key of a
// test key generated at run time (makeTestKey(); never committed). Banks,
// accounts and transactions are synthetic (seeded PRNG, neutral names).
//
//   createFake({env, now, log, seed, delayMs, fail, autoRegister}) -> {
//     fetchFn(url, init) -> Response,
//     settings() -> {delayMs, fail}, configure({delayMs?, fail?, bankBase?}),
//     registerApp(appId, publicKey, {active?, environment?, redirectUrls?}),
//     authorisation(id) -> {code, state, redirect_url, aspsp} (the fake bank page),
//     expireSession(sessionId), calls: [{method, path}], sessions, autoRegister }
//
// Banks: GB "Fake High Street Bank" (180 days), "Fake Building Society" (90
// days; refuses a transaction period over 90 days: the fallback path),
// "Fake Digital Bank" (beta, business + personal); FI "Fake Nordic Bank"
// (EUR); DE "Fake Sparkasse" (EUR). Each session has a current account (~13
// months of transactions, paged 50 at a time with continuation_key, two pending
// rows) and a savings account (a few transfers).
// fail: '' | 'auth' (401 JWT) | 'consent' (EXPIRED_SESSION) | 'rate'
//       (ASPSP_RATE_LIMIT_EXCEEDED) | 'network' (fetch throws) | 'bad' (not JSON)
//       | '<mode>:0.3' (that share of calls, at random)

import { createVerify, generateKeyPairSync, randomUUID, randomBytes } from 'node:crypto';

export const FAKE_HOST = 'api.enablebanking.com';
export const BOUNCE_URL = 'https://mahdi1190.github.io/opendash/eb-callback.html';
export const PASTE_URL = 'https://localhost/opendash-eb-callback';
const DAY = 86400000;

/** A throwaway RSA key pair for one test run (never written to the repo). */
export function makeTestKey(bits = 2048) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: bits });
  return { pem: privateKey.export({ type: 'pkcs8', format: 'pem' }), publicKey, pkcs1: privateKey.export({ type: 'pkcs1', format: 'pem' }) };
}

export const FAKE_BANKS = Object.freeze([
  { name: 'Fake High Street Bank', country: 'GB', maximum_consent_validity: 180 * 86400, psu_types: ['personal'], beta: false, currency: 'GBP' },
  { name: 'Fake Building Society', country: 'GB', maximum_consent_validity: 90 * 86400, psu_types: ['personal'], beta: false, currency: 'GBP', maxHistoryDays: 90 },
  { name: 'Fake Digital Bank', country: 'GB', maximum_consent_validity: 180 * 86400, psu_types: ['personal', 'business'], beta: true, currency: 'GBP' },
  { name: 'Fake Nordic Bank', country: 'FI', maximum_consent_validity: 180 * 86400, psu_types: ['personal', 'business'], beta: false, currency: 'EUR' },
  { name: 'Fake Sparkasse', country: 'DE', maximum_consent_validity: 90 * 86400, psu_types: ['personal'], beta: false, currency: 'EUR' },
]);
const MERCHANTS = ['Corner Grocer', 'City Transit', 'Bean Coffee Co', 'Book Nook', 'Pharmacy Plus', 'Streaming Service', 'Hardware Depot', 'Lunch Bar', 'Fuel Station', 'Phone Network'];

function prng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const b64urlJson = (s) => JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const money = (minor) => (minor / 100).toFixed(2);

function parseFail(spec) {
  const m = /^(auth|consent|rate|network|bad)(?::(0?\.\d+|1))?$/.exec(String(spec || '').trim());
  return m ? { mode: m[1], share: m[2] ? Number(m[2]) : 1 } : null;
}

/** Synthetic history for one account (newest last), deterministic per seed. */
function history(seed, nowMs, kind, currency) {
  const rnd = prng(seed);
  const out = [];
  let n = 0;
  const ref = () => `ref-${seed}-${++n}`;
  if (kind === 'savings') {
    for (let m = 12; m >= 0; m--) {
      const d = day(nowMs - m * 30 * DAY - 2 * DAY);
      out.push({ entry_reference: ref(), transaction_amount: { currency, amount: money(5000 + Math.floor(rnd() * 5000)) }, credit_debit_indicator: 'CRDT', status: 'BOOK', booking_date: d, value_date: d, debtor: { name: 'Own current account' }, remittance_information: ['Monthly saving'] });
    }
    return out;
  }
  for (let i = 400; i >= 1; i--) {
    const d = day(nowMs - i * DAY);
    if (i % 30 === 3) out.push({ entry_reference: ref(), transaction_amount: { currency, amount: money(210000 + Math.floor(rnd() * 5000)) }, credit_debit_indicator: 'CRDT', status: 'BOOK', booking_date: d, value_date: d, debtor: { name: 'Example Employer Ltd' }, remittance_information: ['SALARY'] });
    if (rnd() < 0.55) {
      const who = MERCHANTS[Math.floor(rnd() * MERCHANTS.length)];
      out.push({ entry_reference: ref(), transaction_amount: { currency, amount: money(150 + Math.floor(rnd() * 6000)) }, credit_debit_indicator: 'DBIT', status: 'BOOK', booking_date: d, value_date: d, creditor: { name: who }, remittance_information: [`CARD PAYMENT ${who.toUpperCase()}`] });
    }
    if (i % 30 === 10) out.push({ entry_reference: ref(), transaction_amount: { currency, amount: money(85000) }, credit_debit_indicator: 'DBIT', status: 'BOOK', booking_date: d, value_date: d, creditor: { name: 'Example Lettings' }, remittance_information: ['RENT'] });
  }
  // A formula-looking memo (must be neutralised) and two pending rows today.
  out.push({ entry_reference: ref(), transaction_amount: { currency, amount: '1.00' }, credit_debit_indicator: 'DBIT', status: 'BOOK', booking_date: day(nowMs - DAY), remittance_information: ['=HYPERLINK("x")'] });
  out.push({ transaction_amount: { currency, amount: '4.50' }, credit_debit_indicator: 'DBIT', status: 'PDNG', booking_date: day(nowMs), creditor: { name: 'Bean Coffee Co' } });
  out.push({ transaction_amount: { currency, amount: '12.00' }, credit_debit_indicator: 'DBIT', status: 'PDNG', booking_date: day(nowMs), creditor: { name: 'Lunch Bar' } });
  return out;
}

export function createFake(opts = {}) {
  const env = opts.env || {};
  const now = typeof opts.now === 'function' ? opts.now : () => Date.now();
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  const st = {
    delayMs: Number.isFinite(Number(opts.delayMs)) ? Number(opts.delayMs)
      : Number.isFinite(Number(env.DASHBOARD_ENABLEBANKING_FAKE_DELAY_MS)) && env.DASHBOARD_ENABLEBANKING_FAKE_DELAY_MS !== '' ? Number(env.DASHBOARD_ENABLEBANKING_FAKE_DELAY_MS) : (opts.env ? 300 : 0),
    fail: opts.fail != null ? String(opts.fail) : String(env.DASHBOARD_ENABLEBANKING_FAKE_FAIL || ''),
    bankBase: opts.bankBase || 'http://localhost:0/api/fin-connect/eb/fake-bank',
  };
  const seed = Number(opts.seed) || 7;
  const rnd = prng(seed * 31);
  const apps = new Map();          // appId -> {publicKey, active, environment, redirectUrls}
  const auths = new Map();         // auth id -> {...}
  const codes = new Map();         // code -> auth id
  const sessions = new Map();      // session id -> {aspsp, accounts:[uid], validUntil, status}
  const accounts = new Map();      // uid -> {sessionId, kind, currency, seed}
  const calls = [];

  function registerApp(appId, publicKey, o = {}) {
    apps.set(String(appId).toLowerCase(), { publicKey, active: o.active !== false, environment: o.environment || 'PRODUCTION', redirectUrls: o.redirectUrls || [BOUNCE_URL, PASTE_URL] });
  }

  const res = (status, body, raw = false) => new Response(raw ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const err = (status, error, message = 'fake error') => res(status, { code: status, error, message });

  function verifyJwt(auth) {
    const m = /^Bearer ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(String(auth || ''));
    if (!m) return 'no token';
    let header, claims;
    try { header = b64urlJson(m[1]); claims = b64urlJson(m[2]); } catch { return 'unreadable'; }
    if (header.alg !== 'RS256' || header.typ !== 'JWT') return 'alg';
    const app = apps.get(String(header.kid || '').toLowerCase());
    if (!app) return 'unknown app';
    const ok = createVerify('RSA-SHA256').update(`${m[1]}.${m[2]}`).end().verify(app.publicKey, Buffer.from(m[3].replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    if (!ok) return 'signature';
    const t = Math.floor(now() / 1000);
    if (claims.iss !== 'enablebanking.com' || claims.aud !== FAKE_HOST) return 'claims';
    if (!(claims.iat <= t + 60) || !(claims.exp > t) || claims.exp - claims.iat > 86400) return 'expired';
    return { app, kid: String(header.kid).toLowerCase() };
  }

  async function fetchFn(url, init = {}) {
    const u = new URL(String(url));
    const method = String(init.method || 'GET').toUpperCase();
    calls.push({ method, path: u.pathname });
    if (u.protocol !== 'https:' || u.hostname !== FAKE_HOST) throw new TypeError('fetch failed (the fake only answers api.enablebanking.com)');
    if (st.delayMs > 0) await new Promise(r => setTimeout(r, st.delayMs));
    const f = parseFail(st.fail);
    if (f && rnd() < f.share) {
      if (f.mode === 'network') throw new TypeError('fetch failed');
      if (f.mode === 'bad') return res(200, '<html>not json', true);
      if (f.mode === 'auth') return err(401, 'UNAUTHORIZED', 'JWT rejected');
      if (f.mode === 'rate') return err(429, 'ASPSP_RATE_LIMIT_EXCEEDED');
      if (f.mode === 'consent' && /^\/(accounts|sessions\/)/.test(u.pathname)) return err(401, 'EXPIRED_SESSION');
    }
    const headers = init.headers || {};
    const v = verifyJwt(headers.Authorization || headers.authorization);
    if (typeof v === 'string') return err(401, 'UNAUTHORIZED', `JWT ${v}`);
    let body = {};
    if (init.body) { try { body = JSON.parse(String(init.body)); } catch { return err(400, 'WRONG_REQUEST_PARAMETERS'); } }
    const p = u.pathname;
    let m;

    if (method === 'GET' && p === '/application') {
      return res(200, { name: 'OpenDash', description: 'Personal dashboard (read-only)', kid: v.kid, environment: v.app.environment, redirect_urls: v.app.redirectUrls, active: v.app.active, countries: ['GB', 'FI', 'DE'], services: ['AIS'] });
    }
    if (method === 'GET' && p === '/aspsps') {
      const cc = u.searchParams.get('country');
      const list = FAKE_BANKS.filter(b => !cc || b.country === cc).map(b => ({
        // No logo URLs: a browser showing the fake list must not fetch anything from the internet.
        name: b.name, country: b.country, psu_types: b.psu_types,
        auth_methods: [{ name: 'redirect', psu_type: 'personal', approach: 'REDIRECT' }], maximum_consent_validity: b.maximum_consent_validity, beta: b.beta, bic: 'FAKEGB00',
      }));
      return res(200, { aspsps: list });
    }
    if (method === 'POST' && p === '/auth') {
      const bank = FAKE_BANKS.find(b => body.aspsp && b.name === body.aspsp.name && b.country === body.aspsp.country);
      if (!bank) return err(404, 'ASPSP_NOT_FOUND');
      const until = Date.parse(body.access && body.access.valid_until);
      if (!Number.isFinite(until) || until > now() + bank.maximum_consent_validity * 1000 || until <= now()) return err(422, 'WRONG_REQUEST_PARAMETERS', 'valid_until');
      if (!v.app.redirectUrls.includes(body.redirect_url) && !/^http:\/\/localhost:\d+\//.test(body.redirect_url || '')) return err(422, 'REDIRECT_URI_NOT_ALLOWED');
      if (typeof body.state !== 'string' || !body.state) return err(422, 'WRONG_REQUEST_PARAMETERS', 'state');
      const id = randomUUID();
      const code = randomBytes(18).toString('base64url');
      auths.set(id, { id, code, state: body.state, redirect_url: body.redirect_url, aspsp: { name: bank.name, country: bank.country }, validUntil: body.access.valid_until, psuType: body.psu_type || 'personal', used: false, at: now() });
      codes.set(code, id);
      return res(200, { url: `${st.bankBase}?auth=${id}`, authorization_id: id, psu_id_hash: 'fake' });
    }
    if (method === 'POST' && p === '/sessions') {
      const a = auths.get(codes.get(String(body.code || '')));
      if (!a || a.used || now() - a.at > 10 * 60 * 1000) return err(400, 'EXPIRED_AUTHORIZATION_CODE');
      a.used = true;
      const bank = FAKE_BANKS.find(b => b.name === a.aspsp.name);
      const sid = randomUUID();
      const mk = (kind, i) => {
        const uid = randomUUID();
        accounts.set(uid, { sessionId: sid, kind, currency: bank.currency, seed: seed + sessions.size * 10 + i, bank });
        return {
          uid, account_id: { iban: `GB00FAKE0000000000${String(1000 + i * 1111 + sessions.size)}` }, all_account_ids: [],
          name: kind === 'savings' ? 'Easy Saver' : 'Everyday Account', currency: bank.currency, cash_account_type: kind === 'savings' ? 'SVGS' : 'CACC',
          product: kind === 'savings' ? 'Savings' : 'Current account', usage: 'PRIV',
          // New uids every session (as at Enable Banking); the hash stays the same for the same account.
          identification_hash: `fake-${bank.country}-${bank.name.replace(/\W+/g, '-')}-${kind}`,
        };
      };
      const accs = [mk('current', 1), mk('savings', 2)];
      sessions.set(sid, { aspsp: a.aspsp, accounts: accs.map(x => x.uid), validUntil: a.validUntil, status: 'AUTHORIZED', psuType: a.psuType });
      return res(200, { session_id: sid, accounts: accs, aspsp: a.aspsp, psu_type: a.psuType, access: { valid_until: a.validUntil } });
    }
    if ((m = /^\/sessions\/([A-Za-z0-9-]+)$/.exec(p))) {
      const s = sessions.get(m[1]);
      if (!s) return err(404, 'SESSION_DOES_NOT_EXIST');
      if (method === 'DELETE') { s.status = 'CLOSED'; return res(200, { message: 'OK' }); }
      if (method === 'GET') return res(200, { status: s.status, accounts: s.accounts, aspsp: s.aspsp, psu_type: s.psuType, access: { valid_until: s.validUntil } });
    }
    if (method === 'GET' && (m = /^\/accounts\/([A-Za-z0-9-]+)\/(balances|transactions|details)$/.exec(p))) {
      const acc = accounts.get(m[1]);
      if (!acc) return err(404, 'ACCOUNT_DOES_NOT_EXIST');
      const s = sessions.get(acc.sessionId);
      if (!s || s.status !== 'AUTHORIZED' || Date.parse(s.validUntil) <= now()) return err(401, 'EXPIRED_SESSION');
      const all = history(acc.seed, now(), acc.kind, acc.currency);
      if (m[2] === 'details') return res(200, { uid: m[1], currency: acc.currency, cash_account_type: acc.kind === 'savings' ? 'SVGS' : 'CACC' });
      if (m[2] === 'balances') {
        const booked = all.filter(t => t.status === 'BOOK').reduce((sum, t) => sum + Math.round(Number(t.transaction_amount.amount) * 100) * (t.credit_debit_indicator === 'DBIT' ? -1 : 1), 0) % 1000000;
        return res(200, { balances: [
          { name: 'Available', balance_amount: { currency: acc.currency, amount: money(booked - 1650) }, balance_type: 'ITAV', reference_date: day(now()) },
          { name: 'Booked', balance_amount: { currency: acc.currency, amount: money(booked) }, balance_type: 'CLBD', reference_date: day(now()) },
        ] });
      }
      const key = u.searchParams.get('continuation_key');
      let from = u.searchParams.get('date_from'), to = u.searchParams.get('date_to');
      let offset = 0;
      if (key) {
        let k;
        try { k = JSON.parse(Buffer.from(key, 'base64url').toString('utf8')); } catch { return err(422, 'WRONG_CONTINUATION_KEY'); }
        ({ from, to, offset } = k);
      } else if (acc.bank.maxHistoryDays && from && Date.parse(from) < now() - acc.bank.maxHistoryDays * DAY) {
        return err(422, 'WRONG_TRANSACTIONS_PERIOD');
      }
      const rows = all.filter(t => (!from || t.booking_date >= from) && (!to || t.booking_date <= to)).reverse();   // banks answer newest first
      const page = rows.slice(offset, offset + 50);
      const next = offset + 50 < rows.length ? Buffer.from(JSON.stringify({ from, to, offset: offset + 50 })).toString('base64url') : null;
      return res(200, { transactions: page, continuation_key: next });
    }
    log('warn', 'fake enable banking: unknown request');
    return err(404, 'NOT_FOUND');
  }

  const fake = {
    fetchFn, calls, sessions, autoRegister: opts.autoRegister !== false && !!opts.env,
    registerApp,
    settings: () => ({ delayMs: st.delayMs, fail: st.fail }),
    configure(patch = {}) {
      if (patch == null) { st.fail = ''; return fake.settings(); }
      if (Number.isFinite(Number(patch.delayMs))) st.delayMs = Math.max(0, Math.min(10000, Number(patch.delayMs)));
      if (patch.fail != null) st.fail = parseFail(patch.fail) ? String(patch.fail) : '';
      if (typeof patch.bankBase === 'string' && /^http:\/\/localhost:\d+\/api\/fin-connect\/eb\/fake-bank$/.test(patch.bankBase)) st.bankBase = patch.bankBase;
      return fake.settings();
    },
    authorisation(id) { const a = auths.get(String(id || '')); return a && !a.used ? { code: a.code, state: a.state, redirect_url: a.redirect_url, aspsp: a.aspsp } : null; },
    expireSession(sid) { const s = sessions.get(sid); if (s) s.status = 'EXPIRED'; },
  };
  return fake;
}

export default createFake;

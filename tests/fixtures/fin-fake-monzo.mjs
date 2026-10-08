// A FAKE Monzo (tests and screenshots only; DASHBOARD_MONZO_FAKE=1). It answers
// the same URLs as the real API (https://api.monzo.com/...) through an
// in-process fetch, so the provider's read-only allowlist is exercised exactly
// as in real use. Never a real account: every name, number and amount here is
// generated from a seeded PRNG and a neutral merchant list.
//
//   createFake({env, now, log}) -> {
//     fetchFn(url, init)           the stand-in for fetch()
//     authorize(params)            the fake sign-in page: -> redirect URL with code + state
//     settings() / configure(p)    {delayMs, fail, approveMs, windowMs, pollMs}
//     calls                        [{method, path, since}] every request seen
//     approveNow()                 approve every issued token at once
//     data                         {accounts, pots, transactions} (generated)
//   }
//
// Behaviour (Monzo docs, read 8 Oct 2026):
//   - a new access token has no permissions until approved in the app
//     (403 on /accounts etc.); approval arrives approveMs after the token is
//     issued ('never' = never);
//   - for windowMs after approval every transaction can be read; after that
//     only the last 90 days (403 for an older `since`);
//   - refresh tokens are one-time: using one twice is invalid_grant;
//   - one active access token per user (a new one kills the old one).
// env: DASHBOARD_MONZO_FAKE_APPROVE_MS (default 4000 | 'never'),
//      DASHBOARD_MONZO_FAKE_WINDOW_MS (default 300000),
//      DASHBOARD_MONZO_FAKE_POLL_MS (how often the provider asks; default 1000),
//      DASHBOARD_MONZO_FAKE_APPROVAL_WAIT_MS (how long the provider waits for the approval; default 30000),
//      DASHBOARD_MONZO_FAKE_DELAY_MS (latency per call, default 300),
//      DASHBOARD_MONZO_FAKE_FAIL ('auth' | 'consent' | 'rate' | 'rate:0.3' | 'network' | 'bad')

const DAY = 86400000;

function prng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Neutral, made-up merchants with Monzo's own category names.
const MERCHANTS = [
  ['Corner Grocer', 'groceries', 900, 5200], ['Fresh Market', 'groceries', 1500, 7400], ['Daily Bakery', 'eating_out', 250, 900],
  ['Bean There Cafe', 'eating_out', 280, 650], ['Noodle Bar', 'eating_out', 900, 2600], ['City Transit', 'transport', 160, 820],
  ['Rail Tickets Co', 'transport', 1200, 6400], ['Fuel Stop', 'transport', 3000, 7000], ['Book Nook', 'shopping', 699, 2499],
  ['Home Goods', 'shopping', 1200, 8900], ['Stream Box', 'entertainment', 899, 899], ['Cinema House', 'entertainment', 1100, 2600],
  ['Power & Light', 'bills', 6500, 9800], ['Phone Network', 'bills', 1500, 1500], ['Pharmacy Plus', 'personal_care', 350, 2400],
  ['Gym Club', 'personal_care', 2999, 2999], ['Garden Centre', 'shopping', 800, 4500], ['Travel Lodge Co', 'holidays', 6000, 22000],
];

function generate(nowMs, seed = 20261008) {
  const rnd = prng(seed);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const created = new Date(nowMs - 3 * 365 * DAY).toISOString();
  const accounts = [
    { id: 'acc_fake0000000000000000a1', closed: false, created, description: 'user_fake0001', type: 'uk_retail', currency: 'GBP', country_code: 'GB', owners: [{ user_id: 'user_fake0001', preferred_name: 'Test User' }], account_number: 'FAKE0011', sort_code: 'FAKE00' },
    { id: 'acc_fake0000000000000000b2', closed: false, created: new Date(nowMs - 2 * 365 * DAY).toISOString(), description: 'joint_fake0001', type: 'uk_retail_joint', currency: 'GBP', country_code: 'GB', owners: [], account_number: 'FAKE0022', sort_code: 'FAKE00' },
  ];
  const pots = [
    { id: 'pot_fake00000000000000001', name: 'Rainy day', balance: 120000, currency: 'GBP', deleted: false, current_account_id: accounts[0].id },
    { id: 'pot_fake00000000000000002', name: 'Holiday', balance: 45050, currency: 'GBP', deleted: false, current_account_id: accounts[0].id },
    { id: 'pot_fake00000000000000003', name: 'Bills', balance: 30000, currency: 'GBP', deleted: false, current_account_id: accounts[0].id },
    { id: 'pot_fake00000000000000009', name: 'Old pot', balance: 0, currency: 'GBP', deleted: true, current_account_id: accounts[0].id },
  ];
  const tx = { [accounts[0].id]: [], [accounts[1].id]: [] };
  let n = 0;
  const add = (acc, t, fields) => {
    n++;
    const id = 'tx_fake' + String(n).padStart(18, '0');
    const created = new Date(t).toISOString();
    tx[acc.id].push({ id, created, settled: created, account_id: acc.id, currency: 'GBP', notes: '', metadata: {}, category: 'general', decline_reason: undefined, ...fields });
  };
  // Main account: ~650 over 3 years; joint: ~180 over 2 years.
  for (let t = Date.parse(accounts[0].created) + DAY; t < nowMs - 3600000; t += DAY) {
    const d = new Date(t);
    if (d.getUTCDate() === 25) add(accounts[0], t + 9 * 3600000, { amount: 210000 + Math.floor(rnd() * 5000), description: 'SALARY', category: 'income', counterparty: { name: 'Example Employer Ltd' }, merchant: null });
    if (d.getUTCDate() === 26) add(accounts[0], t + 10 * 3600000, { amount: -20000, description: 'pot_fake00000000000000001', category: 'savings', metadata: { pot_id: 'pot_fake00000000000000001' }, merchant: null });
    if (rnd() < 0.53) {
      const [name, cat, lo, hi] = pick(MERCHANTS);
      const amount = -(lo + Math.floor(rnd() * (hi - lo + 1)));
      add(accounts[0], t + Math.floor((8 + rnd() * 12) * 3600000), { amount, description: name.toUpperCase(), category: cat, merchant: { id: 'merch_fake' + name.length, name, category: cat } });
    }
  }
  for (let t = Date.parse(accounts[1].created) + DAY; t < nowMs - 3600000; t += DAY) {
    if (rnd() < 0.24) {
      const [name, cat, lo, hi] = pick(MERCHANTS.slice(0, 9));
      add(accounts[1], t + Math.floor((9 + rnd() * 10) * 3600000), { amount: -(lo + Math.floor(rnd() * (hi - lo + 1))), description: name.toUpperCase(), category: cat, merchant: { id: 'merch_fake' + name.length, name, category: cat } });
    }
  }
  // A declined payment, a pending one and an active-card check (0.00): none of them may be imported.
  add(accounts[0], nowMs - 2 * DAY, { amount: -4500, description: 'DECLINED SHOP', category: 'shopping', decline_reason: 'INSUFFICIENT_FUNDS', merchant: { id: 'merch_x', name: 'Declined Shop', category: 'shopping' } });
  add(accounts[0], nowMs - 3600000 * 3, { amount: -1299, description: 'PENDING SHOP', category: 'shopping', settled: '', merchant: { id: 'merch_y', name: 'Pending Shop', category: 'shopping' } });
  add(accounts[0], nowMs - 5 * DAY, { amount: 0, description: 'CARD CHECK', category: 'general', merchant: null });
  for (const k of Object.keys(tx)) tx[k].sort((a, b) => a.created.localeCompare(b.created));
  return { accounts, pots, transactions: tx };
}

export function createFake({ env = process.env, now = () => Date.now(), log = () => {} } = {}) {
  const num = (v, d) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  const cfg = {
    delayMs: num(env.DASHBOARD_MONZO_FAKE_DELAY_MS, 300),
    fail: String(env.DASHBOARD_MONZO_FAKE_FAIL || ''),
    approveMs: env.DASHBOARD_MONZO_FAKE_APPROVE_MS === 'never' ? 'never' : num(env.DASHBOARD_MONZO_FAKE_APPROVE_MS, 4000),
    windowMs: num(env.DASHBOARD_MONZO_FAKE_WINDOW_MS, 300000),
    pollMs: num(env.DASHBOARD_MONZO_FAKE_POLL_MS, 1000),
    approvalWaitMs: num(env.DASHBOARD_MONZO_FAKE_APPROVAL_WAIT_MS, 30000),
  };
  const data = generate(now());
  const codes = new Map(), tokens = new Map(), refresh = new Map();
  const calls = [];
  let seq = 0;
  const USER = 'user_fake0001';

  const res = (status, body, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  const err = (status, code, message) => res(status, { code, message });
  const failOn = () => {
    const f = cfg.fail;
    if (!f) return null;
    const m = /^([a-z]+)(?::([0-9.]+))?$/.exec(f);
    if (!m) return null;
    if (m[2] && Math.random() >= Number(m[2])) return null;
    return m[1];
  };

  function issue(clientId, confidential = true) {
    // One active access token per user: a new one kills the others.
    for (const [k, v] of tokens) if (v.userId === USER) tokens.delete(k);
    const access = 'fake-access-' + (++seq) + '-' + Math.random().toString(36).slice(2, 10);
    const t = { userId: USER, clientId, issuedAt: now(), approvedAt: null };
    if (cfg.approveMs !== 'never') t.approvedAt = now() + cfg.approveMs;
    tokens.set(access, t);
    const out = { access_token: access, client_id: clientId, expires_in: 21600, token_type: 'Bearer', user_id: USER };
    if (confidential) { const r = 'fake-refresh-' + seq + '-' + Math.random().toString(36).slice(2, 10); refresh.set(r, { clientId, approvedAt: t.approvedAt }); out.refresh_token = r; }
    return out;
  }

  function authorize(params) {
    const clientId = String(params.get('client_id') || ''), redirect = String(params.get('redirect_uri') || ''), state = String(params.get('state') || '');
    if (!/^oauth2client_/.test(clientId)) return null;
    const code = 'fake-code-' + (++seq);
    codes.set(code, { clientId, redirect, at: now() });
    const u = new URL(redirect);
    u.searchParams.set('code', code);
    u.searchParams.set('state', state);
    return u.href;
  }

  async function fetchFn(url, init = {}) {
    if (cfg.delayMs > 0) await new Promise(r => setTimeout(r, cfg.delayMs));
    const u = new URL(url);
    const method = String(init.method || 'GET').toUpperCase();
    calls.push({ method, path: u.pathname, since: u.searchParams.get('since') || null, account: u.searchParams.get('account_id') || null });
    if (u.hostname !== 'api.monzo.com') throw new TypeError('fetch failed');
    const f = failOn();
    if (f === 'network') throw new TypeError('fetch failed');
    if (f === 'bad') return new Response('<html>not json</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    if (f === 'rate') return err(429, 'too_many_requests', 'Slow down', { 'Retry-After': '0' });

    if (u.pathname === '/oauth2/token' && method === 'POST') {
      const b = new URLSearchParams(String(init.body || ''));
      if (b.get('client_secret') === 'wrong-secret') return err(401, 'unauthorized.bad_client', 'bad client');
      if (b.get('grant_type') === 'authorization_code') {
        const c = codes.get(b.get('code')); codes.delete(b.get('code'));
        if (!c || c.clientId !== b.get('client_id') || c.redirect !== b.get('redirect_uri')) return err(400, 'invalid_grant', 'bad code');
        return res(200, issue(c.clientId, !/^oauth2client_pub/.test(c.clientId)));
      }
      if (b.get('grant_type') === 'refresh_token') {
        if (f === 'auth') return err(401, 'invalid_grant', 'expired');
        const r = refresh.get(b.get('refresh_token')); refresh.delete(b.get('refresh_token'));
        if (!r) return err(401, 'invalid_grant', 'refresh token already used');
        const out = issue(r.clientId, true);
        tokens.get(out.access_token).approvedAt = r.approvedAt;   // a refreshed token keeps the app approval
        return res(200, out);
      }
      return err(400, 'bad_request', 'grant');
    }
    const auth = String((init.headers || {}).Authorization || (init.headers || {}).authorization || '');
    const tok = tokens.get(auth.replace(/^Bearer /, ''));
    if (f === 'auth' || !tok) return err(401, 'unauthorized.bad_access_token', 'bad token');
    if (u.pathname === '/oauth2/logout' && method === 'POST') { tokens.delete(auth.replace(/^Bearer /, '')); return res(200, {}); }
    if (u.pathname === '/ping/whoami') return res(200, { authenticated: true, client_id: tok.clientId, user_id: tok.userId });
    const approved = tok.approvedAt != null && now() >= tok.approvedAt;
    if (f === 'consent' || !approved) return err(403, 'forbidden.insufficient_permissions', 'Access forbidden due to insufficient permissions');
    if (method !== 'GET') return err(405, 'method_not_allowed', 'no');
    if (u.pathname === '/accounts') {
      const type = u.searchParams.get('account_type');
      return res(200, { accounts: data.accounts.filter(a => !type || a.type === type) });
    }
    const acc = data.accounts.find(a => a.id === (u.searchParams.get('account_id') || u.searchParams.get('current_account_id')));
    if (u.pathname === '/balance') {
      if (!acc) return err(400, 'bad_request.missing_account', 'account');
      const bal = acc.type === 'uk_retail' ? 152034 : 23410;
      return res(200, { balance: bal, total_balance: bal + 195050, currency: 'GBP', spend_today: -1250 });
    }
    if (u.pathname === '/pots') return res(200, { pots: acc ? data.pots.filter(p => p.current_account_id === acc.id) : [] });
    if (u.pathname === '/transactions') {
      if (!acc) return err(400, 'bad_request.missing_account', 'account');
      const limit = Math.min(100, Math.max(1, Number(u.searchParams.get('limit')) || 100));
      const since = u.searchParams.get('since');
      const before = u.searchParams.get('before');
      const list = data.transactions[acc.id];
      let start = 0;
      if (since && since.startsWith('tx_')) { const i = list.findIndex(t => t.id === since); start = i < 0 ? list.length : i + 1; }
      else if (since) start = list.findIndex(t => t.created >= since), start = start < 0 ? list.length : start;
      // The 5-minute rule: after the window only the last 90 days can be read.
      const sinceAt = since ? (since.startsWith('tx_') ? Date.parse((list.find(t => t.id === since) || {}).created || 0) : Date.parse(since)) : 0;
      const windowOpen = now() <= tok.approvedAt + cfg.windowMs;
      if (!windowOpen && (!since || sinceAt < now() - 90 * DAY)) return err(403, 'forbidden.verification_required', 'Verification required');
      let page = list.slice(start).filter(t => !before || t.created < before).slice(0, limit);
      const expand = u.searchParams.getAll('expand[]').includes('merchant');
      page = page.map(t => ({ ...t, merchant: t.merchant ? (expand ? t.merchant : t.merchant.id) : null }));
      return res(200, { transactions: page });
    }
    return err(404, 'not_found', 'not found');
  }

  return {
    fetchFn, authorize, calls, data,
    // The settings, plus how many calls were made and the last few (path + since), for tests.
    settings: () => ({ ...cfg, calls: calls.length, recent: calls.slice(-40) }),
    configure(p = {}) {
      if ('delayMs' in p) cfg.delayMs = Math.max(0, Math.min(10000, Number(p.delayMs) || 0));
      if ('fail' in p) cfg.fail = /^(|auth|consent|rate|network|bad)(:[0-9.]+)?$/.test(String(p.fail || '')) ? String(p.fail || '') : '';
      if ('approveMs' in p) cfg.approveMs = p.approveMs === 'never' ? 'never' : Math.max(0, Number(p.approveMs) || 0);
      if ('windowMs' in p) cfg.windowMs = Math.max(0, Number(p.windowMs) || 0);
      if ('pollMs' in p) cfg.pollMs = Math.max(10, Number(p.pollMs) || 1000);
      if ('approvalWaitMs' in p) cfg.approvalWaitMs = Math.max(10, Number(p.approvalWaitMs) || 30000);
      log('note', 'fin-connect: monzo fake settings changed');
      return { ...cfg };
    },
    approveNow() { for (const t of tokens.values()) t.approvedAt = now(); for (const r of refresh.values()) r.approvedAt = now(); },
    expireTokens() { for (const t of tokens.values()) t.issuedAt -= 7 * 3600000; },
  };
}

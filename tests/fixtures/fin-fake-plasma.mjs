// tests/fixtures/fin-fake-plasma.mjs - a fake Plasma network for tests and
// DASHBOARD_PLASMA_FAKE=1 (docs/dev/FINANCE_CONNECTIONS.md 3.7). It answers the
// same https URLs as Routescan (chain 9745) and rpc.plasma.to, in process: no
// sockets, no network. Everything is generated from a seeded PRNG; addresses
// are obviously fake and amounts are synthetic.
//
//   createFake({env, now}) -> {fetchFn, settings(), configure(patch)}   (what the core loads)
//   createFakePlasma({delayMs, fail, seed, now}) -> {
//     fetch(url, init) -> Response-like,
//     config(patch|null) -> {delayMs, fail},
//     calls: [{host, kind}]   (what was asked: 'tokentx', 'tokenbalance', 'tokeninfo', 'rpc:<method>'),
//     ADDR, history(address, tokenKey) -> the generated transfers }
//
// Fixed addresses (FAKE_ADDR):
//   active   0x…00a1  ~10 months of USDT0 top-ups, card spends, transfers in and out,
//                     a few USDe transfers, and address-poisoning dust
//   empty    0x…00a2  nothing at all
//   busy     0x…00a3  2,500 small USDT0 transfers (paging)
//   token    the USDT0 contract itself (tokeninfo answers; must be refused)
// fail: '' | 'network' | 'rate' | 'rate:0.3' (random share) | 'bad' | 'auth' |
//       'routescan' (Routescan down, RPC up: the balance fallback) | 'rpc'

const USDT0 = '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb';
const USDE = '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34';
const pad = (hex) => '0x' + hex.padStart(40, '0');
export const FAKE_ADDR = Object.freeze({
  active: pad('a1'), empty: pad('a2'), busy: pad('a3'),
  card: pad('ca'), exchange: pad('e1'), friend: pad('b1'), landlord: pad('b2'), poison: pad('a1a1'),
  token: USDT0,
});

function prng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const BLOCK0 = 1_000_000;
const usd6 = (dollars) => String(Math.round(dollars * 100)) + '0000';                 // 6 decimals
const usd18 = (dollars) => String(Math.round(dollars * 100)) + '0000000000000000';    // 18 decimals

function generate(seed, nowSec) {
  const rnd = prng(seed);
  const start = nowSec - 300 * 86400;
  const t0Block = BLOCK0;
  const blockAt = (ts) => t0Block + (ts - start);
  const active = FAKE_ADDR.active;
  const txs = { usdt0: [], usde: [] };
  let bal = 0, n = 0;
  const hash = () => '0x' + (++n).toString(16).padStart(8, '0') + 'f'.repeat(56);
  const push = (key, ts, from, to, value) => txs[key].push({
    blockNumber: String(blockAt(ts)), timeStamp: String(ts), hash: hash(), nonce: '0', blockHash: '0x' + 'b'.repeat(64),
    from, contractAddress: key === 'usdt0' ? USDT0 : USDE, to, value,
    tokenName: key === 'usdt0' ? 'USDT0' : 'USDe', tokenSymbol: key === 'usdt0' ? 'USDT0' : 'USDe', tokenDecimal: key === 'usdt0' ? '6' : '18',
    transactionIndex: '1', gas: '0', gasPrice: '0', gasUsed: '0', cumulativeGasUsed: '0', input: 'deprecated', methodId: '0x765e827f',
    functionName: 'handleOps', confirmations: '10',
  });
  for (let day = 0; day < 300; day++) {
    const base = start + day * 86400 + 9 * 3600;
    if (day % 9 === 0) { const v = 150 + Math.floor(rnd() * 350); bal += v; push('usdt0', base + 60, FAKE_ADDR.exchange, active, usd6(v)); }
    const spends = rnd() < 0.7 ? 1 + Math.floor(rnd() * 2) : 0;
    for (let i = 0; i < spends; i++) {
      const v = Math.round((3 + rnd() * 60) * 100) / 100;
      if (v > bal) continue;
      bal -= v; push('usdt0', base + 3600 * (2 + i * 3), active, FAKE_ADDR.card, usd6(v));
    }
    if (day % 30 === 15 && bal > 400) { bal -= 400; push('usdt0', base + 7200, active, FAKE_ADDR.landlord, usd6(400)); }
    if (day % 23 === 5) { const v = 20 + Math.floor(rnd() * 40); bal += v; push('usdt0', base + 5400, FAKE_ADDR.friend, active, usd6(v)); }
    if (day % 47 === 3) push('usdt0', base + 100, FAKE_ADDR.poison, active, '0');            // poisoning: zero value
    if (day % 61 === 7) push('usdt0', base + 120, FAKE_ADDR.poison, active, '1');            // poisoning: dust
  }
  push('usde', start + 40 * 86400, FAKE_ADDR.exchange, active, usd18(250));
  push('usde', start + 200 * 86400, active, FAKE_ADDR.friend, usd18(75.5));
  const balances = { usdt0: usd6(bal).replace(/^0+(?=\d)/, ''), usde: usd18(174.5) };
  // The busy wallet: 2,500 transfers, several per block, to test paging by block.
  const busy = [];
  for (let i = 0; i < 2500; i++) {
    const ts = start + 86400 + Math.floor(i / 3) * 600;
    busy.push({ ...{ blockNumber: String(blockAt(ts)), timeStamp: String(ts), hash: '0x' + (900000 + i).toString(16).padStart(8, '0') + 'e'.repeat(56) },
      from: FAKE_ADDR.exchange, contractAddress: USDT0, to: FAKE_ADDR.busy, value: usd6(1 + (i % 7)), tokenDecimal: '6', tokenSymbol: 'USDT0' });
  }
  const busyBal = busy.reduce((s, t) => s + BigInt(t.value), 0n).toString();
  return { txs, balances, busy, busyBal };
}

function response(status, body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, headers: { get: (h) => (String(h).toLowerCase() === 'content-type' ? 'application/json' : null) }, text: async () => text, json: async () => JSON.parse(text) };
}

export function createFakePlasma(opts = {}) {
  const cfg = { delayMs: Number.isFinite(opts.delayMs) ? opts.delayMs : 0, fail: String(opts.fail || '') };
  const seed = Number.isFinite(opts.seed) ? opts.seed : 9745;
  const nowSec = Math.floor((opts.now ? +opts.now() : Date.now()) / 1000);
  const data = generate(seed, nowSec);
  const rnd = prng(seed + 1);
  const calls = [];

  function history(address, key) {
    const a = String(address).toLowerCase();
    if (a === FAKE_ADDR.active) return data.txs[key] || [];
    if (a === FAKE_ADDR.busy && key === 'usdt0') return data.busy;
    return [];
  }
  function balance(address, key) {
    const a = String(address).toLowerCase();
    if (a === FAKE_ADDR.active) return data.balances[key] || '0';
    if (a === FAKE_ADDR.busy && key === 'usdt0') return data.busyBal;
    return '0';
  }
  const keyOf = (contract) => (String(contract).toLowerCase() === USDT0 ? 'usdt0' : String(contract).toLowerCase() === USDE ? 'usde' : null);
  const failing = (what) => {
    const f = cfg.fail;
    if (!f) return false;
    if (f.startsWith('rate:')) return what === 'rate' && rnd() < Number(f.slice(5));
    return f === what;
  };

  function routescan(u) {
    const q = u.searchParams;
    const action = q.get('action');
    calls.push({ host: 'routescan', kind: action });
    if (failing('auth')) return response(200, { status: '0', message: 'NOTOK', result: 'Invalid API Key' });
    if (failing('rate') || cfg.fail === 'rate') return response(200, { status: '0', message: 'NOTOK', result: 'Max rate limit reached' });
    if (failing('bad')) return response(200, '<html>oops');
    if (q.get('module') === 'token' && action === 'tokeninfo') {
      const k = keyOf(q.get('contractaddress'));
      return response(200, { status: '1', message: 'OK', result: k ? [{ contractAddress: q.get('contractaddress').toLowerCase(), tokenType: 'ERC20', tokenName: k === 'usdt0' ? 'USDT0' : 'USDe', symbol: k === 'usdt0' ? 'USDT0' : 'USDe', divisor: k === 'usdt0' ? '6' : '18' }] : [] });
    }
    if (!/^0x[0-9a-f]{40}$/i.test(q.get('address') || '')) return response(200, { status: '0', message: 'NOTOK', result: 'Invalid querystring request' });
    const k = keyOf(q.get('contractaddress'));
    if (action === 'tokenbalance') return response(200, { status: '1', message: 'OK', result: k ? balance(q.get('address'), k) : '0' });
    if (action === 'tokentx') {
      const all = k ? history(q.get('address'), k) : [];
      const sb = Number(q.get('startblock') || 0), eb = Number(q.get('endblock') || 1e12);
      const page = Math.max(1, Number(q.get('page') || 1)), offset = Math.min(1000, Math.max(1, Number(q.get('offset') || 1000)));
      let list = all.filter(t => Number(t.blockNumber) >= sb && Number(t.blockNumber) <= eb);
      if (q.get('sort') === 'desc') list = list.slice().reverse();
      return response(200, { status: '1', message: 'OK', result: list.slice((page - 1) * offset, page * offset) });
    }
    return response(200, { status: '0', message: 'NOTOK', result: 'Error! Missing Or invalid Action name' });
  }

  function rpc(body) {
    let j;
    try { j = JSON.parse(body); } catch { return response(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); }
    calls.push({ host: 'rpc', kind: 'rpc:' + j.method });
    if (failing('rpc')) return response(503, 'unavailable');
    const ok = (result) => response(200, { jsonrpc: '2.0', id: j.id, result });
    if (j.method === 'eth_chainId') return ok('0x2611');
    if (j.method === 'eth_getCode') {
      const a = String(j.params[0]).toLowerCase();
      // Plasma One wallets are smart accounts: they have code. So do token contracts.
      return ok(a === FAKE_ADDR.active || keyOf(a) ? '0x6080604052' : '0x');
    }
    if (j.method === 'eth_call') {
      const k = keyOf(j.params[0].to);
      const who = '0x' + String(j.params[0].data).slice(-40);
      return ok('0x' + BigInt(k ? balance(who, k) : '0').toString(16).padStart(64, '0'));
    }
    return response(200, { jsonrpc: '2.0', id: j.id, error: { code: -32601, message: 'method not found' } });
  }

  async function fetch(url, init = {}) {
    if (cfg.delayMs > 0) await new Promise(r => setTimeout(r, cfg.delayMs));
    if (failing('network')) throw new TypeError('fetch failed');
    const u = new URL(String(url));
    if (u.hostname === 'api.routescan.io') {
      if (failing('routescan')) return response(503, 'unavailable');
      return routescan(u);
    }
    if (u.hostname === 'rpc.plasma.to' && String(init.method).toUpperCase() === 'POST') return rpc(init.body);
    throw new TypeError('fake plasma: unexpected host');
  }

  function config(patch) {
    if (patch && typeof patch === 'object') {
      if (Number.isFinite(Number(patch.delayMs))) cfg.delayMs = Math.max(0, Math.min(10000, Number(patch.delayMs)));
      if (typeof patch.fail === 'string' && /^(|network|rate|bad|auth|routescan|rpc|rate:0?\.\d+)$/.test(patch.fail)) cfg.fail = patch.fail;
    }
    return { ...cfg };
  }

  return { fetch, config, calls, ADDR: FAKE_ADDR, history };
}

/**
 * The shape lib/fin-connect/index.mjs loads in fake mode (DASHBOARD_PLASMA_FAKE=1):
 * {fetchFn, settings(), configure(patch)}. DASHBOARD_PLASMA_FAKE_DELAY_MS (default 300)
 * and DASHBOARD_PLASMA_FAKE_FAIL set the start values.
 */
export function createFake({ env = process.env, now } = {}) {
  const d = Number(env.DASHBOARD_PLASMA_FAKE_DELAY_MS);
  const f = createFakePlasma({ delayMs: env.DASHBOARD_PLASMA_FAKE_DELAY_MS != null && Number.isFinite(d) ? d : 300, fail: env.DASHBOARD_PLASMA_FAKE_FAIL || '', now });
  return { fetchFn: f.fetch, settings: () => f.config(null), configure: (patch) => f.config(patch), calls: f.calls, ADDR: f.ADDR };
}

// The Finances API end to end, in-process on a temp data dir: CSV import
// (no connection needed), export, recategorise, budgets, and the bank sync
// job through lib/claude-runner.mjs against a fake Bank connector
// (tests/fixtures/fake-claude-bank.mjs): validation, de-duplication, balances,
// what Connections learns, and the safeguards (403/413/409/400).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude-bank.mjs');
// Today in the config's zone below (the server's "today"), not UTC's: they differ around midnight.
const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
let dir, port, srv;

function freePort() {
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function raw(method, path, { headers = {}, body } = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, agent: false, headers: { Host: `localhost:${port}`, ...headers } }, (r) => {
      let data = '';
      r.setEncoding('utf8');
      r.on('data', d => { data += d; });
      r.on('end', () => { let json = null; try { json = JSON.parse(data); } catch {} res({ status: r.statusCode, headers: r.headers, text: data, json }); });
      r.on('error', () => res({ status: r.statusCode, headers: r.headers, text: data, json: null }));
    });
    req.on('error', rej);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}
const J = { 'Content-Type': 'application/json' };
const SAME = { ...J, Origin: '' };
const csv64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const day = (n) => { const d = new Date(TODAY + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const uk = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const EXPORT = ['Number,Date,Account,Amount,Subcategory,Memo',
  `,${uk(day(20))},A1,-12.50,DEB,TESCO STORES 1234`,
  `,${uk(day(19))},A1,-3.20,DEB,SQ *THE COFFEE CO`,
  `,${uk(day(18))},A1,2000.00,BGC,EXAMPLE LTD SALARY`,
  `,${uk(day(17))},A1,-45.00,DEB,MYSTERY WIDGETS`,
  `,${uk(day(16))},A1,-45.00,DEB,MYSTERY WIDGETS`,
  `,${uk(day(15))},A1,-9.99,DD,NETFLIX.COM`].join('\r\n') + '\r\n';

async function waitJob() {
  for (let i = 0; i < 300; i++) {
    const s = await raw('GET', '/api/finance/status');
    if (s.json.job && s.json.job.state !== 'running') return s.json.job;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('job did not finish');
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'finance-server-'));
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Sam', currency: 'GBP', timezone: 'Europe/London' }));
  process.env.FAKE_BANK_TODAY = TODAY;
  process.env.CLAUDE_CLI_PATH = FAKE;
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(FAKE);
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => {
  await srv?.close();
  delete process.env.FAKE_BANK_MODE; delete process.env.FAKE_BANK_TODAY; delete process.env.FAKE_BANK_DELAY_MS; delete process.env.CLAUDE_CLI_PATH;
  rmSync(dir, { recursive: true, force: true });
});

test('a new user: empty, then a CSV import with no connection at all', async () => {
  const f = await raw('GET', '/api/finance');
  assert.equal(f.json.status, 'empty');
  assert.equal(f.json.meta.available, true);
  const r = await raw('POST', '/api/finance/import', { headers: J, body: { name: 'my-bank export.csv', data: csv64(EXPORT) } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.rows, 6);
  assert.equal(r.json.imported, 6, 'two genuine identical payments both kept');
  assert.equal(r.json.from, day(20));
  assert.equal(r.json.analysis.transactions.length, 6);
  assert.ok(existsSync(join(dir, 'finance', '_system', 'rules.json')), 'starter rules written');
  assert.deepEqual(readdirSync(join(dir, 'finance', 'inbox')).filter(f => !f.startsWith('.')), [], 'imported file moved out of the inbox');
  // The same export again: nothing new.
  const again = await raw('POST', '/api/finance/import', { headers: J, body: { name: 'my-bank export.csv', data: csv64(EXPORT) } });
  assert.equal(again.json.imported, 0);
  assert.equal((await raw('GET', '/api/finance')).json.status, 'ok');
});

test('import refuses what it cannot read, and keeps the safeguards', async () => {
  const bad = async (body, code, re) => { const r = await raw('POST', '/api/finance/import', { headers: J, body }); assert.equal(r.status, code, r.text); if (re) assert.match(r.json.error, re); };
  await bad({ name: 'x.txt', data: csv64(EXPORT) }, 400, /Only \.csv/);
  await bad({ name: 'x.csv', data: '!!notbase64!!' }, 400, /base64/);
  await bad({ name: 'x.csv', data: csv64('hello,world\n1,2\n') }, 400, /could not be read as a bank export/);
  await bad({ name: 'x.csv', data: '' }, 400);
  await bad({ name: 'x.csv' }, 400);
  assert.deepEqual(readdirSync(join(dir, 'finance', 'inbox')).filter(f => f.endsWith('.csv')), [], 'refused files never land in the inbox');
  const cross = await raw('POST', '/api/finance/import', { headers: { ...J, Origin: 'http://evil.example' }, body: { name: 'x.csv', data: csv64(EXPORT) } });
  assert.equal(cross.status, 403);
  // Over the body limit: 413 (or the connection is dropped mid-upload); the server carries on.
  const big = 'x'.repeat(8 * 1024 * 1024);
  const tooBig = await raw('POST', '/api/finance/import', { headers: J, body: { name: 'x.csv', data: big } }).catch(e => ({ status: e.code }));
  assert.ok(tooBig.status === 413 || tooBig.status === 'ECONNRESET' || tooBig.status === 'EPIPE', String(tooBig.status));
  assert.equal((await raw('GET', '/api/finance/status')).status, 200);
  // A path in the name is reduced to its last part.
  const r = await raw('POST', '/api/finance/import', { headers: J, body: { name: '..\\..\\evil/../x.csv', data: csv64(EXPORT) } });
  assert.equal(r.status, 200);
  assert.match(r.json.file, /^upload-[\d-]+-x\.csv$/);
});

test('export: every transaction as CSV, same-origin only, no formulas', async () => {
  const cross = await raw('GET', '/api/finance/export', { headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(cross.status, 403);
  const r = await raw('GET', '/api/finance/export', { headers: { 'Sec-Fetch-Site': 'same-origin' } });
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/csv/);
  assert.match(r.headers['content-disposition'], /attachment; filename="transactions-\d{4}-\d{2}-\d{2}\.csv"/);
  const lines = r.text.replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lines[0], 'Date,Merchant,Category,Amount,Counts as spend,Account,Type,Description,Source file');
  assert.equal(lines.length, 7);
});

test('recategorise a merchant (a saved rule), then undo it', async () => {
  const before = (await raw('GET', '/api/finance')).json.analysis;
  const m = before.transactions.find(t => /MYSTERY/.test(t.memo));
  assert.equal(m.c, 'Uncategorised');
  const r = await raw('POST', '/api/finance/categorise', { headers: J, body: { merchant: m.m, category: 'Shopping' } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.changed, true);
  assert.ok(r.json.analysis.transactions.filter(t => t.m === m.m).every(t => t.c === 'Shopping' && t.how === 'override'));
  const rules = JSON.parse(readFileSync(join(dir, 'finance', '_system', 'rules.json'), 'utf8'));
  assert.equal(rules.merchant_overrides[m.m.toUpperCase()], 'Shopping');
  assert.ok(readdirSync(join(dir, 'finance', '_system', 'backups')).some(f => f.startsWith('rules-')), 'old rules backed up');
  const undo = await raw('POST', '/api/finance/categorise', { headers: J, body: { merchant: m.m, category: null } });
  assert.equal(undo.json.changed, true);
  assert.ok(undo.json.analysis.transactions.filter(t => t.m === m.m).every(t => t.c === 'Uncategorised'));
  for (const body of [{ merchant: 'Nobody Ltd', category: 'Shopping' }, { merchant: m.m, category: '<b>x' }, { merchant: 7, category: 'Shopping' }, { merchant: m.m }]) {
    assert.equal((await raw('POST', '/api/finance/categorise', { headers: J, body })).status, 400, JSON.stringify(body));
  }
});

test('budgets round-trip and are validated', async () => {
  const r = await raw('PUT', '/api/finance/budgets', { headers: J, body: { budgets: { Groceries: 250.555, 'Eating out': 100 } } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.budgets, { Groceries: 250.56, 'Eating out': 100 });
  assert.deepEqual((await raw('GET', '/api/finance/budgets')).json.budgets, { Groceries: 250.56, 'Eating out': 100 });
  assert.deepEqual((await raw('GET', '/api/finance')).json.analysis.budgets, { Groceries: 250.56, 'Eating out': 100 });
  for (const budgets of [{ Groceries: -1 }, { '<script>': 5 }, [], { Groceries: 'x' }]) {
    assert.equal((await raw('PUT', '/api/finance/budgets', { headers: J, body: { budgets } })).status, 400);
  }
});

test('bank sync through the read-only connector: validated, de-duplicated, balances, Connections told', async () => {
  process.env.FAKE_BANK_MODE = 'ok';
  process.env.FAKE_BANK_LOG = join(dir, 'fake-bank.log');
  const up = await raw('POST', '/api/finance/update', { headers: J, body: {} });
  assert.equal(up.status, 202);
  const job = await waitJob();
  assert.equal(job.state, 'ok', job.error || '');
  // c1 c2 c3 c6 + k1 k2; the pending one and the EUR one are skipped; k1 repeated on page 2 is kept once.
  assert.equal(job.result.fetched, 6);
  assert.equal(job.result.pendingSkipped, 1);
  assert.equal(job.result.balanceAccounts, 1);
  assert.ok(job.result.warnings.some(w => /failed validation \(1 not GBP\)/.test(w)), job.result.warnings.join(' | '));
  const a = (await raw('GET', '/api/finance')).json.analysis;
  const grocer = a.transactions.find(t => t.memo === 'GROCER ONE');
  assert.equal(grocer.a, -45.99, 'the sign comes from the debit type');
  assert.equal(grocer.bc, 'groceries');
  assert.ok(a.transactions.some(t => t.memo === 'cmd|calc'), 'a leading = is stripped from bank text');
  assert.ok(!a.transactions.some(t => t.memo === 'PENDING SHOP'));
  assert.equal(a.balances.length, 1);
  assert.equal(a.balances[0].balance, 1234.56);
  assert.ok(a.balance_history.length >= 3);
  const conn = JSON.parse(readFileSync(join(dir, 'connections.json'), 'utf8'));
  assert.equal(conn.bank.status, 'connected');
  // The lockdown: the CLI only ever got the read-only Bank tools, no user settings, prompt on stdin.
  const run = JSON.parse(readFileSync(process.env.FAKE_BANK_LOG, 'utf8').trim().split('\n')[0]);
  delete process.env.FAKE_BANK_LOG;
  const flag = (n) => run.argv[run.argv.indexOf(n) + 1];
  const { CONNECTORS } = await import('../lib/claude-runner.mjs');
  assert.deepEqual(flag('--allowedTools').split(','), CONNECTORS.bank.read.map(t => CONNECTORS.bank.prefix + t));
  assert.ok(flag('--disallowedTools').split(',').includes('mcp__claude_ai_Bank__categorise_transactions'));
  assert.equal(flag('--setting-sources'), '');
  assert.ok(run.stdinLength > 200 && !run.argv.some(a => /read-only data fetcher/.test(a)));
  // A second sync overlaps the first: nothing is imported twice.
  await raw('POST', '/api/finance/update', { headers: J, body: {} });
  const job2 = await waitJob();
  assert.equal(job2.result.imported, 0);
  // The bank-sync CSVs went through the inbox like any export.
  assert.ok(readdirSync(join(dir, 'finance', 'processed')).some(f => /^bank-sync-.*\.csv$/.test(f)));
});

test('one job at a time: a running sync blocks imports and categorising (409)', async () => {
  process.env.FAKE_BANK_MODE = 'ok';
  process.env.FAKE_BANK_DELAY_MS = '600';
  try {
    assert.equal((await raw('POST', '/api/finance/update', { headers: J, body: { full: true } })).status, 202);
    assert.equal((await raw('POST', '/api/finance/update', { headers: J, body: {} })).status, 409);
    assert.equal((await raw('POST', '/api/finance/import', { headers: J, body: { name: 'a.csv', data: csv64(EXPORT) } })).status, 409);
    assert.equal((await raw('POST', '/api/finance/categorise', { headers: J, body: { merchant: 'Tesco Stores', category: null } })).status, 409);
    const job = await waitJob();
    assert.equal(job.state, 'ok');
    assert.equal(job.result.full, true);
  } finally { delete process.env.FAKE_BANK_DELAY_MS; }
});

test('a session that stops paging early is finished by a follow-up for just the missing range', async () => {
  process.env.FAKE_BANK_MODE = 'partial';
  process.env.FAKE_BANK_LOG = join(dir, 'fake-bank-partial.log');
  try {
    await raw('POST', '/api/finance/update', { headers: J, body: {} });
    const job = await waitJob();
    assert.equal(job.state, 'ok', job.error || '');
    assert.equal(job.result.followUps, 1);
    assert.equal(job.result.fetched, 6, 'the follow-up added the missing card transaction');
    assert.equal(job.result.balanceAccounts, 1, 'and the skipped balances');
    assert.ok(!job.result.warnings.some(w => /fetched \d+ of \d+/.test(w)), job.result.warnings.join(' | '));
    const runs = readFileSync(process.env.FAKE_BANK_LOG, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    assert.equal(runs.length, 2);
  } finally { delete process.env.FAKE_BANK_LOG; }
});

test('bank needs signing in: the job warns, inbox CSVs still import, Connections greys bank sync', async () => {
  process.env.FAKE_BANK_MODE = 'needs-auth';
  writeFileSync(join(dir, 'finance', 'inbox', 'dropped.csv'), ['Date,Amount,Memo', `${uk(day(1))},-7.00,DROPPED IN BY HAND`].join('\n'));
  await raw('POST', '/api/finance/update', { headers: J, body: {} });
  const job = await waitJob();
  assert.equal(job.state, 'warning');
  assert.match(job.error, /sign in again/);
  assert.equal(job.result.imported, 1, 'the hand-dropped CSV was imported anyway');
  const conn = JSON.parse(readFileSync(join(dir, 'connections.json'), 'utf8'));
  assert.equal(conn.bank.status, 'needs-auth');
  const last = JSON.parse(readFileSync(join(dir, 'finance', '_system', 'dashboard_update.json'), 'utf8'));
  assert.equal(last.state, 'warning');
});

test('no-bank rebuild works with no connection, and logs never hold money or merchants', async () => {
  const up = await raw('POST', '/api/finance/update', { headers: J, body: { bank: false } });
  assert.equal(up.status, 202);
  const job = await waitJob();
  assert.equal(job.state, 'ok');
  assert.equal(job.result.bank, false);
  // Leave out this run's own numbers first (data folder, port, process id,
  // timings): a pid of 12000 or a 2004 ms request is not the 2000.00 salary.
  const log = readFileSync(join(dir, 'logs', 'server.log'), 'utf8')
    .split(dir).join('<dir>').split(String(port)).join('<port>')
    .replace(/\bpid \d+/g, 'pid <n>').replace(/\b\d+ms\b/g, '<n>ms');
  for (const s of ['TESCO', 'GROCER', 'MYSTERY', '45.99', '2000', 'Shopping']) assert.ok(!log.includes(s), `log mentions ${s}`);
});

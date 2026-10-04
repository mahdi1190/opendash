// Regression tests for the faults found by the MCP + sharing QA pass (each
// test names the fault it guards). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fsp, readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir, hostname } from 'node:os';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { makeDataDir, sampleState } from './fixtures/actions-state.mjs';
import { createActions } from '../server/actions/index.mjs';
import { createStateStore } from '../server/state-store.mjs';
import { withLock } from '../lib/fsutil.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCP = join(HERE, '..', 'mcp', 'server.mjs');
const stateOf = (dir) => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function startMcp(dataDir, extra = []) {
  const p = spawn(process.execPath, [MCP, '--data-dir', dataDir, ...extra], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '';
  const waiters = new Map(); const stray = [];
  p.stdout.setEncoding('utf8');
  p.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      const w = waiters.get(m.id); if (w) { waiters.delete(m.id); w(m); } else stray.push(m);
    }
  });
  let n = 0;
  const rpc = (method, params) => new Promise((resolve) => { const id = ++n; waiters.set(id, resolve); p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  const call = async (name, args = {}) => { const m = await rpc('tools/call', { name, arguments: args }); return { isError: !!m.result.isError, text: m.result.content[0].text, json: m.result.isError ? null : JSON.parse(m.result.content[0].text) }; };
  const stop = () => new Promise((resolve) => { p.on('close', resolve); p.stdin.end(); setTimeout(() => p.kill(), 3000); });
  return { p, rpc, call, stop, stray, send: (t) => p.stdin.write(t) };
}
const init = (m) => m.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'qa', version: '1' } });

// ─── Validation and helpful errors ─────────────────────────────────────────
test('fields named __proto__ / constructor are refused (they passed the "known field" check before)', async () => {
  const a = createActions({ dataDir: makeDataDir() });
  const raw = JSON.parse('{"op":"task.create","title":"x","__proto__":{"polluted":1}}');
  await assert.rejects(a.apply({ ops: [raw] }), /__proto__.*not allowed/);
  await assert.rejects(a.apply({ ops: [{ op: 'task.create', title: 'x', constructor: 'y' }] }), /constructor.*not allowed/);
  assert.equal(({}).polluted, undefined);
});

test('a mistyped task id names the task with the nearest id', async () => {
  const a = createActions({ dataDir: makeDataDir() });
  const e = await a.apply({ ops: [{ op: 'task.set_priority', id: 'u-2-bb', priority: 'p1' }] }).catch(x => x);
  assert.equal(e.code, 'NOT_FOUND');
  assert.deepEqual(e.toJSON().candidates.map(c => c.id), ['u-2-bbb']);
});

test('a batch with a format error AND a wrong id reports both at once (not one per retry)', async () => {
  const a = createActions({ dataDir: makeDataDir() });
  const e = await a.apply({ ops: [{ op: 'task.set_priority', id: 'nope-nope-nope', priority: 'p1' }, { op: 'task.reschedule', id: 'u-1-aaa', dueDate: 'tomorrow' }] }).catch(x => x);
  const errs = e.toJSON().errors;
  assert.equal(errs.length, 2);
  assert.deepEqual(errs.map(x => x.opIndex), [0, 1]);
  assert.ok(errs.some(x => x.code === 'NOT_FOUND') && errs.some(x => x.code === 'INVALID_PARAMS'));
});

test('search_tasks flags equally good matches as ambiguous instead of "the top result is the task"', async () => {
  const s = sampleState();
  for (const v of ['Update', 'Review', 'Draft']) s.custom.push({ id: `u-p-${v}`, title: `${v} the pricing page`, stream: 'work', tags: [], people: [], subtasks: [] });
  const a = createActions({ dataDir: makeDataDir(s) });
  const r = await a.query('tasks.find', { text: 'pricing page' });
  assert.equal(r.ambiguous, true);
  assert.match(r.advice, /AMBIGUOUS/);
  const one = await a.query('tasks.find', { text: 'council tax' });
  assert.ok(!one.ambiguous);
});

// ─── Idempotency ───────────────────────────────────────────────────────────
test('the same idempotencyKey with DIFFERENT ops is refused (it used to replay the old result as if applied)', async () => {
  const dir = makeDataDir();
  const a = createActions({ dataDir: dir });
  const first = await a.apply({ ops: [{ op: 'task.add_note', id: 'u-1-aaa', text: 'one' }], idempotencyKey: 'k1' });
  const again = await a.apply({ ops: [{ op: 'task.add_note', id: 'u-1-aaa', text: 'one' }], idempotencyKey: 'k1' });
  assert.equal(again.idempotent, true);
  assert.equal(again.undo, first.undo);
  await assert.rejects(a.apply({ ops: [{ op: 'task.add_note', id: 'u-1-aaa', text: 'two' }], idempotencyKey: 'k1' }), (e) => e.code === 'IDEMPOTENCY_KEY_REUSED');
  assert.equal(stateOf(dir).notes['u-1-aaa'].filter(n => n.text === 'two').length, 0);
});

// ─── Proposals / confirm tokens with "$ref" ────────────────────────────────
test('a proposal that creates a task and edits it through $ref can be applied (it always failed PREVIEW_CHANGED)', async () => {
  const dir = makeDataDir();
  const a = createActions({ dataDir: dir });
  const p = await a.propose({ ops: [{ op: 'task.create', title: 'Plan the offsite', stream: 'work', ref: 'offsite' }, { op: 'task.add_subtask', id: '$offsite', title: 'Pick a venue' }] });
  const r = await a.applyProposal(p.proposalId);
  assert.equal(r.ok, true);
  assert.equal(stateOf(dir).custom.find(t => t.title === 'Plan the offsite').subtasks.length, 1);
  // and a confirm token from a dry run of such a batch still verifies
  const ops = [{ op: 'task.create', title: 'Another one', stream: 'work', ref: 'n' }, ...Array.from({ length: 26 }, (_, i) => ({ op: 'task.add_subtask', id: '$n', title: 's' + i }))];
  const dry = await a.apply({ ops, dryRun: true });
  assert.equal(dry.needsConfirm, true);
  const ok = await a.apply({ ops, confirm: dry.confirm });
  assert.equal(ok.ok, true);
});

// ─── Disk safety ───────────────────────────────────────────────────────────
test('a transient EBUSY reading the state inside a write never writes a state without the tasks', async () => {
  const dir = makeDataDir();
  const store = createStateStore({ stateDir: join(dir, 'state') });
  const n0 = stateOf(dir).custom.length;
  const real = fsp.readFile;
  let fails = 2;
  fsp.readFile = async (p, ...a) => { if (String(p).endsWith('dashboard-state.json') && fails-- > 0) throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' }); return real.call(fsp, p, ...a); };
  try {
    await store.mutate(async (cur) => ({ next: { ...cur, custom: [...cur.custom, { id: 'u-new', title: 'New' }] } }));
  } finally { fsp.readFile = real; }
  assert.equal(stateOf(dir).custom.length, n0 + 1, 'every task kept');
  // a read that keeps failing is refused (503) and nothing is written
  fsp.readFile = async (p, ...a) => { if (String(p).endsWith('dashboard-state.json')) throw Object.assign(new Error('EPERM'), { code: 'EPERM' }); return real.call(fsp, p, ...a); };
  try {
    await assert.rejects(store.mutate(async (cur) => ({ next: { ...cur, custom: [] } })), (e) => e.status === 503);
  } finally { fsp.readFile = real; }
  assert.equal(stateOf(dir).custom.length, n0 + 1);
});

test('a corrupt state file: an MCP/actions write recovers from the newest good backup, warns, keeps the bad copy', async () => {
  const dir = makeDataDir();
  const good = stateOf(dir);
  mkdirSync(join(dir, 'state', 'backups'), { recursive: true });
  writeFileSync(join(dir, 'state', 'backups', 'state-2026-01-01T00-00-00-000Z.json'), JSON.stringify(good));
  writeFileSync(join(dir, 'state', 'dashboard-state.json'), JSON.stringify(good).slice(0, 200));
  const a = createActions({ dataDir: dir });
  const r = await a.apply({ ops: [{ op: 'task.add_note', id: 'u-1-aaa', text: 'after corruption' }] });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some(w => /backup/.test(w.message)));
  assert.equal(stateOf(dir).custom.length, good.custom.length);
  assert.ok(readdirSync(join(dir, 'state', 'backups')).some(f => f.startsWith('corrupt-')));
});

test('a locked journal is never replaced by an empty one; the saved change still reports success', async () => {
  const dir = makeDataDir();
  const a = createActions({ dataDir: dir });
  await a.apply({ ops: [{ op: 'task.add_note', id: 'u-1-aaa', text: 'first' }] });
  const jf = join(dir, 'state', 'actions-journal.json');
  const before = readFileSync(jf, 'utf8');
  const real = fsp.readFile;
  fsp.readFile = async (p, ...x) => { if (String(p).endsWith('actions-journal.json')) throw Object.assign(new Error('EBUSY'), { code: 'EBUSY' }); return real.call(fsp, p, ...x); };
  let r;
  try { r = await a.apply({ ops: [{ op: 'task.add_note', id: 'u-1-aaa', text: 'second' }] }); } finally { fsp.readFile = real; }
  assert.equal(r.ok, true);
  assert.equal(r.undo, null);
  assert.ok(r.warnings.some(w => /undo history could not be written/.test(w.message)));
  assert.equal(readFileSync(jf, 'utf8'), before, 'journal untouched (not emptied)');
  assert.ok(stateOf(dir).notes['u-1-aaa'].some(n => n.text === 'second'));
});

test('lock: an empty lock file left by a crash is taken over in seconds (it blocked writes for 20 s)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qa-lock-'));
  const f = join(dir, 'x.json');
  writeFileSync(f + '.lock', '');
  const old = new Date(Date.now() - 5000);
  await fsp.utimes(f + '.lock', old, old);
  const t0 = Date.now();
  await withLock(f, async () => {});
  assert.ok(Date.now() - t0 < 1500, `took ${Date.now() - t0} ms`);
  assert.ok(!existsSync(f + '.lock'));
});

test('lock: callers in one process queue in memory (50 writers in order, none lost, no lock-file polling)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qa-lock-'));
  const f = join(dir, 'n.json');
  writeFileSync(f, '0');
  const order = [];
  // Queued in memory, each caller only tries the lock file once the one before
  // it has let go, so no attempt ever finds it taken (and none polls it, which
  // is what made this slow). Counted, not timed: a busy CI runner is slow anyway.
  const lockFile = f + '.lock';
  let found = 0;
  const realOpen = fsp.open;
  fsp.open = async (p, flags, ...rest) => {
    try { return await realOpen.call(fsp, p, flags, ...rest); }
    catch (e) { if (String(p) === lockFile && e.code === 'EEXIST') found++; throw e; }
  };
  try {
    await Promise.all(Array.from({ length: 50 }, (_, i) => withLock(f, async () => { const v = Number(readFileSync(f, 'utf8')); await sleep(1); writeFileSync(f, String(v + 1)); order.push(i); })));
  } finally { fsp.open = realOpen; }
  assert.equal(readFileSync(f, 'utf8'), '50');
  assert.deepEqual(order, Array.from({ length: 50 }, (_, i) => i));
  assert.equal(found, 0, 'no caller found the lock file taken');
});

test('sources.json that cannot be read is not overwritten by a source edit', async () => {
  const { mutateSources } = await import('../lib/sources.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'qa-src-'));
  const f = join(dir, 'sources.json');
  const doc = { version: 1, sources: [{ id: 'bank-csv', capability: 'bank', kind: 'csv', label: 'CSV imports', colour: 'slate', enabled: true, accounts: [] }] };
  writeFileSync(f, JSON.stringify(doc));
  const real = fsp.readFile;
  fsp.readFile = async (p, ...x) => { if (String(p).endsWith('sources.json')) throw Object.assign(new Error('EBUSY'), { code: 'EBUSY' }); return real.call(fsp, p, ...x); };
  try {
    await assert.rejects(mutateSources(dir, (list) => { list.push({ id: 'x' }); }));
  } finally { fsp.readFile = real; }
  assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), doc);
});

// ─── MCP transport and protocol ────────────────────────────────────────────
test('MCP: a tools/call sent as a notification (no id) is not executed and gets no reply', async () => {
  const dir = makeDataDir();
  const m = startMcp(dir);
  try {
    await init(m);
    m.send(JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'create_task', arguments: { title: 'Ghost task', stream: 'work' } } }) + '\n');
    await m.rpc('ping', {});
    await sleep(200);
    assert.equal(m.stray.length, 0, 'no reply without an id');
    assert.ok(!stateOf(dir).custom.some(t => t.title === 'Ghost task'));
  } finally { await m.stop(); }
});

test('MCP: the dashboard dies after receiving a write -> the embedded retry does NOT apply it twice', async () => {
  const dir = makeDataDir();
  const inner = createActions({ dataDir: dir });
  // A "dashboard" that applies the change, then drops the connection without answering.
  const srv = createServer(async (req, res) => {
    if (req.url.startsWith('/api/health')) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, app: 'dashboard', stateFile: join(dir, 'state', 'dashboard-state.json') })); return; }
    let body = ''; for await (const c of req) body += c;
    const b = JSON.parse(body);
    if (req.url === '/api/actions') await inner.apply({ ops: b.ops, idempotencyKey: b.idempotencyKey, source: 'mcp', client: b.client });
    req.socket.destroy();
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const m = startMcp(dir, ['--port', String(srv.address().port)]);
  try {
    await init(m);
    const r = await m.call('add_task_note', { id: 'u-1-aaa', text: 'exactly once' });
    assert.equal(r.isError, false, r.text);
    assert.equal(stateOf(dir).notes['u-1-aaa'].filter(n => n.text === 'exactly once').length, 1);
  } finally { await m.stop(); srv.close(); }
});

// ─── Sources ───────────────────────────────────────────────────────────────
test('list_inbox labels every thread with its mailbox when there are several', async () => {
  const dir = makeDataDir();
  mkdirSync(join(dir, 'inbox', 'sources'), { recursive: true });
  const now = new Date().toISOString();
  writeFileSync(join(dir, 'sources.json'), JSON.stringify({ version: 1, sources: [
    { id: 'email-gmail', capability: 'email', kind: 'mcp', label: 'Personal mail', colour: 'red', enabled: true, server: 'claude.ai Gmail', preset: 'gmail', tools: ['search_threads'], accounts: [] },
    { id: 'work-mail', capability: 'email', kind: 'mcp', label: 'Work mail', colour: 'amber', enabled: true, server: 'work-mail', tools: ['search_mail'], accounts: [] },
  ] }));
  writeFileSync(join(dir, 'inbox', 'messages.json'), JSON.stringify({ version: 1, fetchedAt: now, messages: [{ id: 't1', messageId: 'm1', subject: 'Personal', sender: 'A <a@example.com>', date: now, snippet: '' }] }));
  writeFileSync(join(dir, 'inbox', 'sources', 'work-mail.json'), JSON.stringify({ version: 1, sourceId: 'work-mail', fetchedAt: now, messages: [{ id: 'w1', messageId: 'mw1', subject: 'Work', sender: 'B <b@example.org>', date: now, snippet: '' }] }));
  const a = createActions({ dataDir: dir });
  const r = await a.query('inbox.list', {});
  assert.equal(r.threads.length, 2);
  assert.deepEqual(r.threads.map(t => t.account).sort(), ['Personal mail', 'Work mail']);
});

test('toolSafety: destructive / money verbs are writes (they were "unknown" and tickable); reads stay reads', async () => {
  const { toolSafety, CONNECTORS } = await import('../lib/claude-runner.mjs');
  for (const t of ['withdraw_funds', 'destroy_record', 'wipe_calendar', 'purchase_item', 'make_payment', 'sell_stock', 'place_order', 'refund_payment', 'compose_email', 'check_in', 'checkout_cart', 'rsvp_event', 'complete_task', 'close_issue', 'upsert_record', 'toggle_setting', 'top_up']) {
    assert.equal(toolSafety(t), 'write', t);
  }
  for (const t of ['list_events', 'get_balance', 'list_orders', 'get_charges', 'list_purchases', 'list_completed_tasks', 'get_connected_accounts', 'get_check_in_status', 'convert_currency', 'list_refunds']) {
    assert.notEqual(toolSafety(t), 'write', t);
  }
  assert.equal(toolSafety('check_status'), 'read');
  for (const k of ['calendar', 'gmail']) for (const t of CONNECTORS[k].read) assert.notEqual(toolSafety(t), 'write', `${k}:${t}`);
});

test('finance: a CSV whose new account mostly matches another account by date+amount is flagged (double counting)', async () => {
  const { crossAccountOverlap } = await import('../lib/finance/pipeline.mjs');
  const { storeCsv } = await import('../lib/finance/store.mjs');
  const fin = mkdtempSync(join(tmpdir(), 'qa-fin-'));
  mkdirSync(join(fin, '_system'), { recursive: true });
  const stored = [['2026-09-01', -12.5, 'synced-acc', 'CORNER CAFE'], ['2026-09-02', 2500, 'synced-acc', 'SALARY'], ['2026-09-03', -45.99, 'synced-acc', 'GROCER ONE']]
    .map(([date, amount, account, memo]) => ({ date, amount, account, subcategory: '', memo, source: 'bank-sync.csv' }));
  writeFileSync(join(fin, '_system', 'transactions.csv'), storeCsv(stored));
  const csv = (acct) => Buffer.from(['Number,Date,Account,Amount,Subcategory,Memo', `,01/09/2026,${acct},-12.50,DEB,CORNER CAFE LONDON`, `,02/09/2026,${acct},2500.00,BGC,EMPLOYER SALARY`, `,03/09/2026,${acct},-45.99,DEB,GROCER ONE`].join('\r\n') + '\r\n');
  assert.deepEqual(await crossAccountOverlap(fin, csv('20-00-00 99998888'), 'a.csv'), { rows: 3, matched: 3 });
  // the same account as stored: not a "new account" overlap (the normal de-dup handles it)
  assert.deepEqual(await crossAccountOverlap(fin, csv('synced-acc'), 'b.csv'), { rows: 0, matched: 0 });
});

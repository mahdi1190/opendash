// mcp/server.mjs end to end: spawn it and speak JSON-RPC over stdio.
//   - embedded mode (no dashboard server running)
//   - propose mode (can never apply)
//   - HTTP mode against a real in-process server, with an SSE listener that
//     plays the open browser tab, plus the HTTP auth rules of /api/actions.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request, createServer } from 'node:http';
import { connect } from 'node:net';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCP = join(HERE, '..', 'mcp', 'server.mjs');
const FAKE = join(HERE, 'fixtures', 'fake-claude.mjs');
const PROPOSE_RE = /^mcp__dashboard__(get|list|search|read|describe|propose)_[a-z0-9_]{1,60}$/;   // lib/claude-runner.mjs

function startMcp(dataDir, extra = []) {
  const p = spawn(process.execPath, [MCP, '--data-dir', dataDir, ...extra], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '', err = '';
  const lines = [];
  const waiters = new Map();
  p.stdout.setEncoding('utf8');
  p.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      lines.push(line);
      const m = JSON.parse(line);   // throws (fails the test) if anything but JSON reaches stdout
      const w = waiters.get(Array.isArray(m) ? 'batch' : m.id);
      if (w) { waiters.delete(Array.isArray(m) ? 'batch' : m.id); w(m); }
    }
  });
  p.stderr.on('data', d => { err += d; });
  let n = 0;
  const send = (obj) => p.stdin.write((typeof obj === 'string' ? obj : JSON.stringify(obj)) + '\n');
  const rpc = (method, params, timeoutMs = 20000) => new Promise((resolve, reject) => {
    const id = ++n;
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${method}; stderr: ${err}`)), timeoutMs);
    waiters.set(id, (m) => { clearTimeout(t); resolve(m); });
    send({ jsonrpc: '2.0', id, method, params });
  });
  const raw = (text, key) => new Promise((resolve) => { waiters.set(key, resolve); send(text); });
  const call = async (name, args = {}) => {
    const m = await rpc('tools/call', { name, arguments: args });
    if (m.error) return { rpcError: m.error };
    const text = m.result.content[0].text;
    return { isError: !!m.result.isError, text, json: m.result.isError ? null : JSON.parse(text) };
  };
  const stop = () => new Promise((resolve) => { p.on('close', resolve); p.stdin.end(); setTimeout(() => p.kill(), 3000); });
  return { p, rpc, raw, send, call, stop, lines, stderr: () => err };
}
const init = (m, v = '2025-06-18') => m.rpc('initialize', { protocolVersion: v, capabilities: {}, clientInfo: { name: 'test-client', version: '1.0' } });

// ─── Embedded mode ─────────────────────────────────────────────────────────
test('embedded mode: the full protocol, a no-context workflow, dry run, apply and undo', async () => {
  const dir = makeDataDir();
  const m = startMcp(dir);
  try {
    const i = await init(m);
    assert.equal(i.result.protocolVersion, '2025-06-18');
    assert.equal(i.result.serverInfo.name, 'dashboard', 'kept: existing installs and permission rules use it');
    assert.equal(i.result.serverInfo.title, 'OpenDash');
    assert.ok(i.result.capabilities.tools && i.result.capabilities.resources && i.result.capabilities.prompts);
    assert.match(i.result.instructions, /get_context first/);
    assert.match(i.result.instructions, /search_tasks/);
    assert.match(i.result.instructions, /YYYY-MM-DD/);
    m.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    assert.deepEqual((await m.rpc('ping', {})).result, {});
    const old = await m.rpc('initialize', { protocolVersion: '2099-01-01', capabilities: {}, clientInfo: { name: 'test-client', version: '1.0' } });
    assert.equal(old.result.protocolVersion, '2025-11-25', 'unknown version -> our latest');

    const tools = (await m.rpc('tools/list', {})).result.tools;
    const names = tools.map(t => t.name);
    for (const n of ['get_context', 'list_tasks', 'get_task', 'search_tasks', 'list_people', 'list_countdowns', 'list_tags', 'list_calendar',
      'get_finance_summary', 'list_history', 'describe_operations', 'create_task', 'update_task', 'reschedule_task', 'bin_task', 'merge_tags',
      'create_person', 'create_countdown', 'apply_changes', 'undo_changes']) assert.ok(names.includes(n), n);
    for (const t of tools) { assert.equal(t.inputSchema.type, 'object', t.name); assert.ok(t.description.length > 10, t.name); }
    assert.ok(tools.find(t => t.name === 'bin_task').inputSchema.properties.confirm);
    assert.equal(tools.find(t => t.name === 'list_tasks').annotations.readOnlyHint, true);
    // The "read freely" permission set offered by /api/mcp-info covers exactly the read-only tools.
    const { READ_TOOLS } = await import('../mcp/install.mjs');
    assert.deepEqual([...READ_TOOLS].sort(), tools.filter(t => t.annotations && t.annotations.readOnlyHint).map(t => t.name).sort());

    const res = (await m.rpc('resources/list', {})).result.resources.map(r => r.uri);
    assert.deepEqual(res, ['dashboard://context', 'dashboard://today', 'dashboard://schema']);
    const today = JSON.parse((await m.rpc('resources/read', { uri: 'dashboard://today' })).result.contents[0].text);
    assert.equal(today.today, TODAY);
    assert.deepEqual(today.dueTodayOrOverdue.map(t => t.id), ['u-3-ccc', 'u-4-ddd']);
    assert.equal(today.events[0].title, 'Group meeting');
    const schema = JSON.parse((await m.rpc('resources/read', { uri: 'dashboard://schema' })).result.contents[0].text);
    assert.ok(schema.ops.length >= 26);
    assert.equal((await m.rpc('resources/read', { uri: 'dashboard://nope' })).error.code, -32002);
    const prompts = (await m.rpc('prompts/list', {})).result.prompts.map(p => p.name);
    assert.deepEqual(prompts, ['plan_my_day', 'weekly_review', 'triage_overdue']);
    const pg = await m.rpc('prompts/get', { name: 'triage_overdue', arguments: { stream: 'work' } });
    assert.match(pg.result.messages[0].content.text, /overdue/);
    assert.equal((await m.rpc('prompts/get', { name: 'nope' })).error.code, -32602);

    // protocol errors
    assert.equal((await m.rpc('no/such/method', {})).error.code, -32601);
    assert.equal((await m.raw('{not json', null)).error.code, -32700);
    assert.equal((await m.rpc('tools/call', { name: 'no_such_tool', arguments: {} })).error.code, -32602);
    const batch = await m.raw(JSON.stringify([{ jsonrpc: '2.0', id: 900, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }]), 'batch');
    assert.deepEqual(batch, [{ jsonrpc: '2.0', id: 900, result: {} }]);

    // the workflow a model with no context follows
    const ctx = (await m.call('get_context')).json;
    assert.equal(ctx.today, TODAY);
    const found = (await m.call('search_tasks', { text: 'email Sam corrections' })).json;
    assert.equal(found.results[0].id, 'u-1-aaa');
    const bad = await m.call('create_task', { title: 'Call Alex', dueDate: 'next friday' });
    assert.ok(bad.isError);
    assert.match(bad.text, /INVALID_PARAMS/);
    assert.match(bad.text, /Today is/);
    const created = (await m.call('create_task', { title: 'Call Alex about the slides', stream: 'work', dueDate: addDays(TODAY, 2), priority: 'p1', people: ['alex'] })).json;
    assert.equal(created.ok, true);
    const newId = created.created[0].id;
    const dup = await m.call('create_task', { title: 'call alex about the slides', stream: 'work' });
    assert.match(dup.text, /DUPLICATE_TASK/);
    const wrongId = await m.call('update_task', { id: 'Call Alex about the slides', priority: 'p2' });
    assert.ok(wrongId.isError);
    assert.match(wrongId.text, new RegExp(newId));

    // a bulk reschedule: dry run (nothing changes), apply, then undo
    const thesis = (await m.call('list_tasks', { stream: 'thesis' })).json.tasks;
    const ops = thesis.map(t => ({ op: 'task.reschedule', id: t.id, shiftDays: 2 }));
    const before = readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8');
    const dry = (await m.call('apply_changes', { ops, dryRun: true })).json;
    assert.equal(dry.dryRun, true);
    assert.equal(dry.preview.length, 2);
    assert.equal(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'), before);
    const applied = (await m.call('apply_changes', { ops })).json;
    assert.equal(applied.changed, 2);
    assert.equal((await m.call('get_task', { id: 'u-1-aaa' })).json.due, addDays(TODAY, 3));
    const hist = (await m.call('list_history', {})).json.history;
    assert.equal(hist[0].token, applied.undo);
    assert.equal(hist[0].source, 'mcp');
    assert.equal(hist[0].client, 'test-client 1.0');
    const undone = (await m.call('undo_changes', { token: applied.undo })).json;
    assert.equal(undone.ok, true);
    assert.equal((await m.call('get_task', { id: 'u-1-aaa' })).json.due, addDays(TODAY, 1));

    // deletes need the confirm token from a dry run
    const binNow = await m.call('bin_task', { id: newId });
    assert.match(binNow.text, /NEEDS_CONFIRM/);
    const binDry = (await m.call('bin_task', { id: newId, dryRun: true })).json;
    const binned = (await m.call('bin_task', { id: newId, confirm: binDry.confirm })).json;
    assert.equal(binned.changed, 1);

    const act = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8')).taskActivity[newId];
    assert.ok(act.every(x => x.source === 'mcp' && x.client === 'test-client 1.0'));
    assert.ok(m.lines.every(l => JSON.parse(l).jsonrpc === '2.0' || Array.isArray(JSON.parse(l))), 'stdout carries protocol only');
  } finally { await m.stop(); rmSync(dir, { recursive: true, force: true }); }
});

test('propose mode: read tools + propose_changes only, and nothing is ever applied', async () => {
  const dir = makeDataDir();
  const m = startMcp(dir, ['--mode', 'propose']);
  try {
    const i = await init(m);
    assert.match(i.result.instructions, /PROPOSE MODE/);
    const names = (await m.rpc('tools/list', {})).result.tools.map(t => t.name);
    assert.ok(names.includes('propose_changes'));
    assert.ok(!names.some(n => ['create_task', 'apply_changes', 'undo_changes', 'bin_task'].includes(n)));
    for (const n of names) assert.match('mcp__dashboard__' + n, PROPOSE_RE, `${n} fits the runner's mcp-propose allowlist`);
    const before = readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8');
    const refused = await m.call('create_task', { title: 'x', stream: 'work' });
    assert.ok(refused.isError);
    assert.match(refused.text, /PROPOSE_ONLY/);
    const refused2 = await m.call('apply_changes', { ops: [{ op: 'task.complete', id: 'u-1-aaa' }] });
    assert.match(refused2.text, /PROPOSE_ONLY/);
    const p = (await m.call('propose_changes', { ops: [{ op: 'task.complete', id: 'u-1-aaa' }, { op: 'task.bin', id: 'u-3-ccc' }], note: 'clean up' })).json;
    assert.match(p.proposalId, /^prop_/);
    assert.equal(p.preview.length, 2);
    assert.equal(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'), before, 'state untouched');
    const j = JSON.parse(readFileSync(join(dir, 'state', 'actions-journal.json'), 'utf8'));
    assert.equal(j.proposals[p.proposalId].status, 'pending');
    assert.equal(j.proposals[p.proposalId].source, 'assistant');
    const bad = await m.call('propose_changes', { ops: [{ op: 'task.complete', id: 'nope' }] });
    assert.ok(bad.isError, 'invalid proposals come back as errors');
  } finally { await m.stop(); rmSync(dir, { recursive: true, force: true }); }
});

test('a stale runtime.json (dead process) is ignored: embedded mode', async () => {
  const dir = makeDataDir();
  writeFileSync(join(dir, 'runtime.json'), JSON.stringify({ app: 'dashboard', pid: 999999, port: 1 }));
  const m = startMcp(dir);
  try {
    await init(m);
    const r = await m.call('get_context');
    assert.equal(r.json.today, TODAY);
    assert.match(m.stderr(), /embedded mode.*not running/);
  } finally { await m.stop(); rmSync(dir, { recursive: true, force: true }); }
});

test('a data folder that was never set up says what to run', async () => {
  const dir = makeDataDir();
  rmSync(join(dir, 'state'), { recursive: true, force: true });
  const m = startMcp(dir);
  try {
    await init(m);
    const r = await m.call('get_context');
    if (existsSync(join(HERE, '..', 'state', 'dashboard-state.json'))) {
      // a checkout that still has the pre-2.0 state/ folder: refuse and give the command
      assert.ok(r.isError);
      assert.match(r.text, /NOT_SET_UP/);
      assert.match(r.text, /migrate/);
    } else {
      assert.equal(r.json.counts.open, 0);   // a brand-new user simply starts empty
    }
  } finally { await m.stop(); rmSync(dir, { recursive: true, force: true }); }
});

// ─── HTTP mode, auth and live sync against a real server ───────────────────
let srv, port, sdir;
function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
function http(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers } }, (r) => {
      let data = ''; r.setEncoding('utf8'); r.on('data', d => { data += d; });
      r.on('end', () => { let json = null; try { json = JSON.parse(data); } catch {} resolve({ status: r.statusCode, json, text: data }); });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
function sse() {
  const events = [];
  const req = request({ host: '127.0.0.1', port, path: '/api/events', headers: { Host: `localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' } }, (r) => {
    let buf = ''; r.setEncoding('utf8');
    r.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = /event: (\w+)/.exec(block), data = /data: (.*)/.exec(block);
        if (ev && data) events.push({ event: ev[1], data: JSON.parse(data[1]) });
      }
    });
  });
  req.end();
  const waitFor = async (pred, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const e = events.find(pred); if (e) return e; await new Promise(r => setTimeout(r, 50)); } throw new Error('no matching event: ' + JSON.stringify(events)); };
  return { events, waitFor, close: () => req.destroy() };
}

before(async () => {
  sdir = makeDataDir();
  process.env.CLAUDE_CLI_PATH = FAKE;
  process.env.FAKE_CLAUDE_MODE = 'ok';
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(FAKE);
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', sdir]);
});
after(async () => {
  await srv?.close();
  delete process.env.CLAUDE_CLI_PATH; delete process.env.FAKE_CLAUDE_MODE;
  rmSync(sdir, { recursive: true, force: true });
});

test('HTTP auth: the page (same-origin) or the local token; nothing else', async () => {
  const token = readFileSync(join(sdir, 'local-token'), 'utf8').trim();
  assert.match(token, /^[0-9a-f]{64}$/);
  const rt = JSON.parse(readFileSync(join(sdir, 'runtime.json'), 'utf8'));
  assert.equal(rt.port, port);
  assert.equal(rt.pid, process.pid);
  assert.equal((await http('GET', '/api/query?op=context.get')).status, 401);
  assert.equal((await http('GET', '/api/query?op=context.get', { headers: { 'X-Dashboard-Token': 'nope' } })).status, 401);
  assert.equal((await http('GET', '/api/query?op=tasks.list&view=today&limit=1', { headers: { 'X-Dashboard-Token': token } })).json.count, 1);
  assert.equal((await http('GET', '/api/query?op=tasks.list&limit=1', { headers: { 'Sec-Fetch-Site': 'same-origin' } })).json.count, 1);
  assert.equal((await http('POST', '/api/actions', { body: { ops: [] } })).status, 401);
  assert.equal((await http('POST', '/api/actions', { body: { ops: [] }, headers: { Origin: 'http://evil.example' } })).status, 403);
  assert.equal((await http('POST', '/api/actions', { body: { ops: [] }, headers: { Host: 'evil.example' } })).status, 421);
  const bad = await http('POST', '/api/actions', { body: { ops: [{ op: 'task.update', id: 'u-1-aaa', stream: 'nope' }] }, headers: { Origin: `http://localhost:${port}` } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error.code, 'UNKNOWN_STREAM');
  assert.ok(bad.json.error.valid.includes('thesis'));
  // over the 2 MB body limit: 413 before the body is read
  const big = await new Promise((resolve) => {
    const s = connect(port, '127.0.0.1', () => s.write(`POST /api/actions HTTP/1.1\r\nHost: localhost:${port}\r\nContent-Type: application/json\r\nX-Dashboard-Token: ${token}\r\nContent-Length: ${3 * 1024 * 1024}\r\n\r\n{`));
    let data = '';
    s.on('data', d => { data += d; if (/\r\n\r\n/.test(data)) { s.destroy(); resolve(data); } });
    s.on('error', () => resolve(data));
  });
  assert.match(big, /^HTTP\/1\.1 413/);
  const info = await http('GET', '/api/mcp-info', { headers: { 'X-Dashboard-Token': token } });
  assert.ok(info.json.claudeCode);
  assert.ok(JSON.stringify(info.json).includes('mcp__dashboard__get_context'));
  const schema = await http('GET', '/api/actions/schema', { headers: { 'X-Dashboard-Token': token } });
  assert.ok(schema.json.ops.length >= 26);
});

test('HTTP mode: the MCP server finds the running dashboard and the open tab hears about it (SSE)', async () => {
  const tab = sse();
  const hello = await tab.waitFor(e => e.event === 'hello');
  const m = startMcp(sdir);
  try {
    await init(m);
    const r = (await m.call('create_task', { title: 'Made over HTTP', stream: 'work', dueDate: TODAY })).json;
    assert.equal(r.ok, true);
    assert.match(m.stderr(), new RegExp(`running dashboard on port ${port}`));
    const ev = await tab.waitFor(e => e.event === 'state' && e.data.version === r.version);
    assert.ok(ev.data.version > hello.data.version);
    assert.equal(ev.data.source, 'mcp');
    assert.equal(ev.data.client, 'test-client 1.0');
    assert.equal(ev.data.undo, r.undo);
    assert.match(ev.data.summary, /Made over HTTP/);
  } finally { await m.stop(); }

  // a write by another process (embedded mode, scripts) is picked up by the file watcher
  const { createActions } = await import('../server/actions/index.mjs');
  const other = createActions({ dataDir: sdir });
  const r2 = await other.apply({ ops: [{ op: 'task.set_priority', id: 'u-2-bbb', priority: 'p3' }], source: 'script', client: 'nightly-sync' });
  const ev2 = await tab.waitFor(e => e.event === 'state' && e.data.version === r2.version);
  assert.equal(ev2.data.source, 'script');
  assert.equal(ev2.data.client, 'nightly-sync');

  // the tab's whole-state save on an old version is refused, so it merges instead of overwriting
  const st = await http('GET', '/api/state');
  const old = { ...st.json, _lastSave: hello.data.version };
  assert.equal((await http('PUT', '/api/state', { body: old })).status, 409);
  tab.close();
});

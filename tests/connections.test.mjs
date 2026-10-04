// lib/connections.mjs: status checks for Claude, the claude.ai connectors and
// the dashboard MCP; caching in connections.json; hourly re-checks; finding
// an installed MCP entry. The runner and the AI probe are injected fakes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createConnections, installStatus, stateOf, testMcp, STALE_MS } from '../lib/connections.mjs';
import { ensureDataDir } from '../lib/datadir.mjs';
import { ClaudeError } from '../lib/claude-runner.mjs';

let root;
before(() => { root = mkdtempSync(join(tmpdir(), 'conn-test-')); });
after(() => rmSync(root, { recursive: true, force: true }));

const toolLines = (tool, { text = '{"ok":true}', isError = false } = {}) => [
  JSON.stringify({ type: 'system', subtype: 'init', tools: [tool] }),
  JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'u1', name: tool, input: {} }] } }),
  JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'u1', content: text, is_error: isError }] } }),
  JSON.stringify({ type: 'result', result: 'OK' }),
];
const aiOk = { aiStatus: async () => ({ available: true, at: Date.now() }), aiStatusCached: () => ({ available: true, at: Date.now() }) };
const aiOff = { aiStatus: async () => ({ available: false, code: 'NOT_SIGNED_IN', message: 'Claude Code is not signed in.', at: Date.now() }), aiStatusCached: () => null };

async function dir(name) { const d = join(root, name); await ensureDataDir(d); return d; }

test('state mapping covers every stored status', () => {
  assert.equal(stateOf('connected'), 'ok');
  for (const s of ['signed-out', 'needs-auth']) assert.equal(stateOf(s), 'auth');
  for (const s of ['not-installed', 'missing', 'needs-claude', 'not-set-up']) assert.equal(stateOf(s), 'setup');
  assert.equal(stateOf('limited'), 'limited');
  assert.equal(stateOf('error'), 'error');
  assert.equal(stateOf(undefined), 'unknown');
});

test('connector checks: connected, needs sign-in, missing (after one retry), and the result is cached', async () => {
  const d = await dir('a');
  const calls = [];
  const plan = {
    gmail: [() => ({ lines: toolLines('mcp__claude_ai_Gmail__list_labels', { isError: true, text: 'MCP server "claude.ai Gmail" needs you to sign in again (run /mcp to re-authenticate)' }) })],
    calendar: [() => ({ lines: toolLines('mcp__claude_ai_Google_Calendar__list_calendars') })],
    bank: [() => { throw new ClaudeError('TOOL_MISSING', 'Bank is not connected'); }, () => { throw new ClaudeError('TOOL_MISSING', 'Bank is not connected'); }],
  };
  const runner = async ({ profile, model, prompt }) => {
    const id = profile.split(':')[1];
    calls.push({ profile, model });
    assert.equal(model, 'claude-haiku-4-5');
    assert.ok(prompt.length < 200);
    return plan[id].shift()();
  };
  const c = createConnections({ dataDir: d, runner, ai: aiOk, mcpTest: async () => ({ ok: true, tools: 9 }), retryDelayMs: 1 });
  assert.equal((await c.check('gmail')).status, 'needs-auth');
  assert.equal((await c.check('calendar')).status, 'connected');
  const bank = await c.check('bank');
  assert.equal(bank.status, 'missing');
  assert.equal(calls.filter(x => x.profile === 'probe:bank').length, 2, 'TOOL_MISSING is retried once (connectors can still be starting)');
  const saved = JSON.parse(readFileSync(join(d, 'connections.json'), 'utf8'));
  assert.equal(saved.gmail.status, 'needs-auth');
  assert.ok(saved.calendar.checkedAt);
  const all = await c.list();
  assert.equal(all.gmail.state, 'auth'); assert.equal(all.calendar.state, 'ok'); assert.equal(all.bank.state, 'setup');
  for (const id of ['claude', 'gmail', 'calendar', 'bank', 'mcp', 'google']) assert.ok(all[id], id);
  assert.ok(!JSON.stringify(saved).match(/password|secret|token"/i), 'nothing secret stored');
});

test('a model that answers without calling the tool is retried, then reported', async () => {
  const d = await dir('b');
  let n = 0;
  const runner = async () => { n++; return { lines: [JSON.stringify({ type: 'result', result: 'OK' })] }; };
  const c = createConnections({ dataDir: d, runner, ai: aiOk, retryDelayMs: 1 });
  const r = await c.check('calendar');
  assert.equal(n, 2);
  assert.equal(r.status, 'error'); assert.equal(r.code, 'BAD_OUTPUT');
});

test('connectors are not probed while Claude itself is not connected', async () => {
  const d = await dir('c');
  let ran = 0;
  const c = createConnections({ dataDir: d, runner: async () => { ran++; return { lines: [] }; }, ai: aiOff });
  const r = await c.check('gmail');
  assert.equal(r.status, 'needs-claude');
  assert.equal(ran, 0);
  const cl = await c.check('claude');
  assert.equal(cl.status, 'signed-out');
  assert.equal((await c.list()).claude.state, 'auth');
});

test('concurrent checks of one connection share a single run; unknown ids are refused', async () => {
  const d = await dir('d');
  let ran = 0;
  const runner = async () => { ran++; await new Promise(r => setTimeout(r, 30)); return { lines: toolLines('mcp__claude_ai_Google_Calendar__list_calendars') }; };
  const c = createConnections({ dataDir: d, runner, ai: aiOk });
  const [a, b] = await Promise.all([c.check('calendar'), c.check('calendar')]);
  assert.equal(ran, 1); assert.equal(a.status, b.status);
  assert.throws(() => c.check('dropbox'), /unknown connection/);
});

test('re-checks run at most hourly: fresh entries are left alone', async () => {
  const d = await dir('e');
  const t0 = Date.parse('2026-05-01T09:00:00Z');
  let clock = t0;
  const ran = [];
  const runner = async ({ profile }) => { ran.push(profile); return { lines: toolLines({ 'probe:gmail': 'mcp__claude_ai_Gmail__list_labels', 'probe:calendar': 'mcp__claude_ai_Google_Calendar__list_calendars', 'probe:bank': 'mcp__claude_ai_Bank__list_transaction_accounts' }[profile]) }; };
  const ai = { aiStatus: async () => ({ available: true, at: clock }), aiStatusCached: () => ({ available: true, at: clock }) };
  const c = createConnections({ dataDir: d, runner, ai, mcpTest: async () => ({ ok: true, tools: 3 }), now: () => clock });
  // Each pass is awaited (no fixed sleeps: a busy CI runner can be far slower than usual).
  // first: nothing checked yet -> every connector runs (Claude itself was just probed)
  assert.deepEqual(await c.checkStale(), ['gmail', 'calendar', 'bank', 'mcp']);
  assert.deepEqual(ran.sort(), ['probe:bank', 'probe:calendar', 'probe:gmail']);
  // the stored checkedAt is real time; move the fake clock to "now" so nothing is stale
  clock = Date.now();
  ran.length = 0;
  assert.deepEqual(await c.checkStale(), []);
  assert.deepEqual(ran, [], 'checked less than an hour ago');
  clock = Date.now() + STALE_MS + 1000;
  assert.deepEqual(await c.checkStale(), ['gmail', 'calendar', 'bank', 'mcp']);
  assert.equal(ran.length, 3, 'an hour later they are checked again');
});

test('installStatus finds our MCP entry in Claude Code and Claude Desktop configs (read-only)', async () => {
  const home = join(root, 'home');
  const data = join(root, 'datax');
  mkdirSync(join(home, 'AppData', 'Roaming', 'Claude'), { recursive: true });
  const ours = fileURLToPath(new URL('../mcp/server.mjs', import.meta.url));
  writeFileSync(join(home, '.claude.json'), JSON.stringify({ mcpServers: { dashboard: { command: 'node', args: [ours, '--data-dir', data] }, other: { command: 'x', args: ['y'] } } }));
  writeFileSync(join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'), JSON.stringify({ mcpServers: { dash: { command: 'node', args: ['D:/elsewhere/mcp/server.mjs'] } } }));
  const s = installStatus({ dataDir: data, home, env: { APPDATA: join(home, 'AppData', 'Roaming') }, platform: 'win32' });
  assert.equal(s.summary.claudeCode, 'installed');
  assert.equal(s.summary.desktop, 'other-copy');
  assert.equal(s.entries.length, 2, 'only dashboard entries are reported');
  assert.equal(installStatus({ dataDir: data, home: join(root, 'nobody'), env: {}, platform: 'linux' }).summary.claudeCode, 'not-installed');
});

test('testMcp speaks to the real MCP server (propose mode): initialize, tools/list, get_context', async () => {
  const d = await dir('mcp');
  writeFileSync(join(d, 'state', 'dashboard-state.json'), JSON.stringify({ custom: [{ id: 't1', title: 'Write the report' }], _lastSave: 1 }));
  const r = await testMcp({ dataDir: d, timeoutMs: 20000 });
  assert.equal(r.ok, true, r.error);
  assert.ok(r.tools > 3);
  assert.match(String(r.today || ''), /^\d{4}-\d{2}-\d{2}/);
  assert.equal(r.empty, false, 'a data folder with a state file is not empty');
});

// The same on a fresh clone and on a checkout that still has a pre-2.0 state/
// folder (there the server answers NOT_SET_UP): empty comes from the data folder.
test('testMcp on a brand-new data folder: the server answers, there is just nothing to read yet', async () => {
  const d = await dir('mcp-empty');
  const r = await testMcp({ dataDir: d, timeoutMs: 20000 });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.empty, true);
  assert.ok(r.tools > 3, 'the tools are listed even with nothing to read');
});

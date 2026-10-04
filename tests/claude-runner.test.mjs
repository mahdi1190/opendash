// lib/claude-runner.mjs against a fake CLI (tests/fixtures/fake-claude.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  buildArgs, runClaude, setCliPath, ClaudeError, classifyFailure, MODELS, EFFORTS, CONNECTORS, queueStats, resolveCli,
} from '../lib/claude-runner.mjs';

const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude.mjs');
let dir, log;
before(() => {
  dir = mkdtempSync(join(tmpdir(), 'runner-test-'));
  log = join(dir, 'calls.jsonl');
  setCliPath(FAKE);
  process.env.FAKE_CLAUDE_LOG = log;
});
after(() => { setCliPath(null); delete process.env.FAKE_CLAUDE_LOG; delete process.env.FAKE_CLAUDE_MODE; rmSync(dir, { recursive: true, force: true }); });
const mode = (m) => { process.env.FAKE_CLAUDE_MODE = m; };
const flagValue = (args, f) => args[args.indexOf(f) + 1];

test('allowlists: exactly the three models and three efforts', () => {
  assert.deepEqual([...MODELS], ['claude-opus-5-5', 'claude-sonnet-5', 'claude-haiku-4-5']);
  assert.deepEqual([...EFFORTS], ['low', 'medium', 'high']);
  assert.throws(() => buildArgs('text', { model: 'gpt-4' }), e => e.code === 'BAD_REQUEST');
  assert.throws(() => buildArgs('text', { effort: 'max' }), e => e.code === 'BAD_REQUEST');
  assert.throws(() => buildArgs('nope', {}), e => e.code === 'BAD_REQUEST');
});

test("text profile: no tools, no MCP, dontAsk, a system prompt, effort passed", () => {
  const { args } = buildArgs('text', { model: 'claude-opus-5-5', effort: 'medium', systemPrompt: 'SYS' });
  assert.equal(flagValue(args, '--tools'), '');
  assert.ok(args.includes('--strict-mcp-config'));
  assert.equal(flagValue(args, '--permission-mode'), 'dontAsk');
  assert.equal(flagValue(args, '--system-prompt'), 'SYS');
  assert.equal(flagValue(args, '--model'), 'claude-opus-5-5');
  assert.equal(flagValue(args, '--effort'), 'medium');
  assert.ok(args.includes('--no-session-persistence'));
  assert.ok(!args.includes('--allowedTools'));
});

test('json profile adds --json-schema', () => {
  const { args } = buildArgs('json', { jsonSchema: { type: 'object' } });
  assert.equal(flagValue(args, '--json-schema'), '{"type":"object"}');
});

test('bank-read profile: only read-only Bank tools allowed, writes and other connectors denied, no user settings', () => {
  const { args, policy } = buildArgs('bank-read', {});
  const allowed = flagValue(args, '--allowedTools').split(',');
  const denied = flagValue(args, '--disallowedTools').split(',');
  assert.deepEqual(allowed, CONNECTORS.bank.read.map(t => CONNECTORS.bank.prefix + t));
  assert.ok(denied.includes('mcp__claude_ai_Bank__categorise_transactions'));
  assert.ok(denied.includes('mcp__claude_ai_Bank__create_manual_asset'));
  assert.ok(denied.includes('mcp__claude_ai_Gmail'));
  assert.ok(denied.includes('mcp__claude_ai_Google_Calendar'));
  assert.ok(!denied.includes('mcp__claude_ai_Bank'), 'its own server is not blanket-denied');
  assert.equal(flagValue(args, '--setting-sources'), '');
  assert.equal(flagValue(args, '--tools'), '');
  assert.equal(flagValue(args, '--permission-mode'), 'dontAsk');
  assert.equal(policy.server, 'claude.ai Bank');
  // callers may narrow but never widen
  assert.throws(() => buildArgs('bank-read', { allowedTools: ['create_debt'] }), e => e.code === 'BAD_REQUEST');
  const narrowed = buildArgs('bank-read', { allowedTools: ['list_transaction_accounts'] });
  assert.equal(flagValue(narrowed.args, '--allowedTools'), 'mcp__claude_ai_Bank__list_transaction_accounts');
});

test('calendar-read and gmail-read deny every write tool', () => {
  for (const [p, c] of [['calendar-read', CONNECTORS.calendar], ['gmail-read', CONNECTORS.gmail]]) {
    const { args } = buildArgs(p, {});
    const allowed = flagValue(args, '--allowedTools').split(',');
    const denied = flagValue(args, '--disallowedTools').split(',');
    for (const t of allowed) assert.ok(c.read.includes(t.replace(c.prefix, '')));
    for (const t of c.known.filter(k => !c.read.includes(k))) assert.ok(denied.includes(c.prefix + t), `${p} must deny ${t}`);
  }
});

test('probe profile allows exactly one tool', () => {
  const { args } = buildArgs('probe:gmail', {});
  assert.equal(flagValue(args, '--allowedTools'), 'mcp__claude_ai_Gmail__list_labels');
  assert.throws(() => buildArgs('probe:slack', {}), e => e.code === 'BAD_REQUEST');
});

test('mcp-propose: only dashboard read/propose tools, strict MCP config', () => {
  const ok = buildArgs('mcp-propose', { mcpConfig: { mcpServers: {} }, allowedTools: ['mcp__dashboard__list_tasks', 'mcp__dashboard__propose_changes'] });
  assert.ok(ok.args.includes('--strict-mcp-config'));
  assert.ok(ok.args.includes('--mcp-config'));
  assert.throws(() => buildArgs('mcp-propose', { mcpConfig: {}, allowedTools: ['mcp__dashboard__apply_changes'] }), e => e.code === 'BAD_REQUEST');
  assert.throws(() => buildArgs('mcp-propose', { mcpConfig: {}, allowedTools: ['Bash'] }), e => e.code === 'BAD_REQUEST');
  assert.throws(() => buildArgs('mcp-propose', { allowedTools: ['mcp__dashboard__list_tasks'] }), e => e.code === 'BAD_REQUEST');
});

test('runs the CLI with array args and the prompt on stdin', async () => {
  mode('ok');
  const prompt = 'a prompt with "quotes" & <angle> brackets\nand a newline';
  const r = await runClaude({ profile: 'text', prompt });
  assert.equal(r.text, `echo:${prompt.length}`);
  const calls = readFileSync(log, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(c => c.argv);
  const last = calls[calls.length - 1];
  assert.equal(last.stdin, prompt);
  assert.ok(!last.argv.some(a => a.includes('angle')), 'prompt never goes on the command line');
});

test('json profile returns structured output', async () => {
  mode('ok');
  const r = await runClaude({ profile: 'json', prompt: 'x', jsonSchema: { type: 'object' } });
  assert.deepEqual(r.json, { ok: true, n: 3 });
});

test('typed errors', async () => {
  mode('not-signed-in');
  await assert.rejects(runClaude({ prompt: 'x' }), e => e instanceof ClaudeError && e.code === 'NOT_SIGNED_IN');
  mode('usage-limit');
  await assert.rejects(runClaude({ prompt: 'x' }), e => e.code === 'USAGE_LIMIT' && e.status === 429);
  mode('garbage');
  await assert.rejects(runClaude({ prompt: 'x' }), e => e.code === 'BAD_OUTPUT');
  mode('crash');
  await assert.rejects(runClaude({ prompt: 'x' }), e => e.code === 'CLI_FAILED' && /exploded/.test(e.message));
  mode('hang');
  await assert.rejects(runClaude({ prompt: 'x', timeoutMs: 300 }), e => e.code === 'TIMEOUT' && e.status === 504);
  await assert.rejects(runClaude({ prompt: '' }), e => e.code === 'BAD_REQUEST');
});

test('CLI_MISSING when the executable does not exist', async () => {
  setCliPath(join(dir, 'no-such-claude.exe'));
  try { await assert.rejects(runClaude({ prompt: 'x' }), e => e.code === 'CLI_MISSING'); }
  finally { setCliPath(FAKE); }
});

test('connector runs stop early when the connector needs auth or is missing', async () => {
  mode('connector-needs-auth');
  await assert.rejects(runClaude({ profile: 'bank-read', prompt: 'x' }), e => e.code === 'CONNECTOR_AUTH' && e.connector === 'bank');
  // Timed from the fake's own start (its start-up can take seconds on a busy runner):
  // it waits 5 s after printing init, so an answer sooner means it was stopped.
  const startedAt = readFileSync(log, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(r => r.t0).at(-1).t0;
  assert.ok(Date.now() - startedAt < 5000, 'killed before the fake finished');
  mode('connector-missing');
  await assert.rejects(runClaude({ profile: 'bank-read', prompt: 'x' }), e => e.code === 'TOOL_MISSING');
});

test('a tool outside the profile kills the run (POLICY)', async () => {
  mode('policy');
  await assert.rejects(runClaude({ profile: 'bank-read', prompt: 'x' }), e => e.code === 'POLICY');
});

test('stream profile returns lines and events for the caller to parse', async () => {
  mode('connector-ok');
  const seen = [];
  const r = await runClaude({ profile: 'bank-read', prompt: 'x', onLine: (l) => seen.push(l) });
  assert.ok(r.lines.length >= 4);
  assert.ok(seen.some(l => l.includes('"tool_use"')));
  assert.equal(r.init.mcp_servers[0].status, 'connected');
});

test('at most 2 CLI processes run at once; the rest queue', async () => {
  mode('ok');
  process.env.FAKE_CLAUDE_DELAY_MS = '300';
  const before = readFileSync(log, 'utf8').length;
  try {
    const runs = Array.from({ length: 5 }, (_, i) => runClaude({ prompt: 'q' + i }));
    await new Promise(r => setTimeout(r, 100));
    assert.ok(queueStats().running <= 2);
    await Promise.all(runs);
  } finally { delete process.env.FAKE_CLAUDE_DELAY_MS; }
  // Reconstruct overlap from start/end records.
  const recs = readFileSync(log, 'utf8').slice(before).trim().split('\n').map(l => JSON.parse(l));
  const ev = [];
  for (const r of recs) { if (r.argv) ev.push([r.t0, 1]); if (r.end) ev.push([r.end, -1]); }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, max = 0;
  for (const [, d] of ev) { cur += d; max = Math.max(max, cur); }
  assert.ok(max <= 2, `max concurrent was ${max}`);
  assert.equal(queueStats().running, 0);
});

test('classifyFailure maps messages to codes', () => {
  assert.equal(classifyFailure('Invalid API key · Please run /login'), 'NOT_SIGNED_IN');
  assert.equal(classifyFailure('Claude AI usage limit reached|1700000000'), 'USAGE_LIMIT');
  assert.equal(classifyFailure('Gmail needs you to sign in again'), 'CONNECTOR_AUTH');
  assert.equal(classifyFailure('weird'), 'CLI_FAILED');
});

test('resolveCli honours CLAUDE_CLI_PATH and never returns a .cmd shim by default', () => {
  assert.equal(resolveCli({ CLAUDE_CLI_PATH: 'X:/c.exe' }, 'win32'), 'X:/c.exe');
  const r = resolveCli({ PATH: '' , APPDATA: dir, LOCALAPPDATA: dir, USERPROFILE: dir }, 'win32');
  assert.ok(!/\.cmd$/i.test(r));
});

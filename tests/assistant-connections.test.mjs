import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assistantFacts, codexExecutable, codexRegistration, connectCodex, geminiExecutable, geminiRegistration, connectGemini } from '../lib/assistant-connections.mjs';
import { SERVER_PATH } from '../mcp/install.mjs';

test('provider states distinguish local tools from browser and embedded assistant support', () => {
  const scope = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../src/app/56-assistant-cards.js', import.meta.url), 'utf8'), scope);
  const state = (id, all) => scope.assistantConnectionState(id, all);
  assert.equal(state('claude', { claude: { state: 'ok' }, mcp: { installed: {} } }), 'Ready to set up');
  assert.equal(state('claude', { claude: { state: 'ok' }, mcp: { installed: { claudeCode: 'installed' } } }), 'Connected');
  assert.equal(state('codex', { assistants: { codex: { configured: true } } }), 'Tools configured');
  assert.equal(state('grok', {}), 'Browser connector unavailable');
  assert.equal(state('gemini', { assistants: { gemini: { installed: true } } }), 'Ready to connect');
  assert.equal(state('gemini', { assistants: { gemini: { configured: true } } }), 'Tools configured');
  assert.equal(vm.runInContext('ASSISTANT_OPTIONS.length', scope), 4);
});

test('Gemini registers user-scope stdio tools through existing CLI, preserves permissions and conflicts', async () => {
  const home = mkdtempSync(join(tmpdir(), 'od-gemini-'));
  try {
    const script = join(home, 'gemini.js'); writeFileSync(script, '');
    const env = { OPENDASH_GEMINI_PATH: script };
    const dataDir = join(home, 'data with spaces');
    const calls = [];
    const opts = { dataDir, env, home, platform: 'win32', run: async (...args) => { calls.push(args); } };
    const r = await connectGemini(opts);
    assert.equal(r.configured, true); assert.equal(calls[0][0], process.execPath);
    assert.deepEqual(calls[0][1], [script, 'mcp', 'add', '--scope', 'user', '--transport', 'stdio', r.name, process.execPath, SERVER_PATH, '--', '--data-dir', dataDir]);
    assert.equal(calls[0][2].shell, false); assert.ok(!calls[0][1].includes('--trust'));
    mkdirSync(join(home, '.gemini'));
    const settings = join(home, '.gemini', 'settings.json');
    writeFileSync(settings, JSON.stringify({ mcpServers: { [r.name]: { command: process.execPath, args: [SERVER_PATH, '--data-dir', dataDir] } }, other: { keep: true } }));
    assert.equal(geminiRegistration(opts).configured, true);
    assert.equal((await connectGemini(opts)).already, true); assert.equal(calls.length, 1);
    writeFileSync(settings, JSON.stringify({ mcpServers: { [r.name]: { command: 'other', args: [] } } }));
    await assert.rejects(connectGemini(opts), { status: 409 }); assert.equal(calls.length, 1);
    writeFileSync(settings, '// unfamiliar JSON with comments');
    await assert.rejects(connectGemini(opts), { status: 409 }); assert.equal(calls.length, 1);
    assert.equal(geminiExecutable({ env: { OPENDASH_GEMINI_PATH: join(home, 'gemini.cmd') }, home, exists: () => false }), null);
    assert.equal(assistantFacts(opts).gemini.installed, true);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('Codex setup runs fixed argv without a shell, is repeatable, and refuses conflicting entries', async () => {
  const home = mkdtempSync(join(tmpdir(), 'od-assistants-'));
  try {
    const executable = join(home, 'codex.exe'); writeFileSync(executable, '');
    const env = { OPENDASH_CODEX_PATH: executable, CODEX_HOME: join(home, '.codex') };
    const dataDir = join(home, 'data with spaces');
    const calls = [];
    const opts = { dataDir, env, home, platform: 'win32', run: async (...args) => { calls.push(args); } };
    const r = await connectCodex(opts);
    assert.equal(r.configured, true); assert.equal(calls.length, 1);
    assert.equal(calls[0][0], executable);
    assert.deepEqual(calls[0][1], ['mcp', 'add', r.name, '--', process.execPath, SERVER_PATH, '--data-dir', dataDir]);
    assert.equal(calls[0][2].shell, false);
    mkdirSync(env.CODEX_HOME);
    writeFileSync(join(env.CODEX_HOME, 'config.toml'), `[mcp_servers.${r.name}]\ncommand = ${JSON.stringify(process.execPath)}\nargs = ${JSON.stringify([SERVER_PATH, '--data-dir', dataDir])}\n`);
    assert.equal(codexRegistration(opts).configured, true);
    assert.equal((await connectCodex(opts)).already, true); assert.equal(calls.length, 1);
    writeFileSync(join(env.CODEX_HOME, 'config.toml'), `[mcp_servers.${r.name}]\ncommand = "other"\nargs = []\n`);
    await assert.rejects(connectCodex(opts), { status: 409 }); assert.equal(calls.length, 1);
    assert.equal(assistantFacts(opts).browser.supported, false);
    assert.equal(assistantFacts(opts).claudeDesktop.required, false);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('no provider detection accepts Windows shell shims or arbitrary executable names', () => {
  assert.equal(codexExecutable({ env: { OPENDASH_CODEX_PATH: 'bad.cmd' }, home: '/none', platform: 'win32', exists: () => true }), join('/none', '.local', 'bin', 'codex.exe'));
  assert.equal(codexExecutable({ env: {}, home: '/none', exists: () => false }), null);
});

test('one Link Claude action uses local setup flow for existing and missing CLI, without model probes or client-side installer commands', async () => {
  const calls = [];
  let installed = true;
  const scope = vm.createContext({
    Connections: { all: () => ({ cli: { installed } }) },
    fetch: async (path, options) => { calls.push(options && options.method === 'POST' ? 'link' : 'status'); assert.ok(path.startsWith('/api/connections/local-claude')); return { ok: true, json: async () => options && options.method === 'POST' ? { busy: true, phase: 'awaiting-login' } : { busy: false, connected: true, phase: 'connected' } }; },
    setTimeout: resolve => resolve(),
    connRefresh: async () => { calls.push('refresh'); },
    connCheck: () => { throw new Error('must not run a model check'); },
    toast: () => {},
  });
  vm.runInContext(readFileSync(new URL('../src/app/56-assistant-cards.js', import.meta.url), 'utf8'), scope);
  // Replace the guide at its existing binding, keeping the real Connect flow.
  scope.guide = () => calls.push('guide');
  vm.runInContext('assistantConnectionGuide = guide', scope);
  await scope.assistantConnect('claude', () => {});
  assert.deepEqual(calls, ['link', 'status', 'refresh']);
  calls.length = 0; installed = false;
  await scope.assistantConnect('claude', () => {});
  assert.deepEqual(calls, ['link', 'status', 'refresh']);
  calls.length = 0; installed = true;
  await scope.assistantConnect('claude', () => {});
  assert.deepEqual(calls, ['link', 'status', 'refresh']);
});

test('optional Claude browser opens popup synchronously, hands off only after native launch and preserves confirmation guidance', async () => {
  const calls = [], notices = [];
  const popup = { opener: {}, closed: false, location: { replace: url => calls.push(['navigate', url]) }, close: () => calls.push('close') };
  const final = { connected: true, busy: false, phase: 'browser-opened', browserReady: false, browserUrl: 'https://claude.ai/code', message: 'Finish terminal confirmations, then select OpenDash.' };
  const scope = vm.createContext({ URL, window: { open: () => { calls.push('popup'); return popup; } }, setTimeout: resolve => resolve(),
    fetch: async (path, options) => { calls.push(path); return { ok: true, json: async () => options && options.method === 'POST' ? { busy: true, phase: 'opening-browser' } : final }; },
    connRefresh: async () => calls.push('refresh'), toast: (message) => notices.push(message), connCheck: () => assert.fail('no model check') });
  vm.runInContext(readFileSync(new URL('../src/app/56-assistant-cards.js', import.meta.url), 'utf8'), scope);
  await scope.assistantConnect('claude', () => {}, 'browser');
  assert.equal(calls[0], 'popup'); assert.equal(calls[1], '/api/connections/local-claude/browser');
  assert.equal(popup.opener, null); assert.deepEqual(calls.at(-2), ['navigate', 'https://claude.ai/code']);
  assert.ok(notices[0].includes('Finish terminal confirmations')); assert.ok(!notices[0].includes('Connected Claude is open'));
});

test('blocked popup offers an explicit browser action; failed browser launch keeps local connection and closes blank popup', async () => {
  for (const failed of [false, true]) {
    const notices = [], calls = [];
    const popup = failed ? { closed: false, close: () => calls.push('close') } : null;
    const flow = failed ? { connected: true, busy: false, phase: 'browser-error', message: 'Local connection remains ready; terminal unavailable.' } : { connected: true, busy: false, phase: 'browser-opened', browserReady: false, browserUrl: 'https://claude.ai/code', message: 'Select OpenDash.' };
    const scope = vm.createContext({ URL, window: { open: () => popup }, fetch: async () => ({ ok: true, json: async () => flow }),
      connRefresh: async () => {}, toast: message => notices.push(message), _connBtn: (label, _icon, _style, click) => ({ label, click }) });
    vm.runInContext(readFileSync(new URL('../src/app/56-assistant-cards.js', import.meta.url), 'utf8'), scope);
    await scope.assistantConnect('claude', () => {}, 'browser');
    assert.equal(scope.assistantBrowserButton({ id: 'claude' }, {}, () => {}).label, 'Open connected Claude');
    assert.ok(notices[0].includes(failed ? 'Local connection remains ready' : 'Press Open connected Claude'));
    assert.equal(calls.includes('close'), failed);
    assert.equal(scope.localClaudeProgress({}).connected, true);
  }
});

test('Claude browser URL gate rejects external origins and unverified session URLs', () => {
  const scope = vm.createContext({ URL });
  vm.runInContext(readFileSync(new URL('../src/app/56-assistant-cards.js', import.meta.url), 'utf8'), scope);
  for (const browserUrl of ['https://evil.example/code', 'https://claude.ai.evil.example/code', 'javascript:alert(1)', 'https://user@claude.ai/code', 'https://claude.ai/chat/test']) {
    assert.equal(scope.localClaudeBrowserUrl({ browserReady: true, browserUrl }), null);
  }
  assert.equal(scope.localClaudeBrowserUrl({ phase: 'browser-opened', browserReady: false, browserUrl: 'https://claude.ai/code/unverified' }), null);
  assert.equal(scope.localClaudeBrowserUrl({ browserReady: true, browserUrl: 'https://claude.ai/code/session-test' }), 'https://claude.ai/code/session-test');
});

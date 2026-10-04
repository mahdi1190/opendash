import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assistantFacts, codexExecutable, codexRegistration, connectCodex } from '../lib/assistant-connections.mjs';
import { SERVER_PATH } from '../mcp/install.mjs';

test('provider states distinguish local tools from browser and embedded assistant support', () => {
  const scope = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../src/app/56-assistant-cards.js', import.meta.url), 'utf8'), scope);
  const state = (id, all) => scope.assistantConnectionState(id, all);
  assert.equal(state('claude', { claude: { state: 'ok' }, mcp: { installed: {} } }), 'Ready to set up');
  assert.equal(state('claude', { claude: { state: 'ok' }, mcp: { installed: { claudeCode: 'installed' } } }), 'Connected');
  assert.equal(state('codex', { assistants: { codex: { configured: true } } }), 'Tools configured');
  assert.equal(state('grok', {}), 'Browser connector unavailable');
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

test('one Claude action registers its tools before checking sign-in; setup never runs a provider installer', async () => {
  const calls = [];
  let installed = true, ready = false;
  const scope = vm.createContext({
    Connections: { all: () => ({ cli: { installed } }), has: () => ready },
    _connInstallMcp: async () => { calls.push('tools'); return true; },
    connCheck: async () => { calls.push('check'); },
    _connOpenTerminal: async () => { calls.push('sign-in'); },
    toast: () => {},
  });
  vm.runInContext(readFileSync(new URL('../src/app/56-assistant-cards.js', import.meta.url), 'utf8'), scope);
  // Replace the guide at its existing binding, keeping the real Connect flow.
  scope.guide = () => calls.push('guide');
  vm.runInContext('assistantConnectionGuide = guide', scope);
  await scope.assistantConnect('claude', () => {});
  assert.deepEqual(calls, ['tools', 'check', 'sign-in']);
  calls.length = 0; installed = false;
  await scope.assistantConnect('claude', () => {});
  assert.deepEqual(calls, ['guide']);
  calls.length = 0; installed = true; ready = true;
  await scope.assistantConnect('claude', () => {});
  assert.deepEqual(calls, ['tools', 'check']);
});

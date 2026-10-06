// Synthetic installer/auth/config dependencies; never changes a real Claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLocalClaudeConnect, matchingLocalMcp } from '../lib/local-claude-connect.mjs';
import { installInfo } from '../mcp/install.mjs';
import { installClaudeNative, openClaudeTerminal, openClaudeRemoteControl, setCliPath, refreshClaudeCli, claudeAuthStatus } from '../lib/claude-runner.mjs';

async function flowFixture(run, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'local-claude-flow-')), info = installInfo({ dataDir: dir }), calls = [];
  let installed = true, loggedIn = true, defs = {};
  const flow = createLocalClaudeConnect({ dataDir: dir, refreshCli: async () => { calls.push('lookup'); return { installed }; },
    authStatus: async () => { calls.push('auth'); return { loggedIn }; }, install: async () => { calls.push('install'); installed = true; },
    login: async () => { calls.push('login'); loggedIn = true; return { opened: true }; }, definitions: async () => defs,
    addMcp: async input => { calls.push('add'); defs[input.name] = { command: input.command, args: input.args }; },
    verifyMcp: async () => { calls.push('verify'); return { ok: true }; }, store: async (_dir, key) => calls.push('store:' + key),
    resetProbe: () => calls.push('reset-probe'), sleep: async () => {}, ...overrides });
  try { await run({ flow, calls, info, setInstalled: v => installed = v, setLoggedIn: v => loggedIn = v, setDefs: v => defs = v }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
test('Link Claude finds and reuses existing authenticated CLI, adds/verifies MCP without installer, login or model', async () => flowFixture(async ({ flow, calls }) => {
  assert.equal(flow.start().phase, 'checking'); flow.start();
  const done = await flow.settled(); assert.equal(done.connected, true);
  assert.deepEqual(calls, ['lookup', 'auth', 'add', 'auth', 'verify', 'reset-probe', 'store:claude', 'store:mcp']);
}));
test('Link Claude installs only when missing, refreshes lookup, signs in once and automatically adds MCP', async () => flowFixture(async ({ flow, calls, setInstalled, setLoggedIn }) => {
  setInstalled(false); setLoggedIn(false); flow.start(); assert.equal((await flow.settled()).connected, true);
  assert.deepEqual(calls, ['lookup', 'install', 'lookup', 'auth', 'login', 'auth', 'add', 'auth', 'verify', 'reset-probe', 'store:claude', 'store:mcp']);
}));
test('Link Claude preserves matching MCP configuration and never overwrites a conflicting one', async () => {
  await flowFixture(async ({ flow, calls, info, setDefs }) => {
    setDefs({ dashboard: { command: info.node, args: [info.server, '--data-dir', info.dataDir] } }); flow.start(); assert.equal((await flow.settled()).connected, true); assert.ok(!calls.includes('add'));
  });
  await flowFixture(async ({ flow, calls, setDefs }) => {
    const def = { command: 'unrelated-executable', args: ['unrelated-server'] }; setDefs({ dashboard: def }); flow.start();
    const done = await flow.settled(); assert.equal(done.code, 'MCP_CONFLICT'); assert.equal(done.connected, false); assert.deepEqual(calls, ['lookup']); assert.equal(def.command, 'unrelated-executable');
  });
});
test('failed installation and failed MCP verification never claim connected or write connection status', async () => {
  await flowFixture(async ({ flow, calls, setInstalled }) => { setInstalled(false); flow.start(); const done = await flow.settled(); assert.equal(done.phase, 'error'); assert.ok(!calls.includes('add')); assert.ok(!JSON.stringify(done).includes('sensitive-installer-detail')); }, { install: async () => { throw new Error('sensitive-installer-detail'); } });
  await flowFixture(async ({ flow, calls }) => { flow.start(); assert.equal((await flow.settled()).connected, false); assert.ok(!calls.includes('store:claude')); }, { verifyMcp: async () => ({ ok: false }) });
});
test('unfinished browser sign-in remains unconnected and can be retried without overwriting tools', async () => {
  let clock = 0;
  await flowFixture(async ({ flow, calls, setLoggedIn }) => { setLoggedIn(false); flow.start(); const done = await flow.settled(); assert.equal(done.code, 'LOGIN_PENDING'); assert.ok(!calls.includes('add')); }, { login: async () => ({ opened: true }), now: () => clock, sleep: async () => { clock += 1000; }, loginTimeoutMs: 2000 });
});
test('official installer uses fixed HTTPS redirect allowlist, fixed argv and temporary script; refuses arbitrary redirect', async () => {
  const calls = [];
  await installClaudeNative({ platform: 'win32', fetchFn: async url => { calls.push(url); return url === 'https://claude.ai/install.ps1' ? new Response(null, { status: 302, headers: { Location: 'https://downloads.claude.ai/claude-code-releases/bootstrap.ps1' } }) : new Response('Write-Output "synthetic installer"'); }, spawnFn: (command, args, opts) => {
    assert.equal(command, 'powershell.exe'); assert.deepEqual(args.slice(0, 5), ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File']); assert.equal(args.at(-1), 'stable'); assert.equal(opts.shell, false);
    assert.ok(existsSync(args[5])); assert.ok(readFileSync(args[5], 'utf8').includes('synthetic installer'));
    const child = new EventEmitter(); child.stdout = Readable.from([]); child.stderr = Readable.from([]); queueMicrotask(() => child.emit('close', 0)); return child;
  } });
  assert.equal(calls.length, 2);
  await assert.rejects(installClaudeNative({ fetchFn: async () => new Response(null, { status: 302, headers: { Location: 'https://attacker.example/script.sh' } }), spawnFn: () => { throw new Error('must not execute'); } }), { code: 'POLICY' });
});
test('runner refresh discovers a newly installed native binary; auth metadata hides email and tokens', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'claude-native-refresh-'));
  try {
    const fake = join(dir, 'fake-auth.mjs');
    writeFileSync(fake, 'process.stdout.write(JSON.stringify({loggedIn:true,email:"person@example.test",accessToken:"synthetic-sensitive-token"}));');
    const result = refreshClaudeCli({ env: { CLAUDE_CLI_PATH: fake } }); assert.equal(result.installed, true);
    assert.deepEqual(await claudeAuthStatus(), { loggedIn: true });
    const launches = [];
    openClaudeTerminal({ platform: 'win32', authLogin: true, env: { USERPROFILE: dir }, spawnFn: (cmd, args, opts) => { launches.push({ cmd, args, opts }); return { on() {}, unref() {} }; } });
    assert.ok(launches[0].args.at(-1).includes("-ArgumentList @('auth','login')")); assert.equal(launches[0].opts.env.DASHBOARD_CLAUDE_EXE, fake); assert.equal(launches[0].opts.shell, false);
  } finally { setCliPath(null); rmSync(dir, { recursive: true, force: true }); }
});
test('local MCP matching rejects extra arguments and accepts explicit propose mode', () => {
  const info = { node: '/bin/node', server: '/app/mcp/server.mjs', dataDir: '/data' };
  assert.equal(matchingLocalMcp({ command: info.node, args: [info.server, '--data-dir', info.dataDir, '--mode', 'propose'] }, info), true);
  assert.equal(matchingLocalMcp({ command: info.node, args: [info.server, '--data-dir', info.dataDir, '--unknown', 'argument'] }, info), false);
});

test('dashboard link never starts Remote Control; browser action verifies local tools before launching it', async () => {
  let opened = 0;
  await flowFixture(async ({ flow, calls }) => {
    flow.start(); await flow.settled(); assert.equal(opened, 0);
    flow.startBrowser(); const done = await flow.settled();
    assert.equal(opened, 1); assert.equal(done.connected, true);
    assert.equal(done.browserReady, false); assert.equal(done.phase, 'browser-opened');
    assert.equal(done.browserUrl, 'https://claude.ai/code');
    assert.ok(calls.includes('verify')); assert.match(done.message, /terminal confirmations/);
  }, { remoteControl: async () => { opened++; return { opened: true }; } });
});
test('browser failure preserves dashboard AI connection; failed local link never starts Remote Control', async () => {
  await flowFixture(async ({ flow }) => {
    flow.startBrowser(); const done = await flow.settled();
    assert.equal(done.connected, true); assert.equal(done.phase, 'browser-error');
    assert.equal(done.browserUrl, undefined); assert.ok(!JSON.stringify(done).includes('private-failure'));
  }, { remoteControl: async () => { throw new Error('private-failure'); } });
  let opened = 0;
  await flowFixture(async ({ flow }) => {
    flow.startBrowser(); assert.equal((await flow.settled()).connected, false); assert.equal(opened, 0);
  }, { verifyMcp: async () => ({ ok: false }), remoteControl: async () => { opened++; return { opened: true }; } });
});
test('browser setup deduplicates clicks while the native launcher is starting', async () => {
  let release, launches = 0;
  const waiting = new Promise(resolve => { release = resolve; });
  await flowFixture(async ({ flow }) => {
    flow.startBrowser();
    for (let n = 0; n < 20 && flow.status().phase !== 'opening-browser'; n++) await Promise.resolve();
    assert.equal(flow.status().phase, 'opening-browser');
    flow.startBrowser(); flow.start(); assert.equal(launches, 1);
    release({ opened: true }); assert.equal((await flow.settled()).phase, 'browser-opened');
  }, { remoteControl: () => { launches++; return waiting; } });
});
test('Remote Control uses a fixed named single-session command and preserves official terminal confirmations', () => {
  const fake = mkdtempSync(join(tmpdir(), 'claude-remote-command-'));
  try {
    const exe = join(fake, 'claude.exe'); writeFileSync(exe, 'synthetic'); setCliPath(exe);
    let launch;
    const spawnFn = (cmd, args, opts) => { launch = { cmd, args, opts }; return { on() {}, unref() {} }; };
    assert.equal(openClaudeRemoteControl({ platform: 'win32', spawnFn }).opened, true);
    assert.match(launch.args.at(-1), /'remote-control','--name','OpenDash','--spawn','session'/);
    assert.ok(!launch.args.at(-1).includes('dangerously')); assert.equal(launch.opts.shell, false);
    assert.notEqual(launch.opts.cwd, fake);
    openClaudeRemoteControl({ platform: 'darwin', spawnFn });
    assert.equal(launch.cmd, 'osascript'); assert.match(launch.args[1], /quoted form of item 2/);
    assert.match(launch.args[1], /remote-control --name OpenDash --spawn session/);
    assert.deepEqual(openClaudeRemoteControl({ platform: 'linux', env: { PATH: fake }, spawnFn }), { opened: false, how: 'no terminal emulator found' });
  } finally { setCliPath(null); rmSync(fake, { recursive: true, force: true }); }
});

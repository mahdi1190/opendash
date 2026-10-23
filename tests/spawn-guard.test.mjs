// No test can start a real AI agent CLI (lib/spawn-guard.mjs): every module
// that can start processes installs the guard; in a test process starting
// `claude`, `codex` or `gemini` (by name, by install path, through node and
// its npm package, inside a shell command) throws AGENT_CLI_IN_TEST before
// anything runs; the tests' own fakes still run; a child process a test starts
// inherits the guard even without NODE_TEST_CONTEXT. Nothing real is started:
// every refused call throws before it reaches the operating system.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { spawn, spawnSync, execFile, exec } from 'node:child_process';
import { installSpawnGuard, realAgentIn, testing } from '../lib/spawn-guard.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function files(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') files(p, out); } else if (n.endsWith('.mjs')) out.push(p);
  }
  return out;
}

test('every lib/ and server/ module that can start processes installs the guard', () => {
  const missing = [];
  let n = 0;
  for (const f of [...files(join(ROOT, 'lib')), ...files(join(ROOT, 'server'))]) {
    const src = readFileSync(f, 'utf8');
    if (!/from\s+['"](node:)?child_process['"]|require\(\s*['"](node:)?child_process['"]\s*\)/.test(src) || f.endsWith('spawn-guard.mjs')) continue;
    n++;
    if (!/installSpawnGuard\(\)/.test(src)) missing.push(f.slice(ROOT.length + 1));
  }
  assert.ok(n >= 10, `found ${n} modules`);
  assert.deepEqual(missing, [], 'these start processes without the test guard');
});

test('in a test process the real claude / codex / gemini never start', async () => {
  assert.equal(testing(), true);
  assert.equal(installSpawnGuard(), true);
  assert.equal(process.env.OPENDASH_NO_REAL_AGENTS, '1', 'children inherit it');
  const refused = (fn) => assert.throws(fn, (e) => e.code === 'AGENT_CLI_IN_TEST' && /real AI agent CLI/.test(e.message));
  refused(() => spawn('claude', ['-p', 'hello']));
  refused(() => spawnSync('codex', ['exec', 'hi']));
  refused(() => execFile('gemini', ['-p', 'hi'], () => {}));
  refused(() => exec('claude -p "hello"', () => {}));
  refused(() => spawn('cmd.exe', ['/d', '/s', '/c', '"C:\\Program Files\\nodejs\\claude.cmd" -p hi'], { shell: false }));
  refused(() => spawn(process.execPath, [join('C:', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'), '-p', 'x']));
  refused(() => spawn(join('C:', 'Users', 'someone', 'AppData', 'Local', 'AnthropicClaude', 'claude.exe'), []));
  await assert.rejects(promisify(execFile)('codex', ['--version']), (e) => e.code === 'AGENT_CLI_IN_TEST');
  // the tests' own fakes and ordinary programs still run
  assert.equal(realAgentIn(process.execPath, [join(ROOT, 'tests', 'fixtures', 'fake-claude.mjs'), '-p', 'x']), null);
  assert.equal(realAgentIn(join(tmpdir(), 'od-x', 'codex.cmd'), ['mcp', 'list']), null, 'a fake a test wrote to the temp folder');
  assert.equal(realAgentIn('git', ['log', '--oneline']), null);
  const ok = spawnSync(process.execPath, ['-e', 'process.stdout.write("fine")'], { encoding: 'utf8', windowsHide: true });
  assert.equal(ok.stdout, 'fine');
  const r = await promisify(execFile)(process.execPath, ['-e', 'process.stdout.write("ok")'], { windowsHide: true });
  assert.equal(r.stdout, 'ok', 'promisify(execFile) still resolves {stdout, stderr}');
});

test('a child process a test starts (NODE_TEST_CONTEXT removed) refuses too, through the app\'s own module', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const runner = pathToFileURL(join(ROOT, 'lib', 'claude-runner.mjs')).href;
  const script = `import(${JSON.stringify(runner)}).then(async () => { const cp = await import('node:child_process'); try { cp.spawn('claude', ['-p', 'x']); console.log('STARTED'); } catch (e) { console.log(e.code); } });`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env, timeout: 20000, windowsHide: true });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'AGENT_CLI_IN_TEST');
});

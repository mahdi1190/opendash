// An MCP server that was already running when the data folder moved (an open
// Claude Code session) must never read or write the old place: it answers
// DATA_MOVED ("restart the assistant") instead, and the old folder is not
// brought back. A real mcp/server.mjs over stdio, temp folders, fake adapters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeComputer, adaptersFor } from './relocate.shared.mjs';
import { createRelocator } from '../lib/relocate/index.mjs';

const MCP = join(dirname(fileURLToPath(import.meta.url)), '..', 'mcp', 'server.mjs');

function startMcp(dataDir, env) {
  const p = spawn(process.execPath, [MCP, '--data-dir', dataDir], { stdio: ['pipe', 'pipe', 'pipe'], env });
  let buf = '', err = '', n = 0;
  const waiters = new Map();
  p.stdout.setEncoding('utf8');
  p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); const w = waiters.get(m.id); if (w) { waiters.delete(m.id); w(m); } } });
  p.stderr.on('data', d => { err += d; });
  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = ++n;
    const t = setTimeout(() => reject(new Error(`timeout ${method}: ${err}`)), 20000);
    waiters.set(id, (m) => { clearTimeout(t); resolve(m); });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const call = async (name, args = {}) => { const m = await rpc('tools/call', { name, arguments: args }); return { isError: !!m.result.isError, text: m.result.content[0].text }; };
  const stop = () => new Promise((resolve) => { p.on('close', resolve); p.stdin.end(); setTimeout(() => p.kill(), 3000); });
  return { rpc, call, stop };
}

test('an MCP server started before the move says DATA_MOVED and never recreates the old folder', async () => {
  const pc = makeComputer({ files: 1 });
  const env = { ...process.env, DASHBOARD_DEVICE_DIR: pc.base, CLAUDE_CLI_PATH: join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude.mjs') };
  delete env.DASHBOARD_DATA_DIR;
  const m = startMcp(pc.data, env);
  try {
    await m.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    const before = await m.call('list_tasks', {});
    assert.equal(before.isError, false, before.text);
    const R = createRelocator({ dataDir: pc.data, appDir: pc.app, env: pc.env, home: pc.home, base: pc.base, adapters: adaptersFor(pc), othersLive: () => [] });
    await R.run({ moveApp: false });
    await R.finish();
    const after = await m.call('create_task', { title: 'written after the move', dueDate: '2026-10-24', stream: 'personal' });
    assert.equal(after.isError, true);
    assert.match(after.text, /DATA_MOVED|moved to/);
    assert.ok(!existsSync(pc.data), 'the old folder was not brought back');
  } finally { await m.stop(); pc.cleanup(); }
});

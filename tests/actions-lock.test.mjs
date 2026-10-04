// Two processes writing through the actions library at the same time: the
// cross-process lock + compare-and-swap means no write is ever lost and the
// version only grows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDataDir } from './fixtures/actions-state.mjs';
import { createStateStore } from '../server/state-store.mjs';

const WORKER = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'actions-worker.mjs');
const runWorker = (dir, name, n) => new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [WORKER, dir, name, String(n)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  p.stdout.on('data', d => { out += d; });
  p.stderr.on('data', d => { err += d; });
  p.on('close', (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err || 'worker failed'))));
});

test('two processes contending for the state never lose a write', async () => {
  const dir = makeDataDir();
  try {
    const N = 12;
    const [va, vb] = await Promise.all([runWorker(dir, 'A', N), runWorker(dir, 'B', N)]);
    const s = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    const subs = s.custom.find(t => t.id === 'u-1-aaa').subtasks;
    assert.equal(subs.length, 1 + 2 * N, 'every subtask from both processes is there');
    for (const v of [va, vb]) for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1], 'versions grow within a process');
    assert.equal(new Set([...va, ...vb]).size, 2 * N, 'every write got its own version');
    assert.equal(s._lastSave, Math.max(...va, ...vb));
    assert.equal(s.taskActivity['u-1-aaa'].filter(x => x.source === 'script').length, 2 * N);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a stale whole-state PUT (a browser tab) after an actions write is refused with 409', async () => {
  const dir = makeDataDir();
  try {
    const store = createStateStore({ stateDir: join(dir, 'state') });
    const tab = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    await runWorker(dir, 'mcp', 1);
    tab.custom[0].title = 'edited in the tab';
    await assert.rejects(store.write(JSON.stringify(tab)), e => e.status === 409);
    const s = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    assert.equal(s.custom[0].subtasks.length, 2, 'the MCP write survived');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

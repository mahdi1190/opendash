// tools/actions-cli.mjs: dry run by default, --apply, --yes for deletes, undo, query.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDataDir } from './fixtures/actions-state.mjs';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'actions-cli.mjs');
const cli = (dir, ...args) => {
  const r = spawnSync(process.execPath, [CLI, ...args, '--data-dir', dir, '--json'], { encoding: 'utf8' });
  return { code: r.status, json: r.stdout.trim() ? JSON.parse(r.stdout) : null, err: r.stderr };
};

test('actions-cli: dry run, apply, --yes for deletes, query and undo', () => {
  const dir = makeDataDir();
  try {
    const stateFile = join(dir, 'state', 'dashboard-state.json');
    const ops = join(dir, 'ops.json');
    writeFileSync(ops, JSON.stringify({ ops: [{ op: 'task.set_priority', id: 'u-2-bbb', priority: 'p1' }] }));
    const before = readFileSync(stateFile, 'utf8');
    const dry = cli(dir, ops);
    assert.equal(dry.code, 0);
    assert.equal(dry.json.dryRun, true);
    assert.equal(readFileSync(stateFile, 'utf8'), before);
    const ap = cli(dir, ops, '--apply', '--client', 'cli-test');
    assert.equal(ap.code, 0);
    assert.equal(JSON.parse(readFileSync(stateFile, 'utf8')).custom.find(t => t.id === 'u-2-bbb').priority, 'p1');

    writeFileSync(ops, JSON.stringify([{ op: 'task.bin', id: 'u-3-ccc' }]));
    assert.equal(cli(dir, ops, '--apply').code, 2, 'deletes need --yes');
    const yes = cli(dir, ops, '--apply', '--yes');
    assert.equal(yes.code, 0);
    assert.ok(!JSON.parse(readFileSync(stateFile, 'utf8')).custom.some(t => t.id === 'u-3-ccc'));
    const un = cli(dir, '--undo', yes.json.undo);
    assert.equal(un.code, 0);
    assert.ok(JSON.parse(readFileSync(stateFile, 'utf8')).custom.some(t => t.id === 'u-3-ccc'));

    writeFileSync(ops, JSON.stringify([{ op: 'task.update', id: 'u-2-bbb', stream: 'nope' }]));
    const bad = cli(dir, ops, '--apply');
    assert.equal(bad.code, 1);
    assert.equal(bad.json.error.code, 'UNKNOWN_STREAM');
    const q = spawnSync(process.execPath, [CLI, '--query', 'tasks.list', '{"view":"overdue"}', '--data-dir', dir], { encoding: 'utf8' });
    assert.equal(JSON.parse(q.stdout).tasks[0].id, 'u-3-ccc');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

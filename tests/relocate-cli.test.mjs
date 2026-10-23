// tools/relocate.mjs: without --yes nothing changes (the plan is printed in
// plain words); --run --yes moves and renames; --undo shows, --undo --yes puts
// it back. A temp computer (fake home, fake OneDrive); the test runner's
// adapters never reach the real registry or the real CLIs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeComputer, tree } from './relocate.shared.mjs';
import { main } from '../tools/relocate.mjs';

test('tools/relocate.mjs: plan, run, status, undo', async () => {
  const pc = makeComputer({ files: 3 });
  try {
    const env = { ...pc.env, USERPROFILE: pc.home, DASHBOARD_DEVICE_DIR: pc.base, NODE_TEST_CONTEXT: 'child' };
    const run = async (...args) => { const out = []; const err = []; const code = await main(['--data-dir', pc.data, '--app-dir', pc.app, ...args], { env, out: (s) => out.push(s), err: (s) => err.push(s) }); return { code, out: out.join('\n'), err: err.join('\n') }; };
    const before = tree(pc.data);
    const p = await run('--no-app');
    assert.equal(p.code, 0, p.err);
    assert.match(p.out, /nothing has changed yet/);
    assert.match(p.out, /Copy the data folder \(\d+ files/);
    assert.match(p.out, /Claude Code: the "dashboard" MCP server/);
    assert.match(p.out, /claude mcp remove dashboard --scope user/, 'no claude CLI under tests: the exact commands are shown');
    assert.match(p.out, /Nothing is deleted/);
    const p2 = await run('--no-app', '--run');
    assert.match(p2.out, /Add --yes to do it/);
    assert.deepEqual(tree(pc.data), before, 'nothing changed without --yes');
    assert.ok(!existsSync(join(pc.base, 'Data')));
    const j = JSON.parse((await run('--no-app', '--json')).out);
    assert.equal(j.ok, true);
    const r = await run('--no-app', '--run', '--yes');
    assert.equal(r.code, 0, r.err + r.out);
    assert.match(r.out, /OpenDash now uses .*Data/);
    assert.match(r.out, /The old folder is kept as ".*data \(moved to /);
    assert.match(r.out, /Still to do: Claude Code/);
    assert.ok(existsSync(join(pc.base, 'Data', 'state', 'dashboard-state.json')) && !existsSync(pc.data));
    const s = await run('--status');
    assert.match(s.out, /Last move: finished/);
    const u = await run('--undo');
    assert.match(u.out, /Undo would:/);
    const u2 = await run('--undo', '--yes');
    assert.equal(u2.code, 0, u2.err + u2.out);
    assert.match(u2.out, /back in/);
    assert.deepEqual(tree(pc.data), before, 'the old folder is back, as it was');
    assert.ok(readFileSync(join(pc.home, '.claude.json'), 'utf8').includes('"--data-dir"'));
  } finally { pc.cleanup(); }
});

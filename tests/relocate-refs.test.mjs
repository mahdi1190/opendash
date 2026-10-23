// lib/relocate: the dry run lists EVERY reference a move re-points (Windows
// start-up entries, Claude Code / Codex MCP entries, scheduled-task skills,
// shortcuts) before anything changes; the run re-points them; "Undo move"
// puts every one back, copies back what changed since the move and gives the
// old folder its name back. Fake registry, fake CLIs, fake shortcuts, fake
// config files in a temp home: nothing real is read or changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { makeComputer, adaptersFor, fakeCli, fakeShortcuts, tree } from './relocate.shared.mjs';
import { createRelocator, README, NEW_README } from '../lib/relocate/index.mjs';
import { readRecord } from '../lib/relocate/record.mjs';
import { discoverRefs, applyRef, undoRef, RUN_KEY, RUN_VALUE, PROTO_CMD_KEY, ENV_KEY, parseCodexServers } from '../lib/relocate/refs.mjs';
import { resolveDataDir } from '../lib/datadir.mjs';
import { createDryRunExec } from '../lib/os-integration.mjs';
import { registryAdapter } from '../lib/relocate/adapters.mjs';

const WIN = process.platform === 'win32';
const fwd = (p) => p.replace(/\\/g, '/');
const T0 = Date.parse('2026-10-23T15:00:00Z');

async function seedRegistry(pc, { otherApp } = {}) {
  const node = 'C:\\Program Files\\nodejs\\node.exe';
  const cmd = `"C:\\Windows\\System32\\conhost.exe" --headless "${node}" "${join(pc.app, 'tools', 'start-hidden.mjs')}"`;
  await pc.registry.set(RUN_KEY, RUN_VALUE, 'REG_SZ', cmd);
  await pc.registry.set(PROTO_CMD_KEY, '', 'REG_SZ', otherApp ? `"${node}" "${join(otherApp, 'tools', 'start-hidden.mjs')}"` : cmd);
  await pc.registry.set(ENV_KEY, 'DASHBOARD_DATA_DIR', 'REG_SZ', pc.data);
  return cmd;
}

test('dry run: every reference is listed with before and after, and nothing changes', async () => {
  const pc = makeComputer({ files: 3 });
  try {
    const cmd = WIN ? await seedRegistry(pc, { otherApp: 'D:\\other-opendash' }) : null;
    const ccBefore = readFileSync(join(pc.home, '.claude.json'), 'utf8');
    const cxBefore = readFileSync(join(pc.home, '.codex', 'config.toml'), 'utf8');
    const skill = join(pc.oneDrive, 'Documents', 'Claude', 'Scheduled', 'task-ops', 'SKILL.md');
    const skillBefore = readFileSync(skill, 'utf8');
    const cli = fakeCli(pc.home);
    const R = createRelocator({ dataDir: pc.data, appDir: pc.app, env: pc.env, home: pc.home, hostname: 'HOME-PC', base: pc.base, adapters: adaptersFor(pc, { cli }), othersLive: () => [], now: () => T0 });
    const plan = await R.plan();                       // app + data (the app is in OneDrive)
    const ids = plan.refs.map(r => r.id);
    const newData = join(pc.base, 'Data'), newApp = join(pc.base, 'App');
    // Claude Code: the user-scope "dashboard" entry, with the forward-slash paths Claude Code writes
    const cc = plan.refs.find(r => r.kind === 'claude-code');
    assert.equal(cc.name, 'dashboard'); assert.equal(cc.scope, 'user'); assert.equal(cc.how, 'auto');
    assert.deepEqual(cc.after.args, [fwd(join(newApp, 'mcp', 'server.mjs')), '--data-dir', fwd(newData)]);
    assert.ok(cc.changes.some(c => c.what === '--data-dir' && c.after === fwd(newData)));
    assert.ok(!plan.refs.some(r => r.name === 'github'), 'other MCP servers are not touched');
    // Codex: re-added under the new data folder's name
    const cx = plan.refs.find(r => r.kind === 'codex');
    assert.equal(cx.before.name, pc.codexName);
    assert.notEqual(cx.after.name, pc.codexName);
    assert.deepEqual(cx.after.def.args, [join(newApp, 'mcp', 'server.mjs'), '--data-dir', newData]);
    // the scheduled-task skill that names the folder; the one that names only the file is a note
    const tx = plan.refs.find(r => r.kind === 'text');
    assert.equal(tx.where, skill);
    assert.equal(tx.count, 2);
    assert.ok(tx.changes.length >= 2 && !('after' in tx), 'the page sees changed lines, not the whole file');
    assert.ok(plan.refs.some(r => r.kind === 'info' && /task-management/.test(r.label) && /by name only/.test(r.detail)));
    assert.ok(ids.includes('info:git-link') && ids.includes('info:claude-code-project'));
    if (WIN) {
      const run = plan.refs.find(r => r.id === 'os:autostart');
      assert.equal(run.before, cmd);
      assert.equal(run.after, `"C:\\Windows\\System32\\conhost.exe" --headless "C:\\Program Files\\nodejs\\node.exe" "${join(newApp, 'tools', 'start-hidden.mjs')}" --data-dir "${newData}"`);
      assert.ok(!ids.includes('os:protocol'), "another copy's start button is left alone");
      assert.equal(plan.refs.find(r => r.id === 'os:env').after, newData);
      const lnk = plan.refs.find(r => r.kind === 'shortcut');
      assert.equal(lnk.after.target, join(newApp, 'start-opendash.bat'));
      assert.equal(lnk.after.workdir, newApp);
    }
    assert.equal(plan.counts.manual, 0);
    // nothing changed: files, registry, CLI never called
    assert.equal(readFileSync(join(pc.home, '.claude.json'), 'utf8'), ccBefore);
    assert.equal(readFileSync(join(pc.home, '.codex', 'config.toml'), 'utf8'), cxBefore);
    assert.equal(readFileSync(skill, 'utf8'), skillBefore);
    assert.equal(cli.calls.length, 0);
    if (WIN) assert.equal((await pc.registry.query(RUN_KEY, RUN_VALUE)).data, cmd);
    assert.ok(!existsSync(join(pc.base, 'Data')) && !existsSync(join(pc.base, 'relocation.json')));
  } finally { pc.cleanup(); }
});

test('run re-points every reference; Undo move restores everything (data changed since included)', async () => {
  const pc = makeComputer({ files: 4 });
  try {
    const cmd = WIN ? await seedRegistry(pc) : null;
    const files0 = {
      cc: readFileSync(join(pc.home, '.claude.json'), 'utf8'),
      cx: readFileSync(join(pc.home, '.codex', 'config.toml'), 'utf8'),
      skill: readFileSync(join(pc.oneDrive, 'Documents', 'Claude', 'Scheduled', 'task-ops', 'SKILL.md'), 'utf8'),
    };
    const data0 = tree(pc.data);
    const cli = fakeCli(pc.home);
    const sc = fakeShortcuts({ [join(pc.home, 'Desktop', 'OpenDash.lnk')]: { target: join(pc.app, 'start-opendash.bat'), args: '', workdir: pc.app, icon: '' } });
    const syncOld = join(pc.base, 'sync', 'old'), syncNew = join(pc.base, 'sync', 'new');
    mkdirSync(syncOld, { recursive: true }); writeFileSync(join(syncOld, 'device.json'), '{"deviceId":"0123456789abcdef"}');
    const ad = adaptersFor(pc, { cli, shortcuts: sc, sync: (d) => (d === pc.data ? syncOld : syncNew) });
    const mk = () => createRelocator({ dataDir: pc.data, appDir: pc.app, env: pc.env, home: pc.home, hostname: 'HOME-PC', base: pc.base, adapters: ad, othersLive: () => [], now: () => T0 });
    const res = await mk().run({ moveApp: false });   // data only: the app stays
    const newData = join(pc.base, 'Data');
    const statuses = Object.fromEntries(res.move.refs.map(r => [r.id, r.status]));
    for (const [id, s] of Object.entries(statuses)) assert.ok(['done', 'info'].includes(s), `${id}: ${s}`);
    // Claude Code was changed through its CLI (remove + add), never by editing its file here
    assert.deepEqual(cli.calls.filter(c => c.tool === 'claude').map(c => c.args[1]), ['remove', 'add']);
    const cc = JSON.parse(readFileSync(join(pc.home, '.claude.json'), 'utf8'));
    assert.deepEqual(cc.mcpServers.dashboard.args, [fwd(join(pc.app, 'mcp', 'server.mjs')), '--data-dir', fwd(newData)], 'the app stays, the data moved');
    assert.ok(cc.mcpServers.github, 'the other server is still there');
    const cx = parseCodexServers(readFileSync(join(pc.home, '.codex', 'config.toml'), 'utf8'));
    assert.ok(!cx.some(s => s.name === pc.codexName));
    assert.deepEqual(cx.find(s => s.name.startsWith('opendash-')).def.args, [join(pc.app, 'mcp', 'server.mjs'), '--data-dir', newData]);
    assert.ok(readFileSync(join(pc.oneDrive, 'Documents', 'Claude', 'Scheduled', 'task-ops', 'SKILL.md'), 'utf8').includes(join(newData, 'state', 'dashboard-state.json')));
    assert.ok(existsSync(join(syncNew, 'device.json')), "this computer's sync identity follows the folder");
    if (WIN) {
      assert.equal((await pc.registry.query(RUN_KEY, RUN_VALUE)).data, `${cmd} --data-dir "${newData}"`);
      assert.equal((await pc.registry.query(ENV_KEY, 'DASHBOARD_DATA_DIR')).data, newData);
    }
    assert.equal(sc.lnk.get(join(pc.home, 'Desktop', 'OpenDash.lnk')).target, join(pc.app, 'start-opendash.bat'), 'a data-only move leaves the shortcut');
    // the old folder is renamed; then the user works in the new place for a while
    const [fin] = await mk().finish();
    assert.ok(existsSync(join(fin.renamed.data, README)));
    writeFileSync(join(newData, 'state', 'dashboard-state.json'), JSON.stringify({ custom: [{ id: 'u-1', title: 'a task' }, { id: 'u-2', title: 'new since the move' }], _lastSave: 2 }));
    writeFileSync(join(newData, 'calendar.new.json'), '{"new":true}');
    // undo: the plan says what comes back
    const R = mk();
    const up = await R.undoPlan();
    assert.equal(up.ok, true, JSON.stringify(up.problems));
    assert.equal(up.changedFiles, 2);
    assert.ok(up.refs.length >= 3);
    const u = await R.undo();
    assert.equal(u.move.phase, 'undone');
    assert.ok(existsSync(pc.data) && !existsSync(fin.renamed.data), 'the old folder has its name back');
    assert.ok(!existsSync(join(pc.data, README)));
    assert.equal(JSON.parse(readFileSync(join(pc.data, 'state', 'dashboard-state.json'), 'utf8')).custom.length, 2, 'the newest data came back');
    assert.ok(existsSync(join(pc.data, 'calendar.new.json')));
    const keep = u.move.undoKept;
    assert.equal(JSON.parse(readFileSync(join(keep, 'state', 'dashboard-state.json'), 'utf8')).custom.length, 1, 'the version it replaced is kept');
    // everything outside is as it was
    assert.equal(readFileSync(join(pc.home, '.claude.json'), 'utf8').replace(/\s/g, ''), files0.cc.replace(/\s/g, ''));
    assert.deepEqual(parseCodexServers(readFileSync(join(pc.home, '.codex', 'config.toml'), 'utf8')).map(s => [s.name, s.def]), parseCodexServers(files0.cx).map(s => [s.name, s.def]));
    assert.equal(readFileSync(join(pc.oneDrive, 'Documents', 'Claude', 'Scheduled', 'task-ops', 'SKILL.md'), 'utf8'), files0.skill);
    if (WIN) {
      assert.equal((await pc.registry.query(RUN_KEY, RUN_VALUE)).data, cmd);
      assert.equal((await pc.registry.query(ENV_KEY, 'DASHBOARD_DATA_DIR')).data, pc.data);
    }
    // the redirect is gone; the new folder is kept (never deleted) and says it is not used
    assert.equal(resolveDataDir({ argv: ['--data-dir', pc.data], env: { DASHBOARD_DEVICE_DIR: pc.base } }), pc.data);
    assert.ok(existsSync(join(newData, NEW_README)));
    // the old data apart from what changed since the move is the same as before
    const now = tree(pc.data, (r) => r.startsWith('backups/before-undo-'));
    for (const [rel, h] of Object.entries(data0)) if (!['state/dashboard-state.json'].includes(rel)) assert.equal(now[rel], h, rel);
    assert.equal(R.status().canUndo, false);
  } finally { pc.cleanup(); }
});

test('undo leaves alone what was changed since the move, and says so', async () => {
  const pc = makeComputer({ files: 1 });
  try {
    const ad = adaptersFor(pc);
    const R = createRelocator({ dataDir: pc.data, appDir: pc.app, env: pc.env, home: pc.home, base: pc.base, adapters: ad, othersLive: () => [], now: () => T0 });
    await R.run({ moveApp: false });
    const skill = join(pc.oneDrive, 'Documents', 'Claude', 'Scheduled', 'task-ops', 'SKILL.md');
    writeFileSync(skill, readFileSync(skill, 'utf8') + '\nedited by the user after the move\n');
    const u = await R.undo();
    const ref = u.move.refs.find(r => r.kind === 'text');
    assert.equal(ref.undo, 'left');
    assert.match(ref.undoNote, /edited since the move/);
    assert.match(readFileSync(skill, 'utf8'), /edited by the user/);
  } finally { pc.cleanup(); }
});

test('undo refuses while another computer is live, or when the old name is taken', async () => {
  const pc = makeComputer({ files: 1 });
  try {
    let others = [];
    const R = createRelocator({ dataDir: pc.data, appDir: pc.app, env: pc.env, home: pc.home, base: pc.base, adapters: adaptersFor(pc), othersLive: () => others, now: () => T0 });
    await R.run({ moveApp: false });
    await R.finish();
    others = [{ hostname: 'WORK-LAPTOP', lastSeenMs: 1000 }];
    await assert.rejects(R.undo(), (e) => e.code === 'OTHER_COMPUTER');
    others = [];
    mkdirSync(pc.data);   // something made a new 'data' folder where the old one was
    const up = await R.undoPlan();
    assert.ok(up.problems.some(p => p.code === 'NAME_TAKEN'));
    assert.equal(readRecord({ base: pc.base }).moves[0].phase, 'finished', 'nothing was undone');
  } finally { pc.cleanup(); }
});

test('a missing CLI makes the MCP entry "manual" with the exact commands; a failing one is reported, the rest still re-pointed', async () => {
  const pc = makeComputer({ files: 1 });
  try {
    const noClaude = fakeCli(pc.home, { has: ['codex'] });
    const R = createRelocator({ dataDir: pc.data, appDir: pc.app, env: pc.env, home: pc.home, base: pc.base, adapters: adaptersFor(pc, { cli: noClaude }), othersLive: () => [], now: () => T0 });
    const p = await R.plan({ moveApp: false });
    const cc = p.refs.find(r => r.kind === 'claude-code');
    assert.equal(cc.how, 'manual');
    assert.match(cc.manual, /claude mcp remove dashboard --scope user/);
    assert.match(cc.manual, /claude mcp add --scope user dashboard -- node /);
    const res = await R.run({ moveApp: false });
    assert.equal(res.move.refs.find(r => r.kind === 'claude-code').status, 'manual');
    assert.equal(res.move.refs.find(r => r.kind === 'codex').status, 'done');
  } finally { pc.cleanup(); }
  const pc2 = makeComputer({ files: 1 });
  try {
    const failing = fakeCli(pc2.home, { fail: (tool, args) => tool === 'codex' && args[1] === 'add' });
    const R = createRelocator({ dataDir: pc2.data, appDir: pc2.app, env: pc2.env, home: pc2.home, base: pc2.base, adapters: adaptersFor(pc2, { cli: failing }), othersLive: () => [], now: () => T0 });
    const res = await R.run({ moveApp: false });
    const cx = res.move.refs.find(r => r.kind === 'codex');
    assert.equal(cx.status, 'failed');
    assert.match(cx.error, /codex mcp add failed/);
    assert.equal(res.move.refs.find(r => r.kind === 'claude-code').status, 'done');
    assert.equal(res.move.phase, 'switched', 'one failed entry does not undo the move');
  } finally { pc2.cleanup(); }
});

test('registry references with Windows paths (any platform): only our own entries, put back exactly', async () => {
  const dry = createDryRunExec();
  const registry = registryAdapter({ exec: dry.exec, env: { SystemRoot: 'C:\\Windows' } });
  const app = 'C:\\Users\\u\\OneDrive\\opendash', data = `${app}\\data`, nd = 'C:\\Users\\u\\AppData\\Local\\OpenDash\\Data';
  const cmd = `"C:\\Program Files\\nodejs\\node.exe" "${app}\\tools\\start-hidden.mjs" --port 4300`;
  await registry.set(RUN_KEY, RUN_VALUE, 'REG_SZ', cmd);
  const refs = await discoverRefs({ mappings: [{ from: data, to: nd }], from: { data, app }, to: { data: nd, app: null }, platform: 'win32', env: {}, home: join(process.env.DASHBOARD_DEVICE_DIR, 'nohome'), adapters: { registry } });
  assert.deepEqual(refs.map(r => r.id), ['os:autostart']);
  assert.equal(refs[0].after, `${cmd} --data-dir "${nd}"`);
  await applyRef(refs[0], { registry });
  assert.equal(refs[0].status, 'done');
  assert.equal((await registry.query(RUN_KEY, RUN_VALUE)).data, refs[0].after);
  await undoRef(refs[0], { registry });
  assert.equal(refs[0].undo, 'done');
  assert.equal((await registry.query(RUN_KEY, RUN_VALUE)).data, cmd);
  assert.ok(dry.calls.every(c => /reg\.exe$/i.test(c.file)), 'only reg.exe, and only the in-memory one');
});

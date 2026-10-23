// lib/relocate: copy + verify + switch, a crash half-way through the copy
// and the resume, the checks that refuse a move (another computer is live, the
// drive is short of space, the new folder has files, it is in OneDrive), the
// rename of the old folder with its README, and the redirect every OpenDash
// program follows (resolveDataDir). All in temp folders with fake adapters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { makeComputer, adaptersFor, tree } from './relocate.shared.mjs';
import { createRelocator, MARKER, README } from '../lib/relocate/index.mjs';
import { readRecord, redirectFrom } from '../lib/relocate/record.mjs';
import { resolveDataDir } from '../lib/datadir.mjs';
import { mapPath, mapText, movedFolderName, repointCommand, samePath, isUnder, syncedFolderKind } from '../lib/relocate/paths.mjs';
import { copyTree, cleanTemp } from '../lib/relocate/copy.mjs';

const skipDev = (r) => r === 'runtime.json' || r.startsWith('hosts');
const mk = (pc, extra = {}) => createRelocator({ dataDir: pc.data, appDir: pc.app, env: pc.env, home: pc.home, hostname: 'HOME-PC', base: pc.base, adapters: adaptersFor(pc, extra.ad), othersLive: () => [], now: () => Date.parse('2026-10-23T15:00:00Z'), ...extra.opts });

test('paths: mapping keeps the slash style, matches whole folder names only, any case on Windows', () => {
  const m = [{ from: 'C:\\Users\\bob\\OneDrive\\app', to: 'C:\\Users\\bob\\AppData\\Local\\OpenDash\\App' }, { from: 'C:\\Users\\bob\\OneDrive\\app\\data', to: 'C:\\Users\\bob\\AppData\\Local\\OpenDash\\Data' }];
  assert.equal(mapPath('c:/users/bob/onedrive/app/mcp/server.mjs', m, 'win32'), 'C:/Users/bob/AppData/Local/OpenDash/App/mcp/server.mjs');
  assert.equal(mapPath('C:\\Users\\bob\\OneDrive\\app\\data', m, 'win32'), 'C:\\Users\\bob\\AppData\\Local\\OpenDash\\Data', 'the longer mapping wins');
  assert.equal(mapPath('C:\\Users\\bob\\OneDrive\\app-old\\x', m, 'win32'), 'C:\\Users\\bob\\OneDrive\\app-old\\x');
  const t = mapText('a "C:\\\\Users\\\\bob\\\\OneDrive\\\\app\\\\data" b C:/Users/bob/OneDrive/app/x c C:\\Users\\bob\\OneDrive\\apple', m, 'win32');
  assert.equal(t.count, 2);
  assert.match(t.text, /"C:\\\\Users\\\\bob\\\\AppData\\\\Local\\\\OpenDash\\\\Data"/);
  assert.match(t.text, /C:\/Users\/bob\/AppData\/Local\/OpenDash\/App\/x/);
  assert.match(t.text, /OneDrive\\apple/);
  assert.equal(movedFolderName('data', 'C:\\Users\\bob\\AppData\\Local\\OpenDash\\Data', '2026-10-23', { home: 'C:\\Users\\bob', platform: 'win32' }), 'data (moved to AppData-Local-OpenDash-Data on 2026-10-23)');
  assert.ok(!/[:\\/]/.test(movedFolderName('data', 'D:\\Dash', '2026-10-23', { platform: 'win32' })));
  assert.ok(samePath('C:\\A\\b\\', 'c:/a/B', 'win32') && !samePath('/a/b', '/a/B', 'linux'));
  assert.ok(isUnder('C:\\a\\b\\c', 'c:\\A', 'win32') && !isUnder('C:\\ab', 'C:\\a', 'win32'));
  assert.equal(syncedFolderKind('C:\\Users\\bob\\OneDrive\\x', {}), 'OneDrive');
  assert.equal(syncedFolderKind('/home/u/Dropbox/x', {}), 'Dropbox');
  assert.equal(syncedFolderKind('C:\\Users\\bob\\AppData\\Local\\OpenDash\\Data', {}), null);
});

test('paths: a start-up command gets the moved app and an explicit --data-dir', () => {
  const app = 'C:\\Users\\bob\\OneDrive\\app';
  const cmd = `"C:\\Windows\\System32\\conhost.exe" --headless "C:\\Program Files\\nodejs\\node.exe" "${app}\\tools\\start-hidden.mjs"`;
  const dataOnly = repointCommand(cmd, [{ from: `${app}\\data`, to: 'C:\\L\\OpenDash\\Data' }], { dataDir: 'C:\\L\\OpenDash\\Data', defaultDataDir: `${app}\\data`, platform: 'win32' });
  assert.equal(dataOnly, `${cmd} --data-dir "C:\\L\\OpenDash\\Data"`);
  const both = repointCommand(`${cmd} --port 4300 --data-dir "${app}\\data"`, [{ from: app, to: 'C:\\L\\OpenDash\\App' }, { from: `${app}\\data`, to: 'C:\\L\\OpenDash\\Data' }], { dataDir: 'C:\\L\\OpenDash\\Data', defaultDataDir: 'C:\\L\\OpenDash\\App\\data', platform: 'win32' });
  assert.equal(both, `"C:\\Windows\\System32\\conhost.exe" --headless "C:\\Program Files\\nodejs\\node.exe" "C:\\L\\OpenDash\\App\\tools\\start-hidden.mjs" --port 4300 --data-dir "C:\\L\\OpenDash\\Data"`);
  assert.equal(repointCommand(cmd, [{ from: 'D:\\other', to: 'E:\\x' }], { platform: 'win32' }), cmd, 'unrelated: unchanged');
});

test('copy: every file verified; a crash half-way is resumed without copying twice; temp files are cleaned', async () => {
  const pc = makeComputer({ files: 30 });
  try {
    const dst = join(pc.t, 'copy');
    let n = 0;
    await assert.rejects(copyTree(pc.data, dst, { onFile: () => { if (++n === 12) throw new Error('power cut'); } }), /power cut/);
    writeFileSync(join(dst, 'state', `.dashboard-state.json.odmove-1-deadbeef`), 'half');   // a temp file a crash left
    const r = await copyTree(pc.data, dst);
    assert.ok(r.already >= 11, `resumed files kept: ${r.already}`);
    assert.equal(r.copied + r.already, r.files.length);
    assert.deepEqual(tree(dst), tree(pc.data));
    assert.equal(await cleanTemp(dst), 0, 'no temp file left');
  } finally { pc.cleanup(); }
});

test('copy: a file that changes during the copy is copied again; one that keeps changing is reported', async () => {
  const pc = makeComputer({ files: 3 });
  try {
    const dst = join(pc.t, 'copy');
    let bumped = 0;
    const r = await copyTree(pc.data, dst, { onFile: (rel) => { if (rel === 'config.json' && bumped++ === 0) writeFileSync(join(pc.data, 'config.json'), '{"changed":true}'); } });
    assert.equal(readFileSync(join(dst, 'config.json'), 'utf8'), '{"changed":true}', 'the new content reached the copy');
    assert.deepEqual(r.busy, []);
    let k = 0;
    const r2 = await copyTree(pc.data, join(pc.t, 'copy2'), { mayChange: (rel) => rel.startsWith('logs/'), onFile: (rel) => { if (rel === 'logs/server.log') writeFileSync(join(pc.data, 'logs', 'server.log'), `line ${k++}\n`.repeat(k)); } });
    assert.ok(r2.unsettled.includes('logs/server.log'));
    assert.deepEqual(r2.busy, [], 'logs may keep changing');
  } finally { pc.cleanup(); }
});

test('move: copy + verify + switch, then the old folder is renamed with a README; nothing is deleted', async () => {
  const pc = makeComputer({ files: 20 });
  try {
    const before = tree(pc.data, skipDev);
    const R = mk(pc);
    const st = R.status();
    assert.equal(st.synced.data, 'OneDrive');
    assert.equal(st.recommendApp, true);
    const plan = await R.plan({ moveApp: false });
    assert.equal(plan.ok, true, JSON.stringify(plan.problems));
    assert.equal(plan.to.data, join(pc.base, 'Data'));
    assert.equal(plan.data.files, Object.keys(before).length, 'runtime.json and hosts/ are left out');
    const steps = [];
    const res = await R.run({ moveApp: false }, { expectId: plan.id, onProgress: (p) => steps.push(p.step) });
    assert.equal(res.move.phase, 'switched');
    assert.ok(steps.includes('copy-data') && steps.includes('repoint'));
    const copy = tree(pc.data.replace(pc.data, join(pc.base, 'Data')), (r) => r === MARKER);
    // config.json's financeDir pointed into the old folder: the copy points into the new one
    assert.equal(JSON.parse(readFileSync(join(pc.base, 'Data', 'config.json'), 'utf8')).financeDir, join(pc.base, 'Data', 'finance'));
    delete copy['config.json']; const b2 = { ...before }; delete b2['config.json'];
    assert.deepEqual(copy, b2, 'every other file identical');
    assert.ok(!existsSync(join(pc.base, 'Data', 'runtime.json')) && !existsSync(join(pc.base, 'Data', 'hosts')));
    // the old folder is untouched until finish
    assert.deepEqual(tree(pc.data, skipDev), before);
    // every OpenDash program now lands in the new folder
    const env = { DASHBOARD_DEVICE_DIR: pc.base };
    assert.equal(resolveDataDir({ argv: ['--data-dir', pc.data], env }), join(pc.base, 'Data'));
    assert.equal(resolveDataDir({ env, repoRoot: pc.app }), join(pc.base, 'Data'), 'the default <app>/data too');
    assert.equal(resolveDataDir({ env, repoRoot: pc.app, redirect: false }), pc.data);
    // finish: renamed, README inside, nothing deleted
    const fin = await R.finish();
    assert.equal(fin[0].phase, 'finished');
    const renamed = fin[0].renamed.data;
    assert.match(basename(renamed), /^data \(moved to .*local-OpenDash-Data on 2026-10-23\)$/);
    assert.ok(!existsSync(pc.data));
    assert.ok(readFileSync(join(renamed, README), 'utf8').includes(join(pc.base, 'Data')));
    const kept = tree(renamed, (r) => r === README);
    assert.deepEqual(Object.fromEntries(Object.entries(kept).filter(([r]) => !skipDev(r))), before, 'the old copy is complete and unchanged');
    assert.ok(!existsSync(join(pc.base, 'Data', MARKER)), 'the move marker is gone');
    assert.equal(R.status().canUndo, true);
  } finally { pc.cleanup(); }
});

test('move: a crash during the copy, then the next start resumes it and finishes', async () => {
  const pc = makeComputer({ files: 25 });
  try {
    let n = 0;
    const R1 = mk(pc, { opts: { onFile: (k, rel) => { if (++n === 10) throw new Error('blue screen'); } } });
    await assert.rejects(R1.run({ moveApp: false }), /blue screen/);
    let rec = readRecord({ base: pc.base });
    assert.equal(rec.moves.length, 1);
    assert.equal(rec.moves[0].phase, 'copying');
    assert.equal(redirectFrom(pc.data, rec), pc.data, 'no redirect before the copy is complete');
    assert.ok(existsSync(join(pc.base, 'Data', MARKER)));
    // a fresh process (after the restart): the plan says it will resume, and run finishes it
    const R2 = mk(pc);
    const p = await R2.plan({ moveApp: false });
    assert.equal(p.ok, true, JSON.stringify(p.problems));
    assert.ok(p.warnings.some(w => w.code === 'RESUME'));
    const res = await R2.run({ moveApp: false });
    assert.equal(res.move.phase, 'switched');
    rec = readRecord({ base: pc.base });
    assert.equal(rec.moves.length, 1, 'the same move, finished');
    assert.deepEqual(tree(join(pc.base, 'Data'), (r) => r === MARKER || r === 'config.json'), Object.fromEntries(Object.entries(tree(pc.data, skipDev)).filter(([r]) => r !== 'config.json')));
  } finally { pc.cleanup(); }
});

test('move: the app folder too (it is in OneDrive): the copy has no .git link and no data folder', async () => {
  const pc = makeComputer({ files: 5 });
  try {
    const R = mk(pc);
    const plan = await R.plan();
    assert.equal(plan.moveApp, true);
    assert.equal(plan.to.app, join(pc.base, 'App'));
    assert.ok(plan.refs.some(r => r.id === 'info:git-link'));
    await R.run();
    assert.ok(existsSync(join(pc.base, 'App', 'tools', 'start-hidden.mjs')));
    assert.ok(!existsSync(join(pc.base, 'App', '.git')), 'the .git link is left out');
    assert.ok(!existsSync(join(pc.base, 'App', 'data')), 'the data went to its own folder');
    const env = { DASHBOARD_DEVICE_DIR: pc.base };
    assert.equal(resolveDataDir({ env, repoRoot: join(pc.base, 'App') }), join(pc.base, 'Data'), 'the new app finds the new data');
    const fin = await R.finish();
    assert.ok(fin[0].renamed.app && !fin[0].renamed.data, 'the app folder (with the data inside) is renamed once');
    assert.ok(existsSync(join(fin[0].renamed.app, 'data', 'state', 'dashboard-state.json')));
  } finally { pc.cleanup(); }
});

test('refuses: another computer is live, the drive is short of space, the place has files or is in OneDrive', async () => {
  const pc = makeComputer({ files: 5 });
  try {
    const live = mk(pc, { opts: { othersLive: () => [{ hostname: 'WORK-LAPTOP', lastSeenMs: 30000 }] } });
    const p1 = await live.plan({ moveApp: false });
    assert.equal(p1.ok, false);
    assert.match(p1.problems[0].text, /open on WORK-LAPTOP/);
    await assert.rejects(live.run({ moveApp: false }), (e) => e.code === 'OTHER_COMPUTER' && e.status === 409);
    assert.ok(!existsSync(join(pc.base, 'Data')), 'nothing copied');

    const small = mk(pc, { ad: { free: 1000 } });
    const p2 = await small.plan({ moveApp: false });
    assert.ok(p2.problems.some(x => x.code === 'NO_SPACE' && /not enough free space/.test(x.text)));
    await assert.rejects(small.run({ moveApp: false }), (e) => e.code === 'NO_SPACE');

    mkdirSync(join(pc.t, 'full'), { recursive: true }); writeFileSync(join(pc.t, 'full', 'x.txt'), 'x');
    const p3 = await mk(pc).plan({ to: join(pc.t, 'full'), moveApp: false });
    assert.ok(p3.problems.some(x => x.code === 'NOT_EMPTY'));
    const p4 = await mk(pc).plan({ to: join(pc.oneDrive, 'Elsewhere'), moveApp: false });
    assert.ok(p4.problems.some(x => x.code === 'SYNCED'));
    const p5 = await mk(pc).plan({ to: join(pc.data, 'inside'), moveApp: false });
    assert.ok(p5.problems.some(x => x.code === 'NESTED'));
    assert.equal(readRecord({ base: pc.base }).moves.length, 0, 'no move was recorded');
  } finally { pc.cleanup(); }
});

test('refuses a plan that changed since the user looked at it', async () => {
  const pc = makeComputer({ files: 2 });
  try {
    const R = mk(pc);
    const p = await R.plan({ moveApp: false });
    const f = join(pc.oneDrive, 'Documents', 'Claude', 'Scheduled', 'new-task', 'SKILL.md');
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, `uses ${pc.data}\n`);
    await assert.rejects(R.run({ moveApp: false }, { expectId: p.id }), (e) => e.code === 'PLAN_CHANGED' && e.plan.refs.some(r => r.where === f));
    assert.ok(!existsSync(join(pc.base, 'Data')));
  } finally { pc.cleanup(); }
});

test('the record lives in this computer\'s folder, never in the data folder', async () => {
  const pc = makeComputer({ files: 1 });
  try {
    await mk(pc).run({ moveApp: false });
    assert.ok(existsSync(join(pc.base, 'relocation.json')));
    assert.ok(!readdirSync(join(pc.base, 'Data')).some(n => /relocation/.test(n)));
  } finally { pc.cleanup(); }
});

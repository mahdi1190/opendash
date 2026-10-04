// The brainstorm Boards feature (boards of ideas, the canvas) was retired:
// migration 080 archives and removes its data, old exports and backups still
// import without it, and nothing in the app, server or MCP still uses it.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { applyMigration } from '../tools/migrations/_lib.mjs';
import * as m080 from '../tools/migrations/080-remove-boards.mjs';
import { dropRetiredState, RETIRED_STATE_KEYS } from '../lib/state-keys.mjs';
import { exportData, importData, restoreBackup } from '../lib/sharing.mjs';
import { createStateStore } from '../server/state-store.mjs';
import { ensureDataDir, dataPaths, saveConfig, loadConfig, DEFAULT_CONFIG } from '../lib/datadir.mjs';
import { INSTRUCTIONS } from '../mcp/instructions.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function oldState() {
  return {
    _lastSave: 1000, view: 'board:b1',
    custom: [{ id: 't1', title: 'Write report', stream: 'work', tags: [] }, { id: 'bx', kind: 'board', title: 'Stray board' }],
    statuses: {}, people: [{ id: 'sam', name: 'Sam' }],
    bin: {
      tasks: [
        { id: 't9', kind: 'custom', binTs: 5, customData: { id: 't9', title: 'Old task' } },
        { id: 'b2', kind: 'board', binTs: 6, boardData: { id: 'b2', title: 'Old board', ideas: [{ id: 'i9' }] } },
      ],
      notes: [],
    },
    boards: [{ id: 'b1', title: 'Board title', stream: 'work', tags: ['x'],
      ideas: [{ id: 'i1', text: 'Idea text' }, { id: 'i2' }, { id: 'i3' }, { id: 'i4' }], connections: [{ from: 'i1', to: 'i2' }] }],
    boardCollapsed: { b1: true }, canvasConnect: null,
    collapsedSidebar: { boards: true, streams: false },
  };
}

let dir;
const p = () => dataPaths(dir);
const readState = () => JSON.parse(readFileSync(p().stateFile, 'utf8'));
const writeState = (s) => { mkdirSync(dirname(p().stateFile), { recursive: true }); writeFileSync(p().stateFile, JSON.stringify(s)); };
const run = (opts = {}) => applyMigration(m080, { dataDir: dir, dryRun: !!opts.dryRun, log: () => {} });
const archives = () => (existsSync(p().backups) ? readdirSync(p().backups).filter(n => /^boards-archive-.*\.json$/.test(n)) : []);
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'boards-mig-'));
  writeState(oldState());
  writeFileSync(p().config, JSON.stringify({ version: 1, userName: 'Test', features: { finance: true, calendar: false, email: true, boards: true, ai: true } }));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test('080 dry run reports counts and writes nothing', async () => {
  const st = readFileSync(p().stateFile, 'utf8'), cfg = readFileSync(p().config, 'utf8');
  const r = await run({ dryRun: true });
  assert.equal(r.changed, true);
  assert.equal(r.stats.boards, 1); assert.equal(r.stats.ideas, 4); assert.equal(r.stats.connections, 1);
  assert.equal(r.stats.binnedBoards, 1); assert.equal(r.stats.boardTasks, 1); assert.equal(r.stats.configSwitch, true);
  assert.equal(readFileSync(p().stateFile, 'utf8'), st);
  assert.equal(readFileSync(p().config, 'utf8'), cfg);
  assert.deepEqual(archives(), []);
});

test('080 archives the boards first, then removes them from the state and config; idempotent', async () => {
  const r = await run();
  assert.equal(r.changed, true);
  // the archive holds everything that was removed
  assert.deepEqual(archives(), [r.archive]);
  const a = JSON.parse(readFileSync(join(p().backups, r.archive), 'utf8'));
  assert.equal(a.id, '080-remove-boards');
  assert.deepEqual(a.boards, oldState().boards);
  assert.deepEqual(a.boardCollapsed, { b1: true });
  assert.ok('canvasConnect' in a, 'a null canvasConnect is archived too');
  assert.deepEqual(a.binnedBoards.map(b => b.id), ['b2']);
  assert.deepEqual(a.boardTasks.map(b => b.id), ['bx']);
  assert.deepEqual(a.collapsedSidebar, { boards: true });
  assert.equal(a.view, 'board:b1');
  assert.deepEqual(a.config, { features: { boards: true } });
  // the state keeps everything else
  const s = readState();
  for (const k of RETIRED_STATE_KEYS) assert.ok(!(k in s), k);
  assert.deepEqual(s.custom.map(t => t.id), ['t1']);
  assert.deepEqual(s.bin.tasks.map(t => t.id), ['t9']);
  assert.deepEqual(s.collapsedSidebar, { streams: false });
  assert.equal(s.view, 'home');
  assert.deepEqual(s.people, [{ id: 'sam', name: 'Sam' }]);
  assert.ok(s._lastSave > 1000, '_lastSave bumped so open tabs reload');
  assert.ok(readdirSync(p().stateBackups).some(n => n.startsWith('pre-080-remove-boards-')), 'the state was backed up before the write');
  // config.json loses only the switch
  const cfg = JSON.parse(readFileSync(p().config, 'utf8'));
  assert.deepEqual(cfg.features, { finance: true, calendar: false, email: true, ai: true });
  assert.equal(cfg.userName, 'Test');
  // counts, not content
  const notes = r.notes.join('\n');
  assert.match(notes, /boards: 1 \(4 ideas, 1 connections\)/);
  for (const text of ['Board title', 'Idea text', 'Old board', 'Stray board']) assert.ok(!notes.includes(text), text);
  // a second run changes nothing
  const before = readFileSync(p().stateFile, 'utf8');
  const again = await run();
  assert.equal(again.changed, false);
  assert.equal(readFileSync(p().stateFile, 'utf8'), before);
  assert.equal(archives().length, 1);
});

test('080 leaves a data folder without boards alone, and cleans a lone config switch', async () => {
  const s0 = oldState(); dropRetiredState(s0); writeState(s0);
  writeFileSync(p().config, JSON.stringify({ version: 1, features: { finance: true } }));
  const st = readFileSync(p().stateFile, 'utf8');
  assert.equal((await run()).changed, false);
  assert.equal(readFileSync(p().stateFile, 'utf8'), st);
  assert.deepEqual(archives(), []);
  // only the old feature switch left: config cleaned, state untouched
  writeFileSync(p().config, JSON.stringify({ version: 1, features: { finance: true, boards: false } }));
  const r = await run();
  assert.equal(r.changed, true);
  assert.deepEqual(JSON.parse(readFileSync(p().config, 'utf8')).features, { finance: true });
  assert.equal(readFileSync(p().stateFile, 'utf8'), st);
  assert.deepEqual(JSON.parse(readFileSync(join(p().backups, r.archive), 'utf8')).config, { features: { boards: false } });
});

test('080 with no state file and no config does nothing', async () => {
  rmSync(p().stateFile); rmSync(p().config);
  const r = await run();
  assert.equal(r.changed, false);
  assert.deepEqual(archives(), []);
});

test('dropRetiredState: null when there is nothing; the board view goes Home', () => {
  assert.equal(dropRetiredState(null), null);
  assert.equal(dropRetiredState({ custom: [], view: 'today', bin: { tasks: [], notes: [] } }), null);
  const s = { view: 'board:zz', custom: [] };
  assert.deepEqual(dropRetiredState(s), { view: 'board:zz' });
  assert.equal(s.view, 'home');
  assert.ok(!('boards' in DEFAULT_CONFIG.features), 'no feature switch for boards');
});

async function makeData(name) {
  const d = join(dir, name);
  await ensureDataDir(d);
  const paths = dataPaths(d);
  const store = createStateStore({ stateDir: paths.stateDir });
  await store.mutate(() => ({ next: { custom: [{ id: 'n1', title: 'New' }], people: [] }, result: true }));
  return { d, paths, store, setConfig: (patch) => saveConfig(d, patch) };
}

test('an old export with boards still imports, without the boards', async () => {
  const a = await makeData('A');
  writeFileSync(a.paths.stateFile, JSON.stringify(oldState()));
  writeFileSync(a.paths.config, JSON.stringify({ version: 1, userName: 'Test', features: { finance: true, boards: true } }));
  const z = exportData({ dataDir: a.d });
  const b = await makeData('B');
  const r = await importData({ buffer: z.buffer, dataDir: b.d, store: b.store, setConfig: b.setConfig });
  assert.equal(r.tasks, 2);
  const s = await b.store.readObject();
  for (const k of RETIRED_STATE_KEYS) assert.ok(!(k in s), k);
  assert.deepEqual(s.custom.map(t => t.id), ['t1']);
  assert.deepEqual(s.bin.tasks.map(t => t.id), ['t9']);
  assert.equal(s.view, 'home');
  assert.ok(!('boards' in (await loadConfig(b.d)).features));
});

test('restoring a backup from before the retirement leaves the boards out', async () => {
  const c = await makeData('C');
  mkdirSync(c.paths.stateBackups, { recursive: true });
  writeFileSync(join(c.paths.stateBackups, 'old-with-boards.json'), JSON.stringify(oldState()));
  await restoreBackup({ name: 'old-with-boards.json', paths: c.paths, store: c.store });
  const s = await c.store.readObject();
  for (const k of RETIRED_STATE_KEYS) assert.ok(!(k in s), k);
  assert.deepEqual(s.bin.tasks.map(t => t.id), ['t9']);
  assert.ok(!String(s.view || '').startsWith('board:'));
});

test('nothing in the app, server or MCP still uses boards', () => {
  for (const f of ['src/app/45-boards.js', 'src/app/46-boards-canvas.js', 'src/styles/60-boards.css', 'src/styles/64-boards-tree.css']) {
    assert.ok(!existsSync(join(ROOT, f)), `${f} was deleted`);
  }
  // The retired keys are named only where they are dropped (state-keys and its
  // page twin) and where an old board view is sent Home.
  const allowed = new Set(['lib/state-keys.mjs', 'src/app/01-core-state.js', 'src/app/05-core-state-init.js']);
  const USES = /state\.boards|\.boards\b|boardCollapsed|canvasConnect|['"`]board:|renderBoard|createBoard|\bboardData\b|_canvasSelected|idea-card|canvas-selected|features\.boards/;
  const files = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const full = join(d, n);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(m?js|css|html)$/.test(n)) files.push(full);
    }
  };
  for (const d of ['src', 'server', 'mcp', 'lib']) walk(join(ROOT, d));
  for (const full of files) {
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    if (allowed.has(rel)) continue;
    const hit = readFileSync(full, 'utf8').split('\n').findIndex(l => USES.test(l));
    assert.equal(hit, -1, `${rel}:${hit + 1} still refers to boards`);
  }
  assert.ok(!/\bboards?\b/i.test(INSTRUCTIONS.replace(/dashboard/gi, '')), 'the MCP instructions do not mention boards');
});

// Auto-linking: the workspace index (lib/workspace-index.mjs: skips, .gitignore,
// names-only folders, secrets, incremental, office titles), the candidates
// (lib/autolink.mjs: deepest concentrating FOLDER, never a file; project roots
// only when the task is about the project; events, emails, people, tasks), the
// judge (batches, strict validation, privacy), the actions-layer ops
// (links.suggest / rate / apply / reject, task.relate, undo, rejection memory,
// the two-folders-per-task cap), the background service with a fake judge,
// the routes, migration 072 and the MCP tool list. Generic names only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { makeDataDir, sampleState, TODAY, addDays } from './fixtures/actions-state.mjs';
import * as W from '../lib/workspace-index.mjs';
import * as A from '../lib/autolink.mjs';
import { createZip } from '../lib/zip.mjs';
import { createActions } from '../server/actions/index.mjs';
import { dataPaths } from '../lib/datadir.mjs';

// As on CI: no Claude CLI, so the server's start-up checks never run a real one
// (the judge is a fake) and close() never waits for one.
process.env.CLAUDE_CLI_PATH = join(tmpdir(), 'opendash-tests-no-claude-cli', 'claude');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const w = (p, text) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
const pptx = (title, slide) => createZip([
  { name: 'docProps/core.xml', data: `<?xml version="1.0"?><cp:coreProperties xmlns:dc="x" xmlns:cp="y"><dc:title>${title}</dc:title></cp:coreProperties>` },
  { name: 'ppt/slides/slide1.xml', data: `<p:sld><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${slide}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>` },
  { name: 'ppt/media/big.bin', data: Buffer.alloc(5000, 7) },
]);

/** A workspace: a git project with a deck folder, junk folders, ignored files, a names-only folder; and a loose "container" folder. */
function makeWorkspace() {
  const base = mkdtempSync(join(tmpdir(), 'al-ws-'));
  const proj = join(base, 'Widgets');
  w(join(proj, '.git', 'config'), '[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = https://user:tok@github.com/acme/widgets.git\n');
  w(join(proj, '.gitignore'), 'build-out/\n*.log\n!keep.log\n/secret-notes.md\n/private-data/*\n');
  w(join(proj, 'README.md'), '# Widgets planner\nThe planning tool.\n');
  writeFileSync(join(proj, 'keep.log'), 'kept');
  writeFileSync(join(proj, 'debug.log'), 'ignored');
  writeFileSync(join(proj, 'secret-notes.md'), '# hidden');
  w(join(proj, 'deck', 'Lisbon_pitch_deck.pptx'), pptx('Lisbon pitch', 'Margins at Lisbon'));
  w(join(proj, 'deck', 'lisbon_numbers.py'), '"""Numbers for the Lisbon deck."""\ndef margin():\n    return 1\n');
  w(join(proj, 'deck', 'notes.md'), '# Lisbon deck notes\n## Caveats\n');
  w(join(proj, 'src', 'app.py'), 'def run():\n    pass\n');
  w(join(proj, 'src', 'scheduler.py'), '"""Scheduler core."""\n');
  for (let i = 0; i < 40; i++) w(join(proj, 'src', `module_${i}.py`), `"""Planner module ${i}: queues, slots and capacity."""\n`);
  for (let i = 0; i < 20; i++) w(join(proj, 'docs', `guide_${i}.md`), `# Guide ${i}\nHow the planner handles orders.\n`);
  w(join(proj, 'node_modules', 'pkg', 'index.js'), '// lisbon lisbon');
  w(join(proj, 'venv', 'pyvenv.cfg'), 'home = x');
  w(join(proj, 'venv', 'lib', 'lisbon.py'), 'x');
  w(join(proj, 'tools', 'env', 'pyvenv.cfg'), 'home = x');
  w(join(proj, 'tools', 'env', 'lisbon_env.py'), 'x');
  w(join(proj, '__pycache__', 'a.pyc'), 'x');
  w(join(proj, 'dist', 'lisbon.js'), 'x');
  w(join(proj, 'build-out', 'lisbon.txt'), 'x');
  w(join(proj, 'client_data', 'acme', 'Lisbon_contract.md'), '# Confidential terms of the Lisbon contract');
  w(join(proj, 'private-data', 'Lisbon_private.md'), '# Private body text');
  w(join(proj, '.env'), 'TOKEN=abc123');
  w(join(proj, 'config', 'credentials.json'), '{"password": "hunter2"}');
  const loose = join(base, 'Inbox');
  w(join(loose, 'lisbon_loose_notes.txt'), 'Lisbon deck numbers again');
  w(join(loose, 'Holiday', 'plan.md'), '# Holiday plan\n');
  return { base, proj, loose };
}

// ─── The index ─────────────────────────────────────────────────────────────
test('gitignore: plain, anchored, dir-only, negation, ** and classes', () => {
  const rules = W.parseGitignore('# c\n*.log\n!keep.log\nbuild/\n/top.txt\ndocs/**/draft-*.md\n[Tt]emp?\n\\#hash\n');
  const sets = [{ base: '', rules }];
  const ig = (p, d = false) => W.gitIgnored(sets, p, d);
  assert.equal(ig('a.log'), true); assert.equal(ig('x/y/a.log'), true); assert.equal(ig('keep.log'), false);
  assert.equal(ig('build', true), true); assert.equal(ig('build', false), false, 'dir-only rule');
  assert.equal(ig('top.txt'), true); assert.equal(ig('sub/top.txt'), false, 'anchored');
  assert.equal(ig('docs/a/b/draft-1.md'), true); assert.equal(ig('docs/draft-1.md'), true); assert.equal(ig('docs/a/final.md'), false);
  assert.equal(ig('Temp1'), true); assert.equal(ig('temp2'), true); assert.equal(ig('#hash'), true);
  const nested = [{ base: '', rules: W.parseGitignore('*.tmp') }, { base: 'sub', rules: W.parseGitignore('!keep.tmp\n/local.txt') }];
  assert.equal(W.gitIgnored(nested, 'sub/keep.tmp', false), false, 'a deeper .gitignore can re-include');
  assert.equal(W.gitIgnored(nested, 'sub/local.txt', false), true);
  assert.equal(W.gitIgnored(nested, 'local.txt', false), false);
});

test('index: skips junk, venvs, ignored files and symlinks; names-only folders and secrets are never opened; office titles; git remote without credentials', async () => {
  const ws = makeWorkspace();
  try {
    const doc = await W.buildIndex({ folders: [{ path: ws.proj }, { path: ws.loose, container: true, depth: 1 }], namesOnly: [join(ws.proj, 'private-data')], platform: 'linux' });
    const names = doc.files.map(f => f.n);
    for (const n of ['README.md', 'keep.log', 'Lisbon_pitch_deck.pptx', 'lisbon_numbers.py', 'notes.md', 'app.py', 'Lisbon_contract.md', 'lisbon_loose_notes.txt', 'plan.md', 'Lisbon_private.md', '.env', 'credentials.json']) assert.ok(names.includes(n), `indexed: ${n}`);
    for (const n of ['debug.log', 'secret-notes.md', 'index.js', 'lisbon.py', 'lisbon_env.py', 'a.pyc', 'lisbon.js', 'lisbon.txt', 'config']) assert.ok(!names.includes(n), `skipped: ${n}`);
    const f = (n) => doc.files.find(x => x.n === n);
    assert.match(f('README.md').x, /Widgets planner/);
    assert.match(f('lisbon_numbers.py').x, /Numbers for the Lisbon deck/);
    assert.match(f('lisbon_numbers.py').x, /margin/);
    assert.equal(f('Lisbon_pitch_deck.pptx').t, 'Lisbon pitch');
    assert.match(f('Lisbon_pitch_deck.pptx').x, /Margins at Lisbon/, 'pptx slide titles');
    // names only: a default name (client_data) and an explicit path that a .gitignore hides
    for (const n of ['Lisbon_contract.md', 'Lisbon_private.md']) {
      assert.equal(f(n).x, undefined, `${n}: no excerpt`); assert.equal(f(n).t, undefined);
      assert.equal(doc.dirs[f(n).d].no, 1, `${n}: its folder is marked names-only`);
    }
    // secrets are listed but never opened
    assert.equal(f('.env').x, undefined); assert.equal(f('credentials.json').x, undefined);
    assert.ok(!JSON.stringify(doc).includes('abc123') && !JSON.stringify(doc).includes('hunter2') && !JSON.stringify(doc).includes('Confidential terms') && !JSON.stringify(doc).includes('Private body'), 'no secret or names-only content anywhere in the index');
    assert.deepEqual(doc.repos[0].github, { owner: 'acme', repo: 'widgets' });
    assert.equal(doc.repos[0].remote, 'https://github.com/acme/widgets', 'credentials stripped');
    // container depth 1: its subfolder is walked, nothing deeper
    assert.ok(doc.dirs.some(d => d.p === join(ws.loose, 'Holiday')));
    assert.equal(doc.roots[1].container, true);
  } finally { rmSync(ws.base, { recursive: true, force: true }); }
});

test('index: incremental by size + mtime, limits, progress, OneDrive online-only files', async () => {
  const ws = makeWorkspace();
  try {
    const ticks = [];
    const first = await W.buildIndex({ folders: [{ path: ws.proj }], platform: 'linux', onProgress: (p) => ticks.push(p) });
    assert.ok(first.stats.read >= 4 && ticks.length >= 1);
    const again = await W.buildIndex({ folders: [{ path: ws.proj }], prev: first, platform: 'linux' });
    assert.equal(again.stats.read, 0, 'nothing re-read');
    assert.ok(again.stats.reused >= 4);
    assert.match(again.files.find(x => x.n === 'README.md').x, /Widgets planner/, 'excerpts carried over');
    w(join(ws.proj, 'README.md'), '# Widgets planner v2 with a longer heading\n');
    const old = new Date(Date.now() - 3600e3);
    utimesSync(join(ws.proj, 'deck', 'notes.md'), old, old);   // mtime changed: re-read too
    const third = await W.buildIndex({ folders: [{ path: ws.proj }], prev: again, platform: 'linux' });
    assert.equal(third.stats.read, 2);
    assert.match(third.files.find(x => x.n === 'README.md').x, /v2/);
    const capped = await W.buildIndex({ folders: [{ path: ws.proj }], platform: 'linux', limits: { maxFiles: 3 } });
    assert.equal(capped.files.length, 3); assert.equal(capped.stats.truncated, true);
    const shallow = await W.buildIndex({ folders: [{ path: ws.proj, depth: 0 }], platform: 'linux' });
    assert.ok(shallow.files.every(x => shallow.dirs[x.d].p === ws.proj), 'depth 0: only the folder itself');
    // OneDrive: online-only files are not opened; a failed check means nothing there is opened
    const od = join(ws.base, 'OneDrive', 'Docs');
    w(join(od, 'cloud.md'), '# Cloud heading'); w(join(od, 'local.md'), '# Local heading');
    const cloud = await W.buildIndex({ folders: [{ path: od }], platform: 'win32', cloudCheck: async () => new Set([join(od, 'cloud.md').toLowerCase()]) });
    assert.equal(cloud.files.find(x => x.n === 'cloud.md').x, undefined);
    assert.match(cloud.files.find(x => x.n === 'local.md').x, /Local heading/);
    const unknown = await W.buildIndex({ folders: [{ path: od }], platform: 'win32', cloudCheck: async () => null });
    assert.ok(unknown.files.every(x => !x.x) && unknown.roots[0].cloudUnknown);
    // A missing folder is reported, not thrown.
    const miss = await W.buildIndex({ folders: [{ path: join(ws.base, 'nope') }], platform: 'linux' });
    assert.equal(miss.roots[0].error, 'MISSING');
  } finally { rmSync(ws.base, { recursive: true, force: true }); }
});

test('settings: validated (local absolute folders only, ranges clamped, unknown fields dropped)', () => {
  const s = W.normalizeSettings({ enabled: true, folders: ['C:\\Work', { path: 'c:/work/' }, '\\\\server\\share', 'relative', { path: '/home/x', depth: 99, container: true }], namesOnly: [' secret-stuff ', ''], threshold: 3, judge: { model: 'gpt-x', maxCallsPerHour: 0 }, evil: 1 });
  assert.deepEqual(s.folders, [{ path: 'C:\\Work' }, { path: '/home/x', depth: 20, container: true }]);
  assert.deepEqual(s.namesOnly, ['secret-stuff']);
  assert.equal(s.threshold, 0.99); assert.equal(s.judge.model, 'claude-haiku-4-5'); assert.equal(s.judge.maxCallsPerHour, 1);
  assert.equal(s.evil, undefined); assert.equal(s.enabled, true);
  assert.equal(W.normalizeSettings({}).enabled, false, 'off until the user turns it on');
});

// ─── Candidates ────────────────────────────────────────────────────────────
function alState(ws) {
  const s = sampleState();
  const t = (id, title, extra = {}) => ({ id, title, dueDate: null, priority: 'p2', tags: [], stream: 'work', detail: '', subtasks: [], recurrence: 'none', people: [], ...extra });
  s.custom.push(
    t('u-r1', 'Finish the Lisbon deck numbers and caveats', { people: ['sam'], dueDate: addDays(TODAY, 3) }),
    t('u-r2', 'Widgets roadmap: plan the next quarter of the widgets project'),
    t('u-r3', 'Check the Lisbon deck numbers once more'),
    t('u-r4', 'Ask Alex Kim about the holiday plan', { stream: 'personal' }),
    t('u-r5', 'Pay the parking fine'),
  );
  return s;
}
async function setupData(ws) {
  const dir = makeDataDir(alState(ws));
  const paths = dataPaths(dir);
  w(join(dir, 'calendar', 'events.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), events: [
    { id: 'evrot1', summary: 'Lisbon deck review', start: { dateTime: `${addDays(TODAY, 2)}T10:00:00Z` }, end: { dateTime: `${addDays(TODAY, 2)}T11:00:00Z` }, attendees: [{ email: 'sam@example.com', name: 'Sam Taylor' }] },
    { id: 'evother', summary: 'Dentist', start: { date: addDays(TODAY, 1) }, end: { date: addDays(TODAY, 2) } },
  ] }));
  w(join(dir, 'inbox', 'messages.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), messages: [
    { id: 'thr1', subject: 'Lisbon deck numbers', from: { name: 'Sam Taylor', email: 'sam@example.com' }, date: `${TODAY}T09:00:00Z`, snippet: '' },
    { id: 'thr2', subject: 'Your parcel', from: { name: 'Shop', email: 'shop@example.org' }, date: `${TODAY}T09:00:00Z`, snippet: '' },
  ] }));
  await W.saveSettings(dir, { enabled: false, folders: [{ path: ws.proj }, { path: ws.loose, container: true, depth: 1 }] });
  const doc = await W.buildIndex({ folders: [{ path: ws.proj }, { path: ws.loose, container: true, depth: 1 }], platform: 'linux' });
  await W.writeIndex(dir, doc);
  A.clearContextCache();
  return { dir, paths };
}

test('candidates: the deepest folder that concentrates the matches (never a file), files as the why; roots only for whole-project tasks', async () => {
  const ws = makeWorkspace();
  const { dir, paths } = await setupData(ws);
  try {
    const s = JSON.parse(readFileSync(paths.stateFile, 'utf8'));
    const ctx = A.loadContextSync(paths);
    const res = A.computeCandidates(s, ctx, { today: TODAY });
    const r1 = res.get('u-r1');
    const folders = r1.filter(c => c.type === 'resource' && c.target.kind === 'folder');
    assert.equal(folders[0].target.target, join(ws.proj, 'deck'), 'the deck folder, not the project root, not a file');
    assert.ok(r1.every(c => c.type !== 'resource' || ['folder', 'github'].includes(c.target.kind)), 'never a file');
    assert.ok(!r1.some(c => c.type === 'resource' && c.target.target === ws.loose), 'a container folder itself is never suggested');
    assert.match(folders[0].why[0], /Contains .*(Lisbon_pitch_deck\.pptx|lisbon_numbers\.py)/);
    assert.ok(folders[0].hints.length >= 2);
    assert.ok(folders[0].score <= A.RULE_CAP, 'rules alone never reach the auto threshold');
    assert.ok(!r1.some(c => c.type === 'resource' && c.target.kind === 'github'), 'no repo link: the task is about one folder, not the project');
    // Calendar, email, people, tasks.
    const ev = r1.find(c => c.type === 'event');
    assert.equal(ev.target.eventId, 'evrot1'); assert.match(ev.why.join(' '), /Sam Taylor/);
    assert.ok(!r1.some(c => c.type === 'event' && c.target.eventId === 'evother'));
    const em = r1.find(c => c.type === 'email');
    assert.equal(em.target.messageId, 'thr1');
    assert.ok(r1.some(c => c.type === 'task' && c.target.taskId === 'u-r3'), 'a similar task');
    // A whole-project task: the repo (named in the task) may be the root, and its GitHub repo is offered.
    const r2 = res.get('u-r2');
    assert.ok(r2.some(c => c.type === 'resource' && c.target.kind === 'github' && c.target.target === 'https://github.com/acme/widgets'));
    // People named in the task.
    assert.ok(res.get('u-r4').some(c => c.type === 'person' && c.target.personId === 'alex'));
    // Unrelated tasks get nothing from the folders.
    assert.ok(!res.get('u-r5').some(c => c.type === 'resource'));
    // Names-only folders: their file names may be the why, their contents never.
    assert.ok(!JSON.stringify([...res.values()]).includes('Confidential terms'));
    // Keys are stable; task pairs share one key both ways.
    assert.equal(A.linkKey('b', 'task', 'a'), A.linkKey('a', 'task', 'b'));
    assert.equal(A.suggestionId('x|resource|y'), A.suggestionId('x|resource|y'));
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(ws.base, { recursive: true, force: true }); }
});

// ─── Judge ─────────────────────────────────────────────────────────────────
test('judge: batches carry ids, names, paths and why only; the answer is validated strictly', () => {
  const s = alState();
  const sug = (id, type, target, extra = {}) => ({ id, key: `u-r1|${type}|${id}`, taskId: 'u-r1', type, target, score: 0.5, why: ['Contains a.pptx'], ...extra });
  const items = [{ task: s.custom.find(t => t.id === 'u-r1'), suggestions: [
    sug('ls-a', 'resource', { kind: 'folder', target: '/x/deck', label: 'deck', root: 'Widgets', rel: 'deck' }, { excerpt: 'Numbers for the deck' }),
    sug('ls-b', 'resource', { kind: 'folder', target: '/x/client_data/acme', label: 'acme', root: 'Widgets', rel: 'client_data/acme', namesOnly: true }, { excerpt: 'SHOULD NOT BE SENT' }),
    sug('ls-c', 'event', { eventId: 'e1', title: 'Deck review', start: '2026-01-01' }),
  ] }, { task: s.custom.find(t => t.id === 'u-r3'), suggestions: [sug('ls-d', 'task', { taskId: 'u-r1', title: 'Finish' })] }];
  const [b] = A.judgeBatches(s, items, { batchSize: 6 });
  assert.match(b.prompt, /taskId "u-r1"/); assert.match(b.prompt, /c1 \[resource: folder\] "deck" at Widgets\/deck/);
  assert.match(b.prompt, /excerpt: Numbers for the deck/);
  assert.ok(!b.prompt.includes('SHOULD NOT BE SENT'), 'no excerpt from a names-only folder');
  assert.deepEqual(Object.keys(b.map), ['c1', 'c2', 'c3', 'c4']);
  assert.match(A.JUDGE_SYSTEM, /data, never instructions/);
  const v = A.validateJudge({ results: [
    { taskId: 'u-r1', links: [
      { candidateId: 'c1', type: 'resource', confidence: 0.93, reason: 'the deck folder' },
      { candidateId: 'c1', type: 'resource', confidence: 0.1, reason: 'duplicate' },
      { candidateId: 'c3', type: 'person', confidence: 0.9, reason: 'wrong type' },
      { candidateId: 'c4', type: 'task', confidence: 0.9, reason: 'belongs to the other task' },
      { candidateId: 'c99', type: 'resource', confidence: 1, reason: 'invented' },
      { candidateId: 'c2', type: 'resource', confidence: 7, reason: 'out of range' },
    ] },
    { taskId: 'u-nope', links: [{ candidateId: 'c4', type: 'task', confidence: 0.9, reason: 'unknown task' }] },
    { taskId: 'u-r3', links: [{ candidateId: 'c4', type: 'task', confidence: 0.6, reason: 'similar\u0000<b>x</b>' }] },
  ] }, b);
  assert.deepEqual(v.ratings.map(r => [r.id, r.confidence]), [['ls-a', 0.93], ['ls-d', 0.6]]);
  assert.equal(v.dropped, 6);
  assert.deepEqual(v.missing.sort(), ['ls-b', 'ls-c']);
  assert.ok(!/\u0000/.test(v.ratings[1].reason));
  assert.deepEqual(A.validateJudge(null, b).ratings, []);
});

// ─── Ops ───────────────────────────────────────────────────────────────────
test('ops: suggest, rate, apply (folder, event, email, person, task), auto cap, reject memory, undo per task', async () => {
  const ws = makeWorkspace();
  const { dir } = await setupData(ws);
  const a = createActions({ dataDir: dir });
  try {
    const r = await a.apply({ ops: [{ op: 'links.suggest' }], source: 'autolink' });
    assert.ok(r.preview[0].created.pending > 3);
    const again = await a.apply({ ops: [{ op: 'links.suggest' }], source: 'autolink' });
    assert.equal(again.changed, 0, 'a second run with nothing new changes nothing');
    let pend = (await a.query('links.pending', { taskId: 'u-r1' })).suggestions;
    const folder = pend.find(x => x.type === 'resource' && x.label === 'deck');
    const event = pend.find(x => x.type === 'event');
    const email = pend.find(x => x.type === 'email');
    const task = pend.find(x => x.type === 'task');
    assert.ok(folder && event && email && task);
    assert.ok(pend.every(x => x.confidence <= 0.75 && !x.judged));

    // The judge's ratings; auto-apply takes only judged ones at or above the threshold.
    await a.apply({ ops: [{ op: 'links.rate', ratings: [{ id: folder.id, confidence: 0.92, reason: 'deck folder' }, { id: event.id, confidence: 0.9, reason: 'the review' }, { id: email.id, confidence: 0.5, reason: 'maybe' }], model: 'claude-haiku-4-5' }], source: 'autolink' });
    const auto = await a.apply({ ops: [{ op: 'links.apply', suggestionIds: [folder.id, event.id, email.id, task.id], auto: true, minConfidence: 0.85, maxPerTask: 2 }], source: 'autolink' });
    assert.deepEqual(auto.preview[0].created.appliedKeys.map(k => k.split("|")[1]).sort(), ["event", "resource"], JSON.stringify(auto.preview[0].created));
    assert.equal(auto.preview[0].created.applied, 2);
    const s1 = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    const res = s1.resources.find(x => x.target === join(ws.proj, 'deck'));
    assert.equal(res.kind, 'folder'); assert.deepEqual(res.links, [{ type: 'task', id: 'u-r1' }]);
    assert.deepEqual(s1.eventMeta.evrot1.tasks, ['u-r1']);
    assert.equal(s1.autolink.applied[s1.autolink.suggestions.length >= 0 && Object.keys(s1.autolink.applied)[0]].by, 'auto');
    assert.ok(s1.autolink.suggestions.some(x => x.id === email.id), 'below the threshold: still a suggestion');
    assert.ok(s1.taskActivity['u-r1'].some(x => /Auto-linked folder: deck/.test(x.text)));
    // get_related shows them
    const rel = await a.query('task.related', { id: 'u-r1' });
    assert.equal(rel.files[0].label, 'deck'); assert.equal(rel.events[0].eventId, 'evrot1');

    // A later suggestion run for ANOTHER task does not block undoing this batch.
    await a.apply({ ops: [{ op: 'links.suggest', taskId: 'u-r2' }], source: 'autolink' });
    // Nor does a later rating of the SAME task's other suggestions (suggestions churn; only accept/reject memory counts).
    await a.apply({ ops: [{ op: 'links.rate', ratings: [{ id: task.id, confidence: 0.4, reason: 'later run' }] }], source: 'autolink' });
    await a.undo(auto.undo);
    const s2 = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    assert.ok(!s2.resources.some(x => x.target === join(ws.proj, 'deck')), 'undo removes the attached folder');
    assert.ok(!(s2.eventMeta && s2.eventMeta.evrot1), 'and the event link');
    const back = s2.autolink.suggestions.find(x => x.id === folder.id);
    assert.equal(back.judged.confidence, 0.92, 'the suggestion is back, with its rating');

    // Manual accept: email + task relate (both directions), person link.
    const man = await a.apply({ ops: [{ op: 'links.apply', suggestionIds: [email.id, task.id] }], source: 'ui' });
    assert.equal(man.preview[0].created.applied, 2);
    const rel2 = await a.query('task.related', { id: 'u-r1' });
    assert.equal(rel2.emails[0].id, 'thr1'); assert.equal(rel2.emails[0].subject, 'Lisbon deck numbers');
    assert.equal(rel2.tasks[0].id, 'u-r3');
    assert.equal((await a.query('task.related', { id: 'u-r3' })).tasks[0].id, 'u-r1', 'related both ways');
    const p4 = (await a.query('links.pending', { taskId: 'u-r4' })).suggestions.find(x => x.type === 'person');
    await a.apply({ ops: [{ op: 'links.apply', suggestionIds: [p4.id] }], source: 'ui' });
    assert.ok((await a.query('task.related', { id: 'u-r4' })).people.some(p => p.id === 'alex'));

    // Accepted and rejected links never come back.
    const r2folder = (await a.query('links.pending', { taskId: 'u-r2' })).suggestions.find(x => x.type === 'resource');
    await a.apply({ ops: [{ op: 'links.reject', suggestionIds: [r2folder.id] }], source: 'ui' });
    await a.apply({ ops: [{ op: 'links.suggest' }], source: 'autolink' });
    const after = (await a.query('links.pending', {})).suggestions;
    assert.ok(!after.some(x => x.id === r2folder.id), 'rejected stays rejected');
    assert.ok(!after.some(x => x.id === email.id || x.id === task.id), 'accepted is not suggested again');
    // Rejecting something that is linked (the page's Unlink) by its target.
    await a.apply({ ops: [{ op: 'task.unrelate', id: 'u-r1', type: 'task', target: 'u-r3' }, { op: 'links.reject', items: [{ taskId: 'u-r1', type: 'task', target: { taskId: 'u-r3' } }] }], source: 'ui' });
    assert.equal((await a.query('task.related', { id: 'u-r3' })).tasks.length, 0, 'unrelate clears both directions');
    await a.apply({ ops: [{ op: 'links.suggest' }], source: 'autolink' });
    assert.ok(!(await a.query('links.pending', { taskId: 'u-r3' })).suggestions.some(x => x.type === 'task' && x.label.includes('Finish the Lisbon')));

    // The cap: at most N folder-level links automatically per task.
    const s3 = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    const capIds = s3.autolink.suggestions.filter(x => x.taskId === 'u-r1' && x.type === 'resource').map(x => x.id);
    await a.apply({ ops: [{ op: 'links.rate', ratings: capIds.map(id => ({ id, confidence: 0.95, reason: 'x' })) }], source: 'autolink' });
    const capped = await a.apply({ ops: [{ op: 'links.apply', suggestionIds: capIds, auto: true, minConfidence: 0.85, maxPerTask: 0 }], source: 'autolink' });
    assert.equal(capped.preview[0].created.applied, 0);
    assert.match(capped.warnings.map(x => x.message).join(' '), /at most 0/);

    // Errors a model can act on.
    await assert.rejects(a.apply({ ops: [{ op: 'links.apply', suggestionIds: ['ls-nope'] }] }), (e) => e.code === 'UNKNOWN_SUGGESTION');
    await assert.rejects(a.apply({ ops: [{ op: 'task.relate', id: 'u-r1', type: 'task', target: 'u-r1' }] }), (e) => e.code === 'BAD_VALUE');
    await assert.rejects(a.apply({ ops: [{ op: 'task.relate', id: 'u-r1', type: 'email', target: '../x' }] }), (e) => e.code === 'BAD_VALUE');
    await assert.rejects(a.apply({ ops: [{ op: 'links.apply', all: true }] }), (e) => e.code === 'INVALID_PARAMS');
    const d = a.describe();
    for (const tool of ['suggest_links', 'rate_suggested_links', 'apply_suggested_links', 'reject_suggested_links', 'relate_task', 'unrelate_task']) assert.ok(d.ops.some(o => o.tool === tool), tool);
    for (const tool of ['get_suggested_links', 'get_related']) assert.ok(d.queries.some(q => q.tool === tool), tool);
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(ws.base, { recursive: true, force: true }); }
});

// ─── The background service ────────────────────────────────────────────────
/** A judge stand-in: rates every candidate in the prompt; folders high, the rest low; plus junk it must survive. */
function fakeJudge(calls) {
  return async (opts) => {
    calls.push(opts);
    assert.equal(opts.profile, 'json'); assert.ok(opts.jsonSchema && opts.systemPrompt);
    const results = new Map();
    let cur = null;
    for (const line of opts.prompt.split('\n')) {
      const t = /taskId "([^"]+)"/.exec(line);
      if (t) { cur = t[1]; results.set(cur, []); continue; }
      const c = /^\s+(c\d+) \[(\w+)(?::\s*(\w+))?\]/.exec(line);
      if (c && cur) results.get(cur).push({ candidateId: c[1], type: c[2], confidence: c[3] === 'folder' ? 0.93 : 0.3, reason: c[3] === 'folder' ? 'where the work lives' : 'weak' });
    }
    const out = [...results].map(([taskId, links]) => ({ taskId, links: [...links, { candidateId: 'c999', type: 'resource', confidence: 1, reason: 'invented' }] }));
    return { json: { results: out }, text: '' };
  };
}

test('service: index, candidates, judge, auto-attach with undo; never re-applied after undo; rate limit; edits trigger a run', async () => {
  const ws = makeWorkspace();
  const { dir } = await setupData(ws);
  const a = createActions({ dataDir: dir });
  const calls = [];
  const logs = [];
  const svc = A.createAutolinkService({ dataDir: dir, actions: a, store: a.store, log: (l, m) => logs.push(m), run: fakeJudge(calls), judgeAvailable: async () => true, startDelayMs: 1e9, editDelayMs: 30 });
  try {
    await W.saveSettings(dir, { enabled: true, folders: [{ path: ws.proj }, { path: ws.loose, container: true, depth: 1 }], judge: { batchSize: 3 } });
    const rec = await svc.doRun({ full: true, taskIds: new Set(), trigger: 'test' });
    assert.ok(!rec.error, JSON.stringify(rec.error));
    assert.ok(rec.judged > 0 && rec.judgeDropped > 0, 'invented candidate ids are dropped');
    assert.ok(rec.autoApplied >= 1 && rec.undo);
    const st = await svc.getStatus();
    assert.ok(st.index.files > 5 && st.lastAuto.undo === rec.undo);
    for (const c of calls) {
      assert.ok(!c.prompt.includes('abc123') && !c.prompt.includes('Confidential terms') && !c.prompt.includes('Private body'), 'secrets and names-only contents never reach the judge');
      assert.equal(c.model, 'claude-haiku-4-5');
    }
    let s = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    assert.ok(s.resources.some(r => r.target === join(ws.proj, 'deck') && r.links.some(l => l.id === 'u-r1')), 'the deck folder was attached to the Lisbon task');
    assert.ok(!s.resources.some(r => r.kind === 'file'), 'never a single file');
    // Undo, then run again: it stays a suggestion (an undo is final for the auto-linker).
    await a.undo(rec.undo, { source: 'ui' });
    assert.equal((await svc.getStatus()).lastAuto, null, 'an undone batch is not offered for Undo again');
    const rec2 = await svc.doRun({ full: true, taskIds: new Set(), trigger: 'test' });
    assert.equal(rec2.autoApplied, 0);
    s = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    assert.ok(!s.resources.some(r => r.target === join(ws.proj, 'deck')));
    assert.ok(s.autolink.suggestions.some(x => x.target && x.target.target === join(ws.proj, 'deck') && x.judged), 'still offered for review');
    // Rate limit: one call an hour.
    await W.saveSettings(dir, { ...(await W.loadSettings(dir)), judge: { maxCallsPerHour: 1, batchSize: 1 } });
    await a.apply({ ops: [{ op: 'task.create', title: 'Lisbon deck caveats slide', stream: 'work' }], source: 'ui' });
    const rec3 = await svc.doRun({ full: true, taskIds: new Set(), trigger: 'test' });
    assert.equal(rec3.judgeSkipped, 'rate-limit');
    // Edits: a changed task is looked at again (debounced), without a full run.
    svc.start();
    await svc._changedTasks();   // the start's snapshot of every task's text is taken (a slow disk must not race the edit)
    const before = (await svc.getStatus()).runs.length;
    await a.apply({ ops: [{ op: 'task.update', id: 'u-r5', title: 'Pay the parking fine for the Lisbon trip' }], source: 'ui' });
    for (let i = 0; i < 100 && (await svc.getStatus()).runs.length === before; i++) await new Promise(r => setTimeout(r, 50));
    await svc.idle();
    const last = (await svc.getStatus()).lastRun;
    assert.equal(last.trigger, 'edit'); assert.equal(last.tasks, 1);
    assert.ok(logs.every(m => !/Lisbon|deck|Widgets/i.test(m)), 'logs carry counts, never titles or paths');
  } finally { svc.close(); rmSync(dir, { recursive: true, force: true }); rmSync(ws.base, { recursive: true, force: true }); }
});

// ─── Routes ────────────────────────────────────────────────────────────────
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function call(port, method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const h = { Host: `localhost:${port}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', ...headers };
    for (const k of Object.keys(h)) if (h[k] === null) delete h[k];
    const req = request({ host: '127.0.0.1', port, method, path, headers: h }, (r) => {
      let data = ''; r.setEncoding('utf8');
      r.on('data', d => { data += d; });
      r.on('end', () => { let json = null; try { json = JSON.parse(data); } catch {} res({ status: r.statusCode, json, text: data }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

test('routes: settings (validated, same-origin), status, run a task with the judge, folder suggestions', async () => {
  const ws = makeWorkspace();
  const { dir } = await setupData(ws);
  const port = await freePort();
  const { main } = await import('../server/index.mjs');
  const srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
  const calls = [];
  srv.ctx.autolinkRun = fakeJudge(calls);
  srv.ctx.autolinkJudgeAvailable = async () => true;
  srv.ctx.autolinkGithub = false;
  try {
    let r = await call(port, 'GET', '/api/autolink/settings');
    assert.equal(r.status, 200); assert.equal(r.json.folders.length, 2);
    r = await call(port, 'PUT', '/api/autolink/settings', { enabled: true, namesOnly: ['confidential'], folders: [...r.json.folders, { path: '\\\\server\\share' }], judge: { model: 'claude-sonnet-5' }, threshold: 0.9 });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.folders.length, 2, 'a network path is refused');
    assert.deepEqual(r.json.namesOnly, ['confidential']); assert.equal(r.json.judge.model, 'claude-sonnet-5'); assert.equal(r.json.threshold, 0.9);
    r = await call(port, 'PUT', '/api/autolink/settings', { enabled: false }, { Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' });
    assert.equal(r.status, 403, 'other sites cannot change it');
    r = await call(port, 'POST', '/api/autolink/run', { taskId: 'u-r1' });
    assert.equal(r.status, 202); assert.equal(r.json.queued, true);
    await srv.ctx.autolink.idle();   // the run was queued before the 202 went out
    r = await call(port, 'GET', '/api/autolink/status');
    assert.equal(r.status, 200);
    assert.equal(r.json.lastRun.trigger, 'task'); assert.equal(r.json.lastRun.tasks, 1);
    assert.ok(r.json.lastRun.judged > 0 && calls.length >= 1);
    assert.equal(calls[0].model, 'claude-sonnet-5');
    r = await call(port, 'GET', '/api/autolink/folder-suggestions');
    assert.equal(r.status, 200); assert.ok(Array.isArray(r.json.folders));
    assert.equal((await call(port, 'GET', '/api/autolink/nope')).status, 404);
    assert.equal((await call(port, 'POST', '/api/autolink/run', { taskId: 'u-r1' }, { Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  } finally { await srv.close(); rmSync(dir, { recursive: true, force: true }); rmSync(ws.base, { recursive: true, force: true }); }
});

// ─── Migration 072 ─────────────────────────────────────────────────────────
test('migration 072: only existing folders, names-only added, first-time switches only, dry run, idempotent', async () => {
  const ws = makeWorkspace();
  const dir = makeDataDir();
  try {
    const seed = join(ws.base, 'seed.json');
    writeFileSync(seed, JSON.stringify({ enabled: true, threshold: 0.9, folders: [{ path: ws.proj }, { path: join(ws.base, 'gone') }, { path: ws.loose, depth: 1, container: true }, 'relative/x'], namesOnly: [join(ws.proj, 'client_data'), 'private-stuff', join(ws.base, 'missing')] }));
    const mod = await import('../tools/migrations/072-workspaces.mjs');
    const { applyMigration } = await import('../tools/migrations/_lib.mjs');
    const dry = await applyMigration(mod, { dataDir: dir, argv: ['--from', seed], dryRun: true, log: () => {} });
    assert.equal(dry.changed, true);
    assert.ok(!existsSync(W.indexPaths(dir).settings), 'a dry run writes nothing');
    const r1 = await applyMigration(mod, { dataDir: dir, argv: ['--from', seed], log: () => {} });
    assert.match(r1.notes.join('\n'), /4 listed, 2 added, 0 already there, 1 not on this computer, 1 not absolute/);
    const s = await W.loadSettings(dir);
    assert.deepEqual(s.folders.map(f => f.path), [ws.proj, ws.loose]);
    assert.deepEqual(s.folders[1], { path: ws.loose, depth: 1, container: true });
    assert.equal(s.namesOnly.length, 2); assert.equal(s.enabled, true); assert.equal(s.threshold, 0.9);
    await W.saveSettings(dir, { ...s, enabled: false });
    const r2 = await applyMigration(mod, { dataDir: dir, argv: ['--from', seed], log: () => {} });
    assert.equal(r2.changed, false, 'second run: nothing to do');
    assert.equal((await W.loadSettings(dir)).enabled, false, 'a later choice is not overwritten');
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(ws.base, { recursive: true, force: true }); }
});

// ─── MCP ───────────────────────────────────────────────────────────────────
test('MCP: the auto-link tools are listed; propose mode only sees the read ones', async () => {
  const dir = makeDataDir();
  const run = (extra) => new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [join(ROOT, 'mcp', 'server.mjs'), '--data-dir', dir, ...extra], { stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '';
    const t = setTimeout(() => { p.kill(); reject(new Error('timeout')); }, 20000);
    p.stdout.setEncoding('utf8');
    const got = {};
    p.stdout.on('data', (d) => {
      buf += d;
      for (const line of buf.split('\n')) {
        if (!line.trim()) continue;
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.id === 1 || m.id === 2) got[m.id] = m;
      }
      // Resolve once the server has exited (stdin closed), so it is not still
      // writing to the data folder when the test deletes it.
      if (got[1] && got[2] && !got.done) { got.done = true; p.once('close', () => { clearTimeout(t); resolve({ tools: got[2].result.tools.map(x => x.name), init: JSON.stringify(got[1].result) }); }); p.stdin.end(); }
    });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } }) + '\n');
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n');
  });
  try {
    const full = await run([]);
    for (const n of ['suggest_links', 'apply_suggested_links', 'reject_suggested_links', 'rate_suggested_links', 'relate_task', 'unrelate_task', 'get_suggested_links', 'get_related']) assert.ok(full.tools.includes(n), n);
    assert.match(full.init, /suggest_links/, 'the instructions explain auto-linking');
    const prop = await run(['--mode', 'propose']);
    assert.ok(prop.tools.includes('get_suggested_links') && prop.tools.includes('get_related'));
    assert.ok(!prop.tools.includes('apply_suggested_links') && !prop.tools.includes('suggest_links'));
  } finally { rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }); }
});

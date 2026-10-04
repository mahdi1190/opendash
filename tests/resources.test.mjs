// Files & links: the shared parser (src/app/62-resources-logic.js through
// lib/resources.mjs), the actions-layer ops, the Open / Reveal / Browse / Pick
// endpoints (spawn mocked: nothing is ever opened on the test machine), the
// native picker, the read-only GitHub lookup (fake CLI), migration 070 and an
// LLM-style "attach this folder to the Sam task" through the MCP server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { makeDataDir, sampleState } from './fixtures/actions-state.mjs';
import * as R from '../lib/resources.mjs';
import { spriteIds } from '../tools/build-icon-sprite.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const FAKE = join(HERE, 'fixtures', 'fake-claude-resources.mjs');
const WIN = process.platform === 'win32';

/** A folder tree to attach: <tmp>/proj/{deck.pptx, notes.md, run.bat, fig/a.png, sub/inner.txt} + a link pointing outside. */
function makeTree() {
  const base = mkdtempSync(join(tmpdir(), 'res-tree-'));
  const proj = join(base, 'Talks and decks');
  mkdirSync(join(proj, 'fig'), { recursive: true });
  mkdirSync(join(proj, 'sub'), { recursive: true });
  writeFileSync(join(proj, 'deck.pptx'), 'x'.repeat(2048));
  writeFileSync(join(proj, 'notes.md'), '# notes');
  writeFileSync(join(proj, 'run.bat'), 'echo hi');
  writeFileSync(join(proj, 'fig', 'a.png'), 'png');
  writeFileSync(join(proj, 'sub', 'inner.txt'), 'inner');
  writeFileSync(join(proj, 'desktop.ini'), 'junk');
  const outside = join(base, 'secret');
  mkdirSync(outside);
  writeFileSync(join(outside, 'private.txt'), 'nope');
  let linked = false;
  try { symlinkSync(outside, join(proj, 'escape'), WIN ? 'junction' : 'dir'); linked = true; } catch { /* no symlink rights */ }
  return { base, proj, outside, linked };
}

// ─── Parser ────────────────────────────────────────────────────────────────
test('parser: paths, URLs, GitHub and Drive links are detected; unsafe input is refused', () => {
  const d = (s) => R.rsrcDetect(s);
  assert.deepEqual(d('C:\\Users\\sam\\Talks\\deck.pptx'), { kind: 'file', target: 'C:\\Users\\sam\\Talks\\deck.pptx', label: 'deck.pptx' });
  assert.deepEqual(d('"C:\\Users\\sam\\My Talks"'), { kind: 'folder', target: 'C:\\Users\\sam\\My Talks', label: 'My Talks' }, 'Explorer\'s "Copy as path" quotes');
  assert.equal(d('c:/users/sam/proj/').kind, 'folder');
  assert.equal(d('c:/users/sam/proj/').target, 'C:\\users\\sam\\proj');
  assert.equal(d('/home/sam/repo').kind, 'folder');
  assert.equal(d('file:///C:/Users/sam/My%20Docs/a.pdf').target, 'C:\\Users\\sam\\My Docs\\a.pdf');
  assert.deepEqual(d('https://github.com/acme/widgets/pull/12'), { kind: 'github', target: 'https://github.com/acme/widgets/pull/12', label: 'acme/widgets #12' });
  assert.equal(d('https://github.com/acme/widgets/issues/7').label, 'acme/widgets #7');
  assert.deepEqual(d('git@github.com:acme/widgets.git'), { kind: 'github', target: 'https://github.com/acme/widgets', label: 'acme/widgets' });
  assert.equal(d('https://tok:x-oauth@github.com/acme/widgets').target, 'https://github.com/acme/widgets', 'credentials are dropped');
  assert.equal(d('https://docs.google.com/presentation/d/1AbCdEfGhIjKlM/edit').kind, 'drive');
  assert.equal(d('https://docs.google.com/presentation/d/1AbCdEfGhIjKlM/edit').label, 'Google Slides');
  assert.equal(d('https://drive.google.com/drive/folders/1AbCdEfGhIjKlM').label, 'Drive folder');
  assert.equal(d('www.example.org/page').kind, 'url');
  assert.equal(d('[Slides](https://example.org/s)').label, 'Slides', 'markdown links keep their text');
  for (const bad of ['javascript:alert(1)', 'data:text/html,<b>x</b>', '\\\\server\\share\\x', '//server/share', 'C:\\a\\..\\Windows', 'C:\\a\\b.txt:stream',
    'relative\\path', 'just words', '', 'C:\\a\\<b>.txt', 'vbscript:x']) {
    assert.equal(d(bad), null, `refused: ${bad}`);
  }
  const many = R.rsrcParseMany('C:\\a\\b.pdf\n- https://github.com/a/b\nnot a thing\nC:\\A\\B.PDF\n\n');
  assert.equal(many.items.length, 2, 'duplicates (case-insensitive on Windows paths) dropped');
  assert.deepEqual(many.rejected, ['not a thing']);
});

test('parser: GitHub URL kinds, file types, icons, send lines and links', () => {
  const g = R.rsrcGithub;
  assert.deepEqual(g('https://github.com/acme/widgets'), { owner: 'acme', repo: 'widgets', type: 'repo', url: 'https://github.com/acme/widgets' });
  assert.equal(g('https://github.com/acme/widgets.git').repo, 'widgets');
  assert.equal(g('https://github.com/acme/widgets/pull/3/files').number, 3);
  assert.equal(g('https://github.com/acme/widgets/tree/main/src').type, 'tree');
  assert.equal(g('https://github.com/acme/widgets/blob/main/src/a.py').path, 'src/a.py');
  assert.equal(g('https://github.com/settings/profile'), null);
  assert.equal(g('https://gitlab.com/a/b'), null);
  assert.equal(R.rsrcFileType('Deck.PPTX'), 'pptx');
  assert.equal(R.rsrcFileType('a.pdf'), 'pdf');
  assert.equal(R.rsrcFileType('b.docx'), 'docx');
  assert.equal(R.rsrcFileType('c.xlsx'), 'xlsx');
  assert.equal(R.rsrcFileType('model.py'), 'code');
  assert.equal(R.rsrcFileType('setup.exe'), 'exec');
  assert.ok(R.rsrcIsExecutable('C:\\x\\Shortcut.lnk') && R.rsrcIsExecutable('a.BAT') && !R.rsrcIsExecutable('a.pptx'));
  const icons = spriteIds();
  const samples = [
    { kind: 'folder', target: 'C:\\a' }, { kind: 'file', target: 'C:\\a\\b.pptx' }, { kind: 'file', target: 'C:\\a\\b.pdf' }, { kind: 'file', target: 'C:\\a\\b.docx' },
    { kind: 'file', target: 'C:\\a\\b.xlsx' }, { kind: 'file', target: 'C:\\a\\b.py' }, { kind: 'file', target: 'C:\\a\\b.zip' }, { kind: 'file', target: 'C:\\a\\b.png' },
    { kind: 'file', target: 'C:\\a\\b.mp4' }, { kind: 'file', target: 'C:\\a\\b.wav' }, { kind: 'file', target: 'C:\\a\\b' }, { kind: 'snippet', target: 'x' },
    { kind: 'github', target: 'https://github.com/a/b' }, { kind: 'github', target: 'https://github.com/a/b/pull/1' }, { kind: 'github', target: 'https://github.com/a/b/issues/1' },
    { kind: 'github', target: 'https://github.com/a/b/commit/abc' }, { kind: 'github', target: 'https://github.com/a/b/blob/m/x.py' },
    { kind: 'drive', target: 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlM' }, { kind: 'drive', target: 'https://docs.google.com/document/d/1AbCdEfGhIjKlM' },
    { kind: 'drive', target: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlM' }, { kind: 'drive', target: 'https://drive.google.com/file/d/1AbCdEfGhIjKlM' },
    { kind: 'url', target: 'https://example.org' },
  ];
  for (const r of samples) assert.ok(icons.has(R.rsrcIcon(r)), `sprite has ${R.rsrcIcon(r)} for ${r.kind} ${r.target}`);
  assert.equal(R.rsrcKindLabel({ kind: 'file', target: 'C:\\a\\Deck.pptx' }), 'Presentation · PPTX');
  assert.equal(R.rsrcKindLabel({ kind: 'github', target: 'https://github.com/a/b/pull/1' }), 'GitHub pull request');
  assert.equal(R.rsrcSendLine({ kind: 'folder', label: 'Talks', target: 'C:\\x\\Talks' }), 'Talks (folder): C:\\x\\Talks');
  assert.equal(R.rsrcSendLine({ kind: 'github', label: 'acme/widgets #12', target: 'https://github.com/acme/widgets/pull/12' }), 'acme/widgets #12: https://github.com/acme/widgets/pull/12');
  assert.equal(R.rsrcSendLine({ kind: 'snippet', label: 'Run', target: 'make all' }), 'Run:\nmake all');
  assert.equal(R.rsrcLinkOf({ kind: 'file', target: 'C:\\My Docs\\a#1.pdf' }), 'file:///C:/My%20Docs/a%231.pdf');
});

test('rsrcNormalize: snippets, kinds, links and limits; errors name the field', () => {
  const s = R.rsrcNormalize({ kind: 'snippet', target: 'SELECT 1;\n', lang: 'SQL!' });
  assert.equal(s.kind, 'snippet'); assert.equal(s.lang, 'sql'); assert.equal(s.label, 'sql snippet');
  assert.throws(() => R.rsrcNormalize({ kind: 'snippet', target: '   ' }), /snippet needs some text/);
  assert.throws(() => R.rsrcNormalize({ target: 'hello' }), (e) => e.code === 'BAD_TARGET' && e.field === 'target');
  assert.throws(() => R.rsrcNormalize({ target: '\\\\evil\\share' }), /network \(UNC\) paths/);
  assert.throws(() => R.rsrcNormalize({ kind: 'folder', target: 'https://example.org' }), /needs a local path/);
  assert.throws(() => R.rsrcNormalize({ kind: 'github', target: 'https://example.org' }), /not a GitHub link/);
  assert.equal(R.rsrcNormalize({ kind: 'url', target: 'https://github.com/a/b' }).kind, 'github', 'a GitHub URL is a github resource');
  assert.throws(() => R.rsrcNormalize({ target: 'C:\\a', links: [{ type: 'board', id: 'x' }] }), /links\[0\]\.type/);
  const r = R.rsrcNormalize({ target: 'C:\\a', links: [{ type: 'task', id: 'u-1' }, { type: 'task', id: 'u-1' }] });
  assert.equal(r.links.length, 1, 'duplicate links collapse');
  const list = [r];
  assert.equal(R.rsrcFindSame(list, 'folder', 'c:/A'), r);
  assert.equal(R.rsrcFor(list, 'task', 'u-1').length, 1);
  assert.equal(R.rsrcFilter(list, { q: 'nothing' }).length, 0);
});

test('the shared resource file stays pure (no DOM, no page globals) and the page loads it before 63-resources.js', () => {
  const src = readFileSync(R.SOURCE_FILE, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const re of [/\bdocument\./, /\bwindow\./, /\bstate\./, /\blocalStorage\b/, /\bfetch\(/, /\besc\(/, /\brender\(/, /\bsaveData\b/, /\bSTREAMS\b/, /\bnavigator\b/]) {
    assert.ok(!re.test(code), `62-resources-logic.js uses ${re}`);
  }
  const ui = readFileSync(join(ROOT, 'src', 'app', '63-resources.js'), 'utf8');
  assert.ok(!/\son[a-z]+=["'\\]/.test(ui), 'no inline handlers');
  assert.ok(!/innerHTML\s*=\s*[^;]*\.target(?!\))/.test(ui.replace(/esc\([^)]*\)/g, '')), 'targets only go into markup escaped');
});

// ─── Open commands, sub-paths, listing ─────────────────────────────────────
test('openCommand: explorer.exe / open / xdg-open with argument arrays; reveal selects the item', () => {
  assert.deepEqual(R.openCommand('win32', 'open', 'C:\\a b\\deck.pptx'), { cmd: 'explorer.exe', args: ['C:\\a b\\deck.pptx'], opts: {} });
  assert.deepEqual(R.openCommand('win32', 'reveal', 'C:\\a b\\deck.pptx'), { cmd: 'explorer.exe', args: ['/select,"C:\\a b\\deck.pptx"'], opts: { windowsVerbatimArguments: true } });
  assert.deepEqual(R.openCommand('darwin', 'open', '/Users/sam/deck.key'), { cmd: 'open', args: ['/Users/sam/deck.key'], opts: {} });
  assert.deepEqual(R.openCommand('darwin', 'reveal', '/Users/sam/deck.key'), { cmd: 'open', args: ['-R', '/Users/sam/deck.key'], opts: {} });
  assert.deepEqual(R.openCommand('linux', 'reveal', '/home/sam/deck.odp'), { cmd: 'xdg-open', args: ['/home/sam'], opts: {} });
  assert.throws(() => R.openCommand('win32', 'open', '\\\\server\\share'), /not a local path/);
  assert.throws(() => R.openCommand('win32', 'open', 'https://example.org'), /not a local path/);
});

test('cleanSub / resolveInside / listFolder: never outside the stored folder', async () => {
  for (const bad of ['..', 'a/../..', '..\\x', '/etc', 'C:\\Windows', 'a:b', 'x\u0000y']) assert.throws(() => R.cleanSub(bad), (e) => ['OUTSIDE', 'BAD_SUB'].includes(e.code), bad);
  assert.deepEqual(R.cleanSub('fig\\sub/x'), ['fig', 'sub', 'x']);
  const t = makeTree();
  try {
    const folder = { id: 'r1', kind: 'folder', target: t.proj, label: 'Talks' };
    const top = await R.listFolder(folder, '');
    assert.deepEqual(top.entries.filter(e => e.dir).map(e => e.name), ['fig', 'sub'], 'folders first; a link outside is left out');
    assert.deepEqual(top.entries.filter(e => !e.dir).map(e => e.name), ['deck.pptx', 'notes.md', 'run.bat'], 'desktop.ini hidden');
    assert.equal(top.entries.find(e => e.name === 'deck.pptx').type, 'pptx');
    assert.equal(top.entries.find(e => e.name === 'deck.pptx').size, 2048);
    if (t.linked) {
      assert.equal(top.hiddenOutside, 1);
      await assert.rejects(R.resolveInside(folder, 'escape'), (e) => e.code === 'OUTSIDE' && e.status === 403, 'a junction/symlink leading out is refused');
      await assert.rejects(R.listFolder(folder, 'escape'), (e) => e.code === 'OUTSIDE');
    }
    const sub = await R.listFolder(folder, 'sub');
    assert.deepEqual(sub.crumbs.map(c => c.sub), ['', 'sub']);
    assert.deepEqual(sub.entries.map(e => e.sub), ['sub/inner.txt']);
    const capped = await R.listFolder(folder, '', { max: 2 });
    assert.equal(capped.truncated, true);
    assert.ok(capped.entries.length >= 1 && capped.entries.length <= 2);
    await assert.rejects(R.listFolder(folder, 'deck.pptx'), (e) => e.code === 'NOT_A_FOLDER');
    await assert.rejects(R.listFolder({ ...folder, target: join(t.base, 'gone') }, ''), (e) => e.code === 'MISSING' && e.status === 404);
    await assert.rejects(R.listFolder({ ...folder, kind: 'file' }, ''), (e) => e.code === 'NOT_A_FOLDER');
  } finally { rmSync(t.base, { recursive: true, force: true }); }
});

// ─── Native picker (spawn mocked) ──────────────────────────────────────────
function fakeChild({ stdout = '', delay = 5, hang = false } = {}) {
  const c = new EventEmitter();
  c.stdout = new EventEmitter(); c.stdout.setEncoding = () => {};
  c.stderr = new EventEmitter();
  c.killed = false;
  c.kill = () => { c.killed = true; setTimeout(() => c.emit('close', null), 1); };
  if (!hang) setTimeout(() => { if (stdout) c.stdout.emit('data', stdout); c.emit('close', 0); }, delay);
  return c;
}

test('native picker: powershell -STA with a fixed encoded script, paths parsed, cancel and timeout handled', async () => {
  const calls = [];
  const spawnFn = (cmd, args, opts) => { calls.push({ cmd, args, opts }); return fakeChild({ stdout: 'noise\r\nPICKED:["C:\\\\Users\\\\sam\\\\Talks\\\\deck.pptx","C:\\\\Users\\\\sam\\\\b.pdf"]\r\n' }); };
  const r = await R.runPicker({ mode: 'file', multi: true, platform: 'win32', spawnFn });
  assert.deepEqual(r, { paths: ['C:\\Users\\sam\\Talks\\deck.pptx', 'C:\\Users\\sam\\b.pdf'], kind: 'file' });
  const c = calls[0];
  assert.equal(c.cmd, 'powershell.exe');
  assert.equal(c.opts.shell, false);
  assert.ok(c.args.includes('-STA') && c.args.includes('-NoProfile') && c.args.includes('-EncodedCommand'));
  const script = Buffer.from(c.args[c.args.indexOf('-EncodedCommand') + 1], 'base64').toString('utf16le');
  assert.match(script, /System\.Windows\.Forms/);
  assert.match(script, /OpenFileDialog/);
  assert.match(script, /\$d\.Multiselect = \$true/);
  assert.match(Buffer.from(R.pickerArgs('folder').at(-1), 'base64').toString('utf16le'), /FolderBrowserDialog/);

  const folder = await R.runPicker({ mode: 'folder', platform: 'win32', spawnFn: () => fakeChild({ stdout: 'PICKED:"C:\\\\Users\\\\sam\\\\Talks"' }) });
  assert.deepEqual(folder.paths, ['C:\\Users\\sam\\Talks'], 'a single path (not an array) works too');
  assert.deepEqual(await R.runPicker({ mode: 'file', platform: 'win32', spawnFn: () => fakeChild({ stdout: 'PICKED:[]' }) }), { cancelled: true });
  const unsafe = await R.runPicker({ mode: 'file', platform: 'win32', spawnFn: () => fakeChild({ stdout: 'PICKED:["\\\\\\\\evil\\\\share\\\\x"]' }) });
  assert.deepEqual(unsafe, { cancelled: true }, 'a network path from the picker is not accepted');
  let hung;
  const t = await R.runPicker({ mode: 'file', platform: 'win32', timeoutMs: 50, spawnFn: () => (hung = fakeChild({ hang: true })) });
  assert.deepEqual(t, { cancelled: true, timeout: true });
  assert.equal(hung.killed, true, 'the picker is killed on timeout');
  await assert.rejects(R.runPicker({ platform: 'linux' }), (e) => e.code === 'NO_PICKER' && e.status === 501);
  await assert.rejects(R.runPicker({ platform: 'win32', mode: 'drive' }), (e) => e.code === 'BAD_REQUEST');
});

// ─── Actions layer ─────────────────────────────────────────────────────────
test('actions: create (detected kind, existing path re-used), link, unlink, update, delete, list, undo', async () => {
  const { createActions } = await import('../server/actions/index.mjs');
  const t = makeTree();
  const dir = makeDataDir();
  try {
    const a = createActions({ dataDir: dir });
    const c = await a.apply({ ops: [
      { op: 'resource.create', target: t.proj, task: 'u-2-bbb', stream: 'Work' },
      { op: 'create_resource', target: join(t.proj, 'deck.pptx'), task: 'u-2-bbb' },
      { op: 'resource.create', target: 'https://github.com/acme/widgets/pull/12', links: [{ type: 'person', id: 'Sam Taylor' }] },
      { op: 'resource.create', kind: 'snippet', target: 'make slides', lang: 'bash', label: 'Build the slides', task: 'u-2-bbb' },
      { op: 'task.create', title: 'Collect the figures', stream: 'work', ref: 'figs' },
      { op: 'resource.create', target: join(t.proj, 'fig'), task: '$figs' },
    ], source: 'mcp' });
    assert.equal(c.changed, 6);
    const ids = c.created.filter(x => x.resourceId).map(x => x.resourceId);
    assert.equal(ids.length, 5);
    let list = await a.query('list_resources', { task: 'u-2-bbb' });
    assert.deepEqual(list.resources.map(r => r.kind).sort(), ['file', 'folder', 'snippet']);
    assert.equal(list.resources.find(r => r.kind === 'file').what, 'Presentation · PPTX');
    assert.deepEqual((await a.query('resources.list', { person: 'sam' })).resources[0].github, { owner: 'acme', repo: 'widgets', type: 'pr', number: 12 });
    assert.equal((await a.query('resources.list', { stream: 'work' })).count, 1);
    assert.equal((await a.query('resources.list', { kind: 'snippet' })).resources[0].lang, 'bash');

    // The same path again (other spelling) adds a link instead of a copy.
    const again = await a.apply({ ops: [{ op: 'resource.create', target: t.proj.toUpperCase() === t.proj ? t.proj : t.proj, task: 'u-1-aaa' }] });
    assert.equal(again.created[0].existing, true);
    assert.equal((await a.query('resources.list', {})).count, 5);
    assert.equal((await a.query('resources.list', { task: 'u-1-aaa' })).count, 1);

    // A missing path is saved with a warning; file vs folder comes from the disk.
    const miss = await a.apply({ ops: [{ op: 'resource.create', target: join(t.base, 'nowhere', 'x.pdf') }] });
    assert.match(miss.warnings[0].message, /not found on this computer/);
    const kindFix = await a.apply({ ops: [{ op: 'resource.create', kind: 'file', target: join(t.proj, 'sub') }] });
    assert.equal((await a.query('resources.list', { id: kindFix.created[0].resourceId })).resources[0].kind, 'folder');

    const folderId = ids[0];
    const un = await a.apply({ ops: [{ op: 'resource.unlink', id: folderId, stream: 'Work' }] });
    assert.equal(un.changed, 1);
    assert.equal((await a.query('resources.list', { stream: 'work' })).count, 0);
    await a.undo(un.undo);
    assert.equal((await a.query('resources.list', { stream: 'work' })).count, 1, 'undo restores the link');

    await a.apply({ ops: [{ op: 'resource.update', id: folderId, label: 'Talk materials', pinned: true, note: 'final versions' }] });
    const got = (await a.query('resources.list', { id: folderId })).resources[0];
    assert.equal(got.label, 'Talk materials'); assert.equal(got.pinned, true); assert.equal(got.note, 'final versions');
    await assert.rejects(a.apply({ ops: [{ op: 'resource.update', id: folderId, target: join(t.proj, 'deck.pptx') }] }), (e) => e.code === 'DUPLICATE');
    await a.apply({ ops: [{ op: 'resource.link', id: folderId, links: [{ type: 'section', id: 'finance' }] }] });
    assert.equal((await a.query('resources.list', { section: 'finance' })).count, 1);

    // A delete needs a dry run and its confirm token, like every other delete.
    await assert.rejects(a.apply({ ops: [{ op: 'delete_resource', id: ids[3] }] }), (e) => e.code === 'NEEDS_CONFIRM');
    const dry = await a.apply({ ops: [{ op: 'delete_resource', id: ids[3] }], dryRun: true });
    assert.equal(dry.needsConfirm, true);
    const del = await a.apply({ ops: [{ op: 'delete_resource', id: ids[3] }], confirm: dry.confirm });
    assert.equal((await a.query('resources.list', { kind: 'snippet' })).count, 0);
    assert.ok(existsSync(join(t.proj, 'deck.pptx')), 'nothing on disk is touched');
    await a.undo(del.undo);
    assert.equal((await a.query('resources.list', { kind: 'snippet' })).count, 1);

    // Errors a model can act on.
    await assert.rejects(a.apply({ ops: [{ op: 'resource.create', target: t.proj, task: 'u-nope' }] }), (e) => e.code === 'NOT_FOUND' || e.code === 'UNKNOWN_TASK' || /no task/.test(e.message));
    await assert.rejects(a.apply({ ops: [{ op: 'resource.create', target: '\\\\evil\\share' }] }), (e) => e.code === 'BAD_TARGET');
    await assert.rejects(a.apply({ ops: [{ op: 'resource.create', target: 'javascript:alert(1)' }] }), (e) => e.code === 'BAD_TARGET');
    await assert.rejects(a.apply({ ops: [{ op: 'resource.create', target: t.proj, stream: 'nostream' }] }), (e) => e.code === 'UNKNOWN_STREAM');
    await assert.rejects(a.apply({ ops: [{ op: 'resource.link', id: 'r-nope', task: 'u-1-aaa' }] }), (e) => e.code === 'UNKNOWN_RESOURCE');
    await assert.rejects(a.apply({ ops: [{ op: 'resource.link', id: folderId, section: 'Bad View!' }] }), (e) => e.code === 'BAD_VALUE');

    // Tool names: reads look like reads (the assistant's propose profile), writes are not reads.
    const d = a.describe();
    assert.ok(d.queries.some(q => q.tool === 'list_resources'));
    for (const t2 of ['create_resource', 'update_resource', 'delete_resource', 'link_resource', 'unlink_resource']) assert.ok(d.ops.some(o => o.tool === t2), t2);
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(t.base, { recursive: true, force: true }); }
});

// ─── Server: open / reveal / browse / status / pick / github ───────────────
let dir, port, srv, tree, saved, spawned = [], resLog;
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function call(method, path, body, headers = {}) {
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

before(async () => {
  tree = makeTree();
  dir = makeDataDir();
  resLog = join(dir, 'fake-claude.log');
  saved = { USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME, CLAUDE_CLI_PATH: process.env.CLAUDE_CLI_PATH, FAKE_RES_LOG: process.env.FAKE_RES_LOG };
  // A home of our own whose ~/.claude.json defines a user-scope 'github' server.
  process.env.USERPROFILE = dir; process.env.HOME = dir;
  writeFileSync(join(dir, '.claude.json'), JSON.stringify({ mcpServers: { github: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] } } }));
  process.env.CLAUDE_CLI_PATH = FAKE;
  process.env.FAKE_RES_LOG = resLog;
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(FAKE);
  R.setSpawn((cmd, args, opts) => {
    spawned.push({ cmd, args, opts });
    const c = new EventEmitter(); c.unref = () => {};
    setTimeout(() => c.emit('spawn'), 1);
    return c;
  });
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => {
  await srv?.close();
  R.setSpawn(null);
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(null);
  for (const [k, v] of Object.entries(saved || {})) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(dir, { recursive: true, force: true });
  rmSync(tree.base, { recursive: true, force: true });
});

const ops = (list) => call('POST', '/api/actions', { ops: list });
async function attachAll() {
  const r = await ops([
    { op: 'resource.create', target: tree.proj, task: 'u-2-bbb', stream: 'work' },
    { op: 'resource.create', target: join(tree.proj, 'deck.pptx'), task: 'u-2-bbb', stream: 'work' },
    { op: 'resource.create', target: 'https://github.com/acme/widgets/pull/12', task: 'u-2-bbb', stream: 'work' },
    { op: 'resource.create', kind: 'snippet', target: 'make slides && open out/deck.pdf', lang: 'bash', label: 'Build', task: 'u-2-bbb', stream: 'work' },
    { op: 'resource.create', target: join(tree.proj, 'run.bat'), task: 'u-2-bbb' },
    { op: 'resource.create', target: 'https://github.com/acme/widgets', stream: 'work' },
  ]);
  assert.equal(r.status, 200, r.text);
  const ids = r.json.created.map(c => c.resourceId);
  return { folder: ids[0], pptx: ids[1], pr: ids[2], snippet: ids[3], bat: ids[4], repo: ids[5] };
}
let IDS = null;

test('end to end on a copy: attach a folder, a pptx, a GitHub PR and a snippet to a task and a stream; open, reveal and copy each', async () => {
  IDS = await attachAll();
  const st = (await call('GET', '/api/query?op=resources.list&task=u-2-bbb')).json;
  assert.equal(st.count, 5);
  assert.equal((await call('GET', '/api/query?op=resources.list&stream=work')).json.count, 5);

  spawned = [];
  // Folder: open (file manager), reveal.
  let r = await call('POST', '/api/resources/open', { id: IDS.folder });
  assert.equal(r.status, 200, r.text); assert.deepEqual(r.json, { ok: true, opened: 'folder', action: 'open' });
  r = await call('POST', '/api/resources/open', { id: IDS.folder, action: 'reveal' });
  assert.equal(r.status, 200);
  // The pptx: open in its app, reveal in its folder.
  r = await call('POST', '/api/resources/open', { id: IDS.pptx });
  assert.deepEqual(r.json, { ok: true, opened: 'file', action: 'open' });
  r = await call('POST', '/api/resources/open', { id: IDS.pptx, action: 'reveal' });
  assert.equal(r.status, 200);
  const pptx = join(tree.proj, 'deck.pptx');
  const want = R.openCommand(process.platform, 'open', tree.proj, { isDir: true });
  assert.deepEqual(spawned.map(s => s.cmd), [want.cmd, want.cmd, want.cmd, want.cmd]);
  assert.deepEqual(spawned[0].args, want.args);
  assert.deepEqual(spawned[2].args, R.openCommand(process.platform, 'open', pptx).args);
  assert.deepEqual(spawned[3].args, R.openCommand(process.platform, 'reveal', pptx).args);
  for (const s of spawned) { assert.equal(s.opts.shell, false); assert.equal(s.opts.detached, true); assert.ok(Array.isArray(s.args)); }
  // A file inside the folder (Explore panel), by relative sub-path only.
  r = await call('POST', '/api/resources/open', { id: IDS.folder, sub: 'sub/inner.txt' });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(spawned.at(-1).args, R.openCommand(process.platform, 'open', join(tree.proj, 'sub', 'inner.txt')).args);
  // Links open in the browser, snippets have nothing to open.
  r = await call('POST', '/api/resources/open', { id: IDS.pr });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'USE_BROWSER');
  r = await call('POST', '/api/resources/open', { id: IDS.snippet });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'USE_BROWSER');
  // Programs are revealed, never opened.
  const before = spawned.length;
  r = await call('POST', '/api/resources/open', { id: IDS.bat });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'PROGRAM');
  assert.equal(spawned.length, before);
  assert.equal((await call('POST', '/api/resources/open', { id: IDS.bat, action: 'reveal' })).status, 200);

  // Copy path / copy link / send (what the page copies), from the saved records.
  const saved = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8')).resources;
  const byId = Object.fromEntries(saved.map(x => [x.id, x]));
  assert.equal(byId[IDS.folder].target, R.rsrcNormPath(tree.proj));
  assert.match(R.rsrcSendLine(byId[IDS.folder]), /\(folder\): /);
  assert.match(R.rsrcLinkOf(byId[IDS.pptx]), /^file:\/\/\/.*deck\.pptx$/);
  assert.equal(R.rsrcLinkOf(byId[IDS.pr]), 'https://github.com/acme/widgets/pull/12');
  assert.equal(R.rsrcSendLine(byId[IDS.pr]), 'acme/widgets #12: https://github.com/acme/widgets/pull/12');
  assert.equal(R.rsrcSendLine(byId[IDS.snippet]), 'Build:\nmake slides && open out/deck.pdf');
});

test('open endpoint: refuses unknown ids, missing paths, raw paths, escapes, other origins', async () => {
  IDS = IDS || await attachAll();
  spawned = [];
  let r = await call('POST', '/api/resources/open', { id: 'r-unknown' });
  assert.equal(r.status, 404); assert.equal(r.json.code, 'UNKNOWN_ID');
  r = await call('POST', '/api/resources/open', { id: '../../etc' });
  assert.equal(r.status, 404);
  r = await call('POST', '/api/resources/open', { path: 'C:\\Windows\\System32\\calc.exe' });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'ID_ONLY', 'a raw path is never taken from the client');
  r = await call('POST', '/api/resources/open', { id: IDS.folder, target: 'C:\\Windows' });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'ID_ONLY');
  r = await call('POST', '/api/resources/open', { id: IDS.folder, sub: '../secret/private.txt' });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'OUTSIDE');
  if (tree.linked) {
    r = await call('POST', '/api/resources/open', { id: IDS.folder, sub: 'escape/private.txt' });
    assert.equal(r.status, 403, 'a junction/symlink out of the folder is refused');
  }
  r = await call('POST', '/api/resources/open', { id: IDS.pptx, sub: 'x' });
  assert.equal(r.status, 400);
  r = await call('POST', '/api/resources/open', { id: IDS.folder, action: 'delete' });
  assert.equal(r.status, 400);
  // A stored path that has gone away.
  const miss = await ops([{ op: 'resource.create', target: join(tree.base, 'moved-away.pdf') }]);
  r = await call('POST', '/api/resources/open', { id: miss.json.created[0].resourceId });
  assert.equal(r.status, 404); assert.equal(r.json.code, 'MISSING');
  // Another origin cannot make the server open anything.
  r = await call('POST', '/api/resources/open', { id: IDS.folder }, { Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(r.status, 403);
  r = await call('POST', '/api/resources/open', { id: IDS.folder }, { Host: 'evil.example' });
  assert.equal(r.status, 421);
  assert.equal(spawned.length, 0, 'nothing was opened');
});

test('browse + status endpoints: listing inside a stored folder only', async () => {
  IDS = IDS || await attachAll();
  let r = await call('GET', `/api/resources/browse?id=${IDS.folder}`);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.entries.map(e => e.name), ['fig', 'sub', 'deck.pptx', 'notes.md', 'run.bat']);
  r = await call('GET', `/api/resources/browse?id=${IDS.folder}&sub=fig`);
  assert.deepEqual(r.json.entries.map(e => e.sub), ['fig/a.png']);
  r = await call('GET', `/api/resources/browse?id=${IDS.folder}&sub=..`);
  assert.equal(r.status, 403);
  r = await call('GET', `/api/resources/browse?id=${IDS.folder}&sub=${encodeURIComponent('fig/../../')}`);
  assert.equal(r.status, 403);
  r = await call('GET', `/api/resources/browse?id=${IDS.pptx}`);
  assert.equal(r.status, 400);
  r = await call('GET', '/api/resources/browse?id=nope');
  assert.equal(r.status, 404);
  r = await call('GET', `/api/resources/browse?id=${IDS.folder}`, undefined, { Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(r.status, 403, 'GET browse is same-origin only');
  r = await call('POST', '/api/resources/status', { ids: [IDS.folder, IDS.pptx, IDS.pr, 'nope'] });
  assert.equal(r.status, 200);
  assert.equal(r.json.items[IDS.folder].dir, true);
  assert.equal(r.json.items[IDS.pptx].size, 2048);
  assert.equal(r.json.items[IDS.pr], undefined, 'links are not stat-ed');
  assert.equal(r.json.items.nope, undefined);
});

test('pick endpoint: the picker answers the page; elsewhere a paste fallback', async () => {
  if (process.platform !== 'win32') {
    const r = await call('POST', '/api/resources/pick', { mode: 'folder' });
    assert.equal(r.status, 501); assert.equal(r.json.code, 'NO_PICKER');
    return;
  }
  R.setSpawn((cmd, args, opts) => { spawned.push({ cmd, args, opts }); return fakeChild({ stdout: 'PICKED:["C:\\\\Users\\\\sam\\\\Talks"]' }); });
  try {
    const r = await call('POST', '/api/resources/pick', { mode: 'folder' });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, { paths: ['C:\\Users\\sam\\Talks'], kind: 'folder' });
    assert.equal(spawned.at(-1).cmd, 'powershell.exe');
    assert.equal((await call('POST', '/api/resources/pick', { mode: 'folder', path: 'C:\\x' })).status, 400);
  } finally {
    R.setSpawn((cmd, args, opts) => { spawned.push({ cmd, args, opts }); const c = new EventEmitter(); c.unref = () => {}; setTimeout(() => c.emit('spawn'), 1); return c; });
  }
});

test('GitHub: open PRs and issues of a linked repo, read-only tools only, grounded, cached; gated on the connection', async () => {
  IDS = IDS || await attachAll();
  const integ = await call('GET', '/api/resources/integrations');
  assert.equal(integ.status, 200);
  assert.equal(integ.json.github.state, 'ok');
  assert.equal(integ.json.github.usable, true);
  assert.equal(integ.json.drive.state, 'auth');
  let r = await call('POST', '/api/resources/github', { id: IDS.snippet });
  assert.equal(r.status, 400, 'a snippet is not a GitHub link'); assert.equal(r.json.code, 'NOT_GITHUB');
  r = await call('POST', '/api/resources/github', { id: IDS.repo });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.pulls.map(p => [p.number, p.title, p.url, p.draft]), [[12, 'Add the scheduler prototype', 'https://github.com/acme/widgets/pull/12', true]], 'the url is rebuilt, never the model\'s');
  assert.deepEqual(r.json.issues.map(i => i.number), [7], 'an invented title (not in the tool results) is dropped');
  assert.equal(r.json.cached, false);
  const runs = readFileSync(resLog, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const argv = runs.at(-1).argv;
  const allowed = argv[argv.indexOf('--allowedTools') + 1].split(',');
  assert.ok(allowed.length >= 2 && allowed.every(t => /^mcp__github__(list|search)_/.test(t)), allowed.join(','));
  assert.ok(argv.includes('--strict-mcp-config') && argv.includes('dontAsk'));
  const n = runs.length;
  r = await call('POST', '/api/resources/github', { id: IDS.repo });
  assert.equal(r.json.cached, true);
  assert.equal(readFileSync(resLog, 'utf8').trim().split('\n').length, n, 'served from the cache');
  assert.ok(existsSync(join(dir, 'resources', 'github-cache.json')));
  r = await call('POST', '/api/resources/drive-search', { q: 'deck' });
  assert.equal(r.status, 409, 'Drive needs auth: refused before any run'); assert.equal(r.json.code, 'NOT_CONNECTED');
});

// ─── Migration 070 ─────────────────────────────────────────────────────────
test('migration 070: only paths that exist, GitHub origin from .git/config, task links by id or title; dry run; idempotent', async () => {
  const t = makeTree();
  const ddir = makeDataDir();
  try {
    const repo = join(t.base, 'checkout');
    mkdirSync(join(repo, '.git'), { recursive: true });
    writeFileSync(join(repo, '.git', 'config'), '[core]\n\tbare = false\n[remote "upstream"]\n\turl = https://github.com/other/x.git\n[remote "origin"]\n\turl = https://ghp_secret123@github.com/acme/widgets.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n');
    const seed = join(t.base, 'seed.json');
    writeFileSync(seed, JSON.stringify({ version: 1, resources: [
      { target: t.proj, label: 'Talks', links: [{ type: 'stream', id: 'Work' }, { type: 'task', id: 'u-2-bbb' }] },
      { gitRemoteOf: repo, links: [{ type: 'stream', id: 'work' }] },
      { target: join(t.base, 'not-here'), links: [{ type: 'stream', id: 'work' }] },
      { target: join(t.proj, 'deck.pptx'), links: [{ type: 'task', titleIncludes: ['chapter'] }] },
      { target: join(t.proj, 'notes.md'), links: [{ type: 'task', titleIncludes: ['chapter'], all: true }, { type: 'stream', id: 'nostream' }, { type: 'person', id: 'Sam Taylor' }] },
      { target: join(t.proj, 'fig'), links: [{ type: 'task', id: 'u-gone', titleIncludes: ['group meeting'] }] },
    ] }));
    const mig = await import('../tools/migrations/070-resources.mjs');
    const { applyMigration } = await import('../tools/migrations/_lib.mjs');
    const stateFile = join(ddir, 'state', 'dashboard-state.json');
    const before = readFileSync(stateFile, 'utf8');
    const dry = await applyMigration(mig, { dataDir: ddir, argv: ['--from', seed], dryRun: true, log: () => {} });
    assert.equal(dry.changed, true);
    assert.equal(readFileSync(stateFile, 'utf8'), before, 'dry run writes nothing');
    const r1 = await applyMigration(mig, { dataDir: ddir, argv: ['--from', seed], log: () => {} });
    assert.equal(r1.counts.added, 5);
    assert.equal(r1.counts.missing, 1);
    assert.equal(r1.counts.ambiguous, 1, 'two open tasks mention "chapter": not guessed');
    assert.equal(r1.counts.unknownStream, 1);
    const s = JSON.parse(readFileSync(stateFile, 'utf8'));
    const gh = s.resources.find(x => x.kind === 'github');
    assert.equal(gh.target, 'https://github.com/acme/widgets', 'origin (not upstream), token stripped');
    assert.ok(!JSON.stringify(s.resources).includes('ghp_secret'));
    assert.deepEqual(s.resources.find(x => x.label === 'Talks').links, [{ type: 'stream', id: 'work' }, { type: 'task', id: 'u-2-bbb' }]);
    assert.deepEqual(s.resources.find(x => x.target.endsWith('notes.md')).links.map(l => l.id).sort(), ['sam', 'u-1-aaa', 'u-5-eee']);
    assert.deepEqual(s.resources.find(x => x.target.endsWith('fig')).links, [{ type: 'task', id: 'u-2-bbb' }], 'falls back to the title when the id is gone');
    assert.ok(!r1.notes.join(' ').includes(t.proj), 'counts only, no paths in the output');
    const r2 = await applyMigration(mig, { dataDir: ddir, argv: ['--from', seed], log: () => {} });
    assert.equal(r2.changed, false, 'second run changes nothing');
    const none = await applyMigration(mig, { dataDir: ddir, argv: [], log: () => {} });
    assert.equal(none.changed, false);
    assert.match(none.notes[0], /no seed list/);
  } finally { rmSync(ddir, { recursive: true, force: true }); rmSync(t.base, { recursive: true, force: true }); }
});

// ─── MCP: an LLM-style "attach this folder to the Sam task" ─────────────────
function startMcp(dataDir, extra = []) {
  const p = spawn(process.execPath, [join(ROOT, 'mcp', 'server.mjs'), '--data-dir', dataDir, ...extra], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '', err = '', n = 0;
  const waiters = new Map();
  p.stdout.setEncoding('utf8');
  p.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      const w = waiters.get(m.id); if (w) { waiters.delete(m.id); w(m); }
    }
  });
  p.stderr.on('data', d => { err += d; });
  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = ++n;
    const t = setTimeout(() => reject(new Error(`timeout ${method}: ${err}`)), 20000);
    waiters.set(id, (m) => { clearTimeout(t); resolve(m); });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const tool = async (name, args = {}) => {
    const m = await rpc('tools/call', { name, arguments: args });
    const text = m.result.content[0].text;
    return { isError: !!m.result.isError, text, json: m.result.isError ? null : JSON.parse(text) };
  };
  const stop = () => new Promise((resolve) => { p.on('close', resolve); p.stdin.end(); setTimeout(() => p.kill(), 3000); });
  return { rpc, tool, stop };
}

test('MCP: "attach this folder to the Sam task" with no other context (embedded), and proposing it in propose mode', async () => {
  const t = makeTree();
  const ddir = makeDataDir();
  const m = startMcp(ddir);
  try {
    await m.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test-llm', version: '1' } });
    const tools = (await m.rpc('tools/list', {})).result.tools;
    const names = tools.map(x => x.name);
    for (const n of ['create_resource', 'update_resource', 'delete_resource', 'link_resource', 'unlink_resource', 'list_resources']) assert.ok(names.includes(n), n);
    const create = tools.find(x => x.name === 'create_resource');
    assert.match(create.description, /folder/);
    assert.ok(create.inputSchema.properties.target && create.inputSchema.properties.task);
    const init = (await m.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test-llm', version: '1' } })).result;
    assert.match(init.instructions, /create_resource/, 'the instructions tell a model how to attach things');

    // What a model does: find the task, attach the folder, check.
    const found = await m.tool('search_tasks', { text: 'email Sam about the chapter corrections' });
    assert.equal(found.isError, false, found.text);
    const taskId = found.json.results[0].id;
    assert.equal(taskId, 'u-1-aaa');
    const att = await m.tool('create_resource', { target: t.proj, task: taskId });
    assert.equal(att.isError, false, att.text);
    assert.match(att.json.summary, /Attach folder/);
    assert.ok(att.json.undo);
    const listed = await m.tool('list_resources', { task: taskId });
    assert.equal(listed.json.count, 1);
    assert.equal(listed.json.resources[0].kind, 'folder');
    assert.equal(listed.json.resources[0].links[0].title, 'Email Sam about chapter corrections');
    const bad = await m.tool('create_resource', { target: 'that folder', task: taskId });
    assert.equal(bad.isError, true);
    assert.match(bad.text, /absolute local path/, 'a useful error for the model');
    const undone = await m.tool('undo_changes', { token: att.json.undo });
    assert.equal(undone.isError, false);
    assert.equal((await m.tool('list_resources', { task: taskId })).json.count, 0);
  } finally { await m.stop(); }

  const p = startMcp(ddir, ['--mode', 'propose']);
  try {
    await p.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'assistant', version: '1' } });
    const names = (await p.rpc('tools/list', {})).result.tools.map(x => x.name);
    assert.ok(names.includes('list_resources') && !names.includes('create_resource'), 'propose mode: read + propose only');
    const PROPOSE_RE = /^(get|list|search|read|describe|propose)_/;
    for (const n of names) assert.match(n, PROPOSE_RE);
    const prop = await p.tool('propose_changes', { ops: [{ op: 'resource.create', target: t.proj, task: 'u-1-aaa' }], note: 'attach the folder' });
    assert.equal(prop.isError, false, prop.text);
    assert.ok(prop.json.proposalId);
    assert.equal((await p.tool('list_resources', {})).json.count, 0, 'nothing applied until the user clicks');
  } finally { await p.stop(); rmSync(ddir, { recursive: true, force: true }); rmSync(t.base, { recursive: true, force: true }); }
});

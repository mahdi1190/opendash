// Right-click customise + rename (src/app/28-customise*.js): the pure marker
// rules shared with Node (lib/customise.mjs) and the ops behind the menus,
// through the real actions layer (the same API the page, MCP and the CLI use):
// stream symbol/shape, tag colour/symbol, the tag rename cascade, person
// rename keeping the old name as an alias, person merge.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir } from './fixtures/actions-state.mjs';
import {
  SOURCE_FILE, CZ_SHAPES, CZ_EMOJI, czNormHex, czIsEmoji, czSymbolKind, czCleanSymbol, czMarkParts, czMarkClass, czIsCustom,
  czSymbolSearch, czMoveOrder, czRenameAliases, czTagRenameIntent, spriteIconNames,
} from '../lib/customise.mjs';
import { tglNorm, tglRename } from '../lib/people-tags.mjs';

const ROOT = join(import.meta.dirname, '..');

/* ---------- pure rules ---------- */
test('the shared customise file stays pure: no page globals, no DOM', () => {
  const src = readFileSync(SOURCE_FILE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const bad of [/\bdocument\./, /\bwindow\./, /\bstate\./, /\bAPP_CONFIG\b/, /\blocalStorage\b/, /\bsaveData\(/, /\bfetch\(/, /\brender\(/, /\bicon\(/, /\besc\(/]) {
    assert.ok(!bad.test(src), `28-customise-logic.js uses ${bad}`);
  }
});

test('colours, emoji and symbols', () => {
  assert.equal(czNormHex('#ABC'), '#aabbcc');
  assert.equal(czNormHex('2563EB'), '#2563eb');
  assert.equal(czNormHex('blue'), '');
  assert.equal(czNormHex('#12345'), '');
  for (const e of ['🚀', '❤️', '👨‍👩‍👧', '🇬🇧', '👍🏽', '1️⃣']) assert.ok(czIsEmoji(e), e);
  for (const e of ['', 'a', '🚀🚀', 'ok 🚀', '12', '<b>']) assert.ok(!czIsEmoji(e), e);
  assert.equal(czSymbolKind(''), '');
  assert.equal(czSymbolKind('rocket'), 'icon');
  assert.equal(czSymbolKind('🎓'), 'emoji');
  assert.equal(czSymbolKind('<img src=x>'), null);
  for (const e of CZ_EMOJI) assert.ok(czIsEmoji(e), `curated emoji ${e}`);
});

test('a symbol must be a real icon of the sprite or one emoji; typos get suggestions', () => {
  const icons = spriteIconNames();
  assert.ok(icons.size > 200 && icons.has('rocket'));
  assert.deepEqual(czCleanSymbol(' rocket ', icons), { value: 'rocket' });
  assert.deepEqual(czCleanSymbol('', icons), { value: '' });
  assert.deepEqual(czCleanSymbol('🎓', icons), { value: '🎓' });
  const bad = czCleanSymbol('rockt', icons);
  assert.match(bad.error, /not one of the app's icons/);
  assert.ok(bad.near.includes('rocket'));
  assert.equal(czCleanSymbol('rokcet', icons).near[0], 'rocket', 'swapped letters still get a suggestion');
  assert.ok(czCleanSymbol('zzzzzzzz', icons).near.length === 0, 'nothing close: no guesses');
  assert.ok(czCleanSymbol('two words', icons).error);
  assert.ok(czCleanSymbol('"><svg onload=1>', icons).error);
  // Without a sprite list (the page before the sprite loads) any well-formed name passes.
  assert.deepEqual(czCleanSymbol('anything-ok'), { value: 'anything-ok' });
});

test('marker parts and classes: unknown shapes fall back to the dot, unsafe symbols are dropped', () => {
  assert.deepEqual(czMarkParts({ icon: 'rocket', shape: 'diamond' }), { icon: 'rocket', iconKind: 'icon', shape: 'diamond' });
  assert.deepEqual(czMarkParts({ icon: '<b>', shape: 'star' }), { icon: '', iconKind: '', shape: 'dot' });
  assert.equal(czMarkClass(czMarkParts({})), 'mk mk-dot');
  assert.equal(czMarkClass(czMarkParts({ icon: '🎓', shape: 'ring' })), 'mk mk-ring mk-sym mk-emoji');
  assert.equal(czMarkClass({ shape: 'x"y' }), 'mk mk-dot');
  assert.deepEqual(CZ_SHAPES, ['dot', 'rounded', 'square', 'diamond', 'ring', 'pill']);
  assert.ok(!czIsCustom({ color: '#123456' }) && !czIsCustom({ shape: 'dot' }));
  assert.ok(czIsCustom({ shape: 'pill' }) && czIsCustom({ icon: 'star' }));
});

test('symbol search: curated keywords first, then every sprite icon, UI chrome left out', () => {
  const curated = [['graduation-cap', 'thesis degree phd'], ['book-open', 'reading study book']];
  const all = ['book-open', 'notebook-pen', 'chevron-down', 'arrow-up', 'graduation-cap', 'rocket'];
  assert.deepEqual(czSymbolSearch('thesis', curated, all), ['graduation-cap']);
  assert.deepEqual(czSymbolSearch('book', curated, all), ['book-open', 'notebook-pen']);
  assert.deepEqual(czSymbolSearch('', curated, all), ['graduation-cap', 'book-open', 'notebook-pen', 'rocket']);
  assert.equal(czSymbolSearch('', curated, all, 2).length, 2);
});

test('move up / down among the active streams (archived stay last)', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'x', archived: true }, { id: 'c' }];
  assert.deepEqual(czMoveOrder(list, 'b', -1), ['b', 'a', 'c', 'x']);
  assert.deepEqual(czMoveOrder(list, 'b', 1), ['a', 'c', 'b', 'x']);
  assert.equal(czMoveOrder(list, 'a', -1), null);
  assert.equal(czMoveOrder(list, 'c', 1), null);
  assert.equal(czMoveOrder(list, 'x', 1), null);
});

test('rename helpers: the old name stays as aliases; a tag rename onto an existing tag is a merge', () => {
  assert.deepEqual(czRenameAliases(['sam taylor', 'sam', 'taylor'], ['samuel taylor', 'samuel', 'taylor'], ['samt']), ['sam taylor', 'sam']);
  assert.deepEqual(czRenameAliases(['sam taylor'], ['sam taylor'], []), []);
  assert.deepEqual(czRenameAliases(['sam taylor', 'sam'], ['sam t'], ['sam']), ['sam taylor']);
  const known = new Set(['email', 'meeting']);
  assert.deepEqual(czTagRenameIntent('email', ' #Mail ', known, tglNorm), { to: 'mail', kind: 'rename' });
  assert.deepEqual(czTagRenameIntent('email', 'Meeting', known, tglNorm), { to: 'meeting', kind: 'merge' });
  assert.deepEqual(czTagRenameIntent('email', '#email', known, tglNorm), { to: 'email', kind: 'same' });
  assert.deepEqual(czTagRenameIntent('email', '  ', known, tglNorm), { to: '', kind: 'empty' });
});

test('the page tag manager rename (tglRename) also moves saved views and prefs', () => {
  const s = { custom: [{ id: 't1', tags: ['mtg'] }], statuses: {}, deleted: {}, pinnedTags: ['mtg'], view: 'tag:mtg', viewFilter: 'tag:mtg',
    taskViewPrefs: { 'tag:mtg': { sort: 'priority' } }, tagRegistry: [{ id: 'mtg', color: '#dc2626', icon: 'users' }, { id: 'call', aliases: ['mtg'] }] };
  tglRename(s, 'mtg', 'meeting');
  assert.deepEqual(s.custom[0].tags, ['meeting']);
  assert.deepEqual(s.pinnedTags, ['meeting']);
  assert.equal(s.view, 'tag:meeting');
  assert.equal(s.viewFilter, 'tag:meeting');
  assert.deepEqual(s.taskViewPrefs, { 'tag:meeting': { sort: 'priority' } });
  assert.deepEqual(s.tagRegistry[0], { id: 'meeting', color: '#dc2626', icon: 'users' });
  assert.deepEqual(s.tagRegistry[1].aliases, ['meeting']);
});

test('every icon the customise UI names exists in the sprite', () => {
  const icons = spriteIconNames();
  const src = readFileSync(join(ROOT, 'src', 'app', '28-customise.js'), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/\bicon(?:El)?\(\s*'([a-z][a-z0-9-]*)'/g)) names.add(m[1]);
  for (const m of src.matchAll(/\bicon:\s*'([a-z][a-z0-9-]*)'/g)) names.add(m[1]);
  assert.ok(names.size > 10, `found ${names.size}`);
  assert.deepEqual([...names].filter(n => !icons.has(n)), []);
});

/* ---------- ops ---------- */
let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const file = () => join(dir, 'state', 'dashboard-state.json');
const disk = () => JSON.parse(readFileSync(file(), 'utf8'));
const put = (fn) => { const s = disk(); fn(s); s._lastSave += 1; writeFileSync(file(), JSON.stringify(s)); };
const run = (ops, extra = {}) => a.apply({ ops, source: 'ui', client: 'test', ...extra });
const rejects = async (p, code) => { try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); return e; } assert.fail('expected ' + code); };
// A batch with one bad op throws that op's error; several are wrapped (INVALID_OPS with errors[]).
const fails = async (p, code) => {
  try { await p; } catch (e) { const all = [e, ...(e.errors || [])]; const hit = all.find(x => x.code === code); assert.ok(hit, `${e.code}: ${e.message}`); return hit; }
  assert.fail('expected ' + code);
};
const confirmRun = async (ops) => { const d = await a.apply({ ops, dryRun: true, source: 'ui' }); return run(ops, { confirm: d.confirm }); };

test('update_stream sets a symbol and a shape; the dot and an empty symbol clear them; undo restores', async () => {
  const r = await run([{ op: 'stream.update', stream: 'thesis', icon: 'graduation-cap', shape: 'diamond' }]);
  let st = disk().streams.find(x => x.id === 'thesis');
  assert.equal(st.icon, 'graduation-cap'); assert.equal(st.shape, 'diamond');
  assert.deepEqual(r.preview[0].changes.map(c => c.field), ['icon', 'shape']);
  await run([{ op: 'stream.update', stream: 'Thesis', icon: '🎓' }]);
  assert.equal(disk().streams.find(x => x.id === 'thesis').icon, '🎓');
  await run([{ op: 'stream.update', stream: 'thesis', icon: '', shape: 'dot' }]);
  st = disk().streams.find(x => x.id === 'thesis');
  assert.ok(!('icon' in st) && !('shape' in st));
  await a.undo((await run([{ op: 'stream.update', stream: 'work', shape: 'pill' }])).undo, { source: 'ui' });
  assert.ok(!('shape' in disk().streams.find(x => x.id === 'work')));
});

test('update_stream refuses a made-up icon (with suggestions) and an unknown shape', async () => {
  const inner = await fails(run([{ op: 'stream.update', stream: 'thesis', icon: 'rockt' }]), 'BAD_VALUE');
  assert.ok((inner.valid || []).includes('rocket'), JSON.stringify(inner));
  assert.match(inner.hint, /rocket/);
  const sh = await rejects(run([{ op: 'stream.update', stream: 'thesis', shape: 'star' }]), 'INVALID_PARAMS');
  assert.match(sh.message, /dot/);
  await fails(run([{ op: 'stream.update', stream: 'thesis', icon: '<img src=x onerror=1>' }]), 'BAD_VALUE');
  assert.ok(!('icon' in disk().streams.find(x => x.id === 'thesis')));
});

test('create_stream takes a symbol and shape; rename keeps the id so tasks follow', async () => {
  const r = await run([{ op: 'stream.create', label: 'Health', icon: 'heart', shape: 'rounded' }]);
  const st = disk().streams.find(x => x.id === r.created[0].id);
  assert.equal(st.icon, 'heart'); assert.equal(st.shape, 'rounded');
  await run([{ op: 'stream.update', stream: 'thesis', label: 'Dissertation' }]);
  const s = disk();
  assert.equal(s.streams.find(x => x.id === 'thesis').label, 'Dissertation');
  assert.ok(s.custom.filter(t => t.stream === 'thesis').length >= 2, 'tasks keep the stream id');
});

test('update_tag sets colour, symbol and note; list_tags shows them', async () => {
  await run([{ op: 'tag.update', tag: '#email', color: '#dc2626', icon: 'mail', note: 'messages to send' }]);
  const e = disk().tagRegistry.find(x => x.id === 'email');
  assert.equal(e.color, '#dc2626'); assert.equal(e.icon, 'mail'); assert.equal(e.note, 'messages to send');
  const q = await a.query('tags.list', {});
  const row = q.tags.find(t => t.tag === 'email');
  assert.equal(row.color, '#dc2626'); assert.equal(row.icon, 'mail');
  await run([{ op: 'tag.update', tag: 'email', icon: '' }]);
  assert.ok(!('icon' in disk().tagRegistry.find(x => x.id === 'email')));
  await fails(run([{ op: 'tag.update', tag: 'email', icon: 'not-an-icon-at-all' }]), 'BAD_VALUE');
});

test('rename_tag cascades: tasks, the bin, templates, pinned tags, saved views, registry colour and symbol; undo puts it all back', async () => {
  put((s) => {
    s.bin.tasks.push({ id: 'u-9-bin', binTs: 5, customData: { id: 'u-9-bin', title: 'Binned', tags: ['email', 'admin'] } });
    s.quickTemplates = [{ label: 'Mail', title: 'Email ', tags: ['email'] }];
    s.taskTemplates = [{ id: 'tt1', title: 'Reply', tags: ['email', 'writing'] }];
    s.pinnedTags = ['email', 'admin'];
    s.viewFilter = 'tag:email';
    s.view = 'tag:email';
    s.taskViewPrefs = { 'tag:email': { group: 'stream' } };
    s.tagRegistry = [{ id: 'email', color: '#dc2626', icon: 'mail', pinned: true }, { id: 'admin' }];
  });
  const r = await run([{ op: 'tag.rename', from: 'email', to: 'Mail' }]);
  assert.match(r.summary, /Rename #email to #mail \(2 tasks; also pinned, 1 in the bin, 2 templates, saved view\)/);
  const s = disk();
  assert.ok(!JSON.stringify(s.custom).includes('"email"'));
  assert.deepEqual(s.custom.find(t => t.id === 'u-1-aaa').tags, ['mail', 'corrections']);
  assert.deepEqual(s.bin.tasks[0].customData.tags, ['mail', 'admin']);
  assert.deepEqual(s.quickTemplates[0].tags, ['mail']);
  assert.deepEqual(s.taskTemplates[0].tags, ['mail', 'writing']);
  assert.deepEqual(s.pinnedTags, ['mail', 'admin']);
  assert.equal(s.viewFilter, 'tag:mail');
  assert.equal(s.view, 'tag:mail');
  assert.deepEqual(s.taskViewPrefs, { 'tag:mail': { group: 'stream' } });
  assert.deepEqual(s.tagRegistry[0], { id: 'mail', color: '#dc2626', icon: 'mail', pinned: true });
  await a.undo(r.undo, { source: 'ui' });
  const u = disk();
  assert.deepEqual(u.custom.find(t => t.id === 'u-1-aaa').tags, ['email', 'corrections']);
  assert.deepEqual(u.bin.tasks[0].customData.tags, ['email', 'admin']);
  assert.deepEqual(u.quickTemplates[0].tags, ['email']);
  assert.deepEqual(u.pinnedTags, ['email', 'admin']);
  assert.equal(u.viewFilter, 'tag:email');
  assert.equal(u.tagRegistry[0].id, 'email');
});

test('rename_tag onto an existing tag is refused with the merge to use; merge_tags moves pinned tags and views too', async () => {
  const inner = await fails(run([{ op: 'tag.rename', from: 'email', to: 'admin' }]), 'TAG_EXISTS');
  assert.match(inner.hint, /merge_tags/);
  put((s) => { s.pinnedTags = ['email']; s.viewFilter = 'tag:email'; });
  await rejects(run([{ op: 'tag.merge', from: ['email'], into: 'admin' }]), 'NEEDS_CONFIRM');
  await confirmRun([{ op: 'tag.merge', from: ['email'], into: 'admin' }]);
  const s = disk();
  assert.deepEqual(s.pinnedTags, ['admin']);
  assert.equal(s.viewFilter, 'tag:admin');
  assert.ok(!JSON.stringify(s.custom).includes('"email"'));
});

test('delete_tag also drops it from pinned tags and templates', async () => {
  put((s) => { s.pinnedTags = ['email', 'admin']; s.quickTemplates = [{ label: 'Mail', title: 'Email ', tags: ['email', 'admin'] }]; });
  await confirmRun([{ op: 'tag.delete', tag: 'email' }]);
  const s = disk();
  assert.deepEqual(s.pinnedTags, ['admin']);
  assert.deepEqual(s.quickTemplates[0].tags, ['admin']);
  assert.ok(!JSON.stringify(s.custom).includes('"email"'));
});

test('renaming a person keeps the old name as aliases, so tasks naming them still link', async () => {
  const r = await run([{ op: 'person.update', id: 'sam', name: 'Samantha Taylor' }]);
  let p = disk().people.find(x => x.id === 'sam');
  assert.equal(p.name, 'Samantha Taylor');
  // The old full name (three-letter words are never match words on their own).
  assert.deepEqual(p.aliases, ['samt', 'sam taylor']);
  assert.deepEqual(r.preview[0].changes.map(c => c.field), ['name', 'aliases']);
  // A new task that names the old name still links her.
  const t = await run([{ op: 'task.create', title: 'Send Sam Taylor the draft', stream: 'thesis' }]);
  assert.ok(disk().custom.find(x => x.id === t.created[0].id).people.includes('sam'));
  // keepOldName:false skips it; an explicit aliases list wins.
  await run([{ op: 'person.update', id: 'alex', name: 'Alexandra Kim', keepOldName: false }]);
  assert.deepEqual(disk().people.find(x => x.id === 'alex').aliases, []);
  await run([{ op: 'person.update', id: 'alex', name: 'Alex Kim', aliases: ['ak'] }]);
  assert.deepEqual(disk().people.find(x => x.id === 'alex').aliases, ['ak']);
});

test('a person can get a symbol or emoji avatar; bad symbols are refused', async () => {
  await run([{ op: 'person.update', id: 'alex', icon: '🦊', color: '#059669' }]);
  assert.equal(disk().people.find(x => x.id === 'alex').icon, '🦊');
  await run([{ op: 'person.update', id: 'alex', icon: 'flask-conical' }]);
  assert.equal(disk().people.find(x => x.id === 'alex').icon, 'flask-conical');
  await run([{ op: 'person.update', id: 'alex', icon: '' }]);
  assert.ok(!('icon' in disk().people.find(x => x.id === 'alex')));
  await fails(run([{ op: 'person.update', id: 'alex', icon: 'javascript:alert(1)' }]), 'BAD_VALUE');
});

test('merging people (danger) needs a dry run, moves the task links and keeps the old name as an alias', async () => {
  const c = await run([{ op: 'person.create', name: 'Sammy T', allowDuplicate: true }]);
  const dup = c.created[0].personId;
  put((s) => { s.custom.find(t => t.id === 'u-2-bbb').people.push(dup); });
  await rejects(run([{ op: 'person.merge', from: dup, into: 'sam' }]), 'NEEDS_CONFIRM');
  await confirmRun([{ op: 'person.merge', from: dup, into: 'sam' }]);
  const s = disk();
  assert.ok(!s.people.some(p => p.id === dup));
  assert.ok(s.custom.find(t => t.id === 'u-2-bbb').people.includes('sam'));
  assert.ok(s.people.find(p => p.id === 'sam').aliases.includes('sammy t'));
});

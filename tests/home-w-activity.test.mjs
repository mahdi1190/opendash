// Home widget "activity" (What changed, WIDGETS_CATALOGUE.md 3.16): see and reverse
// what assistants, MCP clients, auto-link and scripts changed.
//   - the pure rules (src/app/12-home-activity-logic.js) in a VM: source labels (MCP
//     client names without their version), today's count and its wording, the range
//     (today / 7 days), "mine", the filters and their chips, undo chains (undone,
//     redone, the target an Undo sends), the S row, the entity labels, the times;
//   - the journal (server/actions): history.list says what each change touched, so a
//     row can open its single task; an undo entry points back with undoOf;
//   - in the Home bundle: registered, available, the server's sizes and settings keys,
//     and a sample for the Add widget gallery.
// Synthetic data only.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir } from './fixtures/actions-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const TODAY = '2026-10-05';                                              // a Monday
const at = (dayOff, h, m) => new Date(2026, 9, 5 + dayOff, h, m || 0, 0).toISOString();   // local time

const logic = vm.createContext({});
vm.runInContext(read('12-home-activity-logic.js'), logic, { filename: '12-home-activity-logic.js' });
const fn = (name) => vm.runInContext(name, logic);
const L = (name, ...args) => plain(fn(name)(...plain(args)));
const model = (list, o) => plain(fn('actvModel')(plain(list), Object.assign({ today: TODAY, limit: 100 }, o || {})));

const e = (token, o) => Object.assign({ token, at: at(0, 10), source: 'assistant', summary: 'Change ' + token, ops: 1, undoable: true }, o || {});

/* ───────── labels ───────── */
test('source labels: You, Assistant, the MCP client without its version, Auto-link, title case', () => {
  assert.equal(L('actvSourceLabel', { source: 'ui' }), 'You');
  assert.equal(L('actvSourceLabel', { source: 'assistant' }), 'Assistant');
  assert.equal(L('actvSourceLabel', { source: 'mcp', client: 'claude-code 2.1.4' }), 'Claude Code');
  assert.equal(L('actvSourceLabel', { source: 'mcp', client: 'Acme Desktop v1.0.3-beta' }), 'Acme Desktop', 'capitals kept, version dropped');
  assert.equal(L('actvSourceLabel', { source: 'mcp' }), 'MCP', 'no client name');
  assert.equal(L('actvSourceLabel', { source: 'mcp', client: '  ' }), 'MCP');
  assert.equal(L('actvSourceLabel', { source: 'autolink' }), 'Auto-link');
  assert.equal(L('actvSourceLabel', { source: 'nightly_tidy' }), 'Nightly Tidy');
  assert.equal(L('actvSourceLabel', { source: 'cli' }), 'CLI');
  assert.equal(L('actvSourceLabel', {}), 'Script');
  assert.deepEqual(['ui', 'assistant', 'mcp', 'autolink', 'cli', ''].map(s => L('actvKind', { source: s })), ['you', 'assistant', 'mcp', 'autolink', 'script', 'script']);
});

/* ───────── the count ───────── */
test("today's count: not yours, in the range; the wording", () => {
  const list = [
    e('a1'), e('a2', { source: 'mcp', client: 'x' }), e('a3', { source: 'autolink' }), e('a4', { source: 'cli' }),
    e('y1', { source: 'ui' }),
    e('old', { at: at(-1, 23, 30) }),                                  // yesterday
  ];
  const m = model(list, { range: 'today' });
  assert.equal(m.others, 4);
  assert.equal(m.you, 1);
  assert.equal(m.total, 4, 'your own are left out unless "mine"');
  assert.equal(m.capped, false);
  assert.equal(model(list, { range: '7d' }).others, 5);
  assert.equal(model(list, { range: 'today', mine: true }).total, 5);
  assert.equal(L('actvCountText', 4, 'today'), '4 changes by assistants today');
  assert.equal(L('actvCountText', 1, 'today'), '1 change by an assistant today');
  assert.equal(L('actvCountText', 0, 'today'), 'No changes by assistants today');
  assert.equal(L('actvCountText', 0, '7d'), 'No changes by assistants in the last 7 days');
  assert.equal(L('actvCountText', 100, 'today', true), '100+ changes by assistants today');
  const full = Array.from({ length: 5 }, (_, i) => e('f' + i, { at: at(0, 9, i) }));
  assert.equal(model(full, { limit: 5 }).capped, true, 'the list is full and its oldest is today: there may be more');
  assert.equal(model(full.concat([e('z', { at: at(-3, 9) })]), { limit: 6 }).capped, false);
});

test('the range: 7 days starts six days back; bad entries are dropped; newest first', () => {
  assert.equal(L('actvRangeStart', '7d', TODAY), '2026-09-29');
  assert.equal(L('actvRangeStart', 'today', TODAY), TODAY);
  const list = [e('a', { at: at(-6, 8) }), e('b', { at: at(-7, 20) }), e('c', { at: at(0, 8) }), { token: '', at: at(0, 9) }, { token: 'bad', at: 'nope' }, null];
  const m = model(list, { range: '7d' });
  assert.deepEqual(m.rows.map(r => r.token), ['c', 'a']);
  assert.equal(m.lastAny.token, 'b', 'the newest outside the range, for the empty state');
});

/* ───────── filters ───────── */
test('filters: chips for All and every kind with changes; the current one stays', () => {
  const list = [e('a1'), e('a2'), e('m1', { source: 'mcp', client: 'acme' }), e('l1', { source: 'autolink' }), e('y1', { source: 'ui' })];
  let m = model(list, { mine: true });
  assert.deepEqual(m.chips.map(c => [c.k, c.n, c.on]), [['all', 5, true], ['assistant', 2, false], ['mcp', 1, false], ['autolink', 1, false], ['you', 1, false]]);
  m = model(list, { mine: true, filter: 'mcp' });
  assert.deepEqual(m.rows.map(r => r.token), ['m1']);
  assert.equal(m.chips.find(c => c.k === 'mcp').on, true);
  assert.equal(m.total, 5, 'the header count is before the filter');
  m = model(list, { filter: 'script' });
  assert.equal(m.rows.length, 0);
  assert.ok(m.chips.some(c => c.k === 'script' && c.on && c.n === 0), 'the current filter keeps its chip at 0');
  assert.equal(model(list, { filter: 'nonsense' }).filter, 'all');
  assert.ok(!model(list, {}).chips.some(c => c.k === 'you'), 'without "mine" there is no You chip');
});

/* ───────── undo chains ───────── */
test('undo chains: undone, redone, and the token an Undo sends', () => {
  const list = [
    e('t1', { at: at(0, 9), undoable: false, undone: { at: at(0, 9, 30), by: 'u1' } }),
    e('u1', { at: at(0, 9, 30), source: 'ui', undoOf: 't1', summary: 'Undo: Change t1', undoable: false, undone: { at: at(0, 10), by: 'u2' } }),
    e('u2', { at: at(0, 10), source: 'ui', undoOf: 'u1', summary: 'Undo: Undo: Change t1' }),
    e('t2', { at: at(0, 11), undoable: false, undone: { at: at(0, 11, 5), by: 'u3' } }),
    e('u3', { at: at(0, 11, 5), source: 'ui', undoOf: 't2', summary: 'Undo: Change t2' }),
    e('t3', { at: at(0, 12) }),
    e('t4', { at: at(0, 12, 30), undoable: false }),                    // too old to undo (entities pruned)
  ];
  const r = new Map(Object.entries(Object.fromEntries(fn('actvResolve')(plain(list), {}))));
  const g = (k) => plain(r.get(k));
  assert.deepEqual([g('t1').undone, g('t1').redone, g('t1').target], [false, true, 'u2'], 'undone then redone: live, its Undo undoes the redo');
  assert.deepEqual([g('t2').undone, g('t2').target], [true, null]);
  assert.deepEqual([g('u3').undone, g('u3').target], [false, 'u3'], 'the undo entry itself can be undone (Redo)');
  assert.deepEqual([g('t3').undone, g('t3').target], [false, 't3']);
  assert.equal(g('t4').target, null);
  // An undo this tab just made, before the list caught up.
  const local = fn('actvResolve')(plain([e('t5')]), { t5: { by: 'u9' } });
  assert.deepEqual(plain(local.get('t5')), { undone: true, redone: false, target: null, here: true });
  const unknown = fn('actvResolve')(plain([e('t6', { undone: { at: at(0, 13) } })]), {});
  assert.equal(plain(unknown.get('t6')).undone, true, 'undone by an unknown token still counts as undone');
});

test('the S row: the newest that can be undone; after Undo here, its receipt stays', () => {
  const list = [e('t1', { at: at(0, 9) }), e('t2', { at: at(0, 10), undoable: false })];
  let m = model(list, {});
  assert.equal(m.last.token, 't1', 'skips the newest that cannot be undone');
  m = model(list, { local: { t1: { by: 'u1' } } });
  assert.equal(m.last.token, 't1');
  assert.equal(m.last.undone, true);
  assert.equal(m.last.target, null, 'so a second click on "Undo last" does nothing');
  assert.equal(model([e('y', { source: 'ui' })], {}).last, null, 'your own changes are not offered without "mine"');
});

/* ───────── what a change touched ───────── */
test('tasks touched: the one task a row opens, entity labels', () => {
  assert.deepEqual(L('actvTaskIds', { touched: ['task:a', 'autolink:a', 'task:b', 'person:p'] }), ['a', 'b']);
  assert.equal(L('actvSingleTask', { touched: ['task:a', 'autolink:a'] }), 'a');
  assert.equal(L('actvSingleTask', { touched: ['task:a', 'task:b'] }), null);
  assert.equal(L('actvSingleTask', { touched: ['task:a'], touchedCount: 25 }), null, 'a list the server cut short');
  assert.equal(L('actvSingleTask', {}), null);
  const look = { task: (id) => (id === 'a' ? 'Draft the report' : null), person: (id) => (id === 'p' ? 'Sam' : null) };
  const ent = (k) => plain(fn('actvEntity')(k, look));
  assert.deepEqual([ent('task:a').label, ent('task:a').task], ['Draft the report', 'a']);
  assert.deepEqual([ent('task:gone').label, ent('task:gone').task], ['A task that is no longer there', null]);
  assert.equal(ent('autolink:a').label, 'Suggested links for "Draft the report"');
  assert.equal(ent('person:p').person, 'p');
  assert.equal(ent('eventMeta:x').label, 'Notes on a calendar event');
  assert.equal(ent('key:quickTemplates').label, 'Quick Templates');
  assert.equal(ent('daynote:2026-10-05').label, 'Daily note, 2026-10-05');
  assert.equal(ent('weird').label, 'Weird');
  assert.equal(plain(fn('actvEntity')('task:a', { task: () => { throw new Error('x'); } })).task, null, 'a failing lookup is safe');
});

test('times: today, yesterday, this week, older; ago', () => {
  const ms = (d, h, m) => new Date(2026, 9, 5 + d, h, m || 0).getTime();
  assert.equal(L('actvWhen', ms(0, 14, 5), TODAY, 'en-GB'), '14:05');
  assert.equal(L('actvWhen', ms(-1, 9, 0), TODAY, 'en-GB'), 'Yesterday 09:00');
  assert.match(L('actvWhen', ms(-3, 9, 0), TODAY, 'en-GB'), /^Fri 09:00$/);
  assert.match(L('actvWhen', ms(-20, 9, 0), TODAY, 'en-GB'), /15 Sept?/);
  assert.equal(L('actvWhen', NaN, TODAY), '');
  const now = ms(0, 12);
  assert.equal(L('actvAgo', now - 20000, now), 'just now');
  assert.equal(L('actvAgo', now - 12 * 60000, now), '12 min ago');
  assert.equal(L('actvAgo', now - 3 * 3600000, now), '3 h ago');
  assert.equal(L('actvAgo', now - 26 * 3600000, now), 'yesterday');
  assert.equal(L('actvAgo', now - 72 * 3600000, now), '3 days ago');
});

/* ───────── the journal: what history.list gives the widget ───────── */
const dirs = [];
after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

test('history.list: touched keys, undoOf on the undo, undone with its undo token', async () => {
  const dir = makeDataDir(); dirs.push(dir);
  const a = createActions({ dataDir: dir });
  const r = await a.apply({ ops: [{ op: 'task.update', id: 'u-1-aaa', priority: 'p3' }], source: 'mcp', client: 'acme 1.2.0' });
  let h = (await a.query('history.list', { limit: 5 })).history;
  const first = h.find(x => x.token === r.undo);
  assert.equal(first.source, 'mcp');
  assert.equal(first.client, 'acme 1.2.0');
  assert.deepEqual(first.touched, ['task:u-1-aaa']);
  assert.equal(first.touchedCount, 1);
  assert.equal(first.undoable, true);
  const u = await a.undo(r.undo, { source: 'ui', client: 'home:activity' });
  h = (await a.query('history.list', { limit: 5 })).history;
  const again = h.find(x => x.token === r.undo);
  assert.equal(again.undoable, false);
  assert.equal(again.undone.by, u.undo);
  const undo = h.find(x => x.token === u.undo);
  assert.equal(undo.undoOf, r.undo);
  assert.equal(undo.client, 'home:activity');
  // The widget's model over the real answer: the change is undone, and its undo can be undone (Redo).
  const m = plain(fn('actvModel')(plain(h), { today: h[0].at ? new Date(h[0].at).toLocaleDateString('sv-SE') : TODAY, mine: true, limit: 100 }));
  const row = m.rows.find(x => x.token === r.undo);
  assert.equal(row.undone, true);
  assert.equal(row.task, 'u-1-aaa');
  assert.equal(m.rows.find(x => x.token === u.undo).target, u.undo);
});

/* ───────── in the Home bundle ───────── */
function fakeEl() {
  const attrs = {};
  return { dataset: {}, innerHTML: '', textContent: '', style: {}, getAttribute: (k) => attrs[k] ?? null,
    setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; },
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} }, appendChild() {}, append() {}, querySelector: () => null, querySelectorAll: () => [] };
}
test('in the bundle: registered, available, sizes and settings as the server has them, a gallery sample', () => {
  const box = {
    console, state: { home: {} }, APP_CONFIG: { locale: 'en-GB', features: {}, weekStart: 'Mon' }, CSS: { escape: (s) => s }, TextEncoder,
    window: { addEventListener() {} },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    // the sample is stamped from the real clock, so the bundle uses the real local day
    registerSection() {}, saveUI() {}, undo() {}, toast() {}, todayStr: () => new Date().toLocaleDateString('sv-SE'),
    fmtDate: (d) => d.toLocaleDateString('sv-SE'), setTimeout: () => 0, clearTimeout() {},
    esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => `<i data-i="${n}"></i>`,
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort().map(read);
  vm.runInContext(files.join('\n'), box, { filename: 'home-activity-bundle.js' });
  const d = JSON.parse(vm.runInContext('JSON.stringify(homeWidgetDefs().filter(d => d.id === "activity").map(d => ({ sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden, defaults: d.defaults, available: d.available(), settings: typeof d.settings, title: d.title, group: d.group })))', box))[0];
  const srv = HOME_WIDGETS.find(w => w.id === 'activity');
  assert.equal(d.available, true);
  assert.deepEqual(d.sizes, srv.sizes); assert.equal(d.defaultSize, srv.defaultSize); assert.equal(d.defaultHidden, true);
  assert.equal(d.title, srv.title); assert.equal(d.group, srv.group);
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.activity.properties).sort());
  assert.deepEqual(d.defaults, { mine: false, range: 'today' });
  assert.equal(d.settings, 'function');
  const sample = JSON.parse(vm.runInContext('JSON.stringify(homeSample("activity"))', box));
  assert.ok(Array.isArray(sample) && sample.length >= 2, 'the gallery has rows to draw');
  const m = plain(vm.runInContext('actvModel', box)(sample, { today: vm.runInContext('todayStr()', box), range: '7d' }));
  assert.ok(m.rows.length >= 1);
  assert.ok(sample.some(s => s.undone), 'the sample shows an undone row too');
});

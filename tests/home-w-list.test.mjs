// The Smart list Home widget (WIDGETS_CATALOGUE.md 3.11; src/app/12-home-w-list.js and its
// pure rules in 12-home-list-logic.js):
//   - the query: is:open is implied unless it asks for closed tasks, and every parse is a
//     fresh object (parseTaskSearch caches only its last query, which copies share);
//   - what an added task gets from the query (homeQueryDefaults);
//   - the grouping buckets and groups (due / stream / person), the board's columns, titles;
//   - copies are independent: two copies with different searches, interleaved, each keep
//     their own tasks (the real parser, matcher and homeMemo in a VM);
//   - the registration: available, its sizes and copies, settings that fit the server schema.
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { check } from '../server/actions/validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ───────── the pure rules with the real query parser, alone in a VM ───────── */
const logic = vm.createContext({});
vm.runInContext(read('21-task-query.js') + '\n' + read('12-home-list-logic.js'), logic, { filename: 'list-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...plain(args)));
const parse = (q) => vm.runInContext(`homeListParse(${JSON.stringify(q)}, parseTaskSearch)`, logic);

test('the query: is:open is implied unless it asks for closed tasks', () => {
  assert.deepEqual(plain(parse('#onboarding due:week').is), ['open']);
  assert.equal(parse('#onboarding').implied, true);
  for (const q of ['is:done', '#x is:done', 'is:wontdo', 'is:skipped @sam']) {
    const p = parse(q);
    assert.equal(p.implied, false, q);
    assert.equal(p.wantsClosed, true, q);
    assert.ok(!p.is.includes('open'), `${q} does not add is:open`);
  }
  const explicit = parse('is:open p1');
  assert.equal(explicit.implied, false, 'an explicit is:open is not "implied"');
  assert.deepEqual(plain(explicit.is), ['open']);
  assert.deepEqual(plain(parse('is:doing').is), ['doing', 'open']);
  assert.equal(parse('').raw, '');
  assert.equal(parse('  due:none  ').raw, 'due:none', 'trimmed');
});

test('every parse is a fresh object: the parser\'s one-query cache is never changed', () => {
  const a = parse('#alpha');
  const b = parse('#alpha');
  assert.notEqual(a, b, 'a new object each time');
  a.is.push('pinned'); a.tags.push('zzz');
  assert.deepEqual(plain(parse('#alpha').is), ['open'], 'changing one parse leaves the next alone');
  assert.deepEqual(plain(vm.runInContext('parseTaskSearch("#alpha")', logic).is), [], 'the cached parse never gets the implied is:open');
  assert.deepEqual(plain(vm.runInContext('parseTaskSearch("#alpha")', logic).tags), ['alpha']);
});

test('the done-today query drops only the implied is:open', () => {
  const p = parse('#writing p2');
  const d = vm.runInContext('homeListDoneQuery', logic)(p);
  assert.deepEqual(plain(d.is), []);
  assert.deepEqual(plain(d.tags), ['writing']);
  assert.equal(d.prio, 'p2');
  assert.deepEqual(plain(p.is), ['open'], 'the parse it came from is unchanged');
  assert.deepEqual(plain(vm.runInContext('homeListDoneQuery', logic)(parse('is:open #x')).is), ['open'], 'an explicit is:open stays');
});

test('homeQueryDefaults: an added task gets what the query says, resolved against what exists', () => {
  const known = {
    today: '2026-10-07', tomorrow: '2026-10-08',
    tags: ['onboarding', 'ops', 'writing'],
    people: [{ id: 'sam', name: 'Sam Taylor' }, { id: 'sam-2', name: 'Sam Rivera' }, { id: 'alex', name: 'Alex Kim', aliases: ['AK'] }, { id: 'me', name: 'Jo Self', self: true }],
    streams: [{ id: 'work', label: 'Work', order: 0 }, { id: 'wellbeing', label: 'Wellbeing', order: 2 }, { id: 'acme', label: 'Acme project', order: 1 }],
  };
  const D = (q) => L('homeQueryDefaults', parse(q), known);
  assert.deepEqual(D('#onboarding'), { tags: ['onboarding'] });
  assert.deepEqual(D('#onb'), { tags: ['onboarding'] }, 'a prefix of exactly one tag is that tag');
  assert.deepEqual(D('#o'), { tags: ['o'] }, 'an ambiguous prefix is kept as typed');
  assert.deepEqual(D('#brandnew'), { tags: ['brandnew'] });
  assert.deepEqual(D('@alex'), { people: ['alex'] });
  assert.deepEqual(D('@ak'), { people: ['alex'] }, 'an alias');
  assert.deepEqual(D('@sam'), { people: ['sam'] }, 'an exact id wins');
  assert.deepEqual(D('@rivera'), { people: ['sam-2'] }, 'a unique surname');
  assert.deepEqual(D('@jo'), {}, 'never the user themself');
  assert.deepEqual(D('@nobody'), {}, 'no new person is made up');
  assert.deepEqual(D('stream:work'), { stream: 'work' });
  assert.deepEqual(D('stream:acme'), { stream: 'acme' });
  assert.deepEqual(D('stream:w'), { stream: 'work' }, 'a label prefix: the first in stream order');
  assert.deepEqual(D('stream:zzz'), {});
  assert.deepEqual(D('p1'), { priority: 'p1' });
  assert.deepEqual(D('!p3'), { priority: 'p3' });
  assert.deepEqual(D('p0'), {}, 'no priority is the default anyway');
  assert.deepEqual(D('due:today'), { dueDate: '2026-10-07' });
  assert.deepEqual(D('due:tomorrow'), { dueDate: '2026-10-08' });
  for (const q of ['due:week', 'due:overdue', 'due:none']) assert.deepEqual(D(q), {}, `${q}: no date is made up`);
  assert.deepEqual(D('is:doing'), { status: 'doing' });
  assert.deepEqual(D('is:planned'), { plannedFor: '2026-10-07' });
  assert.deepEqual(D('report -draft words'), {}, 'free words and exclusions add nothing');
  assert.deepEqual(D('#writing @alex stream:work p2 due:today'), { tags: ['writing'], people: ['alex'], stream: 'work', priority: 'p2', dueDate: '2026-10-07' });
  assert.deepEqual(L('homeQueryDefaults', parse('#x'), {}), { tags: ['x'] }, 'nothing known: the tag as typed');
});

test('the due buckets: overdue, today, the next 7 days, later, no date', () => {
  const B = (d, t = '2026-10-07') => L('homeListBucket', d, t);
  assert.equal(B('2026-10-06'), 'overdue');
  assert.equal(B('2025-12-31'), 'overdue');
  assert.equal(B('2026-10-07'), 'today');
  assert.equal(B('2026-10-08'), 'week');
  assert.equal(B('2026-10-14'), 'week', '7 days ahead is still this week (as due:week)');
  assert.equal(B('2026-10-15'), 'later');
  assert.equal(B(null), 'none'); assert.equal(B(''), 'none'); assert.equal(B('soon'), 'none');
  assert.equal(B('2026-11-01', '2026-10-30'), 'week', 'across a month end');
  assert.equal(B('2027-01-02', '2026-12-30'), 'week', 'across a year end');
  assert.equal(B('2026-03-30', '2026-03-29'), 'week', 'across a clock change');
});

test('groups: by due in bucket order, by stream in stream order, by person (the first other person)', () => {
  const rows = [
    { id: 'a', due: '2026-10-20', stream: 'work', people: ['me', 'sam'] },
    { id: 'b', due: '2026-10-07', stream: 'home', people: [] },
    { id: 'c', due: null, stream: '', people: ['alex'] },
    { id: 'd', due: '2026-10-01', stream: 'work', people: ['sam'] },
    { id: 'e', due: '2026-10-09', stream: 'home', people: ['alex', 'sam'] },
    { id: 'f', due: '2026-10-08', stream: 'work', people: ['sam'] },
  ];
  const fns = `{ today: '2026-10-07', selfIds: ['me'], streamLabel: (s) => ({ work: 'Work', home: 'Home' })[s], streamOrder: (s) => ({ work: 1, home: 0 })[s], personName: (p) => ({ sam: 'Sam Taylor', alex: 'Alex Kim' })[p] }`;
  const G = (by) => plain(vm.runInContext(`homeListGroups(${JSON.stringify(rows)}, '${by}', ${fns})`, logic));
  assert.deepEqual(G('due'), [
    { key: 'd:overdue', label: 'Overdue', ids: ['d'] }, { key: 'd:today', label: 'Today', ids: ['b'] },
    { key: 'd:week', label: 'This week', ids: ['e', 'f'] }, { key: 'd:later', label: 'Later', ids: ['a'] }, { key: 'd:none', label: 'No date', ids: ['c'] },
  ]);
  assert.deepEqual(G('stream').map(g => [g.label, g.ids]), [['Home', ['b', 'e']], ['Work', ['a', 'd', 'f']], ['No stream', ['c']]]);
  assert.deepEqual(G('person').map(g => [g.label, g.ids]), [['Sam Taylor', ['a', 'd', 'f']], ['Alex Kim', ['c', 'e']], ['No one', ['b']]], 'the user is skipped; most first; no one last');
  const none = plain(vm.runInContext(`homeListGroups([{ id: 'x', people: ['me'] }, { id: 'y', people: ['sam'] }], 'person', ${fns})`, logic));
  assert.deepEqual(none.map(g => g.label), ['Sam Taylor', 'No one'], '"No one" comes last');
  assert.deepEqual(L('homeListGroups', [], 'due', {}), []);
});

test('the board columns, and titles from the query', () => {
  assert.equal(L('homeListColumn', 'todo'), 'todo');
  assert.equal(L('homeListColumn', 'waiting'), 'todo');
  assert.equal(L('homeListColumn', 'doing'), 'doing');
  assert.equal(L('homeListColumn', 'done'), 'done');
  const T = (q) => vm.runInContext(`homeListAutoTitle(homeListParse(${JSON.stringify(q)}, parseTaskSearch), { personName: (q) => q === 'sam' ? 'Sam Taylor' : '', streamLabel: (q) => q === 'work' ? 'Work' : '' })`, logic);
  assert.equal(T('due:week'), 'Due this week');
  assert.equal(T('due:none'), 'No date');
  assert.equal(T('due:today'), 'Due today');
  assert.equal(T('#onboarding'), '#onboarding');
  assert.equal(T('@sam'), 'Sam Taylor');
  assert.equal(T('@zed'), '@zed', 'an unknown person keeps the @');
  assert.equal(T('stream:work'), 'Work');
  assert.equal(T('#a p1'), '#a p1', 'more than one part: the query itself');
  assert.equal(T(''), 'Smart list');
  assert.equal(T('x'.repeat(60)).length, 40, 'a long query is shortened');
  const presets = plain(vm.runInContext('HOME_LIST_PRESETS', logic));
  assert.deepEqual(presets.map(p => p.id), ['week', 'nodate', 'tag', 'person', 'stream', 'custom'], 'the set-up presets of the spec, in order');
  assert.deepEqual(presets.filter(p => p.query).map(p => p.query), ['due:week', 'due:none']);
});

/* ───────── the widget file in a VM: real parser, matcher and homeMemo ───────── */
const TODAY = '2026-10-07';
function listBox(tasks, statuses) {
  const st = { custom: tasks, statuses: statuses || {}, completionLog: {}, notes: {}, people: [{ id: 'sam', name: 'Sam Taylor' }], _lastSave: 1, _saveCount: 1, home: {} };
  const defs = [];
  const dayNo = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : null; };
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB' }, STREAMS: { work: { label: 'Work', order: 0 }, home: { label: 'Home', order: 1 } },
    registerHomeWidget: (d) => defs.push(d), todayStr: () => TODAY, fmtDate: (d) => d.toISOString().slice(0, 10),
    getAllItems: () => st.custom, getItem: (id) => st.custom.find(t => t.id === id),
    statusOf: (id) => st.statuses[id] || 'todo', isWontDo: () => false, isPinned: () => false, closedAt: () => 0,
    effTitle: (i) => i.title, effDetail: () => '', effTags: (i) => i.tags || [], effStream: (i) => i.stream, effPriority: (i) => i.priority || 'p0',
    effDate: (i) => i.dueDate || null, effSubtasks: () => [], getNotes: () => [], effRecurrence: () => 'none',
    effPeople: (i) => i.people || [], getPerson: (id) => st.people.find(p => p.id === id),
    daysUntil: (iso) => { const d = dayNo(iso); return d == null ? null : Math.round(d - dayNo(TODAY)); },
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  vm.runInContext(['21-task-query.js', '12-home-platform.js', '12-home-list-logic.js', '12-home-w-list.js'].map(read).join('\n'), box, { filename: 'list-bundle.js' });
  return { box, defs, st, run: (code) => vm.runInContext(code, box) };
}
const TASKS = [
  { id: 't1', title: 'Draft the Acme report', tags: ['writing'], stream: 'work', dueDate: '2026-10-07', priority: 'p1' },
  { id: 't2', title: 'Review the slides', tags: ['writing'], stream: 'work', dueDate: '2026-10-09' },
  { id: 't3', title: 'Book the venue', tags: ['ops'], stream: 'home', dueDate: '2026-10-07', people: ['sam'] },
  { id: 't4', title: 'Send the notes', tags: ['writing'], stream: 'home', dueDate: null },
  { id: 't5', title: 'Old writing task', tags: ['writing'], stream: 'work', dueDate: '2026-10-01' },
];

test('copies are independent: two searches, interleaved, each keep their own tasks', () => {
  const { run } = listBox(TASKS, { t5: 'done' });
  const ids = (code) => plain(run(`(${code}).open.map(i => i.id)`));
  const one = `homeListModel('list', { query: '#writing' })`;
  const two = `homeListModel('list~2', { query: 'due:today' })`;
  assert.deepEqual(ids(one), ['t1', 't2', 't4'], 'open #writing tasks, by due date (no date last); the done one is left out');
  assert.deepEqual(ids(two), ['t1', 't3']);
  assert.deepEqual(ids(one), ['t1', 't2', 't4'], 'copy 1 again, after copy 2 parsed its own query');
  run(`parseTaskSearch('@sam')`);                       // anything else using the parser in between
  assert.deepEqual(ids(two), ['t1', 't3']);
  assert.deepEqual(ids(`homeListModel('list~3', { query: '@sam' })`), ['t3']);
  // Same copy, new settings: a new answer (the memo keys on the copy AND its settings).
  assert.deepEqual(ids(`homeListModel('list', { query: 'stream:home' })`), ['t3', 't4']);
  assert.deepEqual(ids(`homeListModel('list', { query: 'is:done' })`), ['t5'], 'is:done lists closed tasks');
  assert.deepEqual(ids(`homeListModel('list~4', { query: '' })`), [], 'not set up: no tasks');
});

test('the model follows the data: a save changes the answer', () => {
  const { run, st } = listBox(TASKS.map(t => Object.assign({}, t)), {});
  assert.equal(run(`homeListModel('list', { query: 'due:today' }).open.length`), 2);
  st.statuses.t1 = 'done'; st._lastSave = 2; st._saveCount = 2;
  assert.deepEqual(plain(run(`homeListModel('list', { query: 'due:today' }).open.map(i => i.id)`)), ['t3']);
});

test('the registration: available, M by default, up to 6 copies, settings that fit the server schema', () => {
  const { defs, run } = listBox([], {});
  const d = defs.find(x => x.id === 'list');
  assert.ok(d, 'registers "list"');
  assert.equal(d.available(), true, 'built: offered in Add widget');
  assert.equal(d.defaultHidden, true, 'never appears on an existing board by itself');
  assert.equal(d.multi, 6);
  assert.deepEqual(plain(d.sizes), ['s', 'm', 'l', 'full']);
  assert.equal(d.defaultSize, 'm');
  assert.equal(typeof d.settings, 'function');
  assert.equal(typeof d.unmount, 'function');
  const server = HOME_WIDGETS.find(w => w.id === 'list');
  assert.deepEqual(plain(d.aliases), [...server.aliases]);
  assert.equal(d.title, server.title);
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.list.properties).sort());
  assert.deepEqual(check(HOME_WIDGET_PREFS.list, plain(d.defaults), 'settings'), []);
  // The gallery's sample: due this week only (never an overdue task under "Due this week").
  const s = plain(d.sample(plain(run(`({ today: '${TODAY}', people: [{ id: 'p1', name: 'Sam Taylor' }], tasks: [
    { id: 'a', title: 'A', dueDate: '${TODAY}', people: ['p1'] }, { id: 'b', title: 'B', dueDate: '2026-10-05' },
    { id: 'c', title: 'C', dueDate: '2026-10-10' }, { id: 'd', title: 'D', dueDate: null }, { id: 'e', title: 'E', dueDate: '2026-12-01' }] })`))));
  assert.equal(s.query, 'due:week');
  assert.deepEqual(s.rows.map(r => r.id), ['a', 'c']);
  assert.equal(s.rows[0].people[0].name, 'Sam Taylor');
});

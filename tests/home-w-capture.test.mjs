// Home widget "capture" (Quick capture, WIDGETS_CATALOGUE.md 3.1): put a thought into
// the system in two seconds, then sort what was captured.
//   - the pure rules (src/app/12-home-capture-logic.js) alone in a VM: To sort
//     (homeCaptureUnsorted), Just added ordering, the stream chips (most used, the
//     likely one from similar titles), templates, the "already on that day" rule, the
//     "Looks fine" list (capped by count and by size, so the settings stay under 4 KB);
//   - in the Home bundle with the REAL quick-add parser (22-quick-add.js) and task
//     creation: the widget is registered and available, its defaults match the server's
//     settings schema, Enter adds one task with the widget's stream (one save), pasted
//     lines are ONE undo step, Today on a task already on today does nothing, a
//     template's main click only opens the editor (nothing saved) while its check makes
//     the task at once, Looks fine saves the id with Undo, the gallery preview draws
//     sample content without touching the data.
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS, HOME_WIDGET_PREFS_MAX_BYTES } from '../lib/home-topbar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const NOW = Date.parse('2026-10-05T14:00:00Z');
const H = 3600000, D = 24 * H;
const localIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ───────── the pure rules, alone in a VM ───────── */
const logic = vm.createContext({});
vm.runInContext(read('12-home-capture-logic.js'), logic, { filename: '12-home-capture-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...plain(args)));
const row = (id, o) => Object.assign({ id, title: 'Task ' + id, createdAt: NOW - H, dueDate: null, plannedFor: null, tags: [], stream: 'personal', open: true }, o || {});

test('To sort: open, made in the last 7 days, no date, no plan, no tags, the default (or no) stream, not "Looks fine"', () => {
  const rows = [
    row('a'),
    row('b', { stream: null }),                               // no stream at all: unsorted
    row('c', { stream: 'work' }),                             // already sorted into a stream
    row('d', { dueDate: '2026-10-09' }),
    row('e', { plannedFor: '2026-10-06' }),
    row('f', { tags: ['admin'] }),
    row('g', { open: false }),
    row('h', { createdAt: NOW - 8 * D }),                     // too old
    row('i', { createdAt: undefined }),                       // unknown age: never guessed
    row('j'),                                                 // marked "Looks fine"
    row('k', { createdAt: new Date(NOW - 2 * D).toISOString() }),   // an ISO creation time counts too
    row('l', { stream: 'inbox' }),                            // the widget's own default stream
    null, { title: 'no id' },
  ];
  const out = L('homeCaptureUnsorted', rows, NOW, { defaultStream: ['personal', 'inbox'], sorted: ['j'] });
  assert.deepEqual(out.map(r => r.id).sort(), ['a', 'b', 'k', 'l']);
  // newest first; Just added ids left out with skip
  const ord = L('homeCaptureUnsorted', [row('old', { createdAt: NOW - 3 * D }), row('new', { createdAt: NOW - H }), row('mid', { createdAt: NOW - D })], NOW, { defaultStream: 'personal' });
  assert.deepEqual(ord.map(r => r.id), ['new', 'mid', 'old']);
  assert.deepEqual(L('homeCaptureUnsorted', [row('x'), row('y')], NOW, { defaultStream: 'personal', skip: ['x'] }).map(r => r.id), ['y']);
  // a creation time in the future is not "recent"
  assert.deepEqual(L('homeCaptureUnsorted', [row('z', { createdAt: NOW + 2 * D })], NOW, { defaultStream: 'personal' }), []);
});

test('Just added: open tasks made in the last 24 h, newest first, at most 5', () => {
  const rows = [
    row('t1', { createdAt: NOW - 30 * 60000 }), row('t2', { createdAt: NOW - 2 * H }), row('t3', { createdAt: NOW - 5 * 60000 }),
    row('t4', { createdAt: NOW - 23 * H }), row('t5', { createdAt: NOW - 25 * H }), row('t6', { createdAt: NOW - H, open: false }),
    row('t7', { createdAt: NOW - 3 * H }), row('t8', { createdAt: NOW - 4 * H }), row('t9', { createdAt: NOW - 6 * H }),
  ];
  assert.deepEqual(L('homeCaptureJustAdded', rows, NOW).map(r => r.id), ['t3', 't1', 't2', 't7', 't8']);
  assert.deepEqual(L('homeCaptureJustAdded', rows, NOW, { limit: 10 }).map(r => r.id), ['t3', 't1', 't2', 't7', 't8', 't9', 't4']);
  // ties are stable (by id), so the list never shuffles between renders
  const same = [row('b', { createdAt: NOW - H }), row('a', { createdAt: NOW - H })];
  assert.deepEqual(L('homeCaptureJustAdded', same, NOW).map(r => r.id), ['a', 'b']);
  assert.deepEqual(L('homeCaptureJustAdded', same.slice().reverse(), NOW).map(r => r.id), ['a', 'b']);
});

test('stream chips: the most used streams (never the default one), the likely one from similar titles first', () => {
  const rows = [
    row('1', { stream: 'thesis', title: 'Write the methods chapter' }), row('2', { stream: 'thesis', title: 'Chapter 3 figures' }),
    row('3', { stream: 'thesis', title: 'Proofread the abstract' }), row('4', { stream: 'jobs', title: 'Update the CV' }),
    row('5', { stream: 'jobs', title: 'Cover letter for Acme' }), row('6', { stream: 'admin', title: 'Renew insurance' }),
    row('7', { stream: 'personal', title: 'Insurance chapter thoughts' }),       // the default stream says nothing
  ];
  const allowed = ['thesis', 'jobs', 'admin', 'personal', 'learning'];
  assert.deepEqual(L('homeCaptureTopStreams', rows, { allowed, exclude: ['personal'], limit: 4 }), ['thesis', 'jobs', 'admin', 'learning']);
  assert.equal(L('homeCaptureGuessStream', 'Draft chapter 4', rows, { exclude: ['personal'] }), 'thesis');
  assert.equal(L('homeCaptureGuessStream', 'Insurance letter', rows, { exclude: ['personal'] }), null, 'a tie: no guess');
  assert.equal(L('homeCaptureGuessStream', 'Buy milk', rows, { exclude: ['personal'] }), null, 'no shared word');
  assert.equal(L('homeCaptureGuessStream', 'Email re the new task', rows, {}), null, 'only stop words');
  // the index gives the same answer, and the task itself does not vote for its own stream
  const idx = vm.runInContext('homeCaptureWordIndex', logic)(plain(rows), { exclude: ['personal'] });
  assert.equal(vm.runInContext('homeCaptureGuessStream', logic)('Renew the passport', idx, {}), 'admin');
  assert.equal(vm.runInContext('homeCaptureGuessStream', logic)('Renew insurance', idx, { selfId: '6' }), null);
  const ch = L('homeCaptureStreamChoices', 'Cover letter for Sam', rows, { allowed, exclude: ['personal'], limit: 3 });
  assert.deepEqual(ch, [{ id: 'jobs', guess: true }, { id: 'thesis', guess: false }, { id: 'admin', guess: false }]);
  assert.deepEqual(L('homeCaptureStreamChoices', 'x', rows, { limit: 0 }), []);
});

test('templates: quick templates first (due today + daysAhead, as the Templates menu makes them), then the user\'s', () => {
  const quick = [{ label: 'Follow-up email', title: 'Email re: ', stream: 'work', tags: ['email'], priority: 'p3' }, { label: 'Daily review', title: 'Daily review + plan', daysAhead: 1, recurrence: 'daily' }, { label: '', title: 'no label' }];
  const task = [{ id: 'tm1', name: 'Paper review', title: 'Review a paper', stream: 'papers', subtasks: [{ title: 'Read' }, { title: 'Write it up' }], detail: 'Use the form', daysAhead: 7 }, { id: 'tm2', title: 'No days' }];
  const t = L('homeCaptureTemplates', quick, task, { limit: 4 });
  assert.deepEqual(t.map(x => x.label), ['Follow-up email', 'Daily review', 'Paper review', 'No days']);
  assert.deepEqual(t.map(x => x.kind), ['quick', 'quick', 'task', 'task']);
  assert.equal(t[0].daysAhead, 0, 'a quick template with no daysAhead is due today');
  assert.equal(t[3].daysAhead, null, 'a task template with no daysAhead has no date');
  assert.deepEqual(t[2].subtasks, ['Read', 'Write it up']);
  assert.equal(L('homeCaptureTemplateDue', t[1], '2026-10-31'), '2026-11-01');
  assert.equal(L('homeCaptureTemplateDue', t[0], '2026-10-05'), '2026-10-05');
  assert.equal(L('homeCaptureTemplateDue', t[3], '2026-10-05'), null);
  assert.equal(L('homeCaptureTemplates', quick, task, { limit: 2 }).length, 2);
  // a title waiting to be finished gets no instant add: only the editor
  for (const s of ['Email re: ', 'Call -', 'Meeting (', 'Reply re', '  ']) assert.equal(L('homeCaptureTemplateOpenEnded', { title: s }), true, s);
  for (const s of ['Daily review + plan', 'Prepare the share', 'Pay rent']) assert.equal(L('homeCaptureTemplateOpenEnded', { title: s }), false, s);
});

test('Today / Tomorrow are "on" from the plan, else the due date; "ago" reads naturally', () => {
  assert.equal(L('homeCaptureDayOn', { plannedFor: '2026-10-05' }, '2026-10-05'), true);
  assert.equal(L('homeCaptureDayOn', { dueDate: '2026-10-05' }, '2026-10-05'), true);
  assert.equal(L('homeCaptureDayOn', { dueDate: '2026-10-05', plannedFor: '2026-10-06' }, '2026-10-05'), false, 'the plan wins');
  assert.equal(L('homeCaptureDayOn', {}, '2026-10-05'), false);
  assert.equal(L('homeCaptureAgo', NOW - 20000, NOW), 'just now');
  assert.equal(L('homeCaptureAgo', NOW - 5 * 60000, NOW), '5 min ago');
  assert.equal(L('homeCaptureAgo', NOW - 3 * H, NOW), '3 h ago');
  assert.equal(L('homeCaptureAgo', NOW - 30 * H, NOW), 'yesterday');
  assert.equal(L('homeCaptureAgo', NOW - 4 * D, NOW), '4 days ago');
  assert.equal(L('homeCaptureAgo', undefined, NOW), '');
});

test('"Looks fine" list: once, newest last, prunes ids that no longer matter, never outgrows the settings', () => {
  assert.deepEqual(L('homeCaptureSortedAdd', ['a', 'b'], 'a'), ['b', 'a']);
  assert.deepEqual(L('homeCaptureSortedAdd', ['a', 'b', 'c'], 'd', { cap: 3 }), ['b', 'c', 'd']);
  const keep = vm.runInContext('(x) => x !== "gone"', logic);
  assert.deepEqual(plain(vm.runInContext('homeCaptureSortedAdd', logic)(['gone', 'b'], 'c', { keep })), ['b', 'c']);
  // 200 real-looking task ids would pass 4 KB: the size cap keeps the newest that fit
  const ids = Array.from({ length: 260 }, (_, i) => `u-17${String(i).padStart(11, '0')}-x${i % 10}k`);
  const out = L('homeCaptureSortedAdd', ids, 'u-new');
  assert.equal(out[out.length - 1], 'u-new');
  assert.ok(out.length <= 200);
  assert.ok(JSON.stringify({ sorted: out, stream: 'a-long-stream-name', showSort: true }).length < HOME_WIDGET_PREFS_MAX_BYTES, 'fits the widget settings');
});

/* ───────── in the Home bundle, with the real quick-add parser ───────── */
function fakeEl(tag) {
  const attrs = {}; const classes = new Set(); const kids = [];
  const el = {
    tagName: String(tag || 'div').toUpperCase(), dataset: {}, style: {}, innerHTML: '', textContent: '', value: '', disabled: false, hidden: false, isConnected: true,
    children: kids, childNodes: kids, firstElementChild: null,
    getAttribute: (k) => (Object.hasOwn(attrs, k) ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; }, hasAttribute: (k) => Object.hasOwn(attrs, k),
    classList: { add: (...c) => c.forEach(x => classes.add(x)), remove: (...c) => c.forEach(x => classes.delete(x)), contains: (c) => classes.has(c), toggle: (c, on) => { const v = on === undefined ? !classes.has(c) : !!on; if (v) classes.add(c); else classes.delete(c); return v; } },
    appendChild(c) { kids.push(c); el.firstElementChild = kids[0]; return c; }, append(...c) { for (const x of c) el.appendChild(x); }, prepend(c) { kids.unshift(c); el.firstElementChild = kids[0]; },
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, closest: () => null, contains: () => false,
    setSelectionRange() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }), getClientRects: () => [], animate: () => null, remove() {},
    get className() { return [...classes].join(' '); }, set className(v) { classes.clear(); for (const c of String(v).split(/\s+/).filter(Boolean)) classes.add(c); },
    _attrs: attrs, _classes: classes,
  };
  return el;
}
const STREAMS_FIX = { personal: { label: 'Personal', color: '#888', order: 1 }, work: { label: 'Work', color: '#36c', order: 2 }, inbox: { label: 'Inbox', color: '#999', order: 3 }, old: { label: 'Old', color: '#999', order: 4, archived: true } };
function bundle(st) {
  const calls = { toasts: [], saves: 0, renders: 0, undo: 0, groups: 0, editor: [], dialog: [], announce: [], popover: [] };
  let seq = 0;
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', features: {} }, CSS: { escape: (s) => s }, TextEncoder,
    STREAMS: STREAMS_FIX, TEMPLATES: (st.quickTemplates || []).slice(), RECURRENCE_OPTIONS: [['none', 'Does not repeat'], ['daily', 'Every day'], ['weekly', 'Every week']],
    window: { addEventListener() {} },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: (t) => fakeEl(t), body: fakeEl('body'), hidden: false, activeElement: null },
    registerSection() {}, registerMoreItem() {}, render() { calls.renders++; }, saveData() { calls.saves++; st._saveCount = (st._saveCount || 0) + 1; }, saveUI() {}, undo() { calls.undo++; },
    toast: (m, o) => { calls.toasts.push({ m, o }); return () => {}; },
    fmtDate: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: (fn) => { fn(); return 0; },
    esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    escAttr: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    icon: (n) => `<i data-i="${n}"></i>`, safeColor: (c, f) => c || f || '', avatarInitials: (n) => String(n || '?').slice(0, 2),
    streamMarkHtml: (id) => `<span class="dot" data-s="${id}"></span>`,
    getAllItems: () => st.custom.filter(t => !(st.deleted || {})[t.id]), getItem: (id) => st.custom.find(t => t.id === id),
    statusOf: (id) => (st.statuses || {})[id] || 'todo', effDate: (i) => i.dueDate || null, effTitle: (i) => i.title, effTags: (i) => i.tags || [],
    effStream: (i) => i.stream, effPriority: (i) => i.priority || 'p0', daysUntil: () => 3, dueLabel: (iso) => iso,
    defaultStreamId: () => 'personal', logActivity() {}, _newTaskId: () => 'u-test-' + (++seq), _newSubId: () => 'st-' + (++seq),
    setPlanned: (id, d) => { const t = st.custom.find(x => x.id === id); t.plannedFor = d; calls.saves++; calls.renders++; },
    selUndoGroup: (fn) => { calls.groups++; return fn(); },
    tcOpenCreate: (pre, o) => { calls.editor.push(pre); return 'card'; },
    openQuickAddDialog: (t, o) => { calls.dialog.push([t, o]); },
    openPopover: (anchor, build, o) => { const el = fakeEl(); build(el, () => {}); calls.popover.push(el); return () => {}; },
    tcCurrentTaskId: () => null,
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort().map(read);
  vm.runInContext([read('22-quick-add.js'), read('23-quick-add-dialog.js'), ...files].join('\n'), box, { filename: 'home-capture-bundle.js' });
  box.homeAnnounce = (m) => calls.announce.push(m);           // after the bundle (its own declaration would win)
  box.todayStr = () => box.fmtDate(new Date());
  box.tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return box.fmtDate(d); };
  return { box, calls, run: (code) => vm.runInContext(code, box), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)) };
}
function capState() {
  const now = Date.now();
  return {
    view: 'home',
    custom: [
      { id: 'j1', title: 'Book the venue', stream: 'personal', createdAt: now - 10 * 60000, tags: [] },
      { id: 'j2', title: 'Reply to Acme', stream: 'work', createdAt: now - 2 * H, tags: [], plannedFor: null, dueDate: null },
      { id: 'j3', title: 'Pay the bill', stream: 'personal', createdAt: now - 3 * H, tags: [], dueDate: localIso(new Date(now)) },
      { id: 's1', title: 'Look into the Acme report', stream: 'personal', createdAt: now - 3 * D, tags: [] },
      { id: 's2', title: 'Something vague', stream: 'personal', createdAt: now - 2 * D, tags: [] },
      { id: 'w1', title: 'Acme report review', stream: 'work', createdAt: now - 40 * D, tags: [] },
      { id: 'w2', title: 'Acme report numbers', stream: 'work', createdAt: now - 40 * D, tags: [] },
      { id: 'old', title: 'Old idea', stream: 'personal', createdAt: now - 30 * D, tags: [] },
      { id: 'dn', title: 'Done today', stream: 'personal', createdAt: now - H, tags: [] },
    ],
    statuses: { dn: 'done' }, deleted: {}, pinned: {}, people: [{ id: 'sam', name: 'Sam Taylor' }],
    quickTemplates: [{ label: 'Follow-up email', title: 'Email re: ', stream: 'work', tags: ['email'], priority: 'p3' }, { label: 'Pay rent', title: 'Pay rent', stream: 'personal', priority: 'p2' }],
    taskTemplates: [{ id: 'tm1', name: 'Paper review', title: 'Review a paper', stream: 'work', subtasks: [{ title: 'Read', done: false }, { title: 'Write it up', done: false }] }],
    home: {},
  };
}

test('in the bundle: registered, available, sizes and defaults as the server has them', () => {
  const { json } = bundle(capState());
  const d = json('homeWidgetDefs().filter(d => d.id === "capture").map(d => ({ sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden, defaults: d.defaults, available: d.available(), settings: typeof d.settings, sample: typeof d.sample, title: d.title, order: d.order, group: d.group }))')[0];
  const srv = HOME_WIDGETS.find(w => w.id === 'capture');
  assert.equal(d.available, true);
  assert.deepEqual(d.sizes, srv.sizes); assert.equal(d.defaultSize, 'm'); assert.equal(d.defaultHidden, true);
  assert.equal(d.title, srv.title); assert.equal(d.order, 100); assert.equal(d.group, 'tasks');
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.capture.properties).sort());
  assert.deepEqual(d.defaults, { stream: null, showSort: true, sorted: [] });
  assert.equal(d.settings, 'function'); assert.equal(d.sample, 'function');
});

test('the page model: Just added (24 h, open), To sort without them, templates, and the likely stream', () => {
  const { json } = bundle(capState());
  const m = json('(() => { const x = _hcapModel({ id: "capture", size: "l" }, homePrefs("capture")); return { just: x.just.map(r => r.id), unsorted: x.unsorted.map(r => r.id), tpls: x.tpls.map(t => t.label), dflt: x.dflt }; })()');
  assert.deepEqual(m.just, ['j1', 'j2', 'j3', 'dn'].filter(id => id !== 'dn'), 'newest first, done left out');
  assert.deepEqual(m.unsorted, ['s2', 's1'], 'Just added rows are not repeated in To sort; a stream or a date means sorted');
  assert.deepEqual(m.tpls, ['Follow-up email', 'Pay rent', 'Paper review']);
  assert.deepEqual(m.dflt, ['personal']);
  const s = json('(() => { const x = _hcapModel({ id: "capture", size: "s" }, homePrefs("capture")); return { just: x.just.length, tpls: x.tpls.length, unsorted: x.unsorted.map(r => r.id) }; })()');
  assert.deepEqual(s, { just: 0, tpls: 0, unsorted: ['j1', 's2', 's1'] }, 'S: no Just added, so the new unsorted task counts in the pill');
  const g = json('(() => { const x = _hcapModel({ id: "capture", size: "l" }, homePrefs("capture")); return homeCaptureStreamChoices("Look into the Acme report", x.rows, { allowed: x.allowed, exclude: x.dflt, limit: 3, index: x.index, top: x.top, selfId: "s1" }); })()');
  assert.deepEqual(g[0], { id: 'work', guess: true }, 'similar titles live in Work');
  assert.ok(!g.some(c => c.id === 'personal' || c.id === 'old'), 'never the default or an archived stream');
});

test('Enter adds ONE task from the real parser, with the widget\'s stream; Undo and Open in the toast', () => {
  const st = capState();
  st.home = { widgetPrefs: { capture: { stream: 'inbox' } } };
  const { box, calls, run } = bundle(st);
  const inp = { value: '  Book dentist tomorrow 9am #health  ' }, boxEl = fakeEl();
  const n0 = st.custom.length, s0 = calls.saves;
  const id = run('_hcapSubmit')(inp, boxEl, run('homePrefs("capture")'));
  assert.ok(id);
  assert.equal(st.custom.length, n0 + 1);
  assert.equal(calls.saves - s0, 1, 'one save = one undo step');
  const t = st.custom.find(x => x.id === id);
  assert.equal(t.title, 'Book dentist');
  assert.equal(t.dueDate, box.tomorrowStr()); assert.equal(t.dueTime, '09:00');
  assert.deepEqual(plain(t.tags), ['health']);
  assert.equal(t.stream, 'inbox', 'no #stream typed: the widget\'s own default');
  assert.equal(inp.value, '', 'the field clears');
  const toast = calls.toasts.at(-1);
  assert.match(toast.m, /^Added: Book dentist/);
  assert.equal(toast.o.action.label, 'Undo');
  toast.o.action.run(); assert.equal(calls.undo, 1);
  // a typed #stream wins over the widget's default; words kept as text stay in the title
  run('_hcap.ignore = ["#work"]');
  const id2 = run('_hcapSubmit')({ value: 'Plan #work party' }, fakeEl(), run('homePrefs("capture")'));
  const t2 = st.custom.find(x => x.id === id2);
  assert.equal(t2.title, 'Plan #work party'); assert.equal(t2.stream, 'inbox');
  const id3 = run('_hcapSubmit')({ value: 'Plan #work offsite' }, fakeEl(), run('homePrefs("capture")'));
  assert.equal(st.custom.find(x => x.id === id3).stream, 'work');
  // nothing typed, or only keywords: nothing is made
  assert.equal(run('_hcapSubmit')({ value: '   ' }, fakeEl(), {}), null);
});

test('Alt+Enter opens the task card prefilled and saves nothing; the text stays until it is created', () => {
  const st = capState();
  const { calls, run } = bundle(st);
  const n0 = st.custom.length, s0 = calls.saves;
  run('_hcap.text = "Email Sam fri !p1"; _hcap.ignore = []');
  run('_hcapOpenEditor')({ value: 'Email Sam fri !p1' }, { stream: 'work' });
  assert.equal(st.custom.length, n0); assert.equal(calls.saves, s0, 'nothing is written before Save');
  const pre = calls.editor.at(-1);
  assert.equal(pre.title, 'Email Sam fri !p1', 'the card parses the quick text itself');
  assert.equal(pre.stream, 'work');
  pre.onCreated('u-x');
  assert.equal(run('_hcap.text'), '', 'created: the field empties');
  // words the user kept as text: the card gets the parsed result
  run('_hcap.text = "Ship fri"; _hcap.ignore = ["fri"]');
  run('_hcapOpenEditor')({ value: 'Ship fri' }, {});
  assert.equal(calls.editor.at(-1).title, 'Ship fri'); assert.equal(calls.editor.at(-1).date, null);
});

test('pasted lines are added as ONE undo step, with the widget\'s stream', () => {
  const st = capState();
  const { calls, run } = bundle(st);
  const n0 = st.custom.length, g0 = calls.groups;
  run('_hcap.lines = "x"');
  const ids = run('_hcapAddLines')(['Buy milk', 'Call Sam fri !p1', '   ', 'Read the report'], { stream: 'inbox' });
  assert.equal(ids.length, 3);
  assert.equal(st.custom.length, n0 + 3);
  assert.equal(calls.groups - g0, 1, 'one selUndoGroup around all of them');
  assert.equal(run('_hcap.lines'), null, 'the preview closes');
  assert.ok(ids.every(id => st.custom.find(t => t.id === id).stream === 'inbox'));
  assert.equal(st.custom.find(t => t.id === ids[1]).priority, 'p1');
  const toast = calls.toasts.at(-1);
  assert.equal(toast.m, 'Added 3 tasks'); assert.equal(toast.o.action.label, 'Undo');
  toast.o.action.run(); assert.equal(calls.undo, 1, 'one Undo for all three');
});

test('Today on a task already on today does nothing; Tomorrow plans it (the deadline stays)', () => {
  const st = capState();
  const { calls, run } = bundle(st);
  const s0 = calls.saves;
  run('_hcapPlan')('j3', run('todayStr()'), null);             // due today already
  assert.equal(calls.saves, s0, 'already on today: no save');
  run('_hcapPlan')('j1', run('todayStr()'), { getAttribute: () => 'true' });
  assert.equal(calls.saves, s0, 'a pressed chip: no save');
  run('_hcapPlan')('j3', run('tomorrowStr()'), null);
  const t = st.custom.find(x => x.id === 'j3');
  assert.equal(t.plannedFor, run('tomorrowStr()'));
  assert.equal(t.dueDate, localIso(new Date()), 'the due date is not moved');
  assert.equal(calls.toasts.at(-1).m, 'Planned for tomorrow'); assert.equal(calls.toasts.at(-1).o.action.label, 'Undo');
});

test('a template: the main click only opens the editor; the check makes the task at once with Undo', () => {
  const st = capState();
  const { calls, run, json } = bundle(st);
  const tpls = json('homeCaptureTemplates(TEMPLATES, state.taskTemplates, { limit: 4 })');
  const n0 = st.custom.length, s0 = calls.saves;
  run('_hcapTemplateOpen')(tpls[2], fakeEl());
  assert.equal(st.custom.length, n0); assert.equal(calls.saves, s0, 'opening writes nothing');
  const pre = calls.editor.at(-1);
  assert.equal(pre.title, 'Review a paper'); assert.equal(pre.stream, 'work'); assert.equal(typeof pre.onCreated, 'function');
  // the card created it: the subtasks join the same task
  st.custom.push({ id: 'made', title: 'Review a paper', stream: 'work', subtasks: [] });
  pre.onCreated('made');
  assert.deepEqual(st.custom.find(t => t.id === 'made').subtasks.map(s => s.title), ['Read', 'Write it up']);
  // the check: a quick template, made at once, due today (as the Templates menu does it)
  const id = run('_hcapTemplateNow')(tpls[1]);
  const t = st.custom.find(x => x.id === id);
  assert.equal(t.title, 'Pay rent'); assert.equal(t.priority, 'p2'); assert.equal(t.dueDate, run('todayStr()'));
  assert.equal(calls.toasts.at(-1).o.action.label, 'Undo');
  // a task template through the check keeps its subtasks
  const id2 = run('_hcapTemplateNow')(tpls[2]);
  assert.deepEqual(st.custom.find(x => x.id === id2).subtasks.map(s => s.title), ['Read', 'Write it up']);
  // the open-ended one ("Email re: ") is editor-only
  assert.equal(run('homeCaptureTemplateOpenEnded')(tpls[0]), true);
});

test('Looks fine saves the id in the widget settings (one undo step, Undo in the toast); again does nothing', () => {
  const st = capState();
  const { calls, run, json } = bundle(st);
  const ctx = { id: 'capture', instance: 'capture' };
  const s0 = calls.saves;
  run('_hcapLooksFine')(ctx, 's2', fakeEl());
  assert.deepEqual(json('homePrefs("capture").sorted'), ['s2']);
  assert.equal(calls.saves - s0, 1);
  assert.equal(calls.toasts.at(-1).o.action.label, 'Undo');
  run('_hcapLooksFine')(ctx, 's2', fakeEl());
  assert.equal(calls.saves - s0, 1, 'already fine: nothing saved');
  // a gone task falls off the list the next time something is marked
  st.custom = st.custom.filter(t => t.id !== 's2');
  run('_hcapLooksFine')(ctx, 's1', fakeEl());
  assert.deepEqual(json('homePrefs("capture").sorted'), ['s1']);
});

test('render: the board copy draws the field, templates and rows; the gallery preview never touches the data', () => {
  const st = capState();
  const { calls, run } = bundle(st);
  const before = JSON.stringify(st), s0 = calls.saves;
  for (const size of ['s', 'm', 'l']) {
    const el = fakeEl();
    const ok = run('_hcapRender')(el, { id: 'capture', instance: 'capture', size, preview: true, prefs: run('homePrefs("capture")') });
    assert.equal(ok, true, size);
    assert.ok(el.children.length, `${size}: preview content`);
  }
  for (const size of ['s', 'm', 'l']) {
    const el = fakeEl();
    const ok = run('_hcapRender')(el, { id: 'capture', instance: 'capture', size, firstPaint: true, prefs: run('homePrefs("capture")'), enterNew: () => 0, rerender() {} });
    assert.equal(ok, true, size);
  }
  assert.equal(calls.saves, s0, 'drawing saves nothing');
  assert.equal(JSON.stringify(st), before, 'drawing changes nothing');
});

test('the widget never schedules a task (that moves the deadline), sends mail or deletes', () => {
  const src = read('12-home-w-capture.js');
  assert.doesNotMatch(src, /task\.schedule|scheduleTask\(|sendMail|gmail\.send|binTask\(|deleteTask\(/);
  assert.match(src, /selUndoGroup\(/, 'pasted lines are one undo step');
  assert.match(src, /tcOpenCreate\(/, 'the normal editor, prefilled');
});

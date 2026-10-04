// Home's Daily note (the "notebook" widget, WIDGETS_CATALOGUE.md 3.15): the pure
// rules (src/app/12-home-notebook-logic.js, also lib/daynotes.mjs for Node), the
// daynotes store on the page (12-home-daynotes.js), the server's daynote.save op
// and daynotes.get query (server/actions/ops-daynotes.mjs, undo through the
// 'daynote:<date>' entity), the live-sync merge of two tabs, and the widget's
// registration. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as DN from '../lib/daynotes.mjs';
import { createActions } from '../server/actions/index.mjs';
import { OP_BY_NAME, OP_BY_TOOL } from '../server/actions/ops.mjs';
import { QUERY_BY_TOOL } from '../server/actions/queries.mjs';
import { snapshot, restore } from '../server/actions/entities.mjs';
import { assistantToolNames } from '../lib/assistant.mjs';
import { HOME_WIDGET_PREFS, HOME_WIDGETS } from '../lib/home-topbar.mjs';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ───────────────────────── the pure rules ───────────────────────── */
test('the logic file is pure: no DOM, no page state, no clock', () => {
  const src = read('12-home-notebook-logic.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const bad of ['document', 'window', 'state.', 'Date.now', 'new Date()', 'localStorage', 'saveData']) assert.ok(!src.includes(bad), `uses ${bad}`);
  const box = {};
  vm.createContext(box);
  vm.runInContext(read('12-home-notebook-logic.js'), box);
  assert.equal(typeof box.dnMerge3, 'function');
  assert.equal(DN.DAYNOTE_MAX, 10000);
});

test('checkbox lines: open, ticked and made by Make task', () => {
  const md = '# Plan\n- [ ] Ask Sam about the figures\n  * [ ] indented one\n- [x] Booked the room (task)\n- [X] done by hand\n- [ ]   \n- plain bullet\n1. [ ] not a checkbox';
  assert.deepEqual(DN.dnTasks(md).map(t => [t.line, t.text, t.done, t.made]), [
    [1, 'Ask Sam about the figures', false, false],
    [2, 'indented one', false, false],
    [3, 'Booked the room', true, true],
    [4, 'done by hand', true, false],
  ]);
  assert.deepEqual(DN.dnTasks(''), []);
  assert.deepEqual(DN.dnTasks('a\r\n- [ ] crlf line'), [{ line: 1, text: 'crlf line', done: false, made: false }]);
});

test('Make task ticks its own line (or the same text when the note moved), never another', () => {
  const md = 'intro\n- [ ] Email Acme\n  - [ ] Email Acme';
  assert.equal(DN.dnMarkTask(md, 1, 'Email Acme'), 'intro\n- [x] Email Acme (task)\n  - [ ] Email Acme');
  assert.equal(DN.dnMarkTask(md, 2, 'Email Acme'), 'intro\n- [ ] Email Acme\n  - [x] Email Acme (task)', 'keeps the indent');
  assert.equal(DN.dnMarkTask('new first line\n' + md, 1, 'Email Acme'), 'new first line\nintro\n- [x] Email Acme (task)\n  - [ ] Email Acme', 'found by text when the line moved');
  assert.equal(DN.dnMarkTask('- [x] Email Acme (task)', 0, 'Email Acme'), null, 'already ticked');
  assert.equal(DN.dnMarkTask('nothing here', 0, 'Email Acme'), null);
  assert.equal(DN.dnTaskTitle('Read **the** [paper](https://example.com) and `run` it _today_'), 'Read the paper and run it today');
});

test('Insert time: a new "- HH:MM " line at the caret, or on the empty line the caret is on', () => {
  assert.deepEqual(DN.dnInsertTime('', 0, 0, '09:05'), { value: '- 09:05 ', caret: 8 });
  assert.deepEqual(DN.dnInsertTime('first line', 10, 10, '10:42'), { value: 'first line\n- 10:42 ', caret: 19 });
  assert.deepEqual(DN.dnInsertTime('a\n\nb', 2, 2, '11:00'), { value: 'a\n- 11:00 \nb', caret: 10 });
  const mid = DN.dnInsertTime('one two', 3, 3, '12:00');
  assert.equal(mid.value, 'one\n- 12:00 \ntwo');
  assert.equal(mid.value.slice(0, mid.caret), 'one\n- 12:00 ');
  assert.equal(DN.dnInsertTime('keep REPLACED end', 5, 13, '13:15').value, 'keep\n- 13:15 \nend', 'a selection is replaced');
  assert.equal(DN.dnHM(0), '00:00'); assert.equal(DN.dnHM(23 * 60 + 59), '23:59'); assert.equal(DN.dnHM(-1), '23:59');
});

test('Enter keeps a list going and an empty item ends it', () => {
  const at = (v) => DN.dnEnterContinue(v, v.length, v.length);
  assert.deepEqual(at('- one'), { value: '- one\n- ', caret: 8 });
  assert.deepEqual(at('- [ ] task'), { value: '- [ ] task\n- [ ] ', caret: 17 });
  assert.deepEqual(at('- [x] done'), { value: '- [x] done\n- [ ] ', caret: 17 }, 'a ticked item continues as an open one');
  assert.deepEqual(at('  * nested'), { value: '  * nested\n  * ', caret: 15 });
  assert.equal(at('3. third').value, '3. third\n4. ');
  assert.equal(at('9) nine').value, '9) nine\n10) ');
  assert.deepEqual(at('- one\n- '), { value: '- one\n', caret: 6 }, 'an empty item ends the list');
  assert.deepEqual(at('- one\n- [ ] '), { value: '- one\n', caret: 6 });
  assert.equal(at('plain text'), null);
  assert.equal(at('-not a bullet'), null);
  assert.equal(DN.dnEnterContinue('- one two', 5, 5), null, 'the caret in the middle of the line');
  assert.equal(DN.dnEnterContinue('- one', 0, 3), null, 'a selection');
});

test('Write, the last line, plain words', () => {
  assert.equal(DN.dnTimeLine('  Tried   the outline ', '10:42'), '- 10:42 Tried the outline');
  assert.equal(DN.dnTimeLine('   ', '10:42'), '');
  assert.equal(DN.dnAppend('', '- a'), '- a');
  assert.equal(DN.dnAppend('x\n\n\n', '- a'), 'x\n- a');
  assert.equal(DN.dnAppend('x', ''), 'x');
  assert.equal(DN.dnLastLine('one\n\n- two\n---\n'), '- two');
  assert.equal(DN.dnLastLine('  \n'), '');
  assert.equal(DN.dnShow('- 10:42 Tried it'), '10:42 Tried it');
  assert.equal(DN.dnShow('- [ ] Ask Sam'), 'Ask Sam');
  assert.equal(DN.dnShow('## Plan'), 'Plan');
  assert.equal(DN.dnShow('12. step'), 'step');
});

test('the 10,000-character cap, dates, and the template', () => {
  assert.equal(DN.dnCheck('x'.repeat(10000)), null);
  assert.match(DN.dnCheck('x'.repeat(10001)), /10,000/);
  assert.equal(DN.dnIsDate('2026-02-29'), false);
  assert.equal(DN.dnIsDate('2028-02-29'), true);
  assert.equal(DN.dnIsDate('2026-1-01'), false);
  assert.equal(DN.dnNorm('a\r\nb\rc'), 'a\nb\nc');
  assert.equal(DN.dnTemplate('# {date}\r\n- [ ] ', 'Saturday 3 October'), '# Saturday 3 October\n- [ ] ');
});

test('days: the strip, On this day (clamped to the month), the time-of-day prompt', () => {
  assert.deepEqual(DN.dnStrip('2026-10-03', 3), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.equal(DN.dnStrip('2026-10-03', 30).length, 30);
  assert.equal(DN.dnAddDays('2026-03-29', 1), '2026-03-30', 'across the clock change');
  assert.deepEqual(plain(DN.dnOnThisDay('2026-10-03')), { month: '2026-09-03', year: '2025-10-03' });
  assert.deepEqual(plain(DN.dnOnThisDay('2026-03-31')), { month: '2026-02-28', year: '2025-03-31' });
  assert.deepEqual(plain(DN.dnOnThisDay('2028-03-30')), { month: '2028-02-29', year: '2027-03-30' });
  assert.deepEqual(plain(DN.dnOnThisDay('2026-01-15')), { month: '2025-12-15', year: '2025-01-15' });
  assert.deepEqual(plain(DN.dnOnThisDay('2028-02-29')), { month: '2028-01-29', year: '2027-02-28' });
  assert.equal(DN.dnPlaceholder({ hour: 8, rel: 0 }), "What's the plan?");
  assert.equal(DN.dnPlaceholder({ hour: 19, rel: 0 }), 'What did you learn today?');
  assert.match(DN.dnPlaceholder({ hour: 14, rel: 0 }), /try or decide/);
  assert.match(DN.dnPlaceholder({ hour: 9, rel: -1 }), /Nothing written/);
});

test('autosave timing: 1.5 s after typing stops, at most every 20 s while focused, at once on blur', () => {
  assert.equal(DN.dnSaveDelay({ focused: false, now: 5000, lastInput: 4999, lastSave: 4000 }), 0);
  assert.equal(DN.dnSaveDelay({ focused: true, now: 100000, lastInput: 100000, lastSave: 0 }), 1500);
  assert.equal(DN.dnSaveDelay({ focused: true, now: 100000, lastInput: 100000, lastSave: 95000 }), 15000, 'the 20 s gap wins');
  assert.equal(DN.dnSaveDelay({ focused: true, now: 130000, lastInput: 128000, lastSave: 100000 }), 0);
  assert.equal(DN.DAYNOTE_IDLE_MS, 1500); assert.equal(DN.DAYNOTE_FOCUS_GAP_MS, 20000);
});

test('merging two copies of one day: their lines come in, nothing typed here is lost', () => {
  const base = '- 09:00 start\n- [ ] Ask Sam';
  // an assistant appended while this editor typed elsewhere
  assert.equal(DN.dnMerge3(base, base + '\n- 10:00 mine', base + '\n- 09:30 theirs'), base + '\n- 09:30 theirs\n- 10:00 mine');
  // Make task in another tab ticked a line; this side edited the first line
  assert.equal(DN.dnMerge3(base, '- 09:00 start, edited', '- 09:00 start\n- [x] Ask Sam (task)'), '- 09:00 start, edited\n- [x] Ask Sam (task)');
  // the same line edited on both sides: ours stays, theirs is added at the end
  assert.equal(DN.dnMerge3('one\ntwo', 'one\nTWO (mine)', 'one\ntwo (theirs)'), 'one\nTWO (mine)\ntwo (theirs)');
  // one side unchanged: the other wins outright
  assert.equal(DN.dnMerge3(base, base, 'x'), 'x');
  assert.equal(DN.dnMerge3(base, 'y', base), 'y');
  assert.equal(DN.dnMerge3('', 'mine', 'theirs'), 'theirs\nmine');
  // a line they removed is removed here too when this side did not touch it
  assert.equal(DN.dnMerge3('a\nb\nc', 'a\nb\nc\nd', 'a\nc'), 'a\nc\nd');
  // big notes fall back to "ours + their new lines" (never a quadratic blow-up)
  const big = Array.from({ length: 900 }, (_, i) => `line ${i}`).join('\n');
  const merged = DN.dnMerge3(big, big + '\nmine', big.replace('line 5\n', '') + '\ntheirs');
  assert.ok(merged.endsWith('mine\ntheirs') && merged.includes('line 5'));
});

test('search: every word, any case, newest day first, capped', () => {
  const notes = {
    '2026-10-01': { md: 'Met Sam about the figures\nlunch' },
    '2026-10-03': { md: '- [ ] Ask SAM about FIGURES\n- figures only\n- sam only' },
    'bad-key': { md: 'sam figures' },
    '2026-09-01': { md: 'sam figures one\nsam figures two\nsam figures three\nsam figures four' },
  };
  const hits = DN.dnSearch(notes, 'figures sam');
  assert.deepEqual(hits.map(h => [h.date, h.line]), [['2026-10-03', 0], ['2026-10-01', 0], ['2026-09-01', 0], ['2026-09-01', 1], ['2026-09-01', 2]]);
  assert.equal(DN.dnSearch(notes, 'sam', { limit: 2 }).length, 2);
  assert.deepEqual(DN.dnSearch(notes, '   '), []);
  assert.deepEqual(DN.dnSearch(null, 'x'), []);
});

/* ───────────────────────── the server: op, query, undo ───────────────────────── */
function actions() {
  const dir = makeDataDir();
  return { dir, a: createActions({ dataDir: dir }), done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('daynote.save: replace, append, clear; the cap; one of md / appendMd; undo by token', async () => {
  const { a, done } = actions();
  try {
    assert.ok(OP_BY_NAME.get('daynote.save') && OP_BY_TOOL.get('save_daynote') && !OP_BY_NAME.get('daynote.save').danger);
    const day = addDays(TODAY, -1);
    const r1 = await a.apply({ ops: [{ op: 'daynote.save', date: day, md: '- 09:00 Started the draft\r\n- [ ] Ask Sam' }], source: 'mcp', client: 'test' });
    assert.ok(r1.undo);
    let g = await a.query('daynotes.get', { date: day });
    assert.equal(g.note.md, '- 09:00 Started the draft\n- [ ] Ask Sam');
    assert.equal(g.note.openTasks, 1);
    assert.match(g.note.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
    // the history shows sizes, never the note's words
    const hist = await a.query('history.list', { limit: 5 });
    const entry = JSON.stringify(hist);
    assert.ok(!entry.includes('Started the draft') && !entry.includes('Ask Sam'), 'no note text in the history');
    const r2 = await a.apply({ ops: [{ op: 'save_daynote', date: day, appendMd: '- 10:30 Decided to drop the appendix' }], source: 'assistant' });
    g = await a.query('daynotes.get', { date: day });
    assert.equal(g.note.md, '- 09:00 Started the draft\n- [ ] Ask Sam\n- 10:30 Decided to drop the appendix');
    // undo the append: exactly the day as it was
    await a.undo(r2.undo);
    assert.equal((await a.query('daynotes.get', { date: day })).note.md, '- 09:00 Started the draft\n- [ ] Ask Sam');
    // the cap: md over 10,000 is refused by the schema; an append that would pass it by the op
    await assert.rejects(a.apply({ ops: [{ op: 'daynote.save', date: day, md: 'x'.repeat(10001) }] }), (e) => e.code === 'INVALID_PARAMS');
    await assert.rejects(a.apply({ ops: [{ op: 'daynote.save', date: day, appendMd: 'y'.repeat(9990) }] }), (e) => e.code === 'BAD_VALUE' && /10,000/.test(e.message));
    await a.apply({ ops: [{ op: 'daynote.save', date: TODAY, md: 'z'.repeat(10000) }] });
    // exactly one of md / appendMd, an ISO date
    await assert.rejects(a.apply({ ops: [{ op: 'daynote.save', date: day }] }), (e) => e.code === 'INVALID_PARAMS');
    await assert.rejects(a.apply({ ops: [{ op: 'daynote.save', date: day, md: 'a', appendMd: 'b' }] }), (e) => e.code === 'INVALID_PARAMS');
    await assert.rejects(a.apply({ ops: [{ op: 'daynote.save', date: 'yesterday', md: 'a' }] }), (e) => /INVALID_PARAMS|BAD_DATE/.test(e.code));
    await assert.rejects(a.apply({ ops: [{ op: 'daynote.save', date: '2026-02-30', md: 'a' }] }), (e) => /BAD_DATE|INVALID_PARAMS/.test(e.code));
    // md '' clears the day; undo brings it back
    const r3 = await a.apply({ ops: [{ op: 'daynote.save', date: day, md: '' }] });
    assert.equal((await a.query('daynotes.get', { date: day })).note, null);
    await a.undo(r3.undo);
    assert.ok((await a.query('daynotes.get', { date: day })).note);
    // the same text again changes nothing
    const same = await a.apply({ ops: [{ op: 'daynote.save', date: day, md: '- 09:00 Started the draft\n- [ ] Ask Sam' }], dryRun: true });
    assert.equal(same.changed, 0);
    assert.match(same.preview[0].summary, /No change/);
  } finally { done(); }
});

test('the daynote:<date> entity snapshots and restores one day only', () => {
  const s = { daynotes: { '2026-10-01': { md: 'a', updatedAt: 'x' }, '2026-10-02': { md: 'b', updatedAt: 'y' } } };
  const snap = snapshot(s, 'daynote:2026-10-01');
  s.daynotes['2026-10-01'].md = 'changed'; s.daynotes['2026-10-02'].md = 'other change';
  restore(s, 'daynote:2026-10-01', snap);
  assert.deepEqual(s.daynotes, { '2026-10-01': { md: 'a', updatedAt: 'x' }, '2026-10-02': { md: 'other change', updatedAt: 'y' } });
  const none = snapshot({}, 'daynote:2026-10-05');
  const t = { daynotes: { '2026-10-05': { md: 'new' } } };
  restore(t, 'daynote:2026-10-05', none);
  assert.deepEqual(t.daynotes, {});
});

test('daynotes.get: one day, a range (92 days at most), a search, the last 7 days by default', async () => {
  const { a, done } = actions();
  try {
    const ops = [0, -1, -3, -9, -200].map(n => ({ op: 'daynote.save', date: addDays(TODAY, n), md: `- note ${n}${n === -3 ? '\n- [ ] Email Acme about the contract' : ''}` }));
    await a.apply({ ops });
    const week = await a.query('get_daynotes', {});
    assert.deepEqual(week.notes.map(n => n.date), [addDays(TODAY, -3), addDays(TODAY, -1), TODAY]);
    assert.equal(week.daysWithNotes, 5);
    const range = await a.query('daynotes.get', { from: addDays(TODAY, -10), to: addDays(TODAY, -2) });
    assert.deepEqual(range.notes.map(n => n.date), [addDays(TODAY, -9), addDays(TODAY, -3)]);
    await assert.rejects(a.query('daynotes.get', { from: addDays(TODAY, -100) }), (e) => e.code === 'BAD_VALUE');
    await assert.rejects(a.query('daynotes.get', { from: TODAY, to: addDays(TODAY, -1) }), (e) => e.code === 'BAD_VALUE');
    await assert.rejects(a.query('daynotes.get', { date: TODAY, from: TODAY }), (e) => e.code === 'INVALID_PARAMS');
    const hits = await a.query('daynotes.get', { q: 'acme CONTRACT' });
    assert.deepEqual(hits.matches.map(m => [m.date, m.line]), [[addDays(TODAY, -3), 2]]);
    const old = await a.query('daynotes.get', { q: 'note' });
    assert.ok(old.matches.some(m => m.date === addDays(TODAY, -200)), 'search covers every day by default');
    assert.equal((await a.query('daynotes.get', { date: addDays(TODAY, 5) })).note, null);
  } finally { done(); }
});

test('until the user decides (open question 4), the in-app assistant is not offered the notes', () => {
  assert.ok(QUERY_BY_TOOL.get('get_daynotes'), 'registered for MCP clients');
  assert.equal(QUERY_BY_TOOL.get('get_daynotes').assistant, false);
  const names = assistantToolNames();
  assert.ok(!names.some(n => /daynote/.test(n)), 'not in the assistant\'s tools');
  assert.ok(names.includes('mcp__dashboard__get_context'), 'the rest is unchanged');
});

/* ───────────────────────── two tabs (live sync) ───────────────────────── */
test('two tabs editing different days merge without a conflict; the same day is a reported conflict', () => {
  const box = {};
  vm.createContext(box);
  vm.runInContext(read('86-live-sync.js'), box, { filename: '86-live-sync.js' });
  const base = { custom: [], daynotes: { '2026-10-02': { md: 'yesterday', updatedAt: 'a' } }, _lastSave: 1 };
  const local = plain(base); local.daynotes['2026-10-03'] = { md: 'typed in tab A', updatedAt: 'b' };
  const remote = plain(base); remote.daynotes['2026-10-02'] = { md: 'yesterday, edited in tab B', updatedAt: 'c' };
  const r = plain(box.syncMerge3(plain(base), local, remote));
  assert.equal(r.conflicts.length, 0);
  assert.deepEqual(r.merged.daynotes, { '2026-10-02': { md: 'yesterday, edited in tab B', updatedAt: 'c' }, '2026-10-03': { md: 'typed in tab A', updatedAt: 'b' } });
  const l2 = plain(base); l2.daynotes['2026-10-02'] = { md: 'mine', updatedAt: 'd' };
  const r2 = plain(box.syncMerge3(plain(base), l2, remote));
  assert.ok(r2.conflicts.length >= 1, 'the same day changed in both tabs is asked about');
  assert.deepEqual(r2.conflicts[0].path.slice(0, 2), ['daynotes', '2026-10-02']);
});

/* ───────────────────────── the page: store + widget ───────────────────────── */
function pageBox(st) {
  const state = st || { custom: [], statuses: {}, pinned: {}, deleted: {} };
  const box = { state, saves: 0, console };
  box.saveData = () => { box.saves++; };
  vm.createContext(box);
  vm.runInContext(read('12-home-notebook-logic.js') + '\n' + read('12-home-daynotes.js'), box);
  return box;
}
test('the page store: one save per change, the cap refused, an empty note clears the day', () => {
  const b = pageBox();
  const run = (c) => vm.runInContext(c, b);
  assert.equal(run('daynoteMd("2026-10-03")'), '');
  assert.equal(run('daynoteSet("2026-10-03", "- one\\r\\n- two").changed'), true);
  assert.equal(b.saves, 1);
  assert.equal(b.state.daynotes['2026-10-03'].md, '- one\n- two');
  assert.match(b.state.daynotes['2026-10-03'].updatedAt, /T/);
  assert.equal(run('daynoteSet("2026-10-03", "- one\\n- two").changed'), false, 'the same text saves nothing');
  assert.equal(b.saves, 1);
  assert.equal(run('daynoteAppend("2026-10-03", "- 10:42 three").ok'), true);
  assert.equal(b.state.daynotes['2026-10-03'].md, '- one\n- two\n- 10:42 three');
  assert.equal(b.saves, 2);
  const tooLong = plain(run('daynoteSet("2026-10-03", "x".repeat(10001))'));
  assert.equal(tooLong.ok, false); assert.match(tooLong.error, /10,000/);
  assert.equal(b.saves, 2, 'a refused save writes nothing');
  assert.equal(run('daynoteSet("not-a-day", "x").ok'), false);
  assert.deepEqual(plain(run('daynoteDates()')), ['2026-10-03']);
  assert.equal(run('daynoteSet("2026-10-03", "   ").changed'), true);
  assert.equal(b.state.daynotes['2026-10-03'], undefined, 'cleared');
  assert.equal(run('daynoteSet("2026-10-04", "").changed'), false, 'clearing an empty day saves nothing');
  assert.equal(b.saves, 3);
});

test('the widget is registered, offered, and its settings match the server schema', () => {
  const src = read('12-home-w-notebook.js');
  assert.match(src, /OWNER: /);
  assert.match(src, /available: \(\) => true/);
  const calls = [];
  const box = { registerHomeWidget: (d) => calls.push(d), document: { addEventListener() {} }, window: { addEventListener() {} } };
  vm.createContext(box);
  vm.runInContext(src, box);
  const d = calls.find(x => x.id === 'notebook');
  assert.ok(d && d.available() === true && typeof d.settings === 'function' && typeof d.unmount === 'function');
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.notebook.properties).sort());
  const cat = HOME_WIDGETS.find(w => w.id === 'notebook');
  assert.deepEqual([...d.sizes], [...cat.sizes]);
  assert.equal(d.defaultSize, cat.defaultSize);
  assert.equal(d.defaultHidden, true);
  // the new data key starts empty on every state
  assert.match(read('05-core-state-init.js'), /s\.daynotes = \{\}/);
});

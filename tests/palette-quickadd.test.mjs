// The command palette's matching (src/app/16-command-palette.js) and natural-
// language quick add (src/app/22-quick-add.js parser, src/app/23-quick-add-dialog.js
// line splitting), loaded into a VM with small stubs: no browser needed.
// The audit's date-parser bug is the main thing guarded here: ordinary words
// and names ("Tom", "Sun", "Sat", "today" inside a sentence) must stay text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');

const box = {
  console,
  APP_CONFIG: { locale: 'en-GB', weekStart: 'Mon' },
  STREAMS: { work: { label: 'Work', color: '#4f46e5' }, home: { label: 'Home & admin', color: '#0891b2' }, old: { label: 'Old', archived: true } },
  state: { people: [{ id: 'sam', name: 'Sam Rivera', aliases: ['sammy'] }, { id: 'alex', name: 'Alex Kim' }], countdowns: [], custom: [], view: 'today' },
  recurrenceLabel: (r) => ({ daily: 'Every day', weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month', weekdays: 'Weekdays' }[r] || r),
  esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  escAttr: (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'),
  registerMoreItem: () => {},
  document: { addEventListener: () => {} },
  window: {},
};
vm.createContext(box);
// 08 (dates) + 22 (parser) + 23 (dialog helpers) + 16 (palette): declarations only at load.
vm.runInContext(src('08-utils-dates.js') + '\n;globalThis.fmtDate = fmtDate; globalThis.daysUntil = daysUntil;', box, { filename: '08-utils-dates.js' });
vm.runInContext(src('22-quick-add.js'), box, { filename: '22-quick-add.js' });
vm.runInContext(src('23-quick-add-dialog.js'), box, { filename: '23-quick-add-dialog.js' });
vm.runInContext(src('16-command-palette.js'), box, { filename: '16-command-palette.js' });

const NOW = new Date(2026, 9, 2, 10, 0, 0);   // Friday 2 Oct 2026
const parse = (t, o) => JSON.parse(JSON.stringify(box.parseQuickAdd(t, Object.assign({ now: NOW }, o || {}))));

test('ordinary words and names are not read as dates (the audit bug)', () => {
  for (const t of ['Email Tom about paper', 'Sun Widgets application', 'Sat with Sam to plan ch4', 'Today I learned post', 'Call Tom', 'Read the Sun article', 'Plan the may release']) {
    const p = parse(t);
    assert.equal(p.title, t, t);
    assert.equal(p.dueDate, null, t);
  }
  // A bare "p2" in the middle stays text; only at the end is it a priority.
  assert.equal(parse('Compare p2 and p3 drafts').title, 'Compare p2 and p3 drafts');
  assert.equal(parse('Compare p2 and p3 drafts').priority, 'p0');
});

test('dates at the end, or after due/by, are parsed', () => {
  const cases = {
    'Pay rent tomorrow': '2026-10-03',
    'Pay rent today': '2026-10-02',
    'Submit report fri': '2026-10-09',            // today is Friday: the NEXT Friday
    'Submit report on monday': '2026-10-05',
    'Submit report next mon': '2026-10-05',
    'Submit report next week': '2026-10-05',      // week starts Monday
    'Submit report in 3 days': '2026-10-05',
    'Submit report in 2 weeks': '2026-10-16',
    'Submit report 15 oct': '2026-10-15',
    'Submit report oct 15': '2026-10-15',
    'Submit report 15/10': '2026-10-15',
    'Submit report 2026-11-30': '2026-11-30',
    'Submit report end of month': '2026-10-31',
    'Submit report eom': '2026-10-31',
    'Draft due 20 oct the chapter': '2026-10-20',
    'Book flights 3 jan': '2027-01-03',          // past this year: next year
  };
  for (const [t, d] of Object.entries(cases)) assert.equal(parse(t).dueDate, d, t);
  assert.equal(parse('Submit report fri').title, 'Submit report');
  assert.equal(parse('Draft due 20 oct the chapter').title, 'Draft the chapter');
});

test('time, priority, estimate, repeat, stream, tags and people', () => {
  const p = parse('Email Sam about the Sun report fri 3pm !p1 ~30m every week #work #ops @sam @Jo_Doe');
  assert.equal(p.title, 'Email Sam about the Sun report');
  assert.equal(p.dueDate, '2026-10-09');
  assert.equal(p.dueTime, '15:00');
  assert.equal(p.priority, 'p1');
  assert.equal(p.estimate, 30);
  assert.equal(p.recurrence, 'weekly');
  assert.equal(p.stream, 'work');
  assert.deepEqual(p.tags, ['ops']);
  assert.deepEqual(p.people, ['sam']);
  assert.deepEqual(p.newPeople, ['Jo Doe']);
  const kinds = p.tokens.map(t => t.kind).sort();
  assert.deepEqual(kinds, ['date', 'estimate', 'person', 'person', 'priority', 'repeat', 'stream', 'tag', 'time']);
  assert.equal(parse('Stand-up every weekday').recurrence, 'weekdays');
  assert.equal(parse('Stand-up daily').dueDate, '2026-10-02', 'a repeating task with no date starts today');
  assert.equal(parse('Gym every monday').dueDate, '2026-10-05');
  assert.equal(parse('Deep work ~1.5h').estimate, 90);
  assert.equal(parse('Call the bank at 9:30am').dueTime, '09:30');
  assert.equal(parse('Call the bank at 9:30am').dueDate, '2026-10-02', 'a time alone means today');
  assert.equal(parse('Fix bug p2').priority, 'p2');
  assert.equal(parse('Fix bug +home').stream, 'home');
  assert.equal(parse('Fix bug #old').stream, null, 'archived streams are not matched');
  assert.deepEqual(parse('Fix bug #old').tags, ['old']);
  assert.deepEqual(parse('Ask @sammy').people, ['sam'], 'aliases resolve');
});

test('a token the user clicked off stays text; a title of only keywords is kept', () => {
  const p = parse('Plan launch tomorrow', { ignore: ['tomorrow'] });
  assert.equal(p.title, 'Plan launch tomorrow');
  assert.equal(p.dueDate, null);
  assert.equal(parse('tomorrow').title, 'tomorrow');
});

test('multi-line paste: one task per line, bullets/numbers/checkboxes dropped', () => {
  const lines = JSON.parse(JSON.stringify(box.qaSplitLines('- Call Tom tomorrow\n\n2. Book venue next week !p2\r\n* [ ] Read chapter 3\n  • Water plants  ')));
  assert.deepEqual(lines, ['Call Tom tomorrow', 'Book venue next week !p2', 'Read chapter 3', 'Water plants']);
});

test('palette matching: substring, word starts, acronyms and fuzzy, but no scattered noise', () => {
  const s = box._palScore;
  assert.ok(s('Project submission', 'proj') > s('Improject', 'proj'), 'word start beats mid-word');
  assert.ok(s('Paper submission', 'ps') > 0, 'acronym');
  assert.ok(s('Project submission', 'prsub') > 0, 'fuzzy');
  assert.equal(s('preferences options profile appearance', 'paper'), 0, 'scattered letters do not match');
  assert.equal(box._palKwScore('preferences options profile appearance', 'paper'), 0, 'keywords need a word start');
  assert.ok(box._palKwScore('theme dark light appearance', 'dark') > 0);
  assert.equal(s('anything', ''), 1);
});

test('palette highlight escapes the label and marks the match', () => {
  assert.equal(box._palHighlight('<b>Paper</b> 3', 'paper'), '&lt;b&gt;<mark>Paper</mark>&lt;/b&gt; 3');
  assert.equal(box._palHighlight('a "quote" & <img src=x onerror=alert(1)>', 'zzz'), 'a &quot;quote&quot; &amp; &lt;img src=x onerror=alert(1)&gt;');
  const h = box._palHighlight('Project submission', 'prsub');
  assert.match(h, /<mark>/);
  assert.doesNotMatch(h.replace(/<\/?mark>/g, ''), /[<>]/);
});

test('registerCommand validates and replaces by id', () => {
  assert.throws(() => box.registerCommand({ id: 'x' }));
  const cmds = () => vm.runInContext('PALETTE_COMMANDS', box);
  const n = cmds().length;
  box.registerCommand({ id: 'test-cmd', label: 'One', run: () => {} });
  box.registerCommand({ id: 'test-cmd', label: 'Two', run: () => {} });
  assert.equal(cmds().length, n + 1);
  assert.equal(cmds().find(c => c.id === 'test-cmd').label, 'Two');
  for (const id of ['new-task', 'ask-assistant', 'toggle-theme', 'add-countdown', 'update-finances', 'update-calendar']) {
    assert.ok(cmds().some(c => c.id === id), id);
  }
});

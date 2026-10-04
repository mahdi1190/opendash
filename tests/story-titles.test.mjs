// How the stories say titles and phrase the day (lib/story-data.mjs speakableTitle,
// userReason, dueDayWord; lib/story-script.mjs focusSentence and the fallback
// templates): long titles cut at a natural boundary without dangling tails, titles
// placed last, an overdue focus said as overdue, untitled events never named,
// the page's own move labels never given as reasons, and the script cache
// versioned so an old script is not served. Synthetic data (generic names).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { speakableTitle, userReason, dueDayWord, storySuggestions, storyEntities } from '../lib/story-data.mjs';
import { fallbackStoryScript, focusSentence, dueWhen, readStoryScript, writeStoryScript, storyDir, STORY_SCRIPT_VERSION } from '../lib/story-script.mjs';
import { readSummary, writeSummary, briefPaths, SUMMARY_VERSION } from '../lib/brief-store.mjs';

test('speakableTitle: realistic long titles become short, natural names', () => {
  const cases = [
    // a short tag before a colon is kept, joined with a dash (no second colon in "Due today: ...")
    ['Acme: register for the supplier portal for the 2027/28 framework contract (deadline 5 Oct)', 'Acme – register for the supplier portal'],
    ['Acme: renew the support contract before it lapses', 'Acme – renew the support contract'],
    // a real name before a colon, dash, bar or semicolon is the name
    ['Thesis package: comments, rows; freeze', 'Thesis package'],
    ['Quarterly report: finance tables, charts and the summary page', 'Quarterly report'],
    ['Weekly planning - review last week and set three outcomes', 'Weekly planning'],
    ['Track open questions for Sam — one per conversation', 'Track open questions for Sam'],
    ['Website refresh | copy, images, launch checklist', 'Website refresh'],
    ['Reply to the Acme email; ask which tag, re-ask about the meter', 'Reply to the Acme email'],
    // colons inside times and ratios are part of the name
    ['Weekly 1:1 with Priya', 'Weekly 1:1 with Priya'],
    ['Standup at 10:30: notes and actions', 'Standup at 10:30'],
    ['Jo and Priya, Tue 13 Oct 10:30 (review slot): budget outline and next steps', 'Jo and Priya, Tue 13 Oct 10:30'],
    // asides in brackets go
    ['Annual budget review (submission deadline 6 October)', 'Annual budget review'],
    ['(After the audit) Access form + archive upload', 'Access form + archive upload'],
    ['Compare phone plans in the new comparison sheet (contract ends in March)', 'Compare phone plans in the new comparison sheet'],
    // long titles stop before a clause ("and", ",", "+") or a prepositional tail
    ['Upload the signed forms to the team drive and send everyone the link to the folder', 'Upload the signed forms to the team drive'],
    ['Restart the paused budget audit (ref 12ab) and fold the findings into the tracker, the notes and the plan', 'Restart the paused budget audit'],
    ['Draft side-by-side answers to all 12 survey questions; share the draft', 'Draft side-by-side answers'],
    ['Send the funding form + budget sheet + cover letter (target Wed 11 Nov)', 'Send the funding form + budget sheet'],
    ['Write the introduction for the review of the literature on battery recycling', 'Write the introduction for the review'],
    ['Book a table at the Italian place near the station for Friday dinner with the team', 'Book a table at the Italian place'],
    ['Email Sam and Alex the venue options and the new prices; ask who books', 'Email Sam and Alex the venue options'],
    ['Send the signed contract to Acme and a copy of the invoice before the end of the month', 'Send the signed contract to Acme'],
    ['Decide: merge the search rewrite (phase B) on the feature branch so the demo points at a tag', 'Decide – merge the search rewrite'],
    // noise labels go
    ['Re: lunch plans', 'lunch plans'],
    ['Fwd: Invoice 2231 from Acme', 'Invoice 2231 from Acme'],
    ['Reminder: pay the rent', 'pay the rent'],
    // short and plain titles are untouched
    ['Prepare slides', 'Prepare slides'],
    ['Fix (x)', 'Fix (x)'],
    ['First 3 prototypes shipped', 'First 3 prototypes shipped'],
    ['Project sync with Sam', 'Project sync with Sam'],
  ];
  for (const [title, want] of cases) assert.equal(speakableTitle(title), want, title);
});

test('speakableTitle: never a dangling tail, an ellipsis, markup or more than max characters', () => {
  const titles = [
    'Acme: register for the supplier portal for the 2027/28',
    'Send the signed contract to Acme and a copy of the invoice before the end of the month',
    'Ask the shop for the gluten-free menu and show them the fixed order with the new dates from',
    'word '.repeat(40), 'A very long single title without any natural boundary at all whatsoever here',
    '**Bold** _title_ with `code` and # marks that should not be read aloud by the narrator today',
  ];
  for (const t of titles) {
    const s = speakableTitle(t);
    assert.ok(s.length > 0 && s.length <= 48, `${s.length}: ${s}`);
    assert.doesNotMatch(s, /…|\.\.\.|[*_#`]/, s);
    assert.doesNotMatch(s, /\s(a|an|the|and|or|of|for|to|with|in|on|at|by|from|near|before|after)$/i, `dangling: ${s}`);
    assert.doesNotMatch(s, /[\s,;:–—-]$/, s);
  }
  assert.equal(speakableTitle(''), '');
  assert.equal(speakableTitle(null), '');
  assert.equal(speakableTitle('Plan the launch', 10), 'Plan', 'a smaller max still cuts on a word, without a dangling "the"');
});

test('the morning focus: due today, upcoming, or overdue (never "today\'s" when its date has passed)', () => {
  const T = '2026-03-10';   // a Tuesday
  assert.equal(focusSentence({ title: 'Write the methods section', due: T }, T), 'Your main focus is due today: Write the methods section.');
  assert.equal(focusSentence({ title: 'Write the methods section', due: '2026-03-12' }, T), 'Your main focus today: Write the methods section.');
  assert.equal(focusSentence({ title: 'Write the methods section' }, T), 'Your main focus today: Write the methods section.');
  assert.equal(focusSentence({ title: 'Write the methods section', due: '2026-03-09' }, T), 'Carry on with your main focus, which was due yesterday: Write the methods section.');
  assert.equal(focusSentence({ title: 'Acme: renew the contract (lapsed)', due: '2026-03-06' }, T), 'Carry on with your main focus, which was due on Friday: Acme – renew the contract.');
  assert.equal(focusSentence({ title: 'Old thing', due: '2026-02-20' }, T), 'Carry on with your main focus, which was due on 20 Feb: Old thing.');
  assert.equal(dueWhen('2026-03-08', T), 'on Sunday');
  assert.equal(dueWhen('bad', T), 'earlier');
  // In the fallback script, with the chip on the title.
  const d = { kind: 'morning', date: T, weekday: 'Tuesday', now: '08:00', part: 'morning', dayType: { type: 'normal' }, events: [], gaps: [], people: [], deadlines: [], countdowns: [],
    focus: [{ id: 'f1', title: 'Upload the signed forms to the team drive and send everyone the link to the folder', due: '2026-03-06' }], tasks: { dueToday: 0, overdue: 1 } };
  d.suggestions = storySuggestions(d); d.entities = storyEntities(d);
  const s = fallbackStoryScript('morning', d);
  assert.equal(s.sentences[0].text, 'Carry on with your main focus, which was due on Friday: Upload the signed forms to the team drive.');
  assert.deepEqual(s.sentences[0].entities.map(e => [e.type, e.ref, e.text]), [['task', 'f1', 'Upload the signed forms to the team drive']]);
});

test('templates put titles last and never say "(no title)"; untitled events are not named or chipped', () => {
  const T = '2026-03-10';
  const d = {
    kind: 'morning', date: T, weekday: 'Tuesday', now: '08:00', part: 'morning', dayType: { type: 'deadline' }, people: [], countdowns: [],
    events: [
      { id: 'u1', title: 'Busy', untitled: true, date: T, allDay: false, start: '08:15', end: '09:00', startMin: 495, endMin: 540, type: 'event', people: [] },
      { id: 'e1', title: 'Design review: onboarding flow and the pricing page', date: T, allDay: false, start: '11:00', end: '12:00', startMin: 660, endMin: 720, type: 'meeting', people: [] },
    ],
    next: 'e1', gaps: [{ start: '13:00', end: '17:30', minutes: 270, text: '4 and a half hours' }],
    deadlines: [{ id: 'd1', title: 'Acme: register for the supplier portal for the 2027/28 framework contract', due: T, weekday: 'Tuesday' }],
    focus: [{ id: 'd1', title: 'Acme: register for the supplier portal for the 2027/28 framework contract', due: T }], tasks: { dueToday: 1, overdue: 0 },
  };
  d.suggestions = storySuggestions(d); d.entities = storyEntities(d);
  const s = fallbackStoryScript('morning', d);
  assert.deepEqual(s.sentences.map(x => x.text), [
    "Give your best hours to today's deadline: Acme – register for the supplier portal.",
    'Next up at 11:00 is Design review.',
    'From 13:00 you have 4 and a half hours free: use it for Acme – register for the supplier portal.',
  ]);
  assert.ok(!d.entities.some(e => e.ref === 'u1'), 'no chip for an untitled event');
  for (const x of s.sentences) for (const e of x.entities) assert.equal(x.text.slice(e.start, e.end), e.text);
});

test('evening and week: slipped tasks said honestly, reasons only when the user gave one, due days relative', () => {
  const T = '2026-03-10';
  const ev = { kind: 'evening', date: T, events: [], done: [], doneCount: 0, subtasksDone: 0, meetingsHeld: 0, people: [], focus: [], deadlines: [], waiting: [],
    slipped: [{ id: 's1', title: 'Tidy notes' }, { id: 's2', title: 'File receipts' }], slippedCount: 7, slippedToday: 2,
    tomorrow: { first: null, events: [], tasks: [{ id: 't1', title: 'Email Sam the venue options and the new prices for the dinner; ask who books' }] } };
  ev.suggestions = storySuggestions(ev); ev.entities = storyEntities(ev);
  const e = fallbackStoryScript('evening', ev).sentences.map(x => x.text);
  assert.ok(e.includes('Seven things are still open, two of them from today; pick what moves to tomorrow.'), e.join(' | '));
  assert.ok(e.includes('Waiting for you tomorrow: Email Sam the venue options.'), e.join(' | '));
  assert.ok(ev.suggestions.some(x => x.text === "Make it tomorrow's first job: Email Sam the venue options."));
  assert.ok(ev.suggestions.some(x => x.text === 'Move the 7 unfinished tasks to tomorrow or a better day.'));
  // All of today's: the gentler line.
  const ev2 = { ...ev, slippedCount: 2, slippedToday: 2 };
  assert.ok(fallbackStoryScript('evening', ev2).sentences.some(x => x.text === "Two things didn't fit today; they can move without guilt."));

  const wk = { kind: 'week', date: T, range: { from: '2026-03-02', to: '2026-03-08' }, completed: 4, busiest: { weekday: 'Friday', n: 4 },
    wins: [{ id: 'w1', title: 'Paper accepted: final proofs and the cover letter' }], slippedWeek: [{ id: 'x1', title: 'Gym' }],
    reasons: [{ reason: 'Moved on Home', n: 3 }], deadlines: [{ id: 'dl', title: 'Acme: send the signed contract and the invoice for the March delivery', due: T, weekday: 'Tuesday' }],
    people: [], events: [], focus: [], waiting: [] };
  wk.suggestions = storySuggestions(wk); wk.entities = storyEntities(wk);
  const w = fallbackStoryScript('week', wk).sentences.map(x => x.text);
  assert.deepEqual(w, [
    'You finished four tasks this week; the standout was Paper accepted.',
    'All of them came on Friday.',
    'One task moved at least once.',
    'The next deadline is today: Acme – send the signed contract.',
  ]);
  assert.ok(!wk.suggestions.some(x => x.kind === 'pattern'), '"Moved on Home" is not a reason');
  assert.ok(wk.suggestions.some(x => x.text === "Plan time for today's deadline: Acme – send the signed contract."));
  assert.equal(userReason('Meetings ran over'), 'Meetings ran over');
  for (const r of ['Moved on Home', 'Removed on the calendar', 'Cleared on Home', 'Snoozed', 'Weekly review', 'Weekly review: rebalance', 'no reason given', '', null]) assert.equal(userReason(r), null, String(r));
  assert.equal(dueDayWord('2026-03-11', T, 'Wednesday'), 'tomorrow');
  assert.equal(dueDayWord('2026-03-13', T, 'Friday'), 'Friday');
});

test('the caches are versioned: an old story script or AI summary is not served after an upgrade', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'story-ver-'));
  try {
    mkdirSync(join(dir, 'state'), { recursive: true });
    writeFileSync(join(dir, 'config.json'), '{}');
    const day = '2026-03-10';
    const script = { kind: 'morning', source: 'ai', sentences: [{ text: 'Hello.', entities: [] }] };
    // A file written before the version existed (or by an older version) is a miss.
    mkdirSync(storyDir(dir), { recursive: true });
    writeFileSync(join(storyDir(dir), `morning-${day}.json`), JSON.stringify(script));
    assert.equal(await readStoryScript(dir, 'morning', day), null);
    await writeStoryScript(dir, 'morning', day, script);
    const hit = await readStoryScript(dir, 'morning', day);
    assert.equal(hit.v, STORY_SCRIPT_VERSION);
    assert.equal(hit.sentences[0].text, 'Hello.');
    // The brief's AI summary (Home's hero reads it too).
    mkdirSync(briefPaths(dir).ai, { recursive: true });
    writeFileSync(join(briefPaths(dir).ai, `brief-${day}.json`), JSON.stringify({ kind: 'brief', date: day, text: 'Old words.' }));
    assert.equal(await readSummary(dir, 'brief', day), null);
    await writeSummary(dir, 'brief', day, { kind: 'brief', date: day, text: 'New words.' });
    assert.equal((await readSummary(dir, 'brief', day)).text, 'New words.');
    assert.equal(JSON.parse(readFileSync(join(briefPaths(dir).ai, `brief-${day}.json`), 'utf8')).v, SUMMARY_VERSION);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

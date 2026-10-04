// People linking + tag logic (src/app/52-people-link.js, 27-tags-logic.js),
// loaded through lib/people-tags.mjs exactly as the server and migrations use
// them. Synthetic data only (generic names).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SOURCE_FILES, pplBuildIndex, pplLinked, pplMentions, pplSuggest, pplAutoLink, pplOrphans, pplUnknownNames,
  pplNormalizePerson, pplTagPerson, pplIsWaiting, pplEventPeople, pplLooksLikeMailbox,
  tglNorm, tglUsage, tglFlags, tglStreamKeys, tglSimilar, tglRename, tglMerge, tglDelete, tglSetFlags, tglCleanState, tglRegistry,
} from '../lib/people-tags.mjs';

const P = () => [
  { id: 'sam', name: 'Sam Taylor', emails: ['sam@uni.example', 's.taylor@lab.example'], aliases: ['sammy'] },
  { id: 'alex', name: 'Alex Kim', email: 'alex@corp.example', aliases: [] },
  { id: 'jo', name: 'Jo Park', aliases: ['jp'] },                       // short names never match text
  { id: 'mark', name: 'Mark Lee', aliases: [] },                         // also an everyday word
  { id: 'quinn-lab', name: 'Quinn (lab)', aliases: [] },                   // qualified: tags only
  { id: 'me', name: 'Test User (you)', aliases: ['me', 'myself', 'test'], self: true },
  { id: 'support', name: 'Help desk', email: 'it-support@uni.example' },
];
const task = (id, title, extra = {}) => ({ id, title, tags: [], people: [], subtasks: [], detail: '', stream: 'work', ...extra });
const S = (custom, extra = {}) => ({ people: P(), custom, statuses: {}, deleted: {}, streams: [{ id: 'work', label: 'Work' }, { id: 'thesis', label: 'Thesis' }], ...extra });

test('the shared files stay pure: no page globals, no DOM', () => {
  for (const f of SOURCE_FILES) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    // (functions take the state as a parameter; page-only state keys must not appear)
    for (const bad of [/\bdocument\./, /\bwindow\./, /\bstate\.(view|selectedTaskId|theme)\b/, /\bAPP_CONFIG\b/, /\blocalStorage\b/, /\bsaveData\(/, /\bfetch\(/, /\brender\(/]) {
      assert.ok(!bad.test(src), `${f} uses ${bad}`);
    }
  }
});

test('person shape: emails[], kind, lower-case aliases, self kept', () => {
  const p = pplNormalizePerson({ id: 'x', name: ' Ana ', email: 'Ana@X.example', aliases: ['ANA', 'ana', ''], isSelf: true });
  assert.deepEqual(p.emails, ['ana@x.example']);
  assert.equal(p.email, 'ana@x.example');
  assert.deepEqual(p.aliases, ['ana']);
  assert.equal(p.kind, 'person');
  assert.equal(p.self, true);
  assert.ok(!('isSelf' in p));
  assert.equal(pplNormalizePerson({ id: 'm', name: 'Office', email: 'student-support@uni.example' }).kind, 'mailbox');
  assert.ok(pplLooksLikeMailbox({ emails: ['noreply@x.example'] }));
  assert.ok(!pplLooksLikeMailbox({ emails: ['sam@x.example'] }));
});

test('tags link people: prefixes, suffixes, never the user, never ambiguous; exclusions win', () => {
  const idx = pplBuildIndex(P());
  assert.equal(pplTagPerson('blocked-sam', idx), 'sam');
  assert.equal(pplTagPerson('sam-asked', idx), 'sam');
  assert.equal(pplTagPerson('waiting-on-alex', idx), 'alex');
  assert.equal(pplTagPerson('taylor', idx), 'sam');
  assert.equal(pplTagPerson('quinn-lab', idx), 'quinn-lab');
  assert.equal(pplTagPerson('me', idx), null);
  assert.equal(pplTagPerson('test', idx), null);
  assert.equal(pplTagPerson('email', idx), null);
  const s = S([task('t1', 'x', { tags: ['blocked-sam', 'email'], people: ['alex'], peopleExcluded: ['alex'] })]);
  assert.deepEqual(pplLinked(s, s.custom[0], idx), ['sam']);
  assert.ok(pplIsWaiting(s.custom[0]));
  assert.ok(pplIsWaiting(task('t', 'Waiting for Alex to reply')));
  assert.ok(!pplIsWaiting(task('t', 'Email Alex')));
});

test('mentions: whole words, case-aware, possessives, group/lab skipped, short and self never', () => {
  const idx = pplBuildIndex(P());
  const ids = (t) => pplMentions(t, idx).map(m => m.pid);
  assert.deepEqual(ids("Send Sam's comments to Alex"), ['sam', 'alex']);
  assert.deepEqual(ids('Ask Sam Taylor'), ['sam']);
  assert.deepEqual(ids('samples and examples'), []);
  assert.deepEqual(ids('Prepare for the Sam group meeting'), []);
  assert.deepEqual(ids('Book a room with Jo'), []);              // 2-letter name
  assert.deepEqual(ids('Mark the draft as done'), []);           // everyday word at the start
  assert.deepEqual(ids('Call Mark about it'), ['mark']);
  assert.deepEqual(ids('Remind myself and Test'), []);           // the user's own record
  assert.deepEqual(ids("Try Quinn's approach"), []);              // qualified name: tags only
  assert.deepEqual(ids('ping s.taylor@lab.example'), ['sam']);   // address local part
  assert.deepEqual(ids('ALL CAPS SAM'), ['sam']);
});

test('suggestions, auto-link on create, orphans and unknown names', () => {
  const s = S([
    task('t1', 'Email Sam the draft'),
    task('t2', 'Plan', { subtasks: [{ title: 'Check with Alex' }] }),
    task('t3', 'Read paper', { detail: 'Sam mentioned it' }),
    task('t4', 'Email Sam again', { peopleExcluded: ['sam'] }),
    task('t5', 'Done thing with Sam'),
    task('t6', 'Meet Priya Shah about the grant', { people: ['ghost'] }),
    task('t7', 'Send Priya the notes'),
  ], { statuses: { t5: 'done' } });
  const idx = pplBuildIndex(s.people);
  const sug = pplSuggest(s, { index: idx });
  const key = sug.map(x => `${x.taskId}:${x.personId}:${x.strength}`).sort();
  assert.deepEqual(key, ['t1:sam:strong', 't2:alex:strong', 't3:sam:weak']);
  assert.equal(pplSuggest(s, { index: idx, details: false }).length, 2);
  const nt = task('n', 'Call Alex and Sam');
  assert.deepEqual(pplAutoLink(s, nt, idx).sort(), ['alex', 'sam']);
  assert.deepEqual(nt.people.sort(), ['alex', 'sam']);
  assert.deepEqual([...pplOrphans(s).keys()], ['ghost']);
  const names = pplUnknownNames(s, { index: idx });
  assert.ok(names.some(n => n.name === 'Priya Shah' && n.count === 2), JSON.stringify(names));
  assert.ok(!names.some(n => /Sam|Alex|Email|Plan/.test(n.name)));
});

test('calendar events link by any address or by name in the title', () => {
  const idx = pplBuildIndex(P());
  const ev = { summary: 'Weekly with Alex', organizer: { email: 'S.Taylor@lab.example' }, attendees: [{ email: 'nobody@x.example' }] };
  assert.deepEqual(pplEventPeople(ev, idx).sort(), ['alex', 'sam']);
});

test('tag normalising, usage, flags and near-duplicates', () => {
  assert.equal(tglNorm('  #Meeting Prep '), 'meeting-prep');
  assert.equal(tglNorm('a__b//c'), 'a-b-c');
  const s = S([
    task('t1', 'a', { tags: ['meeting', 'work', 'blocked-sam', 'urgent'] }),
    task('t2', 'b', { tags: ['meetings', 'paper'] }),
    task('t3', 'c', { tags: ['papers', 'mtg'] }),
    task('t4', 'd', { tags: ['meeting'] }),
  ], { statuses: { t4: 'done' } });
  const u = tglUsage(s);
  assert.deepEqual(u.get('meeting'), { open: 1, total: 2, done: 1, bin: 0 });
  const ctx = { usage: u, streamKeys: tglStreamKeys(s), index: pplBuildIndex(s.people), state: s };
  assert.ok(tglFlags('work', ctx).some(f => f.kind === 'stream'));
  assert.ok(tglFlags('blocked-sam', ctx).some(f => f.kind === 'person' && f.personId === 'sam'));
  assert.ok(tglFlags('urgent', ctx).some(f => f.kind === 'status'));
  const sim = tglSimilar(s, u);
  assert.ok(sim.some(g => g.into === 'meeting' && g.from.includes('meetings')));
  assert.ok(sim.some(g => [g.into, ...g.from].sort().join() === 'paper,papers'));
});

test('rename, merge and delete reach tasks, the bin, templates and the registry', () => {
  const s = S([task('t1', 'a', { tags: ['mtg', 'email'] }), task('t2', 'b', { tags: ['meeting'] })], {
    bin: { tasks: [{ id: 'b1', customData: { tags: ['mtg'] } }] },
    quickTemplates: [{ label: 'x', title: 'y', tags: ['mtg'] }],
    tagRegistry: [{ id: 'mtg', pinned: true }, { id: 'email' }],
  });
  const logs = [];
  const r = tglMerge(s, ['mtg'], 'meeting', (id, e) => logs.push(id));
  assert.equal(r.tasks, 1); assert.equal(r.bin, 1); assert.equal(r.templates, 1);
  assert.deepEqual(s.custom[0].tags, ['meeting', 'email']);
  assert.deepEqual(s.bin.tasks[0].customData.tags, ['meeting']);
  assert.deepEqual(tglRegistry(s).map(e => e.id).sort(), ['email', 'meeting']);
  assert.ok(tglRegistry(s).find(e => e.id === 'meeting').pinned, 'pin carried over');
  assert.deepEqual(logs, ['t1']);
  tglRename(s, 'email', 'Mail');
  assert.deepEqual(s.custom[0].tags, ['meeting', 'mail']);
  tglDelete(s, 'mail');
  assert.deepEqual(s.custom[0].tags, ['meeting']);
  assert.ok(!tglRegistry(s).some(e => e.id === 'mail'));
  tglSetFlags(s, 'meeting', { archived: true });
  assert.ok(tglRegistry(s).find(e => e.id === 'meeting').archived);
  assert.ok(!tglRegistry(s).find(e => e.id === 'meeting').pinned, 'archived tags are not pinned');
});

test('clean-up engine: generic rules, one rule at a time, and a plan', () => {
  const TODAY = '2026-03-02';
  const mk = () => S([
    task('t1', 'Weekly sync', { tags: ['work', 'blocked-sam', 'recurring', 'urgent', 'email'], dueDate: '2026-03-05', priority: 'p3' }),
    task('t2', 'Old', { tags: ['alex', 'thesis'], stream: 'work' }),
    task('t3', 'Doing it', { tags: ['in-progress', 'mtg', 'oneoff'] }),
  ], { statuses: { t2: 'done' }, quickTemplates: [{ label: 'q', title: 't', tags: ['blocked-sam', 'email'] }] });
  // only the stream rule
  const a = mk();
  tglCleanState(a, {}, { today: TODAY, only: ['stream'] });
  assert.deepEqual(a.custom[0].tags, ['blocked-sam', 'recurring', 'urgent', 'email']);
  assert.deepEqual(a.custom[1].tags, ['alex', 'thesis'], 'a tag naming another stream stays');
  // all generic rules (done tasks too)
  const b = mk();
  const st = tglCleanState(b, {}, { today: TODAY });
  assert.deepEqual(b.custom[0].tags, ['email', 'waiting'], 'blocked-<name> keeps a waiting marker');
  assert.deepEqual(b.custom[0].people, ['sam']);
  assert.equal(b.custom[0].priority, 'p1');
  assert.equal(b.custom[0].recurrence, 'weekly');
  assert.deepEqual(b.custom[1].people, ['alex']);
  assert.equal(b.statuses.t3, 'doing');
  assert.deepEqual(b.quickTemplates[0].tags, ['email']);
  assert.equal(st.doneTasksChanged, 1);
  // a plan: merges, removal, canonical list, hand-picked tags; never re-adds an excluded person
  const c = mk();
  c.custom[0].peopleExcluded = ['sam'];
  const st2 = tglCleanState(c, { canonical: ['email', 'meeting', 'waiting', 'admin'], stripUnknown: true, merges: { meeting: ['mtg'], waiting: ['blocked-sam'] }, remove: ['oneoff'], addTags: { t2: ['admin', 'nonsense'] } }, { today: TODAY });
  assert.deepEqual(c.custom[0].tags, ['waiting', 'email']);
  assert.ok(!(c.custom[0].people || []).includes('sam'));
  assert.deepEqual(c.custom[2].tags, ['meeting']);
  assert.deepEqual(c.custom[1].tags, ['admin']);
  assert.deepEqual(tglRegistry(c).map(e => e.id), ['email', 'meeting', 'waiting', 'admin']);
  assert.ok(st2.tagsAfter <= 4);
  // idempotent
  const snap = JSON.stringify(c);
  tglCleanState(c, { canonical: ['email', 'meeting', 'waiting', 'admin'], stripUnknown: true, merges: { meeting: ['mtg'], waiting: ['blocked-sam'] }, remove: ['oneoff'], addTags: { t2: ['admin'] } }, { today: TODAY });
  assert.equal(JSON.stringify(c), snap);
});

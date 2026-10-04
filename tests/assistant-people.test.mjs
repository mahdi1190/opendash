// The assistant suggests several things at once, including people to add (user request,
// 4 Oct): people in upcoming meetings or named in tasks who are not in People
// (server/actions/queries-people.mjs peopleUnknownInEvents, list_link_suggestions),
// never a name or address the user ignored; a link to a person made in the same
// proposal needs that person (opsRefDeps); the page gets each new person's draft for the
// person editor (personDrafts). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { peopleUnknownInEvents } from '../server/actions/queries-people.mjs';
import { personDrafts } from '../lib/assistant.mjs';
import { opsRefDeps, opsSubset } from '../lib/select-logic.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const state = (extra) => Object.assign({
  people: [{ id: 'ana', name: 'Ana Lopez', email: 'ana@example.org', emails: [], aliases: [] }],
  custom: [], statuses: {},
}, extra || {});
const ev = (id, title, attendees) => ({ id, title, date: '2026-10-08', attendees: attendees || [] });

test('people in upcoming events who are not in People: attendees and names after a cue in the title', () => {
  const out = peopleUnknownInEvents(state(), [
    ev('e1', 'Project sync', [{ name: 'Sam Lee', email: 'sam@example.org' }, { name: 'Ana Lopez', email: 'ana@example.org' }, { self: true, name: 'Me', email: 'me@example.org' }]),
    ev('e2', 'Coffee with Priya Shah'),
    ev('e3', 'Process Modelling Meeting'),
    ev('e4', 'Weekly review', [{ name: 'Design Team', email: 'team@example.org' }, { name: '', email: 'x@example.org' }, { name: 'Notifications', email: 'noreply@example.org' }]),
    ev('e5', 'Call with Sam Lee'),
  ], { myEmails: ['me@example.org'] });
  const names = out.map(x => x.name);
  assert.ok(names.includes('Sam Lee'), 'an attendee nobody matches');
  assert.equal(out.find(x => x.name === 'Sam Lee').email, 'sam@example.org');
  assert.deepEqual(out.find(x => x.name === 'Sam Lee').events.map(e => e.id).sort(), ['e1', 'e5'], 'one person, every event');
  assert.ok(names.includes('Priya Shah'), 'a name after "with" in a title');
  for (const no of ['Ana Lopez', 'Me', 'Process Modelling', 'Design Team', 'Notifications']) assert.ok(!names.includes(no), 'not proposed: ' + no);
});

test('ignored names and addresses never come back', () => {
  const events = [ev('e1', 'Sync', [{ name: 'Sam Lee', email: 'sam@example.org' }]), ev('e2', 'Lunch with Priya Shah'), ev('e3', 'Intro', [{ name: 'Kai Moss', email: 'kai@example.org' }])];
  const out = peopleUnknownInEvents(state({ peopleIgnoredNames: ['sam lee', 'Priya Shah'], peopleIgnoredEmails: ['kai@example.org'] }), events);
  assert.deepEqual(out, []);
});

test('a link to a person the same proposal creates needs that person (tick together, apply together)', () => {
  const ops = [
    { op: 'person.create', name: 'Sam Lee', id: 'sam-lee' },
    { op: 'task.link_person', id: 't1', person: 'sam-lee' },
    { op: 'task.plan', id: 't2', date: '2026-10-08' },
    { op: 'task.link_person', id: 't3', person: 'Sam Lee' },
    { op: 'task.link_person', id: 't4', person: 'ana' },
  ];
  assert.deepEqual(opsRefDeps(ops), [[], [0], [], [0], []]);
  const sub = opsSubset(ops, [1]);
  assert.deepEqual(sub.index, [0, 1], 'applying the link alone brings the person along');
  assert.deepEqual(sub.added, [0]);
  assert.deepEqual(opsSubset(ops, [1], { applied: [0] }).index, [1], 'once the person exists it is not sent again');
});

test('each new person\'s draft for the person editor', () => {
  const d = personDrafts([{ op: 'task.plan', id: 't', date: '2026-10-08' }, { op: 'person.create', name: 'Sam Lee', id: 'sam-lee', email: 'sam@example.org' }, { op: 'person.create', params: { name: 'Kai Moss', emails: ['kai@example.org'] } }]);
  assert.deepEqual(d, { 1: { id: 'sam-lee', name: 'Sam Lee', email: 'sam@example.org' }, 2: { id: '', name: 'Kai Moss', email: 'kai@example.org' } });
});

test('the assistant is told to suggest several things and people, never ignored names; the page has per-change buttons', () => {
  const lib = readFileSync(join(ROOT, 'lib', 'assistant.mjs'), 'utf8');
  assert.match(lib, /suggest SEVERAL useful changes at once in ONE propose_changes call/);
  assert.match(lib, /list_link_suggestions/);
  assert.match(lib, /never propose those/);
  const ui = readFileSync(join(ROOT, 'src', 'app', '72-assistant.js'), 'utf8');
  for (const act of ['edit', 'apply', 'skip', 'unskip']) assert.match(ui, new RegExp(`data-row-act="${act}"`), act);
  assert.match(ui, /openPersonEditor\(null, \{ id: draft\.id/, 'the primary button opens the person editor prefilled');
});

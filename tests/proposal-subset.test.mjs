// Applying only the ticked changes of an assistant proposal, against the REAL
// actions layer (server/actions) and over HTTP: the subset is dry-run for a
// confirm token tied to exactly those ops, prerequisites ($ref) come along,
// refs to changes applied earlier become the ids they created, the batch stays
// all-or-nothing, and the proposal stays pending until every change is applied.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';

let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const task = (id) => disk().custom.find(t => t.id === id);
const byTitle = (title) => disk().custom.find(t => t.title === title);
const rejects = async (p, code, check) => {
  try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); if (check) check(e); return e; }
  assert.fail(`expected ${code}`);
};
// 0 create (ref w)  1 subtask on $w  2 priority of another task  3 due date of $w  4 bin (danger)
const OPS = () => [
  { op: 'task.create', title: 'Plan the autumn workshop', stream: 'work', ref: 'w' },
  { op: 'task.add_subtask', id: '$w', title: 'Book a room' },
  { op: 'task.set_priority', id: 'u-2-bbb', priority: 'p1' },
  { op: 'task.update', id: '$w', dueDate: addDays(TODAY, 3) },
  { op: 'task.bin', id: 'u-3-ccc' },
];

test('a subset is dry-run first; its confirm token is tied to exactly those ops', async () => {
  const p = await a.propose({ ops: OPS() });
  // No token: refused, nothing written.
  await rejects(a.applyProposal(p.proposalId, { only: [2] }), 'NEEDS_CONFIRM');
  assert.equal(task('u-2-bbb').priority, 'p2');
  const dry = await a.applyProposal(p.proposalId, { only: [2], dryRun: true });
  assert.equal(dry.dryRun, true);
  assert.deepEqual(dry.only, [2]);
  assert.deepEqual(dry.preview.map(x => x.index), [2], 'the preview speaks in the proposal\'s numbers');
  assert.equal(dry.needsConfirm, false);
  assert.equal(dry.changedSinceProposal, false);
  assert.equal(task('u-2-bbb').priority, 'p2', 'a dry run changes nothing');
  // The token of one subset never applies another subset (or the whole proposal's ops).
  const other = await a.applyProposal(p.proposalId, { only: [0], dryRun: true });
  await rejects(a.applyProposal(p.proposalId, { only: [2], confirm: other.confirm }), 'BAD_CONFIRM');
  await rejects(a.applyProposal(p.proposalId, { only: [2], confirm: 'nonsense' }), 'BAD_CONFIRM');
  const r = await a.applyProposal(p.proposalId, { only: [2], confirm: dry.confirm });
  assert.equal(r.changed, 1);
  assert.ok(r.undo);
  assert.deepEqual(r.appliedIdx, [2]);
  assert.equal(r.status, 'pending', 'the rest stays available');
  assert.equal(task('u-2-bbb').priority, 'p1');
  assert.equal(byTitle('Plan the autumn workshop'), undefined, 'unticked changes were not applied');
  // The same changes again: already applied (under the lock).
  const again = await a.applyProposal(p.proposalId, { only: [2, 0], dryRun: true });
  assert.deepEqual(again.only, [0], 'applied ops are left out of a later subset');
  const stored = await a.query('proposal.get', { id: p.proposalId });
  assert.deepEqual(stored.appliedIdx, [2]);
  assert.equal(stored.applies.length, 1);
});

test('prerequisites come along; later parts use the ids earlier parts created', async () => {
  const p = await a.propose({ ops: OPS() });
  // Ticking only "add a subtask to the new task" brings the create with it.
  const dry = await a.applyProposal(p.proposalId, { only: [1], dryRun: true });
  assert.deepEqual(dry.only, [0, 1]);
  assert.deepEqual(dry.added, [0]);
  const r = await a.applyProposal(p.proposalId, { only: [1], confirm: dry.confirm });
  assert.deepEqual(r.appliedIdx, [0, 1]);
  const made = byTitle('Plan the autumn workshop');
  assert.ok(made);
  assert.deepEqual(made.subtasks.map(s => s.title), ['Book a room']);
  assert.ok(r.created.some(c => c.index === 0 && c.id === made.id), 'created ids carry the proposal\'s numbers');
  // Later: the due date of $w alone. $w is now the real id (no second task).
  const dry2 = await a.applyProposal(p.proposalId, { only: [3], dryRun: true });
  assert.deepEqual(dry2.only, [3]);
  assert.equal(dry2.preview[0].changes[0].id, made.id);
  assert.equal(dry2.changedSinceProposal, false, 'the real id of a task an earlier part made is not "your tasks changed"');
  const r2 = await a.applyProposal(p.proposalId, { only: [3], confirm: dry2.confirm });
  assert.equal(r2.changed, 1);
  assert.equal(task(made.id).dueDate, addDays(TODAY, 3));
  assert.equal(disk().custom.filter(t => t.title === 'Plan the autumn workshop').length, 1);
  // The rest (priority + bin): a delete still says so in its dry run, then applies.
  const dry3 = await a.applyProposal(p.proposalId, { dryRun: true });
  assert.deepEqual(dry3.only, [2, 4]);
  assert.equal(dry3.needsConfirm, true);
  assert.ok(dry3.reasons.some(x => /deletes or merges/.test(x)));
  const r3 = await a.applyProposal(p.proposalId, { only: [2, 4], confirm: dry3.confirm });
  assert.equal(r3.status, 'applied', 'every change applied: the proposal is done');
  await rejects(a.applyProposal(p.proposalId, { only: [2] }), 'ALREADY_APPLIED');
  assert.equal((await a.query('proposal.get', { id: p.proposalId })).status, 'applied');
});

test('a subset batch is all-or-nothing and its errors use the proposal\'s numbers', async () => {
  const p = await a.propose({ ops: OPS() });
  const dry = await a.applyProposal(p.proposalId, { only: [2, 3], dryRun: true });
  assert.deepEqual(dry.only, [0, 2, 3]);
  // Someone bins the task op 2 changes: the whole subset fails, nothing is written.
  await a.apply({ ops: [{ op: 'task.bin', id: 'u-2-bbb' }], dryRun: false, confirm: (await a.apply({ ops: [{ op: 'task.bin', id: 'u-2-bbb' }], dryRun: true })).confirm });
  const e = await rejects(a.applyProposal(p.proposalId, { only: [2, 3], confirm: dry.confirm }), 'TASK_BINNED');
  assert.equal(e.opIndex, 2, 'the failing op keeps its number in the proposal');
  assert.match(e.message, /^ops\[2\]/);
  assert.equal(byTitle('Plan the autumn workshop'), undefined, 'the create in the same batch was not written');
  assert.deepEqual((await a.query('proposal.get', { id: p.proposalId })).appliedIdx || [], []);
  await rejects(a.applyProposal(p.proposalId, { only: [9], dryRun: true }), 'INVALID_PARAMS');
});

test('a changed dashboard is flagged in the subset preview; the token then refuses a stale apply', async () => {
  const p = await a.propose({ ops: OPS() });
  await a.apply({ ops: [{ op: 'task.set_priority', id: 'u-2-bbb', priority: 'p3' }] });
  const dry = await a.applyProposal(p.proposalId, { only: [2], dryRun: true });
  assert.equal(dry.changedSinceProposal, true, 'the user is shown what it would do now');
  await a.apply({ ops: [{ op: 'task.set_priority', id: 'u-2-bbb', priority: 'p2' }] });
  await rejects(a.applyProposal(p.proposalId, { only: [2], confirm: dry.confirm }), 'PREVIEW_CHANGED');
});

test('the whole proposal still applies with one click (no subset, no token)', async () => {
  const ops = [{ op: 'task.set_priority', id: 'u-2-bbb', priority: 'p1' }, { op: 'task.reschedule', id: 'u-5-eee', shiftDays: 1 }];
  const p = await a.propose({ ops });
  const r = await a.applyProposal(p.proposalId);
  assert.equal(r.changed, 2);
  assert.equal((await a.query('proposal.get', { id: p.proposalId })).status, 'applied');
});

function freePort() {
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
test('over HTTP: {proposalId, only, dryRun} then {proposalId, only, confirm}', async () => {
  const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude.mjs');
  process.env.CLAUDE_CLI_PATH = FAKE; process.env.FAKE_CLAUDE_MODE = 'ok'; process.env.DASHBOARD_AUTOLINK = 'off';
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(FAKE);
  const port = await freePort();
  const { main } = await import('../server/index.mjs');
  const srv = await main(['--port', String(port), '--no-open', '--data-dir', dir]);
  try {
    const post = (body) => new Promise((res, rej) => {
      const req = request({ host: '127.0.0.1', port, method: 'POST', path: '/api/actions', headers: { Host: `localhost:${port}`, Origin: `http://localhost:${port}`, 'Content-Type': 'application/json' } }, (r) => {
        let data = ''; r.setEncoding('utf8'); r.on('data', d => { data += d; }); r.on('end', () => res({ status: r.statusCode, j: JSON.parse(data) }));
      });
      req.on('error', rej); req.end(JSON.stringify(body));
    });
    const p = await post({ ops: OPS(), propose: true });
    assert.equal(p.status, 200);
    const bad = await post({ proposalId: p.j.proposalId, only: ['x'] });
    assert.equal(bad.status, 400);
    const dry = await post({ proposalId: p.j.proposalId, only: [2], dryRun: true });
    assert.equal(dry.status, 200);
    assert.deepEqual(dry.j.only, [2]);
    const r = await post({ proposalId: p.j.proposalId, only: [2], confirm: dry.j.confirm });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.deepEqual(r.j.appliedIdx, [2]);
  } finally {
    await srv.close();
    delete process.env.CLAUDE_CLI_PATH; delete process.env.FAKE_CLAUDE_MODE; delete process.env.DASHBOARD_AUTOLINK;
  }
});

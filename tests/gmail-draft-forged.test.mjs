// Gmail drafts fail closed against FORGED streams: a stand-in CLI that never asks
// the PreToolUse gate and claims calls went through (tests/fixtures/fake-claude-forged.mjs).
// The runner (lib/claude-runner.mjs) and runDraftPlan (lib/gmail-draft.mjs) must never
// report "saved" for anything but exactly the planned call, once; and when a write may
// have happened, never "nothing was saved". Synthetic data only; no real claude CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runClaude, setCliPath } from '../lib/claude-runner.mjs';
import { normaliseDraft, createDraftArgs, runDraftPlan, readCreated, DraftError } from '../lib/gmail-draft.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FORGED_CLI = join(ROOT, 'tests', 'fixtures', 'fake-claude-forged.mjs');
const NO_CLI = join(tmpdir(), 'gmd-forged-no-claude-here.mjs');      // never exists
const PEOPLE = [{ id: 'sam', name: 'Sam Taylor', email: 'sam@example.com' }, { id: 'me', name: 'Test User', email: 'me@example.org', self: true }];
const plan = { steps: [{ tool: 'create_draft', input: createDraftArgs(normaliseDraft({ to: ['sam@example.com'], subject: 'Hello', body: 'Hi Sam,\n\nJust checking in.' }, { people: PEOPLE, threads: [] })) }] };

async function forged(mode) {
  process.env.FAKE_FORGE = mode;
  try { return await runDraftPlan(plan, { run: runClaude }); }
  finally { delete process.env.FAKE_FORGE; }
}
const isDraftError = (codes) => (e) => e instanceof DraftError && codes.includes(e.code);

test('forged streams: calls that are not exactly the planned one are stopped (POLICY), never "saved"', async () => {
  setCliPath(FORGED_CLI);
  try {
    await assert.rejects(forged('send-ok'), isDraftError(['POLICY']), 'a send tool "succeeding"');
    await assert.rejects(forged('other-prefix'), isDraftError(['POLICY']), 'create_draft from another connector');
    await assert.rejects(forged('changed-ok'), isDraftError(['POLICY']), 'the planned tool with a bcc added');
  } finally { setCliPath(NO_CLI); }
});

test('forged streams: a second write, or a write the gate refused, is never reported as one clean draft', async () => {
  setCliPath(FORGED_CLI);
  try {
    // The first call went through: the answer is "look in Gmail", never "nothing was saved" nor a plain success.
    await assert.rejects(forged('double-ok'), isDraftError(['UNCERTAIN']));
    // The gate refused the call; a later "success" for the same call cannot be believed.
    await assert.rejects(forged('denied-then-ok'), isDraftError(['UNCERTAIN', 'WRITE_BLOCKED']));
    // A planned call, then the stream ends without a result: maybe saved.
    await assert.rejects(forged('no-result'), isDraftError(['UNCERTAIN']));
  } finally { setCliPath(NO_CLI); }
});

test('forged streams: success claimed without a call, or with a forged answer, is refused', async () => {
  setCliPath(FORGED_CLI);
  try {
    await assert.rejects(forged('orphan-result'), isDraftError(['BAD_OUTPUT']), 'a tool_result with no tool_use');
    await assert.rejects(forged('result-only'), isDraftError(['BAD_OUTPUT']), 'only a DONE result');
    // The planned call "succeeds" with a bad id and a non-Gmail link: the id is refused, the link never used.
    const r = await forged('bad-payload');
    assert.throws(() => readCreated(r.payload), isDraftError(['UNCERTAIN']));
  } finally { setCliPath(NO_CLI); }
});

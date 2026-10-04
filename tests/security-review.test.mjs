// Security review (Oct 2026): regression tests for the problems it fixed.
//   - tool-name filter: compound names are never pre-selected as reads; code/query
//     runners and destructive or sending verbs are refused outright
//   - iCal fetch: IPv4-compatible (::a.b.c.d), 6to4 and Teredo IPv6 forms count as private
//   - user-scope MCP definitions: only own keys (no Object.prototype lookups)
//   - proposals keep WHY they need a second click, and the card says it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolSafety, buildArgs, CONNECTORS, ClaudeError } from '../lib/claude-runner.mjs';
import { isPrivateAddress, fetchIcal } from '../lib/ical.mjs';
import { createSourcesService } from '../lib/sources.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir } from './fixtures/actions-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('toolSafety: a compound name is never a pre-selected read', () => {
  for (const t of ['exportAndEmail', 'browse_and_click', 'get_then_archive_x', 'list_items_plus_notify']) {
    assert.notEqual(toolSafety(t), 'read', t);
  }
});

test('toolSafety: code/query runners and destructive or sending verbs are refused', () => {
  for (const t of ['query_sql', 'run_sql', 'sql', 'shell', 'eval', 'run_script', 'exec_command', 'truncate_table', 'nuke',
    'shutdown', 'reboot', 'sms_user', 'tweet', 'dial_number', 'mail_merge', 'deactivate_account', 'void_invoice', 'kick_member', 'ban_user']) {
    assert.equal(toolSafety(t), 'write', t);
  }
});

test('toolSafety: ordinary read tools stay reads (connector reads included)', () => {
  for (const t of ['list_emails', 'search_messages', 'get_messages', 'get_call_logs', 'list_events', 'getEvents', 'check_status', 'search_threads', 'get_thread']) {
    assert.equal(toolSafety(t), 'read', t);
  }
  for (const k of ['calendar', 'gmail']) for (const t of CONNECTORS[k].read) assert.notEqual(toolSafety(t), 'write', `${k}:${t}`);
});

test('source-read refuses a newly blocked tool even if sources.json lists it', () => {
  assert.throws(() => buildArgs('source-read', { source: { server: 'my-db', tools: ['list_tables', 'query_sql'] }, mcpServer: { command: 'x' } }),
    (e) => e instanceof ClaudeError && e.code === 'BAD_REQUEST' && /query_sql/.test(e.message));
});

test('iCal: IPv4-compatible, 6to4 and Teredo IPv6 forms are private; public IPv6 is not', () => {
  for (const ip of ['::7f00:1', '::a00:1', '::1', '::', '2002:7f00:1::', '2002:c0a8:101::1', '2001:0:4136:e378::1', '2001::1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['2001:4860:4860::8888', '2606:4700::1111', '8.8.8.8']) assert.equal(isPrivateAddress(ip), false, ip);
});

test('iCal: a link to [::127.0.0.1] is refused before any request is made', async () => {
  let called = 0;
  const requestFn = () => { called++; throw new Error('must not be called'); };
  for (const u of ['https://[::127.0.0.1]/cal.ics', 'webcal://[::ffff:127.0.0.1]/cal.ics', 'https://[2002:7f00:1::]/cal.ics']) {
    await assert.rejects(fetchIcal(u, { requestFn }), (e) => e.code === 'PRIVATE_ADDRESS', u);
  }
  assert.equal(called, 0);
});

test('user-scope MCP definitions: prototype names find nothing', () => {
  const dir = makeDataDir();
  try {
    const svc = createSourcesService({ dataDir: dir, userDefs: () => ({ real: { command: 'node', args: ['x'] } }), list: async () => ({ text: '' }), run: async () => ({}) });
    assert.deepEqual(svc.serverDef('real'), { command: 'node', args: ['x'] });
    for (const n of ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__']) assert.equal(svc.serverDef(n), null, n);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Google OAuth state: once, only from this server, expires', async () => {
  const { newOauthState, takeOauthState } = await import('../lib/google.mjs');
  const s = newOauthState();
  assert.match(s, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(takeOauthState('forged'), false);
  assert.equal(takeOauthState(''), false);
  assert.equal(takeOauthState(undefined), false);
  assert.equal(takeOauthState(s), true);
  assert.equal(takeOauthState(s), false, 'a state is used once');
  const old = newOauthState(Date.now() - 11 * 60 * 1000);
  assert.equal(takeOauthState(old), false, 'expired after 10 minutes');
});

test('Google callback refuses a code without a state this server issued (login CSRF)', async () => {
  const src = readFileSync(join(ROOT, 'server', 'routes', 'google.mjs'), 'utf8');
  const i = src.indexOf("path: '/api/google/callback'");
  const body = src.slice(i, i + 1500);
  assert.ok(body.indexOf('takeOauthState(') > 0 && body.indexOf('takeOauthState(') < body.indexOf('exchangeCode('), 'state is checked before the code is exchanged');
});

const WORDS = ['Anchor', 'Bucket', 'Candle', 'Drawer', 'Engine', 'Funnel', 'Gasket', 'Hinge', 'Inkpot', 'Jigsaw', 'Kettle', 'Ladder', 'Mallet',
  'Nozzle', 'Oven', 'Pulley', 'Quiver', 'Ratchet', 'Spanner', 'Trowel', 'Umbrella', 'Valve', 'Wrench', 'Xylophone', 'Yoke', 'Zipper', 'Lantern'];

test('proposals keep the reasons they need a confirm (bulk vs delete)', async () => {
  const dir = makeDataDir();
  try {
    const a = createActions({ dataDir: dir });
    const bulk = await a.propose({ ops: WORDS.map((w, i) => ({ op: 'task.create', title: `${w} checklist item ${i}`, stream: 'work' })) });
    const pb = await a.query('proposal.get', { id: bulk.proposalId });
    assert.equal(pb.needsConfirm, true);
    assert.ok(pb.reasons.some(r => /more than 25/.test(r)), JSON.stringify(pb.reasons));
    assert.ok(!pb.reasons.some(r => /delete|merge/i.test(r)));
    const del = await a.propose({ ops: [{ op: 'task.bin', id: 'u-3-ccc' }] });
    const pd = await a.query('proposal.get', { id: del.proposalId });
    assert.ok(pd.reasons.some(r => /deletes or merges/.test(r)), JSON.stringify(pd.reasons));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the proposal card explains a bulk confirm as bulk, not as a delete', () => {
  const src = readFileSync(join(ROOT, 'src', 'app', '72-assistant.js'), 'utf8');
  const m = /function _asstConfirmText\(p\) \{[\s\S]*?\n\}/.exec(src);
  assert.ok(m, '_asstConfirmText exists');
  const fn = new Function(`${m[0]}; return _asstConfirmText;`)();
  assert.match(fn({ reasons: ['more than 25 ops (27)'] }), /changes a lot at once/);
  assert.doesNotMatch(fn({ reasons: ['more than 25 ops (27)'] }), /bin/);
  assert.match(fn({ reasons: ['deletes or merges (task.bin)'] }), /bin, deleting or merging/);
  assert.match(fn({ reasons: ['more than 25 ops (27)', 'deletes or merges (task.bin)'] }), /a lot at once.*bin/);
  assert.match(fn({}), /bin, deleting or merging/, 'older proposals without reasons keep the cautious text');
  assert.ok(!/<span>This includes moving something to the bin, deleting or merging\. You can still undo it\.<\/span>/.test(src), 'the hard-coded text is gone');
});

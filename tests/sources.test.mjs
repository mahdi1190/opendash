// Data sources (lib/sources.mjs, lib/source-adapter.mjs, the runner's source
// profiles, migration 060, merging, own-account transfers). Synthetic data only;
// the claude CLI is a fake (tests/fixtures/fake-claude-source.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  parseMcpList, validateSource, legacySources, sourceHealth, capabilitiesOf, calendarDefaultOn, dedupeEventsAcross,
  dedupeTransactions, transactionKey, dedupeMessages, createSourcesService, cleanIcalUrl, PRESETS, guessCapability,
} from '../lib/sources.mjs';
import { toolSafety, buildArgs, runClaude, setCliPath, listMcpServers, mcpToolPrefix } from '../lib/claude-runner.mjs';
import { validateBank, validateCalendar, validateEmail, fetchFromSource, groundingText, grounded, amountGrounded, SCHEMAS, buildPrompt } from '../lib/source-adapter.mjs';
import { mergeCalendarData } from '../lib/calendar-sources.mjs';
import { mergeInboxData } from '../lib/inbox-sources.mjs';
import { matchOwnTransfers } from '../lib/finance/transfers.mjs';
import { applyMigration } from '../tools/migrations/_lib.mjs';
import * as m060 from '../tools/migrations/060-sources.mjs';

const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude-source.mjs');
const flag = (args, f) => args[args.indexOf(f) + 1];
let tmp;
before(() => { tmp = mkdtempSync(join(tmpdir(), 'sources-test-')); });
after(() => { setCliPath(null); delete process.env.FAKE_SOURCE_MODE; delete process.env.FAKE_SOURCE_LOG; rmSync(tmp, { recursive: true, force: true }); });

// ─── claude mcp list ─────────────────────────────────────────────────────────
test('parseMcpList: claude.ai, HTTP, SSE, stdio; connected, needs auth, failed, pending; never a command line', () => {
  const text = [
    'Checking MCP server health…', '',
    'claude.ai Bank: https://bank.example.com/api/mcp - ✔ Connected',
    'claude.ai Calendar: https://api.example.com/cal/mcp - ! Needs authentication',
    'my-email: https://mail.example.com/mcp (HTTP) - ✔ Connected',
    'old-sse: https://sse.example.org/events (SSE) - √ Connected',
    'files: npx -y @scope/files-server C:\\Users\\me\\secret --token=abc123 - ✗ Failed to connect',
    'slow: node server.js - … Pending',
    'garbage line without status',
  ].join('\r\n');
  const s = parseMcpList(text);
  assert.deepEqual(s.map(x => [x.name, x.kind, x.status]), [
    ['claude.ai Bank', 'claude.ai', 'ok'], ['claude.ai Calendar', 'claude.ai', 'auth'], ['my-email', 'http', 'ok'],
    ['old-sse', 'sse', 'ok'], ['files', 'stdio', 'error'], ['slow', 'stdio', 'pending'],
  ]);
  assert.equal(s[0].host, 'bank.example.com');
  assert.equal(s[4].host, 'npx', 'only the program name of a stdio server');
  assert.ok(!JSON.stringify(s).includes('abc123') && !JSON.stringify(s).includes('secret'), 'no arguments or paths leak');
  assert.deepEqual(parseMcpList('No MCP servers configured. Use `claude mcp add` to add a server.'), []);
  assert.equal(guessCapability('my-outlook-calendar'), 'calendar');
  assert.equal(guessCapability('monzo'), 'bank');
});

test('listMcpServers runs `claude mcp list` (no model, no prompt) and the service caches it for a minute', async () => {
  setCliPath(FAKE);
  const r = await listMcpServers();
  assert.equal(parseMcpList(r.text).length, 4);
  let calls = 0;
  let t = 0;
  const svc = createSourcesService({ dataDir: join(tmp, 'cache-dir'), list: async () => { calls++; return { text: 'a: https://a.example/mcp (HTTP) - ✔ Connected', ms: 1 }; }, now: () => t, userDefs: () => ({ a: { type: 'http', url: 'https://a.example/mcp' } }) });
  const d1 = await svc.discover();
  await svc.discover();
  assert.equal(calls, 1);
  assert.equal(d1.servers[0].usable, true);
  t += 61000;
  await svc.discover();
  assert.equal(calls, 2);
  const failing = createSourcesService({ dataDir: join(tmp, 'cache-dir2'), list: async () => { throw Object.assign(new Error('Claude Code is not installed'), { code: 'CLI_MISSING' }); } });
  const d2 = await failing.discover();
  assert.equal(d2.servers, null);
  assert.equal(d2.code, 'CLI_MISSING');
  setCliPath(null);
});

// ─── the read-only tool filter ───────────────────────────────────────────────
test('toolSafety: reads pre-selected, writes locked, the rest left to the user', () => {
  const read = ['list_events', 'get_event', 'search_threads', 'listEvents', 'get_account_transactions', 'get_asset_valuations',
    'list_transaction_categories', 'get_payments', 'query-docs', 'resolve-library-id', 'fetch_credit_card_balance', 'get_addresses', 'list_starred'];
  const write = ['create_event', 'update_event', 'delete_event', 'respond_to_event', 'send_message', 'create_draft', 'list_drafts', 'label_thread',
    'unlabel_message', 'trash_thread', 'untrash_message', 'mark_thread_spam', 'categorise_transactions', 'categorize_items', 'add_asset_valuation',
    'set_budget', 'move_file', 'archive_note', 'upload_file', 'share_doc', 'invite_user', 'bulkUpdateRows', 'patch_record', 'post_comment',
    'put_object', 'write_file', 'edit_page', 'remove_member', 'sync_bank_accounts', 'apply_sensitive_thread_label', 'list_labels', 'mcp__x__delete_all'];
  const unknown = ['convert_currency', 'suggest_time', 'batch', 'guide'];
  for (const t of read) assert.equal(toolSafety(t), 'read', t);
  for (const t of write) assert.equal(toolSafety(t), 'write', t);
  for (const t of unknown) assert.equal(toolSafety(t), 'unknown', t);
  assert.equal(toolSafety(''), 'write', 'empty names are refused');
  assert.equal(toolSafety('list events; rm -rf'), 'write', 'odd names are refused');
});

// ─── runner profiles ─────────────────────────────────────────────────────────
test("source-read profile: only the confirmed read tools of one server; claude.ai vs other servers; writes refused", () => {
  const a = buildArgs('source-read', { source: { server: 'claude.ai Bank', tools: ['get_account_transactions', 'list_transaction_accounts'] }, denyServers: ['claude.ai Gmail', 'claude.ai Notion Pages'] });
  assert.equal(flag(a.args, '--allowedTools'), 'mcp__claude_ai_Bank__get_account_transactions,mcp__claude_ai_Bank__list_transaction_accounts');
  const denied = flag(a.args, '--disallowedTools').split(',');
  assert.ok(denied.includes('mcp__claude_ai_Gmail') && denied.includes('mcp__claude_ai_Notion_Pages'));
  assert.ok(!denied.includes('mcp__claude_ai_Bank'), 'its own server is not blanket-denied');
  assert.ok(!a.args.includes('--strict-mcp-config'), 'claude.ai connectors load with the account');
  assert.equal(flag(a.args, '--setting-sources'), '');
  assert.equal(flag(a.args, '--tools'), '');
  assert.equal(flag(a.args, '--permission-mode'), 'dontAsk');
  assert.equal(a.mcpConfig, undefined);

  const def = { type: 'http', url: 'https://cal.example/mcp', headers: { Authorization: 'Bearer SECRET-TOKEN' } };
  const b = buildArgs('source-read', { source: { server: 'my-cal', tools: ['list_items'] }, mcpServer: def, jsonSchema: SCHEMAS.calendar });
  assert.ok(b.args.includes('--strict-mcp-config'), 'any other server is loaded alone');
  assert.ok(!b.args.join(' ').includes('SECRET-TOKEN'), 'the server definition never goes in argv');
  assert.deepEqual(b.mcpConfig, { mcpServers: { 'my-cal': def } });
  assert.equal(flag(b.args, '--allowedTools'), 'mcp__my-cal__list_items');
  assert.ok(b.structured, 'the StructuredOutput answer tool is expected');

  assert.throws(() => buildArgs('source-read', { source: { server: 'claude.ai Bank', tools: ['categorise_transactions'] } }), e => e.code === 'BAD_REQUEST');
  assert.throws(() => buildArgs('source-read', { source: { server: 'claude.ai Bank', tools: [] } }), e => e.code === 'BAD_REQUEST');
  assert.throws(() => buildArgs('source-read', { source: { server: 'my-cal', tools: ['list_items'] } }), e => e.code === 'BAD_REQUEST', 'needs the definition');
  assert.throws(() => buildArgs('source-read', { source: { server: 'bad\nname', tools: ['list_items'] } }), e => e.code === 'BAD_REQUEST');
  const t = buildArgs('source-tools', { source: { server: 'claude.ai Bank' } });
  assert.ok(t.stopAtInit && !t.args.includes('--allowedTools'), 'listing tools allows none');
  assert.equal(mcpToolPrefix('claude.ai Google Calendar'), 'mcp__claude_ai_Google_Calendar__');
});

test('runClaude source-tools: stops at init, lists only that server\'s tools, private config file removed', async () => {
  setCliPath(FAKE);
  const log = join(tmp, 'src-log.jsonl');
  process.env.FAKE_SOURCE_LOG = log;
  process.env.FAKE_SOURCE_MODE = 'ok';
  const def = { type: 'http', url: 'https://cal.example/mcp', headers: { Authorization: 'Bearer SECRET-TOKEN' } };
  const r = await runClaude({ profile: 'source-tools', source: { server: 'my-cal' }, mcpServer: def, prompt: 'List tools.' });
  assert.deepEqual(r.tools, ['list_items', 'get_item', 'create_item', 'delete_item']);
  const rec = JSON.parse(readFileSync(log, 'utf8').trim().split('\n').pop());
  assert.equal(rec.cfgExists, true);
  assert.deepEqual(rec.servers, ['my-cal']);
  assert.ok(!rec.argv.join(' ').includes('SECRET-TOKEN'));
  // Removed once the stopped CLI has exited (5 s at the latest): wait for that, not a fixed pause.
  for (let i = 0; i < 160 && existsSync(rec.cfgPath); i++) await new Promise(res => setTimeout(res, 50));
  assert.equal(existsSync(rec.cfgPath), false, 'the temporary config file is gone');
  // A server still starting lists nothing (the service tries again).
  process.env.FAKE_SOURCE_MODE = 'pending';
  const p = await runClaude({ profile: 'source-tools', source: { server: 'my-cal' }, mcpServer: def, prompt: 'List tools.' });
  assert.deepEqual(p.tools, []);
  process.env.FAKE_SOURCE_MODE = 'needs-auth';
  await assert.rejects(runClaude({ profile: 'source-tools', source: { server: 'my-cal' }, mcpServer: def, prompt: 'x' }), e => e.code === 'CONNECTOR_AUTH');
  setCliPath(null);
});

test('runClaude source-read: StructuredOutput is fine, any tool outside the allowed list kills the run', async () => {
  setCliPath(FAKE);
  process.env.FAKE_SOURCE_MODE = 'ok';
  const def = { type: 'http', url: 'https://bank.example/mcp' };
  const r = await runClaude({ profile: 'source-read', source: { server: 'my-bank', tools: ['list_items'] }, mcpServer: def, prompt: 'go', jsonSchema: SCHEMAS.bank, tolerateResultError: true });
  assert.equal(r.json.transactions.length, 1);
  process.env.FAKE_SOURCE_MODE = 'write';
  await assert.rejects(runClaude({ profile: 'source-read', source: { server: 'my-bank', tools: ['list_items'] }, mcpServer: def, prompt: 'go', jsonSchema: SCHEMAS.bank }), e => e.code === 'POLICY');
  process.env.FAKE_SOURCE_MODE = 'pending';
  await assert.rejects(runClaude({ profile: 'source-read', source: { server: 'my-bank', tools: ['list_items'] }, mcpServer: def, prompt: 'go' }), e => e.code === 'TOOL_MISSING', 'a connector still starting is reported, not run without tools');
  setCliPath(null);
});

// ─── the model ───────────────────────────────────────────────────────────────
test('validateSource: presets, tools, iCal links, one server per capability', () => {
  const ok = validateSource({ id: 'bank-x-1a2b', capability: 'bank', kind: 'mcp', server: 'monzo', tools: ['mcp__monzo__list_transactions', 'get_balance'], label: ' Monzo <b> ' });
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.source.tools, ['list_transactions', 'get_balance']);
  assert.equal(ok.source.label, 'Monzo b');
  assert.match(validateSource({ id: 'bank-y-1a2b', capability: 'bank', kind: 'mcp', server: 'monzo', tools: ['transfer_money'] }).errors.join(), /never allowed/);
  assert.match(validateSource({ id: 'bank-y-1a2b', capability: 'bank', kind: 'mcp', server: 'monzo', tools: [] }).errors.join(), /at least one/);
  const p = validateSource({ id: 'bank-aureli', capability: 'bank', kind: 'mcp', server: 'claude.ai Bank', tools: ['create_debt'] });
  assert.deepEqual(p.errors, []);
  assert.equal(p.source.preset, 'aureli');
  assert.deepEqual(p.source.tools, PRESETS[0].tools, 'a preset always uses its tuned tools');
  const dup = validateSource({ id: 'bank-z-1a2b', capability: 'bank', kind: 'mcp', server: 'claude.ai Bank' }, { existing: [p.source] });
  assert.match(dup.errors.join(), /already a source/);
  assert.equal(validateSource({ id: 'cal-x-1a2b', capability: 'calendar', kind: 'ical', url: 'webcal://cal.example.org/a.ics' }).source.url, 'https://cal.example.org/a.ics');
  for (const bad of ['http://cal.example.org/a.ics', 'file:///etc/passwd', 'https://user:pw@cal.example.org/a.ics', 'https://localhost/a.ics', 'javascript:alert(1)']) {
    assert.equal(cleanIcalUrl(bad), null, bad);
  }
  assert.match(validateSource({ id: 'bank-q-1a2b', capability: 'bank', kind: 'ical', url: 'https://x.example/a.ics' }).errors.join(), /iCal sources are calendars/);
  assert.match(validateSource({ id: 'Bad Id', capability: 'nope', kind: 'mcp' }).errors.join(), /id .*capability/s);
});

test('health: claude mcp list first, a real sign-in failure sticks, probes as fallback; capabilities need one healthy enabled source', () => {
  const now = Date.parse('2026-10-02T12:00:00Z');
  const servers = Object.assign([{ name: 'claude.ai Gmail', status: 'ok' }, { name: 'claude.ai Bank', status: 'auth' }, { name: 'my-cal', status: 'error', statusText: 'Failed to connect' }], { at: now });
  const gmail = validateSource({ id: 'email-gmail', capability: 'email', kind: 'mcp', server: 'claude.ai Gmail' }).source;
  const bank = validateSource({ id: 'bank-aureli', capability: 'bank', kind: 'mcp', server: 'claude.ai Bank' }).source;
  const cal = validateSource({ id: 'calendar-mine-0001', capability: 'calendar', kind: 'mcp', server: 'my-cal', tools: ['list_items'] }).source;
  const ics = validateSource({ id: 'calendar-ics-0001', capability: 'calendar', kind: 'ical', url: 'https://x.example/a.ics' }).source;
  const csv = validateSource({ id: 'bank-csv', capability: 'bank', kind: 'csv' }).source;
  assert.equal(sourceHealth(gmail, { servers }).state, 'ok');
  // mcp list says Connected, but the tools answered "sign in again": that wins until a sync works.
  const g2 = { ...gmail, lastError: { at: new Date(now - 3600e3).toISOString(), code: 'CONNECTOR_AUTH', message: 'Gmail needs re-authorising.' } };
  assert.equal(sourceHealth(g2, { servers }).state, 'auth');
  assert.equal(sourceHealth({ ...g2, lastSync: new Date(now).toISOString() }, { servers }).state, 'ok');
  for (const code of ['TOOL_MISSING', 'BAD_OUTPUT']) {
    const failed = { ...gmail, lastError: { at: new Date(now - 1000).toISOString(), code, message: 'Read failed.' } };
    const expected = code === 'TOOL_MISSING' ? 'setup' : 'error';
    assert.equal(sourceHealth(failed, { servers }).state, expected, 'transport discovery cannot erase a failed read');
    assert.equal(sourceHealth(failed, { connections: { gmail: { status: 'connected' } } }).state, expected);
    assert.equal(sourceHealth({ ...failed, lastSync: new Date(now).toISOString() }, { servers }).state, 'ok');
  }
  assert.equal(sourceHealth(bank, { servers }).state, 'auth');
  assert.equal(sourceHealth(cal, { servers }).state, 'error');
  assert.equal(sourceHealth({ ...cal, server: 'gone' }, { servers }).state, 'setup');
  assert.equal(sourceHealth(bank, { servers: null, connections: { bank: { status: 'connected' } } }).state, 'ok', 'probe fallback');
  assert.equal(sourceHealth(gmail, { claudeOk: false }).state, 'setup');
  assert.equal(sourceHealth(ics, {}).state, 'unknown');
  assert.equal(sourceHealth({ ...ics, lastSync: new Date(now).toISOString() }, {}).state, 'ok');
  assert.equal(sourceHealth({ ...ics, lastError: { at: new Date(now).toISOString(), code: 'HTTP_404', message: 'gone' } }, {}).state, 'error');
  assert.equal(sourceHealth({ ...gmail, enabled: false }, { servers }).state, 'off');
  assert.equal(sourceHealth(csv, {}).state, 'ok');
  const list = [gmail, bank, cal, { ...ics, lastSync: new Date(now).toISOString() }, csv];
  const h = Object.fromEntries(list.map(s => [s.id, sourceHealth(s, { servers })]));
  const caps = capabilitiesOf(list, h);
  assert.equal(caps.email.available, true);
  assert.equal(caps.bank.available, false, 'CSV never counts as a working bank sync');
  assert.equal(caps.bank.csv, true);
  assert.equal(caps.calendar.available, true, 'an iCal link needs no Claude at all');
  assert.deepEqual(caps.calendar.sources, ['calendar-ics-0001']);
});

test('calendarDefaultOn: only my stuff by default', () => {
  const mine = ['me@uni.example', 'Me@Mail.Example'];
  assert.equal(calendarDefaultOn({ id: 'me@uni.example' }, mine), true);
  assert.equal(calendarDefaultOn({ id: 'me@mail.example' }, mine), true, 'case-insensitive');
  assert.equal(calendarDefaultOn({ id: 'colleague@uni.example' }, mine), false);
  assert.equal(calendarDefaultOn({ id: 'abc123@group.calendar.google.com' }, mine), true, 'group calendars on');
  assert.equal(calendarDefaultOn({ id: 'en.uk#holiday@group.v.calendar.google.com' }, mine), true);
  assert.equal(calendarDefaultOn({ id: 'someone@else.example', primary: true }, mine), true);
  assert.equal(calendarDefaultOn({ id: 'colleague@uni.example' }, []), true, 'no own addresses known: everything on');
  assert.equal(calendarDefaultOn({ id: 'feed' }, mine), true);
});

// ─── de-duplication across sources ───────────────────────────────────────────
test('dedupe: events by iCalUID or start+title across sources (not within one); transactions; emails by message id', () => {
  const ev = (id, summary, start, extra = {}) => ({ id, summary, start: { dateTime: start }, end: { dateTime: start }, ...extra });
  const out = dedupeEventsAcross([
    { sourceId: 'calendar-google', events: [ev('g1', 'Seminar', '2026-10-05T10:00:00Z', { iCalUID: 'u1', calendarId: 'me@x.org' }), ev('g2', 'Lunch', '2026-10-05T12:00:00Z'), ev('g3', 'Lunch', '2026-10-05T12:00:00Z')] },
    { sourceId: 'calendar-ics', events: [ev('i1', 'Seminar (moved room)', '2026-10-05T10:00:00+00:00', { iCalUID: 'u1', calendarId: 'calendar-ics/feed' }), ev('i2', ' lunch ', '2026-10-05T13:00:00+01:00'), ev('i3', 'Gym', '2026-10-05T18:00:00Z')] },
  ]);
  assert.deepEqual(out.map(e => e.id), ['g1', 'g2', 'g3', 'i3'], 'same UID, and same start + title, fold into the first source; within one source both stay');
  assert.deepEqual(out[0].sources, ['calendar-google', 'calendar-ics']);
  assert.deepEqual(out[0].calendars, ['me@x.org', 'calendar-ics/feed']);
  assert.equal(out[3].sourceId, 'calendar-ics');
  const t = { date: '2026-09-01', amount: -12.5, description: 'Corner  Cafe', account: 'a1' };
  assert.equal(transactionKey(t), transactionKey({ date: '2026-09-01', amount: -12.50, memo: 'CORNER CAFE', accountId: 'a1' }));
  assert.equal(dedupeTransactions([t, { ...t }, { ...t, account: 'a2' }]).length, 2);
  const msgs = dedupeMessages([
    { sourceId: 'email-gmail', messages: [{ id: 't1', date: '2026-10-01T10:00:00Z' }] },
    { sourceId: 'email-work', messages: [{ id: 'x1', messageId: 't1', date: '2026-10-01T10:00:00Z' }, { id: 'x2', messageId: 'm2', date: '2026-10-02T10:00:00Z' }] },
  ]);
  assert.deepEqual(msgs.map(m => m.id), ['x2', 't1']);
  assert.deepEqual(msgs[1].sources, ['email-gmail', 'email-work']);
});

// ─── schema validation per capability ────────────────────────────────────────
test('validateBank: strict fields, window, currency, grounding in the raw tool results, switched-off accounts', () => {
  const raw = '{"items":[{"desc":"CORNER CAFE","amt":"12.50"},{"desc":"SALARY","amt":2500},{"desc":"Shop","minor":1999}]}';
  const ctx = { from: '2026-09-01', to: '2026-10-02', maxDate: '2026-10-03', currency: 'GBP', hay: groundingText([{ payload: JSON.parse(raw) }]), raw, accountOn: (id) => id !== 'off' };
  const r = validateBank({
    accounts: [{ id: 'a1', name: 'Current' }],
    transactions: [
      { date: '2026-09-10', amount: -12.5, description: 'Corner Cafe', accountId: 'a1', currency: 'GBP' },
      { date: '2026-09-11', amount: 2500, description: 'SALARY', accountId: 'a1', currency: 'GBP', category: 'income' },
      { date: '2026-09-12', amount: -19.99, description: 'Shop', accountId: 'a1', currency: 'GBP' },
      { date: '2026-09-12', amount: -50, description: 'Invented place', accountId: 'a1', currency: 'GBP' },
      { date: '2026-08-01', amount: -1, description: 'Shop', accountId: 'a1', currency: 'GBP' },
      { date: '2026-09-13', amount: -1.234, description: 'Shop', accountId: 'a1', currency: 'GBP' },
      { date: '2026-09-13', amount: -12.5, description: 'Corner Cafe', accountId: 'a1', currency: 'EUR' },
      { date: '2026-13-01', amount: -12.5, description: 'Corner Cafe', accountId: 'a1', currency: 'GBP' },
      { date: '2026-09-14', amount: -12.5, description: 'Corner Cafe', accountId: 'off', currency: 'GBP' },
      { date: '2026-09-14', amount: -12.5, description: '=HYPERLINK("x")', accountId: 'a1', currency: 'GBP' },
    ],
  }, ctx);
  assert.deepEqual(r.rows.map(x => [x.date, x.pence, x.memo]), [['2026-09-10', -1250, 'Corner Cafe'], ['2026-09-11', 250000, 'SALARY'], ['2026-09-12', -1999, 'Shop']]);
  assert.equal(r.rejected['not in the tool results'], 2, 'invented items (and the formula one) are dropped');
  assert.equal(r.rejected['outside window'], 1);
  assert.equal(r.rejected['bad amount'], 1);
  assert.equal(r.rejected['not GBP'], 1);
  assert.equal(r.rejected['bad date'], 1);
  assert.equal(r.rejected['account switched off'], 1);
  assert.equal(r.rows[1].bc, 'income');
  assert.ok(grounded('team lunch at noon', 'Team lunch!') && !grounded('team lunch', 'board meeting'));
  assert.ok(amountGrounded('{"minorUnits":1250}', -12.5), 'minor units count');
  assert.ok(!amountGrounded('{"a":"112.50"}', 12.5), '112.50 is not 12.50');
});

test('validateCalendar and validateEmail: shapes, windows, ids, links, grounding', () => {
  const hay = groundingText([{ payload: { e: ['Seminar', 'All-day retreat'], m: ['Paper draft', 'sam@x.org'] } }]);
  const c = validateCalendar({
    calendars: [{ id: 'work', name: 'Work' }],
    events: [
      { id: 'e1', calendarId: 'work', start: '2026-10-05T10:00:00+01:00', end: '2026-10-05T11:00:00+01:00', allDay: false, title: 'Seminar', attendees: ['sam@x.org', 'not-an-email'], link: 'https://cal.example/e1' },
      { id: 'e2', calendarId: 'work', start: '2026-10-06', end: '2026-10-08', allDay: true, title: 'All-day retreat', link: 'javascript:alert(1)' },
      { id: 'e3', calendarId: 'work', start: '2026-10-05 10:00', end: '', allDay: false, title: 'Seminar' },
      { id: 'e4', calendarId: 'work', start: '2026-10-05T10:00:00Z', end: '2026-10-05T11:00:00Z', allDay: false, title: 'Made up' },
      { id: 'e5', calendarId: 'work', start: '2027-06-01T10:00:00Z', end: '2027-06-01T11:00:00Z', allDay: false, title: 'Seminar' },
    ],
  }, { from: '2026-10-01', to: '2026-10-31', sourceId: 'calendar-work-0001', hay });
  assert.equal(c.events.length, 2);
  assert.equal(c.events[0].calendarId, 'calendar-work-0001/work');
  assert.equal(c.events[0].attendees.length, 1);
  assert.equal(c.events[0].link, 'https://cal.example/e1');
  assert.equal(c.events[1].link, undefined);
  assert.deepEqual(c.events[1].start, { date: '2026-10-06' });
  assert.ok(/^m[0-9a-f]{20}$/.test(c.events[0].id));
  assert.deepEqual([c.rejected['bad start'], c.rejected['not in the tool results'], c.rejected['outside window']], [1, 1, 1]);
  const now = Date.now();
  const e = validateEmail({ accounts: [], messages: [
    { id: 'm1', from: 'Sam <sam@x.org>', subject: 'Paper draft', date: new Date(now - 3600e3).toISOString(), snippet: 'see attached', link: 'https://mail.example/m1' },
    { id: 'm2', from: 'Bob', subject: 'Prize!!', date: new Date(now - 3600e3).toISOString() },
    { id: 'bad id!', from: 'x', subject: 'Paper draft', date: new Date(now).toISOString() },
    { id: 'm3', from: 'Sam <sam@x.org>', subject: 'Paper draft', date: 'yesterday' },
  ] }, { sourceId: 'email-work-0001', label: 'Work', hay, since: new Date(now - 3 * 86400e3).toISOString() });
  assert.equal(e.messages.length, 1);
  assert.equal(e.messages[0].from.email, 'sam@x.org');
  assert.equal(e.messages[0].accountId, 'default');
  assert.equal(e.messages[0].messageId, 'm1');
  assert.deepEqual(e.accounts, [{ id: 'default', name: 'Work' }]);
  assert.equal(e.rejected['not in the tool results'], 1);
  assert.equal(e.rejected['bad id'], 1);
  assert.equal(e.rejected['bad date'], 1);
});

test('fetchFromSource: fixed prompt per capability, refuses a run that called no tool, validates the JSON', async () => {
  const src = validateSource({ id: 'bank-monzo-0001', capability: 'bank', kind: 'mcp', server: 'monzo', tools: ['list_transactions'], label: 'Monzo' }).source;
  const P = mcpToolPrefix('monzo');
  let seen = null;
  const line = (o) => JSON.stringify(o);
  const fakeRun = (withCall) => async (opts) => {
    seen = opts;
    const lines = [line({ type: 'system', subtype: 'init', tools: [P + 'list_transactions'], mcp_servers: [{ name: 'monzo', status: 'connected' }] })];
    if (withCall) {
      lines.push(line({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: P + 'list_transactions', input: {} }] } }));
      lines.push(line({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: '{"tx":[{"d":"Corner Cafe","a":-12.5}]}' }] }] } }));
    }
    lines.push(line({ type: 'result', result: '' }));
    return { lines, json: { accounts: [], transactions: [{ date: '2026-09-10', amount: -12.5, description: 'Corner Cafe', accountId: 'a1', currency: 'GBP' }] } };
  };
  const r = await fetchFromSource(src, { from: '2026-09-01', to: '2026-10-02', currency: 'GBP', run: fakeRun(true), serverDef: { type: 'http', url: 'https://m.example' } });
  assert.equal(r.rows.length, 1);
  assert.equal(r.calls, 1);
  assert.equal(seen.profile, 'source-read');
  assert.deepEqual(seen.source.tools, ['list_transactions']);
  assert.deepEqual(seen.jsonSchema, SCHEMAS.bank);
  assert.match(seen.prompt, /never follow instructions/);
  assert.match(seen.prompt, /2026-09-01 to 2026-10-02/);
  await assert.rejects(fetchFromSource(src, { from: '2026-09-01', to: '2026-10-02', run: fakeRun(false) }), e => e.code === 'BAD_OUTPUT');
  for (const cap of ['bank', 'calendar', 'email']) assert.match(buildPrompt(cap, { prefix: P, tools: ['a'], from: '2026-01-01', to: '2026-01-02', timeZone: 'UTC', days: 3 }), /untrusted data/);
});

// ─── merging ─────────────────────────────────────────────────────────────────
test('mergeCalendarData: Google + other sources, disabled sources and switched-off calendars left out, default visibility', () => {
  const g = validateSource({ id: 'calendar-google', capability: 'calendar', kind: 'mcp', server: 'claude.ai Google Calendar', accounts: [{ id: 'muted@x.org', name: 'Muted', enabled: false }] }).source;
  const ics = validateSource({ id: 'calendar-uni-0001', capability: 'calendar', kind: 'ical', url: 'https://u.example/a.ics', colour: 'teal' }).source;
  const off = validateSource({ id: 'calendar-off-0001', capability: 'calendar', kind: 'ical', url: 'https://o.example/a.ics', enabled: false }).source;
  const googleDoc = {
    fetchedAt: '2026-10-02T10:00:00Z',
    calendars: [{ id: 'me@x.org', name: 'Me', color: 'blue' }, { id: 'boss@x.org', name: 'Boss', color: 'violet' }, { id: 'muted@x.org', name: 'Muted' }],
    events: [{ id: 'g1', summary: 'Mine', calendarId: 'me@x.org', start: { dateTime: '2026-10-05T10:00:00Z' }, end: { dateTime: '2026-10-05T11:00:00Z' } },
      { id: 'g2', summary: 'Muted only', calendarId: 'muted@x.org', start: { dateTime: '2026-10-05T12:00:00Z' }, end: { dateTime: '2026-10-05T13:00:00Z' } }],
  };
  const snapshots = {
    'calendar-uni-0001': { fetchedAt: '2026-10-02T11:00:00Z', calendars: [{ id: 'feed', name: 'Timetable' }], events: [{ id: 'i1', summary: 'Lecture', calendarId: 'calendar-uni-0001/feed', start: { dateTime: '2026-10-06T09:00:00Z' }, end: { dateTime: '2026-10-06T10:00:00Z' } }] },
    'calendar-off-0001': { calendars: [{ id: 'feed', name: 'Off' }], events: [{ id: 'o1', summary: 'Hidden', calendarId: 'calendar-off-0001/feed', start: { date: '2026-10-07' }, end: { date: '2026-10-08' } }] },
  };
  const m = mergeCalendarData({ googleDoc, snapshots, sources: [g, ics, off], myEmails: ['me@x.org'] });
  assert.deepEqual(m.calendars.map(c => [c.id, c.defaultOn, c.sourceId]), [['me@x.org', true, 'calendar-google'], ['boss@x.org', false, 'calendar-google'], ['calendar-uni-0001/feed', true, 'calendar-uni-0001']]);
  assert.deepEqual(m.events.map(e => e.id).sort(), ['g1', 'i1']);
  assert.equal(m.calendars[2].color, 'teal');
  assert.equal(m.fetchedAt, '2026-10-02T11:00:00Z');
  assert.equal(m.sources.length, 2);
  const none = mergeCalendarData({ googleDoc, snapshots, sources: [], myEmails: [] });
  assert.equal(none.events.length, 2, 'no sources model yet: Google exactly as before');
});

test('mergeInboxData: one inbox from several mailboxes, with account chips', () => {
  const gm = validateSource({ id: 'email-gmail', capability: 'email', kind: 'mcp', server: 'claude.ai Gmail' }).source;
  const work = validateSource({ id: 'email-work-0001', capability: 'email', kind: 'mcp', server: 'outlook', tools: ['search_mail'], label: 'Work', colour: 'teal', accounts: [{ id: 'shared', name: 'Shared', enabled: false }] }).source;
  const gmailDoc = { fetchedAt: '2026-10-02T10:00:00Z', messages: [{ id: 't1', subject: 'A', date: '2026-10-02T09:00:00Z', from: { email: 'a@x.org', name: '' } }] };
  const snapshots = { 'email-work-0001': { fetchedAt: '2026-10-02T11:00:00Z', accounts: [{ id: 'me', name: 'me@work' }, { id: 'shared', name: 'Shared' }], messages: [
    { id: 'x1', messageId: 'm1', subject: 'B', date: '2026-10-02T10:00:00Z', accountId: 'me', from: { email: 'b@x.org', name: '' } },
    { id: 'x2', messageId: 'm2', subject: 'C', date: '2026-10-02T11:00:00Z', accountId: 'shared', from: { email: 'c@x.org', name: '' } }] } };
  const m = mergeInboxData({ gmailDoc, snapshots, sources: [gm, work] });
  assert.deepEqual(m.messages.map(x => x.id), ['x1', 't1']);
  assert.deepEqual(m.accounts.map(a => [a.sourceId, a.id, a.count]), [['email-gmail', 'default', 1], ['email-work-0001', 'me', 1]]);
  assert.equal(m.fetchedAt, '2026-10-02T11:00:00Z');
});

// ─── own-account transfers ───────────────────────────────────────────────────
test('matchOwnTransfers: out of one account, into another, same amount, within 3 days', () => {
  const row = (account, n, p, category = 'Shopping') => ({ account, n, p, category, match: 'rule', spend: -p / 100, sp: -p });
  const f = [row('csv-1', 100, -50000), row('bank-x.a1', 101, 50000, 'Income'), row('csv-1', 100, -2000), row('csv-1', 101, 2000),
    row('csv-1', 200, -3000), row('bank-x.a1', 210, 3000), row('csv-1', 300, -4000, 'Internal transfers'), row('bank-x.a1', 300, 4000)];
  const n = matchOwnTransfers(f, { exclude: new Set(['Income', 'Internal transfers']) });
  assert.equal(n, 2);
  assert.deepEqual([f[0].category, f[0].match, f[0].sp], ['Internal transfers', 'own-transfer', 0]);
  assert.equal(f[1].category, 'Income', 'an excluded category is left as it is');
  assert.equal(f[2].category, 'Shopping', 'same account: not a transfer');
  assert.equal(f[4].category, 'Shopping', 'too far apart');
  assert.equal(f[7].category, 'Internal transfers');
});

// ─── migration 060 ───────────────────────────────────────────────────────────
test('060-sources: presets in use become sources, dry run writes nothing, idempotent, own emails only added', async () => {
  const dir = join(tmp, 'm060');
  mkdirSync(join(dir, 'calendar'), { recursive: true });
  mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
  mkdirSync(join(dir, 'state'), { recursive: true });
  writeFileSync(join(dir, 'calendar', 'events.json'), JSON.stringify({ events: [] }));
  writeFileSync(join(dir, 'finance', '_system', 'transactions.csv'), 'date,amount\n');
  writeFileSync(join(dir, 'connections.json'), JSON.stringify({ bank: { status: 'needs-auth' }, gmail: { status: 'unknown' } }));
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Sam', myEmails: ['old@x.org'] }));
  writeFileSync(join(dir, 'state', 'dashboard-state.json'), JSON.stringify({ people: [{ id: 'sam', name: 'Sam', self: true, email: 'Sam@Home.example' }] }));
  const dry = await applyMigration(m060, { dataDir: dir, dryRun: true, log: () => {} });
  assert.equal(dry.changed, true);
  assert.equal(existsSync(join(dir, 'sources.json')), false, 'dry run writes nothing');
  const r1 = await applyMigration(m060, { dataDir: dir, argv: ['--my-emails', 'a@x.org, b@y.org'], log: () => {} });
  assert.equal(r1.changed, true);
  const doc = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8'));
  assert.deepEqual(doc.sources.map(s => s.id), ['bank-aureli', 'calendar-google', 'bank-csv']);
  assert.ok(!JSON.stringify(r1.notes).includes('@'), 'notes carry counts, not addresses');
  const cfg = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
  assert.deepEqual(cfg.myEmails.sort(), ['a@x.org', 'b@y.org', 'old@x.org', 'sam@home.example']);
  assert.equal(cfg.userName, 'Sam');
  const r2 = await applyMigration(m060, { dataDir: dir, argv: ['--my-emails', 'a@x.org'], log: () => {} });
  assert.equal(r2.changed, false, 'a second run changes nothing');
  assert.deepEqual(legacySources({ evidence: {} }).map(s => s.id), ['bank-csv'], 'a brand-new folder: only CSV imports');
});

test('the service: create / update / remove under the lock, accounts recorded after a sync', async () => {
  const dir = join(tmp, 'svc');
  mkdirSync(dir, { recursive: true });
  const svc = createSourcesService({ dataDir: dir, list: async () => ({ text: '' }), userDefs: () => ({}) });
  assert.deepEqual((await svc.all()).map(s => s.id), ['bank-aureli', 'calendar-google', 'email-gmail', 'bank-csv'], 'no sources.json: as before sources');
  const s = await svc.create({ capability: 'calendar', kind: 'ical', url: 'https://cal.example.org/team.ics', label: 'Team' });
  assert.match(s.id, /^calendar-team-[0-9a-f]{4}$/);
  assert.ok(existsSync(join(dir, 'sources.json')));
  await assert.rejects(svc.create({ capability: 'calendar', kind: 'ical', url: 'http://insecure.example/a.ics' }), e => e.status === 400);
  await svc.noteSync(s.id, { ok: true, accounts: [{ id: 'feed', name: 'Team timetable' }] });
  let got = await svc.get(s.id);
  assert.equal(got.accounts[0].name, 'Team timetable');
  assert.ok(got.lastSync);
  await svc.update(s.id, { accounts: [{ id: 'feed', name: 'Mine', enabled: false }], label: 'Team cal' });
  await svc.noteSync(s.id, { ok: true, accounts: [{ id: 'feed', name: 'Team timetable' }] });
  got = await svc.get(s.id);
  assert.deepEqual([got.label, got.accounts[0].name, got.accounts[0].enabled], ['Team cal', 'Mine', false], 'a renamed account keeps its name');
  await svc.noteSync(s.id, { ok: false, code: 'HTTP_404', error: 'gone' });
  assert.equal((await svc.get(s.id)).lastError.code, 'HTTP_404');
  const st = await svc.status({ discover: false });
  assert.equal(st.sources.find(x => x.id === s.id).url, undefined, 'the iCal link never goes to the page');
  assert.equal(st.sources.find(x => x.id === s.id).urlHint, 'cal.example.org/…');
  await svc.remove(s.id);
  assert.equal(await svc.get(s.id), null);
  await assert.rejects(svc.remove('nope-nope'), e => e.status === 404);
});

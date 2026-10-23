// Connect once, use everywhere, end to end (docs/dev/MULTI_DEVICE.md): two
// OpenDash servers in this process, "Home laptop" (Claude works there, it reads
// a calendar link) and "Work laptop" (a fresh copy: no Claude, no sources),
// syncing through a temp folder.
//   - the Work laptop's page is told Claude and the calendar are there (group), not "Connect ..."
//   - "Think through my day" on the Work laptop runs on the Home laptop; the review shows on both
//   - the Home laptop's calendar link shows on the Work laptop (its synced snapshot)
//   - a request outside the allow-list is refused at the door
//   - the answer and the result are still there after the Work laptop restarts
// The AI is a fake (setStoryAi); no Claude CLI is ever started.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { makeDataDir, TODAY, sampleState } from './fixtures/actions-state.mjs';
import { setStoryAi, setStoryWeatherFetch } from '../server/routes/story.mjs';
import { setLocalCapsFor } from '../lib/remote-jobs.mjs';

process.env.CLAUDE_CLI_PATH = join(tmpdir(), 'opendash-tests-no-claude-cli', 'claude');
process.env.DASHBOARD_SYNC_POLL_MS = '300';
process.env.DASHBOARD_LIVE_SYNC = 'off';

const WATCHDOG = setTimeout(() => { console.error('# watchdog: use-everywhere ran too long'); process.exit(1); }, 150000);
WATCHDOG.unref();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
function call(port, method, path, body) {
  return new Promise((res, rej) => {
    const headers = { Host: `localhost:${port}`, Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', 'X-Dashboard-Zone': 'Europe/London' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const req = request({ host: '127.0.0.1', port, method, path, headers }, (r) => {
      const chunks = []; r.on('data', d => chunks.push(d));
      r.on('end', () => { const t = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(t); } catch {} res({ status: r.statusCode, json, text: t }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}
async function until(fn, ms, what) {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error(`timed out waiting for ${what}`); await sleep(150); }
}

const cloud = join(tmpdir(), `opendash-use-everywhere-${process.pid}-${Date.now()}`);
let dirA, dirB, A, B, portA, portB, aiCalls = 0;
const { main } = await import('../server/index.mjs');
async function boot(dir, port) { return main(['--port', String(port), '--no-open', '--data-dir', dir]); }

before(async () => {
  mkdirSync(cloud, { recursive: true });
  dirA = makeDataDir(sampleState());
  dirB = makeDataDir(sampleState());
  setStoryWeatherFetch(async () => { throw new TypeError('offline'); });
  setStoryAi({
    aiStatus: async () => ({ available: true, code: null }),
    askJson: async (o) => { aiCalls++; return { json: { summary: 'Reply to Sam first: the corrections are due tomorrow.', ideas: [{ taskId: 'u-1-aaa', title: 'Reply to Sam', reason: 'Due tomorrow and Sam is waiting.', nextStep: 'Open the draft reply.', start: '', end: '' }] }, model: o.model, ms: 5 }; },
  });
  setLocalCapsFor(dirA, async () => ({ claude: true, sources: [{ id: 'calendar-work-ab12', capability: 'calendar', kind: 'ical', label: 'Work calendar', colour: 'teal' }] }));
  setLocalCapsFor(dirB, async () => ({ claude: false }));
  // The Home laptop's calendar link (fetched there; the snapshot is what it saved).
  mkdirSync(join(dirA, 'calendar', 'sources'), { recursive: true });
  writeFileSync(join(dirA, 'calendar', 'sources', 'calendar-work-ab12.json'), JSON.stringify({ version: 1, sourceId: 'calendar-work-ab12', fetchedAt: new Date().toISOString(), calendars: [{ id: 'feed', name: 'Work' }],
    events: [{ id: 'icw1', summary: 'Team stand-up', calendarId: 'calendar-work-ab12/feed', start: { dateTime: `${TODAY}T09:30:00Z` }, end: { dateTime: `${TODAY}T09:45:00Z` } }] }));
  portA = await freePort(); A = await boot(dirA, portA);
  portB = await freePort(); B = await boot(dirB, portB);
  for (const [p, name] of [[portA, 'Home laptop'], [portB, 'Work laptop']]) {
    const r = await call(p, 'POST', '/api/sync/settings', { enabled: true, apply: true, folder: cloud, deviceName: name });
    assert.equal(r.status, 200, r.text);
  }
  // quicker for the test: the claim settles in 0.4 s
  A.ctx.remoteJobs.timing.settleMs = 400;
  B.ctx.remoteJobs.timing.settleMs = 400;
});
after(async () => {
  await A?.close(); await B?.close();
  setStoryAi(null); setStoryWeatherFetch(null); setLocalCapsFor(dirA, null); setLocalCapsFor(dirB, null);
  for (const d of [dirA, dirB, cloud]) rmSync(d, { recursive: true, force: true });
});

const nudge = async () => { await A.ctx.sync.syncNow(); await B.ctx.sync.syncNow(); };

test('the Work laptop (no Claude, no calendar) is told both are on the Home laptop, not "Connect ..."', async () => {
  const conn = await until(async () => { await nudge(); const r = await call(portB, 'GET', '/api/connections'); return r.json && r.json.group && r.json.group.has.claude.length && r.json.group.has.calendar.length ? r.json : null; }, 20000, "the Home laptop's capabilities on the Work laptop");
  assert.deepEqual(conn.group.has.claude.map(d => d.name), ['Home laptop']);
  assert.deepEqual(conn.group.has.calendar.map(d => d.name), ['Home laptop']);
  assert.equal(conn.group.apply, true);
  assert.ok(!JSON.stringify(conn.group).includes('https:'), 'no calendar link in what the page sees');
  const st = await call(portB, 'GET', '/api/ai/status');
  assert.equal(st.json.available, true);
  assert.equal(st.json.local, false);
  assert.equal(st.json.via, 'Home laptop');
  assert.equal(st.json.message, 'Uses Claude on Home laptop.');
  const h = await call(portB, 'GET', '/api/health?quick=1');
  assert.equal(h.json.ai.available, true);
  assert.equal(h.json.ai.via, 'Home laptop');
});

let reqId = null;
test('"Think through my day" on the Work laptop runs on the Home laptop; the review shows on both', async () => {
  const r = await call(portB, 'POST', '/api/story/advice', {});
  assert.equal(r.status, 202, r.text);
  assert.equal(r.json.remote.kind, 'dayplan');
  assert.equal(r.json.remote.runsOn, 'Home laptop');
  assert.match(r.json.remote.message, /^Asking Home laptop/);
  reqId = r.json.remote.id;
  const done = await until(async () => { await nudge(); const x = await call(portB, 'GET', `/api/requests/${reqId}`); return x.json && ['done', 'error'].includes(x.json.status) ? x.json : null; }, 30000, 'the answer');
  assert.equal(done.status, 'done', JSON.stringify(done));
  assert.equal(done.result.status, 200);
  assert.match(done.result.body.summary, /Reply to Sam first/);
  assert.equal(done.result.body.ideas[0].taskId, 'u-1-aaa');
  assert.equal(aiCalls, 1, 'asked Claude once, on the Home laptop');
  // the same review on both computers (brief/day-advice.json is synced)
  const onB = await until(async () => { await nudge(); const x = await call(portB, 'GET', '/api/story/advice'); return x.json && x.json.advice ? x.json.advice : null; }, 20000, 'the review on the Work laptop');
  const onA = (await call(portA, 'GET', '/api/story/advice')).json.advice;
  assert.equal(onA.summary, onB.summary);
  assert.equal(onB.by, 'Home laptop', 'it says where it was made');
  // an automatic review is never asked of another device (it stays with the main computer)
  const auto = await call(portB, 'POST', '/api/story/advice', { automatic: true });
  assert.notEqual(auto.status, 202);
});

test("the Home laptop's calendar link shows on the Work laptop (its snapshot), named after it", async () => {
  const cal = await until(async () => { await nudge(); const x = await call(portB, 'GET', '/api/calendar'); return x.json && (x.json.events || []).some(e => e.id === 'icw1') ? x.json : null; }, 20000, 'the calendar on the Work laptop');
  const src = cal.sources.find(s => s.id === 'calendar-work-ab12');
  assert.equal(src.via, 'Home laptop');
  assert.ok(cal.calendars.some(c => c.id === 'calendar-work-ab12/feed'));
  // "Update calendar" on the Work laptop asks the Home laptop (it has nothing of its own to read)
  const up = await call(portB, 'POST', '/api/calendar/update', { force: true });
  assert.equal(up.status, 202, up.text);
  assert.match(up.json.message, /Asking Home laptop to update the calendar/);
});

test('a request outside the allow-list is refused at the door, never queued', async () => {
  const before = (await call(portB, 'GET', '/api/requests')).json.requests.length;
  const r = await call(portB, 'POST', '/api/ai', { prompt: 'hello', model: 'some-other-model' });
  assert.equal(r.status, 400);
  assert.equal((await call(portB, 'GET', '/api/requests')).json.requests.length, before);
  assert.equal((await call(portB, 'GET', '/api/requests/not-an-id')).status, 404);
});

test('after the Work laptop restarts, the answer and the review are still there', async () => {
  await B.close();
  portB = await freePort();
  B = await boot(dirB, portB);
  const x = await call(portB, 'GET', `/api/requests/${reqId}`);
  assert.equal(x.json.status, 'done');
  assert.match(x.json.result.body.summary, /Reply to Sam first/);
  const adv = await call(portB, 'GET', '/api/story/advice');
  assert.match(adv.json.advice.summary, /Reply to Sam first/);
  assert.ok(existsSync(join(dirB, 'brief', 'day-advice.json')));
  assert.equal(JSON.parse(readFileSync(join(dirB, 'requests.json'), 'utf8')).requests.find(q => q.id === reqId).status, 'done');
});

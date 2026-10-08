// Security review for the public release (3 Oct 2026): regression tests for what it fixed.
//   - every /api/ route refuses another site, reads included (the Google sign-in callback
//     is the one GET that takes a cross-site navigation); every route refuses a foreign Host.
//     The routes are enumerated from the router, so a new route is covered automatically.
//   - gmail-read denies every Gmail tool but its two reads, by name (send, reply, forward,
//     delete included); connector and source jobs deny every discovered claude.ai connector
//   - delete_resource needs a dry run and confirm token, like every other delete or merge
//   - Files & links: macOS bundles (Foo.app) are revealed, never opened; more program types
//   - (second pass) every claude job ignores user/project settings (text and json too), and
//     starts in a folder only this user can write to; Open checks the real path as well as
//     the saved one (a Windows short name or a link named like a document); a new data
//     folder is private (0700) on macOS/Linux
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, statSync, chmodSync, symlinkSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { buildArgs, CONNECTORS, setDiscoveredClaudeAiServers, toolSafety, privateWorkDir } from '../lib/claude-runner.mjs';
import { mayOpen, mayOpenPath, rsrcIsExecutable, setSpawn } from '../lib/resources.mjs';
import { createApp } from '../server/router.mjs';
import { createActions } from '../server/actions/index.mjs';
import { OPS } from '../server/actions/ops.mjs';
import { makeDataDir } from './fixtures/actions-state.mjs';

const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude.mjs');
const flagValue = (args, f) => args[args.indexOf(f) + 1];
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function raw(port, method, path, headers = {}, body) {
  return new Promise((res, rej) => {
    // agent:false: a fresh connection each time (a refused request's unread body must not
    // spill into the next request on a kept-alive socket).
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers }, setHost: false, agent: false }, (r) => {
      let data = ''; r.setEncoding('utf8');
      r.on('data', (d) => { data += d; });
      r.on('end', () => res({ status: r.statusCode, text: data }));
    });
    req.on('error', rej);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

// ─── The whole server: every route, forged headers ─────────────────────────
let dir, port, srv;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sec-release-'));
  mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
  process.env.CLAUDE_CLI_PATH = FAKE;
  process.env.FAKE_CLAUDE_MODE = 'ok';
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(FAKE);
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => {
  await srv?.close();
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(null);
  delete process.env.CLAUDE_CLI_PATH; delete process.env.FAKE_CLAUDE_MODE;
  rmSync(dir, { recursive: true, force: true });
});

/** [method, concrete path, route] for every registered route. */
function everyRoute() {
  const out = [];
  for (const r of srv.app.routes) {
    const path = r.path || (r.prefix.endsWith('/') ? r.prefix + 'zz' : r.prefix + '/zz');
    for (const m of r.methods === '*' ? ['GET', 'POST', 'DELETE'] : r.methods) out.push([m, path, r]);
  }
  return out;
}
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// A malformed JSON body: a handler that ran by mistake answers 400 and does nothing.
// (Content-Length set: Node's client does not frame a DELETE body otherwise.)
const bodyFor = (m) => (MUTATING.has(m) ? { headers: { 'Content-Type': 'application/json', 'Content-Length': '1' }, body: '{' } : { headers: {}, body: undefined });

test('every route: a foreign Host is refused (421) before anything runs', async () => {
  const list = everyRoute();
  assert.ok(list.length > 80, `routes enumerated: ${list.length}`);
  for (const [m, p] of list) {
    const b = bodyFor(m);
    for (const host of [`evil.example:${port}`, `localhost.evil.example:${port}`, `localhost:${port + 1}`]) {
      assert.equal((await raw(port, m, p, { ...b.headers, Host: host }, b.body)).status, 421, `${m} ${p} Host ${host}`);
    }
  }
});

test('every /api/ route refuses another site, reads included; only the sign-in callback takes a navigation', async () => {
  const forged = {
    'cross-site': { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
    'same-site (another localhost port)': { Origin: `http://localhost:${port + 1}`, 'Sec-Fetch-Site': 'same-site' },
    'null origin': { Origin: 'null' },
    'Sec-Fetch-Site only': { 'Sec-Fetch-Site': 'cross-site' },
    'Origin only': { Origin: 'http://evil.example' },
  };
  const exempt = [];
  for (const [m, p, r] of everyRoute()) {
    if (!p.startsWith('/api/')) continue;
    const b = bodyFor(m);
    for (const [why, h] of Object.entries(forged)) {
      const s = (await raw(port, m, p, { ...b.headers, ...h }, b.body)).status;
      if (r.crossSite === true && m === 'GET') { assert.notEqual(s, 403, `${m} ${p} must still take the OAuth redirect`); exempt.push(p); continue; }
      assert.equal(s, 403, `${m} ${p} ${why}`);
    }
  }
  // Finance connections (docs/dev/FINANCE_CONNECTIONS.md 3.6): Monzo's and Enable Banking's sign-in returns.
  const ex = [...new Set(exempt)].sort();
  assert.deepEqual(ex.filter(p => !p.startsWith('/api/fin-connect/')), ['/api/google/callback', '/api/microsoft/callback'], 'only state-protected OAuth callbacks accept cross-site GETs');
  const fin = ex.filter(p => p.startsWith('/api/fin-connect/'));
  assert.ok(fin.includes('/api/fin-connect/monzo/callback'));
  assert.ok(fin.every(p => /^\/api\/fin-connect\/(monzo|eb)\/callback$/.test(p)), `only the bank sign-in returns: ${fin.join(', ')}`);
  assert.equal((await raw(port, 'GET', '/api/fin-connect/monzo/callback?state=forged&code=forged', forged['Origin only'])).status, 400, 'Monzo rejects an unsolicited OAuth callback');
  assert.equal((await raw(port, 'GET', '/api/microsoft/callback?state=forged&code=forged', forged['Origin only'])).status, 400, 'Microsoft rejects an unsolicited OAuth callback');
});

test('reads that start work are refused cross-site, and still answer the page, the address bar and local programs', async () => {
  const xs = { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' };
  for (const p of ['/api/state', '/api/sources?refresh=1', '/api/connections?refresh=stale', '/api/brief/geocode?q=London',
    '/api/google/inbox', '/api/google/person?email=a%40example.com', '/api/inbox/person?email=a%40example.com', '/api/health', '/api/settings/diagnostics']) {
    assert.equal((await raw(port, 'GET', p, xs)).status, 403, p);
    assert.equal((await raw(port, 'GET', p, { 'Sec-Fetch-Site': 'same-site' })).status, 403, p);
  }
  for (const h of [{ 'Sec-Fetch-Site': 'same-origin', Origin: `http://localhost:${port}` }, { 'Sec-Fetch-Site': 'none' }, {}]) {
    assert.equal((await raw(port, 'GET', '/api/health?quick=1', h)).status, 200, JSON.stringify(h));
    assert.equal((await raw(port, 'GET', '/api/config', h)).status, 200, JSON.stringify(h));
  }
  // The app page itself and the worker script are not /api/: a link to them still works.
  assert.equal((await raw(port, 'GET', '/', xs)).status, 200);
  assert.equal((await raw(port, 'GET', '/sw.js', { 'Sec-Fetch-Site': 'same-origin' })).status, 200);
  // The callback still checks Google's state (a forged code is refused, nothing is exchanged).
  const cb = await raw(port, 'GET', '/api/google/callback?code=forged&state=forged', xs);
  assert.equal(cb.status, 400);
  assert.match(cb.text, /not started from OpenDash/);
});

test('router: crossSite never opens a write, and a route without it stays closed', async () => {
  const p = await freePort();
  const app = createApp({ port: p, log: () => {} });
  let ran = 0;
  app.route({ path: '/api/t', method: ['GET', 'POST'], crossSite: true, handler: () => { ran++; return { ok: true }; } });
  app.route({ path: '/api/u', method: 'GET', handler: () => { ran++; return { ok: true }; } });
  const server = createServer(async (req, res) => { if (!(await app.handle(req, res))) { res.writeHead(404); res.end(); } });
  await new Promise((r) => server.listen(p, '127.0.0.1', r));
  try {
    const xs = { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' };
    assert.equal((await raw(p, 'GET', '/api/t', xs)).status, 200);
    assert.equal((await raw(p, 'POST', '/api/t', { ...xs, 'Content-Type': 'application/json' }, '{}')).status, 403);
    assert.equal((await raw(p, 'GET', '/api/u', xs)).status, 403);
    assert.equal(ran, 1);
  } finally { await new Promise((r) => server.close(r)); }
});

// ─── Claude runner: deny lists ─────────────────────────────────────────────
test('gmail-read: only the two reads are allowed; send, reply, forward and every delete are denied by name', () => {
  const { args } = buildArgs('gmail-read', {});
  const allowed = flagValue(args, '--allowedTools').split(',');
  const denied = flagValue(args, '--disallowedTools').split(',');
  const G = CONNECTORS.gmail.prefix;
  assert.deepEqual(allowed.sort(), [G + 'get_thread', G + 'search_threads']);
  for (const t of ['send_message', 'reply', 'forward', 'delete_draft', 'delete_label', 'update_draft', 'update_label', 'create_draft', 'trash_message', 'trash_thread']) {
    assert.ok(denied.includes(G + t), `gmail-read must deny ${t}`);
  }
  // The inbox job narrows the profile; the deny list stays whole.
  const narrowed = buildArgs('gmail-read', { allowedTools: [G + 'search_threads'] });
  assert.ok(flagValue(narrowed.args, '--disallowedTools').split(',').includes(G + 'send_message'));
});

test('every connector profile denies each of its tools that is not a read it allows', () => {
  for (const [name, c] of Object.entries(CONNECTORS)) {
    const { args } = buildArgs(`${name}-read`, {});
    const allowed = flagValue(args, '--allowedTools').split(',');
    const denied = new Set(flagValue(args, '--disallowedTools').split(','));
    for (const t of [...c.read, ...c.known]) {
      if (allowed.includes(c.prefix + t)) continue;
      assert.ok(denied.has(c.prefix + t), `${name}-read must deny ${t}`);
    }
    // Nothing that sends, replies, forwards or deletes is ever allowed.
    for (const t of allowed) assert.doesNotMatch(t.slice(c.prefix.length), /send|reply|forward|delete|trash|draft/, `${name}: ${t}`);
    for (const t of c.known) if (/^(send|reply|forward|delete|trash)/.test(t)) assert.equal(toolSafety(t), 'write', t);
  }
});

test('connector and source jobs deny every discovered claude.ai connector but their own', () => {
  try {
    setDiscoveredClaudeAiServers(['claude.ai Slack', 'claude.ai Gmail', 'claude.ai Google Drive', 'my-local', 'claude.ai bad"name', 42]);
    const gm = flagValue(buildArgs('gmail-read', {}).args, '--disallowedTools').split(',');
    assert.ok(gm.includes('mcp__claude_ai_Slack'));
    assert.ok(gm.includes('mcp__claude_ai_Google_Drive'));
    assert.ok(!gm.includes('mcp__claude_ai_Gmail'), 'never its own server');
    assert.ok(!gm.some(s => /my-local|bad/.test(s)), 'only valid claude.ai names');
    for (const p of ['calendar-read', 'bank-read', 'probe:calendar']) {
      assert.ok(flagValue(buildArgs(p, {}).args, '--disallowedTools').split(',').includes('mcp__claude_ai_Slack'), p);
    }
    const drive = buildArgs('source-read', { source: { server: 'claude.ai Google Drive', tools: ['search_files'] } });
    const dd = flagValue(drive.args, '--disallowedTools').split(',');
    assert.ok(dd.includes('mcp__claude_ai_Slack') && dd.includes('mcp__claude_ai_Gmail'));
    assert.ok(!dd.includes('mcp__claude_ai_Google_Drive'));
  } finally { setDiscoveredClaudeAiServers([]); }
  assert.ok(!flagValue(buildArgs('gmail-read', {}).args, '--disallowedTools').includes('Slack'), 'cleared');
});

// ─── MCP / actions: destructive ops need a confirm token ───────────────────
test('every delete or merge op (bin_task included) is marked danger, so it needs a dry run and confirm', () => {
  const destructive = OPS.filter(o => /^(delete|merge)_|^bin_/.test(o.tool));
  assert.ok(destructive.length >= 7);
  for (const o of destructive) assert.equal(o.danger, true, `${o.tool} must need a confirm token`);
  assert.equal(OPS.find(o => o.tool === 'delete_resource').danger, true);
});

test('delete_resource: refused without a confirm, applied with the dry run\'s token', async () => {
  const d = makeDataDir();
  try {
    const a = createActions({ dataDir: d });
    const made = await a.apply({ ops: [{ op: 'resource.create', kind: 'snippet', target: 'echo hi', label: 'Hi', task: 'u-2-bbb' }] });
    const id = made.created[0].resourceId;
    await assert.rejects(a.apply({ ops: [{ op: 'delete_resource', id }] }), (e) => e.code === 'NEEDS_CONFIRM' && /deletes or merges/.test(e.message));
    const dry = await a.apply({ ops: [{ op: 'delete_resource', id }], dryRun: true });
    assert.equal(dry.needsConfirm, true);
    await assert.rejects(a.apply({ ops: [{ op: 'delete_resource', id }], confirm: 'c1.0.x.y.z' }), (e) => e.code === 'BAD_CONFIRM');
    const ok = await a.apply({ ops: [{ op: 'delete_resource', id }], confirm: dry.confirm });
    assert.equal(ok.ok, true);
    assert.equal((await a.query('resources.list', { kind: 'snippet' })).count, 0);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// ─── Files & links: programs are revealed, never opened ────────────────────
test('mayOpen: macOS bundles are revealed, not opened; a folder elsewhere opens; programs never open', () => {
  assert.equal(mayOpen('/Applications/Calculator.app', { isDir: true, platform: 'darwin' }), false);
  assert.equal(mayOpen('/Users/sam/Downloads/Setup.pkg', { isDir: true, platform: 'darwin' }), false);
  assert.equal(mayOpen('/Users/sam/Library/Services/Run.workflow', { isDir: true, platform: 'darwin' }), false);
  assert.equal(mayOpen('/Users/sam/Projects/site', { isDir: true, platform: 'darwin' }), true);
  // Elsewhere a folder named like a program is just a folder (next.js, my.app).
  assert.equal(mayOpen('C:\\code\\next.js', { isDir: true, platform: 'win32' }), true);
  assert.equal(mayOpen('/home/sam/my.app', { isDir: true, platform: 'linux' }), true);
  for (const f of ['run.exe', 'x.wsb', 'x.rdp', 'x.appinstaller', 'x.msu', 'x.vb', 'x.pkg', 'x.dmg', 'x.terminal', 'x.webloc', 'x.deb', 'x.rpm', 'x.flatpakref', 'x.pyz']) {
    assert.equal(rsrcIsExecutable(f), true, f);
    for (const platform of ['win32', 'darwin', 'linux']) assert.equal(mayOpen(`/tmp/${f}`, { isDir: false, platform }), false, `${platform} ${f}`);
  }
  for (const f of ['deck.pptx', 'notes.md', 'a.pdf', 'b.png']) assert.equal(mayOpen(`/tmp/${f}`, { platform: 'darwin' }), true, f);
});

// ─── Second pass ───────────────────────────────────────────────────────────
test('every claude job profile ignores user and project settings: no allow rule, hook, plugin or CLAUDE.md', () => {
  const cases = [
    ['text', {}], ['json', { jsonSchema: { type: 'object' } }],
    ['bank-read', {}], ['calendar-read', {}], ['gmail-read', {}], ['probe:gmail', {}],
    ['source-read', { source: { server: 'claude.ai Google Drive', tools: ['search_files'] } }],
    ['source-tools', { source: { server: 'my-notes' }, mcpServer: { type: 'stdio', command: 'notes-server' } }],
    ['mcp-propose', { allowedTools: ['mcp__dashboard__get_context'], mcpConfig: { mcpServers: {} } }],
  ];
  for (const [p, o] of cases) {
    const { args } = buildArgs(p, o);
    assert.equal(flagValue(args, '--setting-sources'), '', `${p}: --setting-sources ""`);
    assert.equal(flagValue(args, '--permission-mode'), 'dontAsk', p);
    assert.equal(flagValue(args, '--tools'), '', p);
  }
});

test('claude runs start in a folder only this user can write to (a shared /tmp cannot plant settings, hooks or a .mcp.json)', () => {
  const base = mkdtempSync(join(tmpdir(), 'sec-cwd-'));
  try {
    const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;
    const d = privateWorkDir({ base, uid });
    assert.match(basename(d), /dashboard-claude/, 'lib/calendar-jobkit.mjs persistedPath matches this name');
    assert.ok(existsSync(d));
    if (uid === undefined) { assert.equal(d, join(base, 'dashboard-claude'), 'Windows: the per-user temp folder'); return; }
    assert.equal(d, join(base, `dashboard-claude-${uid}`));
    assert.equal(statSync(d).mode & 0o777, 0o700);
    assert.equal(privateWorkDir({ base, uid }), d, 'the same folder next time');
    // A folder another account made first (here: one not owned by the uid asked for) is not used ...
    const other = privateWorkDir({ base, uid: uid + 4242 });
    assert.notEqual(other, join(base, `dashboard-claude-${uid + 4242}`));
    assert.match(basename(other), /^dashboard-claude-/);
    assert.equal(statSync(other).mode & 0o777, 0o700);
    // ... nor one others can write to, nor a symlink.
    const o = join(base, 'o'); mkdirSync(o);
    const openDir = join(o, `dashboard-claude-${uid}`); mkdirSync(openDir); chmodSync(openDir, 0o777);
    assert.notEqual(privateWorkDir({ base: o, uid }), openDir);
    const l = join(base, 'l'); mkdirSync(l);
    symlinkSync(d, join(l, `dashboard-claude-${uid}`));
    assert.notEqual(privateWorkDir({ base: l, uid }), join(l, `dashboard-claude-${uid}`));
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('a new data folder is private to this account (macOS/Linux: 0700); an existing one is left as it is', { skip: process.platform === 'win32' && 'Windows: the folder mode does not apply' }, async () => {
  const { ensureDataDir } = await import('../lib/datadir.mjs');
  const base = mkdtempSync(join(tmpdir(), 'sec-data-'));
  try {
    const fresh = join(base, 'new', 'data');
    await ensureDataDir(fresh);
    assert.equal(statSync(fresh).mode & 0o777, 0o700);
    const mine = join(base, 'mine'); mkdirSync(mine); chmodSync(mine, 0o750);
    await ensureDataDir(mine);
    assert.equal(statSync(mine).mode & 0o777, 0o750, 'not changed behind the owner\'s back');
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('Files & links: a link or a Windows short name that stands for a program is revealed, never opened', async (t) => {
  const base = mkdtempSync(join(tmpdir(), 'sec-open-'));
  const spawned = [];
  setSpawn((cmd, args) => { spawned.push({ cmd, args }); const c = new EventEmitter(); c.unref = () => {}; setTimeout(() => c.emit('spawn'), 1); return c; });
  try {
    writeFileSync(join(base, 'tool.exe'), '');                               // empty: nothing could ever run
    writeFileSync(join(base, 'long-name-file.settingcontent-ms'), '');
    writeFileSync(join(base, 'notes.md'), 'hi');
    const tricks = [];
    try { symlinkSync(join(base, 'tool.exe'), join(base, 'report.pdf'), 'file'); tricks.push(join(base, 'report.pdf')); } catch { /* no symlink right here (Windows without developer mode) */ }
    const short = join(base, 'LONG-N~1.SET');                                 // the 8.3 name, where the volume makes them
    if (process.platform === 'win32' && existsSync(short)) tricks.push(short);
    for (const p of tricks) {
      assert.equal(mayOpen(p), true, 'the saved name alone looks harmless');
      assert.equal(await mayOpenPath(p), false, p);
    }
    assert.equal(await mayOpenPath(join(base, 'notes.md')), true);
    assert.equal(await mayOpenPath(join(base, 'gone.md')), false, 'unresolvable: not opened');
    assert.equal(await mayOpenPath(join(base, 'tool.exe')), false);
    if (!tricks.length) { t.diagnostic('neither a symlink nor a short name could be made here: unit checks only'); return; }

    const H = { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', Origin: `http://localhost:${port}` };
    const made = await raw(port, 'POST', '/api/actions', H, JSON.stringify({ ops: [...tricks, join(base, 'notes.md')].map(p => ({ op: 'resource.create', kind: 'file', target: p })) }));
    assert.equal(made.status, 200, made.text);
    const ids = JSON.parse(made.text).created.map(c => c.resourceId);
    const docId = ids.pop();
    for (const id of ids) {
      const r = await raw(port, 'POST', '/api/resources/open', H, JSON.stringify({ id }));
      assert.equal(r.status, 400, r.text);
      assert.equal(JSON.parse(r.text).code, 'PROGRAM');
    }
    assert.equal(spawned.length, 0, 'nothing was launched');
    assert.equal((await raw(port, 'POST', '/api/resources/open', H, JSON.stringify({ id: ids[0], action: 'reveal' }))).status, 200, 'Reveal still works');
    assert.equal((await raw(port, 'POST', '/api/resources/open', H, JSON.stringify({ id: docId }))).status, 200, 'a real document still opens');
    assert.equal(spawned.length, 2);
  } finally { setSpawn(null); rmSync(base, { recursive: true, force: true }); }
});

// (third pass) a failed AI run's message can repeat the prompt: the log gets the code only.
test('a failed /api/ai run logs its error code, never its message (no prompt or CLI text in server.log)', async () => {
  const marker = 'PRIVATE-TASK-TEXT-' + Date.now();
  process.env.FAKE_CLAUDE_MODE = 'error-echo';
  try {
    const H = { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', Origin: `http://localhost:${port}` };
    const r = await raw(port, 'POST', '/api/ai', H, JSON.stringify({ prompt: `Summarise: ${marker}` }));
    assert.ok(r.status >= 400, r.text);
    assert.equal(JSON.parse(r.text).code, 'CLI_FAILED');
  } finally { process.env.FAKE_CLAUDE_MODE = 'ok'; }
  await srv.ctx.log.flush?.();
  const logText = readFileSync(srv.ctx.paths.serverLog, 'utf8');
  assert.match(logText, /ai FAILED CLI_FAILED/);
  assert.ok(!logText.includes(marker), 'the prompt text reached server.log');
});

// (third pass) macOS `open` runs a Unix executable with no extension in Terminal.
test('Files & links (macOS/Linux): a file with an execute bit is a program whatever its name; Windows is unaffected', { skip: process.platform === 'win32' && 'Windows has no execute bit' }, async () => {
  const base = mkdtempSync(join(tmpdir(), 'sec-xbit-'));
  try {
    for (const n of ['invoice', 'report.pdf', 'notes.md']) writeFileSync(join(base, n), '#!/bin/sh\n');
    chmodSync(join(base, 'invoice'), 0o755);
    chmodSync(join(base, 'report.pdf'), 0o744);
    chmodSync(join(base, 'notes.md'), 0o644);
    for (const platform of ['darwin', 'linux']) {
      assert.equal(mayOpen(join(base, 'invoice'), { platform }), true, 'the name alone looks harmless');
      assert.equal(await mayOpenPath(join(base, 'invoice'), { platform }), false, `${platform} invoice`);
      assert.equal(await mayOpenPath(join(base, 'report.pdf'), { platform }), false, `${platform} report.pdf`);
      assert.equal(await mayOpenPath(join(base, 'notes.md'), { platform }), true, `${platform} notes.md`);
      assert.equal(await mayOpenPath(base, { isDir: true, platform }), true, 'a folder (x = enter) still opens');
    }
    assert.equal(await mayOpenPath(join(base, 'invoice'), { platform: 'win32' }), true, 'win32: judged by name only');
  } finally { rmSync(base, { recursive: true, force: true }); }
});

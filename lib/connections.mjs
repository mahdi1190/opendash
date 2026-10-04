// lib/connections.mjs - what this dashboard is connected to, and how to check.
//
// Connections (stored in <data>/connections.json via lib/datadir.mjs):
//   claude     the local Claude Code CLI (signed in?)          -> AI features, assistant
//   gmail      claude.ai Gmail connector, read-only             -> email triage, people's mail
//   calendar   claude.ai Google Calendar connector, read-only   -> calendar events
//   bank       claude.ai Bank connector, read-only              -> finance bank sync
//   mcp        the dashboard's own MCP server installed in Claude Code / Desktop
//   google     optional direct Google OAuth (lib/google.mjs), reported as is
//
// Every check goes through lib/claude-runner.mjs:
//   claude     the 'text' profile: "Reply with exactly: OK", Haiku, --tools ""
//              --strict-mcp-config (lib/ai.mjs aiStatus)
//   connector  the 'probe:<id>' profile: exactly ONE harmless read tool of that
//              connector is allowed; a missing connector, "needs auth" or any
//              other tool stops the run at once
// Results are cached in connections.json. checkStale() re-checks a connection
// at most once an hour (the page asks when it opens); check() runs on demand.
// Nothing here ever asks for, receives or stores a password or token.
//
// Node stdlib only.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { loadConnections, updateConnection, dataPaths, REPO_ROOT } from './datadir.mjs';
import { runClaude, parseStream, classifyFailure, CONNECTORS, cliInstalled, cliPath } from './claude-runner.mjs';
import { aiStatus, aiStatusCached } from './ai.mjs';

export const STALE_MS = 60 * 60 * 1000;          // automatic re-check at most hourly
export const MIN_MANUAL_GAP_MS = 5000;           // ignore double clicks on "Check"
export const CONNECTOR_IDS = Object.freeze(['gmail', 'calendar', 'bank']);
export const CHECKABLE = Object.freeze(['claude', ...CONNECTOR_IDS, 'mcp']);

// Runner error code -> stored status.
const STATUS_FOR = {
  CLI_MISSING: 'not-installed', NOT_SIGNED_IN: 'signed-out', CONNECTOR_AUTH: 'needs-auth',
  TOOL_MISSING: 'missing', USAGE_LIMIT: 'limited', TIMEOUT: 'error', POLICY: 'error',
};

/**
 * Normalised view of a stored status for the page:
 *   ok      connected
 *   auth    needs sign-in (signed-out / needs-auth)
 *   setup   not set up (not-installed / not-set-up / missing / needs-claude)
 *   limited usage limit reached (temporary)
 *   error   a check failed for another reason
 *   unknown never checked
 */
export function stateOf(status) {
  switch (status) {
    case 'connected': return 'ok';
    case 'signed-out': case 'needs-auth': case 'configured': return 'auth';
    case 'not-installed': case 'not-set-up': case 'missing': case 'needs-claude': return 'setup';
    case 'limited': return 'limited';
    case 'error': return 'error';
    default: return 'unknown';
  }
}

const short = (s, n = 240) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n) || null);

export function createConnections({ dataDir, log = () => {}, runner = runClaude, ai = { aiStatus, aiStatusCached }, mcpTest = testMcp, now = () => Date.now(), retryDelayMs = 1500, discoveryOk = () => false } = {}) {
  const inFlight = new Map();          // id -> Promise
  const lastManual = new Map();        // id -> ms

  async function store(id, patch) {
    const all = await updateConnection(dataDir, id, { ...patch, message: short(patch.message) });
    return all[id];
  }

  async function checkClaude() {
    const s = await ai.aiStatus({ force: true });
    return store('claude', s.available
      ? { status: 'connected', message: null, code: null }
      : { status: STATUS_FOR[s.code] || 'error', message: s.message, code: s.code || 'CLI_FAILED' });
  }

  async function checkConnector(id) {
    // A connector can only be reached through a working Claude Code.
    const ai0 = ai.aiStatusCached() || await ai.aiStatus();
    if (!ai0.available) {
      return store(id, { status: 'needs-claude', code: ai0.code || 'CLI_FAILED', message: 'Connect Claude first: the connectors are reached through it.' });
    }
    // Two tries: right after start-up a claude.ai connector can still be
    // connecting (its tool is not listed yet -> TOOL_MISSING), and a small
    // model now and then answers without calling the tool.
    let patch;
    for (let attempt = 1; attempt <= 2; attempt++) {
      patch = await probeOnce(id);
      if (!(patch.code === 'BAD_OUTPUT' || patch.code === 'TOOL_MISSING') || attempt === 2) break;
      log('note', `connection check ${id}: ${patch.code}, trying once more`);
      await new Promise(r => setTimeout(r, retryDelayMs));
    }
    log('note', `connection check ${id}: ${patch.status}`);
    return store(id, patch);
  }

  async function probeOnce(id) {
    try {
      const tool = CONNECTORS[id].prefix + CONNECTORS[id].probe;
      // Name the tool in the request too: a small model otherwise sometimes only says it will call it.
      const r = await runner({ profile: `probe:${id}`, prompt: `Call the tool ${tool} now, with no arguments. Then reply OK.`, model: 'claude-haiku-4-5', tolerateResultError: true });
      const res = parseStream(r.lines || []).results.find(x => x.name === tool);
      if (!res) return { status: 'error', code: 'BAD_OUTPUT', message: 'The check did not reach the connector. Try again.' };
      if (res.isError) {
        const code = classifyFailure(res.text);
        return code === 'CONNECTOR_AUTH'
          ? { status: 'needs-auth', code, message: `${CONNECTORS[id].label} needs you to sign in again.` }
          : { status: 'error', code: 'CLI_FAILED', message: `${CONNECTORS[id].label} answered with an error.` };
      }
      return { status: 'connected', code: null, message: null };
    } catch (e) {
      return { status: STATUS_FOR[e.code] || 'error', code: e.code || 'CLI_FAILED', message: e.message };
    }
  }

  async function checkMcp() {
    const r = await mcpTest({ dataDir });
    const inst = installStatus({ dataDir });
    return store('mcp', r.ok
      ? { status: 'connected', code: null, message: null, tools: r.tools, installed: inst.summary }
      : { status: 'error', code: 'MCP_TEST', message: r.error, installed: inst.summary });
  }

  /** Run one check now (deduplicated while it runs). */
  function check(id, { manual = false } = {}) {
    if (!CHECKABLE.includes(id)) throw Object.assign(new Error('unknown connection'), { status: 400 });
    if (inFlight.has(id)) return inFlight.get(id);
    if (manual) lastManual.set(id, now());
    const p = (async () => {
      try {
        if (id === 'claude') return await checkClaude();
        if (id === 'mcp') return await checkMcp();
        return await checkConnector(id);
      } finally { inFlight.delete(id); }
    })();
    inFlight.set(id, p);
    return p;
  }

  /** Everything, for GET /api/connections. The live AI probe wins over the stored claude entry. */
  async function list() {
    const all = await loadConnections(dataDir);
    const live = ai.aiStatusCached();
    if (live && (!all.claude.checkedAt || live.at > Date.parse(all.claude.checkedAt))) {
      all.claude = { ...all.claude, status: live.available ? 'connected' : (STATUS_FOR[live.code] || 'error'),
        code: live.available ? null : (live.code || null), message: live.available ? null : short(live.message), checkedAt: new Date(live.at).toISOString() };
    }
    const out = { version: all.version || 1, checking: [...inFlight.keys()] };
    for (const id of ['claude', ...CONNECTOR_IDS, 'mcp', 'google']) {
      const e = all[id] || { status: 'unknown', checkedAt: null, message: null };
      out[id] = { ...e, state: stateOf(e.status), checking: inFlight.has(id) };
    }
    out.mcp.installed = installStatus({ dataDir }).summary;
    return out;
  }

  /**
   * Re-check, in the background and one at a time, every connection whose
   * last check is older than an hour (never-checked ones too). Connectors are
   * only checked once Claude itself works. Returns a promise of the ids it
   * checked, settled when the pass is over; it never rejects, so callers may
   * ignore it (the route does: the page polls GET /api/connections).
   */
  function checkStale() {
    const started = [];
    return (async () => {
      const all = await loadConnections(dataDir);
      const old = (id) => !all[id] || !all[id].checkedAt || now() - Date.parse(all[id].checkedAt) > STALE_MS;
      const run = (id) => { started.push(id); return check(id).catch(() => {}); };
      const live = ai.aiStatusCached();
      const claudeFresh = live && now() - live.at < STALE_MS;
      if (!claudeFresh && old('claude')) await run('claude');
      const ok = (ai.aiStatusCached() || {}).available;
      for (const id of CONNECTOR_IDS) {
        if (!old(id)) continue;
        if (discoveryOk()) continue;          // claude mcp list already tells (lib/sources.mjs): no model run needed
        if (!ok && all[id] && all[id].status === 'needs-claude') continue;   // nothing new to learn
        await run(id);
      }
      if (old('mcp')) await run('mcp');
      return started;
    })().catch((e) => { log('warn', `connection re-check failed: ${e && e.message}`); return started; });
  }

  function tooSoon(id) {
    const t = lastManual.get(id);
    return t != null && now() - t < MIN_MANUAL_GAP_MS;
  }

  return { list, check, checkStale, tooSoon, inFlight };
}

// ─── Dashboard MCP: is it installed, and does it answer? ─────────────────
const MCP_SERVER = join(REPO_ROOT, 'mcp', 'server.mjs');
const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

/** Look for our MCP server in a {mcpServers:{name:{command,args}}} block. */
function findServers(block, where) {
  const out = [];
  if (!block || typeof block !== 'object') return out;
  for (const [name, def] of Object.entries(block)) {
    const args = Array.isArray(def && def.args) ? def.args.map(String) : [];
    const hit = args.find(a => /mcp[\\/]server\.mjs$/i.test(a));
    if (!hit) continue;
    const i = args.indexOf('--data-dir');
    out.push({ where, name: String(name).slice(0, 60), sameCopy: norm(hit) === norm(MCP_SERVER), dataDir: i >= 0 ? args[i + 1] : null });
  }
  return out;
}
function readJsonQuiet(file) {
  try { return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null; } catch { return null; }
}

/**
 * Read-only look at the user's Claude Code (~/.claude.json) and Claude
 * Desktop configs for an entry that runs this dashboard's mcp/server.mjs.
 * Only our own entries are returned (name, same copy?, same data folder?).
 */
export function installStatus({ dataDir, env = process.env, platform = process.platform, home = env.USERPROFILE || env.HOME || homedir() } = {}) {
  const entries = [];
  const cc = readJsonQuiet(join(home, '.claude.json'));
  if (cc) {
    entries.push(...findServers(cc.mcpServers, 'claude-code'));
    if (cc.projects && typeof cc.projects === 'object') {
      for (const p of Object.values(cc.projects)) entries.push(...findServers(p && p.mcpServers, 'claude-code-project'));
    }
  }
  const desktopFile = platform === 'win32' ? join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
    : platform === 'darwin' ? join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
      : join(home, '.config', 'Claude', 'claude_desktop_config.json');
  const dt = readJsonQuiet(desktopFile);
  if (dt) entries.push(...findServers(dt.mcpServers, 'claude-desktop'));
  const want = norm(resolve(dataDir || ''));
  for (const e of entries) e.sameData = e.dataDir ? norm(resolve(e.dataDir)) === want : null;
  const summarise = (where) => {
    const mine = entries.filter(e => e.where.startsWith(where));
    if (!mine.length) return 'not-installed';
    if (mine.some(e => e.sameCopy && e.sameData !== false)) return 'installed';
    return 'other-copy';
  };
  return { entries: entries.map(({ where, name, sameCopy, sameData }) => ({ where, name, sameCopy, sameData })),
    summary: { claudeCode: summarise('claude-code'), desktop: summarise('claude-desktop') } };
}

/**
 * Start the dashboard MCP server (propose mode: it can never change data),
 * speak JSON-RPC to it: initialize, tools/list, tools/call get_context.
 * Resolves { ok, ms, protocolVersion, tools, today, empty, error }.
 * empty: the data folder has no state file yet (a brand-new folder).
 */
export function testMcp({ dataDir, timeoutMs = 20000, server = MCP_SERVER, node = process.execPath } = {}) {
  return new Promise((resolveP) => {
    const t0 = Date.now();
    let child, empty = false;
    try {
      // Read from the data folder itself, before the server starts: the NOT_SET_UP
      // answer below only happens in a checkout that still has a pre-2.0 state/ folder.
      empty = !existsSync(dataPaths(dataDir).stateFile);
      child = spawn(node, [server, '--data-dir', resolve(dataDir), '--mode', 'propose'], { stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true, env: { ...process.env } });
    } catch (e) { resolveP({ ok: false, ms: 0, error: `could not start the MCP server: ${e.message}` }); return; }
    let buf = '', done = false, stderr = '';
    const got = new Map();
    const finish = (r) => {
      if (done) return; done = true; clearTimeout(timer);
      try { child.stdin.end(); } catch {}
      setTimeout(() => { try { child.kill(); } catch {} }, 200);
      resolveP({ ms: Date.now() - t0, ...r });
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'The MCP server did not answer in time.' }), timeoutMs);
    const send = (o) => { try { child.stdin.write(JSON.stringify(o) + '\n'); } catch {} };
    child.on('error', (e) => finish({ ok: false, error: `could not start the MCP server: ${e.message}` }));
    child.on('close', (code) => finish({ ok: false, error: `The MCP server stopped (exit ${code}). ${short(stderr, 200) || ''}`.trim() }));
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000); });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        let msg; try { msg = JSON.parse(line); } catch { continue; }
        if (msg && msg.id != null) got.set(msg.id, msg);
        step();
      }
    });
    function step() {
      const init = got.get(1), tools = got.get(2), ctx = got.get(3);
      if (init && init.error) return finish({ ok: false, error: `initialize failed: ${short(init.error.message, 160)}` });
      if (init && !got.has('sent2')) {
        got.set('sent2', true);
        send({ jsonrpc: '2.0', method: 'notifications/initialized' });
        send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
        send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_context', arguments: {} } });
        return;
      }
      if (tools && ctx) {
        if (tools.error) return finish({ ok: false, error: `tools/list failed: ${short(tools.error.message, 160)}` });
        const ctxErr = (ctx.error && ctx.error.message) || (ctx.result && ctx.result.isError && ctx.result.content && ctx.result.content[0] && ctx.result.content[0].text) || '';
        // A data folder still waiting for migration 001 (the old <repo>/state/ is there) refuses
        // every call with NOT_SET_UP: the server works, there is just nothing to read yet.
        if (/NOT_SET_UP/.test(ctxErr)) return finish({ ok: true, empty: true, protocolVersion: init.result && init.result.protocolVersion, tools: Array.isArray(tools.result && tools.result.tools) ? tools.result.tools.length : 0, today: null });
        if (ctx.error || (ctx.result && ctx.result.isError)) return finish({ ok: false, error: `get_context failed: ${short((ctx.error && ctx.error.message) || (ctx.result.content && ctx.result.content[0] && ctx.result.content[0].text), 160)}` });
        let today = null;
        try {
          const c = ctx.result.structuredContent || JSON.parse(ctx.result.content[0].text);
          today = c && (c.today && (c.today.date || c.today)) || null;
        } catch { /* fine: it answered */ }
        finish({ ok: true, empty, protocolVersion: init.result && init.result.protocolVersion, tools: Array.isArray(tools.result && tools.result.tools) ? tools.result.tools.length : 0, today: typeof today === 'string' ? today : null });
      }
    }
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'dashboard-connections-test', version: '1' } } });
  });
}

/** Facts for the page's "Claude is not installed" help (no secrets). */
export function cliFacts() {
  return { installed: cliInstalled(), path: cliInstalled() ? cliPath() : null };
}

export { dataPaths };

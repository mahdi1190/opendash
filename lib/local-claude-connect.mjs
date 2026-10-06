// One local connection: find Claude first, optionally install/sign in, then MCP.
// Auth checks are CLI metadata; no model prompts, passwords or tokens here.
import { refreshClaudeCli, claudeAuthStatus, installClaudeNative, openClaudeTerminal, openClaudeRemoteControl, addUserMcpServer } from './claude-runner.mjs';
import { userServerDefs } from './sources.mjs';
import { testMcp } from './connections.mjs';
import { installInfo } from '../mcp/install.mjs';
import { updateConnection } from './datadir.mjs';
import { resetAiProbe } from './ai.mjs';
const flows = new Map();
const norm = value => { const path = String(value || '').replace(/\\/g, '/').replace(/\/+$/, ''); return process.platform === 'win32' ? path.toLowerCase() : path; };
const conflict = () => Object.assign(new Error('An existing dashboard MCP entry points elsewhere. Review it in Options; OpenDash has left it unchanged.'), { code: 'MCP_CONFLICT' });
export function matchingLocalMcp(def, info) {
  if (!def || def.url || (def.type && def.type !== 'stdio') || norm(def.command) !== norm(info.node) || !Array.isArray(def.args)) return false;
  const args = def.args;
  return norm(args[0]) === norm(info.server) && args[1] === '--data-dir' && norm(args[2]) === norm(info.dataDir)
    && (args.length === 3 || (args.length === 5 && args[3] === '--mode' && ['app', 'propose'].includes(args[4])));
}
export function createLocalClaudeConnect({ dataDir, log = () => {}, refreshCli = refreshClaudeCli, authStatus = claudeAuthStatus,
  install = installClaudeNative, login = () => openClaudeTerminal({ authLogin: true }), definitions = userServerDefs,
  addMcp = addUserMcpServer, verifyMcp = testMcp, store = updateConnection, resetProbe = resetAiProbe,
  remoteControl = openClaudeRemoteControl,
  now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms)), loginTimeoutMs = 300000, pollMs = 3000 } = {}) {
  let state = { phase: 'idle', busy: false, connected: false, message: null }, job = null, browserJob = null;
  const phase = (value, message) => { state = { phase: value, busy: !['idle', 'connected', 'error'].includes(value), connected: value === 'connected', message: message || null }; };
  function start() {
    if (job || browserJob) return status();
    phase('checking', 'Looking for an existing Claude Code installation…');
    job = (async () => {
      try {
        let found = await refreshCli();
        if (!found.installed) {
          phase('installing', 'Installing Claude Code from the official native installer…'); await install();
          found = await refreshCli();
          if (!found.installed) throw Object.assign(new Error('Claude could not be found after installation. Use the official guide, then try Link Claude again.'), { code: 'CLI_MISSING' });
        }
        const info = installInfo({ dataDir }); let def = (await definitions())[info.name];
        if (def && !matchingLocalMcp(def, info)) throw conflict();
        let auth = await authStatus();
        if (!auth.loggedIn) {
          phase('awaiting-login', 'Finish Claude sign-in in the browser opened by the local sign-in window.');
          const opened = await login(); if (!opened?.opened) throw Object.assign(new Error('A sign-in terminal could not open. Use the official Claude login guide, then try Link Claude again.'), { code: 'LOGIN_UNAVAILABLE' });
          const until = now() + loginTimeoutMs;
          do { await sleep(pollMs); auth = await authStatus(); } while (!auth.loggedIn && now() < until);
          if (!auth.loggedIn) throw Object.assign(new Error('Claude sign-in is not finished. Complete it in the browser, then press Link Claude to recheck.'), { code: 'LOGIN_PENDING' });
        }
        phase('adding-tools', 'Adding OpenDash tools to your local Claude connection…');
        def = (await definitions())[info.name]; if (def && !matchingLocalMcp(def, info)) throw conflict();
        if (!def) await addMcp({ name: info.name, command: info.node, args: [info.server, '--data-dir', info.dataDir] });
        if (!matchingLocalMcp((await definitions())[info.name], info)) throw Object.assign(new Error('The OpenDash MCP entry could not be verified. Review Options before trying again.'), { code: 'MCP_NOT_REGISTERED' });
        phase('verifying', 'Checking sign-in and the local OpenDash tools…');
        if (!(await authStatus()).loggedIn) throw Object.assign(new Error('Claude needs sign-in again. Press Link Claude to reconnect.'), { code: 'NOT_SIGNED_IN' });
        if (!(await verifyMcp({ dataDir })).ok) throw Object.assign(new Error('The local OpenDash tools did not answer. Review Options and try Link Claude again.'), { code: 'MCP_FAILED' });
        resetProbe();
        await store(dataDir, 'claude', { status: 'connected', code: null, message: null, from: 'auth-metadata' });
        await store(dataDir, 'mcp', { status: 'connected', code: null, message: null, from: 'local-handshake' });
        phase('connected', 'Claude and its local OpenDash tools are connected.'); log('note', 'Local Claude connection verified');
      } catch (e) {
        const known = ['MCP_CONFLICT', 'CLI_MISSING', 'LOGIN_UNAVAILABLE', 'LOGIN_PENDING', 'MCP_NOT_REGISTERED', 'NOT_SIGNED_IN', 'MCP_FAILED'];
        phase('error', known.includes(e.code) ? e.message : e.code === 'TIMEOUT' ? 'Claude setup took too long. Press Link Claude to check again.' : e.code === 'BAD_OUTPUT' ? 'Claude could not report its sign-in status. Update Claude Code using its official guide, then try again.' : 'Claude setup could not finish. Check the official installation and sign-in guide, then press Link Claude again.');
        state.code = e.code || 'LOCAL_CONNECT_FAILED'; log('warn', 'Local Claude connection failed (' + state.code + ')');
      } finally { job = null; }
    })();
    return status();
  }
  function status() { return { ...state }; }
  async function settled() { if (browserJob || job) await (browserJob || job); return status(); }
  // A browser session is optional. Dashboard AI only needs the local link.
  function startBrowser() {
    if (job || browserJob) return status();
    start();
    const linking = job;
    browserJob = (async () => {
      await linking;
      if (!state.connected) return;
      state = { phase: 'opening-browser', busy: true, connected: true, browserReady: false, message: 'Opening the official Claude Remote Control terminal…' };
      try {
        const opened = await remoteControl();
        if (!opened?.opened) throw new Error('No terminal');
        state = { phase: 'browser-opened', busy: false, connected: true, browserReady: false, browserUrl: 'https://claude.ai/code',
          message: 'Finish any Claude terminal confirmations, then select OpenDash in Claude Code in your browser. Keep the terminal running. Remote Control needs an eligible Claude subscription.' };
      } catch {
        state = { phase: 'browser-error', busy: false, connected: true, browserReady: false,
          message: 'Dashboard AI is connected, but the Claude browser session could not open. Check the official Remote Control guide, or try Open connected Claude again.' };
      }
    })().finally(() => { browserJob = null; });
    return status();
  }
  return { start, startBrowser, status, settled };
}
export function localClaudeConnectFor(ctx) { if (!flows.has(ctx.dataDir)) flows.set(ctx.dataDir, createLocalClaudeConnect({ dataDir: ctx.dataDir, log: ctx.log })); return flows.get(ctx.dataDir); }

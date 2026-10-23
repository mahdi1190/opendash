// Shared set-up for the move tests (tests/relocate-*.test.mjs): a temp
// "computer" with a home folder, an OpenDash app + data folder inside a fake
// OneDrive, and fake adapters (registry, claude/codex CLIs, shortcuts) so
// nothing on the real computer is read or changed. Never the real registry,
// never the real %LOCALAPPDATA%\OpenDash, never real MCP configs.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDryRunExec } from '../lib/os-integration.mjs';
import { registryAdapter } from '../lib/relocate/adapters.mjs';

// Every device folder of this test process goes to a temp place.
const ROOT = process.platform === 'win32' && existsSync('C:/tmp') ? 'C:/tmp/relocate-test' : join(tmpdir(), 'relocate-test');
mkdirSync(ROOT, { recursive: true });
if (!process.env.DASHBOARD_DEVICE_DIR) process.env.DASHBOARD_DEVICE_DIR = mkdtempSync(join(ROOT, 'device-'));

export const sha = (b) => createHash('sha256').update(b).digest('hex');

/** Every file under dir as {rel: sha256}. */
export function tree(dir, skip = () => false) {
  const out = {};
  const walk = (rel) => {
    for (const n of readdirSync(rel ? join(dir, rel) : dir)) {
      const r = rel ? `${rel}/${n}` : n;
      if (skip(r)) continue;
      const st = statSync(join(dir, r));
      if (st.isDirectory()) walk(r); else out[r] = sha(readFileSync(join(dir, r)));
    }
  };
  walk('');
  return out;
}

const W = (f, s) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s); };

/**
 * A fake computer. opts.appInOneDrive (true): the app (and its data/) sit in
 * <home>/OneDrive/Projects/opendash. Returns paths, adapters and helpers.
 */
export function makeComputer({ files = 40, big = false } = {}) {
  const t = mkdtempSync(join(ROOT, 'pc-'));
  const home = join(t, 'home');
  const oneDrive = join(home, 'OneDrive');
  const app = join(oneDrive, 'Projects', 'opendash');
  const data = join(app, 'data');
  const base = join(t, 'local', 'OpenDash');        // this computer's OpenDash folder (instead of %LOCALAPPDATA%\OpenDash)
  // the app
  W(join(app, 'package.json'), JSON.stringify({ name: 'opendash', version: '9.9.9' }));
  W(join(app, 'start-opendash.bat'), '@echo off\r\nnode tools\\supervisor.mjs %*\r\n');
  W(join(app, 'tools', 'start-hidden.mjs'), '// launcher\n');
  W(join(app, 'mcp', 'server.mjs'), '// mcp\n');
  W(join(app, '.git'), 'gitdir: C:/dev/opendash/.git/worktrees/live\n');
  // the data
  W(join(data, 'config.json'), JSON.stringify({ version: 1, userName: 'Test', financeDir: join(data, 'finance') }, null, 1));
  W(join(data, 'state', 'dashboard-state.json'), JSON.stringify({ custom: [{ id: 'u-1', title: 'a task' }], _lastSave: 1 }));
  W(join(data, 'data-id.json'), JSON.stringify({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }));
  W(join(data, 'local-token'), 'tok');
  W(join(data, 'runtime.json'), JSON.stringify({ pid: 1, port: 4999 }));
  W(join(data, 'hosts', 'bbbbbbbbbbbbbbbbbbbbbbbb.json'), JSON.stringify({ hostId: 'bbbbbbbbbbbbbbbbbbbbbbbb', beatAt: 1 }));
  W(join(data, 'logs', 'server.log'), 'started\n');
  for (let i = 0; i < files; i++) W(join(data, 'state', 'backups', `state-${String(i).padStart(3, '0')}.json`), JSON.stringify({ custom: [], i, pad: 'x'.repeat(big ? 200000 : 50) }));
  W(join(data, 'finance', 'inbox', 'statement.csv'), 'date,amount\n2026-10-01,1.00\n');
  // references outside the data folder
  const fwd = (p) => p.replace(/\\/g, '/');
  W(join(home, '.claude.json'), JSON.stringify({
    numStartups: 3,
    mcpServers: {
      github: { type: 'http', url: 'https://example.invalid/mcp' },
      dashboard: { type: 'stdio', command: 'node', args: [fwd(join(app, 'mcp', 'server.mjs')), '--data-dir', fwd(data)], env: {} },
    },
    projects: { [fwd(app)]: { mcpServers: {}, hasTrustDialogAccepted: true } },
  }, null, 2));
  const codexName = 'opendash-' + createHash('sha256').update(data).digest('hex').slice(0, 10);
  W(join(home, '.codex', 'config.toml'), `model = "x"\n\n[mcp_servers.${codexName}]\ncommand = 'C:\\Program Files\\nodejs\\node.exe'\nargs = ['${join(app, 'mcp', 'server.mjs')}', "--data-dir", '${data}']\n\n[other]\nk = 1\n`);
  W(join(oneDrive, 'Documents', 'Claude', 'Scheduled', 'task-ops', 'SKILL.md'), `# Task ops\nRead ${join(data, 'state', 'dashboard-state.json')} but never write it.\nAlso ${fwd(data)}/state.\nNot this: ${app}-old\n`);
  W(join(oneDrive, 'Documents', 'Claude', 'Scheduled', 'task-management', 'SKILL.md'), '# Tasks\nDo not touch `dashboard-state.json`.\n');
  W(join(home, 'Desktop', 'OpenDash.lnk'), `fake lnk ${join(app, 'start-opendash.bat')}`);
  const env = { OneDrive: oneDrive, APPDATA: join(home, 'AppData', 'Roaming'), LOCALAPPDATA: join(t, 'local'), SystemRoot: 'C:\\Windows' };
  const reg = createDryRunExec();
  return {
    t, home, oneDrive, app, data, base, env, reg, codexName,
    registry: registryAdapter({ exec: reg.exec, env }),
    cleanup: () => rmSync(t, { recursive: true, force: true }),
  };
}

/** A fake claude / codex CLI that edits the fake config files the way the real ones would. */
export function fakeCli(home, { has = ['claude', 'codex'], fail = null } = {}) {
  const calls = [];
  const ccFile = join(home, '.claude.json'), cxFile = join(home, '.codex', 'config.toml');
  return {
    calls,
    async which(tool) { return has.includes(tool) ? `/fake/bin/${tool}` : null; },
    async run(tool, args, { cwd } = {}) {
      calls.push({ tool, args: [...args], cwd });
      if (fail && fail(tool, args)) return { code: 1, stdout: '', stderr: 'simulated failure' };
      if (tool === 'claude') {
        const j = JSON.parse(readFileSync(ccFile, 'utf8'));
        const scope = args[args.indexOf('--scope') + 1];
        const blockOf = () => (scope === 'user' ? (j.mcpServers = j.mcpServers || {}) : j.projects[Object.keys(j.projects).find(k => k.toLowerCase() === String(cwd).replace(/\\/g, '/').toLowerCase()) || cwd].mcpServers);
        if (args[1] === 'remove') { const b = blockOf(); if (!b[args[2]]) return { code: 1, stdout: '', stderr: 'No MCP server found' }; delete b[args[2]]; }
        if (args[1] === 'add') {
          const name = args[4], dd = args.indexOf('--');
          const env = {};
          for (let i = 5; i < dd; i += 2) if (args[i] === '-e') { const [k, ...v] = args[i + 1].split('='); env[k] = v.join('='); }
          blockOf()[name] = { type: 'stdio', command: args[dd + 1], args: args.slice(dd + 2), env };
        }
        writeFileSync(ccFile, JSON.stringify(j, null, 2));
      }
      if (tool === 'codex') {
        let t = readFileSync(cxFile, 'utf8');
        if (args[1] === 'remove') {
          const re = new RegExp(`\\[mcp_servers\\.${args[2]}\\][\\s\\S]*?(?=\\n\\[|$)`);
          if (!re.test(t)) return { code: 1, stdout: '', stderr: 'not found' };
          t = t.replace(re, '').replace(/\n{3,}/g, '\n\n');
        }
        if (args[1] === 'add') {
          const dd = args.indexOf('--');
          t += `\n[mcp_servers.${args[2]}]\ncommand = ${JSON.stringify(args[dd + 1])}\nargs = ${JSON.stringify(args.slice(dd + 2))}\n`;
        }
        writeFileSync(cxFile, t);
      }
      return { code: 0, stdout: 'ok', stderr: '' };
    },
  };
}

/** Fake Windows shortcuts: {file: {target, args, workdir, icon}} in memory. */
export function fakeShortcuts(initial = {}) {
  const lnk = new Map(Object.entries(initial));
  return {
    lnk,
    async read(files) { return files.filter(f => lnk.has(f)).map(f => ({ file: f, ...lnk.get(f) })); },
    async write(file, f) { lnk.set(file, { ...f }); },
  };
}

export function adaptersFor(pc, { free = 1e12, cli, shortcuts, sync = null } = {}) {
  return {
    registry: pc.registry,
    cli: cli || fakeCli(pc.home),
    shortcuts: shortcuts || fakeShortcuts({ [join(pc.home, 'Desktop', 'OpenDash.lnk')]: { target: join(pc.app, 'start-opendash.bat'), args: '', workdir: pc.app, icon: join(pc.app, 'assets', 'icon.ico') } }),
    syncLocalDir: sync,
    freeBytes: () => free,
  };
}

/**
 * Before a test starts an in-process server: the fake claude CLI (never the
 * real one: a forced calendar update would otherwise run a real Claude job),
 * temp sync and device folders. Call before importing server/index.mjs.
 */
export async function safeServerEnv() {
  const fake = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude.mjs');
  process.env.CLAUDE_CLI_PATH = fake;
  process.env.FAKE_CLAUDE_MODE = 'ok';
  if (!process.env.DASHBOARD_SYNC_LOCAL_DIR) process.env.DASHBOARD_SYNC_LOCAL_DIR = mkdtempSync(join(ROOT, 'sync-'));
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(fake);
  return fake;
}

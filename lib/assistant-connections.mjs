// Local assistant facts and fixed MCP registration commands. Never installs a
// provider, accepts a shell command, or reads authentication credentials.
import { existsSync, readFileSync } from 'node:fs';
import { join, delimiter, extname } from 'node:path';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { SERVER_PATH } from '../mcp/install.mjs';
const exec = promisify(execFile);

export function codexExecutable({ env = process.env, platform = process.platform, home = env.USERPROFILE || env.HOME || homedir(), exists = existsSync } = {}) {
  const paths = [env.OPENDASH_CODEX_PATH, join(home, '.local', 'bin', platform === 'win32' ? 'codex.exe' : 'codex')];
  for (const dir of String(env.PATH || '').split(delimiter).filter(Boolean)) {
    paths.push(join(dir, platform === 'win32' ? 'codex.exe' : 'codex'));
    paths.push(join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js'));
  }
  return paths.find(p => p && /[\\/]/.test(p) && !/\.(cmd|bat|ps1)$/i.test(p) && exists(p)) || null;
}

export function codexRegistration({ dataDir, env = process.env, home = env.USERPROFILE || env.HOME || homedir() }) {
  const name = 'opendash-' + createHash('sha256').update(dataDir).digest('hex').slice(0, 10);
  let config = '';
  try { config = readFileSync(join(env.CODEX_HOME || join(home, '.codex'), 'config.toml'), 'utf8'); } catch { /* absent */ }
  const block = config.match(new RegExp('^\\[mcp_servers\\.' + name + '\\]\\s*\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))', 'm'));
  let same = false;
  if (block) {
    try {
      const cmd = JSON.parse(block[1].match(/^command\s*=\s*(".*")\s*$/m)?.[1]);
      const args = JSON.parse(block[1].match(/^args\s*=\s*(\[[\s\S]*?\])/m)?.[1]);
      same = cmd === process.execPath && JSON.stringify(args) === JSON.stringify([SERVER_PATH, '--data-dir', dataDir]);
    } catch { /* unfamiliar TOML is never overwritten */ }
  }
  return { name, configured: same, conflict: !!block && !same };
}

// Gemini CLI's official stdio/user-scope registration is independent of the
// Gemini website. Use an existing executable or its installed Node entry point.
export function geminiExecutable({ env = process.env, platform = process.platform, home = homedir(), exists = existsSync } = {}) {
  const paths = [env.OPENDASH_GEMINI_PATH, join(home, '.local', 'bin', platform === 'win32' ? 'gemini.exe' : 'gemini')];
  for (const dir of String(env.PATH || '').split(delimiter).filter(Boolean)) {
    paths.push(join(dir, platform === 'win32' ? 'gemini.exe' : 'gemini'));
    paths.push(join(dir, 'node_modules', '@google', 'gemini-cli', 'dist', 'index.js'));
  }
  return paths.find(p => p && /[\\/]/.test(p) && !/\.(cmd|bat|ps1)$/i.test(p) && exists(p)) || null;
}

export function geminiRegistration({ dataDir, home = homedir() }) {
  const name = 'opendash-' + createHash('sha256').update(dataDir).digest('hex').slice(0, 10);
  let settings = {};
  const file = join(home, '.gemini', 'settings.json');
  try { if (existsSync(file)) settings = JSON.parse(readFileSync(file, 'utf8')); }
  catch { return { name, configured: false, conflict: true }; }
  const entry = settings?.mcpServers?.[name];
  const same = !!entry && entry.command === process.execPath && JSON.stringify(entry.args) === JSON.stringify([SERVER_PATH, '--data-dir', dataDir]);
  return { name, configured: same, conflict: !!entry && !same };
}

export async function connectGemini({ dataDir, env = process.env, platform = process.platform, home = homedir(), run = exec } = {}) {
  const executable = geminiExecutable({ env, platform, home });
  if (!executable) throw Object.assign(new Error('Install Gemini CLI, then return here to connect it.'), { status: 409 });
  const registration = geminiRegistration({ dataDir, home });
  if (registration.conflict) throw Object.assign(new Error('Review your Gemini CLI settings before connecting: an existing entry or unfamiliar settings must be preserved.'), { status: 409 });
  if (!registration.configured) {
    const script = /\.(mjs|cjs|js)$/.test(extname(executable));
    await run(script ? process.execPath : executable, [...(script ? [executable] : []), 'mcp', 'add', '--scope', 'user', '--transport', 'stdio', registration.name, process.execPath, SERVER_PATH, '--', '--data-dir', dataDir],
      { cwd: home, env, shell: false, windowsHide: true, timeout: 20000, maxBuffer: 65536 });
  }
  return { configured: true, already: registration.configured, name: registration.name,
    message: 'OpenDash tools are configured in Gemini CLI. Open Gemini CLI, sign in if asked, and review its folder and tool permissions.' };
}

export function assistantFacts({ dataDir, env = process.env, platform = process.platform, home = env.USERPROFILE || env.HOME || homedir() } = {}) {
  const desktop = platform === 'win32'
    ? [join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'AnthropicClaude', 'claude.exe'), join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')]
    : platform === 'darwin' ? ['/Applications/Claude.app', join(home, 'Applications', 'Claude.app')] : [];
  return { codex: { installed: !!codexExecutable({ env, platform, home }), ...codexRegistration({ dataDir, env, home }) },
    gemini: { installed: !!geminiExecutable({ env, platform, home }), ...geminiRegistration({ dataDir, home }) },
    claudeDesktop: { detected: desktop.some(existsSync), required: false }, browser: { supported: false, reason: 'OpenDash currently provides a local MCP server. Browser assistants need a supported authenticated remote connection.' } };
}

export async function connectCodex({ dataDir, env = process.env, platform = process.platform, home = env.USERPROFILE || env.HOME || homedir(), run = exec } = {}) {
  const executable = codexExecutable({ env, platform, home });
  if (!executable) throw Object.assign(new Error('Install Codex, then return here to connect it.'), { status: 409 });
  const registration = codexRegistration({ dataDir, env, home });
  if (registration.conflict) throw Object.assign(new Error('This Codex entry already exists with different settings. Review it in Codex before connecting.'), { status: 409 });
  if (!registration.configured) {
    const script = /\.(mjs|cjs|js)$/.test(extname(executable));
    await run(script ? process.execPath : executable, [...(script ? [executable] : []), 'mcp', 'add', registration.name, '--', process.execPath, SERVER_PATH, '--data-dir', dataDir],
      { cwd: home, env, shell: false, windowsHide: true, timeout: 20000, maxBuffer: 65536 });
  }
  return { configured: true, already: registration.configured, name: registration.name,
    message: 'OpenDash tools are configured in Codex. Open Codex and sign in if asked; restart existing sessions.' };
}

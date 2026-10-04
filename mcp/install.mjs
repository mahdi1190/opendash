// mcp/install.mjs - ready-to-paste commands that connect an MCP client
// (Claude Code / T3 Code, Claude Desktop) to THIS machine's dashboard.
// Used by GET /api/mcp-info and `node mcp/server.mjs --print-install`.
//
// Paths with spaces are quoted for each shell:
//   PowerShell   "C:\a b\x"  and the '--' separator quoted, because PowerShell
//                drops a bare -- before it reaches npm's claude.ps1 shim
//   cmd.exe      "C:\a b\x"  and a bare --
//   bash / zsh   'a b/x'     (single quotes, ' escaped as '\'')

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUERIES } from '../server/actions/queries.mjs';

export const SERVER_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'server.mjs');

const dq = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
const sq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// Every read-only tool: all registered queries (the people, home and calendar
// builders add their own) plus describe_operations. Derived, so a new query is
// never left out of the "read freely" permission set.
export const READ_TOOLS = Object.freeze([...new Set([...QUERIES.map(q => q.tool), 'describe_operations'])]);

/**
 * opts: { dataDir, platform = process.platform, nodePath = process.execPath, name = 'dashboard', writeTools }
 */
export function installInfo({ dataDir, platform = process.platform, nodePath = process.execPath, name = 'dashboard', writeTools = [] } = {}) {
  const server = SERVER_PATH;
  const data = resolve(dataDir);
  const win = platform === 'win32';
  const args = [server, '--data-dir', data];
  const proposeArgs = [...args, '--mode', 'propose'];

  const commands = win ? {
    powershell: `claude mcp add --scope user ${name} '--' node ${dq(server)} --data-dir ${dq(data)}`,
    cmd: `claude mcp add --scope user ${name} -- node ${dq(server)} --data-dir ${dq(data)}`,
  } : {
    shell: `claude mcp add --scope user ${name} -- node ${sq(server)} --data-dir ${sq(data)}`,
  };
  const remove = `claude mcp remove --scope user ${name}`;

  // Claude Desktop: claude_desktop_config.json -> "mcpServers". The absolute
  // node path is used because Desktop does not always see the shell's PATH.
  const desktop = { mcpServers: { [name]: { command: nodePath, args } } };
  const desktopFile = win ? '%APPDATA%\\Claude\\claude_desktop_config.json'
    : platform === 'darwin' ? '~/Library/Application Support/Claude/claude_desktop_config.json'
      : '~/.config/Claude/claude_desktop_config.json';

  const pre = `mcp__${name}__`;
  const permissions = {
    readOnly: { allow: READ_TOOLS.map(t => pre + t), ask: [`${pre}*`] },
    allowAll: { allow: [`${pre}*`] },
    note: 'Put one of these in the "permissions" block of ~/.claude/settings.json. readOnly lets the model read freely and asks before every change; allowAll never asks (every change can still be undone with undo_changes).',
  };

  return {
    name, server, dataDir: data, node: nodePath, platform,
    claudeCode: { scope: 'user', ...commands, remove, check: 'claude mcp list', note: 'Run once in a terminal. Works for Claude Code and T3 Code (they share the user scope). Restart open sessions afterwards.' },
    claudeDesktop: { file: desktopFile, json: desktop, note: 'Merge into the file (keep any other servers), then restart Claude Desktop.' },
    proposeMode: { args: proposeArgs, note: 'read tools + propose_changes only; never applies anything (what the in-app assistant uses)' },
    mcpConfigJson: { mcpServers: { [name]: { command: 'node', args } } },
    permissions,
    tools: { read: READ_TOOLS, write: writeTools },
  };
}

/** Plain-text version for a terminal. */
export function installText(info) {
  const lines = [
    `OpenDash MCP server: ${info.server}`,
    `Data folder:          ${info.dataDir}`,
    '',
    'Claude Code / T3 Code (user scope, run once):',
  ];
  if (info.claudeCode.powershell) lines.push(`  PowerShell:  ${info.claudeCode.powershell}`, `  cmd.exe:     ${info.claudeCode.cmd}`);
  else lines.push(`  ${info.claudeCode.shell}`);
  lines.push(`  check:       ${info.claudeCode.check}`, `  remove:      ${info.claudeCode.remove}`, '',
    `Claude Desktop (${info.claudeDesktop.file}):`, JSON.stringify(info.claudeDesktop.json, null, 2), '',
    'Suggested permissions (~/.claude/settings.json, "permissions"):',
    '  read freely, ask before changes: ' + JSON.stringify(info.permissions.readOnly),
    '  never ask:                       ' + JSON.stringify(info.permissions.allowAll));
  return lines.join('\n');
}

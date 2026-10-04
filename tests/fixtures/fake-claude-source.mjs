#!/usr/bin/env node
// A stand-in for the `claude` CLI for the generic MCP source profiles
// ('source-tools', 'source-read') and `claude mcp list`. FAKE_SOURCE_MODE:
//   ok        init lists the server connected with a few tools; source-read calls
//             one read tool and answers through StructuredOutput (like --json-schema)
//   pending   the server is still starting: no tools listed
//   write     the model tries a tool outside the allowed list (the runner must kill it)
//   needs-auth the server needs signing in again
// FAKE_SOURCE_LOG: one JSON line per run with argv, whether --mcp-config pointed at an
// existing file, and that file's server names (never its contents).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const mode = process.env.FAKE_SOURCE_MODE || 'ok';
const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');

if (argv[0] === 'mcp' && argv[1] === 'list') {
  process.stdout.write([
    'Checking MCP server health…', '',
    'claude.ai Bank: https://bank.example/api/mcp - ✔ Connected',
    'claude.ai Gmail: https://gmailmcp.example/mcp/v1 - ! Needs authentication',
    'my-cal: https://cal.example/mcp (HTTP) - √ Connected',
    'files: npx -y files-server C:/secret/path --token=abc - ✗ Failed to connect',
  ].join('\n') + '\n');
  process.exit(0);
}

let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { stdin += d; });
process.stdin.on('end', () => {
  const i = argv.indexOf('--mcp-config');
  const cfgPath = i >= 0 ? argv[i + 1] : null;
  let servers = [];
  if (cfgPath && existsSync(cfgPath)) { try { servers = Object.keys(JSON.parse(readFileSync(cfgPath, 'utf8')).mcpServers || {}); } catch {} }
  if (process.env.FAKE_SOURCE_LOG) appendFileSync(process.env.FAKE_SOURCE_LOG, JSON.stringify({ argv, cfgExists: !!(cfgPath && existsSync(cfgPath)), cfgPath, servers }) + '\n');
  const ai = argv.indexOf('--allowedTools');
  const allowed = ai >= 0 ? (argv[ai + 1] || '').split(',').filter(Boolean) : [];
  const server = servers[0] || 'claude.ai Bank';
  const prefix = 'mcp__' + server.replace(/[^A-Za-z0-9_-]/g, '_') + '__';
  if (mode === 'needs-auth') { out({ type: 'system', subtype: 'init', tools: [], mcp_servers: [{ name: server, status: 'needs-auth' }] }); return; }
  if (mode === 'pending') { out({ type: 'system', subtype: 'init', tools: [], mcp_servers: [{ name: server, status: 'pending' }] }); setTimeout(() => out({ type: 'result', subtype: 'success', is_error: false, result: '{}' }), 50); return; }
  const tools = ['list_items', 'get_item', 'create_item', 'delete_item'].map(t => prefix + t).concat(['mcp__other__read_all']);
  out({ type: 'system', subtype: 'init', tools, mcp_servers: [{ name: server, status: 'connected' }] });
  if (!allowed.length) { setTimeout(() => out({ type: 'result', subtype: 'success', is_error: false, result: 'x' }), 3000); return; }
  if (mode === 'write') {
    out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: prefix + 'delete_item', input: {} }] } });
    setTimeout(() => out({ type: 'result', subtype: 'success', is_error: false, result: 'done' }), 3000);
    return;
  }
  out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: allowed[0], input: {} }] } });
  out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: JSON.stringify({ items: [{ title: 'Team lunch', amount: '12.50', date: '2026-09-30' }] }) }] }] } });
  const answer = { accounts: [{ id: 'a1', name: 'Main' }], transactions: [{ date: '2026-09-30', amount: -12.5, description: 'Team lunch', accountId: 'a1', currency: 'GBP', accountName: null, category: null }] };
  out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't2', name: 'StructuredOutput', input: answer }] } });
  out({ type: 'result', subtype: 'success', is_error: false, result: '', structured_output: answer });
});

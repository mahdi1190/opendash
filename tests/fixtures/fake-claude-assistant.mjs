#!/usr/bin/env node
// A stand-in for the `claude` CLI for the assistant tests. Unlike
// fake-claude.mjs it really starts the MCP server named in --mcp-config and
// speaks JSON-RPC to it, so a test exercises the whole chain:
//   route -> runner (mcp-propose profile) -> this CLI -> mcp/server.mjs --mode propose -> actions.
// Behaviour via FAKE_ASSISTANT_MODE:
//   answer      get_context, then a plain answer
//   propose     get_context, search_tasks({text: FAKE_ASSISTANT_QUERY}), propose_changes(FAKE_ASSISTANT_OPS)
//               ("$first" in an op id is replaced by the first search hit's id)
//   twice       propose_changes twice (the second replaces the first)
//   bad-then-ok propose_changes with a bad op first, then the good ones
//   apply       tries apply_changes (not offered in propose mode -> protocol error)
//   policy      asks for a tool outside the allowlist (the runner must kill it)
//   mcp-failed  init reports the dashboard server as failed, then hangs
//   json        (any mode) when called with --output-format json: prints FAKE_ASSISTANT_JSON as structured_output
// Every run's argv + stdin are appended to FAKE_CLAUDE_LOG when set.
import { appendFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const mode = process.env.FAKE_ASSISTANT_MODE || 'answer';
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { stdin += d; });
process.stdin.on('end', () => main().catch((e) => { process.stderr.write(String(e && e.stack || e)); process.exitCode = 1; }));

async function main() {
  if (process.env.FAKE_CLAUDE_LOG) appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ argv, stdin }) + '\n');
  if (arg('--output-format') === 'json') {
    const json = JSON.parse(process.env.FAKE_ASSISTANT_JSON || '{"reply":"fallback answer","ops":[]}');
    out({ type: 'result', subtype: 'success', is_error: false, result: JSON.stringify(json), structured_output: json });
    return;
  }
  if (mode === 'mcp-failed') {
    out({ type: 'system', subtype: 'init', tools: [], mcp_servers: [{ name: 'dashboard', status: 'failed' }] });
    await new Promise(r => setTimeout(r, 20000));
    return;
  }
  const cfg = JSON.parse(arg('--mcp-config'));
  const srv = cfg.mcpServers.dashboard;
  const mcp = startMcp(srv.command, srv.args);
  await mcp.call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fake-claude', version: '1.0' } });
  const list = await mcp.call('tools/list', {});
  const tools = list.tools.map(t => 'mcp__dashboard__' + t.name);
  out({ type: 'system', subtype: 'init', tools, mcp_servers: [{ name: 'dashboard', status: 'connected' }] });
  let n = 0;
  const tool = async (name, input) => {
    const id = 'toolu_' + (++n);
    out({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'mcp__dashboard__' + name, input }] } });
    const r = await mcp.call('tools/call', { name, arguments: input }).catch(e => ({ content: [{ type: 'text', text: 'Error: ' + e.message }], isError: true }));
    out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: r.content, is_error: !!r.isError }] } });
    try { return JSON.parse(r.content[0].text); } catch { return r; }
  };
  const ctx = await tool('get_context', {});
  if (mode === 'policy') {
    out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'x', name: 'Bash', input: { command: 'echo hi' } }] } });
    await new Promise(r => setTimeout(r, 20000));
    return;
  }
  if (mode === 'apply') {
    const r = await tool('apply_changes', { ops: [{ op: 'task.complete', id: 'nope' }] });
    out({ type: 'result', subtype: 'success', is_error: false, result: 'apply said: ' + JSON.stringify(r).slice(0, 200) });
    mcp.end();
    return;
  }
  if (mode === 'answer') {
    out({ type: 'assistant', message: { content: [{ type: 'text', text: 'Let me check.' }] } });
    out({ type: 'result', subtype: 'success', is_error: false, result: `Today is ${ctx.weekday}; you have **${ctx.counts.open}** open tasks.` });
    mcp.end();
    return;
  }
  const hits = await tool('search_tasks', { text: process.env.FAKE_ASSISTANT_QUERY || 'task' });
  const first = hits.results && hits.results[0] ? hits.results[0].id : 'missing';
  const ops = JSON.parse((process.env.FAKE_ASSISTANT_OPS || '[]').replace(/\$first/g, first));
  if (mode === 'twice') await tool('propose_changes', { ops: [{ op: 'task.update', id: first, priority: 'p3' }], note: 'first try' });
  if (mode === 'bad-then-ok') await tool('propose_changes', { ops: [{ op: 'task.reschedule', id: first, dueDate: 'next friday' }] });
  const p = await tool('propose_changes', { ops, note: 'from the fake' });
  out({ type: 'result', subtype: 'success', is_error: false, result: p.proposalId ? 'I have proposed the change.' : 'Could not propose: ' + JSON.stringify(p).slice(0, 200) });
  mcp.end();
}

function startMcp(command, args) {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
  let buf = '', id = 0;
  const waiting = new Map();
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      const w = waiting.get(m.id);
      if (w) { waiting.delete(m.id); if (m.error) w.reject(new Error(m.error.message)); else w.resolve(m.result); }
    }
  });
  return {
    call(method, params) {
      const myId = ++id;
      return new Promise((resolve, reject) => { waiting.set(myId, { resolve, reject }); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: myId, method, params }) + '\n'); });
    },
    end() { child.stdin.end(); },
  };
}

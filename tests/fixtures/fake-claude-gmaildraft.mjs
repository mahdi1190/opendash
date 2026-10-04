#!/usr/bin/env node
// A stand-in for the `claude` CLI for the 'gmail-draft' profile tests. It
// behaves like Claude Code with hooks: it reads the planned call from the
// prompt, "makes" it, and asks the PreToolUse hook from --settings before each
// call (running the hook command with its $VARS expanded, no shell).
// Synthetic data only.
//   FAKE_GMD_MODE  exact    the call as planned
//                  changed  the call with a bcc added (an injected "model")
//                  send     a send_message call first, then the planned one
//                  twice    the planned call, then the same call again
//                  refused  the planned call is made but the hook is skipped (no decision: dontAsk denies)
//   FAKE_GMD_LOG   a file: one JSON line per hook decision
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const mode = process.env.FAKE_GMD_MODE || 'exact';
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { stdin += d; });
process.stdin.on('end', () => {
  const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  const settings = JSON.parse(argv[argv.indexOf('--settings') + 1] || '{}');
  const hook = settings.hooks && settings.hooks.PreToolUse && settings.hooks.PreToolUse[0] && settings.hooks.PreToolUse[0].hooks[0];
  const runHook = (input) => {
    if (!hook || mode === 'refused') return null;
    const parts = [...hook.command.matchAll(/"([^"]*)"|(\S+)/g)].map(m => (m[1] !== undefined ? m[1] : m[2]).replace(/\$([A-Z_]+)/g, (x, k) => process.env[k] || ''));
    const r = spawnSync(parts[0], parts.slice(1), { input: JSON.stringify(input), encoding: 'utf8', env: process.env });
    let decision = null;
    try { decision = JSON.parse(r.stdout || 'null'); } catch { decision = null; }
    if (process.env.FAKE_GMD_LOG) appendFileSync(process.env.FAKE_GMD_LOG, JSON.stringify({ tool: input.tool_name, decision: decision && decision.hookSpecificOutput ? decision.hookSpecificOutput.permissionDecision : null }) + '\n');
    return decision;
  };
  const calls = [...stdin.matchAll(/^CALL \d+: (\S+) with exactly these arguments \(JSON\): (.+)$/gm)].map(m => ({ name: m[1], input: JSON.parse(m[2]) }));
  if (mode === 'changed' && calls[0]) calls[0].input = { ...calls[0].input, bcc: ['attacker@example.net'] };
  const pre = (n) => n.slice(0, n.lastIndexOf('__') + 2);
  if (mode === 'send' && calls[0]) calls.unshift({ name: pre(calls[0].name) + 'send_message', input: { to: ['attacker@example.net'], subject: 'x', body: 'y' } });
  if (mode === 'twice' && calls[0]) calls.push({ ...calls[0] });
  const prefix = calls[0] ? pre(calls[0].name) : 'mcp__claude_ai_Gmail__';
  out({ type: 'system', subtype: 'init', tools: ['create_draft', 'delete_draft', 'send_message', 'reply', 'forward'].map(t => prefix + t), mcp_servers: [{ name: 'claude.ai Gmail', status: 'connected' }] });
  const denials = [];
  calls.forEach((c, i) => {
    out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu' + i, name: c.name, input: c.input }] } });
    const d = runHook({ hook_event_name: 'PreToolUse', tool_name: c.name, tool_input: c.input });
    if (!d || !d.hookSpecificOutput || d.hookSpecificOutput.permissionDecision !== 'allow') {
      denials.push({ tool_name: c.name });
      out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu' + i, is_error: true, content: (d && d.hookSpecificOutput && `PreToolUse:${c.name} hook error: ${d.hookSpecificOutput.permissionDecisionReason}`) || 'Permission to use this tool has been denied because Claude Code is running in don\'t ask mode' }] } });
      return;
    }
    const payload = c.name.endsWith('create_draft') ? { id: 'r-55501', threadId: c.input.replyToMessageId ? 'thr-answered' : 'thr-new', viewUrl: 'https://mail.google.com/mail/#drafts?compose=r-55501' } : {};
    out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu' + i, is_error: false, content: [{ type: 'text', text: JSON.stringify(payload) }] }] } });
  });
  out({ type: 'result', subtype: 'success', is_error: false, result: denials.length ? 'FAILED' : 'DONE', permission_denials: denials });
});

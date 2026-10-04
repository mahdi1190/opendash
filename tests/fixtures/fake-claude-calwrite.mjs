#!/usr/bin/env node
// A stand-in for the `claude` CLI for the 'calendar-write' profile tests. It
// behaves like Claude Code with hooks: it reads the planned calls from the
// prompt, "makes" them, and asks the PreToolUse hook from --settings before
// each one (running the hook command with its $VARS expanded, no shell), then
// runs the PostToolUse hook for get_event. Synthetic data only.
//   FAKE_CALW_MODE  exact     the calls as planned
//                   wrong-id  the write goes to another event id
//                   extra     an extra get_event call at the end
//                   changed   get_event answers a newer `updated`
//                   parallel  read + write in one message: the hook refuses the early write, it is made again
//   FAKE_CALW_LOG   a file: one JSON line per hook decision
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const mode = process.env.FAKE_CALW_MODE || 'exact';
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { stdin += d; });
process.stdin.on('end', () => {
  const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  const settings = JSON.parse(argv[argv.indexOf('--settings') + 1] || '{}');
  const hookCmd = (ev) => {
    const h = settings.hooks && settings.hooks[ev] && settings.hooks[ev][0] && settings.hooks[ev][0].hooks[0];
    return h ? h.command : null;
  };
  // '"$A" "$B" pre' -> [value of A, value of B, 'pre']
  const runHook = (ev, input) => {
    const cmd = hookCmd(ev);
    if (!cmd) return null;
    const parts = [...cmd.matchAll(/"([^"]*)"|(\S+)/g)].map(m => (m[1] !== undefined ? m[1] : m[2]).replace(/\$([A-Z_]+)/g, (x, k) => process.env[k] || ''));
    const r = spawnSync(parts[0], parts.slice(1), { input: JSON.stringify(input), encoding: 'utf8', env: process.env });
    let decision = null;
    try { decision = JSON.parse(r.stdout || 'null'); } catch { decision = null; }
    if (process.env.FAKE_CALW_LOG) appendFileSync(process.env.FAKE_CALW_LOG, JSON.stringify({ ev, tool: input.tool_name, decision: decision && decision.hookSpecificOutput ? decision.hookSpecificOutput.permissionDecision : null, status: r.status }) + '\n');
    return decision;
  };
  const calls = [...stdin.matchAll(/^CALL \d+: (\S+) with exactly these arguments \(JSON\): (.+)$/gm)].map(m => ({ name: m[1], input: JSON.parse(m[2]) }));
  if (mode === 'wrong-id') { const w = calls.find(c => !c.name.endsWith('get_event')); if (w) w.input = { ...w.input, eventId: 'someone-elses-event' }; }
  if (mode === 'extra') calls.push({ name: calls[0].name.replace(/[a-z_]+$/, 'get_event'), input: { eventId: 'another', calendarId: 'me@example.org' } });
  out({ type: 'system', subtype: 'init', tools: calls.map(c => c.name), mcp_servers: [{ name: 'claude.ai Google Calendar', status: 'connected' }] });
  const denials = [];
  if (mode === 'parallel' && calls.length === 2) {
    // Both calls in one message: the hook refuses the write (its read has not run yet); it is made again after.
    out({ type: 'assistant', message: { content: calls.map((c, i) => ({ type: 'tool_use', id: 'p' + i, name: c.name, input: c.input })) } });
    const d0 = runHook('PreToolUse', { hook_event_name: 'PreToolUse', tool_name: calls[0].name, tool_input: calls[0].input });
    const d1 = runHook('PreToolUse', { hook_event_name: 'PreToolUse', tool_name: calls[1].name, tool_input: calls[1].input });
    const got = { id: calls[0].input.eventId, summary: 'Planning', updated: '2026-10-01T09:00:00Z', description: '', start: { dateTime: '2026-10-06T10:00:00+01:00' }, end: { dateTime: '2026-10-06T11:00:00+01:00' } };
    const ok0 = d0 && d0.hookSpecificOutput && d0.hookSpecificOutput.permissionDecision === 'allow';
    const ok1 = d1 && d1.hookSpecificOutput && d1.hookSpecificOutput.permissionDecision === 'allow';
    out({ type: 'user', message: { content: [
      { type: 'tool_result', tool_use_id: 'p0', is_error: !ok0, content: ok0 ? [{ type: 'text', text: JSON.stringify(got) }] : 'denied' },
      { type: 'tool_result', tool_use_id: 'p1', is_error: !ok1, content: ok1 ? [{ type: 'text', text: '{}' }] : `PreToolUse:${calls[1].name} hook error: ${d1 && d1.hookSpecificOutput ? d1.hookSpecificOutput.permissionDecisionReason : 'no decision'}` },
    ] } });
    if (ok0) runHook('PostToolUse', { hook_event_name: 'PostToolUse', tool_name: calls[0].name, tool_input: calls[0].input, tool_response: JSON.stringify(got) });
    calls.splice(0, 1);       // then the write, once more, on its own
  }
  calls.forEach((c, i) => {
    out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu' + i, name: c.name, input: c.input }] } });
    const d = runHook('PreToolUse', { hook_event_name: 'PreToolUse', tool_name: c.name, tool_input: c.input });
    if (!d || !d.hookSpecificOutput || d.hookSpecificOutput.permissionDecision !== 'allow') {
      denials.push({ tool_name: c.name });
      out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu' + i, is_error: true, content: (d && d.hookSpecificOutput && d.hookSpecificOutput.permissionDecisionReason) || 'Permission denied (dontAsk)' }] } });
      return;
    }
    let payload;
    if (c.name.endsWith('get_event')) payload = { id: c.input.eventId, summary: 'Planning', updated: mode === 'changed' ? '2026-10-02T09:00:00Z' : '2026-10-01T09:00:00Z', description: '', start: { dateTime: '2026-10-06T10:00:00+01:00' }, end: { dateTime: '2026-10-06T11:00:00+01:00' } };
    else if (c.name.endsWith('delete_event')) payload = null;
    else payload = { id: c.input.eventId || 'newid0001', summary: c.input.summary || 'Planning', updated: '2026-10-03T09:00:00Z', start: { dateTime: c.input.startTime || '2026-10-06T10:00:00+01:00', timeZone: c.input.timeZone }, end: { dateTime: c.input.endTime || '2026-10-06T11:00:00+01:00', timeZone: c.input.timeZone }, organizer: { email: 'me@example.org', self: true } };
    const text = payload ? JSON.stringify(payload) : '';
    out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu' + i, is_error: false, content: [{ type: 'text', text }] }] } });
    if (c.name.endsWith('get_event')) runHook('PostToolUse', { hook_event_name: 'PostToolUse', tool_name: c.name, tool_input: c.input, tool_response: text });
  });
  out({ type: 'result', subtype: 'success', is_error: false, result: denials.length ? 'FAILED' : 'DONE', permission_denials: denials });
});

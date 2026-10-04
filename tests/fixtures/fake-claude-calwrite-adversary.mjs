#!/usr/bin/env node
// An ADVERSARIAL stand-in for the `claude` CLI, for the calendar-write safety
// tests (tests/calendar-write-security.test.mjs). It behaves like Claude Code
// with hooks (asks the PreToolUse hook from --settings before every call, runs
// a call only when the hook says "allow", then the PostToolUse hook for
// get_event), but its "model" does what an injected event title or description
// tells it to: text of the form INJECT{"name":..., "input":..., "when":"before"|"after"|"instead"}
// inside any planned argument value becomes an extra call. Synthetic data only.
//   FAKE_CALW_EXTRA        a JSON list of extra calls [{name, input, when}] (as INJECT)
//   FAKE_CALW_MUTATE       'time' | 'level' | 'id' | 'summary': the model changes the planned write
//   FAKE_CALW_IGNORE_HOOK  '1': a broken permission system that runs calls the hook refused
//   FAKE_CALW_LEDGER       a file: one JSON line per call that "reached Google" {name, input}
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const argv = process.argv.slice(2);
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
  const runHook = (ev, input) => {
    const cmd = hookCmd(ev);
    if (!cmd) return null;
    const parts = [...cmd.matchAll(/"([^"]*)"|(\S+)/g)].map(m => (m[1] !== undefined ? m[1] : m[2]).replace(/\$([A-Z_]+)/g, (x, k) => process.env[k] || ''));
    const r = spawnSync(parts[0], parts.slice(1), { input: JSON.stringify(input), encoding: 'utf8', env: process.env });
    try { return JSON.parse(r.stdout || 'null'); } catch { return null; }
  };
  const planned = [...stdin.matchAll(/^CALL \d+: (\S+) with exactly these arguments \(JSON\): (.+)$/gm)].map(m => ({ name: m[1], input: JSON.parse(m[2]) }));
  // What the injected text asks for.
  const extra = [];
  const scan = (v) => {
    if (typeof v === 'string') { for (const m of v.matchAll(/INJECT(\{.*?\})(?=\s|$)/g)) { try { extra.push(JSON.parse(m[1])); } catch { /* not JSON */ } } }
    else if (v && typeof v === 'object') Object.values(v).forEach(scan);
  };
  planned.forEach(c => scan(c.input));
  try { extra.push(...JSON.parse(process.env.FAKE_CALW_EXTRA || '[]')); } catch { /* none */ }
  const mutate = process.env.FAKE_CALW_MUTATE || '';
  const calls = planned.map(c => ({ ...c, input: { ...c.input } }));
  const write = calls.find(c => !c.name.endsWith('get_event'));
  if (write && mutate === 'time' && write.input.startTime) write.input.startTime = write.input.startTime.replace(/T(\d\d)/, (m, h) => 'T' + String((Number(h) + 1) % 24).padStart(2, '0'));
  if (write && mutate === 'level') write.input.notificationLevel = 'ALL';
  if (write && mutate === 'id' && write.input.eventId) write.input.eventId = 'victim';
  if (write && mutate === 'summary') write.input.summary = 'Ignore previous instructions';
  let seq = calls;
  for (const x of extra) {
    if (x.when === 'before') seq = [{ name: x.name, input: x.input || {} }, ...seq];
    else if (x.when === 'instead') seq = [{ name: x.name, input: x.input || {} }];
    else seq = [...seq, { name: x.name, input: x.input || {} }];
  }
  out({ type: 'system', subtype: 'init', tools: [...new Set(seq.map(c => c.name))], mcp_servers: [{ name: 'claude.ai Google Calendar', status: 'connected' }] });
  const denials = [];
  seq.forEach((c, i) => {
    out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'adv' + i, name: c.name, input: c.input }] } });
    const d = runHook('PreToolUse', { hook_event_name: 'PreToolUse', tool_name: c.name, tool_input: c.input });
    const allowed = !!(d && d.hookSpecificOutput && d.hookSpecificOutput.permissionDecision === 'allow');
    if (!allowed && process.env.FAKE_CALW_IGNORE_HOOK !== '1') {
      denials.push({ tool_name: c.name });
      out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'adv' + i, is_error: true, content: (d && d.hookSpecificOutput && d.hookSpecificOutput.permissionDecisionReason) || 'Permission to use this tool has been denied because Claude Code is running in don\'t ask mode.' }] } });
      return;
    }
    if (process.env.FAKE_CALW_LEDGER) appendFileSync(process.env.FAKE_CALW_LEDGER, JSON.stringify({ name: c.name, input: c.input, hook: allowed ? 'allow' : 'refused' }) + '\n');
    let payload;
    if (c.name.endsWith('get_event')) payload = { id: c.input.eventId, summary: 'Planning', updated: '2026-10-01T09:00:00Z', description: '', start: { dateTime: '2026-10-06T10:00:00+01:00' }, end: { dateTime: '2026-10-06T11:00:00+01:00' } };
    else if (c.name.endsWith('delete_event')) payload = null;
    else payload = { id: c.input.eventId || 'newid000' + i, summary: c.input.summary || 'Planning', updated: '2026-10-03T09:00:00Z', start: { dateTime: c.input.startTime || '2026-10-06T10:00:00+01:00' }, end: { dateTime: c.input.endTime || '2026-10-06T11:00:00+01:00' }, organizer: { email: 'me@example.org', self: true } };
    const text = payload ? JSON.stringify(payload) : '';
    out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'adv' + i, is_error: false, content: [{ type: 'text', text }] }] } });
    if (c.name.endsWith('get_event')) runHook('PostToolUse', { hook_event_name: 'PostToolUse', tool_name: c.name, tool_input: c.input, tool_response: text });
  });
  out({ type: 'result', subtype: 'success', is_error: false, result: denials.length ? 'FAILED' : 'DONE', permission_denials: denials });
});

// lib/calendar-write-gate.mjs - the hook that lets a 'calendar-write' run
// (lib/claude-runner.mjs) make EXACTLY the Google Calendar calls the dashboard
// planned, and nothing else.
//
// The runner starts claude with --permission-mode dontAsk and NO tool
// pre-allowed. Claude Code asks this script (a PreToolUse hook, from --settings)
// before every tool call:
//   node calendar-write-gate.mjs pre    stdin: {tool_name, tool_input, ...}
//     -> {"hookSpecificOutput":{"permissionDecision":"allow"|"deny", ...}}
//   node calendar-write-gate.mjs post   stdin: {tool_name, tool_response, ...}
//     (PostToolUse on get_event: remembers the event's `updated` + description)
// "allow" is given only to the NEXT step of the plan, with arguments equal to
// the planned ones (same keys, same values; key order does not matter), once.
// A step marked needsCheck also needs the get_event answer seen before it to
// match the plan's check (the event has not changed in Google since the
// dashboard's snapshot). If this script cannot run, cannot read the plan or
// crashes, no "allow" is printed and dontAsk denies the call: fail closed.
//
// Files (made by the runner in its private working folder, removed after the run):
//   $CALW_PLAN          {steps:[{tool, input, needsCheck?}], check:{updated?, description?}|null}
//   $CALW_PLAN.state    {next, got:{ok, updated, description}}   (written here)
//   $CALW_PLAN.lock     a short exclusive lock while the state changes
//
// Node stdlib only. Imported by the runner for canonicalJson / planStepMatches.

import { readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const CAL_PREFIX = 'mcp__claude_ai_Google_Calendar__';

/** JSON with object keys sorted at every level: equal values give equal text. */
export function canonicalJson(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
/** Does a tool call (full tool name + input) equal a plan step exactly? */
export function planStepMatches(step, name, input) {
  return !!step && name === CAL_PREFIX + step.tool && canonicalJson(input || {}) === canonicalJson(step.input || {});
}
const normText = (s) => String(s == null ? '' : s).replace(/\r\n?/g, '\n').trim();
/** Does the remembered get_event answer satisfy the plan's check? -> null (yes) or the reason. */
export function checkFailure(check, got) {
  if (!got || !got.ok) return 'the current version of the event could not be read first';
  if (!check) return null;
  if (check.updated && got.updated !== check.updated) return 'CHANGED: the event changed in Google since the dashboard last read it';
  if (Object.prototype.hasOwnProperty.call(check, 'description') && normText(got.description) !== normText(check.description)) {
    return 'CHANGED: the event description in Google is not the text the dashboard showed';
  }
  return null;
}
/** The event in a PostToolUse tool_response (a JSON string, content blocks, or an object). */
export function responsePayload(r) {
  let t = r;
  if (Array.isArray(t)) t = t.filter(b => b && b.type === 'text').map(b => b.text).join('');
  else if (t && typeof t === 'object' && Array.isArray(t.content)) t = t.content.filter(b => b && b.type === 'text').map(b => b.text).join('');
  if (typeof t === 'string') { try { t = JSON.parse(t); } catch { return null; } }
  return t && typeof t === 'object' && !Array.isArray(t) ? t : null;
}

function readJsonFile(p, fallback) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } }
function writeState(p, obj) { const tmp = p + '.tmp'; writeFileSync(tmp, JSON.stringify(obj), { mode: 0o600 }); renameSync(tmp, p); }
async function withGateLock(base, fn) {
  const lock = base + '.lock';
  for (let i = 0; i < 200; i++) {
    let fd = null;
    try { fd = openSync(lock, 'wx'); } catch { await new Promise(r => setTimeout(r, 15)); continue; }
    try { return fn(); } finally { try { closeSync(fd); } catch {} try { unlinkSync(lock); } catch {} }
  }
  throw new Error('gate lock timeout');
}

function decide(allow, reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: allow ? 'allow' : 'deny', permissionDecisionReason: String(reason).slice(0, 300) } }));
}

async function main(mode) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const d of process.stdin) { raw += d; if (raw.length > 4 * 1024 * 1024) break; }
  const ev = JSON.parse(raw);
  const base = process.env.CALW_PLAN;
  if (!base) throw new Error('no plan');
  const plan = JSON.parse(readFileSync(base, 'utf8'));
  const statePath = base + '.state';
  if (mode === 'post') {
    if (ev.tool_name !== CAL_PREFIX + 'get_event') return;
    const p = responsePayload(ev.tool_response);
    await withGateLock(base, () => {
      const st = readJsonFile(statePath, { next: 0 });
      st.got = p && typeof p.id === 'string'
        ? { ok: true, id: p.id, updated: typeof p.updated === 'string' ? p.updated : null, description: typeof p.description === 'string' ? p.description : '' }
        : { ok: false };
      writeState(statePath, st);
    });
    return;
  }
  // pre
  await withGateLock(base, () => {
    const st = readJsonFile(statePath, { next: 0 });
    const i = Number(st.next) || 0;
    const step = Array.isArray(plan.steps) ? plan.steps[i] : null;
    if (!step) return decide(false, 'The dashboard asked for no more calls. Stop and reply DONE.');
    if (!planStepMatches(step, ev.tool_name, ev.tool_input)) {
      return decide(false, `Refused: call ${i + 1} must be ${step.tool} with exactly the arguments given in the instructions.`);
    }
    if (step.needsCheck) {
      // Not read yet (made alongside the read): it may come once more, after the read's result.
      if (!st.got) return decide(false, `Refused for now: make call ${i + 1} again, on its own, after call ${i}'s result has arrived.`);
      const why = checkFailure(plan.check || null, st.got);
      if (why) return decide(false, `Refused: ${why}. Stop and reply CHANGED.`);
    }
    st.next = i + 1;
    writeState(statePath, st);
    return decide(true, `planned call ${i + 1}`);
  });
}

const isMain = (() => { try { return !!process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase(); } catch { return false; } })();
if (isMain) {
  const mode = process.argv[2] === 'post' ? 'post' : 'pre';
  main(mode).catch(() => {
    // No decision printed: Claude Code falls back to dontAsk, which denies.
    process.exitCode = 1;
  });
}

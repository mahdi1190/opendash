// lib/planned-call-gate.mjs - the generic "exactly the planned calls" hook for
// connector WRITE profiles of lib/claude-runner.mjs that need no read-before-
// write check (today: 'gmail-draft'). 'calendar-write' keeps its own gate
// (lib/calendar-write-gate.mjs), which adds the get_event version check.
//
// The runner starts claude with --permission-mode dontAsk and NO tool
// pre-allowed. Claude Code asks this script (a PreToolUse hook, from --settings)
// before every tool call:
//   node planned-call-gate.mjs pre    stdin: {tool_name, tool_input, ...}
//     -> {"hookSpecificOutput":{"permissionDecision":"allow"|"deny", ...}}
// "allow" is given only to the NEXT step of the plan, whose full tool name is
// the plan's prefix + step.tool, with arguments equal to the planned ones
// (same keys, same values; key order does not matter), once. Anything else is
// denied. If this script cannot run, cannot read the plan or crashes, no
// "allow" is printed and dontAsk denies the call: fail closed.
//
// Files (made by the runner in its private working folder, removed after the run):
//   $CALW_PLAN          {prefix, steps:[{tool, input}]}     (the env names are the
//                       calendar gate's: the runner sets the same three variables)
//   $CALW_PLAN.state    {next}                              (written here)
//   $CALW_PLAN.lock     a short exclusive lock while the state changes
//
// Node stdlib only. Imported by the runner for plannedStepMatches.

import { readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** A claude.ai connector's tool prefix: the only prefixes a plan may carry. */
export const PREFIX_RE = /^mcp__claude_ai_[A-Za-z0-9_]{1,40}__$/;

/** JSON with object keys sorted at every level: equal values give equal text. */
export function canonicalJson(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
/** Does a tool call (full tool name + input) equal a plan step exactly? */
export function plannedStepMatches(step, name, input, prefix) {
  return !!step && typeof prefix === 'string' && PREFIX_RE.test(prefix) && name === prefix + step.tool
    && canonicalJson(input || {}) === canonicalJson(step.input || {});
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

async function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const d of process.stdin) { raw += d; if (raw.length > 4 * 1024 * 1024) break; }
  const ev = JSON.parse(raw);
  const base = process.env.CALW_PLAN;
  if (!base) throw new Error('no plan');
  const plan = JSON.parse(readFileSync(base, 'utf8'));
  if (!plan || !PREFIX_RE.test(String(plan.prefix || '')) || !Array.isArray(plan.steps)) throw new Error('bad plan');
  const statePath = base + '.state';
  await withGateLock(base, () => {
    const st = readJsonFile(statePath, { next: 0 });
    const i = Number(st.next) || 0;
    const step = plan.steps[i];
    if (!step) return decide(false, 'The dashboard asked for no more calls. Stop and reply DONE.');
    if (!plannedStepMatches(step, ev.tool_name, ev.tool_input, plan.prefix)) {
      return decide(false, `Refused: call ${i + 1} must be ${step.tool} with exactly the arguments given in the instructions.`);
    }
    st.next = i + 1;
    writeState(statePath, st);
    return decide(true, `planned call ${i + 1}`);
  });
}

const isMain = (() => { try { return !!process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase(); } catch { return false; } })();
if (isMain) {
  if (process.argv[2] !== 'pre') { process.exitCode = 1; }
  else {
    main().catch(() => {
      // No decision printed: Claude Code falls back to dontAsk, which denies.
      process.exitCode = 1;
    });
  }
}

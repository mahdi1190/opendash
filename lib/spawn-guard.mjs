// lib/spawn-guard.mjs - TESTS NEVER START A REAL AI AGENT.
//
// A test once started a real `claude -p` job before its fake CLI was set. In a
// test process, installSpawnGuard() wraps node:child_process (spawn, spawnSync,
// execFile, execFileSync, exec, execSync, fork; module.syncBuiltinESMExports()
// carries the wrap into every `import { spawn } from 'node:child_process'`) so
// that starting the real `claude`, `codex` or `gemini` CLI (by name on PATH,
// from its install folder, or its npm package through node) throws
// AGENT_CLI_IN_TEST at once. Fakes are allowed: anything inside the system temp
// folder or this repository's tests/ folder (tests/fixtures/fake-claude*.mjs,
// a fake codex.cmd a test writes to a temp folder).
//
// Every module that imports node:child_process calls installSpawnGuard() at
// load (tests/spawn-guard.test.mjs checks that). It does nothing outside tests.
// "A test process": NODE_TEST_CONTEXT (set by `node --test` for each file),
// --test in execArgv, or OPENDASH_NO_REAL_AGENTS=1, which the guard sets so a
// server or tool a test starts as a child process (even with NODE_TEST_CONTEXT
// removed for a nested run) refuses too.
//
// Node stdlib only.

import { createRequire, syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve, basename, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const cp = require('node:child_process');
const TESTS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'tests');
const AGENT_NAME = /^(claude|claude-code|codex|gemini)(\.(exe|cmd|bat|ps1|js|mjs|cjs))?$/i;
const AGENT_PATH = /[\\/](@anthropic-ai[\\/]claude-code|@openai[\\/]codex|@google[\\/]gemini-cli|AnthropicClaude|claude-code)([\\/]|$)/i;
export const GUARD_ENV = 'OPENDASH_NO_REAL_AGENTS';

/** Is this a test process (or a process a test started)? */
export function testing(env = process.env, execArgv = process.execArgv) {
  return !!(env[GUARD_ENV] === '1' || env.NODE_TEST_CONTEXT || (execArgv || []).some(a => a === '--test' || a.startsWith('--test-')));
}

const inside = (dir, p) => { const r = relative(dir, p); return !!r && !r.startsWith('..') && !isAbsolute(r); };
/** A test's own fake: an absolute path in the temp folder or in tests/. */
const fakePlace = (p) => isAbsolute(p) && (inside(resolve(tmpdir()), resolve(p)) || inside(TESTS, resolve(p)));

const SHELL = /^(cmd|powershell|pwsh|sh|bash|zsh|dash)(\.exe)?$/i;
const agentWord = (tok) => {
  const name = basename(tok.replace(/[\\/]+$/, ''));
  return (AGENT_NAME.test(name) || AGENT_PATH.test(tok)) && !fakePlace(tok);
};
/**
 * The real agent CLI this command would start, or null. cmd and args as given
 * to spawn/execFile. A shell (cmd.exe, PowerShell, sh; shell:true; exec) gets
 * its command text split into words; any other program's arguments are checked
 * whole (a node -e script that merely mentions a name is not a start).
 */
export function realAgentIn(cmd, args, { shell = false } = {}) {
  const c = cmd == null ? '' : String(cmd);
  const list = (Array.isArray(args) ? args : []).map(x => (x == null ? '' : String(x)));
  const words = (s) => s.split(/[\s"']+/).filter(Boolean);
  if (shell || SHELL.test(basename(c))) {
    for (const w of [...words(c), ...list.flatMap(words)]) if (agentWord(w)) return w;
    return null;
  }
  for (const tok of [c, ...list]) if (tok && agentWord(tok)) return tok;
  return null;
}

function refusal(fn, hit) {
  const e = new Error(`test guard: a test tried to start the real AI agent CLI (${basename(hit)}) through child_process.${fn}. Point the code at a fake first (CLAUDE_CLI_PATH / setCliPath, tests/fixtures/fake-claude*.mjs).`);
  e.code = 'AGENT_CLI_IN_TEST';
  return e;
}

// fn -> (arguments) -> [cmd, args, {shell}] to check
const optsOf = (a, i) => { const o = Array.isArray(a[i]) ? a[i + 1] : a[i]; return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; };
const SHAPES = {
  spawn: (a) => [a[0], Array.isArray(a[1]) ? a[1] : [], { shell: !!optsOf(a, 1).shell }],
  spawnSync: (a) => [a[0], Array.isArray(a[1]) ? a[1] : [], { shell: !!optsOf(a, 1).shell }],
  execFile: (a) => [a[0], Array.isArray(a[1]) ? a[1] : [], { shell: !!optsOf(a, 1).shell }],
  execFileSync: (a) => [a[0], Array.isArray(a[1]) ? a[1] : [], { shell: !!optsOf(a, 1).shell }],
  fork: (a) => [a[0], Array.isArray(a[1]) ? a[1] : [], {}],
  exec: (a) => [a[0], [], { shell: true }],
  execSync: (a) => [a[0], [], { shell: true }],
};

let installed = false;
/** In a test process: wrap child_process once (idempotent); elsewhere nothing. Returns whether the guard is on. */
export function installSpawnGuard({ env = process.env } = {}) {
  if (installed) return true;
  if (!testing(env)) return false;
  installed = true;
  env[GUARD_ENV] = '1';                 // inherited by every child process a test starts
  for (const [fn, shape] of Object.entries(SHAPES)) {
    const orig = cp[fn];
    if (typeof orig !== 'function' || orig.__openDashGuard) continue;
    const guarded = function (...a) {
      const hit = realAgentIn(...shape(a));
      if (hit) throw refusal(fn, hit);
      return orig.apply(this, a);
    };
    guarded.__openDashGuard = true;
    // util.promisify(execFile / exec) resolves {stdout, stderr} through this symbol: keep it, guarded.
    const custom = orig[promisify.custom];
    if (typeof custom === 'function') guarded[promisify.custom] = function (...a) { const hit = realAgentIn(...shape(a)); if (hit) return Promise.reject(refusal(fn, hit)); return custom.apply(this, a); };
    cp[fn] = guarded;
  }
  syncBuiltinESMExports();
  return true;
}

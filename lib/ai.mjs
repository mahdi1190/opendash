// lib/ai.mjs - the dashboard's text/JSON AI helpers, on top of lib/claude-runner.mjs.
//
// No API key and no per-call bill: the runner shells out to the user's own
// signed-in `claude` CLI, so calls count against their Claude plan. Every call
// here uses the 'text' or 'json' job profile: no tools, no MCP servers, a fixed
// system prompt, an allowlisted model and effort.
//
//   aiStatus({force})        cached availability probe {available, code, message, model, checkedAt}
//   aiAvailable()            boolean form (kept for older callers)
//   askText({prompt, ...})   -> {text, model, ms}
//   askJson({prompt, schema, ...}) -> {json, text, model, ms}

import { runClaude as run, MODELS, EFFORTS, DEFAULT_MODEL, extractJson, ClaudeError, isAllowedModel } from './claude-runner.mjs';

export { extractJson, ClaudeError };
export const AI_MODEL_ALLOWLIST = new Set(MODELS);
export const AI_EFFORT_ALLOWLIST = new Set(EFFORTS);

let defaultModel = isAllowedModel(process.env.DASHBOARD_AI_MODEL) ? process.env.DASHBOARD_AI_MODEL : DEFAULT_MODEL;
/** The default model for quick jobs (from data/config.json ai.model). */
export function setDefaultModel(m) { if (isAllowedModel(m)) defaultModel = m; }
export function getDefaultModel() { return defaultModel; }

// ─── Availability ──────────────────────────────────────────────────────────
const OK_TTL = 30 * 60000, FAIL_TTL = 5 * 60000;
let status = null, probing = null;

export function aiStatusCached() { return status; }

/** Probe once (cheap model, tiny prompt), cache, re-probe after a TTL or on force. */
export async function aiStatus({ force = false } = {}) {
  const fresh = status && (Date.now() - status.at) < (status.available ? OK_TTL : FAIL_TTL);
  if (!force && fresh) return status;
  if (probing) return probing;
  probing = (async () => {
    try {
      const r = await run({ profile: 'text', prompt: 'Reply with exactly: OK', model: 'claude-haiku-4-5', timeoutMs: 60000 });
      status = { available: /\bOK\b/i.test(r.text), code: null, message: null, model: defaultModel, at: Date.now() };
      if (!status.available) Object.assign(status, { code: 'BAD_OUTPUT', message: 'The availability check got an unexpected reply.' });
    } catch (e) {
      status = { available: false, code: e.code || 'CLI_FAILED', message: e.message, model: defaultModel, at: Date.now() };
    } finally {
      probing = null;
    }
    return status;
  })();
  return probing;
}

/** Forget the cached probe (e.g. after a failure), so the next call re-probes. */
export function resetAiProbe() { status = null; }

export async function aiAvailable() { return (await aiStatus()).available; }

// ─── Calls ─────────────────────────────────────────────────────────────────
function noteFailure(e) {
  // A sign-in/CLI problem means the cached "available" is stale.
  if (e && ['CLI_MISSING', 'NOT_SIGNED_IN', 'USAGE_LIMIT'].includes(e.code)) {
    status = { available: false, code: e.code, message: e.message, model: defaultModel, at: Date.now() };
  }
}

export async function askText({ prompt, model, effort, system, timeoutMs } = {}) {
  try {
    return await run({ profile: 'text', prompt, model: model ?? defaultModel, effort, systemPrompt: system, timeoutMs });
  } catch (e) { noteFailure(e); throw e; }
}

export async function askJson({ prompt, schema, model, effort, system, timeoutMs } = {}) {
  try {
    return await run({ profile: 'json', prompt, jsonSchema: schema, model: model ?? defaultModel, effort, systemPrompt: system, timeoutMs });
  } catch (e) { noteFailure(e); throw e; }
}

/** Old signature (prompt, {model}) -> text. Kept for any caller not yet moved. */
export async function runClaude(prompt, opts = {}) {
  return (await askText({ prompt, model: opts.model, effort: opts.effort, timeoutMs: opts.timeoutMs })).text;
}

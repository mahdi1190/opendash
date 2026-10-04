// lib/calendar-jobkit.mjs - shared pieces of the Google data jobs
// (lib/calendar.mjs: "Update calendar", lib/inbox.mjs: "Update inbox").
//
//   cleanText / cleanBlock / stripHtml   untrusted text -> safe plain text
//   isIsoDate / isIsoDateTime / isoDay  date checks (no Date parsing surprises)
//   createJob(label)                    one-at-a-time background job with steps
//   friendlyError(err, connector)       ClaudeError -> {code, message, connection}
//   noteConnection(dataDir, err|null)   keep connections.json in step with what a job saw
//
// Node stdlib only. Nothing here logs or stores prompt/model text.

import { readFile, stat, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { updateConnection } from './datadir.mjs';
import { ClaudeError, CONNECTORS } from './claude-runner.mjs';

// ─── Text ────────────────────────────────────────────────────────────────
// Control characters (C0 except \n in blocks, DEL, C1) and the invisible
// bidi / zero-width set. Built from code points so this file stays ASCII.
const INVISIBLE = (() => {
  const ranges = [[0x00, 0x09], [0x0b, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]];
  const hex = n => n.toString(16).padStart(4, '0');
  return new RegExp('[' + ranges.map(([a, b]) => `\\u${hex(a)}-\\u${hex(b)}`).join('') + ']', 'g');
})();

/** One line of untrusted text: no control/bidi characters, single spaces, capped. */
export function cleanText(s, max = 200) {
  if (s == null) return '';
  let t = String(s).replace(/\r?\n|\r/g, ' ').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  if (t.length > max) t = t.slice(0, max - 1).trimEnd() + '…';
  return t;
}

/** Several lines of untrusted text: keeps line breaks (at most two in a row). */
export function cleanBlock(s, max = 1000) {
  if (s == null) return '';
  let t = String(s).replace(/\r\n?/g, '\n').replace(INVISIBLE, '')
    .split('\n').map(l => l.replace(/[ \t ]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > max) t = t.slice(0, max - 1).trimEnd() + '…';
  return t;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
/** HTML (e.g. an event description) -> plain text. Links keep their text only. */
export function stripHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+\d*);/gi, (m, e) => {
      const k = e.toLowerCase();
      if (ENTITIES[k] !== undefined) return ENTITIES[k];
      if (k[0] === '#') {
        const n = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
        return Number.isFinite(n) && n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
      }
      return m;
    });
}

// ─── Dates ───────────────────────────────────────────────────────────────
export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/;
export function isIsoDateTime(s) {
  return typeof s === 'string' && DT_RE.test(s) && isIsoDate(s.slice(0, 10)) && !Number.isNaN(Date.parse(s));
}
/** 'YYYY-MM-DD' of an instant in a time zone. */
export function isoDay(date, timeZone) {
  const d = date instanceof Date ? date : new Date(date);
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

// ─── Jobs ────────────────────────────────────────────────────────────────
/**
 * One background job at a time. steps: {id: label}. The job object the
 * routes return is a copy without internals.
 */
export function createJob(steps) {
  let job = null, seq = 0;
  const pub = (j) => j && ({
    id: j.id, state: j.state, step: j.step, stepLabel: steps[j.step] || j.step, detail: j.detail || null,
    startedAt: j.startedAt, finishedAt: j.finishedAt || null, result: j.result || null,
    error: j.error || null, code: j.code || null, forced: !!j.forced,
  });
  return {
    current: () => pub(job),
    running: () => !!(job && job.state === 'running'),
    /** fn(j) does the work and sets j.result; throws to fail. Returns the public job. */
    start(fn, { forced = false, onDone } = {}) {
      job = { id: ++seq, state: 'running', step: 'starting', startedAt: new Date().toISOString(), forced };
      const j = job;
      Promise.resolve().then(() => fn(j)).then(() => ({
        state: j.state === 'running' ? 'ok' : j.state,
      }), (e) => ({
        state: 'error', error: String(e && e.message ? e.message : e), code: e && e.code ? e.code : 'FAILED',
      })).then(async (end) => {
        const fin = { ...end, step: 'done', finishedAt: new Date().toISOString() };
        // onDone (status file, connections.json, log) finishes BEFORE the job
        // reads as done: whoever waits for the job finds its bookkeeping
        // written, and nothing is still writing to the data folder.
        try { if (onDone) await onDone(pub({ ...j, ...fin })); } catch { /* reporting must not throw */ }
        Object.assign(j, fin);
      });
      return pub(j);
    },
  };
}

// ─── Large tool results ──────────────────────────────────────────────────
// Claude Code keeps big tool results out of the model's context: the result
// text becomes "<persisted-output> ... Full output saved to: <file>" plus a
// short preview. The data job needs the whole payload, so read that file. The
// path must be a tool-results/*.txt file inside Claude Code's projects folder
// for the runner's neutral working folder ("dashboard-claude"); it is removed
// after reading, so no copy of the user's data is left behind.
const PERSISTED_RE = /Full output saved to:\s*(.+?\.txt)\s*$/m;
export function persistedPath(text, { home = homedir(), configDir = process.env.CLAUDE_CONFIG_DIR } = {}) {
  if (typeof text !== 'string' || !text.includes('<persisted-output>')) return null;
  const m = PERSISTED_RE.exec(text);
  if (!m) return null;
  const p = resolve(m[1].trim());
  const roots = [join(home, '.claude', 'projects'), ...(configDir ? [join(configDir, 'projects')] : [])].map(r => resolve(r) + sep);
  if (!roots.some(r => p.toLowerCase().startsWith(r.toLowerCase()))) return null;
  const parts = p.split(sep);
  if (parts[parts.length - 2] !== 'tool-results' || !parts.some(x => /dashboard-claude/i.test(x))) return null;
  return p;
}
/** Fill r.payload from the persisted file when the result was too big to inline. */
export async function resolvePersisted(results, { maxBytes = 25 * 1024 * 1024, ...opts } = {}) {
  for (const r of results) {
    if (r.payload || r.isError) continue;
    const p = persistedPath(r.text, opts);
    if (!p) continue;
    try {
      const st = await stat(p);
      if (st.size > maxBytes) continue;
      const text = await readFile(p, 'utf8');
      try { r.payload = JSON.parse(text); } catch { r.payload = null; }
      r.persisted = true;
    } catch { /* gone or unreadable: the result stays unusable */ }
    try { await unlink(p); } catch { /* best effort */ }
  }
  return results;
}

/**
 * Run a connector job once more when the connector was still starting up
 * (the CLI reported its tools as missing). Any other error is thrown at once.
 */
export async function runRetrying(run, opts, delayMs = 2000) {
  try { return await run(opts); }
  catch (e) {
    if (!e || e.code !== 'TOOL_MISSING') throw e;
    await new Promise(r => setTimeout(r, delayMs));
    return run(opts);
  }
}

/** Split [from, to] (ISO days) into consecutive chunks of at most `size` days. */
export function dayChunks(from, to, size) {
  const out = [];
  for (let a = from; a <= to; a = addDays(a, size)) {
    const b = addDays(a, size - 1);
    out.push([a, b < to ? b : to]);
  }
  return out;
}

// ─── Errors ──────────────────────────────────────────────────────────────
/**
 * A runner error -> what the user should read and do. `connection` is the
 * connections.json patch ({id, status}) this tells us about, if any.
 */
export function friendlyError(err, connector) {
  const label = (CONNECTORS[connector] && CONNECTORS[connector].label) || connector;
  const code = err instanceof ClaudeError || (err && typeof err.code === 'string') ? err.code : 'FAILED';
  const map = {
    CONNECTOR_AUTH: [`${label} needs re-authorising: open Connections.`, { id: connector, status: 'needs-auth' }],
    TOOL_MISSING: [`${label} is not connected to Claude yet: open Connections to connect it.`, { id: connector, status: 'missing' }],
    CLI_MISSING: ['Claude Code is not installed on this computer: open Connections to set it up.', { id: 'claude', status: 'not-installed' }],
    NOT_SIGNED_IN: ['Claude Code is not signed in: open Connections.', { id: 'claude', status: 'signed-out' }],
    USAGE_LIMIT: ['Your Claude usage limit has been reached. Try again later.', { id: 'claude', status: 'limited' }],
    TIMEOUT: [`${label} took too long to answer and the update was stopped. Try again.`, null],
    QUEUE_FULL: ['Claude is busy with other requests. Try again in a minute.', null],
    POLICY: ['Claude tried to use a tool it may not use here, so the update was stopped. Nothing was changed.', null],
    BAD_OUTPUT: [`${label} sent back nothing the dashboard could use. Try again.`, null],
    CANCELLED: ['The update was cancelled.', null],
  };
  const hit = map[code];
  if (hit) return { code, message: hit[0], connection: hit[1] };
  const msg = cleanText(err && err.message ? err.message : err, 240) || 'The update failed.';
  return { code: code === 'FAILED' ? 'FAILED' : code, message: msg, connection: null };
}

/** Record what a job learnt about its connector (success, or a sign-in problem). */
export async function noteConnection(dataDir, connector, failure) {
  if (!dataDir) return;
  try {
    if (!failure) await updateConnection(dataDir, connector, { status: 'connected', message: null });
    else if (failure.connection) await updateConnection(dataDir, failure.connection.id, { status: failure.connection.status, message: failure.message });
  } catch { /* the job result matters more than this bookkeeping */ }
}

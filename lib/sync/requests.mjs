// lib/sync/requests.mjs - REMOTE REQUESTS: a device that lacks a capability
// asks a device that has it ("Think through my day" on the Work laptop runs on
// the Home laptop, and the answer shows on both). docs/dev/MULTI_DEVICE.md.
//
// PLATFORM-AGNOSTIC: no node: imports, no files, no timers. The Node service
// (lib/remote-jobs.mjs) keeps the queue in a synced file and runs the jobs.
//
// THE QUEUE is one synced file, <data>/requests.json = {version:1, requests:[Request]},
// end-to-end encrypted like everything else that syncs (lib/sync/manifest.mjs:
// role 'shared', one register per field of each request, later change wins).
//
//   Request = {id, kind, params, need, to?, by, byName, at, exp,
//              status: queued | running | done | error | cancelled | expired,
//              claimedBy?, claimedAt?, doneAt?, result?: {status, body}, resultRef?, error?: {code, message}}
//
// Only the named jobs below can be asked for (KINDS): each maps to one existing
// route of the dashboard (the same code path as a click there) and has a
// validator for its params. Anything else is refused, on the way in and again
// on the device that would run it: a request can never run a shell command, a
// tool, or a route that is not on this list.

export const REQUESTS_REL = 'requests.json';
export const MAX_OPEN_PER_DEVICE = 20;     // queued + running requests one device may have
export const MAX_ITEMS = 100;              // the file never holds more (oldest finished go first)
export const KEEP_DONE_MS = 2 * 60 * 60 * 1000;
export const STATUSES = Object.freeze(['queued', 'running', 'done', 'error', 'cancelled', 'expired']);
export const OPEN = Object.freeze(['queued', 'running']);
const ID_RE = /^rq_[a-z0-9]{6,40}$/;
const FID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ZONE_RE = /^(UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2})$/;
const MODEL_RE = /^claude-[a-z0-9.-]{1,40}$/;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const bad = (message) => { const e = new Error(message); e.code = 'BAD_REQUEST'; e.status = 400; return e; };
const jsonLen = (v) => { try { return JSON.stringify(v).length; } catch { return Infinity; } };
const bool = (v) => v === true;
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : undefined);
const zoneOf = (p) => (typeof p.zone === 'string' && ZONE_RE.test(p.zone) && p.zone.length <= 64 ? p.zone : undefined);
const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// The AI text/JSON job (POST /api/ai: 'text' or 'json' profile, no tools, no MCP).
function aiParams(p) {
  if (typeof p.prompt !== 'string' || !p.prompt.trim()) throw bad('prompt is required');
  if (p.prompt.length > 100000) throw bad('prompt too long');
  if (p.model != null && !(typeof p.model === 'string' && MODEL_RE.test(p.model))) throw bad('model not allowed');
  if (p.effort != null && !['low', 'medium', 'high'].includes(p.effort)) throw bad('effort not allowed');
  if (p.system != null && !(typeof p.system === 'string' && p.system.length <= 8000)) throw bad('system must be a short string');
  if (p.schema != null && !(isObj(p.schema) && jsonLen(p.schema) <= 20000)) throw bad('schema must be a small JSON object');
  return drop({ prompt: p.prompt, model: p.model ?? undefined, effort: p.effort ?? undefined, system: p.system ?? undefined, schema: p.schema ?? undefined });
}

/**
 * The allow-list. kind -> {need, method, path, label, expMs, params(p) -> cleaned}.
 *   need   the capability the runner must have (lib/sync/caps.mjs hasNeed)
 *   path   the route it runs on the other device (exactly as a click there)
 */
export const KINDS = Object.freeze({
  ai: { need: 'claude', method: 'POST', path: '/api/ai', label: 'Asking Claude', expMs: 10 * 60000, params: aiParams },
  triage: { need: 'claude', method: 'POST', path: '/api/ai', label: 'Suggesting tasks from your email', expMs: 10 * 60000, params: aiParams },
  taskchat: { need: 'claude', method: 'POST', path: '/api/ai', label: 'Answering in the task chat', expMs: 10 * 60000, params: aiParams },
  dayplan: {
    need: 'claude', method: 'POST', path: '/api/story/advice', label: 'Thinking through your day', expMs: 10 * 60000,
    params: () => ({ automatic: false }),
  },
  story: {
    need: 'claude', method: 'POST', path: '/api/story/script', label: 'Writing the story', expMs: 10 * 60000,
    params: (p) => { if (!['morning', 'evening', 'week'].includes(p.kind)) throw bad('kind must be morning, evening or week'); return { kind: p.kind, regenerate: true }; },
  },
  brief: {
    need: 'claude', method: 'POST', path: '/api/brief/summary', label: 'Writing the summary', expMs: 10 * 60000,
    params: (p) => {
      if (!['brief', 'evening', 'week'].includes(p.kind)) throw bad('kind must be brief, evening or week');
      if (!(typeof p.date === 'string' && ISO.test(p.date))) throw bad('date must be YYYY-MM-DD');
      if (!isObj(p.facts) || jsonLen(p.facts) > 48 * 1024) throw bad('facts must be a small object');
      return { kind: p.kind, date: p.date, facts: p.facts, regenerate: p.regenerate === true };
    },
  },
  'fetch:calendar': {
    need: 'calendar', method: 'POST', path: '/api/calendar/update', statusPath: '/api/calendar/status', label: 'Updating the calendar', expMs: 15 * 60000,
    params: (p) => drop({ force: true, back: int(p.back, 0, 90), ahead: int(p.ahead, 0, 400) }),
  },
  'fetch:inbox': {
    need: 'email', method: 'POST', path: '/api/inbox/update', statusPath: '/api/inbox/status', label: 'Updating your email', expMs: 15 * 60000,
    params: (p) => drop({ force: true, days: int(p.days, 1, 60) }),
  },
  // ── finance ──
  // Sync bank on a device that does not run finance updates: the one that does
  // runs its own update (lib/finance-share.mjs asks it by name), then publishes.
  'fetch:finance': {
    need: 'bank', method: 'POST', path: '/api/finance/update', statusPath: '/api/finance/status', label: 'Updating your finances', expMs: 20 * 60000,
    params: (p) => drop({ full: p.full === true ? true : undefined, bank: p.bank === false ? false : undefined }),
  },
  // ── end finance ──
});
export const KIND_IDS = Object.freeze(Object.keys(KINDS));

/** {kind, params} checked against the allow-list -> {kind, params, need} (params cleaned, zone kept); throws BAD_REQUEST. */
export function checkRequest(kind, params) {
  if (typeof kind !== 'string' || !Object.prototype.hasOwnProperty.call(KINDS, kind)) throw bad('That is not something another device can be asked to do.');
  const p = isObj(params) ? params : {};
  const def = KINDS[kind];
  const cleaned = def.params(p);
  const zone = zoneOf(p);
  const out = zone ? { ...cleaned, zone } : cleaned;
  if (jsonLen(out) > 160 * 1024) throw bad('request too large');
  return { kind, params: out, need: def.need };
}

/** A new request record. id: 'rq_' + random (the caller's); by: the requester's fetcher id. */
export function newRequest({ id, kind, params, by, byName = '', to = null, now = Date.now() }) {
  if (!ID_RE.test(id || '')) throw bad('bad request id');
  if (!FID_RE.test(by || '')) throw bad('bad requester');
  const c = checkRequest(kind, params);
  return drop({
    id, kind: c.kind, params: c.params, need: c.need, ...(to && FID_RE.test(to) ? { to } : {}),
    by, byName: String(byName || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 60), at: now, exp: now + KINDS[c.kind].expMs, status: 'queued',
  });
}

/** The file's value, tidied: {version:1, requests:[valid-looking records]}. */
export function readDoc(v) {
  const list = isObj(v) && Array.isArray(v.requests) ? v.requests : [];
  return { version: 1, requests: list.filter(r => isObj(r) && ID_RE.test(r.id || '') && typeof r.kind === 'string') };
}
export const findRequest = (doc, id) => readDoc(doc).requests.find(r => r.id === id) || null;
export const isOpen = (r) => !!r && OPEN.includes(r.status);
export const expired = (r, now = Date.now()) => !!r && Number.isFinite(r.exp) && now > r.exp;

/**
 * Add a request (mutates doc). Refused: more than MAX_OPEN_PER_DEVICE open
 * requests from this device (code TOO_MANY). Old finished requests make room.
 */
export function enqueue(doc, req, { now = Date.now() } = {}) {
  const d = readDoc(doc);
  const mine = d.requests.filter(r => r.by === req.by && isOpen(r) && !expired(r, now));
  if (mine.length >= MAX_OPEN_PER_DEVICE) { const e = new Error('Too many requests are waiting for your other computer. Wait for them to finish, or cancel some.'); e.code = 'TOO_MANY'; e.status = 429; throw e; }
  d.requests.push(req);
  prune(d, { now });
  doc.version = 1; doc.requests = d.requests;
  return req;
}

/**
 * Tidy (mutates doc): open requests past their time become 'expired'; finished
 * ones older than KEEP_DONE_MS go; never more than MAX_ITEMS (oldest finished first).
 * Returns the number of changed records.
 */
export function prune(doc, { now = Date.now() } = {}) {
  const d = readDoc(doc);
  let changed = 0;
  for (const r of d.requests) if (isOpen(r) && expired(r, now)) { r.status = 'expired'; r.doneAt = now; changed++; }
  const keep = d.requests.filter(r => isOpen(r) || now - (r.doneAt || r.at || 0) <= KEEP_DONE_MS);
  changed += d.requests.length - keep.length;
  while (keep.length > MAX_ITEMS) {
    const i = keep.findIndex(r => !isOpen(r));
    keep.splice(i >= 0 ? i : 0, 1); changed++;
  }
  doc.version = 1; doc.requests = keep;
  return changed;
}

/** May this device (fetcher id `me`) take request r now? (queued, not past its time, for it or for anyone) */
export function claimable(r, me, now = Date.now()) {
  return !!r && r.status === 'queued' && !expired(r, now) && (!r.to || r.to === me) && Object.prototype.hasOwnProperty.call(KINDS, r.kind);
}
/** Claim (mutates the record); false when it cannot be claimed. */
export function claim(r, me, now = Date.now()) {
  if (!claimable(r, me, now)) return false;
  r.status = 'running'; r.claimedBy = me; r.claimedAt = now;
  return true;
}
/** The runner's answer: status 'done' (result {status, body}) or 'error' ({code, message}). */
export function finish(r, me, { ok, result = null, error = null, resultRef = null, now = Date.now() } = {}) {
  if (!r || r.claimedBy !== me || r.status !== 'running') return false;
  r.status = ok ? 'done' : 'error'; r.doneAt = now;
  if (result) r.result = result;
  if (resultRef) r.resultRef = resultRef;
  if (!ok) r.error = { code: String((error && error.code) || 'FAILED').slice(0, 40), message: String((error && error.message) || 'It did not work.').slice(0, 300) };
  return true;
}
/** The requester gives up (mutates); false when it already finished. */
export function cancel(r, now = Date.now()) {
  if (!isOpen(r)) return false;
  r.status = 'cancelled'; r.doneAt = now;
  return true;
}

/** A route's answer, small enough to travel with the request ({status, body}); a big body is left out (the result is in its own synced file). */
export function resultOf(status, body, { max = 64 * 1024 } = {}) {
  const st = Number.isInteger(status) ? status : 200;
  return jsonLen(body) <= max ? { status: st, body: body === undefined ? { ok: true } : body } : { status: st, body: { ok: true, large: true } };
}

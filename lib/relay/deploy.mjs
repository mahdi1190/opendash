// lib/relay/deploy.mjs - Settings > Your relay (docs/dev/RELAY_PROTOCOL.md
// sections 1, 4 and 9): "Connect Cloudflare" puts this person's own relay on
// their Cloudflare account with wrangler, and the page manages it (members,
// invites, devices, usage) by signed owner requests.
//
// Safety:
//   - wrangler runs with spawn() and CONSTANT argument arrays (WRANGLER below).
//     On Windows npx.cmd needs shell: true, so no argument is ever built from
//     user or network input: the config path is relative (cwd = the device
//     folder's relay/), the Worker name is made here from [a-z0-9-] only and
//     written into the generated wrangler.toml, as are OWNER_KEY (a public
//     key, checked) and the account id ([a-f0-9]{32}, checked).
//   - wrangler keeps the Cloudflare sign-in in its own store. Its output is
//     read in memory for a few known patterns and dropped: never stored or
//     logged. Only three things from it ever reach the page, each checked
//     against a strict pattern and kept in memory for the one connect job:
//     the Worker address, the Cloudflare sign-in page address (so "no page
//     opened?" has a link) and, when the sign-in has several accounts, their
//     names and ids (to pick one).
//   - Cancel kills the whole process tree (Windows: taskkill /T /F /PID; else
//     the process group), also when the server stops.
//   - the identity's private key stays in the secret store; it only signs.
//
// ONE SOURCE for where the relay is: the person's HOME relay in
// <data>/friends/relays.json (lib/friends/store.mjs setRelay(..., {home: true})),
// which travels to their other devices end-to-end encrypted. Settings > Your
// relay, the Friends tab and Settings > Sync all read it. Connect Cloudflare and
// "Use a friend's relay" write it there and nowhere else, then tell sync
// (app.ctx.sync.relayChanged()) and friends (app.ctx.friends.reload()).
// What only the deploying computer needs (the generated wrangler.toml,
// wrangler's own .wrangler folder, deploy.json {worker, accountId, ratelimits,
// deployed, at}) lives in this computer's device folder (lib/devicedir.mjs
// deviceRoot(data)/relay), never in the data folder, so it is never synced and
// never travels with a data folder kept in OneDrive. It holds no origin.
//
// Connecting again when already connected updates the same Worker in place
// (same name, same address), so members, invites and devices are kept: they
// live in the Worker's Durable Objects, not in the code.
// Node stdlib only.

import { spawn, spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { installSpawnGuard } from '../spawn-guard.mjs';
import { secretStore } from '../secret-store.mjs';
import { REPO_ROOT } from '../datadir.mjs';
import { deviceRoot } from '../devicedir.mjs';
import { KEY_RE, IID_RE, signRequest, signerFromPkcs8, iidOf, unb64u } from './auth.mjs';
import { relayOrigin, isLocalRelayOrigin, relayLocalAllowed } from './origin.mjs';
import { publicRelay } from './public.mjs';

installSpawnGuard();

const WIN = process.platform === 'win32';
const NPX = WIN ? 'npx.cmd' : 'npx';
const NODE = WIN ? 'node.exe' : 'node';
/** The oldest Node.js wrangler runs on (and OpenDash itself: package.json engines). */
export const MIN_NODE = 20;
const NODE_LINK = 'https://nodejs.org/en/download';
const CF_WORKERS_LINK = 'https://dash.cloudflare.com/?to=/:account/workers-and-pages';
// Every npx command, whole. Nothing is added to these at run time.
const WRANGLER = Object.freeze({
  npx: Object.freeze(['--version']),
  version: Object.freeze(['--yes', 'wrangler@latest', '--version']),
  whoami: Object.freeze(['--yes', 'wrangler@latest', 'whoami']),
  login: Object.freeze(['--yes', 'wrangler@latest', 'login']),
  logout: Object.freeze(['--yes', 'wrangler@latest', 'logout']),
  deploy: Object.freeze(['--yes', 'wrangler@latest', 'deploy', '--config', 'wrangler.toml']),
});
const WORKER_RE = /^opendash-relay-[a-z0-9]{6}$/;
const ACCOUNT_RE = /^[a-f0-9]{32}$/;
export const STEPS = Object.freeze([
  ['tool', "Get Cloudflare's tool (wrangler)"],
  ['login', 'Sign in to Cloudflare: your browser opens, click Allow'],
  ['deploy', 'Put your relay on Cloudflare'],
  ['check', 'Check that it answers'],
  ['save', 'Use it on all your devices'],
]);
/** What the page says under the running step (job.note). */
const NOTES = Object.freeze({
  node: 'Checking Node.js on this computer…',
  tool: "Checking Cloudflare's tool…",
  download: "Downloading Cloudflare's tool (first time only)…",
  whoami: 'Checking your Cloudflare sign-in…',
  logout: 'Signing out of Cloudflare on this computer…',
  login: 'A Cloudflare page opened in your browser: click Allow. No account yet? Create a free one on that page first.',
  deploy: 'Putting your relay on Cloudflare (about 30 seconds)…',
  update: 'Updating your relay on Cloudflare (same address; members are kept)…',
  check: 'Waiting for Cloudflare to switch it on (up to a minute)…',
  save: 'Saving it for all your devices…',
});

const err = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// ─── Small pure helpers ────────────────────────────────────────────────────
export const newWorkerName = () => 'opendash-relay-' + Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)]).join('');
/** The shared relay origin check (lib/relay/origin.mjs): public https; a local relay only with OPENDASH_RELAY_ALLOW_LOCAL=1. */
export const cleanRelayOrigin = relayOrigin;
/** The generated wrangler.toml (every value checked; no secrets: OWNER_KEY is public). */
export function wranglerToml({ worker, ownerKey, main = join(REPO_ROOT, 'cloudflare', 'worker.mjs'), accountId = null, ratelimits = true }) {
  if (!WORKER_RE.test(worker) || !KEY_RE.test(ownerKey) || (accountId && !ACCOUNT_RE.test(accountId))) throw err('bad_config', 'The relay settings are not valid.');
  const m = String(main).replace(/\\/g, '/');
  if (/["\u0000-\u001f]/.test(m)) throw err('bad_config', 'The OpenDash folder path cannot be used in a wrangler file.');
  const rl = (name, id, limit) => `\n[[ratelimits]]\nname = "${name}"\nnamespace_id = "${id}"\n  [ratelimits.simple]\n  limit = ${limit}\n  period = 60\n`;
  return [
    '# Written by OpenDash (Settings > Your relay). The relay: docs/dev/RELAY_PROTOCOL.md.',
    `name = "${worker}"`,
    `main = "${m}"`,
    'compatibility_date = "2026-10-01"',
    'workers_dev = true',
    'preview_urls = false',
    'logpush = false',
    'upload_source_maps = false',
    'send_metrics = false',
    ...(accountId ? [`account_id = "${accountId}"`] : []),
    '',
    '[vars]',
    `OWNER_KEY = "${ownerKey}"`,
    '',
    '[observability]',
    'enabled = false',
    '',
    '[[durable_objects.bindings]]',
    'name = "SPACES"',
    'class_name = "RelaySpace"',
    '',
    '[[migrations]]',
    'tag = "relay-v1"',
    'new_sqlite_classes = ["RelaySpace"]',
    ratelimits ? rl('RL_IP', 41731, 300) + rl('RL_KEY', 41732, 240) + rl('RL_ANON', 41733, 20) + rl('RL_LOOKUP', 41734, 20) + rl('RL_LOOKUP_IP', 41735, 10) : '',
  ].join('\n') + '\n';
}
/**
 * The part of wrangler's output that is its error (from the first "[ERROR]" or "Error:" on),
 * so a list it printed before (the bindings, which name Durable Objects and rate limits) is
 * not mistaken for the problem. The whole text when there is no such marker.
 */
export function errorPart(out) {
  const t = String(out || '');
  const m = /\[ERROR\]|^\s*Error:|^\s*✘/m.exec(t);
  if (m) return t.slice(m.index);
  // No marker: drop the bindings table (wrangler 4: "Your Worker has access to the following
  // bindings:", a "Binding  Resource" header, then "env.X (...)  Durable Object | Rate Limit" rows).
  return t.split(/\r?\n/).filter(l => !/^\s*(env\.\S|Binding\s+Resource|Your Worker has access to the following bindings|- (Durable Objects|Rate Limits?|Vars):)/i.test(l)).join('\n');
}
/** Account names and ids from `wrangler whoami` (its table) or a "more than one account" error. Names are cleaned text. */
export function parseAccounts(out) {
  const t = String(out || '').slice(0, 64 * 1024), seen = new Map();
  const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩`│|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const add = (name, id) => { if (ACCOUNT_RE.test(id) && !seen.has(id) && seen.size < 50) seen.set(id, { id, name: clean(name) || 'Cloudflare account' }); };
  for (const line of t.split(/\r?\n/)) {
    const row = /^\s*[│|]\s*(.+?)\s*[│|]\s*([a-f0-9]{32})\s*[│|]\s*$/.exec(line);
    if (row) add(row[1], row[2]);
  }
  for (const m of t.matchAll(/`([^`\r\n]{1,120})`\s*:\s*`([a-f0-9]{32})`/g)) add(m[1], m[2]);
  return [...seen.values()];
}
/** The Cloudflare sign-in page wrangler opened (so the page can offer it when no browser window appeared), or null. */
export function loginUrlOf(out) {
  const m = /https:\/\/dash\.cloudflare\.com\/oauth2\/auth\?[A-Za-z0-9%&=._~+-]{20,2000}/.exec(String(out || ''));
  if (!m) return null;
  try {
    const u = new URL(m[0]);
    if (u.origin !== 'https://dash.cloudflare.com' || u.pathname !== '/oauth2/auth') return null;
    const back = u.searchParams.get('redirect_uri') || '';
    if (!/^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}\//.test(back)) return null;
    return u.href;
  } catch { return null; }
}
/** The major version from `node --version` (v20.11.1 -> 20), or null. */
export function nodeMajor(text) { const m = /v(\d{1,3})\.\d+/.exec(String(text || '')); return m ? Number(m[1]) : null; }
const noNode = () => ({ code: 'no_node', message: 'Node.js (and its npx) was not found on this computer.', next: `Install Node.js ${MIN_NODE} or newer (the LTS version) from nodejs.org, restart OpenDash, then press Try again.`, link: NODE_LINK, linkLabel: 'Get Node.js' });
const oldNode = (have) => ({ code: 'node_old', message: `Cloudflare's tool needs Node.js ${MIN_NODE} or newer${have ? ` (this computer has ${have})` : ''}.`, next: 'Install the LTS version from nodejs.org, restart OpenDash, then press Try again.', link: NODE_LINK, linkLabel: 'Get Node.js' });
/** A Durable Object or SQLite migration refusal, from a line of wrangler's error. */
const doProblem = (t) => t.split(/\r?\n/).some(l => /migration|sqlite|durable object/i.test(l) && /fail|error|cannot|can't|precondition|invalid|must|not allowed|refus|conflict/i.test(l));
/** What a failed wrangler run means, from its output (kept in memory only): {code, message, next, field?, link?, accounts?}. */
export function wranglerProblem(out, step) {
  const all = String(out || ''), t = errorPart(all);
  if (/requires (at least )?Node(\.js)?\s*v?\d+|Node(\.js)? v?\d+[^\n]{0,40}(is not supported|unsupported)/i.test(t)) return oldNode(null);
  if (/consent denied|denied consent|access_denied/i.test(t)) return { code: 'login_denied', message: 'The Cloudflare sign-in was cancelled.', next: 'Press Try again, then click Allow on the Cloudflare page.' };
  if (/timed out waiting for authori[sz]ation/i.test(t)) return { code: 'login_timeout', message: 'The Cloudflare page was not answered in time.', next: 'Press Try again, then click Allow on the Cloudflare page within two minutes.' };
  if (step === 'login' && /EADDRINUSE|address already in use|8976/i.test(t)) return { code: 'login_busy', message: 'Another Cloudflare sign-in is still waiting on this computer.', next: 'Close other Cloudflare sign-in pages (or wait two minutes), then press Try again.' };
  if (/workers\.dev subdomain/i.test(t)) return { code: 'no_subdomain', message: 'Your Cloudflare account has no workers.dev subdomain yet.', next: 'Open dash.cloudflare.com, go to Workers & Pages (left menu): it asks you to choose a workers.dev subdomain. Pick any free name, then come back and press Try again.', link: CF_WORKERS_LINK, linkLabel: 'Open Workers & Pages' };
  if (/more than one account/i.test(t)) {
    const accounts = parseAccounts(all);
    return { code: 'many_accounts', message: 'Your Cloudflare sign-in has more than one account.', next: accounts.length ? 'Choose the account for your relay.' : 'Paste the Account ID to use (dash.cloudflare.com > Workers & Pages: Account ID on the right), then press Try again.', field: 'accountId', accounts };
  }
  if (doProblem(t)) return { code: 'do_migration', message: "Cloudflare refused the relay's storage setup (Durable Objects).", next: 'Press Try again. If it fails again, the Worker name may belong to something set up differently: choose "Use a new address" (friends on your relay then need a new invite).', link: CF_WORKERS_LINK, linkLabel: 'Open Workers & Pages', fresh: true };
  if (/not (been )?authenticated|not logged in|log ?in again|invalid.*token|authentication error|\[code: 10000\]/i.test(t)) return { code: 'login', message: 'Cloudflare did not accept the sign-in.', next: 'Press Try again and click Allow in the browser window that opens.', relogin: true };
  if (/UNABLE_TO_GET_ISSUER_CERT|SELF_SIGNED_CERT|CERT_HAS_EXPIRED|unable to verify the first certificate|UNABLE_TO_VERIFY_LEAF/i.test(t)) return { code: 'network_cert', message: 'A network filter blocked the connection to Cloudflare (a certificate problem).', next: 'On a work or school network, try another one (a phone hotspot works), then press Try again.' };
  if (/\b429\b|too many requests|rate.?limited/i.test(t)) return { code: 'busy', message: 'Cloudflare asked to slow down.', next: 'Wait a minute, then press Try again.' };
  if (/ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ENETUNREACH|ETIMEDOUT|ERR_SOCKET_TIMEOUT|socket hang up|getaddrinfo|network|fetch failed/i.test(t)) return { code: 'network', message: 'Cloudflare could not be reached.', next: 'Check the internet connection, then press Try again.' };
  if (/ENOSPC|no space left/i.test(t)) return { code: 'disk', message: 'This computer\'s disk is full.', next: 'Free some space, then press Try again.' };
  if (/\bEPERM\b|\bEBUSY\b|\bEACCES\b/.test(t)) return { code: 'files_busy', message: "Windows blocked a file Cloudflare's tool needs (often antivirus scanning it).", next: 'Wait a moment, then press Try again.' };
  if (/free plan|limit.*(exceed|reached)|exceeded/i.test(t)) return { code: 'limit', message: 'Cloudflare refused: an account limit was reached.', next: 'Free accounts can have up to 100 Workers. Delete one you no longer use in dash.cloudflare.com (Workers & Pages), then press Try again.', link: CF_WORKERS_LINK, linkLabel: 'Open Workers & Pages' };
  if (step === 'tool') return { code: 'tool', message: "Cloudflare's wrangler tool could not be downloaded.", next: 'Check the internet connection, then press Try again.' };
  if (step === 'login') return { code: 'login', message: 'The Cloudflare sign-in did not finish.', next: 'Press Try again and click Allow in the browser window that opens.' };
  return { code: 'deploy', message: 'Cloudflare did not accept the relay.', next: 'Press Try again. If it keeps failing, deploy it by hand: docs/dev/RELAY_PROTOCOL.md section 9.' };
}
/** Problems that are never about the rate-limit bindings (so they are not retried without them). */
const HARD_PROBLEMS = new Set(['node_old', 'no_node', 'login', 'login_denied', 'login_timeout', 'login_busy', 'no_subdomain', 'many_accounts', 'do_migration', 'network', 'network_cert', 'busy', 'disk', 'files_busy']);
/** Is this failed deploy about the rate-limit bindings (not every Cloudflare plan or wrangler has them)? Retried without. */
export function ratelimitUnsupported(out) {
  const t = errorPart(out);
  return /ratelimits|unsafe binding|unknown binding|binding type|namespace_id/i.test(t) || (/rate.?limit/i.test(t) && /binding|not (supported|allowed|available)|unsupported|unknown/i.test(t));
}
/** Refuse a relay origin from the network that points at this computer or its network (lib/relay/public.mjs). */
async function publicOrigin(origin) {
  const o = cleanRelayOrigin(origin);
  if (!o) throw err('bad_origin', 'That relay address is not a public https address. Ask your friend for a new invite.');
  const v = await publicRelay(o);
  if (v === 'private') throw err('bad_origin', 'That relay address points inside a private network, so OpenDash will not use it. Ask your friend for a new invite.');
  if (v === 'unknown') throw err('network', 'That relay cannot be reached right now. Check the internet connection, then try again.');
  return o;
}

// ─── The identity (docs/dev/FRIENDS.md section 2) ──────────────────────────
async function identityOf(root) {
  let store = null;
  try { store = await import('../friends/store.mjs'); } catch (e) { if (!/Cannot find module|ERR_MODULE_NOT_FOUND/.test(String(e && (e.code || e.message)))) throw e; }
  let id = null;
  if (store && typeof store.ensureIdentity === 'function') id = await store.ensureIdentity(root);
  else { const doc = await secretStore(root).get('friends-identity').catch(() => null); id = doc && doc.current; }
  if (!id || !id.ed || !KEY_RE.test(id.ed.pub || '') || typeof id.ed.priv !== 'string') throw err('no_identity', 'Open Friends once so OpenDash can make your identity, then try again.');
  return { pub: id.ed.pub, signer: await signerFromPkcs8(id.ed.priv, id.ed.pub) };
}
async function friendsStore() { try { return await import('../friends/store.mjs'); } catch { return null; } }

// ─── A signed client for one relay (section 3.1) ───────────────────────────
export function relayClient(origin, signer) {
  let offset = 0;
  async function call(method, path, body) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const url = origin + path, text = body === undefined ? null : JSON.stringify(body);
      const headers = await signRequest({ signer, url, method, body: text, now: Date.now() + offset });
      if (text != null) headers['Content-Type'] = 'application/json';
      let r;
      try { r = await fetch(url, { method, headers, body: text, redirect: 'error', signal: AbortSignal.timeout(20000) }); }
      catch { throw err('network', 'The relay could not be reached.'); }
      const now = Number(r.headers.get('x-od-now'));
      if (Number.isFinite(now) && now > 0) offset = now - Date.now();
      const raw = await r.text().catch(() => '');
      let j = {};
      try { j = raw.length < 1024 * 1024 ? JSON.parse(raw || '{}') : {}; } catch { j = {}; }
      if (r.status === 401 && (j.error === 'clock' || j.error === 'replay') && attempt === 0) continue;
      if (!r.ok) throw err(typeof j.error === 'string' ? j.error.slice(0, 40) : 'relay_' + r.status, typeof j.message === 'string' ? j.message.slice(0, 200) : 'The relay refused.', { status: r.status });
      return j;
    }
    throw err('clock', "This computer's clock is too far off the relay's.");
  }
  return { call };
}
/**
 * Wait for a just-deployed relay to answer (a new workers.dev name takes a moment to
 * propagate): GET /v1/health, then a signed GET /v1/me, retried with back-off
 * (1 s growing to 10 s) for about maxMs. -> {ok, me} | {ok: false, error?}.
 */
async function waitForRelay(origin, signer, { cancelled = () => false, maxMs = 60000 } = {}) {
  const t0 = Date.now();
  let delay = 1000, last = null;
  const client = relayClient(origin, signer);
  for (;;) {
    if (cancelled()) return { ok: false };
    let healthy = false;
    try {
      const r = await fetch(origin + '/v1/health', { redirect: 'error', signal: AbortSignal.timeout(8000) });
      const j = await r.json().catch(() => null);
      healthy = !!(r.ok && j && j.service === 'opendash-relay');
    } catch { /* not yet */ }
    if (healthy) {
      try { return { ok: true, me: await client.call('GET', '/v1/me') }; }
      catch (e) {
        last = e;
        if (e.code === 'clock') return { ok: false, error: e };
        // It answers, but not to this identity: another OWNER_KEY (not a propagation delay).
        if (e.code === 'not_member' || e.status === 403) return { ok: true, me: { role: null } };
      }
    }
    if (Date.now() - t0 + delay > maxMs) return { ok: false, error: last };
    for (let w = 0; w < delay && !cancelled(); w += 250) await sleep(250);
    delay = Math.min(Math.round(delay * 1.6), 10000);
  }
}

// ─── Running wrangler ──────────────────────────────────────────────────────
/** Stop a child and everything it started (npx -> node -> wrangler -> workerd). */
function killTree(child, { sync = false } = {}) {
  if (!child || child.exitCode != null || child.signalCode != null || !child.pid) return;
  const pid = Number(child.pid);
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (WIN) {
    const args = ['/T', '/F', '/PID', String(pid)];
    try { if (sync) spawnSync('taskkill.exe', args, { windowsHide: true, stdio: 'ignore', timeout: 5000 }); else spawn('taskkill.exe', args, { windowsHide: true, stdio: 'ignore' }).on('error', () => {}); } catch { /* gone */ }
    return;
  }
  try { process.kill(-pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch { /* gone */ } }
}
/** Children still running, killed if the server stops (a waiting `wrangler login` would hold its port). */
const LIVE = new Set();
let exitHooked = false;
function hookExit() {
  if (exitHooked) return;
  exitHooked = true;
  process.once('exit', () => { for (const c of LIVE) killTree(c, { sync: true }); });
}
/**
 * Run one of WRANGLER's commands in `cwd`: {code, out} (out: in memory only, capped).
 * onData(text so far) lets the caller react while it runs (the sign-in page, a slow download).
 */
function wrangler(which, { cwd, timeoutMs, onChild, onData }) {
  const args = WRANGLER[which];
  hookExit();
  return new Promise((resolve) => {
    let out = '', done = false;
    const finish = (code) => { if (done) return; done = true; clearTimeout(timer); LIVE.delete(child); resolve({ code, out }); };
    let child;
    try {
      child = spawn(NPX, args, {
        cwd, shell: WIN, windowsHide: true, detached: !WIN, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1', FORCE_COLOR: '0', npm_config_update_notifier: 'false', npm_config_fund: 'false', npm_config_audit: 'false' },
      });
    } catch (e) { resolve({ code: -1, out: String(e && e.code || '') }); return; }
    LIVE.add(child);
    onChild(child);
    const take = (d) => { if (out.length < 64 * 1024) out += String(d); if (onData) { try { onData(out); } catch { /* the caller's problem */ } } };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', (e) => { out += ' ' + String(e && e.code || 'error'); finish(-1); });
    child.on('close', (code) => finish(code == null ? -1 : code));
    const timer = setTimeout(() => { killTree(child); out += ' ETIMEDOUT'; finish(-2); }, timeoutMs);
  });
}
/** `node --version` on this computer's PATH -> the major version, or null when there is none. */
function nodeOnPath() {
  return new Promise((resolve) => {
    let out = '', child;
    try { child = spawn(NODE, ['--version'], { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }); }
    catch { resolve(null); return; }
    const t = setTimeout(() => { try { child.kill(); } catch { /* gone */ } resolve(null); }, 15000);
    child.stdout.on('data', (d) => { if (out.length < 200) out += String(d); });
    child.on('error', () => { clearTimeout(t); resolve(null); });
    child.on('close', () => { clearTimeout(t); resolve(nodeMajor(out)); });
  });
}

// ─── The service behind /api/relay ─────────────────────────────────────────
/** The Worker name of a relay this person deployed, read back from its workers.dev origin (or null). */
export function workerOfOrigin(origin) {
  const m = /^https:\/\/(opendash-relay-[a-z0-9]{6})\.[a-z0-9-]+\.workers\.dev$/.exec(String(origin || ''));
  return m ? m[1] : null;
}
/**
 * ctx: the server's app.ctx ({paths: {root}, log, sync?, friends?}).
 * status(), connect({accountId?, fresh?, checkOnly?, relogin?, adopt?}), cancel(), whenDone(),
 * admin(), memberRevoke(iid) / memberRestore(iid) / memberScopes(iid, scopes), inviteCancel(id),
 * certRevoke(cert), disconnect(), reconnect(), useInvite(text), useForSync().
 *
 * connect() starts a job in the background and answers status() at once; whenDone() is a
 * promise of the job's end ({state: 'done'|'error'|'cancelled', error?, result?}).
 *   accountId  the Cloudflare account to use (a sign-in with several)
 *   fresh      deploy under a new Worker name (a new address) instead of updating the old one
 *   checkOnly  only check and save the relay the last run put on Cloudflare (no wrangler)
 *   relogin    sign out of Cloudflare first, then sign in again (another account)
 *   adopt      with checkOnly: use that relay even though your relay was elsewhere
 */
export function createRelayService(ctx) {
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  // This computer only (the device folder): wrangler's config and cache, the Cloudflare account id.
  const dir = relayDeployDir(root);
  const deployFile = join(dir, 'deploy.json');
  const log = typeof ctx.log === 'function' ? ctx.log : () => {};
  let job = null, lastRemoved = null, lastOrigin = null;

  /** THE relay: the home relay in friends/relays.json -> {key, origin, host, role, scopes, mbox} or null. */
  async function home() {
    const fs = await friendsStore();
    const h = fs && typeof fs.homeRelay === 'function' ? await fs.homeRelay(root).catch(() => null) : null;
    return h && cleanRelayOrigin(h.origin) ? h : null;
  }
  /**
   * 2.17.1: the person's relay as another of their computers has it, when this one's
   * friends/relays.json has none yet (lib/sync/engine.mjs personRelay: the sealed device record
   * of a member of their sync group). Never a second relay: Connect Cloudflare then updates
   * that same relay in place, and the page says it is set up on the other computer.
   */
  function peerRelay() {
    let p = null;
    try { p = ctx.sync && typeof ctx.sync.personRelay === 'function' ? ctx.sync.personRelay() : null; } catch { p = null; }
    const o = p && p.from === 'peer' && p.role === 'owner' ? cleanRelayOrigin(p.origin) : null;
    return o ? { key: null, origin: o, host: o.replace(/^https?:\/\//, ''), role: 'owner', scopes: ['message', 'sync'], pending: true, by: typeof p.by === 'string' ? p.by.slice(0, 60) : null } : null;
  }
  /** Tell sync and friends at once that the home relay changed. */
  function told() {
    const s = ctx.sync, f = ctx.friends;
    if (s && typeof s.relayChanged === 'function') Promise.resolve().then(() => s.relayChanged()).catch(() => {});
    // friends: read relays.json again, and run (the identity exists now) so the new mailbox is pulled
    if (f && typeof f.reload === 'function') Promise.resolve().then(() => f.reload()).then(() => (typeof f.start === 'function' ? f.start() : null)).catch(() => {});
  }
  /** Save the home relay (the one source), then tell sync and friends. */
  async function saveHome(rec) {
    const fs = await friendsStore();
    if (!fs || typeof fs.setRelay !== 'function') throw err('no_friends', 'This version of OpenDash cannot keep a relay.', { status: 409 });
    await fs.setRelay(root, rec, { home: true });
    told();
  }
  const readDeploy = () => { try { const v = JSON.parse(readFileSync(deployFile, 'utf8')); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
  const writeDeploy = (v) => { mkdirSync(dir, { recursive: true }); writeFileSync(deployFile, JSON.stringify(v, null, 1)); };
  const jobView = () => (job ? {
    state: job.state, step: job.step, steps: job.steps.map(s => ({ ...s })), error: job.error, origin: job.origin || null, at: job.at,
    note: job.state === 'running' ? job.note || null : null, loginUrl: job.state === 'running' && job.step === 'login' ? job.loginUrl || null : null,
    result: job.result || null, canCheck: !!lastOrigin,
  } : null);
  /**
   * Device sync and this relay on this computer: {enabled: sync is on here, on: it goes through
   * the relay, usable: this person may sync through it (owner, or the 'sync' scope)}.
   */
  function syncView(relay) {
    let st = null;
    try { st = ctx.sync && typeof ctx.sync.status === 'function' ? ctx.sync.status() : null; } catch { st = null; }
    const r = st && st.relay;
    // usable: the relay allows device sync; chosen: device sync may use it now (a member relay needs the person's choice)
    return { enabled: !!(st && st.enabled), on: !!(r && r.on), usable: !!(relay && (relay.role === 'owner' || (relay.scopes || []).includes('sync'))), chosen: !!(relay && (relay.role === 'owner' || relay.sync)) };
  }

  async function status() {
    const h = (await home()) || peerRelay();
    const relay = h ? { origin: h.origin, host: h.host, role: h.role, scopes: h.scopes, sync: h.sync === true, worker: h.role === 'owner' ? workerOfOrigin(h.origin) : null, ...(h.pending ? { pending: true, by: h.by || null } : {}) } : null;
    // here: this computer deployed it (its deploy record names the same Worker); else it was connected
    // from another computer of the person and reached this one through sync.
    const d = readDeploy();
    const here = !!(relay && relay.worker && d.deployed && d.worker === relay.worker);
    return { relay, connect: jobView(), mine: !!(relay && relay.role === 'owner'), here, fromOther: !!(relay && relay.role === 'owner' && !here), canConnect: !job || job.state !== 'running', sync: syncView(relay), node: { min: MIN_NODE } };
  }
  async function owner() {
    const relay = await home();
    if (!relay) throw err('no_relay', 'No relay is connected.', { status: 409 });
    const id = await identityOf(root);
    return { relay, id, client: relayClient(relay.origin, id.signer) };
  }

  /** Move job `j` to step `id` (a cancelled run still unwinding only ever touches its own job). */
  function stepOf(j, id, state = 'doing') {
    if (j.cancelled) return;
    for (const s of j.steps) { if (s.id === id) s.state = state; else if (state === 'doing' && s.state === 'doing') s.state = 'done'; }
    if (state === 'doing') j.step = id;
  }
  async function run(mine, opts) {
    const stepTo = (id, state) => stepOf(mine, id, state);
    const cancelled = () => mine.cancelled;
    const note = (k) => { mine.note = NOTES[k] || null; };
    const stop = (p) => { throw err(p.code, p.message, { next: p.next, field: p.field, link: p.link, linkLabel: p.linkLabel, accounts: p.accounts, fresh: p.fresh, relogin: p.relogin, adopt: p.adopt, check: p.check }); };
    const step = async (which, timeoutMs, onData) => {
      if (cancelled()) throw err('cancelled', 'Cancelled.');
      const r = await wrangler(which, { cwd: dir, timeoutMs, onChild: (c) => { mine.child = c; }, onData });
      mine.child = null;
      if (cancelled()) throw err('cancelled', 'Cancelled.');
      if ((r.code === -1 && /ENOENT/.test(r.out)) || /is not recognized as an internal or external command|npx: (command )?not found|command not found: npx/i.test(r.out)) stop(noNode());
      if (/requires (at least )?Node(\.js)?\s*v?\d+/i.test(r.out)) stop(oldNode(null));
      return r;
    };
    mkdirSync(dir, { recursive: true });
    const id = await identityOf(root);
    // The person's relay, here or (not here yet) on another of their computers: updated in place, never a second one.
    const prev = (await home()) || peerRelay();
    const prevOwned = prev && prev.role === 'owner' ? prev : null;
    let origin = null;

    if (opts.checkOnly && lastOrigin) {
      // Only check and save what the last run put on Cloudflare (it did not answer in time, or was elsewhere).
      origin = lastOrigin;
      for (const s of ['tool', 'login', 'deploy']) stepTo(s, 'done');
    } else {
      // 1. Node.js and wrangler itself (npx fetches it the first time)
      stepTo('tool');
      note('node');
      const major = await nodeOnPath();
      if (cancelled()) throw err('cancelled', 'Cancelled.');
      if (major != null && major < MIN_NODE) stop(oldNode('Node.js ' + major));
      let r = await step('npx', 60000);
      if (r.code !== 0) stop(major == null ? noNode() : wranglerProblem(r.out, 'tool'));
      note('tool');
      const slow = setTimeout(() => { if (mine.step === 'tool' && mine.state === 'running') note('download'); }, 3000);
      try { r = await step('version', 5 * 60000); } finally { clearTimeout(slow); }
      if (r.code !== 0) stop(wranglerProblem(r.out, 'tool'));
      // 2. signed in to Cloudflare? (wrangler keeps the sign-in; OpenDash never sees it)
      stepTo('login');
      const signedIn = (x) => x.code === 0 && !/not authenticated|not logged in|You are not/i.test(x.out);
      if (opts.relogin) { note('logout'); await step('logout', 2 * 60000); }
      note('whoami');
      r = await step('whoami', 2 * 60000);
      if (r.code !== 0) {
        // Not a sign-in question (no network, a filter, a full disk...): say that, rather than open a sign-in page.
        const p = wranglerProblem(r.out, 'whoami');
        if (['network', 'network_cert', 'busy', 'node_old', 'disk', 'files_busy'].includes(p.code)) stop(p);
      }
      if (!signedIn(r)) {
        note('login');
        r = await step('login', 5 * 60000, (out) => { if (!mine.loginUrl) mine.loginUrl = loginUrlOf(out); });
        mine.loginUrl = null;
        if (r.code !== 0 || /consent denied|timed out waiting/i.test(r.out)) stop(wranglerProblem(r.out, 'login'));
        note('whoami');
        r = await step('whoami', 2 * 60000);
        if (!signedIn(r)) stop(wranglerProblem('', 'login'));
      }
      // Which account: the one chosen now, else this computer's last one if the sign-in still has it,
      // else the only one; several and none chosen -> ask (a list from whoami, in memory only).
      const accounts = parseAccounts(r.out);
      const saved = readDeploy();
      const ids = new Set(accounts.map(a => a.id));
      let accountId = ACCOUNT_RE.test(opts.accountId || '') ? opts.accountId : null;
      if (!accountId && ACCOUNT_RE.test(saved.accountId || '') && (!accounts.length || ids.has(saved.accountId))) accountId = saved.accountId;
      if (!accountId && accounts.length === 1) accountId = accounts[0].id;
      if (!accountId && accounts.length > 1) stop({ code: 'many_accounts', message: 'Your Cloudflare sign-in has more than one account.', next: 'Choose the account for your relay.', field: 'accountId', accounts });
      // 3. deploy. The same Worker name every time, so the relay is updated in place and keeps its
      //    members: the home relay's own name when this person owns it (another of their devices
      //    may have made it), else this computer's record; a new one only for a first relay, when
      //    asked (fresh), or if Cloudflare says the name is taken.
      stepTo('deploy');
      const prevWorker = prevOwned ? workerOfOrigin(prevOwned.origin) : null;
      let worker = opts.fresh ? newWorkerName() : prevWorker || (WORKER_RE.test(saved.worker || '') ? saved.worker : null) || newWorkerName();
      const known = !opts.fresh && !!(prevWorker || (saved.deployed && saved.worker === worker));
      note(known ? 'update' : 'deploy');
      let ratelimits = saved.ratelimits !== false, renamed = false;
      for (let attempt = 0; attempt < 4 && !origin; attempt++) {
        writeFileSync(join(dir, 'wrangler.toml'), wranglerToml({ worker, ownerKey: id.pub, accountId, ratelimits }));
        writeDeploy({ worker, accountId, ratelimits, deployed: !!(known && saved.deployed), at: new Date().toISOString() });
        r = await step('deploy', 6 * 60000);
        if (r.code === 0) {
          const m = new RegExp(`https://${worker}\\.([a-z0-9-]+)\\.workers\\.dev`).exec(r.out);
          if (m) origin = `https://${worker}.${m[1]}.workers.dev`;
          else stop({ code: 'no_url', message: 'The relay was put on Cloudflare, but its address was not shown.', next: 'Press Try again in a minute.' });
          break;
        }
        const p = wranglerProblem(r.out, 'deploy');
        // The rate-limit bindings: not on every plan or wrangler version. Retried once without (the relay
        // then limits in memory), and only when nothing that clearly is something else went wrong.
        if (ratelimits && !HARD_PROBLEMS.has(p.code) && ratelimitUnsupported(r.out)) { ratelimits = false; continue; }
        const taken = /already (exists|taken|in use)|name.*(taken|in use|not available)/i.test(errorPart(r.out));
        if (!known && !renamed && (taken || p.code === 'do_migration')) { worker = newWorkerName(); renamed = true; continue; }
        if (p.code === 'do_migration') p.next = `Press Try again. If it fails again: in dash.cloudflare.com > Workers & Pages, the Worker ${worker} may have been set up differently. Choose "Use a new address" (friends on your relay then need a new invite), or delete that Worker there if you do not use it.`;
        if (accounts.length > 1 && p.code === 'deploy') { p.accounts = accounts; p.field = 'accountId'; }
        stop(p);
      }
      if (!origin) stop(wranglerProblem('', 'deploy'));
      writeDeploy({ worker, accountId, ratelimits, deployed: true, at: new Date().toISOString() });
      lastOrigin = origin;
    }
    mine.origin = origin;
    // Your relay lives on another Cloudflare account than the one this computer is signed in to:
    // a second relay was made there. Keep the old one (and its members) unless the person says so.
    if (prevOwned && prevOwned.origin !== origin && !opts.fresh && !opts.adopt) {
      const where = String(prevOwned.host || prevOwned.origin).slice(0, 120);
      stop(workerOfOrigin(prevOwned.origin)
        ? { code: 'other_account', message: `Your relay is on another Cloudflare account (${where}). This computer is signed in to a different one, so your devices still use the old relay.`,
          next: 'Sign in with the account your relay is on, or use the new relay instead (friends on the old one then need a new invite).', relogin: true, adopt: true }
        : { code: 'other_account', message: `Your devices use your relay at ${where}. A new relay was put on your Cloudflare account, but nothing was switched yet.`,
          next: 'Use the new relay instead (friends on the old one then need a new invite), or keep the old one.', adopt: true });
    }
    // 4. it answers, and it is ours (a new workers.dev name can take up to a minute to propagate)
    stepTo('check');
    note('check');
    const w = await waitForRelay(origin, id.signer, { cancelled });
    if (cancelled()) throw err('cancelled', 'Cancelled.');
    if (!w.ok) {
      if (w.error && w.error.code === 'clock') stop({ code: 'clock', message: "This computer's clock is too far off.", next: 'Set the time automatically (Windows: Settings > Time & language > Date & time), then press Check again.', check: true });
      stop({ code: 'no_answer', message: 'Your relay is on Cloudflare but does not answer yet.', next: 'New addresses can take a few minutes to work everywhere. Press Check again in a minute (nothing is deployed again).', check: true });
    }
    if (!w.me || w.me.role !== 'owner') stop({ code: 'not_owner', message: 'That relay does not belong to your identity.', next: 'Press Try again: OpenDash deploys it again with your key.' });
    // 5. the home relay (friends/relays.json: the one source, synced to every device)
    stepTo('save');
    note('save');
    if (cancelled()) throw err('cancelled', 'Cancelled.');
    let mbox = null;
    try { mbox = (await relayClient(origin, id.signer).call('GET', '/v1/mailbox')).mbox; } catch { /* the friends engine asks again */ }
    try { await saveHome({ origin, role: 'owner', scopes: ['message', 'sync'], mbox: typeof mbox === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(mbox) ? mbox : null }); }
    catch { stop({ code: 'save', message: 'Your relay works, but this computer could not save it.', next: 'Press Check again (it keeps the same address).', check: true }); }
    stepTo('save', 'done');
    mine.result = { origin, updated: !!(prevOwned && prevOwned.origin === origin), first: !prev };
  }
  async function connect(opts = {}) {
    if (job && job.state === 'running') return status();
    // A cancelled run may still be unwinding (its processes being killed): give it a moment.
    if (job && job.settled) await Promise.race([job.settled, sleep(5000)]);
    const o = {
      accountId: ACCOUNT_RE.test(String(opts.accountId || '')) ? String(opts.accountId) : null,
      fresh: opts.fresh === true, checkOnly: opts.checkOnly === true, relogin: opts.relogin === true, adopt: opts.adopt === true,
    };
    job = { state: 'running', step: 'tool', steps: STEPS.map(([id, label]) => ({ id, label, state: 'todo' })), error: null, origin: null, at: Date.now(), cancelled: false, child: null, note: null, loginUrl: null, result: null };
    const mine = job;
    log('info', 'relay: connecting Cloudflare');
    mine.settled = run(mine, o).then(() => {
      if (mine.cancelled) return;
      mine.state = 'done'; mine.note = null; log('info', mine.result && mine.result.updated ? 'relay: updated in place' : 'relay: connected');
    }).catch((e) => {
      mine.note = null; mine.loginUrl = null;
      if (mine.cancelled || e.code === 'cancelled') { mine.state = 'cancelled'; mine.error = null; }
      else {
        mine.state = 'error';
        mine.error = {
          code: e.code || 'error', message: e.code ? e.message : 'Something went wrong.', next: e.next || 'Press Try again.', field: e.field || null,
          link: e.link || null, linkLabel: e.linkLabel || null, accounts: Array.isArray(e.accounts) && e.accounts.length ? e.accounts : null,
          fresh: !!e.fresh, relogin: !!e.relogin, adopt: !!e.adopt, check: !!(e.check && lastOrigin),
        };
      }
      for (const s of mine.steps) if (s.state === 'doing') s.state = mine.state === 'cancelled' ? 'todo' : 'error';
      log('warn', `relay: connect stopped (${mine.error ? mine.error.code : 'cancelled'})`);
    }).finally(() => { mine.child = null; });
    return status();
  }
  /** Stop at once: the job reads as cancelled now and its whole process tree is killed. */
  function cancel() {
    if (job && job.state === 'running') {
      job.cancelled = true;
      job.state = 'cancelled'; job.error = null; job.note = null; job.loginUrl = null;
      for (const s of job.steps) if (s.state === 'doing') s.state = 'todo';
      killTree(job.child);
      log('info', 'relay: connect cancelled');
    }
    return status();
  }
  /** The current job's end: {state, error, result} (resolves at once when there is none or it has ended). */
  async function whenDone() {
    const j = job;
    if (!j) return { state: 'none', error: null, result: null };
    if (j.settled) await j.settled.catch(() => {});
    return { state: j.state, error: j.error, result: j.result || null };
  }

  // ── managing it (owner key; section 4.3) ──
  async function admin() {
    const h = await home();
    if (!h) return { relay: null };
    const view = { origin: h.origin, host: h.host, role: h.role };
    const { client } = await owner();
    try {
      const me = await client.call('GET', '/v1/me');
      if (me.role !== 'owner') return { relay: view, home: view, role: me.role, scopes: me.scopes, used: me.used, quota: me.quota };
      // The admin answer's own `relay` is its usage (RELAY_PROTOCOL.md 4.3): kept as it is, `home` is where it is.
      return { relay: view, ...(await client.call('GET', '/v1/admin')), home: view, role: 'owner' };
    } catch (e) {
      const busy = e.status === 503 || e.code === 'relay_busy';
      return { relay: view, home: view, error: { code: e.code || 'error', message: busy ? 'Your relay is resting until midnight UTC (free-tier limit). Your devices keep syncing over your own network.' : e.message, calm: busy || e.code === 'network' } };
    }
  }
  const iidOk = (iid) => { if (!IID_RE.test(String(iid || ''))) throw err('bad_request', 'Choose a member.', { status: 400 }); return iid; };
  async function memberRevoke(iid) { const { client } = await owner(); return client.call('DELETE', '/v1/admin/members/' + iidOk(iid)); }
  async function memberRestore(iid) { const { client } = await owner(); return client.call('POST', `/v1/admin/members/${iidOk(iid)}/restore`); }
  async function memberScopes(iid, scopes) {
    const s = Array.isArray(scopes) ? scopes.filter(x => x === 'message' || x === 'sync') : [];
    if (!s.includes('message')) throw err('bad_request', 'A member can always message you.', { status: 400 });
    const { client } = await owner();
    return client.call('PUT', '/v1/admin/members/' + iidOk(iid), { scopes: s });
  }
  async function inviteCancel(id) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(String(id || ''))) throw err('bad_request', 'Choose an invite.', { status: 400 });
    const { client } = await owner();
    return client.call('DELETE', '/v1/admin/invites/' + id);
  }
  async function certRevoke(cert) {
    if (!/^[A-Za-z0-9_-]{22}$/.test(String(cert || ''))) throw err('bad_request', 'Choose a device.', { status: 400 });
    const { client } = await owner();
    return client.call('POST', '/v1/certs/revoke', { cert });
  }
  /** Stop using the relay on all devices (the Worker stays in the Cloudflare account). reconnect() undoes it for a minute. */
  async function disconnect() {
    const relay = await home();
    if (!relay) return { ok: true, undo: false, worker: null };
    const fs = await friendsStore();
    await fs.removeRelay(root, relay.origin);
    lastRemoved = { rec: { origin: relay.origin, role: relay.role, scopes: relay.scopes, mbox: relay.mbox, sync: relay.sync === true }, at: Date.now() };
    told();
    log('info', 'relay: disconnected');
    return { ok: true, undo: true, until: lastRemoved.at + 60000, worker: relay.role === 'owner' ? workerOfOrigin(relay.origin) : null };
  }
  /**
   * "Use it for sync" for a friend's relay joined from Friends (2.17.1): device sync uses a
   * member relay only once the person chose it here (friends/relays.json sync: true, on every device).
   */
  async function useForSync() {
    const h = await home();
    if (!h) throw err('no_relay', 'No relay is connected. Connect one first.', { status: 409 });
    if (h.role === 'owner' || h.sync) return { ok: true };
    if (!(h.scopes || []).includes('sync')) throw err('scope', "Its owner did not allow syncing devices through this relay. Ask them for an invite that includes sync.", { status: 409 });
    await saveHome({ origin: h.origin, role: h.role, scopes: h.scopes, mbox: h.mbox, sync: true });
    log('info', 'relay: chosen for device sync');
    return { ok: true };
  }
  /** Undo of disconnect(): the same relay is the home relay again. */
  async function reconnect() {
    if (!lastRemoved || Date.now() - lastRemoved.at > 60000) throw err('gone', 'It is too late to undo that here. Connect the relay again instead.', { status: 410 });
    const { rec } = lastRemoved;
    lastRemoved = null;
    await saveHome(rec);
    log('info', 'relay: reconnected (undo)');
    return { ok: true };
  }
  /**
   * Development and self-hosting only (RELAY_PROTOCOL.md section 12): use a relay running on THIS computer
   * (node tools/relay-local.mjs --owner-key <your key>) as your own relay. It does what Connect Cloudflare does
   * after a deploy (steps 4 and 5: it answers, it is ours, save it as the home relay), without wrangler.
   * Only with OPENDASH_RELAY_ALLOW_LOCAL=1 in this process's environment, and only an http://127.0.0.1 or
   * http://localhost origin; the route is not even registered otherwise.
   */
  async function useLocal(text) {
    if (!relayLocalAllowed()) throw err('not_allowed', 'A relay on this computer can only be used when OpenDash runs with OPENDASH_RELAY_ALLOW_LOCAL=1.', { status: 403 });
    const origin = cleanRelayOrigin(text);
    if (!origin || !isLocalRelayOrigin(origin)) throw err('bad_origin', 'Use the address the local relay printed, such as http://127.0.0.1:4199.', { status: 400 });
    const id = await identityOf(root);
    const w = await waitForRelay(origin, id.signer, { maxMs: 15000 });
    if (!w.ok) throw err(w.error && w.error.code === 'clock' ? 'clock' : 'no_answer', w.error && w.error.code === 'clock' ? "This computer's clock is too far off the relay's." : 'The local relay does not answer. Start it with node tools/relay-local.mjs, then try again.', { status: 502 });
    if (!w.me || w.me.role !== 'owner') throw err('not_owner', 'That relay does not belong to your identity: start it with --owner-key set to your key.', { status: 409 });
    let mbox = null;
    try { mbox = (await relayClient(origin, id.signer).call('GET', '/v1/mailbox')).mbox; } catch { /* the friends engine asks again */ }
    await saveHome({ origin, role: 'owner', scopes: ['message', 'sync'], mbox: typeof mbox === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(mbox) ? mbox : null });
    log('info', 'relay: using a relay on this computer');
    return { ok: true, origin, role: 'owner' };
  }
  /** "Use a friend's relay instead": the relay part of a friends invite (ODF1...), redeemed with this identity. */
  async function useInvite(text) {
    const raw = String(text || '').slice(0, 9000);
    let inv = null;
    // The short link (FRIENDS.md, RELAY_PROTOCOL.md 7.8): fetch its sealed copy from the inviter's relay,
    // open it with the link's token and check it exactly as Friends > Add a friend does.
    const fc = await import('../friends/core.mjs').catch(() => null);
    const sh = fc && typeof fc.parseShortInvite === 'function' ? await fc.parseShortInvite(raw) : null;
    if (sh && sh.error) {
      throw err('bad_invite', sh.error === 'needs-link' ? 'Paste the whole invite link, starting with https://.'
        : sh.error === 'origin' ? "That invite link's address can't be used (it must be a public https address). Ask your friend for a new invite."
          : 'That link looks cut short or mistyped. Copy the whole link again.', { status: 400 });
    }
    if (sh) {
      const at = await publicOrigin(sh.origin);
      const me = await identityOf(root);
      let got = null;
      try { got = await relayClient(at, me.signer).call('GET', `/v1/inv/${await fc.shortInviteKey(sh.token)}`); }
      catch (e) {
        if (e.status === 404 || e.status === 410) throw err('gone', 'This invite link was already used, cancelled or has expired. Ask your friend for a new one.', { status: 410 });
        if (e.code === 'network') throw err('network', "Your friend's relay could not be reached. Check the internet connection, then press Try again.");
        throw err('relay', "Your friend's relay did not answer properly. Press Try again, or ask your friend for a new invite.");
      }
      const obj = got && got.blob && typeof got.blob === 'object' ? await fc.openShortInvite(sh.token, sh.origin, got.blob) : null;
      const p = obj ? await fc.checkInvite(obj) : null;
      if (p && p.error === 'expired') throw err('gone', 'That invite has expired. Ask for a new one.', { status: 410 });
      if (!p || p.error || !p.invite) throw err('bad_invite', "That invite link couldn't be opened. Ask your friend for a new one.", { status: 400 });
      inv = p.invite;
    } else {
      const m = /ODF1\.([A-Za-z0-9_-]{40,4000})/.exec(raw);
      try { inv = m ? JSON.parse(new TextDecoder().decode(unb64u(m[1]))) : null; } catch { inv = null; }
    }
    const rel = inv && typeof inv === 'object' && inv.relay && typeof inv.relay === 'object' ? inv.relay : null;
    if (!rel || typeof rel.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(rel.token)) throw err('bad_invite', 'That invite does not include a relay. Ask your friend for an invite to their relay.', { status: 400 });
    if (Number.isFinite(inv.exp) && inv.exp < Date.now()) throw err('gone', 'That invite has expired. Ask for a new one.', { status: 410 });
    const origin = await publicOrigin(rel.origin);
    const id = await identityOf(root);
    const j = await relayClient(origin, id.signer).call('POST', '/v1/invites/redeem', { token: rel.token });
    // The relay's answer is untrusted too: known scopes and a well-formed mailbox id only.
    const scopes = (Array.isArray(j.scopes) ? j.scopes : []).filter(x => x === 'message' || x === 'sync');
    const mbox = typeof j.mbox === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(j.mbox) ? j.mbox : null;
    // Chosen here ("Use a friend's relay instead"): device sync may use it when its owner allowed sync.
    await saveHome({ origin, role: 'member', scopes: scopes.length ? scopes : ['message'], mbox, sync: scopes.includes('sync') });
    log('info', 'relay: joined a friend\'s relay');
    return { ok: true, origin, scopes };
  }

  return { status, connect, cancel, whenDone, admin, memberRevoke, memberRestore, memberScopes, inviteCancel, certRevoke, disconnect, reconnect, useInvite, useLocal, useForSync, iidOf };
}
export { WRANGLER };
/** This computer's folder for wrangler and the deploy record: the device folder, never the data folder. */
export function relayDeployDir(root) { return join(deviceRoot(root), 'relay'); }
export const relayDeployed = (root) => existsSync(join(relayDeployDir(root), 'deploy.json'));

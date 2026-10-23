// lib/remote-jobs.mjs - CONNECT ONCE, USE EVERYWHERE: the server side
// (docs/dev/MULTI_DEVICE.md "Connect once, use everywhere").
//
// Three things, on top of folder sync (lib/sync/engine.mjs):
//
//  1. CAPABILITIES. What this computer can do (Claude works here, the sources it
//     reads itself, the accounts it holds a sign-in for, its banks) is worked
//     out from what it already knows (no probe, no model run) and published in
//     its synced device record (engine.setCaps; lib/sync/caps.mjs). Refreshed
//     every minute and whenever the Connections page asks.
//
//  2. THE GROUP. GET /api/connections carries `group` (lib/sync/caps.mjs
//     groupView): which of the user's other devices can do what, so the page
//     says "Uses Claude on Home laptop" instead of "Connect Claude", and the
//     calendar and inbox show the snapshots the other devices publish
//     (remoteSources).
//
//  3. REMOTE REQUESTS (lib/sync/requests.mjs). A route marked `remote` in its
//     definition (server/router.mjs) that this computer cannot run (no Claude
//     here) while another device can is not run here: it is put in the synced
//     queue (requests.json) and answered 202 {remote}; the page shows "Asking
//     Home laptop..." and waits (GET /api/requests/:id). The device that holds
//     the capability (pickRunner: live lease, the recorded runner, the main
//     computer, then the smallest id among those online) claims it, waits a
//     moment so a competing claim can arrive (later claim wins; the loser backs
//     off), runs it through the SAME route a click there runs (app.invoke), and
//     writes the answer back. Its output also lands where it always does (the
//     day adviser's file, the AI summaries, the task chat in the state...),
//     which syncs too, so the result shows on both.
//     Only the allow-listed named jobs can be asked for, with validated params,
//     checked when asked and again before running. A request is never a shell
//     command, a tool or any other route.
//
//  4. ── host ── THE CLAUDE HOST FIRST (lib/sync/claude-host.mjs). While the
//     Claude host (Settings > Sync, else the main computer) is reachable, every
//     Claude job asked here goes to it, even when this computer has Claude too
//     (claudeRoute): the request carries hostFirst, the host claims it, this
//     computer gives the go-ahead (grant) and renews it while the host's
//     heartbeats arrive. No claim within CLAIM_MS, or the heartbeats stop and
//     the go-ahead runs out: this computer takes it back and runs it itself
//     (runLocal), and the host's late answer is thrown away (its commit guard
//     refuses, its Claude runs are cancelled). A click on Update (calendar,
//     email, bank) leaves the Claude-run sources the host reads to the host
//     (hostFetch); a source its connectors miss is read here. "Run Claude on"
//     (this computer's own choice, sync/claude-host.json in its sync folder):
//     host first, this computer only, or only the host.
//
// Node stdlib only. Tests: setLocalCapsFor(dataDir, fn) replaces what this
// computer can do (one process can host two "computers").

import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { KINDS, REQUESTS_REL, checkRequest, newRequest, readDoc, enqueue, prune, claimable, claim, finish, cancel, resultOf, isOpen, expired } from './sync/requests.mjs';
import { pickRunner, groupView, remoteSources as remoteSourcesOf, hasNeed, capableDevices, isOnline, isRecent } from './sync/caps.mjs';
import { recordedRunner, roleRunner } from './sync/roles.mjs';
import {
  CLAUDE_ROLE, CLAIM_MS, GRANT_WAIT_MS, BEAT_MS, MARGIN_MS, MODES, DEFAULT_MODE, cleanMode, claudeRoute, jobHost, chosenHostFid, reachable,
  claudeRun, splitSources, mayRun, grantRun, renewDue, released, takeBack, finishLocal, outcome,
} from './sync/claude-host.mjs';
import { presenceOf, calmText } from './sync/presence.mjs';
import { withAbortSignal } from './claude-runner.mjs';
import { aiStatusCached } from './ai.mjs';
import { loadConnections } from './datadir.mjs';
import { sourcesFor, ACCOUNT_KINDS, CSV_SOURCE } from './sources.mjs';
import { financeDir } from './finance.mjs';
import { readAccountsFile } from './accounts-file.mjs';
import { accountsFor } from './accounts.mjs';

const capsOverrides = new Map();
const keyOf = (dir) => resolve(dir).toLowerCase();
/** Tests: what this data folder's computer can do ({claude, sources, accounts, banks}); null removes it. */
export function setLocalCapsFor(dataDir, fn) { if (fn) capsOverrides.set(keyOf(dataDir), fn); else capsOverrides.delete(keyOf(dataDir)); }

const NEED_WORDS = {
  claude: { what: 'Claude', setup: 'set up Claude on this computer' },
  calendar: { what: 'the calendar', setup: 'connect the calendar on this computer' },
  email: { what: 'your email', setup: 'connect the mailbox on this computer' },
  bank: { what: 'your bank', setup: 'connect the bank on this computer' },
};
const sleep = (ms) => new Promise(r => { const t = setTimeout(r, ms); t.unref?.(); });
// ── host ──
const HOST_FILE = 'claude-host.json';                     // this computer's "Run Claude on" (its sync folder, never synced)
const FETCH_CAP = { 'fetch:calendar': 'calendar', 'fetch:inbox': 'email', 'fetch:finance': 'bank' };
const FETCH_WORDS = { 'fetch:calendar': 'the calendar', 'fetch:inbox': 'your email', 'fetch:finance': 'your bank' };
/**
 * May the Claude host read this computer's Claude-run banks for it? ── finance ── No:
 * finances sync as ONE store, the finance computer's (lib/finance-share.mjs: it
 * publishes, the others show it and their "Sync bank" asks it for its whole
 * update). A bank the host read for another computer would land in the host's
 * own finance folder, which nobody publishes. (The money does sync: SYNC_FILES
 * 'finance' and 'finance-edits'.)
 */
const financeSyncs = () => false;
const takenBackError = () => Object.assign(new Error('The computer that asked for this ran it itself.'), { status: 409, code: 'TAKEN_BACK' });

/**
 * What this computer can do, from what it already knows (no probe, no model
 * run, never a secret): {v, at, claude, sources, accounts, banks}.
 */
export async function computeLocalCaps(ctx) {
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const o = capsOverrides.get(keyOf(root));
  if (o) return { v: 1, sources: [], accounts: [], banks: [], host: 1, ...(await o()), at: Date.now() };
  const ai = aiStatusCached();
  let claude = !!(ai && ai.available);
  if (!ai) { const c = await loadConnections(root).catch(() => ({})); claude = !!(c && c.claude && c.claude.status === 'connected'); }
  let sources = [];
  try {
    const st = await sourcesFor(ctx).status({ discover: false, claudeOk: claude ? true : null });
    sources = st.sources
      .filter(s => s.enabled && !s.demo && !ACCOUNT_KINDS.includes(s.kind) && s.kind !== 'csv' && ((s.health && (s.health.connectionState || s.health.state)) === 'ok'))
      .map(s => ({ id: s.id, capability: s.capability, kind: s.kind, label: s.label, colour: s.colour, ...(s.preset ? { preset: s.preset } : {}) }));
  } catch { /* no sources yet */ }
  const accounts = [];
  try {
    const list = await readAccountsFile(root);
    const acc = accountsFor(ctx);
    for (const a of list || []) if (a && a.id && await acc.hasSignIn(a.id).catch(() => false)) accounts.push(a.id);
  } catch { /* no accounts */ }
  const banks = sources.filter(s => s.capability === 'bank').map(s => s.id);
  // ── finance ── A computer that holds the finance store (CSV imports, the
  // spreadsheet) can run finance updates too, so with no bank anywhere it is the
  // one that publishes them (lib/finance-share.mjs). Not when another device reads
  // a real bank: that one publishes.
  if (!banks.length && localFinanceStore()) {
    let other = false;
    try { other = (ctx.sync && typeof ctx.sync.groupCaps === 'function' ? ctx.sync.groupCaps() : []).some(d => !d.me && d.caps && d.caps.sources.some(s => s.capability === 'bank')); } catch { other = false; }
    if (!other) banks.push(CSV_SOURCE.id);
  }
  return { v: 1, at: Date.now(), claude, sources, accounts, banks, host: 1 };
}
/** This computer has finance data of its own (not sample data). */
function localFinanceStore() {
  const dir = financeDir();
  return !!dir && existsSync(join(dir, '_system', 'transactions.csv')) && existsSync(join(dir, '_system', 'analysis.json')) && !existsSync(join(dir, '_system', '.demo-data'));
}

/**
 * createRemoteJobs({ctx, invoke, log, now, timing}) -> the service (ctx.remoteJobs).
 *   invoke(method, path, {body, zone}) -> {status, body}: the route table (server/router.mjs app.invoke)
 *   timing: {settleMs, offlineAfterMs, tickMs, capsMs, jobPollMs, jobMaxMs}
 */
export function createRemoteJobs({ ctx, invoke, log = () => {}, now = () => Date.now(), timing = {} }) {
  const T = {
    settleMs: 1500, offlineAfterMs: 8000, tickMs: 3000, capsMs: 60000, capsFreshMs: 10000, jobPollMs: 1500, jobMaxMs: 10 * 60000,
    claimMs: CLAIM_MS, grantWaitMs: GRANT_WAIT_MS, grantPollMs: 250, beatMs: BEAT_MS, ...timing,
  };
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const file = join(root, REQUESTS_REL);
  let engine = null, live = null;
  let caps = null, capsAt = 0, capsP = null;
  let timer = null, capsTimer = null, kickTimer = null, ticking = false, again = false, started = false;
  const ran = new Set();
  const listeners = new Set();
  const hostRuns = new Map();     // ── host ── id -> AbortController: other devices' requests this computer runs now
  const localRuns = new Map();    // id -> AbortController: this computer's own requests it took back and runs itself
  let modeCache = null;
  const eng = () => engine || ctx.sync || null;

  // ─── The queue file (requests.json, synced) ─────────────────────────
  async function readQueue() { return readDoc(await readJson(file, { fallback: null }).catch(() => null)); }
  /** fn(doc) changes doc; false = nothing changed (not written). Under the file's lock (the one sync uses too). */
  function mutateQueue(fn) {
    return withLock(file, async () => {
      const doc = readDoc(await readJson(file, { fallback: null }).catch(() => null));
      const out = await fn(doc);
      if (out !== false) await writeJson(file, { version: 1, requests: doc.requests }, { trailingNewline: true });
      return out;
    });
  }
  /** Tell the other devices now (a sync pass; with live sync they have it within a second). */
  function kick() {
    const e = eng();
    if (!e || !e.active) return;
    clearTimeout(kickTimer);
    kickTimer = setTimeout(() => { e.syncNow().catch(() => {}); }, 20);
    kickTimer.unref?.();
  }

  // ─── Capabilities ────────────────────────────────────────────────────
  async function localCaps({ fresh = false } = {}) {
    if (!fresh && caps && now() - capsAt < T.capsFreshMs) return caps;
    if (capsP) return capsP;
    capsP = computeLocalCaps(ctx).then((c) => {
      caps = c; capsAt = now();
      const e = eng();
      if (e && typeof e.setCaps === 'function') e.setCaps(c);
      return c;
    }).catch(() => caps || { v: 1, claude: false, sources: [], accounts: [], banks: [] }).finally(() => { capsP = null; });
    return capsP;
  }
  const devices = () => { const e = eng(); try { return e && e.enabled && typeof e.groupCaps === 'function' ? e.groupCaps() : []; } catch { return []; } };
  const meFid = () => { const e = eng(); return e ? e.fetcherId : null; };
  // ── presence ── (lib/sync/presence.mjs) asked FIRST: a device that is asleep or off is
  // never sent a request that can only time out, and the words say so calmly.
  const presOf = (d) => (d && !d.me ? presenceOf(d.deviceId, ctx) || presenceOf(d.fetcherId, ctx) : null);
  const calmFor = (d, kind, opts) => calmText(presOf(d) || { name: (d && d.name) || 'Your other computer', base: 'off' }, kind, opts);
  const awayState = (d) => { const p = presOf(d); return p ? p.state : 'off'; };
  const FETCH_WHAT = { 'fetch:calendar': 'calendar', 'fetch:inbox': 'email', 'fetch:finance': 'bank' };
  function leaseFor(need) {
    if (need !== 'claude' || !live || !live.leases) return null;
    try { const roles = live.leases.roles(); if (!roles.includes('claude')) return null; const h = live.leases.holder('claude'); return h && h.deviceId ? h.deviceId : null; } catch { return null; }
  }
  async function rolesNow() {
    const r = await readJson(join(root, 'roles.json'), { fallback: null }).catch(() => null);
    return r && r.roles && typeof r.roles === 'object' ? r.roles : {};
  }
  async function preferredFids() {
    const roles = await rolesNow();
    return [recordedRunner('ai-brief', { roles }), recordedRunner('main', { roles })].filter(Boolean);
  }

  // ─── ── host ── The Claude host (lib/sync/claude-host.mjs) ──────────────
  /** This computer's "Run Claude on": host-first | local | host-only (its own sync folder; the default without sync). */
  async function getMode() {
    if (modeCache) return modeCache;
    const e = eng();
    if (!e || !e.localFiles) return DEFAULT_MODE;
    let m = null;
    try { const t = await e.localFiles.read(HOST_FILE); m = t ? JSON.parse(t).mode : null; } catch { m = null; }
    modeCache = cleanMode(m);
    return modeCache;
  }
  async function setMode(m) {
    if (!MODES.includes(m)) throw Object.assign(new Error('Choose where Claude runs.'), { status: 400, code: 'BAD_MODE' });
    const e = eng();
    if (!e || !e.localFiles) throw Object.assign(new Error('Turn on Sync across my devices first.'), { status: 400, code: 'SYNC_OFF' });
    await e.localFiles.write(HOST_FILE, JSON.stringify({ v: 1, mode: m }, null, 1));
    modeCache = m;
    return m;
  }
  /** Live sync's holder of the 'claude' role (a sync device id), when the lease has an answer. */
  function leaseHolder() {
    if (!live || !live.leases) return null;
    try {
      const L = live.leases;
      if (!L.ready || !L.roles().includes(CLAUDE_ROLE)) return null;
      const h = L.holder(CLAUDE_ROLE);
      return h && h.deviceId ? h.deviceId : null;
    } catch { return null; }
  }
  /** Where Claude work asked here runs now (claudeRoute), with the device the usual rule picks when there is no Claude here. */
  async function route() {
    const devs = devices();
    const list = devs.length ? devs : [{ me: true, deviceId: null, fetcherId: meFid(), name: 'this computer', caps: await localCaps() }];
    const rt = claudeRoute({ devices: list, roles: await rolesNow(), lease: leaseHolder(), mode: await getMode(), now: now() });
    if (rt.run === 'other') {
      const r = devs.length ? await runnerFor('claude', { requireApply: false }) : null;
      if (r && !r.me) rt.text = rt.why === 'host-off' ? `${rt.text}: using ${r.name || 'your other computer'}` : `Claude: using ${r.name || 'your other computer'}`;
    }
    return rt;
  }
  /** May this computer hold live sync's 'claude' role (answer for the host while it is off)? Claude works here, and its choice is not "Only <host>". */
  async function canHost() {
    const c = await localCaps();
    if (!c || !c.claude) return false;
    if ((await getMode()) !== 'host-only') return true;
    return chosenHostFid(await rolesNow()) === meFid();
  }
  /** For the sync engine (capableRunner): the device that runs Claude's automatic jobs now (claude-host.mjs jobHost). */
  function autoHost(need, { devices: devs = [], roles = {} } = {}) {
    try { return jobHost({ devices: devs, roles, lease: leaseHolder(), need, now: now() }); } catch { return null; }
  }
  /**
   * Settings > Sync "Claude": {sync, mode, here, host, chosen, main, hosts:[{id, name, me, online, host}], route:{run, why, text}}.
   * chosen: the host was picked (roles.json `claude`); else it is the main computer.
   */
  async function hostStatus() {
    const e = eng();
    const rt = await route();
    const roles = await rolesNow();
    const fid = chosenHostFid(roles);
    const devs = devices();
    const mainFid = recordedRunner('main', { roles });
    const mainDev = mainFid ? devs.find(d => d.fetcherId === mainFid) : null;
    const t = now();
    const hosts = devs.filter(d => d.kind !== 'phone' && d.caps && d.caps.claude === true && isRecent(d, t))
      .map(d => ({ id: d.deviceId, name: d.me ? 'This computer' : d.name || 'Another computer', me: !!d.me, online: reachable(d, t), host: !!fid && d.fetcherId === fid }));
    return {
      sync: !!(e && e.enabled), mode: await getMode(), modes: [...MODES], here: rt.here,
      host: rt.host ? { name: rt.host.me ? 'This computer' : rt.host.name, me: rt.host.me, online: rt.host.online } : null,
      chosen: !!roleRunner(roles, CLAUDE_ROLE), main: mainDev ? (mainDev.me ? 'This computer' : mainDev.name) : null,
      hosts, route: { run: rt.run, why: rt.why, text: rt.text },
    };
  }
  /** Pick the Claude host: a device id from hostStatus().hosts, 'this', or 'main' (follow the main computer). */
  async function setHost(id) {
    const e = eng();
    if (!e || !e.enabled) throw Object.assign(new Error('Turn on Sync across my devices first.'), { status: 400, code: 'SYNC_OFF' });
    if (id === 'main' || id == null || id === '') { await e.clearFetcher(CLAUDE_ROLE); return hostStatus(); }
    const st = await hostStatus();
    const pick = id === 'this' ? st.hosts.find(h => h.me) : st.hosts.find(h => h.id === id);
    if (!pick) throw Object.assign(new Error('That computer does not have Claude (or is not known here yet).'), { status: 400, code: 'NOT_A_HOST' });
    const d = devices().find(x => x.deviceId === pick.id);
    await e.setFetcher(CLAUDE_ROLE, pick.id, { name: d && d.name });
    return hostStatus();
  }
  /** The device that runs a request needing `need` (to: a fixed device), or null. */
  async function runnerFor(need, { to = null, requireApply = true } = {}) {
    const devs = devices();
    if (to) { const d = capableDevices(devs, need, { now: now() }).find(x => x.fetcherId === to); return d && (!requireApply || d.caps.apply) ? d : null; }
    return pickRunner({ devices: devs, need, lease: leaseFor(need), preferred: await preferredFids(), now: now(), requireApply });
  }

  // ─── Asking ──────────────────────────────────────────────────────────
  async function ask(kind, body, { zone = null, to = null, hostFirst = false, alt = null } = {}) {
    const e = eng();
    const { params } = checkRequest(kind, { ...(body || {}), ...(zone ? { zone } : {}) });
    const me = devices().find(d => d.me);
    const req = newRequest({ id: 'rq_' + randomBytes(8).toString('hex'), kind, params, by: e.fetcherId, byName: (me && me.name) || '', to, now: now(), hostFirst, alt });
    await mutateQueue((doc) => { enqueue(doc, req, { now: now() }); });
    log('info', `remote request ${kind}: asked${req.hostFirst ? ' (the Claude host first)' : ''}`);
    kick();
    return req;
  }

  /**
   * The router's hook for a route marked `remote: {kind}` (kind: a name or
   * (body) -> name | null). Null: run here as usual. Else {status, body}:
   * 202 {remote} (asked another device), or 409 when the only devices that
   * could are in trial mode.
   */
  async function forward(spec, c) {
    if (!spec || c.internal) return null;
    const body = await c.body({ allowEmpty: true });
    c.body = async () => body;                                // the handler reads it again
    const kind = typeof spec.kind === 'function' ? await spec.kind(body || {}, c) : spec.kind;
    if (!kind || !Object.prototype.hasOwnProperty.call(KINDS, kind)) return null;
    const e = eng();
    if (!e || !e.enabled || !e.active) return null;
    const need = KINDS[kind].need;
    const mine = hasNeed(await localCaps(), need);
    // ── host ── The Claude host first, even when this computer has Claude too; this computer
    // when the host is off (lib/sync/claude-host.mjs claudeRoute).
    if (need === 'claude') {
      const rt = await route();
      if (rt.run === 'here') return null;
      if (rt.run === 'off') {
        // ── presence ── calm, not an error: nothing was started, and the page says so in one line.
        const name = (rt.host && rt.host.name) || 'Your other computer';
        const hd = (rt.host && devices().find(d => d.fetcherId === rt.host.fetcherId)) || { name };
        return { status: 503, body: { code: 'HOST_OFF', calm: true, runsOn: name, presence: awayState(hd), error: calmFor(hd, 'claude') } };
      }
      if (rt.run === 'host' && e.apply && rt.to && rt.to.apply) {
        const req = await ask(kind, body, { zone: c.zone, to: rt.to.fetcherId, hostFirst: !!rt.fallback });
        return { status: 202, body: { remote: await publicOf(req) } };
      }
      // The host cannot be asked (trial mode on one side), or there is no host up and no Claude here: as before.
    }
    if (mine) return null;                                     // this computer can: it runs here
    const runner = await runnerFor(need);
    if (!runner) {
      const any = await runnerFor(need, { requireApply: false });
      if (!any) return null;                                   // nobody can: the route says "Connect ..." as before
      return { status: 409, body: { code: 'OTHER_IN_TRIAL', error: `${any.name || 'Your other computer'} has ${NEED_WORDS[need].what}, but it does not take changes from your other computers yet. Turn on "Use changes from my other computers" in Settings > Sync on ${any.name || 'it'}.` } };
    }
    if (!e.apply) return { status: 409, body: { code: 'TRIAL_MODE', error: `${runner.name || 'Your other computer'} has ${NEED_WORDS[need].what}. To use it here, turn on "Use changes from my other computers" in Settings > Sync.` } };
    // ── presence ── every device that could is asleep or off: start nothing that can only time out.
    if (!runner.me && !isOnline(runner, now())) {
      return { status: 503, body: { code: 'PEER_OFF', calm: true, runsOn: runner.name || 'Your other computer', presence: awayState(runner), error: calmFor(runner, need === 'claude' ? 'claude' : 'request') } };
    }
    const req = await ask(kind, body, { zone: c.zone });
    return { status: 202, body: { remote: await publicOf(req) } };
  }

  /**
   * A click on "Update" where other devices read sources this one does not
   * (their calendar links, their Claude connectors): each is asked to update
   * too ('fetch:calendar' | 'fetch:inbox' | 'fetch:finance'). -> [{id, runsOn}].
   */
  async function askOthers(kind, body, c) {
    const e = eng();
    if (!e || !e.enabled || !e.active || !e.apply || !KINDS[kind] || !KINDS[kind].need) return [];
    const need = KINDS[kind].need;
    // ── presence ── only the ones that are there: one asleep or off updates its own when it is back (awayFor says so).
    const others = capableDevices(devices(), need, { now: now() }).filter(d => !d.me && d.caps.apply && isOnline(d, now()));
    const out = [];
    for (const d of others) {
      const doc = await readQueue();
      const dup = doc.requests.find(r => r.kind === kind && r.to === d.fetcherId && r.by === e.fetcherId && isOpen(r) && !expired(r, now()));
      if (dup) { out.push({ id: dup.id, runsOn: d.name || 'your other computer' }); continue; }
      const req = await ask(kind, body, { zone: c && c.zone, to: d.fetcherId }).catch(() => null);
      if (req) out.push({ id: req.id, runsOn: d.name || 'your other computer' });
    }
    return out;
  }

  /**
   * ── presence ── The other devices that read sources for `kind` but are asleep or off
   * now (askOthers leaves them out): [{name, state, text}] with the calm line for each
   * ("Mac is asleep: its calendar shows what it last sent.").
   */
  function awayFor(kind) {
    const e = eng();
    if (!e || !e.enabled || !e.active || !KINDS[kind] || !KINDS[kind].need) return [];
    return capableDevices(devices(), KINDS[kind].need, { now: now() }).filter(d => !d.me && !isOnline(d, now()))
      .map(d => ({ name: d.name || 'Your other computer', state: awayState(d), text: calmFor(d, 'fetch', { what: FETCH_WHAT[kind] }) }));
  }

  /**
   * ── host ── A click on "Update" ('fetch:calendar' | 'fetch:inbox' | 'fetch:finance'):
   * the Claude-run sources of this computer (the connectors, MCP servers) that the
   * Claude host reads too are left to the host, which is asked to update; the ones
   * its connectors miss, and every source not read through Claude (calendar links,
   * accounts, direct banks), are read here as before. With "<host> first, then this
   * computer" this computer reads the left ones itself when the host does not answer
   * (the request's alt: only those). Call it before askOthers (which then finds this
   * request). -> {skip: [source ids not to read here], asked: [{id, runsOn}], message?}
   */
  async function hostFetch(kind, body, c) {
    const none = { skip: [], asked: [] };
    const e = eng();
    const cap = FETCH_CAP[kind];
    if (!cap || (c && c.internal) || !e || !e.enabled || !e.active || !e.apply) return none;
    if (kind === 'fetch:finance' && !financeSyncs()) return none;   // the money does not sync yet: its result would stay on the host
    let mineSrc = [];
    try { mineSrc = (await sourcesFor(ctx).all()).filter(s => s.capability === cap && s.enabled && !s.demo && !s.remote && claudeRun(s)); } catch { mineSrc = []; }
    const rt = await route();
    const words = FETCH_WORDS[kind];
    if (rt.run === 'off') {
      const name = (rt.host && rt.host.name) || 'Your other computer';
      const hd = (rt.host && devices().find(d => d.fetcherId === rt.host.fetcherId)) || { name };
      const p = presOf(hd);
      const word = p && p.base === 'asleep' ? 'asleep' : 'off';
      return mineSrc.length ? { skip: mineSrc.map(s => s.id), asked: [], calm: true, message: `${name} is ${word}: ${words} from Claude updates when it's back.` } : none;
    }
    if (rt.run !== 'host' || !rt.to || !rt.to.apply) return none;
    const host = devices().find(d => d.fetcherId === rt.to.fetcherId);
    if (!host || !host.caps || !hasNeed(host.caps, KINDS[kind].need)) return none;
    const split = splitSources(mineSrc, host.caps);
    const doc = await readQueue();
    const dup = doc.requests.find(r => r.kind === kind && r.to === host.fetcherId && r.by === e.fetcherId && isOpen(r) && !expired(r, now()));
    const name = host.name || 'your other computer';
    if (dup) return { skip: split.host, asked: [{ id: dup.id, runsOn: name }] };
    const fallback = !!rt.fallback && split.host.length > 0;
    const req = await ask(kind, body, { zone: c && c.zone, to: host.fetcherId, hostFirst: fallback, alt: fallback ? { only: split.host } : null }).catch(() => null);
    if (!req) return none;                                        // too many waiting: read here as before
    return { skip: split.host, asked: [{ id: req.id, runsOn: name }] };
  }

  // ─── What the page sees ──────────────────────────────────────────────
  async function publicOf(r) {
    if (!r) return null;
    const def = KINDS[r.kind] || { label: 'Working', need: 'claude' };
    const devs = devices();
    const by = (fid) => devs.find(d => d.fetcherId === fid) || null;
    const runner = r.claimedBy ? by(r.claimedBy) : r.to ? by(r.to) : await runnerFor(def.need);
    const name = (runner && runner.name) || 'your other computer';
    const online = !!(runner && isOnline(runner, now()));
    const words = NEED_WORDS[def.need] || NEED_WORDS.claude;
    // ── host ── Taken back: this computer's own run is the answer; the host's (late) one never is.
    if (r.hostFirst && r.back) {
      const o = outcome(r);
      const host = (r.to && by(r.to)) || runner;
      const hn = (host && host.name) || 'Your other computer';
      let st = o.status, state = o.status, message;
      let calm = false;
      if (r.back.why === 'cancel' || st === 'cancelled') { st = 'cancelled'; state = 'cancelled'; message = 'Cancelled.'; }
      else if (st === 'running') { state = 'fallback'; message = `${calmFor(host || { name: hn }, 'claude', { here: true })}…`; }
      else if (st === 'done') message = 'Done on this computer.';
      else { st = 'error'; message = (o.error && o.error.message) || 'It did not work on this computer.'; if (o.error && o.error.code === 'HOLDER_OFFLINE') { state = 'offline'; calm = true; } }
      return {
        id: r.id, kind: r.kind, label: def.label, status: st, state, at: r.at, exp: r.exp, runsOn: 'this computer', online: true, message, fallback: true, ...(calm ? { calm: true } : {}),
        ...(o.result ? { result: o.result } : {}), ...(o.error ? { error: o.error } : {}),
      };
    }
    let state = r.status, message, calm = false;
    if (r.status === 'queued') { state = 'waiting'; message = `Asking ${name}…`; }
    else if (r.status === 'running') message = `${name} is working on it…`;
    else if (r.status === 'done') message = `Done on ${name}.`;
    else if (r.status === 'error') { message = (r.error && r.error.message) || `${name} could not do it.`; if (r.error && r.error.code === 'HOLDER_OFFLINE') { state = 'offline'; calm = true; } }
    else if (r.status === 'cancelled') message = 'Cancelled.';
    // ── presence ── it went away while asked: say so calmly; still there but slow: as before.
    else if (r.status === 'expired') { if (runner && !online) { state = 'offline'; calm = true; message = calmFor(runner, def.need === 'claude' ? 'claude' : 'request'); } else message = `${name} did not answer in time. Try again later, or ${words.setup}.`; }
    return {
      id: r.id, kind: r.kind, label: def.label, status: r.status, state, at: r.at, exp: r.exp, runsOn: name, online, message, ...(calm ? { calm: true, presence: awayState(runner) } : {}),
      ...(r.result ? { result: r.result } : {}), ...(r.error ? { error: r.error } : {}),
    };
  }
  /** One request for the page; the requester's own housekeeping happens here (too old, or its device is off). */
  async function get(id) {
    let r = (await readQueue()).requests.find(x => x.id === id) || null;
    if (!r) return null;
    const me = meFid();
    // ── host ── grant, renew, or take back (and run it here): the requester's side of the protocol.
    if (r.hostFirst && r.by === me) {
      if (!r.back && await steer(id)) r = (await readQueue()).requests.find(x => x.id === id) || r;
      return publicOf(r);
    }
    if (r.status === 'queued' && r.by === me) {
      const def = KINDS[r.kind] || { need: 'claude' };
      const t = now();
      let why = null;
      if (expired(r, t)) why = 'expired';
      else if (t - r.at > T.offlineAfterMs) {
        const runner = r.to ? devices().find(d => d.fetcherId === r.to) : await runnerFor(def.need);
        if (!runner || !isOnline(runner, t)) why = 'offline';
      }
      if (why) {
        const runner = r.to ? devices().find(d => d.fetcherId === r.to) : await runnerFor(def.need);
        const name = (runner && runner.name) || 'Your other computer';
        // ── presence ── calm words ("Mac is asleep. Claude answers there when it's back."), never "Try again".
        const text = calmFor(runner || { name }, def.need === 'claude' ? 'claude' : 'request');
        await mutateQueue((doc) => {
          const x = doc.requests.find(q => q.id === id);
          if (!x || x.status !== 'queued') return false;
          if (why === 'expired') { x.status = 'expired'; x.doneAt = t; }
          else { cancel(x, t); x.status = 'error'; x.error = { code: 'HOLDER_OFFLINE', message: text }; }
          return true;
        });
        kick();
        r = (await readQueue()).requests.find(x => x.id === id) || r;
      }
    }
    return publicOf(r);
  }
  async function list() {
    const me = meFid();
    const doc = await readQueue();
    const out = [];
    for (const r of doc.requests) if (r.by === me || r.claimedBy === me) out.push(await publicOf(r));
    return out.sort((a, b) => b.at - a.at).slice(0, 50);
  }
  async function cancelRequest(id) {
    const me = meFid();
    let stop = false;
    const ok = await mutateQueue((doc) => {
      const x = doc.requests.find(q => q.id === id);
      if (!x || x.by !== me) return false;
      // ── host ── a host-first request: only the asker's own fields (the host stops when it sees `back`).
      if (x.hostFirst) {
        if (!x.back) return takeBack(x, me, { why: 'cancel', now: now() });
        if (x.local && x.local.status === 'running') { x.local = { ...x.local, status: 'cancelled', doneAt: now() }; stop = true; return true; }
        return false;
      }
      return cancel(x, now());
    });
    if (stop && localRuns.has(id)) localRuns.get(id).abort();
    if (ok) kick();
    return get(id);
  }

  // ─── ── host ── The asker's side: go-ahead, renewal, taking back ──────
  const hostName = (fid) => { const d = fid ? devices().find(x => x.fetcherId === fid) : null; return (d && d.name) || 'Your other computer'; };
  /**
   * One of this computer's host-first requests: give the host the go-ahead once it
   * claimed it, renew it while its heartbeats arrive, take it back when it did not
   * claim in time, released it, or its go-ahead ran out (then run it here, or say
   * the host is off when this computer cannot). Returns what it did, or null.
   */
  async function steer(id) {
    const me = meFid();
    if (!me) return null;
    let pre = (await readQueue()).requests.find(x => x.id === id);
    if (!pre || pre.by !== me || !pre.hostFirst || pre.back) return null;
    // About to take it back: bring in what the host sent last (a claim, or its answer) first.
    const t0 = now();
    if ((pre.status === 'queued' && t0 - pre.at > T.claimMs) || (pre.status === 'running' && pre.grant && pre.grant.until + MARGIN_MS < t0)) {
      const e = eng();
      if (e && e.active) await e.syncNow().catch(() => {});
      pre = (await readQueue()).requests.find(x => x.id === id);
      if (!pre || pre.back) return null;
    }
    const hasIt = hasNeed(await localCaps(), pre.need || 'claude');
    const canHere = hasIt && (await getMode()) !== 'host-only';
    // ── presence ── the host went asleep or off since it was asked: take it back now, not after CLAIM_MS.
    const hostDev = pre.to ? devices().find(d => d.fetcherId === pre.to) || null : null;
    const hp = presOf(hostDev);
    const hostAway = !!(hp && !hp.reachable && !hp.checking);
    let act = null;
    await mutateQueue((doc) => {
      const r = doc.requests.find(x => x.id === id);
      if (!r || r.by !== me || !r.hostFirst || r.back) return false;
      const t = now();
      let back = false;
      if (r.status === 'queued') back = t - r.at > T.claimMs || expired(r, t) || hostAway;          // not claimed in time, or it went away
      else if (r.status === 'running' && r.claimedBy) {
        if (!r.grant) { if (grantRun(r, me, t)) act = 'grant'; }
        else if (renewDue(r, t)) { if (grantRun(r, me, t)) act = 'renew'; }
        else back = r.grant.until + MARGIN_MS < t;                                      // the heartbeats stopped: the host is off
      } else back = released(r) || r.status === 'expired';
      if (back && takeBack(r, me, { why: 'fallback', now: t })) {
        if (canHere && !expired(r, t)) act = 'local';
        else {
          act = 'off';
          finishLocal(r, me, { ok: false, error: { code: 'HOLDER_OFFLINE', message: `${calmFor(hostDev || { name: hostName(r.to) }, 'claude')}${hasIt ? '' : ' Or set up Claude on this computer.'}` }, now: t });
        }
      }
      return act ? true : false;
    });
    if (!act) return null;
    kick();
    if (act === 'local') { log('info', `remote request ${pre.kind}: the Claude host did not answer; running it on this computer`); runLocal(id).catch(() => {}); }
    else if (act === 'grant') log('info', `remote request ${pre.kind}: the Claude host took it`);
    return act;
  }
  /** Every host-first request of this computer that may still need a step (its tick). */
  async function steerOwn() {
    const me = meFid();
    if (!me) return;
    const mine = (await readQueue()).requests.filter(r => r.by === me && r.hostFirst && !r.back && (['queued', 'running', 'expired'].includes(r.status) || released(r)));
    for (const r of mine) await steer(r.id).catch(() => null);
  }
  /** Run one of this computer's own requests here, the same route a click runs (it took it back from the host). */
  async function runLocal(id) {
    if (localRuns.has(id)) return false;
    const ac = new AbortController();
    localRuns.set(id, ac);
    const me = meFid();
    let res = null, r = null;
    try {
      r = (await readQueue()).requests.find(x => x.id === id);
      if (!r || r.by !== me || !r.back || !r.local || r.local.status !== 'running') { r = null; return false; }
      const c = checkRequest(r.kind, r.alt || r.params);   // again: the file is never trusted
      const { zone = null, ...params } = c.params;
      const def = KINDS[r.kind];
      res = await withAbortSignal(ac.signal, async () => {
        let x = await invoke(def.method, def.path, { body: params, zone });
        // This computer's own update is still running (it read its other sources): wait for it, then once more.
        if (def.statusPath && x.status === 409 && x.body && x.body.job) {
          await waitForJob(def.statusPath, x, zone, () => ac.signal.aborted);
          if (!ac.signal.aborted) x = await invoke(def.method, def.path, { body: params, zone });
        }
        if (def.statusPath && x.status === 202) x = await waitForJob(def.statusPath, x, zone, () => ac.signal.aborted);
        return x;
      });
    } catch (err) {
      res = { status: err.status || 500, body: { error: (err.status && err.message) || 'It could not run.', code: err.code || 'FAILED' } };
    } finally {
      localRuns.delete(id);
    }
    if (!r || !res) return false;
    const ok = res.status < 400;
    const body = res.body && typeof res.body === 'object' ? res.body : {};
    await mutateQueue((doc) => {
      const x = doc.requests.find(q => q.id === id);
      return finishLocal(x, me, { ok, result: resultOf(res.status, res.body), error: ok ? null : { code: body.code || 'FAILED', message: body.error && typeof body.error === 'object' ? body.error.message : body.error || body.message }, now: now() });
    });
    kick();
    log('info', `remote request ${r.kind}: ran on this computer: ${ok ? 'done' : `failed (${body.code || res.status})`}`);
    for (const fn of listeners) { try { fn({ id, kind: r.kind, ok, here: true }); } catch { /* fine */ } }
    return true;
  }
  /** Stop what no longer belongs to this computer: a host run the asker took back (or whose go-ahead ran out), a local run cancelled. */
  async function watchRuns() {
    if (!hostRuns.size && !localRuns.size) return;
    const doc = await readQueue();
    const me = meFid(), t = now();
    for (const [id, ac] of hostRuns) {
      const r = doc.requests.find(x => x.id === id);
      const gone = !r || (r.hostFirst ? !mayRun(r, me, t) : r.status === 'cancelled' || expired(r, t));
      if (gone && !ac.signal.aborted) { ac.abort(); log('note', 'remote request: the asking computer took it back; stopped here'); }
    }
    for (const [id, ac] of localRuns) {
      const r = doc.requests.find(x => x.id === id);
      if ((!r || !r.local || r.local.status !== 'running') && !ac.signal.aborted) ac.abort();
    }
  }

  // ─── Running other devices' requests ─────────────────────────────────
  /** ── host ── The host waits for the asker's go-ahead: 'yes', or 'no' (taken back, gone) / 'timeout'. */
  async function waitForGrant(id, me) {
    const end = now() + T.grantWaitMs;
    for (;;) {
      const r = (await readQueue()).requests.find(x => x.id === id);
      if (!r || r.back || r.claimedBy !== me || r.status !== 'running') return 'no';
      if (mayRun(r, me, now())) return 'yes';
      if (now() >= end) return 'timeout';
      await sleep(T.grantPollMs);
    }
  }
  /** The host lets a request go (it will never run or commit it): the asker may run it at once. */
  async function release(id, me, message) {
    const ok = await mutateQueue((doc) => {
      const x = doc.requests.find(q => q.id === id);
      if (!x || x.claimedBy !== me || x.status !== 'running') return false;
      x.status = 'error'; x.doneAt = now(); x.error = { code: 'RELEASED', message: String(message || 'Released.').slice(0, 300) };
      return true;
    });
    if (ok) kick();
    return ok;
  }
  async function runOne(id) {
    const e = eng();
    const me = e.fetcherId;
    const claimed = await mutateQueue((doc) => { const r = doc.requests.find(x => x.id === id); return claim(r, me, now()) ? true : false; });
    if (!claimed) return false;
    ran.add(id);
    kick();
    let r = (await readQueue()).requests.find(x => x.id === id);
    if (r && r.hostFirst) {
      // ── host ── Only the asker can let it run (it may run it itself instead): wait for its go-ahead.
      const go = await waitForGrant(id, me);
      if (go !== 'yes') { await release(id, me, 'The computer that asked ran it itself.'); log('note', `remote request ${r.kind}: the asking computer ran it itself`); return false; }
    } else {
      // A moment for a competing claim to arrive: the later claim wins everywhere, the other backs off.
      await sleep(T.settleMs);
      await e.syncNow().catch(() => {});
    }
    r = (await readQueue()).requests.find(x => x.id === id);
    if (!r || r.claimedBy !== me || r.status !== 'running' || !mayRun(r, me, now())) { log('note', 'remote request: another device took it'); return false; }
    const first = !!r.hostFirst;
    const ac = new AbortController();
    hostRuns.set(id, ac);
    // The heartbeat: the asker renews the go-ahead while it hears it (lib/sync/claude-host.mjs).
    const beat = first ? setInterval(() => {
      mutateQueue((doc) => { const x = doc.requests.find(q => q.id === id); if (!mayRun(x, me, now())) return false; x.beat = now(); return true; })
        .then((wrote) => { if (wrote) kick(); else if (!ac.signal.aborted) ac.abort(); }).catch(() => {});
    }, T.beatMs) : null;
    beat?.unref?.();
    const guard = first ? async () => { const x = (await readQueue()).requests.find(q => q.id === id); if (!mayRun(x, me, now())) throw takenBackError(); } : null;
    let res;
    try {
      const c = checkRequest(r.kind, r.params);             // again: the file is never trusted
      const { zone = null, ...params } = c.params;
      const def = KINDS[r.kind];
      res = await withAbortSignal(ac.signal, async () => {
        let x = await invoke(def.method, def.path, { body: params, zone, guard });
        if (def.statusPath && x.status === 202) x = await waitForJob(def.statusPath, x, zone, () => ac.signal.aborted);
        return x;
      });
    } catch (err) {
      res = { status: err.status || 500, body: { error: (err.status && err.message) || 'It could not run.', code: err.code || 'FAILED' } };
    } finally {
      if (beat) clearInterval(beat);
      hostRuns.delete(id);
    }
    const ok = res.status < 400;
    const body = res.body && typeof res.body === 'object' ? res.body : {};
    let late = false;
    await mutateQueue((doc) => {
      const x = doc.requests.find(q => q.id === id);
      // ── host ── Too late (taken back, or the go-ahead ran out): the answer is thrown away, never written.
      if (first && !mayRun(x, me, now())) {
        late = true;
        if (!x || x.claimedBy !== me || x.status !== 'running') return false;
        x.status = 'error'; x.doneAt = now(); x.error = { code: 'RELEASED', message: 'The computer that asked ran it itself.' };
        return true;
      }
      return finish(x, me, { ok, result: resultOf(res.status, res.body), error: ok ? null : { code: body.code || 'FAILED', message: body.error && typeof body.error === 'object' ? body.error.message : body.error || body.message }, now: now() });
    });
    kick();
    if (late) { log('note', `remote request ${r.kind} for ${r.byName || 'another device'}: the asking computer ran it itself; this answer was not used`); return false; }
    log('info', `remote request ${r.kind} for ${r.byName || 'another device'}: ${ok ? 'done' : `failed (${body.code || res.status})`}`);
    for (const fn of listeners) { try { fn({ id, kind: r.kind, ok }); } catch { /* fine */ } }
    return true;
  }
  /** A fetch job answers 202 and runs on: wait for it to finish, so "done" means the data is there. */
  async function waitForJob(statusPath, first, zone, stop = () => false) {
    const end = now() + T.jobMaxMs;
    let last = first;
    while (now() < end && !stop()) {
      const s = await invoke('GET', statusPath, { zone });
      last = s;
      const job = s.body && s.body.job;
      if (!job || job.state !== 'running') break;
      await sleep(T.jobPollMs);
    }
    const job = last.body && last.body.job;
    if (job && job.state === 'error') return { status: 502, body: { error: job.error || 'The update failed.', code: job.code || 'FAILED' } };
    return { status: 200, body: { job: job || null } };
  }

  /**
   * ── host ── The protocol's steps that must not wait behind a long run: stop what
   * was taken back, give the go-ahead or take back this computer's own requests.
   */
  let pulsing = false;
  async function pulse() {
    const e = eng();
    if (pulsing || !e || !e.active || !e.enabled || !e.apply) return;
    pulsing = true;
    try { await watchRuns(); await steerOwn(); }
    catch (err) { log('warn', `remote requests (host): ${(err && (err.code || err.message)) || err}`); }
    finally { pulsing = false; }
  }
  /** Look at the queue: claim and run what this device should (one at a time). */
  async function tick() {
    pulse();
    if (ticking) { again = true; return; }
    const e = eng();
    if (!e || !e.active || !e.enabled || !e.apply) return;
    ticking = true;
    try {
      const doc = await readQueue();
      const me = e.fetcherId, t = now();
      for (const r0 of doc.requests) {
        if (!claimable(r0, me, t) || ran.has(r0.id)) continue;
        const def = KINDS[r0.kind];
        const mine = await localCaps();
        if (!hasNeed(mine, def.need)) continue;
        if (!r0.to) { const runner = await runnerFor(def.need); if (!runner || !runner.me) continue; }
        await runOne(r0.id);
      }
      // The requester tidies its own: finished ones go after a while, the file stays small.
      const mineOld = doc.requests.some(r => r.by === me && (!isOpen(r) || expired(r, t)));
      if (mineOld) await mutateQueue((d) => (prune(d, { now: now() }) ? true : false));
    } catch (err) {
      log('warn', `remote requests: ${(err && (err.code || err.message)) || err}`);
    } finally {
      ticking = false;
      if (again) { again = false; setTimeout(() => tick(), 10).unref?.(); }
    }
  }

  // ─── Wiring ──────────────────────────────────────────────────────────
  /** Called by server/routes/sync.mjs once the engine (and live sync) exist. */
  function attach(e, l = null) {
    engine = e; live = l || null;
    modeCache = null;
    if (live && typeof e.setLivePeers === 'function') e.setLivePeers(() => new Set(live.sessions ? live.sessions.keys() : []));
    // ── host ── Claude's automatic jobs follow the Claude host (or live sync's 'claude' lease holder).
    if (typeof e.setClaudeHost === 'function') e.setClaudeHost(autoHost);
    e.onApplied((info) => {
      const rels = (info && info.fileRels) || [];
      if (rels.includes(REQUESTS_REL) && T.autoTick !== false) setTimeout(() => tick(), 0).unref?.();
      if (rels.length) for (const fn of fileListeners) { try { fn(rels); } catch { /* fine */ } }
    });
  }
  const fileListeners = new Set();
  async function start() {
    if (started) return;
    started = true;
    await localCaps({ fresh: true }).catch(() => {});
    // A request this device was running when it stopped: say so (it never finished).
    const me = meFid();
    if (me) await mutateQueue((doc) => {
      let n = 0;
      for (const r of doc.requests) if (r.status === 'running' && r.claimedBy === me && !ran.has(r.id)) { finish(r, me, { ok: false, error: { code: 'INTERRUPTED', message: 'It stopped before it finished. Try again.' }, now: now() }); n++; }
      // ── host ── this computer's own run of a request it took back
      for (const r of doc.requests) if (r.by === me && r.back && r.local && r.local.status === 'running' && !localRuns.has(r.id)) { finishLocal(r, me, { ok: false, error: { code: 'INTERRUPTED', message: 'It stopped before it finished. Try again.' }, now: now() }); n++; }
      return n ? true : false;
    }).catch(() => {});
    timer = setInterval(() => { tick(); }, T.tickMs); timer.unref?.();
    capsTimer = setInterval(() => { localCaps({ fresh: true }).catch(() => {}); }, T.capsMs); capsTimer.unref?.();
  }
  function stop() { started = false; clearInterval(timer); clearInterval(capsTimer); clearTimeout(kickTimer); }

  /** GET /api/connections `group` (lib/sync/caps.mjs groupView) plus the other devices' sources. */
  function group() {
    const e = eng();
    if (!e || !e.enabled) return null;
    return { ...groupView({ devices: devices(), now: now(), apply: !!e.apply }), sources: remoteSourcesOf(devices(), { now: now() }).map(s => ({ id: s.id, capability: s.capability, kind: s.kind, label: s.label, via: s.deviceName, online: s.online })) };
  }
  /**
   * The other devices' sources of one capability that this computer does not
   * read itself, shaped like sources (lib/sources.mjs) with `remote: {name}`:
   * their snapshots arrive by sync; they are shown, never fetched here.
   */
  function remoteSources(capability, localIds = []) {
    const e = eng();
    if (!e || !e.enabled || !e.apply) return [];
    const own = new Set(localIds);
    return remoteSourcesOf(devices(), { now: now() })
      .filter(s => s.capability === capability && !own.has(s.id))
      .map(s => ({ id: s.id, capability: s.capability, kind: s.kind, label: s.label, colour: s.colour || 'slate', ...(s.preset ? { preset: s.preset } : {}), enabled: true, accounts: [], remote: { name: s.deviceName, online: s.online } }));
  }

  return {
    forward, ask, askOthers, awayFor, get, list, cancel: cancelRequest, tick, start, stop, attach, group, remoteSources, runnerFor,
    // ── host ── (lib/sync/claude-host.mjs)
    hostFetch, route, canHost, getMode, setMode, hostStatus, setHost,
    /** Claim one request and run it (the worker's own step; tests call it to make two devices race). */
    runOne: (id) => runOne(id),
    refreshCaps: () => localCaps({ fresh: true }), localCaps,
    onDone(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onFiles(fn) { fileListeners.add(fn); return () => fileListeners.delete(fn); },
    readQueue, timing: T,
  };
}

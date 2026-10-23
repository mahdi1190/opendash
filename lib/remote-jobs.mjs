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
// Node stdlib only. Tests: setLocalCapsFor(dataDir, fn) replaces what this
// computer can do (one process can host two "computers").

import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { KINDS, REQUESTS_REL, checkRequest, newRequest, readDoc, enqueue, prune, claimable, claim, finish, cancel, resultOf, isOpen, expired } from './sync/requests.mjs';
import { pickRunner, groupView, remoteSources as remoteSourcesOf, hasNeed, capableDevices, isOnline } from './sync/caps.mjs';
import { recordedRunner } from './sync/roles.mjs';
import { aiStatusCached } from './ai.mjs';
import { loadConnections } from './datadir.mjs';
import { sourcesFor, ACCOUNT_KINDS } from './sources.mjs';
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

/**
 * What this computer can do, from what it already knows (no probe, no model
 * run, never a secret): {v, at, claude, sources, accounts, banks}.
 */
export async function computeLocalCaps(ctx) {
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const o = capsOverrides.get(keyOf(root));
  if (o) return { v: 1, sources: [], accounts: [], banks: [], ...(await o()), at: Date.now() };
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
  return { v: 1, at: Date.now(), claude, sources, accounts, banks: sources.filter(s => s.capability === 'bank').map(s => s.id) };
}

/**
 * createRemoteJobs({ctx, invoke, log, now, timing}) -> the service (ctx.remoteJobs).
 *   invoke(method, path, {body, zone}) -> {status, body}: the route table (server/router.mjs app.invoke)
 *   timing: {settleMs, offlineAfterMs, tickMs, capsMs, jobPollMs, jobMaxMs}
 */
export function createRemoteJobs({ ctx, invoke, log = () => {}, now = () => Date.now(), timing = {} }) {
  const T = { settleMs: 1500, offlineAfterMs: 8000, tickMs: 3000, capsMs: 60000, capsFreshMs: 10000, jobPollMs: 1500, jobMaxMs: 10 * 60000, ...timing };
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const file = join(root, REQUESTS_REL);
  let engine = null, live = null;
  let caps = null, capsAt = 0, capsP = null;
  let timer = null, capsTimer = null, kickTimer = null, ticking = false, again = false, started = false;
  const ran = new Set();
  const listeners = new Set();
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
  function leaseFor(need) {
    if (need !== 'claude' || !live || !live.leases) return null;
    try { const roles = live.leases.roles(); if (!roles.includes('claude')) return null; const h = live.leases.holder('claude'); return h && h.deviceId ? h.deviceId : null; } catch { return null; }
  }
  async function preferredFids() {
    const r = await readJson(join(root, 'roles.json'), { fallback: null }).catch(() => null);
    const roles = r && r.roles && typeof r.roles === 'object' ? r.roles : {};
    return [recordedRunner('ai-brief', { roles }), recordedRunner('main', { roles })].filter(Boolean);
  }
  /** The device that runs a request needing `need` (to: a fixed device), or null. */
  async function runnerFor(need, { to = null, requireApply = true } = {}) {
    const devs = devices();
    if (to) { const d = capableDevices(devs, need, { now: now() }).find(x => x.fetcherId === to); return d && (!requireApply || d.caps.apply) ? d : null; }
    return pickRunner({ devices: devs, need, lease: leaseFor(need), preferred: await preferredFids(), now: now(), requireApply });
  }

  // ─── Asking ──────────────────────────────────────────────────────────
  async function ask(kind, body, { zone = null, to = null } = {}) {
    const e = eng();
    const { params } = checkRequest(kind, { ...(body || {}), ...(zone ? { zone } : {}) });
    const me = devices().find(d => d.me);
    const req = newRequest({ id: 'rq_' + randomBytes(8).toString('hex'), kind, params, by: e.fetcherId, byName: (me && me.name) || '', to, now: now() });
    await mutateQueue((doc) => { enqueue(doc, req, { now: now() }); });
    log('info', `remote request ${kind}: asked`);
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
    if (hasNeed(await localCaps(), need)) return null;        // this computer can: it runs here
    const runner = await runnerFor(need);
    if (!runner) {
      const any = await runnerFor(need, { requireApply: false });
      if (!any) return null;                                   // nobody can: the route says "Connect ..." as before
      return { status: 409, body: { code: 'OTHER_IN_TRIAL', error: `${any.name || 'Your other computer'} has ${NEED_WORDS[need].what}, but it does not take changes from your other computers yet. Turn on "Use changes from my other computers" in Settings > Sync on ${any.name || 'it'}.` } };
    }
    if (!e.apply) return { status: 409, body: { code: 'TRIAL_MODE', error: `${runner.name || 'Your other computer'} has ${NEED_WORDS[need].what}. To use it here, turn on "Use changes from my other computers" in Settings > Sync.` } };
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
    const others = capableDevices(devices(), need, { now: now() }).filter(d => !d.me && d.caps.apply);
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
    let state = r.status, message;
    if (r.status === 'queued') { state = 'waiting'; message = `Asking ${name}…`; }
    else if (r.status === 'running') message = `${name} is working on it…`;
    else if (r.status === 'done') message = `Done on ${name}.`;
    else if (r.status === 'error') { message = (r.error && r.error.message) || `${name} could not do it.`; if (r.error && r.error.code === 'HOLDER_OFFLINE') state = 'offline'; }
    else if (r.status === 'cancelled') message = 'Cancelled.';
    else if (r.status === 'expired') message = `${name} did not answer in time. Try again later, or ${words.setup}.`;
    return {
      id: r.id, kind: r.kind, label: def.label, status: r.status, state, at: r.at, exp: r.exp, runsOn: name, online, message,
      ...(r.result ? { result: r.result } : {}), ...(r.error ? { error: r.error } : {}),
    };
  }
  /** One request for the page; the requester's own housekeeping happens here (too old, or its device is off). */
  async function get(id) {
    let r = (await readQueue()).requests.find(x => x.id === id) || null;
    if (!r) return null;
    const me = meFid();
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
        const words = NEED_WORDS[def.need] || NEED_WORDS.claude;
        await mutateQueue((doc) => {
          const x = doc.requests.find(q => q.id === id);
          if (!x || x.status !== 'queued') return false;
          if (why === 'expired') { x.status = 'expired'; x.doneAt = t; }
          else { cancel(x, t); x.status = 'error'; x.error = { code: 'HOLDER_OFFLINE', message: `${name} is off. Try again later, or ${words.setup}.` }; }
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
    const ok = await mutateQueue((doc) => { const x = doc.requests.find(q => q.id === id); return !!x && x.by === me && cancel(x, now()); });
    if (ok) kick();
    return get(id);
  }

  // ─── Running other devices' requests ─────────────────────────────────
  async function runOne(id) {
    const e = eng();
    const me = e.fetcherId;
    const claimed = await mutateQueue((doc) => { const r = doc.requests.find(x => x.id === id); return claim(r, me, now()) ? true : false; });
    if (!claimed) return false;
    ran.add(id);
    kick();
    // A moment for a competing claim to arrive: the later claim wins everywhere, the other backs off.
    await sleep(T.settleMs);
    await e.syncNow().catch(() => {});
    let r = (await readQueue()).requests.find(x => x.id === id);
    if (!r || r.claimedBy !== me || r.status !== 'running') { log('note', 'remote request: another device took it'); return false; }
    let res;
    try {
      const c = checkRequest(r.kind, r.params);             // again: the file is never trusted
      const { zone = null, ...params } = c.params;
      const def = KINDS[r.kind];
      res = await invoke(def.method, def.path, { body: params, zone });
      if (def.statusPath && res.status === 202) res = await waitForJob(def.statusPath, res, zone);
    } catch (err) {
      res = { status: err.status || 500, body: { error: (err.status && err.message) || 'It could not run.', code: err.code || 'FAILED' } };
    }
    const ok = res.status < 400;
    const body = res.body && typeof res.body === 'object' ? res.body : {};
    await mutateQueue((doc) => {
      const x = doc.requests.find(q => q.id === id);
      return finish(x, me, { ok, result: resultOf(res.status, res.body), error: ok ? null : { code: body.code || 'FAILED', message: body.error && typeof body.error === 'object' ? body.error.message : body.error || body.message }, now: now() });
    });
    kick();
    log('info', `remote request ${r.kind} for ${r.byName || 'another device'}: ${ok ? 'done' : `failed (${body.code || res.status})`}`);
    for (const fn of listeners) { try { fn({ id, kind: r.kind, ok }); } catch { /* fine */ } }
    return true;
  }
  /** A fetch job answers 202 and runs on: wait for it to finish, so "done" means the data is there. */
  async function waitForJob(statusPath, first, zone) {
    const end = now() + T.jobMaxMs;
    let last = first;
    while (now() < end) {
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

  /** Look at the queue: claim and run what this device should (one at a time). */
  async function tick() {
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
    if (live && typeof e.setLivePeers === 'function') e.setLivePeers(() => new Set(live.sessions ? live.sessions.keys() : []));
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
    forward, ask, askOthers, get, list, cancel: cancelRequest, tick, start, stop, attach, group, remoteSources, runnerFor,
    /** Claim one request and run it (the worker's own step; tests call it to make two devices race). */
    runOne: (id) => runOne(id),
    refreshCaps: () => localCaps({ fresh: true }), localCaps,
    onDone(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onFiles(fn) { fileListeners.add(fn); return () => fileListeners.delete(fn); },
    readQueue, timing: T,
  };
}

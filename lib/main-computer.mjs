// lib/main-computer.mjs - "Main computer": which computer runs the background
// jobs, so two computers never both pull the bank (a Monzo refresh token works
// only once), ask Claude for the same brief twice, or fetch the same mail.
//
//   JOBS     bank        bank and finance updates started by "Start my day"
//            ai-brief    the AI day summary and the automatic day review
//            story       the AI story scripts prepared in the background
//            connectors  the automatic calendar and email updates
//
// Only AUTOMATIC runs are held back on the other computers ("Runs on <name>").
// Something the user asks for with a click still runs where they clicked: they
// chose to. The jobs themselves are not changed: the routes ask gate() first.
//
// Where the choice lives: ONE place for every "who runs what" question, the
// rule of lib/sync/roles.mjs (accounts follow their own `fetcher` in
// accounts.json; these jobs their role in <data>/roles.json, else the 'main'
// role, the main computer). The sync engine's fetcher API (lib/sync/engine.mjs
// isFetcher / fetcher / setFetcher / clearFetcher) is the implementation, with
// sync on or off: with sync on roles.json syncs to every device, with a shared
// data folder it is shared like the rest of the folder. Without an engine (a
// tool, a test) the same rule reads roles.json directly.
//   computers  sync on: the devices that sync; sync off: the computers that have
//              the folder open (lib/hosts.mjs presence files). Ids are what
//              set(id) accepts; the fetcher ids behind them are the host ids
//              of lib/devicedir.mjs (the accounts code uses the same).
//   none set   every computer runs its jobs, as before (sync on: the first
//              device that can run them in the background takes them).
//
// decide() is the pure rule for a gate; createMainComputer() wires the sources.
// A lease-based leader election (feat/live-sync) can later answer for the
// 'main' role without changing this API: status(), set(id), gate(job).
// Node stdlib only.

import { join } from 'node:path';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { recordedRunner, MAIN } from './sync/roles.mjs';

export const JOBS = Object.freeze([
  { id: 'bank', label: 'Bank and finance updates' },
  { id: 'ai-brief', label: 'AI summaries and day reviews' },
  { id: 'story', label: 'AI story scripts' },
  { id: 'connectors', label: 'Calendar and email updates' },
]);
export const JOB_IDS = Object.freeze(JOBS.map(j => j.id));
export const ROLES_FILE = 'roles.json';

/**
 * The rule. {automatic, mainId, mainName, meId, paused} -> {run, reason?, runsOn?}
 *   paused   a move is copying the data: automatic jobs wait
 *   a click  always runs
 *   no main, or this is it: runs
 *   else     does not run here; runsOn = the main computer's name
 */
export function decide({ automatic = true, mainId = null, mainName = null, meId = null, paused = false } = {}) {
  if (paused && automatic) return { run: false, reason: 'moving' };
  if (!automatic) return { run: true };
  if (!mainId || (meId && mainId === meId)) return { run: true };
  return { run: false, reason: 'not-main', runsOn: mainName || 'your main computer' };
}

/** The answer a route gives instead of running (200 for the page's "skipped" paths). */
export function skippedBody(d) {
  return d.reason === 'moving'
    ? { skipped: true, reason: 'moving', message: 'Waiting: OpenDash is moving your data.' }
    : { skipped: true, reason: 'main-computer', runsOn: d.runsOn, message: `Runs on ${d.runsOn}, your main computer.` };
}

/**
 * The fetcher API over <data>/roles.json and accounts.json alone (no sync
 * engine: tools, tests): the same rule, the same files, the same lock.
 * me() -> {id, name}.
 */
export function fileRoles(dataDir, me) {
  const rolesFile = join(dataDir, ROLES_FILE), accountsFile = join(dataDir, 'accounts.json');
  const read = async () => {
    const r = await readJson(rolesFile, { fallback: null }).catch(() => null);
    const a = await readJson(accountsFile, { fallback: null }).catch(() => null);
    return { roles: r && r.roles && typeof r.roles === 'object' ? r.roles : {}, accounts: a && Array.isArray(a.accounts) ? a.accounts : [] };
  };
  const mutate = (fn) => withLock(rolesFile, async () => {
    const cur = (await readJson(rolesFile, { fallback: null }).catch(() => null)) || {};
    cur.roles = cur.roles && typeof cur.roles === 'object' ? cur.roles : {};
    fn(cur.roles);
    await writeJson(rolesFile, cur, { trailingNewline: true });
  });
  let last = { roles: {}, accounts: [] };
  const who = (id) => {
    const f = recordedRunner(id, last);
    const r = last.roles[id] && last.roles[id].fetcher === f ? last.roles[id] : last.roles[MAIN];
    const self = me();
    return { deviceId: f, name: f ? (f === self.id ? self.name : (r && r.name) || 'another computer') : null, me: !f || f === self.id };
  };
  return {
    async isFetcher(id) { last = await read(); const f = recordedRunner(id, last); return !f || f === me().id; },
    fetcher(id) { return who(id); },
    async reloadRoles() { last = await read(); },
    async setFetcher(id, fid, { name } = {}) { await mutate((roles) => { roles[id] = { fetcher: fid, since: new Date().toISOString(), ...(name ? { name: String(name).slice(0, 60) } : {}) }; }); last = await read(); return who(id); },
    async clearFetcher(id) { await mutate((roles) => { delete roles[id]; }); last = await read(); return who(id); },
    async devices() { return []; },
    get enabled() { return false; },
  };
}

/**
 * createMainComputer({dataDir, sync, me, computers, paused})
 *   sync         the sync engine (app.ctx.sync), or a function returning it; null: roles.json directly
 *   me()         {id, name}: this computer (its presence host id = its fetcher id, and name)
 *   computers()  [{id, name, lastSeenMs}] other computers on this data folder (lib/hosts.mjs)
 *   paused()     true while a move runs
 * -> {status(), set(id), gate(job, {automatic})}
 */
export function createMainComputer({ dataDir, sync: syncOpt = null, me = () => ({ id: null, name: 'this computer' }), computers = () => [], paused = () => false } = {}) {
  // sync may be the engine or a function that returns it (the sync route registers later)
  const files = fileRoles(dataDir, me);
  const R = () => { const s = typeof syncOpt === 'function' ? syncOpt() : syncOpt; return s && typeof s.isFetcher === 'function' ? s : files; };
  const syncOn = async () => {
    const r = R();
    if (r === files || typeof r.devices !== 'function') return false;
    try { return (await r.devices()).length > 0; } catch { return false; }
  };
  /** The computers to choose from, with the fetcher id behind each: sync's devices, else this one and the presence list. */
  async function list() {
    const r = R();
    if (await syncOn()) return (await r.devices()).map(d => ({ id: d.deviceId, fid: d.fetcherId || d.deviceId, name: d.name, me: !!d.me, lastSeen: d.lastSeen || null, background: d.background !== false }));
    const self = me();
    const others = (computers() || []).filter(c => c && c.id && c.id !== self.id).map(c => ({ id: c.id, fid: c.id, name: c.name, me: false, lastSeenMs: c.lastSeenMs ?? null }));
    return [{ id: self.id, fid: self.id, name: self.name, me: true }, ...others];
  }

  async function status() {
    const r = R();
    if (typeof r.reloadRoles === 'function') await r.reloadRoles().catch(() => {});   // read, never claim
    const sync = await syncOn();
    const all = await list();
    const f = r.fetcher(MAIN);
    const pick = f && f.deviceId ? all.find(c => c.id === f.deviceId || c.fid === f.deviceId) : null;
    const main = f && f.deviceId ? { id: pick ? pick.id : f.deviceId, name: (pick && pick.name) || f.name } : null;
    const meRow = all.find(c => c.me) || { id: me().id, name: me().name };
    const jobs = [];
    for (const j of JOBS) {
      const x = r.fetcher(j.id);
      const row = x && x.deviceId ? all.find(c => c.id === x.deviceId || c.fid === x.deviceId) : null;
      jobs.push({ ...j, runsOn: x && x.deviceId ? (row && row.name) || x.name : 'every computer', here: x && x.deviceId ? !!x.me : true });
    }
    return {
      mode: sync ? 'sync' : 'local', me: { id: meRow.id, name: meRow.name }, main, isMain: !main || !!(f && f.me),
      computers: all.map(({ fid, ...c }) => c), jobs,
    };
  }

  /** Make `id` the main computer (a computer's id, 'this', or null: no main, every computer runs its jobs). */
  async function set(id) {
    const r = R();
    const sync = await syncOn();
    if (!id) {
      if (sync) throw Object.assign(new Error('With sync on, one device must be the main one.'), { status: 400, code: 'NEEDS_MAIN' });
      for (const job of [MAIN, ...JOB_IDS]) await r.clearFetcher(job);
      return status();
    }
    const all = await list();
    const pick = id === 'this' ? all.find(c => c.me) : all.find(c => c.id === id || c.fid === id);
    if (!pick || !pick.fid) throw Object.assign(new Error('That computer is not known here. Open OpenDash on it once first.'), { status: 400, code: 'UNKNOWN_COMPUTER' });
    // One choice: the main computer; the jobs follow it (their own roles are cleared).
    await r.setFetcher(MAIN, pick.fid, { name: pick.name });
    for (const job of JOB_IDS) await r.clearFetcher(job);
    return status();
  }

  /** Should this computer run `job` now? {run, reason?, runsOn?} */
  async function gate(job, { automatic = true } = {}) {
    if (paused() && automatic) return decide({ automatic, paused: true });
    if (!automatic) return { run: true };
    const r = R();
    let yes = true;
    try { yes = await r.isFetcher(job); } catch { yes = true; }   // sync on: an unassigned job is taken by the first device that asks
    if (yes) return { run: true };
    const f = r.fetcher(job);
    const row = f && f.deviceId ? (await list()).find(c => c.id === f.deviceId || c.fid === f.deviceId) : null;
    return decide({ automatic, mainId: f && f.deviceId, mainName: (row && row.name) || (f && f.name), meId: null });
  }

  return { status, set, gate };
}

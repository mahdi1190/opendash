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
// Where the choice lives:
//   sync on   the sync engine's roles (lib/sync/engine.mjs setFetcher / isFetcher /
//             fetcher / devices): one role per job plus 'main', synced to every device.
//   sync off  <data>/main-computer.json {hostId, name, since} in the data folder, with
//             the computers that have the folder open (lib/hosts.mjs presence files).
//             With a folder on one computer only, that computer is the main one.
//   none set  every computer runs its jobs, as before.
//
// decide() is the pure rule; createMainComputer() wires the sources. Node stdlib only.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWrite } from './fsutil.mjs';

export const JOBS = Object.freeze([
  { id: 'bank', label: 'Bank and finance updates' },
  { id: 'ai-brief', label: 'AI summaries and day reviews' },
  { id: 'story', label: 'AI story scripts' },
  { id: 'connectors', label: 'Calendar and email updates' },
]);
export const JOB_IDS = Object.freeze(JOBS.map(j => j.id));
export const FILE = 'main-computer.json';

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

function readLocal(dataDir) {
  try { const j = JSON.parse(readFileSync(join(dataDir, FILE), 'utf8')); return j && typeof j.hostId === 'string' ? j : null; } catch { return null; }
}

/**
 * createMainComputer({dataDir, sync, me, computers, paused})
 *   sync         the sync engine (app.ctx.sync) or null
 *   me()         {id, name}: this computer (its presence host id and name)
 *   computers()  [{id, name, lastSeenMs}] other computers on this data folder (lib/hosts.mjs)
 *   paused()     true while a move runs
 * -> {status(), set(id), gate(job, {automatic})}
 */
export function createMainComputer({ dataDir, sync: syncOpt = null, me = () => ({ id: null, name: 'this computer' }), computers = () => [], paused = () => false } = {}) {
  // sync may be the engine or a function that returns it (the sync route registers later)
  const S = () => (typeof syncOpt === 'function' ? syncOpt() : syncOpt);
  const syncOn = async () => {
    const sync = S();
    if (!sync || typeof sync.devices !== 'function') return false;
    try { return (await sync.devices()).length > 0; } catch { return false; }
  };

  async function status() {
    const self = me();
    const sync = S();
    if (await syncOn()) {
      const devs = await sync.devices();
      const meDev = devs.find(d => d.me) || null;
      const f = sync.fetcher('main');
      const main = f && f.deviceId ? { id: f.deviceId, name: f.name } : null;
      return {
        mode: 'sync', me: meDev ? { id: meDev.deviceId, name: meDev.name } : { id: null, name: self.name },
        main, isMain: !main || !!(meDev && main.id === meDev.deviceId),
        computers: devs.map(d => ({ id: d.deviceId, name: d.name, me: !!d.me, lastSeen: d.lastSeen || null, background: d.background !== false })),
        jobs: JOBS.map(j => { const x = sync.fetcher(j.id); return { ...j, runsOn: x && x.deviceId ? x.name : (main ? main.name : 'every computer'), here: x && x.deviceId ? !!x.me : true }; }),
      };
    }
    const local = readLocal(dataDir);
    const others = (computers() || []).map(c => ({ id: c.id, name: c.name, me: false, lastSeenMs: c.lastSeenMs ?? null }));
    const main = local ? { id: local.hostId, name: local.name } : null;
    const isMain = !main || main.id === self.id;
    return {
      mode: 'local', me: self, main, isMain,
      computers: [{ id: self.id, name: self.name, me: true }, ...others.filter(o => o.id !== self.id)],
      jobs: JOBS.map(j => ({ ...j, runsOn: main ? main.name : 'every computer', here: isMain })),
    };
  }

  /** Make `id` the main computer (null: no main, every computer runs its jobs). */
  async function set(id) {
    const sync = S();
    if (await syncOn()) {
      if (!id) throw Object.assign(new Error('With sync on, one device must be the main one.'), { status: 400, code: 'NEEDS_MAIN' });
      for (const job of ['main', ...JOB_IDS]) await sync.setFetcher(job, id);
      return status();
    }
    const self = me();
    if (!id) { await atomicWrite(join(dataDir, FILE), JSON.stringify({ hostId: null, name: null, since: new Date().toISOString() }, null, 1)); return status(); }
    const pick = id === 'this' || id === self.id ? self : (computers() || []).find(c => c.id === id);
    if (!pick || !pick.id) throw Object.assign(new Error('That computer is not known here. Open OpenDash on it once first.'), { status: 400, code: 'UNKNOWN_COMPUTER' });
    await atomicWrite(join(dataDir, FILE), JSON.stringify({ hostId: pick.id, name: pick.name, since: new Date().toISOString() }, null, 1) + '\n');
    return status();
  }

  /** Should this computer run `job` now? {run, reason?, runsOn?} */
  async function gate(job, { automatic = true } = {}) {
    if (paused() && automatic) return decide({ automatic, paused: true });
    if (!automatic) return { run: true };
    const sync = S();
    if (await syncOn()) {
      let yes = true;
      try { yes = await sync.isFetcher(job); } catch { yes = true; }
      if (yes) return { run: true };
      const f = sync.fetcher(job);
      return decide({ automatic, mainId: f.deviceId, mainName: f.name, meId: null });
    }
    const local = readLocal(dataDir);
    return decide({ automatic, mainId: local && local.hostId, mainName: local && local.name, meId: me().id });
  }

  return { status, set, gate };
}

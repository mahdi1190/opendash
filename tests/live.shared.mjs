// Shared set-up for the live-sync tests (tests/live-*.test.mjs): two
// computers with encrypted sync, EACH WITH ITS OWN cloud folder, and a
// stand-in for OneDrive that copies a device's files to the other folder
// only when a test says so. So the folder is slow (it moves only on
// oneDrive()), and anything that arrives sooner came over the live link.
// Everything is under the OS temp folder; live links bind 127.0.0.1 only
// (lib/sync/live/node-live.mjs sandbox), with no router and no LAN multicast.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_DIR_NAME, isSyncFileName } from '../lib/sync/folder.mjs';
import { createNodeLive } from '../lib/sync/live/node-live.mjs';
import { makeE2EDevice } from './sync-e2e.shared.mjs';

export * from './sync-e2e.shared.mjs';
export const LOOP = '127.0.0.1';
export const FAST_LEASE = { liveRenew: 200, liveTtl: 700, folderRenew: 1000, folderTtl: 3000 };

const devDir = (cloud, id) => join(cloud, SYNC_DIR_NAME, 'devices', id);
/** Copy device `id`'s files from one cloud folder to another (what OneDrive does, eventually). */
export function copyDevice(from, to, id) {
  const src = devDir(from, id), dst = devDir(to, id);
  if (!existsSync(src)) return 0;
  mkdirSync(dst, { recursive: true });
  let n = 0;
  const names = readdirSync(src).filter(isSyncFileName);
  for (const name of names) {
    const text = readFileSync(join(src, name));
    const p = join(dst, name);
    if (existsSync(p) && Buffer.compare(readFileSync(p), text) === 0) continue;
    writeFileSync(`${p}.copy-tmp`, text);
    renameSync(`${p}.copy-tmp`, p);
    n++;
  }
  for (const name of readdirSync(dst).filter(isSyncFileName)) if (!names.includes(name)) { try { unlinkSync(join(dst, name)); } catch { /* gone */ } }
  return n;
}

/**
 * Two paired computers A ("Home laptop") and B ("Work laptop"), encrypted,
 * applying changes, converged. oneDrive(dir) copies: 'both', 'a->b', 'b->a'.
 */
export async function pairedPair(base, { stateA, stateB } = {}) {
  const cloudA = join(base, 'cloud-a'), cloudB = join(base, 'cloud-b');
  mkdirSync(cloudA, { recursive: true }); mkdirSync(cloudB, { recursive: true });
  const A = makeE2EDevice(base, 'a', { state: stateA || { custom: [{ id: 'u-1', title: 'First task', subtasks: [] }] } });
  const B = makeE2EDevice(base, 'b', { state: stateB || { custom: [{ id: 'u-b', title: 'From work', subtasks: [] }] } });
  const oneDrive = (dir = 'both') => {
    let n = 0;
    if (dir !== 'b->a' && A.eng.deviceId) n += copyDevice(cloudA, cloudB, A.eng.deviceId);
    if (dir !== 'a->b' && B.eng.deviceId) n += copyDevice(cloudB, cloudA, B.eng.deviceId);
    return n;
  };
  await A.eng.start();
  const r = await A.eng.setupFirst({ folder: cloudA, deviceName: 'Home laptop', apply: true });
  await B.eng.start();
  oneDrive();
  await B.eng.joinExisting({ folder: cloudB, deviceName: 'Work laptop', apply: true });
  oneDrive();
  await B.eng.joinWithRecovery(r.recoveryCode);
  for (let i = 0; i < 4; i++) { oneDrive(); await A.eng.syncNow(); oneDrive(); await B.eng.syncNow(); }
  if (!A.eng.status().e2e.ready || !B.eng.status().e2e.ready) throw new Error('pairing did not finish');
  return { A, B, cloudA, cloudB, oneDrive, recoveryCode: r.recoveryCode };
}

/** Live sync for a test device: sandboxed (127.0.0.1, port 0, no router, no multicast), fast ticks. */
export function liveFor(dev, opts = {}) {
  return createNodeLive({ engine: dev.eng, dataDir: dev.data, tickMs: 50, netCheckMs: 300, dialTimeoutMs: 1000, leaseTiming: FAST_LEASE, backoffMs: () => 300, ...opts });
}
/** A TCP adapter that can listen but never dial out (a computer the other side must reach). */
export function listenOnly(net) {
  return { listen: (o) => net.listen(o), connect: () => Promise.reject(Object.assign(new Error('blocked'), { code: 'ECONNREFUSED' })) };
}

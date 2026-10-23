// Shared helpers for the folder-sync tests (tests/sync-*.test.mjs).
// Temp folders go under OPENDASH_SYNC_TEST_DIR when it is set (else the OS temp folder).
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStateStore } from '../server/state-store.mjs';
import { createSyncEngine } from '../lib/sync/engine.mjs';

export const TEST_BASE = process.env.OPENDASH_SYNC_TEST_DIR || tmpdir();
export function tempDir(prefix) { mkdirSync(TEST_BASE, { recursive: true }); return mkdtempSync(join(TEST_BASE, prefix)); }
export const rm = (d) => { try { rmSync(d, { recursive: true, force: true }); } catch { /* fine */ } };
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** One "computer": a data folder with a state file, its store and its sync engine (not started). */
export function makeDevice(base, name, { state = { custom: [] }, pollMs = 200, watch = true, now, debounceMs = 30, log } = {}) {
  const data = join(base, `data-${name}`);
  mkdirSync(join(data, 'state'), { recursive: true });
  if (state) writeFileSync(join(data, 'state', 'dashboard-state.json'), JSON.stringify({ ...state, _lastSave: 1 }));
  const store = createStateStore({ stateDir: join(data, 'state') });
  const eng = createSyncEngine({ store, dataDir: data, host: `host-${name}`, pollMs, watch, debounceMs, detect: () => [], ...(now ? { now } : {}), ...(log ? { log } : {}) });
  return { name, data, store, eng };
}

/** Change the state the way the actions layer does (a copy, compare-and-swap). */
export function editState(store, fn, source = 'ui') {
  return store.mutate((c0) => { const cur = structuredClone(c0); fn(cur); return { next: cur }; }, { source });
}

/** Resolve once pred() is true (checked every 20 ms), or reject after ms. */
export async function waitFor(pred, ms = 5000, what = 'condition') {
  const end = Date.now() + ms;
  for (;;) {
    if (await pred()) return true;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(20);
  }
}

/** The sync engine's timers do not keep a test process alive by themselves (they are unref'd). */
export function keepAlive() { const t = setInterval(() => {}, 1000); return () => clearInterval(t); }

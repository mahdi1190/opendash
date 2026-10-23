// lib/sync/hlc.mjs - Hybrid Logical Clock for folder sync (lib/sync/engine.mjs).
//
// A timestamp is one string that sorts correctly as a string:
//
//     <wall ms, 15 digits>.<counter, 5 base-36 digits>.<deviceId>
//     000001792771200000.00000.3f9a0c2b7d41e865
//
// so "later" is plain string comparison, and two devices can never produce the
// same timestamp (the deviceId breaks every tie deterministically).
//
//   tick()      a timestamp for a local change (always larger than any before)
//   observe(h)  a timestamp seen from another device: the clock moves past it,
//               so a change made after seeing h always sorts after h
//
// Clock skew: a device whose clock runs far ahead would drag every other clock
// with it. A remote wall time more than maxDriftMs ahead of this computer's
// clock is still accepted for the change itself, but this clock only follows
// it up to now + maxDriftMs (and `skewed` records it for the status line).
//
// Node stdlib only; no I/O.

export const HLC_RE = /^(\d{15})\.([0-9a-z]{5})\.([0-9a-f]{16})$/;
export const DEFAULT_MAX_DRIFT_MS = 60 * 60 * 1000;
const COUNTER_MAX = 36 ** 5 - 1;

export function encodeHlc(wall, counter, deviceId) {
  return `${String(Math.max(0, Math.floor(wall))).padStart(15, '0')}.${Math.min(COUNTER_MAX, counter).toString(36).padStart(5, '0')}.${deviceId}`;
}

/** {wall, counter, deviceId} or null when `h` is not a timestamp. */
export function decodeHlc(h) {
  const m = typeof h === 'string' ? HLC_RE.exec(h) : null;
  return m ? { wall: Number(m[1]), counter: parseInt(m[2], 36), deviceId: m[3] } : null;
}

export const isHlc = (h) => typeof h === 'string' && HLC_RE.test(h);
export const compareHlc = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const maxHlc = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

/**
 * createClock({deviceId, now, maxDriftMs, last})
 *   last: the newest timestamp this device ever issued or saw (restored from
 *   meta.json), so a clock set back after a restart still moves forward.
 */
export function createClock({ deviceId, now = () => Date.now(), maxDriftMs = DEFAULT_MAX_DRIFT_MS, last = null } = {}) {
  if (!/^[0-9a-f]{16}$/.test(String(deviceId || ''))) throw new Error('createClock needs a 16-hex-digit deviceId');
  let wall = 0, counter = 0;
  let skewed = null;   // {deviceId, aheadMs, at} of the last remote clock that ran too far ahead
  const restore = (h) => { const d = decodeHlc(h); if (d && (d.wall > wall || (d.wall === wall && d.counter > counter))) { wall = d.wall; counter = d.counter; } };
  if (last) restore(last);

  function tick() {
    const pt = now();
    if (pt > wall) { wall = pt; counter = 0; } else counter += 1;
    if (counter > COUNTER_MAX) { wall += 1; counter = 0; }
    return encodeHlc(wall, counter, deviceId);
  }

  /** opts.force: follow h even past the drift cap (a local edit must beat the value it replaces). */
  function observe(h, opts = {}) {
    const d = decodeHlc(h);
    if (!d) return;
    const pt = now();
    let rw = d.wall, rc = d.counter;
    if (rw > pt + maxDriftMs && !opts.force) {
      skewed = { deviceId: d.deviceId, aheadMs: rw - pt, at: pt };
      rw = pt + maxDriftMs; rc = 0;
    }
    const nw = Math.max(wall, rw, pt);
    if (nw === wall && nw === rw) counter = Math.max(counter, rc) + 1;
    else if (nw === wall) counter += 1;
    else if (nw === rw) counter = rc + 1;
    else counter = 0;
    wall = nw;
    if (counter > COUNTER_MAX) { wall += 1; counter = 0; }
  }

  return {
    deviceId, tick, observe,
    /** The newest timestamp issued or seen (for meta.json). */
    peek: () => encodeHlc(wall, counter, deviceId),
    /** A timestamp older than any real change: a joining device's existing data loses to everything already synced. */
    floor: (n = 0) => encodeHlc(0, n, deviceId),
    get skewed() { return skewed; },
  };
}

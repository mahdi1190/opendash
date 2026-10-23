// lib/sync/claude-host.mjs - CLAUDE HOST FIRST, THIS DEVICE AS THE FALLBACK
// (docs/dev/MULTI_DEVICE.md "The Claude host").
//
// PLATFORM-AGNOSTIC: no node: imports, no files, no timers.
//
// User request, 23 Oct: "if we have a host connection we always use that ...
// Claude's host, and if not we default back to the device". The CLAUDE HOST is
// the device that holds the 'claude' role: the one with Claude and the claude.ai
// connectors, chosen in Settings > Sync (roles.json `roles.claude`, synced; when
// nothing is chosen, the main computer). While it is reachable, ALL AI work and
// every Claude-run fetch (the calendar, the inbox and the bank read through the
// connectors) goes to it, even from a device that has Claude too. Only when it
// is off or unreachable does a device run the work itself (when it has Claude);
// without Claude it says honestly "Home laptop is off".
//
// Settings > Sync "Run Claude on" (THIS device's own choice, never synced):
//   host-first  <host> first, then this computer (the default)
//   local       this computer only
//   host-only   only <host>: never on this computer
//
// Reachable: live sync's lease decides when it has an answer (the 'claude'
// role's holder has a valid claim, so it is up; a different holder means the
// host's claim ran out). Without one: an open live link, or seen in the last
// SEEN_MS. And it must CLAIM the request within CLAIM_MS, or this device runs it.
//
// ONE RESULT, NEVER TWO (a request that this device may run itself: `hostFirst`).
// The requester is the only arbiter, and it writes only its own fields:
//   grant {to, until, beat}  "go ahead": the host may run it until `until`
//   back  {at, why}          taken back: 'fallback' (this device runs it), 'cancel'
//   local {status, result?, error?, at, doneAt?}   this device's own run
// The host writes only its own: status, claimedBy, claimedAt, beat (a heartbeat
// while it runs), result, error, doneAt. Each field is its own register in the
// synced file (lib/sync/manifest.mjs), so the two sides never overwrite each
// other, and the requester decides under its own lock, once: it either grants
// (the host claimed in time) or takes back (it did not), never both.
//   - The host starts only after it sees the grant, and commits anything (the
//     route's file, its answer) only while the grant holds (mayRun): until
//     `until` minus MARGIN_MS by its own clock, never once it sees `back`.
//   - The requester renews the grant while the host's heartbeats arrive. It
//     takes back a granted request only after `until` plus MARGIN_MS by its
//     clock (the host stopped committing before then), or at once when the host
//     released it (it restarted, or never got the go-ahead).
//   - A late result from the host is never used: the requester reads `local`
//     once it took back, and the host's commit guard refuses.
// Fetch jobs never run twice: the host starts one only with the grant, this
// device only after taking back.

import { recordedRunner } from './roles.mjs';
import { hasNeed, isRecent } from './caps.mjs';

export const CLAUDE_ROLE = 'claude';
export const MODES = Object.freeze(['host-first', 'local', 'host-only']);
export const DEFAULT_MODE = 'host-first';
export const SEEN_MS = 2 * 60 * 1000;       // seen this recently = reachable (no live link)
export const CLAIM_MS = 8000;               // the host claims a request within this, or this device runs it
export const GRANT_WAIT_MS = 15 * 1000;     // the host waits this long for the go-ahead after claiming
export const GRANT_MS = 60 * 1000;          // a go-ahead lasts this long; renewed while the heartbeats arrive
export const BEAT_MS = 10 * 1000;           // the host's heartbeat while it runs a request
export const MARGIN_MS = 10 * 1000;         // clock difference allowed between two devices
/** Host errors that mean "I will not run it" (the requester may run it at once). */
export const RELEASED = Object.freeze(['RELEASED', 'INTERRUPTED']);

export const cleanMode = (m) => (MODES.includes(m) ? m : DEFAULT_MODE);
const seenAt = (d) => (Number.isFinite(d && d.lastSeen) ? d.lastSeen : Date.parse((d && d.lastSeen) || '') || 0);

/** Can another device reach `d` now? This device, an open live link, or seen in the last SEEN_MS. */
export function reachable(d, now = Date.now()) {
  if (!d) return false;
  if (d.me || d.live === true) return true;
  return now - seenAt(d) <= SEEN_MS;
}

/** The Claude host recorded in roles.json (`claude`, else the main computer): a fetcher id or null. */
export const chosenHostFid = (roles) => recordedRunner(CLAUDE_ROLE, { roles: roles && typeof roles === 'object' ? roles : {} });

const capable = (d, now, need = 'claude') => !!(d && d.caps && hasNeed(d.caps, need) && isRecent(d, now));
const viewOf = (d, now) => (d ? { fetcherId: d.fetcherId || null, deviceId: d.deviceId || null, name: d.me ? 'this computer' : d.name || 'your other computer', me: !!d.me, online: reachable(d, now), apply: d.me ? true : !!(d.caps && d.caps.apply) } : null);

/**
 * Where Claude work asked on THIS device runs:
 *   {run, why, text, mode, here, host, to?, fallback?}
 *   run   'here'   run it on this computer
 *         'host'   ask the host (`to`); fallback: this computer runs it if the
 *                  host does not claim it in time or stops answering
 *         'off'    the host is off and this computer may not or cannot run it
 *         'other'  no Claude here and no host up: the usual rule picks another
 *                  device that has it (lib/sync/caps.mjs pickRunner), else
 *                  "Home laptop is off"
 *   why   'local' | 'no-host' | 'is-host' | 'host' | 'host-off' | 'old-host' (an older version: as before)
 *   text  plain words for Settings and the status line
 * devices: lib/sync/engine.mjs groupCaps() rows ({deviceId, fetcherId, name, me, live, lastSeen, caps}).
 * roles: roles.json `roles`. lease: the 'claude' lease holder's sync device id, or null.
 */
export function claudeRoute({ devices = [], roles = {}, lease = null, mode = DEFAULT_MODE, now = Date.now() } = {}) {
  mode = cleanMode(mode);
  const list = (Array.isArray(devices) ? devices : []).filter(Boolean);
  const me = list.find(d => d.me) || null;
  const here = !!(me && me.caps && me.caps.claude === true);
  const fid = chosenHostFid(roles);
  const chosen = fid ? list.find(d => d.fetcherId === fid) || null : null;
  const holder = lease ? list.find(d => d.deviceId === lease) || null : null;
  // The host: the one chosen (or the main computer) when it has Claude; else whoever holds the lease.
  const host = capable(chosen, now) ? chosen : capable(holder, now) ? holder : null;
  const out = (run, why, text, extra = {}) => ({ run, why, text, mode, here, host: viewOf(host, now), ...extra });
  if (mode === 'local') return out('here', 'local', here ? 'Claude: using this computer' : 'Claude is not set up on this computer');
  if (!host) return here ? out('here', 'no-host', 'Claude: using this computer') : out('other', 'no-host', 'Claude is not set up on this computer');
  if (host.me) return out('here', 'is-host', 'Claude: using this computer');
  const name = host.name || 'Your other computer';
  // Both devices thinking they are the host: the lease decides (one holder, the same on every device).
  const up = holder ? holder.deviceId === host.deviceId : reachable(host, now);
  // A host on an older version does not wait for the go-ahead: as before (this computer runs its own; without Claude, the usual rule).
  if (up && !(host.caps && host.caps.host === 1)) return here ? out('here', 'old-host', 'Claude: using this computer') : out('other', 'old-host', `Claude: using ${name}`);
  if (up) return out('host', 'host', `Claude: using ${name}`, { to: viewOf(host, now), fallback: mode === 'host-first' && here });
  if (mode === 'host-first' && here) return out('here', 'host-off', `${name} is off: using this computer`);
  if (mode === 'host-only') return out('off', 'host-off', `${name} is off`);
  return out('other', 'host-off', `${name} is off`);
}

/**
 * The device that runs Claude's AUTOMATIC jobs now (AI summaries and reviews,
 * story scripts, the connectors' update), for the sync engine's capableRunner:
 * live sync's 'claude' lease holder when it has an answer (it moves the jobs
 * while the host sleeps and gives them back when it wakes; two devices never
 * both act while they hear each other), else the Claude host. A fetcher id, or
 * null (the usual rule applies).
 */
export function jobHost({ devices = [], roles = {}, lease = null, need = 'claude', now = Date.now() } = {}) {
  const list = (Array.isArray(devices) ? devices : []).filter(Boolean);
  const holder = lease ? list.find(d => d.deviceId === lease) || null : null;
  if (capable(holder, now, need)) return holder.fetcherId || null;
  const fid = chosenHostFid(roles);
  const chosen = fid ? list.find(d => d.fetcherId === fid) || null : null;
  return capable(chosen, now, need) ? chosen.fetcherId || null : null;
}

// ─── Claude-run sources (fetches through Claude: the connectors, MCP servers) ──
const CLAUDE_PRESETS = ['google-calendar', 'gmail', 'aureli'];
/** Is this source read through Claude (a claude.ai connector preset, or an MCP server)? */
export const claudeRun = (s) => !!s && (s.kind === 'mcp' || CLAUDE_PRESETS.includes(s.preset));
/**
 * This device's Claude-run sources of one capability, split by who reads them:
 * {host: [ids the host reads too], here: [ids only this device reads]}. The
 * host's sources come from its published capabilities (lib/sync/caps.mjs); a
 * source the host's connectors miss stays here (fallback for that source only).
 */
export function splitSources(local = [], hostCaps = null) {
  const hs = hostCaps && Array.isArray(hostCaps.sources) ? hostCaps.sources : [];
  const has = (s) => hs.some(h => h.id === s.id || (s.preset && h.preset === s.preset));
  const mine = (Array.isArray(local) ? local : []).filter(claudeRun);
  return { host: mine.filter(has).map(s => s.id), here: mine.filter(s => !has(s)).map(s => s.id) };
}

// ─── One result, never two (see the header) ───────────────────────────────
const isNum = Number.isFinite;
/** May the host (`me`) run, or commit the result of, request r now? */
export function mayRun(r, me, now = Date.now()) {
  if (!r || r.claimedBy !== me || r.status !== 'running' || r.back) return false;
  if (isNum(r.exp) && now > r.exp) return false;
  if (!r.hostFirst) return true;
  const g = r.grant;
  return !!(g && g.to === me && isNum(g.until) && now < g.until - MARGIN_MS);
}
/** The requester's go-ahead for the device that claimed r (mutates). false: not now. */
export function grantRun(r, me, now = Date.now()) {
  if (!r || r.by !== me || !r.hostFirst || r.back || r.status !== 'running' || !r.claimedBy) return false;
  if (r.to && r.claimedBy !== r.to) return false;
  if (r.grant && (r.grant.to !== r.claimedBy || !(now < r.grant.until))) return false;   // never moved, never revived
  r.grant = { to: r.claimedBy, until: now + GRANT_MS, beat: r.beat || null };
  return true;
}
/** Is a renewal of the go-ahead due (a new heartbeat came in, and the last renewal was a while ago)? */
export function renewDue(r, now = Date.now()) {
  const g = r && r.grant;
  if (!g || r.back || r.status !== 'running' || !(now < g.until)) return false;
  return !!r.beat && r.beat !== g.beat && now - (g.until - GRANT_MS) >= BEAT_MS;
}
/** Did the host say it will not run r (it restarted, or gave up waiting for the go-ahead)? */
export const released = (r) => !!r && !!r.claimedBy && ['error', 'cancelled'].includes(r.status) && !!r.error && RELEASED.includes(r.error.code);
/**
 * The requester takes r back (mutates): why 'fallback' (this device runs it)
 * or 'cancel'. Refused while the host holds a valid go-ahead (plus MARGIN_MS),
 * unless the host released it; refused once the host finished.
 */
export function takeBack(r, me, { why = 'fallback', now = Date.now() } = {}) {
  if (!r || r.by !== me || !r.hostFirst || r.back) return false;
  if (why !== 'cancel') {
    if (r.status === 'done' || (r.status === 'error' && !released(r))) return false;   // the host's answer is in
    if (r.grant && now <= r.grant.until + MARGIN_MS && !released(r)) return false;
  }
  r.back = { at: now, why: why === 'cancel' ? 'cancel' : 'fallback' };
  r.local = { status: why === 'cancel' ? 'cancelled' : 'running', at: now, ...(why === 'cancel' ? { doneAt: now } : {}) };
  return true;
}
/** This device's own run finished (mutates): {ok, result, error}. */
export function finishLocal(r, me, { ok, result = null, error = null, now = Date.now() } = {}) {
  if (!r || r.by !== me || !r.back || !r.local || r.local.status !== 'running') return false;
  r.local = {
    status: ok ? 'done' : 'error', at: r.local.at, doneAt: now, ...(result ? { result } : {}),
    ...(ok ? {} : { error: { code: String((error && error.code) || 'FAILED').slice(0, 40), message: String((error && error.message) || 'It did not work.').slice(0, 300) } }),
  };
  return true;
}
/** What the requester shows for r: {status, result?, error?, by: 'host' | 'here'}; a taken-back request answers from `local` only. */
export function outcome(r) {
  if (!r) return null;
  if (!r.back) return { status: r.status, ...(r.result ? { result: r.result } : {}), ...(r.error ? { error: r.error } : {}), by: 'host' };
  const L = r.local || { status: r.back.why === 'cancel' ? 'cancelled' : 'running' };
  return { status: L.status, ...(L.result ? { result: L.result } : {}), ...(L.error ? { error: L.error } : {}), by: 'here' };
}

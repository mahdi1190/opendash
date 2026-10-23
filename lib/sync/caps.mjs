// lib/sync/caps.mjs - WHAT EACH DEVICE CAN DO, and so what the GROUP can do
// ("connect once, use everywhere": docs/dev/MULTI_DEVICE.md).
//
// PLATFORM-AGNOSTIC: no node: imports, no files, no timers.
//
// Each device publishes its capabilities inside its own synced device record
// (devices/<id>/device.json; with encrypted sync inside the sealed part, next to
// its name), so every other member knows what it can do:
//
//   {v:1, at, claude, sources:[{id, capability, kind, label, colour, preset?}],
//    accounts:[accountId], banks:[sourceId], apply, background, kind}
//
//   claude      the Claude Code CLI works on this device (signed in)
//   sources     the data sources this device reads ITSELF and that are not an
//               account (an MCP server through Claude, a calendar link, a direct
//               bank): their snapshots are published by this device
//   accounts    the accounts this device holds its own sign-in for
//   banks       the bank sources among them
//   apply       it takes changes from the other devices (Settings > Sync, not
//               trial mode): only then can it see a request or a result
//   background  it runs while no window is open (a desktop server; a phone does not)
//
// Never a secret: no URL (a calendar link is a password), no MCP server name or
// command, no token, no address. cleanCaps() keeps exactly the fields above.
//
// The page decides "connected" by the GROUP: when any recently seen device has
// a capability, the feature is available here too ("Uses Claude on Home
// laptop"); only when no device has it does the normal "Connect ..." show.
// pickRunner() is the one rule for which device answers a request
// (lib/sync/requests.mjs) or runs a job that needs a capability.

export const CAPS_V = 1;
export const ONLINE_MS = 5 * 60 * 1000;            // device.json is rewritten every 2 minutes while it runs
export const RECENT_MS = 14 * 24 * 60 * 60 * 1000; // a device unseen for longer no longer counts
export const NEEDS = Object.freeze(['claude', 'calendar', 'email', 'bank', 'connectors']);
const CAPS = ['calendar', 'email', 'bank'];
const KINDS = ['mcp', 'ical', 'direct'];
const SRC_ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
const ACC_ID = /^[A-Za-z0-9_-]{1,80}$/;
const COLOUR = /^[a-z]{2,12}$/;
const MAX_SOURCES = 30, MAX_ACCOUNTS = 40;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const label = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);

/** A capabilities record from anywhere (a peer's device.json), checked; null when it is not one. */
export function cleanCaps(raw) {
  if (!isObj(raw) || raw.v !== CAPS_V) return null;
  const sources = [];
  for (const s of Array.isArray(raw.sources) ? raw.sources : []) {
    if (sources.length >= MAX_SOURCES) break;
    if (!isObj(s) || !SRC_ID.test(s.id || '') || !CAPS.includes(s.capability) || !KINDS.includes(s.kind)) continue;
    if (sources.some(x => x.id === s.id)) continue;
    sources.push({
      id: s.id, capability: s.capability, kind: s.kind, label: label(s.label) || s.id,
      ...(COLOUR.test(s.colour || '') ? { colour: s.colour } : {}),
      ...(['google-calendar', 'gmail', 'aureli'].includes(s.preset) ? { preset: s.preset } : {}),
    });
  }
  const ids = (list) => [...new Set((Array.isArray(list) ? list : []).filter(x => typeof x === 'string' && ACC_ID.test(x)))].slice(0, MAX_ACCOUNTS);
  return {
    v: CAPS_V, at: Number.isFinite(raw.at) ? raw.at : 0, claude: raw.claude === true, sources,
    accounts: ids(raw.accounts), banks: ids(raw.banks).filter(id => SRC_ID.test(id)),
    apply: raw.apply === true, background: raw.background !== false,
    kind: ['computer', 'phone', 'tablet'].includes(raw.kind) ? raw.kind : 'computer',
  };
}

/**
 * Does a device with these capabilities have `need`?
 *   claude                 the Claude CLI
 *   calendar | email       a calendar / mail source it reads itself (not an account)
 *   bank                   a bank source it reads itself
 *   connectors             the Claude connectors' own calendar or mail (the Google
 *                          Calendar / Gmail presets: calendar/events.json, inbox/messages.json)
 *   source:<id>            that very source
 */
export function hasNeed(caps, need) {
  if (!caps || typeof need !== 'string') return false;
  if (need === 'claude') return caps.claude === true;
  if (need === 'connectors') return caps.claude === true && caps.sources.some(s => s.preset === 'google-calendar' || s.preset === 'gmail');
  if (need === 'bank') return caps.banks.length > 0 || caps.sources.some(s => s.capability === 'bank');
  if (CAPS.includes(need)) return caps.sources.some(s => s.capability === need);
  if (need.startsWith('source:')) return caps.sources.some(s => s.id === need.slice(7));
  return false;
}

/** What a background job that is not an account needs (lib/main-computer.mjs JOBS), or null. */
export function jobNeed(job) {
  return { 'ai-brief': 'claude', story: 'claude', connectors: 'connectors', bank: 'bank' }[job] || null;
}

const seenAt = (d) => (Number.isFinite(d && d.lastSeen) ? d.lastSeen : Date.parse((d && d.lastSeen) || '') || 0);
/** Is a device there now? This one, one with an open live link, or one seen in the last few minutes. */
export function isOnline(d, now = Date.now()) {
  if (!d) return false;
  if (d.me || d.live === true) return true;
  return now - seenAt(d) <= ONLINE_MS;
}
/** Seen recently enough to count for "the group has it". */
export function isRecent(d, now = Date.now()) { return !!d && (d.me || d.live === true || now - seenAt(d) <= RECENT_MS); }

/**
 * The devices that have `need` and count: [{deviceId, fetcherId, name, me, caps, online}].
 * devices: [{deviceId, fetcherId, name, me, lastSeen, live?, caps}] (lib/sync/engine.mjs groupCaps).
 */
export function capableDevices(devices, need, { now = Date.now() } = {}) {
  return (Array.isArray(devices) ? devices : [])
    .filter(d => d && d.caps && isRecent(d, now) && hasNeed(d.caps, need))
    .map(d => ({ ...d, online: isOnline(d, now) }));
}

/**
 * Which device runs something that needs `need` (a request, or a job whose
 * recorded runner cannot): the same answer on every device that sees the same
 * records.
 *   1. the live lease's holder (lib/sync/live/lease.mjs), when it is capable
 *   2. the first of `preferred` (fetcher ids: the job's recorded runner, then
 *      the main computer) that is capable and online
 *   3. the capable online device with the smallest fetcher id, else the capable
 *      device with the smallest fetcher id (it may be asleep)
 * requireApply: only devices that take changes from the others (a request is
 * only seen by those). Returns the device or null (nobody can).
 */
export function pickRunner({ devices = [], need, lease = null, preferred = [], now = Date.now(), requireApply = false } = {}) {
  let cands = capableDevices(devices, need, { now });
  if (requireApply) cands = cands.filter(d => d.me ? d.caps.apply : d.caps.apply === true);
  if (!cands.length) return null;
  if (lease) { const l = cands.find(d => d.deviceId === lease); if (l) return l; }
  for (const fid of preferred) { const p = fid && cands.find(d => d.fetcherId === fid && d.online); if (p) return p; }
  const byId = (a, b) => (String(a.fetcherId) < String(b.fetcherId) ? -1 : String(a.fetcherId) > String(b.fetcherId) ? 1 : 0);
  const online = cands.filter(d => d.online).sort(byId);
  return online[0] || cands.sort(byId)[0];
}

/**
 * The group's view for the page (GET /api/connections `group`), never a secret:
 *   {apply, me:{name}, devices:[{name, kind, online, lastSeen}], has:{claude, calendar, email, bank, connectors: [{name, online, apply}]}}
 * `has` lists OTHER devices only; this device's own connections are the page's usual entries.
 */
export function groupView({ devices = [], now = Date.now(), apply = false } = {}) {
  const others = (Array.isArray(devices) ? devices : []).filter(d => d && !d.me && isRecent(d, now));
  const me = (Array.isArray(devices) ? devices : []).find(d => d && d.me) || null;
  const has = {};
  for (const need of NEEDS) {
    has[need] = capableDevices(others, need, { now }).map(d => ({ name: d.name || 'Another device', online: d.online, apply: !!(d.caps && d.caps.apply) }));
  }
  return {
    apply: !!apply, me: { name: (me && me.name) || null },
    devices: others.map(d => ({ name: d.name || 'Another device', kind: d.kind || (d.caps && d.caps.kind) || 'computer', online: isOnline(d, now), lastSeen: seenAt(d) || null, known: !!d.caps })),
    has,
  };
}

/** The other devices' sources (for showing what they publish): [{...source, fetcherId, deviceName}], smallest fetcher id first on a clash. */
export function remoteSources(devices, { now = Date.now() } = {}) {
  const out = new Map();
  const list = (Array.isArray(devices) ? devices : []).filter(d => d && !d.me && d.caps && isRecent(d, now))
    .sort((a, b) => (String(a.fetcherId) < String(b.fetcherId) ? -1 : 1));
  for (const d of list) for (const s of d.caps.sources) if (!out.has(s.id)) out.set(s.id, { ...s, fetcherId: d.fetcherId, deviceName: d.name || 'Another device', online: isOnline(d, now) });
  return [...out.values()];
}

/** Which device publishes the snapshot named after source `id`: the fetcher id of the device that reads it (smallest on a clash), or null. */
export function sourceOwner(devices, id, { now = Date.now() } = {}) {
  const ds = (Array.isArray(devices) ? devices : []).filter(d => d && d.caps && isRecent(d, now) && d.caps.sources.some(s => s.id === id))
    .map(d => d.fetcherId).filter(Boolean).sort();
  return ds[0] || null;
}

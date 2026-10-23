// lib/sync/roles.mjs - WHO RUNS WHAT: one rule for "main computer" jobs and
// account fetches (docs/dev/MULTI_DEVICE.md). Platform-agnostic: no node:
// imports, no files; the sync engine (lib/sync/engine.mjs) and the main
// computer view (lib/main-computer.mjs) both call it with what they read.
//
// Ids are FETCHER IDS: a device's id in this role (on the desktop the
// per-computer host id of lib/devicedir.mjs, the id lib/accounts.mjs records;
// a device without one uses its sync device id).
//
// Where it is recorded (the one source of truth, in the data folder; with
// folder sync both files sync, with a shared data folder they are shared):
//   accounts.json  an account's own `fetcher`: the computer it was connected on,
//                  or the one that took it over ("Fetch on this computer
//                  instead"). It holds its sign-in, so the account is read there.
//   roles.json     {roles: {<job>: {fetcher, name?, since}}} for the jobs that
//                  are not accounts: 'main' (the main computer) and 'bank',
//                  'ai-brief', 'story', 'connectors' (and later ones).
//
// The rule (recordedRunner):
//   an account     its own `fetcher`; nothing else (an account is only read where
//                  its sign-in is: the accounts code never lets a computer without
//                  one claim it)
//   a job          its own role, else the main computer's
//   nothing        null: with sync off every computer runs it, as before; with
//                  sync on the first device that can run it in the background
//                  claims it (lib/sync/engine.mjs isFetcher)
//
// LIVE SYNC (lib/sync/live/lease.mjs) adds a lease for each account
// ('fetch:<accountId>') and the phone: an election among the computers that
// can do the job (they hold its sign-in, they run in the background), pinned to
// the recorded fetcher, that moves the job while that computer sleeps and gives
// it back when it wakes. runsNow puts the three together: the lease when it has
// an answer, else what is recorded, else the default.

export const MAIN = 'main';
const FID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const fid = (v) => (typeof v === 'string' && FID_RE.test(v) ? v : null);

/** The account record with this id, or null. */
export function accountIn(accounts, id) {
  return (Array.isArray(accounts) ? accounts : []).find(a => a && a.id === id) || null;
}

/** A job's own recorded runner (roles.json; `deviceId` was the prototype's name), or null. */
export function roleRunner(roles, id) {
  const r = roles && typeof roles === 'object' ? roles[id] : null;
  return r && typeof r === 'object' ? fid(r.fetcher) || fid(r.deviceId) : null;
}

/**
 * Who is recorded to run `id` (an account id or a job): a fetcher id, or null.
 * {accounts: [Account], roles: {<job>: {fetcher}}}.
 */
export function recordedRunner(id, { accounts = [], roles = {} } = {}) {
  const acc = accountIn(accounts, id);
  if (acc) return fid(acc.fetcher);
  return roleRunner(roles, id) || (id !== MAIN ? roleRunner(roles, MAIN) : null);
}

/** Does the device `me` run `id`? null when nothing is recorded (the caller's default applies). */
export function runsHere(id, me, state) {
  const f = recordedRunner(id, state);
  return f ? f === me : null;
}

/**
 * Does this device run it NOW? The whole rule, in order:
 *   lease     live sync's answer (true/false), or null when it has none
 *   recorded  recordedRunner(...) (a fetcher id or null), compared with me
 *   fallback  nothing recorded: sync off -> true; sync on -> the device default
 */
export function runsNow({ lease = null, recorded = null, me = null, fallback = true } = {}) {
  if (lease === true || lease === false) return lease;
  if (recorded) return recorded === me;
  return !!fallback;
}

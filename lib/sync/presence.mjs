// lib/sync/presence.mjs - IS MY OTHER COMPUTER THERE? One plain state for each
// of the user's other devices, so nothing that needs one starts a request that
// can only time out, and the page says calmly what is going on
// (docs/dev/MULTI_DEVICE.md "What you see when a device is off").
//
// PLATFORM-AGNOSTIC: no node: imports, no files. Timers only through the
// `timers` adapter (globalThis by default).
//
// User request, 23 Oct: "make sure it's clear to the user when something
// doesn't work, i.e. if I turn off my Mac, it should know when a dashboard is
// open or not and then know when to sync or not, otherwise it just gives
// annoying error messages".
//
// THE STATES (one per device; presenceOf / presenceAll):
//   open      its server runs and a dashboard page is open on it
//   running   its server runs, no page is open
//   asleep    nothing heard for a while (no heartbeat for over FRESH_MS, or its
//             live link went quiet and did not come back), but seen in the last
//             ASLEEP_MS: a closed lid, a computer that went to sleep
//   off       it said goodbye (a clean stop), or not seen for longer
//   outdated  it runs (open or running) an older OpenDash than this one: it
//             cannot do everything (`version` says which)
// `base` is the same without 'outdated' (open | running | asleep | off), and
// `outdated` / `version` are always there, whatever the state.
//
// HOW EACH IS KNOWN (the evidence, all of it optional):
//   live link   (lib/sync/live/live.mjs peerPresence) an open link = its server
//               runs now; its 'pres' messages say whether a page is open and
//               which version runs, and 'stopping' when it shuts down. A link
//               that closed, could not be dialled again and stayed away for
//               LINK_GRACE_MS means it went away (sleep, shutdown, no network).
//   device.json (lib/sync/engine.mjs presenceRows) its heartbeat every 2
//               minutes: lastSeen, the app version, `page` {open, at} (written
//               again within seconds when a page opens or closes) and
//               `stoppedAt` in the goodbye record a clean stop writes.
// CLOCKS: the other device's clock may be wrong. Its own lastSeen is only used
// until this computer has watched its record change (observedAt, this
// computer's clock); a time in the future counts as now. Page state is read
// against the same record's own heartbeat, so it needs no clock at all.
// SLEEP AND WAKE: a device that wakes dials and announces itself at once
// (live.wake, engine.touch), so it flips back within seconds of its link
// opening; this computer waking (a timer that fires WAKE_GAP_MS late) marks
// the others `checking` for SETTLE_MS while their news comes in, and never
// "reachable" on stale evidence.

export const PRESENCE_V = 1;
// The names are stable (docs/dev/MULTI_DEVICE.md "The API"): `state` is one of STATES,
// `base` one of BASES, `word` (the short word texts use) one of WORDS.
export const STATES = Object.freeze(['open', 'running', 'asleep', 'off', 'outdated']);
export const BASES = Object.freeze(['open', 'running', 'asleep', 'off']);
export const WORDS = Object.freeze(['online', 'asleep', 'off', 'checking']);
/** Is a device with this state, base or word there now? Accepts any of the three vocabularies. */
export const isThere = (s) => ['open', 'running', 'outdated', 'online'].includes(s);
export const FRESH_MS = 210 * 1000;              // device.json heartbeat every 2 min, plus the cloud's delay (which varies)
export const LINK_GRACE_MS = 30 * 1000;          // a closed live link that did not come back within this: it went away
export const ASLEEP_MS = 12 * 60 * 60 * 1000;    // "seen today": quiet for less than this is asleep, longer is off
export const SETTLE_MS = 45 * 1000;              // after this computer wakes, the others are 'checking' this long
export const WAKE_GAP_MS = 30 * 1000;            // a tick this late: this computer was asleep
const GONE_REASONS = ['idle', 'closed', 'error', 'timeout', 'stopping'];

const isNum = (v) => Number.isFinite(v) && v > 0;
const clean = (s, n = 60) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n);

/** Compare two version strings ('2.15.1'): -1, 0 or 1; unknown versions compare equal. */
export function cmpVersion(a, b) {
  const p = (v) => { const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(v || '')); return m ? [+m[1], +m[2], +(m[3] || 0)] : null; };
  const x = p(a), y = p(b);
  if (!x || !y) return 0;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

/** "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago" (ms since). */
export function agoText(ms) {
  if (!Number.isFinite(ms) || ms < 0) return null;
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d <= 1 ? 'yesterday' : `${d} days ago`;
}

/** When this computer last heard from the device, by its own clock (see CLOCKS above). */
export function seenAt(row, now = Date.now()) {
  const link = row && row.link;
  const c = [];
  if (link && link.open) c.push(now);
  if (link && isNum(link.lastRecvAt)) c.push(Math.min(link.lastRecvAt, now));
  if (row && isNum(row.observedAt)) c.push(Math.min(row.observedAt, now));
  // Its own claim only until a change has been watched here (its clock may be wrong).
  if (!c.length || !(row && isNum(row.observedAt))) {
    const claim = row && (isNum(row.seenClaim) ? row.seenClaim : isNum(row.lastSeen) ? row.lastSeen : 0);
    if (claim) c.push(Math.min(claim, now));
  }
  return c.length ? Math.max(...c) : 0;
}

/**
 * One device's presence from its evidence (pure).
 * row: {deviceId, fetcherId, name, kind, me, app, seenClaim, lastSeen, observedAt,
 *       page: {open, at}, stoppedAt, behind, caps,
 *       link: {open, openedAt, closedAt, reason, lastRecvAt, failedDials, page, app, stopping}}
 * opts: {now, version (this computer's), wokeAt (this computer's last wake)}
 * -> {deviceId, fetcherId, name, kind, state, base, reachable, path, lastSeen, ago, version,
 *     outdated, page, checking, why, behind, text, short, word}
 */
export function derivePresence(row, { now = Date.now(), version = '0', wokeAt = 0 } = {}) {
  if (!row) return null;
  const name = clean(row.name) || 'Your other computer';
  const link = row.link || null;
  const seen = seenAt(row, now);
  const observedAfter = (t) => isNum(row.observedAt) && row.observedAt > t;
  const app = clean(row.app || (link && link.app) || '', 20) || null;
  let base, path = null, why = null, page = false;
  if (link && link.open && !link.stopping) {
    base = 'running'; path = 'live';
    page = link.page === true || (link.page == null && !!(row.page && row.page.open));
  } else {
    // It said goodbye: over the link (and nothing newer since), or in its last record.
    const byeLink = !!(link && link.stopping && !(isNum(link.closedAt) && observedAfter(link.closedAt)));
    const byeFile = isNum(row.stoppedAt) && !(link && link.open);
    // Its live link closed, it could not be dialled again, and nothing came through the folder since.
    const gone = !!(link && !link.open && isNum(link.closedAt) && GONE_REASONS.includes(link.reason) && (link.failedDials || 0) > 0
      && now - link.closedAt >= LINK_GRACE_MS && !observedAfter(link.closedAt));
    if (byeLink || byeFile) { base = 'off'; why = 'stopped'; }
    else if (!gone && seen && now - seen <= FRESH_MS) {
      base = 'running'; path = 'folder';
      page = !!(row.page && row.page.open);
    } else if (seen && now - seen <= ASLEEP_MS) { base = 'asleep'; why = gone ? 'link-gone' : 'quiet'; }
    else { base = 'off'; why = seen ? 'quiet' : 'never'; }
  }
  if (base === 'running' && page) base = 'open';
  // This computer just woke: what it knows about the others is old until their news comes in.
  const checking = !!(isNum(wokeAt) && now - wokeAt < SETTLE_MS && !(link && link.open) && !observedAfter(wokeAt));
  const up = base === 'open' || base === 'running';
  const reachable = up && !checking;
  const outdated = !!(app && cmpVersion(app, version) < 0);
  const state = up && outdated ? 'outdated' : base;
  const lastSeen = up ? now : seen || null;
  const ago = lastSeen ? Math.max(0, now - lastSeen) : null;
  const out = {
    v: PRESENCE_V, deviceId: row.deviceId || null, fetcherId: row.fetcherId || row.deviceId || null, name,
    kind: ['computer', 'phone', 'tablet'].includes(row.kind) ? row.kind : 'computer',
    state, base, reachable, path, lastSeen, ago, version: app, outdated, page: base === 'open', checking, why,
    behind: Number.isInteger(row.behind) && row.behind > 0 ? row.behind : 0,
  };
  out.word = wordOf(out);
  out.short = shortText(out);
  out.text = longText(out);
  return out;
}

/** 'online' | 'asleep' | 'off' | 'checking' */
export function wordOf(p) {
  if (!p) return 'off';
  if (p.checking) return 'checking';
  return p.base === 'open' || p.base === 'running' ? 'online' : p.base;
}
/** "Mac online", "Mac is asleep", "Mac is off", "Checking Mac…", "Mac is on 2.15.0". */
export function shortText(p) {
  if (!p) return '';
  if (p.checking) return `Checking ${p.name}…`;
  if (p.state === 'outdated') return `${p.name} is on ${p.version}`;
  if (p.base === 'open' || p.base === 'running') return `${p.name} online`;
  return `${p.name} is ${p.base}`;
}
/** A line for the device list: "Online · dashboard open", "Asleep · last seen 2 h ago", ... */
export function longText(p) {
  if (!p) return '';
  if (p.checking) return 'Checking…';
  const ago = agoText(p.ago);
  if (p.base === 'open') return 'Online · dashboard open' + (p.path === 'folder' ? ' (through the sync folder)' : '');
  if (p.base === 'running') return 'Online · no dashboard open' + (p.path === 'folder' ? ' (through the sync folder)' : '');
  if (p.why === 'stopped') return 'Off' + (ago ? ` · turned off ${ago}` : '');
  if (p.base === 'asleep') return 'Asleep' + (ago ? ` · last seen ${ago}` : '');
  return 'Off' + (ago && p.why !== 'never' ? ` · last seen ${ago}` : '');
}

/**
 * The calm line for something that needs `p` while it is not there (never an error):
 *   'changes'  "Mac is off. Your changes reach it when it's back."
 *   'claude'   "Mac is asleep. Claude answers there when it's back."    (opts.here: "Mac is asleep: using this computer")
 *   'fetch'    "Mac is asleep: its calendar shows what it last sent."  (opts.what: 'calendar' | 'email' | 'bank')
 *   'finance'  "Finance from Mac · last update 2 h ago (it's off)"     (opts.updatedAgoMs)
 *   'request'  "Mac is off. It runs this when it's back."
 */
export function calmText(p, kind = 'changes', opts = {}) {
  const name = (p && p.name) || 'Your other computer';
  const w = p && p.checking ? 'not answering yet' : p && p.base === 'asleep' ? 'asleep' : 'off';
  const is = `${name} is ${w}`;
  if (kind === 'claude') return opts.here ? `${is}: using this computer` : `${is}. Claude answers there when it's back.`;
  if (kind === 'fetch') {
    const what = { calendar: 'its calendar', email: 'its email', bank: 'your finances' }[opts.what] || 'what it reads';
    return `${is}: ${what} ${opts.what === 'bank' ? 'show' : 'shows'} what it last sent.`;
  }
  if (kind === 'finance') {
    const ago = agoText(opts.updatedAgoMs);
    return `Finance from ${name}${ago ? ` · last update ${ago}` : ''} (it's ${w === 'not answering yet' ? 'not answering yet' : w})`;
  }
  if (kind === 'request') return `${is}. It runs this when it's back.`;
  return `${is}. Your changes reach it when it's back.`;
}

/**
 * The header's one line for the group (pure):
 *   {tone: 'ok' | 'off' | 'attention' | 'busy' | 'none', text, tip}
 *   ok         "In sync · Mac online"            every device there (or some, and the rest catch up later)
 *   off        "Mac off · 3 changes waiting"     nobody else there now; nothing is wrong
 *   attention  "Needs attention"                 sync itself has a problem (locked, an error)
 *   busy       "Sending…"                        changes on their way over a live link
 * devices: derivePresence rows (others only). sync: {enabled, state, sending, problem}
 */
export function summarize(devices = [], sync = {}) {
  const list = (Array.isArray(devices) ? devices : []).filter(Boolean);
  if (!sync.enabled) return { tone: 'none', text: '', tip: '' };
  const waiting = list.reduce((n, d) => n + (d.behind || 0), 0);
  const waitText = waiting ? ` · ${waiting} change${waiting === 1 ? '' : 's'} waiting` : '';
  if (sync.problem) return { tone: 'attention', text: 'Needs attention', tip: sync.problem };
  // An older version elsewhere is a notice of its own (the page shows it once per version and
  // turns the dot amber until it is dismissed), not a reason to say "Needs attention" for ever.
  if (sync.sending) return { tone: 'busy', text: 'Sending…', tip: 'Sending your changes to your other devices.' };
  if (!list.length) return { tone: 'ok', text: 'Sync on', tip: 'No other device has joined yet.' };
  const up = list.filter(d => d.reachable);
  const checking = list.filter(d => d.checking);
  const away = list.filter(d => !d.reachable && !d.checking);
  if (checking.length && !up.length) return { tone: 'off', text: `Checking ${checking.length === 1 ? checking[0].name : 'your devices'}…`, tip: 'This computer just woke up: looking for your other devices.' };
  if (!away.length) {
    const who = up.length === 1 ? `${up[0].name} online` : `${up.length} devices online`;
    return { tone: 'ok', text: `In sync · ${who}`, tip: waiting ? `Your latest changes are on their way (${waiting} waiting).` : 'Your devices have your latest changes.' };
  }
  const first = away[0];
  const what = away.length === 1 ? `${first.name} ${first.base === 'asleep' ? 'asleep' : 'off'}` : `${away.length} devices away`;
  if (up.length) return { tone: 'ok', text: `In sync · ${up.length === 1 ? up[0].name : up.length + ' devices'} online`, tip: `${what}${waitText}. They catch up when they are back.` };
  return { tone: 'off', text: `${what}${waitText}`, tip: `${calmText(first, 'changes')}` };
}

/**
 * The tracker: presence for every other device, kept up to date.
 *   rows()     the evidence ([row] as derivePresence takes, this device included with me: true)
 *   version    this computer's app version
 *   onWake()   this computer woke up (tell the others at once: engine.touch, live.wake)
 *   onChange(list)  a device's state, reachability or version changed
 *   onTick()   each tick, first (the server publishes whether a page is open here)
 * -> {start, stop, of(id), all(), mine(), tick(), get wokeAt}
 */
export function createPresence({ rows = () => [], version = '0', now = () => Date.now(), timers = globalThis, tickMs = 5000, onWake = null, onChange = null, onTick = null } = {}) {
  let timer = null, lastTick = 0, wokeAt = 0, lastKey = '', cache = null, cacheAt = 0;
  function evidence() { try { return (rows() || []).filter(Boolean); } catch { return []; } }
  function compute() {
    const t = now();
    if (cache && t - cacheAt < 1000) return cache;
    const list = evidence().filter(r => !r.me).map(r => derivePresence(r, { now: t, version, wokeAt })).filter(Boolean);
    cache = list; cacheAt = t;
    return list;
  }
  const key = (list) => list.map(p => [p.deviceId, p.state, p.reachable, p.checking, p.version, p.behind ? 1 : 0].join(':')).sort().join('|');
  function tick() {
    const t = now();
    if (lastTick && t - lastTick > WAKE_GAP_MS + tickMs) {
      wokeAt = t; cache = null;
      if (typeof onWake === 'function') { try { onWake(); } catch { /* a hook never breaks presence */ } }
    }
    lastTick = t;
    if (typeof onTick === 'function') { try { onTick(); } catch { /* fine */ } }
    cache = null;
    const list = compute();
    const k = key(list);
    if (k !== lastKey) {
      const first = !lastKey;
      lastKey = k;
      if (!first && typeof onChange === 'function') { try { onChange(list); } catch { /* fine */ } }
    }
    return list;
  }
  const match = (p, id) => !!id && (p.deviceId === id || p.fetcherId === id);
  return {
    start() { if (timer) return; lastTick = now(); tick(); timer = timers.setInterval(tick, tickMs); if (timer && typeof timer.unref === 'function') timer.unref(); },
    stop() { if (timer) timers.clearInterval(timer); timer = null; },
    tick,
    /** One device (its sync device id or fetcher id): the presence row, or null (not a known member). */
    of(id) { return compute().find(p => match(p, id)) || null; },
    /** Every other device. */
    all() { return compute().slice(); },
    /** This device as the others see it: {name, version, page}. */
    mine() { const me = evidence().find(r => r.me); return me ? { name: clean(me.name) || 'This computer', version: clean(version, 20), deviceId: me.deviceId || null } : null; },
    get wokeAt() { return wokeAt; },
    version,
  };
}

// ─── The process-wide API (the server binds its tracker once) ─────────────
// lib/remote-jobs.mjs, lib/finance-share.mjs and the Sync health page call
// presenceOf / presenceAll; with sync off, or before the server bound one,
// they answer null / [] (nothing known: callers keep their old behaviour).
let bound = null;
/** Bind the tracker every caller uses (server/routes/sync.mjs; null unbinds). */
export function bindPresence(tracker) { bound = tracker || null; return bound; }
/** The presence of one other device (sync device id or fetcher id), or null. A ctx with `presence` may be passed. */
export function presenceOf(id, ctx = null) {
  const t = (ctx && ctx.presence) || bound;
  try { return t ? t.of(id) : null; } catch { return null; }
}
/** Every other device's presence ([] with sync off). A ctx with `presence` may be passed. */
export function presenceAll(ctx = null) {
  const t = (ctx && ctx.presence) || bound;
  try { return t ? t.all() : []; } catch { return []; }
}

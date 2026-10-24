// lib/sync-presence.mjs - the server's presence tracker (lib/sync/presence.mjs)
// wired to this computer's sync engine, live sync and open pages
// (docs/dev/MULTI_DEVICE.md "What you see when a device is off").
//
// attachPresence({engine, live, version, log, pageCount, emit}) -> {tracker, view, start, pageBeat, stop}
//   evidence  engine.presenceRows() (device.json: heartbeats, versions, pages,
//             goodbyes) + live.peerPresence(id) (links, 'pres' messages)
//   page      whether a dashboard page is open HERE: an open event stream
//             (GET /api/events, pageCount()) or a presence poll in the last
//             PAGE_BEAT_MS (pageBeat(), GET /api/sync/presence). Published to
//             the others through device.json and every live link.
//   wake      this computer slept: device.json is written again and every
//             peer dialled at once (engine.touch, live.wake)
//   change    a device's state changed: open pages hear 'presence' (emit) and
//             the log says so
// The tracker is bound process-wide (bindPresence), so presenceOf / presenceAll
// answer anywhere in the server, and the engine's groupCaps rows carry
// `reachable` (what isOnline / reachable in lib/sync/caps.mjs and
// claude-host.mjs use).
//
// No node: imports needed; kept outside lib/sync because it knows the server.

import { createPresence, bindPresence, summarize } from './sync/presence.mjs';

export const PAGE_BEAT_MS = 90 * 1000;

export function attachPresence({ engine, live = null, version = '0', log = () => {}, pageCount = () => 0, emit = () => {}, now = () => Date.now() } = {}) {
  let lastBeat = 0, lastPage = null;
  const linkOf = (id) => {
    if (!live || typeof live.peerPresence !== 'function') return null;
    try { return live.peerPresence(id); } catch { return null; }
  };
  function rows() {
    let list = [];
    try { list = typeof engine.presenceRows === 'function' ? engine.presenceRows() : []; } catch { list = []; }
    const seq = engine.seq || 0;
    let relay = null;
    try { relay = typeof engine.relayPresence === 'function' ? engine.relayPresence() : null; } catch { /* no relay */ }
    return list.map((r) => {
      if (r.me) return r;
      const link = linkOf(r.deviceId);
      // With a live link its own 'seen' is up to the second; through the folder the heartbeat's.
      const behind = link && link.open && Number.isInteger(link.seen) ? Math.max(0, seq - link.seen) : r.behind;
      const peer = relay && ['live', 'polling'].includes(relay.state) && (relay.devices || []).find(d => d.id === r.deviceId);
      return { ...r, link, behind, relay: peer ? { ...peer, at: relay.presenceAt } : null };
    });
  }
  const pageOpen = () => { let n = 0; try { n = pageCount() || 0; } catch { n = 0; } return n > 0 || now() - lastBeat < PAGE_BEAT_MS; };
  const tracker = createPresence({
    rows, version, now,
    onTick() {
      const open = pageOpen();
      if (open && typeof engine.refreshRelayPresence === 'function') Promise.resolve(engine.refreshRelayPresence()).catch(() => {});
      if (open === lastPage) return;
      lastPage = open;
      try { if (typeof engine.setPresence === 'function') engine.setPresence({ page: open }); } catch { /* fine */ }
      try { if (live && typeof live.setPresence === 'function') live.setPresence({ page: open }); } catch { /* fine */ }
    },
    onWake() {
      log('info', 'presence: this computer woke up; telling the others');
      try { if (typeof engine.touch === 'function') engine.touch(); } catch { /* fine */ }
      try { if (live && typeof live.wake === 'function') live.wake(); } catch { /* fine */ }
    },
    onChange(list) {
      for (const p of list) log('info', `presence: ${p.name}: ${p.state}${p.checking ? ' (checking)' : ''}${p.path ? ` via ${p.path}` : ''}`);
      try { emit('presence', view()); } catch { /* no open tabs */ }
    },
  });
  bindPresence(tracker);
  if (typeof engine.setPresenceSource === 'function') engine.setPresenceSource((id) => tracker.of(id));

  /** The live link's way (same network or the internet) for each peer, from live.status(). */
  function linkPaths() {
    const out = new Map();
    if (!live || typeof live.status !== 'function') return out;
    try { for (const p of live.status().peers || []) if (p && p.live) out.set(p.id, p.path || null); } catch { /* fine */ }
    return out;
  }
  /**
   * GET /api/sync/presence: {v, enabled, me:{name, version}, devices:[...], summary:{tone, text, tip}, notices:[...], at}
   *   devices   [{id, name, kind, state, base, word, reachable, checking, path: direct|relay|folder|null,
   *              via: lan|internet|null (the direct link's way), page, version, outdated, lastSeen, ago,
   *              behind (changes to go), pct (0-99 from the direct link's counts when a real catch-up, else null), short, text}]
   *   summary   the header's line (lib/sync/presence.mjs summarize)
   *   notices   [{id, kind:'version', device, version, text}]: an older version on another device
   */
  function view() {
    const enabled = !!engine.enabled;
    const devices = enabled ? tracker.all() : [];
    let st = null;
    try { st = enabled ? engine.status() : null; } catch { st = null; }
    const problem = st && ['error', 'locked'].includes(st.state) ? st.message || 'Sync needs attention (Settings > Sync).' : null;
    const sending = devices.some(d => d.reachable && (d.path === 'live' || d.path === 'relay') && d.behind > 0);
    const via = linkPaths();
    const seq = engine.seq || 0;
    // "Catching up 40%": the share of this computer's changes that the other has, from the direct link's counts,
    // only while a real catch-up is on (25 or more to go); otherwise the row says "{n} changes to go".
    const pctOf = (d) => {
      if (!(d.behind >= 25) || !seq) return null;
      const l = linkOf(d.deviceId);
      return l && l.open && Number.isInteger(l.seen) ? Math.max(0, Math.min(99, Math.floor(l.seen / seq * 100))) : null;
    };
    return {
      v: 1, enabled,
      me: enabled ? tracker.mine() : null,
      devices: devices.map(d => ({
        id: d.deviceId, name: d.name, kind: d.kind, state: d.state, base: d.base, word: d.word, reachable: d.reachable, checking: d.checking,
        path: d.path === 'live' ? 'direct' : d.path, via: d.path === 'live' ? via.get(d.deviceId) || null : null, page: d.page, version: d.version, outdated: d.outdated,
        lastSeen: d.lastSeen, ago: d.ago, behind: d.behind, pct: pctOf(d), short: d.short, text: d.text,
      })),
      summary: summarize(devices, { enabled, problem, sending }),
      notices: devices.filter(d => d.outdated && d.version).map(d => ({
        id: `version:${String(d.deviceId || '').slice(0, 16)}:${d.version}`, kind: 'version', device: d.name, version: d.version,
        text: `${d.name} is on ${d.version}: update it to sync everything.`,
      })),
      at: now(),
    };
  }
  return {
    tracker, view,
    start() { tracker.start(); },
    /** A page asked (GET /api/sync/presence): a page is open here. */
    pageBeat() { lastBeat = now(); if (lastPage !== true) tracker.tick(); },
    stop() { tracker.stop(); bindPresence(null); if (typeof engine.setPresenceSource === 'function') engine.setPresenceSource(null); },
  };
}

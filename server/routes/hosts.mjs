// server/routes/hosts.mjs - two computers on one data folder (lib/hosts.mjs).
//
//   GET  /api/hosts                 -> {me, paused, by, overridden, others:[...], oneDrive, conflicts:[...]}
//        paused/by: another computer was open when this server started, so
//        state writes answer 423 OTHER_COMPUTER (the banner with "Use here anyway").
//        others: every other computer seen in the last 3 minutes (a warning
//        banner when one appears later; writes are not paused mid-edit).
//        oneDrive: the data folder is inside OneDrive (the "one computer at a time" banner).
//        conflicts: OneDrive's '<known-file>-<DEVICE>.json' copies (scanned at
//        start and every 10 minutes; never merged).
//   POST /api/hosts/override        {} -> status: "Use here anyway", writes resume (the page only)
//   POST /api/hosts/conflicts/keep  {rel} -> {kept, name, conflicts}: "Keep as a backup" (the page only)
//
// The presence file is written once the server listens and removed when it stops.

import { findConflictCopies, keepConflictCopy, seenText } from '../../lib/hosts.mjs';
import { isOneDrivePath } from '../../lib/workspace-index.mjs';
import { HttpError } from '../http.mjs';

export const CONFLICT_SCAN_MS = 10 * 60 * 1000;

export default function register(app) {
  const ctx = app.ctx;
  const { log } = ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const hosts = ctx.hosts || null;
  let conflicts = [], scanTimer = null;
  const scan = () => { try { conflicts = findConflictCopies(root); } catch { conflicts = []; } return conflicts; };

  app.onReady(async () => {
    scan();
    if (conflicts.length) log('warn', `OneDrive kept ${conflicts.length} second cop${conflicts.length === 1 ? 'y' : 'ies'} of data files (see the banner)`);
    scanTimer = setInterval(scan, CONFLICT_SCAN_MS); scanTimer.unref?.();
    if (hosts && hosts.presence) {
      await hosts.presence.start();
      process.once('exit', () => hosts.presence.stopSync());
    }
  });
  app.onClose(async () => {
    clearInterval(scanTimer); scanTimer = null;
    if (hosts && hosts.presence) await hosts.presence.stop();
  });

  // "Use here anyway" and "Keep as a backup" are the user's own clicks: the page, never a local program.
  const fromPage = (c) => {
    const origin = c.req.headers.origin, sfs = c.req.headers['sec-fetch-site'];
    if (origin === `http://localhost:${c.port}` || origin === `http://127.0.0.1:${c.port}` || sfs === 'same-origin') return;
    throw new HttpError(403, 'only the OpenDash page can do this');
  };

  function status() {
    const g = hosts && hosts.gate ? hosts.gate.status() : { paused: false, by: null, overridden: false };
    const others = hosts && hosts.gate ? hosts.gate.others() : [];
    return {
      me: hosts && hosts.presence ? { hostId: hosts.presence.hostId, hostname: hosts.presence.hostname } : null,
      paused: g.paused, by: g.by, overridden: g.overridden,
      others: others.map(h => ({ hostId: h.hostId, hostname: h.hostname, version: h.version, lastSeenMs: h.lastSeenMs, seen: seenText(h.lastSeenMs) })),
      oneDrive: isOneDrivePath(root),
      conflicts: conflicts.map(c => ({ rel: c.rel, kind: c.kind, device: c.device, at: c.at })),
    };
  }

  app.route({ path: '/api/hosts', method: 'GET', quiet: true, handler: async () => status() });

  app.route({
    path: '/api/hosts/override', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      fromPage(c);
      await c.body({ allowEmpty: true });
      if (!hosts || !hosts.gate) return status();
      const before = hosts.gate.status();
      hosts.gate.override();
      if (before.paused) log('note', `changes resumed on this computer by the user's choice while ${before.by.hostname} has the data folder open`);
      return status();
    },
  });

  app.route({
    path: '/api/hosts/conflicts/keep', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      fromPage(c);
      const b = await c.body();
      const r = keepConflictCopy(root, String(b.rel || ''));
      log('note', `kept OneDrive's second copy of a ${r.kind} file as state/backups/${r.name}`);
      scan();
      return { ...r, conflicts: status().conflicts };
    },
  });
}

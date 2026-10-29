// server/routes/google.mjs - Gmail + Google Calendar (direct OAuth, optional)
// with snapshot fallbacks.
//
//   GET  /api/google/status       -> {configured, connected, account, snapshot:{inbox, calendar}, usable}
//   GET  /api/google/connect      -> 302 to Connections (Google accounts are added there now:
//                                    + Add Google account, /api/accounts); never a new single connection
//   POST /api/google/disconnect   -> {ok}
//   GET  /api/google/inbox?days=N -> {emails, source:'live'|'snapshot', fetchedAt?}
//   GET  /api/google/person?email=-> {threads}
//   GET  /api/google/calendar     -> {events, source, fetchedAt?}
//
// Snapshots are <data>/email/inbox.json and <data>/calendar/calendar.json
// (written by a Claude job or tools/write_snapshot.py). Freshness is always
// reported so the UI never implies a snapshot is live.

import { existsSync } from 'node:fs';
import {
  googleStatus, recentEmails, personEmails, todayEvents, disconnect,
} from '../../lib/google.mjs';
import { readJson } from '../../lib/fsutil.mjs';
import { inboxFiles } from '../../lib/inbox.mjs';
import { calendarFiles } from '../../lib/calendar.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const { paths, log } = app.ctx;

  async function snapshot(file) {
    if (!existsSync(file)) return null;
    try { return await readJson(file, { fallback: null }); } catch { return null; }
  }
  // The Update inbox / Update calendar jobs (lib/inbox.mjs, lib/calendar.mjs)
  // write inbox/messages.json and calendar/events.json; the v1 snapshots are
  // the fallback.
  const inboxSnap = async () => {
    const m = await snapshot(inboxFiles(paths).messages);
    if (m && Array.isArray(m.messages)) {
      return { fetchedAt: m.fetchedAt, emails: m.messages.map(x => ({ id: x.id, subject: x.subject, sender: x.sender, snippet: x.snippet, date: x.date })) };
    }
    return snapshot(paths.inboxFile);
  };
  const calSnap = async () => (await snapshot(calendarFiles(paths).events)) || snapshot(paths.calendarFile);

  // Used by /api/health too.
  app.ctx.googleSummary = async () => {
    const st = await googleStatus().catch(e => ({ configured: false, error: e.message }));
    const inbox = await inboxSnap();
    const cal = await calSnap();
    delete st.clientFile; delete st.secretsDir;
    st.snapshotAt = (inbox && inbox.fetchedAt) || (cal && cal.fetchedAt) || null;
    st.usable = !!st.connected || !!(inbox || cal);
    return st;
  };

  app.route({
    path: '/api/google/status', method: 'GET',
    handler: async () => {
      const st = await googleStatus();
      const inbox = await inboxSnap();
      const cal = await calSnap();
      st.snapshot = {
        inbox: inbox ? { count: (inbox.emails || []).length, fetchedAt: inbox.fetchedAt } : null,
        calendar: cal ? { count: (cal.events || []).length, fetchedAt: cal.fetchedAt } : null,
      };
      st.usable = st.connected || !!(inbox || cal);
      return st;
    },
  });

  app.route({
    path: '/api/google/connect', method: 'GET', sameOrigin: true,
    handler: async (c) => {
      c.res.writeHead(302, { Location: '/#view=connections', 'Cache-Control': 'no-store' });
      c.res.end();
    },
  });

  app.route({
    path: '/api/google/disconnect', method: 'POST',
    handler: async () => { await disconnect(); return { ok: true }; },
  });

  app.route({
    path: '/api/google/inbox', method: 'GET',
    handler: async (c) => {
      const days = Math.min(30, Math.max(1, Number(c.query.get('days')) || 7));
      try {
        return { emails: await recentEmails(days), source: 'live' };
      } catch (e) {
        const snap = await inboxSnap();
        if (snap) {
          const since = Date.now() - days * 86400000;
          const emails = (snap.emails || []).filter(m => !m.date || Date.parse(m.date) >= since);
          return { emails, source: 'snapshot', fetchedAt: snap.fetchedAt };
        }
        throw new HttpError(502, e.message);
      }
    },
  });

  app.route({
    path: '/api/google/person', method: 'GET',
    handler: async (c) => {
      const email = c.query.get('email');
      if (!email) throw new HttpError(400, 'email is required');
      const st = await googleStatus().catch(() => ({ connected: false }));
      if (st.connected) {
        try { return { threads: await personEmails(email), source: 'live' }; }
        catch (e) { throw new HttpError(502, e.message); }
      }
      // Not connected live: answer from the inbox snapshot (if any), never an error.
      const snap = await inboxSnap();
      const addr = String(email).toLowerCase();
      const threads = snap && Array.isArray(snap.emails)
        ? snap.emails.filter(e => String(e.sender || '').toLowerCase().includes(addr)).slice(0, 12)
        : [];
      return { threads, source: snap ? 'snapshot' : 'none', fetchedAt: snap ? snap.fetchedAt || null : null };
    },
  });

  app.route({
    path: '/api/google/calendar', method: 'GET',
    handler: async (c) => {
      try {
        return { events: await todayEvents(c.clockNow ? c.clockNow().timezone : c.getConfig().timezone), source: 'live' };   // effective zone (travel spec S5)
      } catch (e) {
        const snap = await calSnap();
        if (snap) return { events: snap.events || [], source: 'snapshot', fetchedAt: snap.fetchedAt };
        throw new HttpError(502, e.message);
      }
    },
  });

  app.route({ prefix: '/api/google', method: '*', handler: (c) => c.json(404, { error: 'unknown google route' }) });
}

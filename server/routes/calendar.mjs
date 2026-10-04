// server/routes/calendar.mjs - the Calendar section (lib/calendar.mjs does the work).
//
//   GET  /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
//        -> {status:'ok'|'empty', source, fetchedAt, window, timezone, count, calendars, events, job, lastUpdate}
//   GET  /api/calendar/status     -> {job, lastUpdate, fetchedAt, source}
//   POST /api/calendar/update     {back?, ahead?, force?} -> 202 {job}
//        200 {skipped:true, reason:'recent'} when not forced and the last try was
//        under 30 minutes ago; 409 {job} when one is already running.
//   GET  /api/calendar/attendees  -> {attendees:[{email,name,count,lastSeen,nextSeen}]}
//        (for the People suggestions; you and group calendars are left out)
//
// Writes go through lib/fsutil.mjs; the fetch runs through lib/claude-runner.mjs
// with only Google Calendar list_calendars, then only list_events, allowed
// (read-only; every other tool and connector denied). The log gets counts only.

import { createCalendarService } from '../../lib/calendar.mjs';
import { fetchCalendarSource, saveSourceSnapshot, readSourceSnapshot, mergeCalendarData } from '../../lib/calendar-sources.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { HttpError } from '../http.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Sources (lib/sources.mjs): GET /api/calendar merges every enabled calendar
// source (Google preset, other MCP servers, iCal links), each calendar tagged
// with its sourceId and whether it starts switched on (config.myEmails).
// "Update calendar" reads them all; one failing source does not stop the rest.

export default function register(app) {
  const { dataDir, paths, log, getConfig } = app.ctx;
  const sources = sourcesFor(app.ctx);
  const hooks = {
    list: async () => (await sources.all()).filter(s => s.capability === 'calendar'),
    readSnapshots: async (list) => {
      const out = {};
      for (const s of list) if (s.preset !== 'google-calendar') out[s.id] = await readSourceSnapshot(paths, s.id).catch(() => null);
      return out;
    },
    merge: mergeCalendarData,
    myEmails: () => (getConfig() || {}).myEmails || [],
    noteSync: (id, r) => sources.noteSync(id, r),
    fetchOther: async (s, { from, to, timeZone }) => {
      const disc = sources.cached();
      const r = await fetchCalendarSource(s, {
        from, to, timeZone, serverDef: s.kind === 'mcp' ? sources.serverDef(s.server) : null,
        denyServers: ((disc && disc.servers) || []).filter(x => x.kind === 'claude.ai').map(x => x.name),
      });
      await saveSourceSnapshot(paths, s.id, { from, to, ...r });
      log('note', `calendar source ${s.kind}: ${r.count} events`);
      return r;
    },
  };
  const cal = createCalendarService({ dataDir, paths, getConfig, log, sources: hooks });
  app.ctx.calendar = cal;
  app.onReady?.(() => cal.ensureImported().catch((e) => log('warn', `calendar import failed: ${e.message}`)));

  app.route({
    path: '/api/calendar', method: 'GET', methodError: 'GET only',
    handler: async (c) => {
      const from = c.query.get('from'), to = c.query.get('to');
      for (const [k, v] of [['from', from], ['to', to]]) if (v && !ISO.test(v)) throw new HttpError(400, `${k} must be YYYY-MM-DD`);
      await cal.ensureImported().catch(() => {});
      return cal.read({ from, to });
    },
  });

  app.route({ path: '/api/calendar/status', method: 'GET', quiet: true, handler: () => cal.status() });

  app.route({ path: '/api/calendar/attendees', method: 'GET', handler: async () => ({ attendees: (await cal.attendees()).slice(0, 300) }) });

  app.route({
    path: '/api/calendar/update', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const body = await c.body({ allowEmpty: true });
      const r = await cal.start({ back: body.back, ahead: body.ahead, force: body.force === true });
      if (r.started) return c.json(202, { job: r.job });
      if (r.reason === 'running') return c.json(409, { error: 'An update is already running.', job: r.job });
      if (r.reason === 'no-sources') return c.json(409, { error: 'No calendar is connected yet: add one in Connections.', code: 'NO_SOURCES', job: r.job });
      return { skipped: true, reason: r.reason, job: r.job, lastUpdate: r.lastUpdate || null };
    },
  });

  app.route({ prefix: '/api/calendar/', method: '*', handler: (c) => c.json(404, { error: 'unknown calendar route' }) });
}

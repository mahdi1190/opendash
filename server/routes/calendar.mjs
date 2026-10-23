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
//
// Changing Google Calendar (lib/calendar-write.mjs; the page: window.CalWrite):
//   POST   /api/calendar/events            {calendarId?, title, start, end, allDay?, location?, description?, sendUpdates?}
//   PATCH  /api/calendar/events/:id        {calendarId, patch:{title?, start?, end?, allDay?, location?, description?, calendarId?},
//                                           scope:'this'|'following'|'all', sendUpdates:'all'|'none', expectedUpdated?}
//   DELETE /api/calendar/events/:id        {calendarId, scope, sendUpdates}
//   POST   /api/calendar/events/:id/rsvp   {calendarId, response:'accepted'|'declined'|'tentative', scope?}
//   -> 200 {ok:true, event, events?, removed?, undo:{op:'create'|'update'|'remove'|'rsvp', args}|null}
//   -> 4xx/5xx {ok:false, code, message, current?}   (codes: lib/calendar-write.mjs; 428 GUESTS_UNCONFIRMED =
//      guests would be told but sendUpdates is missing; 429 RATE_LIMITED; undo args carry expectedUpdated)
//   Times: timed = ISO date-time with offset; all-day = 'YYYY-MM-DD', end exclusive.
//   GET/POST /api/calendar/fake {delayMs?, fail?}: the fake connector's settings
//   (only with DASHBOARD_CALENDAR_FAKE=1; 404 otherwise).
// Same protections as every mutating route (Host, same origin, JSON, body limit).
// Open tabs hear of each change through live sync (event 'calendar').

import { createCalendarService } from '../../lib/calendar.mjs';
import { createCalendarWriter, CalWriteError } from '../../lib/calendar-write.mjs';
import { fetchCalendarSource, saveSourceSnapshot, readSourceSnapshot, mergeCalendarData } from '../../lib/calendar-sources.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { accountsFor } from '../../lib/accounts.mjs';
import { HttpError } from '../http.mjs';
import { skippedBody } from '../../lib/main-computer.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Sources (lib/sources.mjs): GET /api/calendar merges every enabled calendar
// source (Google preset, other MCP servers, iCal links), each calendar tagged
// with its sourceId and whether it starts switched on (config.myEmails).
// "Update calendar" reads them all; one failing source does not stop the rest.

export default function register(app) {
  const { dataDir, paths, log, getConfig } = app.ctx;
  const sources = sourcesFor(app.ctx);
  const hooks = {
    // This computer's calendar sources, plus the ones another of the user's devices reads itself
    // (its calendar links, its Claude connectors: lib/remote-jobs.mjs remoteSources). Those
    // carry `remote`: their snapshots arrive by sync; they are shown here, never fetched here.
    list: async () => { const own = (await sources.all()).filter(s => s.capability === 'calendar'); const rj = app.ctx.remoteJobs; return rj ? [...own, ...rj.remoteSources('calendar', own.map(s => s.id))] : own; },
    readSnapshots: async (list) => {
      const out = {};
      for (const s of list) if (s.preset !== 'google-calendar') out[s.id] = await readSourceSnapshot(paths, s.id).catch(() => null);
      return out;
    },
    merge: mergeCalendarData,
    myEmails: () => (getConfig() || {}).myEmails || [],
    noteSync: (id, r) => sources.noteSync(id, r),
    readsHere: (list) => accountsFor(app.ctx).readsHere(list),
    fetchOther: async (s, { from, to, timeZone }) => {
      const disc = sources.cached();
      const r = await fetchCalendarSource(s, {
        dataDir, accounts: accountsFor(app.ctx), from, to, timeZone, serverDef: s.kind === 'mcp' ? sources.serverDef(s.server) : null,
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
  const writer = createCalendarWriter({
    dataDir, paths, getConfig, log, calendar: cal,
    emit: (event, data) => { const ls = app.ctx.liveSync; if (ls && typeof ls.emit === 'function') ls.emit(event, data); },
  });
  app.ctx.calendarWriter = writer;

  app.route({
    path: '/api/calendar', method: 'GET', methodError: 'GET only',
    handler: async (c) => {
      const from = c.query.get('from'), to = c.query.get('to');
      for (const [k, v] of [['from', from], ['to', to]]) if (v && !ISO.test(v)) throw new HttpError(400, `${k} must be YYYY-MM-DD`);
      await cal.ensureImported().catch(() => {});
      const r = await cal.read({ from, to, zone: c.zone });
      return { ...r, calendars: writer.decorate(r.calendars), write: writer.info() };
    },
  });

  // ── Changes to Google Calendar ──
  const answer = async (c, fn) => {
    try { return await fn(); }
    catch (e) {
      if (e instanceof CalWriteError) return c.json(e.status, e.toJSON());
      throw e;
    }
  };
  app.route({
    path: '/api/calendar/events', method: 'POST', methodError: 'POST only',
    handler: (c) => answer(c, async () => writer.create(await c.body())),
  });
  app.route({
    prefix: '/api/calendar/events/', method: ['PATCH', 'DELETE', 'POST'],
    handler: (c) => answer(c, async () => {
      const m = /^\/api\/calendar\/events\/([^/]{1,240})(\/rsvp)?$/.exec(c.path);
      if (!m) return c.json(404, { ok: false, code: 'NOT_FOUND', error: 'unknown calendar route' });
      let id;
      try { id = decodeURIComponent(m[1]); } catch { return c.json(400, { ok: false, code: 'BAD_REQUEST', error: 'bad event id' }); }
      if (m[2]) {
        if (c.method !== 'POST') return c.json(405, { ok: false, error: 'POST only' });
        return writer.rsvp(id, await c.body());
      }
      if (c.method === 'PATCH') return writer.update(id, await c.body());
      if (c.method === 'DELETE') return writer.remove(id, await c.body({ allowEmpty: true }));
      return c.json(405, { ok: false, error: 'PATCH or DELETE only' });
    }),
  });
  app.route({
    path: '/api/calendar/fake', method: ['GET', 'POST'],
    handler: async (c) => {
      if (!writer.info().fake) return c.json(404, { error: 'the fake calendar connector is off' });
      if (c.method === 'GET') return writer.fakeConfig();
      return answer(c, async () => writer.fakeConfig(await c.body()));
    },
  });

  app.route({ path: '/api/calendar/status', method: 'GET', quiet: true, handler: () => cal.status() });

  app.route({ path: '/api/calendar/attendees', method: 'GET', handler: async () => ({ attendees: (await cal.attendees()).slice(0, 300) }) });

  app.route({
    path: '/api/calendar/update', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const body = await c.body({ allowEmpty: true });
      // A click also asks the other devices that read calendars this one does not (their
      // calendar links, their Claude connectors) to update them (lib/remote-jobs.mjs);
      // what they fetch arrives by sync. Never for an automatic update, nor for one asked
      // by another device (c.internal).
      const asked = body.force === true && !c.internal && app.ctx.remoteJobs ? await app.ctx.remoteJobs.askOthers('fetch:calendar', body, c).catch(() => []) : [];
      const also = asked.length ? { asked, message: `Asking ${[...new Set(asked.map(a => a.runsOn))].join(' and ')} to update the calendar.` } : {};
      // An automatic update runs only on the main computer (lib/main-computer.mjs); a click always runs.
      const mc = app.ctx.mainComputer ? await app.ctx.mainComputer.gate('connectors', { automatic: body.force !== true }) : { run: true };
      // Not this computer's job: the Claude connectors (and calendar links) wait for the main
      // computer, but the accounts this computer fetches (lib/sync/roles.mjs) are still read here.
      if (!mc.run) {
        const own = mc.reason === 'moving' ? { started: false } : await cal.start({ back: body.back, ahead: body.ahead, force: body.force === true, zone: c.zone, onlyAccounts: true });
        return own.started ? c.json(202, { job: own.job, ...skippedBody(mc), ...also }) : asked.length ? c.json(202, { job: null, ...also }) : { ...skippedBody(mc), job: null };
      }
      const r = await cal.start({ back: body.back, ahead: body.ahead, force: body.force === true, zone: c.zone });
      if (r.started) return c.json(202, { job: r.job, ...also });
      if (r.reason === 'running') return c.json(409, { error: 'An update is already running.', job: r.job });
      if (r.reason === 'no-sources' && asked.length) return c.json(202, { job: null, ...also });
      if (r.reason === 'no-sources') return c.json(409, { error: 'No calendar is connected yet: add one in Connections.', code: 'NO_SOURCES', job: r.job });
      return { skipped: true, reason: r.reason, job: r.job, lastUpdate: r.lastUpdate || null };
    },
  });

  app.route({ prefix: '/api/calendar/', method: '*', handler: (c) => c.json(404, { error: 'unknown calendar route' }) });
}

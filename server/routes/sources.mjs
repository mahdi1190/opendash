// server/routes/sources.mjs - data sources (lib/sources.mjs): where bank
// transactions, calendar events and email come from.
//
//   GET    /api/sources[?refresh=1]     -> {sources:[Source+health], capabilities, servers, discovery, persisted}
//          ?discover=cached: answer at once from the last server list (re-listed in the background when old)
//          servers: what `claude mcp list` shows (cached a minute; refresh=1 lists again)
//   POST   /api/sources/tools  {server} -> {server, status, capability, tools:[{name, safety:'read'|'unknown'|'write', selected}]}
//          one `claude -p` that stops at its start-up event: no model turn, nothing read
//   POST   /api/sources/test   {source} -> {ok, count, accounts, preview:[...], warnings} | {ok:false, error, code}
//          a short read-only fetch with an unsaved source, so the user sees it works before saving
//   POST   /api/sources        {source} -> the saved source (201)
//   PUT    /api/sources/<id>   {label?, colour?, enabled?, tools?, url?, accounts?:[{id, name?, colour?, enabled?, own?}]}
//   DELETE /api/sources/<id>   -> {removed}   (its data files stay; nothing is deleted)
//   POST   /api/sources/<id>/sync -> starts the capability's update (calendar, inbox or finance) -> 202 {job}
//
// Source text (labels, URLs) is validated in lib/sources.mjs; an iCal URL is
// kept on the server and never sent back (the page sees its host only). Logs
// carry counts and kinds only.

import { sourcesFor, validateSource, newSourceId, presetFor, maskUrl, publicSource } from '../../lib/sources.mjs';
import { fetchCalendarSource } from '../../lib/calendar-sources.mjs';
import { fetchEmailSource } from '../../lib/inbox-sources.mjs';
import { fetchFromSource, describeRejected } from '../../lib/source-adapter.mjs';
import { startFinanceUpdate } from '../../lib/finance.mjs';
import { ClaudeError } from '../../lib/claude-runner.mjs';
import { addDays, isoDay } from '../../lib/calendar-jobkit.mjs';
import { HttpError } from '../http.mjs';

const ID = /^[a-z0-9][a-z0-9-]{1,40}$/;

export default function register(app) {
  const { log, getConfig } = app.ctx;
  const sources = sourcesFor(app.ctx);
  const claudeAiServers = () => { const d = sources.cached(); return ((d && d.servers) || []).filter(x => x.kind === 'claude.ai').map(x => x.name); };
  const fail = (e) => {
    if (e instanceof ClaudeError) return { ok: false, error: e.message, code: e.code };
    if (e && e.status) throw new HttpError(e.status, e.message);
    return { ok: false, error: String(e && e.message || e).slice(0, 240), code: (e && e.code) || 'FAILED' };
  };

  app.route({
    path: '/api/sources', method: 'GET', methodError: 'GET or POST only',
    handler: async (c) => sources.status({ force: c.query.get('refresh') === '1', discover: c.query.get('discover') === 'cached' ? 'cached' : true }),
  });

  app.route({
    path: '/api/sources', method: 'POST', methodError: 'GET or POST only',
    handler: async (c) => {
      const body = await c.body();
      try { return c.json(201, { source: publicSource(await sources.create(body.source || {})) }); }
      catch (e) { if (e.status) throw new HttpError(e.status, e.message); throw e; }
    },
  });

  app.route({
    path: '/api/sources/tools', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const { server } = await c.body();
      await sources.discover();
      try { return await sources.listTools(String(server || '')); }
      catch (e) { if (e instanceof ClaudeError) return c.json(e.status === 400 ? 400 : 200, { error: e.message, code: e.code, tools: [] }); throw e; }
    },
  });

  app.route({
    path: '/api/sources/test', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const body = await c.body();
      const input = body.source || {};
      // An existing source (by id) may be re-tested; its stored URL is used if none is given.
      const existing = input.id && ID.test(input.id) ? await sources.get(input.id) : null;
      const { source, errors } = validateSource({ ...(existing || {}), ...input, id: (existing && existing.id) || newSourceId(input.capability, input.label || input.server), ...(existing && existing.kind === 'ical' && !input.url ? { url: existing.url } : {}) });
      if (errors.length) throw new HttpError(400, errors.join('; '));
      const cfg = getConfig() || {};
      const tz = (c.clockNow && c.clockNow().timezone) || cfg.timezone || 'UTC';   // effective zone (travel spec S5)
      const today = isoDay(new Date(), tz);
      const t0 = Date.now();
      const level = source.preset ? 'tools' : 'read';
      const finish = async result => {
        if (existing) await sources.noteCheck(existing.id, { ok: result.ok, level, at: new Date(t0).toISOString(), error: result.error, code: result.code, expected: source });
        return { ...result, level };
      };
      try {
        if (source.kind === 'csv') return { ok: true, count: 0, accounts: [], preview: [], note: 'CSV imports need no connection.' };
        if (source.preset) {
          // A tuned preset: checking the server answers is the test (its full job runs on Update).
          const r = await sources.listTools(source.server);
          const required = { bank: 'list_transaction_accounts', calendar: 'list_calendars', email: 'search_threads' }[source.capability];
          const ok = r.tools.some(t => t.name === required);
          return await finish(ok ? { ok: true, count: null, accounts: [], preview: [], note: `${source.label} answered with ${r.tools.length} tools. This checks tool availability; Sync now checks and imports your account data.`, ms: Date.now() - t0 }
            : { ok: false, error: `${source.label} did not offer its required read tool. Retry the check or sync; reconnect only if Claude asks you to sign in.`, code: 'TOOL_MISSING' });
        }
        if (source.capability === 'calendar') {
          const r = await fetchCalendarSource(source, { dataDir: app.ctx.dataDir, from: addDays(today, -7), to: addDays(today, 90), timeZone: tz, serverDef: sources.serverDef(source.server), denyServers: claudeAiServers() });
          log('note', `sources: test ${source.kind} calendar: ${r.count} events`);
          return await finish({ ok: true, count: r.count, accounts: r.calendars, warnings: r.warnings, ms: Date.now() - t0,
            preview: r.events.slice(0, 5).map(e => ({ title: e.summary, when: e.start.date || e.start.dateTime })) });
        }
        if (source.capability === 'email') {
          const r = await fetchEmailSource(source, { dataDir: app.ctx.dataDir, days: 3, todayIso: today, serverDef: sources.serverDef(source.server), denyServers: claudeAiServers() });
          log('note', `sources: test email: ${r.count} messages`);
          return await finish({ ok: true, count: r.count, accounts: r.accounts, warnings: r.warnings, ms: Date.now() - t0,
            preview: r.messages.slice(0, 5).map(m => ({ title: m.subject, when: m.date, who: m.from.name || m.from.email })) });
        }
        const r = await fetchFromSource(source, { from: addDays(today, -14), to: today, maxDate: addDays(today, 1), currency: cfg.currency || 'GBP', timeZone: tz,
          serverDef: sources.serverDef(source.server), denyServers: claudeAiServers() });
        log('note', `sources: test bank: ${r.rows.length} transactions`);
        const rej = describeRejected(r.rejected);
        return await finish({ ok: true, count: r.rows.length, accounts: r.accounts, warnings: rej ? [`Left out: ${rej}.`] : [], ms: Date.now() - t0,
          preview: r.rows.slice(0, 5).map(x => ({ title: x.memo, when: x.date })) });
      } catch (e) {
        log('warn', `sources: test failed (${e.code || 'error'})`);
        return await finish(fail(e));
      }
    },
  });

  // /api/sources/<id> and /api/sources/<id>/sync
  app.route({
    prefix: '/api/sources/', method: '*',
    handler: async (c) => {
      const m = /^\/api\/sources\/([a-z0-9][a-z0-9-]{1,40})(\/sync)?$/.exec(c.path);
      if (!m) return c.json(404, { error: 'unknown sources route' });
      const [, id, sync] = m;
      if (sync) {
        if (c.method !== 'POST') return c.json(405, { error: 'POST only' });
        await c.body({ allowEmpty: true });
        const s = await sources.get(id);
        if (!s) throw new HttpError(404, 'unknown source');
        if (s.capability === 'calendar' && app.ctx.calendar) {
          const r = await app.ctx.calendar.start({ force: true });
          return r.started ? c.json(202, { job: r.job, capability: 'calendar' }) : c.json(409, { error: r.reason === 'running' ? 'An update is already running.' : 'Nothing to update.', job: r.job || null });
        }
        if (s.capability === 'email' && app.ctx.inbox) {
          const r = await app.ctx.inbox.start({ force: true });
          return r.started ? c.json(202, { job: r.job, capability: 'email' }) : c.json(409, { error: r.reason === 'running' ? 'An update is already running.' : 'Nothing to update.', job: r.job || null });
        }
        const r = startFinanceUpdate({ bank: s.kind !== 'csv' });
        if (r.error) throw new HttpError(400, r.error);
        return r.started ? c.json(202, { job: r.job, capability: 'bank' }) : c.json(409, { error: 'An update is already running.', job: r.job });
      }
      if (c.method === 'PUT' || c.method === 'PATCH') {
        const patch = await c.body();
        try { return { source: publicSource(await sources.update(id, patch || {})) }; }
        catch (e) { if (e.status) throw new HttpError(e.status, e.message); throw e; }
      }
      if (c.method === 'DELETE') {
        try { return await sources.remove(id); }
        catch (e) { if (e.status) throw new HttpError(e.status, e.message); throw e; }
      }
      if (c.method === 'GET') {
        const st = await sources.status({ discover: false });
        const s = st.sources.find(x => x.id === id);
        if (!s) throw new HttpError(404, 'unknown source');
        return { source: s };
      }
      return c.json(405, { error: 'GET, PUT or DELETE only' });
    },
  });

  // Discovery is cheap: warm the cache once the server is up so the page's first look is instant.
  // In the background (tracked: close() waits for it, it logs to the data folder).
  app.onReady?.(() => {
    const p = sources.discover().catch(() => {});
    if (typeof app.ctx.track === 'function') app.ctx.track(p);
  });
}

export { presetFor, maskUrl };

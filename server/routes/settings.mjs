// server/routes/settings.mjs - Settings > Data and Diagnostics, onboarding, demo data.
//
//   GET  /api/settings/info              -> {dataDir, financeDir, financeOutside, onboarding:{needed}, backups:n, version}
//   GET  /api/settings/backups           -> {backups:[{name, kind, at, size}]}
//   GET  /api/settings/backups/info?name=<n>  -> {name, tasks, people, savedAt}
//   POST /api/settings/backups/now       {} -> {name}
//   POST /api/settings/backups/restore   {name} -> {restored, tasks, version}   (current state kept as pre-restore-*)
//   GET  /api/settings/export-data       -> zip of the data folder (no logs, secrets, tokens, backups)
//   POST /api/settings/import-data[?dryRun=1]   body: the zip (Content-Type: application/zip)
//        -> dryRun: {files, tasks, people, hasConfig, financeFiles, savedAt}
//        -> otherwise the same plus {written, backup, version}; the data folder is backed up first
//   GET  /api/settings/export-app        -> a clean zip of the APP: no data/, logs, .env, secrets/
//   POST /api/settings/reset             {confirm:'RESET', includeFinance?} -> {backup}
//   GET  /api/settings/diagnostics       -> facts with paths/addresses scrubbed, plus .text for the clipboard
//   POST /api/demo/load                  {force?} -> counts; refused (409) when there are tasks already
//
// Downloads are GETs marked sameOrigin, so a link on another site cannot
// trigger them. Everything that writes is POST (same-origin, JSON or zip).

import { existsSync } from 'node:fs';
import { exportApp, exportData, inspectDataZip, importData, listBackups, backupInfo, restoreBackup, backupNow,
  resetData, diagnostics, diagnosticsText } from '../../lib/sharing.mjs';
import { isInside, readJson } from '../../lib/fsutil.mjs';
import { queueStats } from '../../lib/claude-runner.mjs';
import { financeAvailable } from '../../lib/finance.mjs';
import { writeFakeData } from '../../tools/make-fake-data.mjs';
import { HttpError } from '../http.mjs';

const IMPORT_MAX = 300 * 1024 * 1024;

export default function register(app) {
  const ctx = app.ctx;
  const { dataDir, store, log } = ctx;
  const paths = ctx.paths;

  const zipHeaders = (name) => ({ 'Content-Disposition': `attachment; filename="${name.replace(/[^A-Za-z0-9._-]/g, '_')}"` });

  async function onboardingNeeded() {
    const cfg = ctx.getConfig();
    if (cfg.onboardedAt) return false;
    const info = await store.info().catch(() => ({}));
    return !info.exists || info.taskCount === 0;
  }

  app.route({
    path: '/api/settings/info', method: 'GET',
    handler: async () => {
      const b = await listBackups(paths);
      return {
        dataDir: paths.root, financeDir: ctx.financeDir, financeOutside: !!(ctx.financeDir && !isInside(paths.root, ctx.financeDir)),
        onboarding: { needed: await onboardingNeeded() }, backups: b.length, version: ctx.version,
      };
    },
  });

  app.route({ path: '/api/settings/backups', method: 'GET', handler: async () => ({ backups: await listBackups(paths) }) });
  app.route({ path: '/api/settings/backups/info', method: 'GET', handler: async (c) => backupInfo(paths, c.query.get('name')) });
  app.route({
    path: '/api/settings/backups/now', method: 'POST', methodError: 'POST only',
    handler: async (c) => { await c.body({ allowEmpty: true }); return backupNow({ paths, store }); },
  });
  app.route({
    path: '/api/settings/backups/restore', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const { name } = await c.body();
      const r = await restoreBackup({ name, paths, store });
      log('note', 'state restored from a backup');
      return r;
    },
  });

  app.route({
    path: '/api/settings/export-data', method: 'GET', sameOrigin: true,
    handler: async (c) => {
      const z = exportData({ dataDir, financeDir: ctx.financeDir });
      log('note', `data export: ${z.files} files`);
      c.send(200, z.buffer, 'application/zip', zipHeaders(z.name));
    },
  });

  app.route({
    path: '/api/settings/import-data', method: 'POST', methodError: 'POST only', anyContentType: true, maxBody: IMPORT_MAX,
    handler: async (c) => {
      const type = String(c.req.headers['content-type'] || '');
      if (!/^application\/(zip|octet-stream|x-zip-compressed)\b/i.test(type)) throw new HttpError(415, 'send the zip with Content-Type: application/zip');
      const chunks = []; let size = 0;
      for await (const ch of c.req) { size += ch.length; if (size > IMPORT_MAX) throw new HttpError(413, 'the zip is too large'); chunks.push(ch); }
      const buffer = Buffer.concat(chunks);
      try {
        if (c.query.get('dryRun') === '1') return inspectDataZip(buffer);
        return await importData({ buffer, dataDir, financeDir: ctx.financeDir, store, setConfig: ctx.setConfig, log });
      } catch (e) {
        if (e.status) throw e;
        throw new HttpError(400, e.message || 'that file could not be imported');
      }
    },
  });

  app.route({
    path: '/api/settings/export-app', method: 'GET', sameOrigin: true,
    handler: async (c) => {
      const z = exportApp(ctx.repoRoot);
      log('note', `app export: ${z.files} files`);
      c.send(200, z.buffer, 'application/zip', zipHeaders(z.name));
    },
  });

  app.route({
    path: '/api/settings/reset', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (b.confirm !== 'RESET') throw new HttpError(400, "type RESET to confirm");
      return resetData({ dataDir, financeDir: ctx.financeDir, store, setConfig: ctx.setConfig, includeFinance: b.includeFinance === true, log });
    },
  });

  app.route({
    path: '/api/settings/diagnostics', method: 'GET',
    handler: async () => {
      const conns = ctx.connections ? await ctx.connections.list() : await readJson(paths.connections, { fallback: {} });
      const mig = await readJson(paths.migrations, { fallback: { applied: [] } });
      const d = await diagnostics({ dataDir, financeDir: ctx.financeDir, version: ctx.version, store, connections: conns, queue: queueStats(),
        migrations: mig.applied || [], financeAvailable: financeAvailable(), port: ctx.port });
      return { ...d, text: diagnosticsText(d) };
    },
  });

  app.route({
    path: '/api/demo/load', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body({ allowEmpty: true });
      const info = await store.info().catch(() => ({}));
      if (info.exists && info.taskCount > 0 && b.force !== true) throw new HttpError(409, 'Demo data can only be loaded into an empty dashboard.');
      const r = await writeFakeData(dataDir, {
        force: true, financeDir: ctx.financeDir, finance: true,       // a real finance pipeline is never replaced
        writeState: (next) => store.mutate(() => ({ next, result: true }), { source: 'script', client: 'demo data', summary: 'Loaded demo data' }),
        setConfig: ctx.setConfig,
      });
      log('note', `demo data loaded: ${r.tasks} tasks`);
      return r;
    },
  });
}

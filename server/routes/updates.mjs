// server/routes/updates.mjs - Settings > Updates: is there a newer OpenDash, and install it.
//
//   GET  /api/update/status    -> {current, kind:'git'|'zip', auto, checkedAt, error, latest?:{version,name,notes,publishedAt,url},
//                                  available, upToDate, canApply, reason}      (what was found last; no network)
//   POST /api/update/check     {} -> the same, after asking GitHub (at most one request every 10 s)
//   POST /api/update/settings  {auto: boolean} -> the same; auto = the page checks once a day
//   POST /api/update/apply     {version} -> 202 like /api/server/restart, plus {updated:{from,to,mode,...}};
//                                  the new files are in place first, then the server rebuilds and restarts
//
// Checking is a GET to the project's GitHub releases and nothing else is sent
// (lib/updater.mjs has the details). Applying needs the page itself or the
// local token, and a server that can restart itself (start-opendash / serve.mjs).
// One apply at a time; the version must be the one the last check found, and newer,
// and GitHub is asked again at apply time (the stored check file is never trusted alone).

import { HttpError } from '../http.mjs';
import { lifecycleAvailable, checkRestartAllowed } from '../lifecycle.mjs';
import { checkLatest, readUpdateState, writeUpdateState, describeState, compareVersions, installKind, applyZipUpdate, applyGitUpdate } from '../../lib/updater.mjs';

export default function register(app) {
  const ctx = app.ctx;
  const { dataDir, log } = ctx;
  let busy = false, lastCheckMs = 0;
  const gapMs = Number(process.env.DASHBOARD_UPDATE_CHECK_GAP_MS ?? 10000);

  const status = async () => describeState({
    state: await readUpdateState(dataDir), current: ctx.version, repoRoot: ctx.repoRoot, canRestart: lifecycleAvailable(),
  });

  app.route({ path: '/api/update/status', method: 'GET', sameOrigin: true, quiet: true, handler: () => status() });

  app.route({
    path: '/api/update/check', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      await c.body({ allowEmpty: true });
      if (busy) throw new HttpError(409, 'an update is being installed');
      const now = Date.now();
      if (now - lastCheckMs >= gapMs) {
        lastCheckMs = now;
        try {
          const latest = await checkLatest();
          await writeUpdateState(dataDir, { checkedAt: new Date().toISOString(), latest, error: null });
          log('note', `update check: latest is ${latest.version} (running ${ctx.version})`);
        } catch (e) {
          await writeUpdateState(dataDir, { checkedAt: new Date().toISOString(), error: e.message });
          log('note', `update check failed: ${e.message}`);
        }
      }
      return status();
    },
  });

  app.route({
    path: '/api/update/settings', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (typeof b.auto !== 'boolean') throw new HttpError(400, 'auto must be true or false');
      await writeUpdateState(dataDir, { auto: b.auto });
      return status();
    },
  });

  app.route({
    path: '/api/update/apply', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      await ctx.requireLocalCaller(c);
      const b = await c.body();
      if (typeof b.version !== 'string') throw new HttpError(400, 'version is required');
      if (!lifecycleAvailable()) throw new HttpError(501, 'updating needs OpenDash started with start-opendash or node serve.mjs, so it can restart itself');
      const ok = checkRestartAllowed();
      if (!ok.ok) throw new HttpError(ok.status, ok.message);
      if (busy) throw new HttpError(409, 'an update is already being installed');
      const state = await readUpdateState(dataDir);
      if (!state.latest || state.latest.version !== b.version) throw new HttpError(409, 'check for updates first: that is not the latest version found');
      busy = true;
      let updated;
      try {
        // update-check.json sits in the (possibly synced) data folder: ask GitHub again and
        // install only the release it names now, so a planted file cannot pick an old one.
        let release;
        try { release = await checkLatest(); }
        catch (e) { throw new HttpError(502, `Not updated: could not confirm the release with GitHub (${e.message}). Try again in a moment.`); }
        if (release.version !== b.version) {
          await writeUpdateState(dataDir, { checkedAt: new Date().toISOString(), latest: release, error: null }).catch(() => {});
          throw new HttpError(409, `GitHub now lists ${release.version} as the latest version: check for updates again.`);
        }
        if (compareVersions(release.version, ctx.version) !== 1) throw new HttpError(409, 'this version is already installed');
        log('note', `installing update ${ctx.version} -> ${release.version} (${installKind(ctx.repoRoot)})`);
        updated = installKind(ctx.repoRoot) === 'git'
          ? await applyGitUpdate({ repoRoot: ctx.repoRoot, release, current: ctx.version })
          : await applyZipUpdate({ repoRoot: ctx.repoRoot, dataDir, release, current: ctx.version });
      } catch (e) {
        if (e instanceof HttpError) throw e;
        log('error', `update failed: ${e.message}`);
        throw new HttpError(502, `Not updated: ${e.message}`);
      } finally { busy = false; }
      log('note', `update installed (${updated.mode}): ${updated.written ?? 'git'} files; restarting to rebuild`);
      return ctx.acceptLifecycle(c, 'restart', true, { updated });
    },
  });
}

// server/routes/autolink.mjs - auto-linking (lib/autolink.mjs, lib/workspace-index.mjs).
//
//   GET  /api/autolink/status               -> {settings, index, lastRun, lastAuto, runs, running, queued, nextRunAt, judgeCallsLastHour}
//   GET  /api/autolink/settings             -> settings (<data>/index/settings.json)
//   PUT  /api/autolink/settings  {...}      -> saved settings (validated; new folders start an index run)
//   GET  /api/autolink/folder-suggestions   -> {folders:[{path, why, container?, depth?}]} likely workspace folders (existing only)
//   POST /api/autolink/run  {taskId?, index?, forceIndex?, full?}  -> 202 {queued}
//        a task: candidates (+ the judge) for that task; otherwise the whole run:
//        index (incremental), candidates for every open task, judge, auto-attach
//
// The background service starts with the server once auto-linking is turned on
// (settings.enabled): at start, every intervalHours, and after task edits
// (debounced). Every change it makes goes through the actions layer with
// source 'autolink' (journalled, undoable). The page only (same-origin).
// Logs carry counts only, never a path or a title.

import { join } from 'node:path';
import { HttpError } from '../http.mjs';
import { readJson, writeJson } from '../../lib/fsutil.mjs';
import { runClaude } from '../../lib/claude-runner.mjs';
import { aiStatus } from '../../lib/ai.mjs';
import { createAutolinkService } from '../../lib/autolink.mjs';
import { loadSettings, saveSettings, suggestFolders } from '../../lib/workspace-index.mjs';
import { userServerDefs, sourcesFor } from '../../lib/sources.mjs';
import { githubOpenItems, GITHUB_SERVER } from '../../lib/resources.mjs';

const GH_TTL_MS = 6 * 3600 * 1000;

export default function register(app) {
  const ctx = app.ctx;
  const { dataDir, log, store } = ctx;
  if (!ctx.actions) throw new Error('autolink routes need the actions layer (server/routes/actions.mjs) first');
  const cacheFile = join(dataDir, 'resources', 'github-cache.json');

  /** Refresh the open PRs/issues of a repo (read-only GitHub tools, cached like Files & links). */
  async function githubHelper() {
    let st;
    try { st = await sourcesFor(ctx).status({ discover: 'cached' }); } catch { return null; }
    const servers = Array.isArray(st.servers) ? st.servers : [];
    const gh = servers.find(s => s.name === GITHUB_SERVER);
    if (!gh || gh.status !== 'ok' || !gh.usable) return null;
    const deny = servers.filter(s => s.kind === 'claude.ai').map(s => s.name);
    return {
      async refresh(owner, repo) {
        const key = `${owner}/${repo}`.toLowerCase();
        const doc = await readJson(cacheFile, { fallback: {} }).catch(() => ({}));
        const cur = doc && doc[key];
        if (cur && Date.now() - Date.parse(cur.fetchedAt) < GH_TTL_MS) return false;
        const defs = userServerDefs();
        const out = await githubOpenItems({ owner, repo, serverDef: Object.hasOwn(defs, GITHUB_SERVER) ? defs[GITHUB_SERVER] : null, denyServers: deny, run: ctx.resourcesRun });
        const next = await readJson(cacheFile, { fallback: {} }).catch(() => ({}));
        const obj = next && typeof next === 'object' && !Array.isArray(next) ? next : {};
        obj[key] = { owner: out.owner, repo: out.repo, pulls: out.pulls, issues: out.issues, fetchedAt: out.fetchedAt };
        await writeJson(cacheFile, obj).catch(() => {});
        return true;
      },
    };
  }

  const service = createAutolinkService({
    dataDir, actions: ctx.actions, store, log,
    // Looked up on each call, so tests can swap them on a running server (srv.ctx.autolinkRun = fake).
    run: (opts) => (ctx.autolinkRun || runClaude)(opts),
    judgeAvailable: async () => (ctx.autolinkJudgeAvailable ? ctx.autolinkJudgeAvailable() : (await aiStatus()).available),
    github: async () => (ctx.autolinkGithub === false ? null : githubHelper()),
    ...(ctx.autolinkTiming || {}),
  });
  ctx.autolink = service;

  app.onReady(() => { if (!ctx.autolinkNoBackground && process.env.DASHBOARD_AUTOLINK !== 'off') service.start(); });
  app.onClose(() => service.close());

  app.route({ path: '/api/autolink/status', method: 'GET', quiet: true, handler: async () => service.getStatus() });

  app.route({
    path: '/api/autolink/settings', method: ['GET', 'PUT'], methodError: 'GET or PUT only',
    handler: async (c) => {
      if (c.method === 'GET') return loadSettings(dataDir);
      const b = await c.body();
      if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'expected a JSON object');
      const cur = await loadSettings(dataDir);
      const next = { ...cur, ...b, judge: { ...cur.judge, ...(b.judge && typeof b.judge === 'object' ? b.judge : {}) } };
      const saved = await saveSettings(dataDir, next);
      const before = JSON.stringify(cur.folders) + JSON.stringify(cur.namesOnly);
      const after = JSON.stringify(saved.folders) + JSON.stringify(saved.namesOnly);
      if (before !== after && saved.folders.length) service.request({ index: true, trigger: 'settings' });
      log('note', `autolink: settings saved (${saved.folders.length} folders, ${saved.enabled ? 'on' : 'off'})`);
      return saved;
    },
  });

  app.route({
    path: '/api/autolink/folder-suggestions', method: 'GET',
    handler: async () => {
      const cur = await loadSettings(dataDir);
      const have = new Set(cur.folders.map(f => f.path.toLowerCase()));
      const folders = (await suggestFolders()).filter(f => !have.has(f.path.toLowerCase()));
      return { folders };
    },
  });

  app.route({
    path: '/api/autolink/run', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body({ allowEmpty: true }) || {};
      if (typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'expected a JSON object');
      const taskId = typeof b.taskId === 'string' && /^[A-Za-z0-9_.:-]{1,160}$/.test(b.taskId) ? b.taskId : null;
      const spec = taskId ? { taskIds: [taskId], trigger: 'task' }
        : b.index && !b.full ? { index: true, forceIndex: !!b.forceIndex, trigger: 'manual' }
          : { full: true, forceIndex: !!b.forceIndex, trigger: 'manual' };
      const r = service.request(spec);
      return c.json(202, { queued: r.queued, ...(taskId ? { taskId } : {}) });
    },
  });

  app.route({ prefix: '/api/autolink/', method: '*', handler: (c) => c.json(404, { error: 'unknown autolink route' }) });
}

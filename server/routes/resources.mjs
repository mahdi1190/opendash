// server/routes/resources.mjs - Files & links: the things only the server can
// do for a resource the user saved (state.resources, see
// server/actions/ops-resources.mjs and src/app/63-resources.js).
//
//   POST /api/resources/open      {id, sub?, action?: 'open'|'reveal'}
//        -> {ok, opened: 'folder'|'file', action}
//        Opens a STORED resource's path with the OS (explorer.exe / open /
//        xdg-open, argument array, never a shell), after checking it exists.
//        `sub` (Explore panel) is a path RELATIVE to a stored folder, checked to
//        stay inside it (no '..', no symlink or junction leading out). A raw
//        path from the page is refused; links open in the browser, not here;
//        programs (.exe, .bat, .lnk ...; on macOS also bundles such as Foo.app) are
//        never opened, only revealed (lib/resources.mjs mayOpenPath: the saved name
//        and the real one, so a short name or a link cannot stand for a program).
//   POST /api/resources/status    {ids:[...]} -> {items:{id:{exists, dir, size, mtime}}}  (stored local paths only)
//   GET  /api/resources/browse?id=<folder resource id>&sub=<relative path>
//        -> {id, label, sub, crumbs, entries:[{name, sub, dir, size, mtime, type, ext}], total, truncated, hiddenOutside}
//   POST /api/resources/pick      {mode:'file'|'folder', multi?} -> {paths:[...], kind} | {cancelled:true}
//        Windows: a native picker (PowerShell, System.Windows.Forms, STA, 5 min timeout).
//        Elsewhere 501 {code:'NO_PICKER'}: the page asks for a pasted path instead.
//   GET  /api/resources/integrations -> {github:{state, usable}, drive:{state, usable}, picker}
//   POST /api/resources/github    {id, refresh?} -> {owner, repo, pulls, issues, fetchedAt, cached}
//        open PRs and issues of a linked repo, read-only (the user's 'github' MCP
//        server, list/search tools only, through lib/claude-runner.mjs), cached 30 min
//   POST /api/resources/drive-search {q} -> {files:[{title, url, mimeType, modifiedTime}]}
//        read-only Google Drive search (claude.ai Google Drive connector)
//
// The page only (same-origin; the router refuses other origins with 403).
// Logs carry the action and the kind, never a path, a URL or a file name.

import { join } from 'node:path';
import { HttpError } from '../http.mjs';
import { readJson, writeJson } from '../../lib/fsutil.mjs';
import { userServerDefs, sourcesFor } from '../../lib/sources.mjs';
import { ClaudeError } from '../../lib/claude-runner.mjs';
import {
  ResourceError, resourcesOf, statTarget, openCommand, launch, resolveInside, listFolder, runPicker, mayOpenPath,
  rsrcIsLocalPath, rsrcGithub, githubOpenItems, GITHUB_SERVER, DRIVE_SERVER, driveSearch, RSRC_PATH_KINDS,
} from '../../lib/resources.mjs';

const ID_RE = /^[A-Za-z0-9_.:-]{1,160}$/;
const GITHUB_TTL_MS = 30 * 60 * 1000;

export default function register(app) {
  const { dataDir, log, store } = app.ctx;
  const platform = app.ctx.resourcesPlatform || process.platform;
  const cacheFile = join(dataDir, 'resources', 'github-cache.json');
  let picking = false;
  const ghInflight = new Map();
  let driveTools = null;

  async function stored(id) {
    if (typeof id !== 'string' || !ID_RE.test(id)) throw new ResourceError('UNKNOWN_ID', 'unknown resource', 404);
    const s = await store.readObject();
    const r = resourcesOf(s).find(x => x.id === id);
    if (!r) throw new ResourceError('UNKNOWN_ID', 'unknown resource', 404);
    return r;
  }
  /** Only these fields; a path or URL from the page is never used. */
  async function body(c, allowed) {
    const b = await c.body({ allowEmpty: true }) || {};
    if (typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'expected a JSON object');
    if ('path' in b || 'target' in b || 'url' in b) throw new ResourceError('ID_ONLY', 'send the id of a saved resource, not a path', 400);
    for (const k of Object.keys(b)) if (!allowed.includes(k)) throw new HttpError(400, `unknown field '${String(k).slice(0, 30)}'`);
    return b;
  }
  const fail = (e) => {
    if (e instanceof ResourceError) throw new HttpError(e.status, e.message, { code: e.code });
    throw e;
  };

  app.route({
    path: '/api/resources/open', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      try {
        const b = await body(c, ['id', 'sub', 'action']);
        const action = b.action == null ? 'open' : String(b.action);
        if (!['open', 'reveal'].includes(action)) throw new ResourceError('BAD_REQUEST', "action must be 'open' or 'reveal'", 400);
        const r = await stored(b.id);
        if (!RSRC_PATH_KINDS.includes(r.kind)) throw new ResourceError('USE_BROWSER', r.kind === 'snippet' ? 'a snippet has nothing to open' : 'links open in the browser', 400);
        if (!rsrcIsLocalPath(r.target)) throw new ResourceError('BAD_TARGET', 'not a local path', 400);
        let target = r.target, isDir, real;
        if (b.sub != null && b.sub !== '') {
          if (r.kind !== 'folder') throw new ResourceError('NOT_A_FOLDER', 'sub only works inside a folder', 400);
          const inside = await resolveInside(r, String(b.sub), { platform });
          target = inside.full; isDir = inside.st.isDirectory(); real = inside.real;
        } else {
          const st = await statTarget(target);
          if (!st.exists) throw new ResourceError('MISSING', 'it is not on this computer any more (moved or renamed?)', 404);
          isDir = st.dir;
        }
        // The saved name and the real one (a short name or a link can stand for a program).
        if (action === 'open' && !(await mayOpenPath(target, { isDir, platform, real }))) throw new ResourceError('PROGRAM', 'programs and shortcuts are not opened from the dashboard: use Reveal', 400);
        await launch(openCommand(platform, action, target, { isDir }));
        log('note', `resources: ${action} ${isDir ? 'folder' : 'file'}${b.sub ? ' (inside a folder)' : ''}`);
        return { ok: true, opened: isDir ? 'folder' : 'file', action };
      } catch (e) { fail(e); }
    },
  });

  app.route({
    path: '/api/resources/status', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      try {
        const b = await body(c, ['ids']);
        const ids = Array.isArray(b.ids) ? b.ids.filter(x => typeof x === 'string' && ID_RE.test(x)).slice(0, 300) : [];
        const s = await store.readObject();
        const byId = new Map(resourcesOf(s).map(r => [r.id, r]));
        const items = {};
        await Promise.all(ids.map(async (id) => {
          const r = byId.get(id);
          if (!r || !RSRC_PATH_KINDS.includes(r.kind)) return;
          const st = await statTarget(r.target);
          items[id] = { exists: !!st.exists, dir: !!st.dir, ...(st.size != null ? { size: st.size } : {}), ...(st.mtime ? { mtime: Math.round(st.mtime) } : {}) };
        }));
        return { items };
      } catch (e) { fail(e); }
    },
  });

  app.route({
    path: '/api/resources/browse', method: 'GET', sameOrigin: true,
    handler: async (c) => {
      try {
        const r = await stored(c.query.get('id'));
        if (r.kind !== 'folder') throw new ResourceError('NOT_A_FOLDER', 'only a folder can be explored', 400);
        const out = await listFolder(r, c.query.get('sub') || '', { platform });
        log('info', `resources: browse ${out.shown} of ${out.total} entries`);
        return out;
      } catch (e) { fail(e); }
    },
  });

  app.route({
    path: '/api/resources/pick', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      try {
        const b = await body(c, ['mode', 'multi']);
        if (picking) throw new ResourceError('BUSY', 'a picker is already open (look behind the browser window)', 409);
        picking = true;
        try {
          const out = await runPicker({ mode: b.mode === 'folder' ? 'folder' : 'file', multi: b.multi === true, platform, spawnFn: app.ctx.resourcesSpawn });
          log('note', `resources: picker ${out.cancelled ? 'cancelled' : `chose ${out.paths.length}`}`);
          return out;
        } finally { picking = false; }
      } catch (e) { fail(e); }
    },
  });

  /** {state:'ok'|'auth'|'error'|'setup'|'unknown', usable} of one MCP server from `claude mcp list` (cached). */
  async function serverState(name) {
    let st;
    try { st = await sourcesFor(app.ctx).status({ discover: 'cached' }); } catch { return { state: 'unknown', usable: false, servers: [] }; }
    const servers = Array.isArray(st.servers) ? st.servers : null;
    if (!servers) return { state: 'unknown', usable: false, servers: [] };
    const s = servers.find(x => x.name === name);
    if (!s) return { state: 'setup', usable: false, servers };
    return { state: s.status === 'ok' ? 'ok' : s.status === 'auth' ? 'auth' : s.status === 'pending' ? 'unknown' : 'error', usable: !!s.usable, servers };
  }

  app.route({
    path: '/api/resources/integrations', method: 'GET',
    handler: async () => {
      const [gh, dr] = await Promise.all([serverState(GITHUB_SERVER), serverState(DRIVE_SERVER)]);
      return {
        github: { state: gh.state, usable: gh.usable, server: GITHUB_SERVER },
        drive: { state: dr.state, usable: dr.usable, server: DRIVE_SERVER },
        picker: platform === 'win32',
      };
    },
  });

  app.route({
    path: '/api/resources/github', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      try {
        const b = await body(c, ['id', 'refresh']);
        const r = await stored(b.id);
        const g = r.kind === 'github' ? rsrcGithub(r.target) : null;
        if (!g) throw new ResourceError('NOT_GITHUB', 'that resource is not a GitHub link', 400);
        const key = `${g.owner}/${g.repo}`.toLowerCase();
        const cache = await readJson(cacheFile, { fallback: {} }).catch(() => ({}));
        const hit = cache && cache[key];
        if (hit && !b.refresh && Date.now() - Date.parse(hit.fetchedAt) < GITHUB_TTL_MS) return { ...hit, cached: true };
        const st = await serverState(GITHUB_SERVER);
        if (st.state !== 'ok' || !st.usable) {
          throw new ResourceError('NOT_CONNECTED', st.state === 'auth' ? 'GitHub needs signing in again (claude, then /mcp)' : 'connect the GitHub MCP server first (Connections)', 409);
        }
        if (!ghInflight.has(key)) {
          const defs = userServerDefs();
          const deny = st.servers.filter(s => s.kind === 'claude.ai').map(s => s.name);
          ghInflight.set(key, githubOpenItems({ owner: g.owner, repo: g.repo, serverDef: Object.hasOwn(defs, GITHUB_SERVER) ? defs[GITHUB_SERVER] : null, denyServers: deny, run: app.ctx.resourcesRun })
            .finally(() => ghInflight.delete(key)));
        }
        const out = await ghInflight.get(key);
        const doc = await readJson(cacheFile, { fallback: {} }).catch(() => ({}));
        const next = doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : {};
        next[key] = { owner: out.owner, repo: out.repo, pulls: out.pulls, issues: out.issues, fetchedAt: out.fetchedAt };
        for (const k of Object.keys(next).sort((a, z) => Date.parse(next[z].fetchedAt) - Date.parse(next[a].fetchedAt)).slice(40)) delete next[k];
        await writeJson(cacheFile, next).catch(() => {});
        log('note', `resources: github ${out.pulls.length} PRs, ${out.issues.length} issues${out.dropped ? `, ${out.dropped} dropped` : ''}`);
        return { ...next[key], cached: false };
      } catch (e) {
        if (e instanceof ClaudeError) throw e;
        fail(e);
      }
    },
  });

  app.route({
    path: '/api/resources/drive-search', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      try {
        const b = await body(c, ['q']);
        const st = await serverState(DRIVE_SERVER);
        if (st.state !== 'ok') throw new ResourceError('NOT_CONNECTED', st.state === 'auth' ? 'Google Drive needs signing in again (claude.ai > Settings > Connectors)' : 'connect Google Drive first (Connections)', 409);
        if (!driveTools) driveTools = (await sourcesFor(app.ctx).listTools(DRIVE_SERVER)).tools.map(t => t.name);
        const deny = st.servers.filter(s => s.kind === 'claude.ai' && s.name !== DRIVE_SERVER).map(s => s.name);
        const out = await driveSearch({ query: String(b.q || ''), tools: driveTools, denyServers: deny, run: app.ctx.resourcesRun });
        log('note', `resources: drive search ${out.files.length} files`);
        return out;
      } catch (e) {
        if (e instanceof ClaudeError) throw e;
        fail(e);
      }
    },
  });

  app.route({ prefix: '/api/resources/', method: '*', handler: (c) => c.json(404, { error: 'unknown resources route' }) });
}

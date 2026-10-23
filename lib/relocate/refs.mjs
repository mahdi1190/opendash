// lib/relocate/refs.mjs - the things OUTSIDE the data folder that point at it
// (or at the app folder), found read-only, re-pointed after a move and put
// back by "Undo move".
//
//   discoverRefs(ctx) -> [ref]        read-only: what a move would change (the dry run lists all of it)
//   applyRef(ref, ad) -> ref          re-point one (only if it is still as it was when found)
//   undoRef(ref, ad)  -> ref          put one back (only if it is still as the move left it)
//
// ctx: {mappings: [{from, to}], from: {data, app}, to: {data, app}, platform, env, home, adapters}
//
// A ref is plain data (it is saved in this computer's move record, so a crash
// half-way can be finished or undone): {id, kind, label, where, how, before,
// after, changes: [{what, before, after}], status?, error?}.
//   how  'auto'    OpenDash changes it
//        'manual'  OpenDash cannot (a program it needs is missing): `manual` says what to do
//        'info'    nothing to change, listed so nothing is a surprise
//
// KINDS and how they are changed (ADAPTERS, so tests never touch this computer):
//   registry      Windows start-up entries: HKCU ...\Run "personal-dashboard", the
//                 dashboard-start:// handler (lib/os-integration.mjs), the user
//                 variable DASHBOARD_DATA_DIR.             adapters.registry {query, set}
//   claude-code   Claude Code's MCP entries (~/.claude.json: user scope, and local
//                 scope per project). Changed with `claude mcp remove` + `claude mcp
//                 add`, never by editing the file: Claude Code writes its own config.
//                                                          adapters.cli {which, run}
//   desktop-json  Claude Desktop's claude_desktop_config.json (classic and Store
//                 app). A plain settings file the user edits by hand: edited here
//                 the same way, only our own entries, written atomically.
//   codex         Codex (~/.codex/config.toml), with `codex mcp remove/add`. The entry
//                 name carries a hash of the data folder (lib/assistant-connections.mjs),
//                 so it is re-added under the new folder's name.
//   gemini        Gemini CLI (~/.gemini/settings.json), with `gemini mcp remove/add`.
//   text          Claude scheduled-task skills and similar text files that name the
//                 old folder (and macOS LaunchAgents, Linux autostart entries): the
//                 folder's path replaced, nothing else.
//   shortcut      Windows .lnk shortcuts (Desktop, Start menu, Startup) to the app's
//                 launcher.                                adapters.shortcuts {read, write}
//   copy-dir      this computer's sync identity (lib/sync/node-host.mjs keeps it per
//                 data-folder path): copied for the new path, the old one kept.
//
// Node stdlib only.

import { existsSync, readFileSync, readdirSync, statSync, promises as fsp } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { mapPath, mapText, isUnder, samePath, repointCommand } from './paths.mjs';
import { copyTree } from './copy.mjs';

export const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
export const RUN_VALUE = 'personal-dashboard';
export const PROTO_CMD_KEY = 'HKCU\\Software\\Classes\\dashboard-start\\shell\\open\\command';
export const ENV_KEY = 'HKCU\\Environment';

const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const readText = (f) => { const t = readFileSync(f, 'utf8'); return t; };
const parseJson = (t) => JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
function readJsonFile(f) { try { return existsSync(f) ? parseJson(readText(f)) : null; } catch { return undefined; } }   // undefined: unreadable
async function atomicText(file, text) {
  const tmp = join(dirname(file), `.${basename(file)}.odmove-${process.pid}-${randomBytes(4).toString('hex')}`);
  await fsp.writeFile(tmp, text, 'utf8');
  try { await fsp.rename(tmp, file); } catch (e) { await fsp.unlink(tmp).catch(() => {}); throw e; }
}

// ─── MCP server definitions ───────────────────────────────────────────────
/** {command, args, env} with defaults, for comparing two definitions. */
export function normDef(d) {
  if (!isObj(d)) return null;
  const env = isObj(d.env) ? Object.fromEntries(Object.entries(d.env).map(([k, v]) => [k, String(v)]).sort(([a], [b]) => (a < b ? -1 : 1))) : {};
  return { command: String(d.command || ''), args: Array.isArray(d.args) ? d.args.map(String) : [], env };
}
export const sameDef = (a, b) => JSON.stringify(normDef(a)) === JSON.stringify(normDef(b));
function mapArg(s, mappings, platform) {
  const m = mapPath(s, mappings, platform);
  if (m !== s) return m;
  const eq = /^(--?[A-Za-z][\w-]*=)(.+)$/.exec(s);
  return eq ? eq[1] + mapPath(eq[2], mappings, platform) : s;
}
/** The definition re-pointed (command, every argument, every env value). */
export function mapDef(d, mappings, platform) {
  const n = normDef(d);
  return { command: mapArg(n.command, mappings, platform), args: n.args.map(a => mapArg(a, mappings, platform)), env: Object.fromEntries(Object.entries(n.env).map(([k, v]) => [k, mapArg(v, mappings, platform)])) };
}
function defChanges(a, b) {
  const x = normDef(a), y = normDef(b), out = [];
  if (x.command !== y.command) out.push({ what: 'program', before: x.command, after: y.command });
  const n = Math.max(x.args.length, y.args.length);
  for (let i = 0; i < n; i++) if (x.args[i] !== y.args[i]) out.push({ what: x.args[i - 1] && /^--/.test(x.args[i - 1]) ? x.args[i - 1] : `argument ${i + 1}`, before: x.args[i] ?? '', after: y.args[i] ?? '' });
  for (const k of new Set([...Object.keys(x.env), ...Object.keys(y.env)])) if (x.env[k] !== y.env[k]) out.push({ what: `env ${k}`, before: x.env[k] ?? '', after: y.env[k] ?? '' });
  return out;
}
const opendashName = (dataDir) => 'opendash-' + createHash('sha256').update(dataDir).digest('hex').slice(0, 10);
const shq = (s) => (/^[\w./:=@\\-]+$/.test(s) ? s : `"${String(s).replace(/"/g, '\\"')}"`);

// Claude Code
export function claudeConfigFile({ env = {}, home }) { return join(env.CLAUDE_CONFIG_DIR || home, '.claude.json'); }
function claudeEntry(cfg, scope, project, name) {
  if (!isObj(cfg)) return null;
  if (scope === 'user') return isObj(cfg.mcpServers) && isObj(cfg.mcpServers[name]) ? cfg.mcpServers[name] : null;
  const p = isObj(cfg.projects) ? cfg.projects[project] : null;
  return p && isObj(p.mcpServers) && isObj(p.mcpServers[name]) ? p.mcpServers[name] : null;
}
const claudeAddArgs = (scope, name, def) => {
  const d = normDef(def);
  return ['mcp', 'add', '--scope', scope, name, ...Object.entries(d.env).flatMap(([k, v]) => ['-e', `${k}=${v}`]), '--', d.command, ...d.args];
};

// Codex: [mcp_servers.<name>] blocks with command = "..." / '...' and args = [...]
function tomlStrings(s) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1] !== undefined ? JSON.parse(`"${m[1]}"`) : m[2]);
  return out;
}
export function parseCodexServers(text) {
  const out = [];
  const re = /^\[mcp_servers\.([A-Za-z0-9_-]+)\]\s*$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(text))) heads.push({ name: m[1], start: m.index, bodyStart: m.index + m[0].length });
  for (let i = 0; i < heads.length; i++) {
    const end = (() => { const r = /^\[/gm; r.lastIndex = heads[i].bodyStart; const x = r.exec(text); return x ? x.index : text.length; })();
    const body = text.slice(heads[i].bodyStart, end);
    const cmd = /^command\s*=\s*(.+)$/m.exec(body);
    const args = /^args\s*=\s*(\[[\s\S]*?\])/m.exec(body);
    const unknown = body.split(/\r?\n/).some(l => l.trim() && !/^(command|args)\s*=/.test(l.trim()) && !/^#/.test(l.trim()) && !/^['"\],]/.test(l.trim()));
    let def = null;
    try { def = { command: cmd ? tomlStrings(cmd[1])[0] || '' : '', args: args ? tomlStrings(args[1]) : [], env: {} }; } catch { def = null; }
    out.push({ name: heads[i].name, def, plain: !!def && !unknown && !text.includes(`[mcp_servers.${heads[i].name}.`) });
  }
  return out;
}

// ─── Discovery ────────────────────────────────────────────────────────────
function walkFiles(root, { depth = 2, exts, max = 400 } = {}) {
  const out = [];
  const go = (dir, d) => {
    let ents;
    try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (out.length >= max) return;
      const p = join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { if (d > 0 && !/^(node_modules|\.git|projects|todos|shell-snapshots|statsig|ide|cache|caches|logs)$/i.test(e.name)) go(p, d - 1); }
      else if (e.isFile() && (!exts || exts.includes(extname(e.name).toLowerCase()))) out.push(p);
    }
  };
  go(root, depth);
  return out;
}

/** The text files that may name the folders: scheduled-task skills, start-up entries. */
export function textRoots({ platform, env = {}, home }) {
  const od = env.OneDrive || env.OneDriveConsumer || join(home, 'OneDrive');
  const roots = [
    { dir: join(od, 'Documents', 'Claude', 'Scheduled'), depth: 2, label: 'Claude scheduled task' },
    { dir: join(home, 'Documents', 'Claude', 'Scheduled'), depth: 2, label: 'Claude scheduled task' },
    { dir: join(home, '.claude', 'scheduled-tasks'), depth: 2, label: 'Claude scheduled task' },
    { dir: join(home, '.claude', 'skills'), depth: 3, label: 'Claude skill' },
    { dir: join(home, '.claude', 'commands'), depth: 2, label: 'Claude command' },
    { dir: join(home, '.claude', 'agents'), depth: 2, label: 'Claude agent' },
  ];
  if (platform === 'win32') roots.push({ dir: join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'), depth: 0, label: 'Windows start-up script', exts: ['.bat', '.cmd', '.ps1', '.vbs'] });
  if (platform === 'darwin') roots.push({ dir: join(home, 'Library', 'LaunchAgents'), depth: 0, label: 'macOS login item', exts: ['.plist'] });
  if (platform !== 'win32' && platform !== 'darwin') {
    roots.push({ dir: join(env.XDG_CONFIG_HOME || join(home, '.config'), 'autostart'), depth: 0, label: 'Linux autostart entry', exts: ['.desktop'] });
    roots.push({ dir: join(env.XDG_CONFIG_HOME || join(home, '.config'), 'systemd', 'user'), depth: 0, label: 'Linux user service', exts: ['.service'] });
  }
  return roots;
}
const TEXT_EXTS = ['.md', '.txt', '.json', '.bat', '.cmd', '.ps1', '.sh', '.plist', '.desktop', '.service', '.toml', '.yaml', '.yml'];

/** Claude Desktop's config files: the classic install and the Microsoft Store app. */
export function desktopConfigFiles({ platform, env = {}, home }) {
  if (platform === 'darwin') return [join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')];
  if (platform !== 'win32') return [join(env.XDG_CONFIG_HOME || join(home, '.config'), 'Claude', 'claude_desktop_config.json')];
  const out = [join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')];
  const pk = join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'Packages');
  try { for (const n of readdirSync(pk)) if (/^Claude_/i.test(n)) out.push(join(pk, n, 'LocalCache', 'Roaming', 'Claude', 'claude_desktop_config.json')); } catch { /* no Store apps */ }
  return out;
}

/** Where Windows shortcuts to the app may be. */
export function shortcutRoots({ env = {}, home }) {
  const od = env.OneDrive || env.OneDriveConsumer;
  return [
    join(home, 'Desktop'), ...(od ? [join(od, 'Desktop')] : []), ...(env.PUBLIC ? [join(env.PUBLIC, 'Desktop')] : []),
    join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ];
}

/**
 * Every reference to re-point, read-only. ctx: {mappings, from, to, platform,
 * env, home, adapters: {registry?, cli?, shortcuts?, syncLocalDir?}}.
 */
export async function discoverRefs(ctx) {
  const { mappings, from, to, platform, env = {}, home, adapters = {} } = ctx;
  const refs = [];
  const add = (r) => { refs.push({ status: 'planned', ...r }); };
  const appOld = from.app, appNew = to.app || from.app;
  const newDefault = appNew ? join(appNew, 'data') : null;

  // 1. Windows start-up entries
  if (platform === 'win32' && adapters.registry) {
    const cmdRefs = [
      { id: 'os:autostart', key: RUN_KEY, name: RUN_VALUE, label: 'Start OpenDash when I log in (Windows)', where: `${RUN_KEY}  ${RUN_VALUE}` },
      { id: 'os:protocol', key: PROTO_CMD_KEY, name: '', label: 'The "Start server" button (dashboard-start://)', where: PROTO_CMD_KEY },
    ];
    for (const c of cmdRefs) {
      const q = await adapters.registry.query(c.key, c.name);
      if (!q || !q.data) continue;
      const launcher = /"([^"]*start-hidden\.mjs)"/i.exec(q.data);
      if (launcher && appOld && !isUnder(launcher[1], appOld, platform)) continue;     // another OpenDash copy's entry
      const after = repointCommand(q.data, mappings, { dataDir: to.data, defaultDataDir: newDefault, platform });
      if (after === q.data) continue;
      add({ ...c, kind: 'registry', type: q.type || 'REG_SZ', how: 'auto', before: q.data, after, changes: [{ what: 'command', before: q.data, after }] });
    }
    const e = await adapters.registry.query(ENV_KEY, 'DASHBOARD_DATA_DIR');
    if (e && e.data) {
      const after = mapPath(e.data, mappings, platform);
      if (after !== e.data) add({ id: 'os:env', kind: 'registry', key: ENV_KEY, name: 'DASHBOARD_DATA_DIR', type: e.type || 'REG_SZ', label: 'The DASHBOARD_DATA_DIR setting for your user', where: `${ENV_KEY}  DASHBOARD_DATA_DIR`, how: 'auto', before: e.data, after, changes: [{ what: 'value', before: e.data, after }] });
    }
  }

  // 2. Claude Code
  const ccFile = claudeConfigFile({ env, home });
  const cc = readJsonFile(ccFile);
  const claudeCli = adapters.cli ? await adapters.cli.which('claude') : null;
  if (cc === undefined) add({ id: 'mcp:claude-code:unreadable', kind: 'info', how: 'info', label: 'Claude Code settings', where: ccFile, detail: 'This file could not be read, so it was not checked.' });
  else if (cc) {
    const blocks = [{ scope: 'user', project: null, servers: cc.mcpServers }];
    if (isObj(cc.projects)) for (const [p, v] of Object.entries(cc.projects)) if (isObj(v) && isObj(v.mcpServers)) blocks.push({ scope: 'local', project: p, servers: v.mcpServers });
    for (const b of blocks) {
      for (const [name, def] of Object.entries(isObj(b.servers) ? b.servers : {})) {
        if (!isObj(def) || (def.type && def.type !== 'stdio') || !def.command) continue;
        const after = mapDef(def, mappings, platform);
        if (sameDef(def, after)) continue;
        const cwd = b.project || null;
        const scopeText = b.scope === 'user' ? 'for your user' : `for the project ${b.project}`;
        const manual = `claude mcp remove ${shq(name)} --scope ${b.scope}\nclaude ${claudeAddArgs(b.scope, name, after).map(shq).join(' ')}`;
        const projectMoves = cwd && appOld && isUnder(cwd, appOld, platform) && to.app;
        add({
          id: `mcp:claude-code:${b.scope}:${b.project || ''}:${name}`, kind: 'claude-code', file: ccFile, scope: b.scope, project: b.project, cwd, name,
          label: `Claude Code: the "${name}" MCP server (${scopeText})`, where: ccFile,
          how: claudeCli && !projectMoves ? 'auto' : 'manual', manual: projectMoves ? `This entry belongs to the old app folder as a project. In the new folder run:\n${manual}` : `Run in a terminal:\n${manual}`,
          before: normDef(def), after, changes: defChanges(def, after),
        });
      }
    }
    if (to.app && appOld && isObj(cc.projects) && Object.keys(cc.projects).some(p => samePath(p, appOld, platform))) {
      add({ id: 'info:claude-code-project', kind: 'info', how: 'info', label: 'Claude Code remembers the old app folder as a project', where: ccFile, detail: 'Its history and trust choice stay with the old path. When you open Claude Code in the new folder it asks once whether to trust it.' });
    }
  }

  // 3. Claude Desktop
  for (const f of desktopConfigFiles({ platform, env, home })) {
    const j = readJsonFile(f);
    if (!j || !isObj(j.mcpServers)) continue;
    for (const [name, def] of Object.entries(j.mcpServers)) {
      if (!isObj(def) || !def.command) continue;
      const after = mapDef(def, mappings, platform);
      if (sameDef(def, after)) continue;
      add({ id: `mcp:desktop:${f}:${name}`, kind: 'desktop-json', file: f, name, label: `Claude Desktop: the "${name}" MCP server`, where: f, how: 'auto', before: normDef(def), after, changes: defChanges(def, after) });
    }
  }

  // 4. Codex
  const cxFile = join(env.CODEX_HOME || join(home, '.codex'), 'config.toml');
  if (existsSync(cxFile)) {
    let text = '';
    try { text = readText(cxFile); } catch { text = ''; }
    const codexCli = adapters.cli ? await adapters.cli.which('codex') : null;
    for (const s of parseCodexServers(text)) {
      if (!s.def) continue;
      const after = mapDef(s.def, mappings, platform);
      if (sameDef(s.def, after)) continue;
      const newName = from.data && s.name === opendashName(from.data) && to.data ? opendashName(to.data) : s.name;
      const manual = `codex mcp remove ${s.name}\ncodex mcp add ${newName} -- ${[after.command, ...after.args].map(shq).join(' ')}`;
      add({
        id: `mcp:codex:${s.name}`, kind: 'codex', file: cxFile, label: `Codex: the "${s.name}" MCP server`, where: cxFile,
        how: codexCli && s.plain ? 'auto' : 'manual', manual: `Run in a terminal:\n${manual}`,
        before: { name: s.name, def: normDef(s.def) }, after: { name: newName, def: after },
        changes: [...(newName !== s.name ? [{ what: 'name', before: s.name, after: newName }] : []), ...defChanges(s.def, after)],
      });
    }
  }

  // 5. Gemini CLI
  const gmFile = join(home, '.gemini', 'settings.json');
  const gm = readJsonFile(gmFile);
  if (gm && isObj(gm.mcpServers)) {
    const geminiCli = adapters.cli ? await adapters.cli.which('gemini') : null;
    for (const [name, def] of Object.entries(gm.mcpServers)) {
      if (!isObj(def) || !def.command) continue;
      const after = mapDef(def, mappings, platform);
      if (sameDef(def, after)) continue;
      const newName = from.data && name === opendashName(from.data) && to.data ? opendashName(to.data) : name;
      add({
        id: `mcp:gemini:${name}`, kind: 'gemini', file: gmFile, label: `Gemini CLI: the "${name}" MCP server`, where: gmFile,
        how: geminiCli ? 'auto' : 'manual', manual: `Run in a terminal:\ngemini mcp remove --scope user ${name}\ngemini mcp add --scope user --transport stdio ${newName} ${[after.command, ...after.args].map(shq).join(' ')}`,
        before: { name, def: normDef(def) }, after: { name: newName, def: after }, changes: [...(newName !== name ? [{ what: 'name', before: name, after: newName }] : []), ...defChanges(def, after)],
      });
    }
  }

  // 6. Text files (scheduled-task skills, start-up scripts)
  for (const r of textRoots({ platform, env, home })) {
    for (const f of walkFiles(r.dir, { depth: r.depth, exts: r.exts || TEXT_EXTS })) {
      let st; try { st = statSync(f); } catch { continue; }
      if (st.size > 1024 * 1024) continue;
      let text; try { text = readText(f); } catch { continue; }
      if (text.slice(0, 4000).includes('\u0000')) continue;
      const m = mapText(text, mappings, platform);
      if (m.count) {
        const lines = text.split(/\r?\n/), after = m.text.split(/\r?\n/);
        const changes = [];
        for (let i = 0; i < lines.length && changes.length < 8; i++) if (lines[i] !== after[i]) changes.push({ what: `line ${i + 1}`, before: lines[i].trim().slice(0, 240), after: after[i].trim().slice(0, 240) });
        add({ id: `text:${f}`, kind: 'text', file: f, label: `${r.label}: ${basename(dirname(f))}/${basename(f)}`, where: f, how: 'auto', count: m.count, before: text, after: m.text, beforeHash: sha(text), afterHash: sha(m.text), changes });
      } else if (/dashboard-state\.json/i.test(text)) {
        add({ id: `info:text:${f}`, kind: 'info', how: 'info', label: `${r.label}: ${basename(dirname(f))}/${basename(f)}`, where: f, detail: 'Mentions the state file by name only, not by folder: nothing to change.' });
      }
    }
  }

  // 7. Windows shortcuts
  if (platform === 'win32' && adapters.shortcuts) {
    const needles = mappings.map(m => basename(m.from).toLowerCase()).filter(Boolean);
    const cands = [];
    for (const root of shortcutRoots({ env, home })) {
      for (const f of walkFiles(root, { depth: 3, exts: ['.lnk'] })) {
        try {
          const b = readFileSync(f);
          const s = (b.toString('utf16le') + '\n' + b.toString('latin1')).toLowerCase();
          if (needles.some(n => s.includes(n))) cands.push(f);
        } catch { /* unreadable */ }
      }
    }
    const read = cands.length ? await adapters.shortcuts.read(cands) : [];
    for (const s of read) {
      if (!s || !s.file) continue;
      const before = { target: s.target || '', args: s.args || '', workdir: s.workdir || '', icon: s.icon || '' };
      const after = {
        target: mapPath(before.target, mappings, platform), args: mapText(before.args, mappings, platform).text,
        workdir: mapPath(before.workdir, mappings, platform), icon: mapText(before.icon, mappings, platform).text,
      };
      const changes = Object.keys(before).filter(k => before[k] !== after[k]).map(k => ({ what: k, before: before[k], after: after[k] }));
      if (!changes.length) continue;
      const synced = /[\\/]onedrive( - [^\\/]+)?[\\/]/i.test(s.file);
      add({ id: `lnk:${s.file}`, kind: 'shortcut', file: s.file, label: `Shortcut: ${basename(s.file, '.lnk')}`, where: s.file, how: 'auto', before, after, changes, ...(synced ? { note: 'This shortcut is in OneDrive, so your other computers get the change too.' } : {}) });
    }
  }

  // 8. This computer's sync identity (kept per data-folder path)
  if (adapters.syncLocalDir && from.data && to.data) {
    const a = adapters.syncLocalDir(from.data), b = adapters.syncLocalDir(to.data);
    if (a && b && !samePath(a, b, platform) && existsSync(a) && !existsSync(b)) {
      add({ id: 'sync:local', kind: 'copy-dir', label: "This computer's sync identity (Settings > Sync)", where: a, how: 'auto', from: a, to: b, changes: [{ what: 'copied to', before: a, after: b }] });
    }
  }

  // 9. Notes for an app move
  if (to.app && appOld) {
    let git = null; try { git = statSync(join(appOld, '.git')); } catch { /* none */ }
    if (git && git.isFile()) add({ id: 'info:git-link', kind: 'info', how: 'info', label: 'The .git link in the app folder', where: join(appOld, '.git'), detail: 'It points at a developer\'s copy of the code, so the new app folder is made without it (updates then come from Settings > Updates). The old folder keeps it.' });
    const st = join(home, '.claude', 'settings.json');
    try { if (mapText(readText(st), mappings, platform).count) add({ id: 'info:claude-settings', kind: 'info', how: 'info', label: 'Claude Code permissions that name the old folder', where: st, detail: 'Commands you allowed in the old folder. They are left as they are; Claude Code asks again in the new folder.' }); } catch { /* none */ }
  }
  return refs;
}

// ─── Apply and undo ───────────────────────────────────────────────────────
const conflict = (ref, what) => Object.assign(ref, { status: 'skipped', error: `${what} changed since it was checked, so it was left as it is.` });

async function readClaude(ref) { const j = readJsonFile(ref.file); return j ? claudeEntry(j, ref.scope, ref.project, ref.name) : null; }
async function claudeSet(ref, ad, fromDef, toDef) {
  const cwd = ref.cwd && existsSync(ref.cwd) ? ref.cwd : undefined;
  const rm = await ad.cli.run('claude', ['mcp', 'remove', ref.name, '--scope', ref.scope], { cwd });
  if (rm.code !== 0 && fromDef) throw new Error(`claude mcp remove failed: ${String(rm.stderr || rm.stdout).trim().slice(0, 200)}`);
  const r = await ad.cli.run('claude', claudeAddArgs(ref.scope, ref.name, toDef), { cwd });
  if (r.code !== 0) throw new Error(`claude mcp add failed: ${String(r.stderr || r.stdout).trim().slice(0, 200)}`);
  const now = await readClaude(ref);
  if (!sameDef(now, toDef)) throw new Error('Claude Code did not save the change');
}

function codexDefs(file) { try { return parseCodexServers(readText(file)); } catch { return []; } }
async function codexSet(ref, ad, fromV, toV) {
  const rm = await ad.cli.run('codex', ['mcp', 'remove', fromV.name], {});
  if (rm.code !== 0) throw new Error(`codex mcp remove failed: ${String(rm.stderr || rm.stdout).trim().slice(0, 200)}`);
  const d = normDef(toV.def);
  const r = await ad.cli.run('codex', ['mcp', 'add', toV.name, ...Object.entries(d.env).flatMap(([k, v]) => ['--env', `${k}=${v}`]), '--', d.command, ...d.args], {});
  if (r.code !== 0) throw new Error(`codex mcp add failed: ${String(r.stderr || r.stdout).trim().slice(0, 200)}`);
  const now = codexDefs(ref.file).find(s => s.name === toV.name);
  if (!now || !sameDef(now.def, toV.def)) throw new Error('Codex did not save the change');
}

function jsonMcpDef(file, name) { const j = readJsonFile(file); return j && isObj(j.mcpServers) && isObj(j.mcpServers[name]) ? j.mcpServers[name] : null; }
async function geminiSet(ref, ad, fromV, toV) {
  const rm = await ad.cli.run('gemini', ['mcp', 'remove', '--scope', 'user', fromV.name], {});
  if (rm.code !== 0) throw new Error(`gemini mcp remove failed: ${String(rm.stderr || rm.stdout).trim().slice(0, 200)}`);
  const d = normDef(toV.def);
  const r = await ad.cli.run('gemini', ['mcp', 'add', '--scope', 'user', '--transport', 'stdio', toV.name, d.command, ...d.args.slice(0, 1), ...(d.args.length > 1 ? ['--', ...d.args.slice(1)] : [])], {});
  if (r.code !== 0) throw new Error(`gemini mcp add failed: ${String(r.stderr || r.stdout).trim().slice(0, 200)}`);
  if (!sameDef(jsonMcpDef(ref.file, toV.name), toV.def)) throw new Error('Gemini CLI did not save the change');
}

async function desktopSet(ref, toDef) {
  const t = readText(ref.file);
  const j = parseJson(t);
  const cur = j.mcpServers[ref.name];
  const d = normDef(toDef);
  j.mcpServers[ref.name] = { ...cur, command: d.command, args: d.args, ...(Object.keys(d.env).length || (cur && cur.env) ? { env: d.env } : {}) };
  await atomicText(ref.file, JSON.stringify(j, null, 2) + (t.endsWith('\n') ? '\n' : ''));
}

/** Re-point one reference. Never throws: the outcome is in ref.status ('done' | 'skipped' | 'failed' | 'manual'). */
export async function applyRef(ref, ad = {}) {
  if (ref.how === 'info') return Object.assign(ref, { status: 'info' });
  if (ref.how === 'manual') return Object.assign(ref, { status: 'manual' });
  try {
    switch (ref.kind) {
      case 'registry': {
        const q = await ad.registry.query(ref.key, ref.name);
        if (!q || q.data !== ref.before) return conflict(ref, 'This entry');
        await ad.registry.set(ref.key, ref.name, ref.type, ref.after);
        break;
      }
      case 'claude-code': {
        if (!sameDef(await readClaude(ref), ref.before)) return conflict(ref, 'This MCP entry');
        await claudeSet(ref, ad, ref.before, ref.after);
        break;
      }
      case 'desktop-json': {
        if (!sameDef(jsonMcpDef(ref.file, ref.name), ref.before)) return conflict(ref, 'This MCP entry');
        await desktopSet(ref, ref.after);
        break;
      }
      case 'codex': {
        const cur = codexDefs(ref.file).find(s => s.name === ref.before.name);
        if (!cur || !sameDef(cur.def, ref.before.def)) return conflict(ref, 'This MCP entry');
        await codexSet(ref, ad, ref.before, ref.after);
        break;
      }
      case 'gemini': {
        if (!sameDef(jsonMcpDef(ref.file, ref.before.name), ref.before.def)) return conflict(ref, 'This MCP entry');
        await geminiSet(ref, ad, ref.before, ref.after);
        break;
      }
      case 'text': {
        let cur; try { cur = readText(ref.file); } catch { return conflict(ref, 'This file'); }
        if (sha(cur) !== ref.beforeHash) return conflict(ref, 'This file');
        await atomicText(ref.file, ref.after);
        break;
      }
      case 'shortcut': {
        const [cur] = await ad.shortcuts.read([ref.file]);
        if (!cur || ['target', 'args', 'workdir', 'icon'].some(k => (cur[k] || '') !== ref.before[k])) return conflict(ref, 'This shortcut');
        await ad.shortcuts.write(ref.file, ref.after);
        break;
      }
      case 'copy-dir': {
        if (existsSync(ref.to)) return Object.assign(ref, { status: 'done', note: 'already there' });
        const r = await copyTree(ref.from, ref.to);
        if (r.busy.length) throw new Error('some files kept changing');
        break;
      }
      default: return Object.assign(ref, { status: 'skipped', error: `unknown kind ${ref.kind}` });
    }
    return Object.assign(ref, { status: 'done', doneAt: new Date().toISOString(), error: undefined });
  } catch (e) {
    return Object.assign(ref, { status: 'failed', error: String((e && e.message) || e).slice(0, 300) });
  }
}

/** Put one reference back as it was before the move (only what the move changed and nobody changed since). */
export async function undoRef(ref, ad = {}) {
  if (ref.status !== 'done') return Object.assign(ref, { undo: 'not-needed' });
  const left = (why) => Object.assign(ref, { undo: 'left', undoNote: why });
  try {
    switch (ref.kind) {
      case 'registry': {
        const q = await ad.registry.query(ref.key, ref.name);
        if (!q || q.data !== ref.after) return left('changed since the move, so it was left as it is');
        await ad.registry.set(ref.key, ref.name, ref.type, ref.before);
        break;
      }
      case 'claude-code': {
        if (!sameDef(await readClaude(ref), ref.after)) return left('changed since the move, so it was left as it is');
        await claudeSet(ref, ad, ref.after, ref.before);
        break;
      }
      case 'desktop-json': {
        if (!sameDef(jsonMcpDef(ref.file, ref.name), ref.after)) return left('changed since the move, so it was left as it is');
        await desktopSet(ref, ref.before);
        break;
      }
      case 'codex': {
        const cur = codexDefs(ref.file).find(s => s.name === ref.after.name);
        if (!cur || !sameDef(cur.def, ref.after.def)) return left('changed since the move, so it was left as it is');
        await codexSet(ref, ad, ref.after, ref.before);
        break;
      }
      case 'gemini': {
        if (!sameDef(jsonMcpDef(ref.file, ref.after.name), ref.after.def)) return left('changed since the move, so it was left as it is');
        await geminiSet(ref, ad, ref.after, ref.before);
        break;
      }
      case 'text': {
        let cur; try { cur = readText(ref.file); } catch { return left('the file is not there any more'); }
        if (sha(cur) !== ref.afterHash) return left('the file was edited since the move, so it was left as it is');
        await atomicText(ref.file, ref.before);
        break;
      }
      case 'shortcut': {
        const [cur] = await ad.shortcuts.read([ref.file]);
        if (!cur || ['target', 'args', 'workdir', 'icon'].some(k => (cur[k] || '') !== ref.after[k])) return left('changed since the move, so it was left as it is');
        await ad.shortcuts.write(ref.file, ref.before);
        break;
      }
      case 'copy-dir': return Object.assign(ref, { undo: 'kept', undoNote: 'the copy is kept; the original was never changed' });
      default: return left('unknown kind');
    }
    return Object.assign(ref, { undo: 'done', undoneAt: new Date().toISOString() });
  } catch (e) {
    return Object.assign(ref, { undo: 'failed', undoNote: String((e && e.message) || e).slice(0, 300) });
  }
}

/** The ref as the page and the move record show it (texts never carry a whole file). */
export function publicRef(r) {
  if (r.kind !== 'text') return { ...r };
  const { before, after, ...rest } = r;
  return rest;
}

export const _test = { opendashName, claudeAddArgs, readJsonFile };

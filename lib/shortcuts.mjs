// lib/shortcuts.mjs - Settings > Server "Add a desktop shortcut" / "Add to Start menu".
//
// Makes an "OpenDash" shortcut that runs tools/launch.mjs for THIS install (its
// port and data folder): starts the server with no window if it is not running,
// waits until it answers, then opens the browser; if it is already running it
// only opens the browser.
//   Windows  a .lnk, written by a one-off cscript run of a small .vbs (WScript.Shell
//            CreateShortcut): target wscript.exe tools\launch.vbs <args>
//   macOS    ~/Desktop/OpenDash.command
//   Linux    ~/Desktop/OpenDash.desktop (if there is a Desktop folder) and the applications menu
// Nothing is run except cscript.exe (by full path, argument array, no shell).

import { execFile } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export class ShortcutError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const BAD = /[\r\n\0]/;
const DEFAULT_PORT = 4173;

/** The arguments the launcher gets: this install's port and data folder (when not the defaults). */
export function launchArgs({ port = DEFAULT_PORT, dataDir, defaultDataDir }) {
  const a = [];
  if (Number(port) !== DEFAULT_PORT) a.push('--port', String(Number(port)));
  if (dataDir) a.push('--data-dir', resolve(dataDir).replace(/[\\/]+$/, ''));
  void defaultDataDir;   // the launcher's own default is the app's data folder, which start-opendash picks
  return a;
}

const vbsStr = (s) => `"${String(s).replace(/"/g, '""')}"`;

/** The .vbs text that writes one .lnk. `folderKind` is a WScript.Shell special folder. */
export function lnkScript({ folderKind, target, args, workDir, icon }) {
  return [
    'Set sh = CreateObject("WScript.Shell")',
    `folder = sh.SpecialFolders(${vbsStr(folderKind)})`,
    'Set lnk = sh.CreateShortcut(folder & "\\OpenDash.lnk")',
    `lnk.TargetPath = ${vbsStr(target)}`,
    `lnk.Arguments = ${vbsStr(args)}`,
    `lnk.WorkingDirectory = ${vbsStr(workDir)}`,
    'lnk.Description = "Start OpenDash and open it in your browser"',
    ...(icon ? [`lnk.IconLocation = ${vbsStr(icon)}`] : []),
    'lnk.Save',
    'WScript.Echo folder & "\\OpenDash.lnk"',
    '',
  ].join('\r\n');
}

const realExec = (file, args) => new Promise((res) => {
  execFile(file, args, { windowsHide: true, shell: false, timeout: 15000, encoding: 'utf8' }, (err, stdout, stderr) => {
    res({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: String(stdout || ''), stderr: String(stderr || '') });
  });
});

/**
 * createShortcut({ where: 'desktop'|'startmenu', repoRoot, port, dataDir, platform, env, home, nodeExe, exec })
 *   -> { ok, path, where }
 */
export async function createShortcut({ where = 'desktop', repoRoot, port = DEFAULT_PORT, dataDir, platform = process.platform, env = process.env, home = homedir(), nodeExe = process.execPath, exec = realExec } = {}) {
  if (!['desktop', 'startmenu'].includes(where)) throw new ShortcutError('where must be "desktop" or "startmenu"');
  const root = resolve(repoRoot);
  const args = launchArgs({ port, dataDir });
  if ([root, nodeExe, ...args].some(s => BAD.test(String(s)))) throw new ShortcutError('A path contains a line break and cannot be used in a shortcut.');

  if (platform === 'win32') {
    const vbs = join(root, 'tools', 'launch.vbs');
    if (!existsSync(vbs)) throw new ShortcutError('tools\\launch.vbs is missing from the app folder.', 500);
    const sysRoot = String(env.SystemRoot || env.SYSTEMROOT || env.windir || 'C:\\Windows').replace(/[\\/]+$/, '');
    const text = lnkScript({
      folderKind: where === 'desktop' ? 'Desktop' : 'Programs',
      target: join(sysRoot, 'System32', 'wscript.exe'),
      args: [vbs, ...args].map(a => `"${a}"`).join(' '),
      workDir: root,
      icon: existsSync(join(root, 'assets', 'brand', 'favicon.ico')) ? join(root, 'assets', 'brand', 'favicon.ico') : '',
    });
    const dir = mkdtempSync(join(tmpdir(), 'opendash-lnk-'));
    try {
      const file = join(dir, 'make-shortcut.vbs');
      writeFileSync(file, text);
      const r = await exec(join(sysRoot, 'System32', 'cscript.exe'), ['//nologo', file]);
      if (r.code !== 0) throw new ShortcutError(`Windows would not create the shortcut (${(r.stderr || r.stdout || 'exit ' + r.code).trim().slice(0, 200)})`, 500);
      return { ok: true, where, path: r.stdout.trim().split(/\r?\n/).pop() };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }

  const launcher = join(root, 'tools', 'launch.mjs');
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const line = [q(nodeExe), q(launcher), ...args.map(q)].join(' ');
  if (platform === 'darwin') {
    if (where === 'startmenu') throw new ShortcutError('The Start menu is Windows only.', 501);
    const dir = join(home, 'Desktop');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'OpenDash.command');
    writeFileSync(file, `#!/bin/sh\nexec ${line}\n`);
    chmodSync(file, 0o755);
    return { ok: true, where, path: file };
  }
  // Linux and others: a .desktop file. "Exec" needs its own quoting: wrap in sh -c.
  const dirs = where === 'startmenu'
    ? [join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'applications')]
    : [join(home, 'Desktop')];
  const icon = join(root, 'assets', 'brand', 'png', 'icon-192.png');
  const body = ['[Desktop Entry]', 'Type=Application', 'Name=OpenDash', 'Comment=Start OpenDash and open it in your browser',
    `Exec=sh -c ${JSON.stringify(line)}`, ...(existsSync(icon) ? [`Icon=${icon}`] : []), 'Terminal=false', 'Categories=Office;', ''].join('\n');
  let path = null;
  for (const d of dirs) {
    mkdirSync(d, { recursive: true });
    const file = join(d, 'OpenDash.desktop');
    writeFileSync(file, body);
    chmodSync(file, 0o755);
    path = file;
  }
  return { ok: true, where, path };
}

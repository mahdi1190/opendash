// lib/env-files.mjs - optional .env files read at start-up, and which of
// their variables are trusted.
//
// The data folder may sit in OneDrive, Dropbox or Drive, so anyone who can
// write that folder (a shared folder, a compromised cloud account, another
// computer) could plant a file there. A .env file in the data folder must
// therefore never choose a program, a feed or code (CLAUDE_CLI_PATH, PATH,
// PYTHON, NODE_OPTIONS, DASHBOARD_UPDATE_FEED, DASHBOARD_DEVICE_DIR...):
// that would turn "can change my data" into "can run code on my computer".
//
// Read, in this order (a variable already set wins, as before):
//   1. <device base>/.env   this computer only, never synced
//                           (Windows %LOCALAPPDATA%\OpenDash\.env,
//                           macOS ~/Library/Application Support/OpenDash/.env,
//                           Linux ~/.local/state/opendash/.env): every variable
//   2. <app folder>/.env    next to serve.mjs: every variable
//   3. <data>/.env          only the harmless keys in DATA_ENV_KEYS; any other
//                           key is skipped with a note saying where to put it.
//
// Node stdlib only.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { parseEnv } from 'node:util';
import { deviceBase } from './devicedir.mjs';

/** The only variables a data-folder .env may set: sign-in app IDs (no program, feed or path). */
export const DATA_ENV_KEYS = Object.freeze([
  'OPENDASH_GOOGLE_CLIENT_ID',
  'OPENDASH_GOOGLE_CLIENT_SECRET',
  'OPENDASH_MICROSOFT_CLIENT_ID',
]);

const inside = (child, parent) => {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!!rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
};

function readEnvFile(f) {
  const t = readFileSync(f, 'utf8');
  return parseEnv(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
}

/** Where this computer's own .env lives (outside every data folder). */
export function deviceEnvFile(opts = {}) { return join(deviceBase(opts), '.env'); }

/**
 * Load the .env files into env (default process.env). Returns
 * { loaded: [file...], refused: [key...] } and reports problems through log(msg).
 */
export function loadEnvFiles({ dataDir, appDir, env = process.env, log = () => {}, deviceFile } = {}) {
  const out = { loaded: [], refused: [] };
  const apply = (f, vars, allow) => {
    for (const [k, v] of Object.entries(vars)) {
      if (allow && !allow.includes(k)) { out.refused.push(k); continue; }
      if (env[k] === undefined) env[k] = v;
    }
    out.loaded.push(f);
  };
  const files = [];
  const dev = deviceFile || deviceEnvFile({ dataDir });
  // A device or app folder inside the data folder is synced with it: treat it like the data folder.
  if (dev && !inside(dev, dataDir)) files.push([dev, null]);
  if (appDir && !inside(join(appDir, '.env'), dataDir)) files.push([join(appDir, '.env'), null]);
  files.push([join(dataDir, '.env'), DATA_ENV_KEYS]);
  const seen = new Set();
  for (const [f, allow] of files) {
    const key = resolve(f).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!existsSync(f)) continue;
    let vars;
    try { vars = readEnvFile(f); } catch (e) { log(`could not read ${f}: ${e.message}`); continue; }
    apply(f, vars, allow);
  }
  if (out.refused.length) {
    log(`ignored ${[...new Set(out.refused)].join(', ')} in the data folder's .env: a synced folder must not choose programs or update feeds. Put them in ${dev || 'the app folder .env'} on this computer instead.`);
  }
  return out;
}

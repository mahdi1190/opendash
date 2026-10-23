#!/usr/bin/env node
// tools/release-client-ids.mjs - the built-in app registrations of a RELEASE.
//
// lib/accounts/shipped.mjs holds placeholders (OPENDASH_MICROSOFT_CLIENT_ID,
// OPENDASH_GOOGLE_CLIENT_ID, OPENDASH_GOOGLE_CLIENT_SECRET). A release zip
// carries the real values so people sign in with one click; the repository
// never does (Google's policy forbids committing a client secret, and the
// privacy scan's google-secret rule refuses one in the tree).
//
// The values come from the ENVIRONMENT only (CI secrets, or a maintainer's
// shell), never from arguments (shell history, CI logs). They are written
// into the zip only: tools/release-package.mjs --client-ids rewrites the
// shipped.mjs ENTRY while it builds the zip in memory; the export folder and
// the repository are never changed. The zip's privacy check then allows
// exactly these values in exactly that file (allowEntries), nothing else.
//
//   node tools/release-client-ids.mjs --check     which values are set (masked), and whether they are valid
//
// Exports: readClientIds(env), injectShipped(text, values), allowEntries(values), SHIPPED_REL.
// Node stdlib only.

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SHIPPED_REL = 'lib/accounts/shipped.mjs';
export const VARS = Object.freeze({
  microsoftClientId: 'OPENDASH_MICROSOFT_CLIENT_ID',
  googleClientId: 'OPENDASH_GOOGLE_CLIENT_ID',
  googleClientSecret: 'OPENDASH_GOOGLE_CLIENT_SECRET',
});
const CHECK = {
  microsoftClientId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,   // lib/accounts/shipped.mjs isClientId
  googleClientId: /^[A-Za-z0-9_-]{8,200}\.apps\.googleusercontent\.com$/,
  googleClientSecret: /^[\x21-\x7e]{8,512}$/,
};

/** A value as a log may show it: the first 4 characters and the length. */
export const masked = (v) => (v ? `${String(v).slice(0, 4)}…(${String(v).length} chars)` : '(not set)');

/**
 * The release values from the environment: {values, missing: [VAR], errors: [text]}.
 * A Google client ID and its secret come together or not at all.
 */
export function readClientIds(env = process.env) {
  const values = {}, missing = [], errors = [];
  for (const [k, name] of Object.entries(VARS)) {
    const v = env[name] == null ? '' : String(env[name]).trim();
    if (!v) { missing.push(name); continue; }
    if (v === name || /^OPENDASH_/.test(v)) { errors.push(`${name} still holds a placeholder`); continue; }
    if (/['"`\\\r\n]/.test(v) || !CHECK[k].test(v)) { errors.push(`${name} does not look like a ${k === 'microsoftClientId' ? 'Microsoft application (client) ID (00000000-0000-0000-0000-000000000000)' : k === 'googleClientId' ? 'Google client ID (....apps.googleusercontent.com)' : 'Google client secret'}`); continue; }
    values[k] = v;
  }
  if (!!values.googleClientId !== !!values.googleClientSecret && !errors.some(e => /GOOGLE/.test(e))) errors.push('OPENDASH_GOOGLE_CLIENT_ID and OPENDASH_GOOGLE_CLIENT_SECRET go together: set both or neither');
  return { values, missing, errors };
}

/**
 * shipped.mjs with the placeholders replaced by `values` (only those given).
 * Throws when a placeholder to replace is not there (already a release file,
 * or the file changed shape): a value is never written twice or elsewhere.
 */
export function injectShipped(text, values = {}) {
  let out = String(text);
  for (const [k, v] of Object.entries(values)) {
    if (!VARS[k] || v == null) continue;
    const line = new RegExp(`(\\b${k}:\\s*)'${VARS[k]}'`);
    if (!line.test(out)) throw new Error(`${SHIPPED_REL}: the placeholder '${VARS[k]}' for ${k} is not there`);
    out = out.replace(line, (_, pre) => `${pre}'${v}'`);
  }
  return out;
}

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** privacy-allow entries for the zip's scan: these exact values, in shipped.mjs only. */
export function allowEntries(values = {}) {
  return Object.entries(values).filter(([k, v]) => VARS[k] && v).map(([k, v]) => ({
    rule: '*', path: SHIPPED_REL, match: `^${esc(v)}$`,
    why: `the release's built-in ${k} (injected into the zip only by tools/release-client-ids.mjs; ${k === 'googleClientSecret' ? 'a desktop client secret is not confidential once shipped, per Google' : 'public by design'})`,
  }));
}

export function main(argv = process.argv.slice(2), { log = console.log, error = console.error, env = process.env } = {}) {
  if (!argv.includes('--check')) { log('usage: node tools/release-client-ids.mjs --check   (the values themselves go in with tools/release-package.mjs --client-ids)'); return 2; }
  const r = readClientIds(env);
  for (const [k, name] of Object.entries(VARS)) log(`  ${name.padEnd(32)} ${r.values[k] ? 'set   ' + masked(r.values[k]) : r.missing.includes(name) ? 'missing' : 'INVALID'}`);
  for (const e of r.errors) error(`release-client-ids: ${e}`);
  return r.errors.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main();

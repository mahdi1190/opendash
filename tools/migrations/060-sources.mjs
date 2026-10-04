// 060-sources - turn the single Bank / Google Calendar / Gmail connectors into
// data SOURCES (<data>/sources.json, see lib/sources.mjs).
//
// Each of the three presets becomes a source when the data folder shows it was
// in use (connections.json checked it, or its data files exist): Aureli for
// the claude.ai Bank connector, Google Calendar, Gmail. The CSV import becomes
// the "CSV imports" bank source when the finance folder has transactions.
// Nothing else changes: the tuned fetch jobs keep working on the same files.
//
// --my-emails a@x.org,b@y.org   add the user's own addresses to config.myEmails
//                               (calendars named after anyone else's address
//                               start hidden). Addresses are added, never removed.
//                               The addresses of the person marked as "you"
//                               (people[].self) are added too.
//
// Idempotent: sources.json is only created when missing; a second run changes
// nothing. Counts only in the output.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, writeJson, runIfMain } from './_lib.mjs';
import { validateConfig, loadConnections } from '../../lib/datadir.mjs';
import { legacySources, legacyEvidence, validateSource, sourcesFile } from '../../lib/sources.mjs';

export const id = '060-sources';
export const description = 'Create sources.json from the Bank/Calendar/Gmail connectors in use; optionally set config.myEmails (--my-emails).';
export const auto = true;

const EMAIL = /^[^\s@<>"',;:()]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;

export async function run(ctx) {
  const notes = [];
  let changed = false;
  const cfgRaw = await readJson(ctx.paths.config, { fallback: {} });
  const cfg = validateConfig(cfgRaw).config;
  const financeDir = cfg.financeDir || ctx.paths.finance;

  // 1. sources.json
  const file = sourcesFile(ctx.dataDir);
  if (existsSync(file)) {
    notes.push('sources.json already exists: left as it is');
  } else {
    const connections = await loadConnections(ctx.dataDir).catch(() => ({}));
    const list = legacySources({ connections, evidence: legacyEvidence(ctx.paths, financeDir) });
    const sources = [];
    for (const s of list) {
      const { source, errors } = validateSource(s, { existing: sources });
      if (!errors.length) sources.push(source);
    }
    const by = (cap) => sources.filter(s => s.capability === cap).length;
    notes.push(`sources: ${sources.length} (bank ${by('bank')}, calendar ${by('calendar')}, email ${by('email')})`);
    if (!ctx.dryRun) await writeJson(file, { version: 1, sources }, { trailingNewline: true });
    changed = true;
  }

  // 2. config.myEmails (only ever added to)
  const want = new Set(cfg.myEmails || []);
  const before = want.size;
  for (const e of String(ctx.arg('--my-emails') || '').split(/[\s,;]+/)) if (EMAIL.test(e.trim())) want.add(e.trim().toLowerCase());
  const state = await ctx.state.read();
  const self = Array.isArray(state && state.people) ? state.people.find(p => p && p.self === true) : null;
  if (self) for (const e of [self.email, ...(Array.isArray(self.emails) ? self.emails : [])]) if (typeof e === 'string' && EMAIL.test(e.trim())) want.add(e.trim().toLowerCase());
  const added = want.size - before;
  if (added > 0) {
    const next = validateConfig({ ...cfgRaw, myEmails: [...want].slice(0, 10) }).config;
    notes.push(`config: ${added} own email address(es) added (${next.myEmails.length} in total)`);
    if (!ctx.dryRun) await writeJson(ctx.paths.config, next, { trailingNewline: true });
    changed = true;
  } else notes.push(`config: own email addresses unchanged (${before})`);

  return { changed, notes };
}

await runIfMain(import.meta.url, { id, description, auto, run });

// lib/inbox-sources.mjs - email from more than one source (mailbox).
//
// The Gmail preset keeps its tuned job and file (lib/inbox.mjs,
// <data>/inbox/messages.json). Every other email source (any MCP server the
// user added: a second Gmail, Outlook...) has its own snapshot,
// <data>/inbox/sources/<sourceId>.json = { version:1, sourceId, fetchedAt,
// days, accounts:[{id,name}], messages:[Message] }, written by the generic
// adapter (lib/source-adapter.mjs).
//
// mergeInboxData() gives Email triage and People one merged inbox: every
// message tagged with sourceId + accountId, de-duplicated by message id, newest
// first, plus the list of accounts (for the account chips).
//
// Node stdlib only.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { fetchFromSource, describeRejected } from './source-adapter.mjs';
import { dedupeMessages, readSourcesFile, legacySources } from './sources.mjs';
import { clockAddDays } from './clock.mjs';
import { microsoftFor } from './microsoft.mjs';

const SNAP_ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
export function inboxSnapshotFile(paths, sourceId) {
  if (!SNAP_ID.test(String(sourceId))) throw new Error('bad source id');
  return join(paths.root, 'inbox', 'sources', `${sourceId}.json`);
}
export async function readInboxSnapshot(paths, sourceId) {
  const f = inboxSnapshotFile(paths, sourceId);
  if (!existsSync(f)) return null;
  const doc = await readJson(f, { fallback: null }).catch(() => null);
  return doc && Array.isArray(doc.messages) ? doc : null;
}
export async function saveInboxSnapshot(paths, sourceId, { days, accounts, messages, warnings }, now = Date.now()) {
  const f = inboxSnapshotFile(paths, sourceId);
  const doc = { version: 1, sourceId, fetchedAt: new Date(now).toISOString(), days, count: messages.length, accounts, messages, ...(warnings && warnings.length ? { warnings } : {}) };
  await withLock(f, () => writeJson(f, doc, { trailingNewline: true }));
  return doc;
}

/** Fetch one non-Gmail email source (generic MCP adapter). */
export async function fetchEmailSource(source, { dataDir, microsoft, days, todayIso, serverDef, denyServers, run, now = Date.now() } = {}) {
  if (source.kind === 'microsoft') return (microsoft || microsoftFor(dataDir)).email(source, { days, todayIso });
  if (source.kind !== 'mcp') throw Object.assign(new Error('Email sources are MCP servers.'), { code: 'BAD_REQUEST' });
  const accountOn = (id) => { const a = (source.accounts || []).find(x => x.id === id); return !a || a.enabled !== false; };
  // From the user's own "today" (todayIso, effective zone), not the UTC day (travel spec S7).
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(todayIso || '')) ? clockAddDays(todayIso, -days) : new Date(now - days * 86400000).toISOString().slice(0, 10);
  const r = await fetchFromSource(source, { from, to: todayIso, days, since: from + 'T00:00:00Z', serverDef, denyServers, run, accountOn });
  const warnings = [];
  const rej = describeRejected(r.rejected);
  if (rej) warnings.push(`Left out: ${rej}.`);
  return { accounts: r.accounts, messages: r.messages, warnings, count: r.messages.length };
}

/**
 * One inbox from the Gmail doc (messages.json, or null) and the other
 * sources' snapshots. Disabled sources and switched-off accounts are left out.
 * Returns {messages, accounts:[{sourceId, id, name, colour, count, label}], sources:[summary], fetchedAt}.
 */
export function mergeInboxData({ gmailDoc, snapshots = {}, sources = [] }) {
  const groups = [], accounts = [], summary = [];
  let fetchedAt = null;
  const latest = (a) => { if (a && (!fetchedAt || a > fetchedAt)) fetchedAt = a; };
  const gSrc = sources.find(s => s.preset === 'gmail');
  const legacyOnly = !sources.length;
  if (gmailDoc && (legacyOnly || (gSrc && gSrc.enabled))) {
    const sid = gSrc ? gSrc.id : 'email-gmail';
    const acc = gSrc && (gSrc.accounts || []).find(a => a.id === 'default');
    if (!(acc && acc.enabled === false)) {
      groups.push({ sourceId: sid, messages: (gmailDoc.messages || []).map(m => ({ ...m, sourceId: sid, accountId: 'default' })) });
      accounts.push({ sourceId: sid, id: 'default', name: (acc && acc.name) || (gSrc ? gSrc.label : 'Gmail'), colour: (acc && acc.colour) || (gSrc ? gSrc.colour : 'red'), label: gSrc ? gSrc.label : 'Gmail' });
    }
    latest(gmailDoc.fetchedAt);
    if (gSrc) summary.push({ id: sid, label: gSrc.label, colour: gSrc.colour, fetchedAt: gmailDoc.fetchedAt || null, count: (gmailDoc.messages || []).length, source: gmailDoc.source || 'claude' });
  }
  for (const s of sources) {
    if (s.preset === 'gmail' || !s.enabled) continue;
    const doc = snapshots[s.id];
    const off = new Set((s.accounts || []).filter(a => a.enabled === false).map(a => a.id));
    const msgs = (doc && Array.isArray(doc.messages) ? doc.messages : []).filter(m => !off.has(m.accountId)).map(m => ({ ...m, sourceId: s.id }));
    groups.push({ sourceId: s.id, messages: msgs });
    const seenAcc = new Set(msgs.map(m => m.accountId));
    for (const a of (doc && doc.accounts) || []) {
      if (off.has(a.id) || !seenAcc.has(a.id) && (doc.accounts || []).length > 1) continue;
      const mine = (s.accounts || []).find(x => x.id === a.id);
      accounts.push({ sourceId: s.id, id: a.id, name: (mine && mine.renamed && mine.name) || a.name || s.label, colour: (mine && mine.colour) || s.colour, label: s.label });
    }
    latest(doc && doc.fetchedAt);
    summary.push({ id: s.id, label: s.label, colour: s.colour, fetchedAt: (doc && doc.fetchedAt) || null, count: msgs.length, ...(doc && doc.warnings ? { warnings: doc.warnings } : {}) });
  }
  const messages = dedupeMessages(groups);
  for (const a of accounts) a.count = messages.filter(m => m.sourceId === a.sourceId && m.accountId === a.id).length;
  return { messages, accounts, sources: summary, fetchedAt };
}

/** Every email source's messages, merged (for the MCP / actions layer, which has no server context). */
export async function readMergedInbox(paths) {
  const doc = await readSourcesFile(paths.root).catch(() => null);
  const sources = (doc ? doc.sources : legacySources({ evidence: { email: true } })).filter(s => s.capability === 'email');
  let gmailDoc = null;
  for (const f of [join(paths.root, 'inbox', 'messages.json')]) {
    if (existsSync(f)) gmailDoc = await readJson(f, { fallback: null }).catch(() => null);
  }
  const snapshots = {};
  for (const s of sources) if (s.preset !== 'gmail' && s.enabled) snapshots[s.id] = await readInboxSnapshot(paths, s.id).catch(() => null);
  const m = mergeInboxData({ gmailDoc: gmailDoc && Array.isArray(gmailDoc.messages) ? gmailDoc : null, snapshots, sources });
  if (!m.messages.length && !gmailDoc) return null;
  return { fetchedAt: m.fetchedAt, messages: m.messages, accounts: m.accounts, sources: m.sources };
}

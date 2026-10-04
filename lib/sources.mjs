// lib/sources.mjs - data SOURCES: where bank transactions, calendar events and
// email come from. Any number per capability, each with its own accounts.
//
// <data>/sources.json = { version: 1, sources: [Source] }
//   Source = { id, capability: 'bank'|'calendar'|'email', kind: 'mcp'|'ical'|'csv',
//              label, server (MCP server name as `claude mcp list` prints it),
//              preset? ('aureli'|'google-calendar'|'gmail'), tools? [confirmed read
//              tools, mcp only], url? (ical only; never sent to the page),
//              colour, enabled, accounts: [{id, name, colour, enabled}],
//              lastSync, lastError, createdAt }
//
// Presets are the three tuned adapters that existed before sources:
//   aureli           claude.ai Bank            -> lib/finance.mjs (bank-read profile)
//   google-calendar  claude.ai Google Calendar -> lib/calendar.mjs (calendar-read)
//   gmail            claude.ai Gmail           -> lib/inbox.mjs (gmail-read)
// Every other MCP source goes through the generic adapter (lib/source-adapter.mjs,
// runner profile 'source-read': only that server's confirmed read tools).
// iCal sources are fetched by the server directly (lib/ical.mjs), no AI.
// The CSV bank source is the existing "Import CSV" in Finances, labelled.
//
// Discovery: `claude mcp list` (lib/claude-runner.mjs listMcpServers), parsed
// here, cached for a minute. It is the primary health signal; the hourly
// connector probes in lib/connections.mjs are the fallback.
//
// A capability is available when at least one enabled source of it is healthy.
//
// Node stdlib only. Writes go through lib/fsutil.mjs (atomic, locked).

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { loadConnections } from './datadir.mjs';
import {
  CONNECTORS, listMcpServers, runClaude, toolSafety, mcpToolPrefix, isClaudeAiServer, SERVER_NAME_RE, ClaudeError,
  setDiscoveredClaudeAiServers,
} from './claude-runner.mjs';

export const CAPABILITIES = Object.freeze(['bank', 'calendar', 'email']);
export const KINDS = Object.freeze(['mcp', 'ical', 'csv']);
export const COLOURS = Object.freeze(['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate']);
export const DISCOVERY_TTL_MS = 60 * 1000;
export const MAX_SOURCES = 30;
export const MAX_ACCOUNTS = 40;
const CAP_LABEL = { bank: 'Bank', calendar: 'Calendar', email: 'Email' };
const LEGACY_CONNECTION = { bank: 'bank', calendar: 'calendar', email: 'gmail' };

export const PRESETS = Object.freeze([
  { preset: 'aureli', capability: 'bank', server: CONNECTORS.bank.server, label: 'Aureli', colour: 'green', tools: CONNECTORS.bank.read.slice(), id: 'bank-aureli' },
  { preset: 'google-calendar', capability: 'calendar', server: CONNECTORS.calendar.server, label: 'Google Calendar', colour: 'blue', tools: ['list_calendars', 'list_events'], id: 'calendar-google' },
  { preset: 'gmail', capability: 'email', server: CONNECTORS.gmail.server, label: 'Gmail', colour: 'red', tools: ['search_threads'], id: 'email-gmail' },
]);
export const CSV_SOURCE = Object.freeze({ id: 'bank-csv', capability: 'bank', kind: 'csv', label: 'CSV imports', colour: 'slate' });

export function presetFor(server, capability) {
  return PRESETS.find(p => p.server === server && (!capability || p.capability === capability)) || null;
}

export function sourcesFile(dataDir) { return join(resolve(dataDir), 'sources.json'); }

// ─── Validation ──────────────────────────────────────────────────────────
const ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const ACCOUNT_ID_RE = /^[A-Za-z0-9_@.:#+\-]{1,160}$/;
const CTRL = (() => {
  const r = [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]];
  const hex = (n) => n.toString(16).padStart(4, '0');
  const bs = String.fromCharCode(92);
  return new RegExp('[' + r.map(([a, b]) => bs + 'u' + hex(a) + '-' + bs + 'u' + hex(b)).join('') + ']', 'g');
})();
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export const cleanLabel = (s, max = 60) => String(s == null ? '' : s).replace(CTRL, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const isoOrNull = (s) => (typeof s === 'string' && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null);

/**
 * An iCal URL the server may fetch: https (or webcal, read as https), no
 * credentials in the authority, no IP-literal private hosts. DNS is checked
 * again at fetch time (lib/ical.mjs). Returns the normalised URL or null.
 */
export function cleanIcalUrl(u) {
  let s = String(u || '').trim();
  if (/^webcals?:\/\//i.test(s)) s = 'https://' + s.replace(/^webcals?:\/\//i, '');
  let url;
  try { url = new URL(s); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || s.length > 2000) return null;
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) return null;
  return url.href;
}
/** What the page may see of an iCal URL: the host and a hint of the path. */
export function maskUrl(u) {
  try { const url = new URL(u); return url.hostname + (url.pathname.length > 1 ? '/…' : ''); } catch { return ''; }
}

function cleanAccount(a, i) {
  if (!isObj(a)) return null;
  const id = typeof a.id === 'string' && ACCOUNT_ID_RE.test(a.id) ? a.id : null;
  if (!id) return null;
  return {
    id, name: cleanLabel(a.name || id, 80) || id,
    colour: COLOURS.includes(a.colour) ? a.colour : COLOURS[(i + 1) % COLOURS.length],
    enabled: a.enabled !== false,
    ...(typeof a.kind === 'string' && /^[a-z-]{1,20}$/.test(a.kind) ? { kind: a.kind } : {}),
    ...(a.own === true ? { own: true } : a.own === false ? { own: false } : {}),
    ...(a.renamed === true ? { renamed: true } : {}),
  };
}

/**
 * Validate one source. Returns {source, errors}. `existing` (the other
 * sources) is used for the one-server-per-capability rule.
 */
export function validateSource(input, { existing = [] } = {}) {
  const errors = [];
  const s = isObj(input) ? input : {};
  const out = {};
  out.id = typeof s.id === 'string' && ID_RE.test(s.id) ? s.id : null;
  if (!out.id) errors.push('id is missing or not valid');
  out.capability = CAPABILITIES.includes(s.capability) ? s.capability : (errors.push('capability must be bank, calendar or email'), null);
  out.kind = KINDS.includes(s.kind) ? s.kind : (errors.push('kind must be mcp, ical or csv'), null);
  out.label = cleanLabel(s.label) || (out.capability ? CAP_LABEL[out.capability] : 'Source');
  out.colour = COLOURS.includes(s.colour) ? s.colour : COLOURS[0];
  out.enabled = s.enabled !== false;
  if (out.kind === 'mcp') {
    out.server = typeof s.server === 'string' && SERVER_NAME_RE.test(s.server) ? s.server : (errors.push('server must be an MCP server name'), null);
    const p = out.server ? presetFor(out.server, out.capability) : null;
    if (p) out.preset = p.preset;
    const tools = (Array.isArray(s.tools) ? s.tools : []).map(String).map(t => (out.server && t.startsWith(mcpToolPrefix(out.server)) ? t.slice(mcpToolPrefix(out.server).length) : t));
    out.tools = [...new Set(tools)].filter(t => /^[A-Za-z0-9_.-]{1,80}$/.test(t)).slice(0, 30);
    if (p) {
      // A preset runs on its tuned adapter, whose tools are fixed in lib/claude-runner.mjs (CONNECTORS).
      out.tools = p.tools.slice();
    } else {
      const unsafe = out.tools.filter(t => toolSafety(t) === 'write');
      if (unsafe.length) errors.push(`these tools can change data and are never allowed: ${unsafe.slice(0, 3).join(', ')}`);
      if (!out.tools.length) errors.push('choose at least one read tool');
    }
    if (out.server && existing.some(o => o.id !== out.id && o.kind === 'mcp' && o.server === out.server && o.capability === out.capability)) {
      errors.push('that server is already a source for this');
    }
  } else if (out.kind === 'ical') {
    if (out.capability !== 'calendar') errors.push('iCal sources are calendars');
    out.url = cleanIcalUrl(s.url);
    if (!out.url) errors.push('the iCal link must be an https:// (or webcal://) address');
  } else if (out.kind === 'csv') {
    if (out.capability !== 'bank') errors.push('CSV sources are bank imports');
  }
  out.accounts = (Array.isArray(s.accounts) ? s.accounts : []).map(cleanAccount).filter(Boolean)
    .filter((a, i, all) => all.findIndex(b => b.id === a.id) === i).slice(0, MAX_ACCOUNTS);
  out.lastSync = isoOrNull(s.lastSync);
  out.lastError = isObj(s.lastError) ? { at: isoOrNull(s.lastError.at), code: cleanLabel(s.lastError.code, 30) || 'FAILED', message: cleanLabel(s.lastError.message, 240) } : null;
  out.createdAt = isoOrNull(s.createdAt) || new Date().toISOString();
  if (s.syncCount != null && Number.isFinite(Number(s.syncCount))) out.syncCount = Math.max(0, Math.round(Number(s.syncCount)));
  // Demo data (tools/make-fake-data.mjs): shown, never synced, never makes a capability available.
  if (s.demo === true) out.demo = true;
  return { source: out, errors };
}

export function newSourceId(capability, label) {
  const slug = cleanLabel(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'source';
  return `${capability}-${slug}-${randomBytes(2).toString('hex')}`;
}

// ─── Legacy (one Bank/Calendar/Gmail connector each) -> sources ───────────
/**
 * The sources a data folder had before sources.json existed: each preset whose
 * connector was ever checked/used (connections.json says anything but
 * unknown/never) or whose data files exist, plus the CSV source when the
 * finance folder has any imports. Used by migration 060 and, until it runs,
 * as the in-memory default.
 */
export function legacySources({ connections = {}, evidence = {}, now = new Date().toISOString() } = {}) {
  const out = [];
  for (const p of PRESETS) {
    const c = connections[LEGACY_CONNECTION[p.capability]] || {};
    const used = (c.status && !['unknown', 'not-set-up', 'missing', 'needs-claude', 'not-installed'].includes(c.status)) || evidence[p.capability];
    if (!used) continue;
    out.push({
      id: p.id, capability: p.capability, kind: 'mcp', label: p.label, server: p.server, preset: p.preset,
      tools: p.tools.slice(), colour: p.colour, enabled: true, accounts: [], lastSync: null, lastError: null, createdAt: now,
    });
  }
  // Importing a bank's CSV export always works, so that source is always there.
  out.push({ ...CSV_SOURCE, enabled: true, accounts: [], lastSync: null, lastError: null, createdAt: now });
  return out;
}

/** What exists on disk that shows a capability was in use (no content read). */
export function legacyEvidence(paths, financeDir) {
  const fin = financeDir || paths.finance;
  return {
    calendar: existsSync(join(paths.calendar, 'events.json')) || existsSync(paths.calendarFile),
    email: existsSync(join(paths.root, 'inbox', 'messages.json')) || existsSync(paths.inboxFile),
    bank: existsSync(join(fin, '_system', 'balances.json')),
    csv: existsSync(join(fin, '_system', 'transactions.csv')),
  };
}

// ─── The file ────────────────────────────────────────────────────────────
export async function readSourcesFile(dataDir, { strict = false } = {}) {
  const file = sourcesFile(dataDir);
  if (!existsSync(file)) return null;
  // strict (before a write): a file that exists but cannot be READ (locked by
  // OneDrive/antivirus) throws; treating it as empty would overwrite every source.
  const raw = await readJson(file, { fallback: null }).catch((e) => { if (strict) throw e; return null; });
  if (!raw || !Array.isArray(raw.sources)) return { version: 1, sources: [] };
  const sources = [];
  for (const s of raw.sources) {
    const { source, errors } = validateSource(s, { existing: sources });
    // A stored source that no longer validates is kept out of use (and reported once).
    if (!errors.length) sources.push(source);
  }
  return { version: 1, sources };
}

export async function writeSourcesFile(dataDir, doc) {
  const file = sourcesFile(dataDir);
  await writeJson(file, { version: 1, sources: doc.sources }, { trailingNewline: true });
}

/** Read-modify-write sources.json under its lock. fn(sources) may mutate and/or return a value. */
export async function mutateSources(dataDir, fn, { fallback } = {}) {
  const file = sourcesFile(dataDir);
  return withLock(file, async () => {
    const cur = (await readSourcesFile(dataDir, { strict: true })) || { version: 1, sources: fallback ? await fallback() : [] };
    const r = await fn(cur.sources);
    await writeSourcesFile(dataDir, cur);
    return r;
  });
}

// ─── `claude mcp list` ───────────────────────────────────────────────────
/**
 * Parse `claude mcp list` output. Lines look like
 *   claude.ai Bank: https://bank.example.com/mcp - ✔ Connected
 *   claude.ai Calendar: https://... - ! Needs authentication
 *   my-email: https://mail.example.com/mcp (HTTP) - ✔ Connected
 *   my-files: npx -y some-server /path - ✗ Failed to connect
 * Returns [{name, kind:'claude.ai'|'http'|'sse'|'stdio', host, status:
 * 'ok'|'auth'|'error'|'pending'|'unknown', statusText}]. Commands of stdio
 * servers are never returned (they can hold paths or tokens); only a host.
 */
export function parseMcpList(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^checking mcp server health/i.test(line) || /^no mcp servers/i.test(line)) continue;
    const colon = line.indexOf(': ');
    const dash = line.lastIndexOf(' - ');
    if (colon <= 0 || dash <= colon) continue;
    const name = line.slice(0, colon).trim();
    if (!SERVER_NAME_RE.test(name)) continue;
    const target = line.slice(colon + 2, dash).trim();
    const statusText = line.slice(dash + 3).replace(/^[^A-Za-z]+/, '').trim().slice(0, 60);
    const st = statusText.toLowerCase();
    const status = /^connected/.test(st) ? 'ok' : /auth/.test(st) ? 'auth' : /fail|error|disconnected|timed? ?out/.test(st) ? 'error' : /pending|connecting|starting/.test(st) ? 'pending' : 'unknown';
    let kind = 'stdio', host = '';
    const m = /^(https?:\/\/\S+)(?:\s+\((HTTP|SSE)\))?$/i.exec(target);
    if (m) {
      kind = isClaudeAiServer(name) ? 'claude.ai' : (m[2] || 'http').toLowerCase();
      try { host = new URL(m[1]).hostname; } catch { host = ''; }
    } else if (isClaudeAiServer(name)) kind = 'claude.ai';
    else {
      // stdio: show only the program's base name.
      const prog = target.split(/\s+/)[0] || '';
      host = prog.split(/[\\/]/).pop().slice(0, 40);
    }
    out.push({ name, kind, host, status, statusText });
  }
  return out;
}

/** Guess which capability a server is for, from its name and tool names. */
export function guessCapability(name, tools = []) {
  const t = (String(name) + ' ' + tools.join(' ')).toLowerCase();
  if (/calendar|event|ical|caldav|outlook.?cal/.test(t)) return 'calendar';
  if (/mail|gmail|outlook|inbox|thread|message/.test(t)) return 'email';
  if (/bank|transaction|account|finance|money|monzo|starling|plaid|aureli|truelayer|ynab/.test(t)) return 'bank';
  return null;
}

/** User-scope MCP server definitions from ~/.claude.json (read-only; never sent to the page). */
export function userServerDefs({ home = process.env.USERPROFILE || process.env.HOME || homedir(), file } = {}) {
  const f = file || join(home, '.claude.json');
  try {
    if (!existsSync(f)) return {};
    const j = JSON.parse(readFileSync(f, 'utf8'));
    const defs = {};
    for (const [name, def] of Object.entries(isObj(j.mcpServers) ? j.mcpServers : {})) if (SERVER_NAME_RE.test(name) && isObj(def)) defs[name] = def;
    return defs;
  } catch { return {}; }
}

// ─── Health + capabilities ───────────────────────────────────────────────
/**
 * The health of one source: {state:'ok'|'auth'|'error'|'off'|'unknown'|'setup', message, from}.
 *   mcp:  `claude mcp list` status for its server when we have it (primary),
 *         else the legacy probe in connections.json (presets), else its last sync
 *   ical: its last fetch
 *   csv:  always ok (importing a file needs nothing)
 * A sync that failed with a sign-in problem after the last discovery wins.
 */
export function sourceHealth(src, { servers = null, connections = {}, claudeOk = null } = {}) {
  if (!src.enabled) return { state: 'off', message: 'Switched off', from: 'user' };
  if (src.demo) return { state: 'demo', message: 'Demo data: nothing is read from any account. Remove it and add your own when you are ready.', from: 'demo' };
  if (src.kind === 'csv') return { state: 'ok', message: null, from: 'csv' };
  const errAt = src.lastError && Date.parse(src.lastError.at || '') || 0;
  const okAt = src.lastSync ? Date.parse(src.lastSync) : 0;
  const lastFailed = errAt && errAt > okAt;
  if (src.kind === 'ical') {
    if (lastFailed) return { state: 'error', message: src.lastError.message || 'The last fetch failed.', from: 'sync' };
    return { state: okAt ? 'ok' : 'unknown', message: null, from: 'sync' };
  }
  if (claudeOk === false) return { state: 'setup', message: 'Connect Claude first: this source is reached through it.', from: 'claude' };
  const authFail = lastFailed && /AUTH|NOT_SIGNED_IN/.test(src.lastError.code || '');
  const srv = Array.isArray(servers) ? servers.find(s => s.name === src.server) : null;
  if (srv) {
    if (srv.status === 'ok') {
      // `claude mcp list` can say Connected while the connector's tools answer "sign in
      // again" (seen with claude.ai Gmail): a real sync's sign-in failure wins until a later sync works.
      if (authFail) return { state: 'auth', message: src.lastError.message, from: 'sync' };
      if (lastFailed && !authFail && src.lastError.code !== 'TOOL_MISSING') return { state: 'ok', message: `Last sync failed: ${src.lastError.message}`, from: 'mcp-list' };
      return { state: 'ok', message: null, from: 'mcp-list' };
    }
    if (srv.status === 'auth') return { state: 'auth', message: `${src.label} needs you to sign in again.`, from: 'mcp-list' };
    if (srv.status === 'pending') return { state: 'unknown', message: 'Still connecting…', from: 'mcp-list' };
    return { state: 'error', message: `${src.server} ${srv.statusText ? `says: ${srv.statusText}` : 'is not working'}.`, from: 'mcp-list' };
  }
  if (Array.isArray(servers)) {
    return { state: 'setup', message: `${src.server} is not set up in Claude any more.`, from: 'mcp-list' };
  }
  // No discovery (claude missing / list failed): fall back to the old probes and the last sync.
  if (src.preset) {
    const c = connections[LEGACY_CONNECTION[src.capability]] || {};
    if (c.status === 'connected') return { state: lastFailed && authFail ? 'auth' : 'ok', message: null, from: 'probe' };
    if (c.status === 'needs-auth' || c.status === 'signed-out') return { state: 'auth', message: c.message || null, from: 'probe' };
    if (c.status && c.status !== 'unknown') return { state: c.status === 'error' ? 'error' : 'setup', message: c.message || null, from: 'probe' };
  }
  if (lastFailed) return { state: authFail ? 'auth' : 'error', message: src.lastError.message, from: 'sync' };
  return { state: okAt ? 'ok' : 'unknown', message: null, from: 'sync' };
}

/**
 * {bank, calendar, email}: {available, sources:[ids healthy], count, csv}.
 * CSV never makes "bank" available for syncing (it is a manual import), but
 * the page knows it is there.
 */
export function capabilitiesOf(sources, healthById) {
  const out = {};
  for (const cap of CAPABILITIES) {
    const mine = sources.filter(s => s.capability === cap);
    const healthy = mine.filter(s => s.enabled && !s.demo && s.kind !== 'csv' && (healthById[s.id] || {}).state === 'ok');
    out[cap] = {
      available: healthy.length > 0, sources: healthy.map(s => s.id), count: mine.filter(s => s.kind !== 'csv').length,
      enabled: mine.filter(s => s.enabled && !s.demo && s.kind !== 'csv').length, ...(cap === 'bank' ? { csv: mine.some(s => s.kind === 'csv' && s.enabled) } : {}),
    };
  }
  return out;
}

/** The page's view of a source (no URL, no tool prefixes). */
export function publicSource(s, health) {
  const { url, ...rest } = s;
  return { ...rest, ...(s.kind === 'ical' ? { urlHint: maskUrl(url) } : {}), health: health || null };
}

// ─── De-duplication across sources ───────────────────────────────────────
const evStartKey = (e) => (e.start && e.start.dateTime ? new Date(e.start.dateTime).toISOString() : e.start && e.start.date ? e.start.date + 'T00:00:00.000Z' : '');
/**
 * Events from several sources -> one list. Same iCalUID, or the same start and
 * title, is one event; the first source (list order) keeps it and `sources`
 * lists every source it came from. Events within one source are left alone
 * (lib/calendar.mjs already folded those).
 */
export function dedupeEventsAcross(groups) {
  const byKey = new Map();
  const out = [];
  for (const { sourceId, events } of groups) {
    for (const ev of events || []) {
      const keys = [...(ev.iCalUID ? ['u:' + ev.iCalUID] : []), 's:' + evStartKey(ev) + '|' + String(ev.summary || '').trim().toLowerCase()];
      const hit = keys.map(k => byKey.get(k)).find(h => h && h.sourceId !== sourceId);
      if (hit) {
        hit.sources = [...new Set([...(hit.sources || [hit.sourceId]), sourceId])];
        const extra = ev.calendars || (ev.calendarId ? [ev.calendarId] : []);
        if (extra.length) hit.calendars = [...new Set([...(hit.calendars || (hit.calendarId ? [hit.calendarId] : [])), ...extra])];
        continue;
      }
      const copy = { ...ev, sourceId };
      out.push(copy);
      for (const k of keys) if (!byKey.has(k)) byKey.set(k, copy);
    }
  }
  return out;
}

/** The de-dup key of a transaction across sources: date + amount (pence) + description + account. */
export function transactionKey(t) {
  const p = Math.round(Number(t.amount) * 100);
  return [t.date, p, String(t.description || t.memo || '').replace(/\s+/g, ' ').trim().toUpperCase(), String(t.account || t.accountId || '')].join('|');
}
export function dedupeTransactions(list) {
  const seen = new Set(); const out = [];
  for (const t of list) { const k = transactionKey(t); if (seen.has(k)) continue; seen.add(k); out.push(t); }
  return out;
}
/** Emails from several sources: one per message id (then thread id), newest first. */
export function dedupeMessages(groups) {
  const byId = new Map();
  for (const { sourceId, messages } of groups) {
    for (const m of messages || []) {
      const k = String(m.messageId || m.id);
      const prev = byId.get(k);
      if (!prev) byId.set(k, { ...m, sourceId: m.sourceId || sourceId });
      else if (prev.sourceId !== sourceId) prev.sources = [...new Set([...(prev.sources || [prev.sourceId]), sourceId])];
    }
  }
  return [...byId.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// ─── Calendar ownership ("only my stuff by default") ─────────────────────
const EMAIL_RE = /^[^\s@<>"',;:()]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
/**
 * Should a calendar start switched on? Another person's calendar (an address
 * that is not one of the user's own) starts off; the user's own, group,
 * holiday and imported calendars start on. Without any own address known,
 * everything starts on. The user's own toggles always win (in the page).
 */
export function calendarDefaultOn(cal, myEmails = []) {
  const id = String(cal && cal.id || '').toLowerCase();
  if (cal && cal.primary) return true;
  const mine = (myEmails || []).map(e => String(e).toLowerCase()).filter(Boolean);
  if (!mine.length) return true;
  if (!EMAIL_RE.test(id)) return true;                       // ical:, src:, 'primary'...
  if (/@(group|import)\.(v\.)?calendar\.google\.com$/.test(id) || /#/.test(id)) return true;
  return mine.includes(id);
}

// ─── The service (one per data folder) ───────────────────────────────────
/**
 * createSourcesService({ dataDir, paths, financeDir, log, list, run, home, now })
 *   all()                         -> sources (sources.json, or the legacy default until it exists)
 *   get(id)                       -> source | null (with url: server side only)
 *   discover({force})             -> {servers:[...], at, error?, code?}
 *   status({discover})            -> {sources:[public+health], capabilities, servers, discovery}
 *   listTools(server)             -> {server, tools:[{name, safety, selected}], status}
 *   create(input) / update(id, patch) / remove(id)
 *   noteSync(id, {ok, error, code, accounts}) bookkeeping after a sync
 *   serverDef(name)               -> the user-scope definition (for the runner)
 * `list` and `run` default to the real runner (tests pass fakes).
 */
export function createSourcesService({ dataDir, paths, financeDir = null, log = () => {}, list = listMcpServers, run = runClaude, home, now = () => Date.now(), userDefs } = {}) {
  let disc = null, discAt = 0, discP = null;
  const defs = () => (userDefs ? userDefs() : userServerDefs(home ? { home } : {}));

  async function all() {
    const doc = await readSourcesFile(dataDir);
    if (doc) return doc.sources;
    // No sources.json yet (migration 060 not applied): behave exactly as before
    // sources existed, with the three built-in connectors and CSV imports.
    return legacySources({ evidence: { bank: true, calendar: true, email: true, csv: true } }).map(s => validateSource(s).source);
  }
  async function get(id) { return (await all()).find(s => s.id === id) || null; }
  const fallback = async () => all();

  async function discover({ force = false } = {}) {
    if (!force && disc && now() - discAt < DISCOVERY_TTL_MS) return disc;
    if (discP) return discP;
    discP = (async () => {
      try {
        const r = await list();
        const servers = parseMcpList(r.text);
        // Every connector job denies the claude.ai connectors it does not use, these included.
        setDiscoveredClaudeAiServers(servers.filter(s => s.kind === 'claude.ai').map(s => s.name));
        const d = defs();
        for (const s of servers) {
          s.usable = s.kind === 'claude.ai' || !!d[s.name];
          s.capability = presetFor(s.name) ? presetFor(s.name).capability : guessCapability(s.name);
          if (presetFor(s.name)) s.preset = presetFor(s.name).preset;
          if (!s.usable) s.note = 'Only servers added for your user (claude mcp add --scope user) can be used here.';
        }
        disc = { servers, at: new Date(now()).toISOString(), ms: r.ms };
        log('note', `sources: ${servers.length} MCP servers listed`);
      } catch (e) {
        disc = { servers: null, at: new Date(now()).toISOString(), error: e.message, code: e.code || 'CLI_FAILED' };
        log('warn', `sources: listing MCP servers failed (${e.code || 'error'})`);
      }
      discAt = now();
      return disc;
    })().finally(() => { discP = null; });
    return discP;
  }

  async function healthMap(sources, { servers, claudeOk } = {}) {
    const connections = await loadConnections(dataDir).catch(() => ({}));
    const list2 = Array.isArray(servers) ? Object.assign(servers.slice(), { at: disc ? Date.parse(disc.at) : 0 }) : null;
    const out = {};
    for (const s of sources) out[s.id] = sourceHealth(s, { servers: list2, connections, claudeOk });
    return out;
  }

  async function status({ discover: doDiscover = true, force = false, claudeOk = null } = {}) {
    const sources = await all();
    // 'cached': answer at once from the last list (refreshing it in the background when old).
    let d;
    if (doDiscover === 'cached' && disc) { if (now() - discAt >= DISCOVERY_TTL_MS) discover().catch(() => {}); d = disc; }
    else d = doDiscover ? await discover({ force }) : (disc || { servers: null });
    const health = await healthMap(sources, { servers: d.servers, claudeOk: d.code === 'CLI_MISSING' ? false : claudeOk });
    return {
      sources: sources.map(s => publicSource(s, health[s.id])),
      capabilities: capabilitiesOf(sources, health),
      servers: d.servers, discovery: { at: d.at || null, error: d.error || null, code: d.code || null },
      persisted: existsSync(sourcesFile(dataDir)),
    };
  }

  // Own keys only: a source named "constructor" or "toString" must not pick up Object.prototype.
  function serverDef(name) { const d = defs(); return Object.hasOwn(d, String(name)) && isObj(d[name]) ? d[name] : null; }

  /** The tools a server offers, classified. One `claude -p` that stops at its init event (no model turn). */
  async function listTools(server) {
    if (!SERVER_NAME_RE.test(String(server || ''))) throw new ClaudeError('BAD_REQUEST', 'unknown server');
    const def = isClaudeAiServer(server) ? null : serverDef(server);
    if (!isClaudeAiServer(server) && !def) throw new ClaudeError('BAD_REQUEST', `"${String(server).slice(0, 40)}" is not a user-scope MCP server, so the dashboard cannot load it on its own.`);
    const others = ((disc && disc.servers) || []).filter(s => s.kind === 'claude.ai').map(s => s.name);
    let r;
    for (let attempt = 1; attempt <= 2; attempt++) {
      r = await run({ profile: 'source-tools', source: { server, label: server }, mcpServer: def, denyServers: others, prompt: 'List tools.', model: 'claude-haiku-4-5' });
      if ((r.tools || []).length || attempt === 2) break;
      await new Promise(res => setTimeout(res, 1500));     // a connector still loading lists nothing yet
    }
    const p = presetFor(server);
    const tools = (r.tools || []).slice(0, 200).map(name => {
      const safety = toolSafety(name);
      return { name, safety, selected: safety === 'read' && (!p || p.tools.includes(name)) };
    });
    tools.sort((a, b) => (a.safety === 'write') - (b.safety === 'write') || a.name.localeCompare(b.name));
    return { server, status: r.status || null, tools, capability: p ? p.capability : guessCapability(server, tools.map(t => t.name)) };
  }

  async function create(input) {
    return mutateSources(dataDir, (sources) => {
      if (sources.length >= MAX_SOURCES) throw Object.assign(new Error('Too many sources.'), { status: 400 });
      const p = input && input.kind === 'mcp' ? presetFor(input.server, input.capability) : null;
      const id = p && !sources.some(s => s.id === p.id) ? p.id : newSourceId(input && input.capability, input && (input.label || input.server));
      const { source, errors } = validateSource({ ...input, id, createdAt: new Date(now()).toISOString(), lastSync: null, lastError: null }, { existing: sources });
      if (errors.length) throw Object.assign(new Error(errors.join('; ')), { status: 400 });
      sources.push(source);
      log('note', `sources: added a ${source.capability} source (${source.kind})`);
      return source;
    }, { fallback });
  }

  async function update(id, patch = {}) {
    return mutateSources(dataDir, (sources) => {
      const i = sources.findIndex(s => s.id === id);
      if (i < 0) throw Object.assign(new Error('unknown source'), { status: 404 });
      const cur = sources[i];
      const next = { ...cur };
      for (const k of ['label', 'colour', 'enabled', 'tools', 'url']) if (k in patch) next[k] = patch[k];
      if (Array.isArray(patch.accounts)) {
        // Only names, colours, on/off and "mine" of known accounts can change here.
        next.accounts = cur.accounts.map(a => {
          const p = patch.accounts.find(x => x && x.id === a.id);
          return p ? { ...a, ...(p.name != null ? { name: p.name, renamed: true } : {}), ...(p.colour ? { colour: p.colour } : {}), ...(p.enabled != null ? { enabled: p.enabled !== false } : {}), ...(p.own != null ? { own: !!p.own } : {}) } : a;
        });
      }
      if (cur.kind === 'ical' && !('url' in patch)) next.url = cur.url;
      const { source, errors } = validateSource(next, { existing: sources });
      if (errors.length) throw Object.assign(new Error(errors.join('; ')), { status: 400 });
      sources[i] = source;
      return source;
    }, { fallback });
  }

  async function remove(id) {
    return mutateSources(dataDir, (sources) => {
      const i = sources.findIndex(s => s.id === id);
      if (i < 0) throw Object.assign(new Error('unknown source'), { status: 404 });
      const [gone] = sources.splice(i, 1);
      log('note', `sources: removed a ${gone.capability} source`);
      return { removed: gone.id };
    }, { fallback });
  }

  /**
   * After a sync: lastSync/lastError, and the accounts it saw (new ones are
   * added, names refreshed unless the user renamed them, nothing removed).
   */
  async function noteSync(id, { ok, error, code, accounts } = {}) {
    try {
      await mutateSources(dataDir, (sources) => {
        const s = sources.find(x => x.id === id);
        if (!s) return;
        const at = new Date(now()).toISOString();
        if (ok) { s.lastSync = at; s.syncCount = (s.syncCount || 0) + 1; if (s.lastError && Date.parse(s.lastError.at) < Date.parse(at)) s.lastError = null; }
        else s.lastError = { at, code: cleanLabel(code || 'FAILED', 30), message: cleanLabel(error || 'The sync failed.', 240) };
        for (const a of Array.isArray(accounts) ? accounts : []) {
          if (!a || typeof a.id !== 'string' || !ACCOUNT_ID_RE.test(a.id)) continue;
          const have = s.accounts.find(x => x.id === a.id);
          if (have) { if (!have.renamed && a.name) have.name = cleanLabel(a.name, 80) || have.name; continue; }
          if (s.accounts.length >= MAX_ACCOUNTS) continue;
          // The first account wears the source's own colour; later ones get the next swatches.
          const colour = COLOURS.includes(a.colour) ? a.colour : s.accounts.length === 0 ? s.colour : COLOURS[(COLOURS.indexOf(s.colour) + s.accounts.length) % COLOURS.length];
          s.accounts.push(cleanAccount({ ...a, colour, enabled: a.enabled !== false }, s.accounts.length));
        }
        const { source } = validateSource(s, { existing: sources.filter(x => x !== s) });
        Object.assign(s, source);
      }, { fallback });
    } catch (e) { log('warn', `sources: could not record a sync (${e.code || e.message})`); }
  }

  return { all, get, discover, status, listTools, create, update, remove, noteSync, serverDef, healthMap, cached: () => disc };
}

/** The sources a demo data folder starts with: its fake calendar and inbox, and CSV imports. */
export function demoSources(now = new Date().toISOString()) {
  const base = { enabled: true, demo: true, accounts: [], lastSync: null, lastError: null, createdAt: now };
  return [
    { ...base, id: 'calendar-google', capability: 'calendar', kind: 'mcp', server: CONNECTORS.calendar.server, label: 'Demo calendar', colour: 'blue' },
    { ...base, id: 'email-gmail', capability: 'email', kind: 'mcp', server: CONNECTORS.gmail.server, label: 'Demo mailbox', colour: 'red' },
    { ...CSV_SOURCE, ...base, demo: false },
  ].map(s => validateSource(s).source);
}

/** One service per data folder, shared by every route file (they load in name order). */
export function sourcesFor(ctx) {
  if (!ctx.sources) ctx.sources = createSourcesService({ dataDir: ctx.dataDir, paths: ctx.paths, financeDir: ctx.financeDir, log: ctx.log });
  return ctx.sources;
}

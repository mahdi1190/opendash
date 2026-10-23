// lib/accounts.mjs - the Node binding of the accounts core (docs/dev/ACCOUNTS.md).
//
// The pure core (lib/accounts/core.mjs) and providers (lib/accounts/*.mjs) get
// their adapters here:
//   registry   <data>/accounts.json (lib/accounts-file.mjs): no secrets, travels with the data
//   secrets    secretStore(dataDir) (lib/secret-store.mjs): keys accounts/<id>, on THIS computer
//   redirect   http://localhost:<port>/api/accounts/callback (the local server)
//   deviceId   ensureHostId(dataDir) (lib/devicedir.mjs): the fetcher role
//   fetcher    the sync engine's isFetcher / takeOver (lib/sync/engine.mjs, app.ctx.sync;
//              the rule of lib/sync/roles.mjs, sync on or off); no engine: the record
//
// And it keeps the sources in step: every account owns one email and one
// calendar source (kind = provider, account = id) in <data>/sources.json, on
// or off with features.mail / features.calendar. Removing an account removes
// its sources and their snapshots. The source ids are recorded on the account
// (`sources: {mail, calendar}`), so a computer that receives the registry
// through folder sync makes its sources with the same ids and shows the
// snapshots the fetcher publishes (reconcileAccountSources).
//
// migrateLegacyMicrosoft() turns the single Microsoft connection of earlier
// versions (secret microsoft-tokens + kind:'microsoft' sources) into one
// account, once (also tools/migrations/090-accounts.mjs).
//
// Node stdlib only.

import { promises as fsp, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { secretStore } from './secret-store.mjs';
import { ensureHostId } from './devicedir.mjs';
import { fileRegistry, readAccountsFile, accountsFile } from './accounts-file.mjs';
import { readJson } from './fsutil.mjs';
import { createAccounts, loopbackRedirect, sha256Hex, cleanEmail, validateAccount, fail, SOURCE_ID_RE } from './accounts/core.mjs';
import { createMicrosoftProvider, guessKind } from './accounts/microsoft.mjs';
import { shippedMicrosoftClientId, isClientId } from './accounts/shipped.mjs';
import { migrateLegacyGoogle, googleConfig } from './accounts-google.mjs';
import { createImapProvider } from './accounts/imap.mjs';
import { imapProviderConfig } from './accounts-imap.mjs';
import { mutateSources, readSourcesFile, validateSource, newSourceId, COLOURS, ACCOUNT_KINDS } from './sources.mjs';

const FEATURE_CAP = { mail: 'email', calendar: 'calendar' };
const CAP_FEATURE = { email: 'mail', calendar: 'calendar' };
const PROVIDER_COLOUR = { microsoft: 'blue', google: 'red', imap: 'teal' };
const PROVIDER_SLUG = { microsoft: 'outlook', google: 'google', imap: 'mail' };
const LEGACY_SCOPES = ['User.Read', 'Mail.Read', 'Calendars.Read'];
export const MICROSOFT_APP_KEY = 'microsoft-client';
export const CALLBACK_PATH = '/api/accounts/callback';
export const LEGACY_CALLBACK_PATH = '/api/microsoft/callback';

// Extra providers (Google, built against the same contract) register here.
const extraProviders = {};
const extraConfig = {};
/** registerProvider('google', createGoogleProvider, config | ({store}) => config) */
export function registerProvider(name, factory, config = {}) { extraProviders[name] = factory; extraConfig[name] = config; }
/**
 * lib/accounts/<name>.mjs for providers other than Microsoft (Google, later
 * IMAP), loaded when present: it exports create<Name>Provider(ctx) and,
 * optionally, <name>Config({store}) -> the provider's config (e.g. clientId()).
 */
const OPTIONAL = [['google', 'createGoogleProvider', 'googleConfig'], ['imap', 'createImapProvider', 'imapConfig']];
let optionalLoaded = null;
function loadOptionalProviders(log = () => {}) {
  if (optionalLoaded) return optionalLoaded;
  optionalLoaded = (async () => {
    for (const [name, factory, config] of OPTIONAL) {
      if (extraProviders[name]) continue;
      try {
        const m = await import(`./accounts/${name}.mjs`);
        if (typeof m[factory] === 'function') registerProvider(name, m[factory], typeof m[config] === 'function' ? m[config] : {});
      } catch (e) { if (e && e.code !== 'ERR_MODULE_NOT_FOUND') log('warn', `accounts: the ${name} provider could not load (${e.code || 'error'})`); }
    }
  })();
  return optionalLoaded;
}

// ─── The user's own Microsoft app (Advanced) ─────────────────────────────
export async function readMicrosoftApp(store) {
  const v = await store.get(MICROSOFT_APP_KEY).catch(() => null);
  return v && isClientId(v.clientId) ? v : null;
}
/** Save (or with null, forget) the user's own Microsoft application (client) ID. */
export async function writeMicrosoftApp(store, clientId) {
  if (clientId == null || clientId === '') { await store.delete(MICROSOFT_APP_KEY); return null; }
  const id = String(clientId).trim().toLowerCase();
  if (!isClientId(id)) throw fail('BAD_REQUEST', 'That does not look like an application (client) ID. It looks like 00000000-0000-0000-0000-000000000000.', 400);
  await store.set(MICROSOFT_APP_KEY, { clientId: id });
  return { clientId: id };
}

// ─── Sources owned by accounts ───────────────────────────────────────────
function freeColour(list, provider) {
  const used = new Set(list.filter((s) => s.account).map((s) => s.colour));
  const first = PROVIDER_COLOUR[provider] || 'blue';
  if (!used.has(first)) return first;
  return COLOURS.find((c) => !used.has(c)) || first;
}
const snapshotFile = (root, s) => (s.capability === 'calendar' ? join(root, 'calendar', 'sources', s.id + '.json') : join(root, 'inbox', 'sources', s.id + '.json'));
/**
 * Make sure the account has its email + calendar sources, on/off as its
 * features say. A source id recorded on the account (`account.sources`, from
 * the computer that connected it) is used for a new source, and a source of
 * this account under another id takes the recorded one (its old snapshot file
 * goes), so every computer names the account's snapshots the same.
 */
export async function syncAccountSources(dataDir, account) {
  const recorded = (account && account.sources) || {};
  const dropped = [];
  const r = await mutateSources(dataDir, (list) => {
    const made = [];
    for (const feature of ['mail', 'calendar']) {
      const capability = FEATURE_CAP[feature];
      const have = list.find((s) => s.account === account.id && s.capability === capability);
      const on = account.features[feature] !== false;
      const rec = SOURCE_ID_RE.test(String(recorded[feature] || '')) && !list.some((s) => s.id === recorded[feature]) ? recorded[feature] : null;
      if (have) {
        have.enabled = on;
        if (rec && have.id !== rec) { dropped.push({ ...have }); have.id = rec; }
        continue;
      }
      if (!on) continue;
      const colour = list.find((s) => s.account === account.id)?.colour || freeColour(list, account.provider);
      const input = { id: rec || newSourceId(capability, PROVIDER_SLUG[account.provider] || 'mail'), capability, kind: account.provider, account: account.id,
        label: account.email, colour, enabled: true, accounts: [], createdAt: new Date().toISOString() };
      const { source, errors } = validateSource(input, { existing: list });
      if (errors.length) throw fail('PROVIDER_RESPONSE', 'The account\'s mail and calendar could not be set up.', 500);
      list.push(source); made.push(source);
    }
    return { made, sources: list.filter((s) => s.account === account.id).map((s) => ({ ...s })) };
  });
  const root = resolve(dataDir);
  for (const s of dropped) await fsp.unlink(snapshotFile(root, s)).catch(() => {});
  return r;
}

/** {mail, calendar}: the ids of the account's sources (for the record). */
const sourceIdsOf = (sources) => {
  const out = {};
  for (const s of sources || []) { const f = CAP_FEATURE[s.capability]; if (f && !out[f]) out[f] = s.id; }
  return out;
};
/**
 * Record the account's source ids on its registry entry. Only fills in what is
 * missing: an id already recorded is never replaced (another computer may
 * already name its snapshots after it), so two computers never fight over it.
 */
export async function recordSourceIds(dataDir, accountId, sources) {
  const ids = sourceIdsOf(sources);
  const cur = (await readAccountsFile(dataDir)).find((a) => a.id === accountId);
  if (!cur || Object.keys(ids).every((k) => cur.sources && cur.sources[k])) return false;
  return fileRegistry(dataDir).mutate((list) => {
    const a = list.find((x) => x && x.id === accountId);
    if (!a) return false;
    const have = a.sources && typeof a.sources === 'object' ? a.sources : {};
    const next = { ...ids, ...have };
    if (Object.keys(next).every((k) => have[k] === next[k])) return false;
    a.sources = next;
    return true;
  });
}

/**
 * Bring this computer's account sources in line with the registry: every
 * account gets its sources (with the recorded ids), and the sources of an
 * account that is no longer in the registry (removed here or on another
 * computer, the registry arriving through folder sync) go with their
 * snapshots. Nothing is removed while accounts.json is missing or unreadable.
 * Returns {made, recorded, removed}.
 */
export async function reconcileAccountSources(dataDir, { log = () => {} } = {}) {
  const out = { made: 0, recorded: 0, removed: 0 };
  const file = accountsFile(dataDir);
  if (!existsSync(file)) return out;
  const raw = await readJson(file, { fallback: null }).catch(() => null);
  if (!raw || !Array.isArray(raw.accounts)) return out;
  const accounts = await readAccountsFile(dataDir);
  const doc = (await readSourcesFile(dataDir).catch(() => null)) || { sources: [] };
  for (const a of accounts) {
    const mine = doc.sources.filter((s) => s.account === a.id);
    const needs = ['mail', 'calendar'].some((f) => {
      const s = mine.find((x) => x.capability === FEATURE_CAP[f]);
      const on = a.features[f] !== false;
      return s ? s.enabled !== on || !!(a.sources && a.sources[f] && a.sources[f] !== s.id) : on;
    });
    const sources = needs ? (await syncAccountSources(dataDir, a)).sources : mine;
    if (needs) out.made++;
    if (await recordSourceIds(dataDir, a.id, sources)) out.recorded++;
  }
  const known = new Set(accounts.map((a) => a.id));
  const gone = [...new Set(doc.sources.filter((s) => s.account && ACCOUNT_KINDS.includes(s.kind) && !known.has(s.account)).map((s) => s.account))];
  for (const id of gone) out.removed += (await removeAccountSources(dataDir, id)).length;
  if (out.made || out.removed) log('info', `accounts: sources brought in line with the account list (${out.made} account(s) set up, ${out.removed} source(s) of removed accounts gone)`);
  return out;
}

/** Remove an account's sources and their saved snapshots. */
export async function removeAccountSources(dataDir, accountId) {
  const gone = await mutateSources(dataDir, (list) => {
    const out = [];
    for (let i = list.length - 1; i >= 0; i--) if (list[i].account === accountId) out.push(...list.splice(i, 1));
    return out;
  });
  const root = resolve(dataDir);
  for (const s of gone) await fsp.unlink(snapshotFile(root, s)).catch(() => {});
  return gone.map((s) => s.id);
}

// ─── Migration from the single Microsoft connection ──────────────────────
/**
 * The old single Microsoft connection -> one account (docs/dev/ACCOUNTS.md section 10).
 * Idempotent. opts: {store, deviceId, dryRun, log}. Returns {status, accountId?, sources}.
 */
export async function migrateLegacyMicrosoft(dataDir, { store = secretStore(dataDir), deviceId = null, dryRun = false, log = () => {} } = {}) {
  const t = await store.get('microsoft-tokens').catch(() => null);
  const doc = await readSourcesFile(dataDir).catch(() => null);
  const legacySources = (doc ? doc.sources : []).filter((s) => s.kind === 'microsoft' && !s.account);
  if (!t || !t.refresh_token) return { status: 'none', sources: legacySources.length };
  const email = cleanEmail(t.account);
  if (!email) { log('warn', 'accounts: the old Microsoft sign-in has no address; it needs signing in again'); return { status: 'skipped', reason: 'no address', sources: legacySources.length }; }
  const id = 'acc_' + (await sha256Hex('legacy-microsoft|' + (t.accountId || email))).slice(0, 16);
  if (dryRun) return { status: 'dry-run', accountId: id, sources: legacySources.length };
  const registry = fileRegistry(dataDir);
  const known = (await readAccountsFile(dataDir)).some((a) => a.id === id);
  if (!(await store.get('accounts/' + id).catch(() => null))) {
    await store.set('accounts/' + id, { provider: 'microsoft', clientId: t.clientId, authority: 'common', access_token: t.access_token || null, refresh_token: t.refresh_token,
      expires_at: Number(t.expires_at) || 0, scope: LEGACY_SCOPES, needsAuth: !!t.needsAuth, migrated: true });
  }
  if (!known) {
    const email_ = legacySources.find((s) => s.capability === 'email'), cal = legacySources.find((s) => s.capability === 'calendar');
    const last = legacySources.map((s) => s.lastSync).filter(Boolean).sort().pop() || null;
    const now = new Date().toISOString();
    const { account, errors } = validateAccount({ id, provider: 'microsoft', email, displayName: '', kind: guessKind(email), scopes: LEGACY_SCOPES,
      features: { mail: email_ ? email_.enabled !== false : true, calendar: cal ? cal.enabled !== false : true },
      status: t.needsAuth ? 'needs-sign-in' : 'connected', lastSync: last, fetcher: deviceId, legacy: true, createdAt: now, updatedAt: now });
    if (errors.length) return { status: 'skipped', reason: errors.join('; '), sources: legacySources.length };
    await registry.mutate((list) => { if (!list.some((a) => a && a.id === id)) list.push(account); });
  }
  // The sources keep their ids (and so their snapshots and message ids).
  if (legacySources.length) await mutateSources(dataDir, (list) => { for (const s of list) if (s.kind === 'microsoft' && !s.account) s.account = id; });
  // A pasted client ID from the old set-up was registered with the old return address.
  const app = await readMicrosoftApp(store);
  if (app && !app.legacyRedirect) await store.set(MICROSOFT_APP_KEY, { ...app, legacyRedirect: true });
  await store.delete('microsoft-tokens');
  log('note', `accounts: the Microsoft connection is now an account (${legacySources.length} source(s) kept)`);
  return { status: 'done', accountId: id, sources: legacySources.length };
}

// ─── The service ─────────────────────────────────────────────────────────
/**
 * createAccountsService({dataDir, port: () => number, log, fetchFn, now, deviceId, store, imap, sync})
 *   imap: providerConfig.imap overrides (tests: the fake server's transport)
 *   sync: the folder-sync engine, or () => engine (server: app.ctx.sync). It
 *         decides which computer reads each account (isFetcher; sync on or off:
 *         lib/sync/roles.mjs) and moves that job (takeOver); no engine: the record.
 * -> the core service (docs/dev/ACCOUNTS.md section 8), ready() first, plus:
 *    providersInfo(), microsoftApp.{get,set}, googleApp.{get,set}, imapLookup(email), readsHere(sources), sourcesFor(id),
 *    reconcileSources()
 */
export function createAccountsService({ dataDir, port = () => 4173, log = () => {}, fetchFn = globalThis.fetch, now = () => Date.now(), deviceId, store, imap, sync = null } = {}) {
  if (!dataDir) throw new Error('createAccountsService needs a data folder');
  const secrets = store || secretStore(dataDir);
  const hostId = deviceId || ensureHostId(dataDir);
  let app = null;            // the user's own Microsoft app, read in ready()
  const getPort = typeof port === 'function' ? port : () => port;
  const redirect = (name) => loopbackRedirect({ port: getPort(), path: name === 'microsoft' && app && app.legacyRedirect ? LEGACY_CALLBACK_PATH : CALLBACK_PATH });
  const microsoftClientId = async () => (app && app.clientId) || shippedMicrosoftClientId();
  const hooks = {
    async changed(event, account) {
      if (event === 'connected' || event === 'features') await recordSourceIds(dataDir, account.id, (await syncAccountSources(dataDir, account)).sources);
      else if (event === 'removed') await removeAccountSources(dataDir, account.id);
    },
  };
  // Who reads an account: the one rule of lib/sync/roles.mjs through the sync
  // engine's fetcher API (server: always there, sync on or off; it also knows
  // the main computer). No engine (a tool, a test): the record alone.
  const engine = () => {
    const s = typeof sync === 'function' ? sync() : sync;
    return s && typeof s.isFetcher === 'function' ? s : null;
  };
  const syncOn = () => { const s = engine(); return s && s.enabled ? s : null; };
  const fetcher = {
    async isFetcher(id, a) {
      const s = engine();
      if (!s) return null;
      // An account nobody reads yet is only taken by a computer that holds its sign-in.
      if (a && !a.fetcher && !(await core.vault.read(id).catch(() => null))) return false;
      return s.isFetcher(id);
    },
    takeOver: async (id, { hasToken }) => { const s = engine(); return s ? s.takeOver(id, { hasToken }) : null; },
  };
  const core = createAccounts({
    registry: fileRegistry(dataDir), secrets,
    // Looked up when first used, so a provider registered later (registerProvider) is found too.
    providers: Object.assign(Object.create(extraProviders), { microsoft: createMicrosoftProvider, imap: createImapProvider }),
    // A config may be a function ({store}) -> config: each data folder gets its own.
    providerConfig: new Proxy({ microsoft: { clientId: microsoftClientId }, imap: imapProviderConfig(imap) }, { get: (t, k) => (k in t ? t[k] : typeof extraConfig[k] === 'function' ? extraConfig[k]({ store: secrets }) : extraConfig[k]) }),
    redirect, fetch: fetchFn, now, deviceId: hostId, log, hooks, fetcher,
  });
  let readyP = null;
  const ready = () => readyP || (readyP = (async () => {
    // A provider module built on the same contract (lib/accounts/google.mjs) joins on its own.
    await loadOptionalProviders(log);
    try { await migrateLegacyMicrosoft(dataDir, { store: secrets, deviceId: hostId, log }); }
    catch (e) { log('warn', `accounts: moving the old Microsoft connection failed (${e && (e.code || e.message)})`); readyP = null; }
    app = await readMicrosoftApp(secrets);
    // The single Google connection of earlier versions (secret google-tokens) -> one account.
    try { await migrateLegacyGoogle({ store: secrets, registry: fileRegistry(dataDir), deviceId: hostId, now, log, hooks }); }
    catch (e) { log('warn', `accounts: moving the old Google connection failed (${e && (e.code || e.message)})`); readyP = null; }
    // Accounts that arrived from another computer (folder sync) get their sources here.
    try { await reconcileAccountSources(dataDir, { log }); }
    catch (e) { log('warn', `accounts: the account sources could not be checked (${e && (e.code || e.message)})`); }
  })());
  const wrap = (fn) => async (...args) => { await ready(); return fn(...args); };
  // A provider counts as available when its module is there and says it is set up.
  const configuredOk = async (name) => {
    if (!extraProviders[name]) return false;
    try { const p = core.provider(name); return typeof p.configured === 'function' ? !!(await p.configured()).ok : true; } catch { return false; }
  };
  const svc = {};
  for (const k of ['list', 'get', 'all', 'begin', 'callback', 'pause', 'resume', 'setFeatures', 'remove', 'isFetcher', 'fetchHere', 'accessToken', 'fetchMail', 'fetchCalendar', 'approvalHelp', 'noteResult', 'connect', 'hasSignIn']) svc[k] = wrap(core[k]);
  // "Home PC checks this account": the fetcher's name, when sync knows it.
  svc.list = wrap(async () => {
    const out = await core.list();
    const s = syncOn();
    if (s && typeof s.fetcher === 'function') {
      for (const a of out) if (a.here && !a.here.fetcher) { try { const f = s.fetcher(a.id); if (f && f.deviceId && f.name) a.here.fetcherName = String(f.name).slice(0, 60); } catch { /* the name is only a nicety */ } }
    }
    return out;
  });
  return Object.assign(svc, {
    ready, deviceId: hostId, core,
    /** Sources in line with the registry (after folder sync brought a new accounts.json). */
    reconcileSources: async () => { await ready(); return reconcileAccountSources(dataDir, { log }); },
    async providersInfo() {
      await ready();
      const shipped = shippedMicrosoftClientId();
      return {
        microsoft: { available: !!(app || shipped), custom: !!app, builtIn: !!shipped, callback: `http://localhost${app && app.legacyRedirect ? LEGACY_CALLBACK_PATH : CALLBACK_PATH}` },
        google: { ...(await googleConfig({ store: secrets }).describe()), available: await configuredOk('google') },
        imap: { available: await configuredOk('imap'), comingSoon: !(await configuredOk('imap')) },
      };
    },
    googleApp: {
      get: async () => { await ready(); return googleConfig({ store: secrets }).describe(); },
      /** input: Google's JSON, {clientId, clientSecret} or a bare client ID; null = the built-in app. */
      async set(input) { await ready(); return googleConfig({ store: secrets }).save(input); },
    },
    microsoftApp: {
      get: async () => { await ready(); return app ? { clientId: app.clientId } : null; },
      async set(clientId) { await ready(); app = await writeMicrosoftApp(secrets, clientId); return app; },
    },
    /** The account-backed sources THIS computer should read now (paused, waiting, elsewhere: skipped). */
    async readsHere(sources) {
      const list = await svc.all();
      const out = [];
      for (const s of sources) {
        if (!['microsoft', 'google', 'imap'].includes(s.kind)) { out.push(s); continue; }
        const a = s.account && list.find((x) => x.id === s.account);
        if (!a || a.status !== 'connected' || a.features[CAP_FEATURE[s.capability]] === false) continue;
        // Only the account's fetcher reads it (folder sync's choice while sync is on).
        if (await core.fetchesHere(a)) out.push(s);
      }
      return out;
    },
    /** "+ Other email": which service an address belongs to, and its steps (no secrets). */
    async imapLookup(email) { await ready(); return core.provider('imap').lookup(email); },
    async sourcesOf(accountId) {
      const doc = await readSourcesFile(dataDir).catch(() => null);
      return (doc ? doc.sources : []).filter((s) => s.account === accountId);
    },
  });
}

const services = new Map();
/** One service per data folder (route files share it). ctx: the server ctx, or {dataDir, port}. */
export function accountsFor(ctx) {
  if (ctx.accounts) return ctx.accounts;
  const dataDir = resolve(ctx.dataDir);
  if (!services.has(dataDir)) {
    // The server's ctx (with its port and log) may arrive after a plain {dataDir} caller.
    const holder = { ctx: null };
    const svc = createAccountsService({ dataDir, port: () => (holder.ctx && holder.ctx.port) || 4173, log: (...a) => (holder.ctx && holder.ctx.log ? holder.ctx.log(...a) : undefined),
      // Folder sync (server/routes/sync.mjs sets ctx.sync), looked up at each use.
      sync: () => (holder.ctx && holder.ctx.sync) || null });
    services.set(dataDir, { svc, holder });
  }
  const { svc, holder } = services.get(dataDir);
  if (ctx && typeof ctx === 'object' && 'port' in ctx) { holder.ctx = ctx; ctx.accounts = svc; }
  return svc;
}
/** Tests: forget the shared services. */
export function resetAccountsServices() { services.clear(); }

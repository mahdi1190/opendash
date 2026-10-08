// lib/fin-connect/index.mjs - direct finance connections (Monzo, Plasma One,
// Enable Banking): the provider registry, one service per data folder, and the
// glue into the normal finance update. Design: docs/dev/FINANCE_CONNECTIONS.md.
//
//   finConnectFor(appCtx) -> service (cached on appCtx.finConnect)
//   createFinConnect({dataDir, financeDir, log, getConfig, port, fetchFn, fx, fakes, env, now, sources})
//
// service:
//   ready()                       loads the providers (lazy; a provider file that
//                                 is not there yet is skipped)
//   provider(id) / providers()    the loaded provider objects
//   ctxFor(id)                    the ctx a provider method gets (section 3.2)
//   fetchDirect(source, opts)     what server/routes/finance.mjs calls for kind 'direct':
//                                 -> {rows, accounts, balances, rejected, warning?}
//   health(source)                -> {state, message, code} for lib/sources.mjs
//   catalogue()                   GET /api/fin-connect/providers
//   accounts()                    GET /api/fin-connect/accounts
//   patchAccount(key, patch)      PATCH /api/fin-connect/accounts/:key
//   requestSync(id)               a finance update for that source only, manual: true (retries while busy)
//   disconnect(id, {removeData})  revoke, delete secrets, remove the source (rows kept or removed)
//   undoRemove(token)             puts removed rows back
//   createSource / updateSource / removeSource / getSource   sources.json helpers
//   readCursor(id) / writeCursor(id, obj)   <finance>/_system/connectors/<id>.json
//   fake(id)                      the test-only fake of a provider, or null
//
// Fake modes (tests and screenshots only): DASHBOARD_MONZO_FAKE=1,
// DASHBOARD_PLASMA_FAKE=1, DASHBOARD_ENABLEBANKING_FAKE=1 load
// tests/fixtures/fin-fake-<provider>.mjs, whose createFake() returns
// {fetchFn, settings(), configure(patch)}; the provider's http client then
// talks to that instead of the network (same URLs, same allowlist).
//
// Logs: provider, op, ms, counts and codes. Never tokens, ids, addresses,
// amounts, memos or URLs with queries.

import { join, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, writeJson, withLock, atomicWrite } from '../fsutil.mjs';
import { mutateSources, validateSource, newSourceId, readSourcesFile, setDirectHealth, COLOURS } from '../sources.mjs';
import { parseStore, storeCsv } from '../finance/store.mjs';
import { createRates } from '../travel-rates.mjs';
import { readOnlyClient } from './http.mjs';
import { secretsFor } from './secrets.mjs';
import { finishRows } from './normalise.mjs';
import { findDuplicates } from './overlap.mjs';
import { FinError, AUTH_CODES, PROVIDER_IDS, defineProvider } from './provider.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
export const PROVIDER_FILES = Object.freeze({ monzo: 'monzo.mjs', plasma: 'plasma.mjs', 'enable-banking': 'enable-banking.mjs' });
export const FAKES = Object.freeze({
  monzo: { env: 'DASHBOARD_MONZO_FAKE', file: 'fin-fake-monzo.mjs' },
  plasma: { env: 'DASHBOARD_PLASMA_FAKE', file: 'fin-fake-plasma.mjs' },
  'enable-banking': { env: 'DASHBOARD_ENABLEBANKING_FAKE', file: 'fin-fake-enablebanking.mjs' },
});
export const PROVIDER_LABEL = Object.freeze({ monzo: 'Monzo', plasma: 'Plasma One', 'enable-banking': 'Enable Banking', aureli: 'Aureli', mcp: 'Other connector', csv: 'CSV imports' });
const ACC_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DUP_DAYS = 60;

let providerLoad = null;
const loaded = new Map();
/** Load every provider file that exists (once per process). */
export async function loadProviders(log = () => {}) {
  if (!providerLoad) providerLoad = (async () => {
    for (const id of PROVIDER_IDS) {
      const file = join(HERE, PROVIDER_FILES[id]);
      if (!existsSync(file)) continue;
      try {
        const mod = await import(pathToFileURL(file).href);
        loaded.set(id, defineProvider(mod.default));
      } catch (e) { log('warn', `fin-connect: provider ${id} did not load (${String(e && e.message || e).slice(0, 120)})`); }
    }
    return loaded;
  })();
  return providerLoad;
}

/** One service per app context (every route file shares app.ctx). */
export function finConnectFor(appCtx) {
  if (!appCtx.finConnect) {
    appCtx.finConnect = createFinConnect({
      dataDir: appCtx.dataDir, financeDir: appCtx.financeDir, log: appCtx.log, getConfig: appCtx.getConfig,
      port: appCtx.port, paths: appCtx.paths, appCtx,
    });
  }
  return appCtx.finConnect;
}

const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

export function createFinConnect({
  dataDir, financeDir = null, log = () => {}, getConfig = () => ({}), port = 0, paths = null,
  fetchFn = globalThis.fetch, fx = null, fakes = null, env = process.env, now = () => Date.now(),
  startUpdate = null, appCtx = null,
} = {}) {
  const root = resolve(dataDir);
  const finDir = () => resolve(financeDir || (appCtx && appCtx.financeDir) || join(root, 'finance'));
  const secrets = secretsFor(root);
  const fakeObjs = new Map(Object.entries(fakes || {}));
  const mem = new Map();          // provider id -> in-memory state object (per data folder)
  let rates = null;
  const cfg = () => { try { return (typeof getConfig === 'function' && getConfig()) || {}; } catch { return {}; } };
  const home = () => (typeof cfg().currency === 'string' && /^[A-Z]{3}$/.test(cfg().currency) ? cfg().currency : 'GBP');
  const fxFn = fx || ((from, to, date) => {
    if (!rates) rates = createRates({ dir: join((paths && paths.root) || root, 'travel'), log });
    return rates.rateOn(from, to, date);
  });

  async function ready() { await loadProviders(log); await loadFakes(); return svc; }
  async function loadFakes() {
    for (const [id, f] of Object.entries(FAKES)) {
      if (fakeObjs.has(id) || env[f.env] !== '1') continue;
      const file = join(REPO, 'tests', 'fixtures', f.file);
      if (!existsSync(file)) { log('warn', `fin-connect: ${f.env}=1 but the fake is not installed`); fakeObjs.set(id, null); continue; }
      const mod = await import(pathToFileURL(file).href);
      fakeObjs.set(id, mod.createFake({ env, now, log }));
      log('note', `fin-connect: ${id} fake mode`);
    }
  }
  const fake = (id) => fakeObjs.get(id) || null;
  const provider = (id) => loaded.get(id) || null;
  const providers = () => [...loaded.values()];
  function mustProvider(id) {
    const p = provider(id);
    if (!p) throw new FinError('NOT_SUPPORTED', 'That kind of connection is not available in this version of OpenDash.');
    return p;
  }

  function ctxFor(id) {
    const p = mustProvider(id);
    const fk = fake(id);
    if (!mem.has(id)) mem.set(id, {});
    return {
      dataDir: root, financeDir: finDir(), secrets, now, log, fx: fxFn, fake: fk, home: home(),
      port: (appCtx && appCtx.port) || port, getConfig: cfg, svc, mem: mem.get(id),
      timeZone: cfg().timezone || 'UTC',
      http: readOnlyClient(p.allow, { provider: id, fetchFn: fk && fk.fetchFn ? fk.fetchFn : fetchFn, log, loopback: !!fk }),
    };
  }

  // ─── sources.json helpers ──────────────────────────────────────────────
  async function allSources() {
    if (appCtx && appCtx.sources) return appCtx.sources.all();
    const doc = await readSourcesFile(root);
    return doc ? doc.sources : [];
  }
  async function getSource(id) { return (await allSources()).find(s => s.id === id) || null; }
  const fallback = () => allSources();
  async function createSource(input) {
    return mutateSources(root, (list) => {
      const id = newSourceId('bank', input.label || PROVIDER_LABEL[input.provider] || 'bank');
      const used = new Set(list.map(s => s.colour));
      const colour = COLOURS.includes(input.colour) ? input.colour : (COLOURS.find(c => !used.has(c)) || 'teal');
      const { source, errors } = validateSource({ accounts: [], enabled: true, ...input, colour, id, capability: 'bank', kind: 'direct', createdAt: new Date(now()).toISOString(), lastSync: null, lastError: null }, { existing: list });
      if (errors.length) throw new FinError('BAD_REQUEST', errors.join('; '));
      list.push(source);
      log('note', `fin-connect: added a ${source.provider} source`);
      return source;
    }, { fallback });
  }
  /** patch: object, or fn(source) mutating it. */
  async function updateSource(id, patch) {
    return mutateSources(root, (list) => {
      const i = list.findIndex(s => s.id === id);
      if (i < 0) throw new FinError('NOT_FOUND', 'That connection is not there any more.');
      const next = JSON.parse(JSON.stringify(list[i]));
      if (typeof patch === 'function') patch(next); else Object.assign(next, patch);
      const { source, errors } = validateSource(next, { existing: list.filter((_, j) => j !== i) });
      if (errors.length) throw new FinError('BAD_REQUEST', errors.join('; '));
      list[i] = source;
      return source;
    }, { fallback });
  }
  async function removeSource(id) {
    return mutateSources(root, (list) => {
      const i = list.findIndex(s => s.id === id);
      if (i >= 0) list.splice(i, 1);
      return i >= 0;
    }, { fallback });
  }

  // ─── Cursors (not secret: dates, provider ids, last full sync) ─────────
  const cursorFile = (id) => {
    if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(String(id))) throw new Error('bad source id');
    return join(finDir(), '_system', 'connectors', `${id}.json`);
  };
  async function readCursor(id) {
    const j = await readJson(cursorFile(id), { fallback: null }).catch(() => null);
    return j && typeof j === 'object' && !Array.isArray(j) ? j : {};
  }
  async function writeCursor(id, obj) { const f = cursorFile(id); return withLock(f, () => writeJson(f, obj)); }
  async function dropCursor(id) { return writeCursor(id, {}); }

  // ─── The finance update hook ───────────────────────────────────────────
  async function storedRows() {
    const f = join(finDir(), '_system', 'transactions.csv');
    if (!existsSync(f)) return [];
    try { return parseStore(await readFile(f, 'utf8')); } catch { return []; }
  }

  /**
   * One direct source -> {rows, accounts, balances, rejected, warning}. The rows
   * keep the provider's account ids; lib/finance.mjs prefixes '<sourceId>.'.
   * opts: {from, to, maxDate, full, timeZone}
   */
  async function fetchDirect(source, opts = {}) {
    await ready();
    const p = mustProvider(source.provider);
    const c = ctxFor(source.provider);
    const t0 = Date.now();
    const cursor = await readCursor(source.id);
    const known = new Map((source.accounts || []).map(a => [a.id, a]));
    const accountOn = (id) => { const a = known.get(id); return !a || a.enabled !== false; };
    // manual: asked for by the user (Sync now, a new connection); providers with a daily budget always allow it.
    const r = await p.fetch(c, source, { from: opts.from, to: opts.to, full: opts.full === true, manual: opts.manual === true || !cursor.lastSync, cursor, first: !cursor.lastSync, accountOn });
    const txs = [], rejected = {};
    for (const raw of r.rows || []) {
      let out;
      try { out = p.normalise(raw, c); } catch { out = { reason: 'unreadable' }; }
      if (out && out.row) txs.push(out.row);
      else { const k = (out && out.reason) || 'unreadable'; rejected[k] = (rejected[k] || 0) + 1; }
    }
    const fin = await finishRows(txs, { home: home(), fx: fxFn, timeZone: opts.timeZone || c.timeZone, maxDate: opts.maxDate });
    for (const [k, v] of Object.entries(fin.rejected)) rejected[k] = (rejected[k] || 0) + v;

    // Accounts: new ones may be duplicates of an account the store already has.
    const accounts = (r.accounts || []).filter(a => a && ACC_ID_RE.test(String(a.id))).map(a => ({ ...a, id: String(a.id) }));
    const fresh = accounts.filter(a => !known.has(a.id) && !a.balanceOnly);
    if (fresh.length) {
      const stored = await storedRows();
      const freshIds = new Set(fresh.map(a => a.id));
      const today = opts.to || new Date(now()).toISOString().slice(0, 10);
      const dups = findDuplicates(
        fin.rows.filter(x => freshIds.has(x.accountId)).map(x => ({ accountId: x.accountId, date: x.date, pence: x.pence })),
        stored.filter(x => !String(x.account).startsWith(source.id + '.')).map(x => ({ account: x.account, date: x.date, amount: x.amount })),
        { today, days: DUP_DAYS });
      for (const d of dups) {
        const a = accounts.find(x => x.id === d.accountId);
        Object.assign(a, { enabled: false, hiddenReason: 'duplicate', duplicateOf: String(d.duplicateOf).slice(0, 160) });
        log('note', `fin-connect: a new ${source.provider} account looks like one already synced (${Math.round(d.share * 100)}%); it starts hidden`);
      }
    }
    const on = (id) => { const a = known.get(id) || accounts.find(x => x.id === id); return !a || a.enabled !== false; };
    const rows = fin.rows.filter(x => on(x.accountId));
    const balances = (r.balances || []).filter(b => b && ACC_ID_RE.test(String(b.accountId)) && on(String(b.accountId)) && Number.isFinite(Number(b.balance)));
    // Other-currency balances: shown in the home currency at today's rate (rows are converted per day).
    const today = opts.to || new Date(now()).toISOString().slice(0, 10);
    const outBalances = [];
    for (const b of balances) {
      const ccy = /^[A-Z]{3}$/.test(b.currency || '') ? b.currency : home();
      if (ccy === home()) { outBalances.push({ accountId: String(b.accountId), name: b.name || null, balance: Math.round(Number(b.balance) * 100) / 100, currency: ccy, asOf: b.asOf || today }); continue; }
      const rate = await Promise.resolve(fxFn(ccy, home(), b.asOf || today)).catch(() => null);
      if (rate > 0) outBalances.push({ accountId: String(b.accountId), name: b.name || null, balance: Math.round(Number(b.balance) * rate * 100) / 100, currency: home(), asOf: b.asOf || today });
    }
    const nextCursor = { ...(r.cursor || cursor), lastSync: new Date(now()).toISOString() };
    await writeCursor(source.id, nextCursor);
    // Source bookkeeping the provider knows about (re-auth date, setup finished).
    if (r.sourcePatch || source.setup) {
      await updateSource(source.id, (s) => { Object.assign(s, r.sourcePatch || {}); delete s.setup; }).catch(e => log('warn', `fin-connect: source not updated (${e.code || 'error'})`));
    }
    const warnings = [];
    if (r.warning) warnings.push(r.warning);
    if (fin.heldForRate) warnings.push(`${fin.heldForRate} transaction${fin.heldForRate === 1 ? '' : 's'} wait for an exchange rate`);
    log('note', `fin-connect ${source.provider} fetch: ${rows.length} rows, ${accounts.length} accounts, ${Date.now() - t0}ms`);
    return {
      rows, rejected, balances: outBalances,
      accounts: accounts.map(a => ({ id: a.id, name: a.name, ...(a.kind ? { kind: a.kind } : {}), ...(a.mask ? { mask: a.mask } : {}),
        ...(a.enabled === false ? { enabled: false } : {}), ...(a.hiddenReason ? { hiddenReason: a.hiddenReason } : {}),
        ...(a.duplicateOf ? { duplicateOf: a.duplicateOf } : {}), ...(a.balanceOnly ? { balanceOnly: true } : {}) })),
      ...(warnings.length ? { warning: warnings.join('; ') } : {}),
    };
  }

  // ─── Health (lib/sources.mjs asks for kind 'direct') ───────────────────
  async function health(source) {
    if (!source.enabled) return { state: 'off', message: 'Switched off', from: 'user' };
    if (source.demo) return { state: 'demo', message: null, from: 'demo' };
    await ready();
    const p = provider(source.provider);
    if (!p) return { state: 'setup', message: 'This connection needs a newer OpenDash.', from: 'direct', code: 'NOT_SUPPORTED' };
    let st = {};
    try { st = await p.status(ctxFor(source.provider), source) || {}; }
    catch (e) { return { state: 'error', message: e instanceof FinError ? e.message : 'Its status could not be read.', from: 'direct', code: e.code || null }; }
    const errAt = Date.parse(source.lastError && source.lastError.at || '') || 0;
    const okAt = Date.parse(source.lastSync || '') || 0;
    const lastFailed = errAt > okAt;
    if (!st.configured) return { state: 'setup', message: st.message || 'Finish setting this up in Connections.', from: 'direct', code: 'NOT_CONFIGURED', ...extra(st) };
    if (source.setup && !st.connected) return { state: 'setup', message: st.message || 'Finish connecting this in Connections.', from: 'direct', code: 'NOT_CONFIGURED', ...extra(st) };
    if (st.needsAuth || !st.connected) return { state: 'auth', message: st.message || `${PROVIDER_LABEL[source.provider]} needs you to sign in again.`, from: 'direct', code: 'AUTH', ...extra(st) };
    if (lastFailed) {
      const code = source.lastError.code || 'FAILED';
      return { state: AUTH_CODES.includes(code) ? 'auth' : 'error', message: source.lastError.message || 'The last sync failed.', from: 'sync', code, ...extra(st) };
    }
    return { state: 'ok', message: st.message || null, from: 'direct', code: null, ...extra(st) };
  }
  const extra = (st) => ({
    ...(st.reauthDue ? { reauthDue: st.reauthDue } : {}),
    ...(st.limitedHistory ? { limitedHistory: true } : {}),
    ...(st.historyMode ? { historyMode: st.historyMode } : {}),
  });

  // ─── Page views ─────────────────────────────────────────────────────────
  async function catalogue() {
    await ready();
    const list = await allSources();
    const out = [];
    for (const id of PROVIDER_IDS) {
      const p = provider(id);
      const mine = list.filter(s => s.kind === 'direct' && s.provider === id);
      const srcs = [];
      for (const s of mine) {
        const h = await health(s);
        let st = {};
        try { st = p ? await p.status(ctxFor(id), s) || {} : {}; } catch { st = {}; }
        srcs.push({ id: s.id, label: s.label, colour: s.colour, enabled: s.enabled, state: h.state, message: h.message || null, code: h.code || null,
          lastSync: s.lastSync || null, reauthDue: s.reauthDue || st.reauthDue || null, accounts: (s.accounts || []).length, status: publicStatus(st) });
      }
      let info = {};
      try { info = p && typeof p.info === 'function' ? await p.info(ctxFor(id)) || {} : {}; } catch { info = {}; }
      out.push({ id, label: PROVIDER_LABEL[id], available: !!p, readOnly: true, fake: !!fake(id), sources: srcs, ...publicStatus(info) });
    }
    const aureli = list.find(s => s.preset === 'aureli');
    return { providers: out, aureli: aureli ? { id: aureli.id, enabled: aureli.enabled, lastSync: aureli.lastSync || null } : null };
  }
  /** Only plain facts reach the page (providers return masked ids, never secrets). */
  function publicStatus(st) {
    const out = {};
    for (const [k, v] of Object.entries(st || {})) {
      if (/token|secret|pem|key$|password|address$/i.test(k)) continue;
      if (v == null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = typeof v === 'string' ? v.slice(0, 240) : v;
    }
    return out;
  }

  async function balancesDoc() {
    const j = await readJson(join(finDir(), '_system', 'balances.json'), { fallback: null }).catch(() => null);
    const m = new Map();
    for (const a of j && Array.isArray(j.accounts) ? j.accounts : []) if (a && a.acct) m.set(String(a.acct), a);
    return m;
  }

  async function accounts() {
    await ready();
    const list = (await allSources()).filter(s => s.capability === 'bank' && s.kind !== 'csv');
    const bal = await balancesDoc();
    const names = new Map();
    for (const s of list) for (const a of s.accounts || []) names.set(s.preset === 'aureli' ? a.id : `${s.id}.${a.id}`, a.name);
    const groups = [];
    for (const s of list) {
      const h = s.kind === 'direct' ? await health(s) : null;
      const provider = s.kind === 'direct' ? s.provider : s.preset === 'aureli' ? 'aureli' : 'mcp';
      groups.push({
        sourceId: s.id, provider, providerLabel: PROVIDER_LABEL[provider], label: s.label, colour: s.colour, enabled: s.enabled, demo: !!s.demo,
        state: h ? h.state : null, message: h ? h.message || null : null, code: h ? h.code || null : null,
        lastSync: s.lastSync || null, reauthDue: s.reauthDue || (h && h.reauthDue) || null,
        ...(h && h.limitedHistory ? { limitedHistory: true } : {}), ...(h && h.historyMode ? { historyMode: h.historyMode } : {}),
        accounts: (s.accounts || []).map(a => {
          const key = s.preset === 'aureli' ? a.id : `${s.id}.${a.id}`;
          const b = bal.get(key);
          return {
            key, id: a.id, name: a.name, colour: a.colour, enabled: a.enabled !== false, kind: a.kind || null, mask: a.mask || null,
            balance: b && Number.isFinite(Number(b.balance)) ? Number(b.balance) : null, currency: b ? b.currency || null : null, balanceAsOf: b ? b.asOf || null : null,
            ...(a.balanceOnly ? { balanceOnly: true } : {}),
            ...(a.hiddenReason ? { hiddenReason: a.hiddenReason } : {}),
            ...(a.duplicateOf ? { duplicateOf: a.duplicateOf, duplicateOfName: names.get(a.duplicateOf) || null } : {}),
            ...(a.dupChoice ? { dupChoice: a.dupChoice } : {}),
          };
        }),
      });
    }
    return { groups, home: home() };
  }

  /**
   * key '<sourceId>.<accountId>' (or an Aureli account id).
   * patch {name?, colour?, enabled?, keep?: 'this'|'other'}
   */
  async function patchAccount(key, patch = {}) {
    const k = String(key || '');
    const list = await allSources();
    let src = null, acc = null;
    for (const s of list) {
      if (s.capability !== 'bank') continue;
      for (const a of s.accounts || []) {
        const ak = s.preset === 'aureli' ? a.id : `${s.id}.${a.id}`;
        if (ak === k) { src = s; acc = a; }
      }
    }
    if (!src) throw new FinError('NOT_FOUND', 'That account is not there any more.');
    if (patch.name != null && (typeof patch.name !== 'string' || !patch.name.trim())) throw new FinError('BAD_REQUEST', 'Give the account a name.');
    if (patch.colour != null && !COLOURS.includes(patch.colour)) throw new FinError('BAD_REQUEST', 'Choose one of the colours.');
    if (patch.keep != null && !['this', 'other'].includes(patch.keep)) throw new FinError('BAD_REQUEST', 'keep must be this or other.');
    const other = patch.keep === 'this' && acc.duplicateOf ? acc.duplicateOf : null;
    const out = await updateSource(src.id, (s) => {
      const a = s.accounts.find(x => x.id === acc.id);
      if (patch.name != null) { a.name = patch.name; a.renamed = true; }
      if (patch.colour != null) a.colour = patch.colour;
      if (patch.enabled != null) { a.enabled = patch.enabled !== false; if (a.enabled && a.hiddenReason === 'duplicate' && !patch.keep) a.dupChoice = 'this'; if (!a.enabled && !a.hiddenReason) a.hiddenReason = 'user'; if (a.enabled && a.hiddenReason === 'user') delete a.hiddenReason; }
      if (patch.keep === 'this') { a.enabled = true; a.dupChoice = 'this'; delete a.hiddenReason; }
      if (patch.keep === 'other') { a.enabled = false; a.dupChoice = 'other'; a.hiddenReason = 'duplicate'; }
    });
    // "Keep this one": the other account goes quiet, and this one's history is fetched again.
    if (patch.keep === 'this') {
      if (other) {
        const os = list.find(s => (s.accounts || []).some(a => (s.preset === 'aureli' ? a.id : `${s.id}.${a.id}`) === other));
        if (os) await updateSource(os.id, (s) => { const a = s.accounts.find(x => (os.preset === 'aureli' ? x.id : `${os.id}.${x.id}`) === other); if (a) { a.enabled = false; a.dupChoice = 'other'; a.hiddenReason = 'duplicate'; } }).catch(() => {});
      }
      if (src.kind === 'direct') {
        const cur = await readCursor(src.id);
        if (cur.accounts && cur.accounts[acc.id]) { delete cur.accounts[acc.id]; await writeCursor(src.id, cur); }
      }
    }
    return out.accounts.find(x => x.id === acc.id);
  }

  // ─── Sync / disconnect ─────────────────────────────────────────────────
  async function startFinance(opts) {
    if (startUpdate) return startUpdate(opts);
    const fin = await import('../finance.mjs');
    return fin.startFinanceUpdate(opts);
  }
  /** A finance update for one source. waitMs > 0: keep trying while another update runs. */
  async function requestSync(id, { waitMs = 0, full = false } = {}) {
    const until = now() + waitMs;
    for (;;) {
      const r = await startFinance({ bank: true, only: [id], manual: true, ...(full ? { full: true } : {}) });
      if (r.started || r.error || now() >= until) return r;
      await new Promise(res => setTimeout(res, 1500));
    }
  }

  async function disconnect(id, { removeData = false } = {}) {
    await ready();
    const s = await getSource(id);
    if (!s || s.kind !== 'direct') throw new FinError('NOT_FOUND', 'That connection is not there any more.');
    const p = provider(s.provider);
    if (p) { try { await p.disconnect(ctxFor(s.provider), s); } catch (e) { log('warn', `fin-connect: ${s.provider} revoke failed (${e.code || 'error'}); the saved sign-in is deleted anyway`); } }
    await secrets.remove(`${s.provider === 'enable-banking' ? 'eb' : s.provider}-${s.id}`).catch(() => {});
    await removeSource(id);
    await dropCursor(id).catch(() => {});
    let undo = null, removed = 0;
    if (removeData) ({ undo, removed } = await removeRows(id));
    log('note', `fin-connect: ${s.provider} disconnected${removeData ? ` (${removed} rows removed)` : ''}`);
    return { ok: true, removed, undo };
  }

  // Removing a source's rows: the store is rewritten under the pipeline's lock,
  // the removed rows are kept in _system/connectors/ for Undo, then the
  // analysis is rebuilt without a bank fetch.
  const storeFile = () => join(finDir(), '_system', 'transactions.csv');
  async function removeRows(id) {
    const f = storeFile();
    if (!existsSync(f)) return { removed: 0, undo: null };
    const token = `${id}-${new Date(now()).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
    const keep = [], gone = [];
    await withLock(f, async () => {
      for (const r of parseStore(await readFile(f, 'utf8'))) (String(r.account).startsWith(id + '.') ? gone : keep).push(r);
      if (!gone.length) return;
      const bk = join(finDir(), '_system', 'connectors', `removed-${token}.csv`);
      await atomicWrite(bk, storeCsv(gone));
      await atomicWrite(f, storeCsv(keep));
    }, { timeoutMs: 60000 });
    if (gone.length) await startFinance({ bank: false });
    return { removed: gone.length, undo: gone.length ? token : null };
  }
  async function undoRemove(token) {
    if (!/^[a-z0-9][a-z0-9-]{1,40}-\d{14}$/.test(String(token || ''))) throw new FinError('BAD_REQUEST', 'Nothing to undo.');
    const bk = join(finDir(), '_system', 'connectors', `removed-${token}.csv`);
    if (!existsSync(bk)) throw new FinError('NOT_FOUND', 'Nothing to undo.');
    const f = storeFile();
    let restored = 0;
    await withLock(f, async () => {
      const back = parseStore(await readFile(bk, 'utf8'));
      const cur = existsSync(f) ? parseStore(await readFile(f, 'utf8')) : [];
      await atomicWrite(f, storeCsv(cur.concat(back)));
      restored = back.length;
      await mkdir(join(finDir(), '_system', 'connectors'), { recursive: true });
      await rename(bk, bk + '.undone').catch(() => {});
    }, { timeoutMs: 60000 });
    await startFinance({ bank: false });
    return { ok: true, restored };
  }

  const svc = {
    ready, provider, providers, ctxFor, fake, fetchDirect, health, catalogue, accounts, patchAccount,
    requestSync, disconnect, undoRemove, createSource, updateSource, removeSource, getSource, allSources,
    readCursor, writeCursor, home, dataDir: root, financeDir: finDir,
  };
  setDirectHealth(root, (s) => health(s));
  return svc;
}

export { FinError } from './provider.mjs';
export { addDays };

// lib/finance-share.mjs - FINANCES ON EVERY DEVICE, the Node side
// (docs/dev/MULTI_DEVICE.md "Finances on every device"; the format and the
// pure rules are lib/sync/finance-share.mjs).
//
// One device reads the bank (or holds the CSV / spreadsheet store): the device
// that runs the 'bank' job, by the one who-runs-what rule (lib/sync/roles.mjs
// through the sync engine's isFetcher; lib/sync/caps.mjs makes the device that
// has a bank, else the one with finance data, the default). It is the finance
// FETCHER:
//   - after every rebuild of its analysis it PUBLISHES finance-share/finance.json
//     (publish(); nothing when the content did not change);
//   - it APPLIES the user's edits that arrive from the other devices
//     (finance-share/edits.json: a merchant's category, budgets, an account's
//     name, colour, Show in Finances) to its own rules.json, budgets and account
//     list, rebuilds, and publishes again (applyEdits()).
// Every other device is a MIRROR: view() hands lib/finance.mjs the published
// copy (with the edits not applied yet laid over it), so the Finances view, the
// Home money cards, the money brief and the story show the same numbers; its
// own edits go into the edits file (editOverride / saveBudgets / editAccount);
// "Sync bank" asks the fetcher (ask(): a remote request, lib/sync/requests.mjs
// 'fetch:finance').
//
// Only while sync is on AND end-to-end encrypted (amounts and merchants never
// travel in the clear). Sync off, or plain sync: every computer has its own
// finances, as before. The finance folder (transaction store, spreadsheet,
// rules.json), bank sign-ins and connector tokens never leave this computer.
//
// Logs carry counts only, never amounts, merchants or names.

import { join } from 'node:path';
import { stat, unlink } from 'node:fs/promises';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import {
  SHARE_REL, EDITS_REL, FINANCE_JOB, encodeShare, decodeShare, sameShare, cleanEdits, editKey,
  overlay, sharedBudgets, budgetChanges, accountEdits, entryHash,
} from './sync/finance-share.mjs';
import { isOnline } from './sync/caps.mjs';

const APPLIED = 'shared-applied.json';     // <finance>/_system: what this computer last applied (never synced)
const PRESENCE = new Set(['open', 'running', 'asleep', 'off', 'outdated']);

/**
 * createFinanceShare({dataDir, sync, remoteJobs, log, now, hooks})
 *   sync()         the sync engine (app.ctx.sync) or null
 *   remoteJobs()   lib/remote-jobs.mjs (app.ctx.remoteJobs) or null
 *   hooks          {localData() -> {status, analysis, meta},   this computer's own finances
 *                   extraMeta(analysis) -> {accounts, sources}, what the Finances chips need
 *                   financeDir() -> path | null,
 *                   localBudgets() -> {cat: amount}, writeBudgets(map),
 *                   applyOverrides([{m, c}]) -> changed?, applyAccounts([{k, name?, colour?, hidden?}]) -> changed?}
 */
export function createFinanceShare({ dataDir, sync = () => null, remoteJobs = () => null, log = () => {}, now = () => Date.now(), hooks = {} } = {}) {
  const shareFile = join(dataDir, ...SHARE_REL.split('/'));
  const editsFile = join(dataDir, ...EDITS_REL.split('/'));
  const eng = () => { try { return sync() || null; } catch { return null; } };
  let cache = { stamp: null, doc: null, decoded: null };
  let editsCache = { stamp: null, value: null };

  const stampOf = async (p) => { try { const s = await stat(p); return `${s.size}:${s.mtimeMs}`; } catch { return null; } };
  async function readShareDoc() {
    const stamp = await stampOf(shareFile);
    if (!stamp) { cache = { stamp: null, doc: null, decoded: null }; return cache; }
    if (cache.stamp === stamp) return cache;
    const doc = await readJson(shareFile, { fallback: null }).catch(() => null);
    cache = { stamp, doc, decoded: doc ? decodeShare(doc) : null };
    return cache;
  }
  async function readEdits() {
    const stamp = await stampOf(editsFile);
    if (!stamp) return cleanEdits(null);
    if (editsCache.stamp === stamp && editsCache.value) return editsCache.value;
    const v = cleanEdits(await readJson(editsFile, { fallback: null }).catch(() => null));
    editsCache = { stamp, value: v };
    return v;
  }
  /** fn(edits) changes the edits (cleaned shape); false = nothing to write. Under the file's lock (the one sync uses). */
  function updateEdits(fn) {
    return withLock(editsFile, async () => {
      const cur = cleanEdits(await readJson(editsFile, { fallback: null }).catch(() => null));
      const out = await fn(cur);
      if (out === false) return cur;
      await writeJson(editsFile, cur, { trailingNewline: true });
      editsCache = { stamp: null, value: null };
      kick();
      return cur;
    });
  }
  /** Tell the other devices now (a sync pass; with live sync they have it within a second). */
  let kickT = null;
  function kick() {
    const e = eng();
    if (!e || !e.active) return;
    clearTimeout(kickT);
    kickT = setTimeout(() => { e.syncNow().catch(() => {}); }, 30);
    kickT.unref?.();
  }

  // ─── Is the finance computer there? ─────────────────────────────────
  // lib/sync/presence.mjs presenceOf(deviceId) -> {state, lastSeen}, state 'open' (OpenDash open
  // there) | 'running' (the server runs, no page) | 'asleep' | 'off' | 'outdated' (an older
  // OpenDash). Used when that module is there; else the device list's own "seen lately".
  let presenceMod;
  async function presenceOf(e, d) {
    const id = d && d.deviceId;
    if (!id) return null;
    let fn = e && typeof e.presenceOf === 'function' ? (x, o) => e.presenceOf(x, o) : null;
    if (!fn) {
      if (presenceMod === undefined) presenceMod = await import('./sync/presence.mjs').catch(() => null);
      fn = presenceMod && typeof presenceMod.presenceOf === 'function' ? presenceMod.presenceOf : null;
    }
    if (!fn) return null;
    try {
      const p = await fn(id, { engine: e, device: d, now: now() });
      const state = typeof p === 'string' ? p : p && typeof p.state === 'string' ? p.state : null;
      return PRESENCE.has(state) ? { state, lastSeen: (p && typeof p === 'object' && p.lastSeen) || null } : null;
    } catch { return null; }
  }
  const isoOf = (t) => { const ms = Number.isFinite(t) ? t : Date.parse(t || ''); return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null; };

  // ─── Who is the fetcher ─────────────────────────────────────────────
  /** This device's name as the group knows it. */
  function myName() {
    const e = eng();
    try { const me = (e && typeof e.groupCaps === 'function' ? e.groupCaps() : []).find(d => d.me); return (me && me.name) || null; } catch { return null; }
  }
  /**
   * {sync, on, publisher, host, apply}
   *   sync       Settings > Sync is on
   *   on         ...and end-to-end encrypted: only then does finance travel
   *   publisher  this device runs the 'bank' job (or nothing travels): its own finances
   *   host       the fetcher, when it is another device: {name, fid, deviceId, online, lastSeen (ISO), state}
   *              state: presenceOf (above), else 'open' while it is seen, else 'off'
   */
  async function status() {
    const e = eng();
    if (!e || !e.enabled) return { sync: false, on: false, publisher: true, host: null, apply: false };
    const on = !!e.e2e;
    // The engine's answer for the job (the same rule its publish check uses), without claiming it.
    let f = null;
    try { f = e.fetcher(FINANCE_JOB) || null; } catch { f = null; }
    const me = !f || f.me !== false;
    let host = null;
    if (!me) {
      try {
        const devs = typeof e.groupCaps === 'function' ? e.groupCaps() : [];
        const d = devs.find(x => !x.me && (x.deviceId === f.deviceId || x.fetcherId === f.deviceId)) || null;
        const seen = d ? isOnline(d, now()) : false;
        const p = d ? await presenceOf(e, d) : null;
        const state = p ? p.state : seen ? 'open' : 'off';
        host = {
          name: (d && d.name) || f.name || 'your other computer', fid: d ? d.fetcherId : (f.deviceId || null), deviceId: (d && d.deviceId) || null,
          online: p ? state === 'open' || state === 'running' || (state === 'outdated' && seen) : seen,
          lastSeen: isoOf((p && p.lastSeen) || (d && d.lastSeen) || f.lastSeen), state,
        };
      } catch { host = { name: 'your other computer', fid: null, deviceId: null, online: false, lastSeen: null, state: 'off' }; }
    }
    return { sync: true, on, publisher: me, host, apply: !!e.apply };
  }

  /**
   * What lib/finance.mjs financeData() shows:
   *   {kind:'local'}                              this computer's own finances
   *   {kind:'mirror', analysis, meta, host}       the fetcher's published copy (edits laid over it)
   *   {kind:'waiting', host}                      another device is the fetcher; nothing published yet
 *   {kind:'local', hint:{host, trial}}          trial mode: this computer's own, with where they would come from
   */
  async function view() {
    const st = await status();
    if (!st.on || st.publisher) return { kind: 'local', st };
    // Trial mode (Settings > Sync): nothing from the others is applied here, so this computer's
    // own finances stay in charge; the page only says where they would come from.
    if (!st.apply) return { kind: 'local', st, hint: { host: st.host, trial: true } };
    const c = await readShareDoc();
    if (!c.decoded) return { kind: 'waiting', host: st.host, st };
    const edits = await readEdits();
    return { kind: 'mirror', analysis: overlay(c.decoded.analysis, edits), meta: c.decoded.meta, host: st.host, st };
  }

  // ─── Publishing (the fetcher) ───────────────────────────────────────
  let publishing = null, again = false, againFull = false;
  let last = { stamp: null, at: 0 };   // what the last publish was built from (a periodic check skips an unchanged analysis)
  /**
   * Publish this computer's finances when it is the fetcher (coalesced; resolves
   * when written). periodic: the timer's check, skipped while analysis.json has
   * not changed (a full check every half hour: account names, the last update).
   */
  function publish({ periodic = false } = {}) {
    if (publishing) { again = true; if (!periodic) againFull = true; return publishing; }
    publishing = (async () => {
      let n = 0, p = periodic;
      for (;;) {
        await publishOnce({ periodic: p }).catch((e) => log('warn', `finance share: not published (${(e && (e.code || e.message)) || e})`));
        if (!again || ++n >= 3) break;
        p = !againFull; again = false; againFull = false;
      }
    })().finally(() => { publishing = null; again = false; againFull = false; });
    return publishing;
  }
  const analysisFile = () => { const f = finDir(); return f ? join(f, '_system', 'analysis.json') : null; };
  async function publishOnce({ periodic = false } = {}) {
    const st = await status();
    if (!st.sync || !st.publisher) return false;
    if (!st.on) {
      // Plain (unencrypted) sync: finances never travel; a copy left from before goes.
      if (await stampOf(shareFile)) { await unlink(shareFile).catch(() => {}); log('note', 'finance share: removed (sync is not encrypted)'); }
      return false;
    }
    const af = analysisFile();
    const aStamp = af ? await stampOf(af) : null;
    if (periodic && aStamp && aStamp === last.stamp && now() - last.at < 30 * 60 * 1000 && await stampOf(shareFile)) return false;
    last = { stamp: aStamp, at: now() };
    const d = hooks.localData ? await hooks.localData() : null;
    // Nothing of its own (or sample data): another device's copy is never touched.
    if (!d || d.status !== 'ok' || !d.analysis || d.analysis.sample) return false;
    await seedBudgets().catch(() => {});
    const e = eng();
    await keepRole(e).catch(() => {});
    const extra = hooks.extraMeta ? await hooks.extraMeta(d.analysis).catch(() => ({})) : {};
    const doc = encodeShare({ analysis: d.analysis, meta: { ...(d.meta || {}), ...(extra || {}), by: myName(), fid: e ? e.fetcherId : null }, at: new Date(now()).toISOString() });
    if (!doc) return false;
    const cur = await readShareDoc();
    if (cur.doc && sameShare(cur.doc, doc)) return false;
    await withLock(shareFile, () => writeJson(shareFile, doc, { indent: 0, trailingNewline: true }));
    cache = { stamp: null, doc: null, decoded: null };
    log('info', `finance share: published ${Object.keys(doc.tx).length} month(s) of transactions`);
    kick();
    return true;
  }

  /**
   * The computer that publishes stays the finance computer: when roles.json has
   * no 'bank' entry it is recorded there (the engine's setFetcher), so two
   * computers that could both run it (a bank connector through the same Claude
   * account on each) never take turns as one sleeps. Choosing a main computer
   * clears it (lib/main-computer.mjs); "Fetch on this computer instead" moves it.
   */
  async function keepRole(e) {
    if (!e || typeof e.setFetcher !== 'function') return;
    const r = await readJson(join(dataDir, 'roles.json'), { fallback: null }).catch(() => null);
    const roles = r && r.roles && typeof r.roles === 'object' ? r.roles : {};
    const cur = roles[FINANCE_JOB];
    if (cur && typeof cur === 'object' && (cur.fetcher || cur.deviceId)) return;
    await e.setFetcher(FINANCE_JOB);
    log('note', 'finance share: this computer is recorded as the one that runs finance updates');
  }

  // ─── The edits ───────────────────────────────────────────────────────
  const finDir = () => (hooks.financeDir ? hooks.financeDir() : null);
  const appliedFile = () => { const f = finDir(); return f ? join(f, '_system', APPLIED) : null; };
  async function readApplied() {
    const f = appliedFile();
    const v = f ? await readJson(f, { fallback: null }).catch(() => null) : null;
    const o = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    const m = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
    return { overrides: m(o.overrides), accounts: m(o.accounts), budgetsSeeded: o.budgetsSeeded === true };
  }
  async function writeApplied(a) { const f = appliedFile(); if (f) await writeJson(f, a, { trailingNewline: true }).catch(() => {}); }
  const by = () => myName() || 'another device';
  const stamp = () => new Date(now()).toISOString();

  /**
   * The fetcher's budgets (budgets.json) go into the shared edits once, the
   * first time it publishes with sync on; a category another device budgeted
   * first is kept.
   */
  async function seedBudgets() {
    const a = await readApplied();
    if (a.budgetsSeeded) return;
    const local = hooks.localBudgets ? await hooks.localBudgets() : {};
    await updateEdits((ed) => {
      ed.budgets = ed.budgets || {};
      for (const [c, v] of Object.entries(local || {})) { const k = editKey('b', c); if (!ed.budgets[k] && typeof v === 'number') ed.budgets[k] = { c, v, at: stamp(), by: by() }; }
    });
    a.budgetsSeeded = true;
    await writeApplied(a);
  }

  /** Is the shared copy in charge here (sync on, encrypted; not a device in trial mode that does not read the bank)? -> status or null. */
  async function sharing() { const st = await status(); return st.on && (st.publisher || st.apply) ? st : null; }

  /**
   * A merchant's category from this device (c null: back to the rules). The
   * fetcher calls it after changing its own rules (noted as applied); a mirror
   * instead of changing anything locally.
   */
  async function editOverride(m, c, { applied = false } = {}) {
    const k = editKey('m', m);
    let entry = null;
    await updateEdits((ed) => { entry = { m: String(m).trim(), c: c == null ? null : String(c), at: stamp(), by: by() }; ed.overrides[k] = entry; });
    if (applied && entry) { const a = await readApplied(); a.overrides[k] = entryHash(cleanEdits({ overrides: { [k]: entry } }).overrides[k]); await writeApplied(a); }
    return entry;
  }
  /**
   * Budgets from this device. base: what the page started from (only the
   * categories it changed are written, so another device's new budget stays).
   * -> the shared budgets after the change.
   */
  async function saveBudgets(next, base) {
    let start = base;
    if (!start || typeof start !== 'object') start = sharedBudgets(await readEdits()) || (hooks.localBudgets ? await hooks.localBudgets() : {});
    const changes = budgetChanges(start, next);
    const ed = await updateEdits((x) => {
      if (!changes.length) return false;
      x.budgets = x.budgets || {};
      for (const ch of changes) { const k = editKey('b', ch.c); if (ch.v == null) delete x.budgets[k]; else x.budgets[k] = { c: ch.c, v: ch.v, at: stamp(), by: by() }; }
    });
    return sharedBudgets(ed) || { ...(start || {}) };
  }
  /** An account's name, colour or Show in Finances from this device (fields not given stay). */
  async function editAccount(key, patch) {
    const k = editKey('a', key);
    const fields = {};
    if (typeof patch.name === 'string' && patch.name.trim()) fields.name = patch.name.trim().slice(0, 80);
    if (typeof patch.colour === 'string' && /^[a-z]{2,12}$/.test(patch.colour)) fields.colour = patch.colour;
    if (typeof patch.enabled === 'boolean') fields.hidden = !patch.enabled;
    if (patch.keep === 'this') fields.hidden = false;
    if (patch.keep === 'other') fields.hidden = true;
    if (!Object.keys(fields).length) return null;
    let entry = null;
    await updateEdits((ed) => { entry = { ...(ed.accounts[k] || {}), k: String(key), ...fields }; ed.accounts[k] = entry; });
    return entry;
  }

  /**
   * The fetcher: apply the edits that changed since it last applied them (from
   * any device), rebuild once, publish. Idempotent; an unchanged entry is never
   * applied twice, so a rule edited by hand in rules.json is left alone.
   */
  let applying = null, applyAgain = false;
  /** -> true when the analysis changed. Edits that arrive while it runs get one more round. */
  function applyEdits() {
    if (applying) { applyAgain = true; return applying; }
    applying = (async () => {
      let changed = false, n = 0;
      do {
        applyAgain = false;
        try { if (await applyOnce()) changed = true; }
        catch (e) { log('warn', `finance share: edits not applied (${(e && (e.code || e.message)) || e})`); }
      } while (applyAgain && ++n < 3);
      return changed;
    })().finally(() => { applying = null; });
    return applying;
  }
  async function applyOnce() {
    const st = await status();
    if (!st.on || !st.publisher) return false;
    const ed = await readEdits();
    const a = await readApplied();
    let changed = false;
    const ov = [];
    for (const [k, o] of Object.entries(ed.overrides)) { const h = entryHash(o); if (a.overrides[k] !== h) ov.push({ k, m: o.m, c: o.c, h }); }
    if (ov.length && hooks.applyOverrides) {
      if (await hooks.applyOverrides(ov.map(({ m, c }) => ({ m, c })))) changed = true;
      for (const x of ov) a.overrides[x.k] = x.h;
    }
    const acc = [];
    for (const [k, x] of Object.entries(ed.accounts)) { const h = entryHash(x); if (a.accounts[k] !== h) acc.push({ k, x, h }); }
    if (acc.length && hooks.applyAccounts) {
      if (await hooks.applyAccounts(acc.map(y => y.x))) changed = true;
      for (const y of acc) a.accounts[y.k] = y.h;
    }
    // Budgets: the shared ones are in charge; budgets.json follows them (for sync off later).
    const sb = sharedBudgets(ed);
    if (sb && hooks.localBudgets && hooks.writeBudgets) {
      const lb = await hooks.localBudgets();
      if (JSON.stringify(Object.entries(lb || {}).sort()) !== JSON.stringify(Object.entries(sb).sort())) await hooks.writeBudgets(sb);
    }
    if (ov.length || acc.length) await writeApplied(a);
    if (ov.length || acc.length) log('info', `finance share: applied ${ov.length} category and ${acc.length} account edit(s)`);
    await publish({ periodic: true });   // a rebuild above has published already; this catches anything else
    return changed;
  }

  // ─── Asking the fetcher ──────────────────────────────────────────────
  /** "Sync bank" on a mirror: the fetcher runs its own update. -> {status, body} (202 {remote} or a 409 that says why). */
  async function ask(body, c) {
    const rj = remoteJobs();
    const st = await status();
    const name = (st.host && st.host.name) || 'your other computer';
    const no = (code, error) => ({ status: 409, body: { code, error, runsOn: name } });
    if (!rj || !st.sync) return no('NO_HOST', `Your finances come from ${name}. Update them there.`);
    if (!st.apply) return no('TRIAL_MODE', `${name} reads your bank. To ask it from here, turn on "Use changes from my other computers" in Settings > Sync.`);
    const fid = st.host && st.host.fid;
    const runner = fid ? await rj.runnerFor('bank', { to: fid }).catch(() => null) : null;
    if (!runner) {
      const any = fid ? await rj.runnerFor('bank', { to: fid, requireApply: false }).catch(() => null) : null;
      if (any) return no('OTHER_IN_TRIAL', `${name} reads your bank, but it does not take changes from your other computers yet. Turn on "Use changes from my other computers" in Settings > Sync on ${name}.`);
      return no('NO_HOST', `${name} has not said yet that it can update your finances. Open OpenDash on ${name}, then try again.`);
    }
    const params = { ...(body && body.full === true ? { full: true } : {}), ...(body && body.bank === false ? { bank: false } : {}) };
    const req = await rj.ask('fetch:finance', params, { zone: c && c.zone, to: fid });
    log('note', 'finance: asked the finance computer to update');
    return { status: 202, body: { remote: await rj.get(req.id) } };
  }

  /** Account edits as the chips show them (a mirror's own edits before the fetcher applied them). */
  async function accountOverlay(accounts) {
    const m = accountEdits(await readEdits());
    if (!m.size || !Array.isArray(accounts)) return accounts;
    return accounts.map(a => {
      const x = a && m.get(a.key);
      if (!x) return a;
      return { ...a, ...(x.name ? { name: x.name } : {}), ...(x.colour ? { colour: x.colour } : {}), ...(typeof x.hidden === 'boolean' ? { enabled: !x.hidden } : {}) };
    });
  }

  /**
   * Connections > Money on a device that is not the finance computer: the finance
   * computer's accounts as its published copy has them (this device's edits laid
   * over), or null when this device shows its own finances (sync off or plain,
   * the finance computer itself, trial mode).
   *   {name, online, state, lastSeen, waiting, updatedAt, at,
   *    accounts: [{key, sourceId, sourceLabel, sourceColour, provider, kind, name, colour, enabled, lastSync}],
   *    sources: [{id, label, kind, provider, colour, enabled, state, lastSync}]}
   * Renaming, colour and Show in Finances go through PATCH /api/fin-connect/accounts/:key (editAccount).
   */
  async function remoteAccounts() {
    const st = await status();
    if (!st.on || st.publisher || !st.apply) return null;
    const h = st.host || {};
    const base = { name: h.name || 'your other computer', online: !!h.online, state: h.state || null, lastSeen: h.lastSeen || null };
    const c = await readShareDoc();
    if (!c.decoded) return { ...base, waiting: true, updatedAt: null, at: null, accounts: [], sources: [] };
    const m = c.decoded.meta || {};
    return { ...base, waiting: false, updatedAt: m.updatedAt || null, at: m.at || null, accounts: await accountOverlay(m.accounts || []), sources: m.sources || [] };
  }

  /**
   * "Sign in to this bank on this computer instead", once signed in here: this
   * computer becomes the finance computer (the 'bank' role, synced in roles.json);
   * it reads its bank and publishes, and the old one shows this one's finances.
   * hasBank: this computer has a bank connection of its own. -> {ok, already?} | {ok:false, code, message}
   */
  async function useThisComputer({ hasBank = false } = {}) {
    const e = eng();
    const st = await status();
    if (!st.sync || !e || typeof e.setFetcher !== 'function') return { ok: false, code: 'SYNC_OFF', message: 'Sync is off, so this computer reads its own bank already.' };
    if (st.publisher) return { ok: true, already: true };
    if (!hasBank) return { ok: false, code: 'SIGN_IN_FIRST', message: 'Sign in to your bank on this computer first.' };
    await e.setFetcher(FINANCE_JOB);
    log('note', 'finance share: this computer reads the bank now (chosen on this computer)');
    kick();
    return { ok: true };
  }

  return {
    status, view, publish, applyEdits, readEdits, readShare: async () => (await readShareDoc()).decoded,
    sharing, editOverride, saveBudgets, editAccount, ask, accountOverlay, remoteAccounts, useThisComputer,
    sharedBudgets: async () => sharedBudgets(await readEdits()),
  };
}

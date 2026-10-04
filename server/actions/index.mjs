// server/actions/index.mjs - THE way anything other than the page's own
// whole-state save changes dashboard data: the HTTP server (/api/actions,
// /api/query), the MCP server (mcp/server.mjs, in HTTP or embedded mode) and
// tools/actions-cli.mjs all call this library.
//
//   const actions = createActions({ dataDir, store?, getConfig?, financeDir?, log? });
//   await actions.query('tasks.list', { view: 'today' })
//   await actions.apply({ ops: [{ op: 'task.create', title: '...' }], dryRun: true })
//   await actions.undo(token)
//   await actions.propose({ ops })          // dry run stored as a proposal, never applied
//   await actions.applyProposal(id)         // the user's click in the page
//   await actions.applyProposal(id, { only: [0, 2], dryRun: true })   // only the ticked changes:
//   await actions.applyProposal(id, { only: [0, 2], confirm })        // dry run, then apply with its token
//
// Guarantees
//   - Every write is a compare-and-swap under the state file's cross-process
//     lock (server/state-store.mjs mutate): the server, any number of MCP
//     processes, scripts and the browser can never overwrite each other. The
//     version (_lastSave) only ever grows; open tabs see it change (SSE).
//   - A batch is atomic: it runs on a copy; one failing op and nothing is
//     written. All op errors are reported at once, each with its op index.
//   - Batches over 25 ops, touching over 25 tasks, or holding a delete/merge
//     need a confirm token from a dry run of exactly those ops (15 minutes).
//   - idempotencyKey: the same key within 24 hours returns the first result.
//   - Every applied batch gets an undo token (history.list shows them).
//   - Part of a proposal: the ops it needs ($ref) come along, refs to ops
//     applied earlier become the ids those created, and the subset is dry-run
//     for a confirm token tied to exactly those ops before it is applied. The
//     proposal remembers which ops are applied (appliedIdx) and stays pending
//     until all are.

import { dataPaths, loadConfig } from '../../lib/datadir.mjs';
import { opsSubset, opsRemapPreview } from '../../lib/select-logic.mjs';
import { createStateStore } from '../state-store.mjs';
import { OPS, OP_BY_NAME, OP_BY_TOOL } from './ops.mjs';
import { QUERIES, QUERY_BY_NAME, QUERY_BY_TOOL, taskNotFound } from './queries.mjs';
import { check, publicSchema } from './validate.mjs';
import { recorder, snapshot, restore, sameSnap } from './entities.mjs';
import { createJournal } from './journal.mjs';
import { ensureLocalToken, signConfirm, verifyConfirm, sha } from './auth.mjs';
import { nearDuplicate } from './find.mjs';
import {
  ActionError, SOURCES, clock, clone, stable, cleanLine, normTag, tagCounts, tagRegistry, closest, truncate, newActivityId, newToken, weekdayOf,
} from './model.mjs';

export const MAX_OPS = 200;
export const CONFIRM_OVER = 25;

export function createActions({ dataDir, store, getConfig, financeDir, log = () => {}, now = () => Date.now() } = {}) {
  if (!dataDir) throw new Error('createActions needs dataDir');
  const paths = dataPaths(dataDir);
  store = store || createStateStore({ stateDir: paths.stateDir, log });
  const journal = createJournal(store.stateDir || paths.stateDir, { now });

  let cfgCache = null, cfgAt = 0;
  async function config() {
    if (getConfig) return getConfig();
    if (!cfgCache || now() - cfgAt > 3000) { cfgCache = await loadConfig(dataDir); cfgAt = now(); }
    return cfgCache;
  }
  let secret = null;
  const getSecret = async () => (secret = secret || await ensureLocalToken(paths.root));

  async function readState() {
    const s = await store.readObject();
    return s && typeof s === 'object' ? s : { custom: [] };
  }
  async function queryCtx(s) {
    const cfg = await config();
    return {
      s, cfg, clock: clock(cfg.timezone, new Date(now())), paths,
      financeDir: financeDir || cfg.financeDir || paths.finance,
      version: Number(s._lastSave) || 0, journal,
    };
  }

  const dateHint = (today) => `Today is ${today} (${weekdayOf(today)}); call get_context for the next 14 days.`;
  function schemaErrors(schema, params, extra, today) {
    return check(schema, params).map(e => new ActionError('INVALID_PARAMS', e.message, {
      field: e.field, valid: e.valid, hint: e.hint || (/YYYY-MM-DD/.test(e.message) ? dateHint(today) : undefined), ...extra,
    }));
  }
  function batchError(errors) {
    const first = errors[0];
    const e = new ActionError(first.code, errors.length > 1 ? `${first.message} (and ${errors.length - 1} more problem${errors.length > 2 ? 's' : ''}; see errors)` : first.message, {
      field: first.field, valid: first.valid, hint: first.hint, candidates: first.candidates, opIndex: first.opIndex, op: first.op,
      status: first.status, errors: errors.length > 1 ? errors.slice(0, 20).map(x => x.toJSON()) : undefined,
    });
    if (first.more) e.more = first.more;
    return e;
  }

  // ── Queries ─────────────────────────────────────────────────────────
  async function query(name, params = {}) {
    const def = QUERY_BY_NAME.get(name) || QUERY_BY_TOOL.get(name);
    if (!def) {
      const valid = QUERIES.map(x => x.name);
      throw new ActionError('UNKNOWN_QUERY', `unknown query '${truncate(name, 40)}'`, { field: 'op', valid, hint: closest(name, valid, 1).map(x => `did you mean '${x}'?`)[0] });
    }
    params = params && typeof params === 'object' && !Array.isArray(params) ? params : {};
    const q = await queryCtx(await readState());
    const errs = schemaErrors(def.schema, params, {}, q.clock.today);
    if (errs.length) throw batchError(errs);
    return def.run(q, params);
  }

  // ── Batches ─────────────────────────────────────────────────────────
  function normalize(ops, today) {
    if (!Array.isArray(ops) || !ops.length) throw new ActionError('INVALID_PARAMS', 'ops must be a non-empty array of {op, ...params}', { field: 'ops', hint: `e.g. [{"op":"task.complete","id":"u-123-abc"}]; valid ops: ${OPS.map(o => o.name).join(', ')}` });
    if (ops.length > MAX_OPS) throw new ActionError('TOO_MANY_OPS', `at most ${MAX_OPS} ops per batch (got ${ops.length}); split it`, { field: 'ops' });
    const items = [], errors = [];
    ops.forEach((raw, index) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push(new ActionError('INVALID_PARAMS', `ops[${index}] must be an object like {"op":"task.update","id":"..."}`, { opIndex: index, field: `ops[${index}]` })); return; }
      const { op, params, ...rest } = raw;
      const def = OP_BY_NAME.get(op) || OP_BY_TOOL.get(op);
      if (!def) {
        const valid = OPS.map(o => o.name);
        errors.push(new ActionError('UNKNOWN_OP', `ops[${index}]: unknown op '${truncate(op, 40)}'`, { opIndex: index, field: 'op', valid, hint: closest(op, [...valid, ...OPS.map(o => o.tool)], 1).map(x => `did you mean '${OP_BY_TOOL.get(x)?.name || x}'?`)[0] }));
        return;
      }
      const p = params && typeof params === 'object' && !Array.isArray(params) && !Object.keys(rest).length ? params : rest;
      const errs = schemaErrors(def.schema, p, { opIndex: index, op: def.name }, today);
      if (errs.length) { errs.forEach(e => { e.message = `ops[${index}] (${def.name}): ${e.message}`; }); errors.push(...errs); return; }
      items.push({ index, def, params: p });
    });
    return { items, errors };
  }
  const opsHash = (items) => sha(stable(items.map(i => ({ op: i.def.name, ...i.params }))));
  // Ids made by THIS batch (a new task, countdown, subtask, note...) are new
  // random ids on every run, so they are replaced by placeholders: otherwise a
  // proposal or confirm token for "create X, then add subtasks to $X" could
  // never match its own re-run.
  const previewHash = (preview) => {
    const fresh = [];
    for (const p of preview) {
      for (const [k, v] of Object.entries(p.created || {})) if (/id$/i.test(k) && typeof v === 'string' && v.length >= 6) fresh.push(v);
      for (const c of p.changes) if (c.field === 'created' && typeof c.id === 'string' && c.id.length >= 6) fresh.push(c.id);
    }
    let text = stable(preview.map(p => ({ op: p.op, summary: p.summary, changes: p.changes.map(c => ({ label: c.label, field: c.field, from: c.from, to: c.to, ...(c.field === 'created' ? {} : { id: c.id }) })) })));
    [...new Set(fresh)].sort((a, b) => b.length - a.length).forEach((id, i) => { text = text.split(id).join(`$new${i}`); });
    return sha(text);
  };

  /** Run the ops on a copy of `cur`. Never throws ActionErrors: returns them. */
  function execute(cur, items, { source, client, today, timeNow }) {
    const s = clone(cur);
    s.custom = Array.isArray(s.custom) ? s.custom : [];
    const rec = recorder(s);
    const refs = new Map();
    const warnings = [];
    const errors = [];
    const preview = [];
    let current = null;
    const pseudoQ = { s, clock: { today } };
    const ctx = {
      s, today, now: timeNow, source, client, refs,
      paths,                                         // the data folder (ops-autolink.mjs reads the workspace index)
      warn: (message) => warnings.push({ opIndex: current, message }),
      touch: (key) => rec.touch(key),
      task(id, field = 'id') {
        let rid = String(id ?? '').trim();
        if (rid.startsWith('$')) {
          const r = refs.get(rid.slice(1));
          if (!r) throw new ActionError('UNKNOWN_REF', `no task with ref '${rid.slice(1)}' was created earlier in this batch`, { field, hint: 'give task.create a ref:"name" and use "$name" in later ops', valid: [...refs.keys()].map(k => '$' + k) });
          rid = r;
        }
        const t = s.custom.find(x => x && x.id === rid);
        if (t && !(s.deleted && s.deleted[rid])) { rec.touch('task:' + rid); return t; }
        if ((s.deleted && s.deleted[rid]) || (s.bin && (s.bin.tasks || []).some(b => b && b.id === rid))) {
          throw new ActionError('TASK_BINNED', `task ${rid} is in the bin`, { field, hint: 'restore_task brings it back first' });
        }
        throw taskNotFound(pseudoQ, rid, field);
      },
      log(taskId, type, details = {}) {
        s.taskActivity = s.taskActivity && typeof s.taskActivity === 'object' ? s.taskActivity : {};
        (s.taskActivity[taskId] = s.taskActivity[taskId] || []).push({ id: newActivityId(), ts: timeNow, type, ...details, source, ...(client ? { client } : {}) });
      },
      checkTags(tags, createTag, field) {
        const out = [];
        const { open, total } = tagCounts(s);
        const known = new Set([...(tagRegistry(s) || []), ...total.keys()]);
        tags.forEach((raw, i) => {
          const t = normTag(raw);
          if (!t) throw new ActionError('BAD_VALUE', `tag ${JSON.stringify(String(raw).slice(0, 30))} is empty after cleaning`, { field: `${field}[${i}]` });
          if (!known.has(t) && !createTag) {
            const top = [...known].sort((a, b) => (open.get(b) || 0) - (open.get(a) || 0)).slice(0, 40);
            const near = closest(t, [...known]);
            throw new ActionError('NEW_TAG', `'${t}' is not an existing tag${near.length ? `; similar: ${near.join(', ')}` : ''}`, {
              field: Array.isArray(tags) && field === 'tags' ? `${field}[${i}]` : field, valid: top,
              hint: 'reuse an existing tag (list_tags), or pass createTag:true if a new tag is really needed',
            });
          }
          if (!out.includes(t)) out.push(t);
        });
        return out;
      },
      findSimilar(title) {
        return s.custom.filter(t => t && !(s.deleted && s.deleted[t.id]) && (s.statuses || {})[t.id] !== 'done' && nearDuplicate(title, t.title))
          .slice(0, 3).map(t => ({ id: t.id, title: t.title, due: t.dueDate || null, stream: t.stream }));
      },
    };
    for (const it of items) {
      current = it.index;
      try {
        const r = it.def.run(ctx, it.params) || { summary: it.def.name, changes: [] };
        preview.push({ index: it.index, op: it.def.name, summary: r.summary, changes: r.changes || [], ...(r.created ? { created: r.created } : {}) });
      } catch (e) {
        if (!(e instanceof ActionError)) throw e;
        e.opIndex = it.index; e.op = it.def.name;
        if (!e.message.startsWith('ops[')) e.message = `ops[${it.index}] (${it.def.name}): ${e.message}`;
        errors.push(e);
      }
    }
    const entities = errors.length ? [] : rec.finish(s);
    const reasons = [];
    if (items.length > CONFIRM_OVER) reasons.push(`more than ${CONFIRM_OVER} ops (${items.length})`);
    const danger = [...new Set(items.filter(i => i.def.danger).map(i => i.def.name))];
    if (danger.length) reasons.push(`deletes or merges (${danger.join(', ')})`);
    const taskCount = entities.filter(e => e.key.startsWith('task:')).length;
    if (taskCount > CONFIRM_OVER) reasons.push(`changes more than ${CONFIRM_OVER} tasks (${taskCount})`);
    return { next: s, preview, warnings, errors, entities, reasons, created: preview.filter(p => p.created).map(p => ({ index: p.index, ...p.created })) };
  }

  const meta = async (source, client) => {
    const cfg = await config();
    return { source: SOURCES.includes(source) ? source : 'script', client: client ? cleanLine(client, 80) || null : null, today: clock(cfg.timezone, new Date(now())).today, timeNow: now() };
  };
  const summarize = (preview) => {
    const changed = preview.filter(p => p.changes.length);
    const list = (changed.length ? changed : preview).map(p => p.summary);
    return list.length <= 3 ? list.join('; ') : `${list.slice(0, 2).join('; ')}; and ${list.length - 2} more`;
  };
  const publicPreview = (preview) => preview.map(p => ({ index: p.index, op: p.op, summary: p.summary, ...(p.changes.length ? { changes: p.changes } : {}), ...(p.created ? { created: p.created } : {}) }));

  /**
   * Apply (or dry-run) a batch.
   * args: {ops, dryRun, idempotencyKey, source, client, confirm, ifVersion}
   */
  async function apply(args = {}, internal = {}) {
    const m = await meta(args.source, args.client);
    const { items, errors } = normalize(args.ops, m.today);
    if (errors.length) {
      // Report every problem at once: also run the well-formed ops (on a copy,
      // nothing is written) so a wrong id is not only found on the retry.
      // A $ref to a create that failed validation is not a separate problem.
      try {
        if (items.length) errors.push(...execute(await readState(), items, m).errors.filter(e => e.code !== 'UNKNOWN_REF'));
      } catch { /* the format errors alone are still reported */ }
      errors.sort((a, b) => (a.opIndex ?? 0) - (b.opIndex ?? 0));
      throw batchError(errors);
    }
    const key = args.idempotencyKey != null ? String(args.idempotencyKey).slice(0, 200) : null;
    if (args.idempotencyKey != null && (!String(args.idempotencyKey).trim() || ['__proto__', 'constructor', 'prototype'].includes(key))) throw new ActionError('INVALID_PARAMS', 'idempotencyKey must be a non-empty string (and not a reserved word)', { field: 'idempotencyKey' });
    const oh = opsHash(items);

    if (args.dryRun) {
      const cur = await readState();
      const r = execute(cur, items, m);
      if (r.errors.length) throw batchError(r.errors);
      const ph = previewHash(r.preview);
      const out = {
        ok: true, dryRun: true, version: Number(cur._lastSave) || 0,
        summary: summarize(r.preview), changed: r.entities.length,
        preview: publicPreview(r.preview), warnings: r.warnings,
        needsConfirm: r.reasons.length > 0, ...(r.reasons.length ? { reasons: r.reasons } : {}),
        confirm: signConfirm(await getSecret(), { opsHash: oh, previewHash: ph, now: now() }),
      };
      Object.defineProperty(out, '_previewHash', { value: ph, enumerable: false });
      return out;
    }

    // A retry with the same key returns the first result; the same key with
    // DIFFERENT ops is a caller bug and is refused (returning the old result
    // would make the caller believe its new change was applied).
    const replay = async () => {
      const prev = await journal.idemEntry(key);
      if (!prev) return null;
      if (prev.opsHash && prev.opsHash !== oh) {
        throw new ActionError('IDEMPOTENCY_KEY_REUSED', 'this idempotencyKey was already used in the last 24 hours for different ops; use a new key for a new change', {
          field: 'idempotencyKey', hint: `that key already applied: ${truncate(prev.response && prev.response.summary, 120)}`,
        });
      }
      return { ...prev.response, idempotent: true };
    };
    if (key) { const prev = await replay(); if (prev) return prev; }
    const sec = await getSecret();
    let response = null;
    const mopts = {
      ifVersion: args.ifVersion, source: m.source, client: m.client, summary: null,
      afterCommit: async (info) => {
        const r = info.result;
        const token = newToken('undo');
        mopts.undo = token;   // announced to open tabs with the change (live sync)
        response = {
          ok: true, applied: items.length, changed: r.entities.length, version: info.version, prevVersion: info.prevVersion,
          summary: summarize(r.preview), preview: publicPreview(r.preview), warnings: r.warnings,
          created: r.created, undo: token,
        };
        if (info.recoveredFrom) {
          response.warnings = [...response.warnings, { message: `the state file was unreadable (corrupt), so it was restored from the newest good backup (${String(info.recoveredFrom).split(/[\\/]/).pop()}) before this change; changes saved after that backup may be missing - tell the user (a copy of the bad file is in state/backups/)` }];
        }
        try {
          await journal.update((j) => {
            j.history.push({ token, at: now(), version: info.version, prevVersion: info.prevVersion, source: m.source, client: m.client, summary: truncate(response.summary, 300), ops: items.length, entities: r.entities });
            if (key) j.idem[key] = { at: now(), response, opsHash: oh };
            if (internal.proposalId && j.proposals[internal.proposalId]) {
              if (internal.proposalIdx) markProposalOps(j.proposals[internal.proposalId], internal.proposalIdx, r.created, token);
              else Object.assign(j.proposals[internal.proposalId], { status: 'applied', appliedAt: now(), undo: token });
            }
          });
        } catch (e) {
          // The change IS saved: report success (an error here would invite a
          // retry that applies it twice), without an undo token.
          log('warn', `actions: change saved but the journal could not be written (${e.code || e.message})`);
          response.undo = null;
          mopts.undo = null;
          response.warnings = [...response.warnings, { message: 'the change was saved, but the undo history could not be written (the journal file is locked by another program), so this change cannot be undone automatically' }];
        }
      },
    };
    const res = await store.mutate(async (cur) => {
      if (key) { const prev = await replay(); if (prev) { response = prev; return null; } }
      // Under the state lock (the journal is updated under it too): two clicks
      // on the same proposal, or two overlapping parts of it, apply once.
      if (internal.proposalId) {
        const pr = await journal.getProposal(internal.proposalId);
        if (!pr || pr.status !== 'pending') throw new ActionError('ALREADY_APPLIED', `that proposal is ${pr ? pr.status : 'gone'}`, { field: 'proposalId' });
        const done = new Set(Array.isArray(pr.appliedIdx) ? pr.appliedIdx : []);
        if ((internal.proposalIdx || []).some(i => done.has(i))) throw new ActionError('ALREADY_APPLIED', 'some of these changes were applied already', { field: 'only' });
      }
      const r = execute(cur, items, m);
      if (r.errors.length) throw batchError(r.errors);
      const ph = previewHash(r.preview);
      if (internal.trustedPreviewHash) {
        if (internal.trustedPreviewHash !== ph) {
          throw new ActionError('PREVIEW_CHANGED', 'the dashboard changed since this was proposed, so the changes would now be different; review the new preview', {
            preview: publicPreview(r.preview), version: Number(cur._lastSave) || 0, hint: 'the proposal has been refreshed with the new preview',
          });
        }
      } else if (r.reasons.length || internal.requireConfirm) {
        if (!args.confirm) {
          throw new ActionError('NEEDS_CONFIRM', r.reasons.length ? `this batch ${r.reasons.join(' and ')}: check the preview, then send exactly the same ops again with the confirm token`
            : 'applying part of a proposal needs a dry run of exactly those changes first (dryRun:true), then the same request with the confirm token it returns', {
            reasons: r.reasons, preview: publicPreview(r.preview), confirm: signConfirm(sec, { opsHash: oh, previewHash: ph, now: now() }), field: 'confirm',
          });
        }
        const v = verifyConfirm(sec, args.confirm, { opsHash: oh, now: now() });
        if (!v.ok) throw new ActionError('BAD_CONFIRM', v.why, { field: 'confirm', hint: 'run the same ops with dryRun:true to get a fresh confirm token' });
        if (v.previewHash !== ph) {
          throw new ActionError('PREVIEW_CHANGED', 'the data changed since your dry run, so these ops would now do something different; check the new preview and confirm again', {
            preview: publicPreview(r.preview), confirm: signConfirm(sec, { opsHash: oh, previewHash: ph, now: now() }), field: 'confirm',
          });
        }
      }
      if (!r.entities.length) {
        response = { ok: true, applied: items.length, changed: 0, version: Number(cur._lastSave) || 0, summary: 'nothing changed', preview: publicPreview(r.preview), warnings: r.warnings, created: [], undo: null };
        return null;
      }
      mopts.summary = summarize(r.preview);
      return { next: r.next, result: r };
    }, mopts);
    if (!response) response = { ok: true, applied: items.length, changed: 0, version: res.version, summary: 'nothing changed', preview: [], warnings: [], undo: null };
    if (res.written) log('note', `actions: ${items.length} op(s) by ${m.source}${m.client ? ':' + m.client : ''} -> v${res.version}`);
    return response;
  }

  // ── Undo ────────────────────────────────────────────────────────────
  async function undo(token, { source, client, force = false, dryRun = false } = {}) {
    const m = await meta(source, client);
    const tok = String(token || '').trim();
    const check = async (cur) => {
      const entry = await journal.entry(tok);
      if (!entry) throw new ActionError('NOT_FOUND', `no change with undo token '${truncate(tok, 40)}'`, { field: 'token', hint: 'list_history shows recent changes and their tokens' });
      if (entry.undone) throw new ActionError('ALREADY_UNDONE', `that change was already undone (${new Date(entry.undone.at).toISOString().slice(0, 16)})`, { field: 'token', hint: entry.undone.by ? `to redo it, undo ${entry.undone.by}` : undefined });
      if (!entry.entities) throw new ActionError('NOT_UNDOABLE', 'that change is too old to undo automatically', { field: 'token' });
      const conflicts = [];
      for (const e of entry.entities) {
        if (!sameSnap(e.key, snapshot(cur, e.key), e.after, true)) {   // true: an entity may ignore churn (autolink suggestions)
          const it = e.after.item || e.before.item;
          conflicts.push({ entity: e.key, label: it ? truncate(it.title || it.name || it.label || e.key, 60) : e.key });
        }
      }
      return { entry, conflicts };
    };
    const run = (cur, entry) => {
      const s = clone(cur);
      const rec = recorder(s);
      for (const e of entry.entities) { rec.touch(e.key); restore(s, e.key, e.before); }
      for (const e of entry.entities) {
        if (!e.key.startsWith('task:')) continue;
        const id = e.key.slice(5);
        if (!(s.custom || []).some(t => t.id === id)) continue;
        s.taskActivity = s.taskActivity || {};
        (s.taskActivity[id] = s.taskActivity[id] || []).push({ id: newActivityId(), ts: m.timeNow, type: 'undo', text: `Undone: ${truncate(entry.summary, 80)}`, source: m.source, ...(m.client ? { client: m.client } : {}) });
      }
      return { s, entities: rec.finish(s) };
    };
    if (dryRun) {
      const cur = await readState();
      const { entry, conflicts } = await check(cur);
      return { ok: true, dryRun: true, token: tok, summary: `Undo: ${entry.summary}`, restores: entry.entities.length, conflicts, ...(conflicts.length ? { hint: 'these were changed since; undo would overwrite those later changes (force:true)' } : {}) };
    }
    let response = null;
    const res = await store.mutate(async (cur) => {
      const { entry, conflicts } = await check(cur);
      if (conflicts.length && !force) {
        throw new ActionError('CONFLICT', `${conflicts.length} item(s) were changed after that change, so undoing it would overwrite newer edits: ${conflicts.slice(0, 5).map(c => c.label).join('; ')}`, {
          conflicts, field: 'token', hint: 'undo the newer changes first, or pass force:true to overwrite them',
        });
      }
      const { s, entities } = run(cur, entry);
      if (!entities.length) { response = { ok: true, undone: tok, changed: 0, version: Number(cur._lastSave) || 0, undo: null }; return null; }
      return { next: s, result: { entry, entities, conflicts } };
    }, {
      source: m.source, client: m.client, summary: 'undo',
      afterCommit: async (info) => {
        const { entry, entities, conflicts } = info.result;
        const newTok = newToken('undo');
        response = { ok: true, undone: tok, summary: `Undo: ${entry.summary}`, changed: entities.length, version: info.version, undo: newTok, ...(conflicts.length ? { overwritten: conflicts } : {}) };
        try {
          await journal.update((j) => {
            const h = j.history.find(x => x.token === tok);
            if (h) h.undone = { at: now(), by: newTok };
            j.history.push({ token: newTok, at: now(), version: info.version, prevVersion: info.prevVersion, source: m.source, client: m.client, summary: truncate(`Undo: ${entry.summary}`, 300), ops: 1, undoOf: tok, entities });
          });
        } catch (e) {
          log('warn', `actions: undo saved but the journal could not be written (${e.code || e.message})`);
          response.undo = null;
          response.warning = 'the undo was saved, but the history could not be written (the journal file is locked), so it cannot be redone automatically';
        }
      },
    });
    return response || { ok: true, undone: tok, changed: 0, version: res.version, undo: null };
  }

  // ── Proposals (the in-app assistant: never applies by itself) ─────────
  async function propose({ ops, source = 'assistant', client, note } = {}) {
    const r = await apply({ ops, dryRun: true, source, client });
    const m = await meta(source, client);
    const { items } = normalize(ops, m.today);
    const id = newToken('prop');
    const stored = {
      at: now(), status: 'pending', source: m.source, client: m.client, note: note ? cleanLine(note, 300) : null,
      ops: items.map(i => ({ op: i.def.name, ...i.params })), version: r.version, summary: r.summary,
      preview: r.preview, warnings: r.warnings, previewHash: r._previewHash, needsConfirm: r.needsConfirm,
      reasons: Array.isArray(r.reasons) ? r.reasons.slice(0, 4) : [],
    };
    await journal.update((j) => { j.proposals[id] = stored; });
    return {
      ok: true, proposalId: id, summary: r.summary, changed: r.changed, preview: r.preview, warnings: r.warnings,
      note: 'Nothing has been changed. The user reviews this proposal in the dashboard and applies it with one click.',
    };
  }
  /** Record that ops `idx` (original numbers) of a stored proposal were applied (in a journal update). */
  function markProposalOps(pr, idx, created, undoToken) {
    if (!pr) return;
    const ids = { ...(pr.createdIds || {}) };
    for (const c of created || []) if (c && Number.isInteger(c.index) && idx[c.index] !== undefined && typeof c.id === 'string') ids[idx[c.index]] = c.id;
    pr.createdIds = ids;
    pr.appliedIdx = [...new Set([...(Array.isArray(pr.appliedIdx) ? pr.appliedIdx : []), ...idx])].sort((a, b) => a - b);
    pr.applies = [...(Array.isArray(pr.applies) ? pr.applies : []), { at: now(), idx, undo: undoToken || null }].slice(-50);
    if (pr.appliedIdx.length >= (Array.isArray(pr.ops) ? pr.ops.length : 0)) Object.assign(pr, { status: 'applied', appliedAt: now(), undo: undoToken || null });
  }
  /** Apply (or dry-run) only some ops of a stored proposal: see applyProposal({only}). */
  async function applyProposalPart(id, p, only, { source, client, dryRun, confirm }) {
    const appliedIdx = Array.isArray(p.appliedIdx) ? p.appliedIdx : [];
    if (!Array.isArray(only) || !only.length || only.length > MAX_OPS) throw new ActionError('INVALID_PARAMS', 'only must list the numbers (0-based) of the proposal changes to apply', { field: 'only' });
    const sub = opsSubset(p.ops, only, { applied: appliedIdx, createdIds: p.createdIds || {} });
    if (sub.error) throw new ActionError('INVALID_PARAMS', sub.error, { field: 'only', hint: `this proposal has ${p.ops.length} change${p.ops.length === 1 ? '' : 's'} (0-${p.ops.length - 1})` });
    if (!sub.ops.length) throw new ActionError('ALREADY_APPLIED', 'those changes were applied already', { field: 'only' });
    if (sub.missing.length) throw new ActionError('UNKNOWN_REF', `the task made earlier as '$${sub.missing[0]}' is not known any more, so the changes that need it cannot be applied`, { field: 'only' });
    // Errors and previews of the subset speak in subset positions: give them the proposal's numbers.
    const back = (k) => (sub.index[k] !== undefined ? sub.index[k] : k);
    const remap = (e) => {
      if (!(e instanceof ActionError)) return e;
      e.message = e.message.replace(/ops\[(\d+)\]/g, (s, k) => `ops[${back(Number(k))}]`);
      if (Number.isInteger(e.opIndex)) e.opIndex = back(e.opIndex);
      if (Array.isArray(e.errors)) e.errors = e.errors.map(x => ({ ...x, ...(Number.isInteger(x.opIndex) ? { opIndex: back(x.opIndex) } : {}), message: String(x.message || '').replace(/ops\[(\d+)\]/g, (s, k) => `ops[${back(Number(k))}]`) }));
      if (Array.isArray(e.preview)) e.preview = opsRemapPreview(e.preview, sub.index);
      return e;
    };
    const extra = { proposalId: id, only: sub.index, added: sub.added };
    if (dryRun) {
      let r;
      try { r = await apply({ ops: sub.ops, dryRun: true, source, client: client || p.client }); } catch (e) { throw remap(e); }
      // Would these ops still do what the user saw in the proposal?
      const norm = (list) => list.map(x => ({ ...x, changes: x.changes || [] }));
      const shown = norm((p.preview || []).filter(x => sub.index.includes(x.index)));
      // A ref to a task an earlier part made is now its real id; the proposal showed
      // the id from its own dry run. Swap those back before comparing.
      const swap = new Map();
      for (const [at, realId] of Object.entries(p.createdIds || {})) {
        const pv = (p.preview || []).find(x => x && x.index === Number(at)) || {};
        const was = Object.entries(pv.created || {}).find(([k, v]) => /id$/i.test(k) && typeof v === 'string')?.[1]
          || ((pv.changes || []).find(c => c.field === 'created') || {}).id;
        if (typeof was === 'string' && typeof realId === 'string' && was !== realId) swap.set(realId, was);
      }
      const back = (v) => (typeof v === 'string' ? (swap.get(v) ?? v) : Array.isArray(v) ? v.map(back) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, back(x)])) : v);
      const nowHash = swap.size ? previewHash(norm(back(r.preview))) : r._previewHash;
      return { ...r, ...extra, preview: opsRemapPreview(r.preview, sub.index), changedSinceProposal: previewHash(shown) !== nowHash };
    }
    let res;
    try {
      res = await apply({ ops: sub.ops, source, client: client || p.client, confirm }, { requireConfirm: true, proposalId: id, proposalIdx: sub.index });
    } catch (e) { throw remap(e); }
    if (!res.undo && !res.changed) await journal.update((j) => markProposalOps(j.proposals[id], sub.index, [], null));
    const after = await journal.getProposal(id);
    return {
      ...res, ...extra, preview: opsRemapPreview(res.preview, sub.index),
      created: (res.created || []).map(c => ({ ...c, index: back(c.index) })),
      appliedIdx: after ? after.appliedIdx || [] : sub.index, status: after ? after.status : 'applied',
    };
  }
  /**
   * The user's click on a stored proposal. Without `only`: the whole proposal
   * (trusted by its stored preview hash). With `only` (op numbers): just those
   * ops and what they need; `dryRun:true` returns their preview and a confirm
   * token for exactly those ops, which the apply then needs.
   */
  async function applyProposal(id, { source = 'assistant', client, only, dryRun = false, confirm } = {}) {
    const p = await journal.getProposal(String(id || ''));
    if (!p) throw new ActionError('NOT_FOUND', `no proposal '${truncate(id, 40)}' (proposals expire after 7 days)`, { field: 'proposalId' });
    if (p.status !== 'pending') throw new ActionError('ALREADY_APPLIED', `that proposal is ${p.status}`, { field: 'proposalId', ...(p.undo ? { hint: `undo token: ${p.undo}` } : {}) });
    // Part of it, a dry run, or the rest of a proposal that was partly applied.
    if (only != null || dryRun || (Array.isArray(p.appliedIdx) && p.appliedIdx.length)) {
      return applyProposalPart(String(id), p, only != null ? only : p.ops.map((x, i) => i), { source, client, dryRun, confirm });
    }
    try {
      return await apply({ ops: p.ops, source, client: client || p.client }, { trustedPreviewHash: p.previewHash, proposalId: id });
    } catch (e) {
      if (e.code === 'PREVIEW_CHANGED') {
        // Refresh the stored proposal so the page can show what it would do now.
        const fresh = await apply({ ops: p.ops, dryRun: true, source, client });
        await journal.update((j) => { if (j.proposals[id]) Object.assign(j.proposals[id], {
          preview: fresh.preview, previewHash: fresh._previewHash, version: fresh.version, summary: fresh.summary,
          needsConfirm: !!fresh.needsConfirm, reasons: Array.isArray(fresh.reasons) ? fresh.reasons.slice(0, 4) : [],
        }); });
      }
      throw e;
    }
  }
  async function dismissProposal(id) {
    const ok = await journal.update((j) => { const p = j.proposals[id]; if (!p || p.status !== 'pending') return false; p.status = 'dismissed'; return true; });
    if (!ok) throw new ActionError('NOT_FOUND', `no pending proposal '${truncate(id, 40)}'`, { field: 'proposalId' });
    return { ok: true, dismissed: id };
  }

  function describe() {
    return {
      ops: OPS.map(o => ({ name: o.name, tool: o.tool, description: o.description, ...(o.danger ? { needsDryRun: true } : {}), schema: publicSchema(o.schema) })),
      queries: QUERIES.map(x => ({ name: x.name, tool: x.tool, description: x.description, schema: publicSchema(x.schema) })),
      rules: {
        maxOps: MAX_OPS, confirmOver: CONFIRM_OVER, dates: 'ISO YYYY-MM-DD only', sources: SOURCES,
        confirm: `batches over ${CONFIRM_OVER} ops, touching over ${CONFIRM_OVER} tasks, or holding ${OPS.filter(o => o.danger).map(o => o.name).join('/')} need {confirm} from a dry run of the same ops`,
      },
    };
  }

  return {
    dataDir: paths.root, paths, store, journal,
    query, apply, undo, propose, applyProposal, dismissProposal, describe,
    version: () => store.version(), config, secret: getSecret,
  };
}

export { ActionError, OPS, QUERIES };

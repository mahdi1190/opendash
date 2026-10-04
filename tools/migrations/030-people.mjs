// 030-people - People records in the 2.1 shape, and no task pointing at nobody.
//
// Generic part (every data folder):
//   - every person gets emails[] (the old single `email` stays as the first
//     one), kind 'person' | 'org' | 'mailbox' (shared role addresses such as
//     support@ / summary@ become 'mailbox'), lower-case unique aliases;
//   - the user's own record keeps self:true (002 set it from "(you)");
//   - task.people ids with no person record are fixed: an id that is really a
//     name or alias of someone ("Sam Taylor" -> sam) is remapped, anything
//     else gets a minimal "stub" profile with exactly that id, so the link
//     shows up and can be completed in People;
//   - the old free-text peopleNotes[id] becomes the person's dated notes[].
// Plan part (<data>/migration-plans/030-people.json or --plan <file>; the
// facts are personal so they never live in this repo):
//   { self: "<id>",
//     people: [{id, name, role, org, group, kind, emails[], aliases[], streams[], phone, linkedin, inactive, linkTaskIds[]}],
//     update: {"<id>": {name, role, org, group, kind, inactive, phone, linkedin,
//                       emails: [..] | {add:[..], remove:[..]}, aliases: same, streams: same}},
//     remap:  {"<id or name used on tasks>": "<person id>"} }
//   People in the plan are created (or completed, if the id exists) and linked
//   to the tasks listed; never removed. Links the user removed by hand
//   (task.peopleExcluded) are never re-added.
// Idempotent: a second run changes nothing. Reports counts only.

import { runIfMain } from './_lib.mjs';
import { loadPlan } from './_plans.mjs';
import { pplNormalizePerson, pplBuildIndex, pplLinked, pplOrphans, pplSuggest, pplFold, pplTagPerson } from '../../lib/people-tags.mjs';

export const id = '030-people';
export const description = 'People: emails[], kind and stub profiles for dangling task links; with a plan, add and correct people and link their tasks.';
export const auto = false;

const PALETTE = ['#2563eb', '#7c3aed', '#059669', '#0891b2', '#ea580c', '#db2777', '#dc2626', '#0d9488', '#ca8a04', '#4f46e5', '#be185d', '#6b7280'];
const FIELDS = ['name', 'role', 'org', 'group', 'kind', 'phone', 'linkedin', 'avatarUrl', 'color'];
const human = (id) => String(id).replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/(^|\s)\p{Ll}/gu, (m) => m.toUpperCase());
const lowerList = (a) => [...new Set((Array.isArray(a) ? a : []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean))];
const strList = (a) => [...new Set((Array.isArray(a) ? a : []).map(x => String(x || '').trim()).filter(Boolean))];

/** Apply a list patch: an array replaces, {add, remove} edits. */
function patchList(cur, patch, norm) {
  if (patch === undefined || patch === null) return cur;
  if (Array.isArray(patch)) return norm(patch);
  let out = cur.slice();
  for (const x of norm(patch.add || [])) if (!out.includes(x)) out.push(x);
  const rm = new Set(norm(patch.remove || []));
  out = out.filter(x => !rm.has(x));
  return out;
}

export function measure(state) {
  const idx = pplBuildIndex(state.people);
  const st = state.statuses || {}, del = state.deleted || {};
  const open = (state.custom || []).filter(t => t && !del[t.id] && st[t.id] !== 'done');
  const linked = open.filter(t => pplLinked(state, t, idx).some(id => idx.byId.has(id) && !idx.self.has(id))).length;
  const orphans = pplOrphans(state);
  const sug = pplSuggest(state, { index: idx });
  return {
    people: (state.people || []).filter(p => p && !p.self).length,
    orphanIds: orphans.size,
    orphanLinks: [...orphans.values()].reduce((n, r) => n + r.total, 0),
    openTasks: open.length,
    openLinked: linked,
    suggestions: sug.length,
    strongSuggestions: sug.filter(x => x.strength === 'strong').length,
  };
}

export function migratePeople(state, plan, { now = Date.now() } = {}) {
  plan = plan || {};
  const stats = { normalised: 0, created: 0, completed: 0, updated: 0, remapped: 0, stubs: 0, linksAdded: 0, notesMoved: 0, missingTasks: 0 };
  state.people = Array.isArray(state.people) ? state.people.filter(p => p && typeof p.id === 'string' && p.id) : [];
  // 1. shape
  state.people = state.people.map(p => {
    const n = pplNormalizePerson(p);
    if (JSON.stringify(n) !== JSON.stringify(p)) stats.normalised++;
    return n;
  });
  const byId = () => new Map(state.people.map(p => [p.id, p]));
  // 2. the user
  if (plan.self) {
    for (const p of state.people) {
      if (p.id === plan.self) { if (!p.self) { p.self = true; stats.updated++; } }
    }
  }
  // 3. people from the plan
  const remap = new Map(Object.entries(plan.remap || {}).map(([k, v]) => [String(k), String(v)]));
  const links = [];   // [personId, taskId]
  for (const spec of Array.isArray(plan.people) ? plan.people : []) {
    if (!spec || !spec.name) continue;
    const map = byId();
    let target = spec.id ? map.get(spec.id) : null;
    if (!target) target = state.people.find(p => pplFold(p.name) === pplFold(spec.name)) || null;
    if (target && spec.id && target.id !== spec.id) remap.set(spec.id, target.id);
    if (!target) {
      const pid = spec.id || pplFold(String(spec.name).split(/\s+/)[0]).replace(/[^a-z0-9]+/g, '-');
      target = pplNormalizePerson({ id: pid, name: String(spec.name).trim(), color: spec.color || PALETTE[state.people.length % PALETTE.length], aliases: [], emails: [] });
      state.people.push(target);
      stats.created++;
    } else {
      stats.completed++;
    }
    const before = JSON.stringify(target);
    for (const f of FIELDS) if (spec[f] !== undefined && spec[f] !== null && spec[f] !== '' && !target[f]) target[f] = spec[f];
    if (spec.kind && target.kind === 'person' && spec.kind !== 'person') target.kind = spec.kind;
    target.emails = patchList(target.emails || [], { add: spec.emails || (spec.email ? [spec.email] : []) }, lowerList);
    target.email = target.emails[0] || '';
    target.aliases = patchList(target.aliases || [], { add: spec.aliases || [] }, lowerList);
    target.streams = patchList(target.streams || [], { add: spec.streams || [] }, strList);
    if (spec.inactive === true && !target.inactive) target.inactive = true;
    if (before !== JSON.stringify(target) && stats.completed && !stats.created) { /* counted as completed */ }
    for (const tid of Array.isArray(spec.linkTaskIds) ? spec.linkTaskIds : []) links.push([target.id, String(tid)]);
  }
  // 4. corrections to existing people
  for (const [pid, patch] of Object.entries(plan.update || {})) {
    const p = byId().get(pid);
    if (!p || !patch || typeof patch !== 'object') continue;
    const before = JSON.stringify(p);
    for (const f of FIELDS) if (patch[f] !== undefined) { if (patch[f] === null || patch[f] === '') delete p[f]; else p[f] = String(patch[f]); }
    if (patch.inactive !== undefined) { if (patch.inactive) p.inactive = true; else delete p.inactive; }
    if (patch.emails !== undefined) { p.emails = patchList(p.emails || [], patch.emails, lowerList); p.email = p.emails[0] || ''; }
    if (patch.email !== undefined && patch.emails === undefined) { p.emails = patchList(p.emails || [], { add: [patch.email] }, lowerList); p.email = p.emails[0] || ''; }
    if (patch.aliases !== undefined) p.aliases = patchList(p.aliases || [], patch.aliases, lowerList);
    if (patch.streams !== undefined) p.streams = patchList(p.streams || [], patch.streams, strList);
    if (before !== JSON.stringify(p)) stats.updated++;
  }
  // 5. dangling ids: plan remap, then names/aliases, then stub profiles
  const known = () => new Set(state.people.map(p => p.id));
  const idx = pplBuildIndex(state.people);
  const resolve = (raw) => {
    if (known().has(raw)) return raw;
    if (remap.has(raw) && known().has(remap.get(raw))) return remap.get(raw);
    const f = pplFold(raw).trim();
    const byName = state.people.find(p => !p.self && pplFold(p.name) === f);
    if (byName) return byName.id;
    const viaTag = pplTagPerson(f.replace(/\s+/g, '-'), idx);
    return viaTag || null;
  };
  const fixList = (task) => {
    let changed = false;
    for (const key of ['people', 'peopleExcluded']) {
      if (!Array.isArray(task[key])) continue;
      const out = [];
      for (const raw of task[key]) {
        if (typeof raw !== 'string' || !raw) { changed = true; continue; }
        const to = resolve(raw) || raw;
        if (to !== raw) { changed = true; stats.remapped++; }
        if (!out.includes(to)) out.push(to); else changed = true;
      }
      task[key] = out;
    }
    return changed;
  };
  for (const t of state.custom || []) if (t) fixList(t);
  for (const b of (state.bin && state.bin.tasks) || []) if (b && b.customData) fixList(b.customData);
  for (const [oid] of pplOrphans(state)) {
    state.people.push({ id: oid, name: human(oid), kind: 'person', emails: [], email: '', aliases: [], streams: [], color: PALETTE[state.people.length % PALETTE.length], stub: true });
    stats.stubs++;
  }
  // 6. links from the plan
  const tasks = new Map((state.custom || []).filter(Boolean).map(t => [t.id, t]));
  for (const [pid, tid] of links) {
    const t = tasks.get(tid);
    if (!t) { stats.missingTasks++; continue; }
    const excluded = Array.isArray(t.peopleExcluded) ? t.peopleExcluded : [];
    const cur = Array.isArray(t.people) ? t.people : [];
    if (cur.includes(pid) || excluded.includes(pid)) continue;
    t.people = [...cur, pid];
    stats.linksAdded++;
  }
  // 7. free-text notes -> dated notes on the person
  if (state.peopleNotes && typeof state.peopleNotes === 'object') {
    for (const [pid, val] of Object.entries(state.peopleNotes)) {
      const p = byId().get(pid);
      if (!p) continue;
      const list = Array.isArray(p.notes) ? p.notes : [];
      const add = typeof val === 'string' ? (val.trim() ? [{ id: `pn-legacy-${pid}`, ts: now, text: val.trim() }] : [])
        : Array.isArray(val) ? val.filter(n => n && n.text) : [];
      for (const n of add) if (!list.some(x => x.id === n.id || x.text === n.text)) list.push(n);
      if (list.length) p.notes = list;
      delete state.peopleNotes[pid];
      if (add.length) stats.notesMoved += add.length;
    }
  }
  return stats;
}

export async function run(ctx) {
  const state = await ctx.state.read();
  if (!state) return { changed: false, notes: ['no state file yet: nothing to do'] };
  const { plan, file } = await loadPlan(ctx, id);
  const original = JSON.stringify(state);
  const before = measure(state);
  const s = migratePeople(state, plan);
  const after = measure(state);
  const changed = JSON.stringify(state) !== original;
  const notes = [
    plan ? `plan: ${file}` : 'no plan: generic fixes only (put one at <data>/migration-plans/030-people.json or pass --plan)',
    `people (not counting you): ${before.people} -> ${after.people} (${s.created} added from the plan, ${s.stubs} stub profiles)`,
    `records reshaped (emails[], kind, aliases): ${s.normalised}; corrected from the plan: ${s.updated}`,
    `task ids pointing at nobody: ${before.orphanIds} ids on ${before.orphanLinks} links -> ${after.orphanIds} (${s.remapped} remapped)`,
    `open tasks linked to someone: ${before.openLinked} of ${before.openTasks} -> ${after.openLinked} of ${after.openTasks} (${s.linksAdded} links added from the plan${s.missingTasks ? `, ${s.missingTasks} listed tasks not found` : ''})`,
    `link suggestions waiting in People: ${after.suggestions} (${after.strongSuggestions} from titles/subtasks)`,
    `person notes moved to dated notes: ${s.notesMoved}`,
  ];
  if (changed) await ctx.state.write(state);
  return { changed, notes, before, after, stats: s };
}

await runIfMain(import.meta.url, { id, description, auto, run });

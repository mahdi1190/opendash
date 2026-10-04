// 040-tags - one clean tag list.
//
// The rule: tags say what KIND of work a task is, or which cross-stream
// project it belongs to. Nothing else.
// Generic part (every data folder), on open AND done tasks, the bin copies
// and quick-add/saved templates:
//   - a tag that names a person becomes a link to that person (task.people);
//     blocked-<name> / waiting-<name> also become 'waiting';
//   - a tag equal to the task's own stream goes (the stream already says it);
//   - status and timing tags move into fields: urgent/must-do raise an open
//     task due within 14 days to P1, recurring/cadence set the repeat rule when
//     the title says how often, doing/in-progress set the status; the tag goes.
// Plan part (<data>/migration-plans/040-tags.json or --plan <file>):
//   { canonical:[tags], stripUnknown:true, merges:{into:[from...]},
//     toPeople:{tag:personId}, remove:[tags], addTags:{taskId:[tags]},
//     urgentWithinDays:14 }
//   canonical becomes state.tagRegistry (the list the pickers offer);
//   stripUnknown drops every tag not on it after the merges.
// Run 030-people first: a plan that sends tags to people who do not exist
// is refused (nothing is written). Every changed task gets an activity entry.
// Idempotent. Reports counts only.

import { runIfMain } from './_lib.mjs';
import { loadPlan, todayFor, activityLogger } from './_plans.mjs';
import { pplBuildIndex, tglCleanState, tglNorm } from '../../lib/people-tags.mjs';

export const id = '040-tags';
export const description = 'Tags: person tags become people links, status tags become fields, stream tags go; with a plan, merge into one canonical list.';
export const auto = false;

export async function run(ctx) {
  const state = await ctx.state.read();
  if (!state) return { changed: false, notes: ['no state file yet: nothing to do'] };
  const { plan, file } = await loadPlan(ctx, id);
  if (plan && plan.toPeople) {
    const have = new Set((state.people || []).map(p => p && p.id));
    const missing = [...new Set(Object.values(plan.toPeople).map(String))].filter(pid => !have.has(pid));
    if (missing.length) throw new Error(`the plan links tags to ${missing.length} people who are not in People yet; run 030-people (with its plan) first`);
  }
  if (plan && plan.canonical && !Array.isArray(plan.canonical)) throw new Error('plan.canonical must be a list of tags');
  const original = JSON.stringify(state);
  const today = await todayFor(ctx);
  const log = activityLogger(state, id);
  const stats = tglCleanState(state, plan || {}, { index: pplBuildIndex(state.people), today, log });
  const changed = JSON.stringify(state) !== original;
  const canon = plan && Array.isArray(plan.canonical) ? plan.canonical.map(tglNorm).filter(Boolean).length : 0;
  const notes = [
    plan ? `plan: ${file}` : 'no plan: generic rules only (put one at <data>/migration-plans/040-tags.json or pass --plan)',
    `distinct tags on tasks: ${stats.tagsBefore} -> ${stats.tagsAfter}; on open tasks (the sidebar): ${stats.openTagsBefore} -> ${stats.openTagsAfter}`,
    `tasks changed: ${stats.tasksChanged} (${stats.openTasksChanged} open, ${stats.doneTasksChanged} done) + ${stats.binTasksChanged} in the bin`,
    `person tags turned into links: ${stats.peopleLinked} links on ${stats.tasksGainingPeople} tasks; 'waiting' added to ${stats.waitingAdded}`,
    `status tags moved into fields: ${stats.priorityRaised} raised to P1, ${stats.recurrenceSet} repeat rules, ${stats.statusSet} set to in progress`,
    `hand-picked tags added: ${stats.tagsAdded}; templates changed: ${stats.templatesChanged}`,
    canon ? `canonical list: ${canon} tags (the tag pickers offer these)` : 'no canonical list',
    `open tasks with more than 3 tags: ${stats.tasksOverThreeTags}`,
  ];
  if (changed) await ctx.state.write(state);
  return { changed, notes, stats };
}

await runIfMain(import.meta.url, { id, description, auto, run });

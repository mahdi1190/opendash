// Deliberate island update after ordinary isolated restoration and sync play.
// Both entry points use the same planner; automatic startup never runs it.
import { runIfMain } from './_lib.mjs';
import { gardenIsland } from '../../lib/garden-island.mjs';
import { createIslandMigrationAdapter } from '../../lib/garden-island-adapter.mjs';
import { planGardenIslandV3,applyGardenIslandPlan } from '../../lib/garden-island-plan.mjs';
export const id='100-garden-island-v3';
export const description='Relayout only invalid Garden placements; retain complete aged records in storage when needed.';
export const auto=false;
/** Shared by the CLI and the deliberate local page action. No I/O or readiness override. */
export function prepareGardenIslandUpdate(state,options={}){
 const adapter=createIslandMigrationAdapter(options);
 return{plan:planGardenIslandV3(state,gardenIsland.data,adapter),contractReady:adapter.contractReady===true};
}
export function commitGardenIslandUpdate(state,prepared){
 return applyGardenIslandPlan(state,prepared.plan,{contractReady:prepared.contractReady===true});
}
export async function run(ctx){
 const state=await ctx.state.read();if(!state?.garden?.since)return{changed:false,notes:['No existing garden to relayout.']};
 const prepared=prepareGardenIslandUpdate(state),{plan}=prepared;
 if(plan.status==='already-current')return{changed:false,notes:['This Garden already has the exact canonical island fingerprint.']};
 const c=plan.counts||{},notes=[`${ctx.dryRun?'Would keep':'Kept'} ${c.retained||0} placements, relocate ${c.relocated||0}, and retain ${c.packed||0} complete rows in nursery storage. No refunds or item conversions.`];
 if(plan.status!=='planned'){
  notes.push('Apply is blocked: '+plan.status+'. All original records/designs remain untouched.');
  for(const b of plan.design?.blockers||[])notes.push(`Named layout ${JSON.stringify(b.layout)}: ${b.reason}.`);
  if(ctx.dryRun)return{changed:false,notes};
  throw Error(notes.join('\n'));
 }
 if(ctx.dryRun)return{changed:false,notes};
 if(!prepared.contractReady)throw Error('Apply remains disabled until canonical source, nursery/Designer UI and old-client fences pass ordinary isolated play. Use --dry-run for counts; nothing was written.');
 // Run with other writers stopped; ctx.state.write owns lock+backup+lastSave,
 // and the normal migrate runner owns the complete data-folder backup.
 const current=await ctx.state.read();if(current?._lastSave!==state._lastSave)throw Error('State changed during planning; stop other writers and recompute.');
 const out=commitGardenIslandUpdate(current,prepared);
 if(out.changed)await ctx.state.write(out.state);
 return{changed:out.changed,notes};
}
await runIfMain(import.meta.url,{id,description,auto,run});

// Deliberate island migration or same-group handover. StateStore owns the edit;
// the sync engine supplies current encrypted membership and register provenance.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join,basename} from 'node:path';
import {atomicWrite} from './fsutil.mjs';
import {dataPaths} from './datadir.mjs';
import {gardenIsland} from './garden-island.mjs';
import {gardenWorldTag,gardenKnownMechanicsTransition} from './garden-world-fence.mjs';
import {GARDEN_HANDOVER_SEEN_KEY} from './garden-handover.mjs';
import {stable} from './sync/model.mjs';
import {archiveGardenUiComponent} from './garden-ui-archive.mjs';
import {GARDEN_HANDOVER_PENDING_REL,gardenHandoverSha,readGardenHandoverJson,validateGardenHandover,createGardenHandover,validateGardenPublication,saveGardenPublication,gardenPublicationPresent,publishGardenHandover} from './garden-handover-store.mjs';
import {backupDataDir} from '../tools/migrate.mjs';
import {recordApplied} from '../tools/migrations/_lib.mjs';
import {id as migrationId,prepareGardenIslandUpdate,commitGardenIslandUpdate} from '../tools/migrations/102-garden-expanded-island-v4.mjs';

const digest=value=>createHash('sha256').update(typeof value==='string'?value:stable(value)).digest('hex');
const error=(status,code,message)=>Object.assign(new Error(message),{status,code});
const target={wv:gardenIsland.data.world.v,lh:gardenIsland.fingerprint};
const currentGarden=state=>Number(state?.garden?.seen?.world)===target.wv&&state.garden.seen.worldLayout===target.lh;
const publicCounts=plan=>({retained:plan?.counts?.retained||0,relocated:plan?.counts?.relocated||0,stored:plan?.counts?.packed||0});
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const sourceCounts=garden=>{let retained=0,stored=0;for(const rows of[garden.plants,garden.decor])for(const row of Object.values(rows)){if(row?._packed===3)stored++;else retained++}return{retained,relocated:0,stored}};
const samePublication=(a,b)=>!!a&&!!b&&a.group===b.group&&a.source===b.source&&a.wv===b.wv&&a.lh===b.lh;
const unknownSync=()=>({allowed:false,code:'SYNC_HISTORY_UNKNOWN',message:'This computer cannot verify its sync history. Your Garden is unchanged. Open Sync before updating it.',settingsView:'settings:sync'});
const reconciliationChoice='use-shared-keep-earlier';
const reconciliationFields=['choice','earlierGardenSha256','sharedGardenSha256','handoverSha256'];
const validReconciliation=value=>object(value)&&Object.keys(value).length===reconciliationFields.length&&Object.keys(value).every(k=>reconciliationFields.includes(k))&&value.choice===reconciliationChoice&&reconciliationFields.slice(1).every(k=>typeof value[k]==='string'&&/^[0-9a-f]{64}$/.test(value[k]));
const sameReconciliation=(a,b)=>validReconciliation(a)&&reconciliationFields.every(k=>a[k]===b[k]);
const reconciliationCounts=garden=>({...sourceCounts(garden),activityRecords:Object.keys(garden.led||{}).length,progressRecords:Object.keys(garden.seen||{}).length});

export function createGardenUpdate(ctx){
 const paths=dataPaths(ctx.dataDir),store=ctx.store;
 let pending=null;
 const others=()=>{if(!ctx.hosts||typeof ctx.hosts.others!=='function')return null;try{const rows=ctx.hosts.others();return Array.isArray(rows)?rows:null}catch{return null}};
 const options=()=>{const config=ctx.getConfig?.()||{};return{zone:config.timezone||'UTC',config}};
 const baseView=state=>({ok:true,...target,version:Number(state?._lastSave)||0,settingsView:'settings:sync',canUpdate:false,mode:null,handoverId:null});
 const blocked=(base,sync)=>({view:{...base,status:'sync-blocked',code:sync?.code||'SYNC_HISTORY_UNKNOWN',message:sync?.message||unknownSync().message}});
 async function prepare(state,sync,reviewedChoice=null){
  const base=baseView(state);
  const record=await readGardenHandoverJson(join(paths.root,GARDEN_HANDOVER_PENDING_REL));
  if(currentGarden(state)){
   if(record&&state.garden.seen[GARDEN_HANDOVER_SEEN_KEY]===record.id){
    const expected={...target,group:record.transfer?.meta?.group,source:record.transfer?.meta?.source};
    const saved=validateGardenPublication(record,expected);
    if(!await gardenPublicationPresent(paths.root,record)){
     if(!sync?.allowed||!samePublication(sync.publication,expected))return blocked(base,sync);
     const planId=digest({mode:'publish',target,id:saved.meta.id,sha256:saved.meta.sha256});
     return{view:{...base,status:'ready',mode:'publish',handoverId:saved.meta.id,planId,canUpdate:true,counts:sourceCounts(saved.garden),message:'Your island is updated. Finish sharing its saved copy so your other computers can use the same island.'},record,publication:sync.publication};
    }
   }
   return{view:{...base,status:'current',message:'Your Garden is already up to date.'}};
  }
  if(!state?.garden?.since)return{view:{...base,status:'no-garden',message:'There is no saved Garden to update.'}};
  // Fleetwater Vale: an earlier-layout garden is never relocated. The page starts it fresh,
  // once (gardenFreshStart); this deliberate update has nothing to plan.
  if(target.wv>=5)return{view:{...base,status:'fresh-start',message:'Gardens start fresh in Fleetwater Vale. Open the Garden and yours begins there.'}};
  if(!sync?.allowed)return blocked(base,sync);
  const h=others();
  if(h===null||h.length)return{view:{...base,status:'host-blocked',message:h?.length?'This data folder is open on another computer. Close it there before updating this Garden.':'This computer cannot verify whether the data folder is open elsewhere. Your Garden is unchanged.'}};
  if(sync.mode==='import'){
   const expected={...target,group:sync.group,source:sync.source},transfer=validateGardenHandover(sync.transfer,expected);
   if(transfer.meta.id!==sync.handoverId)throw error(409,'GARDEN_HANDOVER_CHANGED','The updated island changed. Let Sync finish and open this page again.');
   const earlierGardenSha256=digest(state.garden),preview=sync.importGarden;
   let reviewedReconciliation=null;
   if(Number(state.garden.seen?.world)>=3){
    const before=gardenWorldTag(state.garden),p=transfer.meta.previous;
    if(!gardenKnownMechanicsTransition(before,[target.wv,target.lh],[target.wv,target.lh])||!p||p.wv!==before[0]||p.lh!==before[1])return{view:{...base,status:'plan-blocked',code:'GARDEN_LAYOUT_MISMATCH',message:'This saved Garden is not the supported earlier island for this shared copy. Every record is preserved.'}};
    if(p.sha256!==earlierGardenSha256){
     if(!object(preview)||!currentGarden({garden:preview})||preview.seen?.[GARDEN_HANDOVER_SEEN_KEY]!==transfer.meta.id)return blocked(base,{code:'GARDEN_HANDOVER_PENDING',message:'The shared Garden is still arriving. Your earlier Garden remains usable and unchanged. Let Sync finish before reviewing it.'});
     const reconciliation={choice:reconciliationChoice,earlierGardenSha256,sharedGardenSha256:digest(preview),handoverSha256:transfer.meta.sha256,earlierCounts:reconciliationCounts(state.garden),sharedCounts:reconciliationCounts(preview)};
     const planId=digest({mode:'import',choice:reconciliationChoice,target,id:transfer.meta.id,sha256:transfer.meta.sha256,earlierGarden:earlierGardenSha256,sharedGarden:reconciliation.sharedGardenSha256,version:base.version});
     if(!sameReconciliation(reviewedChoice,reconciliation))return{view:{...base,status:'predecessor-changed',code:'GARDEN_PREDECESSOR_CHANGES',mode:'import',handoverId:transfer.meta.id,planId,canReview:true,reconciliation,message:'This earlier Garden has changes outside the shared Garden. Sync first, or review using the shared Garden while keeping a complete earlier copy. Your earlier Garden remains usable and unchanged.'}};
     reviewedReconciliation=reconciliation;
     return{view:{...base,status:'ready',mode:'import',handoverId:transfer.meta.id,planId,canUpdate:true,counts:sourceCounts(preview),message:'Use the reviewed shared Garden and keep the complete earlier Garden in Backups.'},transfer,reviewedReconciliation,transition:{from:before,to:[target.wv,target.lh]}};
    }
   }
   if(reviewedChoice!==null)throw error(409,'GARDEN_PLAN_CHANGED','The earlier or shared Garden changed. Nothing was replaced; open the review again.');
   const planId=digest({mode:'import',target,id:transfer.meta.id,sha256:transfer.meta.sha256,earlierGarden:earlierGardenSha256});
   return{view:{...base,status:'ready',mode:'import',handoverId:transfer.meta.id,planId,canUpdate:true,counts:sourceCounts(preview||transfer.garden),message:'Your updated island has arrived from your first computer. A complete copy of this earlier Garden will stay in Backups before you use it.'},transfer,transition:{from:gardenWorldTag(state.garden),to:[target.wv,target.lh]}};
  }
  if(sync.mode&&sync.mode!=='migrate')return blocked(base,{code:'GARDEN_HANDOVER_WAIT',message:'This computer is waiting for the complete updated island. Your earlier Garden is unchanged. Open Sync and let it finish.'});
  const prepared=prepareGardenIslandUpdate(state,options()),p=prepared.plan;
  if(p.status!=='planned')return{view:{...base,status:'plan-blocked',code:p.status,message:'Some saved placements or layouts need an update this version cannot safely make yet. All original records are preserved.'}};
  const publication=sync.publication||null;
  const planId=digest({mode:'migrate',migrationId,target,ready:prepared.contractReady,plan:p,publication});
  const review={...base,mode:'migrate',counts:publicCounts(p),planId};
  if(!prepared.contractReady)return{view:{...review,status:'preparing',message:'Your saved Garden is safe. The island update is still being prepared; this page will be ready when the app update is complete.'}};
  const out=commitGardenIslandUpdate(state,prepared);
  if(!out.changed||!currentGarden(out.state))throw error(409,'GARDEN_PLAN_CHANGED','The Garden plan changed. Your complete saved Garden is unchanged.');
  let handoverId=null,publicationRecord=null;
  if(publication){
   if(publication.wv!==target.wv||publication.lh!==target.lh||publication.group!==sync.group||publication.source!==sync.source||publication.source!==sync.deviceId)throw error(409,'GARDEN_HANDOVER_SOURCE','The first-computer check changed. Your Garden is unchanged. Open Sync and let it finish.');
   const sourceGardenSha256=digest(state.garden);
   handoverId=digest({group:publication.group,source:publication.source,sourceGardenSha256,planId}).slice(0,32);
   out.state.garden.seen[GARDEN_HANDOVER_SEEN_KEY]=handoverId;
   const file=createGardenHandover(out.state.garden,{...publication,previous:{wv:Number(state.garden.seen?.world)||1,lh:Number(state.garden.seen?.world)>=3?state.garden.seen.worldLayout:null,sha256:sourceGardenSha256}},handoverId);
   if(record){
    const saved=validateGardenPublication(record,publication);
    if(record.id!==handoverId||record.planId!==planId||record.sourceGardenSha256!==sourceGardenSha256||stable(saved.file)!==stable(file))throw error(409,'GARDEN_HANDOVER_PENDING','An earlier island-sharing copy is already preserved. This update has not replaced its original record.');
    publicationRecord=record;
   }else publicationRecord={v:1,kind:'garden-island-publication',id:handoverId,planId,sourceVersion:base.version,sourceGardenSha256,transfer:file};
  }
  return{view:{...review,handoverId,status:'ready',canUpdate:true,message:publication?'Update the island once on this first computer, then use its complete copy on your other computers. Every original owned item and earlier layout is preserved.':'Keep every owned item and its progress. Placements that need room move to a legal place or stay complete in your Bag; earlier layouts remain available to adapt.'},prepared,out,record:publicationRecord,publication,transition:p.transition||p.mechanics||null};
 }
 async function inspect(){
  const sync=typeof ctx.sync?.gardenUpgradeState==='function'?await ctx.sync.gardenUpgradeState():unknownSync();
  return(await prepare(await store.readObject(),sync)).view;
 }
 function matches(body,view){return body.mode===view.mode&&body.handoverId===view.handoverId&&body.planId===view.planId&&body.version===view.version}
 async function exactBackup(cur,info,inspection,folder){
  const raw=await readFile(store.file,'utf8');
  const saved=JSON.parse(raw);
  if(Number(saved._lastSave)!==info.version||digest(saved.garden)!==digest(cur.garden))throw error(409,'STATE_CHANGED','The saved state changed. Nothing was changed; try again.');
  const token=new Date().toISOString().replace(/[:.]/g,'-')+'-'+digest(raw).slice(0,16),stem='pre-'+migrationId+'-'+token;
  const stateFile=stem+'.json',gardenFile=stem+'.garden.json',receiptFile=stem+'.receipt.json';
  await atomicWrite(join(paths.stateBackups,stateFile),raw);
  const gardenText=JSON.stringify(cur.garden);
  await atomicWrite(join(paths.stateBackups,gardenFile),gardenText+'\n');
  await atomicWrite(join(paths.stateBackups,receiptFile),JSON.stringify({migrationId,target,mode:inspection.view.mode,handoverId:inspection.view.handoverId,sourceVersion:info.version,planId:inspection.view.planId,stateFile,gardenFile,stateSha256:digest(raw),gardenSha256:digest(gardenText),folderBackup:basename(folder.dest),counts:inspection.view.counts,...(inspection.reviewedReconciliation?{reconciliation:inspection.reviewedReconciliation}:{})},null,1)+'\n');
 }
 async function apply(body){
  if(!body||body.wv!==target.wv||body.lh!==target.lh||!['migrate','import','publish'].includes(body.mode)||!(body.handoverId===null||typeof body.handoverId==='string'&&/^[0-9a-f]{32}$/.test(body.handoverId))||!Number.isSafeInteger(body.version)||body.version<0||typeof body.planId!=='string'||!/^[0-9a-f]{64}$/.test(body.planId))throw error(400,'GARDEN_UPDATE_REQUEST','The Garden update changed. Open this page again before updating.');
  if(body.reconciliation!==undefined&&(body.mode!=='import'||!validReconciliation(body.reconciliation)))throw error(400,'GARDEN_RECONCILIATION_REQUEST','Open the actual Garden mismatch review before choosing the shared Garden.');
  if(pending)throw error(409,'GARDEN_UPDATE_BUSY','The Garden update is already running.');
  if(typeof ctx.sync?.withGardenUpgrade!=='function')throw error(409,'SYNC_HISTORY_UNKNOWN',unknownSync().message);
  pending=ctx.sync.withGardenUpgrade(async(probe,controls)=>{
   let inspection=await prepare(await store.readObject(),await probe(),body.reconciliation??null);
   if(inspection.view.status==='current')return{...inspection.view,updated:false};
   if(!inspection.view.canUpdate)throw error(409,inspection.view.code||'GARDEN_UPDATE_BLOCKED',inspection.view.message);
   if(!matches(body,inspection.view))throw error(409,'GARDEN_PLAN_CHANGED','Your saved data changed while the update was being prepared. Nothing was changed; open the update again.');
   if(body.mode==='publish'){
    const r=await store.mutate(async cur=>{
     const last=await probe();
     if(!last.allowed||!samePublication(last.publication,inspection.publication))throw error(409,last.code||'GARDEN_HANDOVER_SOURCE',last.message||'The first-computer check changed. Try sharing again after Sync finishes.');
     const published=await publishGardenHandover(paths.root,inspection.record,last.publication,cur.garden);
     return{next:null,result:published};
    },{ifVersion:body.version,source:'garden-update',client:'Garden'});
    return{ok:true,...target,status:'current',mode:'publish',handoverId:body.handoverId,version:r.version,updated:false,published:true,message:'Your updated island is ready for your other computers.'};
   }
   const folder=await backupDataDir(paths.root);
   let bookkeeping=false,publicationRecord=null,publication=null,importTicket=null,baselineReady=true;
   const result=await store.mutate(async(cur,info)=>{
    if(info.recoveredFrom)throw error(409,'STATE_RECOVERED','The server recovered an earlier state copy. Review Settings > Data before updating; your Garden is unchanged.');
    inspection=await prepare(cur,await probe(),body.reconciliation??null);
    if(!inspection.view.canUpdate||!matches(body,inspection.view))throw error(409,'GARDEN_PLAN_CHANGED','Your saved Garden changed during planning. Nothing was changed; open the update again.');
    await exactBackup(cur,info,inspection,folder);
    let nextGarden,gardenArchive=null;
    if(body.mode==='import'){
     gardenArchive=await archiveGardenUiComponent(paths.stateDir,cur.garden,{receivedAt:new Date().toISOString(),source:'garden-import',client:'Garden',requestVersion:info.version,keptWorld:[target.wv,target.lh],handoverId:inspection.transfer.meta.id,group:inspection.transfer.meta.group,firstComputer:inspection.transfer.meta.source,reason:inspection.reviewedReconciliation?'earlier-garden-before-reviewed-shared-import':'earlier-garden-before-deliberate-island-import',...(inspection.reviewedReconciliation?{reconciliation:inspection.reviewedReconciliation}:{})});
     if(typeof controls?.prepareImport!=='function'||typeof controls?.finishImport!=='function')throw error(409,'GARDEN_IMPORT_NOT_READY','This version is still preparing the shared island. Your earlier Garden and its backup are unchanged.');
     const review=inspection.reviewedReconciliation;
     if(review&&(!sameReconciliation(body.reconciliation,review)||review.earlierGardenSha256!==digest(cur.garden)||gardenArchive?.componentSha256!==review.earlierGardenSha256))throw error(409,'GARDEN_PLAN_CHANGED','The reviewed earlier Garden or its complete archive changed. Nothing was replaced; open the review again.');
     const imported=await controls.prepareImport({garden:inspection.transfer.garden,id:inspection.transfer.meta.id,sha256:inspection.transfer.meta.sha256,version:info.version,...(review?{reviewedPredDigest:digest(cur.garden),reviewedSharedDigest:review.sharedGardenSha256}:{})});
     if(!imported?.ticket||!currentGarden({garden:imported.garden})||imported.garden.seen[GARDEN_HANDOVER_SEEN_KEY]!==inspection.transfer.meta.id)throw error(409,'GARDEN_IMPORT_NOT_READY','The complete updated island is not ready yet. Your earlier Garden and backup are unchanged.');
     importTicket=imported.ticket;nextGarden=imported.garden;
    }else{
     nextGarden=inspection.out.state.garden;
     publicationRecord=inspection.record;publication=inspection.publication;
     if(publicationRecord)await saveGardenPublication(paths.root,publicationRecord);
    }
    const last=await probe();
    if(!last.allowed||body.mode==='import'&&(last.handoverId!==inspection.transfer.meta.id||last.mode!=='import')||body.mode==='migrate'&&publication&&!samePublication(last.publication,publication))throw error(409,last.code||'GARDEN_HANDOVER_CHANGED',last.message||'The island check changed. Your complete earlier Garden is unchanged.');
    return{next:{...cur,garden:nextGarden},result:{updated:true,mode:body.mode,handoverId:body.handoverId,counts:inspection.view.counts,backupSaved:true,...(inspection.reviewedReconciliation?{reconciled:true}:{}),...(gardenArchive?{gardenArchive}:{})}};
   },{ifVersion:body.version,source:'garden-update',client:'Garden',gardenTransition:inspection.transition,summary:body.mode==='import'?'Used the shared updated island; earlier Garden preserved':'Updated the island; all owned records retained',afterCommit:async info=>{
    if(importTicket){try{await controls.finishImport(importTicket)}catch(e){baselineReady=false;ctx.log?.('warn','Garden import committed; original-clock sync journal retained for retry ('+String(e.code||'write').slice(0,30)+')')}}
    try{await recordApplied(paths,migrationId,{changed:info.result?.updated});bookkeeping=true}catch(e){ctx.log?.('warn','Garden update committed; exact backup receipt retained, bookkeeping retry needed ('+String(e.code||'write').slice(0,30)+')')}
   }});
   let published=true;
   if(publicationRecord){
    try{
     const last=await probe();
     if(!last.allowed||!samePublication(last.publication,publication))throw error(409,'GARDEN_HANDOVER_SOURCE','The first-computer check changed before sharing finished.');
     await store.mutate(async cur=>{await publishGardenHandover(paths.root,publicationRecord,publication,cur.garden);return{next:null}},{source:'garden-update',client:'Garden'});
    }catch(e){published=false;ctx.log?.('warn','Garden update committed; original island sharing copy retained for retry ('+String(e.code||'write').slice(0,30)+')')}
   }
   return{ok:true,...target,status:published?'current':'publish-pending',version:await store.version(),...result.result,bookkeeping,published,baselineReady,message:!published?'Your island is updated and backed up. Sharing did not finish; use Share updated island to send the same saved copy.':body.mode==='import'?(result.result?.reconciled?(baselineReady?'You are using the shared Garden. Your complete earlier Garden is kept in Settings > Data > Preserved Garden copies.':'You are using the shared Garden. Sync is finishing from its saved journal; your complete earlier Garden remains in Preserved Garden copies.'):(baselineReady?'You are using the updated island. Your complete earlier Garden remains in Backups.':'You are using the updated island. Sync is finishing from its saved journal; your complete earlier Garden remains in Backups.')):'Your Garden is updated. Every owned item and earlier layout is preserved.'};
  });
  try{return await pending}finally{pending=null}
 }
 return{inspect,apply};
}

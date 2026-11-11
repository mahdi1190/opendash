// Node binding for an immutable first-island handover. The sync engine proves
// the actual encrypted register writers; this module checks exact content.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicWrite,withLock} from './fsutil.mjs';
import {gardenHandoverMeta,gardenHandoverText,GARDEN_HANDOVER_REL,GARDEN_HANDOVER_SEEN_KEY,gardenHandoverSeenKey,GARDEN_HANDOVER_PART_CHARS,GARDEN_HANDOVER_MAX_PARTS} from './garden-handover.mjs';
import {capture,captureFile,newTree,stable,FILE_PREFIX,isSecretName,looksSecret} from './sync/model.mjs';
import {fileSpecFor} from './sync/manifest.mjs';

export const GARDEN_HANDOVER_PENDING_REL='garden/island-handover-expanded-pending.json';
export const gardenHandoverSha=value=>createHash('sha256').update(typeof value==='string'?value:stable(value)).digest('hex');
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const fail=message=>Object.assign(new Error(message),{status:409,code:'GARDEN_HANDOVER_CONTENT'});
export async function readGardenHandoverJson(file){
 let text;try{text=await readFile(file,'utf8')}catch(e){if(e.code==='ENOENT')return null;throw e}
 try{return JSON.parse(text)}catch{throw fail('An earlier island copy cannot be read. All saved files are preserved; the update has not replaced it.')}
}
export function validateGardenHandover(file,expected){
 const meta=gardenHandoverMeta(file?.meta),text=gardenHandoverText(file);
 if(!meta||text===null||meta.wv!==expected.wv||meta.lh!==expected.lh||meta.group!==expected.group||meta.source!==expected.source||gardenHandoverSha(text)!==meta.sha256)
  throw fail('The updated island has not arrived in full yet. Your earlier Garden is unchanged. Let Sync finish, then try again.');
 let garden;try{garden=JSON.parse(text)}catch{throw fail('The updated island copy cannot be read. Your earlier Garden is unchanged.')}
 if(!object(garden)||typeof garden.since!=='string'||!garden.since||!object(garden.seen)||Number(garden.seen.world)!==meta.wv||garden.seen.worldLayout!==meta.lh||garden.seen[gardenHandoverSeenKey(meta)]!==meta.id||!object(garden.plants)||!object(garden.decor)||!object(garden.led))
  throw fail('The updated island copy is incomplete. Your earlier Garden is unchanged.');
 return{file,meta,text,garden};
}
function syncable(file){
 const top=FILE_PREFIX+GARDEN_HANDOVER_REL,f=fileSpecFor(top);
 if(!f)throw fail('This version is still preparing island sharing. Your Garden is unchanged.');
 const cap=captureFile(top,f.spec,file,true,newTree());
 if(cap.skipped||cap.x.length)throw fail('Some saved Garden text cannot be shared by this sync version. Your complete earlier Garden is unchanged.');
 const row=cap.w.find(([p])=>p.length===2&&p[1]==='meta');
 if(!row||stable(row[1])!==stable(file.meta))throw fail('The complete island copy cannot be shared by this version. Your Garden is unchanged.');
 const parts=cap.w.filter(([p])=>p.length===3&&p[1]==='parts'&&p[2]!=='@alive');
 if(parts.length!==file.meta.parts||parts.some(([p,v])=>v!==file.parts[p[2]]))throw fail('The complete island copy cannot be shared by this version. Your Garden is unchanged.');
}
function gardenSyncable(garden){
 const walk=(value,depth=0)=>{
  if(depth>40)throw fail('Some saved Garden fields are too deeply nested for this sync version. Your complete earlier Garden is unchanged.');
  if(typeof value==='string'&&looksSecret(value))throw fail('Some saved Garden text cannot be shared by this sync version. Your complete earlier Garden is unchanged.');
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){for(const item of value)walk(item,depth+1);return}
  for(const key of Object.keys(value)){
   if(['__proto__','constructor','prototype'].includes(key)||isSecretName(key))throw fail('Some saved Garden fields cannot be shared by this sync version. Your complete earlier Garden is unchanged.');
   walk(value[key],depth+1);
  }
 };
 walk(garden);
 if(capture({garden},newTree()).skipped)throw fail('The complete Garden cannot be shared by this sync version. Its earlier records are unchanged.');
}
export function createGardenHandover(garden,publication,id){
 if(!/^[0-9a-f]{32}$/.test(id||''))throw fail('The island update changed. Open the update page again.');
 gardenSyncable(garden);
 const text=JSON.stringify(garden),n=Math.ceil(text.length/GARDEN_HANDOVER_PART_CHARS);
 if(!n||n>GARDEN_HANDOVER_MAX_PARTS)throw fail('This Garden is too large for this island-sharing version. The complete earlier Garden is unchanged.');
 const parts={};for(let i=0;i<n;i++)parts[String(i).padStart(4,'0')]=text.slice(i*GARDEN_HANDOVER_PART_CHARS,(i+1)*GARDEN_HANDOVER_PART_CHARS);
 const file={meta:{v:3,id,previous:publication.previous,wv:publication.wv,lh:publication.lh,group:publication.group,source:publication.source,sha256:gardenHandoverSha(text),parts:n,chars:text.length},parts};
 validateGardenHandover(file,publication);syncable(file);return file;
}
export function validateGardenPublication(record,expected){
 if(!object(record)||record.v!==1||record.kind!=='garden-island-publication'||typeof record.planId!=='string'||!/^[0-9a-f]{64}$/.test(record.planId)||typeof record.sourceGardenSha256!=='string'||!/^[0-9a-f]{64}$/.test(record.sourceGardenSha256)||!Number.isSafeInteger(record.sourceVersion)||record.sourceVersion<0)
  throw fail('An earlier island-sharing record cannot be read. Its original files are preserved.');
 const transfer=validateGardenHandover(record.transfer,expected);
 if(record.id!==transfer.meta.id)throw fail('The saved island-sharing record does not match its complete copy. All originals are preserved.');
 return{record,...transfer};
}
export async function saveGardenPublication(root,record){
 const file=join(root,GARDEN_HANDOVER_PENDING_REL);
 return withLock(file,async()=>{
  const existing=await readGardenHandoverJson(file);
  if(existing){if(stable(existing)!==stable(record))throw fail('An earlier island update is already preserved. Its sharing record was not replaced.');return existing}
  await atomicWrite(file,JSON.stringify(record,null,1)+'\n');return record;
 });
}
export async function gardenPublicationPresent(root,record){
 const file=await readGardenHandoverJson(join(root,GARDEN_HANDOVER_REL));
 return file!==null&&stable(file)===stable(record.transfer);
}
export async function publishGardenHandover(root,record,publication,currentGarden){
 const checked=validateGardenPublication(record,publication);
 if(checked.meta.v!==2)throw fail('This publication slot is reserved for the mechanics1 generation; the earlier immutable file is unchanged.');
 if(currentGarden?.seen?.[gardenHandoverSeenKey(checked.meta)]!==checked.meta.id||Number(currentGarden.seen.world)!==checked.meta.wv||currentGarden.seen.worldLayout!==checked.meta.lh)
  throw fail('The saved island changed before sharing finished. Its first copy is preserved and was not replaced.');
 syncable(record.transfer);
 const file=join(root,GARDEN_HANDOVER_REL);
 return withLock(file,async()=>{
  const existing=await readGardenHandoverJson(file);
  if(existing){if(stable(existing)!==stable(record.transfer))throw fail('Another island-sharing copy is already present. Both originals are preserved; this version will not replace it.');return{published:true,created:false,id:checked.meta.id}}
  await atomicWrite(file,JSON.stringify(record.transfer,null,1)+'\n');
  return{published:true,created:true,id:checked.meta.id};
 });
}

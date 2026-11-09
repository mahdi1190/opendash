// Full unaccepted Garden components kept outside rolling full-state backups.
// Their content address is independent of request timing and object key order.
import {promises as fsp} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {atomicWrite,withLock,readJson} from './fsutil.mjs';

const NAME=/^garden-[0-9a-f]{64}\.json$/;
const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}':JSON.stringify(value);
const digest=value=>createHash('sha256').update(stable(value)).digest('hex');
const directory=stateDir=>join(stateDir,'backups','garden-compat');
const valid=record=>record?.v===1&&record.kind==='garden-ui-compat'&&Object.hasOwn(record,'garden')&&record.componentSha256===digest(record.garden);

/** Caller holds the normal state-file lock. Original component is never cleaned. */
export async function archiveGardenUiComponent(stateDir,garden,provenance){
 const componentSha256=digest(garden),name='garden-'+componentSha256+'.json',file=join(directory(stateDir),name);
 return withLock(file,async()=>{
  const existing=await readJson(file,{validate:valid}); // Missing is null; unreadable/corrupt is not silently overwritten.
  if(existing){if(!valid(existing)||existing.componentSha256!==componentSha256)throw Error('The preserved Garden copy is unreadable; the incoming change was not acknowledged.');return{name,componentSha256,created:false}}
  await atomicWrite(file,JSON.stringify({v:1,kind:'garden-ui-compat',componentSha256,garden,provenance},null,1));
  return{name,componentSha256,created:true};
 });
}

/** Metadata only: ordinary Settings listing does not load every full Garden. */
export async function listGardenUiArchives(stateDir){
 let names;try{names=await fsp.readdir(directory(stateDir))}catch(error){if(error.code==='ENOENT')return[];throw error}
 const out=[];for(const name of names){if(!NAME.test(name))continue;try{const stat=await fsp.stat(join(directory(stateDir),name));if(stat.isFile())out.push({name,at:stat.mtime.toISOString(),size:stat.size})}catch(error){if(error.code!=='ENOENT')throw error}}
 return out.sort((a,b)=>b.at.localeCompare(a.at)||a.name.localeCompare(b.name));
}

/** Component download only. It is not a restorable whole-state backup. */
export async function readGardenUiArchive(stateDir,name){
 if(typeof name!=='string'||!NAME.test(name))throw Object.assign(Error('Unknown preserved Garden copy'),{status:400});
 const record=await readJson(join(directory(stateDir),name));if(!record)throw Object.assign(Error('That preserved Garden copy is not available'),{status:404});
 if(!valid(record)||'garden-'+record.componentSha256+'.json'!==name)throw Object.assign(Error('That preserved Garden copy is not readable'),{status:400});
 return record;
}

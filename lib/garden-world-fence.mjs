import{GARDEN_EXPANDED_WORLD,GARDEN_EARLIER_WORLDS}from'./garden-island-identity.mjs';
// Pure compatibility fence. No clocks, storage, renderer or network access.
export function cleanGardenWorldTag(value){
 const v=Array.isArray(value)?value[0]:value?.wv,h=Array.isArray(value)?value[1]:value?.lh;
 return Number.isInteger(v)&&v>=3&&v<=9&&typeof h==='string'&&/^[0-9a-f]{24}$/.test(h)?[v,h]:null;
}
export function gardenWorldTag(garden){return cleanGardenWorldTag({wv:Number(garden?.seen?.world),lh:garden?.seen?.worldLayout})}
export function sameGardenWorldTag(a,b){const x=cleanGardenWorldTag(a),y=cleanGardenWorldTag(b);return!!x&&!!y&&x[0]===y[0]&&x[1]===y[1]}
export const GARDEN_MECHANICS_PREDECESSOR=Object.freeze([3,'94f5b2dbe4dce765cafb2b40']);
export const GARDEN_MECHANICS_CURRENT=Object.freeze([3,'c34545b986e497d5d9df5d51']);
// Supported does not mean equal: incoming writes must still name the exact
// saved physical world. Earlier records remain protected while their explicit
// expanded-layout update is pending; support never equates their coordinates.
export function gardenWorldSupported(value,capability){
 const tag=cleanGardenWorldTag(value),cap=cleanGardenWorldTag(capability);
 return !!tag&&!!cap&&(sameGardenWorldTag(tag,cap)||sameGardenWorldTag(cap,GARDEN_MECHANICS_CURRENT)&&sameGardenWorldTag(tag,GARDEN_MECHANICS_PREDECESSOR)||sameGardenWorldTag(cap,GARDEN_EXPANDED_WORLD)&&GARDEN_EARLIER_WORLDS.some(earlier=>sameGardenWorldTag(tag,earlier)));
}
export function gardenKnownMechanicsTransition(from,to,capability){return sameGardenWorldTag(from,GARDEN_MECHANICS_PREDECESSOR)&&sameGardenWorldTag(to,GARDEN_MECHANICS_CURRENT)&&sameGardenWorldTag(capability,GARDEN_MECHANICS_CURRENT)||GARDEN_EARLIER_WORLDS.some(earlier=>sameGardenWorldTag(from,earlier))&&sameGardenWorldTag(to,GARDEN_EXPANDED_WORLD)&&sameGardenWorldTag(capability,GARDEN_EXPANDED_WORLD)}
export function gardenTransitionMayCommit(previous,next,claim,capability){
 return !!claim&&gardenKnownMechanicsTransition(gardenWorldTag(previous),gardenWorldTag(next),capability)&&sameGardenWorldTag(claim.from,gardenWorldTag(previous))&&sameGardenWorldTag(claim.to,gardenWorldTag(next));
}
export function fenceGardenUiWrite(previous,next,claim,serverCapability){
 const currentVersion=Number(previous?.garden?.seen?.world)||1,nextVersion=Number(next?.garden?.seen?.world)||1,current=gardenWorldTag(previous?.garden),incoming=gardenWorldTag(next?.garden),cap=cleanGardenWorldTag(claim);
 const protectedCurrent=currentVersion>=3;
 const server=cleanGardenWorldTag(serverCapability),validClient=!!server&&gardenWorldSupported(cap,server);
 const blocked=protectedCurrent?(!current||!validClient||!sameGardenWorldTag(current,cap)||!sameGardenWorldTag(current,incoming)):nextVersion>=3&&(!validClient||!sameGardenWorldTag(incoming,cap));
 if(!blocked)return{next,held:false};
 const kept={...next};if(previous&&Object.hasOwn(previous,'garden'))kept.garden=previous.garden;else delete kept.garden;
 return{next:kept,held:true,world:current,why:'garden-layout-update-required'};
}
export function gardenRegisterMayApply(path,reg,currentGarden,hostCapability){
 if(path?.[0]!=='garden')return true;
 // Earlier v3 engines may know the layout tag but still send split axes.
 // Keep those original registers in held storage; only @xy can move a v3 row.
 const splitAxis=path.length===4&&(path[1]==='plants'||path[1]==='decor')&&(path[3]==='x'||path[3]==='y');
 if(splitAxis&&((Number(currentGarden?.seen?.world)||1)>=3||cleanGardenWorldTag(reg?.gw)?.[0]>=3||currentGarden==null&&cleanGardenWorldTag(hostCapability)?.[0]>=3))return false;
 const current=gardenWorldTag(currentGarden),cap=cleanGardenWorldTag(hostCapability),incoming=cleanGardenWorldTag(reg?.gw);
 // A genuinely absent Garden can import a fully tagged canonical component.
 // A populated legacy Garden must first undergo local no-loss migration.
 if(currentGarden==null)return!!cap&&gardenWorldSupported(incoming,cap);
 if((Number(currentGarden?.seen?.world)||1)>=3)return!!current&&gardenWorldSupported(current,cap)&&sameGardenWorldTag(current,incoming);
 // World3 registers stay in the existing persisted remote tree until this
 // device has completed its own canonical migration. Never partially move a
 // world2 garden by receiving a newer world's coordinate fields.
 return !incoming;
}

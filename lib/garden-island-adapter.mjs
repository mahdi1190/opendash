// Node-only proposal. Invokes the same page catalogue/placement rules over a
// private copy; never reads/writes a data folder and never runs a migration.
import { gardenIsland } from './garden-island.mjs';
import { pageEngine } from './agent-engine.mjs';
import { createHash } from 'node:crypto';
const clone=x=>JSON.parse(JSON.stringify(x));
export function createIslandMigrationAdapter({now=Date.now(),zone='UTC',config={}}={}){
 const data=gardenIsland.data,fingerprint=gardenIsland.fingerprint;
 return{
  fingerprint,
  context(state){
   const E=pageEngine(clone(state),{now,zone,config}),W=E.__const('GARDEN_WORLD');
   if(W.v!==3||W.lh!==fingerprint||W.cols!==52||W.rows!==56||typeof E.gardenIslandCellInfo!=='function'||typeof E.gardenWorldReady!=='function')throw Error('Island catalogue, canonical geometry and non-destructive ingress hooks are not installed');
   if(typeof E.gardenStoredItem!=='function'||typeof E.gardenPlacementItem!=='function')throw Error('Full-record nursery restoration is not installed');
   const wallet=E.gardenWallet(),level=wallet.level.level,areas=E._gdAreasOpen(level);
   E.gardenDesignShow(null); // legacy overrides are validated separately, not executed while planning.
   return{E,W,level,areas,state:E.state,model:{level:wallet.level,areas},designBlockers:[]};
  },
  describe(kind,row,context){
   const def=kind==='plants'?context.E.gardenPlant(row.p):context.E.gardenDecor(row.d);
   if(!def)return null;
   return{def,width:kind==='plants'?def.fp||1:def.w||1,height:kind==='plants'?def.fp||1:def.h||1,ground:kind==='decor'&&def.layer==='ground'};
  },
  preferred(kind,uid,row){return kind==='plants'&&row.p==='heart-oak'?{...data.anchors.heart}:null},
  placementWhy(row,context){
   const{E,level,model}=context,{def,width,height,ground}=row.description,kind=row.kind==='plants'?'plant':'decor';
   if(!Number.isInteger(row.x)||!Number.isInteger(row.y))return'Unrecognized coordinates';
   const why=E.gardenCellOk(def,row.x,row.y,level,kind);if(why)return why;
   for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++){
    const x=row.x+dx,y=row.y+dy,cell=E.gardenIslandCellInfo(x,y,{model,category:def.cat,kind}),occupant=row.occupied.get(x+','+y);
    if(!cell.inside||cell.ocean&&!ground)return'Canonical coast is not a placement surface';
    if(cell.reserved&&!(ground&&cell.reservation==='route'))return cell.reason||'Keep the canonical approach clear';
    if(cell.locked)return'Existing land entitlement does not open this cell';
    if(occupant){
     if(ground&&(occupant.plant||occupant.ground))return occupant.plant?'A plant occupies this cell':'A ground decoration occupies this cell';
     if(!ground&&(occupant.plant||occupant.decor||kind==='plant'&&occupant.ground))return'Another retained placement occupies this cell';
    }
   }
   return'';
  },
  claim(occupied,row){
   const{width,height,ground}=row.description;
   for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++){
    const key=(row.after.x+dx)+','+(row.after.y+dy),cell=occupied.get(key)||{};
    cell[ground?'ground':row.kind==='plants'?'plant':'decor']=row.uid;occupied.set(key,cell);
   }
  },
  planDesigns(raw,context){
   const archives={},blockers=[];
   if(typeof context.E.gardenDesignArchives!=='function'||typeof context.E.gardenDesignIslandProjection!=='function')return{status:'blocked',reason:'Deliberate archived-layout adaptation UI/rules are not installed'};
   if(!raw.lay||typeof raw.lay!=='object'||Array.isArray(raw.lay))return{status:'blocked',reason:'Unrecognized named-layout container preserved'};
   for(const[id,layout]of Object.entries(raw.lay)){
    if(!layout||typeof layout!=='object'||Array.isArray(layout)||layout.d&&typeof layout.d!=='object'){blockers.push({layout:id,reason:'Unrecognized raw named layout preserved'});continue}
    const record={world:Number(context.state.garden.seen?.world)||1,id,layout:clone(layout)};
    const digest=createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0,24);
    archives['design.archive.v2.'+id+'.'+digest]=record;
   }
   // Keep raw g.dz byte-for-byte equivalent in JSON terms. The shared page
   // Saved helper detects its archive and projects only dry paths/paint;
   // m/c wait for deliberate existing ghost/check/Keep controls.
   return{status:blockers.length?'blocked':'archived-for-deliberate-adaptation',next:clone(raw),archives,blockers};
  },
  // Nursery, earned structures, archived layouts and same-world encrypted
  // sync have passed ordinary isolated play. The runner remains deliberate
  // (auto:false); local Update also checks sync history and backs up first.
  contractReady:true
 };
}

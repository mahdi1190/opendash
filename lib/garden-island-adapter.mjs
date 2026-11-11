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
  predecessors:['94f5b2dbe4dce765cafb2b40','c34545b986e497d5d9df5d51'],
  project(point,from){return{x:point.x+(from===1?12:0)+26,y:point.y+(from===1?8:0)+36}},
  context(state){
   const draft=clone(state),placements={};
   for(const[key,value]of Object.entries(draft.garden.wd||{}))if(/^(feature|sight)\.place\./.test(key)&&Array.isArray(value)&&value[0]===3){placements[key]=clone(value);draft.garden.wd[key]=0}
   const E=pageEngine(draft,{now,zone,config}),W=E.__const('GARDEN_WORLD');
   if(W.v!==4||W.lh!==fingerprint||W.cols!==96||W.rows!==96||typeof E.gardenIslandCellInfo!=='function'||typeof E.gardenWorldReady!=='function')throw Error('Island catalogue, canonical geometry and non-destructive ingress hooks are not installed');
   if(typeof E.gardenStoredItem!=='function'||typeof E.gardenPlacementItem!=='function')throw Error('Full-record nursery restoration is not installed');
   const wallet=E.gardenWallet(),level=wallet.level.level,areas=E._gdAreasOpen(level);
   E.gardenDesignShow(null); // legacy overrides are validated separately, not executed while planning.
   return{E,W,level,areas,state:E.state,original:state,placements,model:{level:wallet.level,areas},designBlockers:[]};
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
  planPlacements(raw,occupied,context){
   const next=clone(raw),prior=context.placements,features=context.E.__const('GARDEN_LAND_FEATURES'),sights=context.E.__const('GARDEN_LAND_SIGHTS');
   if(!Object.keys(prior).length)return next;
   const archive={world:Number(context.original.garden.seen?.world)||1,layout:context.original.garden.seen?.worldLayout||null,placements:clone(prior)};
   const key='world4.placements.'+createHash('sha256').update(JSON.stringify(archive)).digest('hex').slice(0,24);
   if(Object.hasOwn(next,key)&&JSON.stringify(next[key])!==JSON.stringify(archive))throw Error('Earlier structure placement archive differs; original Garden preserved');
   next[key]=archive;
   for(const savedKey of Object.keys(prior).sort()){
    const kind=savedKey.startsWith('feature.')?'features':'sights',id=savedKey.slice(savedKey.indexOf('.place.')+7),hint=data.placementAnchors[kind][id],source=(kind==='features'?features:sights).find(row=>row.id===id);
    // A previously set-out object may move to its authored region. Stored
    // objects stay stored; unknown records remain complete and untouched.
    if(!source)continue;
    next[savedKey]=0;
    if(!hint||hint.packed||hint.fixed)continue;
    const width=source.w||1,height=source.h||1,description={def:{...source,layer:'main'},width,height,ground:false},row={kind:'decor',uid:id,x:hint.x,y:hint.y,occupied,description};
    if(this.placementWhy(row,context))continue;
    const door=hint.door||{x:hint.x+Math.floor(width/2),y:hint.y+height},cell=context.E.gardenIslandCellInfo(door.x,door.y,{model:context.model});
    if(!cell.inside||cell.locked||cell.ocean||cell.freshwater||cell.solid||occupied.has(door.x+','+door.y)||context.E.gardenPropAt(door.x,door.y))continue;
    next[savedKey]=[3,hint.x,hint.y];this.claim(occupied,{...row,after:{x:hint.x,y:hint.y}},context);
    occupied.set(door.x+','+door.y,{decor:id});
   }
   return next;
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

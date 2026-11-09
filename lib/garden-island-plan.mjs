// Proposal only. Pure deterministic placement planning, with no I/O or clock.
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':object(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const cmp=(a,b)=>a<b?-1:a>b?1:0;
function requireContract(layout,adapter){
 if(layout?.version!==3||layout.world?.v!==3||layout.world.cols!==52||layout.world.rows!==56||layout.world.roomX!==53)throw Error('The canonical52x56 island3 dataset is required');
 if(!/^[0-9a-f]{24}$/.test(adapter?.fingerprint||''))throw Error('The exact canonical asset fingerprint is required');
 for(const name of['context','describe','placementWhy','claim'])if(typeof adapter?.[name]!=='function')throw Error('Missing canonical adapter '+name);
}
function candidates(point,world){
 const rows=[];for(let y=0;y<world.rows;y++)for(let x=0;x<world.cols;x++)rows.push({x,y,d:((x-point.x)*world.cellW)**2+((y-point.y)*world.cellH)**2});
 return rows.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);
}
export function planGardenIslandV3(state,layout,adapter){
 requireContract(layout,adapter);const g=state?.garden,base={schemaVersion:2,layout:adapter.fingerprint,from:Number(g?.seen?.world)||1,to:3,cols:52,rows:56,changed:false,status:'no-garden',moves:[],packed:[],unknown:[],design:null,sourceKey:g?stable(g):null};
 if(!object(g)||!g.since)return base;
 if(base.from===3&&g.seen?.worldLayout===adapter.fingerprint)return{...base,status:'already-current'};
 if(![1,2].includes(base.from))return{...base,status:base.from>3?'newer-world-refused':'different-layout-refused'};
 const context=adapter.context(clone(state),layout),occupied=new Map(),rows=[],plan={...base,changed:true,status:'planned'};
 for(const kind of['plants','decor'])for(const uid of Object.keys(g[kind]||{}).sort()){
  const before=g[kind][uid],description=object(before)?adapter.describe(kind,before,context):null;
  if(!description){plan.unknown.push({kind,uid,reason:'Unknown/malformed full record preserved; no footprint guessed'});continue}
  if(before._packed===3){plan.packed.push({kind,uid,before:clone(before),after:clone(before),reason:'already-stored'});continue}
  if(!Number.isInteger(before.x)||!Number.isInteger(before.y)){plan.unknown.push({kind,uid,reason:'Saved placement coordinates are not recognized integers'});continue}
  const source={x:before.x+(base.from===1?12:0),y:before.y+(base.from===1?8:0)},preferred=adapter.preferred?.(kind,uid,before,context)||null;
  rows.push({kind,uid,before:clone(before),description,source,preferred,identity:kind+':'+uid});
 }
 const accept=(row,point,reason)=>{
  const after={...clone(row.before),x:point.x,y:point.y}; // every other saved field is unchanged; no lp format.
  adapter.claim(occupied,{...row,after},context);
  plan.moves.push({kind:row.kind,uid:row.uid,before:row.before,after,reason,changed:after.x!==row.before.x||after.y!==row.before.y});
 };
 rows.sort((a,b)=>Number(!!b.preferred)-Number(!!a.preferred)||cmp(a.identity,b.identity));
 const displaced=[];
 for(const row of rows){const point=row.preferred||row.source,why=adapter.placementWhy({...row,...point,occupied},context);if(!why)accept(row,point,row.preferred?'canonical-heart-anchor':'retained-legal-position');else displaced.push({...row,why})}
 displaced.sort((a,b)=>b.description.width*b.description.height-a.description.width*a.description.height||cmp(a.identity,b.identity));
 for(const row of displaced){
  let found=null;for(const point of candidates(row.preferred||row.source,layout.world))if(!adapter.placementWhy({...row,...point,occupied},context)){found=point;break}
  if(found)accept(row,found,'nearest-legal-placement');
  else plan.packed.push({kind:row.kind,uid:row.uid,before:row.before,after:{...clone(row.before),_packed:3},reason:row.why||'No compatible owned capacity'});
 }
 // Named raw layouts are never silently sanitized/deleted by this planner.
 // The source adapter must make an explicit reversible projection decision.
 if(Object.keys(g.dz||{}).length)plan.design=typeof adapter.planDesigns==='function'?adapter.planDesigns(clone(g.dz),context):{status:'blocked',reason:'Named design projection has not been integrated'};
 if(plan.unknown.length)plan.status='unknown-records-preserved-apply-blocked';
 else if(plan.design?.status==='blocked')plan.status='design-projection-apply-blocked';
 plan.counts={retained:plan.moves.filter(r=>!r.changed).length,relocated:plan.moves.filter(r=>r.changed).length,packed:plan.packed.length,unknown:plan.unknown.length,fullRows:plan.moves.length+plan.packed.length};
 return plan;
}
export function applyGardenIslandPlan(state,plan,{contractReady=false}={}){
 if(plan.status==='already-current'||plan.status==='no-garden')return{changed:false,state};
 if(!contractReady||plan.status!=='planned')throw Error('Canonical source, restoration and ingress contracts must be ready before applying this plan');
 if(stable(state?.garden)!==plan.sourceKey)throw Error('Garden changed during planning; no previous edit will be overwritten');
 const out=clone(state),g=out.garden;
 for(const row of[...plan.moves,...plan.packed])g[row.kind][row.uid]=clone(row.after);
 if(plan.design?.next!==undefined)g.dz=clone(plan.design.next);
 if(plan.design?.archives){
  if(!object(g.wd))g.wd={};
  for(const[key,record]of Object.entries(plan.design.archives)){
   if(Object.hasOwn(g.wd,key)&&stable(g.wd[key])!==stable(record))throw Error('Archive identity already holds different data; no existing archive will be overwritten');
   if(!Object.hasOwn(g.wd,key))g.wd[key]=clone(record);
  }
 }
 g.seen={...(g.seen||{}),world:3,worldLayout:plan.layout,'world3.from':plan.from,'world3.counts':clone(plan.counts)};
 return{changed:true,state:out};
}

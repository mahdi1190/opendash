/* Marriott's Way by the FORMER Reepham station, looking west along the
   trackbed. Wikimedia Commons: Reepham railway station in 2008.
   Buff brick and slate, a grass/dirt trail and raised former platform.
   This station has no operating railway: cyclists and walkers only. */
function sceneUkReephamV3() {
  const R=SCENE_REEPHAM,D=R.base('reepham-former-station',52.768149,1.11511,270,'natural',1040);
  D.surfaces=[{id:'verge',kind:'wood',rest:true},
    {id:'trail',kind:'cycleway',path:[[1,4],[1,10],[0,25],[-2,50],[-4,110],[-7,190]],width:3.2,markings:'none'},
    {id:'platform',kind:'platform',poly:[[-6,10],[-3,11],[-5.2,78],[-16,89],[-19,28]]},
    {id:'station',kind:'plot',poly:[[-20,31],[-5,31],[-5,56],[-25,59]]}];
  D.place.push({obj:'landmark.rph-station',at:[-15,40],subject:true,anim:false},
    {obj:'structure.rph-platform-edge',at:[-4.5,11.2],h:-.55,anim:false},
    {obj:'plant.hedge',at:[-22,65],variant:1,anim:false},
    {obj:'plant.hedge',at:[7,48],variant:2,anim:false},
    {obj:'plant.hedge',at:[-9,97],variant:0,anim:false},
    {obj:'tree.rph-pool-birch',at:[-17,132],variant:2,anim:false},
    {obj:'tree.rph-pond-oak',at:[8,115],variant:1,anim:false},
    {obj:'street.bench',at:[-4.8,19]},
    {obj:'tree.pool-oak',at:[8,14],variant:2},{obj:'tree.rph-pool-birch',at:[-10,13],variant:1},
    {obj:'tree.pool-oak',at:[15,45],variant:0},{obj:'tree.rph-pool-birch',at:[-28,52],variant:2},
    {obj:'tree.rph-bank-oak',at:[-11,84],variant:1},{obj:'tree.rph-bank-oak',at:[12,92],variant:0},
    {obj:'ground.log',at:[6,23],variant:1},{obj:'plant.bracken',at:[-5,7],variant:1});
  D.camera.horizon=490;
  R.raised(D,D.surfaces.find(s=>s.id==='platform').poly,.55);
  D.palette={base:{cycleway:['#bba47d','#a98d6b']}};
  R.woodland(D,'verge',80429,[210,460],9);
  R.plants(D,'verge',82903,450,[4.8,38],240);
  D.scatter.push({obj:{'plant.bracken':3,'plant.heather':1},on:'verge',d:[8,60],n:8,dist:'screen',cluster:{centres:3,spread:2.7},seed:85301,k:[.8,1.2],anim:false});
  R.life(D,[[.1,16],[-.6,25],[-2.6,50],[-4.6,100]],87149);
  D.flows.push({id:'marriotts-cyclists',kind:'cycle',on:'trail',density:.18,profile:'leisure',mix:{'person.cyclist':1},speed:[2.8,3.6],max:2,seed:89821});
  D.flocks.push({obj:'bird.small-flight',n:9,area:[-180,80,1780,245],speed:30,s:.42,seed:91373,layer:'horizon'});
  D.place.push({obj:'bird.pigeon',at:[-3.4,63],variant:1},{obj:'bird.pigeon',at:[-3.8,77],variant:2});
  return R.finish(D);
}

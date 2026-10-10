/* The adjoining St Michael and St Mary churches, from the south churchyard
   path looking NNW. Geograph 766121, approximate heading 337 degrees.
   Flint towers, St Michael's pinnacles and St Mary's slate-roofed nave. */
function sceneUkReephamV2() {
  const R=SCENE_REEPHAM,D=R.base('reepham-churchyard',52.76212,1.1134,337,'mixed',820);
  D.surfaces=[{id:'yard',kind:'lawn',rest:true},
    {id:'churches',kind:'plot',poly:[[-29,82],[25,82],[28,108],[-29,110]]},
    {id:'walk',kind:'path',path:[[-4,4],[-3,8],[-1,14],[2,24],[6,38],[4,55],[-2,72],[-7,80]],width:2.2},
    {id:'crosswalk',kind:'path',path:[[-60,30],[-15,29],[3,30],[18,33],[50,40]],width:2}];
  D.place.push({obj:'landmark.rph-churches',at:[0,93],subject:true,anim:false},
    {obj:'structure.rph-brick-wall',at:[-6.5,8.5],variant:0,anim:false},
    {obj:'structure.rph-brick-wall',at:[5.8,9.5],variant:0,anim:false},
    {obj:'plant.hedge',at:[-11,12],variant:1,anim:false},
    {obj:'plant.hedge',at:[12,18],variant:2,anim:false,flip:true},
    {obj:'plant.hedge',at:[-31,83],variant:1,anim:false},
    {obj:'plant.hedge',at:[29,95],variant:0,anim:false,flip:true},
    {obj:'plant.hedge',at:[-29,125],variant:2,anim:false},
    {obj:'plant.hedge',at:[36,114],variant:1,anim:false,flip:true},
    {obj:'tree.pool-oak',at:[-13,18],variant:2},{obj:'tree.pool-birch',at:[18,36],variant:1},
    {obj:'tree.proof-yew',at:[-18,61],variant:0},{obj:'tree.proof-yew',at:[21,74],variant:1},
    {obj:'street.bench',at:[8.5,42],flip:true},{obj:'street.bench',at:[-9,60]},
    {obj:'plant.planter',at:[-5.2,8],variant:1});
  D.camera.horizon=420;
  R.woodland(D,'yard',64811,[180,420],12);
  R.plants(D,'yard',67217,640,[4.8,42]);
  for(const [x,d,v]of [[-6,26,0],[9,28,1],[-11,41,2],[14,47,0],[-15,54,1],[16,67,2],[-9,70,0]])D.place.push({obj:'street.rph-headstone',at:[x,d],variant:v,flip:x<0,anim:false});
  // A quiet public route round the buildings, no route through graves or walls.
  R.life(D,[[-57,30],[-18,29],[-5,29.6],[10,31.7],[37,37.5]],69809);
  D.actors.push(sceneBehave.actor(D,{obj:'person.walker',preset:'stroll',route:[[-1,16],[2,24],[6,38],[4,55]],seed:71023,offset:.35}),
    sceneBehave.actor(D,{obj:'person.walker',preset:'elderly',route:[[-7,80],[-2,72],[4,55],[6,38]],seed:72739,offset:.8}));
  D.flocks.push({obj:'bird.small-flight',n:9,area:[-180,60,1780,260],speed:24,s:.48,seed:75121,layer:'horizon'});
  D.place.push({obj:'bird.pigeon',at:[7,52],variant:1},{obj:'bird.pigeon',at:[-5,66],variant:2});
  return R.finish(D);
}

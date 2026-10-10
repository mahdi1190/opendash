/* Market Place, west-facing historic frontage. Camera approximately at the
   Geograph 765581 viewpoint (52.76323, 1.11220), heading 270 degrees.
   Original stepped-gable butcher facade; no shop names or advertising. */
function sceneUkReephamV1() {
  const R=SCENE_REEPHAM,D=R.base('reepham-market',52.76323,1.1122,270,'urban');
  D.surfaces=[{id:'square',kind:'plaza',rest:true},
    {id:'shops',kind:'plot',poly:[[-32,36],[30,36],[30,51],[-32,51]]},
    {id:'road',kind:'road',path:[[-4,4],[-8,13],[-15,26],[12,29],[50,36]],width:5,markings:'none'},
    {id:'gardens',kind:'garden',poly:[[-200,55],[200,55],[500,600],[-500,600]]},
    {id:'left-frontage',kind:'plot',poly:[[-28,12],[-17,12],[-17,34],[-28,34]]},
    {id:'right-frontage',kind:'plot',poly:[[19,12],[28,12],[28,37],[19,37]]},
    {id:'adjoining-left',kind:'plot',poly:[[-35,42],[-19,42],[-19,80],[-35,80]]},
    {id:'adjoining-right',kind:'plot',poly:[[19,41],[38,41],[38,81],[19,81]]},
    {id:'border',kind:'garden',poly:[[-10,4],[-5.7,4],[-12,18],[-21,24],[-26,18]]}];
  D.place.push({obj:'landmark.rph-market',at:[0,39],subject:true,anim:false},
    {obj:'building.rph-market-side',at:[-19,28],variant:0,anim:false},
    {obj:'building.rph-market-side',at:[22,31],variant:1,anim:false,flip:true},
    {obj:'building.rph-market-side',at:[-25,49],variant:0,anim:false},
    {obj:'building.rph-market-side',at:[-31,66],variant:1,anim:false},
    {obj:'building.rph-market-side',at:[24,49],variant:1,anim:false,flip:true},
    {obj:'building.rph-market-side',at:[32,67],variant:0,anim:false},
    {obj:'plant.planter',at:[-1,6.6],variant:2},{obj:'plant.planter',at:[3.8,10.2],variant:0},
    {obj:'street.lamp',at:[-10.6,19],variant:0},{obj:'street.bench',at:[8.8,18],flip:true},
    {obj:'tree.pool-oak',at:[-12,17],variant:1},{obj:'tree.pool-birch',at:[44,96],variant:2},
    {obj:'tree.bank-distant',at:[-41,170],anim:false},{obj:'tree.bank-distant',at:[44,130],anim:false});
  R.plants(D,'border',39107,340,[4.8,24]);
  // Open square and opposite pavement: paths stop before the shop footprint.
  R.life(D,[[-9,18],[-2,18],[7,19],[17,21]],49211);
  D.actors.push(sceneBehave.actor(D,{obj:'person.walker',preset:'brisk',route:[[-13,34],[-5,33],[3,33],[14,34]],seed:53617,offset:.5}),
    sceneBehave.actor(D,{obj:'person.walker',preset:'elderly',route:[[-4,16],[1,16],[8,17],[17,19]],seed:55903,offset:.83}));
  D.flows.push({id:'local-traffic',kind:'drive',on:'road',density:.12,mix:{'vehicle.car':1},speed:[4,6],max:2,seed:57143});
  D.flocks.push({obj:'bird.herring-gull-flight',n:9,area:[-180,90,1780,280],speed:27,s:.22,seed:59239,layer:'horizon'});
  for(const [x,d,v]of [[-3,15,0],[2,17,1],[6,24,2],[-8,30,0]])D.place.push({obj:'bird.pigeon',at:[x,d],variant:v});
  return R.finish(D);
}

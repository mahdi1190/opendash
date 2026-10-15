/* Market Place, west-facing historic frontage. Camera approximately at the
   Geograph 765581 viewpoint (52.76323, 1.11220), heading 270 degrees.
   Original stepped-gable butcher facade; no shop names or advertising. */
function sceneUkReephamV1() {
  const R=SCENE_REEPHAM,D=R.base('reepham-market',52.76323,1.1122,270,'urban');
  D.camera.horizon=555;
  D.surfaces=[{id:'square',kind:'plaza',rest:true},
    {id:'road',kind:'road',path:[[-10,4],[-15,13],[-20,21],[12,22],[50,24]],width:4,markings:'none'},
    {id:'gardens',kind:'garden',poly:[[-200,55],[200,55],[500,600],[-500,600]]},
    {id:'left-frontage',kind:'plot',poly:[[-28,12],[-17,12],[-17,34],[-28,34]]},
    {id:'right-frontage',kind:'plot',poly:[[19,12],[28,12],[28,37],[19,37]]},
    {id:'adjoining-left',kind:'plot',poly:[[-35,42],[-19,42],[-19,80],[-35,80]]},
    {id:'adjoining-right',kind:'plot',poly:[[19,41],[38,41],[38,81],[19,81]]},
    {id:'border',kind:'garden',poly:[[-10,4],[-5.7,4],[-12,18],[-21,24],[-26,18]]},
    {id:'shops',kind:'plot',poly:[[-32,26],[30,26],[30,38],[-32,38]]}];
  D.place.push({obj:'landmark.rph-market',at:[1.5,28],subject:true,anim:false},
    {obj:'building.rph-market-side',at:[-14,29],variant:0,anim:false,flip:true},
    {obj:'building.rph-market-side',at:[17,29],variant:1,anim:false},
    {obj:'plant.rph-flower-tub',at:[-4.1,7.8],variant:1},{obj:'plant.rph-flower-tub',at:[8,16],variant:2},
    {obj:'street.lamp',at:[-10.6,19],variant:0},{obj:'street.bench',at:[8.8,18],flip:true},
    {obj:'tree.rph-canal-oak',at:[-14,20],variant:1},{obj:'tree.pool-birch',at:[44,96],variant:2},
    {obj:'tree.bank-distant',at:[-41,170],anim:false},{obj:'tree.bank-distant',at:[44,130],anim:false});
  R.plants(D,'border',39107,340,[4.8,24]);
  // Open square and opposite pavement: paths stop before the shop footprint.
  R.life(D,[[-9,18.5],[-2,18.5],[7,18.5],[17,18.5]],49211);
  D.actors.push(sceneBehave.actor(D,{obj:'person.walker',preset:'brisk',route:[[-10,24.5],[-5,24.5],[3,24.5],[14,24.5]],seed:53617,offset:.5}),
    sceneBehave.actor(D,{obj:'person.walker',preset:'elderly',route:[[-4,16],[1,16],[8,17],[17,19]],seed:55903,offset:.83}));
  D.flows.push({id:'local-traffic',kind:'drive',on:'road',density:.12,mix:{'vehicle.car':1},speed:[4,6],max:2,seed:57143});
  D.flocks.push({obj:'bird.herring-gull-flight',n:9,area:[-180,90,1780,280],speed:27,s:.22,seed:59239,layer:'horizon'});
  for(const [x,d,v]of [[-3,15,0],[2,17,1],[6,18,2],[-8,17,0]])D.place.push({obj:'bird.pigeon',at:[x,d],variant:v});
  return R.finish(D);
}

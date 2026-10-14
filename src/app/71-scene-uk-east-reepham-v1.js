/* Market Place, west-facing historic frontage. Camera approximately at the
   Geograph 765581 viewpoint (52.76323, 1.11220), heading 270 degrees.
   Original stepped-gable butcher facade; no shop names or advertising. */
function sceneUkReephamV1() {
  const R=SCENE_REEPHAM,D=R.base('reepham-market',52.76323,1.1122,270,'urban');
  D.camera.horizon=620;
  D.surfaces=[{id:'square',kind:'plaza',rest:true},
    {id:'road',kind:'road',path:[[-28,11.1],[-8,11.5],[8,11.9],[32,12.7]],width:5.5,markings:'none'},
    {id:'gardens',kind:'garden',poly:[[-200,55],[200,55],[500,600],[-500,600]]},
    {id:'left-frontage',kind:'plot',poly:[[-28,12],[-17,12],[-17,34],[-28,34]]},
    {id:'right-frontage',kind:'plot',poly:[[19,12],[28,12],[28,37],[19,37]]},
    {id:'adjoining-left',kind:'plot',poly:[[-35,42],[-19,42],[-19,80],[-35,80]]},
    {id:'adjoining-right',kind:'plot',poly:[[19,41],[38,41],[38,81],[19,81]]},
    {id:'border',kind:'garden',poly:[[-10,4],[-5.7,4],[-12,18],[-21,24],[-26,18]]},
    {id:'near-footway',kind:'pavement',poly:[[-30,4],[30,4],[30,9.5],[-30,8.2]]},
    {id:'shops',kind:'plot',poly:[[-32,23],[30,23],[30,35],[-32,35]]}];
  D.place.push({obj:'landmark.rph-market',at:[1.5,24],subject:true,anim:false},
    {obj:'building.rph-market-side',at:[-14,25],variant:0,anim:false,flip:true},
    {obj:'building.rph-market-side',at:[17,25],variant:1,anim:false},
    {obj:'plant.rph-flower-tub',at:[-4.1,7.8],variant:1},{obj:'plant.rph-flower-tub',at:[8,16],variant:2},
    {obj:'street.lamp',at:[-10.6,19],variant:0},{obj:'street.bench',at:[8.8,18],flip:true},
    {obj:'tree.rph-canal-oak',at:[-14,20],variant:1},{obj:'tree.pool-birch',at:[44,96],variant:2},
    {obj:'tree.bank-distant',at:[-41,170],anim:false},{obj:'tree.bank-distant',at:[44,130],anim:false});
  for(let i=4;i<8;i++){const x=-24+i*4,d=8.25+(x+24)*.02;
    D.place.push({obj:'street.rph-market-footway-'+i,at:[x+2,d],anim:false,shadow:false});}
  R.plants(D,'border',39107,340,[4.8,24]);
  D.scatter.push({obj:{'ground.rph-paving-wear':4,'ground.rph-ballast':1},on:['square','road'],d:[4.7,24],n:220,
    dist:'screen',cluster:{centres:14,spread:85},seed:41231,k:[1,1],anim:false,shadow:false,tint:{col:'#827c70',k:[0,.06]}});
  // Open square and opposite pavement: paths stop before the shop footprint.
  R.life(D,[[-9,18.5],[-2,18.5],[7,18.5],[17,18.5]],49211);
  D.actors.push(sceneBehave.actor(D,{obj:'person.walker',preset:'brisk',route:[[-8,17.2],[-3,17.2],[4,17.2],[14,17.2]],seed:53617,offset:.5}),
    sceneBehave.actor(D,{obj:'person.walker',preset:'elderly',route:[[-4,16],[1,16],[8,17],[17,19]],seed:55903,offset:.83}));
  D.flows.push({id:'local-traffic',kind:'drive',on:'road',density:.12,mix:{'vehicle.car':1},speed:[4,6],max:2,seed:57143});
  D.flocks.push({obj:'bird.herring-gull-flight',n:9,area:[-180,90,1780,280],speed:27,s:.22,seed:59239,layer:'horizon'});
  for(const [x,d,v]of [[-3,15,0],[2,17,1],[6,18,2],[-8,17,0]])D.place.push({obj:'bird.pigeon',at:[x,d],variant:v});
  return R.finish(D);
}

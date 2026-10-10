/* Whitwell & Reepham heritage railway: the south platform looking NNE into
   the yard, not the former station on Marriott's Way. Geograph 3154327.
   Camera 52.751515,1.097767; heading about 11 degrees, inferred from the
   photograph's camera/subject coordinates. Static tank wagon and brake van.
   Visitors use the platform, never the rails. */
function sceneUkReephamV4() {
  const R=SCENE_REEPHAM,D=R.base('reepham-whitwell',52.751515,1.097767,11,'mixed',680);
  D.surfaces=[{id:'grass',kind:'grass',rest:true},
    {id:'track',kind:'rail',path:[[-2,4],[-2,15],[-3,36],[-6,75],[-11,160]],width:4},
    {id:'siding',kind:'rail',path:[[-6,15],[-6,30],[-12,65],[-14,100]],width:3},
    {id:'platform',kind:'platform',poly:[[-.6,4],[7,4],[17,75],[-2,110],[-4,100],[0,35]]}];
  D.camera.horizon=475;
  D.camera.eye=2.2;
  R.raised(D,D.surfaces.find(s=>s.id==='platform').poly,.55);
  D.place.push({obj:'rail.rph-whitwell',at:[-6,23],subject:true,anim:false,face:'away'},
    {obj:'street.bench',at:[5,21],flip:true},{obj:'street.lamp',at:[7.8,31],variant:0},
    {obj:'plant.planter',at:[5.8,8],variant:2},
    {obj:'street.rph-rail-lantern',at:[4.3,6.8],anim:false},
    {obj:'street.rph-platform-fence',at:[9,13],anim:false},
    {obj:'street.rph-platform-fence',at:[10,24],anim:false},
    {obj:'tree.pool-oak',at:[-15,23],variant:1},{obj:'tree.pool-birch',at:[17,28],variant:2},
    {obj:'tree.rph-bank-oak',at:[26,70],variant:0},{obj:'tree.rph-bank-oak',at:[-29,87],variant:1});
  R.woodland(D,'grass',93811,[170,500],36);
  R.plants(D,'grass',95257,610,[4.8,40]);
  // The platform is broad enough for visitors to pass safely, well clear of stock.
  D.actors.push(...sceneBehave.pair(D,{obj:'person.walker',preset:'chat',route:[[3,16],[3.2,20],[3.6,25]],seed:97303,offset:.2}),
    sceneBehave.actor(D,{obj:'person.walker',preset:'stroll',route:[[9,44],[10,53],[11,63]],seed:99109,offset:.6}),
    sceneBehave.actor(D,{obj:'animal.dog',preset:'dog-trot',route:[[3.9,28],[5,40],[6,52]],seed:101483,offset:.65}));
  D.flocks.push({obj:'bird.goose-flight',n:11,area:[-180,100,1780,280],speed:28,s:.2,seed:104729,layer:'horizon'});
  D.place.push({obj:'bird.pigeon',at:[7.4,38],variant:1},{obj:'bird.pigeon',at:[8,44],variant:2});
  return R.finish(D);
}

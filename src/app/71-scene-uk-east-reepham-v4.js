/* Whitwell & Reepham heritage railway: the south platform looking NNE into
   the yard, not the former station on Marriott's Way. Geograph 3154327.
   Camera 52.751515,1.097767; heading about 11 degrees, inferred from the
   photograph's camera/subject coordinates. Static tank wagon and brake van.
   Visitors use the platform, never the rails. */
function sceneUkReephamV4() {
  const R=SCENE_REEPHAM,D=R.base('reepham-whitwell',52.751515,1.097767,11,'mixed',680);
  D.backdrop=false; // Heritage yard enclosed by its nearby tree belt.
  D.surfaces=[{id:'grass',kind:'grass',rest:true},
    {id:'track',kind:'rail',path:[[-2,4],[-2,15],[-3,36],[-6,75],[-11,160]],width:4},
    {id:'siding',kind:'rail',path:[[-3.7,14],[-6,30],[-12,65],[-14,100]],width:3},
    {id:'platform',kind:'platform',poly:[[-.6,4],[4.2,4],[7,75],[-2,110],[-4,100],[0,35]]}];
  D.camera.horizon=475;
  // Keep the platform on the engine's level ground: a relief boundary here
  // exposes a sky-coloured gap at the lower screen edge in the current engine.
  D.place.push({obj:'rail.rph-whitwell',at:[-3.7,14],subject:true,anim:false,face:'away'},
    {obj:'street.bench',at:[5.3,31],flip:true},{obj:'street.lamp',at:[6.4,45],variant:0},
    {obj:'plant.rph-flower-tub',at:[5.8,8],variant:2},
    {obj:'street.rph-rail-lantern',at:[4.3,6.8],h:2.25,anim:false},
    {obj:'structure.rph-lantern-post',at:[4.3,6.8],anim:false},
    {obj:'tree.rph-canal-oak',at:[-15,23],variant:1},{obj:'tree.pool-birch',at:[17,28],variant:2},
    {obj:'tree.rph-canal-oak',at:[18,55],variant:0},{obj:'tree.rph-canal-oak',at:[-20,65],variant:1});
  for(let i=0;i<6;i++){const d=18+i*8;D.place.push({obj:'street.rph-whitwell-fence-'+i,at:[4.2+.04*d,d],anim:false,shadow:false});}
  R.woodland(D,'grass',93811,[65,220],45);
  R.plants(D,'grass',95257,610,[4.8,40]);
  D.scatter.push({obj:'ground.rph-ballast',on:['track','siding'],d:[4.8,65],n:360,
    dist:'screen',seed:96737,k:[1,1],anim:false,shadow:false,tint:{col:'#827c70',k:[0,.06]}},
    {obj:'ground.rph-paving-wear',on:'platform',d:[4.8,50],n:175,
      dist:'screen',cluster:{centres:9,spread:60},seed:96811,k:[1,1],anim:false,shadow:false,tint:{col:'#827c70',k:[0,.06]}});
  // The platform is broad enough for visitors to pass safely, well clear of stock.
  D.actors.push(...sceneBehave.pair(D,{obj:'person.walker',preset:'chat',route:[[3,16],[3.2,20],[3.6,25]],seed:97303,offset:.2}),
    sceneBehave.actor(D,{obj:'person.walker',preset:'stroll',route:[[4.4,44],[5.2,53],[6,63]],seed:99109,offset:.6}),
    sceneBehave.actor(D,{obj:'animal.dog',preset:'dog-trot',route:[[2.6,28],[3.4,40],[4,52]],seed:101483,offset:.65}));
  D.flocks.push({obj:'bird.goose-flight',n:11,area:[-180,100,1780,280],speed:28,s:.2,seed:104729,layer:'horizon'});
  D.place.push({obj:'bird.pigeon',at:[7.4,38],variant:1},{obj:'bird.pigeon',at:[8,44],variant:2});
  return R.finish(D);
}

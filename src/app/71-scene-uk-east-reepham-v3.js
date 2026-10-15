/* Marriott's Way at the former Reepham station, looking west along the
   trackbed. Reference: Wikimedia Commons, Reepham railway station in 2008.
   The buff-brick station and old platform recede along a woodland corridor;
   this is a walking/cycling trail, not an operating railway. */
function sceneUkReephamV3() {
  const R=SCENE_REEPHAM,S=SCENE_REEPHAM_STATION;
  S.define();
  const D=R.base('reepham-former-station',52.768149,1.11511,270,'natural',800);
  D.camera=Object.assign({},D.camera,S.camera);
  D.backdrop=false; // This close woodland view has its own actual tree corridor.
  const trail=[[.6,4.7],[1.2,10],[1.1,18],[.3,32],[-.8,60],[-2,115],[-3.5,210]];
  D.surfaces=[{id:'verge',kind:'grass',rest:true},
    {id:'trail',kind:'cycleway',path:trail,width:1.65,markings:'none'},
    {id:'platform',kind:'platform',poly:[[-6.775,9],[-2.875,9],[-4.575,77],[-11.875,77]]},
    {id:'wood-left',kind:'verge',poly:[[-36,36],[-13,36],[-5.5,80],[-6,220],[-72,220]]},
    {id:'wood-right',kind:'verge',poly:[[6,24],[34,24],[74,220],[5,220]]},
    {id:'station',kind:'plot',poly:[[-12.3,27.5],[-4.6,27.5],[-4.6,62.5],[-12.3,62.5]]}];
  D.palette={base:{grass:['#627343','#71814b'],cycleway:['#b5a989','#9d9475']}};
  D.place.push({obj:'landmark.rph-station-perspective',at:[-4.9,28],h:.55,subject:true,anim:false});
  S.edges.forEach((e,i)=>D.place.push({obj:'structure.rph-platform-perspective-'+i,at:[e.x,e.d],anim:false,shadow:false}));
  // Close trunks and hanging boughs enclose the trail, as at this viewpoint.
  // The open slot preserves the station corner and vanishing point.
  D.place.push({obj:'plant.rph-station-bough',at:[-9,13],h:7,variant:0},
    {obj:'tree.rph-canal-oak',at:[12,18],variant:2},
    {obj:'tree.rph-pool-birch',at:[-16,37],variant:2},
    {obj:'tree.rph-canal-oak',at:[10,35],variant:1},
    {obj:'tree.rph-wyv-far-sallow',at:[-11,74],variant:2},
    {obj:'tree.rph-wyv-far-oak',at:[9,70],variant:1},
    {obj:'tree.rph-pool-birch',at:[-9,102],variant:1});
  R.woodland(D,'wood-left',80429,[65,180],15);
  R.woodland(D,'wood-right',80669,[45,155],15);
  // A woodland corridor has a low thicket between its trunks, rather than
  // isolated ornamental trees standing on an uninterrupted lawn.
  D.scatter.push({obj:'plant.towpath-hedge',on:['wood-left','wood-right'],d:[24,110],n:16,
    dist:'ground',cluster:{centres:5,spread:6},gap:'foot',seed:81761,k:[.8,1.15],anim:false,
    shadow:false,tint:{col:'#5b7350',k:[0,.1]}});
  // Ferns and long woodland grasses in irregular patches, not lawn tufts.
  D.scatter.push({obj:{'plant.grass-long':10,'plant.fern':1,'plant.bracken':1},on:'verge',d:[4.9,15],n:200,
    dist:'screen',cluster:{centres:11,spread:65},seed:82903,k:[.85,1.1],anim:false,tint:{col:'#829575',k:[0,.06]}},
    {obj:{'plant.rph-short-grass':5,'plant.rph-rosette':1},on:'verge',d:[4.9,12],n:210,
      dist:'screen',seed:84307,k:[1,1],anim:false,tint:{col:'#829575',k:[0,.12]}},
    {obj:{'plant.fern':3,'plant.bracken':2,'plant.wildflowers':1},on:'verge',d:[15,75],n:50,
      dist:'screen',cluster:{centres:9,spread:40},gap:.4,seed:85301,k:[.8,1.1],anim:false,tint:{col:'#829575',k:[0,.06]}},
    {obj:{'ground.leaf-litter':3,'ground.leaves':2},on:['verge','trail'],d:[5,28],n:42,
      dist:'screen',cluster:{centres:7,spread:55},seed:86069,k:[.8,1.2],anim:false,tint:{col:'#b0a186',k:[0,.1]}});
  D.place.push({obj:'plant.fern',at:[-2,5.9],variant:1},
    {obj:'plant.bracken',at:[3,5.8],variant:2},
    {obj:'plant.fern',at:[4.2,7.2],variant:0});
  D.actors.push(...sceneBehave.walkWithDog(D,{route:[[1,18],[.4,30],[-.5,51]],seed:87149}),
    sceneBehave.actor(D,{obj:'person.walker',preset:'elderly',route:[[-.6,63],[-1.1,84],[-2.1,117]],seed:89821,offset:.4}));
  D.flows.push({id:'marriotts-cyclists',kind:'cycle',on:'trail',density:.12,profile:'leisure',
    mix:{'person.cyclist':1},speed:[2.4,3],max:1,seed:90373});
  D.flocks.push({obj:'bird.small-flight',n:12,area:[400,135,1200,300],speed:24,s:.38,seed:91373,layer:'horizon'});
  D.place.push({obj:'bird.pigeon',at:[2.7,28],variant:1},{obj:'bird.pigeon',at:[2.5,39],variant:2});
  return R.finish(D);
}

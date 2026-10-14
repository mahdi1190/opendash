/* Marriott's Way at the former Reepham station, looking west along the
   trackbed. Reference: Wikimedia Commons, Reepham railway station in 2008.
   The buff-brick station and old platform recede along a woodland corridor;
   this is a walking/cycling trail, not an operating railway. */
function sceneUkReephamV3() {
  const R=SCENE_REEPHAM,S=SCENE_REEPHAM_STATION;
  S.define();
  const D=R.base('reepham-former-station',52.768149,1.11511,270,'natural',800);
  D.camera=Object.assign({},D.camera,S.camera);
  // The nearby corridor trees fill the horizon. The generic lowland band
  // would introduce an unrelated distant village into this enclosed view.
  D.backdrop=false;
  const trail=[[.6,4.7],[1.2,10],[1.1,18],[.3,32],[-.8,60],[-2,115],[-3.5,210]];
  D.surfaces=[{id:'verge',kind:'grass',rest:true},
    {id:'trail',kind:'cycleway',path:trail,width:1.65,markings:'none'},
    {id:'left-tread',kind:'path',path:trail.slice(0,6).map(([x,d])=>[x-.32,d]),width:.13},
    {id:'right-tread',kind:'path',path:trail.slice(0,6).map(([x,d])=>[x+.32,d]),width:.11},
    {id:'platform',kind:'platform',poly:[[-6.775,9],[-2.875,9],[-4.575,77],[-11.875,77]]},
    {id:'wood-left',kind:'verge',poly:[[-36,36],[-13,36],[-5.5,80],[-6,220],[-72,220]]},
    {id:'wood-right',kind:'verge',poly:[[3.3,12],[34,12],[74,220],[5,220]]},
    {id:'station',kind:'plot',poly:[[-12.3,27.5],[-4.6,27.5],[-4.6,62.5],[-12.3,62.5]]}];
  D.palette={base:{grass:['#627343','#71814b'],cycleway:['#b5a989','#9d9475'],path:['#9c9177','#a69a7d']}};
  D.place.push({obj:'landmark.rph-station-perspective',at:[-4.9,28],h:.55,subject:true,anim:false});
  S.edges.forEach((e,i)=>D.place.push({obj:'structure.rph-platform-perspective-'+i,at:[e.x,e.d],anim:false,shadow:false}));
  // Close trunks and hanging boughs enclose the trail, as at this viewpoint.
  // The open slot preserves the station corner and vanishing point.
  D.place.push({obj:'plant.rph-station-bough',at:[-9,13],h:7,variant:0},
    {obj:'tree.rph-pool-birch',at:[7.4,20],variant:1,anim:false},
    {obj:'tree.rph-canal-oak',at:[-15,35],variant:1,anim:false},
    {obj:'tree.rph-wyv-far-sallow',at:[-11,74],variant:2,anim:false},
    {obj:'tree.rph-wyv-far-oak',at:[9,70],variant:1,anim:false},
    {obj:'tree.rph-pool-birch',at:[-9,102],variant:1,anim:false});
  R.woodland(D,'wood-left',80429,[65,180],12);
  R.woodland(D,'wood-right',80669,[45,155],12);
  // A woodland corridor has a low thicket between its trunks, rather than
  // isolated ornamental trees standing on an uninterrupted lawn.
  [[4.6,13.5,0],[5.2,23,1],[4.1,39,0],[5.8,58,1],[-10.7,19,1],[-15,41,1],[-12,72,0]].forEach(([x,d,v])=>
      D.place.push({obj:'plant.rph-trackside-thicket',at:[x,d],variant:v,flip:x<0,anim:d<20,shadow:false}));
  // Ferns and long woodland grasses in irregular patches, not lawn tufts.
  D.scatter.push({obj:{'plant.rph-woodland-sedge':10,'plant.fern':1,'plant.bracken':1},on:'verge',d:[4.9,15],n:155,
    dist:'screen',cluster:{centres:11,spread:65},seed:82903,k:[.85,1.1],anim:false,tint:{col:'#829575',k:[0,.06]}},
    {obj:{'plant.rph-short-grass':5,'plant.rph-rosette':1},on:'verge',d:[4.9,12],n:185,
      dist:'screen',seed:84307,k:[1,1],anim:false,tint:{col:'#829575',k:[0,.12]}},
    {obj:{'plant.fern':3,'plant.bracken':2,'plant.wildflowers':1},on:'verge',d:[15,75],n:30,
      dist:'screen',cluster:{centres:9,spread:40},gap:.4,seed:85301,k:[.8,1.1],anim:false,tint:{col:'#829575',k:[0,.06]}},
    {obj:{'ground.leaf-litter':3,'ground.leaves':2},on:['verge','trail'],d:[5,28],n:42,
      dist:'screen',cluster:{centres:7,spread:55},seed:86069,k:[.8,1.2],anim:false,tint:{col:'#b0a186',k:[0,.1]}});
  D.place.push({obj:'plant.fern',at:[-2,5.9],variant:1},
    {obj:'plant.rph-trackside-thicket',at:[4.8,11],variant:1,anim:false,shadow:false},
    {obj:'plant.fern',at:[4.2,7.2],variant:0});
  D.actors.push(...sceneBehave.walkWithDog(D,{route:[[1,18],[.4,30],[-.5,51]],seed:87149}),
    sceneBehave.actor(D,{obj:'person.walker',preset:'elderly',route:[[-.6,63],[-1.1,84],[-2.1,117]],seed:89821,offset:.4}));
  D.flows.push({id:'marriotts-cyclists',kind:'cycle',on:'trail',density:.12,profile:'leisure',
    mix:{'person.cyclist':1},speed:[2.4,3],max:1,seed:90373});
  D.flocks.push({obj:'bird.small-flight',n:12,area:[400,135,1200,300],speed:24,s:.38,seed:91373,layer:'horizon'});
  D.place.push({obj:'bird.pigeon',at:[2.7,28],variant:1},{obj:'bird.pigeon',at:[2.5,39],variant:2});
  return R.finish(D);
}

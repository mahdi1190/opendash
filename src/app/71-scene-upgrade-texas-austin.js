/* Austin: a long shaded walk to the pink granite Capitol, under live oaks. */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  const scene=()=>({
    v:1,id:'austin-capitol-walk',view:{lat:30.2747,lon:-97.7404,heading:0,fov:78,horizon:566,lift:1},
    at:'golden',setting:'urban',signage:false,season:'auto',weather:'live',particles:'season', particleSeasons: { winter: 'motes' },
    palette:{
      base:{lawn:['#9ca46c','#687545'],walk:['#d6b796','#ab8b70'],far:'#87947c'},
      spring:{lawn:['#9bab64','#658248'],far:'#8b9c7b'},
      summer:{lawn:['#96a15f','#64713d'],far:'#829574'},
      autumn:{lawn:['#b2a66a','#847344'],far:'#a39b7b'},
      winter:{lawn:['#a9ae97','#7c8b71'],far:'#9daea5'},
    },
    sky:{stars:120,clouds:{n:4,y:[95,260],speed:4},sunR:24,moonR:25},
    layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='far'?{haze:.28}:l.id==='mid'?{haze:.025}:{})),
    ground:[
      {layer:'horizon',d:'M-160 585Q140 552 400 573T950 565T1760 578V645H-160Z',fill:'@far'},
      {layer:'mid',d:'M-160 610H1760V900H-160Z',fill:{lin:[[0,'@lawn.0'],[1,'@lawn.1']],x1:0,y1:610,x2:0,y2:900}},
      {layer:'mid',d:'M764 614h72l366 286H398Z',fill:{lin:[[0,'@walk.0'],[1,'@walk.1']],x1:0,y1:614,x2:0,y2:900}},
      {layer:'mid',d:'M755 614h9L398 900h-18ZM836 614h9l377 286h-20z',fill:'#ede1c3'},
      {layer:'mid',d:'M-150 729l690-56 13 9-703 63ZM1060 673l690 56v16l-703-63z',fill:'#c3ab87'},
      ...[637,665,704,754,819,897].map(y=>({layer:'mid',d:`M${Math.round(800-(y-614)*1.406)} ${y}h${Math.round((y-614)*2.812)}v1h-${Math.round((y-614)*2.812)}z`,fill:'#aa9478'})),
    ],
    place:[
      {obj:'landmark.texas-capitol',x:800,y:619,s:1,layer:'mid',seed:1},
      ...[[-95,900,1.44,0],[1705,900,1.5,2],[235,739,.62,1],[1367,738,.65,0],[466,645,.34,2],[1132,645,.35,1]].map(([x,y,s,v],i)=>({obj:'tree.texas-live-oak',x,y,s,variant:v,flip:!!(i%2),layer:i<2?'front':i<4?'fore':'mid',seed:8+i})),
      ...[[734,647,.31],[866,647,.31],[672,699,.5],[928,699,.5],[572,777,.76],[1028,777,.76],[454,871,1],[1146,871,1],[220,753,.63],[1380,753,.63],[90,777,.7],[1510,777,.7]].map(([x,y,s],i)=>({obj:'street.lamp',x,y,s,variant:i>7?1:0,flip:!!(i%2),layer:i<4?'mid':'fore',seed:30+i})),
      ...[[412,744,.65],[1188,744,.65],[284,848,1.1],[1316,848,1.1]].map(([x,y,s],i)=>({obj:'street.bench',x,y,s,layer:'fore',variant:2,seed:50+i})),
    ],
    scatter:[
      {obj:{'tree.texas-live-oak':1,'tree.distant':1},layer:'far',area:{rect:[-130,611,1730,617]},n:18,minGap:70,s:[.18,.28],flip:.5,variant:[0,2],seed:61,anim:false,shadow:false,tint:{col:'#879d96',k:[.1,.22]},mask:{avoid:[{rect:[370,0,1230,640]}]}},
      {obj:{'plant.grass':4,'plant.wildflowers':1},layer:'fore',area:{poly:[[-150,728],[546,682],[384,900],[-150,900]]},n:170,minGap:14,s:[.38,.82],sByY:[[680,.5],[900,1]],flip:.5,variant:[0,2],seed:65,anim:'strip',tint:{col:'#a1a06b',k:[0,.15]}},
      {obj:{'plant.grass':4,'plant.wildflowers':1},layer:'fore',area:{poly:[[1054,682],[1750,728],[1750,900],[1216,900]]},n:170,minGap:14,s:[.38,.82],sByY:[[680,.5],[900,1]],flip:.5,variant:[0,2],seed:66,anim:'strip',tint:{col:'#a1a06b',k:[0,.15]}},
      {obj:{'ground.capitol-aggregate':3,'ground.capitol-paver-joint':2},layer:'near',area:{poly:[[750,655],[850,655],[1190,899],[410,899]]},n:140,minGap:9,s:[.4,.85],sByY:[[655,.5],[900,1]],flip:.5,variant:[0,3],seed:67,anim:false,tint:{col:'#b4aa91',k:[0,.18]}},
    ],
    actors:[
      {obj:'person.walker',layer:'fore',path:[[650,726],[947,747]],s:.36,speed:6,loop:'pingpong',offset:.25,seed:71,variant:0},
      {obj:'person.walker',layer:'fore',path:[[570,791],[1010,810]],s:.46,speed:8,loop:'pingpong',offset:.63,seed:72,variant:2},
      {obj:'person.walker',layer:'mid',path:[[754,653],[849,666]],s:.24,speed:3,loop:'pingpong',offset:.4,seed:73,variant:1},
      {obj:'animal.squirrel',layer:'fore',path:[[226,805],[480,805]],s:.35,speed:9,loop:'pingpong',offset:.3,seed:74},
      {obj:'animal.squirrel',layer:'fore',path:[[1110,849],[1368,849]],s:.42,speed:11,loop:'pingpong',offset:.6,seed:75},
    ],
    flocks:[{obj:'bird.small-flight',layer:'far',n:7,area:[140,160,1460,330],s:.35,speed:18,seed:80},{obj:'bird.small-flight',layer:'mid',n:5,area:[90,310,1510,440],s:.46,speed:25,seed:81}],
    water:[],signs:[],camera:{pan:4,period:110},
  });
  animRegionSceneUpgrade('texas','place:austin',{state:'live',landmarks:['landmark.texas-capitol'],scene});
})();

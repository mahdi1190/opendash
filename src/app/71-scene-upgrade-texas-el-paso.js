/* El Paso: the Franklin mountain star over a warm low city and dry terrace.
   Retains the existing opening's identity and original SVG for comparison. */
(function(){
  if(typeof animRegionSceneUpgrade!=='function')return;
  const scene=()=>({
    v:1,id:'el-paso-franklin-star',view:{lat:31.789,lon:-106.478,heading:350,fov:80,horizon:615,lift:1},
    at:'dusk',setting:'mixed',signage:false,season:'auto',weather:'live',particles:'season', particleSeasons: { winter: 'motes' },
    palette:{
      base:{far:['#a19ba5','#8b7d8c'],land:['#b4987e','#856453','#5e4b40'],road:['#665a57','#9b8170'],wash:'#c6ad88'},
      spring:{far:['#a4a395','#8b8b7b'],land:['#aaad7e','#74815a','#4b6145'],road:['#665e54','#9b8c71'],wash:'#c7bb8b'},
      summer:{far:['#a69a92','#8f7e78'],land:['#b29e78','#8b7857','#63563d'],road:['#675b54','#a18a6a'],wash:'#c8af82'},
      autumn:{far:['#ae968b','#98776d'],land:['#be8c60','#966143','#694b34'],road:['#6e574c','#ad8060'],wash:'#d1a372'},
      winter:{far:['#a6adb1','#929aa1'],land:['#b7b4a8','#8e8d80','#666e63'],road:['#6f706e','#a3a39a'],wash:'#cac6b2'}
    },
    sky:{stars:230,clouds:{n:3,y:[95,250],speed:4},sunR:27,moonR:24},
    layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='far'?{haze:.5}:l.id==='mid'?{haze:.13}:l.id==='near'?{haze:.06}:{})),
    ground:[
      {layer:'horizon',d:'M-160 627L-80 558L20 586L121 512L205 557L284 527L369 573L460 536L560 575L651 526L760 567L884 497L973 535L1080 492L1197 552L1290 522L1411 574L1510 547L1760 611V663H-160Z',fill:'@far.0'},
      {layer:'far',d:'M-160 643L-52 584L42 615L157 570L271 610L372 579L490 619L605 587L731 620L874 565L990 602L1116 563L1282 616L1430 588L1568 621L1760 603V677H-160Z',fill:'@far.1'},
      {layer:'mid',d:'M-160 632Q250 614 600 632T1160 634T1760 632V694H-160Z',fill:'@land.0'},
      {layer:'near',d:'M-160 686Q260 663 676 680T1230 683T1760 672V772H-160Z',fill:{lin:[[0,'@land.0'],[1,'@land.1']],x1:0,y1:670,x2:0,y2:775}},
      {layer:'near',d:'M-160 696Q270 683 650 699T1250 701T1760 688L1760 706Q1200 718 650 709T-160 707Z',fill:'@road.0'},
      {layer:'fore',d:'M-160 767Q280 737 658 753T1260 757T1760 744V900H-160Z',fill:{lin:[[0,'@land.1'],[1,'@land.2']],x1:0,y1:745,x2:0,y2:900}},
      {layer:'fore',d:'M-160 777Q250 751 650 769T1270 775T1760 761V785Q1280 797 650 789T-160 799Z',fill:'@road.0'},
      {layer:'fore',d:'M-160 776Q250 750 650 768T1270 774T1760 760L1760 762Q1280 776 650 770T-160 778Z',fill:'@road.1'},
      {layer:'front',d:'M-160 900V866Q-25 830 163 849T475 866Q620 883 780 871T1100 858T1430 855T1760 844V900Z',fill:'@land.2'},
      {layer:'fore',d:'M700 900Q790 854 886 830Q950 809 1040 800L1029 793Q946 805 870 817Q755 844 664 900Z',fill:'@wash'}
    ],
    place:[
      {obj:'landmark.franklin-star-range',x:800,y:632,s:1,layer:'mid',seed:6407,anim:false},
      {obj:'plant.desert-ocotillo',x:75,y:895,s:1.06,layer:'front',seed:6479,variant:1},
      {obj:'plant.desert-pricklypear',x:1520,y:900,s:1.3,layer:'front',seed:6553,variant:2,flip:true},
      {obj:'plant.desert-sotol',x:210,y:906,s:1.25,layer:'front',seed:6619,variant:2},
      {obj:'plant.desert-sotol',x:1395,y:899,s:1.1,layer:'front',seed:6703,variant:1,flip:true},
      {obj:'rock.desert-boulder',x:102,y:895,s:1.2,layer:'front',seed:6791,variant:2},
      {obj:'rock.desert-boulder',x:1555,y:905,s:1.5,layer:'front',seed:6833,variant:1},
      {obj:'bird.desert-roadrunner',x:1190,y:847,s:.67,layer:'fore',seed:6911,variant:1,flip:true}
    ],
    scatter:[
      {obj:{'building.el-paso-adobe':3,'building.desert-courtyard':2},layer:'near',seed:7001,area:{rect:[-70,654,1670,683]},n:43,minGap:29,s:[.19,.43],sByY:[[654,.7],[683,1.15]],flip:.45,variant:[0,3],anim:false,tint:{col:'#a99086',k:[.04,.2]}},
      {obj:{'building.el-paso-adobe':3,'building.desert-courtyard':2},layer:'near',seed:7121,area:{rect:[-80,724,1680,746]},n:23,minGap:54,s:[.3,.58],flip:.5,variant:[0,3],anim:false,tint:{col:'#ac937a',k:[0,.12]}},
      {obj:{'ground.desert-gravel':5,'ground.desert-tuft':2},layer:'fore',seed:7237,area:{rect:[0,803,1600,899]},n:330,minGap:5,s:[.25,.85],sByY:[[803,.6],[900,1.2]],flip:.5,variant:[0,3],anim:false,tint:{col:'#9b8263',k:[0,.18]}},
      {obj:{'plant.desert-creosote':4,'plant.desert-sotol':1},layer:'fore',seed:7351,area:{rect:[-50,815,1650,897]},n:48,minGap:35,s:[.22,.62],sByY:[[815,.6],[900,1.1]],flip:.5,variant:[0,3],anim:false,tint:{col:'#9c855f',k:[0,.15]}},
      {obj:'ground.desert-tuft',layer:'fore',seed:7457,area:{rect:[-50,854,1650,900]},n:24,minGap:39,s:[.45,.9],flip:.5,variant:[0,3],anim:'strip'},
      {obj:'plant.desert-creosote',layer:'far',seed:7529,area:{rect:[-80,640,1680,658]},n:26,minGap:57,s:[.14,.24],flip:.5,variant:[0,3],anim:false,shadow:false,tint:{col:'#b5a49a',k:[.12,.3]}}
    ],
    actors:[
      {obj:'vehicle.car',layer:'near',path:[[-150,701],[1750,701]],speed:37,s:.28,loop:'loop',offset:.25,variant:1,seed:7603},
      {obj:'vehicle.car',layer:'near',path:[[1750,704],[-150,704]],speed:44,s:.31,loop:'loop',offset:.59,variant:4,seed:7681},
      {obj:'vehicle.car',layer:'fore',path:[[-180,786],[250,772],[650,780],[1270,785],[1780,771]],speed:57,s:.43,loop:'loop',offset:.68,variant:2,seed:7753},
      {obj:'vehicle.car',layer:'fore',path:[[1780,784],[1270,799],[650,794],[250,786],[-180,800]],speed:49,s:.45,loop:'loop',offset:.48,variant:0,seed:7829},
      {obj:'bird.desert-roadrunner',layer:'fore',path:[[-180,858],[1780,858]],speed:29,s:.56,loop:'loop',offset:.4,variant:0,seed:7919}
    ],
    flocks:[{obj:'bird.small-flight',layer:'horizon',n:8,area:[-100,185,1700,300],s:.42,speed:17,seed:8039},{obj:'bird.small-flight',layer:'far',n:4,area:[120,390,1480,485],s:.3,speed:23,seed:8123}],
    water:[],signs:[],camera:{pan:0,period:112}
  });
  animRegionSceneUpgrade('texas','place:el-paso',{state:'live',landmarks:['landmark.franklin-star-range'],scene});
})();

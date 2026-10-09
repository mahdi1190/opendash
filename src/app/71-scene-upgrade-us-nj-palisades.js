/* Open sea under an amusement pier, reached by a diagonal timber boardwalk. */
(function(){const palette={base:{far:['#a8bdc2','#74969c'],ground:['#9fa27d','#707e62','#344e43'],wood:['#b29c7e','#827564','#59615c']},spring:{ground:['#98ab80','#66885e','#35583e']},summer:{ground:['#9eaa72','#6b8755','#37533a']},autumn:{ground:['#b7a476','#8e8159','#554d37']},winter:{ground:['#d7dacc','#acbcb0','#728f85'],wood:['#c6c7b5','#9ca79d','#6b8581']}};
 function compose(){const d={v:1,id:'us-nj-palisades',view:{lat:39.353,lon:-74.425,heading:110,horizon:531},at:'golden',season:'auto',setting:'urban',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.65},{id:'far',depth:.2,haze:.4},{id:'mid',depth:.42,haze:.15},{id:'near',depth:.73,haze:.03},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:150,clouds:{n:3,y:[100,258],speed:3},sunR:25,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V553Q138 535 430 558T1100 548Q1430 532 1760 555V900z',fill:'@far.0'},
 {layer:'far',d:'M-160 900V622L1760 607V900z',fill:'@far.1'},
 {layer:'mid',d:'M-160 900V786Q111 744 333 780L456 900zM1760 900V753Q1548 748 1373 799L1268 900z',fill:'@ground.0'},
 {layer:'near',d:'M-160 900V850Q136 809 360 864L436 900zM1760 900V822Q1540 804 1347 872L1284 900z',fill:'@ground.1'},
 {layer:'fore',d:'M401 900L760 686H954L1392 900z',fill:'@wood.0'},
 {layer:'fore',d:'M401 900L760 686h15L440 900zM1352 900L941 686h13L1392 900z',fill:'@wood.2'},
 {layer:'front',d:'M-160 900V890Q127 850 295 895zM1444 900Q1610 855 1760 879V900z',fill:'@ground.2'}],water:[{layer:'mid',d:'M-160 548H1760V900H-160z',y0:548,y1:900,base:['#b8ced0','#719ba8','#3d627b'],reflect:true,shimmer:56,lightPath:true}],place:[
 {obj:'ground.us-jersey-pier',x:975,y:786,s:1,layer:'mid',seed:20011},
 {obj:'ground.us-jersey-coaster',x:1302,y:678,s:.8,layer:'mid',seed:20023},
 {obj:'building.us-jersey-arcade',x:463,y:678,s:.79,layer:'mid',seed:20037,shadow:false},
 {obj:'landmark.us-jersey-wheel',x:824,y:678,s:.94,layer:'near',seed:20053,shadow:false},
 {obj:'tree.us-northern-maple',x:109,y:812,s:.3,variant:1,layer:'near',seed:20069},{obj:'tree.far-birch',x:1583,y:810,s:.34,variant:0,layer:'near',seed:20083},{obj:'tree.us-northern-maple',x:1462,y:845,s:.31,variant:3,layer:'fore',seed:20099},
 {obj:'street.lamppost',x:571,y:839,s:.7,variant:1,layer:'fore',seed:20113},{obj:'street.lamppost',x:1187,y:830,s:.66,variant:2,layer:'fore',seed:20129}],scatter:[],actors:[{obj:'boat.dinghy',path:[[138,667],[331,703]],speed:7,s:.55,variant:1,layer:'mid',seed:20143,loop:'pingpong'},{obj:'boat.fishing-boat',path:[[1201,756],[1466,755]],speed:6,s:.47,variant:0,layer:'near',seed:20161,loop:'pingpong'}],flocks:[{obj:'bird.herring-gull-flight',n:13,area:[145,102,1460,398],layer:'horizon',speed:34,s:.43,seed:20177}]};
 for(const[i,poly]of [[[-160,822],[318,804],[420,905],[-160,905]],[[1441,814],[1760,790],[1760,905],[1370,905]]].entries())d.scatter.push({obj:{'plant.grass':2,'plant.reed':2,'rock.stones':1,'rock.boulder':.5,'ground.leaves':1,'ground.puddle':1},layer:'fore',seed:20201+i*41,area:{poly},n:110,minGap:12,s:[.38,.7],variant:[0,1],flip:.5,anim:false,tint:{col:'#96976d',k:[0,.16]}});
 d.scatter.push({obj:'ground.capitol-paver-joint',layer:'fore',seed:20303,area:{poly:[[475,895],[780,703],[940,703],[1320,895]]},n:100,minGap:14,s:[.7,1.2],variant:[0,1],flip:.5,anim:false,tint:{col:'#9a8a73',k:[0,.16]}});
 d.scatter.push({obj:{'plant.reed':2,'plant.grass':1},layer:'fore',seed:20327,area:{rect:[-140,775,310,822]},n:34,minGap:23,s:[.6,1],variant:[0,1],flip:.5,anim:'strip',tint:{col:'#87906b',k:[0,.16]}});return d;}
 animRegionSceneUpgrade('us','state:NJ',{state:'draft',landmarks:['landmark.us-jersey-wheel'],scene:compose});
})();

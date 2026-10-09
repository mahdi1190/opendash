/* Mount Washington's diagonal wooded incline overlooks golden steel and river towers. */
(function(){const palette={base:{far:['#a2b3b6','#718e95'],ground:['#8b9d73','#526f51','#294e40'],track:'#8f8d74'},spring:{ground:['#93b17b','#527f50','#2c563b']},summer:{ground:['#86a56a','#4b754c','#274e36']},autumn:{ground:['#b2a171','#8a7350','#524a35']},winter:{ground:['#cad8ce','#99b5a8','#5c827a'],track:'#adbcb3'}};
 function compose(){const d={v:1,id:'us-pittsburgh-incline',view:{lat:40.438,lon:-80.014,heading:30,horizon:530},at:'golden',season:'auto',setting:'urban',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.7},{id:'far',depth:.2,haze:.4},{id:'mid',depth:.42,haze:.15},{id:'near',depth:.73,haze:.035},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:170,clouds:{n:3,y:[80,270],speed:3},sunR:25,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V574L93 528 312 563 631 514 892 550 1189 516 1479 555 1760 533V900z',fill:'@far.0'},
 {layer:'far',d:'M-160 900V607Q800 576 1760 603V900z',fill:'@far.1'},
 {layer:'mid',d:'M-160 900V651L210 627 468 645 590 679 1760 665V900z',fill:'@ground.0'},
 {layer:'near',d:'M-160 900V546Q60 532 257 579T610 722Q830 806 1035 900z',fill:'@ground.1'},
 {layer:'fore',d:'M-160 900V692Q135 654 355 736T809 900z',fill:'@ground.2'},
 {layer:'fore',d:'M405 615L1038 878 1011 902 373 637z',fill:'@track'},
 {layer:'front',d:'M-160 900V842Q122 788 328 861L444 900zM1424 900Q1590 842 1760 866V900z',fill:'@ground.2'}],water:[{layer:'mid',d:'M-160 617Q800 600 1760 622V900H-160z',y0:617,y1:900,base:['#b5c5bd','#6c9ba3','#3b617a'],reflect:true,shimmer:51,lightPath:true}],place:[
 {obj:'building.us-pittsburgh-crowns',x:995,y:617,s:.75,layer:'far',seed:22011,shadow:false},
 {obj:'landmark.us-pittsburgh-yellow-bridge',x:977,y:676,s:.81,layer:'mid',seed:22027,shadow:false},
 {obj:'ground.us-incline-tracks',x:403,y:622,s:1,layer:'fore',seed:22043},
 {obj:'building.green-cottage',x:416,y:620,s:.42,variant:1,layer:'near',seed:22059},
 {obj:'tree.us-northern-maple',x:219,y:661,s:.46,variant:1,layer:'near',seed:22073},{obj:'tree.far-birch',x:117,y:735,s:.4,variant:2,layer:'fore',seed:22091},{obj:'tree.us-northern-maple',x:1518,y:862,s:.48,variant:2,layer:'fore',seed:22109},
 {obj:'tree.us-northern-maple',x:58,y:927,s:1.12,variant:0,layer:'front',seed:22123},{obj:'tree.us-northern-maple',x:1590,y:943,s:.99,variant:3,layer:'front',seed:22139}],scatter:[],actors:[
 {obj:'vehicle.us-pittsburgh-incline',path:[[426,631],[991,871]],speed:18,s:.86,layer:'fore',seed:22153,loop:'pingpong'},
 {obj:'boat.fishing-boat',path:[[1027,789],[1439,777]],speed:8,s:.62,variant:1,layer:'near',seed:22169,loop:'pingpong'},
 {obj:'boat.dinghy',path:[[1087,861],[1409,845]],speed:6,s:.64,variant:2,layer:'fore',seed:22181,loop:'pingpong'}],flocks:[{obj:'bird.small-flight',n:13,area:[170,109,1450,322],layer:'horizon',speed:33,s:.4,seed:22199}]};
 for(const[i,poly]of [[[-160,679],[225,660],[363,747],[751,905],[-160,905]],[[1514,825],[1760,810],[1760,905],[1443,905]]].entries())d.scatter.push({obj:{'plant.grass':2,'plant.fern':1,'ground.leaves':2,'ground.puddle':1,'rock.stones':1,'rock.boulder':.4},layer:'fore',seed:22217+i*47,area:{poly},n:110,minGap:13,s:[.4,.8],variant:[0,1],flip:.5,anim:false,tint:{col:'#8d8a69',k:[0,.16]}});
 d.scatter.push({obj:{'tree.far-birch':2,'tree.us-northern-maple':1},layer:'near',seed:22313,area:{poly:[[-150,566],[177,582],[351,667],[-150,705]]},n:20,minGap:38,s:[.17,.32],variant:'random',flip:.5,anim:false,tint:{col:'#567a68',k:[0,.16]}});
 d.scatter.push({obj:'plant.grass',layer:'fore',seed:22331,area:{rect:[-150,808,368,910]},n:35,minGap:25,s:[.7,1.1],variant:'random',flip:.5,anim:'strip'});return d;}
 animRegionSceneUpgrade('us','place:pittsburgh',{state:'draft',landmarks:['landmark.us-pittsburgh-yellow-bridge'],scene:compose});
})();

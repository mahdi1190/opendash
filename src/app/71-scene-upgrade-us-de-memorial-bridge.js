/* Parallel spans over a broad shipping river and foreground tidal marsh. */
(function(){const palette={base:{far:['#9baead','#718f85'],ground:['#809665','#536f4e','#294a3b'],mud:['#a7a28d','#687e72']},spring:{ground:['#86a771','#557d51','#2c553b']},summer:{ground:['#81975b','#4f7548','#294d35']},autumn:{ground:['#ae975d','#816e46','#4b4b35']},winter:{ground:['#c4d1c2','#92ad9a','#5c7f71'],mud:['#b7c5b9','#839e91']}};
 function compose(){const d={v:1,id:'us-de-memorial-bridge',view:{lat:39.688,lon:-75.518,heading:20,horizon:548},at:'golden',season:'auto',setting:'natural',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.7},{id:'far',depth:.2,haze:.43},{id:'mid',depth:.42,haze:.18},{id:'near',depth:.73,haze:.04},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:180,clouds:{n:4,y:[80,270],speed:3},sunR:25,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V557Q233 521 567 555T1173 544Q1477 520 1760 555V900z',fill:'@far.0'},
 {layer:'far',d:'M-160 900V610Q226 567 550 591T1149 578Q1456 560 1760 599V900z',fill:'@far.1'},
 {layer:'mid',d:'M-160 900V636Q82 609 346 633L356 673 227 739 15 772-160 799zM1760 900V620Q1493 611 1244 636L1224 678 1339 706 1760 744z',fill:'@ground.0'},
 {layer:'near',d:'M-160 900V787Q79 726 258 777L420 841 393 900zM1760 900V766Q1521 734 1340 794L1220 862 1258 900z',fill:'@mud.0'},
 {layer:'fore',d:'M-160 900V854Q62 816 217 842L432 900zM1760 900V832Q1527 807 1322 874L1279 900z',fill:'@ground.1'},
 {layer:'front',d:'M-160 900V891Q36 845 246 888L292 900zM1388 900Q1570 852 1760 875V900z',fill:'@ground.2'}],water:[{layer:'mid',d:'M-160 601Q679 574 1760 597V620Q1493 611 1244 636L1224 678 1339 706 1760 744V900H-160V799L15 772 227 739 356 673 346 633Q82 609-160 636z',y0:673,y1:900,base:['#bad1c2','#689ca2','#365c73'],reflect:true,shimmer:52,lightPath:true}],place:[
 {obj:'landmark.us-de-memorial-bridge',x:800,y:673,s:.93,layer:'mid',seed:17011,shadow:false},
 {obj:'tree.us-northern-maple',x:87,y:760,s:.4,variant:1,layer:'near',seed:17029},{obj:'tree.far-birch',x:1617,y:759,s:.36,variant:2,layer:'near',seed:17047},{obj:'tree.us-northern-maple',x:1521,y:776,s:.46,variant:3,layer:'near',seed:17063},
 {obj:'bird.herring-gull',x:218,y:835,s:.7,variant:0,layer:'fore',seed:17081}],scatter:[],actors:[
 {obj:'boat.fishing-boat',path:[[429,752],[672,745],[1068,769]],speed:7,s:.58,variant:1,layer:'near',seed:17107,loop:'pingpong'},
 {obj:'boat.dinghy',path:[[1126,820],[946,836]],speed:6,s:.54,variant:2,layer:'fore',seed:17129,loop:'pingpong'}],flocks:[{obj:'bird.herring-gull-flight',n:13,area:[160,138,1450,360],layer:'horizon',speed:34,s:.38,seed:17147}]};
 for(const[i,poly]of [[[-160,786],[172,764],[432,905],[-160,905]],[[1354,782],[1760,754],[1760,905],[1268,905]]].entries())d.scatter.push({obj:{'plant.grass':2,'plant.reed':2,'ground.leaves':1,'ground.puddle':2,'rock.stones':1,'rock.boulder':.5},layer:'fore',seed:17173+i*47,area:{poly},n:225,minGap:9,s:[.4,.8],variant:[0,1],flip:.5,anim:false,tint:{col:'#93936c',k:[0,.16]}});
 d.scatter.push({obj:{'plant.reed':2,'plant.grass':1},layer:'fore',seed:17281,area:{rect:[440,859,1230,910]},n:55,minGap:22,s:[.6,1],variant:[0,1],flip:.5,anim:'strip',tint:{col:'#8c8f68',k:[0,.16]}});return d;}
 animRegionSceneUpgrade('us','state:DE',{state:'draft',landmarks:['landmark.us-de-memorial-bridge'],scene:compose});
})();

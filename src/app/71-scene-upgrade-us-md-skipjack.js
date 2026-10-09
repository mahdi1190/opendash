/* A low marsh viewpoint onto a skipjack under cream sails. */
(function(){const palette={base:{shore:['#a6b5af','#7e9d8c'],ground:['#879960','#5c784b','#2b493a'],mud:['#999b86','#667c72']},spring:{ground:['#8bad67','#5a874b','#2e583b']},summer:{ground:['#91a05e','#597b44','#2d4d34']},autumn:{ground:['#ac9457','#816d42','#4f4a34']},winter:{ground:['#c5d2c6','#99b6a2','#658a79'],mud:['#b4c4b7','#819f90']}};
 function compose(){const d={v:1,id:'us-md-skipjack',view:{lat:38.977,lon:-76.427,heading:120,horizon:546},at:'golden',season:'auto',setting:'natural',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.72},{id:'far',depth:.2,haze:.48},{id:'mid',depth:.42,haze:.18},{id:'near',depth:.73,haze:.04},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:190,clouds:{n:3,y:[85,282],speed:4},sunR:26,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V558Q168 521 411 550L609 566 1760 541V900z',fill:'@shore.0'},
 {layer:'far',d:'M-160 900V593Q88 555 313 574L526 601 1421 571 1760 583V900z',fill:'@shore.1'},
 {layer:'mid',d:'M-160 900V852L-9 818 131 825 226 851 1760 841V900z',fill:'@mud.0'},
 {layer:'near',d:'M-160 900V869Q83 822 285 868L495 900zM1760 900V853Q1594 811 1430 862L1323 900z',fill:'@ground.0'},
 {layer:'fore',d:'M-160 900V899Q45 850 251 884L405 900zM1391 900Q1562 841 1760 875V900z',fill:'@ground.1'},
 {layer:'front',d:'M-160 900V900L19 874 177 888 266 900zM1494 900L1606 870 1760 884V900z',fill:'@ground.2'}],water:[{layer:'mid',d:'M-160 578Q700 553 1760 569V900H-160z',y0:576,y1:900,base:['#c3d3c2','#799fa4','#355d73'],reflect:true,shimmer:58,lightPath:true}],place:[
 {obj:'boat.us-chesapeake-skipjack',x:800,y:718,s:.94,layer:'near',seed:19009,reflect:true},
 {obj:'bird.herring-gull',x:275,y:866,s:.6,variant:1,layer:'fore',seed:19031},{obj:'rock.boulder',x:123,y:889,s:.76,variant:2,layer:'front',seed:19049},
 {obj:'tree.us-northern-maple',x:1481,y:866,s:.23,variant:1,layer:'near',seed:19067},{obj:'tree.far-birch',x:1620,y:873,s:.24,variant:2,layer:'near',seed:19081}],scatter:[],actors:[
 {obj:'boat.dinghy',path:[[1093,656],[1324,647]],speed:5,s:.27,variant:0,layer:'mid',seed:19103,loop:'pingpong'},{obj:'bird.mallard',path:[[410,790],[576,774]],speed:4,s:.38,variant:1,layer:'fore',seed:19121,loop:'pingpong'}],flocks:[{obj:'bird.herring-gull-flight',n:13,area:[140,144,1450,366],layer:'horizon',speed:34,s:.37,seed:19139}]};
 for(const[i,poly]of [[[-160,853],[128,831],[406,905],[-160,905]],[[1424,837],[1760,823],[1760,905],[1320,905]]].entries())d.scatter.push({obj:{'plant.grass':2,'plant.reed':3,'ground.puddle':2,'ground.leaves':1,'rock.stones':1,'rock.boulder':1},layer:'fore',seed:19161+i*43,area:{poly},n:240,minGap:7,s:[.35,.68],variant:[0,1],flip:.5,anim:false,tint:{col:'#8f9776',k:[0,.16]}});
 d.scatter.push({obj:{'plant.reed':2,'plant.grass':1},layer:'fore',seed:19259,area:{rect:[390,869,1330,915]},n:70,minGap:19,s:[.6,.93],variant:[0,1],flip:.5,anim:'strip',tint:{col:'#7a8c6e',k:[0,.16]}});return d;}
 animRegionSceneUpgrade('us','state:MD',{state:'draft',landmarks:['boat.us-chesapeake-skipjack'],scene:compose});
})();

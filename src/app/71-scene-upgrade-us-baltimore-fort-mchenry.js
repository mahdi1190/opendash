/* Brick headland architecture and a curving dry path above the working harbour. */
(function(){const palette={base:{far:['#a9b9b3','#71938e'],ground:['#9aa878','#6e855b','#354f40'],earth:['#a99a78','#7a7e64'],path:['#c1b291','#938e78']},spring:{ground:['#9dbb80','#6a955e','#365b3e']},summer:{ground:['#9ab071','#668a55','#344f38']},autumn:{ground:['#b9a577','#8f8257','#585039']},winter:{ground:['#d0d9c5','#a5bca8','#638578'],earth:['#b5c5b6','#829e8f'],path:['#c7cabc','#9aaea5']}};
 function compose(){const d={v:1,id:'us-baltimore-fort-mchenry',view:{lat:39.263,lon:-76.58,heading:85,horizon:545},at:'dawn',season:'auto',setting:'urban',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.72},{id:'far',depth:.2,haze:.44},{id:'mid',depth:.42,haze:.14},{id:'near',depth:.73,haze:.03},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:160,clouds:{n:4,y:[80,285],speed:3},sunR:27,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V568Q200 537 570 554T1170 549Q1470 530 1760 560V900z',fill:'@far.0'},
 {layer:'far',d:'M-160 900V612Q400 593 812 612T1760 603V900z',fill:'@far.1'},
 {layer:'mid',d:'M-160 900V782L246 689 480 652 1090 642 1370 720 1760 779V900z',fill:'@earth.0'},
 {layer:'near',d:'M-160 900V829L225 737 490 695 1100 688 1390 758 1760 809V900z',fill:'@ground.0'},
 {layer:'fore',d:'M-160 900V875Q209 783 470 797L1120 771Q1450 796 1760 845V900z',fill:'@ground.1'},
 {layer:'fore',d:'M395 900Q533 811 741 739L786 735Q658 816 605 900z',fill:'@path.0'},
 {layer:'front',d:'M-160 900V891Q69 842 278 884L350 900zM1321 900Q1570 841 1760 869V900z',fill:'@ground.2'}],water:[{layer:'far',d:'M-160 597H1760V900H-160z',y0:597,y1:900,base:['#c4d0b7','#729e9d','#385e76'],reflect:true,shimmer:55,lightPath:true}],place:[
 {obj:'landmark.us-fort-mchenry',x:800,y:720,s:.92,layer:'near',seed:23011},
 {obj:'tree.us-northern-maple',x:129,y:855,s:.58,variant:2,layer:'fore',seed:23029},{obj:'tree.us-northern-maple',x:1547,y:873,s:.65,variant:1,layer:'fore',seed:23047},{obj:'tree.far-birch',x:1430,y:759,s:.3,variant:0,layer:'near',seed:23063},
 {obj:'rock.boulder',x:229,y:803,s:.93,variant:0,layer:'fore',seed:23081},{obj:'rock.boulder',x:1372,y:808,s:1.1,variant:1,layer:'fore',seed:23099}],scatter:[],actors:[
 {obj:'boat.fishing-boat',path:[[1098,648],[1511,661]],speed:8,s:.5,variant:0,layer:'mid',seed:23117,loop:'pingpong'},
 {obj:'boat.dinghy',path:[[46,721],[211,689]],speed:6,s:.62,variant:2,layer:'mid',seed:23131,loop:'pingpong'}],flocks:[{obj:'bird.herring-gull-flight',n:13,area:[154,153,1450,362],layer:'horizon',speed:33,s:.42,seed:23149}]};
 for(const[i,poly]of [[[-160,831],[244,755],[600,769],[409,905],[-160,905]],[[1043,761],[1366,775],[1760,829],[1760,905],[1069,905]]].entries())d.scatter.push({obj:{'plant.grass':3,'plant.reed':1,'ground.leaves':2,'ground.puddle':1,'rock.stones':1,'rock.boulder':.5},layer:'fore',seed:23167+i*43,area:{poly},n:120,minGap:13,s:[.36,.74],variant:[0,1],flip:.5,anim:false,tint:{col:'#9d9673',k:[0,.16]}});
 d.scatter.push({obj:{'ground.capitol-aggregate':2,'rock.stones':1},layer:'fore',seed:23261,area:{poly:[[437,899],[753,745],[772,747],[563,899]]},n:45,minGap:13,s:[.4,.8],variant:[0,1],flip:.5,anim:false,tint:{col:'#a6a38c',k:[0,.16]}});
 d.scatter.push({obj:'plant.grass',layer:'front',seed:23279,area:{rect:[1094,869,1760,919]},n:35,minGap:24,s:[.65,1],variant:'random',flip:.5,anim:'strip'});return d;}
 animRegionSceneUpgrade('us','place:baltimore',{state:'draft',landmarks:['landmark.us-fort-mchenry'],scene:compose});
})();

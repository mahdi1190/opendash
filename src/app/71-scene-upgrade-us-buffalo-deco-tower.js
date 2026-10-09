/* A broad radial civic plaza and moving traffic below Buffalo's stepped limestone tower. */
(function(){const palette={base:{far:['#a7b7bc','#758e9a'],ground:['#8e997b','#657653','#344e40'],plaza:['#c3c1b2','#99a5a0','#697f84'],road:['#617781','#899b9e']},spring:{ground:['#9cae84','#62835a','#34563d']},summer:{ground:['#96a776','#5f7d51','#304c36']},autumn:{ground:['#b4a075','#8d7854','#5a4c35']},winter:{ground:['#dbe2de','#b9cbd0','#7995a0'],plaza:['#e2e7e3','#b2c8d0','#839fab'],road:['#7293a4','#aec5ca']}};
 function compose(){const d={v:1,id:'us-buffalo-deco-tower',view:{lat:42.8865,lon:-78.8792,heading:270,horizon:548},at:'dusk',season:'auto',setting:'urban',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.72},{id:'far',depth:.2,haze:.43},{id:'mid',depth:.42,haze:.15},{id:'near',depth:.73,haze:.035},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:155,clouds:{n:4,y:[86,268],speed:3},sunR:24,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V566Q283 524 578 550T1186 543Q1468 523 1760 564V900z',fill:'@far.0'},
 {layer:'far',d:'M-160 900V640L248 614 570 640 1100 619 1760 639V900z',fill:'@far.1'},
 {layer:'mid',d:'M-160 900V683Q800 657 1760 688V900z',fill:'@plaza.0'},
 {layer:'near',d:'M-160 900V731Q800 687 1760 732V900z',fill:'@plaza.1'},
 {layer:'fore',d:'M-160 900V803L1760 809V852L-160 846z',fill:'@road.0'},
 {layer:'front',d:'M-160 900V867Q800 847 1760 873V900z',fill:'@ground.1'},
 {layer:'fore',d:'M-160 900V759L370 742 474 803-160 800zM1760 900V751L1260 740 1174 806 1760 810z',fill:'@ground.0'},
 {layer:'front',d:'M462 900Q572 845 701 852h197Q1033 852 1179 900z',fill:'@plaza.0'}],place:[
 {obj:'landmark.us-buffalo-city-hall',x:800,y:684,s:.91,layer:'near',seed:21011,shadow:false},
 {obj:'building.green-cottage',x:150,y:648,s:.38,variant:1,layer:'far',seed:21023},{obj:'building.green-cottage',x:1481,y:651,s:.33,variant:0,layer:'far',seed:21037},
 {obj:'tree.us-northern-maple',x:108,y:902,s:.77,variant:2,layer:'front',seed:21053},{obj:'tree.us-northern-maple',x:1550,y:916,s:.86,variant:0,flip:true,layer:'front',seed:21067},
 {obj:'tree.far-birch',x:302,y:782,s:.4,variant:1,layer:'fore',seed:21083},{obj:'tree.far-birch',x:1349,y:781,s:.38,variant:2,layer:'fore',seed:21101},
 {obj:'street.lamppost',x:477,y:784,s:.77,variant:2,layer:'fore',seed:21119},{obj:'street.lamppost',x:1161,y:786,s:.79,variant:1,layer:'fore',seed:21131},{obj:'street.lamppost',x:687,y:712,s:.44,variant:0,layer:'near',seed:21149}],scatter:[],actors:[
 {obj:'vehicle.car',path:[[-130,826],[1740,828]],speed:39,s:.77,variant:2,layer:'fore',seed:21163},
 {obj:'vehicle.car',path:[[1730,839],[-140,837]],speed:44,s:.67,variant:0,layer:'fore',seed:21179},
 {obj:'bird.pigeon-feral',path:[[725,756],[903,759]],speed:6,s:.45,variant:2,layer:'near',seed:21191,loop:'pingpong'}],flocks:[{obj:'bird.small-flight',n:13,area:[173,128,1443,362],layer:'horizon',speed:34,s:.4,seed:21209}]};
 for(const[i,poly]of [[[-160,754],[354,750],[463,800],[-160,800]],[[1292,747],[1760,751],[1760,810],[1194,804]]].entries())d.scatter.push({obj:{'plant.grass':2,'plant.reed':1,'ground.leaves':2,'ground.puddle':1,'rock.stones':1,'rock.boulder':.4},layer:'fore',seed:21227+i*41,area:{poly},n:90,minGap:13,s:[.35,.65],variant:[0,1],flip:.5,anim:false,tint:{col:'#9b967d',k:[0,.16]}});
 d.scatter.push({obj:{'ground.capitol-aggregate':2,'ground.capitol-paver-joint':1},layer:'near',seed:21313,area:{rect:[-140,688,1730,778]},n:140,minGap:17,s:[.4,.9],variant:[0,1],flip:.5,anim:false,tint:{col:'#9ba5a5',k:[0,.16]}});
 d.scatter.push({obj:'plant.grass',layer:'front',seed:21331,area:{rect:[-140,867,1760,918]},n:45,minGap:23,s:[.6,.9],variant:'random',flip:.5,anim:'strip'});return d;}
 animRegionSceneUpgrade('us','place:buffalo',{state:'live',landmarks:['landmark.us-buffalo-city-hall'],scene:compose});
})();

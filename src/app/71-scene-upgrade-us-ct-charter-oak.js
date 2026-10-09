/* A venerable oak above a curving stone wall and autumn meadow path. */
(function(){
 const palette={base:{hill:['#a8b4a5','#7f9b7c'],ground:['#8ba05f','#637e48','#344f35'],path:['#c5b58c','#998e73']},spring:{ground:['#97b36b','#6b944f','#3d633d']},summer:{ground:['#8ea45a','#5d7f40','#315135']},autumn:{ground:['#b09b5b','#8a7644','#514b31']},winter:{ground:['#d2ded5','#b1c5b6','#7d9c8c'],path:['#c6d1c7','#a6b9ad']}};
 function compose(){const d={v:1,id:'us-ct-charter-oak',view:{lat:41.759,lon:-72.673,heading:270,horizon:551},at:'golden',season:'auto',setting:'natural',weather:'live',particles:'season',palette,layers:[{id:'horizon',depth:.06,haze:.7},{id:'far',depth:.2,haze:.43},{id:'mid',depth:.43,haze:.18},{id:'near',depth:.74,haze:.04},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:180,clouds:{n:3,y:[85,280],speed:4},sunR:25,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V559Q159 440 420 523T949 498Q1378 456 1760 531V900z',fill:'@hill.0'},
 {layer:'far',d:'M-160 900V603Q188 532 480 581T1030 565Q1386 506 1760 588V900z',fill:'@hill.1'},
 {layer:'mid',d:'M-160 900V653Q149 580 434 627T956 633Q1398 569 1760 626V900z',fill:'@ground.0'},
 {layer:'near',d:'M-160 900V745Q168 686 458 739T1001 716Q1370 671 1760 730V900z',fill:'@ground.1'},
 {layer:'fore',d:'M386 900Q561 764 687 757Q777 745 856 711L885 714Q816 779 711 790Q615 802 541 900z',fill:'@path.0'},
 {layer:'front',d:'M-160 900V881Q184 828 410 872L472 900zM1118 900Q1404 839 1760 852V900z',fill:'@ground.2'}],place:[
 {obj:'tree.us-charter-oak',x:806,y:760,s:.86,layer:'near',seed:16001},
 {obj:'building.green-cottage',x:290,y:611,s:.27,variant:1,layer:'far',seed:16019},{obj:'building.cottage',x:1318,y:610,s:.23,variant:2,layer:'far',seed:16037},{obj:'building.green-cottage',x:1458,y:603,s:.2,variant:0,layer:'far',seed:16057},
 {obj:'tree.us-northern-maple',x:52,y:910,s:.52,variant:3,layer:'front',seed:16073},{obj:'tree.us-northern-maple',x:1598,y:913,s:.7,variant:1,layer:'front',seed:16091},
 {obj:'animal.squirrel',x:824,y:784,s:.76,variant:1,layer:'fore',seed:16111},{obj:'animal.rabbit',x:1160,y:805,s:.61,variant:0,layer:'fore',seed:16127},{obj:'bird.robin',x:415,y:836,s:.66,variant:2,layer:'fore',seed:16139}],scatter:[],actors:[
 {obj:'bird.pigeon-feral',path:[[664,844],[893,792],[1082,827]],speed:6,s:.5,variant:2,layer:'fore',seed:16159,loop:'pingpong'},{obj:'bird.pigeon-feral',path:[[1221,737],[1037,745]],speed:4,s:.36,variant:0,layer:'near',seed:16177,loop:'pingpong'}],flocks:[{obj:'bird.small-flight',n:13,area:[190,155,1410,359],layer:'horizon',speed:30,s:.38,seed:16189}]};
 d.scatter.push({obj:{'tree.far-birch':2,'tree.us-northern-maple':1},layer:'far',seed:16207,area:{rect:[-160,575,1760,622]},n:21,minGap:48,s:[.15,.28],variant:[0,1],flip:.5,anim:false,tint:{col:'#a0aa88',k:[0,.16]}});
 for(const[i,poly]of [[[-160,760],[405,746],[610,804],[386,905],[-160,905]],[[963,750],[1760,730],[1760,905],[1100,905]]].entries())d.scatter.push({obj:{'plant.grass':2,'plant.reed':1,'ground.leaves':3,'ground.puddle':1,'plant.fern':1,'rock.stones':1,'rock.boulder':.5},layer:'fore',seed:16241+i*53,area:{poly},n:120,minGap:12,s:[.4,.7],variant:[0,1],flip:.5,anim:false,tint:{col:'#aa945b',k:[0,.16]}});
 d.scatter.push({obj:{'ground.leaves':3,'ground.desert-gravel':1},layer:'fore',seed:16331,area:{poly:[[565,780],[747,774],[931,784],[1111,838],[1100,905],[543,905],[605,823]]},n:105,minGap:10,s:[.32,.55],variant:[0,1],flip:.5,anim:false,tint:{col:'#b19b74',k:[0,.16]}});
 d.scatter.push({obj:'plant.grass',layer:'fore',seed:16357,area:{poly:[[-70,830],[314,820],[407,905],[-70,905]]},n:35,minGap:20,s:[.55,.9],variant:'random',flip:.5,anim:'strip'});
 // The wall follows the meadow's curve with unequal native stones, not a grid.
 d.scatter.push({obj:{'rock.stones':2,'rock.boulder':1},layer:'fore',seed:16379,area:{poly:[[-160,786],[93,799],[312,776],[488,800],[479,827],[296,803],[85,827],[-160,814]]},n:43,minGap:13,s:[.7,1],variant:[0,1],flip:.5,anim:false,tint:{col:'#929d8e',k:[0,.16]}});return d;}
 animRegionSceneUpgrade('us','state:CT',{state:'draft',landmarks:['tree.us-charter-oak'],scene:compose});
})();

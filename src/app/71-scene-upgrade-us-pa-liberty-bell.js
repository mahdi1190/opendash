/* Independence Hall and bronze bell across a brick garden approach. */
(function(){
 const palette={base:{hill:['#9ba9a4','#758d77'],ground:['#76905a','#4f7047','#304f3b'],brick:['#ba997f','#8c7065'],path:['#d5c2a0','#b4a387']},spring:{ground:['#80a15d','#577d46','#31573e']},summer:{ground:['#75954e','#4d713c','#2b4c35']},autumn:{ground:['#9a844f','#736242','#4b4936']},winter:{ground:['#d3dbd5','#a6b9b0','#6b8a80'],brick:['#c0b9ab','#909b94']}};
 function compose(){const d={v:1,id:'us-pa-liberty-bell',view:{lat:39.9488,lon:-75.15,heading:0,horizon:554},at:'golden',season:'auto',setting:'urban',weather:'live',particles:'season',palette,
 layers:[{id:'horizon',depth:.06,haze:.65},{id:'far',depth:.21,haze:.38},{id:'mid',depth:.43,haze:.12},{id:'near',depth:.72,haze:.04},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:180,clouds:{n:4,y:[75,290],speed:4},sunR:26,moonR:22},
 ground:[{layer:'horizon',d:'M-160 900V550Q230 496 573 541T1178 527Q1461 486 1760 552V900z',fill:'@hill.0'},{layer:'far',d:'M-160 900V589Q212 544 497 580T1067 567Q1460 544 1760 587V900z',fill:'@hill.1'},
 {layer:'mid',d:'M-160 900V644Q214 626 501 652T1068 647Q1465 615 1760 643V900z',fill:'@ground.0'},{layer:'near',d:'M-160 900V744Q250 706 586 748L800 650 1019 750Q1387 690 1760 737V900z',fill:'@ground.1'},
 {layer:'fore',d:'M435 900L744 647H858L1167 900z',fill:{lin:[[0,'@path.0'],[1,'@brick.0']],y1:650,y2:900}},
 {layer:'fore',d:'M470 900L752 655H762L493 900zM1130 900L846 655h9L1154 900z',fill:'@path.1'},
 {layer:'front',d:'M-160 900V849Q119 803 344 853L435 900zM1164 900Q1467 810 1760 846V900z',fill:'@ground.2'}],place:[
 {obj:'landmark.us-pa-liberty-bell',x:800,y:652,s:.9,layer:'near',seed:11801},
 {obj:'street.us-liberty-bell',x:475,y:794,s:.64,layer:'fore',seed:11819},
 {obj:'tree.us-northern-maple',x:175,y:891,s:1.05,variant:2,layer:'front',seed:11839},
 {obj:'tree.us-northern-maple',x:1511,y:894,s:1.17,variant:0,flip:true,layer:'front',seed:11863},
 {obj:'street.bench',x:1211,y:776,s:.6,variant:1,layer:'fore',seed:11887},
 {obj:'street.lamppost',x:566,y:738,s:.55,variant:2,layer:'near',seed:11903},
 {obj:'street.lamppost',x:1028,y:733,s:.5,variant:1,layer:'near',seed:11927}],scatter:[],
 actors:[{obj:'bird.pigeon-feral',path:[[504,834],[658,785],[726,801]],speed:7,s:.6,layer:'fore',seed:11953,loop:'pingpong'},{obj:'bird.pigeon-feral',path:[[1112,786],[955,763]],speed:6,s:.48,variant:2,layer:'near',seed:11969,loop:'pingpong'}],flocks:[{obj:'bird.small-flight',n:14,area:[160,180,1460,370],layer:'horizon',speed:32,s:.4,seed:11981}]};
 for(const [i,poly]of [[[-160,700],[531,710],[657,766],[427,905],[-160,905]],[[1040,723],[1760,678],[1760,905],[1164,905]]].entries())d.scatter.push({obj:{'plant.grass':3,'ground.leaves':2,'plant.wildflowers':1},layer:'fore',seed:12011+i*43,area:{poly},n:110,minGap:10,s:[.28,.66],variant:[0,1],flip:.5,anim:false,tint:{col:'#a09a66',k:[0,.16]}});
 d.scatter.push({obj:'ground.capitol-paver-joint',layer:'fore',seed:12107,tint:{col:'#b99c7a',k:[0,.16]},area:{poly:[[480,895],[751,671],[852,671],[1118,895]]},n:80,minGap:14,s:[.35,.75],variant:[0,1],flip:.5,anim:false});
 d.scatter.push({obj:'plant.grass',layer:'fore',seed:12131,area:{poly:[[-60,815],[310,827],[424,905],[-60,905]]},n:32,minGap:24,s:[.5,.85],variant:'random',flip:.5,anim:'strip'});
 d.scatter.push({obj:{'tree.far-birch':2,'tree.us-northern-maple':1},layer:'far',seed:12143,area:{rect:[-150,574,1750,617]},n:25,minGap:38,s:[.14,.28],variant:[0,1],flip:.5,anim:false,tint:{col:'#9da78b',k:[.08,.14]}});return d;}
 animRegionSceneUpgrade('us','state:PA',{state:'live',landmarks:['landmark.us-pa-liberty-bell'],scene:compose});
})();

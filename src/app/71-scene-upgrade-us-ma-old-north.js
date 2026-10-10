/* Old North's lantern steeple over a narrow cobbled neighborhood street. */
(function(){
 const palette={base:{far:['#9da6a7','#748788'],ground:['#89917b','#626e5d','#334c40'],road:['#b5a28f','#7a7975'],frame:['#263831','#425044'],brick:['#99715b','#6d5147']},spring:{ground:['#90a281','#617d58','#35523f'],frame:['#233b2d','#43553a']},summer:{ground:['#829a6c','#56764e','#2f4b38'],frame:['#20372b','#3c4d35']},autumn:{ground:['#a78a5a','#7c6544','#514633'],frame:['#362f28','#594a36']},winter:{ground:['#d1d8d3','#a8b9b1','#6c8780'],road:['#c0c3ba','#8c9c96'],frame:['#2b3f42','#4c6365']}};
 function compose(){const d={v:1,id:'us-ma-old-north',view:{lat:42.3663,lon:-71.0545,heading:45,horizon:548},at:'dusk',season:'auto',setting:'urban',weather:'live',particles:'season',palette,
 layers:[{id:'horizon',depth:.06,haze:.7},{id:'far',depth:.2,haze:.42},{id:'mid',depth:.42,haze:.17},{id:'near',depth:.74,haze:.035},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],sky:{stars:170,clouds:{n:3,y:[95,288],speed:3},sunR:23,moonR:22},ground:[
 {layer:'horizon',d:'M-160 900V552Q216 498 560 536T1155 526Q1484 493 1760 542V900z',fill:'@far.0'},
 {layer:'far',d:'M-160 900V607L330 591 680 622 1052 590 1760 614V900z',fill:'@far.1'},
 {layer:'mid',d:'M-160 900V661L573 637 1240 643 1760 678V900z',fill:'@ground.0'},
 {layer:'near',d:'M-160 900V779L498 707 713 693 650 900zM1760 900V720L1210 674 1030 711 1123 900z',fill:'@ground.1'},
 {layer:'fore',d:'M411 900Q574 798 713 693L1061 690Q1100 801 1364 900z',fill:{lin:[[0,'@road.0'],[1,'@road.1']],y1:680,y2:900}},
 {layer:'fore',d:'M452 900Q601 790 735 696h14Q626 796 481 900zM1322 900Q1101 805 1054 692h11Q1121 808 1356 900z',fill:'@brick.0'},
 {layer:'front',d:'M-160 900V865Q125 810 388 870L465 900zM1346 900Q1547 836 1760 857V900z',fill:'@frame.0'}],place:[
 {obj:'landmark.us-ma-old-north',x:968,y:652,s:.85,layer:'near',seed:13001},
 {obj:'building.us-boston-row',x:295,y:714,s:.85,variant:1,layer:'mid',seed:13019},{obj:'building.us-boston-row',x:522,y:678,s:.46,variant:0,layer:'mid',seed:13033},
 {obj:'building.us-boston-row',x:1480,y:718,s:.86,variant:0,layer:'mid',seed:13049},
 {obj:'tree.us-old-north-maple',x:145,y:917,s:1.14,variant:1,layer:'front',seed:13063},{obj:'tree.us-old-north-elm',x:1460,y:909,s:.97,variant:0,layer:'front',seed:13079},
 {obj:'street.lamppost',x:513,y:807,s:.83,variant:2,layer:'fore',seed:13093},{obj:'street.lamppost',x:1189,y:773,s:.64,variant:1,layer:'fore',seed:13109},
 {obj:'street.lamppost',x:666,y:711,s:.43,variant:0,layer:'near',seed:13127}],scatter:[],actors:[{obj:'bird.pigeon-feral',path:[[705,831],[879,769],[1006,826]],speed:6,s:.6,layer:'fore',seed:13147,loop:'pingpong'},{obj:'bird.pigeon-feral',path:[[1112,718],[971,723]],speed:5,s:.43,variant:3,layer:'near',seed:13159,loop:'pingpong'}],flocks:[{obj:'bird.small-flight',n:13,area:[170,143,1450,382],layer:'horizon',speed:31,s:.4,seed:13171}]};
 d.ground.push({layer:'front',d:'M-160 900V865Q125 810 388 870L465 900zM1346 900Q1547 836 1760 857V900z',fill:{lin:[[0,'@frame.1',.65],[1,'@frame.0',0]],y1:816,y2:910}});
 for(const [i,poly]of [[[-160,767],[481,728],[545,788],[410,905],[-160,905]],[[1171,719],[1760,728],[1760,905],[1360,905]]].entries())d.scatter.push({obj:{'plant.grass':2,'plant.reed':2,'ground.leaves':3,'rock.stones':1,'rock.boulder':1},layer:'fore',seed:13201+i*41,area:{poly},n:75,minGap:13,s:[.33,.6],variant:[0,1],flip:.5,anim:false,tint:{col:'#927a5f',k:[0,.16]}});
 for(let row=0;row<8;row++){const y=714+row*row*3.5,x0=738-(y-696)*1.39,x1=1054+(y-692)*1.27;let joint='M'+Math.round(x0)+' '+Math.round(y)+'H'+Math.round(x1)+'v.7H'+Math.round(x0)+'Z';const pitch=16+(y-700)*.1;for(let x=x0+pitch*(row%2?.5:1);x<x1-pitch*.5;x+=pitch)joint+='M'+Math.round(x)+' '+Math.round(y)+'v'+Math.round(3+(y-700)*.03)+'h.65V'+Math.round(y)+'Z';d.ground.push({layer:'fore',d:joint,fill:{lin:[[0,'@frame.1',.2],[1,'@frame.1',.2]],y1:y,y2:y+1}});}
 d.scatter.push({obj:'ground.capitol-aggregate',layer:'fore',seed:13297,tint:{col:'#a3a5a0',k:[0,.16]},area:{poly:[[472,895],[733,710],[1050,706],[1323,895]]},n:85,minGap:16,s:[.65,1.15],variant:[0,1],flip:.5,anim:false});
 d.scatter.push({obj:'plant.grass',layer:'fore',seed:13321,area:{poly:[[1380,842],[1760,818],[1760,905],[1370,905]]},n:31,minGap:23,s:[.55,.8],variant:'random',flip:.5,anim:'strip'});return d;}
 animRegionSceneUpgrade('us','state:MA',{state:'live',landmarks:['landmark.us-ma-old-north'],scene:compose});
})();

/* White Sands: a long curved gypsum slip face with sparse soaptree yucca.
   Draft: the source's pale dunes and unequal yuccas seed this new composition. */
(function () {
  const palette={base:{mountain:['#8e9eaf','#b7b9c3'],dune:['#f2e7e4','#d3c8d4','#e2d9df','#c2b8cc'],near:['#e9dfdb','#c7bdca'],frame:['#35483d','#263b35','#77778b']},
    spring:{dune:['#eee4dc','#cfc4ce','#e2d8d6','#bcb2c3'],near:['#e9ded2','#c9bfc5']},
    summer:{dune:['#f7ead7','#dcc5c5','#efe0d4','#c4b0bf'],near:['#f3e5d1','#c9b5bb'],frame:['#3b513b','#293e30','#827c88']},
    autumn:{dune:['#f0e4e3','#c8bbce','#ded2dc','#aea0be'],near:['#e7dadf','#c0b2c8'],frame:['#4c4937','#343a2d','#746e87']},
    winter:{dune:['#e3e5ec','#bcc7d6','#d4dce8','#9faec5'],near:['#dce2eb','#b2bfd1'],frame:['#354d4c','#243c3e','#6b7e93']}};
  function compose(){const d={v:1,id:'us-nm-white-sands',view:{lat:32.78,lon:-106.17,heading:272,fov:82,horizon:548},at:'golden',season:'auto',setting:'natural',weather:'live',particles:'season',particleSeasons:{spring:'motes',summer:'motes',autumn:'motes',winter:'motes'},palette,
    layers:[{id:'horizon',depth:.06,haze:.68},{id:'far',depth:.2,haze:.36},{id:'mid',depth:.43,haze:.12},{id:'near',depth:.72,haze:.035},{id:'fore',depth:1,haze:0},{id:'front',depth:1.2,haze:0}],
    sky:{stars:210,clouds:{n:3,y:[96,298],speed:4},sunR:29,moonR:23},
    ground:[
      {layer:'horizon',d:'M-160 900V560L-45 533 49 541 133 507 205 517 282 474 339 496 408 479 479 512 571 501 678 528 803 518 916 542 1038 507 1113 523 1193 491 1274 505 1348 475 1430 503 1523 497 1647 529 1760 516V900z',fill:'@mountain.0'},
      {layer:'horizon',d:'M-160 571Q203 533 460 563T1003 558Q1385 527 1760 551V900H-160z',fill:'@mountain.1'},
      {layer:'far',d:'M-160 900V605C3 616 71 548 227 565S426 621 583 584S811 557 963 598S1285 545 1464 581S1678 623 1760 596V900z',fill:'@dune.1'},
      {layer:'far',d:'M-160 900V653C77 581 193 610 385 635S702 569 893 618S1213 650 1452 603S1677 623 1760 645V900z',fill:'@dune.0'},
      {layer:'mid',d:'M-160 900V681C87 648 276 723 457 664S780 614 960 684S1349 625 1760 677V900z',fill:'@dune.3'},
      {layer:'near',d:'M-160 900V781C125 699 298 764 491 786S847 701 1109 747S1461 830 1760 732V900z',fill:'@dune.2'},
      {layer:'fore',d:'M-160 900V850C92 795 271 798 479 838S834 881 1014 841S1460 753 1760 823V900z',fill:{lin:[[0,'@near.0'],[1,'@near.1']],y1:770,y2:915}},
      {layer:'front',d:'M-160 900V900C177 845 340 866 560 900zM1208 900Q1470 837 1760 876V900z',fill:'@near.1'},
      // Unequal stable scrub hummocks and a long grazing shadow frame luminous
      // gypsum. The central dune and the phone-safe yucca keep their clear air.
      {layer:'front',d:'M-160 900V862Q-46 818 83 845Q137 831 207 854L302 899zM1390 900Q1439 876 1494 877Q1554 850 1624 867L1760 855V900z',fill:'@frame.0'},
      {layer:'front',d:'M-160 900V892Q44 862 182 884L315 900zM1441 900Q1586 872 1760 885V900z',fill:'@frame.1'},
      {layer:'fore',d:'M135 876Q311 851 475 869T766 882Q639 899 485 888T198 894z',fill:'@frame.2',op:.42},
    ],place:[
      {obj:'ground.us-white-sands-dune',x:804,y:798,s:1,layer:'mid',seed:4019},
      {obj:'plant.us-soaptree-yucca',x:1278,y:819,s:1.36,variant:2,layer:'fore',seed:4217},
      {obj:'plant.us-soaptree-yucca',x:216,y:809,s:1.03,variant:0,flip:true,layer:'fore',seed:4451},
      {obj:'plant.us-soaptree-yucca',x:1503,y:762,s:.44,variant:3,layer:'near',seed:4637},
      {obj:'plant.us-soaptree-yucca',x:1219,y:647,s:.2,variant:1,layer:'far',seed:4829,anim:false},
      {obj:'plant.us-soaptree-yucca',x:960,y:917,s:1.02,variant:1,layer:'front',seed:4943},
      {obj:'plant.desert-creosote',x:53,y:892,s:1.65,variant:1,layer:'front',seed:4967,tint:{col:'#234039',k:.72},anim:false},
      {obj:'plant.desert-sotol',x:164,y:906,s:1.1,variant:1,layer:'front',seed:4981,tint:{col:'#263f35',k:.7},anim:false},
      {obj:'plant.desert-creosote',x:1553,y:905,s:1.22,variant:0,layer:'front',seed:4993,tint:{col:'#263d38',k:.7},anim:false},
      {obj:'animal.rabbit',x:1250,y:803,s:.56,variant:1,layer:'fore',seed:5021},
      {obj:'animal.us-pale-earless-lizard',x:661,y:874,s:.9,variant:0,layer:'front',seed:5231},
      {obj:'bird.desert-roadrunner',x:117,y:855,s:.62,variant:1,layer:'fore',seed:5441},
    ],scatter:[],actors:[
      {obj:'animal.us-pale-earless-lizard',layer:'near',path:[[569,781],[731,755],[851,753]],speed:7,loop:'pingpong',s:.55,variant:1,seed:5639,offset:.42},
      {obj:'bird.desert-roadrunner',layer:'fore',path:[[1292,824],[1447,818],[1724,858]],speed:14,loop:'pingpong',s:.55,variant:0,seed:5861,offset:.1},
    ],flocks:[{obj:'bird.small-flight',n:11,layer:'horizon',area:[180,188,1490,310],speed:32,s:.38,seed:6073},{obj:'bird.small-flight',n:4,layer:'horizon',area:[320,371,1370,421],speed:39,s:.44,seed:6269}]};
    // Gypsum grains and wind-ripple fragments cover the bottom without turning
    // the dune field into a grassland. Scrub lives only on outer stable edges.
    d.scatter.push({obj:{'ground.us-gypsum-ripple':2,'ground.us-gypsum-crust':3},layer:'fore',seed:6473,area:{rect:[-150,795,1750,910]},n:440,minGap:7,s:[.5,1.05],variant:'random',flip:.5,anim:false,tint:{col:'#dad0db',k:[.08,.08]}});
    d.scatter.push({obj:{'ground.us-gypsum-ripple':2,'ground.us-gypsum-crust':3},layer:'near',seed:6679,area:{rect:[-150,700,1750,793]},n:170,minGap:10,s:[.23,.51],variant:[0,1],flip:.5,anim:false,tint:{col:'#d5c3c4',k:[.16,.16]}});
    for(const [i,area]of [{poly:[[-160,724],[170,725],[370,900],[-160,900]]},{poly:[[1400,687],[1760,700],[1760,900],[1510,900]]}].entries()){
      d.scatter.push({obj:{'ground.desert-tuft':3,'plant.desert-sotol':1,'plant.desert-creosote':1},layer:'fore',seed:6883+i*223,area,n:38,minGap:23,s:[.38,.7],variant:[0,1],flip:.5,anim:false,tint:{col:'#a5957a',k:[.08+i*.08,.08+i*.08]}});
      d.scatter.push({obj:{'ground.desert-tuft':3,'plant.desert-sotol':1},layer:'fore',seed:7333+i*227,area,n:14,minGap:31,s:[.55,.95],variant:'random',flip:.5,anim:'strip',tint:{col:'#b3aa8d',k:[.08,.08]}});
    }
    d.scatter.push({obj:{'ground.us-gypsum-ripple':1,'ground.us-gypsum-crust':2},layer:'far',seed:7789,area:{rect:[-150,632,1750,665]},n:50,minGap:17,s:[.12,.28],variant:[0,1],flip:.5,anim:false,tint:{col:'#dad1db',k:[.16,.16]}});
    return d;
  }
  animRegionSceneUpgrade('us','state:NM',{state:'draft',landmarks:['ground.us-white-sands-dune'],scene:compose});
})();

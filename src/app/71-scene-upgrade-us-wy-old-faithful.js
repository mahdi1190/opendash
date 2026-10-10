/* Eruption above a silica basin: the original's central geyser, rustic inn,
   boardwalk and meadow bison become separately lit native objects. */
(function () {
  function compose(){const d={v:1,id:'us-wy-old-faithful',view:{lat:44.46,lon:-110.828,heading:39,fov:82,horizon:548},at:'day',season:'auto',setting:'mixed',signage:false,weather:'live',particles:'season',particleSeasons:{spring:'motes',autumn:'motes'},
    palette:{base:{range:['#879c98','#667f73'],basin:['#d6d5b9','#f0e4c5','#b4bba4','#8d9e8b'],meadow:['#849269','#536d49','#334b3c'],walk:['#b4a078','#706f54','#414c40']},
      spring:{range:['#879f98','#638270'],basin:['#d5d8b9','#eee8ca','#b3c1a5','#829e83'],meadow:['#7fa575','#4e7d52','#294e3d']},
      summer:{range:['#8f9e8e','#718366'],basin:['#ded5b4','#f4e9cc','#bcbba0','#929f87'],meadow:['#9ba273','#66764c','#3d5339']},
      autumn:{range:['#aba08a','#91846a'],basin:['#ddc6a7','#f0dcc0','#bba78c','#9a977b'],meadow:['#c2a168','#987e4d','#65543b']},
      winter:{range:['#a9bdba','#819c9a'],basin:['#d9e0d3','#f0f1e1','#b8c6bc','#9aaea2'],meadow:['#c8d8c5','#95b39d','#637f70'],walk:['#b9bba4','#8d9d8c','#52685b']}},
    sky:{stars:240,clouds:{n:2,y:[86,197],speed:5},sunR:27,moonR:25},
    layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='horizon'?{haze:.65}:l.id==='far'?{haze:.32}:l.id==='mid'?{haze:.1}:{})),
    ground:[
      {layer:'horizon',d:'M-160 900V556L-54 524 46 528 137 494 216 507 279 476 355 499 419 490 493 527 578 512 642 532 728 504 805 513 881 482 972 503 1045 488 1119 510 1204 503 1305 529 1380 506 1486 512 1583 544 1760 531V900z',fill:'@range.0'},
      {layer:'far',d:'M-160 900V610Q25 569 204 583T582 575Q796 600 993 572T1393 582Q1587 595 1760 572V900z',fill:'@range.1'},
      {layer:'mid',d:'M-160 900V663Q94 621 283 654T676 648Q940 619 1157 644T1550 631L1760 646V900z',fill:'@meadow.1'},
      {layer:'mid',d:'M360 681Q484 637 621 660T888 649Q1053 639 1185 686L1281 760 1099 835 427 839 280 749z',fill:'@basin.2'},
      {layer:'near',d:'M150 755Q279 699 423 724Q530 671 675 695Q827 663 979 690Q1116 675 1227 731Q1379 724 1462 768L1534 900H52z',fill:{lin:[[0,'@basin.1'],[.6,'@basin.0'],[1,'@basin.2']],y1:675,y2:900}},
      {layer:'near',d:'M433 746Q557 719 667 732Q746 699 874 722Q1008 710 1136 746Q1016 740 896 750Q766 739 657 759Q521 746 433 762zM215 817Q420 783 559 804Q677 786 805 802Q933 778 1101 794Q1231 778 1363 811L1381 825Q1223 799 1105 812Q922 794 803 819Q674 807 558 819Q399 804 215 835z',fill:'@basin.3'},
      {layer:'fore',d:'M-160 900V743Q-3 720 157 774L246 802 356 850 451 900zM1760 900V715Q1593 711 1455 752L1379 791 1289 824 1191 900z',fill:'@meadow.1'},
      {layer:'fore',d:'M-160 900V832Q54 777 255 831T665 875Q935 858 1127 871T1510 804L1760 782V900z',fill:'@meadow.0'},
      {layer:'front',d:'M-160 900V877Q96 841 260 879L359 900zM1239 900Q1490 830 1760 850V900z',fill:'@meadow.2'},
      // The viewing path follows the meadow rim, outside the thermal apron.
      {layer:'fore',d:'M-160 812Q163 755 424 809Q662 856 873 849Q1176 853 1431 773L1760 718V741L1438 797Q1179 875 878 872Q656 879 420 834Q160 778-160 839z',fill:'@walk.1'},
      {layer:'fore',d:'M-160 812Q163 755 424 809Q662 856 873 849Q1176 853 1431 773L1760 718V724L1432 780Q1177 860 874 856Q661 864 423 816Q163 763-160 819z',fill:'@walk.0'},
    ],place:[
      {obj:'ground.us-faithful-eruption',x:802,y:730,s:.91,layer:'near',seed:22003},
      {obj:'building.us-faithful-inn',x:255,y:671,s:.65,layer:'mid',seed:22109},
      {obj:'tree.us-lodgepole-pine',x:56,y:849,s:1.13,variant:2,layer:'front',seed:22349},
      {obj:'tree.us-lodgepole-pine',x:1507,y:899,s:1.2,variant:0,flip:true,layer:'front',seed:22453},
      {obj:'tree.us-lodgepole-pine',x:1645,y:850,s:.86,variant:1,layer:'fore',seed:22571},
      {obj:'tree.us-lodgepole-pine',x:432,y:687,s:.43,variant:1,layer:'mid',seed:22679,anim:false},
      {obj:'animal.us-yellowstone-bison',x:1435,y:837,s:.4,variant:0,layer:'fore',seed:22801},
      {obj:'animal.us-yellowstone-bison',x:1560,y:807,s:.3,variant:1,flip:true,layer:'fore',seed:22901},
      {obj:'animal.us-yellowstone-bison',x:1379,y:863,s:.26,variant:2,layer:'fore',seed:23003},
      {obj:'person.walker',x:611,y:859,s:.35,variant:2,layer:'fore',seed:23117},
    ],scatter:[],actors:[{obj:'person.walker',layer:'fore',path:[[413,825],[533,847],[672,860],[816,862]],speed:7,s:.33,loop:'pingpong',seed:23227,offset:.1}],
    flocks:[{obj:'bird.small-flight',layer:'horizon',n:10,area:[110,128,1490,282],s:.43,speed:31,seed:23339},{obj:'bird.small-flight',layer:'far',n:6,area:[137,366,1450,439],s:.5,speed:37,seed:23447}]};
    d.scatter.push({obj:{'tree.us-lodgepole-pine':3,'tree.us-subalpine-fir':2},layer:'far',seed:23561,area:{rect:[-120,590,1720,643]},n:68,minGap:18,s:[.15,.4],variant:'random',flip:.5,anim:false,shadow:false,tint:{col:'#6f8670',k:[.04,.17]}});
    d.scatter.push({obj:{'tree.us-lodgepole-pine':3,'tree.us-subalpine-fir':2},layer:'mid',seed:23671,area:{poly:[[1143,637],[1719,611],[1719,729],[1384,717]]},n:12,minGap:38,s:[.26,.43],variant:'random',flip:.5,anim:false,tint:{col:'#799571',k:[.02,.13]}});
    d.scatter.push({obj:{'ground.us-sinter-fragment':3,'ground.desert-gravel':1},layer:'near',seed:23789,area:{poly:[[363,741],[566,719],[729,757],[1048,725],[1298,779],[1092,843],[516,836]]},n:270,minGap:9,s:[.28,.75],variant:'random',flip:.5,anim:false,tint:{col:'#b9baa0',k:[.04,.18]}});
    d.scatter.push({obj:{'ground.us-sinter-fragment':3,'ground.desert-gravel':1},layer:'mid',seed:23899,area:{rect:[423,659,1171,697]},n:80,minGap:13,s:[.17,.35],variant:'random',flip:.5,anim:false,tint:{col:'#c8c6ae',k:[.1,.25]}});
    for(const [i,area]of [{poly:[[-160,822],[121,808],[327,863],[410,906],[-160,906]]},{poly:[[1233,849],[1410,798],[1760,758],[1760,906],[1167,906]]},{rect:[344,878,1214,908]}].entries()){
      d.scatter.push({obj:{'plant.grass':3,'plant.wildflowers':2},layer:'fore',seed:24007+i*127,area,n:i===2?95:115,minGap:14,s:[.3,.65],variant:'random',flip:.5,anim:false,tint:{col:'#a9ad7d',k:[.03,.18]}});
      d.scatter.push({obj:'plant.grass',layer:'fore',seed:24401+i*131,area,n:10,minGap:31,s:[.45,.7],variant:'random',flip:.5,anim:'strip',tint:{col:'#749268',k:[.19,.31]}});
    }
    return d;
  }
  animRegionSceneUpgrade('us','state:WY',{state:'live',landmarks:['ground.us-faithful-eruption'],scene:compose});
})();

/* The original distant storm and windpump over wheat, rebuilt as separate
   weather, machinery, crop and farm objects around a converging dirt track. */
(function () {
  function compose(){const d={v:1,id:'us-ok-wheat-storm-farm',view:{lat:36.4,lon:-97.89,heading:283,fov:82,horizon:595},at:'golden',season:'auto',setting:'natural',weather:'live',particles:'season',particleSeasons:{spring:'motes',autumn:'motes'},signage:false,
    palette:{base:{field:['#b8b089','#a59a68','#888450'],wheat:['#c0af70','#9d8c55','#655e3d'],track:['#b8a17b','#897453']},spring:{field:['#a4b385','#8d9e67','#6e8a51'],wheat:['#a7b477','#889d5a','#4e7344']},summer:{field:['#c8ba81','#b4a369','#9a8d52'],wheat:['#d1bc77','#b5a263','#7c7545']},autumn:{field:['#bba27c','#a58d60','#8f744d'],wheat:['#c4a269','#a78954','#735b3b']},winter:{field:['#c6cfc2','#afbdac','#879e8c'],wheat:['#cfd5be','#aaba9e','#748b76'],track:['#c4c9b7','#8d9e88']}},
    sky:{stars:230,clouds:{n:2,y:[47,142],speed:4.7},sunR:28,moonR:23},layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='far'?{haze:.33}:{})),
    ground:[{layer:'horizon',d:'M-160 900V606Q138 590 399 601T910 596T1387 604T1760 593V900z',fill:'@field.0'},
      {layer:'far',d:'M-160 900V641Q150 614 449 629T981 626T1459 639T1760 621V900z',fill:'@field.1'},
      {layer:'mid',d:'M-160 900V700Q153 661 476 680T1037 668T1509 682T1760 664V900z',fill:'@field.2'},
      {layer:'near',d:'M-160 900V772Q164 736 453 750T963 745T1447 756T1760 732V900z',fill:'@wheat.0'},
      {layer:'fore',d:'M-160 900V842Q168 791 457 820T1001 807T1456 828T1760 799V900z',fill:'@wheat.1'},
      {layer:'near',d:'M650 900L804 739 853 705 879 701 853 747 791 900z',fill:'@track.0'},
      {layer:'fore',d:'M681 900L816 750 839 735 732 900zM762 900L849 750 864 729 796 900z',fill:'@track.1'},
      {layer:'front',d:'M-160 900V880Q80 842 295 867L463 900zM1760 900V865Q1540 842 1351 881L1242 900z',fill:'@wheat.2'}],
    place:[{obj:'sky.us-prairie-storm-shelf',x:754,y:451,s:1.08,layer:'far',seed:47011},
      {obj:'sky.us-prairie-funnel',x:978,y:611,s:.78,layer:'far',seed:47117},
      {obj:'structure.us-prairie-windpump',x:764,y:806,s:.96,variant:1,layer:'near',seed:47221},
      {obj:'building.us-prairie-barn',x:1251,y:704,s:.36,variant:0,layer:'mid',seed:47327},
      {obj:'tree.us-rim-juniper',x:-20,y:917,s:.83,variant:1,layer:'front',seed:47437},
      {obj:'tree.us-lake-paper-birch',x:1577,y:918,s:.94,variant:2,flip:true,layer:'front',seed:47543},
      {obj:'animal.rabbit',x:1198,y:862,s:.39,variant:1,layer:'fore',seed:47651}],scatter:[],actors:[{obj:'vehicle.tractor',layer:'mid',path:[[1440,719],[1102,714],[1033,728]],speed:9,s:.26,loop:'wrap',seed:47759}],flocks:[{obj:'bird.small-flight',layer:'far',n:9,area:[70,215,1514,353],s:.42,speed:39,seed:47869},{obj:'bird.goose-flight',layer:'far',n:6,area:[186,469,1398,541],s:.47,speed:31,seed:47983}]};
    for(const [i,area]of [{poly:[[-160,767],[638,743],[765,774],[643,908],[-160,908]]},{poly:[[923,745],[1760,731],[1760,908],[805,908]]}].entries()){
      d.scatter.push({obj:{'plant.us-prairie-wheat':3,'ground.desert-tuft':3,'ground.desert-gravel':2,'plant.grass':1},layer:'fore',seed:48101+i*127,area,n:305,minGap:9,s:[.35,.78],variant:'random',flip:.5,anim:false,tint:{col:'#bcae78',k:[.04,.21]}});
      d.scatter.push({obj:'plant.us-prairie-wheat',layer:'fore',seed:48401+i*139,area,n:14,minGap:39,s:[.92,1.14],variant:'random',flip:.5,anim:'strip',tint:{col:'#c5b77d',k:[.07,.2]}});
    }
    d.scatter.push({obj:{'tree.us-rim-juniper':1,'tree.us-lake-paper-birch':2},layer:'mid',seed:48707,area:{rect:[1292,701,1687,723]},n:12,minGap:23,s:[.08,.19],variant:'random',flip:.5,anim:false,tint:{col:'#97a18a',k:[.12,.27]}});
    return d;
  }
  animRegionSceneUpgrade('us','state:OK',{state:'live',landmarks:['structure.us-prairie-windpump'],scene:compose});
})();

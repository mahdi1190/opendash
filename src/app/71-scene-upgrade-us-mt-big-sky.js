/* Big prairie sky and the mountain front over rolling grassland. A farm lane
   curls to the barn; wind, grazing bison and a distant tractor give it life. */
(function () {
  function compose(){const d={v:1,id:'us-mt-rocky-front-prairie',view:{lat:47.82,lon:-112.33,heading:268,fov:89,horizon:566},at:'day',season:'auto',setting:'natural',weather:'live',particles:'season',particleSeasons:{spring:'motes',autumn:'motes'},signage:false,
    palette:{base:{hill:['#a9b69a','#8f9e7d','#74855e'],grass:['#b6b07b','#96965c','#5b6848'],lane:['#c1ad85','#9b8a65']},spring:{hill:['#a6bf96','#8eab76','#63885a'],grass:['#a4b375','#849854','#4e7046']},summer:{hill:['#b5b78b','#9b9e70','#808451'],grass:['#c7bb7e','#aaa068','#707347']},autumn:{hill:['#c0ad87','#a5936a','#8a7953'],grass:['#c8ac73','#af8e59','#7c6642']},winter:{hill:['#d1d9cd','#b6c7b9','#8fa79b'],grass:['#dbe0ce','#b5c1a6','#7c9484'],lane:['#c5cec1','#91a599']}},
    sky:{stars:230,clouds:{n:5,y:[64,261],speed:4.2},sunR:30,moonR:24},layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='far'?{haze:.36}:{})),
    ground:[{layer:'horizon',d:'M-160 900V584Q77 550 289 572T674 557T1056 574T1438 560T1760 578V900z',fill:'@hill.0'},
      {layer:'far',d:'M-160 900V623Q135 576 396 611T827 605T1280 609T1760 587V900z',fill:'@hill.1'},
      {layer:'mid',d:'M-160 900V681Q64 619 312 659T769 642T1227 662T1760 625V900z',fill:'@hill.2'},
      {layer:'near',d:'M-160 900V764Q130 700 373 741T805 724T1259 747T1760 695V900z',fill:'@grass.0'},
      {layer:'fore',d:'M-160 900V824Q103 780 319 817T745 803T1143 828T1760 771V900z',fill:'@grass.1'},
      {layer:'near',d:'M640 900Q386 867 442 816Q479 782 650 783Q745 781 777 758L807 760Q779 795 665 804Q515 811 527 832Q560 858 802 900z',fill:'@lane.0'},
      {layer:'fore',d:'M665 900Q438 863 467 825Q491 802 663 795L680 799Q518 812 503 830Q494 851 718 900zM772 900Q560 856 552 833Q551 824 574 819L597 819Q575 833 595 842Q641 866 824 900z',fill:'@lane.1'},
      {layer:'front',d:'M-160 900V881Q93 847 266 873L415 900zM1760 900V852Q1574 831 1370 889L1313 900z',fill:'@grass.2'}],
    place:[{obj:'rock.us-rocky-front',x:817,y:588,s:.94,variant:1,layer:'horizon',seed:44011,anim:false},
      {obj:'building.us-prairie-barn',x:785,y:801,s:.82,variant:1,layer:'near',seed:44117},
      {obj:'tree.us-rim-juniper',x:-43,y:914,s:.95,variant:3,layer:'front',seed:44221},{obj:'tree.us-lake-paper-birch',x:1579,y:916,s:1.04,variant:2,flip:true,layer:'front',seed:44327},
      {obj:'animal.us-yellowstone-bison',x:1158,y:786,s:.51,variant:0,layer:'near',seed:44437},
      {obj:'animal.us-yellowstone-bison',x:1309,y:771,s:.36,variant:2,flip:true,layer:'near',seed:44543},
      {obj:'rock.stones',x:309,y:873,s:.71,variant:2,layer:'fore',seed:44651}],scatter:[],actors:[{obj:'vehicle.tractor',layer:'mid',path:[[-110,690],[391,685],[621,702]],speed:8,s:.31,loop:'wrap',seed:44759}],flocks:[{obj:'bird.goose-flight',layer:'far',n:9,area:[61,148,1511,321],s:.48,speed:30,seed:44869},{obj:'bird.small-flight',layer:'far',n:6,area:[145,379,1436,449],s:.46,speed:35,seed:44983}]};
    for(const [i,area]of [{poly:[[-160,762],[310,744],[444,809],[427,905],[-160,905]]},{poly:[[1014,758],[1760,710],[1760,905],[849,905],[565,843],[618,817]]}].entries()){
      d.scatter.push({obj:{'ground.desert-gravel':3,'ground.desert-tuft':3,'plant.grass':1,'plant.wildflowers':.6},layer:'fore',seed:45101+i*127,area,n:305,minGap:8,s:[.35,.78],variant:'random',flip:.5,anim:false,tint:{col:'#b4ad7b',k:[.04,.19]}});
      d.scatter.push({obj:'plant.grass',layer:'fore',seed:45401+i*139,area,n:14,minGap:35,s:[1.2,1.5],variant:'random',flip:.5,anim:'strip',tint:{col:'#919767',k:[.08,.22]}});
    }
    d.scatter.push({obj:{'tree.us-rim-juniper':1,'tree.us-lake-paper-birch':2},layer:'far',seed:45707,area:{rect:[1087,615,1621,639]},n:13,minGap:25,s:[.06,.15],variant:'random',flip:.5,anim:false,tint:{col:'#9caa91',k:[.12,.29]}});
    return d;
  }
  animRegionSceneUpgrade('us','state:MT',{state:'live',landmarks:['building.us-prairie-barn'],scene:compose});
})();

/* West Texas sunset: volcanic crags, alluvial washes and a working wind pump.
   Open space stays open; its texture comes from low native desert vegetation. */
(function(){
  if(typeof animRegionSceneUpgrade!=='function')return;
  const scene=()=>({
    v:1,id:'west-texas-chisos-sunset',view:{lat:29.32,lon:-103.27,heading:270,fov:83,horizon:603,lift:1},
    at:'sunset',setting:'natural',signage:false,season:'auto',weather:'live',particles:'season', particleSeasons: { winter: 'motes' },
    palette:{
      base:{far:['#a49ca9','#887889'],land:['#c6a076','#a07a54','#68513c'],wash:['#d4b68a','#947455'],frame:'#382f37'},
      spring:{far:['#a8ad9c','#899580'],land:['#b5b080','#85915c','#526544'],wash:['#d1c08c','#979465']},
      summer:{far:['#a99e96','#918078'],land:['#c1ad7e','#9a8b60','#687046'],wash:['#d2bf8d','#9e8a62']},
      autumn:{far:['#b19b91','#987b75'],land:['#cb9c6a','#a47743','#785735'],wash:['#d9af79','#a17a53']},
      winter:{far:['#abb1b3','#929c9d'],land:['#bdbdb1','#919486','#676f65'],wash:['#cfcdbb','#a0a091']}
    },
    sky:{stars:300,clouds:{n:3,y:[70,230],speed:5},sunR:30,moonR:23},
    layers:SCENE_LAYERS_DEFAULT.map(l=>Object.assign({},l,l.id==='mid'?{haze:.17}:l.id==='far'?{haze:.43}:{})),
    ground:[
      {layer:'horizon',d:'M-160 619L-64 552L43 573L132 513L207 530L296 487L374 532L449 499L543 547L638 524L726 570L837 537L921 572L1014 514L1118 542L1225 481L1300 507L1394 552L1484 527L1580 575L1760 582V657H-160Z',fill:'@far.0'},
      {layer:'far',d:'M-160 636Q100 570 260 606L335 574L440 605L541 589Q690 620 810 599T1050 608L1135 574L1255 603L1360 585Q1550 624 1760 594V673H-160Z',fill:'@far.1'},
      {layer:'mid',d:'M-160 629Q190 614 510 635T1070 635T1760 625V726H-160Z',fill:{lin:[[0,'@land.0'],[1,'@land.1']],x1:0,y1:620,x2:0,y2:740}},
      {layer:'near',d:'M-160 736Q75 684 242 708T576 735Q775 685 969 718T1318 719T1760 699V830H-160Z',fill:'@land.1'},
      {layer:'near',d:'M-160 737Q75 686 242 710T576 737Q775 687 969 720T1318 721T1760 701V706Q1490 722 1318 725T969 724Q775 691 576 741T242 714Q75 690 -160 741Z',fill:'@land.0'},
      {layer:'fore',d:'M-160 836Q70 790 235 811T575 823Q742 774 949 805T1324 818T1760 791V900H-160Z',fill:'@land.2'},
      {layer:'near',d:'M821 656Q805 692 865 719Q912 747 840 778L870 793Q954 754 910 724Q846 694 854 657Z',fill:'@wash.1'},
      {layer:'fore',d:'M843 775Q770 803 833 840Q873 865 789 900H984Q1001 867 923 837Q865 815 889 785Z',fill:{lin:[[0,'@wash.1'],[1,'@wash.0']],x1:800,y1:775,x2:900,y2:900}},
      {layer:'front',d:'M-160 900V877Q45 851 187 868T401 890Q515 872 607 899ZM1065 900Q1170 865 1314 875T1515 853T1760 872V900Z',fill:'@frame'}
    ],
    place:[
      {obj:'landmark.chisos-basin',x:800,y:625,s:.89,layer:'mid',seed:9103,anim:false},
      {obj:'structure.west-texas-windpump',x:744,y:753,s:.84,layer:'near',seed:9181},
      {obj:'building.el-paso-adobe',x:1160,y:675,s:.31,layer:'mid',seed:9241,variant:0},
      {obj:'building.el-paso-adobe',x:1255,y:675,s:.24,layer:'mid',seed:9319,variant:2,flip:true},
      {obj:'building.el-paso-adobe',x:1330,y:679,s:.19,layer:'mid',seed:9403,variant:1},
      {obj:'plant.desert-ocotillo',x:1505,y:912,s:1.2,layer:'front',seed:9479,variant:2,flip:true},
      {obj:'plant.desert-sotol',x:93,y:898,s:1.6,layer:'front',seed:9551,variant:2},
      {obj:'plant.desert-pricklypear',x:205,y:902,s:1.1,layer:'front',seed:9643,variant:1},
      {obj:'plant.desert-sotol',x:1360,y:914,s:1.4,layer:'front',seed:9721,variant:0,flip:true},
      {obj:'rock.desert-boulder',x:33,y:901,s:1.7,layer:'front',seed:9803,variant:1,tint:{col:'#382f37',k:.75}},
      {obj:'rock.desert-boulder',x:1550,y:902,s:1.25,layer:'front',seed:9887,variant:2,tint:{col:'#382f37',k:.75}},
      {obj:'bird.desert-roadrunner',x:585,y:792,s:.5,layer:'fore',seed:9973,variant:1}
    ],
    scatter:[
      {obj:{'ground.desert-gravel':4,'ground.desert-tuft':3},layer:'near',seed:10061,area:{rect:[-80,661,1680,784]},n:110,minGap:10,s:[.14,.48],sByY:[[661,.45],[784,1.05]],flip:.5,variant:[0,3],anim:false,tint:{col:'#b59a78',k:[.04,.22]}},
      {obj:{'ground.desert-gravel':4,'ground.desert-tuft':3,'plant.desert-creosote':1},layer:'fore',seed:10133,area:{rect:[0,798,1600,900]},n:275,minGap:7,s:[.25,.95],sByY:[[798,.65],[900,1.2]],flip:.5,variant:[0,3],anim:false,tint:{col:'#a68b65',k:[0,.2]}},
      {obj:{'plant.desert-creosote':3,'plant.desert-sotol':2},layer:'near',seed:10223,area:{rect:[-50,690,1650,775]},n:30,minGap:40,s:[.16,.42],flip:.5,variant:[0,3],anim:false,tint:{col:'#b1a379',k:[.03,.16]}},
      {obj:{'plant.desert-pricklypear':1,'plant.desert-sotol':3},layer:'fore',seed:10301,area:{rect:[-70,824,1670,903]},n:28,minGap:45,s:[.3,.7],flip:.5,variant:[0,3],anim:false,tint:{col:'#a29263',k:[0,.18]}},
      {obj:'ground.desert-tuft',layer:'fore',seed:10391,area:{rect:[-60,830,1660,900]},n:38,minGap:24,s:[.45,1],flip:.5,variant:[0,3],anim:'strip'},
      {obj:{'rock.desert-boulder':2,'rock.stones':1},layer:'far',seed:10463,area:{rect:[-70,648,1670,672]},n:16,minGap:83,s:[.12,.25],flip:.5,variant:[0,3],anim:false,shadow:false,tint:{col:'#b7a18f',k:[.18,.35]}}
    ],
    actors:[
      {obj:'bird.desert-roadrunner',layer:'fore',path:[[-150,844],[1750,844]],speed:34,s:.6,loop:'loop',offset:.33,variant:0,seed:10547},
      {obj:'bird.desert-roadrunner',layer:'near',path:[[1750,767],[-150,767]],speed:26,s:.36,loop:'loop',offset:.7,variant:1,seed:10613},
      {obj:'prop.desert-tumbleweed',layer:'fore',path:[[-150,881],[1750,881]],speed:19,s:.67,loop:'loop',offset:.72,variant:1,seed:10709}
    ],
    flocks:[{obj:'bird.small-flight',layer:'horizon',n:8,area:[-100,170,1700,290],s:.4,speed:18,seed:10789},{obj:'bird.small-flight',layer:'far',n:5,area:[-30,420,1630,505],s:.31,speed:22,seed:10873}],
    water:[],signs:[],camera:{pan:0,period:100}
  });
  animRegionSceneUpgrade('texas','place:west-texas-sunset',{state:'live',landmarks:['landmark.chisos-basin'],scene});
})();
